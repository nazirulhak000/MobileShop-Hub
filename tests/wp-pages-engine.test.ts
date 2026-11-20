/**
 * Test Suite: WordPress Reverse-Engineering & Hardening Loop (Rounds 24, 27, 29, 30)
 * 
 * Round 24: Post Revisions & Time-Travel Engine (wp_post_revisions)
 * Round 27: Template Hierarchy & Page Layout Engine (5 layout templates)
 * Round 29: Taxonomy & Tagging Engine (Categories, Tags & Filterable Pills)
 * Round 30: Site Health & Storefront Diagnostic Suite (wp-admin/site-health.php)
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

// Round 24
import {
  createRevision,
  getRevisions,
  getRevision,
  compareRevisions,
  restoreRevision,
  rollbackToRevision,
  pruneRevisions,
  clearRevisionsForTesting,
  serializeRevisions,
  deserializeRevisions,
  computeSnapshotHash,
} from "../src/lib/wordpress/revisionEngine";

// Round 27
import {
  SUPPORTED_PAGE_TEMPLATES,
  resolvePageTemplate,
  getPageTemplateHierarchyCandidates,
} from "../src/lib/wordpress/templateHierarchy";
import {
  safeParseCustomPages,
  DEFAULT_STOREFRONT_CONFIG,
  StorefrontConfigData,
  CustomPage,
} from "../src/lib/storefrontTheme";

// Round 29
import {
  registerTaxonomy,
  getRegisteredTaxonomies,
  addTerm,
  getTerms,
  getTerm,
  assignTermsToPost,
  getPostTerms,
  getPostsByTerm,
  filterCustomPagesByTerm,
  generateTaxonomyPills,
  extractTaxonomiesFromCustomPages,
  clearTaxonomiesForTesting,
} from "../src/lib/wordpress/taxonomyEngine";

// Round 30
import {
  runSiteHealthAudit,
  SiteHealthReport,
} from "../src/lib/wordpress/siteHealthEngine";

describe("Rounds 24, 27, 29, 30: WordPress Reverse-Engineering & Hardening Suite", () => {
  // =========================================================================
  // Round 24: Post Revisions & Time-Travel Engine
  // =========================================================================
  describe("Round 24: Post Revisions & Time-Travel Engine", () => {
    beforeEach(() => {
      clearRevisionsForTesting();
    });

    it("1. Creates revision snapshots and stores them in reverse-chronological order", () => {
      const tenantId = "tenant-apple-repair";
      const target = "storefront";

      const v1Config = { ...DEFAULT_STOREFRONT_CONFIG, themeColor: "emerald" as const };
      const rev1 = createRevision(tenantId, target, v1Config, { name: "Somchai (Admin)" }, "Initial config");

      assert.ok(rev1.id.startsWith("rev_"));
      assert.equal(rev1.tenantId, tenantId);
      assert.equal(rev1.target, target);
      assert.equal(rev1.note, "Initial config");
      assert.equal(rev1.snapshot.themeColor, "emerald");

      const v2Config = { ...v1Config, themeColor: "blue" as const };
      const rev2 = createRevision(tenantId, target, v2Config, { name: "Wichai (Tech)" }, "Changed theme to blue");

      const revisions = getRevisions(tenantId, target);
      assert.equal(revisions.length, 2);
      assert.equal(revisions[0].id, rev2.id); // Newest first
      assert.equal(revisions[1].id, rev1.id);
    });

    it("2. De-duplicates identical snapshots and prevents redundant revisions", () => {
      const tenantId = "tenant-1";
      const config = { ...DEFAULT_STOREFRONT_CONFIG, headline: "Original Headline" };

      const rev1 = createRevision(tenantId, "storefront", config);
      const rev2 = createRevision(tenantId, "storefront", config, undefined, "Redundant Save");

      assert.equal(rev1.id, rev2.id);
      const revisions = getRevisions(tenantId, "storefront");
      assert.equal(revisions.length, 1);
    });

    it("3. Enforces snapshot retention cap (max 10 revisions by default) and prunes oldest", () => {
      const tenantId = "tenant-retention";

      for (let i = 1; i <= 15; i++) {
        createRevision(
          tenantId,
          "storefront",
          { ...DEFAULT_STOREFRONT_CONFIG, headline: `Headline Version ${i}` },
          undefined,
          `Version ${i}`,
          10
        );
      }

      const revisions = getRevisions(tenantId, "storefront");
      assert.equal(revisions.length, 10);
      assert.equal(revisions[0].snapshot.headline, "Headline Version 15");
      assert.equal(revisions[9].snapshot.headline, "Headline Version 6");
    });

    it("4. Guarantees snapshot immutability (mutating original object does not corrupt revision)", () => {
      const tenantId = "tenant-immutable";
      const mutableConfig = { themeColor: "emerald", headline: "Initial" };

      const rev = createRevision(tenantId, "storefront", mutableConfig);
      mutableConfig.headline = "MUTATED_AFTER_SAVE";

      const storedRev = getRevision(rev.id);
      assert.ok(storedRev);
      assert.equal(storedRev.snapshot.headline, "Initial");
    });

    it("5. Computes deep granular field diffs between two revisions (compareRevisions)", () => {
      const tenantId = "tenant-diff";

      const olderConfig = {
        themeColor: "emerald",
        fontFamily: "anuphan",
        headline: "หัวข้อเดิม",
        announcementText: "ประกาศเก่า",
      };
      const revOld = createRevision(tenantId, "storefront", olderConfig);

      const newerConfig = {
        themeColor: "blue",
        fontFamily: "sarabun",
        headline: "หัวข้อใหม่ล่าสุด",
        announcementText: "ประกาศเก่า",
        customExtraField: "New Value",
      };
      const revNew = createRevision(tenantId, "storefront", newerConfig);

      const diff = compareRevisions(revOld.id, revNew.id);
      assert.ok(diff);
      assert.equal(diff.olderRevisionId, revOld.id);
      assert.equal(diff.newerRevisionId, revNew.id);
      assert.equal(diff.totalChanges, 4); // themeColor, fontFamily, headline, customExtraField

      const themeChange = diff.changes.find((c) => c.field === "themeColor");
      assert.ok(themeChange);
      assert.equal(themeChange.type, "modified");
      assert.equal(themeChange.oldValue, "emerald");
      assert.equal(themeChange.newValue, "blue");

      const addedField = diff.changes.find((c) => c.field === "customExtraField");
      assert.ok(addedField);
      assert.equal(addedField.type, "added");
    });

    it("6. Restores revision and performs time-travel rollback with history tracking", () => {
      const tenantId = "tenant-rollback";

      const originalConfig = { ...DEFAULT_STOREFRONT_CONFIG, themeColor: "rose" as const, headline: "Stable Config" };
      const revOriginal = createRevision(tenantId, "storefront", originalConfig);

      const brokenConfig = { ...originalConfig, themeColor: "amber" as const, headline: "Accidental Mess" };
      createRevision(tenantId, "storefront", brokenConfig);

      // Perform rollback to original revision
      const rollbackResult = rollbackToRevision<StorefrontConfigData>(
        tenantId,
        "storefront",
        revOriginal.id,
        { name: "Support Agent" }
      );

      assert.equal(rollbackResult.success, true);
      assert.ok(rollbackResult.config);
      assert.equal(rollbackResult.config.headline, "Stable Config");
      assert.equal(rollbackResult.config.themeColor, "rose");

      // Verify a new rollback revision was created
      const allRevs = getRevisions(tenantId, "storefront");
      assert.equal(allRevs.length, 3);
      assert.ok(allRevs[0].note?.includes("ย้อนกลับไปยังเวอร์ชัน"));
    });

    it("7. Serializes and deserializes revisions for backup and migration", () => {
      const tenantId = "tenant-backup";
      createRevision(tenantId, "storefront", { key: "value1" });
      createRevision(tenantId, "storefront", { key: "value2" });

      const jsonBackup = serializeRevisions(tenantId, "storefront");
      assert.ok(jsonBackup.includes("value1"));
      assert.ok(jsonBackup.includes("value2"));

      clearRevisionsForTesting();
      assert.equal(getRevisions(tenantId, "storefront").length, 0);

      const imported = deserializeRevisions(jsonBackup);
      assert.equal(imported, 2);
      assert.equal(getRevisions(tenantId, "storefront").length, 2);
    });
  });

  // =========================================================================
  // Round 27: Template Hierarchy & Page Layout Engine
  // =========================================================================
  describe("Round 27: Template Hierarchy & Page Layout Engine", () => {
    it("1. Supports all 5 WordPress-style layout templates with valid definitions", () => {
      const templates = Object.keys(SUPPORTED_PAGE_TEMPLATES);
      assert.deepEqual(templates.sort(), [
        "blank-canvas",
        "boxed-fluid",
        "default",
        "landing-lead",
        "sidebar-right",
      ].sort());

      assert.equal(SUPPORTED_PAGE_TEMPLATES["blank-canvas"].features.hasNavbar, false);
      assert.equal(SUPPORTED_PAGE_TEMPLATES["blank-canvas"].features.hasFooter, false);
      assert.equal(SUPPORTED_PAGE_TEMPLATES["sidebar-right"].features.hasSidebar, true);
      assert.equal(SUPPORTED_PAGE_TEMPLATES["boxed-fluid"].features.containerStyle, "boxed");
      assert.equal(SUPPORTED_PAGE_TEMPLATES["landing-lead"].features.hasHeroBanner, true);
    });

    it("2. resolvePageTemplate returns explicit template when valid", () => {
      assert.equal(resolvePageTemplate({ slug: "custom", template: "blank-canvas" }), "blank-canvas");
      assert.equal(resolvePageTemplate({ slug: "about", template: "sidebar-right" }), "sidebar-right");
      assert.equal(resolvePageTemplate({ slug: "terms", template: "boxed-fluid" }), "boxed-fluid");
      assert.equal(resolvePageTemplate({ slug: "promo", template: "landing-lead" }), "landing-lead");
      assert.equal(resolvePageTemplate({ slug: "faq", template: "default" }), "default");
    });

    it("3. resolvePageTemplate falls back hierarchically based on slug conventions when template unset", () => {
      // Policy / Warranty / Terms auto-resolves to boxed-fluid
      assert.equal(resolvePageTemplate({ slug: "warranty-policy" }), "boxed-fluid");
      assert.equal(resolvePageTemplate({ slug: "terms-and-conditions" }), "boxed-fluid");
      assert.equal(resolvePageTemplate({ slug: "privacy-policy" }), "boxed-fluid");

      // Promo / Campaign auto-resolves to landing-lead
      assert.equal(resolvePageTemplate({ slug: "summer-promo-2024" }), "landing-lead");
      assert.equal(resolvePageTemplate({ slug: "special-repair-deal" }), "landing-lead");

      // Contact / FAQ auto-resolves to sidebar-right
      assert.equal(resolvePageTemplate({ slug: "contact-us" }), "sidebar-right");
      assert.equal(resolvePageTemplate({ slug: "repair-faq" }), "sidebar-right");

      // General fallback
      assert.equal(resolvePageTemplate({ slug: "about-our-team" }), "default");
    });

    it("4. Generates template candidate hierarchy matching WordPress conventions", () => {
      const candidates = getPageTemplateHierarchyCandidates("ifix-bangkok", "summer-promo", "landing-lead");
      assert.deepEqual(candidates, [
        "page-summer-promo.tsx",
        "page-template-landing-lead.tsx",
        "page.tsx",
        "singular.tsx",
        "index.tsx",
      ]);
    });

    it("5. safeParseCustomPages parses and sanitizes all 5 templates and categories/tags", () => {
      const rawPages = [
        { slug: "p1", title: "Page 1", template: "sidebar-right", categories: ["บริการ", "ซ่อมด่วน"], tags: ["iphone", "ipad"] },
        { slug: "p2", title: "Page 2", template: "boxed-fluid" },
        { slug: "p3", title: "Page 3", template: "landing-lead" },
        { slug: "p4", title: "Page 4", template: "blank-canvas" },
        { slug: "p5", title: "Page 5", template: "invalid-template" }, // should fallback to default
      ];

      const parsed = safeParseCustomPages(rawPages);
      assert.equal(parsed.length, 5);
      assert.equal(parsed[0].template, "sidebar-right");
      assert.deepEqual(parsed[0].categories, ["บริการ", "ซ่อมด่วน"]);
      assert.deepEqual(parsed[0].tags, ["iphone", "ipad"]);
      assert.equal(parsed[1].template, "boxed-fluid");
      assert.equal(parsed[2].template, "landing-lead");
      assert.equal(parsed[3].template, "blank-canvas");
      assert.equal(parsed[4].template, "default");
    });
  });

  // =========================================================================
  // Round 29: Taxonomy & Tagging Engine
  // =========================================================================
  describe("Round 29: Taxonomy & Tagging Engine", () => {
    beforeEach(() => {
      clearTaxonomiesForTesting();
    });

    it("1. Registers built-in core taxonomies and allows registering custom taxonomies", () => {
      const registered = getRegisteredTaxonomies();
      assert.ok(registered.category);
      assert.ok(registered.post_tag);
      assert.equal(registered.category.hierarchical, true);
      assert.equal(registered.post_tag.hierarchical, false);

      // Register custom taxonomy
      const customTax = registerTaxonomy("device_brand", {
        label: "ยี่ห้ออุปกรณ์",
        hierarchical: true,
      });
      assert.equal(customTax.name, "device_brand");
      assert.equal(customTax.hierarchical, true);
    });

    it("2. Adds taxonomy terms with slug normalization and parent-child hierarchy", () => {
      const tenantId = "tenant-tax-1";
      const parentTerm = addTerm("category", { name: "Apple Products", slug: "apple" }, tenantId);
      assert.equal(parentTerm.slug, "apple");

      const childTerm = addTerm("category", {
        name: "iPhone Repairs",
        slug: "iphone-repairs",
        parentSlug: "apple",
        color: "#3b82f6",
      }, tenantId);

      assert.equal(childTerm.parentSlug, "apple");
      assert.equal(childTerm.color, "#3b82f6");

      const terms = getTerms("category", tenantId);
      assert.equal(terms.length, 2);
    });

    it("3. Assigns terms to posts/pages and maintains live usage count metrics", () => {
      const tenantId = "tenant-tax-2";

      assignTermsToPost("page-screen", "category", ["hardware", "screen-repair"], tenantId);
      assignTermsToPost("page-battery", "category", ["hardware", "battery-replace"], tenantId);
      assignTermsToPost("page-camera", "category", ["hardware"], tenantId);

      const hardwareTerm = getTerm("category", "hardware", tenantId);
      assert.ok(hardwareTerm);
      assert.equal(hardwareTerm.count, 3); // Used across 3 pages

      const screenTerm = getTerm("category", "screen-repair", tenantId);
      assert.ok(screenTerm);
      assert.equal(screenTerm.count, 1);

      // Verify post term retrieval
      const pageTerms = getPostTerms("page-screen", "category", tenantId);
      assert.equal(pageTerms.length, 2);
      assert.deepEqual(pageTerms.map((t) => t.slug).sort(), ["hardware", "screen-repair"].sort());

      // Verify reverse query: get posts by term
      const hardwarePosts = getPostsByTerm("category", "hardware", tenantId);
      assert.equal(hardwarePosts.length, 3);
      assert.ok(hardwarePosts.includes("page-screen"));
      assert.ok(hardwarePosts.includes("page-battery"));
      assert.ok(hardwarePosts.includes("page-camera"));
    });

    it("4. Filters CustomPage array by category or tag term", () => {
      const pages: CustomPage[] = [
        { slug: "p1", title: "Screen Repair", categories: ["Hardware"], tags: ["iphone"] },
        { slug: "p2", title: "Battery Swap", categories: ["Hardware"], tags: ["ipad"] },
        { slug: "p3", title: "Software Unlock", categories: ["Software"], tags: ["ios"] },
      ];

      const hardwarePages = filterCustomPagesByTerm(pages, "category", "hardware");
      assert.equal(hardwarePages.length, 2);

      const iphonePages = filterCustomPagesByTerm(pages, "tag", "iphone");
      assert.equal(iphonePages.length, 1);
      assert.equal(iphonePages[0].slug, "p1");

      const allPages = filterCustomPagesByTerm(pages, "category", "all");
      assert.equal(allPages.length, 3);
    });

    it("5. Generates filterable navigation pills with active states and total counts", () => {
      const pages: CustomPage[] = [
        { slug: "p1", title: "P1", published: true, categories: ["ซ่อมมือถือ", "ไอโฟน"] },
        { slug: "p2", title: "P2", published: true, categories: ["ซ่อมมือถือ", "ไอแพด"] },
        { slug: "p3", title: "P3", published: true, categories: ["ซ่อมมือถือ"] },
        { slug: "p4", title: "P4", published: false, categories: ["ฉบับร่าง"] }, // Draft ignored in counts
      ];

      const pills = generateTaxonomyPills(pages, "category", "all", "/store/my-shop/services");

      // First pill is always "All"
      assert.equal(pills[0].slug, "all");
      assert.equal(pills[0].name, "ทั้งหมด");
      assert.equal(pills[0].count, 3); // 3 published pages
      assert.equal(pills[0].isActive, true);

      // Remaining pills sorted by count
      const mobileRepairPill = pills.find((p) => p.name === "ซ่อมมือถือ");
      assert.ok(mobileRepairPill);
      assert.equal(mobileRepairPill.count, 3);

      const iphonePill = pills.find((p) => p.name === "ไอโฟน");
      assert.ok(iphonePill);
      assert.equal(iphonePill.count, 1);
    });

    it("6. extractTaxonomiesFromCustomPages extracts and populates terms automatically", () => {
      const tenantId = "tenant-extract";
      const pages: CustomPage[] = [
        { slug: "warranty", title: "Warranty", categories: ["นโยบาย", "บริการ"], tags: ["ประกัน", "แล็บ"] },
        { slug: "privacy", title: "Privacy", categories: ["นโยบาย"], tags: ["ความปลอดภัย"] },
      ];

      const result = extractTaxonomiesFromCustomPages(pages, tenantId);
      assert.equal(result.categories.length, 2);
      assert.equal(result.tags.length, 3);

      const policyTerm = getTerm("category", "นโยบาย", tenantId);
      assert.ok(policyTerm);
      assert.equal(policyTerm.count, 2);
    });
  });

  // =========================================================================
  // Round 30: Site Health & Storefront Diagnostic Suite
  // =========================================================================
  describe("Round 30: Site Health & Storefront Diagnostic Suite", () => {
    it("1. Returns 'good' status and score >= 90 for a complete, secure, well-configured storefront", () => {
      const healthyConfig: Partial<StorefrontConfigData> = {
        headline: "ศูนย์บริการซ่อมมือถือด่วนมาตรฐานแล็บ รอรับได้ใน 30 นาที",
        subheadline: "บริการตรวจเช็ควิเคราะห์อาการ 10 จุดฟรี ไม่มีค่าเปิดเครื่อง พร้อมรับประกันงานซ่อมนาน 1 ปีเต็ม",
        phone: "081-234-5678",
        lineId: "@fixme_pro",
        showServicesBento: true,
        announcementEnabled: true,
        announcementText: "เปิดบริการทุกวัน 10:00 - 20:00 น.",
        navigationMenu: JSON.stringify([
          { id: "1", label: "หน้าแรก", href: "#" },
          { id: "2", label: "บริการซ่อม", href: "#services" },
        ]),
        customSections: JSON.stringify([
          { id: "b1", type: "business_hours", title: "เวลาทำการ", visible: true, enabled: true },
          { id: "b2", type: "gallery", title: "ผลงานซ่อม", visible: true, enabled: true, images: [{ url: "https://cdn.example.com/1.jpg" }] },
        ]),
      };

      const report: SiteHealthReport = runSiteHealthAudit(healthyConfig);
      assert.equal(report.status, "good");
      assert.ok(report.score >= 90);
      assert.equal(report.criticalCount, 0);
      assert.ok(report.passedCount >= 10);
    });

    it("2. Flags critical security violation when HTML block contains unsandboxed iframe or script", () => {
      const maliciousConfig: Partial<StorefrontConfigData> = {
        headline: "ร้านซ่อมมือถือมาตรฐาน",
        subheadline: "บริการซ่อมด่วนรอรับได้",
        phone: "081-111-2222",
        customSections: JSON.stringify([
          {
            id: "evil-html",
            type: "html",
            html: "<iframe src='https://malicious.com'></iframe><script>alert('xss')</script>",
            visible: true,
            enabled: true,
          },
        ]),
      };

      const report = runSiteHealthAudit(maliciousConfig);
      assert.equal(report.status, "critical");
      assert.ok(report.criticalCount >= 1);

      const secTest = report.tests.find((t) => t.id === "sec_iframe_sandbox");
      assert.ok(secTest);
      assert.equal(secTest.passed, false);
      assert.equal(secTest.status, "critical");
    });

    it("3. Flags critical security violation when dangerous URI protocols are detected", () => {
      const evilProtoConfig: Partial<StorefrontConfigData> = {
        headline: "ร้านซ่อมมือถือ",
        phone: "javascript:alert(1)",
        lineQrUrl: "data:text/html;base64,PHNjcmlwdD4=",
      };

      const report = runSiteHealthAudit(evilProtoConfig);
      assert.equal(report.status, "critical");

      const protoTest = report.tests.find((t) => t.id === "sec_dangerous_protocols");
      assert.ok(protoTest);
      assert.equal(protoTest.passed, false);
      assert.equal(protoTest.status, "critical");
    });

    it("4. Flags critical SEO issue when subpages contain duplicate slugs", () => {
      const duplicateSlugConfig: Partial<StorefrontConfigData> = {
        headline: "ร้านซ่อมมือถือด่วน",
        phone: "081-999-8888",
        customPages: JSON.stringify([
          { slug: "terms", title: "ข้อกำหนด A" },
          { slug: "terms", title: "ข้อกำหนด B" }, // Duplicate slug!
        ]),
      };

      const report = runSiteHealthAudit(duplicateSlugConfig);
      assert.equal(report.status, "critical");

      const slugTest = report.tests.find((t) => t.id === "seo_subpage_slugs");
      assert.ok(slugTest);
      assert.equal(slugTest.passed, false);
      assert.equal(slugTest.status, "critical");
    });

    it("5. Flags critical content integrity violation when neither phone nor LINE is configured", () => {
      const noContactConfig: Partial<StorefrontConfigData> = {
        headline: "ร้านซ่อมมือถือไร้การติดต่อ",
        phone: "",
        lineId: "",
      };

      const report = runSiteHealthAudit(noContactConfig);
      assert.equal(report.status, "critical");

      const contactTest = report.tests.find((t) => t.id === "content_contact_channel");
      assert.ok(contactTest);
      assert.equal(contactTest.passed, false);
      assert.equal(contactTest.status, "critical");
    });

    it("6. Recommends improvements for suboptimal headline length or missing business hours", () => {
      const warningConfig: Partial<StorefrontConfigData> = {
        headline: "สั้นเกิน", // < 15 chars
        subheadline: "คำอธิบายยาวพอสมควรสำหรับการตรวจเช็ค SEO readiness ในระบบ",
        phone: "081-222-3333",
        // no business hours block and no announcement
      };

      const report = runSiteHealthAudit(warningConfig);
      assert.ok(report.recommendedCount >= 1);

      const headlineTest = report.tests.find((t) => t.id === "seo_headline_length");
      assert.ok(headlineTest);
      assert.equal(headlineTest.status, "recommended");

      const hoursTest = report.tests.find((t) => t.id === "content_business_hours");
      assert.ok(hoursTest);
      assert.equal(hoursTest.status, "recommended");
    });
  });
});
