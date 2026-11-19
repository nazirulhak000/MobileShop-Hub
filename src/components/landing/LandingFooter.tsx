"use client";

import React from "react";
import Link from "next/link";
import {
  Smartphone,
  Phone,
  MapPin,
  LogIn,
} from "lucide-react";

interface LandingFooterProps {
  /** Shop display name. Defaults to the platform name on the demo landing. */
  shopName?: string;
  /** Real branch address; hidden when missing. */
  address?: string | null;
  /** Real branch phone; hidden when missing. */
  phone?: string | null;
  /** Section anchors not rendered on this page (e.g. "#estimate"). */
  hiddenSections?: string[];
}

export function LandingFooter({
  shopName,
  address,
  phone,
  hiddenSections = [],
}: LandingFooterProps = {}) {
  const shows = (href: string) => !hiddenSections.includes(href);
  return (
    <footer className="bg-slate-950 text-slate-400 text-xs border-t border-slate-800">
      {/* Top Banner Callout in Footer */}
      <div className="border-b border-slate-800 bg-slate-900/60 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 text-center lg:text-left">
            <div className="space-y-1">
              <h3 className="text-lg sm:text-xl font-semibold text-white tracking-tight">
                ศูนย์บริการซ่อมสมาร์ตโฟนด้วยมาตรฐานเครื่องมือวัดทางวิศวกรรม
              </h3>
              <p className="text-slate-400 text-xs sm:text-sm">
                นำเครื่องมาตรวจเช็คมาตรฐาน 10 จุดฟรี หรือตรวจสอบความคืบหน้างานซ่อมออนไลน์ได้ตลอด 24 ชั่วโมง
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href="#track-search"
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-2xs transition-colors duration-150 motion-reduce:transition-none inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                ตรวจสอบสถานะงานซ่อมสด
              </a>
              {shows("#estimate") && (
              <a
                href="#estimate"
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition-colors duration-150 motion-reduce:transition-none inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                ประเมินราคาก่อนซ่อม
              </a>
              )}
              <Link
                href="/dashboard"
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs inline-flex items-center gap-1.5 transition-colors duration-150 motion-reduce:transition-none border border-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <LogIn className="h-4 w-4 text-emerald-400" />
                <span>สำหรับพนักงาน (Staff Portal)</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links Columns */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Col 1: Brand & Bio (2 cols on lg) */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/landing" className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg p-1">
              <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center border border-slate-800 shadow-2xs">
                <Smartphone className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="flex items-center gap-2">
                {shopName ? (
                  <span className="font-semibold text-lg text-white tracking-tight">{shopName}</span>
                ) : (
                  <>
                    <span className="font-semibold text-lg text-white tracking-tight">
                      MobileShop
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                      Hub
                    </span>
                  </>
                )}
              </div>
            </Link>

            <p className="text-slate-400 leading-relaxed text-xs max-w-sm">
              ศูนย์บริการซ่อมมือถือด่วนมาตรฐานสากล iPhone, iPad, Samsung, Xiaomi, OPPO, vivo พร้อมระบบ Live Tracking บันทึกภาพถ่ายขั้นตอนซ่อมจริง ตรวจสอบและอนุมัติราคาประเมินผ่านมือถือ 24 ชั่วโมง
            </p>

            <div className="pt-2 space-y-2 text-slate-300 text-xs">
              {address && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="tabular-nums">{address}</span>
                </div>
              )}
              {phone && (
                <a
                  href={`tel:${phone.replace(/[^0-9+]/g, "")}`}
                  className="flex items-center gap-2 min-h-[44px] hover:text-white"
                >
                  <Phone className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="font-mono tabular-nums">{phone}</span>
                </a>
              )}
            </div>
          </div>

          {/* Col 2: Services */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
              บริการศูนย์ซ่อม
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <a href="#services" className="hover:text-white transition-colors duration-150">
                  เปลี่ยนหน้าจอแท้ OLED และ True Tone
                </a>
              </li>
              <li>
                <a href="#services" className="hover:text-white transition-colors duration-150">
                  เปลี่ยนแบตเตอรี่มาตรฐาน มอก. พร้อมใบเซอร์รับรอง
                </a>
              </li>
              <li>
                <a href="#services" className="hover:text-white transition-colors duration-150">
                  ลอกกระจกจอแท้ OCA คงจอในเดิม
                </a>
              </li>
              <li>
                <a href="#services" className="hover:text-white transition-colors duration-150">
                  ตรวจวัดกระแสไฟและคลื่นความถี่ระดับแล็บ
                </a>
              </li>
              <li>
                <a href="#services" className="hover:text-white transition-colors duration-150">
                  ซ่อมก้นชาร์จ Type-C และเลนส์กล้อง
                </a>
              </li>
              <li>
                <a href="#services" className="hover:text-white transition-colors duration-150">
                  ตรวจสอบประวัติเครื่องและเลข IMEI 15 หลัก
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Customer Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
              สำหรับลูกค้า
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <a href="#track-search" className="hover:text-white transition-colors duration-150">
                  ติดตามงานซ่อมออนไลน์ (Live Tracking)
                </a>
              </li>
              {shows("#estimate") && (
              <li>
                <a href="#estimate" className="hover:text-white transition-colors duration-150">
                  คำนวณราคาซ่อมล่วงหน้า
                </a>
              </li>
              )}
              <li>
                <a href="#inspection" className="hover:text-white transition-colors duration-150">
                  มาตรฐานการตรวจเช็ค 10 จุด
                </a>
              </li>
              {shows("#reviews") && (
              <li>
                <a href="#reviews" className="hover:text-white transition-colors duration-150">
                  ผลงานเปรียบเทียบก่อน-หลังซ่อม
                </a>
              </li>
              )}
              <li>
                <a href="#location" className="hover:text-white transition-colors duration-150">
                  แผนที่และการเดินทาง
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-white transition-colors duration-150">
                  คำถามที่พบบ่อย (FAQ)
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Staff Dashboard & System Access */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
              ระบบภายในร้าน
            </h4>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
              <span className="text-xs font-mono text-emerald-400 font-medium block">
                Staff Operations
              </span>
              <p className="text-xs text-slate-400 leading-relaxed">
                เข้าถึงระบบเปิดบิล แคชเชียร์ POS โต๊ะงานช่างเทคนิค และคลังสต็อกอะไหล่
              </p>
              <Link
                href="/dashboard"
                className="min-h-[44px] w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors duration-150 border border-slate-700"
              >
                <LogIn className="h-4 w-4 text-emerald-400" />
                <span>เข้าสู่แดชบอร์ดร้าน</span>
              </Link>
            </div>

            <ul className="space-y-2 text-xs text-slate-400 pt-1">
              <li>
                <Link href="/repairs/new" className="hover:text-white transition-colors duration-150">
                  เปิดใบรับซ่อมใหม่ (Intake)
                </Link>
              </li>
              <li>
                <Link href="/pos" className="hover:text-white transition-colors duration-150">
                  ระบบแคชเชียร์หน้าร้าน (POS)
                </Link>
              </li>
              <li>
                <Link href="/inventory" className="hover:text-white transition-colors duration-150">
                  คลังสินค้าและอะไหล่คุมเลข IMEI
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Disclaimer & Copyright */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-xs">
          <div className="tabular-nums">
            © {new Date().getFullYear()} {shopName ?? "MobileShop-Hub"} สงวนลิขสิทธิ์ทุกประการ
          </div>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-300 cursor-pointer">นโยบายความเป็นส่วนตัว</span>
            <span>•</span>
            <span className="hover:text-slate-300 cursor-pointer">ข้อกำหนดการให้บริการ</span>
            <span>•</span>
            <span className="hover:text-slate-300 cursor-pointer">เงื่อนไขการรับประกันงานซ่อม</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
