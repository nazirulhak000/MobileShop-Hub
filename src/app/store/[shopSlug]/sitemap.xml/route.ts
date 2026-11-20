import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { safeParseCustomPages } from "@/lib/storefrontTheme";
import { generateSitemapXml } from "@/lib/wordpress/sitemapEngine";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{
    shopSlug: string;
  }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { shopSlug } = await params;
    const normalizedSlug = (shopSlug || "").trim().toLowerCase();

    if (!normalizedSlug) {
      return new NextResponse("Shop slug is required", { status: 400 });
    }

    // Lookup tenant
    const tenant = await db.tenant.findUnique({
      where: { slug: normalizedSlug },
      select: {
        id: true,
        slug: true,
        status: true,
      },
    });

    if (!tenant || !["ACTIVE", "TRIAL"].includes(tenant.status)) {
      return new NextResponse("Storefront not found", { status: 404 });
    }

    // Query storefront config
    const storefront = await db.storefrontConfig.findUnique({
      where: { tenantId: tenant.id },
      select: {
        customPages: true,
        updatedAt: true,
      },
    });

    const parsedPages = safeParseCustomPages(storefront?.customPages);
    const origin = req.nextUrl.origin || "https://fixme.co";

    const sitemapXml = generateSitemapXml({
      baseUrl: origin,
      shopSlug: tenant.slug,
      pages: parsedPages,
      updatedAt: storefront?.updatedAt,
    });

    return new NextResponse(sitemapXml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=UTF-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
        "X-Robots-Tag": "noindex, follow", // sitemap itself doesn't need indexing
      },
    });
  } catch (err: any) {
    console.error("[Sitemap Engine] Error generating sitemap.xml:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
