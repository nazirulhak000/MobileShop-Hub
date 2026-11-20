import { NextRequest, NextResponse } from "next/server";
import { resolveTenantBySlug } from "@/lib/storefrontTenant";
import { safeParseCustomPages, DEFAULT_STOREFRONT_CONFIG, StorefrontConfigData } from "@/lib/storefrontTheme";
import {
  generateRssFeed,
  generateAtomFeed,
  createFeedItemsFromStorefront,
} from "@/lib/wordpress/feedEngine";

export const runtime = "nodejs";
export const revalidate = 3600; // 1 hour edge caching

interface RouteContext {
  params: Promise<{
    shopSlug: string;
  }>;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { shopSlug } = await params;
    const cleanSlug = String(shopSlug || "").trim().toLowerCase();

    const tenant = await resolveTenantBySlug(cleanSlug);
    if (!tenant) {
      return new NextResponse("Shop not found", { status: 404 });
    }

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "fixme.in.th";
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const origin = `${proto}://${host}`;

    const shopUrl = `${origin}/store/${cleanSlug}`;
    const feedUrl = `${origin}/store/${cleanSlug}/feed`;

    const rawConfig = tenant.storefrontConfig as Partial<StorefrontConfigData> || {};
    const headline = rawConfig.headline || DEFAULT_STOREFRONT_CONFIG.headline;
    const subheadline = rawConfig.subheadline || DEFAULT_STOREFRONT_CONFIG.subheadline;

    const channelInfo = {
      title: `${tenant.name} - ข่าวสารและบริการซ่อมล่าสุด`,
      link: shopUrl,
      feedUrl,
      description: subheadline || headline || `บริการซ่อมด่วนมาตรฐานแล็บ • ${tenant.name}`,
      shopName: tenant.name,
      language: "th-TH",
      lastBuildDate: new Date(),
    };

    const customPages = safeParseCustomPages(rawConfig.customPages);
    const feedItems = createFeedItemsFromStorefront(cleanSlug, customPages, rawConfig, origin);

    const format = req.nextUrl.searchParams.get("format")?.toLowerCase();

    if (format === "atom") {
      const atomXml = generateAtomFeed(channelInfo, feedItems);
      return new NextResponse(atomXml, {
        status: 200,
        headers: {
          "Content-Type": "application/atom+xml; charset=utf-8",
          "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
        },
      });
    }

    const rssXml = generateRssFeed(channelInfo, feedItems);
    return new NextResponse(rssXml, {
      status: 200,
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Storefront RSS feed generation error:", error);
    return new NextResponse("Failed to generate syndication feed", { status: 500 });
  }
}
