"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { AppProvider, useApp } from "@/context/AppContext";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Megaphone, Bell, X, ChevronRight } from "lucide-react";

// Public (non-staff) route segments; match whole segments so /customers, /customer-access,
// /settings, /shift, /suppliers... are NOT treated as public pages.
const PUBLIC_SEGMENTS = ["/store", "/track", "/landing", "/customer", "/s"];
const isUnder = (path: string, prefix: string) => path === prefix || path.startsWith(prefix + "/");

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isCleanPage =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register" ||
    PUBLIC_SEGMENTS.some(prefix => isUnder(pathname, prefix));
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(true);

  return (
    <AppProvider>
      {isCleanPage ? (
        <div className="min-h-screen bg-slate-50">{children}</div>
      ) : (
        <StaffReady><div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans">
          <Sidebar />
          <div className="flex-1 flex flex-col lg:pl-72 min-w-0 transition-all">
            <Header />

            <div className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1720px] w-full mx-auto space-y-5">
              {/* Top Announcement Banner - Matching Screenshot */}
              {showAnnouncement && (
                <div className="rounded-2xl border border-sky-200/70 bg-sky-50/80 px-4 py-2.5 text-xs text-sky-900 flex items-center justify-between shadow-2xs animate-fade-in">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-sky-600 text-white shadow-2xs">
                      <Megaphone className="h-3.5 w-3.5" />
                    </span>
                    <span className="font-semibold text-sky-950">ประกาศ:</span>
                    <span>อัปเดตระบบคำนวณภาษี ภ.ง.ด.90 ปีภาษี 2568 และระบบจัดการสต็อกคุม IMEI เวอร์ชั่นใหม่ล่าสุด</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="flex items-center gap-1 font-semibold text-sky-700 hover:text-sky-900 transition-colors">
                      <span>อ่านรายละเอียด</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setShowAnnouncement(false)}
                      className="text-sky-400 hover:text-sky-700 p-1"
                      aria-label="Close announcement"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Web Push Notification Banner - Matching Screenshot */}
              {showNotificationPrompt && pathname === "/tax/settings" && (
                <div className="rounded-2xl border border-teal-200/80 bg-gradient-to-r from-cyan-50/90 to-teal-50/80 p-4 text-xs text-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs animate-fade-in">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-teal-500 text-white shadow-xs shrink-0 mt-0.5">
                      <Bell className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">เปิดรับการแจ้งเตือน</div>
                      <p className="text-slate-600 text-xs mt-0.5 leading-relaxed">
                        รับแจ้งเตือนงานซ่อมใหม่ การขาย เงินเดือน และเหตุการณ์สำคัญ แม้ไม่ได้เปิดเว็บไซต์ — เด้งเหมือน notification ปกติของมือถือ
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                    <button
                      onClick={() => setShowNotificationPrompt(false)}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-xs transition-all active:scale-95"
                    >
                      <Bell className="h-3.5 w-3.5" />
                      <span>เปิดการแจ้งเตือน</span>
                    </button>
                    <button
                      onClick={() => setShowNotificationPrompt(false)}
                      className="px-3 py-2 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-medium transition-colors"
                    >
                      ไม่ใช่ตอนนี้
                    </button>
                  </div>
                </div>
              )}

              <main>{children}</main>
            </div>

          </div>
        </div></StaffReady>
      )}
    </AppProvider>
  );
}

function StaffReady({ children }: { children: React.ReactNode }) {
  const { loading } = useApp();
  return loading ? <div role="status" className="min-h-screen grid place-items-center text-slate-700">กำลังโหลดข้อมูลร้าน…</div> : <>{children}</>;
}
