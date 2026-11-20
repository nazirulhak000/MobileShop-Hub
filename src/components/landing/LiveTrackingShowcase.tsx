"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Smartphone,
  CheckCircle2,
  Clock,
  Camera,
  Wrench,
  ShieldCheck,
  ExternalLink,
  ThumbsUp,
  Activity,
  ChevronRight,
  ChevronLeft,
  Lock,
  Unlock,
  RotateCcw,
  Sparkles,
  Zap,
  Fingerprint,
} from "lucide-react";

interface StepData {
  step: number;
  id: string;
  title: string;
  subtitle: string;
  description: string;
  technicianNote: string;
  voltageOrSpec: string;
  photoUrl: string;
  photoCaption: string;
  badgeText: string;
  badgeColor: string;
  screenType: "checkin" | "power" | "eeprom" | "qc" | "warranty";
}

const STEPS: StepData[] = [
  {
    step: 1,
    id: "checkin",
    title: "1. ตรวจรับเครื่อง บันทึกรอย และตรวจเลข IMEI",
    subtitle: "Check-in & Initial 10-Point Inspection",
    description: "ตรวจสอบประวัติเครื่องและเลข IMEI 15 หลักตามบัตร ปชช. ป้องกันของโจร 100% บันทึกภาพถ่ายสภาพภายนอกก่อนแกะ และออกสติ๊กเกอร์ QR Code ประจำเครื่อง",
    technicianNote: "สภาพแรกเข้า: กระจกหน้าจอแตกร้าว จอด้านในดับ บอดี้มีรอยการใช้งานทั่วไป ไม่มีประวัติตกน้ำ แถบความชื้น LCI ขาวปกติ",
    voltageOrSpec: "IMEI: 356891234567890 • แบตเตอรี่คงเหลือ 42%",
    photoUrl: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=700&auto=format&fit=crop&q=80",
    photoCaption: "ภาพบันทึกสภาพเครื่องและหมายเลขประจำเครื่องแรกเข้า",
    badgeText: "เปิดใบรับซ่อมแล้ว",
    badgeColor: "bg-amber-50 text-amber-900 border-amber-200",
    screenType: "checkin",
  },
  {
    step: 2,
    id: "diagnosis",
    title: "2. วินิจฉัยทางวิศวกรรม ตรวจวัดกระแสไฟระดับแล็บ",
    subtitle: "Digital Power Supply Profiling",
    description: "ตรวจวัดกระแสไฟและคลื่นความถี่ระดับแล็บ ด้วยเครื่อง DC Power Supply ดิจิทัลและมัลติมิเตอร์ความแม่นยำสูง แยกแยะระหว่างอาการจอช็อตหรือเมนบอร์ดรั่ว",
    technicianNote: "จ่ายไฟเข้าบอร์ด Booting: กระแสไฟเดิน 0.18A - 0.92A เสถียร ไม่มีการกินกระแสไฟสแตนด์บายก่อนเปิด ประเมินเปลี่ยนชุดหน้าจอแท้ OLED",
    voltageOrSpec: "ไฟ VDD_MAIN 3.8V ปกติ • กระแสไฟสแตนด์บาย 0.00A",
    photoUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=700&auto=format&fit=crop&q=80",
    photoCaption: "กราฟและผลตรวจวัดกระแสไฟผ่านเครื่อง Power Supply ดิจิทัล",
    badgeText: "เสนอราคาแล้ว รออนุมัติ",
    badgeColor: "bg-slate-100 text-slate-800 border-slate-300",
    screenType: "power",
  },
  {
    step: 3,
    id: "repair",
    title: "3. ดำเนินการซ่อมแล็บ ย้าย True Tone และซีลกันน้ำ",
    subtitle: "Cleanroom Lab Assembly & True Tone Transfer",
    description: "แกะเครื่องด้วยแท่นความร้อนควบคุมอุณหภูมิในห้องควบคุมไฟฟ้าสถิต ESD ย้ายชิป IC เดิมและโปรแกรมรหัส True Tone ครบถ้วน พร้อมติดซีลกาวกันน้ำแท้",
    technicianNote: "ย้ายรหัส True Tone จากจอเดิมสำเร็จ ประกอบหน้าจอแท้เกรดพรีเมียม ขันน็อตทุกตำแหน่งด้วยไขควงปอนด์ตามค่าแรงบิดโรงงาน",
    voltageOrSpec: "True Tone: Active • รองรับ ProMotion 120Hz สมบูรณ์",
    photoUrl: "https://images.unsplash.com/photo-1588508065123-287b28e013da?w=700&auto=format&fit=crop&q=80",
    photoCaption: "ขั้นตอนการย้ายข้อมูล True Tone และติดซีลกาวกันน้ำใหม่",
    badgeText: "กำลังดำเนินการซ่อม",
    badgeColor: "bg-slate-100 text-slate-900 border-slate-300",
    screenType: "eeprom",
  },
  {
    step: 4,
    id: "qc",
    title: "4. ตรวจสอบคุณภาพ QC ครบทั้ง 10 จุดทดสอบ",
    subtitle: "Standardized 10-Point Post-Repair QC",
    description: "ทดสอบการสัมผัสแบบ Multi-touch ทั่วหน้าจอ เซนเซอร์ Face ID กล้องหน้า-หลัง ระบบลำโพงสเตอริโอ ไมค์ตัดเสียง และทดสอบรอบจ่ายไฟชาร์จเร็ว",
    technicianNote: "ผ่านเกณฑ์ตรวจเช็ค 10 จุด 100% หน้าจอทัชสกรีนลื่นไหล สีสันแม่นยำ ไม่มีความเพี้ยนของเซนเซอร์แนบหูเวลาคุยสาย",
    voltageOrSpec: "ผลตรวจ QC: ผ่าน 10/10 รายการ • รองรับชาร์จไว 20W PD",
    photoUrl: "https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=700&auto=format&fit=crop&q=80",
    photoCaption: "บันทึกผลการทดสอบ QC ครบทุกระบบก่อนส่งมอบ",
    badgeText: "ผ่าน QC พร้อมส่งมอบ",
    badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
    screenType: "qc",
  },
  {
    step: 5,
    id: "completion",
    title: "5. ส่งมอบเครื่อง ออกใบรับประกันดิจิทัลและสติ๊กเกอร์ QR",
    subtitle: "Delivery & Digital Warranty Registration",
    description: "ส่งมอบเครื่องพร้อมสติ๊กเกอร์ QR Code ประจำเครื่อง ลูกค้าสามารถสแกนตรวจสอบประวัติการซ่อมและวันหมดอายุการรับประกันได้ตลอดเวลา 24 ชั่วโมง",
    technicianNote: "ลูกค้าตรวจเช็คและทดสอบฟังก์ชันด้วยตัวเองเรียบร้อย ออกใบรับประกันดิจิทัล 90 วันเต็มในระบบ",
    voltageOrSpec: "ออกใบกำกับภาษีถูกต้อง • สิทธิ์รับประกันอะไหล่ 90 วัน",
    photoUrl: "https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=700&auto=format&fit=crop&q=80",
    photoCaption: "ส่งมอบเครื่องพร้อมบันทึกสิทธิ์รับประกันในระบบดิจิทัล",
    badgeText: "ส่งมอบเสร็จสมบูรณ์",
    badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
    screenType: "warranty",
  },
];

export function LiveTrackingShowcase() {
  const [activeStep, setActiveStep] = useState<number>(3);
  const [isApprovedDemo, setIsApprovedDemo] = useState<boolean>(true);

  // Pattern Lock Interactive State (3x3 grid dots 1 to 9)
  const [patternDots, setPatternDots] = useState<number[]>([]);
  const [isDrawingPattern, setIsDrawingPattern] = useState<boolean>(false);
  const [patternSuccess, setPatternSuccess] = useState<boolean>(false);

  const current = STEPS[activeStep - 1];

  // Pattern Lock handlers
  const handleDotTouch = (dotNum: number) => {
    if (!patternDots.includes(dotNum)) {
      const next = [...patternDots, dotNum];
      setPatternDots(next);
      if (next.length >= 4) {
        setPatternSuccess(true);
      }
    }
  };

  const handleClearPattern = () => {
    setPatternDots([]);
    setPatternSuccess(false);
  };

  return (
    <section id="tracking-demo" className="py-16 sm:py-24 bg-slate-50 relative border-b border-slate-200 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white text-slate-800 text-xs font-medium border border-slate-200 shadow-2xs">
            <Activity className="h-3.5 w-3.5 text-emerald-600" />
            <span>ภาพจำลองการติดตามงานซ่อม (ตัวอย่าง)</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-slate-900 tracking-tight">
            ขั้นตอนการซ่อมที่ตรวจสอบภาพถ่ายและสถานะได้จริง
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            ช่างบันทึกภาพถ่ายสภาพเครื่อง ค่าแรงดันไฟ และรายงานผลในแต่ละขั้นตอน ลูกค้าสามารถตรวจสอบความคืบหน้าและกดอนุมัติราคาประเมินผ่านมือถือได้ตลอดเวลา
          </p>
        </div>

        {/* Step Progress Navigator Bar */}
        <div className="mb-8 overflow-x-auto pb-2" role="tablist" aria-label="แถบขั้นตอนการซ่อม">
          <div className="flex items-center justify-between min-w-[640px] sm:min-w-0 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
            {STEPS.map((s) => {
              const isActive = s.step === activeStep;
              const isPast = s.step < activeStep;

              return (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={`ขั้นตอนที่ ${s.step}: ${s.title}`}
                  onClick={() => setActiveStep(s.step)}
                  className={`flex-1 min-h-[44px] flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium transition-all duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                    isActive
                      ? "bg-slate-900 text-white shadow-xs scale-[1.02]"
                      : isPast
                      ? "text-emerald-800 hover:bg-slate-50"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span
                    className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-mono tabular-nums font-semibold shrink-0 transition-colors ${
                      isActive
                        ? "bg-emerald-500 text-slate-950"
                        : isPast
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {isPast ? <CheckCircle2 className="h-4 w-4 text-emerald-700" /> : s.step}
                  </span>
                  <span className="truncate">{s.title.split(". ")[1]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Interactive Showcase Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 lg:p-10 shadow-sm">
          {/* Left Column: Step Details & Digital Approval Simulator */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${current.badgeColor}`}
                >
                  {current.badgeText}
                </span>
                <span className="text-xs font-mono text-slate-500 tabular-nums">
                  ขั้นตอนที่ {current.step} จาก 5
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
                {current.title}
              </h3>
              <p className="text-xs font-mono text-emerald-700 font-medium tracking-wide">
                {current.subtitle}
              </p>
              <p className="text-sm text-slate-600 leading-relaxed pt-1">
                {current.description}
              </p>
            </div>

            {/* Live Technician Note Callout */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-emerald-700" />
                  <span>บันทึกช่างเทคนิคผู้ดูแล (Technician Log)</span>
                </span>
                <span className="text-xs font-mono text-slate-500 tabular-nums">
                  อัปเดตเมื่อ 14 นาทีที่แล้ว
                </span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-mono">
                {current.technicianNote}
              </p>
              <div className="pt-1 text-xs font-medium text-emerald-800 flex items-center gap-1.5 tabular-nums">
                <Activity className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>ผลการตรวจวัด: {current.voltageOrSpec}</span>
              </div>
            </div>

            {/* Interactive Digital Approval Box */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-300 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <span>ระบบอนุมัติราคาดิจิทัล (Customer Instant Approval)</span>
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    ลูกค้าสามารถกดอนุมัติการซ่อมผ่านหน้าจอมือถือได้ทันที โดยไม่ต้องรอโทรติดต่อ
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1 flex-wrap sm:flex-nowrap">
                <div className="text-xs">
                  <span className="text-slate-500">ราคาประเมิน: </span>
                  <span className="font-semibold text-base text-slate-900 font-mono tabular-nums">
                    ฿2,200
                  </span>
                  <span className="text-slate-500 text-xs"> (รวมค่าแรง + ซีลกันน้ำแท้)</span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsApprovedDemo(!isApprovedDemo)}
                  className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-medium transition-all duration-150 flex items-center gap-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                    isApprovedDemo
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-slate-200 text-slate-800 hover:bg-slate-300"
                  }`}
                >
                  <ThumbsUp className="h-4 w-4" />
                  <span>{isApprovedDemo ? "อนุมัติการซ่อมแล้ว" : "กดเพื่ออนุมัติราคา"}</span>
                </button>
              </div>
            </div>

            {/* Interactive Pattern Lock (Data Privacy Guarantee Widget) */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 text-white border border-slate-800 space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">
                      การันตีข้อมูลส่วนตัวปลอดภัย 100% (No-Wipe Privacy)
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      เราซ่อมด้วยโหมด Hardware Lab ไม่ต้องขอรหัสผ่าน ไม่ล้างข้อมูล
                    </p>
                  </div>
                </div>
                {patternDots.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearPattern}
                    className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    <RotateCcw className="h-3 w-3" /> ล้างจุด
                  </button>
                )}
              </div>

              {/* 3x3 Dot Grid Interactive Canvas */}
              <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
                <div className="relative p-3 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center">
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((dot) => {
                      const isConnected = patternDots.includes(dot);
                      const order = patternDots.indexOf(dot) + 1;

                      return (
                        <button
                          key={dot}
                          type="button"
                          onClick={() => handleDotTouch(dot)}
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-all ${
                            isConnected
                              ? "bg-emerald-500 text-slate-950 ring-2 ring-emerald-300 scale-105 shadow-[0_0_10px_#10b981]"
                              : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                          }`}
                          aria-label={`จุดปลดล็อคที่ ${dot}`}
                        >
                          {isConnected ? order : "•"}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="text-xs space-y-1.5 flex-1">
                  <div className="text-slate-300 font-medium">
                    {patternDots.length === 0 ? (
                      <span className="text-slate-400">
                        ลองแตะเชื่อมจุด Pattern Lock เพื่อทดสอบระบบจำลอง
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-mono flex items-center gap-1">
                        <Lock className="h-3.5 w-3.5" /> ลำดับจุดที่เลือก:{" "}
                        {patternDots.join(" ➔ ")}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
                    🛡️ ข้อมูลรูปภาพ, LINE แชท, และแอปธนาคารของคุณจะถูกเก็บเป็นความลับสูงสุด ช่างทำการทดสอบฟังก์ชันผ่านโหมดวิศวกรรมโดยไม่ต้องเข้าถึงหน้าจอส่วนบุคคลของคุณ
                  </p>
                </div>
              </div>
            </div>

            {/* Link to demo */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <span className="text-xs text-slate-500">ข้อมูลในภาพจำลองนี้เป็นตัวอย่าง ไม่ใช่งานซ่อมจริง</span>
              <Link
                href="/track"
                className="min-h-[44px] inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
              >
                <span>ติดตามงานซ่อมของคุณ (ใช้ลิงก์จากใบรับเครื่อง)</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Right Column: Realistic Titanium Device Mockup */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-[340px] rounded-[3rem] bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 p-3 shadow-2xl border border-slate-600/70 ring-1 ring-white/10 group">
              {/* Titanium Volume & Power Button Knobs on edges */}
              <div className="absolute -left-1 top-24 w-1 h-8 bg-slate-600 rounded-l-md" />
              <div className="absolute -left-1 top-36 w-1 h-12 bg-slate-600 rounded-l-md" />
              <div className="absolute -right-1 top-32 w-1 h-14 bg-slate-600 rounded-r-md" />

              {/* Inner Smartphone Screen Frame */}
              <div className="relative rounded-[2.5rem] bg-slate-950 overflow-hidden text-white p-4 pt-4 min-h-[520px] flex flex-col justify-between border border-slate-800 shadow-inner">
                {/* Dynamic Island at Top */}
                <div className="relative z-30 flex items-center justify-between pt-1 pb-3 px-2">
                  <span className="text-[11px] font-mono font-medium text-slate-300">09:41</span>
                  {/* Dynamic Island Pill */}
                  <div className="h-6 px-3 rounded-full bg-black border border-slate-800 flex items-center gap-2 shadow-lg">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-mono text-emerald-300">Lab Station 01</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300 text-[11px]">
                    <span className="text-[10px] font-mono font-bold">5G</span>
                    <span className="h-2.5 w-4 rounded-xs border border-slate-400 flex items-center p-0.5">
                      <span className="h-full w-full bg-emerald-400 rounded-2xs" />
                    </span>
                  </div>
                </div>

                {/* Sliding Phone Screen Content */}
                <div className="flex-1 space-y-3 pt-1">
                  {/* Card Header inside Mockup */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <Smartphone className="h-4 w-4 text-emerald-400" />
                      <span className="text-xs font-semibold text-white">MobileShop Live</span>
                    </div>
                    <span className="text-[11px] font-mono bg-slate-900 text-emerald-400 font-semibold px-2 py-0.5 rounded border border-slate-700 tabular-nums">
                      ตัวอย่าง (DEMO)
                    </span>
                  </div>

                  {/* Photo Evidence with Fixed Aspect Ratio */}
                  <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-slate-900 border border-slate-800 shadow-sm">
                    <img
                      src={current.photoUrl}
                      alt={current.photoCaption}
                      className="w-full h-full object-cover transition-opacity duration-300"
                      loading="lazy"
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-slate-950/85 backdrop-blur-xs p-2.5 text-white">
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono tabular-nums">
                        <Camera className="h-3.5 w-3.5" />
                        <span>ภาพถ่ายขั้นตอนที่ {current.step} จาก 5</span>
                      </div>
                      <div className="text-[11px] text-slate-300 truncate mt-0.5">
                        {current.photoCaption}
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Telemetry / Status depending on current step */}
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium truncate">{current.title}</span>
                      <span className="text-[11px] font-mono text-emerald-400 shrink-0">
                        {current.step * 20}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${current.step * 20}%` }}
                      />
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between pt-0.5">
                      <span>{current.voltageOrSpec.split(" • ")[0]}</span>
                      <span className="text-emerald-400">QC Verified</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Step Switcher Buttons inside Phone */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    disabled={activeStep <= 1}
                    onClick={() => setActiveStep((prev) => Math.max(1, prev - 1))}
                    className="min-h-[36px] px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> ก่อนหน้า
                  </button>

                  <span className="text-[11px] font-mono text-slate-400">
                    {activeStep} / 5
                  </span>

                  <button
                    type="button"
                    disabled={activeStep >= 5}
                    onClick={() => setActiveStep((prev) => Math.min(5, prev + 1))}
                    className="min-h-[36px] px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1"
                  >
                    ถัดไป <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Home Indicator Bar */}
                <div className="pt-2 flex justify-center">
                  <div className="w-24 h-1 bg-slate-700 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
