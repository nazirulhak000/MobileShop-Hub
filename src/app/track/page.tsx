"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Wrench,
  HelpCircle,
  Phone,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { extractTrackingToken, TRACKING_INPUT_ERROR } from "@/components/landing/trackingToken";

export default function TrackSearchPortalPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const token = extractTrackingToken(code);
    if (!token) {
      setError(TRACKING_INPUT_ERROR);
      return;
    }
    router.push(`/track/${token}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6 animate-fade-in">
        {/* Brand & Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-md">
            <Smartphone className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            ระบบติดตามสถานะงานซ่อม (Fixme Repair Tracking)
          </h1>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            ตรวจสอบความคืบหน้างานซ่อม ภาพถ่ายการตรวจสอบ และการรับประกันแบบ Real-time
          </p>
        </div>

        {/* Tracking Input Card */}
        <Card className="rounded-2xl border-slate-200/90 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-6 space-y-4">
            <form onSubmit={handleSearch} className="space-y-3">
              <label htmlFor="track-code-input" className="text-xs font-semibold text-slate-700 block">
                ลิงก์ติดตามงานซ่อม (จาก QR บนใบรับเครื่อง)
              </label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="track-code-input"
                  type="text"
                  placeholder="วางลิงก์ติดตามจากใบรับเครื่อง"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    setError("");
                  }}
                  className="pl-10 h-11 text-sm font-mono font-semibold text-slate-900 border-slate-200 rounded-xl focus:border-teal-500 focus:ring-teal-100"
                  aria-invalid={!!error}
                  aria-describedby={error ? "track-error-msg" : undefined}
                />
              </div>

              {error && (
                <p id="track-error-msg" role="alert" className="text-xs font-medium text-rose-600">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl gap-2 shadow-xs transition-all active:scale-98"
              >
                <span>ค้นหาสถานะงานซ่อม</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <p className="pt-2 border-t border-slate-100 text-xs text-slate-500 leading-relaxed">
              สแกน QR Code บนใบรับเครื่องด้วยกล้องมือถือ หรือคัดลอกลิงก์จากใบรับเครื่อง/ข้อความจากร้านมาวางในช่องด้านบน
            </p>
          </CardContent>
        </Card>

        {/* Feature Highlights Bento */}
        <div className="grid grid-cols-3 gap-3 text-center text-xs">
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-1">
            <Clock className="h-4 w-4 text-teal-600 mx-auto" />
            <div className="font-semibold text-slate-800">อัปเดต Real-time</div>
            <div className="text-[10px] text-slate-400">แจ้งเตือนสถานะทันที</div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-1">
            <ShieldCheck className="h-4 w-4 text-emerald-600 mx-auto" />
            <div className="font-semibold text-slate-800">ประกันงานซ่อม</div>
            <div className="text-[10px] text-slate-400">รับประกันสูงสุด 90 วัน</div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-1">
            <MessageCircle className="h-4 w-4 text-sky-600 mx-auto" />
            <div className="font-semibold text-slate-800">ติดต่อช่าง</div>
            <div className="text-[10px] text-slate-400">ผ่านระบบ LINE OA</div>
          </div>
        </div>

        {/* Back to ERP Login */}
        <div className="text-center">
          <Link
            href="/dashboard"
            className="inline-flex min-h-[44px] items-center px-2 text-xs font-semibold text-teal-700 hover:text-teal-900 transition-colors"
          >
            ← กลับสู่ระบบบริหารงานศูนย์บริการ (Staff ERP)
          </Link>
        </div>
      </div>
    </div>
  );
}
