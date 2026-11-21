"use client";

import React, { useState } from "react";
import { Calculator, TrendingUp, Clock, ShieldCheck, Sparkles, DollarSign, CheckCircle2 } from "lucide-react";

export function SaasRoiCalculator() {
  const [repairsPerDay, setRepairsPerDay] = useState(15);
  const [staffCount, setStaffCount] = useState(3);

  // Calculations
  const hoursSavedPerMonth = Math.round(repairsPerDay * 0.25 * 26 + staffCount * 4);
  const estimatedStockLossPrevented = Math.round(repairsPerDay * 550);
  const additionalRevenueFromLiveTracking = Math.round(repairsPerDay * 800 * 26 * 0.08);
  const totalMonthlyGain = estimatedStockLossPrevented + additionalRevenueFromLiveTracking;
  const proSubscriptionCost = 199; // Updated to ฿199/month
  const roiPercentage = Math.round(((totalMonthlyGain - proSubscriptionCost) / proSubscriptionCost) * 100);

  return (
    <section id="roi" className="py-20 lg:py-28 bg-slate-900/40 border-b border-slate-800 relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-semibold border border-cyan-500/30">
            <Calculator className="h-3.5 w-3.5" />
            <span>Interactive ROI Calculator • เครื่องคำนวณความคุ้มค่า</span>
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            คำนวณผลตอบแทนที่ร้านคุณจะได้รับ
          </h2>
          <p className="text-sm sm:text-base text-slate-300">
            เทียบความคุ้มค่าระหว่างต้นทุนโปรแกรมหลักร้อย (฿199/เดือน หรือฟรี 0 บาท) กับกำไรและเวลาที่ระบบช่วยประหยัดให้ร้านของคุณ
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          {/* Subtle neon gradient bar */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400" />

          {/* Left Side: Sliders (6 cols) */}
          <div className="lg:col-span-6 space-y-8">
            {/* Slider 1: Repairs per day */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor="repairs-slider" className="text-sm font-semibold text-white">
                  จำนวนงานซ่อมที่รับเฉลี่ยต่อวัน
                </label>
                <span className="text-lg font-extrabold text-cyan-400 font-mono tabular-nums">
                  {repairsPerDay} เครื่อง / วัน
                </span>
              </div>
              <input
                id="repairs-slider"
                type="range"
                min={3}
                max={50}
                value={repairsPerDay}
                onChange={(e) => setRepairsPerDay(Number(e.target.value))}
                className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                <span>3 เครื่อง (ร้านเล็ก)</span>
                <span>25 เครื่อง</span>
                <span>50+ เครื่อง (ศูนย์ใหญ่)</span>
              </div>
            </div>

            {/* Slider 2: Staff Count */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor="staff-slider" className="text-sm font-semibold text-white">
                  จำนวนช่างและพนักงานในร้าน
                </label>
                <span className="text-lg font-extrabold text-blue-400 font-mono tabular-nums">
                  {staffCount} คน
                </span>
              </div>
              <input
                id="staff-slider"
                type="range"
                min={1}
                max={10}
                value={staffCount}
                onChange={(e) => setStaffCount(Number(e.target.value))}
                className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-400"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                <span>1 คน (เจ้าของลุยเดี่ยว)</span>
                <span>5 คน</span>
                <span>10+ คน (ทีมงานศูนย์)</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-2 leading-relaxed">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>ปัจจัยที่ FixMe ช่วยเพิ่มรายได้และลดต้นทุน:</span>
              </span>
              <p>• ประหยัดเวลาเปิดบิลและตามงานซ่อมเฉลี่ย 15 นาที / เครื่อง ด้วยระบบค้นหาด่วน</p>
              <p>• ลดการสูญหายของอะไหล่และโทรศัพท์ด้วยระบบคุม IMEI 15 หลัก แยกช่องเก็บ</p>
              <p>• ลูกค้าอนุมัติซ่อมไวขึ้นและบอกต่อผ่านระบบ Live Tracking 24 ชั่วโมง</p>
            </div>
          </div>

          {/* Right Side: Projected Metrics Output (6 cols) */}
          <div className="lg:col-span-6 bg-slate-950 p-6 sm:p-8 rounded-2xl border border-slate-800/80 space-y-6">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block">
              ผลลัพธ์ประมาณการที่ร้านของคุณจะได้รับ:
            </span>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                  <Clock className="h-3.5 w-3.5 text-cyan-400" />
                  <span>เวลาที่ประหยัดได้</span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tabular-nums mt-1">
                  ~{hoursSavedPerMonth} ชม.
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">ต่อเดือนสำหรับทีมช่าง</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                  <span>ผลตอบแทน (ROI)</span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono tabular-nums mt-1">
                  +{roiPercentage.toLocaleString()}%
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">เทียบค่าโปรแกรม Pro ฿199</div>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-gradient-to-r from-blue-950/60 via-slate-900 to-cyan-950/40 border border-cyan-500/30 space-y-1.5">
              <span className="text-xs text-slate-300 font-medium">
                มูลค่ากำไรและต้นทุนที่ระบบช่วยเซฟให้คุณได้ประมาณ:
              </span>
              <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono tabular-nums">
                ฿{totalMonthlyGain.toLocaleString()}{" "}
                <span className="text-xs font-normal text-cyan-400">/ เดือน</span>
              </div>
              <p className="text-[11px] text-slate-400 pt-1 leading-relaxed">
                เมื่อเทียบกับค่าบริการ FixMe Pro เพียง <strong className="text-white">฿199 / เดือน</strong> (หรือใช้แพ็กเกจฟรี 0 บาท) คุณจะคืนทุนคุ้มค่าตั้งแต่วันแรกที่เริ่มเปิดร้าน
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
