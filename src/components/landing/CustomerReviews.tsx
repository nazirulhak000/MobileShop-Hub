"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Star,
  CheckCircle2,
  Smartphone,
  ShieldCheck,
  ChevronRight,
  MoveHorizontal,
  Info,
  Sparkles,
  AlertTriangle,
  Layers,
  Sliders,
} from "lucide-react";

import {
  StorefrontThemeColor,
  THEME_PALETTES,
  DEFAULT_BEFORE_IMAGE,
  DEFAULT_AFTER_IMAGE,
} from "@/lib/storefrontTheme";

export interface CalloutPin {
  id: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  title: string;
  detail: string;
  category: "before" | "after" | "both";
}

export interface BeforeAfterCase {
  id: string;
  device: string;
  issue: string;
  repairSolution: string;
  repairTime: string;
  warranty: string;
  beforeImg: string;
  beforeDesc: string;
  afterImg: string;
  afterDesc: string;
  pins: CalloutPin[];
}

export const BEFORE_AFTER_CASES: BeforeAfterCase[] = [
  {
    id: "case-1",
    device: "iPhone 14 Pro Max 256GB (Space Black)",
    issue: "กระจกหน้าจอแตกร้าวละเอียด จอด้านในดับ ทัชสกรีนไม่ตอบสนอง",
    repairSolution: "เปลี่ยนชุดหน้าจอแท้ OLED + ย้าย IC และรหัส True Tone ครบถ้วน + ซีลกันน้ำแท้",
    repairTime: "35 นาที (รอรับเครื่องได้)",
    warranty: "รับประกันอะไหล่ 180 วัน",
    beforeImg: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=900&auto=format&fit=crop&q=80",
    beforeDesc: "กระจกแตกร้าว จอด้านในขึ้นเส้นเขียว ทัชสกรีนไม่ตอบสนอง",
    afterImg: "https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=900&auto=format&fit=crop&q=80",
    afterDesc: "เปลี่ยนจอแท้ Super Retina XDR 120Hz ProMotion สีสันถูกต้อง คมชัด ทัชสกรีนลื่นไหล 100%",
    pins: [
      {
        id: "pin-1",
        x: 30,
        y: 40,
        title: "รอยร้าวและดับใน",
        detail: "แกะจอด้วยแท่นความร้อน 80°C เพื่อไม่ให้โครงสร้างบอดี้โก่งตัว เปลี่ยนจอแท้ใหม่กริ๊บ",
        category: "before",
      },
      {
        id: "pin-2",
        x: 72,
        y: 35,
        title: "True Tone & 120Hz Active",
        detail: "ใช้กล่องโปรแกรมเมอร์อ่านรหัสหน้าจอเดิมและเขียนลงจอแท้ใหม่ ค่า True Tone กลับมาใช้งานได้ทันที",
        category: "after",
      },
      {
        id: "pin-3",
        x: 50,
        y: 84,
        title: "ซีลกาวกันน้ำแท้สูญญากาศ",
        detail: "ติดซีลกาวขอบจอแท้ตัดขึ้นรูปตรงรุ่น ป้องกันความชื้นและฝุ่นละอองเข้าภายในเครื่องตามมาตรฐาน IP68",
        category: "both",
      },
    ],
  },
  {
    id: "case-2",
    device: "Samsung Galaxy S23 Ultra (Phantom Black)",
    issue: "แบตเตอรี่เสื่อมสภาพ บวมดันฝาหลัง และเก็บไฟได้น้อยกว่า 2 ชั่วโมง",
    repairSolution: "เปลี่ยนแบตเตอรี่มาตรฐาน มอก. พร้อมใบเซอร์รับรอง + ติดกาวฝาหลังกันน้ำแท้",
    repairTime: "25 นาที",
    warranty: "รับประกันแบตเตอรี่ 1 ปีเต็ม",
    beforeImg: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=900&auto=format&fit=crop&q=80",
    beforeDesc: "แบตเตอรี่บวม ดันกรอบฝาหลังเปิดอ้า มีความเสี่ยงต่อความปลอดภัย",
    afterImg: "https://images.unsplash.com/photo-1588508065123-287b28e013da?w=900&auto=format&fit=crop&q=80",
    afterDesc: "แบตเตอรี่ มอก. ใหม่ กักเก็บไฟ 100% ฝาหลังแนบสนิทเรียบร้อย",
    pins: [
      {
        id: "pin-b1",
        x: 42,
        y: 50,
        title: "เซลล์แบตบวมดันกรอบ",
        detail: "ทำการถอดแบตเตอรี่เก่าด้วยน้ำยาคลายกาวเฉพาะ ปลอดภัยต่อสายแพร์ก้นชาร์จด้านล่าง",
        category: "before",
      },
      {
        id: "pin-b2",
        x: 65,
        y: 48,
        title: "มอก. แท้ 100% Health",
        detail: "ติดตั้งแบตเตอรี่มาตรฐาน มอก. 2217-2548 รอบชาร์จ 0 Cycle พร้อมแผ่นระบายความร้อนกราไฟต์เดิม",
        category: "after",
      },
    ],
  },
  {
    id: "case-3",
    device: "iPad Pro 11-inch (M2 Space Gray)",
    issue: "กระจกทัชสกรีนแตกลายงา จอแสดงผลด้านในยังสว่างปกติ",
    repairSolution: "ลอกกระจกจอแท้ OCA ด้วยเครื่องสุญญากาศความดันคงที่",
    repairTime: "75 นาที",
    warranty: "รับประกันงานซ่อม 90 วัน",
    beforeImg: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=900&auto=format&fit=crop&q=80",
    beforeDesc: "ผิวกระจกร้าวแตกลายงา มีเศษกระจก เศษรอยบาดนิ้ว",
    afterImg: "https://images.unsplash.com/photo-1561154464-82e9adf32764?w=900&auto=format&fit=crop&q=80",
    afterDesc: "ลอกเปลี่ยนเฉพาะผิวกระจก คงจอในแท้เดิม ประหยัดค่าใช้จ่ายกว่า 50%",
    pins: [
      {
        id: "pin-p1",
        x: 48,
        y: 35,
        title: "กระจกนอกแตกร้าว",
        detail: "แยกกระจกที่แตกด้วยลวดโมลิบดีนัมความหนา 0.03 มม. ภายใต้อุณหภูมิคงที่ ไม่กระทบจอใน",
        category: "before",
      },
      {
        id: "pin-p2",
        x: 60,
        y: 60,
        title: "กาว OCA ไร้ฟองอากาศ",
        detail: "อัดกาวแสงยูวีและกระจกใหม่ในตู้สูญญากาศความดันคงที่ หน้าจอกลับมาเรียบเนียน รองรับ Apple Pencil สมบูรณ์",
        category: "after",
      },
    ],
  },
];

interface ReviewItem {
  id: string;
  name: string;
  category: "all" | "screen" | "battery" | "board";
  rating: number;
  device: string;
  date: string;
  avatarColor: string;
  comment: string;
}

const REVIEWS: ReviewItem[] = [
  {
    id: "rev-1",
    name: "คุณธนภัทร ว.",
    category: "screen",
    rating: 5,
    device: "iPhone 14 Pro Max",
    date: "3 วันที่แล้ว",
    avatarColor: "bg-slate-900",
    comment:
      "ระบบ Live Tracking ใช้งานสะดวกมาก ระหว่างทิ้งเครื่องไว้สามารถเปิดดูรูปที่ช่างถ่ายบันทึกขั้นตอนซ่อมลงเว็บได้ตลอดเวลา เห็นตั้งแต่ตอนตรวจวัดกระแสไฟจนถึงการย้าย True Tone อะไหล่แท้สีสันคมชัด ช่างให้คำแนะนำอย่างตรงไปตรงมา",
  },
  {
    id: "rev-2",
    name: "คุณกมลวรรณ ส.",
    category: "battery",
    rating: 5,
    device: "iPhone 12 Pro",
    date: "1 สัปดาห์ที่แล้ว",
    avatarColor: "bg-slate-800",
    comment:
      "เปลี่ยนแบตเตอรี่มาตรฐาน มอก. ใช้เวลาประมาณ 25 นาที นั่งรอรับเครื่องได้เลย สุขภาพแบตเตอรี่แสดงค่า 100% พร้อมติดซีลกาวกันน้ำใหม่ มีใบรับประกัน 1 ปีบันทึกในระบบดิจิทัลเรียบร้อย",
  },
  {
    id: "rev-3",
    name: "คุณเกรียงศักดิ์ ภ.",
    category: "board",
    rating: 5,
    device: "Samsung S22 Ultra",
    date: "2 สัปดาห์ที่แล้ว",
    avatarColor: "bg-slate-900",
    comment:
      "เครื่องโดนน้ำดับ ช่างนำเครื่องเข้าห้องแล็บตรวจวัดกระแสไฟและคลื่นความถี่ สรุปเป็นที่ชิป IC ตัวจ่ายไฟ ยกเปลี่ยนเฉพาะจุด ข้อมูลและรูปถ่ายในเครื่องอยู่ครบถ้วน บริการมาตรฐานแล็บจริง",
  },
  {
    id: "rev-4",
    name: "คุณพิมพาภรณ์ ด.",
    category: "screen",
    rating: 5,
    device: "iPad Air 5",
    date: "3 สัปดาห์ที่แล้ว",
    avatarColor: "bg-slate-800",
    comment:
      "ลอกกระจกจอแท้ OCA ออกมาเรียบสนิท เขียน Apple Pencil ได้ปกติไม่มีอาการหน่วง ช่างประเมินราคาก่อนเริ่มงานชัดเจน ไม่มีค่าใช้จ่ายแอบแฝง แนะนำสำหรับคนอยากเก็บจอแท้เดิม",
  },
];

export const DEFAULT_CASE: BeforeAfterCase = {
  id: "case-default",
  device: "สมาร์ตโฟน (เครื่องตรวจเช็คสาธิต)",
  issue: "อาการตรวจเช็คแรกเข้า",
  repairSolution: "ดำเนินการเปลี่ยนอะไหล่แท้มาตรฐานโรงงาน",
  repairTime: "30 นาที",
  warranty: "รับประกัน 90 วัน",
  beforeImg: DEFAULT_BEFORE_IMAGE,
  beforeDesc: "สภาพก่อนเข้ารับบริการซ่อม",
  afterImg: DEFAULT_AFTER_IMAGE,
  afterDesc: "สภาพหลังการซ่อมแซมและผ่าน QC 100%",
  pins: [],
};

function getAvatarInitial(name?: string | null): string {
  if (!name || typeof name !== "string") return "U";
  const clean = name.trim().replace(/^คุณ\s*/, "").trim();
  return clean.charAt(0) || name.charAt(0) || "U";
}

export interface CustomerReviewsProps {
  showSlider?: boolean;
  showReviews?: boolean;
  customCases?: BeforeAfterCase[];
  customReviews?: ReviewItem[];
  themeColor?: StorefrontThemeColor;
}

export function CustomerReviews({
  showSlider = true,
  showReviews = true,
  customCases,
  customReviews,
  themeColor = "blue",
}: CustomerReviewsProps = {}) {
  const theme = THEME_PALETTES[themeColor] || THEME_PALETTES.blue;
  const cases =
    customCases && Array.isArray(customCases) && customCases.length > 0
      ? customCases.filter((c) => Boolean(c && typeof c === "object"))
      : BEFORE_AFTER_CASES;

  const safeCases = cases.length > 0 ? cases : [DEFAULT_CASE];
  const [selectedCaseIdx, setSelectedCaseIdx] = useState(0);
  const [activeFilter, setActiveFilter] = useState<"all" | "screen" | "battery" | "board">("all");

  // Draggable Split Slider State (percentage 0 - 100)
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [activePin, setActivePin] = useState<CalloutPin | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const safeIdx = selectedCaseIdx < safeCases.length ? selectedCaseIdx : 0;
  const currentCase = safeCases[safeIdx] || safeCases[0] || DEFAULT_CASE;

  useEffect(() => {
    if (selectedCaseIdx >= safeCases.length) {
      setSelectedCaseIdx(0);
    }
  }, [safeCases.length, selectedCaseIdx]);

  const isCustomReviews = Boolean(customReviews && Array.isArray(customReviews) && customReviews.length > 0);
  const reviewSource =
    isCustomReviews
      ? customReviews!.filter((r) => Boolean(r && typeof r === "object"))
      : REVIEWS;

  const filteredReviews = reviewSource.filter(
    (r) => activeFilter === "all" || r.category === activeFilter
  );

  // Handle Drag logic (supports mouse + touch + pointer)
  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    handleMove(e.clientX);
    if (containerRef.current) {
      try {
        containerRef.current.setPointerCapture(e.pointerId);
      } catch (_) {}
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    if (containerRef.current) {
      try {
        containerRef.current.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    setIsDragging(false);
    if (containerRef.current) {
      try {
        containerRef.current.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }
  };

  // Keyboard navigation for accessible slider (ArrowLeft, ArrowRight, Home, End, PageUp, PageDown)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setSliderPosition((prev) => Math.max(0, Math.round(prev - 5)));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setSliderPosition((prev) => Math.min(100, Math.round(prev + 5)));
    } else if (e.key === "Home") {
      e.preventDefault();
      setSliderPosition(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setSliderPosition(100);
    } else if (e.key === "PageDown") {
      e.preventDefault();
      setSliderPosition((prev) => Math.max(0, Math.round(prev - 20)));
    } else if (e.key === "PageUp") {
      e.preventDefault();
      setSliderPosition((prev) => Math.min(100, Math.round(prev + 20)));
    }
  };

  if (!showSlider && !showReviews) {
    return null;
  }

  return (
    <section id="reviews" className="py-16 sm:py-24 bg-white relative border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-medium border border-slate-200">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
            <span className="tabular-nums">ความไว้วางใจและผลงานมาตรฐานสากล</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-slate-900 tracking-tight">
            ผลงานการซ่อมจริงและเสียงตอบรับจากลูกค้า FixMe
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            ศูนย์บริการ FixMe ซ่อมมือถือด่วนมาตรฐานแล็บวิศวกรรมอิเล็กทรอนิกส์ พร้อมระบบ Live Tracking ตรวจสอบได้ 24 ชั่วโมง เปรียบเทียบผลงานก่อนและหลังซ่อมจริง
          </p>
        </div>

        {/* FixMe Highlight Metrics: 15,840+ Devices, 99.6% Satisfaction, 30-min Turnaround */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12 sm:mb-16">
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 shadow-2xs flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums tracking-tight">
                15,840+
              </div>
              <div className="text-xs text-slate-600 font-medium mt-0.5">
                เครื่องที่ผ่านการซ่อมแซมสำเร็จ
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 shadow-2xs flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center shrink-0 border border-cyan-200">
              <Star className="h-6 w-6 fill-amber-400 text-amber-500" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums tracking-tight">
                99.6%
              </div>
              <div className="text-xs text-slate-600 font-medium mt-0.5">
                ความพึงพอใจและบอกต่อของลูกค้า
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 shadow-2xs flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-900 text-cyan-300 flex items-center justify-center shrink-0 border border-blue-800">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tabular-nums tracking-tight">
                30 นาที
              </div>
              <div className="text-xs text-slate-600 font-medium mt-0.5">
                ระยะเวลาเฉลี่ยซ่อมด่วนรอรับเครื่อง
              </div>
            </div>
          </div>
        </div>

        {/* 1. Interactive Draggable Before / After Split Slider Showcase */}
        {showSlider && (
        <div className="mb-16 bg-slate-950 rounded-3xl p-6 sm:p-8 lg:p-10 text-white relative border border-slate-800 shadow-xl overflow-hidden">
          {/* Top Bar inside Showcase */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-medium ${theme.darkBg} ${theme.badge.text} border ${theme.darkBorder} flex items-center gap-1`}>
                  <Sliders className="h-3 w-3" /> Draggable Split Slider
                </span>
                <span className="text-xs text-slate-400">ลากแถบเพื่อเปรียบเทียบแบบ Real-time</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold mt-1.5 text-white">
                {currentCase.device}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                อาการแรกเข้า: {currentCase.issue}
              </p>
            </div>

            {/* Case Selector Tabs */}
            <div
              className="flex items-center gap-2 self-stretch lg:self-auto overflow-x-auto pb-1"
              role="tablist"
              aria-label="เลือกเคสตัวอย่าง"
            >
              {safeCases.map((c, idx) => (
                <button
                  key={c.id || idx}
                  type="button"
                  role="tab"
                  aria-selected={safeIdx === idx}
                  onClick={() => {
                    setSelectedCaseIdx(idx);
                    setSliderPosition(50);
                    setActivePin(null);
                  }}
                  className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-medium transition-colors duration-150 shrink-0 focus-visible:outline-none focus-visible:ring-2 ${theme.accentRing} ${
                    safeIdx === idx
                      ? theme.activePill
                      : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800"
                  }`}
                >
                  {(c.device || "เคสตัวอย่าง").split(" ")[0]} {(c.device || "").split(" ")[1] || ""}
                </button>
              ))}
            </div>
          </div>

          {/* Draggable Canvas Stage */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-6">
            {/* Left 8 Cols: Real Draggable Image Split Slider */}
            <div className="lg:col-span-8 space-y-3">
              <div
                ref={containerRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
                onKeyDown={handleKeyDown}
                tabIndex={0}
                role="slider"
                aria-label="แถบลากเปรียบเทียบสภาพเครื่องก่อนและหลังซ่อม"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(sliderPosition)}
                className={`relative rounded-2xl overflow-hidden aspect-[16/10] bg-slate-900 border border-slate-700/80 cursor-ew-resize select-none touch-none focus:outline-none focus:ring-2 ${theme.accentRing} shadow-2xl group`}
              >
                {/* 1. Base Layer: After Image (Full width background) */}
                <img
                  src={currentCase.afterImg || DEFAULT_AFTER_IMAGE}
                  alt={currentCase.afterDesc || "After repair"}
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.dataset.fallbackApplied) {
                      target.dataset.fallbackApplied = "true";
                      target.src = DEFAULT_AFTER_IMAGE;
                    }
                  }}
                />

                {/* 2. Top Layer: Before Image (Clipped dynamically by slider position) */}
                <div
                  className="absolute inset-0 overflow-hidden pointer-events-none"
                  style={{
                    clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
                  }}
                >
                  <img
                    src={currentCase.beforeImg || DEFAULT_BEFORE_IMAGE}
                    alt={currentCase.beforeDesc || "Before repair"}
                    className="absolute inset-0 w-full h-full object-cover max-w-none"
                    style={{ width: containerRef.current?.clientWidth || "100%" }}
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.dataset.fallbackApplied) {
                        target.dataset.fallbackApplied = "true";
                        target.src = DEFAULT_BEFORE_IMAGE;
                      }
                    }}
                  />
                  {/* Shattered glass visual texture hint on before layer */}
                  <div className="absolute inset-0 bg-red-950/20 backdrop-contrast-125" />
                </div>

                {/* Left/Right floating indicator pills */}
                <div className="absolute top-4 left-4 z-10 pointer-events-none">
                  <span className="px-3 py-1 rounded-full text-xs font-mono font-medium bg-slate-900/90 text-rose-300 border border-rose-500/40 backdrop-blur-md shadow-md flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3 text-rose-400" /> สภาพก่อนซ่อม (Damaged)
                  </span>
                </div>

                <div className="absolute top-4 right-4 z-10 pointer-events-none">
                  <span className={`px-3 py-1 rounded-full text-xs font-mono font-medium ${theme.darkBg}/90 ${theme.badge.text} border ${theme.accentBorder} backdrop-blur-md shadow-md flex items-center gap-1.5`}>
                    <Sparkles className={`h-3 w-3 ${theme.iconColor}`} /> หลังซ่อมเสร็จ (Restored 100%)
                  </span>
                </div>

                {/* Interactive Technical Callout Pins on Image (>= 44px minimum touch targets) */}
                {(currentCase.pins || []).map((pin, pIdx) => {
                  const pinId = pin?.id || `pin-${pIdx}`;
                  const pinX = typeof pin?.x === "number" && !isNaN(pin.x) ? Math.max(0, Math.min(100, pin.x)) : 50;
                  const pinY = typeof pin?.y === "number" && !isNaN(pin.y) ? Math.max(0, Math.min(100, pin.y)) : 50;
                  const pinTitle = pin?.title || "จุดตรวจสอบวิศวกรรม";
                  const isSelectedPin = activePin?.id === pinId;

                  return (
                    <button
                      key={pinId}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePin(isSelectedPin ? null : pin);
                      }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 min-h-[44px] min-w-[44px] flex items-center justify-center p-2 group/pin transition-transform duration-200 focus:outline-none ${
                        isSelectedPin ? "scale-125 ring-2 ring-white rounded-full" : "hover:scale-110"
                      }`}
                      style={{ left: `${pinX}%`, top: `${pinY}%` }}
                      aria-label={`หมุดเทคนิค: ${pinTitle}`}
                    >
                      <span className="relative flex items-center justify-center pointer-events-none">
                        <span className="animate-ping absolute inline-flex h-6 w-6 rounded-full opacity-70" style={{ backgroundColor: theme.hex }} />
                        <span
                          className="h-7 w-7 rounded-full text-slate-950 font-bold text-xs flex items-center justify-center shadow-lg border-2 border-white"
                          style={{ backgroundColor: theme.hex }}
                        >
                          <Info className="h-3.5 w-3.5" />
                        </span>
                      </span>
                      {/* Tooltip on hover */}
                      <span className="hidden group-hover/pin:flex absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 rounded-lg bg-slate-900/95 text-white text-[11px] font-mono whitespace-nowrap shadow-lg border border-slate-700 pointer-events-none">
                        {pinTitle}
                      </span>
                    </button>
                  );
                })}

                {/* Draggable Vertical Divider Line */}
                <div
                  className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)] pointer-events-none z-20"
                  style={{ left: `${sliderPosition}%` }}
                >
                  {/* Center Drag Handle Pill */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white text-slate-950 shadow-2xl flex items-center justify-center border-2 ring-4 ring-slate-950/60 transition-transform group-hover:scale-110 cursor-ew-resize"
                    style={{ borderColor: theme.hex }}
                  >
                    <MoveHorizontal className="h-5 w-5 text-slate-900" />
                  </div>
                </div>

                {/* Bottom Overlay Info description */}
                <div className="absolute inset-x-0 bottom-0 bg-slate-950/85 backdrop-blur-md p-3 text-white border-t border-slate-800/80 pointer-events-none flex items-center justify-between text-xs">
                  <span className="truncate pr-4">
                    {sliderPosition < 50 ? currentCase.beforeDesc : currentCase.afterDesc}
                  </span>
                  <span className={`text-[11px] font-mono ${theme.accentText} shrink-0`}>
                    Split {Math.round(sliderPosition)}%
                  </span>
                </div>
              </div>

              {/* Slider Quick Presets & Control Bar (>= 44px touch targets) */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                <span className="text-slate-400 pl-2 font-medium">ทางลัดมุมมอง:</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSliderPosition(0)}
                    className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-mono font-medium transition-colors border ${
                      sliderPosition === 0
                        ? `${theme.darkBg} ${theme.badge.text} ${theme.darkBorder}`
                        : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                    }`}
                  >
                    ดูหลังซ่อม (0%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSliderPosition(50)}
                    className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-mono font-medium transition-colors border ${
                      Math.round(sliderPosition) === 50
                        ? `${theme.darkBg} ${theme.badge.text} ${theme.darkBorder}`
                        : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                    }`}
                  >
                    ผ่าครึ่ง (50/50)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSliderPosition(100)}
                    className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-mono font-medium transition-colors border ${
                      sliderPosition === 100
                        ? `${theme.darkBg} ${theme.badge.text} ${theme.darkBorder}`
                        : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                    }`}
                  >
                    ดูก่อนซ่อม (100%)
                  </button>
                </div>
              </div>
            </div>

            {/* Right 4 Cols: Technical Details & Solution + Active Pin Drawer */}
            <div className="lg:col-span-4 space-y-4">
              {/* Active Pin Detailed Tooltip / Drawer */}
              {activePin ? (
                <div className={`p-4 rounded-2xl ${theme.darkBg}/40 border ${theme.accentBorder} space-y-2 animate-fade-in shadow-md`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-mono ${theme.badge.text} font-semibold uppercase flex items-center gap-1.5`}>
                      <Info className="h-3.5 w-3.5" /> บันทึกวิศวกรรมช่าง
                    </span>
                    <button
                      type="button"
                      onClick={() => setActivePin(null)}
                      className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-slate-400 hover:text-white text-xs font-medium rounded-lg hover:bg-white/10 transition-colors"
                      aria-label="ปิดกล่องข้อมูล"
                    >
                      ปิด
                    </button>
                  </div>
                  <h4 className="text-sm font-semibold text-white">{activePin.title}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed font-mono">
                    {activePin.detail}
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                  <Info className={`h-4 w-4 ${theme.iconColor} shrink-0`} />
                  <span>แตะที่หมุดสีไฮไลท์บนภาพเพื่อดูเทคนิคการซ่อมเฉพาะจุด</span>
                </div>
              )}

              {/* Solution Card */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className={`text-xs font-mono ${theme.accentText} uppercase font-medium`}>
                  วิธีแก้ปัญหาและอะไหล่ที่ใช้
                </div>
                <div className="text-sm font-medium text-white leading-relaxed">
                  {currentCase.repairSolution}
                </div>
              </div>

              {/* Repair Time & Warranty */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-slate-400 text-[11px]">เวลาที่ใช้ซ่อม:</div>
                  <div className="font-semibold text-white text-sm mt-1 font-mono tabular-nums">
                    {currentCase.repairTime}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-slate-400 text-[11px]">การรับประกัน:</div>
                  <div className={`font-semibold ${theme.accentText} text-sm mt-1 font-mono tabular-nums`}>
                    {currentCase.warranty}
                  </div>
                </div>
              </div>

              {/* QC Verification checklist */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center gap-2.5">
                <CheckCircle2 className={`h-5 w-5 ${theme.iconColor} shrink-0`} />
                <span>ผ่านการทดสอบมาตรฐาน 10 จุด ครบถ้วนทุกฟังก์ชันก่อนส่งมอบ</span>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* 2. Rating Summary Bar */}
        {showReviews && (
          <>
            <div className="mb-8 p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="text-4xl sm:text-5xl font-semibold text-slate-900 font-mono tabular-nums">
              4.9
            </div>
            <div>
              <div className="flex items-center gap-1 text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400" />
                ))}
              </div>
              <div className="text-xs text-slate-600 mt-1 font-medium tabular-nums">
                คะแนนตัวอย่าง — ร้านจริงจะแสดงรีวิวของร้านเอง
              </div>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="กรองหมวดหมู่รีวิว">
            {[
              { id: "all", label: "ทั้งหมด" },
              { id: "screen", label: "เปลี่ยนหน้าจอ" },
              { id: "battery", label: "เปลี่ยนแบตเตอรี่" },
              { id: "board", label: "ซ่อมเมนบอร์ด" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={activeFilter === f.id}
                onClick={() => setActiveFilter(f.id as any)}
                className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-medium transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 ${theme.focusVisibleRing} ${
                  activeFilter === f.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Verified Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredReviews.map((rev) => {
            const rawRating = Number(rev?.rating);
            const safeRating = !isNaN(rawRating) ? Math.max(1, Math.min(5, Math.floor(rawRating))) : 5;
            const revName = rev?.name || "ลูกค้าผู้รับบริการ";
            const revDevice = rev?.device || "สมาร์ตโฟน";
            const revComment = rev?.comment || "บริการประทับใจ มาตรฐานแล็บรวดเร็ว";
            const revDate = rev?.date || "เร็วๆ นี้";
            const avatarBg = rev?.avatarColor || "bg-slate-900";
            return (
              <div
                key={rev?.id || revName}
                className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-4 shadow-xs"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-10 w-10 rounded-xl ${avatarBg} text-white flex items-center justify-center font-medium text-sm`}
                      >
                        {getAvatarInitial(revName)}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                          <span>{revName}</span>
                          <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${isCustomReviews ? `${theme.lightBg} ${theme.lightText} border ${theme.lightBorder}` : "bg-slate-100 text-slate-700 border border-slate-200"}`}>
                            {isCustomReviews ? "รีวิวจากลูกค้าจริง (Verified)" : "ตัวอย่างรีวิว"}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">{revDevice}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 text-amber-500">
                      {[...Array(safeRating)].map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-amber-400" />
                      ))}
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                    &quot;{revComment}&quot;
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                  <span className="tabular-nums font-mono">{revDate}</span>
                  <span className={`${theme.lightAccentText} font-medium flex items-center gap-1.5`}>
                    <CheckCircle2 className={`h-3.5 w-3.5 ${theme.iconColor}`} /> {isCustomReviews ? "ตรวจเช็กและซ่อมผ่านระบบจริง" : "ตัวอย่างรีวิว"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        </>
        )}
      </div>
    </section>
  );
}
