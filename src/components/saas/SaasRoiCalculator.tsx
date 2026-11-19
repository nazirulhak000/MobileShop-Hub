"use client";

import React, { useState } from "react";
import { Calculator, TrendingUp, Clock, ShieldCheck, Sparkles, DollarSign } from "lucide-react";

export function SaasRoiCalculator() {
  const [repairsPerDay, setRepairsPerDay] = useState(15);
  const [staffCount, setStaffCount] = useState(3);

  // Calculations
  const hoursSavedPerMonth = Math.round(repairsPerDay * 0.25 * 26 + staffCount * 4);
  const estimatedStockLossPrevented = Math.round(repairsPerDay * 550);
  const additionalRevenueFromLiveTracking = Math.round(repairsPerDay * 800 * 26 * 0.08);
  const totalMonthlyGain = estimatedStockLossPrevented + additionalRevenueFromLiveTracking;
  const proSubscriptionCost = 1890;
  const roiPercentage = Math.round(((totalMonthlyGain - proSubscriptionCost) / proSubscriptionCost) * 100);

  return (
    <section id="roi" className="py-20 lg:py-28 bg-slate-900/40 border-b border-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/30">
            <Calculator className="h-3.5 w-3.5" />
            <span>Interactive ROI Calculator</span>
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            คำนวณความคุ้มค่าที่ร้านของคุณจะได้รับ
          </h2>
          <p className="text-xs sm:text-base text-slate-400">
            ทดลองเลื่อนแถบจำลองขนาดร้านของคุณเพื่อดูเวลาและผลตอบแทนที่ MobileShop-Hub ช่วยประหยัดได้ต่อเดือน
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl">
          {/* Left Side: Sliders (6 cols) */}
          <div className="lg:col-span-6 space-y-8">
            {/* Slider 1: Repairs per day */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor="repairs-slider" className="text-sm font-semibold text-white">
                  จำนวนงานซ่อมที่รับเฉลี่ยต่อวัน
                </label>
                <span className="text-lg font-extrabold text-emerald-400 font-mono tabular-nums">
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
                className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                <span>3 เครื่อง</span>
                <span>25 เครื่อง</span>
                <span>50+ เครื่อง</span>
              </div>
            </div>

            {/* Slider 2: Staff Count */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor="staff-slider" className="text-sm font-semibold text-white">
                  จำนวนช่างและพนักงานในร้าน
                </label>
                <span className="text-lg font-extrabold text-teal-400 font-mono tabular-nums">
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
                className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                <span>1 คน (ร้านเดี่ยว)</span>
                <span>5 คน</span>
                <span>10+ คน (ทีมใหญ่)</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400 space-y-1.5 leading-relaxed">
              <span className="font-semibold text-white block">หลักเกณฑ์การคำนวณ:</span>
              <span>• ประหยัดเวลาเปิดบิลและตามงานซ่อมเฉลี่ย 15 นาที / เครื่อง</span>
              <span>• ลดการสูญหายของอะไหล่และโทรศัพท์ด้วยระบบคุม IMEI 15 หลัก</span>
              <span>• ลูกค้าอนุมัติซ่อมไวขึ้นและบอกต่อผ่านระบบ Live Tracking</span>
            </div>
          </div>

          {/* Right Side: Projected Metrics Output (6 cols) */}
          <div className="lg:col-span-6 bg-slate-950 p-6 sm:p-8 rounded-2xl border border-slate-800/80 space-y-6">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
              ผลลัพธ์ที่ประเมินได้สำหรับร้านของคุณ:
            </span>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                  <Clock className="h-3.5 w-3.5 text-emerald-400" />
                  <span>เวลาที่ประหยัดได้</span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tabular-nums mt-1">
                  ~{hoursSavedPerMonth} ชม.
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">ต่อเดือน</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                  <TrendingUp className="h-3.5 w-3.5 text-teal-400" />
                  <span>ผลตอบแทน (ROI)</span>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono tabular-nums mt-1">
                  +{roiPercentage}%
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">เทียบค่าโปรแกรม Pro</div>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/30 space-y-1">
              <span className="text-xs text-slate-300 font-medium">
                มูลค่ากำไรและต้นทุนที่ระบบช่วยเซฟให้คุณได้ประมาณ:
              </span>
              <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono tabular-nums">
                ฿{totalMonthlyGain.toLocaleString()}{" "}
                <span className="text-xs font-normal text-emerald-400">/ เดือน</span>
              </div>
              <p className="text-[11px] text-slate-400 pt-1">
                เมื่อเทียบกับค่าบริการ MobileShop-Hub Pro เพียง ฿1,890 / เดือน คุณจะคืนทุนตั้งแต่วันแรก ๆ ที่เริ่มใช้
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
