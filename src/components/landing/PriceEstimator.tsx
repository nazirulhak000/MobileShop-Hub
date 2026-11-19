"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Calculator,
  Smartphone,
  Wrench,
  Clock,
  ShieldCheck,
  CheckCircle2,
  MessageCircle,
  Phone,
  AlertCircle,
  Tag,
  Sparkles,
  Calendar,
  X,
  BadgePercent,
  ChevronRight,
} from "lucide-react";
import { formatTHB } from "@/lib/utils";

interface BrandOption {
  id: string;
  name: string;
  models: string[];
}

const BRANDS: BrandOption[] = [
  {
    id: "apple-iphone",
    name: "Apple iPhone",
    models: [
      "iPhone 15 Pro Max",
      "iPhone 15 Pro",
      "iPhone 15 / 15 Plus",
      "iPhone 14 Pro Max",
      "iPhone 14 Pro",
      "iPhone 14 / 14 Plus",
      "iPhone 13 Pro Max",
      "iPhone 13 / 13 Pro",
      "iPhone 12 / 12 Pro",
      "iPhone 11 / 11 Pro",
    ],
  },
  {
    id: "apple-ipad",
    name: "Apple iPad",
    models: [
      "iPad Pro 11 / 12.9 (M1/M2/M4)",
      "iPad Air 4 / 5 / 6",
      "iPad Gen 10 (10.9-inch)",
      "iPad Gen 9 (10.2-inch)",
      "iPad mini 6",
    ],
  },
  {
    id: "samsung",
    name: "Samsung Galaxy",
    models: [
      "Galaxy S24 Ultra",
      "Galaxy S24 / S24+",
      "Galaxy S23 Ultra",
      "Galaxy S23 / S23+",
      "Galaxy S22 Ultra",
      "Galaxy Z Fold 5 / 4",
      "Galaxy Z Flip 5 / 4",
      "Galaxy A55 / A54 5G",
    ],
  },
  {
    id: "xiaomi",
    name: "Xiaomi / Redmi",
    models: [
      "Xiaomi 14 / 14 Pro",
      "Xiaomi 13 / 13 Ultra",
      "Redmi Note 13 Pro+ 5G",
      "Redmi Note 12 Pro",
      "POCO F5 / F5 Pro",
    ],
  },
  {
    id: "oppo",
    name: "OPPO",
    models: [
      "OPPO Find X6 Pro / N3",
      "OPPO Reno 11 Pro 5G",
      "OPPO Reno 10 Pro+ 5G",
      "OPPO Reno 8 / 8 Pro",
      "OPPO A78 / A98 5G",
    ],
  },
  {
    id: "vivo",
    name: "vivo",
    models: [
      "vivo X100 Pro / X100",
      "vivo X90 Pro",
      "vivo V30 Pro / V30",
      "vivo V29 5G",
      "vivo Y36 / Y27 5G",
    ],
  },
];

interface SymptomOption {
  id: string;
  name: string;
  badge: string;
  basePrice: number;
  timeEst: string;
}

const SYMPTOMS: SymptomOption[] = [
  {
    id: "screen",
    name: "เปลี่ยนชุดหน้าจอแท้ OLED / อะไหล่แท้โรงงาน",
    badge: "ย้าย True Tone และ 120Hz ครบ",
    basePrice: 2400,
    timeEst: "35 - 50 นาที",
  },
  {
    id: "glass",
    name: "ลอกกระจกจอแท้ OCA (จอในเดิมแสดงภาพปกติ)",
    badge: "ประหยัดกว่าเปลี่ยนยกชุด 50%",
    basePrice: 1400,
    timeEst: "60 - 90 นาที",
  },
  {
    id: "battery",
    name: "เปลี่ยนแบตเตอรี่มาตรฐาน มอก. พร้อมใบเซอร์รับรอง",
    badge: "มาตรฐาน มอก. แท้ รับประกันสูงสุด 1 ปี",
    basePrice: 1190,
    timeEst: "20 - 30 นาที",
  },
  {
    id: "board",
    name: "ตรวจวัดกระแสไฟและซ่อมเมนบอร์ดชิป IC",
    badge: "ตรวจวัดกระแสไฟระดับแล็บฟรี",
    basePrice: 1900,
    timeEst: "1 - 3 ชั่วโมง",
  },
  {
    id: "charge",
    name: "ซ่อมก้นชาร์จ Type-C / Lightning / ไมโครโฟน",
    badge: "แก้อาการชาร์จไม่เข้า ไมค์ไม่ดัง",
    basePrice: 850,
    timeEst: "25 - 40 นาที",
  },
  {
    id: "camera",
    name: "เปลี่ยนชุดโมดูลกล้องแท้ / กระจกเลนส์กล้อง",
    badge: "เลนส์ใส คมชัด ไม่สั่นกระตุก",
    basePrice: 1250,
    timeEst: "30 - 45 นาที",
  },
  {
    id: "backglass",
    name: "เปลี่ยนฝาหลังกระจกด้วยเครื่องเลเซอร์อุณหภูมิควบคุม",
    badge: "โครงเครื่องไม่ช้ำ ขอบแนบสนิท",
    basePrice: 1350,
    timeEst: "60 - 80 นาที",
  },
];

export interface PriceEstimatorProps {
  phone?: string | null;
  lineId?: string | null;
}

export function PriceEstimator({ phone, lineId }: PriceEstimatorProps = {}) {
  const [selectedBrand, setSelectedBrand] = useState<string>("apple-iphone");
  const [selectedModel, setSelectedModel] = useState<string>("iPhone 14 Pro Max");
  const [selectedSymptom, setSelectedSymptom] = useState<string>("screen");

  // Part Grade Interactive Switcher: 'genuine' (180 days) vs 'premium' (90 days)
  const [partGrade, setPartGrade] = useState<"genuine" | "premium">("genuine");

  // Booking Modal State
  const [isBookingOpen, setIsBookingOpen] = useState<boolean>(false);
  const [bookingTime, setBookingTime] = useState<string>("วันนี้ 14:00 น.");

  const currentBrandObj = useMemo(() => {
    return BRANDS.find((b) => b.id === selectedBrand) || BRANDS[0];
  }, [selectedBrand]);

  const handleBrandChange = (brandId: string) => {
    setSelectedBrand(brandId);
    const brand = BRANDS.find((b) => b.id === brandId);
    if (brand && brand.models.length > 0) {
      setSelectedModel(brand.models[0]);
    }
  };

  const estimation = useMemo(() => {
    const symptom = SYMPTOMS.find((s) => s.id === selectedSymptom) || SYMPTOMS[0];

    let multiplier = 1.0;
    const lowerModel = selectedModel.toLowerCase();
    if (lowerModel.includes("15 pro") || lowerModel.includes("s24 ultra") || lowerModel.includes("fold") || lowerModel.includes("x100")) {
      multiplier = 1.7;
    } else if (lowerModel.includes("14 pro") || lowerModel.includes("s23 ultra") || lowerModel.includes("m4") || lowerModel.includes("13 ultra")) {
      multiplier = 1.45;
    } else if (lowerModel.includes("13 pro") || lowerModel.includes("s22") || lowerModel.includes("ipad pro")) {
      multiplier = 1.25;
    } else if (lowerModel.includes("redmi") || lowerModel.includes("y36") || lowerModel.includes("a78")) {
      multiplier = 0.85;
    }

    // Grade multiplier: genuine is 1.0x, premium TIS is 0.78x
    const gradeFactor = partGrade === "genuine" ? 1.0 : 0.78;
    const warrantyDays = partGrade === "genuine" ? 180 : 90;

    const minPrice = Math.round((symptom.basePrice * multiplier * gradeFactor) / 50) * 50;
    const maxPrice = minPrice + (minPrice > 2500 ? 500 : 350);

    return {
      minPrice,
      maxPrice,
      timeEst: symptom.timeEst,
      warrantyDays,
      symptomName: symptom.name,
      gradeTitle:
        partGrade === "genuine"
          ? "อะไหล่แท้ศูนย์ 100% (รับประกัน 180 วัน)"
          : "เกรดพรีเมียม มอก. (รับประกัน 90 วัน)",
    };
  }, [selectedModel, selectedSymptom, partGrade]);

  return (
    <section id="estimate" className="py-16 sm:py-24 bg-white relative border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-medium border border-slate-200">
            <Calculator className="h-3.5 w-3.5 text-emerald-600" />
            <span>ตัวอย่างระบบประเมินราคา (ราคาสาธิต)</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-slate-900 tracking-tight">
            ประเมินราคาซ่อมและระยะเวลารอรับเครื่อง
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            เลือกยี่ห้อ รุ่น อาการเสีย และสลับดูเกรดอะไหล่แท้ศูนย์ vs มอก. เพื่อดูตัวอย่างช่วงราคาและระยะเวลาดำเนินการ (ราคาในส่วนนี้เป็นตัวอย่าง ไม่ใช่ราคาจริงของร้าน)
          </p>
        </div>

        {/* Calculator Main Box */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start bg-slate-50 rounded-3xl border border-slate-200 p-6 sm:p-8 lg:p-10 shadow-xs">
          {/* Left Inputs (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Brand Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-emerald-700" />
                <span>1. เลือกยี่ห้ออุปกรณ์ (Brand)</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {BRANDS.map((brand) => (
                  <button
                    key={brand.id}
                    type="button"
                    onClick={() => handleBrandChange(brand.id)}
                    className={`min-h-[44px] p-3 rounded-xl text-xs font-medium border transition-colors duration-150 motion-reduce:transition-none text-left flex items-center justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                      selectedBrand === brand.id
                        ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span>{brand.name}</span>
                    {selectedBrand === brand.id && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Model Dropdown */}
            <div className="space-y-2">
              <label
                htmlFor="model-select"
                className="text-xs font-semibold text-slate-900 uppercase tracking-wider block"
              >
                2. เลือกรุ่นสมาร์ตโฟนหรือแท็บเล็ต (Model)
              </label>
              <select
                id="model-select"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-colors cursor-pointer shadow-2xs"
              >
                {currentBrandObj.models.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Symptom Radio Grid */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Wrench className="h-4 w-4 text-emerald-700" />
                <span>3. เลือกอาการเสียและบริการที่ต้องการ</span>
              </label>
              <div className="space-y-2">
                {SYMPTOMS.map((s) => (
                  <label
                    key={s.id}
                    className={`min-h-[44px] flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-colors duration-150 motion-reduce:transition-none ${
                      selectedSymptom === s.id
                        ? "bg-white border-slate-900 shadow-xs"
                        : "bg-white/70 border-slate-200 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="symptom"
                        checked={selectedSymptom === s.id}
                        onChange={() => setSelectedSymptom(s.id)}
                        className="text-emerald-600 focus:ring-emerald-600 h-4 w-4"
                      />
                      <div>
                        <div className="text-xs font-semibold text-slate-900">{s.name}</div>
                        <div className="text-xs text-emerald-800 font-medium mt-0.5">{s.badge}</div>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-slate-500 shrink-0 tabular-nums">
                      {s.timeEst}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Right Estimation Result Output Card (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-xl border border-slate-800">
              <div className="space-y-5">
                {/* Device & Symptom Recap */}
                <div className="pb-4 border-b border-slate-800">
                  <span className="text-xs font-mono text-emerald-400 font-medium uppercase tracking-wider block">
                    ผลการประเมินราคาเบื้องต้น
                  </span>
                  <h3 className="text-lg font-semibold text-white mt-1">
                    {selectedModel}
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {estimation.symptomName}
                  </p>
                </div>

                {/* Grade & Warranty Interactive Switch Toggle */}
                <div className="p-1 bg-slate-950 rounded-2xl border border-slate-800 flex gap-1">
                  <button
                    type="button"
                    onClick={() => setPartGrade("genuine")}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium transition-all ${
                      partGrade === "genuine"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <div className="font-semibold">อะไหล่แท้ศูนย์ 100%</div>
                    <div className="text-[10px] opacity-80">รับประกัน 180 วัน</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPartGrade("premium")}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium transition-all ${
                      partGrade === "premium"
                        ? "bg-slate-800 text-white border border-slate-700 shadow-xs"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <div className="font-semibold">เกรดพรีเมียม มอก.</div>
                    <div className="text-[10px] opacity-80">รับประกัน 90 วัน</div>
                  </button>
                </div>

                {/* Price Display with Animated transition */}
                <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium">ราคาประเมินโดยประมาณ:</span>
                    <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                      {partGrade === "genuine" ? "เกรดแท้ศูนย์" : "เกรด มอก. ประหยัด"}
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-semibold text-white font-mono tracking-tight tabular-nums">
                    {formatTHB(estimation.minPrice)} - {formatTHB(estimation.maxPrice)}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    * รวมค่าแรงช่าง อะไหล่ และซีลกาวกันน้ำมาตรฐานโรงงาน
                  </div>
                </div>

                {/* Turnaround Time & Warranty Cards */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700 space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Clock className="h-4 w-4 text-emerald-400" />
                      <span>ระยะเวลาซ่อม:</span>
                    </div>
                    <div className="font-semibold text-sm text-white font-mono tabular-nums">
                      {estimation.timeEst}
                    </div>
                    <div className="text-xs text-emerald-400">รอรับเครื่องที่ศูนย์ได้</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700 space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      <span>การรับประกัน:</span>
                    </div>
                    <div className="font-semibold text-sm text-white font-mono tabular-nums">
                      {estimation.warrantyDays} วันเต็ม
                    </div>
                    <div className="text-xs text-slate-400">บันทึกในระบบดิจิทัล</div>
                  </div>
                </div>

                {/* Instant 'จองคิวด่วนพร้อมส่วนลด' Action Button */}
                <button
                  type="button"
                  onClick={() => setIsBookingOpen(true)}
                  className="min-h-[48px] w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  <BadgePercent className="h-4 w-4" />
                  <span>ดูตัวอย่างขั้นตอนจองคิวออนไลน์</span>
                </button>

              </div>
            </div>

            {/* Note alert */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-slate-700 shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed">
                ราคาจริงอาจแตกต่างตามสภาพเครื่องและการตรวจวัดกระแสไฟหน้าร้าน ช่างจะแจ้งเสนอราคาอย่างเป็นทางการให้คุณอนุมัติก่อนลงมือซ่อมเสมอ ไม่มีค่าเปิดเครื่องหากไม่ประสงค์จะซ่อม
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Instant Booking Summary Modal Drawer */}
      {isBookingOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700 text-white p-6 sm:p-8 shadow-2xl space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1 inline-flex">
                  <Sparkles className="h-3 w-3" /> ตัวอย่างสิทธิ์ส่วนลด (สาธิต)
                </span>
                <h3 className="text-xl font-semibold text-white mt-2">
                  สรุปการจองคิวซ่อมด่วนล่วงหน้า
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBookingOpen(false)}
                className="h-8 w-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Pre-filled Quote Slip */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs font-mono">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">รุ่นอุปกรณ์:</span>
                <span className="text-white font-semibold">{selectedModel}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">อาการเสีย:</span>
                <span className="text-white font-semibold">{estimation.symptomName}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">เกรดอะไหล่:</span>
                <span className="text-emerald-400 font-semibold">{estimation.gradeTitle}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">เวลาซ่อมประมาณ:</span>
                <span className="text-white">{estimation.timeEst}</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between text-slate-300">
                <span className="text-slate-400">ราคาประเมินปกติ:</span>
                <span className="text-slate-400 line-through">฿{estimation.minPrice}</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-semibold">
                <span>ส่วนลดจองออนไลน์:</span>
                <span>-฿200</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-bold text-white">
                <span>ยอดสุทธิโดยประมาณ:</span>
                <span className="text-emerald-400 font-mono text-base">
                  ฿{Math.max(0, estimation.minPrice - 200)}
                </span>
              </div>
            </div>

            {/* Time Slot Selector */}
            <div className="space-y-2">
              <label className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-emerald-400" /> เลือกรอบเวลาที่สะดวกนำเครื่องเข้า:
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {["วันนี้ 14:00 น.", "วันนี้ 16:30 น.", "พรุ่งนี้ 10:30 น."].map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setBookingTime(slot)}
                    className={`py-2 px-2.5 rounded-xl border text-center transition-colors ${
                      bookingTime === slot
                        ? "bg-emerald-600 text-white border-emerald-400 font-semibold"
                        : "bg-slate-800 text-slate-300 border-slate-700 hover:text-white"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2 space-y-2.5">
              <button
                type="button"
                disabled
                title="ตัวอย่าง — ยังไม่เปิดรับจองออนไลน์"
                className="min-h-[46px] w-full py-3 px-4 bg-slate-700 text-slate-300 font-medium text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 cursor-not-allowed"
              >
                <MessageCircle className="h-4 w-4" />
                <span>ตัวอย่าง — ยังไม่เปิดรับจองออนไลน์</span>
              </button>

              <button
                type="button"
                onClick={() => setIsBookingOpen(false)}
                className="w-full min-h-[44px] text-center text-xs text-slate-400 hover:text-white py-1"
              >
                ย้อนกลับไปแก้ไขข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
