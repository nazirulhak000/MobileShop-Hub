"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { extractTrackingToken, TRACKING_INPUT_ERROR } from "./trackingToken";
import { StorefrontThemeColor, THEME_PALETTES, HeroLayoutType } from "@/lib/storefrontTheme";
import {
  Smartphone,
  Search,
  ArrowRight,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Cpu,
  ChevronRight,
  X,
  Loader2,
  Zap,
  Activity,
  Layers,
  Sparkles,
  Camera,
  BatteryCharging,
  Eye,
  Radio,
  Play,
  Pause,
  CalendarDays,
  UserRound,
} from "lucide-react";

interface HardwareComponent {
  id: number;
  key: string;
  nameTh: string;
  nameEn: string;
  tag: string;
  icon: React.ElementType;
  hotspotPos: { x: number; y: number }; // percentage inside phone frame
  readings: { label: string; value: string; status: "normal" | "verified" | "ideal" }[];
  priceRange: string;
  repairTime: string;
  techDetail: string;
}

const HARDWARE_COMPONENTS: HardwareComponent[] = [
  {
    id: 1,
    key: "screen",
    nameTh: "จอแท้ Super Retina OLED + True Tone",
    nameEn: "Super Retina XDR OLED & EEPROM",
    tag: "ProMotion 120Hz",
    icon: Layers,
    hotspotPos: { x: 50, y: 38 },
    readings: [
      { label: "แรงดันไฟ", value: "3.85V DC", status: "normal" },
      { label: "รีเฟรชเรท", value: "120Hz ProMotion", status: "verified" },
      { label: "True Tone IC", value: "EEPROM Synced", status: "verified" },
      { label: "Multi-Touch", value: "10/10 Points ผ่าน", status: "ideal" },
    ],
    priceRange: "฿2,400 - ฿3,200",
    repairTime: "35 นาที",
    techDetail: "ลอกกระจกสูญญากาศ OCA หรือเปลี่ยนยกชุดแท้ ย้ายชิป IC เดิมไม่ขึ้นแจ้งเตือน Unknown Part",
  },
  {
    id: 2,
    key: "battery",
    nameTh: "แบตเตอรี่ มอก. สุขภาพ 100%",
    nameEn: "TIS Certified Li-ion Cell",
    tag: "มอก. 2217-2548",
    icon: BatteryCharging,
    hotspotPos: { x: 38, y: 64 },
    readings: [
      { label: "สุขภาพแบต", value: "100% Maximum Cap", status: "ideal" },
      { label: "รอบชาร์จ", value: "0 Cycle (ของใหม่)", status: "verified" },
      { label: "แรงดัน Peak", value: "4.45V เสถียร", status: "normal" },
      { label: "NTC Sensor", value: "ตัดความร้อนปกติ", status: "verified" },
    ],
    priceRange: "฿1,190 - ฿1,690",
    repairTime: "25 นาที",
    techDetail: "เซลล์แบตเตอรี่มาตรฐาน มอก. พร้อมใบเซอร์รับรอง บันทึกประวัติและรับประกันสูงสุด 1 ปีเต็ม",
  },
  {
    id: 3,
    key: "motherboard",
    nameTh: "เมนบอร์ด BGA & Power IC",
    nameEn: "BGA Logic Board & Power Management",
    tag: "VDD_MAIN 3.8V",
    icon: Cpu,
    hotspotPos: { x: 68, y: 55 },
    readings: [
      { label: "สแตนด์บาย", value: "0.00A ไม่กินไฟ", status: "ideal" },
      { label: "VDD_MAIN", value: "3.80V เสถียร", status: "normal" },
      { label: "อุณหภูมิชิป", value: "28.4°C นิ่ง", status: "normal" },
      { label: "RF 5G Transceiver", value: "สัญญาณปกติ", status: "verified" },
    ],
    priceRange: "฿1,900 - ฿2,800",
    repairTime: "1 - 2 ชม.",
    techDetail: "ยกวางเม็ด BGA ด้วยเครื่องฮีตเตอร์ควบคุมอุณหภูมิตามโปรไฟล์โรงงาน ปลอดภัยต่อโครงสร้างบอร์ด",
  },
  {
    id: 4,
    key: "camera",
    nameTh: "ชุดกล้อง Dual/Triple Lens & OIS",
    nameEn: "Camera Module & Optical Stabilization",
    tag: "OIS 6-Axis",
    icon: Camera,
    hotspotPos: { x: 32, y: 18 },
    readings: [
      { label: "ระบบกันสั่น", value: "OIS 6-Axis นิ่ง", status: "ideal" },
      { label: "Dual Pixel AF", value: "โฟกัสแม่นยำ 100%", status: "verified" },
      { label: "กระจกเลนส์", value: "Sapphire แท้ไร้ฝุ่น", status: "normal" },
      { label: "การซูมออปติคัล", value: "0.5x - 5x คมชัด", status: "verified" },
    ],
    priceRange: "฿1,250 - ฿2,100",
    repairTime: "30 นาที",
    techDetail: "เปลี่ยนเฉพาะชิ้นเลนส์หรือโมดูลกล้องแท้ ทดสอบในกล่องแสงควบคุมความเข้ม ไม่มีจุดด่างดำหรือสั่นค้าง",
  },
  {
    id: 5,
    key: "charging",
    nameTh: "พอร์ตชาร์จ USB-C / Lightning & IC คุมไฟ",
    nameEn: "Charging Port Flex & Power Delivery IC",
    tag: "PD 20W - 65W",
    icon: Zap,
    hotspotPos: { x: 50, y: 88 },
    readings: [
      { label: "กระแสชาร์จ", value: "9.0V / 2.22A Fast", status: "ideal" },
      { label: "CC Line PD", value: "ตรวจจับโปรโตคอลครบ", status: "verified" },
      { label: "ความต้านทานพอร์ต", value: "0.02Ω ปกติ", status: "normal" },
      { label: "ไมค์สนทนาล่าง", value: "เสียงคมชัด ไม่มีนอยส์", status: "verified" },
    ],
    priceRange: "฿890 - ฿1,490",
    repairTime: "25 นาที",
    techDetail: "เปลี่ยนชุดแพรชาร์จแท้ตรงรุ่น ไมค์สนทนาและเสาสัญญาณครบ ไม่ต้องแปลงสายชาร์จ ชาร์จเร็วเต็มสปีด",
  },
];

interface LandingHeroProps {
  shopName?: string;
  shopSlug?: string;
  logoUrl?: string | null;
  headline?: string | null;
  subheadline?: string | null;
  badge?: string | null;
  themeColor?: StorefrontThemeColor;
  showScanner?: boolean;
  showLiveTracking?: boolean;
  heroLayout?: HeroLayoutType;
}

export function LandingHero({
  shopName = "FixMe ซ่อมมือถือ",
  shopSlug = "fixme-service",
  logoUrl,
  headline,
  subheadline,
  badge,
  themeColor = "blue",
  showScanner = true,
  showLiveTracking = true,
  heroLayout = "split",
}: LandingHeroProps = {}) {
  const theme = THEME_PALETTES[themeColor] || THEME_PALETTES.emerald;
  const [trackingInput, setTrackingInput] = useState("");
  const [inputError, setInputError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Hardware Scanner State
  const [activeComponentId, setActiveComponentId] = useState<number>(1);
  const [isAutoScan, setIsAutoScan] = useState<boolean>(true);
  const [isScanningAnim, setIsScanningAnim] = useState<boolean>(false);
  const autoScanTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeComp =
    HARDWARE_COMPONENTS.find((c) => c.id === activeComponentId) || HARDWARE_COMPONENTS[0];

  // Auto-scan cycle every 4.5 seconds if enabled
  useEffect(() => {
    if (!isAutoScan) return;

    autoScanTimerRef.current = setInterval(() => {
      setIsScanningAnim(true);
      if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
      animTimeoutRef.current = setTimeout(() => {
        setActiveComponentId((prev) => (prev >= 5 ? 1 : prev + 1));
        setIsScanningAnim(false);
      }, 350);
    }, 4500);

    return () => {
      if (autoScanTimerRef.current) {
        clearInterval(autoScanTimerRef.current);
        autoScanTimerRef.current = null;
      }
      if (animTimeoutRef.current) {
        clearTimeout(animTimeoutRef.current);
        animTimeoutRef.current = null;
      }
    };
  }, [isAutoScan]);

  // Clean up all timers on unmount
  useEffect(() => {
    return () => {
      if (autoScanTimerRef.current) clearInterval(autoScanTimerRef.current);
      if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
    };
  }, []);

  const handleSelectComponent = (id: number) => {
    setIsAutoScan(false); // User interaction pauses auto scan
    if (autoScanTimerRef.current) {
      clearInterval(autoScanTimerRef.current);
      autoScanTimerRef.current = null;
    }
    setIsScanningAnim(true);
    if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
    animTimeoutRef.current = setTimeout(() => {
      setActiveComponentId(id);
      setIsScanningAnim(false);
    }, 180);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const token = extractTrackingToken(trackingInput);
    if (!token) {
      setInputError(TRACKING_INPUT_ERROR);
      return;
    }
    setInputError("");
    setIsLoading(true);
    window.location.href = `/track/${token}`;
  };

  const handleClear = () => {
    setTrackingInput("");
    setInputError("");
  };

  const renderHeadlineBlock = (isCentered = false) => (
    <div className={`space-y-6 ${isCentered ? "text-center" : "text-center lg:text-left"}`}>
      {/* Top Pill with Live Pulsing Radar & Brand Logo */}
      <div className={`inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full ${theme.badge.bg} border ${theme.badge.border} ${theme.badge.text} text-xs font-medium shadow-xs ${isCentered ? "mx-auto" : ""}`}>
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={shopName}
            className="h-5 w-5 rounded-md object-cover border border-cyan-400/30 shrink-0"
          />
        ) : (
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${theme.badge.radarPing} opacity-75`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${theme.badge.radarDot}`} />
          </span>
        )}
        <ShieldCheck className={`h-4 w-4 ${theme.iconColor}`} />
        <span>{badge || `ศูนย์บริการซ่อมมาตรฐานแล็บ • ${shopName}`}</span>
      </div>

      {/* Main Headline with Linear-grade gradient accent */}
      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-white tracking-tight leading-[1.2]">
        {headline ? (
          <span>{headline}</span>
        ) : (
          <>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-cyan-300 font-bold">
              FixMe
            </span>{" "}
            ศูนย์บริการซ่อมมือถือด่วนมาตรฐานแล็บ{" "}
            <span className={`text-transparent bg-clip-text bg-gradient-to-r ${theme.gradientText}`}>
              รอรับได้ใน 30 นาที
            </span>
            <br className="hidden sm:inline" />
            {" "}พร้อมระบบ Live Tracking ตรวจสอบได้ 24 ชั่วโมง
          </>
        )}
      </h1>

      {/* Subheading */}
      <p className={`text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl ${isCentered ? "mx-auto" : "mx-auto lg:mx-0"}`}>
        {subheadline ||
          "FixMe ศูนย์บริการซ่อมมือถือด่วนมาตรฐานแล็บวิศวกรรมอิเล็กทรอนิกส์ ตรวจสอบประวัติเครื่องและเลข IMEI 15 หลัก พร้อมระบบ Live Tracking บันทึกภาพถ่ายขั้นตอนซ่อมจริงทุกระยะ ตรวจเช็ควิเคราะห์อาการ 10 จุดก่อนซ่อมโดยไม่มีค่าเปิดเครื่อง"}
      </p>

      {/* Interactive Live Tracking Search Box */}
      {showLiveTracking && (
        <div id="track-search" className={`pt-2 ${isCentered ? "max-w-xl mx-auto text-left" : ""}`}>
          <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-700/80 shadow-lg space-y-3 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white flex items-center gap-2">
                <Search className={`h-4 w-4 ${theme.iconColor}`} />
                <span>ตรวจสอบสถานะงานซ่อม (Live Tracking)</span>
              </span>
              <span className="text-xs text-slate-400 hidden sm:inline">
                สแกน QR หรือวางลิงก์จากใบรับเครื่อง
              </span>
            </div>

            <form onSubmit={handleSearch} className="space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={trackingInput}
                    onChange={(e) => {
                      setTrackingInput(e.target.value);
                      if (inputError) setInputError("");
                    }}
                    placeholder="วางลิงก์ติดตามจากใบรับเครื่อง"
                    className={`w-full min-h-[44px] pl-10 pr-10 text-xs sm:text-sm font-mono rounded-xl border bg-slate-950 text-white placeholder-slate-500 tabular-nums focus:outline-none focus:ring-2 ${theme.accentRing} transition-all duration-150 ${
                      inputError ? "border-rose-400 focus:ring-rose-500" : "border-slate-700 focus:border-slate-500"
                    }`}
                    aria-label="ลิงก์ติดตามงานซ่อมจากใบรับเครื่อง"
                  />
                  <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  {trackingInput && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="absolute right-0 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full text-slate-400 hover:text-white flex items-center justify-center"
                      aria-label="ล้างข้อความ"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className={`min-h-[44px] px-6 text-white font-medium text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 ${theme.accentRing} shrink-0 disabled:opacity-70 shadow-sm ${theme.primaryButton}`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>กำลังค้นหา...</span>
                    </>
                  ) : (
                    <>
                      <span>ตรวจสอบสถานะ</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>

              {inputError && (
                <div className="flex items-center gap-1.5 text-xs text-rose-400 pt-1 text-left">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{inputError}</span>
                </div>
              )}
            </form>

            <p className="text-xs text-slate-400 text-left leading-relaxed">
              ลิงก์ติดตามงานซ่อมจะพิมพ์เป็น QR Code บนใบรับเครื่องทุกใบ สแกนด้วยกล้องมือถือเพื่อดูสถานะได้ทันที
            </p>

            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-400">บริการสำหรับลูกค้า:</span>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/customer"
                  className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-950/70 text-cyan-300 border border-blue-800/80 hover:bg-blue-900/70 transition-colors font-medium"
                >
                  <CalendarDays className="h-3.5 w-3.5 text-cyan-400" />
                  <span>จองคิวซ่อมล่วงหน้า</span>
                </Link>
                <Link
                  href="/customer"
                  className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/90 text-slate-300 border border-slate-700/80 hover:bg-slate-700/90 hover:text-white transition-colors"
                >
                  <UserRound className="h-3.5 w-3.5 text-slate-400" />
                  <span>เข้าสู่ระบบลูกค้า</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3 Trust Badges Grid */}
      <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 ${isCentered ? "max-w-3xl mx-auto" : ""}`}>
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-left">
          <div className={`h-9 w-9 rounded-lg ${theme.darkBg}/60 ${theme.accentText} flex items-center justify-center shrink-0 border ${theme.darkBorder}/60`}>
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white tabular-nums">รับประกัน 90-180 วัน</div>
            <div className="text-xs text-slate-400">อะไหล่มาตรฐาน มอก. มีใบเซอร์</div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-left">
          <div className={`h-9 w-9 rounded-lg ${theme.darkBg}/70 ${theme.accentText} flex items-center justify-center shrink-0 border ${theme.darkBorder}/60`}>
            <Clock className={`h-5 w-5 ${theme.iconColor}`} />
          </div>
          <div>
            <div className="text-xs font-semibold text-white flex items-center gap-1.5">
              <span>ตรวจเช็กฟรี 0 บาท</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-blue-500/20 text-cyan-300 border border-cyan-400/30 animate-pulse">
                ฟรี 0.-
              </span>
            </div>
            <div className="text-xs text-slate-400">วิเคราะห์ 10 รายการ ไม่ซ่อมไม่คิดเงิน 0.-</div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-left">
          <div className="h-9 w-9 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 border border-slate-700">
            <Cpu className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white tabular-nums">ช่างชำนาญการกว่า 10 ปี</div>
            <div className="text-xs text-slate-400">ห้องแล็บควบคุมไฟฟ้าสถิต ESD</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderScannerCard = () => (
    <div className="rounded-3xl bg-slate-900/90 p-5 sm:p-6 border border-slate-700/80 shadow-2xl relative overflow-hidden backdrop-blur-md">
      {/* Header with status & Auto Scan switch */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${theme.badge.radarPing} opacity-75`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${theme.badge.radarDot}`} />
          </span>
          <div>
            <span className={`text-xs font-mono tracking-wider uppercase ${theme.accentText} font-semibold flex items-center gap-1.5`}>
              <Activity className="h-3.5 w-3.5" />
              <span>LIVE HARDWARE SCANNER</span>
            </span>
            <p className="text-[11px] text-slate-400 font-mono hidden sm:block">
              สถานะสแกนโครงสร้างเมนบอร์ดและโมดูลอะไหล่แท้ Real-time
            </p>
          </div>
        </div>

        {/* Auto Scan Toggle Button (>= 44px touch target) */}
        <button
          type="button"
          onClick={() => setIsAutoScan((prev) => !prev)}
          className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-mono flex items-center gap-2 border transition-colors ${
            isAutoScan
              ? `${theme.badge.bg} ${theme.badge.text} ${theme.badge.border}`
              : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
          }`}
          title={isAutoScan ? "คลิกเพื่อหยุดหมุนเวียนอัตโนมัติ" : "คลิกเพื่อให้หมุนเวียนสแกนอัตโนมัติ"}
          aria-label={isAutoScan ? "หยุดหมุนเวียนสแกนอัตโนมัติ" : "เปิดหมุนเวียนสแกนอัตโนมัติ"}
        >
          {isAutoScan ? (
            <>
              <Pause className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Auto-Scan ON</span>
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Auto-Scan OFF</span>
            </>
          )}
        </button>
      </div>

      {/* Main Teardown Visual + Telemetry Spec Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 pt-4 items-center">
        {/* Left: Interactive Smartphone Chassis Blueprint */}
        <div className="sm:col-span-6 flex justify-center">
          <div className="relative w-48 h-80 sm:w-52 sm:h-88 rounded-[38px] border-4 border-slate-700 bg-slate-950 p-2 shadow-2xl flex flex-col items-center justify-between overflow-hidden">
            {/* Dynamic Radar Sweep Animation Layer (Hardware Scanner effect) */}
            <div
              className="absolute inset-0 pointer-events-none opacity-40 z-20 animate-radar-sweep"
              style={{
                background: `linear-gradient(180deg, transparent 0%, ${theme.hex}55 50%, transparent 100%)`,
                height: "60px",
              }}
            />

            {/* Top Speaker / Dynamic Island notch */}
            <div className="w-20 h-4 bg-slate-900 rounded-full border border-slate-800 z-10 flex items-center justify-center">
              <div className="h-1.5 w-1.5 rounded-full bg-slate-700" />
            </div>

            {/* Teardown Chassis Modules Layout */}
            <div className="absolute inset-4 rounded-[26px] bg-slate-900/60 border border-slate-800/80 p-2 flex flex-col justify-between overflow-hidden">
              {/* Motherboard BGA Chips Area (Hotspot 3) */}
              <div
                onClick={() => handleSelectComponent(3)}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  activeComponentId === 3
                    ? `${theme.badge.bg} ${theme.badge.border} ring-1 ring-cyan-400`
                    : "bg-slate-950/70 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span className="flex items-center gap-1">
                    <Cpu className="h-3 w-3 text-cyan-400" />
                    <span>LOGIC BOARD BGA</span>
                  </span>
                  <span className="text-emerald-400 text-[9px]">NORMAL</span>
                </div>
              </div>

              {/* Triple Camera OIS Module Area (Hotspot 4) */}
              <div
                onClick={() => handleSelectComponent(4)}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                  activeComponentId === 4
                    ? `${theme.badge.bg} ${theme.badge.border} ring-1 ring-cyan-400`
                    : "bg-slate-950/50 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                  <span className="flex items-center gap-1">
                    <Camera className="h-2.5 w-2.5 text-cyan-400" />
                    <span>TRIPLE CAM OIS</span>
                  </span>
                  <span className="text-emerald-400 text-[8px]">PASS</span>
                </div>
              </div>

              {/* High Capacity Battery Cell Module (Hotspot 2) */}
              <div
                onClick={() => handleSelectComponent(2)}
                className={`my-1 p-3 rounded-xl border transition-all cursor-pointer flex-1 flex flex-col justify-center ${
                  activeComponentId === 2
                    ? `${theme.badge.bg} ${theme.badge.border} ring-1 ring-cyan-400`
                    : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span className="flex items-center gap-1">
                    <BatteryCharging className="h-3 w-3 text-amber-400" />
                    <span>TIS BATTERY 100%</span>
                  </span>
                  <span className="text-emerald-400 text-[9px]">0 CYCLE</span>
                </div>
                <div className="mt-1 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 w-full" />
                </div>
              </div>

              {/* Bottom Charging Flex & Mic Area (Hotspot 5) */}
              <div
                onClick={() => handleSelectComponent(5)}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                  activeComponentId === 5
                    ? `${theme.badge.bg} ${theme.badge.border} ring-1 ring-cyan-400`
                    : "bg-slate-950/50 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                  <span className="flex items-center gap-1">
                    <Zap className="h-2.5 w-2.5 text-amber-400" />
                    <span>USB-C / PD IC</span>
                  </span>
                  <span className="text-emerald-400 text-[8px]">FAST 20W</span>
                </div>
              </div>
            </div>

            {/* Display OLED Glass Overlay indicator (Hotspot 1) */}
            <button
              type="button"
              onClick={() => handleSelectComponent(1)}
              className={`absolute top-6 right-2 p-1 px-1.5 rounded-md text-[9px] font-mono border z-20 transition-all ${
                activeComponentId === 1
                  ? `${theme.badge.bg} ${theme.badge.text} ${theme.badge.border}`
                  : "bg-slate-950/80 text-slate-400 border-slate-800"
              }`}
            >
              [1] OLED Display
            </button>

            {/* 5 Physical Teardown Hotspots with >= 44px touch targets */}
            <div className="absolute inset-0 pointer-events-auto">
              {HARDWARE_COMPONENTS.map((comp) => {
                const isSelected = comp.id === activeComponentId;
                return (
                  <button
                    key={comp.id}
                    type="button"
                    onClick={() => handleSelectComponent(comp.id)}
                    style={{
                      left: `${comp.hotspotPos.x}%`,
                      top: `${comp.hotspotPos.y}%`,
                    }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-full z-30"
                    aria-label={`เลือกตรวจเช็ค: ${comp.nameTh}`}
                    title={comp.nameTh}
                  >
                    <span className="relative flex items-center justify-center">
                      {isSelected && (
                        <span
                          className="animate-ping absolute inline-flex h-8 w-8 rounded-full opacity-60"
                          style={{ backgroundColor: theme.hex }}
                        />
                      )}
                      <span
                        className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold shadow-lg border ${
                          isSelected
                            ? "text-slate-950 border-white ring-2"
                            : "bg-slate-900 text-white border-slate-600 hover:border-slate-400"
                        }`}
                        style={isSelected ? { backgroundColor: theme.hex, borderColor: "#ffffff" } : undefined}
                      >
                        {comp.id}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Component Diagnostic Telemetry Readings */}
        <div className="sm:col-span-6 space-y-3">
          {/* Active Component Title & Tag */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${theme.darkBg} ${theme.badge.text} border ${theme.darkBorder} flex items-center gap-1`}>
                <activeComp.icon className="h-3 w-3" />
                จุดตรวจที่ [{activeComp.id}/5]
              </span>
              <span className="text-xs font-mono text-cyan-400 font-medium">
                {activeComp.tag}
              </span>
            </div>

            <h4 className="text-sm font-semibold text-white leading-tight">
              {activeComp.nameTh}
            </h4>
            <p className="text-[11px] font-mono text-slate-400">
              {activeComp.nameEn}
            </p>
          </div>

          {/* 4 Telemetry Metrics */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {activeComp.readings.map((reading, rIdx) => (
              <div
                key={rIdx}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-0.5"
              >
                <div className="text-[11px] text-slate-400 font-mono">
                  {reading.label}
                </div>
                <div className={`text-xs font-semibold font-mono ${theme.accentText} tabular-nums flex items-center gap-1`}>
                  <CheckCircle2 className={`h-3 w-3 ${theme.iconColor} shrink-0`} />
                  <span className="truncate">{reading.value}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Estimated Price & Time */}
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between text-xs">
            <div>
              <div className="text-slate-400 text-[11px]">ประเมินราคาซ่อม:</div>
              <div className="text-sm font-semibold font-mono text-white tabular-nums">
                {activeComp.priceRange}
              </div>
            </div>
            <div className="text-right">
              <div className="text-slate-400 text-[11px]">เวลาที่ใช้:</div>
              <div className={`text-xs font-semibold font-mono ${theme.accentText} tabular-nums`}>
                {activeComp.repairTime}
              </div>
            </div>
          </div>

          {/* Tech explanation */}
          <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
            💡 {activeComp.techDetail}
          </p>

          {/* Component Selector Pills (>= 44px touch targets) */}
          <div className="flex items-center gap-2 pt-1 overflow-x-auto pb-1" role="tablist">
            {HARDWARE_COMPONENTS.map((c) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={c.id === activeComponentId}
                onClick={() => handleSelectComponent(c.id)}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-mono transition-colors shrink-0 border flex items-center justify-center gap-1.5 ${
                  c.id === activeComponentId
                    ? theme.activePill
                    : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                <span className="font-semibold">[{c.id}]</span>
                <span>{c.key}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom 3 Live Counter Stats */}
      <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-3 gap-2 text-center">
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
          <div className={`text-base sm:text-lg font-semibold text-white font-mono tabular-nums text-transparent bg-clip-text bg-gradient-to-r ${theme.gradientText}`}>
            15,840+
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">เครื่องซ่อมสำเร็จ</div>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
          <div className="text-base sm:text-lg font-semibold text-amber-300 font-mono tabular-nums">
            99.6%
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">ดัชนีความพึงพอใจ</div>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
          <div className={`text-base sm:text-lg font-semibold ${theme.accentText} font-mono tabular-nums`}>
            32 นาที
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">เวลาเฉลี่ยส่งมอบ</div>
        </div>
      </div>
    </div>
  );

  return (
    <section className="relative bg-slate-950 text-white pt-10 pb-16 lg:pt-16 lg:pb-24 overflow-hidden border-b border-slate-800">
      {/* Subtle blueprint grid overlay */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, ${theme.hex}66 1px, transparent 0)`,
          backgroundSize: "28px 28px",
        }}
      />
      {/* Ambient background glow */}
      <div
        className="absolute -top-32 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{ backgroundColor: `${theme.hex}1a` }}
      />
      <div
        className="absolute top-1/2 -right-20 w-80 h-80 rounded-full blur-3xl pointer-events-none"
        style={{ backgroundColor: `${theme.hex}14` }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {heroLayout === "centered" ? (
          <div className="max-w-4xl mx-auto text-center space-y-6">
            {renderHeadlineBlock(true)}
            {showScanner && (
              <div className="pt-8 max-w-3xl mx-auto text-left">
                {renderScannerCard()}
              </div>
            )}
          </div>
        ) : heroLayout === "banner" ? (
          <div className="p-6 sm:p-10 rounded-3xl bg-slate-900/80 border border-slate-700/80 shadow-2xl backdrop-blur-md relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className={`${showScanner ? "lg:col-span-6 xl:col-span-7" : "lg:col-span-12"} space-y-6 text-center lg:text-left`}>
                {renderHeadlineBlock(false)}
              </div>
              {showScanner && (
                <div className="lg:col-span-6 xl:col-span-5 space-y-4">
                  {renderScannerCard()}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className={`${showScanner ? "lg:col-span-6 text-center lg:text-left" : "lg:col-span-10 lg:mx-auto text-center"} space-y-6`}>
              {renderHeadlineBlock(false)}
            </div>
            {showScanner && (
              <div className="lg:col-span-6 space-y-4">
                {renderScannerCard()}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}


