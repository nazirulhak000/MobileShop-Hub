import React from "react";
import Link from "next/link";
import { Home, Store } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="max-w-md w-full bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="h-16 w-16 bg-slate-100 text-slate-700 rounded-2xl flex items-center justify-center mx-auto">
          <Store className="h-8 w-8 text-slate-500" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
            Error 404 • Page Not Found
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            ไม่พบหน้าที่คุณต้องการ
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            หน้าที่ท่านกำลังเรียกหาอาจถูกย้าย ลบ หรือยังไม่ได้เปิดให้บริการในระบบ
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all min-h-[44px]"
          >
            <Home className="h-4 w-4" />
            กลับสู่หน้าหลัก
          </Link>
        </div>
      </div>
    </div>
  );
}
