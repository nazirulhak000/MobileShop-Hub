import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  safeParseCustomPages,
  safeParseSectionsOrder,
  safeParseNavMenu,
  safeParseCustomSections,
  FONT_FAMILY_CONFIG,
  DEFAULT_CUSTOM_PAGES,
  DEFAULT_SECTIONS_ORDER,
  DEFAULT_NAV_MENU,
  StorefrontThemeColor,
  StorefrontFontFamily,
  HeroLayoutType,
  CustomPage,
} from "../src/lib/storefrontTheme";
import { LandingHero } from "../src/components/landing/LandingHero";
import { LandingNavbar } from "../src/components/landing/LandingNavbar";
import { DynamicBlockRenderer, PromoBannerBlock, RichTextBlock } from "../src/components/landing/blocks";

describe("Dynamic Subpage Routing & Modular Block Storefront", () => {
  it("1. safeParseCustomPages correctly normalizes slugs and sanitizes content", () => {
    const raw = JSON.stringify([
      {
        slug: " About Us / บริการ ",
        title: "เกี่ยวกับเรา (About)",
        subtitle: "ศูนย์บริการซ่อมมาตรฐาน ISO",
        content: "## ประวัติความเป็นมา\nก่อตั้งขึ้นตั้งแต่ปี 2020 เพื่อบริการซ่อมมือถือด่วน",
        published: true,
      },
      {
        slug: "WARRANTY-POLICY",
        title: "เงื่อนไขการรับประกัน",
        subtitle: "รับประกันสูงสุด 1 ปีเต็ม",
        content: "รับประกันอะไหล่แท้ทุกชิ้น",
        published: true,
      },
      {
        slug: "draft-page",
        title: "หน้าแบบร่าง",
        published: false,
      },
    ]);

    const parsed = safeParseCustomPages(raw);
    assert.strictEqual(parsed.length, 3);

    // Slugs must be lowercased, trimmed, and special characters replaced with clean hyphens
    assert.strictEqual(parsed[0].slug, "about-us");
    assert.strictEqual(parsed[0].title, "เกี่ยวกับเรา (About)");
    assert.strictEqual(parsed[0].published, true);

    assert.strictEqual(parsed[1].slug, "warranty-policy");
    assert.strictEqual(parsed[1].title, "เงื่อนไขการรับประกัน");

    assert.strictEqual(parsed[2].slug, "draft-page");
    assert.strictEqual(parsed[2].published, false);
  });

  it("2. safeParseCustomPages falls back gracefully on corrupted or empty inputs", () => {
    assert.deepStrictEqual(safeParseCustomPages(null), []);
    assert.deepStrictEqual(safeParseCustomPages(""), []);
    assert.deepStrictEqual(safeParseCustomPages("{ corrupted json }"), []);
    assert.deepStrictEqual(safeParseCustomPages([null, undefined, 123]), []);
  });

  it("3. safeParseSectionsOrder supports dynamic sequence and custom block IDs", () => {
    const customOrder = ["hero", "block-promo-1", "bento", "block-cta-2", "reviews", "faq"];
    const parsed = safeParseSectionsOrder(JSON.stringify(customOrder));

    assert.deepStrictEqual(parsed, customOrder);
    assert.strictEqual(parsed[1], "block-promo-1");
    assert.strictEqual(parsed[3], "block-cta-2");

    // Falls back to DEFAULT_SECTIONS_ORDER on null or corrupt input
    const fallback = safeParseSectionsOrder(null);
    assert.deepStrictEqual(fallback, DEFAULT_SECTIONS_ORDER);
  });

  it("4. safeParseNavMenu sanitizes dynamic navbar items and handles subpages and external links", () => {
    const rawMenu = JSON.stringify([
      { label: "หน้าแรก", href: "#" },
      { label: "เกี่ยวกับเรา", href: "/store/apple-lab/about" },
      { label: "การรับประกัน", href: "/store/apple-lab/warranty" },
      { label: "LINE Official", href: "https://line.me/ti/p/@applelab", isExternal: true },
    ]);

    const parsed = safeParseNavMenu(rawMenu);
    assert.strictEqual(parsed.length, 4);
    assert.strictEqual(parsed[1].label, "เกี่ยวกับเรา");
    assert.strictEqual(parsed[1].href, "/store/apple-lab/about");
    assert.strictEqual(parsed[1].isExternal, false);

    assert.strictEqual(parsed[3].isExternal, true);
  });

  it("5. LandingNavbar renders dynamic navigation menu and resolves subpage anchors", () => {
    const navigationMenu = [
      { id: "1", label: "บริการช่าง", href: "#services", isExternal: false },
      { id: "2", label: "เกี่ยวกับเรา", href: "/store/apple-lab/about", isExternal: false },
      { id: "3", label: "สอบถามทาง LINE", href: "https://line.me/ti/p/@test", isExternal: true },
    ];

    // Rendering on subpage (isSubpage = true): hash anchor "#services" should resolve to "/store/apple-lab#services"
    const htmlSubpage = renderToString(
      React.createElement(LandingNavbar as any, {
        shopName: "Apple Lab Center",
        shopSlug: "apple-lab",
        navigationMenu,
        isSubpage: true,
      })
    );

    assert.ok(htmlSubpage.includes("Apple Lab Center"));
    assert.ok(htmlSubpage.includes("เกี่ยวกับเรา"));
    assert.ok(htmlSubpage.includes("/store/apple-lab#services")); // Anchor resolved with shopSlug
    assert.ok(htmlSubpage.includes('href="https://line.me/ti/p/@test"'));
    assert.ok(htmlSubpage.includes('target="_blank"'));
  });

  it("6. LandingHero renders all 3 hero layouts ('split', 'centered', 'banner')", () => {
    const layouts: HeroLayoutType[] = ["split", "centered", "banner"];

    for (const layout of layouts) {
      const html = renderToString(
        React.createElement(LandingHero as any, {
          shopName: "iRepair Express",
          shopSlug: "irepair",
          headline: "ศูนย์บริการซ่อมไอโฟนมาตรฐานแท้",
          themeColor: "emerald",
          heroLayout: layout,
          showScanner: true,
          showLiveTracking: true,
        })
      );

      assert.ok(html.includes("iRepair Express"));
      assert.ok(html.includes("ศูนย์บริการซ่อมไอโฟนมาตรฐานแท้"));
      assert.ok(html.includes("LIVE HARDWARE SCANNER"));
      assert.ok(html.includes("ตรวจสอบสถานะงานซ่อม"));

      if (layout === "centered") {
        assert.ok(html.includes("max-w-4xl mx-auto text-center"));
      } else if (layout === "banner") {
        assert.ok(html.includes("rounded-3xl bg-slate-900/80 border border-slate-700/80"));
      } else {
        assert.ok(html.includes("grid grid-cols-1 lg:grid-cols-12 gap-10 items-center"));
      }
    }
  });

  it("7. FONT_FAMILY_CONFIG supports all 6 typography presets with valid Google Fonts", () => {
    const fonts: StorefrontFontFamily[] = ["anuphan", "prompt", "sarabun", "mitr", "kanit", "inter"];

    for (const font of fonts) {
      const config = FONT_FAMILY_CONFIG[font];
      assert.ok(config);
      assert.ok(config.label.length > 0);
      assert.ok(config.googleFont.includes(":wght@"));
      assert.ok(config.fontFamily.includes("sans-serif"));
      assert.ok(config.className.startsWith("font-"));
    }
  });

  it("8. Subpage rich text & custom block dispatching renders seamlessly", () => {
    const customBlock = {
      id: "block-test-promo",
      type: "promo_banner",
      title: "โปรโมชั่นลอกกระจกจอแท้",
      subtitle: "ลดพิเศษ 30% ตลอดเดือนนี้",
      badge: "HOT DEAL",
      buttonText: "จองสิทธิ์เลย",
      buttonUrl: "https://example.com",
    };

    const html = renderToString(
      React.createElement("div", null, [
        React.createElement(RichTextBlock, {
          key: "rich",
          title: "นโยบายการรับประกันงานซ่อม",
          subtitle: "รับประกันอะไหล่แท้มาตรฐานศูนย์",
          content: "### ขอบเขตการรับประกัน\n- รับประกันหน้าจอแท้ 180 วัน\n- รับประกันแบตเตอรี่แท้ 1 ปีเต็ม",
          themeColor: "emerald",
        }),
        React.createElement(DynamicBlockRenderer, {
          key: "block",
          block: customBlock,
          themeColor: "emerald",
          tenantInfo: { shopName: "SmartService", phone: "0812345678" },
        }),
      ])
    );

    assert.ok(html.includes("นโยบายการรับประกันงานซ่อม"));
    assert.ok(html.includes("รับประกันหน้าจอแท้ 180 วัน"));
    assert.ok(html.includes("โปรโมชั่นลอกกระจกจอแท้"));
    assert.ok(html.includes("จองสิทธิ์เลย"));
  });
});
