"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { extractTrackingToken, TRACKING_INPUT_ERROR } from "./trackingToken";
import { NavigationMenuItem, StorefrontThemeColor, THEME_PALETTES } from "@/lib/storefrontTheme";
import {
  Smartphone,
  Search,
  Phone,
  MessageCircle,
  Menu,
  X,
  ChevronRight,
  Clock,
  LogIn,
  UserRound,
  CalendarDays,
} from "lucide-react";

interface LandingNavbarProps {
  shopName?: string;
  /** Real shop phone; phone links are hidden when missing. */
  phone?: string | null;
  shopSlug?: string;
  /** LINE OA id; LINE buttons are hidden when missing. */
  lineId?: string | null;
  /** Section anchors (e.g. "#reviews") not rendered on this page — removed from the menu. */
  hiddenSections?: string[];
  /** Dynamic custom navigation links configured in storefront settings */
  navigationMenu?: NavigationMenuItem[];
  /** Whether the current page is a subpage (e.g. /store/[shopSlug]/[pageSlug]) */
  isSubpage?: boolean;
  /** Storefront color palette */
  themeColor?: StorefrontThemeColor;
}

export function LandingNavbar({
  shopName = "MobileShop-Hub",
  phone,
  shopSlug,
  lineId,
  hiddenSections = [],
  navigationMenu,
  isSubpage = false,
  themeColor = "emerald",
}: LandingNavbarProps = {}) {
  const theme = THEME_PALETTES[themeColor] || THEME_PALETTES.emerald;
  const lineUrl = lineId
    ? `https://line.me/R/ti/p/${encodeURIComponent(lineId.trim().startsWith("@") ? lineId.trim() : `@${lineId.trim()}`)}`
    : "";
  const telUrl = phone ? `tel:${phone.replace(/[^0-9+]/g, "")}` : "";
  const customerPortalHref = shopSlug ? `/s/${shopSlug}` : "/customer";
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [trackingCode, setTrackingCode] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const defaultLinks = [
    { label: "บริการช่าง", href: "#services", isExternal: false },
    { label: "ติดตามงานซ่อม", href: "#track-search", isExternal: false },
    { label: "ตรวจเช็ค 10 จุด", href: "#inspection", isExternal: false },
    { label: "ประเมินราคา", href: "#estimate", isExternal: false },
    { label: "ผลงานก่อน-หลังซ่อม", href: "#reviews", isExternal: false },
    { label: "ที่ตั้งศูนย์", href: "#location", isExternal: false },
    { label: "คำถามพบบ่อย", href: "#faq", isExternal: false },
  ];

  const rawLinks =
    navigationMenu && navigationMenu.length > 0
      ? navigationMenu.map((item) => ({
          label: item.label,
          href: item.href,
          isExternal: Boolean(item.isExternal),
        }))
      : defaultLinks;

  const navLinks = rawLinks.filter((link) => !hiddenSections.includes(link.href));

  const handleQuickTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const token = extractTrackingToken(trackingCode);
    if (!token) {
      window.alert(TRACKING_INPUT_ERROR);
      return;
    }
    window.location.href = `/track/${token}`;
  };

  return (
    <>
      {/* Top Utility Bar */}
      <div className="bg-slate-950 text-slate-300 text-xs py-2 px-4 border-b border-slate-800 hidden sm:block">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-2 text-slate-200 font-medium">
              <Clock className={`h-3.5 w-3.5 ${theme.accentText}`} />
              <span>ติดตามสถานะงานซ่อมได้ด้วย QR บนใบรับเครื่อง</span>
            </span>
          </div>

          <div className="flex items-center gap-5">
            {telUrl && (<>
            <a
              href={telUrl}
              className={`flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 ${theme.accentRing} rounded-sm`}
            >
              <Phone className={`h-3.5 w-3.5 ${theme.accentText}`} />
              <span className="tabular-nums font-mono">{phone}</span>
            </a>
            <span className="text-slate-700" aria-hidden="true">|</span>
            </>)}
            <Link
              href={customerPortalHref}
              className={`inline-flex items-center gap-1.5 text-slate-300 hover:text-white font-medium transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 ${theme.accentRing} rounded-sm`}
            >
              <UserRound className={`h-3.5 w-3.5 ${theme.accentText}`} />
              <span>บริการลูกค้า / จองคิว</span>
            </Link>
            <span className="text-slate-700" aria-hidden="true">|</span>
            <Link
              href="/dashboard"
              className={`inline-flex items-center gap-1.5 text-slate-300 hover:text-white font-medium transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 ${theme.accentRing} rounded-sm`}
            >
              <LogIn className="h-3.5 w-3.5 text-slate-400" />
              <span>เข้าสู่ระบบพนักงาน (Staff Portal)</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Sticky Navbar */}
      <header
        className={`sticky top-0 z-40 transition-all duration-200 ease-out motion-reduce:transition-none ${
          isScrolled
            ? "bg-white/95 backdrop-blur-md shadow-xs border-b border-slate-200/90 py-2.5"
            : "bg-white border-b border-slate-200 py-3.5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            {/* Brand Logo */}
            <Link
              href={shopSlug ? `/store/${shopSlug}` : "/landing"}
              className={`flex items-center gap-3 shrink-0 focus-visible:outline-none focus-visible:ring-2 ${theme.focusVisibleRing} rounded-lg p-1`}
            >
              <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center border border-slate-800 shadow-xs">
                <Smartphone className={`h-5 w-5 ${theme.accentText}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg text-slate-900 tracking-tight">
                    {shopName}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${theme.lightBg} ${theme.lightText} border ${theme.lightBorder}`}>
                    Store
                  </span>
                </div>
                <p className="text-xs font-normal text-slate-500 hidden sm:block">
                  ศูนย์บริการซ่อมมือถือด่วนและตรวจเช็คมาตรฐานแล็บ
                </p>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            {navLinks.length > 0 && (
              <nav className="hidden xl:flex items-center gap-1.5 lg:gap-3" aria-label="เมนูหลัก">
                {navLinks.map((link) => {
                  const resolvedHref =
                    isSubpage && link.href.startsWith("#") && shopSlug
                      ? `/store/${shopSlug}${link.href}`
                      : link.href;

                  if (link.isExternal) {
                    return (
                      <a
                        key={link.href}
                        href={resolvedHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-xs font-medium text-slate-600 hover:text-slate-900 py-1.5 px-2.5 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 ${theme.focusVisibleRing}`}
                      >
                        {link.label}
                      </a>
                    );
                  }

                  // If internal page route (not hash), use Link
                  if (!resolvedHref.startsWith("#")) {
                    return (
                      <Link
                        key={link.href}
                        href={resolvedHref}
                        className={`text-xs font-medium text-slate-600 hover:text-slate-900 py-1.5 px-2.5 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 ${theme.focusVisibleRing}`}
                      >
                        {link.label}
                      </Link>
                    );
                  }

                  return (
                    <a
                      key={link.href}
                      href={resolvedHref}
                      className={`text-xs font-medium text-slate-600 hover:text-slate-900 py-1.5 px-2.5 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 ${theme.focusVisibleRing}`}
                    >
                      {link.label}
                    </a>
                  );
                })}
              </nav>
            )}

            {/* Right Quick Action Group */}
            <div className="hidden sm:flex items-center gap-3">
              {/* Quick Tracking Search Mini Form */}
              {!hiddenSections.includes("#track-search") && (
                <form onSubmit={handleQuickTrackSubmit} className="relative hidden xl:block">
                  <input
                    type="text"
                    placeholder="วางลิงก์ติดตามงานซ่อม"
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value)}
                    className={`w-48 pl-8 pr-7 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:bg-white focus:w-56 focus:outline-none focus:ring-2 ${theme.focusRing} transition-all duration-150 motion-reduce:transition-none font-mono tabular-nums`}
                    aria-label="ลิงก์ติดตามงานซ่อมจากใบรับเครื่อง"
                  />
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
                  {trackingCode && (
                    <button
                      type="button"
                      onClick={() => setTrackingCode("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 hover:text-slate-600"
                      aria-label="ล้างข้อความค้นหา"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </form>
              )}

              {/* LINE Consultation CTA (real LINE OA only) */}
              {lineUrl && (
              <a
                href={lineUrl}
                target="_blank"
                rel="noreferrer"
                className={`min-h-[44px] min-w-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold ${theme.navCta} transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 ${theme.focusVisibleRing} focus-visible:ring-offset-2 shadow-xs whitespace-nowrap shrink-0`}
              >
                <MessageCircle className="h-4 w-4" />
                <span>ปรึกษาช่างเทคนิค</span>
              </a>
              )}

              {/* Customer Portal Link */}
              <Link
                href={customerPortalHref}
                className={`min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 ${theme.focusVisibleRing} border border-slate-200 whitespace-nowrap shrink-0 shadow-2xs`}
              >
                <UserRound className={`h-4 w-4 ${theme.lightAccentText}`} />
                <span>บัญชีลูกค้า</span>
              </Link>

              {/* Staff Portal Link */}
              <Link
                href="/dashboard"
                className={`min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 ${theme.focusVisibleRing}`}
                title="เข้าสู่ระบบพนักงาน (Staff Portal)"
                aria-label="เข้าสู่ระบบพนักงาน"
              >
                <LogIn className="h-4 w-4" />
              </Link>
            </div>

            {/* Mobile Menu Buttons */}
            <div className="flex items-center gap-2 lg:hidden">
              {!hiddenSections.includes("#track-search") && (
                <a
                  href="#track-search"
                  className={`min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2.5 rounded-xl ${theme.lightAccentText} ${theme.lightBg} hover:opacity-90 transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 ${theme.focusVisibleRing}`}
                  aria-label="ไปยังช่องค้นหาสถานะซ่อม"
                >
                  <Search className="h-5 w-5" />
                </a>
              )}

              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2.5 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 ${theme.focusVisibleRing}`}
                aria-label={mobileMenuOpen ? "ปิดเมนูการนำทาง" : "เปิดเมนูการนำทาง"}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-4 pb-6 space-y-4 shadow-lg">
            {/* Quick Tracking Input for Mobile */}
            {!hiddenSections.includes("#track-search") && (
              <form onSubmit={handleQuickTrackSubmit} className="space-y-2">
                <label htmlFor="mobile-nav-track" className="text-xs font-medium text-slate-700">
                  ติดตามงานซ่อม (วางลิงก์จากใบรับเครื่อง):
                </label>
                <div className="flex gap-2">
                  <input
                    id="mobile-nav-track"
                    type="text"
                    placeholder="วางลิงก์ติดตามจากใบรับเครื่อง"
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value)}
                    className={`flex-1 min-h-[44px] px-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 ${theme.focusRing} font-mono tabular-nums`}
                  />
                  <button
                    type="submit"
                    className={`min-h-[44px] min-w-[44px] px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-medium shrink-0 hover:bg-slate-800 transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 ${theme.focusVisibleRing}`}
                  >
                    ค้นหา
                  </button>
                </div>
              </form>
            )}

            {navLinks.length > 0 && (
              <nav className="divide-y divide-slate-100" aria-label="เมนูมือถือ">
                {navLinks.map((link) => {
                  const resolvedHref =
                    isSubpage && link.href.startsWith("#") && shopSlug
                      ? `/store/${shopSlug}${link.href}`
                      : link.href;

                  if (link.isExternal) {
                    return (
                      <a
                        key={link.href}
                        href={resolvedHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center justify-between min-h-[44px] py-2.5 text-sm font-medium text-slate-700 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 ${theme.focusVisibleRing}`}
                      >
                        <span>{link.label}</span>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </a>
                    );
                  }

                  if (!resolvedHref.startsWith("#")) {
                    return (
                      <Link
                        key={link.href}
                        href={resolvedHref}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center justify-between min-h-[44px] py-2.5 text-sm font-medium text-slate-700 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 ${theme.focusVisibleRing}`}
                      >
                        <span>{link.label}</span>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </Link>
                    );
                  }

                  return (
                    <a
                      key={link.href}
                      href={resolvedHref}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between min-h-[44px] py-2.5 text-sm font-medium text-slate-700 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 ${theme.focusVisibleRing}`}
                    >
                      <span>{link.label}</span>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </a>
                  );
                })}
              </nav>
            )}

            {(telUrl || lineUrl) && (
            <div className={`pt-2 grid ${telUrl && lineUrl ? "grid-cols-2" : "grid-cols-1"} gap-2`}>
              {telUrl && (
              <a
                href={telUrl}
                className="min-h-[44px] flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 hover:bg-slate-100 transition-colors duration-150"
              >
                <Phone className={`h-4 w-4 ${theme.lightAccentText}`} />
                <span className="tabular-nums font-mono">{phone}</span>
              </a>
              )}

              {lineUrl && (
              <a
                href={lineUrl}
                target="_blank"
                rel="noreferrer"
                className={`min-h-[44px] flex items-center justify-center gap-2 py-2.5 rounded-xl ${theme.navCta} text-xs font-medium transition-colors duration-150`}
              >
                <MessageCircle className="h-4 w-4" />
                <span>ปรึกษาช่าง LINE</span>
              </a>
              )}
            </div>
            )}

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <Link
                href={customerPortalHref}
                onClick={() => setMobileMenuOpen(false)}
                className={`min-h-[44px] flex items-center justify-center gap-2 py-2.5 rounded-xl ${theme.lightBg} text-xs font-semibold ${theme.lightText} hover:opacity-90 transition-colors`}
              >
                <UserRound className={`h-4 w-4 ${theme.lightAccentText}`} />
                <span>เข้าสู่บัญชีลูกค้า / จองคิวเข้ารับบริการ</span>
              </Link>

              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] flex items-center justify-center gap-2 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                <LogIn className="h-4 w-4 text-slate-500" />
                <span>เข้าสู่แดชบอร์ดพนักงาน (Staff Portal)</span>
              </Link>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
