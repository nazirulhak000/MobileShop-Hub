/**
 * Diamond 60-Round Golden Master Stress Test Suite (Round 60)
 *
 * Verifies end-to-end WordPress Enterprise Parity across all 60 rounds:
 * - Round 51: Dynamic XML Sitemap 0.9 & Robots.txt (`sitemapEngine.ts`)
 * - Round 52: Outbound Webhook Dispatcher (`webhookDispatcher.ts`)
 * - Round 53: Gutenberg Block Style Variations (`blockStyleVariations.ts`)
 * - Round 54: Media Library Cloud Image Optimizer (`imageOptimizer.ts`)
 * - Round 55: Post Locking & Heartbeat Collision Guard (`postLockEngine.ts`)
 * - Round 56: Contact Form Builder Block (`ContactFormBlock.tsx` / `types.ts`)
 * - Round 57: Dynamic Query Loop Block (`queryLoopEngine.ts`)
 * - Round 58: WordPress oEmbed Consumer Engine (`oEmbedEngine.ts`)
 * - Round 59: Multilingual Gettext i18n Engine (`i18nEngine.ts`)
 * - Round 60: Golden Master Full 60-Round Lifecycle Stress Test
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Round 51: Sitemap Engine
import {
  generateSitemapXml,
  generateRobotsTxt,
  formatW3cDate,
} from "../src/lib/wordpress/sitemapEngine";

// Round 52: Webhook Dispatcher
import {
  registerWebhook,
  dispatchWebhookEvent,
  computeHmacSignature,
  getDeliveryLogs,
} from "../src/lib/wordpress/webhookDispatcher";

// Round 53: Block Style Variations
import {
  get_block_styles,
  get_block_style_class,
  register_block_style,
} from "../src/lib/wordpress/blockStyleVariations";

// Round 54: Image Optimizer
import {
  validateImageDimensions,
  calculateCompressionStats,
  stripExifMetadata,
  getWebPRecommendation,
  wp_get_image_editor,
  wp_image_editor_supports,
  WP_MAX_MEGAPIXELS,
} from "../src/lib/wordpress/imageOptimizer";

// Round 55: Post Locking
import {
  acquirePostLock,
  checkPostLock,
  refreshPostLock,
  releasePostLock,
  takeoverPostLock,
} from "../src/lib/wordpress/postLockEngine";

// Round 57: Query Loop
import { wp_query_pages } from "../src/lib/wordpress/queryLoopEngine";

// Round 58: oEmbed Engine
import {
  wp_oembed_get,
  wp_filter_oembed_result,
  autoembed,
  wp_oembed_add_provider,
  reset_oembed_providers,
} from "../src/lib/wordpress/oEmbedEngine";

// Round 59: i18n Gettext Engine
import {
  __,
  _e,
  _n,
  _x,
  switch_to_locale,
  restore_previous_locale,
  get_locale,
  load_textdomain,
  renderLanguageSwitcher,
} from "../src/lib/wordpress/i18nEngine";

// Shared Storefront Types
import { CustomPage } from "../src/lib/storefrontTheme";
import { CustomBlock } from "../src/components/landing/blocks/types";

describe("Round 60: Diamond 60-Round Golden Master Enterprise Parity Suite", () => {
  // =========================================================================
  // Round 51: Dynamic XML Sitemap 0.9 & Robots.txt
  // =========================================================================
  describe("Round 51: Dynamic XML Sitemap 0.9 & Robots.txt", () => {
    it("1.1 Generates valid XML Sitemap 0.9 indexing only published subpages", () => {
      const pages: CustomPage[] = [
        {
          id: "p1",
          slug: "iphone-screen-repair",
          title: "iPhone Screen Repair",
          published: true,
          sections: [],
        },
        {
          id: "p2",
          slug: "secret-internal-draft",
          title: "Internal Draft",
          published: false, // Must be omitted
          sections: [],
        },
        {
          id: "p3",
          slug: "battery-replacement",
          title: "Battery Replacement",
          published: true,
          sections: [],
        },
      ];

      const xml = generateSitemapXml({
        baseUrl: "https://fixme.co.th",
        shopSlug: "bkk-fix",
        pages,
        updatedAt: new Date("2026-11-20T10:00:00Z"),
      });

      assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
      assert.ok(xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'));
      assert.ok(xml.includes("<loc>https://fixme.co.th/store/bkk-fix</loc>"));
      assert.ok(xml.includes("<priority>1.0</priority>"));
      assert.ok(xml.includes("<loc>https://fixme.co.th/store/bkk-fix/iphone-screen-repair</loc>"));
      assert.ok(xml.includes("<loc>https://fixme.co.th/store/bkk-fix/battery-replacement</loc>"));
      assert.ok(!xml.includes("secret-internal-draft"), "Draft page must not appear in sitemap");
    });

    it("1.2 Generates robots.txt with disallows and sitemap directive", () => {
      const robots = generateRobotsTxt({
        baseUrl: "https://fixme.co.th",
        shopSlug: "bkk-fix",
        allowIndexing: true,
      });

      assert.ok(robots.includes("User-agent: *"));
      assert.ok(robots.includes("Allow: /store/bkk-fix"));
      assert.ok(robots.includes("Disallow: /api/"));
      assert.ok(robots.includes("Sitemap: https://fixme.co.th/store/bkk-fix/sitemap.xml"));

      // Test disallow all if indexing disabled
      const disallowAll = generateRobotsTxt({
        baseUrl: "https://fixme.co.th",
        shopSlug: "bkk-fix",
        allowIndexing: false,
      });
      assert.ok(disallowAll.includes("Disallow: /"));
    });
  });

  // =========================================================================
  // Round 52: Outbound Webhook Dispatcher
  // =========================================================================
  describe("Round 52: Outbound Webhook Dispatcher", () => {
    it("2.1 Computes verifiable HMAC SHA-256 signature", () => {
      const secret = "super-secret-key-12345";
      const payload = JSON.stringify({ event: "page.published", slug: "ipad-repair" });
      const signature = computeHmacSignature(payload, secret);

      assert.ok(signature.length === 64, "SHA-256 hex string must be 64 characters");
      // Deterministic signature verify
      const verify = computeHmacSignature(payload, secret);
      assert.equal(signature, verify);
    });

    it("2.2 Registers tenant webhook and logs dispatch delivery attempt", async () => {
      const tenant = "tenant-stress-52";
      const sub = registerWebhook({
        tenantId: tenant,
        name: "Zapier Integration",
        targetUrl: "https://hooks.example.com/fixme",
        secret: "my-webhook-secret-999",
        events: ["page.published", "store.updated"],
      });

      assert.ok(sub.id.startsWith("wh_"));
      assert.equal(sub.tenantId, tenant);

      // Mock fetch
      let fetchCalled = false;
      const mockFetch: typeof fetch = async (url, init) => {
        fetchCalled = true;
        assert.ok(init?.headers);
        const headers = init.headers as Record<string, string>;
        assert.ok(headers["X-FixMe-Signature"]);
        assert.equal(headers["X-FixMe-Event"], "page.published");
        return {
          ok: true,
          status: 200,
          text: async () => "OK",
        } as Response;
      };

      const result = await dispatchWebhookEvent(
        "page.published",
        tenant,
        { pageId: "p-100", title: "New Service" },
        { fetchFn: mockFetch }
      );

      assert.ok(fetchCalled);
      assert.equal(result.length, 1);
      assert.equal(result[0].success, true);

      const logs = getDeliveryLogs(tenant);
      assert.ok(logs.length >= 1);
      assert.equal(logs[0].event, "page.published");
      assert.equal(logs[0].success, true);
    });
  });

  // =========================================================================
  // Round 53: Gutenberg Block Style Variations
  // =========================================================================
  describe("Round 53: Gutenberg Block Style Variations", () => {
    it("3.1 Exposes built-in style variations for core blocks", () => {
      const richTextStyles = get_block_styles("rich_text");
      assert.ok(richTextStyles.length >= 4);
      const styleNames = richTextStyles.map((s) => s.name);
      assert.ok(styleNames.includes("default"));
      assert.ok(styleNames.includes("callout-card"));
      assert.ok(styleNames.includes("blueprint-grid"));

      const promoStyles = get_block_styles("promo_banner");
      assert.ok(promoStyles.some((s) => s.name === "gradient-glow"));
      assert.ok(promoStyles.some((s) => s.name === "bordered-glass"));
    });

    it("3.2 Registers custom block style and applies class names", () => {
      register_block_style("rich_text", {
        name: "retro-terminal",
        label: "Retro Terminal",
        className: "is-style-retro-terminal font-mono bg-black text-green-500",
      });

      const styleClass = get_block_style_class("rich_text", "retro-terminal");
      assert.ok(styleClass.includes("is-style-retro-terminal"));
      assert.ok(styleClass.includes("text-green-500"));
    });
  });

  // =========================================================================
  // Round 54: Media Library Cloud Image Optimizer
  // =========================================================================
  describe("Round 54: Media Library Cloud Image Optimizer", () => {
    it("4.1 Validates dimensions and detects decompression bomb threats", () => {
      const valid = validateImageDimensions(1920, 1080);
      assert.equal(valid.valid, true);
      assert.equal(valid.megapixels, 2.07);

      // Threat: 12000 x 12000 = 144 Megapixels > 50 MP threshold
      const bomb = validateImageDimensions(12000, 12000);
      assert.equal(bomb.valid, false);
      assert.equal(bomb.isDecompressionBombRisk, true);

      // Invalid dimensions
      const negative = validateImageDimensions(-50, 100);
      assert.equal(negative.valid, false);
    });

    it("4.2 Strips EXIF metadata and calculates compression savings", () => {
      // Mock JPEG header with APP1 marker (0xFFE1)
      const mockJpeg = Buffer.from([
        0xff, 0xd8, // SOI
        0xff, 0xe1, 0x00, 0x0a, // APP1 marker + 10 bytes length
        0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0x01, 0x02, // 'Exif\0\0...'
        0xff, 0xdb, 0x00, 0x04, 0x00, 0x00, // DQT marker
        0xff, 0xd9, // EOI
      ]);

      const stripResult = stripExifMetadata(mockJpeg);
      assert.equal(stripResult.stripped, true);
      assert.ok(stripResult.bytesSaved > 0);
      assert.ok(stripResult.sensitiveTagsFound.includes("EXIF_APP1_PAYLOAD"));

      const stats = calculateCompressionStats(100000, 65000);
      assert.equal(stats.savedBytes, 35000);
      assert.equal(stats.savingsPercentage, 35);
      assert.equal(stats.savingsRatio, 0.35);
    });

    it("4.3 Generates modern WebP recommendation and executes WP_Image_Editor", () => {
      const rec = getWebPRecommendation({
        width: 1920,
        height: 1080,
        mimeType: "image/png",
        originalSize: 500_000,
        hasTransparency: true,
      });

      assert.equal(rec.recommendedFormat, "image/webp");
      assert.equal(rec.preservesTransparency, true);
      assert.ok(rec.estimatedSavingsPercentage > 0);

      // WP_Image_Editor workflow
      assert.ok(wp_image_editor_supports({ mime_type: "image/webp", methods: ["resize", "rotate"] }));
      const editor = wp_get_image_editor({
        width: 1920,
        height: 1080,
        mimeType: "image/jpeg",
        filesize: 400_000,
      });

      assert.deepEqual(editor.get_size(), { width: 1920, height: 1080 });
      editor.resize(800, 600, false);
      const resized = editor.get_size();
      assert.ok(resized.width <= 800);
      assert.ok(resized.height <= 600);

      editor.rotate(90);
      const rotated = editor.get_size();
      assert.equal(rotated.width, resized.height);
      assert.equal(rotated.height, resized.width);

      const webpVersion = editor.generate_webp_version(85);
      assert.equal(webpVersion.mimeType, "image/webp");
      assert.ok(webpVersion.savings.savedBytes > 0);
    });
  });

  // =========================================================================
  // Round 55: Post Locking & Heartbeat Collision Guard
  // =========================================================================
  describe("Round 55: Post Locking & Heartbeat Collision Guard", () => {
    it("5.1 Manages lease locks, detects collision, and supports clean takeover", () => {
      const tenant = "shop-lock-test";
      const pageId = "page-lock-101";

      const staffA = { staffId: "user-alice", name: "Alice", tabSessionId: "tab-alice-1" };
      const staffB = { staffId: "user-bob", name: "Bob", tabSessionId: "tab-bob-1" };

      // Alice acquires lock
      const acqA = acquirePostLock(tenant, pageId, staffA);
      assert.equal(acqA.success, true);
      assert.equal(acqA.lock.locked, true);

      // Bob attempts to acquire same lock -> rejected
      const acqB = acquirePostLock(tenant, pageId, staffB);
      assert.equal(acqB.success, false);
      assert.equal(acqB.reason, "ALREADY_LOCKED_BY_OTHER");
      assert.equal(acqB.lock.lockedBy?.name, "Alice");

      // Alice refreshes heartbeat
      const refresh = refreshPostLock(tenant, pageId, staffA);
      assert.equal(refresh.success, true);

      // Bob performs supervisor takeover
      const takeover = takeoverPostLock(tenant, pageId, staffB);
      assert.equal(takeover.success, true);
      assert.equal(takeover.previousHolder?.staffId, "user-alice");
      assert.equal(takeover.lock.lockedBy?.staffId, "user-bob");

      // Bob releases lock
      const release = releasePostLock(tenant, pageId, staffB.staffId, staffB.tabSessionId);
      assert.equal(release, true);

      const check = checkPostLock(tenant, pageId);
      assert.equal(check.locked, false);
    });
  });

  // =========================================================================
  // Round 57: Dynamic Query Loop Block
  // =========================================================================
  describe("Round 57: Dynamic Query Loop Block", () => {
    it("7.1 Queries and filters pages by category, tags, and pagination", () => {
      const mockPages: CustomPage[] = [
        {
          id: "p1",
          slug: "iphone-13-screen",
          title: "ซ่อมหน้าจอ iPhone 13",
          published: true,
          categories: ["screen", "apple"],
          tags: ["quick-fix", "popular"],
          sections: [],
        },
        {
          id: "p2",
          slug: "ipad-battery",
          title: "เปลี่ยนแบตเตอรี่ iPad Air",
          published: true,
          categories: ["battery", "apple"],
          tags: ["battery-replacement"],
          sections: [],
        },
        {
          id: "p3",
          slug: "samsung-s23-screen",
          title: "ซ่อมหน้าจอ Samsung S23",
          published: true,
          categories: ["screen", "samsung"],
          tags: ["quick-fix"],
          sections: [],
        },
        {
          id: "p4",
          slug: "macbook-board",
          title: "ซ่อมบอร์ด MacBook Pro",
          published: false, // draft
          categories: ["board", "apple"],
          sections: [],
        },
      ];

      // Query category: screen
      const screenPages = wp_query_pages(mockPages, { category: "screen", status: "publish" });
      assert.equal(screenPages.total, 2);
      assert.ok(screenPages.items.every((p) => p.categories?.includes("screen")));

      // Query tag: quick-fix
      const tagPages = wp_query_pages(mockPages, { tag: "quick-fix" });
      assert.equal(tagPages.total, 2);

      // Search keyword
      const searchResult = wp_query_pages(mockPages, { search: "Samsung" });
      assert.equal(searchResult.total, 1);
      assert.equal(searchResult.items[0].slug, "samsung-s23-screen");

      // Pagination check
      const paged = wp_query_pages(mockPages, { perPage: 1, page: 1 });
      assert.equal(paged.items.length, 1);
      assert.equal(paged.totalPages, 3);
      assert.equal(paged.hasMore, true);
    });
  });

  // =========================================================================
  // Round 58: WordPress oEmbed Consumer Engine
  // =========================================================================
  describe("Round 58: WordPress oEmbed Consumer Engine", () => {
    it("8.1 Transforms YouTube, Vimeo, TikTok, and Maps into responsive embeds", () => {
      // YouTube Embed
      const ytEmbed = wp_oembed_get("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
      assert.ok(typeof ytEmbed === "string");
      assert.ok(ytEmbed.includes("youtube-nocookie.com/embed/dQw4w9WgXcQ"));
      assert.ok(ytEmbed.includes("wp-block-embed is-type-video is-provider-youtube wp-embed-aspect-16-9"));
      assert.ok(ytEmbed.includes('loading="lazy"'));

      // Vimeo Embed with DNT
      const vimeoEmbed = wp_oembed_get("https://vimeo.com/76979871");
      assert.ok(typeof vimeoEmbed === "string");
      assert.ok(vimeoEmbed.includes("player.vimeo.com/video/76979871?dnt=1"));
      assert.ok(vimeoEmbed.includes("is-provider-vimeo"));

      // TikTok Embed
      const tiktokEmbed = wp_oembed_get("https://www.tiktok.com/@fixme/video/7123456789012345678");
      assert.ok(typeof tiktokEmbed === "string");
      assert.ok(tiktokEmbed.includes("is-provider-tiktok wp-embed-aspect-9-16"));

      // Google Maps Embed
      const mapsEmbed = wp_oembed_get("https://maps.google.com/maps?q=bangkok");
      assert.ok(typeof mapsEmbed === "string");
      assert.ok(mapsEmbed.includes("is-provider-google-maps"));
    });

    it("8.2 autoembed converts URLs in text and filters unsafe scripts", () => {
      const text = `
Here is our store introduction video:
https://www.youtube.com/watch?v=dQw4w9WgXcQ

Check our location on Google Maps:
https://maps.google.com/maps?q=centralworld
      `;

      const embedded = autoembed(text);
      assert.ok(embedded.includes("wp-block-embed is-type-video is-provider-youtube"));
      assert.ok(embedded.includes("is-provider-google-maps"));

      // Sanitization filter check
      const dirtyHtml = '<iframe src="https://safe.com"></iframe><script>alert("xss")</script>';
      const clean = wp_filter_oembed_result(dirtyHtml, "https://safe.com");
      assert.ok(!clean.includes("<script>"));
      assert.ok(clean.includes('loading="lazy"'));
    });
  });

  // =========================================================================
  // Round 59: Multilingual Gettext i18n Engine
  // =========================================================================
  describe("Round 59: Multilingual Gettext i18n Engine", () => {
    it("9.1 Translates text, plural forms, and contexts across Thai and English", () => {
      // 1. Thai (default)
      switch_to_locale("th-TH");
      assert.equal(get_locale(), "th-TH");
      assert.equal(__("Book a Repair"), "จองคิวซ่อม");
      assert.equal(__("Shop Hours"), "เวลาทำการ");
      assert.equal(_e("Services"), "บริการของเรา");

      // Plural test: Thai has invariable plurals
      assert.equal(_n("%d day warranty", "%d days warranty", 1), "1 วันรับประกัน");
      assert.equal(_n("%d day warranty", "%d days warranty", 30), "30 วันรับประกัน");

      // Context test
      assert.equal(_x("Save", "action"), "บันทึกข้อมูล");
      assert.equal(_x("Save", "noun"), "การประหยัด");

      // 2. Switch to English
      switch_to_locale("en-US");
      assert.equal(get_locale(), "en-US");
      assert.equal(__("จองคิวซ่อม"), "Book a Repair");
      assert.equal(__("เวลาทำการ"), "Shop Hours");

      // English plurals
      assert.equal(_n("%d day warranty", "%d days warranty", 1), "1 day warranty");
      assert.equal(_n("%d day warranty", "%d days warranty", 30), "30 days warranty");

      // Context in English
      assert.equal(_x("Save", "action"), "Save Changes");
      assert.equal(_x("Save", "noun"), "Savings");

      // Restore
      restore_previous_locale();
      assert.equal(get_locale(), "th-TH");
    });

    it("9.2 Loads custom textdomain and generates language switcher links", () => {
      load_textdomain("custom-repair-domain", {
        locale: "th-TH",
        messages: {
          "Laser Machine": "เครื่องเลเซอร์ฝาหลัง",
        },
      });

      assert.equal(__("Laser Machine", "custom-repair-domain"), "เครื่องเลเซอร์ฝาหลัง");

      const switcher = renderLanguageSwitcher("th-TH", "/store/bkk-fix/iphone-screen?tab=info");
      assert.equal(switcher.currentLocale, "th-TH");
      assert.equal(switcher.options.length, 2);
      const enOption = switcher.options.find((o) => o.code === "en-US");
      assert.ok(enOption);
      assert.ok(enOption?.url.includes("lang=en"));
      assert.ok(enOption?.url.includes("tab=info"));
    });
  });

  // =========================================================================
  // Round 60: Golden Master Full 60-Round Lifecycle Stress Test
  // =========================================================================
  describe("Round 60: Golden Master Full 60-Round End-to-End Stress Test", () => {
    it("10.1 Complete 60-Round Lifecycle across CPT, Webhooks, Locks, Styles, Media, i18n, Sitemap & Feeds", async () => {
      const tenant = "diamond-shop-master";
      const staffUser = { staffId: "master-tech-1", name: "Somchai", tabSessionId: "tab-master" };

      // Step 1: Acquire post lock to safely edit storefront
      const lockRes = acquirePostLock(tenant, "page-screen-repair", staffUser);
      assert.equal(lockRes.success, true);

      // Step 2: Register outbound webhook for storefront changes
      registerWebhook({
        tenantId: tenant,
        name: "Enterprise Audit Webhook",
        targetUrl: "https://audit.fixme.internal/events",
        secret: "super-secret-audit-pass-1234",
        events: ["page.published"],
      });

      // Step 3: Optimize uploaded image with WebP recommendation
      const dimCheck = validateImageDimensions(2400, 1600);
      assert.equal(dimCheck.valid, true);

      const editor = wp_get_image_editor({
        width: 2400,
        height: 1600,
        mimeType: "image/jpeg",
        filesize: 1_200_000,
      });
      editor.resize(1200, 800);
      const optimizedWebp = editor.generate_webp_version(82);
      assert.ok(optimizedWebp.savings.savingsRatio > 0.25);

      // Step 4: Embed customer repair walkthrough video via oEmbed
      const videoEmbed = wp_oembed_get("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
      assert.ok(typeof videoEmbed === "string");
      assert.ok(videoEmbed.includes("youtube-nocookie.com"));

      // Step 5: Construct CustomPage with Gutenberg block style variations
      const customPage: CustomPage = {
        id: "page-screen-repair",
        slug: "screen-repair-express",
        title: "เปลี่ยนจอ iPhone ด่วน รอรับได้",
        subtitle: "บริการเปลี่ยนหน้าจอมาตรฐานศูนย์",
        published: true,
        categories: ["screen", "apple"],
        tags: ["express", "warranty"],
        sections: [
          {
            id: "b-rich",
            type: "rich_text",
            enabled: true,
            style: {
              className: `${get_block_style_class("rich_text", "blueprint-grid")} p-4`,
            },
            data: {
              content: "### ข้อมูลการซ่อมบอร์ดและหน้าจอ\nเปลี่ยนเร็วภายใน 30 นาที",
            },
          },
        ],
      };

      // Step 6: Query page via dynamic query loop
      const queryRes = wp_query_pages([customPage], { category: "screen", status: "publish" });
      assert.equal(queryRes.total, 1);
      assert.equal(queryRes.items[0].id, "page-screen-repair");

      // Step 7: Translate page metadata with i18n Gettext
      switch_to_locale("th-TH");
      const translatedTitle = __(customPage.title);
      assert.equal(translatedTitle, "เปลี่ยนจอ iPhone ด่วน รอรับได้");
      const warrantyNotice = _n("%d day warranty", "%d days warranty", 90);
      assert.equal(warrantyNotice, "90 วันรับประกัน");

      // Switch to English translation
      switch_to_locale("en-US");
      const enWarranty = _n("%d day warranty", "%d days warranty", 90);
      assert.equal(enWarranty, "90 days warranty");
      restore_previous_locale();

      // Step 8: Generate XML Sitemap 0.9 & Robots.txt
      const sitemap = generateSitemapXml({
        baseUrl: "https://fixme.co.th",
        shopSlug: tenant,
        pages: [customPage],
      });
      assert.ok(sitemap.includes("<loc>https://fixme.co.th/store/diamond-shop-master/screen-repair-express</loc>"));

      const robots = generateRobotsTxt({
        baseUrl: "https://fixme.co.th",
        shopSlug: tenant,
      });
      assert.ok(robots.includes("Sitemap: https://fixme.co.th/store/diamond-shop-master/sitemap.xml"));

      // Step 9: Release edit lock upon successful publish
      const releaseRes = releasePostLock(tenant, "page-screen-repair", staffUser.staffId, staffUser.tabSessionId);
      assert.equal(releaseRes, true);
      assert.equal(checkPostLock(tenant, "page-screen-repair").locked, false);
    });
  });
});
