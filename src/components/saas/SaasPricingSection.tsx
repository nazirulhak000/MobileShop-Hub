"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Check, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";

export function SaasPricingSection() {
  const [isAnnual, setIsAnnual] = useState(false);

  const plans = [
    {
      id: "starter",
      name: "Starter",
      badge: "สำหรับร้านตู้ / ร้านเดี่ยว",
      monthlyPrice: 990,
      annualPrice: 790,
      desc: "ครบทุกฟังก์ชันพื้นฐานสำหรับเริ่มต้นบริหารร้านและงานซ่อมแบบมืออาชีพ",
      popular: false,
      features: [
        "1 สาขา / สูงสุด 5 บัญชีผู้ใช้งาน",
        "ระบบรับเครื่องซ่อม วาด Pattern Lock 3x3",
        "คลังสินค้าคุม IMEI 15 หลัก คัดเกรด A/B/C",
        "แคชเชียร์หน้าร้าน POS & พิมพ์สลิป 80mm",
        "พิมพ์สติ๊กเกอร์ QR Code ติดเครื่องซ่อม",
        "ระบบภาษีบุคคลธรรมดา ภ.ง.ด.90/94 (ปี 2568)",
        "หน้าเว็บหน้าร้าน Storefront แบบมาตรฐาน",
      ],
      ctaText: "ทดลองใช้ฟรี Starter 14 วัน",
      ctaHref: "/register?plan=starter",
    },
    {
      id: "pro",
      name: "Pro Professional",
      badge: "⭐ แนะนำ ยอดนิยมสูงสุด",
      monthlyPrice: 1890,
      annualPrice: 1510,
      desc: "ยกระดับศูนย์บริการ เพิ่มระบบติดตามสด และขยายได้สูงสุด 3 สาขา",
      popular: true,
      features: [
        "รองรับ 3 สาขา / ไม่จำกัดจำนวนผู้ใช้งาน",
        "ทุกฟังก์ชันในแพ็กเกจ Starter",
        "⭐️ แถมฟรี! หน้าเว็บหน้าร้าน (Storefront) ระดับสตูดิโอ",
        "ระบบ Live Tracking ลูกค้าตรวจเช็คสดและอนุมัติราคาเอง",
        "ระบบแจ้งเตือนลูกค้าอัตโนมัติผ่าน LINE OA",
        "ระบบผ่อนชำระกับทางร้าน (คำนวณงวด & ทวงถาม)",
        "ระบบโอนย้ายสต็อกข้ามสาขา และบันทึกประวัติเครื่อง",
        "ระบบภาษีนิติบุคคล ภ.ง.ด.50/51 และ ภ.พ.30",
      ],
      ctaText: "ทดลองใช้ฟรี Pro 14 วัน",
      ctaHref: "/register?plan=pro",
    },
    {
      id: "enterprise",
      name: "Enterprise",
      badge: "ศูนย์บริการ & แฟรนไชส์",
      monthlyPrice: 3490,
      annualPrice: 2790,
      desc: "ไม่จำกัดสาขา เหมาะสำหรับเครือข่ายศูนย์ซ่อมและธุรกิจเต็มรูปแบบ",
      popular: false,
      features: [
        "ไม่จำกัดจำนวนสาขา / ไม่จำกัดผู้ใช้งาน",
        "ทุกฟังก์ชันในแพ็กเกจ Pro",
        "ระบบสัญญาฝากรับจำนำมือถือ & เครื่องหลุดจำนำ",
        "ใบแจ้งหนี้องค์กร B2B & วางบิลเครดิตเทอม",
        "ระบบลงเวลาพนักงาน + คำนวณคอมมิชชั่น & ประกันสังคม",
        "สิทธิ์เข้าถึง API เชื่อมต่อกับระบบอื่น",
        "บริการย้ายข้อมูลเดิมจาก Excel ฟรี",
        "Dedicated Support ดูแลส่วนตัวตลอด 24/7",
      ],
      ctaText: "ทดลองใช้ฟรี Enterprise 14 วัน",
      ctaHref: "/register?plan=enterprise",
    },
  ];

  return (
    <section id="pricing" className="py-20 lg:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
        <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900 text-emerald-400 text-xs font-semibold border border-slate-800">
          <Sparkles className="h-3.5 w-3.5" />
          <span>ความคุ้มค่าสูงสุด คืนทุนตั้งแต่เดือนแรก</span>
        </span>
        <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
          เลือกแพ็กเกจที่เหมาะกับขนาดร้านของคุณ
        </h2>
        <p className="text-sm sm:text-base text-slate-400">
          ทดลองใช้งานฟรี 14 วันเต็มทุกแพ็กเกจ ไม่ต้องกรอกบัตรเครดิต ยกเลิกหรือเปลี่ยนแพ็กเกจได้ตลอดเวลา
        </p>

        {/* Billing Switch */}
        <div className="pt-4 flex items-center justify-center gap-3 text-xs sm:text-sm font-semibold select-none">
          <span className={!isAnnual ? "text-white" : "text-slate-400"}>จ่ายรายเดือน</span>
          <button
            type="button"
            onClick={() => setIsAnnual(!isAnnual)}
            className="w-14 h-8 rounded-full bg-slate-800 border border-slate-700 p-1 flex items-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            role="switch"
            aria-checked={isAnnual}
          >
            <div
              className={`w-6 h-6 rounded-full bg-emerald-400 shadow-sm transition-transform duration-200 ${
                isAnnual ? "translate-x-6 bg-emerald-400" : "translate-x-0 bg-slate-400"
              }`}
            />
          </button>
          <span className={isAnnual ? "text-emerald-400 flex items-center gap-1.5" : "text-slate-400"}>
            <span>จ่ายรายปี</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              ประหยัด 20%
            </span>
          </span>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        {plans.map((plan) => {
          const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;

          return (
            <div
              key={plan.id}
              className={`rounded-3xl p-8 flex flex-col justify-between transition-all duration-200 relative ${
                plan.popular
                  ? "bg-slate-900 border-2 border-emerald-400 shadow-2xl shadow-emerald-950/40 lg:-translate-y-2"
                  : "bg-slate-900/60 border border-slate-800 hover:border-slate-700"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-emerald-400 text-slate-950 text-xs font-extrabold uppercase tracking-wider shadow-md">
                  คุ้มค่าที่สุด • ยอดนิยม
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <span className="text-xs font-semibold text-slate-400 block">
                    {plan.badge}
                  </span>
                  <h3 className="text-xl font-bold text-white mt-1">{plan.name}</h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">{plan.desc}</p>
                </div>

                {/* Price Display */}
                <div className="pt-2 pb-4 border-b border-slate-800">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold text-white font-mono tabular-nums">
                      ฿{price.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-400">/ เดือน</span>
                  </div>
                  <span className="text-[11px] text-slate-500 block mt-1">
                    {isAnnual ? "*คิดค่าบริการแบบรายปี (ประหยัด 20%)" : "*คิดค่าบริการตามรอบบิลรายเดือน"}
                  </span>
                </div>

                {/* Feature List */}
                <div className="space-y-3 text-xs sm:text-sm text-slate-300">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    ฟังก์ชันที่ได้รับ:
                  </span>
                  {plan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Action Button */}
              <div className="pt-8">
                <Link
                  href={plan.ctaHref}
                  className={`w-full min-h-[48px] rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-150 ${
                    plan.popular
                      ? "bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-md shadow-emerald-500/20"
                      : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                  }`}
                >
                  <span>{plan.ctaText}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <div className="text-center text-[11px] text-slate-500 mt-2">
                  ไม่ต้องใช้บัตรเครดิต • ทดลองเต็มระบบ
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
