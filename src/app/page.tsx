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
  Activity,
  Cpu,
  Eye,
  Sliders,
  DollarSign,
  HeartHandshake,
  Star,
  Search,
  Camera,
  CalendarDays,
  FileCheck,
} from "lucide-react";
import { FixMeLogo, FixMePhoneIcon } from "@/components/landing/FixMeLogo";
import { SaasPricingSection } from "@/components/saas/SaasPricingSection";
import { SaasRoiCalculator } from "@/components/saas/SaasRoiCalculator";

export const metadata: Metadata = {
  title: "FixMe | ระบบบริหารร้านมือถือ & ศูนย์บริการครบวงจร All-in-One SaaS (ฟรีตลอดชีพ)",
  description:
    "แพลตฟอร์มบริหารร้านมือถืออันดับ 1 ของไทย: คลังสินค้าคุม IMEI 15 หลัก, โต๊ะงานช่าง Kanban บันทึก Pattern Lock, แคชเชียร์ POS, ภาษี 2568 เริ่มต้นฟรีตลอดชีพ หรือ Pro เพียง 199 บาท/เดือน พร้อมแถมฟรีหน้าเว็บหน้าร้าน Live Tracking ให้ลูกค้าร้านคุณตรวจเช็คสถานะซ่อมสดได้ 24 ชั่วโมง",
};

export default function SaasLandingPage() {
  return (
    <div className="min-h-screen bg-[#050B14] text-white font-sans selection:bg-cyan-500 selection:text-slate-950 overflow-x-hidden">
      {/* 1. SaaS Sticky Navigation Header */}
      <header className="sticky top-0 z-50 bg-[#050B14]/90 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-xl p-1">
            <FixMeLogo variant="light" size="md" />
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-cyan-300 border border-blue-400/30 uppercase tracking-wider">
              SaaS ERP
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold text-slate-300" aria-label="เมนูหลัก SaaS">
            <a href="#features" className="hover:text-cyan-400 transition-colors">
              ฟังก์ชันระบบ (38 เมนู)
            </a>
            <a href="#workbench" className="hover:text-cyan-400 transition-colors">
              โต๊ะช่างแล็บวิศวกรรม
            </a>
            <a href="#storefront-perk" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5">
              <span>แถมหน้าร้านฟรี</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-300">
                0 บาท
              </span>
            </a>
            <a href="#roi" className="hover:text-cyan-400 transition-colors">
              คำนวณความคุ้มค่า
            </a>
            <a href="#pricing" className="hover:text-cyan-400 transition-colors flex items-center gap-1">
              <span>ราคาแพ็กเกจ</span>
              <span className="text-emerald-400 font-bold">ฟรี/฿199</span>
            </a>
            <a href="#faq" className="hover:text-cyan-400 transition-colors">
              คำถามที่พบบ่อย
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            <Link
              href="/store/fixme"
              target="_blank"
              className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 bg-blue-950/70 hover:bg-blue-900/60 border border-cyan-500/30 px-3.5 py-2.5 rounded-xl transition-all"
            >
              <span>ชมตัวอย่างหน้าร้านจริง</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>

            <Link
              href="/login"
              className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-2 transition-colors"
            >
              เข้าสู่ระบบร้าน
            </Link>

            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 hover:from-cyan-300 hover:to-blue-300 px-4 py-2.5 rounded-xl transition-all shadow-md shadow-cyan-500/20 active:scale-95"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>เปิดร้านฟรีตลอดชีพ</span>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* 2. Hero Section */}
        <section className="relative pt-16 pb-20 lg:pt-24 lg:pb-32 overflow-hidden border-b border-slate-800/80">
          {/* Subtle Blueprint & Dynamic Neon Glows */}
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(14, 165, 233, 0.3) 1px, transparent 0)`,
              backgroundSize: "36px 36px",
            }}
          />
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-gradient-to-r from-blue-600/15 via-cyan-500/15 to-emerald-500/10 rounded-full blur-[150px] pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
            {/* Top Pill */}
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/30 text-cyan-300 text-xs font-medium shadow-inner">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
              </span>
              <span>SaaS แพลตฟอร์มบริหารร้านมือถือ & ศูนย์บริการช่างอันดับ 1 • เริ่มต้นฟรี 0 บาท</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.12] max-w-5xl mx-auto">
              ระบบบริหารร้านมือถือและศูนย์ซ่อม{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-sky-200">
                ที่ตอบโจทย์ช่างไทยที่สุด
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-sm sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
              จบทุกปัญหาความวุ่นวายในร้าน: คุมสต็อกราย IMEI 15 หลัก, วาด Pattern Lock 3x3 บนจอ, ตรวจสภาพ 10 จุด, กระดานงานช่าง Kanban, แคชเชียร์ POS, ภาษีสรรพากร 2568{" "}
              <strong className="text-white underline decoration-cyan-400 underline-offset-4 font-semibold">
                พร้อมแถมฟรี! หน้าเว็บหน้าร้าน Live Tracking ให้ลูกค้าร้านคุณตรวจเช็คสถานะซ่อมสดได้ 24 ชั่วโมง
              </strong>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link
                href="/register"
                className="w-full sm:w-auto min-h-[54px] px-8 bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 hover:from-blue-500 hover:to-cyan-300 text-slate-950 font-black text-sm sm:text-base rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-xl shadow-cyan-500/25 active:scale-95"
              >
                <Sparkles className="h-5 w-5" />
                <span>เปิดร้านฟรีตลอดชีพ (ไม่ต้องใช้บัตรเครดิต)</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/store/fixme"
                target="_blank"
                className="w-full sm:w-auto min-h-[54px] px-7 bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-bold text-sm sm:text-base rounded-2xl flex items-center justify-center gap-2 transition-all"
              >
                <span>ชมตัวอย่างหน้าร้านจริง (Live Demo)</span>
                <ExternalLink className="h-4 w-4 text-cyan-400" />
              </Link>
            </div>

            {/* Pricing Tagline Notice */}
            <div className="inline-flex items-center gap-2 text-xs text-slate-400 pt-1">
              <span className="text-emerald-400 font-bold">✓ ฟรีจริง 0 บาท ไม่มีวันหมดอายุ</span>
              <span>•</span>
              <span className="text-cyan-400 font-semibold">หรือ Pro เพียง ฿199 / เดือน (คุ้มค่าที่สุดในไทย)</span>
            </div>

            {/* Hero Studio Image Showcase */}
            <div className="pt-8 max-w-6xl mx-auto">
              <div className="relative rounded-3xl p-2 sm:p-3 bg-gradient-to-b from-blue-500/20 via-cyan-500/10 to-transparent border border-cyan-500/30 shadow-2xl overflow-hidden backdrop-blur-xl group">
                {/* Floating Top Bar Mockup */}
                <div className="rounded-2xl overflow-hidden border border-slate-800 bg-[#060D1A] shadow-inner relative">
                  <div className="px-4 py-3 border-b border-slate-800/80 bg-slate-950/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                      <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                      <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                      <span className="text-[11px] font-mono text-slate-400 pl-2 hidden sm:inline">
                        FixMe Cloud SaaS • Operations Hub v2.5
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        <Activity className="h-3 w-3 text-cyan-400" />
                        <span>LIVE HUD MONITOR</span>
                      </span>
                      <span className="text-[11px] font-mono text-emerald-400">
                        ● 99.9% Uptime
                      </span>
                    </div>
                  </div>

                  {/* Main Hero AI Image */}
                  <div className="relative aspect-[16/9] sm:aspect-[21/9] w-full overflow-hidden bg-slate-950">
                    <img
                      src="/images/saas_hero_dashboard.jpg"
                      alt="FixMe SaaS Futuristic Mobile Repair Operating System and Dashboard"
                      className="w-full h-full object-cover object-center group-hover:scale-[1.02] transition-transform duration-700"
                    />

                    {/* Gradient Overlay for Sleek Depth */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#060D1A] via-transparent to-transparent opacity-80" />

                    {/* Floating HUD Badges on Top of Hero Image */}
                    <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 text-left">
                      <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-cyan-500/30 shadow-lg">
                        <div className="h-9 w-9 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center">
                          <Activity className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">Live Cloud Sync</div>
                          <div className="text-[10px] text-cyan-300 font-mono">สถานะอัปเดตเรียลไทม์ 24 ชม.</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-blue-500/30 shadow-lg">
                        <div className="h-9 w-9 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center">
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">IMEI 15-Digit Guard</div>
                          <div className="text-[10px] text-slate-300 font-mono">บันทึกประวัติเครื่องถาวร</div>
                        </div>
                      </div>

                      <div className="hidden md:flex items-center gap-3 p-3 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-emerald-500/30 shadow-lg">
                        <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                          <Star className="h-5 w-5 fill-amber-400 text-amber-500" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">15,840+ งานซ่อมสำเร็จ</div>
                          <div className="text-[10px] text-emerald-300 font-mono">ความพึงพอใจลูกค้า 99.6%</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Micro Trust Indicators */}
            <div className="pt-8 border-t border-slate-800/80 max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-3xl font-extrabold text-white font-mono tabular-nums">
                  120+
                </div>
                <div className="text-xs text-slate-400 mt-1">ร้านค้าเปิดใช้งานแล้ว</div>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-cyan-400 font-mono tabular-nums">
                  85,000+
                </div>
                <div className="text-xs text-slate-400 mt-1">บันทึกคุมเลขอีมี่ (IMEI)</div>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-white font-mono tabular-nums">
                  2.5 ชม.
                </div>
                <div className="text-xs text-slate-400 mt-1">ประหยัดเวลาช่างต่อวัน</div>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-emerald-400 font-mono tabular-nums">
                  ฿0 / ฿199
                </div>
                <div className="text-xs text-slate-400 mt-1">ราคาคุ้มค่าที่สุดในไทย</div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. TECHNICIAN WORKBENCH & LAB ENGINEERING SHOWCASE (Asset 2) */}
        <section id="workbench" className="py-20 lg:py-28 bg-[#071120] border-b border-slate-800/80 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Visual Workbench AI Image */}
              <div className="lg:col-span-6">
                <div className="relative rounded-3xl p-2 sm:p-3 bg-gradient-to-tr from-cyan-500/20 via-blue-500/10 to-slate-800 border border-cyan-500/30 shadow-2xl overflow-hidden group">
                  <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 aspect-[4/3]">
                    <img
                      src="/images/saas_repair_workbench.jpg"
                      alt="Professional Electronics Repair Workbench with Digital Microscope and Diagnostic Tools"
                      className="w-full h-full object-cover object-center group-hover:scale-[1.03] transition-transform duration-700"
                    />

                    {/* Glassmorphic Overlay Badges */}
                    <div className="absolute top-4 left-4 p-2.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-cyan-500/30 text-xs">
                      <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                        <Cpu className="h-4 w-4" />
                        <span>Lab Station Calibration</span>
                      </span>
                      <span className="text-[10px] text-slate-300 font-mono block mt-0.5">
                        ESD Anti-Static Safe Room
                      </span>
                    </div>

                    <div className="absolute bottom-4 right-4 p-2.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-blue-500/30 text-xs text-right">
                      <span className="text-emerald-400 font-mono font-bold block">
                        Power Supply: 3.80V Normal
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Standby Current: 0.00A
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Workbench Features */}
              <div className="lg:col-span-6 space-y-6">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-xs font-semibold">
                  <Wrench className="h-3.5 w-3.5 text-cyan-400" />
                  <span>โต๊ะงานช่างมาตรฐานวิศวกรรมอิเล็กทรอนิกส์</span>
                </span>

                <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                  ออกแบบโดยช่าง เพื่อช่าง{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                    จัดการงานซ่อมไม่มีสะดุด
                  </span>
                </h2>

                <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                  FixMe เข้าใจหัวอกคนทำร้านมือถือ เปลี่ยนความวุ่นวายของการจดกระดาษมาเป็นระบบดิจิทัลที่ง่าย คมชัด และป้องกันความผิดพลาด 100%:
                </p>

                <div className="space-y-4 text-xs sm:text-sm text-slate-300">
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                    <div className="font-bold text-white flex items-center gap-2">
                      <Lock className="h-4 w-4 text-cyan-400" />
                      <span>บันทึก Pattern Lock 3x3 และประวัติเครื่อง</span>
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      ลูกค้าหรือช่างวาดเส้นปลดล็อคหน้าจอบนแท็บเล็ตได้โดยตรง พร้อมระบบจำแนกรหัสผ่านแบบปลอดภัย ไม่ต้องเปิดเผยข้อมูลส่วนตัว
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                    <div className="font-bold text-white flex items-center gap-2">
                      <FileCheck className="h-4 w-4 text-emerald-400" />
                      <span>ตรวจเช็คก่อน-หลังซ่อม 10 จุด (10-Point Checklist)</span>
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      ทดสอบจอสัมผัส True Tone, Face ID, ไมโครโฟน, ลำโพง, กล้อง OIS, และการจ่ายไฟ ป้องกันข้อพิพาทกับลูกค้าได้อย่างหมดจด
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                    <div className="font-bold text-white flex items-center gap-2">
                      <QrCode className="h-4 w-4 text-blue-400" />
                      <span>พิมพ์สติ๊กเกอร์ QR Code ติดหลังเครื่องซ่อมทันที</span>
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      ออกสติ๊กเกอร์ QR ทันทีที่รับเครื่อง ลูกค้าสแกนเพื่อดูสถานะสด ส่วนช่างยิงสแกนเพื่อดึงประวัติการซ่อมและเบิกอะไหล่ได้ใน 1 วินาที
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. KILLER FEATURE SPOTLIGHT: Free Storefront for every shop */}
        <section id="storefront-perk" className="py-20 lg:py-28 bg-[#050B14] border-b border-slate-800/80 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Text (6 cols) */}
              <div className="lg:col-span-6 space-y-6">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-xs font-semibold">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Killer Feature • ฟรีทุกแพ็กเกจ ไม่มีค่าใช้จ่ายแอบแฝง</span>
                </span>

                <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                  เปิดร้านปุ๊บ ได้หน้าเว็บหน้าร้าน{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                    /store/[รหัสร้านของคุณ]
                  </span>{" "}
                  สวยระดับสตูดิโอไปใช้ฟรีทันที
                </h2>

                <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                  ไม่ต้องเสียเงินจ้างเขียนเว็บหลักหมื่น ทุกร้านที่ใช้ FixMe จะได้รับหน้าเว็บหน้าร้านสุดหรูที่เชื่อมโยงกับฐานข้อมูลงานซ่อมของร้านคุณโดยอัตโนมัติ:
                </p>

                <div className="space-y-3.5 pt-2 text-xs sm:text-sm text-slate-300">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">Live Tracking 24 ชั่วโมง</strong>: ลูกค้าสแกน QR หรือวางลิงก์จากใบรับเครื่อง ดูภาพถ่ายขั้นตอนซ่อมจริงและกดอนุมัติราคาดิจิทัลผ่านมือถือ
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">Hardware Diagnostic Scanner</strong>: ตัวจำลองตรวจเช็คชิ้นส่วนสมาร์ตโฟน ให้ลูกค้าคลิกดูราคาประเมินและระยะเวลาซ่อม
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">Draggable Before/After Slider</strong>: ลูกค้าลากเลื่อนเปรียบเทียบผลงานซ่อมจริง (จอแตก vs จอใหม่ OCA ใสกริบ)
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">10-Point Pre/Post Inspection Bench</strong>: แท่นตรวจเช็ค 10 จุดเสมือนจริง สร้างความเชื่อมั่นให้ลูกค้าร้านคุณ
                    </span>
                  </div>
                </div>

                <div className="pt-4 flex items-center gap-4">
                  <Link
                    href="/store/fixme"
                    target="_blank"
                    className="inline-flex items-center gap-2 text-sm font-bold text-cyan-400 hover:text-cyan-300 underline underline-offset-4"
                  >
                    <span>คลิกชมหน้าร้านค้า FixMe ตัวอย่างจริง</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              {/* Right Column: Visual Mockup (6 cols) */}
              <div className="lg:col-span-6">
                <div className="relative rounded-3xl p-3 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/80 shadow-2xl">
                  <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 p-6 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                        <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                        <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                      </div>
                      <span className="text-[11px] font-mono text-cyan-300">
                        https://fixme.co.th/store/fixme-service
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-400">
                        LIVE STORE
                      </span>
                    </div>

                    <div className="space-y-3 py-2 text-left">
                      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                        <div className="flex items-center gap-2">
                          <FixMePhoneIcon size={22} />
                          <span className="text-xs font-bold text-white tracking-tight">
                            FixMe ซ่อมมือถือ • ศูนย์บริการมาตรฐานแล็บ
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-cyan-300">
                          บริการซ่อมด่วนมาตรฐานแล็บ รอรับใน 30 นาที
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-300 pt-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
                          <span>เลขใบรับเครื่อง: FIX-202611-0001 (สถานะ: ผ่าน QC 10/10 จุด)</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                          <span className="text-slate-400 block font-medium">ตรวจเช็ค 10 จุด</span>
                          <span className="text-cyan-400 font-bold">ผ่านเกณฑ์ 100%</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                          <span className="text-slate-400 block font-medium">การรับประกัน</span>
                          <span className="text-white font-bold">สูงสุด 1 ปีเต็ม</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Complete SaaS Modules Bento Grid (38 เมนู / ครบวงจร) */}
        <section id="features" className="py-20 lg:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900 text-slate-300 text-xs font-semibold border border-slate-800">
              <Layers className="h-3.5 w-3.5 text-cyan-400" />
              <span>38 เมนู / 54 เส้นทาง ออกแบบมาเพื่อร้านมือถือโดยเฉพาะ</span>
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              ครบวงจรตั้งแต่รับเครื่องซ่อม คุมสต็อก จนถึงปิดยอดภาษี
            </h2>
            <p className="text-sm sm:text-base text-slate-400">
              ไม่ต้องเปิดหลายโปรแกรม FixMe รวมทั้งระบบงานช่าง แคชเชียร์ บัญชี และหน้าร้านไว้ในหน้าต่างเดียว
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 1. Repair Service */}
            <div className="p-7 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 transition-all space-y-4 group">
              <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/30 group-hover:scale-110 transition-transform">
                <Wrench className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">1. งานซ่อมมือถือ & ห้องแล็บ</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                วาด Pattern Lock 3x3 บนจอ, ตรวจสอบสภาพ 10 จุด, ลายเซ็นดิจิทัล, กระดาน Kanban ช่าง, เบิกอะไหล่ตัดสต็อก และพิมพ์ใบรับซ่อม 80mm พร้อม QR Code
              </p>
            </div>

            {/* 2. Stock & IMEI Tracking */}
            <div className="p-7 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-blue-500/50 transition-all space-y-4 group">
              <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/30 group-hover:scale-110 transition-transform">
                <Package className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">2. คลังสินค้าคุม IMEI 15 หลัก</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                คุมเครื่องราย IMEI แยกเกรด A/B/C, บันทึกประวัติเครื่องทุกตัว, รับซื้อ-ตีราคาป้องกันของโจรด้วยบัตร ปชช., อุปกรณ์เสริม เคส ฟิล์ม จุดเตือนสั่งซื้อซ้ำ
              </p>
            </div>

            {/* 3. POS & Cashier */}
            <div className="p-7 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 transition-all space-y-4 group">
              <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/30 group-hover:scale-110 transition-transform">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">3. แคชเชียร์หน้าร้าน & กะเงินสด</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                สแกนบาร์โค้ด, พักบิล, รองรับเงินสด, PromptPay QR Satang, บัตรเครดิต, และ Split Payment พร้อมระบบเปิด-ปิดกะ และกระทบยอดเงินลิ้นชักกับสเตทเมนต์
              </p>
            </div>

            {/* 4. Installments & Pawn */}
            <div className="p-7 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 transition-all space-y-4 group">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/30 group-hover:scale-110 transition-transform">
                <CreditCard className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">4. ผ่อนกับร้าน & รับจำนำมือถือ</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                ระบบผ่อนโทรศัพท์คำนวณดอกเบี้ย ตารางงวด แจ้งเตือนทวงค่างวด สัญญาฝากจำนำมือถือ ดอกเบี้ยรายเดือน และระบบเครื่องหลุดจำนำ
              </p>
            </div>

            {/* 5. Tax & Accounting 2568 */}
            <div className="p-7 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 transition-all space-y-4 group">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/30 group-hover:scale-110 transition-transform">
                <Calculator className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">5. ภาษีสรรพากร 2568 & บัญชี</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                บุคคลธรรมดา (ภ.ง.ด.90/94) หรือนิติบุคคล (ภ.ง.ด.50/51), หักเหมา 60% หรือตามจริง, ค่าลดหย่อน 4 กลุ่มปี 2568 และภาษีมูลค่าเพิ่ม ภ.พ.30
              </p>
            </div>

            {/* 6. Multi-Branch & HR */}
            <div className="p-7 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-rose-500/50 transition-all space-y-4 group">
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

        {/* 6. Interactive ROI Calculator */}
        <SaasRoiCalculator />

        {/* 7. Transparent SaaS Pricing Section */}
        <SaasPricingSection />

        {/* 8. Shop Owner FAQ */}
        <section id="faq" className="py-20 lg:py-28 bg-[#071120] border-t border-slate-800/80">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center space-y-3">
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                คำถามที่พบบ่อย (FAQ)
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
                ข้อสงสัยก่อนเริ่มใช้งาน FixMe
              </h2>
            </div>

            <div className="space-y-4 text-left">
              <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                <h3 className="text-base font-bold text-white">
                  1. แพ็กเกจ Free Forever ใช้งานได้ฟรีตลอดไป 0 บาทจริงหรือไม่?
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  ฟรีจริง 100% ครับ ไม่มีวันหมดอายุ ไม่ต้องผูกบัตรเครดิต สามารถเปิดบิลรับเครื่องซ่อม คุมสต็อก IMEI และใช้งานแคชเชียร์ POS ได้ครบถ้วน เหมาะสำหรับช่างอิสระและร้านตู้ที่ต้องการเริ่มต้นอย่างมั่นใจ
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                <h3 className="text-base font-bold text-white">
                  2. สามารถย้ายข้อมูลสต็อกและลูกค้าเดิมจาก Excel เข้ามาได้หรือไม่?
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  ได้แน่นอนครับ ระบบมีฟังก์ชันนำเข้าไฟล์ Excel/CSV สำหรับรายการอะไหล่ อุปกรณ์เสริม และข้อมูลลูกค้าเดิม พร้อมมีทีมงานคอยช่วยเหลือย้ายข้อมูลให้ฟรี
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                <h3 className="text-base font-bold text-white">
                  3. รองรับเครื่องพิมพ์ใบเสร็จและสแกนเนอร์บาร์โค้ดรุ่นใดบ้าง?
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  รองรับเครื่องพิมพ์สลิปความร้อน (Thermal Printer) ขนาด 80mm และ 58mm ทั่วไป ทั้งแบบ USB และ Bluetooth รวมถึงเครื่องยิงบาร์โค้ด 1D/2D มาตรฐานทุกรุ่นโดยไม่ต้องลงไดรเวอร์พิเศษ
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                <h3 className="text-base font-bold text-white">
                  4. หน้าเว็บหน้าร้าน (Storefront) ที่แถมให้ สามารถแก้ไขข้อมูลและโปรโมชั่นเองได้ไหม?
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  แก้ไขได้ตลอดเวลาครับ เพียงเข้าไปที่หน้าตั้งค่าร้านในระบบหลังบ้าน ท่านสามารถเปลี่ยนชื่อร้าน เบอร์โทร ที่อยู่ อัปโหลดโลโก้ และลิงก์ LINE OA ข้อมูลบนหน้าเว็บจะอัปเดตแบบ Real-time ทันที
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                <h3 className="text-base font-bold text-white">
                  5. สามารถใช้งานผ่าน iPad, แท็บเล็ต หรือสมาร์ตโฟนได้หรือไม่?
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  ใช้งานได้ทุกอุปกรณ์ครับ FixMe เป็น Cloud Web Application แบบ Responsive เต็มรูปแบบ เปิดผ่านเบราว์เซอร์บน iPad, แท็บเล็ต Android, หรือโทรศัพท์มือถือ เพื่อให้ลูกค้าเซ็นรับเครื่องได้ทันที
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 9. Bottom CTA Banner */}
        <section className="py-20 bg-gradient-to-r from-blue-950 via-[#06142E] to-cyan-950 border-t border-cyan-500/30 text-center relative overflow-hidden">
          <div className="max-w-4xl mx-auto px-4 space-y-6 relative z-10">
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              พร้อมยกระดับร้านมือถือของคุณ<br className="hidden sm:inline" /> ให้เป็นศูนย์บริการมาตรฐานสากลแล้วหรือยัง?
            </h2>
            <p className="text-sm sm:text-base text-cyan-200 max-w-2xl mx-auto">
              เปิดร้านและเริ่มใช้งานฟรีตลอดชีพ 0 บาทวันนี้ ได้ระบบหลังบ้านครบครัน และได้หน้าเว็บหน้าร้านระดับสตูดิโอทันที
            </p>
            <div className="pt-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2.5 px-9 py-4 bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 hover:from-cyan-300 hover:to-blue-300 text-slate-950 font-black rounded-2xl text-base transition-all shadow-xl shadow-cyan-950/60 active:scale-95"
              >
                <Sparkles className="h-5 w-5" />
                <span>สมัครเปิดร้านค้าใหม่ ฟรีตลอดชีพ (0 บาท)</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* 10. Modern SaaS Footer */}
      <footer className="bg-[#03070E] border-t border-slate-800/80 py-12 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <FixMeLogo variant="light" size="sm" />
            <span className="text-slate-500 pl-2 border-l border-slate-800">
              © {new Date().getFullYear()} FixMe Co., Ltd. สงวนลิขสิทธิ์ทุกประการ
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-slate-300">
            <Link href="/store/fixme" className="hover:text-cyan-400 transition-colors">
              หน้าร้านค้า FixMe
            </Link>
            <Link href="/track" className="hover:text-cyan-400 transition-colors">
              ติดตามงานซ่อม (Live Tracking)
            </Link>
            <Link href="/login" className="hover:text-cyan-400 transition-colors">
              เข้าสู่ระบบร้าน (Login)
            </Link>
            <Link href="/register" className="hover:text-cyan-400 transition-colors">
              เปิดร้านใหม่ (Register)
            </Link>
            <Link href="/dashboard" className="hover:text-cyan-400 transition-colors">
              แดชบอร์ดพนักงาน (Staff Portal)
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
