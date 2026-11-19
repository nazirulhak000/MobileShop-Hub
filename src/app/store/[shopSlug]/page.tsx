import React from "react";
import { db as prisma } from "@/lib/db";
import type { Metadata } from "next";
import Link from "next/link";
import { Store, Sparkles } from "lucide-react";
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
import {
  DEFAULT_STOREFRONT_CONFIG,
  StorefrontThemeColor,
  THEME_PALETTES,
} from "@/lib/storefrontTheme";

interface StorePageProps {
  params: Promise<{
    shopSlug: string;
  }>;
}

export async function generateMetadata({ params }: StorePageProps): Promise<Metadata> {
  const { shopSlug } = await params;
  const tenant = await prisma.tenant.findFirst({
    where: { slug: shopSlug, status: { in: ["ACTIVE", "TRIAL"] } },
    include: { storefrontConfig: true },
  });

  const customTitle = tenant?.storefrontConfig?.headline;
  const title = tenant
    ? `${tenant.name} | ${customTitle || "ศูนย์บริการซ่อมมือถือด่วน เช็คสถานะสด 24 ชม."}`
    : "MobileShop-Hub | ศูนย์บริการซ่อมมือถือด่วน";

  const description =
    tenant?.storefrontConfig?.subheadline ||
    `ศูนย์บริการซ่อมมือถือและจำหน่ายสมาร์ตโฟนครบวงจร ${tenant ? tenant.name : ""}`;

  return {
    title,
    description,
  };
}

export default async function TenantStorePage({ params }: StorePageProps) {
  const { shopSlug } = await params;
  const tenant = await prisma.tenant.findFirst({
    where: { slug: shopSlug, status: { in: ["ACTIVE", "TRIAL"] } },
    include: {
      storefrontConfig: true,
      branches: {
        take: 1,
      },
    },
  });

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
              <span>กลับสู่หน้าหลัก MobileShop-Hub</span>
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
    customBeforeAfterCases: rawConfig?.customBeforeAfterCases,
    customPricingRates: rawConfig?.customPricingRates,
    customFaqs: rawConfig?.customFaqs,
  };

  const address = primaryBranch?.address?.trim() || null;
  const branchName = primaryBranch?.name || shopName;
  const themeColor = config.themeColor;
  const theme = THEME_PALETTES[themeColor] || THEME_PALETTES.emerald;

  // Parse custom before/after cases if saved in config
  let parsedCases: BeforeAfterCase[] | undefined = undefined;
  if (config.customBeforeAfterCases) {
    try {
      parsedCases = JSON.parse(config.customBeforeAfterCases);
    } catch (_) {}
  }

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

  return (
    <div className={`min-h-screen bg-white text-slate-900 ${selectionClass} pb-20 sm:pb-0`}>
      {/* 0. Top Announcement Bar */}
      {config.announcementEnabled && config.announcementText && (
        <AnnouncementBar
          text={config.announcementText}
          enabled={config.announcementEnabled}
          themeColor={themeColor}
        />
      )}

      {/* 1. Sticky Glassmorphism Header */}
      <LandingNavbar
        shopName={shopName}
        shopSlug={shopSlug}
        phone={config.phone}
        lineId={config.lineId}
        hiddenSections={hiddenSections}
      />

      <main id="main-content">
        {/* 2. Hero Section with dynamic headlines, badge, and toggles */}
        <LandingHero
          shopName={shopName}
          shopSlug={shopSlug}
          headline={config.headline}
          subheadline={config.subheadline}
          badge={config.badge}
          themeColor={themeColor}
          showScanner={config.showHardwareScanner}
          showLiveTracking={config.showLiveTracking}
        />

        {/* 3. Core Services Bento Grid */}
        {config.showServicesBento && (
          <ServicesBento lineId={config.lineId} showEstimate={config.showPriceEstimator} />
        )}

        {/* 4. Tracking workflow demo animation */}
        {config.showLiveTracking && <LiveTrackingShowcase />}

        {/* 5. 10-Point Pre & Post Inspection Standard & Diagnostic Bench */}
        {config.showInspectionBench && (
          <InspectionStandard
            showEstimate={config.showPriceEstimator}
            showBench={config.showInspectionBench}
            themeColor={themeColor}
          />
        )}

        {/* 6. Price & Duration Estimator */}
        {config.showPriceEstimator && (
          <PriceEstimator phone={config.phone} lineId={config.lineId} />
        )}

        {/* 7. Interactive Draggable Before / After Split Slider & Customer Reviews */}
        {(config.showBeforeAfterSlider || config.showCustomerReviews) && (
          <CustomerReviews
            showSlider={config.showBeforeAfterSlider}
            showReviews={config.showCustomerReviews}
            customCases={parsedCases}
            themeColor={themeColor}
          />
        )}

        {/* 8. Store Location & Contact */}
        {config.showLocationSection && (
          <ShopLocation
            shopName={shopName}
            branchName={branchName}
            address={address}
            phone={config.phone}
            lineId={config.lineId}
            googleMapsUrl={config.googleMapsUrl}
          />
        )}

        {/* 9. Technical FAQ Accordion */}
        {config.showFaqSection && (
          <LandingFaq lineId={config.lineId} />
        )}
      </main>

      {/* 10. Footer */}
      <LandingFooter
        shopName={shopName}
        address={address}
        phone={config.phone}
        hiddenSections={hiddenSections}
      />

      {/* 11. Mobile Sticky Action Bar */}
      {config.showMobileQuickBar && (
        <MobileQuickBar
          phone={config.phone}
          lineId={config.lineId}
          showEstimate={config.showPriceEstimator}
        />
      )}
    </div>
  );
}
