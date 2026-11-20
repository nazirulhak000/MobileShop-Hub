import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { resolveNavHref, LandingNavbar } from "../src/components/landing/LandingNavbar";
import { LandingFooter } from "../src/components/landing/LandingFooter";
import { buildStoreMetadata, buildSubpageMetadata } from "../src/lib/storefrontMetadata";
import { revalidate as storeRevalidate, runtime as storeRuntime } from "../src/app/store/[shopSlug]/page";
import { revalidate as subpageRevalidate, runtime as subpageRuntime } from "../src/app/store/[shopSlug]/[pageSlug]/page";

describe("Round 6, 9, 10 Audit & Hardening Loop", () => {
  describe("Round 6: Navigation Menu, Nested Paths, Deep Linking & Indicators", () => {
    it("1. resolveNavHref correctly differentiates internal anchors on home vs subpage", () => {
      // On home page: keeps anchor as-is
      const homeAnchor = resolveNavHref("#services", false, "apple-lab");
      assert.strictEqual(homeAnchor.resolvedHref, "#services");
      assert.strictEqual(homeAnchor.isExternal, false);

      // On subpage: prefixes with /store/[shopSlug]
      const subpageAnchor = resolveNavHref("#services", true, "apple-lab");
      assert.strictEqual(subpageAnchor.resolvedHref, "/store/apple-lab#services");
      assert.strictEqual(subpageAnchor.isExternal, false);
    });

    it("2. resolveNavHref flags external URLs and protocol schemes correctly", () => {
      const httpsLink = resolveNavHref("https://instagram.com/irepair", false, "irepair");
      assert.strictEqual(httpsLink.resolvedHref, "https://instagram.com/irepair");
      assert.strictEqual(httpsLink.isExternal, true);

      const httpLink = resolveNavHref("http://example.com", true, "irepair");
      assert.strictEqual(httpLink.isExternal, true);

      const protocolRelative = resolveNavHref("//cdn.example.com", false, "irepair");
      assert.strictEqual(protocolRelative.isExternal, true);

      const mailto = resolveNavHref("mailto:support@irepair.com", false, "irepair");
      assert.strictEqual(mailto.isExternal, true);

      const tel = resolveNavHref("tel:0812345678", false, "irepair");
      assert.strictEqual(tel.isExternal, true);
    });

    it("3. resolveNavHref sanitizes dangerous javascript: and vbscript: URIs", () => {
      const jsLink = resolveNavHref("javascript:alert(document.cookie)", false, "apple-lab");
      assert.strictEqual(jsLink.resolvedHref, "#");
      assert.strictEqual(jsLink.isExternal, false);

      const vbLink = resolveNavHref("vbscript:MsgBox(1)", true, "apple-lab");
      assert.strictEqual(vbLink.resolvedHref, "#");
      assert.strictEqual(vbLink.isExternal, false);
    });

    it("4. resolveNavHref maps relative slugs and nested paths to tenant store routes", () => {
      const relSlug = resolveNavHref("about", false, "fast-fix");
      assert.strictEqual(relSlug.resolvedHref, "/store/fast-fix/about");
      assert.strictEqual(relSlug.isExternal, false);

      const leadingSlashRel = resolveNavHref("/warranty-terms", true, "fast-fix");
      assert.strictEqual(leadingSlashRel.resolvedHref, "/store/fast-fix/warranty-terms");

      const nestedPath = resolveNavHref("services/screen-repair", false, "fast-fix");
      assert.strictEqual(nestedPath.resolvedHref, "/store/fast-fix/services/screen-repair");

      // Platform absolute paths remain untouched
      const portalPath = resolveNavHref("/s/fast-fix", false, "fast-fix");
      assert.strictEqual(portalPath.resolvedHref, "/s/fast-fix");

      const dashboardPath = resolveNavHref("/dashboard", false, "fast-fix");
      assert.strictEqual(dashboardPath.resolvedHref, "/dashboard");
    });

    it("5. LandingNavbar renders active indicators and deep links", () => {
      const navMenu = [
        { id: "1", label: "หน้าแรก", href: "#services", isExternal: false },
        { id: "2", label: "นโยบายรับประกัน", href: "/store/fix-pro/warranty", isExternal: false },
        { id: "3", label: "Facebook Shop", href: "https://facebook.com/fixpro", isExternal: true },
      ];

      const html = renderToString(
        React.createElement(LandingNavbar as any, {
          shopName: "FixPro Lab",
          shopSlug: "fix-pro",
          navigationMenu: navMenu,
          isSubpage: true,
          themeColor: "emerald",
        })
      );

      assert.ok(html.includes("FixPro Lab"));
      // Anchor link resolved with shopSlug on subpage
      assert.ok(html.includes("/store/fix-pro#services"));
      // Internal page link
      assert.ok(html.includes("/store/fix-pro/warranty"));
      // External link with security attributes
      assert.ok(html.includes('href="https://facebook.com/fixpro"'));
      assert.ok(html.includes('target="_blank"'));
      assert.ok(html.includes('rel="noopener noreferrer"'));
      // Mobile search button also deep links to home anchor on subpage
      assert.ok(html.includes('/store/fix-pro#track-search'));
    });

    it("6. LandingFooter resolves anchors and renders custom subpages and social links", () => {
      const customPages = [
        { id: "p1", slug: "about", title: "เกี่ยวกับศูนย์ซ่อม", published: true, template: "default" },
        { id: "p2", slug: "draft-secret", title: "หน้าร่างลับ", published: false, template: "default" },
      ];
      const footerSocialLinks = {
        facebook: "https://facebook.com/irepair",
        line: "https://line.me/ti/p/@irepair",
        tiktok: "https://tiktok.com/@irepair",
      };

      const html = renderToString(
        React.createElement(LandingFooter as any, {
          shopName: "iRepair Express",
          shopSlug: "irepair",
          isSubpage: true,
          themeColor: "emerald",
          customPages,
          footerSocialLinks,
        })
      );

      // Anchors resolved to /store/irepair#...
      assert.ok(html.includes("/store/irepair#services"));
      assert.ok(html.includes("/store/irepair#faq"));
      assert.ok(html.includes("/store/irepair#track-search"));

      // Published subpage is discoverable in footer
      assert.ok(html.includes("/store/irepair/about"));
      assert.ok(html.includes("เกี่ยวกับศูนย์ซ่อม"));

      // Unpublished draft subpage must NOT appear in footer links
      assert.ok(!html.includes("draft-secret"));
      assert.ok(!html.includes("หน้าร่างลับ"));

      // Social links rendered
      assert.ok(html.includes("https://facebook.com/irepair"));
      assert.ok(html.includes("https://line.me/ti/p/@irepair"));
      assert.ok(html.includes("https://tiktok.com/@irepair"));
    });
  });

  describe("Round 9: Dynamic Metadata, OpenGraph, Twitter Cards & Draft SEO Blocking", () => {
    it("1. Storefront Home dynamic metadata includes OpenGraph, Twitter, and Canonical", () => {
      const mockTenant = {
        id: "t-1",
        slug: "mock-apple",
        name: "Apple Specialist BKK",
        logoUrl: "https://example.com/logo.png",
        branches: [{ name: "Siam Paragon", address: "Siam", phone: "0811111111" }],
        storefrontConfig: {
          headline: "ซ่อมไอโฟนด่วน รอรับได้ 30 นาที",
          subheadline: "มาตรฐานอะไหล่แท้ รับประกัน 1 ปีเต็ม",
        },
      };

      const metadata = buildStoreMetadata(mockTenant, "mock-apple");

      assert.ok(metadata.title?.toString().includes("Apple Specialist BKK"));
      assert.ok(metadata.title?.toString().includes("ซ่อมไอโฟนด่วน"));
      assert.strictEqual(metadata.description, "มาตรฐานอะไหล่แท้ รับประกัน 1 ปีเต็ม");
      assert.strictEqual(metadata.alternates?.canonical, "/store/mock-apple");

      // OpenGraph verification
      assert.strictEqual((metadata.openGraph as any)?.type, "website");
      assert.strictEqual(metadata.openGraph?.siteName, "Apple Specialist BKK");
      assert.strictEqual(metadata.openGraph?.url, "/store/mock-apple");
      assert.strictEqual(metadata.openGraph?.locale, "th_TH");

      // Twitter verification
      assert.strictEqual((metadata.twitter as any)?.card, "summary_large_image");
      assert.ok(metadata.twitter?.title?.toString().includes("Apple Specialist BKK"));

      // Robots verification
      assert.deepStrictEqual(metadata.robots, { index: true, follow: true });
    });

    it("2. Non-existent store emits robots: { index: false, follow: false }", () => {
      const metadata = buildStoreMetadata(null, "unknown-shop");
      assert.deepStrictEqual(metadata.robots, { index: false, follow: false });
      assert.ok(metadata.title?.toString().includes("ไม่พบร้านค้า"));
    });

    it("3. Published subpage emits dynamic OpenGraph, article type, and index: true", () => {
      const mockTenant = {
        id: "t-2",
        slug: "smart-fix",
        name: "SmartFix Lab",
        logoUrl: "https://example.com/logo2.png",
        branches: [],
        storefrontConfig: {
          customPages: JSON.stringify([
            {
              slug: "warranty-terms",
              title: "เงื่อนไขการรับประกันมาตรฐาน",
              subtitle: "รับประกันหน้าจอและแบตเตอรี่ 180 วัน",
              published: true,
            },
          ]),
        },
      };

      const metadata = buildSubpageMetadata(mockTenant, "smart-fix", "warranty-terms", false);

      assert.strictEqual(metadata.title, "เงื่อนไขการรับประกันมาตรฐาน | SmartFix Lab");
      assert.strictEqual(metadata.alternates?.canonical, "/store/smart-fix/warranty-terms");
      assert.strictEqual((metadata.openGraph as any)?.type, "article");
      assert.strictEqual(metadata.openGraph?.siteName, "SmartFix Lab");
      assert.strictEqual(metadata.openGraph?.url, "/store/smart-fix/warranty-terms");
      assert.strictEqual((metadata.twitter as any)?.card, "summary_large_image");
      assert.deepStrictEqual(metadata.robots, { index: true, follow: true });
    });

    it("4. Unpublished/draft subpage strictly emits robots: { index: false, follow: false }", () => {
      const mockTenant = {
        id: "t-2",
        slug: "smart-fix",
        name: "SmartFix Lab",
        branches: [],
        storefrontConfig: {
          customPages: JSON.stringify([
            {
              slug: "unreleased-pricing",
              title: "ราคาพิเศษสำหรับ VIP (แบบร่าง)",
              published: false,
            },
          ]),
        },
      };

      // Unauthenticated visitor
      const metaVisitor = buildSubpageMetadata(mockTenant, "smart-fix", "unreleased-pricing", false);
      assert.deepStrictEqual(metaVisitor.robots, { index: false, follow: false });
      assert.ok(metaVisitor.title?.toString().includes("ไม่พบหน้า"));

      // Even authorized staff viewing preview: robots must remain NOINDEX
      const metaStaff = buildSubpageMetadata(mockTenant, "smart-fix", "unreleased-pricing", true);
      assert.deepStrictEqual(metaStaff.robots, { index: false, follow: false });
      assert.ok(metaStaff.title?.toString().includes("[ฉบับร่าง]"));
    });

    it("5. Non-existent subpage strictly emits robots: { index: false, follow: false }", () => {
      const mockTenant = {
        id: "t-2",
        slug: "smart-fix",
        name: "SmartFix Lab",
        branches: [],
        storefrontConfig: { customPages: "[]" },
      };

      const metadata = buildSubpageMetadata(mockTenant, "smart-fix", "does-not-exist", false);

      assert.deepStrictEqual(metadata.robots, { index: false, follow: false });
      assert.ok(metadata.title?.toString().includes("ไม่พบหน้า"));
    });
  });

  describe("Round 10: Vercel Serverless Edge Caching & Performance", () => {
    it("1. Both storefront home and subpage routes export ISR revalidate = 60s", () => {
      assert.strictEqual(storeRevalidate, 60);
      assert.strictEqual(subpageRevalidate, 60);
    });

    it("2. Both routes declare runtime = 'nodejs' for serverless Prisma safety", () => {
      assert.strictEqual(storeRuntime, "nodejs");
      assert.strictEqual(subpageRuntime, "nodejs");
    });
  });
});

