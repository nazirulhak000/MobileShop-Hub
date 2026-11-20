import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import {
  Store,
  Sparkles,
  Phone,
  MessageCircle,
  UserRound,
  Navigation,
  FileQuestion,
  ChevronRight,
  ArrowLeft,
  Home,
  ShieldCheck,
  CalendarDays,
  Share2,
  EyeOff,
  Clock,
  Wrench,
  CheckCircle2,
  Layers,
  FolderOpen,
  Tag,
} from "lucide-react";
import { db } from "@/lib/db";
import { staffTokens, hashToken } from "@/lib/staff-auth";
import { AnnouncementBar } from "@/components/landing/AnnouncementBar";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { MobileQuickBar } from "@/components/landing/MobileQuickBar";
import { DynamicBlockRenderer, RichTextBlock } from "@/components/landing/blocks";
import {
  DEFAULT_STOREFRONT_CONFIG,
  StorefrontThemeColor,
  StorefrontFontFamily,
  FONT_FAMILY_CONFIG,
  THEME_PALETTES,
  safeParseCustomPages,
  safeParseNavMenu,
  safeParseSocialLinks,
} from "@/lib/storefrontTheme";
import { resolveTenantBySlug } from "@/lib/storefrontTenant";
import { buildSubpageMetadata } from "@/lib/storefrontMetadata";
import { resolvePageTemplate } from "@/lib/wordpress/templateHierarchy";
import { generateThemeJson, compileThemeJsonToCss } from "@/lib/wordpress/themeJsonEngine";
import {
  generateTaxonomyPills,
  filterCustomPagesByTerm,
  extractTaxonomiesFromCustomPages,
} from "@/lib/wordpress/taxonomyEngine";

// Round 10: ISR edge caching and serverless runtime safety
export const revalidate = 60; // 60s stale-while-revalidate edge CDN cache
export const runtime = "nodejs"; // Prisma DB requires Node.js serverless runtime

/**
 * Checks whether the current request holds a valid staff session matching this tenant.
 * Guarantees strict multi-tenant isolation: staff from Tenant A can never view drafts of Tenant B.
 */
async function isAuthorizedStaffForTenant(tenantId: string): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = staffTokens(cookieStore)[0];
    if (!token) return false;
    const session = await db.staffSession.findUnique({
      where: { tokenHash: hashToken(token) },
      select: { tenantId: true, expiresAt: true, revokedAt: true },
    });
    return Boolean(
      session &&
      !session.revokedAt &&
      session.expiresAt > new Date() &&
      session.tenantId === tenantId
    );
  } catch {
    return false;
  }
}

interface SubpageProps {
  params: Promise<{
    shopSlug: string;
    pageSlug: string;
  }>;
  searchParams?: Promise<{
    category?: string;
    tag?: string;
  }>;
}

export async function generateMetadata({ params }: SubpageProps): Promise<Metadata> {
  const { shopSlug, pageSlug } = await params;
  const tenant = await resolveTenantBySlug(shopSlug);
  const isAuthorizedStaff = tenant ? await isAuthorizedStaffForTenant(tenant.id) : false;
  return buildSubpageMetadata(tenant, shopSlug, pageSlug, isAuthorizedStaff);
}

export default async function TenantCustomSubpage({ params, searchParams }: SubpageProps) {
  const { shopSlug, pageSlug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const activeCategory = (resolvedSearchParams.category || "all").trim();
  const activeTag = (resolvedSearchParams.tag || "").trim();
  const tenant = await resolveTenantBySlug(shopSlug);

  // If store does not exist at all, emit true 404
  if (!tenant) {
    notFound();
  }

  const primaryBranch = tenant.branches[0] || null;
  const shopName = tenant.name;
  const rawConfig = tenant.storefrontConfig;

  // Merge tenant config with safe defaults
  const config = {
    themeColor: (rawConfig?.themeColor as StorefrontThemeColor) || DEFAULT_STOREFRONT_CONFIG.themeColor,
    fontFamily: (rawConfig?.fontFamily as StorefrontFontFamily) || DEFAULT_STOREFRONT_CONFIG.fontFamily || "anuphan",
    badge: rawConfig?.badge ?? DEFAULT_STOREFRONT_CONFIG.badge,
    announcementText: rawConfig?.announcementText ?? DEFAULT_STOREFRONT_CONFIG.announcementText,
    announcementEnabled: rawConfig?.announcementEnabled ?? DEFAULT_STOREFRONT_CONFIG.announcementEnabled,
    phone: rawConfig?.phone || primaryBranch?.phone?.trim() || null,
    lineId: rawConfig?.lineId || null,
    lineQrUrl: rawConfig?.lineQrUrl || null,
    googleMapsUrl: rawConfig?.googleMapsUrl || null,
    showMobileQuickBar: rawConfig?.showMobileQuickBar ?? true,
    showPriceEstimator: rawConfig?.showPriceEstimator ?? true,
    customPages: rawConfig?.customPages,
    navigationMenu: rawConfig?.navigationMenu,
  };

  const address = primaryBranch?.address?.trim() || null;
  const branchName = primaryBranch?.name || shopName;
  const themeColor = config.themeColor;
  const theme = THEME_PALETTES[themeColor] || THEME_PALETTES.emerald;
  const fontConfig = FONT_FAMILY_CONFIG[config.fontFamily] || FONT_FAMILY_CONFIG.anuphan;

  // Safe parse navigation menu and custom pages
  const isAuthorizedStaff = await isAuthorizedStaffForTenant(tenant.id);
  const parsedNavMenu = safeParseNavMenu(config.navigationMenu);
  const customPages = safeParseCustomPages(config.customPages);

  let normalizedPageSlug = "";
  try {
    normalizedPageSlug = decodeURIComponent(pageSlug).trim().toLowerCase();
  } catch {
    notFound();
  }

  const customPage = customPages.find(
    (p) => p.slug.toLowerCase() === normalizedPageSlug && (p.published !== false || isAuthorizedStaff)
  );

  // Dynamic selection color classes based on palette
  const selectionClass =
    themeColor === "cyan"
      ? "selection:bg-cyan-600 selection:text-white"
      : themeColor === "blue"
      ? "selection:bg-blue-600 selection:text-white"
      : themeColor === "purple"
      ? "selection:bg-purple-600 selection:text-white"
      : themeColor === "amber"
      ? "selection:bg-amber-600 selection:text-white"
      : themeColor === "rose"
      ? "selection:bg-rose-600 selection:text-white"
      : "selection:bg-emerald-600 selection:text-white";

  const mobilePadding = config.showMobileQuickBar ? "pb-20 sm:pb-0" : "";

  // If subpage does not exist or is unpublished draft for unauthenticated / cross-tenant visitors, invoke Next.js notFound()
  if (!customPage) {
    notFound();
  }

  const isDraft = customPage.published === false;
  const pageTemplate = resolvePageTemplate(customPage);
  const isBlankCanvas = pageTemplate === "blank-canvas";
  const isBoxedFluid = pageTemplate === "boxed-fluid";
  const isSidebarRight = pageTemplate === "sidebar-right";

  // Round 39: Generate WordPress theme.json design tokens and CSS custom properties
  const wpThemeJson = generateThemeJson(
    { themeColor: config.themeColor, fontFamily: config.fontFamily },
    shopName
  );
  const wpThemeCss = compileThemeJsonToCss(wpThemeJson);

  const tenantInfoPayload = {
    phone: config.phone,
    lineId: config.lineId,
    shopName,
    branchName,
    shopSlug,
  };
  const isLandingLead = pageTemplate === "landing-lead";
  const subpageSections = customPage.sections || [];

  // Round 36: Taxonomy Engine & Category Navigation Bar
  extractTaxonomiesFromCustomPages(customPages, tenant.id);
  const taxonomyPills = generateTaxonomyPills(
    customPages,
    "category",
    activeCategory,
    `/store/${shopSlug}/${pageSlug}`
  );
  const relatedCategoryPages =
    activeCategory && activeCategory !== "all"
      ? filterCustomPagesByTerm(customPages, "category", activeCategory).filter(
          (p) => p.slug.toLowerCase() !== normalizedPageSlug && (p.published !== false || isAuthorizedStaff)
        )
      : [];

  // Blank Canvas Template: Render only AnnouncementBar (optional), page content & custom blocks without Blueprint Hero Banner and without Quick Contact card
  if (isBlankCanvas) {
    return (
      <div
        className={`min-h-screen bg-white text-slate-900 ${selectionClass}`}
        style={{ fontFamily: fontConfig.fontFamily }}
      >
        {/* Dynamic Font Stylesheet */}
        <link
          rel="stylesheet"
          href={`https://fonts.googleapis.com/css2?family=${fontConfig.googleFont}&display=swap`}
        />

        {/* Round 39: WordPress theme.json compiled CSS custom properties */}
        <style
          id="wp-theme-json-presets"
          dangerouslySetInnerHTML={{ __html: wpThemeCss }}
        />

        {/* Draft Notice for Staff Preview */}
        {isDraft && (
          <div className="bg-amber-500 text-slate-950 px-4 py-2.5 text-center text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-md">
            <EyeOff className="w-4 h-4 shrink-0" />
            <span>⚠️ โหมดพรีวิวหน้าฉบับร่าง (Draft Preview): หน้านี้ยังไม่ได้เผยแพร่สู่สาธารณะ เฉพาะทีมงานร้าน {shopName} เท่านั้นที่มองเห็น</span>
          </div>
        )}

        {/* Top Announcement Bar */}
        {config.announcementEnabled && config.announcementText && (
          <AnnouncementBar
            text={config.announcementText}
            enabled={config.announcementEnabled}
            themeColor={themeColor}
          />
        )}

        {/* Page Content & Custom Blocks (Clean Landing Page) */}
        <main id="main-content" className="py-8 sm:py-12 space-y-12">
          {customPage.content && (
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
              <RichTextBlock
                id={`page-content-${customPage.slug}`}
                title={customPage.title}
                subtitle={customPage.subtitle}
                content={customPage.content}
                themeColor={themeColor}
                badge={config.badge}
                shopSlug={shopSlug}
                tenantInfo={tenantInfoPayload}
              />
            </div>
          )}

          {subpageSections.length > 0 && (
            <div className="space-y-12">
              {subpageSections.map((block) => (
                <DynamicBlockRenderer
                  key={`page-block-${block.id}`}
                  block={block}
                  themeColor={themeColor}
                  shopSlug={shopSlug}
                  tenantInfo={tenantInfoPayload}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  // Custom subpage exists - render full subpage layout
  return (
    <div
      className={`min-h-screen bg-slate-50/50 text-slate-900 ${selectionClass} ${mobilePadding}`}
      style={{ fontFamily: fontConfig.fontFamily }}
    >
      {/* 0. Dynamic Font Stylesheet */}
      <link
        rel="stylesheet"
        href={`https://fonts.googleapis.com/css2?family=${fontConfig.googleFont}&display=swap`}
      />

      {/* Round 39: WordPress theme.json compiled CSS custom properties */}
      <style
        id="wp-theme-json-presets"
        dangerouslySetInnerHTML={{ __html: wpThemeCss }}
      />

      {/* 1. Top Announcement Bar */}
      {config.announcementEnabled && config.announcementText && (
        <AnnouncementBar
          text={config.announcementText}
          enabled={config.announcementEnabled}
          themeColor={themeColor}
        />
      )}

      {/* Draft Notice for Staff Preview */}
      {isDraft && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2.5 text-center text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-md">
          <EyeOff className="w-4 h-4 shrink-0" />
          <span>⚠️ โหมดพรีวิวหน้าฉบับร่าง (Draft Preview): หน้านี้ยังไม่ได้เผยแพร่สู่สาธารณะ เฉพาะทีมงานร้าน {shopName} เท่านั้นที่มองเห็น</span>
        </div>
      )}

      {/* 2. Sticky Glassmorphism Header with Dynamic Navigation */}
      <LandingNavbar
        shopName={shopName}
        shopSlug={shopSlug}
        phone={config.phone}
        lineId={config.lineId}
        navigationMenu={parsedNavMenu}
        isSubpage={true}
        themeColor={themeColor}
        logoUrl={tenant.logoUrl}
      />

      {/* 3. Subpage Hero Banner */}
      <header className="relative bg-slate-950 text-white pt-10 pb-14 sm:pt-14 sm:pb-20 overflow-hidden border-b border-slate-800">
        {/* Blueprint grid overlay */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, ${theme.hex}66 1px, transparent 0)`,
            backgroundSize: "28px 28px",
          }}
        />
        {/* Glow orb */}
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none"
          style={{ backgroundColor: `${theme.hex}18` }}
        />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 text-center">
          {/* Breadcrumb Navigation */}
          <nav className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900/80 px-4 py-1.5 rounded-full border border-slate-800 shadow-xs">
            <Link
              href={`/store/${shopSlug}`}
              className={`hover:text-white transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 ${theme.accentRing} rounded`}
            >
              <Home className="h-3 w-3" />
              <span>{shopName}</span>
            </Link>
            <ChevronRight className="h-3 w-3 text-slate-600" />
            <span className={`${theme.accentText} font-semibold truncate max-w-[200px]`}>
              {customPage.title}
            </span>
          </nav>

          {/* Badge Pill */}
          <div>
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${theme.badge.bg} border ${theme.badge.border} ${theme.badge.text} text-xs font-medium shadow-xs`}>
              <ShieldCheck className={`h-3.5 w-3.5 ${theme.iconColor}`} />
              <span>{config.badge || `ศูนย์บริการมาตรฐาน • ${shopName}`}</span>
            </div>
          </div>

          {/* Categories Pill List (Round 29) */}
          {customPage.categories && customPage.categories.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
              {customPage.categories.map((cat) => (
                <span
                  key={cat}
                  className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-900/90 text-slate-300 border border-slate-700/80"
                >
                  📁 {cat}
                </span>
              ))}
            </div>
          )}

          {/* Page Hero Title */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-[1.2]">
            {customPage.title}
          </h1>

          {/* Subtitle */}
          {customPage.subtitle && (
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
              {customPage.subtitle}
            </p>
          )}

          {/* Landing Lead Hero Callouts (Round 27) */}
          {isLandingLead && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-emerald-500/40 text-xs text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> ตรวจเช็คฟรี 10 รายการ
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-amber-500/40 text-xs text-amber-400 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" /> รับประกันงานซ่อมสูงสุด 1 ปี
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-cyan-500/40 text-xs text-cyan-400 font-medium">
                  <Wrench className="w-3.5 h-3.5" /> อะไหล่แท้มาตรฐานแล็บ
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {config.phone && (
                  <a
                    href={`tel:${config.phone.replace(/[^0-9+]/g, "")}`}
                    className="min-h-[44px] px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm inline-flex items-center gap-2 transition-transform hover:scale-105 shadow-lg shadow-emerald-500/20"
                  >
                    <Phone className="h-4 w-4" />
                    <span>โทรปรึกษาช่างทันที</span>
                  </a>
                )}
                {config.lineId && (
                  <a
                    href={`https://line.me/R/ti/p/${encodeURIComponent(config.lineId.trim().startsWith("@") ? config.lineId.trim() : `@${config.lineId.trim()}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="min-h-[44px] px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm inline-flex items-center gap-2 border border-slate-700 transition-colors"
                  >
                    <MessageCircle className="h-4 w-4 text-emerald-400" />
                    <span>ทัก LINE ({config.lineId})</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Quick Return Link */}
          <div className="pt-2">
            <Link
              href={`/store/${shopSlug}`}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white font-medium transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>กลับสู่หน้าแรกของร้าน</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 3.5. Taxonomy Category Filter Bar (Round 36) */}
      {taxonomyPills.length > 1 && (
        <section
          aria-label="หมวดหมู่เนื้อหา"
          className="bg-white border-b border-slate-200/90 shadow-2xs sticky top-16 z-30 backdrop-blur-md bg-white/95"
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-xs font-bold text-slate-500 shrink-0 flex items-center gap-1.5 mr-1">
                <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                <span>หมวดหมู่:</span>
              </span>
              {taxonomyPills.map((pill) => {
                const isActive = pill.isActive;
                return (
                  <Link
                    key={pill.slug}
                    href={pill.href}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 min-h-[36px] ${
                      isActive
                        ? `${theme.activePill || "bg-emerald-600 text-white shadow-xs"}`
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    <span>{pill.name}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono leading-none ${
                        isActive
                          ? "bg-white/25 text-white"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {pill.count}
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* Related subpages under active category */}
            {activeCategory !== "all" && relatedCategoryPages.length > 0 && (
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs animate-fade-in">
                <span className="text-slate-400 font-medium shrink-0 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-slate-400" />
                  หน้าอื่นๆ ในหมวดหมู่นี้:
                </span>
                {relatedCategoryPages.map((rp) => (
                  <Link
                    key={rp.slug}
                    href={`/store/${shopSlug}/${rp.slug}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 transition-colors font-medium"
                  >
                    <span>📄 {rp.title}</span>
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 4. Subpage Body Content & Modular Blocks (Round 27 Template Engine) */}
      <main id="main-content" className="py-12 sm:py-16 space-y-12">
        {isBoxedFluid ? (
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-12 border border-slate-200/90 shadow-xl space-y-8">
              {customPage.content && (
                <RichTextBlock
                  id={`page-content-${customPage.slug}`}
                  title={customPage.title}
                  subtitle={customPage.subtitle}
                  content={customPage.content}
                  themeColor={themeColor}
                  badge={config.badge}
                  shopSlug={shopSlug}
                  tenantInfo={tenantInfoPayload}
                />
              )}
              {subpageSections.length > 0 && (
                <div className="space-y-12 pt-4">
                  {subpageSections.map((block) => (
                    <DynamicBlockRenderer
                      key={`page-block-${block.id}`}
                      block={block}
                      themeColor={themeColor}
                      shopSlug={shopSlug}
                      tenantInfo={tenantInfoPayload}
                    />
                  ))}
                </div>
              )}
              {customPage.tags && customPage.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-6 border-t border-slate-100">
                  <span className="text-xs text-slate-400 font-medium">แท็ก:</span>
                  {customPage.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-md text-xs font-mono bg-slate-100 text-slate-700"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : isSidebarRight ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Content Column (70%) */}
              <div className="lg:col-span-8 space-y-10">
                {customPage.content && (
                  <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm">
                    <RichTextBlock
                      id={`page-content-${customPage.slug}`}
                      title={customPage.title}
                      subtitle={customPage.subtitle}
                      content={customPage.content}
                      themeColor={themeColor}
                      badge={config.badge}
                      shopSlug={shopSlug}
                      tenantInfo={tenantInfoPayload}
                    />
                  </div>
                )}
                {subpageSections.length > 0 && (
                  <div className="space-y-10">
                    {subpageSections.map((block) => (
                      <DynamicBlockRenderer
                        key={`page-block-${block.id}`}
                        block={block}
                        themeColor={themeColor}
                        shopSlug={shopSlug}
                        tenantInfo={tenantInfoPayload}
                      />
                    ))}
                  </div>
                )}
                {customPage.tags && customPage.tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-4">
                    <span className="text-xs text-slate-400 font-medium">แท็ก:</span>
                    {customPage.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-md text-xs font-mono bg-slate-100 text-slate-700"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Sticky Sidebar (30%) */}
              <aside className="lg:col-span-4 sticky top-24 space-y-6">
                <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-5">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme.badge.bg} ${theme.iconColor}`}>
                      <Store className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{branchName}</h3>
                      <p className="text-xs text-slate-500">{config.badge || "ศูนย์บริการมาตรฐาน"}</p>
                    </div>
                  </div>
                  {address && (
                    <p className="text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                      📍 {address}
                    </p>
                  )}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    {config.phone && (
                      <a
                        href={`tel:${config.phone.replace(/[^0-9+]/g, "")}`}
                        className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                      >
                        <Phone className="h-3.5 w-3.5 text-emerald-400" />
                        <span>โทร {config.phone}</span>
                      </a>
                    )}
                    {config.lineId && (
                      <a
                        href={`https://line.me/R/ti/p/${encodeURIComponent(config.lineId.trim().startsWith("@") ? config.lineId.trim() : `@${config.lineId.trim()}`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        <span>LINE: {config.lineId}</span>
                      </a>
                    )}
                    <Link
                      href={shopSlug ? `/s/${shopSlug}` : "/customer"}
                      className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      <UserRound className="h-3.5 w-3.5 text-teal-700" />
                      <span>จองคิว / ตรวจสอบงานซ่อม</span>
                    </Link>
                    {config.googleMapsUrl && (
                      <a
                        href={config.googleMapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                      >
                        <Navigation className={`h-3.5 w-3.5 ${theme.lightAccentText}`} />
                        <span>เปิด Google Maps นำทาง</span>
                      </a>
                    )}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        ) : (
          <>
            {/* Rich Text Main Content (if page has narrative text) */}
            {customPage.content && (
              <div className="max-w-4xl mx-auto px-4 sm:px-6">
                <RichTextBlock
                  id={`page-content-${customPage.slug}`}
                  title={customPage.title}
                  subtitle={customPage.subtitle}
                  content={customPage.content}
                  themeColor={themeColor}
                  badge={config.badge}
                  shopSlug={shopSlug}
                  tenantInfo={tenantInfoPayload}
                />
                {customPage.tags && customPage.tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-4">
                    <span className="text-xs text-slate-400 font-medium">แท็ก:</span>
                    {customPage.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-md text-xs font-mono bg-slate-100 text-slate-700"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Custom Modular Blocks attached to this page */}
            {subpageSections.length > 0 && (
              <div className="space-y-12">
                {subpageSections.map((block) => (
                  <DynamicBlockRenderer
                    key={`page-block-${block.id}`}
                    block={block}
                    themeColor={themeColor}
                    shopSlug={shopSlug}
                    tenantInfo={tenantInfoPayload}
                  />
                ))}
              </div>
            )}

            {/* Quick Contact & Action Card for this Subpage */}
            <section className="max-w-4xl mx-auto px-4 sm:px-6">
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6 text-center">
                <div className="space-y-2">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                    ต้องการปรึกษาทีมช่างหรือสอบถามข้อมูลเพิ่มเติม?
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
                    ศูนย์บริการ {branchName} พร้อมให้คำแนะนำ ตรวจเช็ควิเคราะห์อาการเครื่องฟรี ไม่มีค่าใช้จ่าย
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  {config.phone && (
                    <a
                      href={`tel:${config.phone.replace(/[^0-9+]/g, "")}`}
                      className="min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors shadow-xs"
                    >
                      <Phone className="h-4 w-4 text-emerald-400" />
                      <span>โทร {config.phone}</span>
                    </a>
                  )}

                  {config.lineId && (
                    <a
                      href={`https://line.me/R/ti/p/${encodeURIComponent(config.lineId.trim().startsWith("@") ? config.lineId.trim() : `@${config.lineId.trim()}`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors shadow-xs"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>ติดต่อทาง LINE ({config.lineId})</span>
                    </a>
                  )}

                  <Link
                    href={shopSlug ? `/s/${shopSlug}` : "/customer"}
                    className="min-h-[44px] px-5 py-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors"
                  >
                    <UserRound className="h-4 w-4 text-teal-700" />
                    <span>พอร์ทัลลูกค้า / จองคิว</span>
                  </Link>

                  {config.googleMapsUrl && (
                    <a
                      href={config.googleMapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="min-h-[44px] px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors"
                    >
                      <Navigation className={`h-4 w-4 ${theme.lightAccentText}`} />
                      <span>แผนที่ร้าน</span>
                    </a>
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* 5. Footer */}
      <LandingFooter
        shopName={shopName}
        shopSlug={shopSlug}
        address={address}
        phone={config.phone}
        isSubpage={true}
        themeColor={themeColor}
        customPages={customPages}
        footerSocialLinks={safeParseSocialLinks(rawConfig?.footerSocialLinks)}
      />

      {/* 6. Mobile Sticky Action Bar */}
      {config.showMobileQuickBar && (
        <MobileQuickBar
          shopSlug={shopSlug}
          phone={config.phone}
          lineId={config.lineId}
          showEstimate={config.showPriceEstimator}
          themeColor={themeColor}
        />
      )}
    </div>
  );
}
