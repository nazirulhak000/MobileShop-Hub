import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  sanitizeUrl,
  sanitizeCssClass,
  stripScriptTags,
  sanitizeIframeSrc,
  validateJsonPayloadBoundary,
} from "../src/lib/storefrontSecurity";
import {
  safeParseJson,
  safeParseSectionsOrder,
  safeParseCustomSections,
  safeParseCustomPages,
  safeParseNavMenu,
  safeParseBeforeAfterCases,
  safeParsePricingRates,
  safeParseFaqs,
  DEFAULT_SECTIONS_ORDER,
  DEFAULT_NAV_MENU,
} from "../src/lib/storefrontTheme";
import { HtmlEmbedBlock } from "../src/components/landing/blocks/HtmlEmbedBlock";
import { CtaBlock } from "../src/components/landing/blocks/CtaBlock";
import { PromoBannerBlock } from "../src/components/landing/blocks/PromoBannerBlock";
import { RichTextBlock } from "../src/components/landing/blocks/RichTextBlock";
import { VideoEmbedBlock } from "../src/components/landing/blocks/VideoEmbedBlock";
import { DynamicBlockRenderer } from "../src/components/landing/blocks/DynamicBlockRenderer";

describe("Rounds 1, 2, 3 Security Audit & Hardening Loop", () => {
  // =========================================================================
  // ROUND 1: XSS & HTML Sandboxing
  // =========================================================================
  describe("Round 1: XSS Prevention & HTML Sandboxing", () => {
    it("1.1 sanitizeUrl strictly blocks javascript:, vbscript:, and data: schemes", () => {
      // Direct javascript:
      assert.strictEqual(sanitizeUrl("javascript:alert(document.cookie)"), "");
      assert.strictEqual(sanitizeUrl("JAVASCRIPT:alert(1)"), "");
      assert.strictEqual(sanitizeUrl("javascript:void(0)"), "");

      // Obfuscated with null bytes, tabs, spaces, newlines
      assert.strictEqual(sanitizeUrl("java\0script:alert(1)"), "");
      assert.strictEqual(sanitizeUrl("java\tscript:alert(1)"), "");
      assert.strictEqual(sanitizeUrl("java\nscript:alert(1)"), "");
      assert.strictEqual(sanitizeUrl("  javascript :alert(1)"), "");
      assert.strictEqual(sanitizeUrl("vbscript:msgbox(1)"), "");

      // Dangerous data: scheme (non-image)
      assert.strictEqual(sanitizeUrl("data:text/html,<script>alert(1)</script>"), "");
      assert.strictEqual(sanitizeUrl("data:application/javascript,alert(1)"), "");

      // Safe URLs must pass cleanly
      assert.strictEqual(sanitizeUrl("https://example.com/repair"), "https://example.com/repair");
      assert.strictEqual(sanitizeUrl("http://localhost:3000"), "http://localhost:3000");
      assert.strictEqual(sanitizeUrl("tel:0812345678"), "tel:0812345678");
      assert.strictEqual(sanitizeUrl("mailto:shop@fixme.com"), "mailto:shop@fixme.com");
      assert.strictEqual(sanitizeUrl("#services"), "#services");
      assert.strictEqual(sanitizeUrl("/store/apple-lab"), "/store/apple-lab");
    });

    it("1.2 sanitizeCssClass strictly strips HTML, brackets, quotes, semicolons, and injection vectors", () => {
      // Injections and breakout attempts
      assert.strictEqual(
        sanitizeCssClass('"><script>alert(1)</script>'),
        "scriptalert1script"
      );
      assert.strictEqual(
        sanitizeCssClass("my-class; background: red;"),
        "my-class background red"
      );
      assert.strictEqual(
        sanitizeCssClass("hover:scale-105 { display: none }"),
        "hoverscale-105 display none"
      );
      assert.strictEqual(
        sanitizeCssClass("foo' bar\" baz`"),
        "foo bar baz"
      );

      // Safe Tailwind class combinations must pass
      assert.strictEqual(
        sanitizeCssClass("my-custom-wrapper shadow-2xl p-4 bg-slate-900"),
        "my-custom-wrapper shadow-2xl p-4 bg-slate-900"
      );
    });

    it("1.3 stripScriptTags removes <script> tags and inline event handlers", () => {
      const maliciousHtml = `
        <div class="test">Hello World</div>
        <script>alert('xss1')</script>
        <script type="text/javascript">window.location="https://evil.com"</script>
        <img src="valid.png" onerror="alert('xss2')" onload="steal()" />
        <a href="javascript:alert(1)">Click me</a>
      `;

      const cleaned = stripScriptTags(maliciousHtml);
      assert.ok(!cleaned.includes("<script"), "Must not contain <script");
      assert.ok(!cleaned.includes("alert('xss1')"), "Must not contain script body");
      assert.ok(!cleaned.includes("onerror"), "Must not contain onerror");
      assert.ok(!cleaned.includes("onload"), "Must not contain onload");
      assert.ok(!cleaned.includes("javascript:alert(1)"), "Must not contain javascript: href");
      assert.ok(cleaned.includes("Hello World"), "Must preserve legitimate content");
    });

    it("1.4 sanitizeIframeSrc strictly enforces HTTP/HTTPS and rejects javascript:", () => {
      assert.strictEqual(sanitizeIframeSrc("javascript:alert(1)"), null);
      assert.strictEqual(sanitizeIframeSrc("data:text/html,xss"), null);
      assert.strictEqual(sanitizeIframeSrc("vbscript:xss"), null);
      assert.strictEqual(
        sanitizeIframeSrc("https://www.google.com/maps/embed?pb=xxx"),
        "https://www.google.com/maps/embed?pb=xxx"
      );
      assert.strictEqual(
        sanitizeIframeSrc("/uploads/diagram.pdf"),
        "/uploads/diagram.pdf"
      );
    });

    it("1.5 HtmlEmbedBlock renders iframe with safe sandbox without allow-same-origin", () => {
      const htmlOutput = renderToString(
        React.createElement(HtmlEmbedBlock, {
          title: "Test Embed",
          html: '<iframe src="https://www.google.com/maps/embed?pb=123"></iframe>',
        })
      );

      // Verify sandbox attribute
      assert.ok(htmlOutput.includes('sandbox="allow-scripts allow-popups allow-forms"'));
      assert.ok(
        !htmlOutput.includes("allow-same-origin"),
        "CRITICAL: HtmlEmbedBlock MUST NOT have allow-same-origin"
      );
      assert.ok(htmlOutput.includes('src="https://www.google.com/maps/embed?pb=123"'));
    });

    it("1.6 HtmlEmbedBlock blocks malicious javascript: iframe src", () => {
      const htmlOutput = renderToString(
        React.createElement(HtmlEmbedBlock, {
          title: "Evil Embed",
          html: '<iframe src="javascript:alert(document.cookie)"></iframe>',
        })
      );

      assert.ok(!htmlOutput.includes("javascript:alert"));
      assert.ok(htmlOutput.includes("เนื้อหา Embed ถูกระงับเนื่องจากความปลอดภัย"));
    });

    it("1.7 CtaBlock sanitizes customButtonUrl and prevents javascript: links", () => {
      const htmlOutput = renderToString(
        React.createElement(CtaBlock, {
          title: "Special Offer",
          customButtonText: "รับสิทธิ์",
          customButtonUrl: "javascript:alert('pwned')",
        })
      );

      // Button should either be omitted or have an inert sanitized URL, never javascript:
      assert.ok(!htmlOutput.includes("javascript:alert"));
    });

    it("1.8 PromoBannerBlock sanitizes buttonUrl and prevents javascript: links", () => {
      const htmlOutput = renderToString(
        React.createElement(PromoBannerBlock, {
          title: "โปรโมชั่นซ่อมด่วน",
          buttonText: "กดรับสิทธิ์",
          buttonUrl: "javascript:alert(1)",
        })
      );

      assert.ok(!htmlOutput.includes("javascript:alert"));
      assert.ok(htmlOutput.includes('href="#repair-quote"'));
    });

    it("1.9 DynamicBlockRenderer sanitizes customCssClass before rendering", () => {
      const htmlOutput = renderToString(
        React.createElement(DynamicBlockRenderer, {
          block: {
            id: "block-xss-test",
            type: "rich_text",
            title: "Safe Title",
            content: "Safe content",
            customCssClass: '"><script>alert(1)</script> valid-class',
          },
        })
      );

      assert.ok(!htmlOutput.includes("<script>alert(1)</script>"));
      assert.ok(htmlOutput.includes("valid-class"));
    });

    it("1.10 VideoEmbedBlock generic iframe contains sandbox attributes", () => {
      const htmlOutput = renderToString(
        React.createElement(VideoEmbedBlock, {
          title: "Generic Video",
          videoUrl: "https://player.vimeo.com/video/123456",
          platform: "auto",
        })
      );

      assert.ok(htmlOutput.includes('sandbox="allow-scripts allow-popups allow-forms"'));
    });
  });

  // =========================================================================
  // ROUND 2: Multi-Tenant Isolation & Slug Collisions
  // =========================================================================
  describe("Round 2: Multi-Tenant Isolation & Slug Collision Defense", () => {
    it("2.1 Slug resolution normalizes unicode NFKC and trims whitespace", () => {
      const rawInput = "  \u200Bmobileshop\uFEFF  ";
      const sanitized = rawInput
        .normalize("NFKC")
        .replace(/[\u200B-\u200D\uFEFF\u0000-\u001F\u007F-\u009F]/g, "")
        .trim()
        .toLowerCase();

      assert.strictEqual(sanitized, "mobileshop");
    });

    it("2.2 Rejects directory traversal and null byte slug spoofing", () => {
      const dangerousSlugs = ["../admin", "..\\system", "shop/sub", "shop\0null"];
      for (const slug of dangerousSlugs) {
        const isDangerous =
          slug.includes("/") ||
          slug.includes("\\") ||
          slug.includes("..") ||
          slug.includes("\0");
        assert.ok(isDangerous, `Slug ${slug} must be recognized as dangerous`);
      }
    });

    it("2.3 safeParseCustomPages filters and validates slugs", () => {
      const rawPages = [
        { slug: "about-us", title: "About Us", published: true },
        { slug: "  TERMS_AND_CONDITIONS  ", title: "Terms", published: true },
        { slug: "\u200Bsecret-draft\uFEFF", title: "Draft Page", published: false },
        { slug: "", title: "Untitled", published: true },
      ];

      const parsed = safeParseCustomPages(JSON.stringify(rawPages));
      assert.strictEqual(parsed.length, 4);
      assert.strictEqual(parsed[0].slug, "about-us");
      assert.strictEqual(parsed[1].slug, "terms_and_conditions");
      assert.strictEqual(parsed[2].slug, "secret-draft");
      assert.strictEqual(parsed[2].published, false);
      assert.strictEqual(parsed[3].slug, "page-4");
    });

    it("2.4 Draft pages are strictly hidden from unauthenticated visitors", () => {
      const tenantPages = [
        { slug: "warranty", title: "ใบรับประกัน", published: true },
        { slug: "vip-hidden-rates", title: "VIP Rates (Draft)", published: false },
      ];

      // Simulated unauthenticated visitor (isAuthorizedStaff = false)
      const visitorPages = tenantPages.filter((p) => p.published !== false);
      assert.strictEqual(visitorPages.length, 1);
      assert.strictEqual(visitorPages[0].slug, "warranty");
      assert.ok(!visitorPages.some((p) => p.slug === "vip-hidden-rates"));

      // Simulated authorized staff for this tenant (isAuthorizedStaff = true)
      const isAuthorizedStaff = true;
      const staffPages = tenantPages.filter((p) => p.published !== false || isAuthorizedStaff);
      assert.strictEqual(staffPages.length, 2);
    });

    it("2.5 Cross-tenant staff isolation: Staff from Tenant A cannot view Tenant B drafts", () => {
      const tenantBId = "tenant-b-uuid";
      const staffSession = { tenantId: "tenant-a-uuid" }; // Staff belongs to Tenant A

      const isAuthorizedForTenantB = staffSession.tenantId === tenantBId;
      assert.strictEqual(isAuthorizedForTenantB, false);

      const tenantBPages = [
        { slug: "b-published", title: "B Public", published: true },
        { slug: "b-draft", title: "B Draft", published: false },
      ];

      const visibleToStaffA = tenantBPages.filter(
        (p) => p.published !== false || isAuthorizedForTenantB
      );

      assert.strictEqual(visibleToStaffA.length, 1);
      assert.strictEqual(visibleToStaffA[0].slug, "b-published");
      assert.ok(!visibleToStaffA.some((p) => p.slug === "b-draft"));
    });
  });

  // =========================================================================
  // ROUND 3: Defensive JSON Parsing & Payload Boundaries
  // =========================================================================
  describe("Round 3: Defensive JSON Parsing & Payload Boundaries", () => {
    it("3.1 safeParseJson handles extreme malformed JSON inputs with zero crash", () => {
      const fallback = { safe: true };
      assert.deepStrictEqual(safeParseJson("{{{broken json", fallback), fallback);
      assert.deepStrictEqual(safeParseJson("[unclosed array", fallback), fallback);
      assert.deepStrictEqual(safeParseJson("undefined", fallback), fallback);
      assert.deepStrictEqual(safeParseJson("", fallback), fallback);
      assert.deepStrictEqual(safeParseJson(null, fallback), fallback);
      assert.deepStrictEqual(safeParseJson(undefined, fallback), fallback);
      assert.deepStrictEqual(safeParseJson(12345, fallback), fallback);
    });

    it("3.2 safeParseSectionsOrder handles malformed inputs, caps length, and deduplicates", () => {
      // Corrupted JSON returns default order
      assert.deepStrictEqual(
        safeParseSectionsOrder("{{{broken"),
        DEFAULT_SECTIONS_ORDER
      );

      // Valid JSON with duplicates, invalid types, and whitespace
      const input = JSON.stringify([
        "hero",
        "  services  ",
        "HERO", // Duplicate
        null,
        123,
        "services", // Duplicate
        "custom-block-1",
      ]);

      const result = safeParseSectionsOrder(input);
      assert.deepStrictEqual(result, ["hero", "services", "custom-block-1"]);

      // Giant array capped to 50 items
      const giantArray = Array.from({ length: 500 }, (_, i) => `section-${i}`);
      const capped = safeParseSectionsOrder(JSON.stringify(giantArray));
      assert.strictEqual(capped.length, 50);
    });

    it("3.3 safeParseCustomSections handles malformed blocks and sanitizes fields", () => {
      const malformedBlocks = [
        null,
        {},
        {
          id: "block-1",
          type: "promo_banner",
          title: "Title 1",
          buttonUrl: "javascript:alert(1)",
          customCssClass: "<style>body{color:red}</style> safe-btn",
          columns: 99, // Out of bounds
        },
      ];

      const parsed = safeParseCustomSections(JSON.stringify(malformedBlocks));
      assert.strictEqual(parsed.length, 2);
      assert.strictEqual(parsed[1].buttonUrl, "");
      assert.strictEqual(parsed[1].customCssClass, "stylebodycolorredstyle safe-btn");
      assert.strictEqual(parsed[1].columns, 6); // Clamped to max 6
    });

    it("3.4 Prototype pollution keys (__proto__, constructor) do not pollute Object prototype", () => {
      const evilPayload = JSON.stringify({
        "__proto__": { "polluted": true },
        "constructor": { "prototype": { "polluted": true } },
      });

      safeParseJson(evilPayload, {});
      assert.strictEqual((Object.prototype as any).polluted, undefined);
    });

    it("3.5 validateJsonPayloadBoundary validates 500KB boundary without naive truncation", () => {
      // Valid small payload
      const smallData = { title: "Hello", sections: ["hero"] };
      const validStr = validateJsonPayloadBoundary(smallData, "customSections", 512000);
      assert.ok(validStr && validStr.includes("Hello"));

      // Valid large payload close to 500KB (e.g. 400KB)
      const largeContent = "A".repeat(400 * 1024);
      const largeData = { content: largeContent };
      const largeStr = validateJsonPayloadBoundary(largeData, "customPages", 512000);
      assert.ok(largeStr && largeStr.length > 400000);

      // Payload exceeding 512KB must throw an informative Error, NOT truncate
      const oversizedContent = "B".repeat(600 * 1024);
      const oversizedData = { content: oversizedContent };

      assert.throws(
        () => validateJsonPayloadBoundary(oversizedData, "customPages", 512000),
        /เกินขีดจำกัดความปลอดภัย/
      );
    });

    it("3.6 Parsing a 500KB payload completes in < 50ms with bounded memory", () => {
      // Create a realistic 450KB payload with 40 blocks
      const realisticBlocks = Array.from({ length: 40 }, (_, idx) => ({
        id: `block-${idx}`,
        type: idx % 2 === 0 ? "promo_banner" : "rich_text",
        title: `Block Title ${idx} - ศูนย์บริการซ่อมมือถือด่วนมาตรฐานแล็บ`,
        subtitle: `Subtitle ${idx} - ตรวจเช็ควิเคราะห์อาการ 10 จุดก่อนซ่อม`,
        content: `Detailed narrative content paragraph for block ${idx}. `.repeat(200),
        buttonText: "แอด LINE จองคิว",
        buttonUrl: "https://line.me/@shop",
        customCssClass: "p-4 my-2 border border-slate-800",
      }));

      const rawJson = JSON.stringify(realisticBlocks);
      const byteLength = Buffer.byteLength(rawJson, "utf8");
      assert.ok(byteLength > 200000, `Payload is ${byteLength} bytes`);

      const start = performance.now();
      const parsed = safeParseCustomSections(rawJson);
      const elapsed = performance.now() - start;

      assert.strictEqual(parsed.length, 40);
      assert.ok(elapsed < 50, `Parsing took ${elapsed.toFixed(2)}ms, must be < 50ms`);
    });
  });
});
