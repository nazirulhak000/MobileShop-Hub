import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { RichTextBlock } from "../src/components/landing/blocks/RichTextBlock";
import { DynamicBlockRenderer } from "../src/components/landing/blocks/DynamicBlockRenderer";
import { CustomBlock } from "../src/lib/storefrontTheme";
import {
  do_shortcode,
  add_shortcode,
  shortcode_exists,
} from "../src/lib/wordpress/shortcodeEngine";
import {
  serializeToGutenberg,
  parseGutenbergContent,
} from "../src/lib/wordpress/gutenbergConverter";
import {
  generateThemeJson,
  compileThemeJsonToCss,
} from "../src/lib/wordpress/themeJsonEngine";

describe("WordPress Full Integration & Customizer Loop (Rounds 31, 35, 39)", () => {
  describe("Round 31: Shortcode Integration in DynamicBlockRenderer & RichText", () => {
    it("31.1 RichTextBlock renders live [repair_tracker] widget with shopSlug context", () => {
      const markdownWithShortcode = `
## ติดตามสถานะงานซ่อม
กรุณากรอกรหัสติดตามงานซ่อมด้านล่างนี้

[repair_tracker button="ค้นหางานซ่อม"]

ขอบคุณที่ไว้วางใจศูนย์บริการของเรา
      `.trim();

      const html = renderToStaticMarkup(
        React.createElement(RichTextBlock, {
          content: markdownWithShortcode,
          shopSlug: "mbk-fix",
          tenantInfo: {
            shopName: "FixMe MBK",
            shopSlug: "mbk-fix",
            phone: "081-234-5678",
          },
        })
      );

      // Verify headings and markdown rendered
      assert.ok(html.includes("ติดตามสถานะงานซ่อม"));
      // Verify shortcode widget container rendered
      assert.ok(html.includes("fixme-shortcode"));
      assert.ok(html.includes("fixme-repair-tracker"));
      // Verify button attribute passed to widget
      assert.ok(html.includes("ค้นหางานซ่อม"));
      // Verify shop slug hidden input rendered
      assert.ok(html.includes('value="mbk-fix"'));
      assert.ok(html.includes('action="/track"'));
    });

    it("31.2 RichTextBlock renders multiple mixed shortcodes in correct position", () => {
      const content = `
# บริการของเรา
[booking_calendar text="จองคิวซ่อมทันที"]

### ติดต่อเรา
[contact_card]

[shop_hours]
      `.trim();

      const html = renderToStaticMarkup(
        React.createElement(RichTextBlock, {
          content,
          shopSlug: "siam-fix",
          tenantInfo: {
            shopName: "FixMe Siam",
            phone: "089-999-8888",
            lineId: "@fixmesiam",
          },
        })
      );

      // Verify booking calendar widget rendered
      assert.ok(html.includes("fixme-booking-cta"));
      assert.ok(html.includes("จองคิวซ่อมทันที"));
      assert.ok(html.includes("/s/siam-fix"));

      // Verify contact card widget rendered
      assert.ok(html.includes("fixme-contact-card"));
      assert.ok(html.includes("089-999-8888"));
      assert.ok(html.includes("@fixmesiam"));

      // Verify shop hours widget rendered
      assert.ok(html.includes("fixme-hours-widget"));
    });

    it("31.3 DynamicBlockRenderer handles shortcode block type", () => {
      const block: CustomBlock = {
        id: "block-sc-1",
        type: "shortcode",
        content: '[price_calculator device="iPhone 15 Pro" discount="10%"]',
        visible: true,
      };

      const html = renderToStaticMarkup(
        React.createElement(DynamicBlockRenderer, {
          block,
          shopSlug: "central-fix",
          tenantInfo: {
            shopName: "FixMe Central",
            shopSlug: "central-fix",
          },
        })
      );

      assert.ok(html.includes("fixme-estimator"));
      assert.ok(html.includes("iPhone 15 Pro"));
      assert.ok(html.includes("10%"));
    });

    it("31.4 DynamicBlockRenderer passes shopSlug and tenantInfo to RichTextBlock", () => {
      const block: CustomBlock = {
        id: "block-rt-1",
        type: "rich_text",
        content: "## ข้อกำหนด\n[repair_tracker]",
        visible: true,
      };

      const html = renderToStaticMarkup(
        React.createElement(DynamicBlockRenderer, {
          block,
          shopSlug: "terminal21-fix",
          tenantInfo: {
            shopName: "FixMe T21",
            shopSlug: "terminal21-fix",
          },
        })
      );

      assert.ok(html.includes("ข้อกำหนด"));
      assert.ok(html.includes("fixme-repair-tracker"));
      assert.ok(html.includes('value="terminal21-fix"'));
    });

    it("31.5 DynamicBlockRenderer expands shortcodes embedded inside html-embed blocks", () => {
      const block: CustomBlock = {
        id: "block-html-1",
        type: "html_embed",
        html: '<div class="custom-wrapper">[repair_tracker]</div>',
        visible: true,
      };

      const html = renderToStaticMarkup(
        React.createElement(DynamicBlockRenderer, {
          block,
          shopSlug: "emquartier-fix",
        })
      );

      assert.ok(html.includes("fixme-repair-tracker"));
      assert.ok(html.includes("emquartier-fix"));
    });
  });

  describe("Round 35: Gutenberg HTML Import & Export Modal", () => {
    it("35.1 Serializes FixMe blocks into valid WordPress Gutenberg markup for export", () => {
      const testBlocks: CustomBlock[] = [
        {
          id: "exp-promo-1",
          type: "promo_banner",
          title: "โปรโมชั่นซ่อมด่วน 1 ชม.",
          subtitle: "รับประกันแท้ 90 วัน",
          buttonText: "จองสิทธิ์",
          buttonUrl: "https://fixme.co/promo",
          visible: true,
        },
        {
          id: "exp-rt-1",
          type: "rich_text",
          content: "## เกี่ยวกับเรา\nเราคือผู้เชี่ยวชาญด้านการซ่อมสมาร์ตโฟน",
          visible: true,
        },
      ];

      const gutenbergMarkup = serializeToGutenberg(testBlocks);

      // Verify self-closing void block format
      assert.ok(gutenbergMarkup.includes('<!-- wp:fixme/promo-banner {"id":"exp-promo-1"'));
      assert.ok(gutenbergMarkup.includes('"title":"โปรโมชั่นซ่อมด่วน 1 ชม."'));
      assert.ok(gutenbergMarkup.includes("/-->"));

      // Verify container paired block format
      assert.ok(gutenbergMarkup.includes('<!-- wp:fixme/rich-text {"id":"exp-rt-1"'));
      assert.ok(gutenbergMarkup.includes("<!-- /wp:fixme/rich-text -->"));
      assert.ok(gutenbergMarkup.includes("wp-block-fixme-rich-text"));
    });

    it("35.2 Parses WordPress Gutenberg HTML markup on import and preserves attributes", () => {
      const importedMarkup = `
<!-- wp:fixme/promo-banner {"id":"imp-1","title":"แบตเตอรี่แท้ลด 20%","buttonText":"จองเลย"} /-->

<!-- wp:core/paragraph -->
<p>ข้อความตัวอย่างที่นำเข้าจาก WordPress</p>
<!-- /wp:core/paragraph -->

<!-- wp:fixme/rich-text {"id":"imp-2","title":"เงื่อนไขการรับประกัน"} -->
<div class="wp-block-fixme-rich-text">
<p>รับประกันเปลี่ยนอะไหล่นาน 90 วันเต็ม</p>
</div>
<!-- /wp:fixme/rich-text -->
      `.trim();

      const blocks = parseGutenbergContent(importedMarkup);

      assert.strictEqual(blocks.length, 3);

      // Block 1: Promo Banner
      assert.strictEqual(blocks[0].type, "promo_banner");
      assert.strictEqual(blocks[0].title, "แบตเตอรี่แท้ลด 20%");
      assert.strictEqual(blocks[0].buttonText, "จองเลย");

      // Block 2: Core Paragraph mapped to rich_text
      assert.strictEqual(blocks[1].type, "rich_text");
      assert.ok(blocks[1].content?.includes("ข้อความตัวอย่างที่นำเข้าจาก WordPress"));

      // Block 3: Rich Text
      assert.strictEqual(blocks[2].type, "rich_text");
      assert.strictEqual(blocks[2].title, "เงื่อนไขการรับประกัน");
      assert.ok(blocks[2].content?.includes("รับประกันเปลี่ยนอะไหล่นาน 90 วันเต็ม"));
    });

    it("35.3 Import recovers gracefully from malformed or corrupted Gutenberg markup", () => {
      const malformed = `
<!-- wp:fixme/promo-banner {broken-json} /-->
<div class="raw-uncommented-html">
  <h3>หัวข้อที่อยู่นอกบล็อกคอมเมนต์</h3>
</div>
<!-- wp:unclosed-block {"title":"Unclosed"} -->
      `.trim();

      const blocks = parseGutenbergContent(malformed);
      assert.ok(Array.isArray(blocks));
      assert.ok(blocks.length > 0);
      // Raw HTML should be captured safely
      const hasHtmlOrRichText = blocks.some(
        (b) => b.type === "html_embed" || b.type === "rich_text"
      );
      assert.ok(hasHtmlOrRichText);
    });
  });

  describe("Round 39: Theme.json CSS Variables Injection", () => {
    it("39.1 Generates WordPress theme.json v3 token tree from themeColor and fontFamily", () => {
      const themeJson = generateThemeJson(
        { themeColor: "purple", fontFamily: "kanit" },
        "FixMe Siam Paragon"
      );

      assert.strictEqual(themeJson.version, 3);
      assert.ok(themeJson.title?.includes("FixMe Siam Paragon"));

      // Verify color palette contains primary and secondary
      const palette = themeJson.settings.color?.palette || [];
      const primaryToken = palette.find((p) => p.slug === "primary");
      assert.ok(primaryToken);
      assert.strictEqual(primaryToken.color, "#a855f7"); // Purple hex

      // Verify typography token
      const fontFamilies = themeJson.settings.typography?.fontFamilies || [];
      const customFont = fontFamilies.find((f) => f.slug === "kanit");
      assert.ok(customFont);
      assert.ok(customFont.fontFamily.includes("Kanit"));

      // Verify spacing tokens
      const spacingSizes = themeJson.settings.spacing?.spacingSizes || [];
      assert.strictEqual(spacingSizes.length, 6);
    });

    it("39.2 Compiles theme.json into standard --wp--preset--* CSS custom properties", () => {
      const themeJson = generateThemeJson({ themeColor: "rose", fontFamily: "sarabun" });
      const css = compileThemeJsonToCss(themeJson);

      // Verify root scoping
      assert.ok(css.includes(":root {"));

      // Verify color presets (#f43f5e for rose)
      assert.ok(css.includes("--wp--preset--color--primary: #f43f5e;"));
      assert.ok(css.includes("--wp--preset--color--secondary: #06C755;"));

      // Verify spacing presets
      assert.ok(css.includes("--wp--preset--spacing--20: 0.5rem;"));
      assert.ok(css.includes("--wp--preset--spacing--30: 1rem;"));
      assert.ok(css.includes("--wp--preset--spacing--60: 3rem;"));

      // Verify font-size presets
      assert.ok(css.includes("--wp--preset--font-size--small: 0.875rem;"));
      assert.ok(css.includes("--wp--preset--font-size--medium: 1rem;"));
      assert.ok(css.includes("--wp--preset--font-size--x-large: 1.75rem;"));

      // Verify utility helper classes
      assert.ok(css.includes(".has-primary-color { color: var(--wp--preset--color--primary) !important; }"));
      assert.ok(css.includes(".has-primary-background-color { background-color: var(--wp--preset--color--primary) !important; }"));
    });

    it("39.3 All FixMe theme color palettes produce valid CSS variables with zero error", () => {
      const colors = ["emerald", "blue", "purple", "amber", "rose", "cyan"] as const;

      for (const color of colors) {
        const themeJson = generateThemeJson({ themeColor: color, fontFamily: "anuphan" });
        const css = compileThemeJsonToCss(themeJson);

        assert.ok(css.includes(`--wp--preset--color--primary:`));
        assert.ok(css.includes(`--wp--preset--spacing--50:`));
      }
    });
  });
});
