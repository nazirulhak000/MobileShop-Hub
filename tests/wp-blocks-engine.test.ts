import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  registerBlockPattern,
  unregisterBlockPattern,
  getBlockPattern,
  getAllBlockPatterns,
  expandPattern,
  createCustomPattern,
  getTenantPatterns,
  deleteTenantPattern,
  PREDEFINED_PATTERNS,
  BlockPattern,
} from "../src/lib/wordpress/blockPatterns";
import {
  add_shortcode,
  remove_shortcode,
  shortcode_exists,
  do_shortcode,
  strip_shortcodes,
  parseShortcodeAtts,
  escapeHtml,
} from "../src/lib/wordpress/shortcodeEngine";
import {
  wp_generate_attachment_metadata,
  wp_get_attachment_metadata,
  wp_calculate_image_srcset,
  wp_calculate_image_sizes,
  wp_image_add_srcset_and_sizes,
  add_image_size,
  get_image_sizes,
  reset_image_sizes,
  image_downscale_dimensions,
  build_subsize_url,
  generateResponsiveImageProps,
  WP_DEFAULT_SIZES,
} from "../src/lib/wordpress/mediaEngine";
import { CustomBlock } from "../src/lib/storefrontTheme";

describe("WordPress Blocks & Media Engine (Rounds 23, 25, 28)", () => {
  // =========================================================================
  // ROUND 23: Synced Patterns & Reusable Blocks (`wp_block`)
  // =========================================================================
  describe("Round 23: Synced Patterns & Reusable Blocks Engine", () => {
    it("23.1 Verifies all 4 predefined shop patterns are registered out of the box", () => {
      const hero = getBlockPattern("fixme/hero-promo");
      assert.ok(hero, "Hero promo pattern should exist");
      assert.equal(hero.title, "แบนเนอร์โปรโมชั่นพร้อมปุ่มแอ็กชัน (Hero Promo)");
      assert.ok(hero.blocks.length >= 2, "Hero pattern should contain promo banner and CTA");

      const services = getBlockPattern("fixme/services-grid");
      assert.ok(services, "Services grid pattern should exist");
      assert.equal(services.title, "แกลเลอรีผลงานพร้อมตารางบริการ (Services Gallery Grid)");

      const faq = getBlockPattern("fixme/faq-accordion");
      assert.ok(faq, "FAQ accordion pattern should exist");

      const delivery = getBlockPattern("fixme/delivery-notice");
      assert.ok(delivery, "Delivery notice pattern should exist");
    });

    it("23.2 Filters registered patterns by category", () => {
      const promoPatterns = getAllBlockPatterns("promotions");
      assert.ok(promoPatterns.some((p) => p.name === "fixme/hero-promo"));

      const servicePatterns = getAllBlockPatterns("services");
      assert.ok(servicePatterns.some((p) => p.name === "fixme/services-grid"));

      const nonExistent = getAllBlockPatterns("non-existent-category-xyz");
      assert.equal(nonExistent.length, 0);
    });

    it("23.3 Expands a pattern into fresh blocks with unique high-entropy IDs", () => {
      const hero = getBlockPattern("fixme/hero-promo")!;
      const originalIds = hero.blocks.map((b) => b.id);

      const expanded1 = expandPattern("fixme/hero-promo");
      const expanded2 = expandPattern("fixme/hero-promo");

      assert.equal(expanded1.length, hero.blocks.length);
      assert.equal(expanded2.length, hero.blocks.length);

      // Verify each expanded copy has unique IDs not matching originals or each other
      for (let i = 0; i < expanded1.length; i++) {
        assert.notEqual(expanded1[i].id, originalIds[i]);
        assert.notEqual(expanded2[i].id, originalIds[i]);
        assert.notEqual(expanded1[i].id, expanded2[i].id);
        assert.ok(expanded1[i].id.startsWith("block_"));
      }

      // Verify content data remains identical
      assert.equal(expanded1[0].type, hero.blocks[0].type);
      assert.equal((expanded1[0] as any).title, (hero.blocks[0] as any).title);
    });

    it("23.4 Manages tenant-scoped custom synced patterns with isolation", () => {
      const tenantA = "tenant_alpha_123";
      const tenantB = "tenant_beta_456";

      const customBlocks: CustomBlock[] = [
        {
          id: "custom-1",
          type: "promo_banner",
          title: "โปรโมชั่นเฉพาะสาขาอารีย์",
          discountTag: "BAT200",
        },
      ];

      const patternA = createCustomPattern(tenantA, {
        name: "custom/tenant_alpha_123/ari-promo",
        title: "โปรโมชั่นอารีย์",
        blocks: customBlocks,
        categories: ["marketing"],
        syncStatus: "synced",
      });

      assert.equal(patternA.name, "custom/tenant_alpha_123/ari-promo");
      assert.equal(patternA.syncStatus, "synced");

      // Tenant A can access its pattern
      const retrievedA = getBlockPattern(patternA.name, tenantA);
      assert.ok(retrievedA);
      assert.equal(retrievedA.title, "โปรโมชั่นอารีย์");

      // Tenant B cannot see Tenant A's pattern in getTenantPatterns
      const patternsB = getTenantPatterns(tenantB);
      assert.ok(!patternsB.some((p) => p.name === patternA.name));

      // Deleting pattern
      const deleted = deleteTenantPattern(tenantA, patternA.name);
      assert.equal(deleted, true);
      assert.equal(getBlockPattern(patternA.name, tenantA), undefined);
    });

    it("23.5 Guards against invalid pattern registration", () => {
      assert.throws(() => {
        registerBlockPattern({} as any);
      }, /Pattern name must be a non-empty string/);

      assert.throws(() => {
        registerBlockPattern({ name: "test", blocks: "not-an-array" } as any);
      }, /Pattern blocks must be an array/);
    });
  });

  // =========================================================================
  // ROUND 25: WordPress Shortcode API Engine
  // =========================================================================
  describe("Round 25: Shortcode API Engine", () => {
    it("25.1 Parses shortcode attributes (named, unquoted, quoted, and positional)", () => {
      const atts = parseShortcodeAtts(
        'device="iPhone 15" color=\'Titanium Blue\' warranty=1year standalone 123'
      );
      assert.equal(atts.device, "iPhone 15");
      assert.equal(atts.color, "Titanium Blue");
      assert.equal(atts.warranty, "1year");
      assert.equal(atts[0], "standalone");
      assert.equal(atts[1], "123");
    });

    it("25.2 Executes [repair_tracker] shortcode and renders tracking form with defaults", () => {
      const output = do_shortcode(
        '[repair_tracker button="ตรวจสอบงานซ่อม" placeholder="ใส่เลขที่ใบรับเครื่อง" shop_slug="fixme-siam"]'
      );
      assert.ok(output.includes("fixme-repair-tracker"), "Should output repair tracker container");
      assert.ok(output.includes("ตรวจสอบงานซ่อม"), "Should render custom button text");
      assert.ok(output.includes('placeholder="ใส่เลขที่ใบรับเครื่อง"'), "Should populate placeholder");
      assert.ok(output.includes('value="fixme-siam"'), "Should pass shop_slug parameter");
    });

    it("25.3 Executes [booking_calendar] shortcode with custom button text and shop slug", () => {
      const output = do_shortcode('[booking_calendar button="จองคิวออนไลน์ด่วน" shop_slug="siam"]');
      assert.ok(output.includes("fixme-booking-cta"));
      assert.ok(output.includes('href="/s/siam"'));
      assert.ok(output.includes("จองคิวออนไลน์ด่วน"));
    });

    it("25.4 Executes [price_calculator] shortcode with estimated discount", () => {
      const output = do_shortcode('[price_calculator device="iPad Pro" discount="300"]');
      assert.ok(output.includes("fixme-estimator"));
      assert.ok(output.includes("iPad Pro"));
      assert.ok(output.includes("ลด 300.-"));
    });

    it("25.5 Executes [contact_card] and [shop_hours] shortcodes", () => {
      const contactOutput = do_shortcode(
        '[contact_card address="พระราม 9" phone="02-999-8888" line="@fixme9"]'
      );
      assert.ok(contactOutput.includes("พระราม 9"));
      assert.ok(contactOutput.includes("tel:029998888"));
      assert.ok(contactOutput.includes("https://line.me/R/ti/p/%40fixme9"));

      const hoursOutput = do_shortcode('[shop_hours open="10:00" close="20:00"]');
      assert.ok(hoursOutput.includes("fixme-hours-widget"));
      assert.ok(hoursOutput.includes("10:00"));
      assert.ok(hoursOutput.includes("20:00"));
    });

    it("25.6 Strips shortcodes cleanly from raw text content via strip_shortcodes()", () => {
      const raw = "ยินดีต้อนรับสู่ศูนย์บริการ [repair_tracker] หรือติดต่อเราได้ที่ [contact_card]";
      const stripped = strip_shortcodes(raw);
      assert.equal(stripped, "ยินดีต้อนรับสู่ศูนย์บริการ  หรือติดต่อเราได้ที่ ");
    });

    it("25.7 XSS protection: Escapes dangerous attributes in shortcode output", () => {
      const malicious =
        '[contact_card address="<script>alert(\'pwned\')</script>" phone="0819999999"]';
      const output = do_shortcode(malicious);
      assert.ok(!output.includes("<script>alert('pwned')</script>"));
      assert.ok(output.includes("&lt;script&gt;alert(&#039;pwned&#039;)&lt;/script&gt;"));
    });

    it("25.8 Registers and removes custom dynamic shortcodes dynamically", () => {
      add_shortcode("test_widget", (atts, content) => {
        return `<div class="test-widget">${atts.msg || "default"}: ${content || ""}</div>`;
      });

      assert.equal(shortcode_exists("test_widget"), true);

      const res = do_shortcode('[test_widget msg="hello"]Custom Inner Content[/test_widget]');
      assert.equal(res, '<div class="test-widget">hello: Custom Inner Content</div>');

      remove_shortcode("test_widget");
      assert.equal(shortcode_exists("test_widget"), false);

      // After removal, shortcode string is left as literal text
      const unhandled = do_shortcode('[test_widget msg="hello"]');
      assert.equal(unhandled, '[test_widget msg="hello"]');
    });
  });

  // =========================================================================
  // ROUND 28: WordPress Media Library Metadata & Responsive Srcset Engine
  // =========================================================================
  describe("Round 28: Media Attachment Metadata & Responsive Srcset Engine", () => {
    beforeEach(() => {
      reset_image_sizes();
    });

    it("28.1 Verifies standard WordPress image size definitions", () => {
      const sizes = get_image_sizes();
      assert.deepEqual(sizes.thumbnail, { width: 150, height: 150, crop: true });
      assert.deepEqual(sizes.medium, { width: 300, height: 300, crop: false });
      assert.deepEqual(sizes.medium_large, { width: 768, height: 0, crop: false });
      assert.deepEqual(sizes.large, { width: 1024, height: 1024, crop: false });
    });

    it("28.2 Scales dimensions proportionally and crops accurately", () => {
      // 16:9 Image (1920x1080) downscale to medium (300x300 bounding box, no crop)
      const medium = image_downscale_dimensions(1920, 1080, 300, 300, false);
      assert.equal(medium.width, 300);
      assert.equal(medium.height, 169); // round(1080 * (300/1920)) = 168.75 -> 169

      // Downscale to medium_large (768 width, unconstrained height)
      const medLarge = image_downscale_dimensions(1920, 1080, 768, 0, false);
      assert.equal(medLarge.width, 768);
      assert.equal(medLarge.height, 432); // 1080 * (768/1920) = 432

      // Crop to square thumbnail (150x150, crop = true)
      const thumb = image_downscale_dimensions(1920, 1080, 150, 150, true);
      assert.equal(thumb.width, 150);
      assert.equal(thumb.height, 150);

      // Does not upscale if original is smaller than target
      const small = image_downscale_dimensions(200, 150, 800, 600, false);
      assert.equal(small.width, 200);
      assert.equal(small.height, 150);
    });

    it("28.3 Builds subsize URLs for both static paths and Unsplash CDN URLs", () => {
      // Static WP file path
      const staticUrl = "/uploads/2026/11/shop-hero.jpg";
      const subStatic = build_subsize_url(staticUrl, 768, 432, false);
      assert.equal(subStatic, "/uploads/2026/11/shop-hero-768x432.jpg");

      // Unsplash CDN URL
      const unsplashUrl = "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format";
      const subUnsplash = build_subsize_url(unsplashUrl, 300, 169, false);
      assert.ok(subUnsplash.includes("w=300"));
      assert.ok(subUnsplash.includes("fit=max"));
      assert.ok(subUnsplash.includes("q=80"));
    });

    it("28.4 Generates complete WordPress attachment metadata for 1920x1080 image", () => {
      const url = "/uploads/repair-bench.jpg";
      const meta = wp_generate_attachment_metadata(url, 1920, 1080, {
        filesize: 1048576,
        title: "โต๊ะซ่อมเมนบอร์ด",
      });

      assert.equal(meta.width, 1920);
      assert.equal(meta.height, 1080);
      assert.equal(meta.file, "repair-bench.jpg");
      assert.equal(meta.mime_type, "image/jpeg");
      assert.equal(meta.image_meta?.title, "โต๊ะซ่อมเมนบอร์ด");

      // Check generated sizes
      assert.ok(meta.sizes.thumbnail);
      assert.equal(meta.sizes.thumbnail.width, 150);
      assert.equal(meta.sizes.thumbnail.height, 150);

      assert.ok(meta.sizes.medium);
      assert.equal(meta.sizes.medium.width, 300);
      assert.equal(meta.sizes.medium.height, 169);

      assert.ok(meta.sizes.medium_large);
      assert.equal(meta.sizes.medium_large.width, 768);
      assert.equal(meta.sizes.medium_large.height, 432);

      assert.ok(meta.sizes.large);
      assert.equal(meta.sizes.large.width, 1024);
      assert.equal(meta.sizes.large.height, 576);

      assert.ok(meta.sizes.full);
      assert.equal(meta.sizes.full.width, 1920);
      assert.equal(meta.sizes.full.height, 1080);
    });

    it("28.5 Generates responsive srcset attribute string matching aspect ratios", () => {
      const url = "/uploads/macbook-screen.jpg";
      const meta = wp_get_attachment_metadata(url, 1920, 1080);

      const srcset = wp_calculate_image_srcset("large", url, meta);
      assert.ok(typeof srcset === "string");

      // Should include 300w, 768w, 1024w, 1920w in ascending order
      assert.ok(srcset.includes("300w"));
      assert.ok(srcset.includes("768w"));
      assert.ok(srcset.includes("1024w"));
      assert.ok(srcset.includes("1920w"));

      // Thumbnail (150x150, 1:1) has different aspect ratio from 16:9, so it must NOT be included
      assert.ok(!srcset.includes("150w"), "Square cropped thumbnail should be excluded from 16:9 srcset");

      // Verify sorted order
      const widths = srcset.match(/\b\d+w\b/g)?.map((s) => parseInt(s, 10)) || [];
      for (let i = 1; i < widths.length; i++) {
        assert.ok(widths[i] > widths[i - 1], "Srcset widths must be strictly increasing");
      }
    });

    it("28.6 Generates responsive sizes attribute string", () => {
      const url = "/uploads/test.jpg";
      const meta = wp_get_attachment_metadata(url, 1920, 1080);

      const sizesLarge = wp_calculate_image_sizes("large", url, meta);
      assert.equal(sizesLarge, "(max-width: 1024px) 100vw, 1024px");

      const sizesMedium = wp_calculate_image_sizes("medium", url, meta);
      assert.equal(sizesMedium, "(max-width: 300px) 100vw, 300px");

      const sizesCustom = wp_calculate_image_sizes([640, 480], url, meta);
      assert.equal(sizesCustom, "(max-width: 640px) 100vw, 640px");
    });

    it("28.7 Injects responsive srcset, sizes, and lazy-loading into HTML <img> tags", () => {
      const url = "/uploads/storefront-showcase.jpg";
      const meta = wp_get_attachment_metadata(url, 1920, 1080);

      const inputHtml = `
        <div class="gallery">
          <img src="/uploads/storefront-showcase.jpg" alt="หน้าร้านซ่อม" class="rounded-lg">
          <img src="/other-untracked.jpg" alt="รูปทั่วไป">
        </div>
      `;

      const outputHtml = wp_image_add_srcset_and_sizes(inputHtml, meta, "large");

      // Tracked image should have srcset, sizes, loading="lazy", and decoding="async"
      assert.ok(outputHtml.includes('srcset="'));
      assert.ok(outputHtml.includes('sizes="(max-width: 1024px) 100vw, 1024px"'));
      assert.ok(outputHtml.includes('loading="lazy"'));
      assert.ok(outputHtml.includes('decoding="async"'));
      assert.ok(outputHtml.includes('class="rounded-lg"'));
      assert.ok(outputHtml.includes('width="1920"'));

      // Untracked image without metadata should remain unchanged without crash
      assert.ok(outputHtml.includes('<img src="/other-untracked.jpg" alt="รูปทั่วไป">'));
    });

    it("28.8 Supports custom image sizes via add_image_size()", () => {
      add_image_size("fixme_banner", 1280, 400, true);
      const sizes = get_image_sizes();
      assert.ok(sizes.fixme_banner);
      assert.equal(sizes.fixme_banner.width, 1280);
      assert.equal(sizes.fixme_banner.height, 400);
      assert.equal(sizes.fixme_banner.crop, true);

      const meta = wp_get_attachment_metadata("/uploads/hero.jpg", 2560, 1440);
      assert.ok(meta.sizes.fixme_banner);
      assert.equal(meta.sizes.fixme_banner.width, 1280);
      assert.equal(meta.sizes.fixme_banner.height, 400);
    });

    it("28.9 Generates React/Next.js image props cleanly", () => {
      const props = generateResponsiveImageProps(
        "/uploads/technician.png",
        1920,
        1080,
        "ช่างผู้เชี่ยวชาญ",
        "medium_large"
      );

      assert.equal(props.width, 768);
      assert.equal(props.height, 432);
      assert.equal(props.alt, "ช่างผู้เชี่ยวชาญ");
      assert.equal(props.loading, "lazy");
      assert.equal(props.decoding, "async");
      assert.ok(props.srcSet);
      assert.ok(props.sizes);
    });
  });

  // =========================================================================
  // ROUNDS 34, 36, 38: WordPress UI & Block Integration Engine
  // =========================================================================
  describe("Rounds 34, 36, 38: WordPress Customizer & Subpage Integration", () => {
    // Round 34: Block Patterns Selector & Batch Insertion
    it("34.1 Pattern Library retrieves patterns filtered by category for modal display", () => {
      const promoPatterns = getAllBlockPatterns("promotions");
      assert.ok(promoPatterns.length > 0);
      assert.ok(promoPatterns.some((p) => p.name === "fixme/hero-promo"));

      const servicePatterns = getAllBlockPatterns("services");
      assert.ok(servicePatterns.length > 0);
      assert.ok(servicePatterns.some((p) => p.name === "fixme/services-grid"));
    });

    it("34.2 Batch insertion expands pattern and produces independent block instances", () => {
      const pat = getBlockPattern("fixme/hero-promo")!;
      const insertedBlocks = expandPattern(pat.name);

      assert.equal(insertedBlocks.length, pat.blocks.length);
      for (const block of insertedBlocks) {
        assert.ok(block.id.startsWith("block_"));
        assert.notEqual(block.id, pat.blocks[0].id);
        assert.notEqual(block.id, pat.blocks[1]?.id);
      }
    });

    // Round 36: Taxonomy Category Navigation Pills on Subpages
    it("36.1 Generates taxonomy navigation pills from subpages list with active state", async () => {
      const { generateTaxonomyPills, filterCustomPagesByTerm } = await import(
        "../src/lib/wordpress/taxonomyEngine"
      );

      const mockSubpages = [
        {
          id: "p1",
          slug: "warranty-terms",
          title: "เงื่อนไขการรับประกัน",
          categories: ["นโยบาย", "การบริการ"],
          published: true,
        },
        {
          id: "p2",
          slug: "privacy-policy",
          title: "นโยบายความเป็นส่วนตัว",
          categories: ["นโยบาย"],
          published: true,
        },
        {
          id: "p3",
          slug: "screen-repair-guide",
          title: "ขั้นตอนการเปลี่ยนจอแท้",
          categories: ["คู่มือ", "การบริการ"],
          published: true,
        },
        {
          id: "p4",
          slug: "internal-draft",
          title: "คู่มือพนักงาน",
          categories: ["คู่มือ"],
          published: false, // draft - should not count towards public totals
        },
      ];

      const pills = generateTaxonomyPills(mockSubpages as any, "category", "นโยบาย", "/store/test-shop/warranty-terms");

      // Verify "ทั้งหมด" pill
      const allPill = pills.find((p) => p.slug === "all");
      assert.ok(allPill);
      assert.equal(allPill.count, 3); // 3 published pages
      assert.equal(allPill.isActive, false);

      // Verify "นโยบาย" pill
      const policyPill = pills.find((p) => p.name === "นโยบาย");
      assert.ok(policyPill);
      assert.equal(policyPill.count, 2);
      assert.equal(policyPill.isActive, true);
      assert.ok(policyPill.href.includes("category="));

      // Filter related pages in category
      const related = filterCustomPagesByTerm(mockSubpages as any, "category", "นโยบาย");
      assert.equal(related.length, 2);
      assert.ok(related.some((p) => p.slug === "warranty-terms"));
      assert.ok(related.some((p) => p.slug === "privacy-policy"));
    });

    // Round 38: Responsive Image Srcset Auto-Injection
    it("38.1 Computes responsive srcset and sizes for PhotoGalleryBlock & PromoBannerBlock", () => {
      const galleryUrl = "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=900&auto=format&fit=crop&q=80";
      const props = generateResponsiveImageProps(
        galleryUrl,
        900,
        675,
        "ภาพผลงานซ่อม",
        "medium_large"
      );

      assert.equal(props.width, 768);
      assert.equal(props.height, 576);
      assert.equal(props.loading, "lazy");
      assert.equal(props.decoding, "async");
      assert.ok(props.srcSet, "Should generate srcSet string");
      assert.ok(props.srcSet.includes("768w"));
      assert.ok(props.sizes);

      const promoUrl = "/uploads/2026/11/november-promo.jpg";
      const promoProps = generateResponsiveImageProps(
        promoUrl,
        1920,
        1080,
        "โปรโมชั่นประจำเดือน",
        "large"
      );

      assert.equal(promoProps.width, 1024);
      assert.equal(promoProps.height, 576);
      assert.ok(promoProps.srcSet?.includes("1024w"));
      assert.ok(promoProps.sizes?.includes("1024px"));
    });
  });

  // =========================================================================
  // ROUNDS 42, 43, 44, 48: WordPress Enterprise Parity Engine
  // =========================================================================
  describe("Rounds 42, 43, 44, 48: WordPress Enterprise Parity Engine", () => {
    // -----------------------------------------------------------------------
    // Round 42: Template Parts Engine (`wp_template_part`)
    // -----------------------------------------------------------------------
    it("42.1 Template Parts: Retrieves pre-registered header and footer parts", async () => {
      const {
        get_template_parts_by_area,
        get_template_part,
        resolve_template_part_layout,
      } = await import("../src/lib/wordpress/templateParts");

      const headers = get_template_parts_by_area("header");
      assert.equal(headers.length, 3);
      assert.ok(headers.some((h) => h.slug === "header-standard"));
      assert.ok(headers.some((h) => h.slug === "header-minimal"));
      assert.ok(headers.some((h) => h.slug === "header-centered-brand"));

      const footers = get_template_parts_by_area("footer");
      assert.equal(footers.length, 3);
      assert.ok(footers.some((f) => f.slug === "footer-standard"));
      assert.ok(footers.some((f) => f.slug === "footer-4-column"));
      assert.ok(footers.some((f) => f.slug === "footer-minimal-copyright"));

      // Resolves preferred or falls back safely
      const resolvedPreferred = resolve_template_part_layout("header", "header-minimal");
      assert.equal(resolvedPreferred.slug, "header-minimal");

      const resolvedFallback = resolve_template_part_layout("header", "non-existent-header");
      assert.equal(resolvedFallback.slug, "header-standard");
    });

    it("42.2 Template Parts: Supports registering and unregistering custom parts", async () => {
      const {
        register_template_part,
        get_template_part,
        unregister_template_part,
      } = await import("../src/lib/wordpress/templateParts");

      register_template_part({
        slug: "header-vip-concierge",
        name: "header-vip-concierge",
        area: "header",
        title: "VIP Concierge Header",
        description: "ส่วนหัวพิเศษสำหรับลูกค้าระดับองค์กร",
        layoutType: "vip",
      });

      const retrieved = get_template_part("header-vip-concierge");
      assert.ok(retrieved);
      assert.equal(retrieved.title, "VIP Concierge Header");

      const removed = unregister_template_part("header-vip-concierge");
      assert.equal(removed, true);
      assert.equal(get_template_part("header-vip-concierge"), undefined);
    });

    // -----------------------------------------------------------------------
    // Round 43: Global Style Variations / Colorways
    // -----------------------------------------------------------------------
    it("43.1 Style Variations: Provides 5 curated 1-click aesthetic variations", async () => {
      const {
        getStyleVariations,
        getStyleVariationById,
        applyStyleVariationToConfig,
      } = await import("../src/lib/wordpress/styleVariations");

      const variations = getStyleVariations();
      assert.equal(variations.length, 5);

      const expectedIds = ["midnight-pro", "minimalist-clean", "cyber-neon", "warm-amber", "pastel-modern"];
      for (const id of expectedIds) {
        const v = getStyleVariationById(id);
        assert.ok(v, `Variation ${id} must exist`);
        assert.ok(v.colorPalette);
        assert.ok(v.fontFamily);
        assert.ok(v.borderRadius);
        assert.ok(v.previewColors.primary);
      }

      // Test applying variation to config
      const sampleConfig = {
        themeColor: "emerald" as const,
        fontFamily: "anuphan" as const,
        headline: "FixMe Shop",
      };

      const applied = applyStyleVariationToConfig(sampleConfig, "cyber-neon");
      assert.equal(applied.themeColor, "cyan");
      assert.equal(applied.fontFamily, "mitr");
      assert.equal(applied.headline, "FixMe Shop"); // Preserves other fields
    });

    // -----------------------------------------------------------------------
    // Round 44: Scoped Block CSS Engine
    // -----------------------------------------------------------------------
    it("44.1 Scoped CSS: Prefixes standard selectors with scope container", async () => {
      const { scopeCssRules } = await import("../src/lib/wordpress/scopedCssEngine");

      const rawCss = `
        .promo-card { background: #000; border-radius: 12px; }
        h2, p.subtitle { color: #fff; font-size: 1.5rem; }
      `;

      const scoped = scopeCssRules(rawCss, "#block-promo-123");
      assert.ok(scoped.includes("#block-promo-123 .promo-card"));
      assert.ok(scoped.includes("#block-promo-123 h2, #block-promo-123 p.subtitle"));
    });

    it("44.2 Scoped CSS: Handles parent selector & and @media queries", async () => {
      const { scopeCssRules } = await import("../src/lib/wordpress/scopedCssEngine");

      const rawCss = `
        &:hover { opacity: 0.9; }
        @media (max-width: 768px) {
          .promo-card { padding: 12px; }
        }
      `;

      const scoped = scopeCssRules(rawCss, ".wp-block-fixme");
      assert.ok(scoped.includes(".wp-block-fixme:hover"));
      assert.ok(scoped.includes("@media (max-width: 768px)"));
      assert.ok(scoped.includes(".wp-block-fixme .promo-card"));
    });

    it("44.3 Scoped CSS: Strips dangerous injection vectors and rejects malformed scopes", async () => {
      const { scopeCssRules } = await import("../src/lib/wordpress/scopedCssEngine");

      const maliciousCss = `
        .box { background: url(javascript:alert(1)); }
        @import url('https://evil.com/style.css');
        .btn { behavior: url(evil.htc); }
      `;

      const scoped = scopeCssRules(maliciousCss, "#safe-box");
      assert.ok(!scoped.includes("javascript:"));
      assert.ok(!scoped.includes("@import"));
      assert.ok(!scoped.includes("behavior:"));

      assert.throws(() => {
        scopeCssRules(".test { color: red; }", "body { color: blue; } #injected");
      }, /Invalid CSS scope selector/);
    });

    // -----------------------------------------------------------------------
    // Round 48: Multi-Menu Locations Engine
    // -----------------------------------------------------------------------
    it("48.1 Menu Locations: Manages primary, footer, mobile, and sidebar menu slots", async () => {
      const {
        get_registered_nav_menus,
        register_nav_menus,
        set_nav_menu_location,
        has_nav_menu,
        get_nav_menu_by_location,
      } = await import("../src/lib/wordpress/navMenuLocations");

      const locations = get_registered_nav_menus();
      assert.ok(locations.some((l) => l.location === "primary"));
      assert.ok(locations.some((l) => l.location === "footer"));
      assert.ok(locations.some((l) => l.location === "mobile"));
      assert.ok(locations.some((l) => l.location === "sidebar"));

      register_nav_menus({
        special_promo: "เมนูแคมเปญโปรโมชั่นพิเศษ",
      });
      assert.ok(get_registered_nav_menus().some((l) => l.location === "special_promo"));

      const tenantA = "tenant_bangkok";
      const tenantB = "tenant_chiangmai";

      const navItems = [
        { label: "หน้าแรก", href: "#" },
        { label: "บริการซ่อม", href: "#services" },
      ];

      set_nav_menu_location("primary", navItems, tenantA);

      assert.equal(has_nav_menu("primary", tenantA), true);
      assert.equal(has_nav_menu("primary", tenantB), false); // Tenant B is isolated

      const retrieved = get_nav_menu_by_location("primary", tenantA);
      assert.equal(retrieved.length, 2);
      assert.equal(retrieved[0].label, "หน้าแรก");

      // Fallback behavior when location is unset
      const fallback = get_nav_menu_by_location("primary", tenantB, [{ label: "Default", href: "/" }]);
      assert.equal(fallback.length, 1);
      assert.equal(fallback[0].label, "Default");
    });
  });

  // =========================================================================
  // ROUNDS 53, 56, 57: Block Styles, Lead Capture Form & Dynamic Query Loop
  // =========================================================================
  describe("Rounds 53, 56, 57: Block Styles, Form Builder & Query Loop", () => {
    // -----------------------------------------------------------------------
    // Round 53: Gutenberg Block Style Variations
    // -----------------------------------------------------------------------
    it("53.1 Block Styles: Retrieves pre-registered style variants for blocks", async () => {
      const {
        get_block_styles,
        get_block_style_class,
        register_block_style,
        unregister_block_style,
      } = await import("../src/lib/wordpress/blockStyleVariations");

      const richTextStyles = get_block_styles("rich_text");
      assert.ok(richTextStyles.length >= 4);
      assert.ok(richTextStyles.some((s) => s.name === "default"));
      assert.ok(richTextStyles.some((s) => s.name === "callout-card"));
      assert.ok(richTextStyles.some((s) => s.name === "blueprint-grid"));
      assert.ok(richTextStyles.some((s) => s.name === "bordered-minimal"));

      const promoStyles = get_block_styles("promo_banner");
      assert.ok(promoStyles.some((s) => s.name === "gradient-glow"));
      assert.ok(promoStyles.some((s) => s.name === "solid-flat"));
      assert.ok(promoStyles.some((s) => s.name === "bordered-glass"));

      // Resolves class names correctly
      const calloutClass = get_block_style_class("rich_text", "callout-card");
      assert.ok(calloutClass.includes("is-style-callout-card"));

      // Fallback to default when style is unset
      const defaultClass = get_block_style_class("promo_banner");
      assert.ok(defaultClass.includes("is-style-gradient-glow"));

      // Supports custom style registration
      register_block_style("rich_text", {
        name: "neon-cyber",
        label: "นีออนไซเบอร์",
        className: "is-style-neon-cyber border-cyan-500",
      });
      assert.ok(get_block_styles("rich_text").some((s) => s.name === "neon-cyber"));

      unregister_block_style("rich_text", "neon-cyber");
      assert.ok(!get_block_styles("rich_text").some((s) => s.name === "neon-cyber"));
    });

    // -----------------------------------------------------------------------
    // Round 56: WordPress Form Builder & Lead Capture Block
    // -----------------------------------------------------------------------
    it("56.1 Lead Capture Form: Exports component and renders structure with honeypot", async () => {
      const { ContactFormBlock } = await import(
        "../src/components/landing/blocks/ContactFormBlock"
      );
      assert.ok(typeof ContactFormBlock === "function");
    });

    // -----------------------------------------------------------------------
    // Round 57: Dynamic Query Loop Engine (WP_Query)
    // -----------------------------------------------------------------------
    it("57.1 Query Loop: Filters pages by published status, category, and exclusion", async () => {
      const { wp_query_pages } = await import(
        "../src/lib/wordpress/queryLoopEngine"
      );

      const testPages = [
        {
          id: "p1",
          slug: "screen-repair",
          title: "ซ่อมหน้าจอแท้",
          categories: ["บริการซ่อม", "หน้าจอ"],
          published: true,
        },
        {
          id: "p2",
          slug: "battery-repair",
          title: "เปลี่ยนแบตเตอรี่แท้",
          categories: ["บริการซ่อม", "แบตเตอรี่"],
          published: true,
        },
        {
          id: "p3",
          slug: "water-damage",
          title: "กู้ข้อมูลเครื่องตกน้ำ",
          categories: ["บริการซ่อม", "กู้ข้อมูล"],
          published: true,
        },
        {
          id: "p4",
          slug: "internal-sop",
          title: "คู่มือพนักงาน",
          categories: ["ภายใน"],
          published: false, // draft
        },
      ];

      // Query published only in "บริการซ่อม"
      const res1 = wp_query_pages(testPages as any, {
        category: "บริการซ่อม",
        status: "publish",
        perPage: 10,
      });
      assert.equal(res1.total, 3);
      assert.equal(res1.items.length, 3);
      assert.ok(!res1.items.some((p) => p.slug === "internal-sop"));

      // Query with exclusion (e.g. current page)
      const res2 = wp_query_pages(testPages as any, {
        excludeSlugs: ["screen-repair"],
        status: "publish",
      });
      assert.equal(res2.total, 2);
      assert.ok(!res2.items.some((p) => p.slug === "screen-repair"));

      // Query pagination
      const pagedRes = wp_query_pages(testPages as any, {
        perPage: 2,
        page: 1,
        status: "publish",
      });
      assert.equal(pagedRes.items.length, 2);
      assert.equal(pagedRes.totalPages, 2);
      assert.equal(pagedRes.hasMore, true);
    });

    it("57.2 Query Loop: Sorts pages alphabetically by title and search queries", async () => {
      const { wp_query_pages } = await import(
        "../src/lib/wordpress/queryLoopEngine"
      );

      const testPages = [
        { slug: "c", title: "C. ซ่อมบอร์ด", published: true },
        { slug: "a", title: "A. ตรวจเช็คฟรี", published: true },
        { slug: "b", title: "B. เปลี่ยนจอแท้", published: true },
      ];

      const asc = wp_query_pages(testPages as any, {
        orderBy: "title",
        order: "asc",
      });
      assert.equal(asc.items[0].slug, "a");
      assert.equal(asc.items[1].slug, "b");
      assert.equal(asc.items[2].slug, "c");

      // Search keyword filter
      const searchRes = wp_query_pages(testPages as any, {
        search: "เปลี่ยนจอ",
      });
      assert.equal(searchRes.total, 1);
      assert.equal(searchRes.items[0].slug, "b");
    });
  });
});
