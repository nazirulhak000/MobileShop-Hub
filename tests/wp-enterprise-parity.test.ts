import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { CustomPage } from "../src/lib/storefrontTheme";
import {
  formatCustomPageToWpRest,
  formatCustomPagesToWpRestList,
  queryWpRestPages,
  generateWpExcerpt,
  WpRestPage,
} from "../src/lib/wordpress/restApiEngine";
import {
  set_transient,
  get_transient,
  delete_transient,
  delete_expired_transients,
  createTenantTransientStore,
  WordPressTransientStore,
} from "../src/lib/wordpress/transientEngine";
import {
  exportToWxrXml,
  importFromWxrXml,
} from "../src/lib/wordpress/wxrEngine";

describe("WordPress Enterprise Parity Loop (Rounds 41, 45, 46)", () => {
  /* -------------------------------------------------------------------------- */
  /* Round 41: WordPress REST API v2 Engine                                      */
  /* -------------------------------------------------------------------------- */
  describe("Round 41: WordPress REST API v2 Engine (/wp/v2/pages)", () => {
    const samplePage: CustomPage = {
      slug: "warranty-policy",
      title: "นโยบายการรับประกันงานซ่อม",
      subtitle: "คุ้มครองอะไหล่และงานซ่อม 90 วันเต็ม",
      content: "## เงื่อนไขการรับประกัน\nเราใช้อะไหล่แท้มาตรฐาน OEM",
      template: "boxed-fluid",
      published: true,
      tags: ["warranty", "apple", "service"],
      categories: ["นโยบายและเงื่อนไข"],
      sections: [
        {
          id: "sec-cta-1",
          type: "cta",
          title: "ติดต่อสอบถามเคลมประกัน",
          buttonText: "ส่งเคลมด่วน",
          visible: true,
        },
      ],
    };

    it("41.1 Formats CustomPage into WordPress REST API v2 schema", () => {
      const restPage = formatCustomPageToWpRest(
        samplePage,
        0,
        "https://fixme.co",
        "mbk-repair"
      );

      // Verify core schema identifiers
      assert.strictEqual(restPage.id, 1);
      assert.strictEqual(restPage.slug, "warranty-policy");
      assert.strictEqual(restPage.type, "page");
      assert.strictEqual(restPage.status, "publish");
      assert.strictEqual(restPage.template, "boxed-fluid");

      // Verify rendered title and excerpt
      assert.strictEqual(restPage.title.rendered, "นโยบายการรับประกันงานซ่อม");
      assert.ok(restPage.excerpt.rendered.includes("คุ้มครองอะไหล่และงานซ่อม 90 วันเต็ม"));

      // Verify canonical link and guid
      assert.strictEqual(restPage.link, "https://fixme.co/store/mbk-repair/warranty-policy");
      assert.strictEqual(restPage.guid.rendered, "https://fixme.co/?page_id=1");

      // Verify Gutenberg block serialization in content
      assert.ok(restPage.content.rendered.includes("<!-- wp:fixme/cta"));
      assert.ok(restPage.content.rendered.includes("ติดต่อสอบถามเคลมประกัน"));

      // Verify meta and HATEOAS _links
      assert.strictEqual(restPage.meta.fixme_shop_slug, "mbk-repair");
      assert.strictEqual(restPage.meta._wp_page_template, "boxed-fluid");
      assert.deepStrictEqual(restPage.meta.fixme_tags, ["warranty", "apple", "service"]);
      assert.ok(restPage._links.self[0].href.includes("/api/storefront/v2/pages"));
      assert.ok(restPage._links.collection[0].href.includes("shop=mbk-repair"));
    });

    it("41.2 Draft pages format status as 'draft'", () => {
      const draftPage: CustomPage = {
        slug: "internal-notes",
        title: "คู่มือช่างภายในร้าน",
        published: false,
      };

      const restPage = formatCustomPageToWpRest(
        draftPage,
        4,
        "https://fixme.co",
        "siam-shop"
      );

      assert.strictEqual(restPage.status, "draft");
      assert.strictEqual(restPage.id, 5);
    });

    it("41.3 generateWpExcerpt produces clean excerpt with ellipsis", () => {
      const longPage: CustomPage = {
        slug: "about",
        title: "เกี่ยวกับเรา",
        content:
          "ยินดีต้อนรับสู่ FixMe ศูนย์บริการซ่อมสมาร์ตโฟนครบวงจร เราให้บริการเปลี่ยนหน้าจอ เปลี่ยนแบตเตอรี่แท้ ซ่อมเมนบอร์ด และกู้คืนข้อมูล ด้วยช่างผู้ชำนาญการกว่า 10 ปี พร้อมเครื่องมือทันสมัยระดับแล็บมาตรฐานสากล มั่นใจในคุณภาพและความปลอดภัยของข้อมูล",
      };

      const excerpt = generateWpExcerpt(longPage, 60);
      assert.ok(excerpt.startsWith("<p>"));
      assert.ok(excerpt.includes("&hellip;</p>"));
      assert.ok(!excerpt.includes("##"));
    });

    it("41.4 queryWpRestPages filters, sorts, and paginates items with total counts", () => {
      const pages: CustomPage[] = [
        { slug: "about", title: "About Us", published: true },
        { slug: "contact", title: "Contact Us", published: true },
        { slug: "warranty", title: "Warranty Terms", published: true },
        { slug: "pricing", title: "Pricing Guide", published: true },
        { slug: "secret-draft", title: "Secret Draft", published: false },
      ];

      const restList = formatCustomPagesToWpRestList(pages, "https://fixme.co", "test-shop");

      // Test status filter: only publish
      const publishResult = queryWpRestPages(restList, { status: "publish" });
      assert.strictEqual(publishResult.total, 4);
      assert.ok(!publishResult.items.some((p) => p.status === "draft"));

      // Test search filter
      const searchResult = queryWpRestPages(restList, { search: "warranty" });
      assert.strictEqual(searchResult.total, 1);
      assert.strictEqual(searchResult.items[0].slug, "warranty");

      // Test pagination
      const pageResult = queryWpRestPages(restList, { per_page: 2, page: 2 });
      assert.strictEqual(pageResult.total, 5);
      assert.strictEqual(pageResult.totalPages, 3);
      assert.strictEqual(pageResult.page, 2);
      assert.strictEqual(pageResult.items.length, 2);

      // Test sorting by slug desc
      const sortedResult = queryWpRestPages(restList, { orderby: "slug", order: "desc" });
      assert.strictEqual(sortedResult.items[0].slug, "warranty");
    });
  });

  /* -------------------------------------------------------------------------- */
  /* Round 45: WordPress Transient Caching API                                  */
  /* -------------------------------------------------------------------------- */
  describe("Round 45: WordPress Transient Caching API", () => {
    it("45.1 set_transient and get_transient stores and retrieves data before TTL expires", () => {
      const key = "fixme_store_config_sample";
      const payload = { shopName: "FixMe Central", themeColor: "emerald", active: true };

      const setSuccess = set_transient(key, payload, 60); // 60s expiration
      assert.strictEqual(setSuccess, true);

      const retrieved = get_transient(key);
      assert.deepStrictEqual(retrieved, payload);
    });

    it("45.2 Returns false for non-existent or expired transients", async () => {
      assert.strictEqual(get_transient("non_existent_key_12345"), false);

      const shortLivedStore = new WordPressTransientStore({ maxEntries: 100 });
      // Set transient with very short expiration (10ms)
      shortLivedStore.set("fast_expiring", "sample_val", 0.01);

      // Verify it exists immediately
      assert.strictEqual(shortLivedStore.get("fast_expiring"), "sample_val");

      // Wait 30ms for expiration
      await new Promise((res) => setTimeout(res, 30));

      // Should return false and auto-delete
      assert.strictEqual(shortLivedStore.get("fast_expiring"), false);
      assert.strictEqual(shortLivedStore.has("fast_expiring"), false);
    });

    it("45.3 delete_transient unsets stored key immediately", () => {
      const key = "temporary_rate_limit_token";
      set_transient(key, { attempts: 3 }, 300);

      assert.notStrictEqual(get_transient(key), false);

      const deleted = delete_transient(key);
      assert.strictEqual(deleted, true);
      assert.strictEqual(get_transient(key), false);
    });

    it("45.4 delete_expired_transients sweeps expired items only", async () => {
      const sweepStore = new WordPressTransientStore({ maxEntries: 100 });

      sweepStore.set("persistent_key", "keep_forever", 0); // no expiration
      sweepStore.set("long_lived", "keep_for_100s", 100);
      sweepStore.set("expiring_1", "bye", 0.01); // 10ms
      sweepStore.set("expiring_2", "bye_too", 0.01); // 10ms

      await new Promise((res) => setTimeout(res, 30));

      const purgedCount = sweepStore.purgeExpired();
      assert.strictEqual(purgedCount, 2);

      // Persistent and long lived remain
      assert.strictEqual(sweepStore.get("persistent_key"), "keep_forever");
      assert.strictEqual(sweepStore.get("long_lived"), "keep_for_100s");
      assert.strictEqual(sweepStore.size(), 2);
    });

    it("45.5 LRU eviction evicts oldest accessed entries when max capacity is reached", () => {
      const smallStore = new WordPressTransientStore({ maxEntries: 3 });

      smallStore.set("key_1", "v1", 0);
      smallStore.set("key_2", "v2", 0);
      smallStore.set("key_3", "v3", 0);

      // Access key_1 so it becomes recently used
      smallStore.get("key_1");

      // Adding 4th item should evict key_2 (oldest accessed)
      smallStore.set("key_4", "v4", 0);

      assert.strictEqual(smallStore.size(), 3);
      assert.strictEqual(smallStore.get("key_1"), "v1");
      assert.strictEqual(smallStore.get("key_3"), "v3");
      assert.strictEqual(smallStore.get("key_4"), "v4");
      assert.strictEqual(smallStore.get("key_2"), false); // evicted
    });

    it("45.6 Tenant-isolated transient stores prevent cross-tenant key collisions", () => {
      const tenantA = createTenantTransientStore("shop_apple");
      const tenantB = createTenantTransientStore("shop_samsung");

      tenantA.set("daily_quote", "Think Different", 60);
      tenantB.set("daily_quote", "Do What You Can't", 60);

      assert.strictEqual(tenantA.get("daily_quote"), "Think Different");
      assert.strictEqual(tenantB.get("daily_quote"), "Do What You Can't");

      tenantA.delete("daily_quote");
      assert.strictEqual(tenantA.get("daily_quote"), false);
      assert.strictEqual(tenantB.get("daily_quote"), "Do What You Can't");
    });
  });

  /* -------------------------------------------------------------------------- */
  /* Round 46: WordPress WXR XML Export & Import Engine                         */
  /* -------------------------------------------------------------------------- */
  describe("Round 46: WordPress WXR XML Export & Import Engine", () => {
    const originalPages: CustomPage[] = [
      {
        slug: "terms-of-service",
        title: "ข้อตกลงและเงื่อนไขการให้บริการ",
        subtitle: "โปรดอ่านข้อตกลงก่อนส่งเครื่องซ่อม",
        content: "## ข้อกำหนดทั่วไป\nการส่งซ่อมถือว่าท่านยอมรับข้อตกลงนี้",
        template: "boxed-fluid",
        published: true,
        tags: ["terms", "policy"],
        categories: ["ข้อกำหนดทางกฎหมาย"],
        sections: [
          {
            id: "wx-block-1",
            type: "promo_banner",
            title: "ตรวจเช็คฟรีไม่มีค่าเปิดเครื่อง",
            subtitle: "ประเมินราคาก่อนเริ่มงานซ่อมทุกครั้ง",
            buttonText: "จองคิวตรวจเช็ค",
            visible: true,
          },
        ],
      },
      {
        slug: "faq",
        title: "คำถามที่พบบ่อย (FAQ)",
        subtitle: "ตอบทุกข้อสงสัยเกี่ยวกับงานซ่อม",
        template: "sidebar-right",
        published: true,
        categories: ["ข้อมูลบริการ"],
      },
      {
        slug: "internal-draft",
        title: "แบบร่างโปรโมชั่นปีใหม่",
        template: "blank-canvas",
        published: false,
      },
    ];

    it("46.1 exportToWxrXml generates standard WXR 1.2 XML specification", () => {
      const xml = exportToWxrXml({
        shopName: "FixMe Asoke",
        shopSlug: "asoke-fix",
        baseUrl: "https://fixme.co",
        description: "ศูนย์ซ่อมสมาร์ตโฟนอโศก",
        pages: originalPages,
      });

      // Verify XML declaration and RSS channel
      assert.ok(xml.startsWith("<?xml version=\"1.0\" encoding=\"UTF-8\" ?>"));
      assert.ok(xml.includes("<wp:wxr_version>1.2</wp:wxr_version>"));
      assert.ok(xml.includes("<title><![CDATA[FixMe Asoke]]></title>"));
      assert.ok(xml.includes("<wp:base_blog_url>https://fixme.co/store/asoke-fix</wp:base_blog_url>"));

      // Verify item tags
      assert.ok(xml.includes("<title><![CDATA[ข้อตกลงและเงื่อนไขการให้บริการ]]></title>"));
      assert.ok(xml.includes("<wp:post_name><![CDATA[terms-of-service]]></wp:post_name>"));
      assert.ok(xml.includes("<wp:status><![CDATA[publish]]></wp:status>"));
      assert.ok(xml.includes("<wp:post_type><![CDATA[page]]></wp:post_type>"));

      // Verify Gutenberg block serialized in content:encoded
      assert.ok(xml.includes("<!-- wp:fixme/promo-banner"));
      assert.ok(xml.includes("ตรวจเช็คฟรีไม่มีค่าเปิดเครื่อง"));

      // Verify postmeta template and categories
      assert.ok(xml.includes("<wp:meta_key><![CDATA[_wp_page_template]]></wp:meta_key>"));
      assert.ok(xml.includes("<wp:meta_value><![CDATA[boxed-fluid]]></wp:meta_value>"));
      assert.ok(xml.includes("nicename=\"terms\""));
      assert.ok(xml.includes("domain=\"category\""));
    });

    it("46.2 importFromWxrXml parses standard WordPress XML into FixMe CustomPages", () => {
      const sampleWxrXml = `
<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0"
  xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:wp="http://wordpress.org/export/1.2/"
>
  <channel>
    <title><![CDATA[Siam Tech Repairs]]></title>
    <link>https://siamrepair.com</link>
    <description><![CDATA[Professional Mobile Lab]]></description>
    <language>th</language>
    <wp:wxr_version>1.2</wp:wxr_version>
    <item>
      <title><![CDATA[เกี่ยวกับศูนย์บริการ]]></title>
      <link>https://siamrepair.com/about-us</link>
      <wp:post_name><![CDATA[about-us]]></wp:post_name>
      <wp:status><![CDATA[publish]]></wp:status>
      <wp:post_type><![CDATA[page]]></wp:post_type>
      <category domain="category" nicename="about"><![CDATA[ข้อมูลองค์กร]]></category>
      <category domain="post_tag" nicename="bangkok"><![CDATA[กรุงเทพมหานคร]]></category>
      <content:encoded><![CDATA[<!-- wp:paragraph -->
<p>เราเปิดให้บริการซ่อมมือถือใจกลางสยาม</p>
<!-- /wp:paragraph -->

<!-- wp:fixme/cta {"title":"จองคิวออนไลน์ด่วน"} /-->]]></content:encoded>
      <excerpt:encoded><![CDATA[ศูนย์บริการซ่อมมาตรฐานสากล]]></excerpt:encoded>
      <wp:postmeta>
        <wp:meta_key><![CDATA[_wp_page_template]]></wp:meta_key>
        <wp:meta_value><![CDATA[sidebar-right]]></wp:meta_value>
      </wp:postmeta>
    </item>
  </channel>
</rss>
      `.trim();

      const result = importFromWxrXml(sampleWxrXml);

      assert.strictEqual(result.siteInfo.title, "Siam Tech Repairs");
      assert.strictEqual(result.pages.length, 1);

      const page = result.pages[0];
      assert.strictEqual(page.slug, "about-us");
      assert.strictEqual(page.title, "เกี่ยวกับศูนย์บริการ");
      assert.strictEqual(page.subtitle, "ศูนย์บริการซ่อมมาตรฐานสากล");
      assert.strictEqual(page.template, "sidebar-right");
      assert.strictEqual(page.published, true);
      assert.deepStrictEqual(page.categories, ["ข้อมูลองค์กร"]);
      assert.deepStrictEqual(page.tags, ["กรุงเทพมหานคร"]);

      // Verify Gutenberg section conversion
      assert.ok(page.sections && page.sections.length > 0);
      assert.strictEqual(page.sections[0].type, "cta");
      assert.strictEqual(page.sections[0].title, "จองคิวออนไลน์ด่วน");
    });

    it("46.3 Bidirectional export -> import roundtrip preserves page integrity", () => {
      const exportedXml = exportToWxrXml({
        shopName: "Roundtrip Shop",
        shopSlug: "rt-shop",
        pages: originalPages,
      });

      const imported = importFromWxrXml(exportedXml);

      assert.strictEqual(imported.pages.length, originalPages.length);

      // Verify Page 1 (terms-of-service)
      const p1 = imported.pages[0];
      assert.strictEqual(p1.slug, "terms-of-service");
      assert.strictEqual(p1.title, originalPages[0].title);
      assert.strictEqual(p1.subtitle, originalPages[0].subtitle);
      assert.strictEqual(p1.template, "boxed-fluid");
      assert.strictEqual(p1.published, true);
      assert.deepStrictEqual(p1.tags, ["terms", "policy"]);
      assert.deepStrictEqual(p1.categories, ["ข้อกำหนดทางกฎหมาย"]);
      assert.ok(p1.sections && p1.sections.length > 0);
      assert.strictEqual(p1.sections[0].title, "ตรวจเช็คฟรีไม่มีค่าเปิดเครื่อง");

      // Verify Page 3 (internal-draft)
      const p3 = imported.pages[2];
      assert.strictEqual(p3.slug, "internal-draft");
      assert.strictEqual(p3.published, false);
      assert.strictEqual(p3.template, "blank-canvas");
    });

    it("46.4 Gracefully handles corrupted XML, skips non-page types, and auto-generates slug", () => {
      const dirtyXml = `
<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Attached Image</title>
      <wp:post_type>attachment</wp:post_type>
    </item>
    <item>
      <title>หน้าบริการซ่อมพิเศษ</title>
      <!-- Missing wp:post_name, missing status, plain text content -->
      <content:encoded><![CDATA[บริการเปลี่ยนฝาหลังและกรอบเครื่อง]]></content:encoded>
    </item>
  </channel>
</rss>
      `.trim();

      const result = importFromWxrXml(dirtyXml);

      // Attachment should be filtered out; page without slug should auto-generate
      assert.strictEqual(result.pages.length, 1);
      assert.strictEqual(result.pages[0].title, "หน้าบริการซ่อมพิเศษ");
      assert.ok(result.pages[0].slug.length > 0);
      assert.ok(result.pages[0].content?.includes("บริการเปลี่ยนฝาหลังและกรอบเครื่อง"));
    });
  });
});
