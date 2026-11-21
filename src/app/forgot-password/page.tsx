"use client";

import React, { useState } from "react";
import Link from "next/link";
import { KeyRound, Mail, Lock, ArrowLeft, ArrowRight, Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import { FixMePhoneIcon } from "@/components/landing/FixMeLogo";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"request" | "reset" | "success">("request");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationToken, setVerificationToken] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("กรุณากรอกอีเมลที่ถูกต้อง");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request-otp", email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "ไม่สามารถส่งรหัส OTP ได้");
      }
      setVerificationToken(data.verificationToken);
      setSuccessMessage(data.message || "ส่งรหัส OTP เรียบร้อยแล้ว");
      if (data.devOtp) setDevOtp(data.devOtp);
      setCooldown(60);
      setStep("reset");
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!otpCode || otpCode.length !== 6) {
      setError("กรุณากรอกรหัส OTP 6 หลัก");
      return;
    }

    if (newPassword.length < 12) {
      setError("รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 12 ตัวอักษร");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset-password",
          email: email.trim(),
          otpCode: otpCode.trim(),
          verificationToken,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "ไม่สามารถเปลี่ยนรหัสผ่านได้");
      }
      setStep("success");
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-16 flex items-center justify-center font-sans">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-slate-200/90 shadow-sm">
        {/* Brand Header */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/20">
            <FixMePhoneIcon size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              {step === "success" ? "สำเร็จแล้ว" : "รีเซ็ตรหัสผ่าน"}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              MobileShop Hub • ระบบกู้คืนบัญชีผู้ใช้
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-medium text-rose-800 animate-fade-in">
            {error}
          </div>
        )}

        {/* Step 1: Request OTP */}
        {step === "request" && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              กรอกอีเมลที่ผูกไว้กับบัญชีของคุณ เราจะส่งรหัส OTP 6 หลักไปให้เพื่อยืนยันตัวตน
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                อีเมลของคุณ (Email)
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim())}
                  placeholder="yourname@domain.com"
                  className="w-full min-h-[44px] pl-10 pr-4 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white"
                />
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email}
              className="w-full min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>กำลังส่งรหัส OTP...</span>
                </>
              ) : (
                <>
                  <span>ส่งรหัส OTP กู้คืนรหัสผ่าน</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <div className="pt-2 text-center">
              <Link href="/login" className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center gap-1">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>กลับไปหน้าเข้าสู่ระบบ</span>
              </Link>
            </div>
          </form>
        )}

        {/* Step 2: Enter OTP & New Password */}
        {step === "reset" && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">{successMessage}</span>
                <div className="text-[11px] text-blue-600 mt-0.5">อีเมล: {email}</div>
              </div>
            </div>

            {/* OTP Code */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-800">
                  รหัส OTP 6 หลัก
                </label>
                {devOtp && (
                  <button
                    type="button"
                    onClick={() => setOtpCode(devOtp)}
                    className="text-[11px] font-mono font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded-md"
                  >
                    ทดสอบด่วน: {devOtp}
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                  placeholder="123456"
                  className="w-full min-h-[44px] pl-4 pr-4 text-base font-mono tracking-widest text-center rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white font-bold"
                />
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                รหัสผ่านใหม่ (อย่างน้อย 12 ตัวอักษร)
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full min-h-[44px] pl-10 pr-4 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white"
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                ยืนยันรหัสผ่านใหม่อีกครั้ง
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full min-h-[44px] pl-10 pr-4 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white"
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || otpCode.length !== 6 || newPassword.length < 12}
              className="w-full min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>กำลังบันทึกรหัสผ่านใหม่...</span>
                </>
              ) : (
                <>
                  <span>บันทึกรหัสผ่านใหม่</span>
                  <KeyRound className="h-4 w-4" />
                </>
              )}
            </button>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep("request")}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                ← เปลี่ยนอีเมล
              </button>
              <Link href="/login" className="text-xs text-blue-600 hover:underline">
                ยกเลิก
              </Link>
            </div>
          </form>
        )}

        {/* Step 3: Success */}
        {step === "success" && (
          <div className="text-center py-4 space-y-4">
            <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">เปลี่ยนรหัสผ่านสำเร็จ</h2>
              <p className="text-xs text-slate-500 mt-1">
                คุณสามารถใช้รหัสผ่านใหม่เข้าสู่ระบบได้ทันที
              </p>
            </div>
            <Link
              href="/login"
              className="w-full min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm inline-block leading-[44px]"
            >
              เข้าสู่ระบบร้านค้า (Go to Login)
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
