import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  PromoBannerBlock,
  PhotoGalleryBlock,
  VideoEmbedBlock,
  RichTextBlock,
  CtaBlock,
  HtmlEmbedBlock,
  BusinessHoursBlock,
  DynamicBlockRenderer,
} from "../src/components/landing/blocks";
import { StorefrontThemeColor } from "../src/lib/storefrontTheme";

describe("Storefront Custom Blocks & DynamicBlockRenderer", () => {
  const themes: StorefrontThemeColor[] = [
    "emerald",
    "cyan",
    "blue",
    "purple",
    "amber",
    "rose",
  ];

  it("1. PromoBannerBlock renders correctly across all theme palettes", () => {
    for (const theme of themes) {
      const html = renderToString(
        React.createElement(PromoBannerBlock, {
          title: "ลด 50% วันเปิดร้านใหม่",
          subtitle: "สำหรับลูกค้า 50 ท่านแรกที่นำเครื่องมาตรวจเช็ค",
          badge: "🔥 โปรโมชั่นพิเศษ",
          buttonText: "กดรับสิทธิ์เลย",
          buttonUrl: "https://example.com/promo",
          discountTag: "NEWSHOP50",
          expiryNotice: "หมดเขตสิ้นเดือนนี้",
          themeColor: theme,
        })
      );

      assert.ok(html.includes("ลด 50% วันเปิดร้านใหม่"));
      assert.ok(html.includes("NEWSHOP50"));
      assert.ok(html.includes("กดรับสิทธิ์เลย"));
      assert.ok(html.includes("min-h-[50px]")); // Touch target >= 44px
    }
  });

  it("2. PhotoGalleryBlock renders grid with 2, 3, and 4 columns and captions", () => {
    const images = [
      { url: "https://example.com/img1.jpg", caption: "ซ่อมหน้าจอ iPhone 15 Pro" },
      { url: "https://example.com/img2.jpg", caption: "เปลี่ยนแบตเตอรี่แท้ Samsung S24" },
    ];

    const html2 = renderToString(
      React.createElement(PhotoGalleryBlock, {
        title: "ผลงานซ่อม",
        columns: 2,
        images,
      })
    );
    assert.ok(html2.includes("ผลงานซ่อม"));
    assert.ok(html2.includes("ซ่อมหน้าจอ iPhone 15 Pro"));
    assert.ok(html2.includes("grid-cols-1 sm:grid-cols-2"));

    const html4 = renderToString(
      React.createElement(PhotoGalleryBlock, {
        columns: 4,
        images,
      })
    );
    assert.ok(html4.includes("lg:grid-cols-4"));
  });

  it("3. VideoEmbedBlock handles YouTube, TikTok, and direct MP4 URLs safely", () => {
    // YouTube
    const htmlYt = renderToString(
      React.createElement(VideoEmbedBlock, {
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        title: "วิดีโอแนะนำร้าน",
      })
    );
    assert.ok(htmlYt.includes("youtube-nocookie.com/embed/dQw4w9WgXcQ"));
    assert.ok(htmlYt.includes("aspect-video"));

    // MP4
    const htmlMp4 = renderToString(
      React.createElement(VideoEmbedBlock, {
        videoUrl: "https://example.com/demo.mp4",
        platform: "mp4",
      })
    );
    assert.ok(htmlMp4.includes("<video"));
    assert.ok(htmlMp4.includes("https://example.com/demo.mp4"));

    // TikTok
    const htmlTikTok = renderToString(
      React.createElement(VideoEmbedBlock, {
        videoUrl: "https://www.tiktok.com/@shop/video/1234567890",
      })
    );
    assert.ok(htmlTikTok.includes("tiktok.com/embed/v2/1234567890"));
  });

  it("4. RichTextBlock renders formatted headings, bold text, lists, and author card", () => {
    const content = `## ประวัติความเป็นมา\nเราเปิดให้บริการมานานกว่า **10 ปี**\n- ช่างผ่านการอบรม\n- อะไหล่แท้ 100%`;
    const html = renderToString(
      React.createElement(RichTextBlock, {
        title: "เกี่ยวกับศูนย์บริการ",
        content,
        author: "ช่างสมชาย มั่งคั่ง",
        authorRole: "หัวหน้าช่างเทคนิค",
      })
    );

    assert.ok(html.includes("ประวัติความเป็นมา"));
    assert.ok(html.includes("10 ปี"));
    assert.ok(html.includes("ช่างผ่านการอบรม"));
    assert.ok(html.includes("ช่างสมชาย มั่งคั่ง"));
    assert.ok(html.includes("หัวหน้าช่างเทคนิค"));
  });

  it("5. CtaBlock renders high-conversion banner with LINE and phone buttons", () => {
    const html = renderToString(
      React.createElement(CtaBlock, {
        title: "แอด LINE รับคูปองส่วนลด 100 บาท",
        lineId: "@repairshop",
        phone: "089-999-8888",
        benefits: ["ตรวจเช็คฟรี", "รับประกัน 90 วัน"],
      })
    );

    assert.ok(html.includes("@repairshop"));
    assert.ok(html.includes("แอด LINE"));
    assert.ok(html.includes("089-999-8888"));
    assert.ok(html.includes("tel:0899998888"));
    assert.ok(html.includes("https://line.me/R/ti/p/%40repairshop"));
    assert.ok(html.includes("ตรวจเช็คฟรี"));
    assert.ok(html.includes("min-h-[52px]")); // Touch target >= 44px
  });

  it("6. HtmlEmbedBlock renders iframe safely with sandboxing", () => {
    const mapIframe = `<iframe src="https://www.google.com/maps/embed?pb=!123" width="600" height="450"></iframe>`;
    const html = renderToString(
      React.createElement(HtmlEmbedBlock, {
        html: mapIframe,
        height: 500,
        title: "แผนที่การเดินทาง",
      })
    );

    assert.ok(html.includes("https://www.google.com/maps/embed?pb=!123"));
    assert.ok(html.includes("sandbox=\"allow-scripts allow-popups allow-forms\""));
    assert.ok(html.includes("500px"));
  });

  it("7. BusinessHoursBlock renders schedule table and live open/closed status", () => {
    const html = renderToString(
      React.createElement(BusinessHoursBlock, {
        title: "เวลาทำการศูนย์บริการ",
        schedule: [
          { day: "วันจันทร์ - วันศุกร์", openTime: "09:00", closeTime: "19:00", isClosed: false },
          { day: "วันอาทิตย์", openTime: "", closeTime: "", isClosed: true },
        ],
        emergencyNote: "ติดต่อฉุกเฉินได้ 24 ชั่วโมง",
      })
    );

    assert.ok(html.includes("เวลาทำการศูนย์บริการ"));
    assert.ok(html.includes("วันจันทร์ - วันศุกร์"));
    assert.ok(html.includes("ปิดทำการ"));
    assert.ok(html.includes("ติดต่อฉุกเฉินได้ 24 ชั่วโมง"));
  });

  it("8. DynamicBlockRenderer correctly dispatches every block type", () => {
    const blocks = [
      {
        id: "b1",
        type: "promo_banner",
        title: "Dynamic Promo Title",
      },
      {
        id: "b2",
        type: "photo_gallery",
        title: "Dynamic Gallery Title",
      },
      {
        id: "b3",
        type: "video_embed",
        title: "Dynamic Video Title",
        videoUrl: "https://youtu.be/dQw4w9WgXcQ",
      },
      {
        id: "b4",
        type: "rich_text",
        title: "Dynamic Rich Text Title",
        content: "เนื้อหาบทความทดสอบ",
      },
      {
        id: "b5",
        type: "cta",
        title: "Dynamic CTA Title",
      },
      {
        id: "b6",
        type: "html_embed",
        html: "https://example.com/widget",
      },
      {
        id: "b7",
        type: "business_hours",
        title: "Dynamic Hours Title",
      },
    ];

    for (const blk of blocks) {
      const rendered = renderToString(
        React.createElement(DynamicBlockRenderer, {
          block: blk,
          themeColor: "cyan",
        })
      );
      assert.ok(rendered.length > 50, `Block ${blk.type} failed to render string output`);
    }
  });

  it("9. DynamicBlockRenderer returns empty when visible=false or enabled=false", () => {
    const hiddenBlock1 = {
      id: "h1",
      type: "promo_banner",
      title: "Hidden Block",
      visible: false,
    };
    const rendered1 = renderToString(
      React.createElement(DynamicBlockRenderer, { block: hiddenBlock1 })
    );
    assert.equal(rendered1, "");

    const hiddenBlock2 = {
      id: "h2",
      type: "cta",
      title: "Disabled Block",
      enabled: false,
    };
    const rendered2 = renderToString(
      React.createElement(DynamicBlockRenderer, { block: hiddenBlock2 })
    );
    assert.equal(rendered2, "");
  });

  it("10. DynamicBlockRenderer handles unknown types and corrupt data gracefully without throwing", () => {
    const unknownBlock = {
      id: "u1",
      type: "non_existent_crazy_type",
      title: "Unknown",
    };
    const rendered = renderToString(
      React.createElement(DynamicBlockRenderer, { block: unknownBlock })
    );
    assert.equal(rendered, "");
  });
});
