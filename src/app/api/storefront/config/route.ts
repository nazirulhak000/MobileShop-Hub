import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { hashToken, staffTokens } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

const DEFAULT_STOREFRONT_CONFIG = {
  themeColor: "emerald",
  headline: "ศูนย์บริการซ่อมมือถือด่วน มาตรฐานระดับโปร",
  subheadline: "ตรวจเช็กด้วยระบบดิจิทัล รู้ผลทันที ติดตามสถานะเรียลไทม์ 24 ชม. อะไหล่แท้ รับประกันสูงสุด 180 วัน",
  badge: "Official Service Center",
  announcementText: "โปรโมชั่นเปิดร้านใหม่: เปลี่ยนแบตเตอรี่ลด 20% ฟรีตรวจเช็กสภาพเครื่อง 10 รายการ!",
  announcementEnabled: true,
  phone: "02-123-4567",
  lineId: "@mobileshophub",
  lineQrUrl: "",
  googleMapsUrl: "https://maps.google.com",
  showLiveTracking: true,
  showHardwareScanner: true,
  showServicesBento: true,
  showInspectionBench: true,
  showPriceEstimator: true,
  showBeforeAfterSlider: true,
  showCustomerReviews: true,
  showLocationSection: true,
  showFaqSection: true,
  showMobileQuickBar: true,
  customBeforeAfterCases: null,
  customPricingRates: null,
  customFaqs: null,
};

async function resolveTenantId(req: NextRequest): Promise<string | null> {
  const shopSlug = req.nextUrl.searchParams.get("shopSlug");
  if (shopSlug) {
    const tenant = await db.tenant.findUnique({
      where: { slug: shopSlug },
      select: { id: true },
    });
    if (tenant) return tenant.id;
  }

  // Check authenticated staff session
  const cookieStore = await cookies();
  const token = staffTokens(cookieStore)[0];
  if (token) {
    const session = await db.staffSession.findUnique({
      where: { tokenHash: hashToken(token) },
      select: { tenantId: true, expiresAt: true, revokedAt: true },
    });
    if (session && !session.revokedAt && session.expiresAt > new Date()) {
      return session.tenantId;
    }
  }

  // Fallback to default/first tenant
  const firstTenant = await db.tenant.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return firstTenant?.id ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูลร้านค้า" },
        { status: 404 }
      );
    }

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      include: { storefrontConfig: true },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูลร้านค้า" },
        { status: 404 }
      );
    }

    let config = tenant.storefrontConfig;
    if (!config) {
      // Auto-initialize config record for this tenant
      config = await db.storefrontConfig.create({
        data: {
          tenantId: tenant.id,
          ...DEFAULT_STOREFRONT_CONFIG,
        },
      });
    }

    return NextResponse.json({
      success: true,
      config,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        logoUrl: tenant.logoUrl,
      },
    });
  } catch (error) {
    console.error("GET /api/storefront/config error:", error);
    return NextResponse.json(
      { success: false, error: "ไม่สามารถดึงข้อมูลการตั้งค่าหน้าร้านได้" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = staffTokens(cookieStore)[0];
    if (!token) {
      return NextResponse.json(
        { success: false, error: "กรุณาเข้าสู่ระบบก่อนทำการบันทึกข้อมูล" },
        { status: 401 }
      );
    }

    const session = await db.staffSession.findUnique({
      where: { tokenHash: hashToken(token) },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      return NextResponse.json(
        { success: false, error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง" },
        { status: 401 }
      );
    }

    const tenantId = session.tenantId;
    const body = await req.json();

    const stringifyIfNeeded = (val: unknown) => {
      if (val === undefined) return undefined;
      if (val === null) return null;
      if (typeof val === "object") return JSON.stringify(val);
      return String(val);
    };

    const updateData: Record<string, any> = {};

    if (body.themeColor !== undefined) updateData.themeColor = String(body.themeColor);
    if (body.headline !== undefined) updateData.headline = body.headline ? String(body.headline) : null;
    if (body.subheadline !== undefined) updateData.subheadline = body.subheadline ? String(body.subheadline) : null;
    if (body.badge !== undefined) updateData.badge = body.badge ? String(body.badge) : null;
    if (body.announcementText !== undefined) updateData.announcementText = body.announcementText ? String(body.announcementText) : null;
    if (body.announcementEnabled !== undefined) updateData.announcementEnabled = Boolean(body.announcementEnabled);
    if (body.phone !== undefined) updateData.phone = body.phone ? String(body.phone) : null;
    if (body.lineId !== undefined) updateData.lineId = body.lineId ? String(body.lineId) : null;
    if (body.lineQrUrl !== undefined) updateData.lineQrUrl = body.lineQrUrl ? String(body.lineQrUrl) : null;
    if (body.googleMapsUrl !== undefined) updateData.googleMapsUrl = body.googleMapsUrl ? String(body.googleMapsUrl) : null;

    if (body.showLiveTracking !== undefined) updateData.showLiveTracking = Boolean(body.showLiveTracking);
    if (body.showHardwareScanner !== undefined) updateData.showHardwareScanner = Boolean(body.showHardwareScanner);
    if (body.showServicesBento !== undefined) updateData.showServicesBento = Boolean(body.showServicesBento);
    if (body.showInspectionBench !== undefined) updateData.showInspectionBench = Boolean(body.showInspectionBench);
    if (body.showPriceEstimator !== undefined) updateData.showPriceEstimator = Boolean(body.showPriceEstimator);
    if (body.showBeforeAfterSlider !== undefined) updateData.showBeforeAfterSlider = Boolean(body.showBeforeAfterSlider);
    if (body.showCustomerReviews !== undefined) updateData.showCustomerReviews = Boolean(body.showCustomerReviews);
    if (body.showLocationSection !== undefined) updateData.showLocationSection = Boolean(body.showLocationSection);
    if (body.showFaqSection !== undefined) updateData.showFaqSection = Boolean(body.showFaqSection);
    if (body.showMobileQuickBar !== undefined) updateData.showMobileQuickBar = Boolean(body.showMobileQuickBar);

    if (body.customBeforeAfterCases !== undefined) updateData.customBeforeAfterCases = stringifyIfNeeded(body.customBeforeAfterCases);
    if (body.customPricingRates !== undefined) updateData.customPricingRates = stringifyIfNeeded(body.customPricingRates);
    if (body.customFaqs !== undefined) updateData.customFaqs = stringifyIfNeeded(body.customFaqs);

    const config = await db.storefrontConfig.upsert({
      where: { tenantId },
      create: {
        tenantId,
        ...DEFAULT_STOREFRONT_CONFIG,
        ...updateData,
      },
      update: updateData,
    });

    // Optionally update tenant shop name or logoUrl if provided
    if (body.shopName || body.name || body.logoUrl !== undefined) {
      const tenantUpdate: Record<string, any> = {};
      if (body.shopName || body.name) tenantUpdate.name = String(body.shopName || body.name);
      if (body.logoUrl !== undefined) tenantUpdate.logoUrl = body.logoUrl ? String(body.logoUrl) : null;
      await db.tenant.update({
        where: { id: tenantId },
        data: tenantUpdate,
      });
    }

    const updatedTenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, slug: true, logoUrl: true },
    });

    return NextResponse.json({
      success: true,
      config,
      tenant: updatedTenant,
    });
  } catch (error) {
    console.error("PUT /api/storefront/config error:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการบันทึกการตั้งค่าหน้าร้าน" },
      { status: 500 }
    );
  }
}
