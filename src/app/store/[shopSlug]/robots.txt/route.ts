import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateRobotsTxt } from "@/lib/wordpress/sitemapEngine";

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

    const tenant = await db.tenant.findUnique({
      where: { slug: normalizedSlug },
      select: {
        id: true,
        slug: true,
        status: true,
      },
    });

    const isAvailable = tenant && ["ACTIVE", "TRIAL"].includes(tenant.status);
    const origin = req.nextUrl.origin || "https://fixme.co";

    const robotsTxt = generateRobotsTxt({
      baseUrl: origin,
      shopSlug: normalizedSlug,
      allowIndexing: Boolean(isAvailable),
    });

    return new NextResponse(robotsTxt, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=UTF-8",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch (err: any) {
    console.error("[Robots Engine] Error generating robots.txt:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
