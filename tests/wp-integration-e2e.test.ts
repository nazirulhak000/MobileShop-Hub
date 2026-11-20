/**
 * End-to-End Stress Testing Suite for WordPress Full Integration & Customizer Loop
 * (Round 40)
 * 
 * Verifies end-to-end integration across:
 * 1. Shortcode Engine & Dynamic Widgets (Round 31, 25)
 * 2. Gutenberg Conversion & Block Patterns (Round 21, 23, 34, 35)
 * 3. Revision History & 1-Click Time-Travel Rollback (Round 24, 33)
 * 4. 5 Template Layouts & WordPress Template Hierarchy (Round 27, 37)
 * 5. Site Health Diagnostic Suite & Audit Scoring (Round 30, 32)
 * 6. Theme.json Design Token CSS Compiler (Round 22, 39)
 * 7. Taxonomies, Category Tags & Dynamic Pills (Round 29, 36)
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

// Revisions & Time-Travel
import {
  createRevision,
  getRevisions,
  getRevision,
  compareRevisions,
  restoreRevision,
  rollbackToRevision,
  clearRevisionsForTesting,
} from "../src/lib/wordpress/revisionEngine";

// Template Hierarchy
import {
  SUPPORTED_PAGE_TEMPLATES,
  resolvePageTemplate,
  getPageTemplateHierarchyCandidates,
} from "../src/lib/wordpress/templateHierarchy";

// Site Health
import {
  runSiteHealthAudit,
  SiteHealthReport,
} from "../src/lib/wordpress/siteHealthEngine";

// Taxonomies
import {
  registerTaxonomy,
  addTerm,
  assignTermsToPost,
  getPostTerms,
  getPostsByTerm,
  filterCustomPagesByTerm,
  generateTaxonomyPills,
  clearTaxonomiesForTesting,
} from "../src/lib/wordpress/taxonomyEngine";

// Shortcodes
import {
  do_shortcode,
  add_shortcode,
  strip_shortcodes,
} from "../src/lib/wordpress/shortcodeEngine";

// Gutenberg Converter
import {
  serializeToGutenberg,
  parseGutenbergContent,
} from "../src/lib/wordpress/gutenbergConverter";

// Block Patterns
import {
  registerBlockPattern,
  getBlockPattern,
  getAllBlockPatterns,
  expandPattern,
  createCustomPattern,
  getTenantPatterns,
} from "../src/lib/wordpress/blockPatterns";

// Theme.json
import {
  generateThemeJson,
  compileThemeJsonToCss,
} from "../src/lib/wordpress/themeJsonEngine";

import {
  DEFAULT_STOREFRONT_CONFIG,
  StorefrontConfigData,
  safeParseCustomPages,
  safeParseSectionsOrder,
  safeParseCustomSections,
} from "../src/lib/storefrontTheme";

describe("Round 40: WordPress Integration End-to-End Stress Test Suite", () => {
  // =========================================================================
  // 1. Shortcode Engine & Dynamic Widgets
  // =========================================================================
  describe("1. Shortcode Engine & Dynamic Embeds", () => {
    it("1.1 Expands core shortcodes [repair_tracker], [price_calculator], [contact_card] into interactive HTML", () => {
      const content = `
        ยินดีต้อนรับสู่ศูนย์บริการซ่อมมือถือ
        [repair_tracker button="ค้นหาสถานะงานซ่อม" placeholder="ใส่เลข IMEI 15 หลัก"]
        [price_calculator]
        [contact_card phone="081-999-8888" line="@fixme_lab"]
      `;

      const rendered = do_shortcode(content, { shopSlug: "bangkok-repair" });
      assert.ok(rendered.includes("ค้นหาสถานะงานซ่อม"));
      assert.ok(rendered.includes("ใส่เลข IMEI 15 หลัก"));
      assert.ok(rendered.includes("081-999-8888"));
      assert.ok(rendered.includes("@fixme_lab"));
      assert.ok(!rendered.includes("[repair_tracker"));
    });

    it("1.2 Sanitizes stored XSS injection inside shortcode attributes", () => {
      const maliciousShortcode = `
        [contact_card line="<script>alert('xss')</script>"]
      `;
      const rendered = do_shortcode(maliciousShortcode);
      assert.ok(!rendered.includes("<script>alert('xss')</script>"));
      assert.ok(rendered.includes("&lt;script&gt;alert"));
    });

    it("1.3 strip_shortcodes cleanly removes shortcode tags for plain text summaries / excerpts", () => {
      const text = "ข้อความก่อนหน้า [booking_calendar service='screen'] ข้อความตามหลัง";
      const stripped = strip_shortcodes(text);
      assert.equal(stripped.replace(/\s+/g, " ").trim(), "ข้อความก่อนหน้า ข้อความตามหลัง");
    });
  });

  // =========================================================================
  // 2. Gutenberg Conversion & Block Patterns
  // =========================================================================
  describe("2. Gutenberg Conversion & Synced Block Patterns", () => {
    it("2.1 Round-trip serializes FixMe blocks into Gutenberg HTML comments and deserializes back", () => {
      const originalBlocks = [
        {
          id: "banner-1",
          type: "promo_banner",
          title: "ส่วนลด 20% สำหรับเปลี่ยนแบตเตอรี่",
          couponCode: "BATTERY20",
          visible: true,
          enabled: true,
        },
        {
          id: "rich-1",
          type: "rich_text",
          title: "ทำไมต้องซ่อมกับเรา",
          content: "<p>มาตรฐานห้องคลีนรูม พร้อมรับประกัน 1 ปี</p>",
          visible: true,
          enabled: true,
        },
      ];

      const gutenbergHtml = serializeToGutenberg(originalBlocks);
      assert.ok(gutenbergHtml.includes("<!-- wp:fixme/promo-banner"));
      assert.ok(gutenbergHtml.includes("<!-- wp:fixme/rich-text"));
      assert.ok(gutenbergHtml.includes("<!-- /wp:fixme/rich-text -->"));

      const recoveredBlocks = parseGutenbergContent(gutenbergHtml);
      assert.equal(recoveredBlocks.length, 2);
      assert.equal(recoveredBlocks[0].type, "promo_banner");
      assert.equal(recoveredBlocks[0].title, "ส่วนลด 20% สำหรับเปลี่ยนแบตเตอรี่");
      assert.equal(recoveredBlocks[1].type, "rich_text");
      assert.ok(recoveredBlocks[1].content?.includes("มาตรฐานห้องคลีนรูม"));
    });

    it("2.2 expandPattern creates collision-free blocks with unique IDs", () => {
      const pattern = getBlockPattern("fixme/hero-promo");
      assert.ok(pattern);

      const expanded1 = expandPattern("fixme/hero-promo");
      const expanded2 = expandPattern("fixme/hero-promo");

      assert.equal(expanded1.length, pattern.blocks.length);
      assert.equal(expanded2.length, pattern.blocks.length);

      // Verify IDs in expanded copies are distinct from original and from each other
      const ids1 = expanded1.map((b) => b.id);
      const ids2 = expanded2.map((b) => b.id);

      assert.notDeepEqual(ids1, ids2);
      for (const id of ids1) {
        assert.ok(!ids2.includes(id));
      }
    });

    it("2.3 Tenant custom patterns support multi-tenant isolation", () => {
      const tenantA = "tenant-apple";
      const tenantB = "tenant-samsung";

      createCustomPattern(tenantA, {
        title: "Apple VIP Pattern",
        description: "Custom Apple layout",
        categories: ["featured"],
        blocks: [{ id: "b1", type: "cta", title: "Apple Care" }],
      });

      const patternsA = getTenantPatterns(tenantA);
      const patternsB = getTenantPatterns(tenantB);

      assert.equal(patternsA.length, 1);
      assert.equal(patternsA[0].title, "Apple VIP Pattern");
      assert.equal(patternsB.length, 0); // Tenant B sees zero custom patterns of Tenant A
    });
  });

  // =========================================================================
  // 3. Revisions History & 1-Click Time-Travel Rollback
  // =========================================================================
  describe("3. Revision History & Time-Travel Rollback", () => {
    beforeEach(() => {
      clearRevisionsForTesting();
    });

    it("3.1 Creates snapshot revisions on config mutations and preserves history", () => {
      const tenantId = "tenant-e2e";
      const initialConfig: Partial<StorefrontConfigData> = {
        themeColor: "emerald",
        headline: "Initial Store",
      };

      const rev1 = createRevision(tenantId, "storefront", initialConfig, { name: "Admin 1" }, "First save");
      assert.ok(rev1.id);

      const updatedConfig = { ...initialConfig, themeColor: "blue" as const, headline: "Updated Store" };
      const rev2 = createRevision(tenantId, "storefront", updatedConfig, { name: "Admin 2" }, "Second save");

      const list = getRevisions(tenantId, "storefront");
      assert.equal(list.length, 2);
      assert.equal(list[0].id, rev2.id);

      // Compare diff
      const diff = compareRevisions(rev1.id, rev2.id);
      assert.ok(diff);
      assert.equal(diff.totalChanges, 2);
      assert.ok(diff.changes.some((c) => c.field === "themeColor" && c.newValue === "blue"));
      assert.ok(diff.changes.some((c) => c.field === "headline"));
    });

    it("3.2 Time-travel rollback restores historical snapshot accurately", () => {
      const tenantId = "tenant-rollback-e2e";
      const v1 = { ...DEFAULT_STOREFRONT_CONFIG, themeColor: "rose" as const, headline: "Stable Production" };
      const rev1 = createRevision(tenantId, "storefront", v1);

      const v2 = { ...DEFAULT_STOREFRONT_CONFIG, themeColor: "amber" as const, headline: "Corrupted Test" };
      createRevision(tenantId, "storefront", v2);

      // Rollback to rev1
      const rollback = rollbackToRevision(tenantId, "storefront", rev1.id, { name: "Lead Dev" });
      assert.equal(rollback.success, true);
      assert.ok(rollback.config);
      assert.equal(rollback.config.headline, "Stable Production");
      assert.equal(rollback.config.themeColor, "rose");

      // Verify a rollback revision was added to timeline
      const revs = getRevisions(tenantId, "storefront");
      assert.equal(revs.length, 3);
      assert.ok(revs[0].note?.includes("ย้อนกลับ"));
    });
  });

  // =========================================================================
  // 4. 5 Template Layouts & WordPress Template Hierarchy
  // =========================================================================
  describe("4. 5 Template Layouts & WordPress Template Hierarchy", () => {
    it("4.1 All 5 layout templates are registered and expose distinct properties", () => {
      const templates = Object.keys(SUPPORTED_PAGE_TEMPLATES);
      assert.equal(templates.length, 5);

      assert.equal(SUPPORTED_PAGE_TEMPLATES["blank-canvas"].features.hasNavbar, false);
      assert.equal(SUPPORTED_PAGE_TEMPLATES["sidebar-right"].features.hasSidebar, true);
      assert.equal(SUPPORTED_PAGE_TEMPLATES["boxed-fluid"].features.containerStyle, "boxed");
      assert.equal(SUPPORTED_PAGE_TEMPLATES["landing-lead"].features.hasHeroBanner, true);
      assert.equal(SUPPORTED_PAGE_TEMPLATES["default"].features.containerStyle, "standard");
    });

    it("4.2 Template hierarchy resolves explicitly and hierarchically by slug conventions", () => {
      assert.equal(resolvePageTemplate({ slug: "landing-promo", template: "blank-canvas" }), "blank-canvas");
      assert.equal(resolvePageTemplate({ slug: "warranty-terms" }), "boxed-fluid");
      assert.equal(resolvePageTemplate({ slug: "iphone-battery-promo" }), "landing-lead");
      assert.equal(resolvePageTemplate({ slug: "repair-guide-faq" }), "sidebar-right");
      assert.equal(resolvePageTemplate({ slug: "general-info" }), "default");
    });

    it("4.3 safeParseCustomPages strictly normalizes and validates all 5 templates", () => {
      const input = [
        { slug: "s1", title: "Sidebar", template: "sidebar-right" },
        { slug: "b1", title: "Boxed", template: "boxed-fluid" },
        { slug: "l1", title: "Lead", template: "landing-lead" },
        { slug: "c1", title: "Canvas", template: "blank-canvas" },
        { slug: "d1", title: "Default", template: "default" },
        { slug: "x1", title: "Corrupt", template: "hack_attack_template" },
      ];

      const parsed = safeParseCustomPages(input);
      assert.equal(parsed.length, 6);
      assert.equal(parsed[0].template, "sidebar-right");
      assert.equal(parsed[1].template, "boxed-fluid");
      assert.equal(parsed[2].template, "landing-lead");
      assert.equal(parsed[3].template, "blank-canvas");
      assert.equal(parsed[4].template, "default");
      assert.equal(parsed[5].template, "default"); // Fallback
    });
  });

  // =========================================================================
  // 5. Site Health Diagnostic Suite
  // =========================================================================
  describe("5. Site Health Diagnostic Suite", () => {
    it("5.1 Runs audit on healthy configuration and calculates score >= 85 with 'good' status", () => {
      const config: Partial<StorefrontConfigData> = {
        headline: "ศูนย์บริการซ่อมมือถือมาตรฐานระดับสากล",
        subheadline: "บริการตรวจเช็คสภาพเครื่อง 10 รายการฟรี พร้อมระบบ Live Tracking และประกันสูงสุด 1 ปี",
        phone: "081-123-4567",
        lineId: "@fixme_pro",
        announcementEnabled: true,
        announcementText: "เปิดบริการทุกวัน 09:00 - 21:00 น.",
        navigationMenu: JSON.stringify([
          { id: "1", label: "หน้าแรก", href: "#" },
          { id: "2", label: "บริการซ่อม", href: "#services" },
        ]),
        customSections: JSON.stringify([
          { id: "h1", type: "business_hours", title: "เวลาทำการ", visible: true, enabled: true },
        ]),
      };

      const report: SiteHealthReport = runSiteHealthAudit(config, { shopName: "FixMe Official" });
      assert.equal(report.status, "good");
      assert.ok(report.score >= 85);
      assert.equal(report.criticalCount, 0);
      assert.equal(report.categories.security.status, "good");
      assert.equal(report.categories.seo.status, "good");
      assert.equal(report.categories.performance.status, "good");
    });

    it("5.2 Detects critical security threats and drops score below 60", () => {
      const malicious: Partial<StorefrontConfigData> = {
        phone: "javascript:evil()",
        customSections: JSON.stringify([
          { id: "b1", type: "html", html: "<iframe src='//phishing.com'></iframe><script>steal()</script>" },
        ]),
      };

      const report = runSiteHealthAudit(malicious);
      assert.equal(report.status, "critical");
      assert.ok(report.criticalCount >= 2); // Unsandboxed iframe + dangerous protocol + missing contact
      assert.ok(report.score < 60);
    });
  });

  // =========================================================================
  // 6. Theme.json Design Token Engine
  // =========================================================================
  describe("6. Theme.json Design Token Engine", () => {
    it("6.1 Compiles theme.json tokens into WordPress standard CSS custom properties", () => {
      const themeJson = generateThemeJson({ themeColor: "blue", fontFamily: "sarabun" }, "Blue Lab");
      assert.ok(themeJson.settings);
      assert.ok(themeJson.settings.color?.palette);

      const css = compileThemeJsonToCss(themeJson);
      assert.ok(css.includes("--wp--preset--color--primary:"));
      assert.ok(css.includes("--wp--preset--spacing--30:"));
      assert.ok(css.includes("--wp--preset--font-size--medium:"));
    });
  });

  // =========================================================================
  // 7. Taxonomy & Tagging Engine
  // =========================================================================
  describe("7. Taxonomy & Tagging Engine", () => {
    beforeEach(() => {
      clearTaxonomiesForTesting();
    });

    it("7.1 Assigns terms to subpages, manages usage counts, and generates filterable pills", () => {
      const tenantId = "tenant-tax-e2e";
      assignTermsToPost("subpage-1", "category", ["hardware", "screen"], tenantId);
      assignTermsToPost("subpage-2", "category", ["hardware"], tenantId);

      const hardwarePosts = getPostsByTerm("category", "hardware", tenantId);
      assert.equal(hardwarePosts.length, 2);

      const pages = [
        { slug: "subpage-1", title: "Page 1", categories: ["ฮาร์ดแวร์", "จอภาพ"], published: true },
        { slug: "subpage-2", title: "Page 2", categories: ["ฮาร์ดแวร์"], published: true },
      ];

      const pills = generateTaxonomyPills(pages, "category", "all", "/store/test/services");
      assert.equal(pills[0].slug, "all");
      assert.equal(pills[0].count, 2);

      const hardwarePill = pills.find((p) => p.name === "ฮาร์ดแวร์");
      assert.ok(hardwarePill);
      assert.equal(hardwarePill.count, 2);
    });
  });
});
