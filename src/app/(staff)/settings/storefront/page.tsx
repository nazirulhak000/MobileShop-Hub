"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Palette,
  Megaphone,
  Layers,
  PhoneCall,
  Sliders,
  Monitor,
  Tablet,
  Smartphone,
  ExternalLink,
  Save,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  HelpCircle,
  Info,
  MapPin,
  Plus,
  Trash2,
  RefreshCw,
} from "lucide-react";

import { AnnouncementBar } from "@/components/landing/AnnouncementBar";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { LandingHero } from "@/components/landing/LandingHero";
import { ServicesBento } from "@/components/landing/ServicesBento";
import { LiveTrackingShowcase } from "@/components/landing/LiveTrackingShowcase";
import { InspectionStandard } from "@/components/landing/InspectionStandard";
import { PriceEstimator } from "@/components/landing/PriceEstimator";
import { CustomerReviews, BeforeAfterCase, BEFORE_AFTER_CASES } from "@/components/landing/CustomerReviews";
import { ShopLocation } from "@/components/landing/ShopLocation";
import { LandingFaq } from "@/components/landing/LandingFaq";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { MobileQuickBar } from "@/components/landing/MobileQuickBar";

import {
  DEFAULT_STOREFRONT_CONFIG,
  StorefrontConfigData,
  StorefrontThemeColor,
  THEME_PALETTES,
} from "@/lib/storefrontTheme";

type ActiveTab = "theme" | "announcement" | "sections" | "contact" | "cases";
type ViewportMode = "desktop" | "tablet" | "mobile";

export default function StorefrontCustomizerPage() {
  const [config, setConfig] = useState<StorefrontConfigData>(DEFAULT_STOREFRONT_CONFIG);
  const [shopName, setShopName] = useState<string>("MobileShop");
  const [shopSlug, setShopSlug] = useState<string>("mobileshop");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("theme");
  const [viewport, setViewport] = useState<ViewportMode>("desktop");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<boolean>(false);

  // Custom Cases state for Tab 5
  const [casesList, setCasesList] = useState<BeforeAfterCase[]>(BEFORE_AFTER_CASES);

  // Load configuration from API on mount
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch("/api/storefront/config");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.config) {
            setConfig({
              ...DEFAULT_STOREFRONT_CONFIG,
              ...data.config,
              themeColor: (data.config.themeColor as StorefrontThemeColor) || "emerald",
            });
            if (data.tenant) {
              if (data.tenant.name) setShopName(data.tenant.name);
              if (data.tenant.slug) setShopSlug(data.tenant.slug);
            }
            if (data.config.customBeforeAfterCases) {
              try {
                const parsed = JSON.parse(data.config.customBeforeAfterCases);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  setCasesList(parsed);
                }
              } catch (_) {}
            }
          }
        }
      } catch (err) {
        console.error("Failed to load storefront config:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadConfig();
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Handle Save
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        ...config,
        shopName,
        customBeforeAfterCases: JSON.stringify(casesList),
      };

      const res = await fetch("/api/storefront/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setToast({ message: "บันทึกการตั้งค่าหน้าร้านเรียบร้อยแล้ว!", type: "success" });
      } else {
        setToast({
          message: data.error || "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง",
          type: "error",
        });
      }
    } catch (err) {
      console.error("Save error:", err);
      setToast({ message: "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to Defaults
  const handleResetDefaults = () => {
    if (window.confirm("คุณต้องการรีเซ็ตการตั้งค่าทั้งหมดกลับเป็นค่ามาตรฐานหรือไม่?")) {
      setConfig(DEFAULT_STOREFRONT_CONFIG);
      setCasesList(BEFORE_AFTER_CASES);
      setToast({ message: "รีเซ็ตค่าเป็นค่ามาตรฐานแล้ว (อย่าลืมกดบันทึก)", type: "success" });
    }
  };

  const copyStoreUrl = () => {
    const url = `${window.location.origin}/store/${shopSlug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(true);
    setTimeout(() => setCopiedSlug(false), 2000);
  };

  const theme = THEME_PALETTES[config.themeColor] || THEME_PALETTES.emerald;

  // Calculate hidden menu anchors for navigation bar and footer in preview
  const hiddenSections = useMemo(() => {
    const list: string[] = [];
    if (!config.showServicesBento) list.push("#services");
    if (!config.showLiveTracking) list.push("#track-search");
    if (!config.showInspectionBench) list.push("#inspection");
    if (!config.showPriceEstimator) list.push("#estimate");
    if (!config.showBeforeAfterSlider && !config.showCustomerReviews) list.push("#reviews");
    if (!config.showLocationSection) list.push("#location");
    if (!config.showFaqSection) list.push("#faq");
    return list;
  }, [config]);

  if (isLoading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-8 text-center space-y-4">
        <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
        <p className="text-sm text-slate-500 font-medium">กำลังโหลดเครื่องมือปรับแต่งหน้าร้าน...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] min-h-[680px] bg-slate-100/70 -m-4 md:-m-6 lg:-m-8">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-fade-in shadow-xl">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs sm:text-sm font-semibold border ${
              toast.type === "success"
                ? "bg-emerald-950 text-emerald-100 border-emerald-600 shadow-emerald-950/20"
                : "bg-rose-950 text-rose-100 border-rose-600 shadow-rose-950/20"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* 1. TOP ACTION BAR */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4 shrink-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
            title="กลับสู่การตั้งค่าระบบ"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                <Palette className="h-4 w-4 text-emerald-600" />
                <span>Storefront Customizer</span>
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync
              </span>
            </div>
            {/* Slug URL indicator */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
              <Globe className="h-3 w-3 text-slate-400" />
              <span className="font-mono text-[11px] truncate max-w-[200px] sm:max-w-xs">
                /store/{shopSlug}
              </span>
              <button
                type="button"
                onClick={copyStoreUrl}
                className="text-slate-400 hover:text-slate-700 p-0.5 rounded"
                title="คัดลอกลิงก์หน้าร้าน"
              >
                {copiedSlug ? (
                  <Check className="h-3 w-3 text-emerald-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors min-h-[38px]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>ค่าเริ่มต้น</span>
          </button>

          <Link
            href={`/store/${shopSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-colors min-h-[38px]"
            title="เปิดหน้าร้านจริงในแท็บใหม่"
          >
            <span>เปิดหน้าร้านจริง</span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
          </Link>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all active:scale-95 disabled:opacity-70 min-h-[38px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>กำลังบันทึก...</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>บันทึกการเปลี่ยนแปลง</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* 2. MAIN TWO-COLUMN SPLIT WORKSPACE */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* LEFT COLUMN: Controls & Settings Tabs (Accordion Style) */}
        <aside className="w-full lg:w-[460px] xl:w-[490px] bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-0 z-20 shadow-xs">
          {/* Tabs Navigation Header */}
          <div className="grid grid-cols-5 border-b border-slate-200 bg-slate-50/80 p-1.5 gap-1 shrink-0">
            {[
              { id: "theme", label: "ธีม & พาดหัว", icon: Palette },
              { id: "announcement", label: "แถบประกาศ", icon: Megaphone },
              { id: "sections", label: "เปิด-ปิดเซกชัน", icon: Layers },
              { id: "contact", label: "ติดต่อ & โซเชียล", icon: PhoneCall },
              { id: "cases", label: "เคสซ่อมตัวอย่าง", icon: Sliders },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as ActiveTab)}
                  className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl text-[11px] font-semibold transition-all min-h-[50px] ${
                    isActive
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                      : "text-slate-500 hover:text-slate-900 hover:bg-white/60"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
                  <span className="leading-tight text-center">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content Panels (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {/* TAB 1: Theme & Identity */}
            {activeTab === "theme" && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">ธีมสีและการแสดงผล (Theme & Identity)</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    เลือกชุดสีพรีเมียมและปรับแต่งชื่อร้าน ป้ายกำกับ และข้อความพาดหัวหลัก
                  </p>
                </div>

                {/* Color Palette Picker */}
                <div className="space-y-2.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    ชุดสีธีมหลัก (Theme Color Palette)
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {(Object.keys(THEME_PALETTES) as StorefrontThemeColor[]).map((cKey) => {
                      const p = THEME_PALETTES[cKey];
                      const isSelected = config.themeColor === cKey;
                      return (
                        <button
                          key={cKey}
                          type="button"
                          onClick={() => setConfig({ ...config, themeColor: cKey })}
                          className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${
                            isSelected
                              ? "border-slate-900 bg-slate-900/5 ring-2 ring-slate-900/10 shadow-xs"
                              : "border-slate-200 hover:border-slate-300 bg-white"
                          }`}
                        >
                          <span
                            className="h-6 w-6 rounded-full shadow-inner shrink-0 flex items-center justify-center text-white"
                            style={{ backgroundColor: p.hex }}
                          >
                            {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate">{p.labelEn}</div>
                            <div className="text-[10px] text-slate-500 truncate">{p.label.split(" ")[0]}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Shop Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    ชื่อร้านค้าที่แสดง (Shop Display Name) *
                  </label>
                  <input
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className="w-full text-xs h-10 px-3.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium"
                    placeholder="เช่น MobileShop Lab Express"
                  />
                </div>

                {/* Hero Badge */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    ป้ายกำกับด้านบน (Hero Badge Tag)
                  </label>
                  <input
                    type="text"
                    value={config.badge}
                    onChange={(e) => setConfig({ ...config, badge: e.target.value })}
                    className="w-full text-xs h-10 px-3.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                    placeholder="เช่น ศูนย์บริการซ่อมมาตรฐานแล็บ"
                  />
                </div>

                {/* Hero Headline */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    ข้อความพาดหัวหลัก (Hero Main Headline)
                  </label>
                  <textarea
                    rows={3}
                    value={config.headline}
                    onChange={(e) => setConfig({ ...config, headline: e.target.value })}
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all leading-relaxed"
                    placeholder="พาดหัวหลักที่ดึงดูดลูกค้า"
                  />
                </div>

                {/* Hero Subheadline */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    ข้อความบรรยายประกอบ (Hero Subheadline)
                  </label>
                  <textarea
                    rows={4}
                    value={config.subheadline}
                    onChange={(e) => setConfig({ ...config, subheadline: e.target.value })}
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all leading-relaxed"
                    placeholder="คำบรรยายสั้นๆ เกี่ยวกับมาตรฐานและบริการของร้าน"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: Announcement Bar */}
            {activeTab === "announcement" && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">แถบประกาศด้านบนสุด (Announcement Bar)</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    แสดงแถบข้อความโปรโมชั่น ประกาศแจ้งเตือน หรือสิทธิพิเศษที่หัวเว็บ
                  </p>
                </div>

                {/* Enable Switch */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div>
                    <div className="text-xs font-bold text-slate-900">เปิดใช้งานแถบประกาศ</div>
                    <div className="text-[11px] text-slate-500">แสดงผลด้านบนสุดของหน้าเว็บ</div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={config.announcementEnabled}
                    onClick={() =>
                      setConfig({ ...config, announcementEnabled: !config.announcementEnabled })
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      config.announcementEnabled ? "bg-emerald-600" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        config.announcementEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Announcement Text */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    ข้อความประกาศ (Announcement Text)
                  </label>
                  <textarea
                    rows={3}
                    value={config.announcementText}
                    onChange={(e) => setConfig({ ...config, announcementText: e.target.value })}
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all leading-relaxed"
                    placeholder="เช่น 🎉 พิเศษ! ตรวจเช็คสภาพเครื่อง 10 จุดฟรี ไม่มีค่าใช้จ่าย พร้อมรับประกันงานซ่อมสูงสุด 1 ปีเต็ม"
                  />
                </div>

                {/* Mini Preview Box */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 block">
                    ตัวอย่างแถบประกาศตามธีมสี:
                  </label>
                  <div
                    className={`p-3 rounded-xl text-xs font-medium border flex items-center gap-2 ${theme.announcement.bg} ${theme.announcement.text} ${theme.announcement.border}`}
                  >
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${theme.announcement.badgeBg} ${theme.announcement.badgeText}`}
                    >
                      ประกาศ
                    </span>
                    <span className="truncate">{config.announcementText || "ข้อความตัวอย่าง"}</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Section Visibility Toggles */}
            {activeTab === "sections" && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">เปิด-ปิดส่วนประกอบหน้าร้าน (Section Visibility)</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    เลือกแสดงหรือซ่อนส่วนต่างๆ บนหน้าร้านค้าของคุณได้อิสระตามต้องการ
                  </p>
                </div>

                <div className="space-y-2.5">
                  {[
                    {
                      key: "showHardwareScanner",
                      title: "1. Hardware Teardown Scanner",
                      desc: "โมเดลชำแหละฮาร์ดแวร์มือถือพร้อมจุดวิเคราะห์แรงดันไฟและอุณหภูมิ",
                    },
                    {
                      key: "showLiveTracking",
                      title: "2. Live Tracking Lookup",
                      desc: "กล่องค้นหาติดตามสถานะงานซ่อมสดด้วยรหัสหรือ QR Code",
                    },
                    {
                      key: "showServicesBento",
                      title: "3. Services Bento Grid",
                      desc: "การ์ดแสดง 6 บริการหลักของร้าน (งานแล็บ, ตรวจเช็ค, อะไหล่แท้ ฯลฯ)",
                    },
                    {
                      key: "showInspectionBench",
                      title: "4. 10-Point Inspection Bench",
                      desc: "แท่นทดสอบจำลองเครื่องมือวัดทางวิศวกรรมและเกณฑ์ตรวจเช็ค 10 รายการ",
                    },
                    {
                      key: "showPriceEstimator",
                      title: "5. Price & Duration Estimator",
                      desc: "ระบบประเมินราคาซ่อมตามรุ่น ยี่ห้อ อาการ และเกรดอะไหล่แท้ vs มอก.",
                    },
                    {
                      key: "showBeforeAfterSlider",
                      title: "6. Before & After Split Slider",
                      desc: "ตัวเลื่อนเปรียบเทียบภาพเครื่องก่อนและหลังซ่อมพร้อมหมุดวิศวกรรม",
                    },
                    {
                      key: "showCustomerReviews",
                      title: "7. Customer Reviews & Ratings",
                      desc: "การ์ดรีวิวความประทับใจและคะแนนความพึงพอใจ 4.9 ดาว",
                    },
                    {
                      key: "showLocationSection",
                      title: "8. Store Location & Google Maps",
                      desc: "ที่ตั้งสาขา เวลาเปิดทำการ และปุ่มนำทางด้วย Google Maps",
                    },
                    {
                      key: "showFaqSection",
                      title: "9. Technical FAQ Accordion",
                      desc: "กล่องคำถามพบบ่อย (ข้อมูลสูญหายไหม, ระยะเวลารอรับ, ประกันงาน)",
                    },
                    {
                      key: "showMobileQuickBar",
                      title: "10. Mobile Bottom QuickBar",
                      desc: "แถบนำทางด่วนติดล่างจอมือถือ (ค้นหางานซ่อม, โทรออก, แอด LINE)",
                    },
                  ].map((sec) => {
                    const isChecked = Boolean(config[sec.key as keyof StorefrontConfigData]);
                    return (
                      <div
                        key={sec.key}
                        className={`flex items-start justify-between p-3.5 rounded-2xl border transition-all ${
                          isChecked
                            ? "bg-white border-slate-200/90 shadow-2xs"
                            : "bg-slate-50/70 border-slate-200/60 opacity-60"
                        }`}
                      >
                        <div className="pr-3 min-w-0">
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            {isChecked ? (
                              <Eye className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <EyeOff className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            )}
                            <span className="truncate">{sec.title}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{sec.desc}</p>
                        </div>

                        <button
                          type="button"
                          role="switch"
                          aria-checked={isChecked}
                          onClick={() =>
                            setConfig({
                              ...config,
                              [sec.key]: !isChecked,
                            })
                          }
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 mt-0.5 ${
                            isChecked ? "bg-emerald-600" : "bg-slate-300"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              isChecked ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 4: Contact & Social */}
            {activeTab === "contact" && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">ช่องทางติดต่อ & โซเชียล (Contact & Social)</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    กำหนดเบอร์โทรศัพท์ LINE Official Account และพิกัด Google Maps หน้าร้าน
                  </p>
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    เบอร์โทรศัพท์ติดต่อหน้าร้าน (Phone)
                  </label>
                  <input
                    type="text"
                    value={config.phone}
                    onChange={(e) => setConfig({ ...config, phone: e.target.value })}
                    className="w-full text-xs h-10 px-3.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-mono"
                    placeholder="เช่น 02-123-4567 หรือ 081-999-8888"
                  />
                  <span className="text-[11px] text-slate-400">
                    หากไม่ระบุ ปุ่มโทรศัพท์บนหน้าเว็บจะถูกซ่อนอัตโนมัติ
                  </span>
                </div>

                {/* LINE ID */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    LINE Official Account ID
                  </label>
                  <input
                    type="text"
                    value={config.lineId}
                    onChange={(e) => setConfig({ ...config, lineId: e.target.value })}
                    className="w-full text-xs h-10 px-3.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-mono"
                    placeholder="เช่น @mobileshophub"
                  />
                  <span className="text-[11px] text-slate-400">
                    เมื่อใส่ ID ระบบจะสร้างลิงก์เพิ่มเพื่อน `line.me/R/ti/p/...` อัตโนมัติ
                  </span>
                </div>

                {/* Google Maps URL */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    ลิงก์หมุดแผนที่ (Google Maps Link)
                  </label>
                  <input
                    type="url"
                    value={config.googleMapsUrl}
                    onChange={(e) => setConfig({ ...config, googleMapsUrl: e.target.value })}
                    className="w-full text-xs h-10 px-3.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-mono"
                    placeholder="เช่น https://maps.app.goo.gl/..."
                  />
                  <span className="text-[11px] text-slate-400">
                    ลิงก์ไปยังหมุดร้านค้าจริงบน Google Maps เพื่อให้ลูกค้ากดเปิดแผนที่นำทางได้ทันที
                  </span>
                </div>

                {/* LINE QR Code Image URL */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    URL รูปภาพ QR Code LINE OA (ตัวเลือกเสริม)
                  </label>
                  <input
                    type="url"
                    value={config.lineQrUrl}
                    onChange={(e) => setConfig({ ...config, lineQrUrl: e.target.value })}
                    className="w-full text-xs h-10 px-3.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-mono"
                    placeholder="เช่น https://example.com/line-qr.png"
                  />
                </div>
              </div>
            )}

            {/* TAB 5: Custom Rates & Cases */}
            {activeTab === "cases" && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">เคสซ่อมตัวอย่าง (Before & After Cases)</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    จัดการเคสตัวอย่างสำหรับตัวเลื่อนเปรียบเทียบก่อน-หลังการซ่อม
                  </p>
                </div>

                <div className="space-y-4">
                  {casesList.map((cItem, cIdx) => (
                    <div
                      key={cItem.id || cIdx}
                      className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Sliders className="h-3.5 w-3.5 text-emerald-600" />
                          <span>เคสที่ {cIdx + 1}: {cItem.device.split(" ")[0]} {cItem.device.split(" ")[1]}</span>
                        </span>
                        {casesList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = casesList.filter((_, idx) => idx !== cIdx);
                              setCasesList(updated);
                            }}
                            className="text-slate-400 hover:text-rose-600 p-1"
                            title="ลบเคสนี้"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block">ชื่อรุ่นอุปกรณ์</label>
                          <input
                            type="text"
                            value={cItem.device}
                            onChange={(e) => {
                              const updated = [...casesList];
                              updated[cIdx] = { ...updated[cIdx], device: e.target.value };
                              setCasesList(updated);
                            }}
                            className="w-full text-xs h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block">อาการแรกเข้า</label>
                          <input
                            type="text"
                            value={cItem.issue}
                            onChange={(e) => {
                              const updated = [...casesList];
                              updated[cIdx] = { ...updated[cIdx], issue: e.target.value };
                              setCasesList(updated);
                            }}
                            className="w-full text-xs h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-800"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-600 block">ระยะเวลาซ่อม</label>
                            <input
                              type="text"
                              value={cItem.repairTime}
                              onChange={(e) => {
                                const updated = [...casesList];
                                updated[cIdx] = { ...updated[cIdx], repairTime: e.target.value };
                                setCasesList(updated);
                              }}
                              className="w-full text-xs h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-slate-600 block">การรับประกัน</label>
                            <input
                              type="text"
                              value={cItem.warranty}
                              onChange={(e) => {
                                const updated = [...casesList];
                                updated[cIdx] = { ...updated[cIdx], warranty: e.target.value };
                                setCasesList(updated);
                              }}
                              className="w-full text-xs h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-800"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => setCasesList(BEFORE_AFTER_CASES)}
                    className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 text-xs text-slate-600 font-semibold hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>คืนค่าเคสตัวอย่างมาตรฐาน (Reset Cases)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* RIGHT COLUMN: Live Interactive Responsive Preview */}
        <section className="flex-1 flex flex-col min-w-0 bg-slate-200/70 overflow-hidden relative">
          {/* Viewport Control Bar */}
          <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between gap-4 shrink-0 shadow-2xs z-10">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              {[
                { id: "desktop", label: "Desktop (Full)", icon: Monitor },
                { id: "tablet", label: "Tablet (768px)", icon: Tablet },
                { id: "mobile", label: "Mobile (375px)", icon: Smartphone },
              ].map((v) => {
                const Icon = v.icon;
                const isSelected = viewport === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setViewport(v.id as ViewportMode)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{v.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-mono hidden md:inline">
                {viewport === "desktop" ? "Full Width (100%)" : viewport === "tablet" ? "Width: 768px" : "Width: 375px"}
              </span>
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="Live Preview Sync" />
            </div>
          </div>

          {/* Preview Canvas Area */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 flex items-start justify-center">
            {/* Simulated Device Frame */}
            <div
              className={`w-full bg-white transition-all duration-300 rounded-2xl shadow-xl overflow-hidden border border-slate-300 flex flex-col ${
                viewport === "desktop"
                  ? "max-w-full"
                  : viewport === "tablet"
                  ? "max-w-[768px]"
                  : "max-w-[375px]"
              }`}
            >
              {/* Simulated Browser Chrome */}
              <div className="bg-slate-900 text-slate-300 px-4 py-2 flex items-center gap-2 text-xs border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <div className="flex-1 max-w-sm mx-auto bg-slate-950 px-3 py-1 rounded-lg text-center font-mono text-[11px] text-slate-400 truncate border border-slate-800">
                  https://mobileshophub.com/store/{shopSlug}
                </div>
              </div>

              {/* Rendered Live Storefront */}
              <div className="flex-1 bg-white overflow-x-hidden">
                {/* 0. Announcement Bar */}
                {config.announcementEnabled && config.announcementText && (
                  <AnnouncementBar
                    text={config.announcementText}
                    enabled={config.announcementEnabled}
                    themeColor={config.themeColor}
                  />
                )}

                {/* 1. Header */}
                <LandingNavbar
                  shopName={shopName}
                  shopSlug={shopSlug}
                  phone={config.phone}
                  lineId={config.lineId}
                  hiddenSections={hiddenSections}
                />

                {/* 2. Hero */}
                <LandingHero
                  shopName={shopName}
                  shopSlug={shopSlug}
                  headline={config.headline}
                  subheadline={config.subheadline}
                  badge={config.badge}
                  themeColor={config.themeColor}
                  showScanner={config.showHardwareScanner}
                  showLiveTracking={config.showLiveTracking}
                />

                {/* 3. Services Bento */}
                {config.showServicesBento && (
                  <ServicesBento lineId={config.lineId} showEstimate={config.showPriceEstimator} />
                )}

                {/* 4. Live Tracking Showcase */}
                {config.showLiveTracking && <LiveTrackingShowcase />}

                {/* 5. 10-Point Inspection Standard */}
                {config.showInspectionBench && (
                  <InspectionStandard
                    showEstimate={config.showPriceEstimator}
                    showBench={config.showInspectionBench}
                    themeColor={config.themeColor}
                  />
                )}

                {/* 6. Price Estimator */}
                {config.showPriceEstimator && (
                  <PriceEstimator phone={config.phone} lineId={config.lineId} />
                )}

                {/* 7. Customer Reviews / Slider */}
                {(config.showBeforeAfterSlider || config.showCustomerReviews) && (
                  <CustomerReviews
                    showSlider={config.showBeforeAfterSlider}
                    showReviews={config.showCustomerReviews}
                    customCases={casesList}
                    themeColor={config.themeColor}
                  />
                )}

                {/* 8. Location Section */}
                {config.showLocationSection && (
                  <ShopLocation
                    shopName={shopName}
                    phone={config.phone}
                    lineId={config.lineId}
                    googleMapsUrl={config.googleMapsUrl}
                    demo={false}
                  />
                )}

                {/* 9. FAQ Section */}
                {config.showFaqSection && <LandingFaq lineId={config.lineId} />}

                {/* 10. Footer */}
                <LandingFooter
                  shopName={shopName}
                  phone={config.phone}
                  hiddenSections={hiddenSections}
                />

                {/* 11. Mobile Quick Bar (rendered inside preview when mobile viewport or always on mobile devices) */}
                {config.showMobileQuickBar && viewport === "mobile" && (
                  <MobileQuickBar
                    phone={config.phone}
                    lineId={config.lineId}
                    showEstimate={config.showPriceEstimator}
                  />
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
