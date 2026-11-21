"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Smartphone,
  CheckCircle2,
  Building2,
  User,
  Lock,
  Phone,
  Mail,
  KeyRound,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Store,
  Layers,
} from "lucide-react";

export default function RegisterPage() {
  const [selectedPlan, setSelectedPlan] = useState<"free" | "pro" | "enterprise">("free");
  const [formData, setFormData] = useState({
    shopName: "",
    shopSlug: "",
    ownerName: "",
    username: "",
    password: "",
    phone: "",
    email: "",
    otpCode: "",
  });

  const [verificationToken, setVerificationToken] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpMessage, setOtpMessage] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (otpCooldown > 0) {
      timer = setTimeout(() => setOtpCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCooldown]);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("plan")?.toLowerCase();
      if (p === "pro" || p === "enterprise") {
        setSelectedPlan(p as "pro" | "enterprise");
      } else {
        setSelectedPlan("free");
      }
    }
  }, []);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [registeredData, setRegisteredData] = useState<{
    shopSlug: string;
    shopName: string;
    username: string;
  } | null>(null);

  const handleSlugAutoFill = (name: string) => {
    // Basic romanization / transliteration placeholder or simple slugify
    const clean = name
      .toLowerCase()
      .trim()
      .replace(/[^a-zA-Z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    if (!formData.shopSlug && clean) {
      setFormData((prev) => ({ ...prev, shopSlug: clean }));
    }
  };

  const handleSendOtp = async () => {
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      setError("กรุณากรอกอีเมลที่ถูกต้องก่อนขอรหัส OTP");
      return;
    }
    setError("");
    setIsSendingOtp(true);
    setOtpMessage("");

    try {
      const res = await fetch("/api/auth/send-registration-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "ไม่สามารถส่งรหัส OTP ได้");
      }
      setVerificationToken(data.verificationToken);
      setOtpSent(true);
      setOtpCooldown(60);
      setOtpMessage(data.message || "ส่งรหัส OTP เรียบร้อยแล้ว");
      if (data.devOtp) {
        setDevOtp(data.devOtp);
      }
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาดในการส่ง OTP");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      setError("กรุณากรอกอีเมลของคุณเพื่อยืนยันตัวตน");
      return;
    }

    if (!verificationToken || !formData.otpCode.trim()) {
      setError("กรุณากดรับรหัส OTP และกรอกรหัส 6 หลักที่ได้รับในอีเมล");
      return;
    }

    if (formData.password.length < 12) {
      setError("รหัสผ่านต้องมีความยาวอย่างน้อย 12 ตัวอักษร");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          verificationToken,
          plan: selectedPlan,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "ไม่สามารถลงทะเบียนได้");
      }

      setRegisteredData({
        shopSlug: data.shopSlug,
        shopName: data.shopName,
        username: data.username,
      });
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 py-4 px-6 sm:px-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs">
              <Smartphone className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900 tracking-tight">
                FixMe
              </span>
              <span className="block text-[11px] text-slate-500 font-medium">
                ระบบบริหารร้านมือถือ & ศูนย์บริการครบวงจร (SaaS)
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-600 hidden sm:inline">เป็นสมาชิกอยู่แล้ว?</span>
            <Link
              href="/login"
              className="px-3.5 py-2 font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              เข้าสู่ระบบร้าน
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-16">
        {registeredData ? (
          /* Success Screen */
          <div className="max-w-xl mx-auto bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-sm text-center space-y-6 animate-fade-in">
            <div className="h-16 w-16 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="h-9 w-9" />
            </div>

            <div className="space-y-2">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                ทดลองใช้งานฟรี 14 วัน (ไม่ต้องใช้บัตรเครดิต)
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                เปิดร้านค้า {registeredData.shopName} สำเร็จแล้ว!
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                ระบบได้สร้างฐานข้อมูล คลังสินค้า สต็อก IMEI และหน้าเว็บหน้าร้านเฉพาะของท่านเรียบร้อยแล้ว
              </p>
            </div>

            {/* Storefront URL Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                หน้าเว็บหน้าร้านสำหรับลูกค้าของคุณ (Storefront URL)
              </span>
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-slate-200">
                <span className="text-xs sm:text-sm font-mono text-emerald-800 font-semibold truncate">
                  /store/{registeredData.shopSlug}
                </span>
                <Link
                  href={`/store/${registeredData.shopSlug}`}
                  target="_blank"
                  className="px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  <span>เปิดดูหน้าร้าน</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
              <p className="text-[11px] text-slate-500">
                ส่งลิงก์นี้ให้ลูกค้าเพื่อเช็คสถานะงานซ่อมสด (Live Tracking) และประเมินราคาซ่อมได้ทันที
              </p>
            </div>

            {/* Actions */}
            <div className="pt-2 space-y-3">
              <Link
                href="/login"
                className="w-full min-h-[48px] bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                <span>เข้าสู่ระบบหลังบ้าน (Dashboard)</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="text-xs text-slate-500">
                ชื่อผู้ใช้งาน: <span className="font-semibold text-slate-800">{registeredData.username}</span> • รหัสร้าน (Slug): <span className="font-semibold text-slate-800">{registeredData.shopSlug}</span>
              </p>
            </div>
          </div>
        ) : (
          /* Registration Form */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Column: Form (7 cols) */}
            <div className="lg:col-span-7 bg-white p-6 sm:p-9 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-3">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
                  <span>ทดลองใช้งานฟรี 14 วัน • ยกเลิกได้ตลอดเวลา</span>
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  สร้างร้านค้าและเริ่มต้นใช้งาน
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  กรอกข้อมูลร้านของคุณเพื่อเปิดใช้งานระบบ POS, สต็อก IMEI และหน้าเว็บหน้าร้านทันที
                </p>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-medium">
                  {error}
                </div>
              )}

              {/* Plan Selection Tabs */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  เลือกแพ็กเกจที่คุณต้องการเริ่มต้น
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedPlan("free")}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      selectedPlan === "free"
                        ? "border-emerald-500 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-500/20"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900">Free Forever</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                        ฿0
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1">ฟรีตลอดชีพ 1 สาขา</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPlan("pro")}
                    className={`p-3 rounded-2xl border text-left transition-all relative ${
                      selectedPlan === "pro"
                        ? "border-blue-600 bg-blue-50/70 shadow-sm ring-2 ring-blue-500/20"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-blue-900">Pro Studio</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800">
                        ฿199
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1">Live Tracking + LINE</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPlan("enterprise")}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      selectedPlan === "enterprise"
                        ? "border-purple-600 bg-purple-50/70 shadow-sm ring-2 ring-purple-500/20"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-purple-900">Enterprise</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-purple-100 text-purple-800">
                        ฿399
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1">หลายสาขา + จำนำ</p>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Shop Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-900 mb-1.5">
                    ชื่อร้านค้าของคุณ <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={formData.shopName}
                      onChange={(e) => {
                        setFormData({ ...formData, shopName: e.target.value });
                        handleSlugAutoFill(e.target.value);
                      }}
                      placeholder="เช่น โมบายเซอร์วิส อโศก หรือ ช่างเอก รับซ่อมมือถือ"
                      className="w-full min-h-[44px] pl-10 pr-4 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 bg-white"
                    />
                    <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                {/* Shop Slug */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-900">
                      รหัสร้านค้าภาษาอังกฤษ (Shop Slug) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-500 font-mono">
                      ใช้เป็น URL หน้าร้านของคุณ
                    </span>
                  </div>
                  <div className="relative">
                    <div className="flex rounded-xl border border-slate-300 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-600 focus-within:border-emerald-600">
                      <span className="bg-slate-100 px-3 py-2.5 text-xs text-slate-500 border-r border-slate-200 font-mono flex items-center select-none">
                        /store/
                      </span>
                      <input
                        type="text"
                        required
                        value={formData.shopSlug}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            shopSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                          })
                        }
                        placeholder="siam-mobile"
                        className="flex-1 min-h-[44px] px-3 text-xs sm:text-sm font-mono text-slate-900 focus:outline-none bg-white"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    ตัวพิมพ์เล็ก ภาษาอังกฤษและตัวเลข เช่น <span className="font-mono">siam-repair</span>
                  </p>
                </div>

                {/* Owner Name & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-900 mb-1.5">
                      ชื่อ-นามสกุล เจ้าของร้าน <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={formData.ownerName}
                        onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                        placeholder="เช่น สมชาย ใจดี"
                        className="w-full min-h-[44px] pl-10 pr-4 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 bg-white"
                      />
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-900 mb-1.5">
                      เบอร์โทรศัพท์ติดต่อ
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="089-123-4567"
                        className="w-full min-h-[44px] pl-10 pr-4 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 bg-white"
                      />
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                </div>

                {/* Email & OTP Verification */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-900 mb-1.5">
                      อีเมลสำหรับยืนยันตัวตน & กู้คืนรหัสผ่าน <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value.trim() })}
                          placeholder="owner@yourshop.com"
                          className="w-full min-h-[44px] pl-10 pr-4 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 bg-white"
                        />
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      </div>
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={isSendingOtp || otpCooldown > 0 || !formData.email}
                        className="min-h-[44px] px-4 text-xs font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center gap-1.5 shrink-0"
                      >
                        {isSendingOtp ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>กำลังส่ง...</span>
                          </>
                        ) : otpCooldown > 0 ? (
                          <span>ส่งใหม่ ({otpCooldown}s)</span>
                        ) : otpSent ? (
                          <span>ส่งรหัสใหม่</span>
                        ) : (
                          <span>ขอรหัส OTP</span>
                        )}
                      </button>
                    </div>
                  </div>

                  {otpSent && (
                    <div className="pt-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-900 flex items-center gap-1">
                          <KeyRound className="h-3.5 w-3.5 text-emerald-600" />
                          <span>รหัสยืนยัน OTP (6 หลัก)</span>
                          <span className="text-rose-500">*</span>
                        </label>
                        {devOtp && (
                          <button
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, otpCode: devOtp }))}
                            className="text-[11px] font-mono font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded-md transition-colors"
                            title="คลิกเพื่อเติมรหัสทดสอบอัตโนมัติ"
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
                          value={formData.otpCode}
                          onChange={(e) => setFormData({ ...formData, otpCode: e.target.value.replace(/[^0-9]/g, "").slice(0, 6) })}
                          placeholder="123456"
                          className="w-full min-h-[44px] pl-4 pr-4 text-sm font-mono tracking-widest text-slate-900 text-center rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 bg-white font-bold"
                        />
                      </div>
                      {otpMessage && (
                        <p className="text-[11px] text-emerald-700 mt-1.5 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>{otpMessage}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Username & Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-900 mb-1.5">
                      ชื่อผู้ใช้เข้าสู่ระบบ (Username) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value.trim() })}
                        placeholder="admin_shop"
                        className="w-full min-h-[44px] pl-10 pr-4 text-xs sm:text-sm font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 bg-white"
                      />
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-900 mb-1.5">
                      รหัสผ่าน (Password) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="••••••••"
                        className="w-full min-h-[44px] pl-10 pr-4 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 bg-white"
                      />
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full min-h-[48px] bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-150 shadow-sm disabled:opacity-70"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>กำลังสร้างร้านค้าของคุณ...</span>
                      </>
                    ) : (
                      <>
                        <span>สร้างร้านค้าและเริ่มต้นใช้งานฟรี</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[11px] text-center text-slate-500 leading-relaxed pt-1">
                  การกดสร้างร้านค้า ถือว่าท่านยอมรับข้อตกลงการให้บริการและนโยบายความเป็นส่วนตัวของ FixMe
                </p>
              </form>
            </div>

            {/* Right Column: Benefits Checklist (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-slate-900 text-white p-7 sm:p-8 rounded-3xl shadow-md space-y-6">
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">
                    สิ่งที่ร้านของคุณจะได้รับทันที
                  </span>
                  <h2 className="text-xl font-bold">
                    ครบทุกระบบในที่เดียว เพื่อร้านมือถือยุคใหม่
                  </h2>
                </div>

                <div className="space-y-4 text-xs sm:text-sm text-slate-300">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">แถมฟรี! หน้าเว็บหน้าร้าน (Storefront)</strong>: ให้ลูกค้าร้านคุณเช็คสถานะซ่อมสดและประเมินราคาซ่อมได้ทันที
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">คลังสินค้าคุม IMEI 15 หลัก</strong>: แยกเกรดเครื่อง A/B/C ป้องกันของโจร พร้อมสัญญาซื้อขายตามบัตร ปชช.
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">โต๊ะงานช่าง Kanban</strong>: วาด Pattern Lock 3x3 บนจอ, ตรวจเช็ค 10 จุด, เบิกอะไหล่ตัดสต็อก
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">ระบบภาษีสรรพากร 2568</strong>: คำนวณ ภ.ง.ด. 90/94/50/51 และ ภ.พ.30 อัตโนมัติ
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-white">พิมพ์ใบรับซ่อม 80mm</strong>: สลิปความร้อนพร้อม QR Code ลูกค้าสแกนเช็คสถานะได้ทันที
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                  <span>ทดลองฟรี 14 วันเต็ม</span>
                  <span>ไม่ต้องกรอกบัตรเครดิต</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Simple Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        © 2026 FixMe SaaS Platform. ระบบบริหารร้านมือถือและศูนย์บริการครบวงจร
      </footer>
    </div>
  );
}
