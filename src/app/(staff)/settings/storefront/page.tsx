"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  AlertTriangle,
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
  Lock,
  X,
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
  safeParseBeforeAfterCases,
} from "@/lib/storefrontTheme";

type ActiveTab = "theme" | "announcement" | "sections" | "contact" | "cases";
type ViewportMode = "desktop" | "tablet" | "mobile";

interface ToastState {
  message: string;
  type: "success" | "error" | "warning";
}

/**
 * Validate HTTP/HTTPS URLs
 */
function isValidHttpUrl(str: string): boolean {
  if (!str || !str.trim()) return true;
  try {
    const url = new URL(str.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default function StorefrontCustomizerPage() {
  const [config, setConfig] = useState<StorefrontConfigData>(DEFAULT_STOREFRONT_CONFIG);
  const [initialConfig, setInitialConfig] = useState<StorefrontConfigData | null>(null);

  const [shopName, setShopName] = useState<string>("MobileShop");
  const [initialShopName, setInitialShopName] = useState<string>("MobileShop");

  const [shopSlug, setShopSlug] = useState<string>("mobileshop");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("theme");
  const [viewport, setViewport] = useState<ViewportMode>("desktop");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<boolean>(false);
  const [storeOrigin, setStoreOrigin] = useState<string>("");

  // Custom Cases state for Tab 5
  const [casesList, setCasesList] = useState<BeforeAfterCase[]>(BEFORE_AFTER_CASES);
  const [initialCasesList, setInitialCasesList] = useState<BeforeAfterCase[]>(BEFORE_AFTER_CASES);

  // Set browser origin on client mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setStoreOrigin(window.location.origin);
    }
  }, []);

  // Load configuration from API on mount
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch("/api/storefront/config");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.config) {
            const loadedConfig: StorefrontConfigData = {
              ...DEFAULT_STOREFRONT_CONFIG,
              ...data.config,
              themeColor: (data.config.themeColor as StorefrontThemeColor) || "emerald",
            };
            setConfig(loadedConfig);
            setInitialConfig(loadedConfig);

            if (data.tenant) {
              if (data.tenant.name) {
                setShopName(data.tenant.name);
                setInitialShopName(data.tenant.name);
              }
              if (data.tenant.slug) setShopSlug(data.tenant.slug);
            }
            if (data.config.customBeforeAfterCases) {
              const safeCases = safeParseBeforeAfterCases(data.config.customBeforeAfterCases);
              if (safeCases && safeCases.length > 0) {
                setCasesList(safeCases);
                setInitialCasesList(safeCases);
              }
            }
          }
        } else {
          setToast({
            message: "ไม่สามารถดึงข้อมูลการตั้งค่าหน้าร้านได้ กรุณาลองใหม่อีกครั้ง",
            type: "error",
          });
        }
      } catch (err) {
        console.error("Failed to load storefront config:", err);
        setToast({
          message: "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์",
          type: "error",
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadConfig();
  }, []);

  // Unsaved changes check
  const isDirty = useMemo(() => {
    if (!initialConfig) return false;
    return (
      shopName.trim() !== initialShopName.trim() ||
      JSON.stringify(config) !== JSON.stringify(initialConfig) ||
      JSON.stringify(casesList) !== JSON.stringify(initialCasesList)
    );
  }, [config, shopName, casesList, initialConfig, initialShopName, initialCasesList]);

  // Prompt before navigating away if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Form Input Validation Rules (Round 1)
  const validationErrors = useMemo(() => {
    const errs: Record<string, string> = {};

    // 1. Shop Display Name
    const trimmedShopName = shopName.trim();
    if (!trimmedShopName) {
      errs.shopName = "กรุณาระบุชื่อร้านค้าที่แสดง (ไม่สามารถเว้นว่างได้)";
    } else if (trimmedShopName.length > 50) {
      errs.shopName = "ชื่อร้านค้าต้องมีความยาวไม่เกิน 50 ตัวอักษร";
    }

    // 2. Hero Headline
    const trimmedHeadline = config.headline?.trim() || "";
    if (trimmedHeadline.length < 5) {
      errs.headline = "ข้อความพาดหัวหลักต้องมีความยาวอย่างน้อย 5 ตัวอักษร";
    } else if (config.headline && config.headline.length > 150) {
      errs.headline = "ข้อความพาดหัวหลักต้องมีความยาวไม่เกิน 150 ตัวอักษร";
    }

    // 3. Hero Subheadline
    if (config.subheadline && config.subheadline.length > 300) {
      errs.subheadline = "ข้อความบรรยายประกอบต้องมีความยาวไม่เกิน 300 ตัวอักษร";
    }

    // 4. Hero Badge
    if (config.badge && config.badge.length > 50) {
      errs.badge = "ป้ายกำกับด้านบนต้องมีความยาวไม่เกิน 50 ตัวอักษร";
    }

    // 5. Announcement Text
    if (config.announcementEnabled) {
      const trimmedAnnounce = config.announcementText?.trim() || "";
      if (!trimmedAnnounce) {
        errs.announcementText = "เมื่อเปิดใช้งานแถบประกาศ กรุณาระบุข้อความประกาศ";
      } else if (config.announcementText && config.announcementText.length > 200) {
        errs.announcementText = "ข้อความประกาศต้องมีความยาวไม่เกิน 200 ตัวอักษร";
      }
    }

    // 6. Phone Number formatting
    if (config.phone && config.phone.trim()) {
      const digitsOnly = config.phone.replace(/[\s-]/g, "");
      const isThaiPhone = /^(0[2-9]\d{7,8}|\+66\d{8,9})$/.test(digitsOnly);
      if (!isThaiPhone) {
        errs.phone = "รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง (เช่น 081-234-5678 หรือ 02-123-4567)";
      }
    }

    // 7. LINE ID validation
    if (config.lineId && config.lineId.trim()) {
      if (/\s/.test(config.lineId)) {
        errs.lineId = "LINE Official Account ID ต้องไม่มีช่องว่าง";
      } else if (config.lineId.length > 30) {
        errs.lineId = "LINE ID ต้องมีความยาวไม่เกิน 30 ตัวอักษร";
      }
    }

    // 8. Google Maps URL validation
    if (config.googleMapsUrl && config.googleMapsUrl.trim()) {
      if (!isValidHttpUrl(config.googleMapsUrl)) {
        errs.googleMapsUrl = "กรุณาระบุ URL แผนที่ที่ถูกต้อง (ขึ้นต้นด้วย https:// หรือ http://)";
      }
    }

    // 9. Line QR Image URL validation
    if (config.lineQrUrl && config.lineQrUrl.trim()) {
      if (!isValidHttpUrl(config.lineQrUrl)) {
        errs.lineQrUrl = "กรุณาระบุ URL รูปภาพที่ถูกต้อง (ขึ้นต้นด้วย https:// หรือ http://)";
      }
    }

    // 10. Cases list validation
    casesList.forEach((c, idx) => {
      if (!c.device?.trim()) {
        errs[`case_${idx}_device`] = `เคสที่ ${idx + 1}: กรุณาระบุชื่อรุ่นอุปกรณ์`;
      }
    });

    return errs;
  }, [shopName, config, casesList]);

  // Tab errors grouping
  const tabErrors = useMemo(() => {
    return {
      theme: Boolean(
        validationErrors.shopName ||
          validationErrors.headline ||
          validationErrors.subheadline ||
          validationErrors.badge
      ),
      announcement: Boolean(validationErrors.announcementText),
      sections: false,
      contact: Boolean(
        validationErrors.phone ||
          validationErrors.lineId ||
          validationErrors.googleMapsUrl ||
          validationErrors.lineQrUrl
      ),
      cases: Object.keys(validationErrors).some((k) => k.startsWith("case_")),
    };
  }, [validationErrors]);

  const hasErrors = Object.keys(validationErrors).length > 0;

  // Phone input formatting on blur
  const handlePhoneBlur = () => {
    if (!config.phone) return;
    const raw = config.phone.trim();
    const digits = raw.replace(/\D/g, "");
    if (digits.length === 10 && digits.startsWith("0")) {
      setConfig((prev) => ({
        ...prev,
        phone: `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`,
      }));
    } else if (digits.length === 9 && digits.startsWith("02")) {
      setConfig((prev) => ({
        ...prev,
        phone: `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5, 9)}`,
      }));
    } else if (digits.length === 9 && digits.startsWith("0")) {
      setConfig((prev) => ({
        ...prev,
        phone: `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}`,
      }));
    }
  };

  // LINE ID trimming
  const handleLineIdChange = (val: string) => {
    const sanitized = val.replace(/\s+/g, "");
    setConfig((prev) => ({ ...prev, lineId: sanitized }));
  };

  // Handle Save
  const handleSave = async () => {
    if (hasErrors) {
      const firstError = Object.values(validationErrors)[0];
      setToast({
        message: `กรุณาแก้ไขข้อผิดพลาดก่อนบันทึก: ${firstError}`,
        type: "error",
      });

      // Auto switch to tab containing first error
      if (tabErrors.theme) setActiveTab("theme");
      else if (tabErrors.announcement) setActiveTab("announcement");
      else if (tabErrors.contact) setActiveTab("contact");
      else if (tabErrors.cases) setActiveTab("cases");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...config,
        shopName: shopName.trim(),
        customBeforeAfterCases: JSON.stringify(casesList),
      };

      const res = await fetch("/api/storefront/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setToast({ message: "บันทึกการตั้งค่าหน้าร้านเรียบร้อยแล้ว!", type: "success" });

        // Synchronize initial baseline
        if (data.config) {
          const freshConfig: StorefrontConfigData = {
            ...DEFAULT_STOREFRONT_CONFIG,
            ...data.config,
            themeColor: (data.config.themeColor as StorefrontThemeColor) || "emerald",
          };
          setConfig(freshConfig);
          setInitialConfig(freshConfig);
        }
        if (data.tenant?.name) {
          setShopName(data.tenant.name);
          setInitialShopName(data.tenant.name);
        }
        setInitialCasesList([...casesList]);
      } else {
        setToast({
          message: data.error || `ไม่สามารถบันทึกข้อมูลได้ (รหัสสถานะ: ${res.status})`,
          type: "error",
        });
      }
    } catch (err) {
      console.error("Save error:", err);
      setToast({
        message: "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ กรุณาตรวจสอบอินเทอร์เน็ต",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to Defaults (Round 1: avoids state desync)
  const handleResetDefaults = () => {
    if (
      window.confirm(
        "คุณต้องการรีเซ็ตการตั้งค่าธีมและส่วนประกอบทั้งหมดกลับเป็นค่าเริ่มต้นมาตรฐานใช่หรือไม่?\n(การเปลี่ยนแปลงจะมีผลเมื่อคลิก 'บันทึกการเปลี่ยนแปลง')"
      )
    ) {
      setConfig({ ...DEFAULT_STOREFRONT_CONFIG });
      setCasesList([...BEFORE_AFTER_CASES]);
      setToast({
        message: "รีเซ็ตค่าเป็นค่ามาตรฐานแล้ว (คลิก 'บันทึกการเปลี่ยนแปลง' เพื่อนำไปใช้จริง)",
        type: "success",
      });
    }
  };

  // Add a new case in Tab 5
  const handleAddNewCase = () => {
    const newCase: BeforeAfterCase = {
      id: `case-${Date.now()}`,
      device: "iPhone 15 Pro Max",
      issue: "กระจกหน้าจอแตกร้าว ทัชสกรีนไม่ตอบสนอง",
      repairSolution: "เปลี่ยนชุดหน้าจอแท้มาตรฐานโรงงาน พร้อมปรับจูน True Tone",
      repairTime: "30 นาที",
      warranty: "รับประกัน 90 วัน",
      beforeImg:
        "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=900&auto=format&fit=crop&q=80",
      beforeDesc: "กระจกหน้าจอแตกร้าวละเอียด สัมผัสค้าง",
      afterImg:
        "https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=900&auto=format&fit=crop&q=80",
      afterDesc: "เปลี่ยนหน้าจอแท้ใหม่กริ๊บ ผ่าน QC 100%",
      pins: [],
    };
    setCasesList((prev) => [...prev, newCase]);
    setToast({ message: "เพิ่มเคสซ่อมตัวอย่างใหม่แล้ว", type: "success" });
  };

  // Copy Store URL with reliable fallback
  const copyStoreUrl = async () => {
    if (!shopSlug) return;
    const origin = storeOrigin || (typeof window !== "undefined" ? window.location.origin : "");
    const url = `${origin}/store/${shopSlug}`;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = url;
        textArea.setAttribute("readonly", "");
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedSlug(true);
      setToast({ message: `คัดลอกลิงก์หน้าร้านเรียบร้อย: ${url}`, type: "success" });
      setTimeout(() => setCopiedSlug(false), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
      setToast({ message: "ไม่สามารถคัดลอกลิงก์ได้ กรุณาคัดลอกด้วยตนเอง", type: "error" });
    }
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
  }, [
    config.showServicesBento,
    config.showLiveTracking,
    config.showInspectionBench,
    config.showPriceEstimator,
    config.showBeforeAfterSlider,
    config.showCustomerReviews,
    config.showLocationSection,
    config.showFaqSection,
  ]);

  if (isLoading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-8 text-center space-y-4">
        <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
        <p className="text-sm text-slate-500 font-medium">กำลังโหลดเครื่องมือปรับแต่งหน้าร้าน...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] min-h-[680px] bg-slate-100/70 -m-4 md:-m-6 lg:-m-8 select-none-safe">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-fade-in shadow-xl max-w-md">
          <div
            className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-xs sm:text-sm font-semibold border ${
              toast.type === "success"
                ? "bg-emerald-950 text-emerald-100 border-emerald-600 shadow-emerald-950/20"
                : toast.type === "warning"
                ? "bg-amber-950 text-amber-100 border-amber-600 shadow-amber-950/20"
                : "bg-rose-950 text-rose-100 border-rose-600 shadow-rose-950/20"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {toast.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : toast.type === "warning" ? (
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              )}
              <span className="truncate">{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              title="ปิดการแจ้งเตือน"
            >
              <X className="h-3.5 w-3.5" />
            </button>
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
              {isDirty && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  ยังไม่บันทึก
                </span>
              )}
            </div>
            {/* Slug URL indicator */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
              <Globe className="h-3 w-3 text-slate-400" />
              <span className="font-mono text-[11px] truncate max-w-[200px] sm:max-w-xs">
                {storeOrigin ? `${storeOrigin}/store/${shopSlug}` : `/store/${shopSlug}`}
              </span>
              <button
                type="button"
                onClick={copyStoreUrl}
                className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors"
                title="คัดลอกลิงก์หน้าร้านจริง"
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
            title="รีเซ็ตการตั้งค่าธีมและส่วนประกอบทั้งหมดกลับสู่ค่ามาตรฐาน"
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
            className={`inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-white text-xs font-semibold shadow-xs transition-all active:scale-95 min-h-[38px] ${
              isSaving
                ? "bg-slate-400 cursor-not-allowed"
                : hasErrors
                ? "bg-rose-600 hover:bg-rose-500"
                : "bg-slate-900 hover:bg-slate-800"
            }`}
            title={hasErrors ? "กรุณาตรวจสอบและแก้ไขข้อผิดพลาดก่อนบันทึก" : "บันทึกการเปลี่ยนแปลงทั้งหมด"}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>กำลังบันทึก...</span>
              </>
            ) : hasErrors ? (
              <>
                <AlertCircle className="h-3.5 w-3.5" />
                <span>มีข้อผิดพลาด ({Object.keys(validationErrors).length})</span>
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
              { id: "theme", label: "ธีม & พาดหัว", icon: Palette, hasErr: tabErrors.theme },
              { id: "announcement", label: "แถบประกาศ", icon: Megaphone, hasErr: tabErrors.announcement },
              { id: "sections", label: "เปิด-ปิดเซกชัน", icon: Layers, hasErr: tabErrors.sections },
              { id: "contact", label: "ติดต่อ & โซเชียล", icon: PhoneCall, hasErr: tabErrors.contact },
              { id: "cases", label: "เคสซ่อมตัวอย่าง", icon: Sliders, hasErr: tabErrors.cases },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as ActiveTab)}
                  className={`relative flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl text-[11px] font-semibold transition-all min-h-[52px] ${
                    isActive
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                      : "text-slate-500 hover:text-slate-900 hover:bg-white/60"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
                  <span className="leading-tight text-center">{tab.label}</span>
                  {tab.hasErr && (
                    <span
                      className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white"
                      title="มีข้อมูลที่ต้องแก้ไขในแท็บนี้"
                    />
                  )}
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
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 block">
                      ชื่อร้านค้าที่แสดง (Shop Display Name) *
                    </label>
                    <span className="text-[11px] font-mono text-slate-400">
                      {shopName.length}/50
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={50}
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className={`w-full text-xs h-10 px-3.5 rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 transition-all font-medium ${
                      validationErrors.shopName
                        ? "border-rose-400 focus:ring-rose-400 focus:border-rose-400 bg-rose-50/20"
                        : "border-slate-300 focus:ring-emerald-500 focus:border-emerald-500"
                    }`}
                    placeholder="เช่น MobileShop Lab Express"
                  />
                  {validationErrors.shopName && (
                    <p className="text-[11px] text-rose-600 flex items-center gap-1 mt-1 font-medium">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{validationErrors.shopName}</span>
                    </p>
                  )}
                </div>

                {/* Hero Badge */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 block">
                      ป้ายกำกับด้านบน (Hero Badge Tag)
                    </label>
                    <span className="text-[11px] font-mono text-slate-400">
                      {(config.badge || "").length}/50
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={50}
                    value={config.badge}
                    onChange={(e) => setConfig({ ...config, badge: e.target.value })}
                    className={`w-full text-xs h-10 px-3.5 rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 transition-all ${
                      validationErrors.badge
                        ? "border-rose-400 focus:ring-rose-400 bg-rose-50/20"
                        : "border-slate-300 focus:ring-emerald-500 focus:border-emerald-500"
                    }`}
                    placeholder="เช่น ศูนย์บริการซ่อมมาตรฐานแล็บ"
                  />
                  {validationErrors.badge && (
                    <p className="text-[11px] text-rose-600 flex items-center gap-1 mt-1 font-medium">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{validationErrors.badge}</span>
                    </p>
                  )}
                </div>

                {/* Hero Headline */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 block">
                      ข้อความพาดหัวหลัก (Hero Main Headline) *
                    </label>
                    <span
                      className={`text-[11px] font-mono ${
                        (config.headline || "").length > 150 ? "text-rose-600 font-bold" : "text-slate-400"
                      }`}
                    >
                      {(config.headline || "").length}/150
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={160}
                    value={config.headline}
                    onChange={(e) => setConfig({ ...config, headline: e.target.value })}
                    className={`w-full text-xs p-3 rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 transition-all leading-relaxed ${
                      validationErrors.headline
                        ? "border-rose-400 focus:ring-rose-400 bg-rose-50/20"
                        : "border-slate-300 focus:ring-emerald-500 focus:border-emerald-500"
                    }`}
                    placeholder="พาดหัวหลักที่ดึงดูดลูกค้าและสร้างความมั่นใจ"
                  />
                  {validationErrors.headline && (
                    <p className="text-[11px] text-rose-600 flex items-center gap-1 mt-1 font-medium">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{validationErrors.headline}</span>
                    </p>
                  )}
                </div>

                {/* Hero Subheadline */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 block">
                      ข้อความบรรยายประกอบ (Hero Subheadline)
                    </label>
                    <span
                      className={`text-[11px] font-mono ${
                        (config.subheadline || "").length > 300 ? "text-rose-600 font-bold" : "text-slate-400"
                      }`}
                    >
                      {(config.subheadline || "").length}/300
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    maxLength={320}
                    value={config.subheadline}
                    onChange={(e) => setConfig({ ...config, subheadline: e.target.value })}
                    className={`w-full text-xs p-3 rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 transition-all leading-relaxed ${
                      validationErrors.subheadline
                        ? "border-rose-400 focus:ring-rose-400 bg-rose-50/20"
                        : "border-slate-300 focus:ring-emerald-500 focus:border-emerald-500"
                    }`}
                    placeholder="คำบรรยายสั้นๆ เกี่ยวกับมาตรฐานและบริการของร้าน"
                  />
                  {validationErrors.subheadline && (
                    <p className="text-[11px] text-rose-600 flex items-center gap-1 mt-1 font-medium">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{validationErrors.subheadline}</span>
                    </p>
                  )}
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
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 block">
                      ข้อความประกาศ (Announcement Text) {config.announcementEnabled && "*"}
                    </label>
                    <span
                      className={`text-[11px] font-mono ${
                        (config.announcementText || "").length > 200 ? "text-rose-600 font-bold" : "text-slate-400"
                      }`}
                    >
                      {(config.announcementText || "").length}/200
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={220}
                    value={config.announcementText}
                    onChange={(e) => setConfig({ ...config, announcementText: e.target.value })}
                    className={`w-full text-xs p-3 rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 transition-all leading-relaxed ${
                      validationErrors.announcementText
                        ? "border-rose-400 focus:ring-rose-400 bg-rose-50/20"
                        : "border-slate-300 focus:ring-emerald-500 focus:border-emerald-500"
                    }`}
                    placeholder="เช่น 🎉 พิเศษ! ตรวจเช็คสภาพเครื่อง 10 จุดฟรี ไม่มีค่าใช้จ่าย พร้อมรับประกันงานซ่อมสูงสุด 1 ปีเต็ม"
                  />
                  {validationErrors.announcementText && (
                    <p className="text-[11px] text-rose-600 flex items-center gap-1 mt-1 font-medium">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{validationErrors.announcementText}</span>
                    </p>
                  )}
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
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 block">
                      เบอร์โทรศัพท์ติดต่อหน้าร้าน (Phone)
                    </label>
                    <span className="text-[11px] text-slate-400">จัดรูปแบบอัตโนมัติ</span>
                  </div>
                  <input
                    type="text"
                    value={config.phone}
                    onChange={(e) => setConfig({ ...config, phone: e.target.value })}
                    onBlur={handlePhoneBlur}
                    className={`w-full text-xs h-10 px-3.5 rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 transition-all font-mono ${
                      validationErrors.phone
                        ? "border-rose-400 focus:ring-rose-400 bg-rose-50/20"
                        : "border-slate-300 focus:ring-emerald-500 focus:border-emerald-500"
                    }`}
                    placeholder="เช่น 02-123-4567 หรือ 081-999-8888"
                  />
                  {validationErrors.phone ? (
                    <p className="text-[11px] text-rose-600 flex items-center gap-1 mt-1 font-medium">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{validationErrors.phone}</span>
                    </p>
                  ) : (
                    <span className="text-[11px] text-slate-400 block">
                      หากไม่ระบุ ปุ่มโทรศัพท์บนหน้าเว็บจะถูกซ่อนอัตโนมัติ
                    </span>
                  )}
                </div>

                {/* LINE ID */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    LINE Official Account ID
                  </label>
                  <input
                    type="text"
                    value={config.lineId}
                    onChange={(e) => handleLineIdChange(e.target.value)}
                    className={`w-full text-xs h-10 px-3.5 rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 transition-all font-mono ${
                      validationErrors.lineId
                        ? "border-rose-400 focus:ring-rose-400 bg-rose-50/20"
                        : "border-slate-300 focus:ring-emerald-500 focus:border-emerald-500"
                    }`}
                    placeholder="เช่น @mobileshophub"
                  />
                  {validationErrors.lineId ? (
                    <p className="text-[11px] text-rose-600 flex items-center gap-1 mt-1 font-medium">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{validationErrors.lineId}</span>
                    </p>
                  ) : (
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <span>ลิงก์ที่จะสร้าง:</span>
                      <code className="text-emerald-700 font-mono bg-emerald-50 px-1 py-0.5 rounded text-[10px]">
                        https://line.me/R/ti/p/~{config.lineId.trim() || "@yourshop"}
                      </code>
                    </div>
                  )}
                </div>

                {/* Google Maps URL */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 block">
                      ลิงก์หมุดแผนที่ (Google Maps Link)
                    </label>
                    {config.googleMapsUrl && !validationErrors.googleMapsUrl && (
                      <a
                        href={config.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-emerald-600 hover:underline flex items-center gap-0.5"
                      >
                        <span>ทดสอบลิงก์</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                  <input
                    type="url"
                    value={config.googleMapsUrl}
                    onChange={(e) => setConfig({ ...config, googleMapsUrl: e.target.value })}
                    className={`w-full text-xs h-10 px-3.5 rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 transition-all font-mono ${
                      validationErrors.googleMapsUrl
                        ? "border-rose-400 focus:ring-rose-400 bg-rose-50/20"
                        : "border-slate-300 focus:ring-emerald-500 focus:border-emerald-500"
                    }`}
                    placeholder="เช่น https://maps.app.goo.gl/..."
                  />
                  {validationErrors.googleMapsUrl ? (
                    <p className="text-[11px] text-rose-600 flex items-center gap-1 mt-1 font-medium">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{validationErrors.googleMapsUrl}</span>
                    </p>
                  ) : (
                    <span className="text-[11px] text-slate-400 block">
                      ลิงก์ไปยังหมุดร้านค้าจริงบน Google Maps เพื่อให้ลูกค้ากดเปิดแผนที่นำทางได้ทันที
                    </span>
                  )}
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
                    className={`w-full text-xs h-10 px-3.5 rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 transition-all font-mono ${
                      validationErrors.lineQrUrl
                        ? "border-rose-400 focus:ring-rose-400 bg-rose-50/20"
                        : "border-slate-300 focus:ring-emerald-500 focus:border-emerald-500"
                    }`}
                    placeholder="เช่น https://example.com/line-qr.png"
                  />
                  {validationErrors.lineQrUrl && (
                    <p className="text-[11px] text-rose-600 flex items-center gap-1 mt-1 font-medium">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{validationErrors.lineQrUrl}</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: Custom Rates & Cases */}
            {activeTab === "cases" && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">เคสซ่อมตัวอย่าง (Before & After Cases)</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      จัดการเคสตัวอย่างสำหรับตัวเลื่อนเปรียบเทียบก่อน-หลังการซ่อม
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddNewCase}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold transition-colors shrink-0 border border-emerald-200"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>เพิ่มเคส</span>
                  </button>
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
                          <span>
                            เคสที่ {cIdx + 1}: {(cItem.device || "เคสซ่อม").split(" ")[0]}{" "}
                            {(cItem.device || "").split(" ")[1] || ""}
                          </span>
                        </span>
                        {casesList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = casesList.filter((_, idx) => idx !== cIdx);
                              setCasesList(updated);
                            }}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                            title="ลบเคสนี้"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block">
                            ชื่อรุ่นอุปกรณ์ *
                          </label>
                          <input
                            type="text"
                            value={cItem.device}
                            onChange={(e) => {
                              const updated = [...casesList];
                              updated[cIdx] = { ...updated[cIdx], device: e.target.value };
                              setCasesList(updated);
                            }}
                            className={`w-full text-xs h-8 px-2.5 rounded-lg border bg-white text-slate-800 ${
                              validationErrors[`case_${cIdx}_device`]
                                ? "border-rose-400 bg-rose-50/20"
                                : "border-slate-200"
                            }`}
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block">
                            อาการแรกเข้า
                          </label>
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
                            <label className="text-[11px] font-semibold text-slate-600 block">
                              ระยะเวลาซ่อม
                            </label>
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
                            <label className="text-[11px] font-semibold text-slate-600 block">
                              การรับประกัน
                            </label>
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
                    onClick={() => setCasesList([...BEFORE_AFTER_CASES])}
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

        {/* RIGHT COLUMN: Live Interactive Responsive Preview (Round 6) */}
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
                {viewport === "desktop"
                  ? "Full Width (100%)"
                  : viewport === "tablet"
                  ? "Width: 768px (iPad Bezel)"
                  : "Width: 375px (iPhone Chassis)"}
              </span>
              <div
                className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"
                title="Live Sync ทำงานตลอดเวลา ไม่มีการรีเฟรชหน้า"
              />
            </div>
          </div>

          {/* Preview Canvas Area with Independent Smooth Scrolling */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 lg:p-8 flex items-start justify-center scroll-smooth min-h-0 bg-slate-200/70">
            {/* Viewport: Desktop Frame */}
            {viewport === "desktop" && (
              <div className="w-full bg-white transition-all duration-300 rounded-2xl shadow-xl overflow-hidden border border-slate-300 flex flex-col max-w-full">
                {/* Desktop Simulated Browser Chrome */}
                <div className="bg-slate-900 text-slate-300 px-4 py-2.5 flex items-center justify-between gap-4 text-xs border-b border-slate-800 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-rose-500/90 shadow-xs" />
                    <span className="h-3 w-3 rounded-full bg-amber-500/90 shadow-xs" />
                    <span className="h-3 w-3 rounded-full bg-emerald-500/90 shadow-xs" />
                  </div>
                  <div className="flex-1 max-w-md mx-auto bg-slate-950 px-3.5 py-1.5 rounded-xl text-center font-mono text-[11px] text-slate-300 truncate border border-slate-800 flex items-center justify-center gap-1.5 shadow-inner">
                    <Lock className="h-3 w-3 text-emerald-400 shrink-0" />
                    <span className="truncate">{storeOrigin || "https://mobileshophub.com"}/store/{shopSlug}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/store/${shopSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-white p-1 rounded transition-colors"
                      title="เปิดในแท็บใหม่"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Rendered Live Storefront */}
                <div className="flex-1 bg-white overflow-x-hidden w-full flex flex-col">
                  {/* Announcement Bar */}
                  {config.announcementEnabled && config.announcementText && (
                    <AnnouncementBar
                      text={config.announcementText}
                      enabled={config.announcementEnabled}
                      themeColor={config.themeColor}
                    />
                  )}

                  {/* Header */}
                  <LandingNavbar
                    shopName={shopName}
                    shopSlug={shopSlug}
                    phone={config.phone}
                    lineId={config.lineId}
                    hiddenSections={hiddenSections}
                  />

                  {/* Hero */}
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

                  {/* Services Bento */}
                  {config.showServicesBento && (
                    <ServicesBento lineId={config.lineId} showEstimate={config.showPriceEstimator} />
                  )}

                  {/* Live Tracking Showcase */}
                  {config.showLiveTracking && <LiveTrackingShowcase />}

                  {/* 10-Point Inspection Standard */}
                  {config.showInspectionBench && (
                    <InspectionStandard
                      showEstimate={config.showPriceEstimator}
                      showBench={config.showInspectionBench}
                      themeColor={config.themeColor}
                    />
                  )}

                  {/* Price Estimator */}
                  {config.showPriceEstimator && (
                    <PriceEstimator phone={config.phone} lineId={config.lineId} themeColor={config.themeColor} />
                  )}

                  {/* Customer Reviews / Slider */}
                  {(config.showBeforeAfterSlider || config.showCustomerReviews) && (
                    <CustomerReviews
                      showSlider={config.showBeforeAfterSlider}
                      showReviews={config.showCustomerReviews}
                      customCases={casesList}
                      themeColor={config.themeColor}
                    />
                  )}

                  {/* Location Section */}
                  {config.showLocationSection && (
                    <ShopLocation
                      shopName={shopName}
                      phone={config.phone}
                      lineId={config.lineId}
                      googleMapsUrl={config.googleMapsUrl}
                      demo={false}
                    />
                  )}

                  {/* FAQ Section */}
                  {config.showFaqSection && <LandingFaq lineId={config.lineId} themeColor={config.themeColor} />}

                  {/* Footer */}
                  <LandingFooter
                    shopName={shopName}
                    phone={config.phone}
                    hiddenSections={hiddenSections}
                  />
                </div>
              </div>
            )}

            {/* Viewport: Tablet Frame (iPad Bezel Mockup) */}
            {viewport === "tablet" && (
              <div className="w-[768px] max-w-[768px] bg-slate-900 p-3 sm:p-4 rounded-[36px] shadow-2xl ring-1 ring-slate-800/80 mx-auto transition-all duration-300 flex flex-col">
                {/* Top Tablet Bezel with Camera Sensor */}
                <div className="flex justify-center pb-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-950 ring-1 ring-slate-700/80" />
                </div>

                {/* Tablet Screen */}
                <div className="bg-white rounded-2xl overflow-hidden border border-slate-700 flex flex-col w-full">
                  {/* Tablet Browser Header */}
                  <div className="bg-slate-900 text-slate-300 px-3.5 py-2 flex items-center justify-between gap-3 text-xs border-b border-slate-800 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                    </div>
                    <div className="flex-1 max-w-sm mx-auto bg-slate-950 px-3 py-1 rounded-lg text-center font-mono text-[11px] text-slate-300 truncate border border-slate-800 flex items-center justify-center gap-1.5">
                      <Lock className="h-2.5 w-2.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{storeOrigin || "https://mobileshophub.com"}/store/{shopSlug}</span>
                    </div>
                  </div>

                  {/* Storefront inside Tablet */}
                  <div className="w-full bg-white overflow-x-hidden flex flex-col">
                    {config.announcementEnabled && config.announcementText && (
                      <AnnouncementBar
                        text={config.announcementText}
                        enabled={config.announcementEnabled}
                        themeColor={config.themeColor}
                      />
                    )}

                    <LandingNavbar
                      shopName={shopName}
                      shopSlug={shopSlug}
                      phone={config.phone}
                      lineId={config.lineId}
                      hiddenSections={hiddenSections}
                    />

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

                    {config.showServicesBento && (
                      <ServicesBento lineId={config.lineId} showEstimate={config.showPriceEstimator} />
                    )}

                    {config.showLiveTracking && <LiveTrackingShowcase />}

                    {config.showInspectionBench && (
                      <InspectionStandard
                        showEstimate={config.showPriceEstimator}
                        showBench={config.showInspectionBench}
                        themeColor={config.themeColor}
                      />
                    )}

                    {config.showPriceEstimator && (
                      <PriceEstimator phone={config.phone} lineId={config.lineId} themeColor={config.themeColor} />
                    )}

                    {(config.showBeforeAfterSlider || config.showCustomerReviews) && (
                      <CustomerReviews
                        showSlider={config.showBeforeAfterSlider}
                        showReviews={config.showCustomerReviews}
                        customCases={casesList}
                        themeColor={config.themeColor}
                      />
                    )}

                    {config.showLocationSection && (
                      <ShopLocation
                        shopName={shopName}
                        phone={config.phone}
                        lineId={config.lineId}
                        googleMapsUrl={config.googleMapsUrl}
                        demo={false}
                      />
                    )}

                    {config.showFaqSection && <LandingFaq lineId={config.lineId} themeColor={config.themeColor} />}

                    <LandingFooter
                      shopName={shopName}
                      phone={config.phone}
                      hiddenSections={hiddenSections}
                    />
                  </div>
                </div>

                {/* Bottom Tablet Bezel Home Indicator */}
                <div className="pt-2 flex justify-center">
                  <div className="h-1 w-32 bg-slate-600/70 rounded-full" />
                </div>
              </div>
            )}

            {/* Viewport: Mobile Frame (iPhone Chassis Mockup) */}
            {viewport === "mobile" && (
              <div className="w-[375px] max-w-[375px] bg-slate-900 p-2.5 rounded-[48px] shadow-2xl ring-1 ring-slate-950 mx-auto transition-all duration-300 relative flex flex-col">
                {/* Mobile Screen Container */}
                <div className="bg-white rounded-[38px] overflow-hidden border border-slate-800 flex flex-col relative w-full">
                  {/* Top Mobile Status Bar with Dynamic Island */}
                  <div className="bg-slate-950 text-white px-5 py-2 flex items-center justify-between text-[11px] font-medium shrink-0 select-none">
                    <span>09:41</span>
                    {/* Dynamic Island Notch */}
                    <div className="h-4 w-20 bg-black rounded-full flex items-center justify-center gap-1.5 px-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-800" />
                      <span className="h-2 w-2 rounded-full bg-slate-900 ring-1 ring-slate-700/50" />
                    </div>
                    {/* Status Icons */}
                    <div className="flex items-center gap-1.5 text-xs">
                      <div className="flex items-end gap-0.5 h-2.5">
                        <span className="w-0.5 h-1 bg-white rounded-2xs" />
                        <span className="w-0.5 h-1.5 bg-white rounded-2xs" />
                        <span className="w-0.5 h-2 bg-white rounded-2xs" />
                        <span className="w-0.5 h-2.5 bg-white rounded-2xs" />
                      </div>
                      <div className="w-4 h-2 border border-white/80 rounded-xs p-0.5 flex items-center">
                        <div className="w-full h-full bg-white rounded-3xs" />
                      </div>
                    </div>
                  </div>

                  {/* Mini Mobile Browser URL Bar */}
                  <div className="bg-slate-900/95 text-slate-300 px-3 py-1 flex items-center justify-between text-[10px] font-mono border-b border-slate-800 shrink-0">
                    <span className="flex items-center gap-1 truncate max-w-[260px]">
                      <Lock className="h-2.5 w-2.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{storeOrigin || "https://mobileshophub.com"}/store/{shopSlug}</span>
                    </span>
                    <RefreshCw className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                  </div>

                  {/* Storefront inside Mobile Frame */}
                  <div className="w-full bg-white overflow-x-hidden flex-1 flex flex-col">
                    {config.announcementEnabled && config.announcementText && (
                      <AnnouncementBar
                        text={config.announcementText}
                        enabled={config.announcementEnabled}
                        themeColor={config.themeColor}
                      />
                    )}

                    <LandingNavbar
                      shopName={shopName}
                      shopSlug={shopSlug}
                      phone={config.phone}
                      lineId={config.lineId}
                      hiddenSections={hiddenSections}
                    />

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

                    {config.showServicesBento && (
                      <ServicesBento lineId={config.lineId} showEstimate={config.showPriceEstimator} />
                    )}

                    {config.showLiveTracking && <LiveTrackingShowcase />}

                    {config.showInspectionBench && (
                      <InspectionStandard
                        showEstimate={config.showPriceEstimator}
                        showBench={config.showInspectionBench}
                        themeColor={config.themeColor}
                      />
                    )}

                    {config.showPriceEstimator && (
                      <PriceEstimator phone={config.phone} lineId={config.lineId} themeColor={config.themeColor} />
                    )}

                    {(config.showBeforeAfterSlider || config.showCustomerReviews) && (
                      <CustomerReviews
                        showSlider={config.showBeforeAfterSlider}
                        showReviews={config.showCustomerReviews}
                        customCases={casesList}
                        themeColor={config.themeColor}
                      />
                    )}

                    {config.showLocationSection && (
                      <ShopLocation
                        shopName={shopName}
                        phone={config.phone}
                        lineId={config.lineId}
                        googleMapsUrl={config.googleMapsUrl}
                        demo={false}
                      />
                    )}

                    {config.showFaqSection && <LandingFaq lineId={config.lineId} themeColor={config.themeColor} />}

                    <LandingFooter
                      shopName={shopName}
                      phone={config.phone}
                      hiddenSections={hiddenSections}
                    />

                    {/* Mobile Quick Bar (pinned at bottom of mobile view with md:hidden override) */}
                    {config.showMobileQuickBar && (
                      <div className="[&_.md\\:hidden]:!block [&>div]:!sticky [&>div]:!bottom-0 z-30 sticky bottom-0">
                        <MobileQuickBar
                          phone={config.phone}
                          lineId={config.lineId}
                          shopSlug={shopSlug}
                          showEstimate={config.showPriceEstimator}
                        />
                      </div>
                    )}
                  </div>

                  {/* Bottom iOS Home Indicator */}
                  <div className="bg-white py-1.5 flex justify-center shrink-0 border-t border-slate-100">
                    <div className="h-1 w-32 bg-slate-400/80 rounded-full" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
