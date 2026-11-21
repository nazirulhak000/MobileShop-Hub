"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Check, Sparkles, ArrowRight, ShieldCheck, Zap, HeartHandshake } from "lucide-react";

export function SaasPricingSection() {
  const [isAnnual, setIsAnnual] = useState(true);

  const plans = [
    {
      id: "free",
      name: "Free Forever",
      badge: "🎉 ฟรีจริง ไม่มีวันหมดอายุ",
      monthlyPrice: 0,
      annualPrice: 0,
      desc: "ครบทุกฟังก์ชันจำเป็นสำหรับเริ่มต้นเปิดร้านตู้และช่างอิสระ ใช้งานฟรีตลอดชีพ ไม่ต้องใส่บัตรเครดิต",
      popular: false,
      highlightText: "฿0 / ตลอดไป",
      features: [
        "ฟรีตลอดชีพ 0 บาท (ไม่มีค่าใช้จ่ายแอบแฝง)",
        "1 สาขา / สูงสุด 3 บัญชีผู้ใช้งาน",
        "ระบบเปิดบิลรับเครื่องซ่อม บันทึก Pattern Lock 3x3",
        "คลังสินค้าคุม IMEI 15 หลัก คัดเกรดเครื่อง A/B/C",
        "แคชเชียร์หน้าร้าน POS & พิมพ์สลิปใบเสร็จ 80mm",
        "พิมพ์สติ๊กเกอร์ QR Code ติดหลังเครื่องซ่อม",
        "⭐️ แถมฟรี! หน้าเว็บหน้าร้าน Storefront สำหรับลูกค้า",
        "ระบบคำนวณภาษีบุคคลธรรมดา ภ.ง.ด.90/94 (ปี 2568)",
      ],
      ctaText: "เปิดร้านฟรีตลอดไป (0 บาท)",
      ctaHref: "/register?plan=free",
    },
    {
      id: "pro",
      name: "Pro Studio",
      badge: "🔥 ถูกที่สุด คุ้มค่าที่สุด (ยอดนิยม)",
      monthlyPrice: 199,
      annualPrice: 149,
      desc: "เพียง 199.-/เดือน ได้ระบบ Live Tracking 24 ชม. และแจ้งเตือน LINE OA อัตโนมัติ ยกระดับความน่าเชื่อถือ",
      popular: true,
      highlightText: "เพียง ฿199 / เดือน",
      features: [
        "รองรับสูงสุด 3 สาขา / ไม่จำกัดจำนวนช่างและผู้ใช้",
        "ทุกฟังก์ชันในแพ็กเกจ Free Forever",
        "⭐️ ระบบ Live Tracking ให้ลูกค้าตรวจเช็คภาพถ่ายงานซ่อมสด 24 ชม.",
        "ระบบให้ลูกค้ากดอนุมัติราคาประเมินดิจิทัลผ่านมือถือ",
        "ระบบแจ้งเตือนสถานะซ่อมอัตโนมัติผ่าน LINE OA ทันที",
        "ระบบผ่อนชำระกับทางร้าน (คำนวณดอกเบี้ย งวด & ทวงถาม)",
        "โอนย้ายสต็อกอะไหล่ข้ามสาขา และบันทึกประวัติเครื่องถาวร",
        "ระบบภาษีนิติบุคคล ภ.พ.30, ภ.ง.ด.50/51 อัตโนมัติ",
        "สำรองข้อมูลบน Cloud อัตโนมัติทุก 1 ชั่วโมง",
      ],
      ctaText: "สมัครใช้งาน Pro เพียง ฿199",
      ctaHref: "/register?plan=pro",
    },
    {
      id: "enterprise",
      name: "Enterprise",
      badge: "👑 เครือข่ายศูนย์ซ่อม & หลายสาขา",
      monthlyPrice: 399,
      annualPrice: 299,
      desc: "เพียง 399.-/เดือน ปลดล็อคไม่จำกัดสาขา ไม่จำกัดช่าง ระบบฝากจำนำ และ B2B วางบิลองค์กร",
      popular: false,
      highlightText: "เพียง ฿399 / เดือน",
      features: [
        "ไม่จำกัดจำนวนสาขา / ไม่จำกัดผู้ใช้งาน / ไม่จำกัดช่าง",
        "ทุกฟังก์ชันในแพ็กเกจ Pro Studio",
        "ระบบสัญญาฝากรับจำนำมือถือ & เครื่องหลุดจำนำ คุมสัญญา",
        "ใบแจ้งหนี้องค์กร B2B & วางบิลเครดิตเทอมครบวงจร",
        "ระบบลงเวลาพนักงาน + คำนวณคอมมิชชั่น & ประกันสังคม",
        "API Webhook เชื่อมต่อ ERP และระบบภายนอก",
        "บริการช่วยย้ายข้อมูลเดิมจาก Excel ฟรี 100%",
        "Dedicated VIP Support ดูแลช่วยเหลือส่วนตัวตลอด 24/7",
      ],
      ctaText: "สมัคร Enterprise เพียง ฿399",
      ctaHref: "/register?plan=enterprise",
    },
  ];

  return (
    <section id="pricing" className="py-20 lg:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
      {/* Background glow behind pricing */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-r from-blue-600/10 via-cyan-500/10 to-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative text-center max-w-3xl mx-auto space-y-4 mb-14">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 text-cyan-400 text-xs font-semibold border border-cyan-500/30 shadow-inner">
          <Sparkles className="h-3.5 w-3.5" />
          <span>ราคาเพื่อช่างไทย ถูกที่สุด หรือใช้ฟรีตลอดชีพ</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
          ราคาโปร่งใส เริ่มต้นฟรี หรือจ่ายหลักร้อย
        </h2>
        <p className="text-sm sm:text-base text-slate-300">
          เปิดโอกาสให้ทุกร้านมือถือมีระบบบริหารจัดการระดับมาตรฐานสากล ฟรีจริงตลอดไป 0 บาท หรืออัปเกรด Pro เพียง 199 บาท/เดือน
        </p>

        {/* Billing Switch */}
        <div className="pt-4 flex items-center justify-center gap-3 text-xs sm:text-sm font-semibold select-none">
          <span className={!isAnnual ? "text-white" : "text-slate-400"}>จ่ายรายเดือน</span>
          <button
            type="button"
            onClick={() => setIsAnnual(!isAnnual)}
            className="w-14 h-8 rounded-full bg-slate-800 border border-slate-700 p-1 flex items-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            role="switch"
            aria-checked={isAnnual}
          >
            <div
              className={`w-6 h-6 rounded-full shadow-sm transition-transform duration-200 ${
                isAnnual ? "translate-x-6 bg-gradient-to-r from-cyan-400 to-blue-500" : "translate-x-0 bg-slate-400"
              }`}
            />
          </button>
          <span className={isAnnual ? "text-cyan-400 flex items-center gap-1.5" : "text-slate-400"}>
            <span>จ่ายรายปี</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              ประหยัดเพิ่ม 25% (เริ่มต้น ฿149/ด)
            </span>
          </span>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        {plans.map((plan) => {
          const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;
          const isFree = plan.id === "free";

          return (
            <div
              key={plan.id}
              className={`rounded-3xl p-7 sm:p-8 flex flex-col justify-between transition-all duration-200 relative ${
                plan.popular
                  ? "bg-gradient-to-b from-slate-900 via-slate-900 to-blue-950/40 border-2 border-cyan-400 shadow-2xl shadow-cyan-950/50 lg:-translate-y-3"
                  : "bg-slate-900/70 border border-slate-800 hover:border-slate-700"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-extrabold uppercase tracking-wider shadow-md">
                  คุ้มค่าที่สุด • ยอดนิยมอันดับ 1
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <span className="text-xs font-semibold text-cyan-400 block">
                    {plan.badge}
                  </span>
                  <h3 className="text-2xl font-bold text-white mt-1.5">{plan.name}</h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">{plan.desc}</p>
                </div>

                {/* Price Display */}
                <div className="pt-2 pb-5 border-b border-slate-800">
                  <div className="flex items-baseline gap-2">
                    {isFree ? (
                      <>
                        <span className="text-4xl sm:text-5xl font-black text-emerald-400 font-mono tracking-tight">
                          ฿0
                        </span>
                        <span className="text-sm font-semibold text-emerald-300">/ ฟรีตลอดชีพ</span>
                      </>
                    ) : (
                      <>
                        <span className="text-4xl sm:text-5xl font-black text-white font-mono tabular-nums">
                          ฿{price.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-400">/ เดือน</span>
                      </>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-1.5 font-medium">
                    {isFree
                      ? "ไม่ต้องกรอกบัตรเครดิต • ใช้งานได้ทันที"
                      : isAnnual
                      ? `*ชำระแบบรายปีเพียง ฿${(price * 12).toLocaleString()} / ปี (ตกวันละ 5 บาท)`
                      : "*คิดค่าบริการรอบบิลรายเดือน ไม่ผูกมัด ยกเลิกได้ตลอดเวลา"}
                  </span>
                </div>

                {/* Feature List */}
                <div className="space-y-3 text-xs sm:text-sm text-slate-300">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    สิทธิประโยชน์ที่ได้รับ:
                  </span>
                  {plan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Action Button */}
              <div className="pt-8">
                <Link
                  href={plan.ctaHref}
                  className={`w-full min-h-[50px] rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-150 ${
                    plan.popular
                      ? "bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-lg shadow-cyan-500/25 active:scale-98"
                      : isFree
                      ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold shadow-md shadow-emerald-500/20 active:scale-98"
                      : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 active:scale-98"
                  }`}
                >
                  <span>{plan.ctaText}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <div className="text-center text-[11px] text-slate-400 mt-2.5 flex items-center justify-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
                  <span>รับประกันความพึงพอใจ • เปลี่ยนหรือยกเลิกได้ตลอดเวลา</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
