import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import {
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  Wrench,
  Package,
  ShoppingCart,
  CreditCard,
  Calculator,
  ArrowRight,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Store,
  Layers,
  BarChart3,
  QrCode,
  Lock,
  Clock,
  Zap,
  Building2,
  Users,
  Check,
} from "lucide-react";
import { SaasPricingSection } from "@/components/saas/SaasPricingSection";
import { SaasRoiCalculator } from "@/components/saas/SaasRoiCalculator";

export const metadata: Metadata = {
  title: "MobileShop-Hub | ระบบบริหารร้านมือถือ & ศูนย์บริการครบวงจร All-in-One SaaS",
  description:
    "แพลตฟอร์มบริหารร้านมือถืออันดับ 1: คลังสินค้าคุม IMEI 15 หลัก, โต๊ะงานช่าง Kanban บันทึก Pattern Lock, แคชเชียร์ POS, ภาษี 2568 พร้อมแถมฟรีหน้าเว็บหน้าร้าน Live Tracking ให้ลูกค้าร้านคุณตรวจเช็คสถานะซ่อมสดได้ 24 ชั่วโมง",
};

export default function SaasLandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* 1. SaaS Sticky Navigation Header */}
      <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-900/30">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white">
                  MobileShop<span className="text-emerald-400">-Hub</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                  SaaS ERP
                </span>
              </div>
              <span className="text-[11px] text-slate-400 hidden sm:block">
                ระบบบริหารร้านมือถือ & ศูนย์บริการครบวงจร
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-medium text-slate-300">
            <a href="#features" className="hover:text-emerald-400 transition-colors">
              ฟังก์ชันระบบ (38 เมนู)
            </a>
            <a href="#storefront-perk" className="hover:text-emerald-400 transition-colors">
              แถมหน้าร้านลูกค้าฟรี
            </a>
            <a href="#roi" className="hover:text-emerald-400 transition-colors">
              คำนวณความคุ้มค่า
            </a>
            <a href="#pricing" className="hover:text-emerald-400 transition-colors">
              ราคาแพ็กเกจ
            </a>
            <a href="#faq" className="hover:text-emerald-400 transition-colors">
              คำถามที่พบบ่อย
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            <Link
              href="/landing"
              target="_blank"
              className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/60 hover:bg-emerald-900/50 border border-emerald-500/40 px-3 py-2 rounded-xl transition-all"
            >
              <span>ชมตัวอย่างหน้าร้านลูกค้า</span>
              <ExternalLink className="h-3 w-3" />
            </Link>

            <Link
              href="/login"
              className="text-xs font-semibold text-slate-200 hover:text-white px-3.5 py-2 transition-colors"
            >
              เข้าสู่ระบบร้าน
            </Link>

            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 px-4 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-500/20 active:scale-95"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>ทดลองใช้ฟรี 14 วัน</span>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* 2. Hero Section */}
        <section className="relative pt-16 pb-20 lg:pt-24 lg:pb-32 overflow-hidden border-b border-slate-800">
          {/* Subtle Blueprint & Radial Glow */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(16, 185, 129, 0.3) 1px, transparent 0)`,
              backgroundSize: "32px 32px",
            }}
          />
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-emerald-600/15 rounded-full blur-[140px] pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
            {/* Top Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-emerald-500/40 text-emerald-400 text-xs font-medium shadow-inner">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>SaaS แพลตฟอร์มบริหารร้านมือถือ & ศูนย์บริการช่างอันดับ 1 ของไทย</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] max-w-4xl mx-auto">
              ระบบบริหารร้านมือถือและศูนย์ซ่อม{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                ที่ตอบโจทย์ช่างไทยที่สุด
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-sm sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
              จบทุกปัญหาความวุ่นวายในร้าน: คุมสต็อกราย IMEI 15 หลัก, วาด Pattern Lock 3x3 บนจอ, ตรวจสภาพ 10 จุด, กระดานงานช่าง Kanban, แคชเชียร์ POS, ภาษีสรรพากร 2568{" "}
              <strong className="text-white underline decoration-emerald-500 underline-offset-4 font-semibold">
                พร้อมแถมฟรี! หน้าเว็บหน้าร้าน Live Tracking ให้ลูกค้าร้านคุณตรวจเช็คสถานะซ่อมสดได้ 24 ชั่วโมง
              </strong>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link
                href="/register"
                className="w-full sm:w-auto min-h-[52px] px-8 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-sm sm:text-base rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-emerald-500/25 active:scale-95"
              >
                <Sparkles className="h-4 w-4" />
                <span>เปิดร้านค้าและทดลองใช้ฟรี 14 วัน</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/landing"
                target="_blank"
                className="w-full sm:w-auto min-h-[52px] px-7 bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-sm sm:text-base rounded-2xl flex items-center justify-center gap-2 transition-all"
              >
                <span>ชมตัวอย่างหน้าร้าน (เดโม)</span>
                <ExternalLink className="h-4 w-4 text-emerald-400" />
              </Link>
            </div>

            {/* Micro Trust Indicators */}
            <div className="pt-8 border-t border-slate-800/80 max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tabular-nums">
                  120+
                </div>
                <div className="text-xs text-slate-400 mt-1">ร้านค้าเปิดใช้งานแล้ว</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono tabular-nums">
                  85,000+
                </div>
                <div className="text-xs text-slate-400 mt-1">บันทึกคุมเลขอีมี่ (IMEI)</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tabular-nums">
                  2.5 ชม.
                </div>
                <div className="text-xs text-slate-400 mt-1">ประหยัดเวลาช่างต่อวัน</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-teal-400 font-mono tabular-nums">
                  99.9%
                </div>
                <div className="text-xs text-slate-400 mt-1">Cloud Uptime มาตรฐานสูง</div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. KILLER FEATURE SPOTLIGHT: Free Storefront for every shop */}
        <section id="storefront-perk" className="py-20 lg:py-28 bg-slate-900/50 border-b border-slate-800 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Text (6 cols) */}
              <div className="lg:col-span-6 space-y-6">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Killer Feature • ไม่มีระบบไหนเคยให้มาก่อน</span>
                </span>

                <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                  สมัครปุ๊บ ร้านคุณจะได้หน้าเว็บหน้าร้าน{" "}
                  <span className="text-emerald-400">
                    /store/[รหัสร้านของคุณ]
                  </span>{" "}
                  สวยระดับสตูดิโอไปใช้ฟรีทันที
                </h2>

                <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                  ไม่ต้องเสียเงินจ้างทำเว็บหลักหมื่นอีกต่อไป! ทุกร้านที่สมัครใช้งาน MobileShop-Hub จะได้รับหน้าเว็บหน้าร้านสุดหรูที่เชื่อมโยงกับฐานข้อมูลงานซ่อมของร้านคุณโดยอัตโนมัติ:
                </p>

                <div className="space-y-3.5 pt-2 text-xs sm:text-sm text-slate-300">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">Live Tracking 24 ชั่วโมง</strong>: ลูกค้าสแกน QR หรือพิมพ์รหัสใบรับซ่อม ตรวจสอบรูปถ่ายขั้นตอนการซ่อมและกดอนุมัติราคาซ่อมผ่านมือถือได้เอง
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">Hardware Diagnostic Scanner</strong>: ตัวจำลองผ่าชิ้นส่วนสมาร์ตโฟน ให้ลูกค้าคลิกเลือกดูราคาประเมินและระยะเวลาซ่อม
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">Draggable Before/After Slider</strong>: ลูกค้าลากเลื่อนดูความแตกต่างของงานซ่อมจริง (จอแตก vs จอใหม่ OCA ใสกริบ)
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">Interactive 10-Point Test Bench</strong>: แท่นทดสอบระบบ 10 จุดจำลอง สร้างความน่าเชื่อถือระดับมืออาชีพ
                    </span>
                  </div>
                </div>

                <div className="pt-4">
                  <Link
                    href="/landing"
                    target="_blank"
                    className="inline-flex items-center gap-2 text-sm font-bold text-emerald-400 hover:text-emerald-300 underline underline-offset-4"
                  >
                    <span>คลิกทดลองเล่นหน้าเว็บหน้าร้านจำลอง</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              {/* Right Column: Visual Mockup (6 cols) */}
              <div className="lg:col-span-6">
                <div className="relative rounded-3xl p-2 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/80 shadow-2xl">
                  <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 p-6 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                        <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                        <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        https://mobileshophub.com/store/your-shop
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                        LIVE
                      </span>
                    </div>

                    <div className="space-y-3 py-2 text-left">
                      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                          ศูนย์บริการ ร้านช่างเอก โมบาย (ตัวอย่าง)
                        </span>
                        <div className="text-sm font-semibold text-white">
                          บริการซ่อมด่วนมาตรฐานแล็บ รอรับใน 30 นาที
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          <span>ค้นหาสถานะงานซ่อม: REP-202611-0001 (กำลังซ่อมแล็บ 35 นาที)</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                          <span className="text-slate-400 block font-medium">ตรวจเช็ค 10 จุด</span>
                          <span className="text-emerald-400 font-bold">ผ่าน QC 100%</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                          <span className="text-slate-400 block font-medium">การรับประกัน</span>
                          <span className="text-white font-bold">สูงสุด 180 วัน</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Complete SaaS Modules Bento Grid (38 เมนู / 54 เส้นทาง) */}
        <section id="features" className="py-20 lg:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900 text-slate-300 text-xs font-semibold border border-slate-800">
              <Layers className="h-3.5 w-3.5 text-emerald-400" />
              <span>38 เมนู / 54 เส้นทาง ออกแบบมาเพื่อร้านมือถือโดยเฉพาะ</span>
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              ครบวงจรตั้งแต่รับเครื่องซ่อม คุมสต็อก จนถึงปิดยอดภาษี
            </h2>
            <p className="text-sm sm:text-base text-slate-400">
              ไม่ต้องใช้หลายโปรแกรมให้ยุ่งยาก MobileShop-Hub เชื่อมทุกแผนกในร้านเข้าด้วยกันแบบ Real-time
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 1. Repair Service */}
            <div className="p-7 rounded-3xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition-all space-y-4 group">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/30 group-hover:scale-110 transition-transform">
                <Wrench className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">1. งานซ่อมมือถือ & ห้องแล็บ</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                วาด Pattern Lock 3x3 บนจอ, ตรวจสอบสภาพ 10 จุด, ลายเซ็นดิจิทัล, กระดาน Kanban ช่าง, เบิกอะไหล่ตัดสต็อก และพิมพ์ใบรับซ่อม 80mm พร้อม QR Code
              </p>
            </div>

            {/* 2. Stock & IMEI Tracking */}
            <div className="p-7 rounded-3xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition-all space-y-4 group">
              <div className="h-12 w-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/30 group-hover:scale-110 transition-transform">
                <Package className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">2. คลังสินค้าคุม IMEI 15 หลัก</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                คุมเครื่องราย IMEI แยกเกรด A/B/C, บันทึกประวัติเครื่องทุกตัว, รับซื้อ-ตีราคาป้องกันของโจรด้วยบัตร ปชช., อุปกรณ์เสริม เคส ฟิล์ม จุดเตือนสั่งซื้อซ้ำ
              </p>
            </div>

            {/* 3. POS & Cashier */}
            <div className="p-7 rounded-3xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition-all space-y-4 group">
              <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/30 group-hover:scale-110 transition-transform">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">3. แคชเชียร์หน้าร้าน & กะเงินสด</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                สแกนบาร์โค้ด, พักบิล, รองรับเงินสด, PromptPay QR, บัตรเครดิต, และ Split Payment พร้อมระบบเปิด-ปิดกะ และกระทบยอดเงินลิ้นชักกับสเตทเมนต์
              </p>
            </div>

            {/* 4. Installments & Pawn */}
            <div className="p-7 rounded-3xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition-all space-y-4 group">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/30 group-hover:scale-110 transition-transform">
                <CreditCard className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">4. ผ่อนกับร้าน & รับจำนำมือถือ</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                ระบบผ่อนโทรศัพท์คำนวณดอกเบี้ย ตารางงวด แจ้งเตือนทวงค่างวด สัญญาฝากจำนำมือถือ ดอกเบี้ยรายเดือน และระบบเครื่องหลุดจำนำ
              </p>
            </div>

            {/* 5. Tax & Accounting 2568 */}
            <div className="p-7 rounded-3xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition-all space-y-4 group">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/30 group-hover:scale-110 transition-transform">
                <Calculator className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">5. ภาษีสรรพากร 2568 & บัญชี</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                บุคคลธรรมดา (ภ.ง.ด.90/94) หรือนิติบุคคล (ภ.ง.ด.50/51), หักเหมา 60% หรือตามจริง, ค่าลดหย่อน 4 กลุ่มปี 2568 และภาษีมูลค่าเพิ่ม ภ.พ.30
              </p>
            </div>

            {/* 6. Multi-Branch & HR */}
            <div className="p-7 rounded-3xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition-all space-y-4 group">
              <div className="h-12 w-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/30 group-hover:scale-110 transition-transform">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">6. หลายสาขา & ค่าคอมช่าง</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                รองรับขยายหลายสาขา (Multi-Branch), โอนย้ายสต็อกข้ามสาขา, ระบบสิทธิ์ RBAC, ลงเวลาเข้างาน และคำนวณเงินเดือน + ประกันสังคม (SSO)
              </p>
            </div>
          </div>
        </section>

        {/* 5. Interactive ROI Calculator */}
        <SaasRoiCalculator />

        {/* 6. Transparent SaaS Pricing Section */}
        <SaasPricingSection />

        {/* 7. Shop Owner FAQ */}
        <section id="faq" className="py-20 lg:py-28 bg-slate-900/60 border-t border-slate-800">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center space-y-3">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                คำถามที่พบบ่อย (FAQ)
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                ข้อสงสัยก่อนเริ่มใช้งาน MobileShop-Hub
              </h2>
            </div>

            <div className="space-y-4 text-left">
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <h3 className="text-base font-bold text-white">
                  1. สามารถย้ายข้อมูลสต็อกเดิมจาก Excel เข้ามาได้หรือไม่?
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  ได้แน่นอนครับ ระบบมีฟังก์ชันนำเข้าไฟล์ Excel/CSV สำหรับรายการสินค้า อุปกรณ์เสริม และข้อมูลลูกค้าเดิม ทำให้เปิดร้านและเริ่มใช้งานต่อได้ทันทีโดยไม่ต้องคีย์ใหม่ทั้งหมด
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <h3 className="text-base font-bold text-white">
                  2. รองรับเครื่องพิมพ์ใบเสร็จและสแกนเนอร์บาร์โค้ดรุ่นใดบ้าง?
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  รองรับเครื่องพิมพ์สลิปความร้อน (Thermal Printer) ขนาด 80mm และ 58mm ทั่วไป ทั้งแบบ USB และ Bluetooth และรองรับเครื่องยิงบาร์โค้ด 1D/2D มาตรฐานทุกรุ่นโดยไม่ต้องลงไดรเวอร์พิเศษ
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <h3 className="text-base font-bold text-white">
                  3. หน้าเว็บหน้าร้าน (Storefront) ที่แถมให้ สามารถแก้ไขข้อมูลเองได้ไหม?
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  แก้ไขได้ตลอดเวลาครับ เพียงเข้าไปที่หน้าตั้งค่าร้านในระบบหลังบ้าน ท่านสามารถเปลี่ยนชื่อร้าน เบอร์โทร ที่อยู่ อัปโหลดโลโก้ และลิงก์ LINE OA ข้อมูลบนหน้าเว็บจะอัปเดตแบบ Real-time ทันที
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <h3 className="text-base font-bold text-white">
                  4. หากหมดช่วงทดลองใช้งาน 14 วัน ข้อมูลในร้านจะหายไหม?
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  ข้อมูลไม่หายครับ ระบบจะเก็บรักษาฐานข้อมูลและประวัติงานซ่อมทั้งหมดของร้านท่านไว้อย่างปลอดภัย ท่านสามารถเลือกต่ออายุแพ็กเกจที่ต้องการเพื่อใช้งานต่อได้ทันที
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 8. Bottom CTA Banner */}
        <section className="py-16 bg-gradient-to-r from-emerald-900 to-teal-950 border-t border-emerald-500/30 text-center">
          <div className="max-w-4xl mx-auto px-4 space-y-6">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
              พร้อมยกระดับร้านมือถือของคุณให้เป็นศูนย์บริการมืออาชีพแล้วหรือยัง?
            </h2>
            <p className="text-xs sm:text-base text-emerald-200 max-w-2xl mx-auto">
              เปิดร้านและเริ่มทดลองใช้งานฟรี 14 วันเต็ม ได้ระบบหลังบ้านครบครัน และได้หน้าเว็บหน้าร้านสวยงามทันที
            </p>
            <div className="pt-2">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold rounded-2xl text-sm sm:text-base transition-all shadow-xl shadow-emerald-950/50 active:scale-95"
              >
                <Sparkles className="h-5 w-5" />
                <span>สมัครเปิดร้านค้าใหม่ ฟรี 14 วัน</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* 9. Modern SaaS Footer */}
      <footer className="bg-slate-950 border-t border-slate-800/80 py-12 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              MS
            </div>
            <span>© 2026 MobileShop-Hub. All Rights Reserved.</span>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <Link href="/landing" className="hover:text-emerald-400 transition-colors">
              ตัวอย่างหน้าร้านลูกค้า
            </Link>
            <Link href="/login" className="hover:text-emerald-400 transition-colors">
              เข้าสู่ระบบร้าน (Login)
            </Link>
            <Link href="/register" className="hover:text-emerald-400 transition-colors">
              เปิดร้านใหม่ (Register)
            </Link>
            <Link href="/tax/settings" className="hover:text-emerald-400 transition-colors">
              ระบบภาษี 2568
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
