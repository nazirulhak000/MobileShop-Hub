import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  serializeToGutenberg,
  parseGutenbergContent,
} from "../src/lib/wordpress/gutenbergConverter";
import {
  generateThemeJson,
  compileThemeJsonToCss,
  parseThemeJson,
  DEFAULT_WP_SPACING_TOKENS,
  DEFAULT_WP_FONT_SIZES,
} from "../src/lib/wordpress/themeJsonEngine";
import {
  WordPressHookBus,
  defaultHooks,
  addFilter,
  applyFilters,
  addAction,
  doAction,
  removeFilter,
  removeAction,
  hasFilter,
  hasAction,
} from "../src/lib/wordpress/hookSystem";
import { CustomBlock } from "../src/lib/storefrontTheme";

describe("WordPress Core Engine (Rounds 21, 22, 26)", () => {
  // =========================================================================
  // ROUND 21: Gutenberg Block Serialization & Deserialization
  // =========================================================================
  describe("Round 21: Gutenberg Block Grammar Serialization & Deserialization", () => {
    it("21.1 Serializes void custom blocks to self-closing Gutenberg comments", () => {
      const blocks: CustomBlock[] = [
        {
          id: "block-promo-1",
          type: "promo_banner",
          title: "ส่วนลด 200 บาท",
          subtitle: "เปลี่ยนแบตแท้",
          discountTag: "BAT200",
          buttonText: "จองสิทธิ์",
          buttonUrl: "https://line.me/@shop",
        },
        {
          id: "block-cta-1",
          type: "cta",
          title: "ปรึกษาอาการฟรี",
          phone: "0812345678",
          lineId: "@fixmeshop",
        },
      ];

      const serialized = serializeToGutenberg(blocks);

      // Verify Gutenberg grammar format
      assert.ok(serialized.includes('<!-- wp:fixme/promo-banner {"id":"block-promo-1"'));
      assert.ok(serialized.includes('"discountTag":"BAT200"'));
      assert.ok(serialized.includes('/-->'));
      assert.ok(serialized.includes('<!-- wp:fixme/cta {"id":"block-cta-1"'));
      assert.ok(serialized.includes('"phone":"0812345678"'));
    });

    it("21.2 Serializes container blocks (rich-text, html-embed) to paired comments with innerHTML", () => {
      const blocks: CustomBlock[] = [
        {
          id: "block-rich-1",
          type: "rich_text",
          title: "นโยบายการรับประกัน",
          content: "ข้อความวรรคที่ 1\n\nข้อความวรรคที่ 2",
          align: "left",
        },
        {
          id: "block-html-1",
          type: "html_embed",
          title: "Google Map Embed",
          html: '<iframe src="https://maps.google.com"></iframe>',
          height: 450,
        },
      ];

      const serialized = serializeToGutenberg(blocks);

      // Verify paired opening and closing comments
      assert.ok(serialized.includes('<!-- wp:fixme/rich-text {"id":"block-rich-1"'));
      assert.ok(serialized.includes("<!-- /wp:fixme/rich-text -->"));
      assert.ok(serialized.includes("<p>ข้อความวรรคที่ 1</p>"));

      assert.ok(serialized.includes('<!-- wp:fixme/html-embed {"id":"block-html-1"'));
      assert.ok(serialized.includes("<!-- /wp:fixme/html-embed -->"));
      assert.ok(serialized.includes('<iframe src="https://maps.google.com"></iframe>'));
    });

    it("21.3 Parses Gutenberg self-closing and paired blocks into FixMe CustomBlock array", () => {
      const gutenbergHtml = `
        <!-- wp:fixme/promo-banner {"id":"p-100","title":"Super Promo","badge":"HOT"} /-->

        <!-- wp:fixme/rich-text {"id":"r-200","title":"About Lab"} -->
        <div class="wp-block-fixme-rich-text">
        <p>ห้องแล็บซ่อมมือถือปลอดฝุ่น Cleanroom</p>
        </div>
        <!-- /wp:fixme/rich-text -->

        <!-- wp:fixme/business-hours {"id":"bh-300","showLiveStatus":true} /-->
      `;

      const blocks = parseGutenbergContent(gutenbergHtml);

      assert.strictEqual(blocks.length, 3);
      assert.strictEqual(blocks[0].id, "p-100");
      assert.strictEqual(blocks[0].type, "promo_banner");
      assert.strictEqual(blocks[0].title, "Super Promo");
      assert.strictEqual(blocks[0].badge, "HOT");

      assert.strictEqual(blocks[1].id, "r-200");
      assert.strictEqual(blocks[1].type, "rich_text");
      assert.strictEqual(blocks[1].title, "About Lab");
      assert.ok(blocks[1].content?.includes("ห้องแล็บซ่อมมือถือปลอดฝุ่น"));

      assert.strictEqual(blocks[2].id, "bh-300");
      assert.strictEqual(blocks[2].type, "business_hours");
      assert.strictEqual(blocks[2].showLiveStatus, true);
    });

    it("21.4 Maps standard WordPress Core blocks (paragraph, heading, html) into FixMe equivalents", () => {
      const wpCoreHtml = `
        <!-- wp:heading {"level":2} -->
        <h2>หัวข้อสำคัญ</h2>
        <!-- /wp:heading -->

        <!-- wp:paragraph -->
        <p>ย่อหน้าข้อความมาตรฐานของ WordPress</p>
        <!-- /wp:paragraph -->

        <!-- wp:html -->
        <div class="custom-widget">Widget Content</div>
        <!-- /wp:html -->
      `;

      const blocks = parseGutenbergContent(wpCoreHtml);
      assert.strictEqual(blocks.length, 3);
      assert.strictEqual(blocks[0].type, "rich_text");
      assert.strictEqual(blocks[1].type, "rich_text");
      assert.strictEqual(blocks[2].type, "html_embed");
    });

    it("21.5 Preserves freeform HTML between or outside block comments", () => {
      const mixedHtml = `
        <p>ข้อความนอกบล็อกแบบ Freeform</p>
        <!-- wp:fixme/cta {"id":"cta-99"} /-->
        <footer>ข้อความต่อท้าย</footer>
      `;

      const blocks = parseGutenbergContent(mixedHtml);
      assert.strictEqual(blocks.length, 3);
      assert.strictEqual(blocks[0].type, "rich_text");
      assert.strictEqual(blocks[0].content, "ข้อความนอกบล็อกแบบ Freeform");
      assert.strictEqual(blocks[1].id, "cta-99");
      assert.strictEqual(blocks[2].type, "rich_text");
      assert.strictEqual(blocks[2].content, "ข้อความต่อท้าย");
    });

    it("21.6 Roundtrip serialization / deserialization preserves block identity and properties", () => {
      const original: CustomBlock[] = [
        {
          id: "roundtrip-promo",
          type: "promo_banner",
          title: "Title 1",
          subtitle: "Subtitle 1",
          discountTag: "SALE50",
          bgType: "gradient",
          visible: true,
          enabled: true,
        },
        {
          id: "roundtrip-rich",
          type: "rich_text",
          title: "Title 2",
          content: "Body Paragraph",
          align: "center",
          visible: true,
          enabled: true,
        },
      ];

      const serialized = serializeToGutenberg(original);
      const restored = parseGutenbergContent(serialized);

      assert.strictEqual(restored.length, 2);
      assert.strictEqual(restored[0].id, "roundtrip-promo");
      assert.strictEqual(restored[0].type, "promo_banner");
      assert.strictEqual(restored[0].discountTag, "SALE50");
      assert.strictEqual(restored[1].id, "roundtrip-rich");
      assert.strictEqual(restored[1].type, "rich_text");
      assert.strictEqual(restored[1].content, "Body Paragraph");
    });
  });

  // =========================================================================
  // ROUND 22: Theme.json 3-Layer Design Token Engine
  // =========================================================================
  describe("Round 22: Theme.json 3-Layer Design Token Engine", () => {
    it("22.1 Generates WordPress theme.json v3 specification structure", () => {
      const themeJson = generateThemeJson(
        { themeColor: "cyan", fontFamily: "prompt" },
        "Bangkok Apple Care"
      );

      assert.strictEqual(themeJson.version, 3);
      assert.strictEqual(themeJson.$schema, "https://schemas.wp.org/trunk/theme.json");
      assert.strictEqual(themeJson.title, "Bangkok Apple Care WordPress Block Theme");

      // Layer 1: Settings
      assert.ok(Array.isArray(themeJson.settings.color?.palette));
      assert.ok(Array.isArray(themeJson.settings.typography?.fontFamilies));
      assert.ok(Array.isArray(themeJson.settings.spacing?.spacingSizes));

      // Layer 2: Styles
      assert.ok(themeJson.styles.color?.background?.includes("var(--wp--preset--color"));
      assert.ok(themeJson.styles.elements?.button?.color?.background?.includes("primary"));

      // Layer 3: Custom
      assert.strictEqual(themeJson.settings.custom?.themeColor, "cyan");
      assert.strictEqual(themeJson.settings.custom?.primaryHex, "#06b6d4");
    });

    it("22.2 Maps all FixMe theme palettes to primary color tokens", () => {
      const emeraldJson = generateThemeJson({ themeColor: "emerald" });
      const purpleJson = generateThemeJson({ themeColor: "purple" });
      const roseJson = generateThemeJson({ themeColor: "rose" });

      const emeraldPrimary = emeraldJson.settings.color?.palette?.find((c) => c.slug === "primary");
      const purplePrimary = purpleJson.settings.color?.palette?.find((c) => c.slug === "primary");
      const rosePrimary = roseJson.settings.color?.palette?.find((c) => c.slug === "primary");

      assert.strictEqual(emeraldPrimary?.color, "#10b981");
      assert.strictEqual(purplePrimary?.color, "#a855f7");
      assert.strictEqual(rosePrimary?.color, "#f43f5e");
    });

    it("22.3 Compiles theme.json into standard --wp--preset--* CSS custom properties", () => {
      const themeJson = generateThemeJson({ themeColor: "blue", fontFamily: "sarabun" });
      const css = compileThemeJsonToCss(themeJson);

      // Verify :root declaration
      assert.ok(css.includes(":root {"));

      // Verify color CSS variables
      assert.ok(css.includes("--wp--preset--color--primary: #3b82f6;"));
      assert.ok(css.includes("--wp--preset--color--secondary: #06C755;"));
      assert.ok(css.includes("--wp--preset--color--background: #ffffff;"));

      // Verify font family and font size variables
      assert.ok(css.includes("--wp--preset--font-family--sarabun:"));
      assert.ok(css.includes("--wp--preset--font-size--medium: 1rem;"));

      // Verify spacing variables
      assert.ok(css.includes("--wp--preset--spacing--30: 1rem;"));

      // Verify utility classes
      assert.ok(css.includes(".has-primary-color { color: var(--wp--preset--color--primary) !important; }"));
      assert.ok(
        css.includes(".has-primary-background-color { background-color: var(--wp--preset--color--primary) !important; }")
      );
    });

    it("22.4 parseThemeJson handles valid JSON and recovers gracefully from corrupted input", () => {
      // Valid input
      const sample = generateThemeJson({ themeColor: "amber" });
      const parsed = parseThemeJson(JSON.stringify(sample));
      assert.strictEqual(parsed.settings.custom?.themeColor, "amber");

      // Corrupted input falls back cleanly to default theme.json
      const fallback = parseThemeJson("{{{broken invalid json");
      assert.strictEqual(fallback.version, 3);
      assert.ok(Array.isArray(fallback.settings.color?.palette));
    });
  });

  // =========================================================================
  // ROUND 26: Hooks & Filters Event Bus
  // =========================================================================
  describe("Round 26: WordPress Hooks & Filters Event Bus", () => {
    it("26.1 Filter Pipeline: Transforms values sequentially across registered callbacks", () => {
      const bus = new WordPressHookBus();

      bus.addFilter("storefront_headline", (text: string) => `[Hot] ${text}`);
      bus.addFilter("storefront_headline", (text: string) => `${text} - โทร 081-xxx`);

      const result = bus.applyFilters("storefront_headline", "ศูนย์ซ่อมมือถือ");
      assert.strictEqual(result, "[Hot] ศูนย์ซ่อมมือถือ - โทร 081-xxx");
    });

    it("26.2 Priority Ordering: Executes filters in ascending order of priority", () => {
      const bus = new WordPressHookBus();

      // Register out of order
      bus.addFilter("calculate_price", (price: number) => price + 100, 20); // Third
      bus.addFilter("calculate_price", (price: number) => price * 2, 5);    // First
      bus.addFilter("calculate_price", (price: number) => price - 50, 10);  // Second

      // Calculation: (1000 * 2) - 50 + 100 = 2050
      const finalPrice = bus.applyFilters("calculate_price", 1000);
      assert.strictEqual(finalPrice, 2050);
    });

    it("26.3 Accepted Arguments: Limits arguments passed to callbacks based on acceptedArgs", () => {
      const bus = new WordPressHookBus();
      let capturedArgsCount = 0;

      bus.addFilter(
        "test_args_filter",
        (...args: any[]) => {
          capturedArgsCount = args.length;
          return args[0];
        },
        10,
        2 // Only accept 2 arguments even if 4 are passed
      );

      bus.applyFilters("test_args_filter", "initial", "arg2", "arg3", "arg4");
      assert.strictEqual(capturedArgsCount, 2);
    });

    it("26.4 Action Triggers: Executes side-effect callbacks in priority order", () => {
      const bus = new WordPressHookBus();
      const events: string[] = [];

      bus.addAction("storefront_after_header", () => events.push("priority-20"), 20);
      bus.addAction("storefront_after_header", () => events.push("priority-5"), 5);
      bus.addAction("storefront_after_header", () => events.push("priority-10"), 10);

      bus.doAction("storefront_after_header");

      assert.deepStrictEqual(events, ["priority-5", "priority-10", "priority-20"]);
    });

    it("26.5 Dynamic Removal: removeFilter and removeAction unregister listeners cleanly", () => {
      const bus = new WordPressHookBus();

      const filterId = bus.addFilter("custom_badge", (b: string) => `Special ${b}`);
      assert.strictEqual(bus.hasFilter("custom_badge"), true);

      const res1 = bus.applyFilters("custom_badge", "Gold");
      assert.strictEqual(res1, "Special Gold");

      // Remove filter
      const removed = bus.removeFilter("custom_badge", filterId);
      assert.strictEqual(removed, true);
      assert.strictEqual(bus.hasFilter("custom_badge"), false);

      const res2 = bus.applyFilters("custom_badge", "Gold");
      assert.strictEqual(res2, "Gold"); // Unmodified
    });

    it("26.6 Error Resilience: Exceptions in one listener do not crash subsequent listeners or bus", () => {
      const bus = new WordPressHookBus();

      bus.addFilter("safe_filter", () => {
        throw new Error("Faulty filter extension");
      }, 5);

      bus.addFilter("safe_filter", (val: string) => `${val} - Recovered`, 10);

      const result = bus.applyFilters("safe_filter", "Start");
      assert.strictEqual(result, "Start - Recovered");
    });

    it("26.7 Global default helper functions integrate seamlessly", () => {
      defaultHooks.reset();

      addFilter("global_test_filter", (val: number) => val + 10);
      const res = applyFilters("global_test_filter", 5);
      assert.strictEqual(res, 15);

      let actionCalled = false;
      addAction("global_test_action", () => {
        actionCalled = true;
      });
      doAction("global_test_action");
      assert.strictEqual(actionCalled, true);
    });
  });
});
