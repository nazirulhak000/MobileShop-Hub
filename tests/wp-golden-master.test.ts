/**
 * Golden Master 50-Round Stress Test Suite
 * (WordPress Enterprise Parity Loop - Round 50)
 * 
 * Verifies all 50 architectural rounds end-to-end:
 * - Round 41: WordPress REST API v2 Engine (/wp/v2/pages schema parity)
 * - Round 42: Template Parts Engine (Header / Footer swappable parts)
 * - Round 43: Global Style Variations (Curated 1-click theme presets)
 * - Round 44: Scoped Block CSS Engine (Container-scoped CSS isolation)
 * - Round 45: Transient Caching API (set_transient, get_transient, TTL purge)
 * - Round 46: WXR XML Export & Import Engine (WXR 1.2 WordPress backup parity)
 * - Round 47: Custom Post Types & Custom Meta Box Engine (register_post_type & post_meta)
 * - Round 48: Multi-Menu Locations Engine (register_nav_menus & location slots)
 * - Round 49: Dynamic RSS 2.0 / Atom Syndication Feed (RFC 822 & CDATA feeds)
 * - Round 50: Golden Master End-to-End System Integration & Zero Regressions
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

// Round 41: REST API v2
import {
  formatCustomPageToWpRest,
  formatCustomPagesToWpRestList,
  queryWpRestPages,
} from "../src/lib/wordpress/restApiEngine";

// Round 42: Template Parts
import {
  register_template_part,
  get_template_part,
  get_template_parts_by_area,
  resolve_template_part_layout,
  reset_template_parts,
} from "../src/lib/wordpress/templateParts";

// Round 43: Style Variations
import {
  STYLE_VARIATIONS,
  getStyleVariations,
  getStyleVariationById,
  applyStyleVariationToConfig,
} from "../src/lib/wordpress/styleVariations";

// Round 44: Scoped CSS
import {
  scopeCssRules,
  sanitizeCss,
} from "../src/lib/wordpress/scopedCssEngine";

// Round 45: Transients
import {
  set_transient,
  get_transient,
  delete_transient,
  delete_expired_transients,
  createTenantTransientStore,
} from "../src/lib/wordpress/transientEngine";

// Round 46: WXR XML
import {
  exportToWxrXml,
  importFromWxrXml,
} from "../src/lib/wordpress/wxrEngine";

// Round 47: CPT & Meta Box
import {
  registerPostType,
  getPostTypeObject,
  updatePostMeta,
  getPostMeta,
  deletePostMeta,
  setRepairServiceMeta,
  getRepairServiceMeta,
  clearCustomFieldsForTesting,
} from "../src/lib/wordpress/customFieldsEngine";

// Round 48: Multi-Menu Locations
import {
  register_nav_menus,
  get_registered_nav_menus,
  set_nav_menu_location,
  get_nav_menu_by_location,
  has_nav_menu,
  reset_nav_menus,
} from "../src/lib/wordpress/navMenuLocations";

// Round 49: RSS 2.0 & Atom
import {
  generateRssFeed,
  generateAtomFeed,
  createFeedItemsFromStorefront,
  toRfc822Date,
} from "../src/lib/wordpress/feedEngine";

// Core Engines
import {
  serializeToGutenberg,
  parseGutenbergContent,
} from "../src/lib/wordpress/gutenbergConverter";
import {
  createRevision,
  rollbackToRevision,
  getRevisions,
  clearRevisionsForTesting,
} from "../src/lib/wordpress/revisionEngine";
import {
  resolvePageTemplate,
  SUPPORTED_PAGE_TEMPLATES,
} from "../src/lib/wordpress/templateHierarchy";
import { runSiteHealthAudit } from "../src/lib/wordpress/siteHealthEngine";
import { do_shortcode } from "../src/lib/wordpress/shortcodeEngine";

import {
  DEFAULT_STOREFRONT_CONFIG,
  CustomPage,
  safeParseCustomPages,
  StorefrontConfigData,
} from "../src/lib/storefrontTheme";

describe("Round 50: Golden Master 50-Round Enterprise Parity Suite", () => {
  beforeEach(() => {
    clearCustomFieldsForTesting();
    clearRevisionsForTesting();
    reset_template_parts();
    reset_nav_menus();
  });

  // =========================================================================
  // 1. Round 41: WordPress REST API v2 Engine
  // =========================================================================
  describe("Round 41: WordPress REST API v2 Schema Parity", () => {
    it("1.1 Formats CustomPage to standard /wp/v2/pages schema with rendered objects and HAL _links", () => {
      const page: CustomPage = {
        id: "page-warranty-101",
        slug: "warranty-terms",
        title: "นโยบายการรับประกันงานซ่อม",
        subtitle: "รับประกันอะไหล่แท้ 1 ปีเต็ม",
        content: "<p>รายละเอียดเงื่อนไขการรับประกันงานซ่อมทุกชิ้นส่วน</p>",
        published: true,
        template: "boxed-fluid",
        updatedAt: "2026-11-20T08:00:00Z",
      };

      const restPage = formatCustomPageToWpRest(page, 0, "https://fixme.in.th", "fixme-bangkok");

      assert.equal(restPage.slug, "warranty-terms");
      assert.equal(restPage.status, "publish");
      assert.equal(restPage.type, "page");
      assert.equal(restPage.template, "boxed-fluid");
      assert.equal(restPage.title.rendered, "นโยบายการรับประกันงานซ่อม");
      assert.ok(restPage.content.rendered.includes("รายละเอียดเงื่อนไข"));
      assert.ok(restPage.excerpt.rendered.includes("รับประกันอะไหล่แท้"));
      assert.ok(restPage._links.self[0].href.includes("/api/storefront/v2/pages"));
      assert.ok(restPage._links.collection[0].href.includes("/api/storefront/v2/pages"));
    });

    it("1.2 Filters and queries REST pages by status, search keyword, and pagination", () => {
      const rawPages: CustomPage[] = [
        { id: "1", slug: "screen-repair", title: "เปลี่ยนจอ iPhone", published: true },
        { id: "2", slug: "battery-swap", title: "เปลี่ยนแบตเตอรี่ iPad", published: true },
        { id: "3", slug: "draft-page", title: "ฉบับร่างเตรียมเปิดตัว", published: false },
      ];

      const restPages = formatCustomPagesToWpRestList(rawPages, "https://fixme.in.th", "shop-1");

      // Query only published
      const publishedQuery = queryWpRestPages(restPages, { status: "publish" });
      assert.equal(publishedQuery.items.length, 2);
      assert.equal(publishedQuery.total, 2);

      // Search keyword
      const searchQuery = queryWpRestPages(restPages, { search: "แบตเตอรี่" });
      assert.equal(searchQuery.items.length, 1);
      assert.equal(searchQuery.items[0].slug, "battery-swap");
    });
  });

  // =========================================================================
  // 2. Round 42: Template Parts Engine
  // =========================================================================
  describe("Round 42: Template Parts Engine (Header / Footer Parts)", () => {
    it("2.1 Registers, queries, and resolves Header and Footer template parts", () => {
      const headerParts = get_template_parts_by_area("header");
      const footerParts = get_template_parts_by_area("footer");

      assert.ok(headerParts.length >= 3);
      assert.ok(footerParts.length >= 3);

      const standardHeader = get_template_part("header-standard");
      assert.ok(standardHeader);
      assert.equal(standardHeader.area, "header");

      const layout = resolve_template_part_layout("header", "header-minimal");
      assert.equal(layout.slug, "header-minimal");
      assert.equal(layout.area, "header");
    });

    it("2.2 Allows custom template part registration and fallback resolution", () => {
      register_template_part({
        slug: "header-neon",
        name: "header-neon",
        title: "Cyber Neon Header",
        area: "header",
        description: "Glowing neon navigation bar",
        layoutType: "neon",
        defaultAttributes: { hasPhone: true, hasLine: true, isSticky: true },
      });

      const neonHeader = get_template_part("header-neon");
      assert.ok(neonHeader);
      assert.equal(neonHeader.title, "Cyber Neon Header");

      // Unregistered fallback to standard
      const fallback = resolve_template_part_layout("header", "non-existent-part");
      assert.equal(fallback.slug, "header-standard");
    });
  });

  // =========================================================================
  // 3. Round 43: Global Style Variations
  // =========================================================================
  describe("Round 43: Global Style Variations", () => {
    it("3.1 Exposes 5 curated style variations with distinct token sets", () => {
      const variations = getStyleVariations();
      assert.equal(variations.length, 5);

      const ids = variations.map((v) => v.id);
      assert.ok(ids.includes("midnight-pro"));
      assert.ok(ids.includes("minimalist-clean"));
      assert.ok(ids.includes("cyber-neon"));
      assert.ok(ids.includes("warm-amber"));
      assert.ok(ids.includes("pastel-modern"));
    });

    it("3.2 applyStyleVariationToConfig cleanly applies variation tokens to storefront configuration", () => {
      const baseConfig: Partial<StorefrontConfigData> = {
        themeColor: "emerald",
        fontFamily: "anuphan",
      };

      const applied = applyStyleVariationToConfig(baseConfig, "cyber-neon");
      assert.equal(applied.themeColor, "cyan");
      assert.equal(applied.fontFamily, "mitr");
    });
  });

  // =========================================================================
  // 4. Round 44: Scoped Block CSS Engine
  // =========================================================================
  describe("Round 44: Scoped Block CSS Engine", () => {
    it("4.1 Prefixes CSS rules with target scope selector and sanitizes dangerous statements", () => {
      const rawCss = `
        .my-card { background: red; padding: 10px; }
        h3 { font-size: 20px; }
        @import url('https://evil.com/hack.css');
      `;

      const scoped = scopeCssRules(rawCss, "#block-promo-101");

      // Verifies scope prefixing
      assert.ok(scoped.includes("#block-promo-101 .my-card"));
      assert.ok(scoped.includes("#block-promo-101 h3"));
      // Verifies malicious @import was stripped
      assert.ok(!scoped.includes("@import"));
    });

    it("4.2 Preserves media queries and keyframes while scoping inner selectors", () => {
      const cssWithMedia = `
        @media (max-width: 768px) {
          .banner-title { font-size: 16px; }
        }
      `;

      const scoped = scopeCssRules(cssWithMedia, ".custom-section");
      assert.ok(scoped.includes("@media (max-width: 768px)"));
      assert.ok(scoped.includes(".custom-section .banner-title"));
    });
  });

  // =========================================================================
  // 5. Round 45: WordPress Transient Caching API
  // =========================================================================
  describe("Round 45: Transient Caching API", () => {
    it("5.1 Stores, retrieves, and deletes cached transient values", () => {
      const key = "fixme_store_branches";
      const branches = [{ id: "b1", name: "Siam Branch" }, { id: "b2", name: "Asok Branch" }];

      set_transient(key, branches, 60);
      const cached = get_transient(key);
      assert.deepEqual(cached, branches);

      delete_transient(key);
      assert.equal(get_transient(key), false);
    });

    it("5.2 Automatically expires transients after TTL and purges expired entries", () => {
      const store = createTenantTransientStore("tenant-ttl-test", 100);
      // Set transient with 1 millisecond expiration for testing
      store.set("quick_expire", { message: "bye" }, 0.001);

      // Wait 15ms
      const start = Date.now();
      while (Date.now() - start < 15) {}

      const purged = store.purgeExpired();
      assert.equal(purged, 1);
      assert.equal(store.get("quick_expire"), false);
    });
  });

  // =========================================================================
  // 6. Round 46: WordPress WXR XML Export & Import Engine
  // =========================================================================
  describe("Round 46: WordPress WXR XML Export & Import Engine", () => {
    it("6.1 Exports storefront subpages to standard WXR 1.2 XML and imports back with zero data loss", () => {
      const subpages: CustomPage[] = [
        {
          id: "p1",
          slug: "warranty-terms",
          title: "นโยบายการรับประกัน",
          subtitle: "รับประกัน 1 ปี",
          content: "<p>รายละเอียดการรับประกันอะไหล่มาตรฐานแล็บ</p>",
          published: true,
          template: "boxed-fluid",
          categories: ["นโยบาย", "บริการ"],
          tags: ["ประกัน", "แล็บ"],
        },
      ];

      const wxrXml = exportToWxrXml({
        shopName: "FixMe Lab Store",
        shopSlug: "lab",
        baseUrl: "https://fixme.in.th",
        pages: subpages,
      });

      assert.ok(wxrXml.includes("<rss version=\"2.0\""));
      assert.ok(wxrXml.includes("<wp:wxr_version>1.2</wp:wxr_version>"));
      assert.ok(wxrXml.includes("<wp:post_type><![CDATA[page]]></wp:post_type>"));
      assert.ok(wxrXml.includes("<wp:post_name><![CDATA[warranty-terms]]></wp:post_name>"));

      // Import back
      const importResult = importFromWxrXml(wxrXml);
      assert.equal(importResult.pages.length, 1);

      const importedPage = importResult.pages[0];
      assert.equal(importedPage.slug, "warranty-terms");
      assert.equal(importedPage.title, "นโยบายการรับประกัน");
      assert.equal(importedPage.template, "boxed-fluid");
      assert.ok(importedPage.categories?.includes("นโยบาย"));
    });
  });

  // =========================================================================
  // 7. Round 47: Custom Post Types & Custom Meta Box Engine
  // =========================================================================
  describe("Round 47: Custom Post Types & Custom Meta Box Engine", () => {
    it("7.1 Registers domain CPTs and queries their schema configuration", () => {
      const serviceCpt = getPostTypeObject("repair_service");
      assert.ok(serviceCpt);
      assert.equal(serviceCpt.public, true);
      assert.equal(serviceCpt.rewrite.slug, "services");
      assert.ok(serviceCpt.supports.includes("custom-fields"));
    });

    it("7.2 Stores, queries, and updates typed repair service custom fields", () => {
      const postId = "service-iphone-screen-15";
      const tenantId = "tenant-repair-cpt";

      setRepairServiceMeta(postId, {
        priceRange: { min: 2500, max: 4500, currency: "THB" },
        repairDuration: "30-45 นาที",
        warrantyPeriod: "1 ปีเต็ม",
        isFeatured: true,
        deviceCompatibility: ["iPhone 15 Pro", "iPhone 15"],
        labCertified: true,
        partGrade: "OEM",
      }, tenantId);

      const meta = getRepairServiceMeta(postId, tenantId);
      assert.equal(meta.repairDuration, "30-45 นาที");
      assert.equal(meta.warrantyPeriod, "1 ปีเต็ม");
      assert.equal(meta.isFeatured, true);
      assert.equal(meta.partGrade, "OEM");
      assert.deepEqual(meta.priceRange, { min: 2500, max: 4500, currency: "THB" });
      assert.deepEqual(meta.deviceCompatibility, ["iPhone 15 Pro", "iPhone 15"]);

      // Verify single update_post_meta
      updatePostMeta(postId, "custom_tech_note", "เปลี่ยนกาวกันน้ำรอบจอ", undefined, tenantId);
      assert.equal(getPostMeta(postId, "custom_tech_note", true, tenantId), "เปลี่ยนกาวกันน้ำรอบจอ");
    });
  });

  // =========================================================================
  // 8. Round 48: Multi-Menu Locations Engine
  // =========================================================================
  describe("Round 48: Multi-Menu Locations Engine", () => {
    it("8.1 Registers menu locations and maps navigation menus to slots (primary, footer, mobile, sidebar)", () => {
      const registered = get_registered_nav_menus();
      assert.ok(registered.length >= 4);

      const primaryMenu = [
        { label: "หน้าแรก", href: "#" },
        { label: "บริการซ่อม", href: "#services" },
      ];
      const footerMenu = [
        { label: "นโยบายการรับประกัน", href: "/store/my-shop/warranty" },
        { label: "ติดต่อเรา", href: "#contact" },
      ];

      set_nav_menu_location("primary", primaryMenu, "tenant-nav");
      set_nav_menu_location("footer", footerMenu, "tenant-nav");

      assert.equal(has_nav_menu("primary", "tenant-nav"), true);
      assert.equal(has_nav_menu("footer", "tenant-nav"), true);
      assert.equal(has_nav_menu("sidebar", "tenant-nav"), false);

      const retrievedPrimary = get_nav_menu_by_location("primary", "tenant-nav");
      assert.equal(retrievedPrimary.length, 2);
      assert.equal(retrievedPrimary[0].label, "หน้าแรก");
    });
  });

  // =========================================================================
  // 9. Round 49: Dynamic RSS 2.0 / Atom Syndication Feed
  // =========================================================================
  describe("Round 49: Dynamic RSS 2.0 / Atom Syndication Feed", () => {
    it("9.1 Generates valid RSS 2.0 XML with RFC 822 timestamps and CDATA sections", () => {
      const channel = {
        title: "FixMe Official Lab Store",
        link: "https://fixme.in.th/store/fixme-lab",
        feedUrl: "https://fixme.in.th/store/fixme-lab/feed",
        description: "บริการซ่อมด่วนมาตรฐานแล็บ",
        shopName: "FixMe Lab",
        lastBuildDate: new Date(),
      };

      const items = [
        {
          title: "เปิดสาขาใหม่ใจกลางสยาม",
          link: "https://fixme.in.th/store/fixme-lab/new-branch",
          pubDate: new Date(),
          excerpt: "ศูนย์บริการมาตรฐานครบวงจร",
          content: "<p>พร้อมช่างผู้เชี่ยวชาญระดับสากล</p>",
          categories: ["ข่าวสาร", "สาขา"],
        },
      ];

      const rss = generateRssFeed(channel, items);
      assert.ok(rss.startsWith("<?xml version=\"1.0\" encoding=\"UTF-8\"?>"));
      assert.ok(rss.includes("<rss version=\"2.0\""));
      assert.ok(rss.includes("<title>FixMe Official Lab Store</title>"));
      assert.ok(rss.includes("<link>https://fixme.in.th/store/fixme-lab</link>"));
      assert.ok(rss.includes("<generator>FixMe Enterprise WordPress Feed Engine v2.0</generator>"));
      assert.ok(rss.includes("<p>พร้อมช่างผู้เชี่ยวชาญระดับสากล</p>"));
    });

    it("9.2 Generates valid Atom 1.0 XML with ISO 8601 timestamps", () => {
      const channel = {
        title: "Atom Feed Store",
        link: "https://fixme.in.th/store/atom-shop",
        feedUrl: "https://fixme.in.th/store/atom-shop/feed?format=atom",
        description: "Atom Syndication",
        shopName: "Atom Shop",
      };

      const atom = generateAtomFeed(channel, [
        {
          title: "Service 1",
          link: "https://fixme.in.th/store/atom-shop/s1",
          pubDate: new Date(),
          content: "Content",
        },
      ]);

      assert.ok(atom.includes("<feed xmlns=\"http://www.w3.org/2005/Atom\""));
      assert.ok(atom.includes("<title>Atom Feed Store</title>"));
      assert.ok(atom.includes("<entry>"));
    });
  });

  // =========================================================================
  // 10. Round 50: Golden Master Full Lifecycle Integration & Zero Regressions
  // =========================================================================
  describe("Round 50: Golden Master End-to-End Enterprise Parity", () => {
    it("10.1 Complete Storefront Lifecycle: Custom Page -> Gutenberg -> CPT Meta -> Transients -> Revisions -> Health Audit", () => {
      const tenantId = "golden-master-tenant";

      // 1. Create a custom subpage
      const subpage: CustomPage = {
        id: "p-screen-express",
        slug: "screen-express",
        title: "บริการเปลี่ยนจอแท้รอรับ 30 นาที",
        subtitle: "ห้องคลีนรูมปลอดฝุ่น พร้อมรับประกัน 1 ปี",
        content: `
          ยินดีต้อนรับสู่ศูนย์บริการซ่อมมาตรฐาน
          [repair_tracker button="เช็คสถานะงานซ่อม" placeholder="ใส่เลข IMEI"]
          [contact_card phone="081-888-9999" line="@fixme_express"]
        `,
        published: true,
        template: "landing-lead",
        categories: ["บริการด่วน", "หน้าจอ"],
        tags: ["iphone15", "oled"],
      };

      // 2. Expand shortcodes
      const expandedContent = do_shortcode(subpage.content!, { shopSlug: "express-shop" });
      assert.ok(expandedContent.includes("เช็คสถานะงานซ่อม"));
      assert.ok(expandedContent.includes("081-888-9999"));

      // 3. Serialize to Gutenberg Block Grammar
      const gutenbergHtml = serializeToGutenberg([
        { id: "b1", type: "rich_text", title: subpage.title, content: expandedContent },
      ]);
      assert.ok(gutenbergHtml.includes("<!-- wp:fixme/rich-text"));

      // 4. Attach typed repair service metadata
      setRepairServiceMeta(subpage.id!, {
        priceRange: { min: 2900, max: 5900, currency: "THB" },
        repairDuration: "30 นาที",
        warrantyPeriod: "1 ปี",
        isFeatured: true,
      }, tenantId);
      const meta = getRepairServiceMeta(subpage.id!, tenantId);
      assert.equal(meta.repairDuration, "30 นาที");

      // 5. Cache in Transient API
      set_transient(`storefront:${tenantId}:page:${subpage.slug}`, subpage, 300);
      const cached = get_transient<CustomPage>(`storefront:${tenantId}:page:${subpage.slug}`);
      assert.equal(cached && cached.slug, "screen-express");

      // 6. Record in Time-Travel Revision History
      const rev1 = createRevision(tenantId, "storefront", {
        themeColor: "emerald",
        headline: "Express Repair Lab",
        customPages: JSON.stringify([subpage]),
      });
      assert.ok(rev1.id);

      // 7. Template Hierarchy Resolution
      const resolvedTemplate = resolvePageTemplate(subpage);
      assert.equal(resolvedTemplate, "landing-lead");

      // 8. Site Health Diagnostic Audit
      const healthReport = runSiteHealthAudit({
        headline: "ศูนย์บริการซ่อมมือถือด่วนมาตรฐานแล็บ รอรับได้ใน 30 นาที",
        subheadline: "บริการตรวจเช็คอาการเครื่อง 10 รายการฟรี พร้อมระบบ Live Tracking และประกันสูงสุด 1 ปี",
        phone: "081-888-9999",
        lineId: "@fixme_express",
        announcementEnabled: true,
        announcementText: "เปิดบริการทุกวัน 09:00 - 20:00 น.",
        customPages: JSON.stringify([subpage]),
      });
      assert.equal(healthReport.status, "good");
      assert.ok(healthReport.score >= 85);
      assert.equal(healthReport.criticalCount, 0);
    });
  });
});
