"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import {
  Wrench,
  Smartphone,
  HandCoins,
  ShieldCheck,
  BellRing,
  ArrowRight,
  Battery,
  Cpu,
  CheckCircle2,
  Eye,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
  HelpCircle,
  Microscope,
} from "lucide-react";

interface ServiceDetail {
  id: string;
  equipment: string[];
  steps: string[];
  faq: { q: string; a: string };
}

const SERVICE_DETAILS: Record<string, ServiceDetail> = {
  lab: {
    id: "lab",
    equipment: [
      "เครื่องลอกจอสุญญากาศความดันคงที่ OCA 5-in-1",
      "กล้องจุลทรรศน์สเตอริโอ 45X สำหรับส่องเม็ด BGA",
      "แท่นแกะจอและควบคุมอุณหภูมิความแม่นยำสูง",
      "ชุดไขควงวัดแรงบิดปอนด์มาตรฐานโรงงาน",
    ],
    steps: [
      "ตรวจวัดแรงดันไฟและสัญญาณก่อนแกะเครื่อง",
      "ลอกหรือเปลี่ยนชิ้นส่วนในห้องควบคุมไฟฟ้าสถิต ESD",
      "ย้ายรหัส EEPROM True Tone และติดซีลกาวกันน้ำแท้",
      "ทดสอบระบบ QC 10 จุด ครบทุกฟังก์ชัน",
    ],
    faq: {
      q: "ลอกกระจกจอเดิม ดีกว่าเปลี่ยนจอเทียบอย่างไร?",
      a: "คงพาเนลหน้าจอแท้เดิมจากโรงงาน สีสันไม่เพี้ยน รองรับ ProMotion 120Hz แท้ 100% และประหยัดค่าใช้จ่ายได้กว่า 50%",
    },
  },
  tracking: {
    id: "tracking",
    equipment: [
      "ระบบถ่ายภาพ Macro ชิ้นส่วนความละเอียดสูง",
      "ระบบบันทึกสถานะ Cloud Server 24 ชั่วโมง",
      "สติ๊กเกอร์ QR Code ประจำเครื่องเฉพาะบุคคล",
    ],
    steps: [
      "ออกใบรับเครื่องพร้อม QR ติดตามงานทันทีเมื่อรับเครื่อง",
      "ช่างอัปโหลดภาพถ่ายจริงในทุกขั้นตอนการทำ",
      "ส่งการแจ้งเตือนและเปิดให้ลูกค้ากดอนุมัติราคาดิจิทัล",
    ],
    faq: {
      q: "สามารถเปิดดูสถานะงานซ่อมตอนดึกได้ไหม?",
      a: "ได้ตลอด 24 ชั่วโมง ระบบทำงานบนคลาวด์ ดูบันทึกภาพและประวัติการซ่อมได้แบบเรียลไทม์",
    },
  },
  tradein: {
    id: "tradein",
    equipment: [
      "ระบบเชื่อมต่อฐานข้อมูล IMEI ทางการและ กสทช.",
      "เครื่องตรวจวัดรอบชาร์จและตรวจบอดี้รอบทิศ",
      "ซอฟต์แวร์โอนถ่ายข้อมูลระหว่าง OS ปลอดภัย 100%",
    ],
    steps: [
      "ตรวจเช็คเลข IMEI และยืนยันตัวตนตามกฎหมาย",
      "ประเมินสภาพเครื่องตามเกณฑ์ราคากลางที่โปร่งใส",
      "ย้ายข้อมูลให้ครบถ้วนและโอนเงินเข้าบัญชีทันที",
    ],
    faq: {
      q: "เครื่องติดล็อคหรือเครื่องจำนำรับไหม?",
      a: "ทางร้านรับเฉพาะเครื่องถูกต้องตามกฎหมาย มีการลงทะเบียนบัตร ปชช. ชัดเจนเพื่อความปลอดภัย 100%",
    },
  },
  installment: {
    id: "installment",
    equipment: [
      "ตู้เซฟนิรภัยมาตรฐานธนาคาร ควบคุมอุณหภูมิและความชื้น",
      "ระบบกล้องวงจรปิดบันทึกตลอด 24 ชั่วโมง",
      "ระบบ QR Code ออกสัญญาและใบเสร็จดิจิทัล",
    ],
    steps: [
      "ทำสัญญาผ่อนหรือฝากดูแลอย่างถูกต้องตามกฎหมาย",
      "บรรจุเครื่องในซองนิรภัยประทับตรา ไม่เปิดเครื่องเด็ดขาด",
      "ชำระค่างวดผ่านระบบออนไลน์ได้สะดวกทุกที่",
    ],
    faq: {
      q: "เครื่องที่นำมาฝากดูแลจะถูกแกะหรือเปิดดูไหม?",
      a: "ไม่เปิดเครื่องเด็ดขาด บรรจุในซองซีลนิรภัยต่อหน้าลูกค้า และเก็บในตู้เซฟควบคุมความปลอดภัย",
    },
  },
  parts: {
    id: "parts",
    equipment: [
      "เครื่องทดสอบสายชาร์จและไฟกระชาก GaN Tester",
      "เครื่องติดฟิล์มกระจกระบบสุญญากาศไร้ฝุ่น",
      "ตลับเก็บอะไหล่มาตรฐานป้องกันไฟฟ้าสถิต ESD",
    ],
    steps: [
      "คัดสรรเฉพาะอะไหล่ที่ผ่านมาตรฐาน มอก. และแท้ศูนย์",
      "ทดสอบการจ่ายกระแสไฟก่อนจำหน่ายทุกชิ้น",
      "ออกใบรับประกันและบันทึกสิทธิ์ในระบบดิจิทัล",
    ],
    faq: {
      q: "อะไหล่มีรับประกันนานแค่ไหน?",
      a: "รับประกันอะไหล่ตั้งแต่ 90 วัน ถึง 1 ปีเต็ม พร้อมบริการตรวจเช็คฟรีตลอดอายุการรับประกัน",
    },
  },
  line: {
    id: "line",
    equipment: [
      "LINE Official Bot API เชื่อมต่อระบบงานซ่อมโดยตรง",
      "ระบบส่งภาพถ่ายบันทึกช่างอัตโนมัติ",
      "ระบบแจ้งเตือนเมื่อเครื่องประกอบเสร็จพร้อมรับ",
    ],
    steps: [
      "เพิ่มเพื่อน LINE OA ของร้านครั้งเดียว",
      "รับการแจ้งเตือนอัตโนมัติทันทีที่สถานะงานซ่อมขยับ",
      "กดดูใบเสร็จและใบรับประกันดิจิทัลได้จากในแชท",
    ],
    faq: {
      q: "ต้องโหลดแอปพลิเคชันเพิ่มเติมไหม?",
      a: "ไม่ต้องโหลดแอปเพิ่ม ใช้งานผ่านแอปพลิเคชัน LINE ที่ทุกคนมีอยู่แล้วได้ทันที",
    },
  },
};

function lineAddFriendUrl(lineId: string) {
  const id = lineId.trim();
  return `https://line.me/R/ti/p/${encodeURIComponent(id.startsWith("@") ? id : `@${id}`)}`;
}

interface ServicesBentoProps {
  /** LINE OA id of the shop; the add-friend link is hidden when missing. */
  lineId?: string | null;
  /** Show links to the #estimate section (hide when the page doesn't render it). */
  showEstimate?: boolean;
  /** Show link to the #track-search section. */
  showLiveTracking?: boolean;
  /** Show links to the #location section. */
  showLocation?: boolean;
}

export function ServicesBento({
  lineId,
  showEstimate = true,
  showLiveTracking = true,
  showLocation = true,
}: ServicesBentoProps = {}) {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // Spotlight glow coordinates
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: -1000, y: -1000 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: -1000, y: -1000 });
  };

  const toggleExpand = (id: string) => {
    setExpandedCard((prev) => (prev === id ? null : id));
  };

  return (
    <section
      id="services"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="py-16 sm:py-24 bg-white relative overflow-hidden"
    >
      {/* Dynamic Cursor Spotlight Radial Glow */}
      <div
        className="pointer-events-none absolute -inset-px opacity-70 transition-opacity duration-300"
        style={{
          background: `radial-gradient(650px circle at ${mousePos.x}px ${mousePos.y}px, rgba(16, 185, 129, 0.08), transparent 75%)`,
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-medium border border-slate-200">
            <Wrench className="h-3.5 w-3.5 text-emerald-600" />
            <span>บริการมาตรฐานวิศวกรรมอิเล็กทรอนิกส์</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-slate-900 tracking-tight">
            บริการหลักของศูนย์บริการ MobileShop-Hub
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            ศูนย์บริการครบวงจร รองรับงานซ่อมแล็บด่วน ตรวจสอบสถานะงานซ่อมผ่านระบบออนไลน์ เทิร์นเครื่องตรวจสอบเลข IMEI และบริการอะไหล่มาตรฐาน มอก. แตะที่การ์ดเพื่อดูเครื่องมือแล็บและขั้นตอนละเอียด
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Express Lab Repairs (Span 2 cols on lg) */}
          <div className="lg:col-span-2 rounded-3xl bg-slate-900 p-6 sm:p-8 text-white relative border border-slate-800 shadow-md flex flex-col justify-between group hover:border-slate-700 transition-all duration-200">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="h-11 w-11 rounded-2xl bg-slate-800 text-emerald-400 flex items-center justify-center border border-slate-700 transition-transform group-hover:scale-105">
                  <Wrench className="h-5 w-5" />
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-950 text-emerald-300 text-xs font-medium border border-emerald-800 font-mono tabular-nums">
                  Express Lab 30-60 นาที
                </span>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">
                  1. งานซ่อมด่วนมาตรฐานแล็บ (Express Lab Repairs)
                </h3>
                <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                  ลอกกระจกจอแท้ OCA เปลี่ยนแบตเตอรี่มาตรฐาน มอก. พร้อมใบเซอร์รับรอง ตรวจวัดกระแสไฟและคลื่นความถี่ระดับแล็บ และซ่อมวงจรเมนบอร์ดชิป IC ในห้องควบคุมไฟฟ้าสถิต ESD มาตรฐานสากล
                </p>
              </div>

              {/* Sub features pills */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-xs">
                  <div className="text-emerald-400 font-medium flex items-center gap-1.5">
                    <Smartphone className="h-4 w-4" /> ลอกกระจกจอแท้ OCA
                  </div>
                  <div className="text-slate-300 mt-1">คงจอแท้เดิม ย้าย True Tone 100%</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-xs">
                  <div className="text-emerald-400 font-medium flex items-center gap-1.5">
                    <Battery className="h-4 w-4" /> แบตเตอรี่ มอก.
                  </div>
                  <div className="text-slate-300 mt-1">รอบชาร์จแท้ รับประกันสูงสุด 1 ปี</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-xs">
                  <div className="text-emerald-400 font-medium flex items-center gap-1.5">
                    <Cpu className="h-4 w-4" /> ซ่อมบอร์ดชิป IC
                  </div>
                  <div className="text-slate-300 mt-1">ตรวจวัดไฟ VDD และ IC Power</div>
                </div>
              </div>

              {/* Expandable Detail Drawer for Card 1 */}
              {expandedCard === "lab" && (
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 animate-fade-in text-xs font-mono">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="text-emerald-400 font-semibold flex items-center gap-1.5 mb-2">
                        <Microscope className="h-3.5 w-3.5" /> เครื่องมือแล็บเฉพาะทาง:
                      </div>
                      <ul className="space-y-1.5 text-slate-300">
                        {SERVICE_DETAILS.lab.equipment.map((eq, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-emerald-400">✓</span> {eq}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <div className="text-cyan-400 font-semibold flex items-center gap-1.5 mb-2">
                        <CheckCircle2 className="h-3.5 w-3.5" /> ขั้นตอนมาตรฐาน:
                      </div>
                      <ul className="space-y-1.5 text-slate-300">
                        {SERVICE_DETAILS.lab.steps.map((st, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-cyan-400">➔</span> {st}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2">
                    <HelpCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white">{SERVICE_DETAILS.lab.faq.q}</strong>{" "}
                      {SERVICE_DETAILS.lab.faq.a}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-6 mt-6 flex items-center justify-between border-t border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => toggleExpand("lab")}
                className="min-h-[44px] inline-flex items-center gap-1 text-slate-300 hover:text-white transition-colors"
                aria-expanded={expandedCard === "lab"}
              >
                <span>{expandedCard === "lab" ? "ซ่อนรายละเอียดแล็บ" : "ดูเครื่องมือแล็บ & ขั้นตอนละเอียด"}</span>
                {expandedCard === "lab" ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {showEstimate && (
              <a
                href="#estimate"
                className="min-h-[44px] inline-flex items-center gap-1 font-medium text-emerald-400 hover:text-emerald-300 transition-colors duration-150"
              >
                <span>คำนวณราคาซ่อมออนไลน์</span>
                <ArrowRight className="h-4 w-4" />
              </a>
              )}
            </div>
          </div>

          {/* Card 2: 24/7 Live Tracking System */}
          <div className="rounded-3xl bg-slate-50 border border-slate-200 p-6 sm:p-7 relative flex flex-col justify-between shadow-2xs hover:border-slate-300 transition-all duration-200 group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-11 w-11 rounded-2xl bg-white text-emerald-700 flex items-center justify-center border border-slate-200 transition-transform group-hover:scale-105 shadow-2xs">
                  <Eye className="h-5 w-5" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-medium border border-emerald-200 font-mono tabular-nums">
                  Real-time 24 ชม.
                </span>
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-slate-900">
                  2. ติดตามงานซ่อมออนไลน์ (Live Tracking)
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                  ตรวจสอบความคืบหน้าของงานซ่อมผ่านเว็บไซต์ได้ตลอดเวลา พร้อมภาพถ่ายสภาพเครื่องจริงจากช่างเทคนิค และระบบกดอนุมัติราคาประเมินผ่านมือถือ
                </p>
              </div>

              <div className="space-y-2 pt-2 text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>ดูภาพถ่ายก่อน ระหว่าง และหลังซ่อมจริง</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>ระบบอนุมัติราคาดิจิทัล ไม่ต้องรอติดต่อกลับ</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>ตรวจรายงานผล QC 10 จุดอย่างละเอียด</span>
                </div>
              </div>

              {/* Expandable Drawer */}
              {expandedCard === "tracking" && (
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2.5 animate-fade-in text-xs font-mono shadow-2xs">
                  <div className="text-emerald-800 font-semibold">เทคโนโลยีระบบติดตาม:</div>
                  <ul className="space-y-1 text-slate-600">
                    {SERVICE_DETAILS.tracking.equipment.map((eq, i) => (
                      <li key={i}>• {eq}</li>
                    ))}
                  </ul>
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                    💡 {SERVICE_DETAILS.tracking.faq.a}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 mt-6 border-t border-slate-200 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => toggleExpand("tracking")}
                className="text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
                aria-expanded={expandedCard === "tracking"}
              >
                <span>{expandedCard === "tracking" ? "ย่อ" : "ดูรายละเอียด"}</span>
                {expandedCard === "tracking" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>

              {showLiveTracking && (
                <a
                  href="#track-search"
                  className="min-h-[44px] inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
                >
                  <span>ทดลองตรวจสอบสถานะ</span>
                  <ArrowRight className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          {/* Card 3: Buy / Sell / Trade-in with IMEI Check */}
          <div className="rounded-3xl bg-slate-50 border border-slate-200 p-6 sm:p-7 relative flex flex-col justify-between shadow-2xs hover:border-slate-300 transition-all duration-200 group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-11 w-11 rounded-2xl bg-white text-slate-700 flex items-center justify-center border border-slate-200 transition-transform group-hover:scale-105 shadow-2xs">
                  <RefreshCw className="h-5 w-5" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 font-mono">
                  IMEI Verified
                </span>
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-slate-900">
                  3. รับซื้อ ขาย เทิร์น ตรวจเลข IMEI
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                  ตรวจสอบประวัติเครื่องและเลข IMEI 15 หลักตามบัตร ปชช. ป้องกันของโจร 100% มีสัญญาซื้อขายถูกต้องตามกฎหมาย และประเมินราคาตามเกณฑ์กลางที่เป็นธรรม
                </p>
              </div>

              <div className="space-y-2 pt-2 text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>ตรวจสอบเลข IMEI กับฐานข้อมูลทางการ</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>ย้ายข้อมูลเครื่องเก่าไปเครื่องใหม่ครบถ้วน</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>ตรวจเช็คและรับเงินโอนภายใน 15 นาที</span>
                </div>
              </div>

              {/* Expandable Drawer */}
              {expandedCard === "tradein" && (
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2.5 animate-fade-in text-xs font-mono shadow-2xs">
                  <div className="text-slate-900 font-semibold">ขั้นตอนการรับซื้อ-เทิร์น:</div>
                  <ul className="space-y-1 text-slate-600">
                    {SERVICE_DETAILS.tradein.steps.map((st, i) => (
                      <li key={i}>• {st}</li>
                    ))}
                  </ul>
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                    🛡️ {SERVICE_DETAILS.tradein.faq.a}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 mt-6 border-t border-slate-200 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => toggleExpand("tradein")}
                className="text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
                aria-expanded={expandedCard === "tradein"}
              >
                <span>{expandedCard === "tradein" ? "ย่อ" : "ดูรายละเอียด"}</span>
                {expandedCard === "tradein" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>

              {showLocation && (
                <a
                  href="#location"
                  className="min-h-[44px] inline-flex items-center gap-1 font-semibold text-slate-800 hover:text-slate-900 transition-colors"
                >
                  <span>ประเมินราคาเทิร์น</span>
                  <ArrowRight className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          {/* Card 4: Easy Installments & Safe Storage */}
          <div className="rounded-3xl bg-slate-50 border border-slate-200 p-6 sm:p-7 relative flex flex-col justify-between shadow-2xs hover:border-slate-300 transition-all duration-200 group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-11 w-11 rounded-2xl bg-white text-slate-700 flex items-center justify-center border border-slate-200 transition-transform group-hover:scale-105 shadow-2xs">
                  <HandCoins className="h-5 w-5" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                  ตู้เซฟนิรภัย
                </span>
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-slate-900">
                  4. บริการผ่อนเครื่องและฝากดูแล
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                  บริการผ่อนชำระสมาร์ตโฟนเครื่องใหม่และมือสองสภาพสวย และบริการดูแลเก็บรักษาในตู้เซฟนิรภัยควบคุมอุณหภูมิ ไม่เปิดเครื่อง ปลอดภัย 100%
                </p>
              </div>

              <div className="space-y-2 pt-2 text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>สัญญาถูกต้องตามกฎหมาย อนุมัติรวดเร็ว</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>จัดเก็บในตู้เซฟมาตรฐาน ไม่มีการแกะใช้งาน</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>ชำระค่างวดผ่านระบบ QR Code ได้สะดวก</span>
                </div>
              </div>

              {/* Expandable Drawer */}
              {expandedCard === "installment" && (
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2.5 animate-fade-in text-xs font-mono shadow-2xs">
                  <div className="text-slate-900 font-semibold">มาตรฐานความปลอดภัยของตู้เซฟ:</div>
                  <ul className="space-y-1 text-slate-600">
                    {SERVICE_DETAILS.installment.equipment.map((eq, i) => (
                      <li key={i}>• {eq}</li>
                    ))}
                  </ul>
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                    🔒 {SERVICE_DETAILS.installment.faq.a}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 mt-6 border-t border-slate-200 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => toggleExpand("installment")}
                className="text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
                aria-expanded={expandedCard === "installment"}
              >
                <span>{expandedCard === "installment" ? "ย่อ" : "ดูรายละเอียด"}</span>
                {expandedCard === "installment" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>

              {showLocation && (
                <a
                  href="#location"
                  className="min-h-[44px] inline-flex items-center gap-1 font-semibold text-slate-800 hover:text-slate-900 transition-colors"
                >
                  <span>เงื่อนไขการผ่อน</span>
                  <ArrowRight className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          {/* Card 5: Genuine Parts & Accessories */}
          <div className="rounded-3xl bg-slate-50 border border-slate-200 p-6 sm:p-7 relative flex flex-col justify-between shadow-2xs hover:border-slate-300 transition-all duration-200 group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-11 w-11 rounded-2xl bg-white text-emerald-700 flex items-center justify-center border border-slate-200 transition-transform group-hover:scale-105 shadow-2xs">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-medium border border-emerald-200 font-mono tabular-nums">
                  รับประกัน 90-180 วัน
                </span>
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-slate-900">
                  5. อะไหล่แท้และอุปกรณ์เสริมมาตรฐาน
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                  คัดสรรอะไหล่แท้และอุปกรณ์เสริมคุณภาพสูง ฟิล์มกระจกนิรภัย 9H หัวชาร์จ GaN Fast Charge และสายชาร์จที่ผ่านการทดสอบมาตรฐานความปลอดภัย
                </p>
              </div>

              <div className="space-y-2 pt-2 text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>ฟิล์มกระจกติดด้วยเครื่องสุญญากาศ ไม่มีฟองอากาศ</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>หัวชาร์จมาตรฐาน PD ไม่ทำให้รอบแบตเตอรี่เสื่อมไว</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>ใบรับประกันและสติ๊กเกอร์ QR Code ประจำเครื่อง</span>
                </div>
              </div>

              {/* Expandable Drawer */}
              {expandedCard === "parts" && (
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2.5 animate-fade-in text-xs font-mono shadow-2xs">
                  <div className="text-emerald-800 font-semibold">การทดสอบอุปกรณ์เสริม:</div>
                  <ul className="space-y-1 text-slate-600">
                    {SERVICE_DETAILS.parts.equipment.map((eq, i) => (
                      <li key={i}>• {eq}</li>
                    ))}
                  </ul>
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                    🛡️ {SERVICE_DETAILS.parts.faq.a}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 mt-6 border-t border-slate-200 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => toggleExpand("parts")}
                className="text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
                aria-expanded={expandedCard === "parts"}
              >
                <span>{expandedCard === "parts" ? "ย่อ" : "ดูรายละเอียด"}</span>
                {expandedCard === "parts" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>

              <a
                href="#services"
                className="min-h-[44px] inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
              >
                <span>ดูอะไหล่มาตรฐาน</span>
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Card 6: Automatic LINE Notifications */}
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-7 text-white relative flex flex-col justify-between shadow-2xs hover:border-slate-700 transition-all duration-200 group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-11 w-11 rounded-2xl bg-slate-800 text-emerald-400 flex items-center justify-center border border-slate-700 transition-transform group-hover:scale-105 shadow-2xs">
                  <BellRing className="h-5 w-5" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 text-xs font-medium border border-emerald-800 font-mono">
                  LINE Official Bot
                </span>
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-white">
                  6. แจ้งเตือนสถานะผ่าน LINE อัตโนมัติ
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                  เชื่อมต่อระบบแจ้งเตือนเข้ากับ LINE Official Account รายงานความคืบหน้าทุกขั้นตอน ตั้งแต่เปิดใบรับซ่อม เสนอราคา จนถึงทดสอบ QC สำเร็จ
                </p>
              </div>

              <div className="space-y-2 pt-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>แจ้งเตือนอัตโนมัติเมื่อช่างเริ่มดำเนินการซ่อม</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>ส่งภาพถ่ายและผลทดสอบ 10 จุดผ่านแชท</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>แจ้งเตือนทันทีเมื่อเครื่องพร้อมส่งมอบ</span>
                </div>
              </div>

              {/* Expandable Drawer */}
              {expandedCard === "line" && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 animate-fade-in text-xs font-mono">
                  <div className="text-emerald-400 font-semibold">ขั้นตอนการรับแจ้งเตือน:</div>
                  <ul className="space-y-1 text-slate-300">
                    {SERVICE_DETAILS.line.steps.map((st, i) => (
                      <li key={i}>• {st}</li>
                    ))}
                  </ul>
                  <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                    📱 {SERVICE_DETAILS.line.faq.a}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 mt-6 border-t border-slate-800 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => toggleExpand("line")}
                className="text-slate-400 hover:text-white inline-flex items-center gap-1"
                aria-expanded={expandedCard === "line"}
              >
                <span>{expandedCard === "line" ? "ย่อ" : "ดูรายละเอียด"}</span>
                {expandedCard === "line" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>

              {lineId && (
              <a
                href={lineAddFriendUrl(lineId)}
                target="_blank"
                rel="noreferrer"
                className="min-h-[44px] inline-flex items-center gap-1 font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <span>เพิ่มเพื่อน {lineId}</span>
                <ArrowRight className="h-4 w-4" />
              </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
