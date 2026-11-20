import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { staffTokens, hashToken } from "@/lib/staff-auth";
import { safeParseCustomPages } from "@/lib/storefrontTheme";
import {
  formatCustomPagesToWpRestList,
  queryWpRestPages,
  WpRestPagesQuery,
} from "@/lib/wordpress/restApiEngine";

export const dynamic = "force-dynamic";

const SAFE_SLUG_REGEX = /^[a-z0-9_-]{1,100}$/;

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const rawShop = searchParams.get("shop") || searchParams.get("shopSlug") || searchParams.get("tenant");
    const shopSlug = rawShop?.trim().toLowerCase();

    if (!shopSlug || !SAFE_SLUG_REGEX.test(shopSlug)) {
      return NextResponse.json(
        {
          code: "rest_missing_callback_param",
          message: "Missing or invalid shop slug parameter (?shop=<shopSlug>)",
          data: { status: 400 },
        },
        { status: 400 }
      );
    }

    // Resolve tenant
    const tenant = await db.tenant.findUnique({
      where: { slug: shopSlug },
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
      },
    });

    if (!tenant || !["ACTIVE", "TRIAL"].includes(tenant.status)) {
      return NextResponse.json(
        {
          code: "rest_shop_not_found",
          message: `Shop '${shopSlug}' not found or inactive`,
          data: { status: 404 },
        },
        { status: 404 }
      );
    }

    // Check staff session for draft viewing authorization
    let isAuthorizedStaff = false;
    const authHeader = req.headers.get("authorization");
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const cookieStore = await cookies();
    const token = bearer || staffTokens(cookieStore)[0];

    if (token) {
      const hashed = hashToken(token);
      const session = await db.staffSession.findUnique({
        where: { tokenHash: hashed },
        select: { tenantId: true, expiresAt: true, revokedAt: true },
      });
      if (
        session &&
        !session.revokedAt &&
        session.expiresAt > new Date() &&
        session.tenantId === tenant.id
      ) {
        isAuthorizedStaff = true;
      }
    }

    // Query storefront config
    const storefront = await db.storefrontConfig.findUnique({
      where: { tenantId: tenant.id },
      select: { customPages: true },
    });

    const parsedCustomPages = safeParseCustomPages(storefront?.customPages);

    // Filter out unpublished drafts for public visitors
    const accessiblePages = isAuthorizedStaff
      ? parsedCustomPages
      : parsedCustomPages.filter((p) => p.published !== false);

    // Extract query parameters
    const origin = req.nextUrl.origin || "http://localhost:3000";
    const restPages = formatCustomPagesToWpRestList(accessiblePages, origin, shopSlug);

    const query: WpRestPagesQuery = {
      page: searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1,
      per_page: searchParams.get("per_page") ? parseInt(searchParams.get("per_page")!, 10) : 10,
      search: searchParams.get("search") || undefined,
      slug: searchParams.get("slug") || undefined,
      status: searchParams.get("status") || (isAuthorizedStaff ? "any" : "publish"),
      order: (searchParams.get("order")?.toLowerCase() as "asc" | "desc") || "asc",
      orderby: (searchParams.get("orderby")?.toLowerCase() as "date" | "title" | "slug" | "id") || "id",
    };

    const result = queryWpRestPages(restPages, query);

    // Standard WordPress REST API headers
    const headers = new Headers();
    headers.set("X-WP-Total", String(result.total));
    headers.set("X-WP-TotalPages", String(result.totalPages));
    headers.set("Allow", "GET, HEAD");
    headers.set("Content-Type", "application/json; charset=UTF-8");

    return NextResponse.json(result.items, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    console.error("[WP REST API v2] Error serving /wp/v2/pages:", err);
    return NextResponse.json(
      {
        code: "internal_server_error",
        message: err?.message || "Internal server error occurred",
        data: { status: 500 },
      },
      { status: 500 }
    );
  }
}
