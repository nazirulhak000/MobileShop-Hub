import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Store, Sparkles, Phone, MessageCircle, UserRound, Navigation } from "lucide-react";
import { AnnouncementBar } from "@/components/landing/AnnouncementBar";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { LandingHero } from "@/components/landing/LandingHero";
import { ServicesBento } from "@/components/landing/ServicesBento";
import { LiveTrackingShowcase } from "@/components/landing/LiveTrackingShowcase";
import { InspectionStandard } from "@/components/landing/InspectionStandard";
import { PriceEstimator } from "@/components/landing/PriceEstimator";
import { CustomerReviews, BeforeAfterCase } from "@/components/landing/CustomerReviews";
import { ShopLocation } from "@/components/landing/ShopLocation";
import { LandingFaq } from "@/components/landing/LandingFaq";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { MobileQuickBar } from "@/components/landing/MobileQuickBar";
import { DynamicBlockRenderer } from "@/components/landing/blocks";
import {
  DEFAULT_STOREFRONT_CONFIG,
  StorefrontThemeColor,
  StorefrontFontFamily,
  HeroLayoutType,
  FONT_FAMILY_CONFIG,
  THEME_PALETTES,
  safeParseBeforeAfterCases,
  safeParsePricingRates,
  safeParseFaqs,
  safeParseReviews,
  safeParseSectionsOrder,
  safeParseCustomSections,
  safeParseNavMenu,
  safeParseCustomPages,
  safeParseSocialLinks,
} from "@/lib/storefrontTheme";
import { resolveTenantBySlug } from "@/lib/storefrontTenant";
import { buildStoreMetadata } from "@/lib/storefrontMetadata";
import { generateThemeJson, compileThemeJsonToCss } from "@/lib/wordpress/themeJsonEngine";

// Round 10: ISR edge caching and serverless runtime safety
export const revalidate = 60; // 60s stale-while-revalidate edge CDN cache
export const runtime = "nodejs"; // Prisma DB requires Node.js serverless runtime

interface StorePageProps {
  params: Promise<{
    shopSlug: string;
  }>;
}

export async function generateMetadata({ params }: StorePageProps): Promise<Metadata> {
  const { shopSlug } = await params;
  const tenant = await resolveTenantBySlug(shopSlug);
  return buildStoreMetadata(tenant, shopSlug);
}

export default async function TenantStorePage({ params }: StorePageProps) {
  const { shopSlug } = await params;
  const tenant = await resolveTenantBySlug(shopSlug);

  // If store doesn't exist, render a clean Storefront Not Found screen
  if (!tenant) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="max-w-md w-full bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="h-16 w-16 bg-slate-100 text-slate-700 rounded-2xl flex items-center justify-center mx-auto">
            <Store className="h-8 w-8 text-slate-500" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Error 404 • Store Not Found
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              ไม่พบร้านค้า &quot;{shopSlug}&quot; ในระบบ
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              ร้านค้านี้อาจยังไม่ได้เปิดให้บริการ หรือท่านอาจพิมพ์รหัสร้านค้า (Slug) ไม่ถูกต้อง
            </p>
          </div>

          <div className="pt-2 space-y-3">
            <Link
              href="/register"
              className="w-full min-h-[44px] bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs"
            >
              <Sparkles className="h-4 w-4" />
              <span>เปิดร้านค้าของคุณเอง (ทดลองฟรี 14 วัน)</span>
            </Link>

            <Link
              href="/"
              className="w-full min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <span>กลับสู่หน้าหลัก FixMe</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const primaryBranch = tenant.branches[0] || null;
  const shopName = tenant.name;
  const rawConfig = tenant.storefrontConfig;

  // Merge tenant config with safe defaults
  const config = {
    themeColor: (rawConfig?.themeColor as StorefrontThemeColor) || DEFAULT_STOREFRONT_CONFIG.themeColor,
    fontFamily: (rawConfig?.fontFamily as StorefrontFontFamily) || DEFAULT_STOREFRONT_CONFIG.fontFamily || "anuphan",
    heroLayout: (rawConfig?.heroLayout as HeroLayoutType) || DEFAULT_STOREFRONT_CONFIG.heroLayout || "split",
    headline: rawConfig?.headline ?? DEFAULT_STOREFRONT_CONFIG.headline,
    subheadline: rawConfig?.subheadline ?? DEFAULT_STOREFRONT_CONFIG.subheadline,
    badge: rawConfig?.badge ?? DEFAULT_STOREFRONT_CONFIG.badge,
    announcementText: rawConfig?.announcementText ?? DEFAULT_STOREFRONT_CONFIG.announcementText,
    announcementEnabled: rawConfig?.announcementEnabled ?? DEFAULT_STOREFRONT_CONFIG.announcementEnabled,
    phone: rawConfig?.phone || primaryBranch?.phone?.trim() || null,
    lineId: rawConfig?.lineId || null,
    lineQrUrl: rawConfig?.lineQrUrl || null,
    googleMapsUrl: rawConfig?.googleMapsUrl || null,
    showLiveTracking: rawConfig?.showLiveTracking ?? true,
    showHardwareScanner: rawConfig?.showHardwareScanner ?? true,
    showServicesBento: rawConfig?.showServicesBento ?? true,
    showInspectionBench: rawConfig?.showInspectionBench ?? true,
    showPriceEstimator: rawConfig?.showPriceEstimator ?? true,
    showBeforeAfterSlider: rawConfig?.showBeforeAfterSlider ?? true,
    showCustomerReviews: rawConfig?.showCustomerReviews ?? true,
    showLocationSection: rawConfig?.showLocationSection ?? true,
    showFaqSection: rawConfig?.showFaqSection ?? true,
    showMobileQuickBar: rawConfig?.showMobileQuickBar ?? true,
    sectionsOrder: rawConfig?.sectionsOrder,
    customSections: rawConfig?.customSections,
    customPages: rawConfig?.customPages,
    navigationMenu: rawConfig?.navigationMenu,
    footerSocialLinks: rawConfig?.footerSocialLinks,
    customBeforeAfterCases: rawConfig?.customBeforeAfterCases,
    customPricingRates: rawConfig?.customPricingRates,
    customFaqs: rawConfig?.customFaqs,
  };

  const address = primaryBranch?.address?.trim() || null;
  const branchName = primaryBranch?.name || shopName;
  const themeColor = config.themeColor;
  const theme = THEME_PALETTES[themeColor] || THEME_PALETTES.emerald;

  // Resolve dynamic font configuration
  const fontConfig = FONT_FAMILY_CONFIG[config.fontFamily] || FONT_FAMILY_CONFIG.anuphan;

  // Round 39: Generate WordPress theme.json design tokens and CSS custom properties
  const wpThemeJson = generateThemeJson(
    { themeColor: config.themeColor, fontFamily: config.fontFamily },
    shopName
  );
  const wpThemeCss = compileThemeJsonToCss(wpThemeJson);

  // Safe-parse custom configurations so corrupted data in DB never crashes storefront
  const parsedCases = (safeParseBeforeAfterCases(config.customBeforeAfterCases) as BeforeAfterCase[]) || undefined;
  const parsedPricingRates = safeParsePricingRates(config.customPricingRates) || undefined;
  const parsedFaqs = safeParseFaqs(config.customFaqs) || undefined;
  const parsedReviews = safeParseReviews(
    (rawConfig as any)?.customerReviews ||
    (rawConfig?.footerSocialLinks ? (() => {
      try {
        const parsed = JSON.parse(rawConfig.footerSocialLinks);
        return parsed.customerReviews;
      } catch { return null; }
    })() : null)
  ) || undefined;
  const parsedSectionsOrder = safeParseSectionsOrder(config.sectionsOrder);
  const parsedCustomSections = safeParseCustomSections(config.customSections);
  const parsedNavMenu = safeParseNavMenu(config.navigationMenu);

  // Map custom sections by ID
  const customSectionsMap = new Map(parsedCustomSections.map((block) => [block.id, block]));

  // Calculate hidden menu anchors for navigation bar and footer
  const hiddenSections: string[] = [];
  if (!config.showServicesBento) hiddenSections.push("#services");
  if (!config.showLiveTracking) hiddenSections.push("#track-search");
  if (!config.showInspectionBench) hiddenSections.push("#inspection");
  if (!config.showPriceEstimator) hiddenSections.push("#estimate");
  if (!config.showBeforeAfterSlider && !config.showCustomerReviews) hiddenSections.push("#reviews");
  if (!config.showLocationSection) hiddenSections.push("#location");
  if (!config.showFaqSection) hiddenSections.push("#faq");

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

  const hasAnyOptionalSection = Boolean(
    config.showServicesBento ||
    config.showLiveTracking ||
    config.showInspectionBench ||
    config.showPriceEstimator ||
    config.showBeforeAfterSlider ||
    config.showCustomerReviews ||
    config.showLocationSection ||
    config.showFaqSection ||
    parsedCustomSections.some((b) => b.enabled !== false && b.visible !== false)
  );

  const mobilePadding = config.showMobileQuickBar ? "pb-20 sm:pb-0" : "";

  // Set to track rendered sections and prevent duplicate render
  const renderedSectionIds = new Set<string>();

  // Modular Section Item Renderer according to dynamic sectionsOrder
  const renderSectionItem = (sectionId: string) => {
    const normalizedId = sectionId.toLowerCase().trim();
    if (renderedSectionIds.has(normalizedId)) return null;
    renderedSectionIds.add(normalizedId);

    switch (normalizedId) {
      case "hero":
        return (
          <LandingHero
            key="section-hero"
            shopName={shopName}
            shopSlug={shopSlug}
            headline={config.headline}
            subheadline={config.subheadline}
            badge={config.badge}
            logoUrl={tenant.logoUrl || (shopSlug === "fixme" ? "/images/fixme/logo.jpg" : null)}
            themeColor={themeColor}
            showScanner={config.showHardwareScanner}
            showLiveTracking={config.showLiveTracking}
            heroLayout={config.heroLayout}
          />
        );

      case "services":
      case "bento":
        if (!config.showServicesBento) return null;
        return (
          <ServicesBento
            key="section-services"
            lineId={config.lineId}
            showEstimate={config.showPriceEstimator}
            showLiveTracking={config.showLiveTracking}
            showLocation={config.showLocationSection}
            themeColor={themeColor}
          />
        );

      case "tracking":
        if (!config.showLiveTracking) return null;
        return <LiveTrackingShowcase key="section-tracking" themeColor={themeColor} />;

      case "inspection":
      case "bench":
        if (!config.showInspectionBench) return null;
        return (
          <InspectionStandard
            key="section-inspection"
            showEstimate={config.showPriceEstimator}
            showBench={config.showInspectionBench}
            themeColor={themeColor}
          />
        );

      case "estimator":
        if (!config.showPriceEstimator) return null;
        return (
          <PriceEstimator
            key="section-estimator"
            phone={config.phone}
            lineId={config.lineId}
            shopSlug={shopSlug}
            themeColor={themeColor}
            customRates={parsedPricingRates}
          />
        );

      case "reviews":
      case "slider":
        if (!config.showBeforeAfterSlider && !config.showCustomerReviews) return null;
        return (
          <CustomerReviews
            key="section-reviews"
            showSlider={config.showBeforeAfterSlider}
            showReviews={config.showCustomerReviews}
            customCases={parsedCases}
            customReviews={parsedReviews}
            themeColor={themeColor}
          />
        );

      case "location":
        if (!config.showLocationSection) return null;
        return (
          <ShopLocation
            key="section-location"
            shopName={shopName}
            branchName={branchName}
            shopSlug={shopSlug}
            address={address}
            phone={config.phone}
            lineId={config.lineId}
            googleMapsUrl={config.googleMapsUrl}
            storefrontImageUrl={tenant.slug === "fixme" ? "/images/fixme/storefront.jpg" : undefined}
            themeColor={themeColor}
          />
        );

      case "faq":
        if (!config.showFaqSection) return null;
        return (
          <LandingFaq
            key="section-faq"
            lineId={config.lineId}
            themeColor={themeColor}
            customFaqs={parsedFaqs}
          />
        );

      default: {
        // Check if sectionId refers to a custom section block by ID
        const customBlock = customSectionsMap.get(sectionId);
        if (customBlock && customBlock.enabled !== false && customBlock.visible !== false) {
          return (
            <DynamicBlockRenderer
              key={`custom-block-${customBlock.id}`}
              block={customBlock}
              themeColor={themeColor}
              shopSlug={shopSlug}
              tenantInfo={{
                phone: config.phone,
                lineId: config.lineId,
                shopName,
                branchName,
                shopSlug,
              }}
            />
          );
        }
        return null;
      }
    }
  };

  // Find any remaining custom blocks in customSections not explicitly listed in sectionsOrder
  const remainingCustomBlocks = parsedCustomSections.filter(
    (b) => !renderedSectionIds.has(b.id.toLowerCase().trim()) && b.enabled !== false && b.visible !== false
  );

  return (
    <div
      className={`min-h-screen bg-white text-slate-900 ${selectionClass} ${mobilePadding}`}
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

      {/* 2. Sticky Glassmorphism Header with Dynamic Navigation */}
      <LandingNavbar
        shopName={shopName}
        shopSlug={shopSlug}
        phone={config.phone}
        lineId={config.lineId}
        hiddenSections={hiddenSections}
        navigationMenu={parsedNavMenu}
        isSubpage={false}
        themeColor={themeColor}
        logoUrl={tenant.logoUrl || (shopSlug === "fixme" ? "/images/fixme/logo.jpg" : null)}
      />

      <main id="main-content">
        {/* 3. Modular Sections Ordered Dynamically */}
        {parsedSectionsOrder.map((sectionId) => renderSectionItem(sectionId))}

        {/* 4. Any remaining custom blocks created by the shop owner */}
        {remainingCustomBlocks.map((block) => (
          <DynamicBlockRenderer
            key={`remaining-block-${block.id}`}
            block={block}
            themeColor={themeColor}
            shopSlug={shopSlug}
            tenantInfo={{
              phone: config.phone,
              lineId: config.lineId,
              shopName,
              branchName,
              shopSlug,
            }}
          />
        ))}

        {/* Edge Case Fallback: When shop turns off ALL optional sections, render a clean contact & overview card so the page remains informative and functional without awkward white spaces */}
        {!hasAnyOptionalSection && (
          <section className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
              <div className="space-y-3">
                <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full ${theme.lightBg} ${theme.lightText} border ${theme.lightBorder} text-xs font-semibold shadow-2xs`}>
                  <Store className="h-4 w-4" />
                  <span>ข้อมูลติดต่อและที่ตั้งศูนย์บริการ</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  {branchName}
                </h2>
                <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
                  {address || "ศูนย์บริการเปิดให้บริการตามปกติ ติดต่อสอบถามหรือนัดหมายเข้ารับบริการได้ทันที"}
                </p>
              </div>

              {/* Quick Contact & Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                {config.phone && (
                  <a
                    href={`tel:${config.phone.replace(/[^0-9+]/g, "")}`}
                    className="min-h-[44px] px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors shadow-xs"
                  >
                    <Phone className={`h-4 w-4 ${theme.accentText}`} />
                    <span>โทร {config.phone}</span>
                  </a>
                )}
                {config.lineId && (
                  <a
                    href={`https://line.me/R/ti/p/${encodeURIComponent(config.lineId.trim().startsWith("@") ? config.lineId.trim() : `@${config.lineId.trim()}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className={`min-h-[44px] px-6 py-2.5 rounded-xl ${theme.navCta} text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors shadow-xs`}
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>ติดต่อทาง LINE ({config.lineId})</span>
                  </a>
                )}
                <Link
                  href={shopSlug ? `/s/${shopSlug}` : "/customer"}
                  className="min-h-[44px] px-6 py-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors"
                >
                  <UserRound className="h-4 w-4 text-teal-700" />
                  <span>พอร์ทัลลูกค้า / จองคิว</span>
                </Link>
                {config.googleMapsUrl && (
                  <a
                    href={config.googleMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="min-h-[44px] px-6 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors"
                  >
                    <Navigation className={`h-4 w-4 ${theme.lightAccentText}`} />
                    <span>แผนที่ Google Maps</span>
                  </a>
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* 5. Footer */}
      <LandingFooter
        shopName={shopName}
        shopSlug={shopSlug}
        address={address}
        phone={config.phone}
        logoUrl={tenant.logoUrl || (shopSlug === "fixme" ? "/images/fixme/logo.jpg" : null)}
        hiddenSections={hiddenSections}
        themeColor={themeColor}
        customPages={safeParseCustomPages(config.customPages)}
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
