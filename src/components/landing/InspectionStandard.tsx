"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  Smartphone,
  Eye,
  Camera,
  Volume2,
  Mic,
  BatteryCharging,
  Wifi,
  Sliders,
  Vibrate,
  Droplets,
  FileCheck,
  Activity,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Zap,
} from "lucide-react";

import { StorefrontThemeColor, THEME_PALETTES } from "@/lib/storefrontTheme";

interface InspectionItem {
  id: number;
  title: string;
  category: string;
  icon: React.ElementType;
  preCheckDesc: string;
  postCheckDesc: string;
  specStandard: string;
  benchType?: "touch" | "audio" | "battery" | "faceid" | "camera";
}

const INSPECTION_POINTS: InspectionItem[] = [
  {
    id: 1,
    title: "หน้าจอสัมผัสและ True Tone",
    category: "Display & Multi-Touch",
    icon: Smartphone,
    preCheckDesc: "ลากไอคอนรอบจอทดสอบจุดบอด Dead Pixel และความเพี้ยนของสีสัน",
    postCheckDesc: "ย้ายรหัส True Tone ครบถ้วน ตรวจสอบ ProMotion 120Hz และทัชสกรีน 100%",
    specStandard: "Multi-touch 10 จุด • ขอบเขตสี DCI-P3 ครบถ้วน",
    benchType: "touch",
  },
  {
    id: 2,
    title: "ระบบความปลอดภัย Face ID และสแกนนิ้ว",
    category: "Biometric Security",
    icon: Eye,
    preCheckDesc: "ตรวจการทำงานของกล้อง TrueDepth หรือเซนเซอร์สแกนลายนิ้วมือใต้จอ",
    postCheckDesc: "ทดสอบการปลดล็อค Face ID ในทุกมุมองศาและระยะตรวจจับ",
    specStandard: "ปลดล็อคใน <0.3 วินาที • ไม่มีข้อความแจ้งเตือนฟังก์ชันขัดข้อง",
    benchType: "faceid",
  },
  {
    id: 3,
    title: "กล้องหน้า หลัง และระบบกันสั่น OIS",
    category: "Cameras & Optical Stabilization",
    icon: Camera,
    preCheckDesc: "ทดสอบการซูมระยะ 0.5x, 1x, 3x, 5x ตรวจสอบฝุ่นในชิ้นเลนส์และมอเตอร์โฟกัส",
    postCheckDesc: "ตรวจระบบกันสั่น OIS ไม่สั่นกระตุก บันทึกวิดีโอ 4K 60fps คมชัดสมบูรณ์",
    specStandard: "ชิ้นเลนส์ใสไร้ฝุ่น • โฟกัสเงียบ รวดเร็ว แม่นยำ",
    benchType: "camera",
  },
  {
    id: 4,
    title: "ลำโพงสนทนาและลำโพงสเตอริโอ",
    category: "Acoustic Audio System",
    icon: Volume2,
    preCheckDesc: "ตรวจคลื่นความถี่เสียงช่วงต่ำและสูง อาการเสียงแตกหรือลำโพงอู้อี้",
    postCheckDesc: "ทำความสะอาดตะแกรงลำโพงด้วยคลื่นอัลตราโซนิก เสียงดังใส ชัดเจน",
    specStandard: "สมดุลเสียงสเตอริโอบน-ล่าง ไม่แตกพร่าที่ระดับเสียง 100%",
    benchType: "audio",
  },
  {
    id: 5,
    title: "ไมโครโฟนบันทึกเสียงและตัดเสียงรบกวน",
    category: "Triple Microphone Array",
    icon: Mic,
    preCheckDesc: "ทดสอบไมโครโฟนสนทนาล่าง ไมค์ตัดเสียงบน และไมค์กล้องหลัง",
    postCheckDesc: "ทดสอบการตัดเสียงรบกวนขณะสนทนา และการบันทึกเสียงแบบสเตอริโอ",
    specStandard: "สัญญาณเสียงคมชัด ปราศจากเสียงช็อตหรือสัญญาณรบกวน",
  },
  {
    id: 6,
    title: "พอร์ตชาร์จและวงจร Fast Charge",
    category: "Charging Circuit & Battery",
    icon: BatteryCharging,
    preCheckDesc: "ตรวจวัดกระแสไฟนำเข้า ทดสอบการเสียบพอร์ตทั้งสองด้าน",
    postCheckDesc: "ทดสอบระบบ 20W - 65W Fast Charge และตรวจสุขภาพแบต 100%",
    specStandard: "กระแสไฟเสถียร ไม่มีความร้อนผิดปกติ พอร์ตกระชับแน่น",
    benchType: "battery",
  },
  {
    id: 7,
    title: "สัญญาณ Wi-Fi, Bluetooth และ 5G",
    category: "RF Wireless Connectivity",
    icon: Wifi,
    preCheckDesc: "ตรวจรับสัญญาณคลื่น 2.4GHz / 5GHz สัญญาณเซลลูลาร์ และ GPS",
    postCheckDesc: "เชื่อมต่ออุปกรณ์บลูทูธและทดสอบความเร็วสัญญาณอินเทอร์เน็ตเต็มสปีด",
    specStandard: "ระดับความแรงสัญญาณเต็มแถบ ไม่พบการหลุดของการเชื่อมต่อ",
  },
  {
    id: 8,
    title: "ปุ่มกดและ Proximity Sensor",
    category: "Tactile Buttons & Sensors",
    icon: Sliders,
    preCheckDesc: "ทดสอบปุ่ม Power, Volume, Action Button และเซนเซอร์แนบหูเวลาสนทนา",
    postCheckDesc: "ปุ่มกดเด้งตอบสนองดี และหน้าจอดับลงทันทีเมื่อนำเครื่องแนบหู",
    specStandard: "Proximity Sensor ตอบสนองแม่นยำ ป้องกันหน้าสัมผัสโดนปุ่ม",
  },
  {
    id: 9,
    title: "ระบบสั่น Haptic และ Taptic Engine",
    category: "Haptic Feedback Motor",
    icon: Vibrate,
    preCheckDesc: "ทดสอบน้ำหนักและจังหวะการสั่น มีเสียงโครงสร้างหลวมหรือไม่",
    postCheckDesc: "ขันยึดน็อตมอเตอร์ด้วยค่าแรงบิดมาตรฐาน สั่นหนักแน่นและนุ่มนวล",
    specStandard: "ตอบสนองต่อการพิมพ์และสัมผัสได้อย่างแม่นยำตามมาตรฐาน",
  },
  {
    id: 10,
    title: "แถบความชื้น LCI และซีลกันน้ำแท้",
    category: "Liquid Indicator & Chassis Seal",
    icon: Droplets,
    preCheckDesc: "ส่องกล้องไมโครสโคปตรวจแถบความชื้น Liquid Contact Indicator",
    postCheckDesc: "ติดซีลกาวกันฝุ่นและละอองน้ำขอบจอใหม่ตามมาตรฐานโรงงานทุกครั้ง",
    specStandard: "แถบ LCI สีขาวปกติ • อัดขอบจอด้วยแท่นกดแรงดันเฉพาะทาง",
  },
];

export interface InspectionStandardProps {
  showEstimate?: boolean;
  showBench?: boolean;
  themeColor?: StorefrontThemeColor;
}

export function InspectionStandard({
  showEstimate = true,
  showBench = true,
  themeColor = "blue",
}: InspectionStandardProps = {}) {
  const theme = THEME_PALETTES[themeColor] || THEME_PALETTES.blue;
  const [mode, setMode] = useState<"pre" | "post">("post");
  const [activeBench, setActiveBench] = useState<"touch" | "battery" | "audio" | "faceid" | "camera">("touch");

  // Bench 1: Touch Screen Grid State (36 tiles: 6x6)
  const [touchedTiles, setTouchedTiles] = useState<Set<number>>(new Set());

  // Bench 2: Audio visualizer wave bar heights
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(true);
  const [audioBars, setAudioBars] = useState<number[]>([40, 65, 80, 50, 95, 70, 85, 60, 90, 75, 55, 85]);

  // Bench 3: Battery Fast Charge simulator
  const [isCharging, setIsCharging] = useState<boolean>(true);

  // Bench 4: Face ID dot matrix simulator
  const [isScanningFace, setIsScanningFace] = useState<boolean>(false);
  const [faceScanSuccess, setFaceScanSuccess] = useState<boolean>(true);
  const faceScanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Bench 5: Camera OIS Gyro position (interactive mouse & touch)
  const [gyroOffset, setGyroOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Update audio bars periodically if playing, otherwise idle flatline
  useEffect(() => {
    if (!isPlayingAudio) {
      setAudioBars(Array(12).fill(12));
      return;
    }
    const interval = setInterval(() => {
      setAudioBars(
        Array.from({ length: 12 }, () => Math.floor(Math.random() * 65) + 30)
      );
    }, 150);
    return () => clearInterval(interval);
  }, [isPlayingAudio]);

  // Clean up all timers on unmount
  useEffect(() => {
    return () => {
      if (faceScanTimeoutRef.current) clearTimeout(faceScanTimeoutRef.current);
    };
  }, []);

  const handleTileHover = (idx: number) => {
    setTouchedTiles((prev) => {
      if (prev.has(idx)) return prev;
      const next = new Set(prev);
      next.add(idx);
      return next;
    });
  };

  const handleToggleTile = (idx: number) => {
    setTouchedTiles((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const handleFillAllTiles = () => {
    setTouchedTiles(new Set(Array.from({ length: 36 }, (_, i) => i)));
  };

  const handleResetTiles = () => {
    setTouchedTiles(new Set());
  };

  const handleStartFaceScan = () => {
    setIsScanningFace(true);
    setFaceScanSuccess(false);
    if (faceScanTimeoutRef.current) clearTimeout(faceScanTimeoutRef.current);
    faceScanTimeoutRef.current = setTimeout(() => {
      setIsScanningFace(false);
      setFaceScanSuccess(true);
    }, 1200);
  };

  const handleGyroMove = (clientX: number, clientY: number, target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    const x = Math.max(-12, Math.min(12, ((clientX - rect.left) / rect.width - 0.5) * 24));
    const y = Math.max(-12, Math.min(12, ((clientY - rect.top) / rect.height - 0.5) * 24));
    setGyroOffset({ x, y });
  };

  return (
    <section id="inspection" className="py-16 sm:py-24 bg-white relative border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-10 sm:mb-14">
          <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full ${theme.lightBg} ${theme.lightText} text-xs font-semibold border ${theme.lightBorder}`}>
            <ShieldCheck className={`h-3.5 w-3.5 ${theme.lightAccentText}`} />
            <span>ตรวจเช็กฟรี 0 บาท • มาตรฐานการตรวจสอบ 10 จุด</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-slate-900 tracking-tight">
            เกณฑ์การตรวจเช็คมาตรฐานก่อนและหลังการซ่อม
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            เราตรวจเช็คสมาร์ตโฟนอย่างละเอียดทั้งก่อนซ่อมเพื่อหาสาเหตุที่แท้จริง และหลังซ่อมเพื่อตรวจสอบความสมบูรณ์ 100% ก่อนส่งมอบเครื่องคืนลูกค้า
          </p>

          {/* Interactive Mode Toggle */}
          <div
            className="pt-3 inline-flex flex-col sm:flex-row p-1 bg-slate-100 rounded-2xl border border-slate-200 max-w-full gap-1 sm:gap-0"
            role="tablist"
            aria-label="เลือกโหมดตรวจเช็ค"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "pre"}
              onClick={() => setMode("pre")}
              className={`min-h-[44px] px-5 py-2 rounded-xl text-xs font-medium transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 ${theme.focusVisibleRing} text-center ${
                mode === "pre"
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200 font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              1. ตรวจก่อนซ่อม (Pre-Check รายการแรกเข้า ฟรี 0.-)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "post"}
              onClick={() => setMode("post")}
              className={`min-h-[44px] px-5 py-2 rounded-xl text-xs font-medium transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 ${theme.focusVisibleRing} text-center ${
                mode === "post"
                  ? "bg-slate-900 text-white shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              2. ตรวจหลังซ่อม (Post-Check QC 100%)
            </button>
          </div>
        </div>

        {/* 1. Interactive 10-Point Diagnostic Test Bench Stage */}
        {showBench && (
        <div className="mb-14 rounded-3xl bg-slate-950 p-6 sm:p-8 lg:p-10 text-white border border-slate-800 shadow-xl overflow-hidden relative">
          {/* Ambient subtle glow */}
          <div
            className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none"
            style={{ backgroundColor: `${theme.hex}1a` }}
          />

          {/* Test Bench Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-medium ${theme.darkBg} ${theme.badge.text} border ${theme.darkBorder} flex items-center gap-1.5`}>
                  <Activity className="h-3 w-3" /> Live Diagnostic Test Bench
                </span>
                <span className="text-xs text-slate-400">แท่นทดสอบจำลองเครื่องมือวัดทางวิศวกรรม</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold mt-1.5 text-white">
                ทดลองสั่งทดสอบระบบฮาร์ดแวร์จริง
              </h3>
            </div>

            {/* Bench Tabs Switcher */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1" role="tablist">
              {[
                { id: "touch", label: "ทัชสกรีน Draw Grid", icon: Smartphone },
                { id: "battery", label: "แบตเตอรี่ & แรงดันไฟ", icon: BatteryCharging },
                { id: "audio", label: "ลำโพงสเตอริโอ Wave", icon: Volume2 },
                { id: "faceid", label: "Face ID Dot-Matrix", icon: Eye },
                { id: "camera", label: "กันสั่น OIS Gyro", icon: Camera },
              ].map((b) => {
                const Icon = b.icon;
                const isSelected = activeBench === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setActiveBench(b.id as any)}
                    className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors border ${
                      isSelected
                        ? theme.activePill
                        : "bg-slate-900 text-slate-300 border-slate-800 hover:text-white"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{b.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Bench Playground */}
          <div className="pt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left 7 Cols: The Interactive Simulation Widget */}
            <div className="lg:col-span-7">
              {/* Bench Widget 1: Touchscreen Draw Grid */}
              {activeBench === "touch" && (
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-white">
                        Multi-Touch 36-Node Inspection Grid
                      </h4>
                      <p className="text-xs text-slate-400">
                        แตะเพื่อเปิด/ปิดจุด หรือลากผ่านช่องตารางเพื่อทดสอบการตอบสนอง 100%
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleFillAllTiles}
                        className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 flex items-center gap-1.5 transition-colors border border-slate-700"
                        title="ทดสอบผ่านทุกจุด"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-cyan-400" /> ครบ 36 จุด
                      </button>
                      <button
                        type="button"
                        onClick={handleResetTiles}
                        className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 flex items-center gap-1.5 transition-colors border border-slate-700"
                        title="ล้างข้อมูลตาราง"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> ล้างตาราง
                      </button>
                    </div>
                  </div>

                  {/* 6x6 Interactive Grid with drag/draw and tile toggling */}
                  <div
                    onPointerMove={(e) => {
                      if (e.buttons === 1) {
                        const elem = document.elementFromPoint(e.clientX, e.clientY);
                        const tileIdx = elem?.getAttribute("data-tile-index");
                        if (tileIdx !== null && tileIdx !== undefined) {
                          handleTileHover(parseInt(tileIdx, 10));
                        }
                      }
                    }}
                    onTouchMove={(e) => {
                      const touch = e.touches[0];
                      if (touch) {
                        const elem = document.elementFromPoint(touch.clientX, touch.clientY);
                        const tileIdx = elem?.getAttribute("data-tile-index");
                        if (tileIdx !== null && tileIdx !== undefined) {
                          handleTileHover(parseInt(tileIdx, 10));
                        }
                      }
                    }}
                    className="grid grid-cols-6 gap-2 max-w-[360px] mx-auto select-none touch-none py-2"
                  >
                    {Array.from({ length: 36 }).map((_, idx) => {
                      const isTouched = touchedTiles.has(idx);
                      return (
                        <button
                          key={idx}
                          type="button"
                          data-tile-index={idx}
                          onClick={() => handleToggleTile(idx)}
                          onMouseEnter={(e) => {
                            if (e.buttons === 1) handleTileHover(idx);
                          }}
                          className={`aspect-square min-h-[44px] rounded-lg border flex items-center justify-center text-[11px] font-mono font-semibold transition-all duration-150 cursor-pointer focus:outline-none focus:ring-1 focus:ring-white ${
                            isTouched
                              ? theme.activeTile
                              : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300"
                          }`}
                          aria-label={`จุดสัมผัสที่ ${idx + 1} สถานะ ${isTouched ? "ผ่าน" : "รอทดสอบ"}`}
                        >
                          {isTouched ? "OK" : idx + 1}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-slate-800">
                    <span className="text-slate-400">
                      ตรวจผ่าน:{" "}
                      <span className={`${theme.accentText} font-bold`}>{touchedTiles.size}</span> / 36 จุด
                    </span>
                    <span className={touchedTiles.size === 36 ? theme.accentText : "text-slate-400"}>
                      {touchedTiles.size === 36
                        ? "✓ 100% Fully Responsive (ผ่านเกณฑ์)"
                        : "แตะหรือลากนิ้วบนตารางเพื่อทดสอบ..."}
                    </span>
                  </div>
                </div>
              )}

              {/* Bench Widget 2: Battery Health & Voltage Gauge */}
              {activeBench === "battery" && (
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-white">
                        Battery Health & DC Power Supply Telemetry
                      </h4>
                      <p className="text-xs text-slate-400">
                        เกจวัดสุขภาพเซลล์แบตเตอรี่และกระแสชาร์จมาตรฐาน มอก.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCharging(!isCharging)}
                      className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-mono font-medium flex items-center gap-1.5 transition-colors border ${
                        isCharging
                          ? `${theme.darkBg} ${theme.badge.text} border ${theme.darkBorder}`
                          : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                      }`}
                      aria-label={isCharging ? "สลับเป็นโหมดสแตนด์บาย" : "สลับเป็นโหมดชาร์จด่วน"}
                    >
                      <Zap className="h-3.5 w-3.5" /> {isCharging ? "ชาร์จอยู่ (20W PD)" : "โหมดสแตนด์บาย"}
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-4">
                    {/* Circular Health Gauge */}
                    <div className="relative w-36 h-36 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="42"
                          stroke="#1e293b"
                          strokeWidth="8"
                          fill="transparent"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="42"
                          stroke={theme.hex}
                          strokeWidth="8"
                          strokeDasharray="264"
                          strokeDashoffset="0"
                          strokeLinecap="round"
                          fill="transparent"
                          className={isCharging ? "animate-pulse transition-all duration-1000" : "transition-all duration-1000"}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-2xl font-bold font-mono text-white">100%</span>
                        <span className={`text-[10px] font-mono ${theme.accentText}`}>Battery Health</span>
                      </div>
                    </div>

                    {/* Stats List */}
                    <div className="space-y-2 text-xs font-mono w-full sm:w-auto">
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between gap-6">
                        <span className="text-slate-400">สถานะวงจร:</span>
                        <span className={isCharging ? `${theme.accentText} font-semibold` : "text-amber-400 font-semibold"}>
                          {isCharging ? "กำลังชาร์จ 9.05V / 2.21A (20W PD)" : "สแตนด์บาย 0.00A (0W)"}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between gap-6">
                        <span className="text-slate-400">แรงดันไฟเสถียร:</span>
                        <span className="text-white font-semibold">{isCharging ? "4.42V Peak" : "3.85V นิ่ง"}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between gap-6">
                        <span className="text-slate-400">อุณหภูมิแพ็คเกจ:</span>
                        <span className="text-cyan-400 font-semibold">{isCharging ? "31.2°C (ระบบตัดความร้อนปกติ)" : "26.4°C นิ่ง"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bench Widget 3: Audio Equalizer Visualizer */}
              {activeBench === "audio" && (
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-white">
                        Acoustic Frequency Spectrum & Stereo Balance
                      </h4>
                      <p className="text-xs text-slate-400">
                        สเปกตรัมคลื่นเสียงช่วง 20Hz - 20kHz ตรวจสอบลำโพงบน-ล่าง
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                      className={`min-h-[44px] px-4 py-2 rounded-xl ${
                        isPlayingAudio
                          ? `${theme.darkBg} ${theme.badge.text} border ${theme.darkBorder}`
                          : "bg-slate-800 text-slate-300 border-slate-700 hover:text-white"
                      } text-xs font-mono flex items-center gap-1.5 transition-colors border`}
                      aria-label={isPlayingAudio ? "หยุดทดสอบเสียง" : "เริ่มทดสอบเสียง 1kHz"}
                    >
                      {isPlayingAudio ? (
                        <>
                          <Pause className="h-3.5 w-3.5" /> กำลังเล่น 1kHz
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5" /> เริ่มทดสอบ 1kHz
                        </>
                      )}
                    </button>
                  </div>

                  {/* Equalizer Waveform Bars */}
                  <div className="h-32 flex items-end justify-between gap-1.5 px-4 bg-slate-950 rounded-xl border border-slate-800 py-3">
                    {audioBars.map((height, i) => (
                      <div
                        key={i}
                        className={`flex-1 bg-gradient-to-t from-slate-900 ${theme.radarSweep} to-slate-100 rounded-t transition-all duration-150`}
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between">
                      <span className="text-slate-400">ลำโพงสนทนา (Top):</span>
                      <span className={`${theme.accentText} font-semibold`}>สมดุลเสียงใส 100%</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between">
                      <span className="text-slate-400">ลำโพงหลัก (Bottom):</span>
                      <span className={`${theme.accentText} font-semibold`}>เบสแน่น ไม่แตกพร่า</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Bench Widget 4: Face ID Dot-Matrix Simulator */}
              {activeBench === "faceid" && (
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-white">
                        TrueDepth Dot Projector (30,000 Infrared Dots)
                      </h4>
                      <p className="text-xs text-slate-400">
                        จำลองโครงข่ายแสงเลเซอร์อินฟราเรดตรวจจับมิติใบหน้า
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleStartFaceScan}
                      disabled={isScanningFace}
                      className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-mono font-medium flex items-center gap-1.5 transition-colors border ${
                        isScanningFace
                          ? "bg-slate-800 text-slate-400 border-slate-700 opacity-70"
                          : `${theme.darkBg} ${theme.badge.text} border ${theme.darkBorder} hover:brightness-110`
                      }`}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>{isScanningFace ? "กำลังสแกนโครงข่าย..." : "ทดสอบสแกนใบหน้า"}</span>
                    </button>
                  </div>

                  <div className="relative h-44 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden">
                    {/* Animated laser matrix dots */}
                    <div
                      className={`absolute inset-0 transition-opacity duration-300 ${isScanningFace ? "opacity-75" : "opacity-35"}`}
                      style={{
                        backgroundImage: `radial-gradient(circle at 2px 2px, ${theme.hex} 1.5px, transparent 0)`,
                        backgroundSize: "16px 16px",
                      }}
                    />
                    {/* Face Silhouette Outline & Crosshair */}
                    <div
                      className={`relative z-10 w-28 h-36 rounded-[2.5rem] border-2 border-dashed flex items-center justify-center transition-all duration-300 ${
                        isScanningFace ? "scale-105" : ""
                      }`}
                      style={{ borderColor: `${theme.hex}cc`, boxShadow: `0 0 20px ${theme.hex}4d` }}
                    >
                      <Eye className={`h-8 w-8 ${theme.iconColor} ${isScanningFace ? "animate-pulse scale-110" : ""}`} />
                      {/* Scanning crosshair line */}
                      <div className={`absolute inset-x-0 h-0.5 bg-cyan-400 shadow-[0_0_8px_#22d3ee] ${isScanningFace ? "animate-bounce" : ""}`} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Flood Illuminator: ปกติ</span>
                    <span className={theme.accentText}>
                      {faceScanSuccess
                        ? "✓ 30,000 จุด IR ปลดล็อคสำเร็จ (< 0.25s)"
                        : isScanningFace
                        ? "กำลังคำนวณเวกเตอร์ใบหน้า..."
                        : "พร้อมทำการสแกน"}
                    </span>
                  </div>
                </div>
              )}

              {/* Bench Widget 5: Camera OIS Gyro Stabilizer */}
              {activeBench === "camera" && (
                <div
                  onMouseMove={(e) => handleGyroMove(e.clientX, e.clientY, e.currentTarget)}
                  onPointerMove={(e) => handleGyroMove(e.clientX, e.clientY, e.currentTarget)}
                  onTouchMove={(e) => {
                    const touch = e.touches[0];
                    if (touch) handleGyroMove(touch.clientX, touch.clientY, e.currentTarget);
                  }}
                  className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 cursor-crosshair touch-none"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-white">
                        Optical Image Stabilization (OIS 6-Axis Test)
                      </h4>
                      <p className="text-xs text-slate-400">
                        ขยับเมาส์หรือใช้นิ้วเลื่อนในกล่องเพื่อดูมอเตอร์ OIS ชดเชยแรงสั่นไหว
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setGyroOffset({ x: 0, y: 0 })}
                      className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-mono bg-cyan-950 text-cyan-300 border border-cyan-800 hover:bg-cyan-900 transition-colors flex items-center gap-1.5"
                    >
                      <RotateCcw className="h-3 w-3" /> รีเซ็ตศูนย์
                    </button>
                  </div>

                  <div className="relative h-44 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden">
                    {/* Grid reticle */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-32 h-32 rounded-full border border-slate-700/60" />
                      <div className="w-48 h-48 rounded-full border border-slate-800/60" />
                    </div>

                    {/* Stabilized floating Lens Reticle */}
                    <div
                      className={`relative z-10 w-20 h-20 rounded-full border-2 ${theme.darkBg}/30 flex items-center justify-center transition-transform duration-75`}
                      style={{
                        borderColor: theme.hex,
                        boxShadow: `0 0 15px ${theme.radarShadow}`,
                        transform: `translate(${-gyroOffset.x * 1.5}px, ${-gyroOffset.y * 1.5}px)`,
                      }}
                    >
                      <Camera className={`h-6 w-6 ${theme.iconColor}`} />
                      <div className="absolute -top-1 w-2 h-0.5" style={{ backgroundColor: theme.hex }} />
                      <div className="absolute -bottom-1 w-2 h-0.5" style={{ backgroundColor: theme.hex }} />
                      <div className="absolute -left-1 h-2 w-0.5" style={{ backgroundColor: theme.hex }} />
                      <div className="absolute -right-1 h-2 w-0.5" style={{ backgroundColor: theme.hex }} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">
                      Gyro Compensation: X: {(-gyroOffset.x).toFixed(1)}° | Y: {(-gyroOffset.y).toFixed(1)}°
                    </span>
                    <span className={theme.accentText}>Dual Pixel AF: คมชัด 100%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Right 5 Cols: Diagnostic Summary & Certification Guarantee */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-xs font-mono text-slate-300 uppercase tracking-wider font-semibold">
                    รายงานผลการตรวจสอบ 10 จุด
                  </span>
                </div>
                <h4 className="text-base font-semibold text-white">
                  มาตรฐานห้องทดสอบระดับวิศวกรรมอิเล็กทรอนิกส์
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  ก่อนส่งมอบเครื่องทุกครั้ง โทรศัพท์ทุกเครื่องจะถูกนำขึ้นแท่นทดสอบ Diagnostic Test Bench เพื่อตรวจเช็คความเสถียรของกระแสไฟและฮาร์ดแวร์ครบทั้ง 10 จุด มั่นใจได้ว่าทุกฟังก์ชันทำงานได้ 100% เสมือนเครื่องใหม่
                </p>

                <div className="pt-2 space-y-2 border-t border-slate-800 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>การผ่านเกณฑ์มาตรฐาน QC:</span>
                    <span className="font-mono font-semibold text-emerald-400">10 / 10 รายการ</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>ระดับความแม่นยำเครื่องมือวัด:</span>
                    <span className="font-mono font-semibold text-white">±0.001A ดิจิทัล</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>สิทธิ์การรับประกันผลตรวจ:</span>
                    <span className="font-mono font-semibold text-emerald-400">รับประกัน 90-180 วัน</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* 2. 10-Point Checklist Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {INSPECTION_POINTS.map((item) => {
            const IconComponent = item.icon;
            const currentDesc = mode === "pre" ? item.preCheckDesc : item.postCheckDesc;

            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                aria-label={`ดูผลทดสอบ ${item.title}`}
                onClick={() => {
                  if (item.benchType) setActiveBench(item.benchType);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (item.benchType) setActiveBench(item.benchType);
                  }
                }}
                className={`p-5 rounded-2xl bg-slate-50 border transition-all duration-150 flex flex-col justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  item.benchType === activeBench
                    ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-xl bg-white text-slate-800 border border-slate-200 flex items-center justify-center">
                      <IconComponent className="h-5 w-5 text-emerald-700" />
                    </div>
                    <span className="font-mono text-xs font-semibold text-slate-500 tabular-nums">
                      #{item.id < 10 ? `0${item.id}` : item.id}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] uppercase font-mono tracking-wider text-slate-500 block">
                      {item.category}
                    </span>
                    <h4 className="text-sm font-semibold text-slate-900 mt-1 line-clamp-1">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                      {currentDesc}
                    </p>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-200 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">เกณฑ์มาตรฐานสากล</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono truncate tabular-nums">
                    {item.specStandard}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Guarantee Banner */}
        <div className="mt-10 p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="h-11 w-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 border border-slate-800">
              <FileCheck className={`h-5 w-5 ${theme.accentText}`} />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">
                ใบรายงานผลตรวจเช็ค 10 จุด แนบพร้อมสลิปส่งมอบทุกเครื่อง (ฟรี 0.-)
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                ลูกค้าได้รับเอกสารตรวจเช็คที่มีลายเซ็นช่างผู้ดูแล พร้อมสแกน QR Code ดูผลย้อนหลังได้ 24 ชั่วโมง
              </div>
            </div>
          </div>

          {showEstimate && (
          <a
            href="#estimate"
            className={`min-h-[44px] px-5 py-2.5 rounded-xl ${theme.primaryButton} font-semibold text-xs shrink-0 shadow-2xs transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 ${theme.focusVisibleRing} inline-flex items-center justify-center`}
          >
            ประเมินราคาซ่อมเครื่องของคุณ
          </a>
          )}
        </div>
      </div>
    </section>
  );
}
