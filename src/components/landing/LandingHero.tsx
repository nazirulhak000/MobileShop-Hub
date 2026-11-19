"use client";

import React, { useState, useEffect, useRef } from "react";
import { extractTrackingToken, TRACKING_INPUT_ERROR } from "./trackingToken";
import { StorefrontThemeColor, THEME_PALETTES } from "@/lib/storefrontTheme";
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
    key: "faceid",
    nameTh: "เซนเซอร์ Face ID / True Tone",
    nameEn: "TrueDepth & Dot Projector",
    tag: "30,000 จุด IR",
    icon: Eye,
    hotspotPos: { x: 50, y: 14 },
    readings: [
      { label: "Dot Projector", value: "30,000 จุด IR", status: "verified" },
      { label: "Flood Illuminator", value: "Active พร้อมใช้", status: "normal" },
      { label: "ความเร็วสแกน", value: "< 0.28 วินาที", status: "ideal" },
      { label: "Flex Cable", value: "ไม่ขาด ไม่ช็อต", status: "verified" },
    ],
    priceRange: "฿1,500 - ฿2,200",
    repairTime: "45 นาที",
    techDetail: "ซ่อมแซมเส้นพริ้นท์ Face ID เดิม ไม่ต้องเปลี่ยนยกชุด เซฟค่าใช้จ่ายและคงฟังก์ชันสแกนหน้าเดิม",
  },
  {
    id: 5,
    key: "camera",
    nameTh: "ชุดกล้อง Dual/Triple Lens & OIS",
    nameEn: "Camera Module & Optical Stabilization",
    tag: "OIS 6-Axis",
    icon: Camera,
    hotspotPos: { x: 32, y: 22 },
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
];

interface LandingHeroProps {
  shopName?: string;
  shopSlug?: string;
  headline?: string | null;
  subheadline?: string | null;
  badge?: string | null;
  themeColor?: StorefrontThemeColor;
  showScanner?: boolean;
  showLiveTracking?: boolean;
}

export function LandingHero({
  shopName = "MobileShop-Hub",
  shopSlug = "mobileshop",
  headline,
  subheadline,
  badge,
  themeColor = "emerald",
  showScanner = true,
  showLiveTracking = true,
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

  const activeComp =
    HARDWARE_COMPONENTS.find((c) => c.id === activeComponentId) || HARDWARE_COMPONENTS[0];

  // Auto-scan cycle every 4.5 seconds if enabled
  useEffect(() => {
    if (!isAutoScan) return;

    autoScanTimerRef.current = setInterval(() => {
      setIsScanningAnim(true);
      setTimeout(() => {
        setActiveComponentId((prev) => (prev >= 5 ? 1 : prev + 1));
        setIsScanningAnim(false);
      }, 350);
    }, 4500);

    return () => {
      if (autoScanTimerRef.current) clearInterval(autoScanTimerRef.current);
    };
  }, [isAutoScan]);

  const handleSelectComponent = (id: number) => {
    setIsAutoScan(false); // User interaction pauses auto scan
    setIsScanningAnim(true);
    setTimeout(() => {
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

  return (
    <section className="relative bg-slate-950 text-white pt-10 pb-16 lg:pt-16 lg:pb-24 overflow-hidden border-b border-slate-800">
      {/* Subtle blueprint grid overlay */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(16, 185, 129, 0.4) 1px, transparent 0)`,
          backgroundSize: "28px 28px",
        }}
      />
      {/* Ambient background glow */}
      <div className="absolute -top-32 left-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-20 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column: Headlines, Trust Badges, Interactive Search */}
          <div className={`${showScanner ? "lg:col-span-6 text-center lg:text-left" : "lg:col-span-10 lg:mx-auto text-center"} space-y-6`}>
            {/* Top Pill with Live Pulsing Radar */}
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${theme.badge.bg} border ${theme.badge.border} ${theme.badge.text} text-xs font-medium shadow-xs`}>
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${theme.badge.radarPing} opacity-75`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${theme.badge.radarDot}`} />
              </span>
              <ShieldCheck className={`h-4 w-4 ${theme.iconColor}`} />
              <span>{badge || `ศูนย์บริการซ่อมมาตรฐานแล็บ • ${shopName}`}</span>
            </div>

            {/* Main Headline with Linear-grade gradient accent */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-white tracking-tight leading-[1.2]">
              {headline ? (
                <span>{headline}</span>
              ) : (
                <>
                  บริการซ่อมมือถือด่วนมาตรฐานแล็บ{" "}
                  <span className={`text-transparent bg-clip-text bg-gradient-to-r ${theme.gradientText}`}>
                    รอรับใน 30 นาที
                  </span>
                  <br className="hidden sm:inline" />
                  {" "}พร้อมระบบ Live Tracking ตรวจสอบได้ 24 ชั่วโมง
                </>
              )}
            </h1>

            {/* Subheading */}
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto lg:mx-0">
              {subheadline ||
                "ศูนย์บริการซ่อมสมาร์ตโฟนด้วยเครื่องมือวัดทางวิศวกรรมอิเล็กทรอนิกส์ ตรวจสอบประวัติเครื่องและเลข IMEI 15 หลัก พร้อมระบบ Live Tracking บันทึกภาพถ่ายขั้นตอนซ่อมจริงทุกระยะ ตรวจเช็ควิเคราะห์อาการ 10 จุดก่อนซ่อมโดยไม่มีค่าเปิดเครื่อง"}
            </p>

            {/* Interactive Live Tracking Search Box */}
            {showLiveTracking && (
              <div id="track-search" className="pt-2">
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
                          className={`w-full min-h-[44px] pl-10 pr-10 text-xs sm:text-sm font-mono rounded-xl border bg-slate-950 text-white placeholder-slate-500 tabular-nums focus:outline-none focus:ring-2 ${theme.accentRing} focus:border-emerald-500 transition-all duration-150 ${
                            inputError ? "border-rose-400 focus:ring-rose-500" : "border-slate-700"
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
                </div>
              </div>
            )}

            {/* 3 Trust Badges Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-left">
                <div className="h-9 w-9 rounded-lg bg-emerald-950/60 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-800/60">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white tabular-nums">รับประกัน 90-180 วัน</div>
                  <div className="text-xs text-slate-400">อะไหล่มาตรฐาน มอก. มีใบเซอร์</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-left">
                <div className="h-9 w-9 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 border border-slate-700">
                  <Clock className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">ตรวจเช็ควิเคราะห์ฟรี</div>
                  <div className="text-xs text-slate-400">แจ้งราคาก่อน ไม่ซ่อมไม่คิดเงิน</div>
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

          {/* Right Column: Interactive Hardware Teardown & Live Diagnostic Scanner */}
          {showScanner && (
            <div className="lg:col-span-6 space-y-4">
            <div className="rounded-3xl bg-slate-900/90 p-5 sm:p-6 border border-slate-700/80 shadow-2xl relative overflow-hidden backdrop-blur-md">
              {/* Header with status & Auto Scan switch */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                  <div>
                    <span className="text-xs font-mono tracking-wider uppercase text-emerald-400 font-semibold flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5" />
                      Hardware Teardown & Diagnostic Scanner
                    </span>
                    <span className="text-[11px] text-slate-400 block sm:inline sm:ml-2">
                      แตะเลือกจุดตรวจสอบเพื่อดูผลวิเคราะห์
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAutoScan(!isAutoScan)}
                  className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-colors border ${
                    isAutoScan
                      ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                      : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                  }`}
                  title="เปิด/ปิดการสแกนอัตโนมัติ"
                >
                  {isAutoScan ? (
                    <>
                      <Pause className="h-3 w-3" /> Auto
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3" /> Auto
                    </>
                  )}
                </button>
              </div>

              {/* Main Interactive Stage: Smartphone Frame + Hotspot Pins */}
              <div className="pt-4 pb-2 grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                {/* Left/Center: Realistic Smartphone Chassis Frame */}
                <div className="sm:col-span-6 flex justify-center relative">
                  <div className="relative w-[210px] sm:w-[220px] aspect-[9/18.5] rounded-[2.5rem] bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 p-2 shadow-2xl border border-slate-600/60 ring-1 ring-white/10 group">
                    {/* Titanium outer chamfer bezel */}
                    <div className="w-full h-full rounded-[2.1rem] bg-slate-950 relative overflow-hidden border border-slate-800 flex flex-col justify-between">
                      {/* Blueprint Circuit traces SVG */}
                      <svg
                        className="absolute inset-0 w-full h-full opacity-35 pointer-events-none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <defs>
                          <pattern
                            id="pcb-pattern"
                            width="24"
                            height="24"
                            patternUnits="userSpaceOnUse"
                          >
                            <path
                              d="M 12 0 L 12 24 M 0 12 L 24 12"
                              fill="none"
                              stroke="#0d9488"
                              strokeWidth="0.5"
                              strokeDasharray="2,4"
                            />
                            <circle cx="12" cy="12" r="1.5" fill="#10b981" />
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#pcb-pattern)" />
                        {/* Motherboard trace lines */}
                        <path
                          d="M 30 50 L 80 50 L 110 80 L 110 160 L 150 200"
                          fill="none"
                          stroke="#34d399"
                          strokeWidth="1.2"
                          strokeDasharray="4,4"
                        />
                        <path
                          d="M 170 80 L 140 110 L 140 220 L 90 270"
                          fill="none"
                          stroke="#22d3ee"
                          strokeWidth="1.2"
                        />
                      </svg>

                      {/* Dynamic Island / Top Notch */}
                      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-900 rounded-full z-20 flex items-center justify-between px-2 border border-slate-700/60 shadow-inner">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-700" />
                      </div>

                      {/* Radar Laser Scanning Sweep Line */}
                      <div
                        className={`absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent z-10 opacity-75 shadow-[0_0_12px_#10b981] pointer-events-none transition-all duration-700 ${
                          isScanningAnim ? "translate-y-64" : "translate-y-8"
                        }`}
                        style={{
                          animation: "radarSweep 3s ease-in-out infinite alternate",
                        }}
                      />

                      {/* Internal Component Blueprint Silhouettes */}
                      {/* Top Camera Module */}
                      <div
                        onClick={() => handleSelectComponent(5)}
                        className={`absolute top-8 left-3 w-16 h-18 rounded-xl border p-1 cursor-pointer transition-all ${
                          activeComponentId === 5
                            ? "border-emerald-400 bg-emerald-950/40 shadow-[0_0_15px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400"
                            : "border-slate-700/80 bg-slate-900/60 hover:border-slate-500"
                        }`}
                      >
                        <div className="text-[9px] font-mono text-slate-400 flex items-center gap-1">
                          <Camera className="h-2.5 w-2.5 text-cyan-400" /> Triple OIS
                        </div>
                        <div className="grid grid-cols-2 gap-1 mt-1">
                          <div className="h-4 w-4 rounded-full border border-slate-600 bg-slate-950 mx-auto" />
                          <div className="h-4 w-4 rounded-full border border-slate-600 bg-slate-950 mx-auto" />
                          <div className="h-4 w-4 rounded-full border border-slate-600 bg-slate-950 mx-auto col-span-2" />
                        </div>
                      </div>

                      {/* Logic Board BGA Chip */}
                      <div
                        onClick={() => handleSelectComponent(3)}
                        className={`absolute top-28 right-3 w-16 h-20 rounded-xl border p-1 cursor-pointer transition-all ${
                          activeComponentId === 3
                            ? "border-emerald-400 bg-emerald-950/40 shadow-[0_0_15px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400"
                            : "border-slate-700/80 bg-slate-900/60 hover:border-slate-500"
                        }`}
                      >
                        <div className="text-[9px] font-mono text-emerald-400 flex items-center gap-1">
                          <Cpu className="h-2.5 w-2.5" /> BGA IC
                        </div>
                        <div className="mt-1 h-10 rounded bg-slate-950 border border-slate-800 p-1 flex items-center justify-center text-[9px] font-mono text-cyan-300">
                          3.85V OK
                        </div>
                      </div>

                      {/* High Capacity Battery Block */}
                      <div
                        onClick={() => handleSelectComponent(2)}
                        className={`absolute bottom-10 left-3 w-24 h-40 rounded-xl border p-1.5 cursor-pointer transition-all ${
                          activeComponentId === 2
                            ? "border-emerald-400 bg-emerald-950/40 shadow-[0_0_15px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400"
                            : "border-slate-700/80 bg-slate-900/60 hover:border-slate-500"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[9px] font-mono text-slate-300">
                          <span className="flex items-center gap-1">
                            <BatteryCharging className="h-3 w-3 text-emerald-400" /> TIS มอก.
                          </span>
                          <span className="text-emerald-400 font-bold">100%</span>
                        </div>
                        <div className="h-24 mt-2 rounded bg-slate-950/90 border border-slate-800 p-1 flex flex-col justify-center items-center text-[8px] font-mono text-slate-400 space-y-1">
                          <div className="text-white font-semibold">4,450 mAh</div>
                          <div className="text-emerald-400">0 Cycle New</div>
                          <div className="text-[8px] text-slate-500">Li-ion Polymer</div>
                        </div>
                      </div>

                      {/* Display / True Tone Overlay */}
                      <div
                        onClick={() => handleSelectComponent(1)}
                        className={`absolute inset-x-2 top-2 bottom-2 rounded-[1.8rem] border border-dashed transition-all pointer-events-none ${
                          activeComponentId === 1
                            ? "border-emerald-400/80 bg-emerald-500/5 shadow-[inset_0_0_20px_rgba(16,185,129,0.2)]"
                            : "border-transparent"
                        }`}
                      />

                      {/* Hotspot Interactive Action Pins */}
                      {HARDWARE_COMPONENTS.map((comp) => {
                        const isSelected = comp.id === activeComponentId;
                        return (
                          <button
                            key={comp.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectComponent(comp.id);
                            }}
                            className={`absolute -translate-x-1/2 -translate-y-1/2 z-30 transition-transform duration-200 focus:outline-none ${
                              isSelected ? "scale-125" : "hover:scale-110"
                            }`}
                            style={{
                              left: `${comp.hotspotPos.x}%`,
                              top: `${comp.hotspotPos.y}%`,
                            }}
                            aria-label={`ดูผลตรวจเช็ค ${comp.nameTh}`}
                          >
                            <span className="relative flex items-center justify-center">
                              {isSelected && (
                                <span className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-emerald-400 opacity-60" />
                              )}
                              <span
                                className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold shadow-lg border ${
                                  isSelected
                                    ? "bg-emerald-500 text-slate-950 border-white ring-2 ring-emerald-400"
                                    : "bg-slate-900 text-white border-slate-600 hover:border-emerald-400"
                                }`}
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
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
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
                        <div className="text-xs font-semibold font-mono text-emerald-400 tabular-nums flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
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
                      <div className="text-xs font-semibold font-mono text-emerald-400 tabular-nums">
                        {activeComp.repairTime}
                      </div>
                    </div>
                  </div>

                  {/* Tech explanation */}
                  <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
                    💡 {activeComp.techDetail}
                  </p>

                  {/* Component Selector Pills */}
                  <div className="flex items-center gap-1.5 pt-1 overflow-x-auto pb-1" role="tablist">
                    {HARDWARE_COMPONENTS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectComponent(c.id)}
                        className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-mono transition-colors shrink-0 border ${
                          c.id === activeComponentId
                            ? "bg-emerald-600 text-white border-emerald-400 shadow-xs"
                            : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                        }`}
                      >
                        [{c.id}] {c.key}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom 3 Live Counter Stats */}
              <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <div className="text-base sm:text-lg font-semibold text-white font-mono tabular-nums text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
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
                  <div className="text-base sm:text-lg font-semibold text-emerald-400 font-mono tabular-nums">
                    32 นาที
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">เวลาเฉลี่ยส่งมอบ</div>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Embedded CSS Keyframes for subtle radar sweep */}
      <style jsx>{`
        @keyframes radarSweep {
          0% {
            top: 5%;
            opacity: 0.8;
          }
          50% {
            opacity: 1;
          }
          100% {
            top: 92%;
            opacity: 0.8;
          }
        }
      `}</style>
    </section>
  );
}


