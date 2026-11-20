import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { checkOrigin, hashToken, requireStaffSession, staffTokens } from "@/lib/staff-auth";
import { safeError } from "@/lib/staff-http";
import {
  DEFAULT_STOREFRONT_CONFIG,
  StorefrontThemeColor,
  StorefrontFontFamily,
  HeroLayoutType,
  ALLOWED_FONT_FAMILIES,
  ALLOWED_HERO_LAYOUTS,
  safeParseCustomPages,
} from "@/lib/storefrontTheme";
import { validateJsonPayloadBoundary } from "@/lib/storefrontSecurity";

export const dynamic = "force-dynamic";

const ALLOWED_THEMES: readonly StorefrontThemeColor[] = [
  "emerald",
  "cyan",
  "blue",
  "purple",
  "amber",
  "rose",
];

const SAFE_SLUG_REGEX = /^[a-z0-9_-]{1,100}$/;
const SAFE_URL_REGEX = /^(https?:\/\/|\/uploads\/|data:image\/(png|jpeg|webp);base64,)/i;

function isValidUrl(val: string): boolean {
  if (!val || typeof val !== "string") return false;
  const trimmed = val.trim();
  if (!SAFE_URL_REGEX.test(trimmed)) return false;
  // Disallow javascript: or vbscript: or non-image data: schemes
  if (/^(javascript|vbscript|data:(?!image\/(png|jpeg|webp);base64,)):/i.test(trimmed)) {
    return false;
  }
  return true;
}

async function resolveTenantId(req: NextRequest): Promise<{ tenantId: string | null; slugRequested: boolean }> {
  const rawSlug = req.nextUrl.searchParams.get("shopSlug") || req.nextUrl.searchParams.get("slug");
  const shopSlug = rawSlug?.trim().toLowerCase();

  if (shopSlug !== undefined && shopSlug !== null && shopSlug !== "") {
    if (!SAFE_SLUG_REGEX.test(shopSlug)) {
      return { tenantId: null, slugRequested: true };
    }
    const tenant = await db.tenant.findUnique({
      where: { slug: shopSlug },
      select: { id: true, status: true },
    });
    if (tenant && ["ACTIVE", "TRIAL"].includes(tenant.status)) {
      return { tenantId: tenant.id, slugRequested: true };
    }
    return { tenantId: null, slugRequested: true };
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
      return { tenantId: session.tenantId, slugRequested: false };
    }
  }

  // Fallback to default/first active tenant only when no slug was requested and no staff session exists
  const firstTenant = await db.tenant.findFirst({
    where: { status: { in: ["ACTIVE", "TRIAL"] } },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return { tenantId: firstTenant?.id ?? null, slugRequested: false };
}

export async function GET(req: NextRequest) {
  try {
    const { tenantId, slugRequested } = await resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: slugRequested ? "ไม่พบร้านค้าที่ระบุ" : "ไม่พบข้อมูลร้านค้า" },
        { status: 404 }
      );
    }

    // Explicitly select only non-sensitive tenant fields to prevent leaking staff sessions, tax IDs, etc.
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        storefrontConfig: true,
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูลร้านค้า" },
        { status: 404 }
      );
    }

    let config = tenant.storefrontConfig;
    if (!config) {
      // Auto-initialize config record for this tenant atomically
      config = await db.storefrontConfig.upsert({
        where: { tenantId: tenant.id },
        update: {},
        create: {
          tenantId: tenant.id,
          themeColor: DEFAULT_STOREFRONT_CONFIG.themeColor,
          fontFamily: DEFAULT_STOREFRONT_CONFIG.fontFamily || "anuphan",
          heroLayout: DEFAULT_STOREFRONT_CONFIG.heroLayout || "split",
          headline: DEFAULT_STOREFRONT_CONFIG.headline,
          subheadline: DEFAULT_STOREFRONT_CONFIG.subheadline,
          badge: DEFAULT_STOREFRONT_CONFIG.badge,
          announcementText: DEFAULT_STOREFRONT_CONFIG.announcementText,
          announcementEnabled: DEFAULT_STOREFRONT_CONFIG.announcementEnabled,
          phone: DEFAULT_STOREFRONT_CONFIG.phone,
          lineId: DEFAULT_STOREFRONT_CONFIG.lineId,
          lineQrUrl: DEFAULT_STOREFRONT_CONFIG.lineQrUrl,
          googleMapsUrl: DEFAULT_STOREFRONT_CONFIG.googleMapsUrl,
          showLiveTracking: DEFAULT_STOREFRONT_CONFIG.showLiveTracking,
          showHardwareScanner: DEFAULT_STOREFRONT_CONFIG.showHardwareScanner,
          showServicesBento: DEFAULT_STOREFRONT_CONFIG.showServicesBento,
          showInspectionBench: DEFAULT_STOREFRONT_CONFIG.showInspectionBench,
          showPriceEstimator: DEFAULT_STOREFRONT_CONFIG.showPriceEstimator,
          showBeforeAfterSlider: DEFAULT_STOREFRONT_CONFIG.showBeforeAfterSlider,
          showCustomerReviews: DEFAULT_STOREFRONT_CONFIG.showCustomerReviews,
          showLocationSection: DEFAULT_STOREFRONT_CONFIG.showLocationSection,
          showFaqSection: DEFAULT_STOREFRONT_CONFIG.showFaqSection,
          showMobileQuickBar: DEFAULT_STOREFRONT_CONFIG.showMobileQuickBar,
          sectionsOrder: DEFAULT_STOREFRONT_CONFIG.sectionsOrder,
          customSections: DEFAULT_STOREFRONT_CONFIG.customSections,
          customPages: DEFAULT_STOREFRONT_CONFIG.customPages,
          navigationMenu: DEFAULT_STOREFRONT_CONFIG.navigationMenu,
          footerSocialLinks: DEFAULT_STOREFRONT_CONFIG.footerSocialLinks,
          customBeforeAfterCases: DEFAULT_STOREFRONT_CONFIG.customBeforeAfterCases,
          customPricingRates: DEFAULT_STOREFRONT_CONFIG.customPricingRates,
          customFaqs: DEFAULT_STOREFRONT_CONFIG.customFaqs,
        },
      });
    }

    // Verify whether requester is authenticated staff for this tenant
    const cookieStore = await cookies();
    const token = staffTokens(cookieStore)[0];
    let isAuthorizedStaff = false;
    if (token) {
      const session = await db.staffSession.findUnique({
        where: { tokenHash: hashToken(token) },
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

    // Filter out draft custom pages for public/unauthenticated requests or cross-tenant requests
    let sanitizedCustomPages = config.customPages;
    if (!isAuthorizedStaff && config.customPages) {
      const pages = safeParseCustomPages(config.customPages);
      const publicPages = pages.filter((p) => p.published !== false);
      sanitizedCustomPages = JSON.stringify(publicPages);
    }

    // Return sanitized public storefront config
    const sanitizedConfig = {
      themeColor: config.themeColor,
      fontFamily: config.fontFamily || "anuphan",
      heroLayout: config.heroLayout || "split",
      headline: config.headline,
      subheadline: config.subheadline,
      badge: config.badge,
      announcementText: config.announcementText,
      announcementEnabled: config.announcementEnabled,
      phone: config.phone,
      lineId: config.lineId,
      lineQrUrl: config.lineQrUrl,
      googleMapsUrl: config.googleMapsUrl,
      showLiveTracking: config.showLiveTracking,
      showHardwareScanner: config.showHardwareScanner,
      showServicesBento: config.showServicesBento,
      showInspectionBench: config.showInspectionBench,
      showPriceEstimator: config.showPriceEstimator,
      showBeforeAfterSlider: config.showBeforeAfterSlider,
      showCustomerReviews: config.showCustomerReviews,
      showLocationSection: config.showLocationSection,
      showFaqSection: config.showFaqSection,
      showMobileQuickBar: config.showMobileQuickBar,
      sectionsOrder: config.sectionsOrder,
      customSections: config.customSections,
      customPages: sanitizedCustomPages,
      navigationMenu: config.navigationMenu,
      footerSocialLinks: config.footerSocialLinks,
      customBeforeAfterCases: config.customBeforeAfterCases,
      customPricingRates: config.customPricingRates,
      customFaqs: config.customFaqs,
      updatedAt: config.updatedAt,
    };

    return NextResponse.json({
      success: true,
      config: sanitizedConfig,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        logoUrl: tenant.logoUrl,
      },
    });
  } catch (error) {
    return safeError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    checkOrigin(req);
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 2 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "ขนาดข้อมูลคำขอใหญ่เกินขีดจำกัด (สูงสุด 2MB)" },
        { status: 413 }
      );
    }

    const actor = await requireStaffSession(req);
    if (!["ADMIN", "MANAGER"].includes(actor.role)) {
      return NextResponse.json(
        { success: false, error: "ไม่มีสิทธิ์แก้ไขการตั้งค่าหน้าร้าน (เฉพาะ ADMIN หรือ MANAGER)" },
        { status: 403 }
      );
    }

    const tenantId = actor.tenantId;
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "รูปแบบข้อมูล JSON ไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const stringifyIfNeeded = (val: unknown) => {
      if (val === undefined) return undefined;
      if (val === null) return null;
      if (typeof val === "object") return JSON.stringify(val);
      return String(val);
    };

    const updateData: Record<string, any> = {};

    // 1. Validate themeColor strictly against allowed enums
    if (body.themeColor !== undefined) {
      const theme = String(body.themeColor).trim().toLowerCase();
      if (!ALLOWED_THEMES.includes(theme as StorefrontThemeColor)) {
        return NextResponse.json(
          { success: false, error: `themeColor ไม่ถูกต้อง รองรับเฉพาะ: ${ALLOWED_THEMES.join(", ")}` },
          { status: 400 }
        );
      }
      updateData.themeColor = theme;
    }

    // 1.1 Validate fontFamily strictly against allowed fonts
    if (body.fontFamily !== undefined) {
      const font = String(body.fontFamily).trim().toLowerCase();
      if (!ALLOWED_FONT_FAMILIES.includes(font as StorefrontFontFamily)) {
        return NextResponse.json(
          { success: false, error: `fontFamily ไม่ถูกต้อง รองรับเฉพาะ: ${ALLOWED_FONT_FAMILIES.join(", ")}` },
          { status: 400 }
        );
      }
      updateData.fontFamily = font;
    }

    // 1.2 Validate heroLayout strictly against allowed layouts
    if (body.heroLayout !== undefined) {
      const layout = String(body.heroLayout).trim().toLowerCase();
      if (!ALLOWED_HERO_LAYOUTS.includes(layout as HeroLayoutType)) {
        return NextResponse.json(
          { success: false, error: `heroLayout ไม่ถูกต้อง รองรับเฉพาะ: ${ALLOWED_HERO_LAYOUTS.join(", ")}` },
          { status: 400 }
        );
      }
      updateData.heroLayout = layout;
    }

    // 2. Validate URL fields strictly
    if (body.googleMapsUrl !== undefined) {
      const url = body.googleMapsUrl ? String(body.googleMapsUrl).trim() : null;
      if (url && !isValidUrl(url)) {
        return NextResponse.json(
          { success: false, error: "รูปแบบ googleMapsUrl ไม่ถูกต้อง ต้องเป็น URL ที่ขึ้นต้นด้วย http:// หรือ https://" },
          { status: 400 }
        );
      }
      updateData.googleMapsUrl = url;
    }

    if (body.lineQrUrl !== undefined) {
      const url = body.lineQrUrl ? String(body.lineQrUrl).trim() : null;
      if (url && !isValidUrl(url)) {
        return NextResponse.json(
          { success: false, error: "รูปแบบ lineQrUrl ไม่ถูกต้อง ต้องเป็น URL, /uploads/... หรือ base64 รูปภาพ" },
          { status: 400 }
        );
      }
      updateData.lineQrUrl = url;
    }

    if (body.logoUrl !== undefined) {
      const url = body.logoUrl ? String(body.logoUrl).trim() : null;
      if (url && !isValidUrl(url)) {
        return NextResponse.json(
          { success: false, error: "รูปแบบ logoUrl ไม่ถูกต้อง ต้องเป็น URL, /uploads/... หรือ base64 รูปภาพ" },
          { status: 400 }
        );
      }
    }

    // 3. Sanitize and bound text fields
    if (body.headline !== undefined) updateData.headline = body.headline ? String(body.headline).slice(0, 500) : null;
    if (body.subheadline !== undefined) updateData.subheadline = body.subheadline ? String(body.subheadline).slice(0, 2000) : null;
    if (body.badge !== undefined) updateData.badge = body.badge ? String(body.badge).slice(0, 100) : null;
    if (body.announcementText !== undefined) updateData.announcementText = body.announcementText ? String(body.announcementText).slice(0, 500) : null;
    if (body.announcementEnabled !== undefined) updateData.announcementEnabled = Boolean(body.announcementEnabled);
    if (body.phone !== undefined) updateData.phone = body.phone ? String(body.phone).slice(0, 50) : null;
    if (body.lineId !== undefined) updateData.lineId = body.lineId ? String(body.lineId).slice(0, 100) : null;

    // 4. Section display booleans
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

    // 5. Custom JSON strings (bounded safely at 500KB without naive slicing corruption)
    try {
      if (body.customBeforeAfterCases !== undefined) {
        updateData.customBeforeAfterCases = validateJsonPayloadBoundary(body.customBeforeAfterCases, "customBeforeAfterCases", 200000);
      }
      if (body.customPricingRates !== undefined) {
        updateData.customPricingRates = validateJsonPayloadBoundary(body.customPricingRates, "customPricingRates", 200000);
      }
      if (body.customFaqs !== undefined) {
        updateData.customFaqs = validateJsonPayloadBoundary(body.customFaqs, "customFaqs", 200000);
      }
      if (body.sectionsOrder !== undefined) {
        updateData.sectionsOrder = validateJsonPayloadBoundary(body.sectionsOrder, "sectionsOrder", 100000);
      }
      if (body.customSections !== undefined) {
        updateData.customSections = validateJsonPayloadBoundary(body.customSections, "customSections", 512000);
      }
      if (body.customPages !== undefined) {
        updateData.customPages = validateJsonPayloadBoundary(body.customPages, "customPages", 512000);
      }
      if (body.navigationMenu !== undefined) {
        updateData.navigationMenu = validateJsonPayloadBoundary(body.navigationMenu, "navigationMenu", 100000);
      }
      if (body.footerSocialLinks !== undefined) {
        updateData.footerSocialLinks = validateJsonPayloadBoundary(body.footerSocialLinks, "footerSocialLinks", 50000);
      }
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: err.message || "ขนาดข้อมูลเกินขีดจำกัดความปลอดภัย" },
        { status: 400 }
      );
    }

    // Atomically upsert config for authorized tenant
    const config = await db.storefrontConfig.upsert({
      where: { tenantId },
      create: {
        tenantId,
        themeColor: updateData.themeColor || DEFAULT_STOREFRONT_CONFIG.themeColor,
        fontFamily: updateData.fontFamily || DEFAULT_STOREFRONT_CONFIG.fontFamily || "anuphan",
        heroLayout: updateData.heroLayout || DEFAULT_STOREFRONT_CONFIG.heroLayout || "split",
        headline: updateData.headline ?? DEFAULT_STOREFRONT_CONFIG.headline,
        subheadline: updateData.subheadline ?? DEFAULT_STOREFRONT_CONFIG.subheadline,
        badge: updateData.badge ?? DEFAULT_STOREFRONT_CONFIG.badge,
        announcementText: updateData.announcementText ?? DEFAULT_STOREFRONT_CONFIG.announcementText,
        announcementEnabled: updateData.announcementEnabled ?? DEFAULT_STOREFRONT_CONFIG.announcementEnabled,
        phone: updateData.phone ?? DEFAULT_STOREFRONT_CONFIG.phone,
        lineId: updateData.lineId ?? DEFAULT_STOREFRONT_CONFIG.lineId,
        lineQrUrl: updateData.lineQrUrl ?? DEFAULT_STOREFRONT_CONFIG.lineQrUrl,
        googleMapsUrl: updateData.googleMapsUrl ?? DEFAULT_STOREFRONT_CONFIG.googleMapsUrl,
        showLiveTracking: updateData.showLiveTracking ?? DEFAULT_STOREFRONT_CONFIG.showLiveTracking,
        showHardwareScanner: updateData.showHardwareScanner ?? DEFAULT_STOREFRONT_CONFIG.showHardwareScanner,
        showServicesBento: updateData.showServicesBento ?? DEFAULT_STOREFRONT_CONFIG.showServicesBento,
        showInspectionBench: updateData.showInspectionBench ?? DEFAULT_STOREFRONT_CONFIG.showInspectionBench,
        showPriceEstimator: updateData.showPriceEstimator ?? DEFAULT_STOREFRONT_CONFIG.showPriceEstimator,
        showBeforeAfterSlider: updateData.showBeforeAfterSlider ?? DEFAULT_STOREFRONT_CONFIG.showBeforeAfterSlider,
        showCustomerReviews: updateData.showCustomerReviews ?? DEFAULT_STOREFRONT_CONFIG.showCustomerReviews,
        showLocationSection: updateData.showLocationSection ?? DEFAULT_STOREFRONT_CONFIG.showLocationSection,
        showFaqSection: updateData.showFaqSection ?? DEFAULT_STOREFRONT_CONFIG.showFaqSection,
        showMobileQuickBar: updateData.showMobileQuickBar ?? DEFAULT_STOREFRONT_CONFIG.showMobileQuickBar,
        sectionsOrder: updateData.sectionsOrder ?? DEFAULT_STOREFRONT_CONFIG.sectionsOrder,
        customSections: updateData.customSections ?? DEFAULT_STOREFRONT_CONFIG.customSections,
        customPages: updateData.customPages ?? DEFAULT_STOREFRONT_CONFIG.customPages,
        navigationMenu: updateData.navigationMenu ?? DEFAULT_STOREFRONT_CONFIG.navigationMenu,
        footerSocialLinks: updateData.footerSocialLinks ?? DEFAULT_STOREFRONT_CONFIG.footerSocialLinks,
        customBeforeAfterCases: updateData.customBeforeAfterCases ?? DEFAULT_STOREFRONT_CONFIG.customBeforeAfterCases,
        customPricingRates: updateData.customPricingRates ?? DEFAULT_STOREFRONT_CONFIG.customPricingRates,
        customFaqs: updateData.customFaqs ?? DEFAULT_STOREFRONT_CONFIG.customFaqs,
      },
      update: updateData,
    });

    // Optionally update tenant shop name or logoUrl if provided
    if (body.shopName || body.name || body.logoUrl !== undefined) {
      const tenantUpdate: { name?: string; logoUrl?: string | null } = {};
      if (body.shopName || body.name) tenantUpdate.name = String(body.shopName || body.name).trim().slice(0, 100);
      if (body.logoUrl !== undefined) tenantUpdate.logoUrl = body.logoUrl ? String(body.logoUrl).trim() : null;
      await db.tenant.update({
        where: { id: tenantId },
        data: tenantUpdate,
      });
    }

    const updatedTenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, slug: true, logoUrl: true },
    });

    if (updatedTenant?.slug) {
      try {
        revalidatePath(`/store/${updatedTenant.slug}`);
        revalidatePath(`/store/${updatedTenant.slug}`, "layout");
        revalidatePath(`/store/${updatedTenant.slug}/[pageSlug]`, "page");
      } catch (err) {
        console.warn("revalidatePath error in storefront config PUT:", err);
      }
    }

    return NextResponse.json({
      success: true,
      config,
      tenant: updatedTenant,
    });
  } catch (error) {
    return safeError(error);
  }
}
