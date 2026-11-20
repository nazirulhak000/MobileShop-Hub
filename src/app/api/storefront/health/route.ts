import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkOrigin, requireStaffSession, throttle } from "@/lib/staff-auth";
import { safeError } from "@/lib/staff-http";
import { runSiteHealthAudit } from "@/lib/wordpress/siteHealthEngine";
import { DEFAULT_STOREFRONT_CONFIG, StorefrontConfigData } from "@/lib/storefrontTheme";

export const dynamic = "force-dynamic";

/**
 * GET /api/storefront/health
 * Runs the Site Health diagnostic audit against current saved database configuration
 */
export async function GET(req: NextRequest) {
  try {
    const actor = await requireStaffSession(req);
    const tenantId = actor.tenantId;

    // Rate-limiting throttle
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
    await throttle(`storefront:health:${tenantId}`, 60, 60 * 1000);
    await throttle(`storefront:health:ip:${ip}`, 100, 60 * 1000);

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        storefrontConfig: true,
        branches: { select: { id: true } },
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูลร้านค้า" },
        { status: 404 }
      );
    }

    const config = (tenant.storefrontConfig as Partial<StorefrontConfigData>) || DEFAULT_STOREFRONT_CONFIG;
    const report = runSiteHealthAudit(config, {
      shopName: tenant.name,
      shopSlug: tenant.slug,
      branchCount: tenant.branches?.length || 1,
    });

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    return safeError(error);
  }
}

/**
 * POST /api/storefront/health
 * Runs live diagnostic audit on in-flight / draft configuration before saving
 */
export async function POST(req: NextRequest) {
  try {
    checkOrigin(req);
    const actor = await requireStaffSession(req);
    const tenantId = actor.tenantId;

    const body = await req.json().catch(() => ({}));
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        storefrontConfig: true,
        branches: { select: { id: true } },
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูลร้านค้า" },
        { status: 404 }
      );
    }

    const baseConfig = (tenant.storefrontConfig as Partial<StorefrontConfigData>) || DEFAULT_STOREFRONT_CONFIG;
    const testConfig = body.config ? { ...baseConfig, ...body.config } : baseConfig;

    const report = runSiteHealthAudit(testConfig, {
      shopName: tenant.name,
      shopSlug: tenant.slug,
      branchCount: tenant.branches?.length || 1,
    });

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    return safeError(error);
  }
}
