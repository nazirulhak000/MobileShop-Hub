"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { AppProvider } from "@/context/AppContext";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MessageCircle, Megaphone, Bell, X, ChevronRight } from "lucide-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicTrackPage = pathname.startsWith("/track");
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(true);

  return (
    <AppProvider>
      {isPublicTrackPage ? (
        <div className="min-h-screen bg-slate-50">{children}</div>
      ) : (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans">
          <Sidebar />
          <div className="flex-1 flex flex-col lg:pl-64 min-w-0 transition-all">
            <Header />

            <div className="flex-1 p-4 md:p-6 lg:p-7 max-w-7xl w-full mx-auto space-y-4">
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

            {/* Floating Action Button (FAB) - 'มีคำถาม? ทักเรา' Matching Screenshot */}
            <div className="fixed bottom-6 right-6 z-40">
              <button
                type="button"
                className="group flex items-center gap-2 rounded-full bg-teal-600 hover:bg-teal-700 text-white px-5 py-3 shadow-lg shadow-teal-700/20 font-medium text-xs sm:text-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <MessageCircle className="h-4 w-4 transition-transform group-hover:rotate-12" />
                <span>มีคำถาม? ทักเรา</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </AppProvider>
  );
}
