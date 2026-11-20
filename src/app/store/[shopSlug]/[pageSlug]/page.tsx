import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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
} from "lucide-react";
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
} from "@/lib/storefrontTheme";
import { resolveTenantBySlug } from "@/lib/storefrontTenant";

interface SubpageProps {
  params: Promise<{
    shopSlug: string;
    pageSlug: string;
  }>;
}

export async function generateMetadata({ params }: SubpageProps): Promise<Metadata> {
  const { shopSlug, pageSlug } = await params;
  const tenant = await resolveTenantBySlug(shopSlug);

  if (!tenant) {
    return {
      title: "MobileShop-Hub | ไม่พบร้านค้า",
    };
  }

  const normalizedPageSlug = decodeURIComponent(pageSlug).trim().toLowerCase();
  const customPages = safeParseCustomPages(tenant.storefrontConfig?.customPages);
  const page = customPages.find(
    (p) => p.slug.toLowerCase() === normalizedPageSlug && p.published !== false
  );

  if (!page) {
    return {
      title: `ไม่พบหน้า | ${tenant.name}`,
      description: `ไม่พบหน้าที่คุณต้องการในระบบร้านค้า ${tenant.name}`,
    };
  }

  const title = `${page.title} | ${tenant.name}`;
  const description =
    page.metaDescription ||
    page.subtitle ||
    (page.content ? page.content.slice(0, 160) : "") ||
    tenant.storefrontConfig?.subheadline ||
    `${page.title} ศูนย์บริการ ${tenant.name}`;

  return {
    title,
    description,
  };
}

export default async function TenantCustomSubpage({ params }: SubpageProps) {
  const { shopSlug, pageSlug } = await params;
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
  const parsedNavMenu = safeParseNavMenu(config.navigationMenu);
  const customPages = safeParseCustomPages(config.customPages);

  const normalizedPageSlug = decodeURIComponent(pageSlug).trim().toLowerCase();
  const customPage = customPages.find(
    (p) => p.slug.toLowerCase() === normalizedPageSlug && p.published !== false
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

  // If subpage does not exist or is unpublished, invoke Next.js notFound() to emit true HTTP 404
  if (!customPage) {
    notFound();
  }

  const isBlankCanvas = customPage.template === "blank-canvas";
  const subpageSections = customPage.sections || [];

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
                  tenantInfo={{
                    phone: config.phone,
                    lineId: config.lineId,
                    shopName,
                    branchName,
                  }}
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

      {/* 1. Top Announcement Bar */}
      {config.announcementEnabled && config.announcementText && (
        <AnnouncementBar
          text={config.announcementText}
          enabled={config.announcementEnabled}
          themeColor={themeColor}
        />
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

      {/* 4. Subpage Body Content & Modular Blocks */}
      <main id="main-content" className="py-12 sm:py-16 space-y-12">
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
            />
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
                tenantInfo={{
                  phone: config.phone,
                  lineId: config.lineId,
                  shopName,
                  branchName,
                }}
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
      </main>

      {/* 5. Footer */}
      <LandingFooter
        shopName={shopName}
        shopSlug={shopSlug}
        address={address}
        phone={config.phone}
        isSubpage={true}
        themeColor={themeColor}
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
