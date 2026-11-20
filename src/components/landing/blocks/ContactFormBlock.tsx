"use client";

import React, { useState } from "react";
import {
  Send,
  CheckCircle2,
  AlertCircle,
  Phone,
  User,
  Smartphone,
  Wrench,
  Building2,
  MessageSquare,
  Sparkles,
  Loader2,
} from "lucide-react";
import { StorefrontThemeColor, THEME_PALETTES } from "@/lib/storefrontTheme";
import { ContactFormBlockProps } from "./types";

export function ContactFormBlock({
  id = "contact-form",
  title = "ส่งคำขอบริการหรือปรึกษาอาการฟรี",
  subtitle = "กรอกรายละเอียดอาการเครื่องเสีย ทีมวิศวกรผู้เชี่ยวชาญจะติดต่อกลับเพื่อให้คำปรึกษาและประเมินราคาภายใน 15 นาที",
  badge = "⚡ นัดหมายคิวซ่อมออนไลน์",
  successMessage = "ส่งข้อมูลเรียบร้อยแล้ว! เจ้าหน้าที่จะติดต่อกลับโดยเร็วที่สุดครับ",
  buttonText = "ส่งข้อมูลปรึกษาช่างทันที",
  branches,
  themeColor = "emerald",
  className = "",
  data,
  onSubmitSuccess,
}: ContactFormBlockProps) {
  const resolvedTitle = title || data?.title || "ส่งคำขอบริการหรือปรึกษาอาการฟรี";
  const resolvedSubtitle = subtitle || data?.subtitle;
  const resolvedBadge = badge || data?.badge;
  const resolvedBtnText = buttonText || data?.buttonText || "ส่งข้อมูลปรึกษาช่างทันที";
  const branchList = branches || data?.branches || [
    "สาขาสำนักงานใหญ่ (พระราม 9)",
    "สาขาสยามสแควร์",
    "สาขาอารีย์",
    "บริการรับ-ส่งซ่อม Delivery",
  ];

  const palette = THEME_PALETTES[themeColor] || THEME_PALETTES.emerald;

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    lineId: "",
    device: "",
    issue: "",
    branch: branchList[0] || "",
    // Honeypot field (must stay empty)
    hp_website: "",
  });

  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Honeypot Anti-Spam Check
    if (formData.hp_website && formData.hp_website.trim().length > 0) {
      // Bot detected - simulate silent success without saving
      setStatus("success");
      return;
    }

    // 2. Validation
    if (!formData.name.trim()) {
      setErrorMessage("กรุณาระบุชื่อผู้ติดต่อ");
      setStatus("error");
      return;
    }
    const cleanPhone = formData.phone.replace(/[^0-9+]/g, "");
    if (cleanPhone.length < 9) {
      setErrorMessage("กรุณาระบุเบอร์โทรศัพท์ที่ถูกต้อง (อย่างน้อย 9-10 หลัก)");
      setStatus("error");
      return;
    }

    setStatus("submitting");
    setErrorMessage("");

    try {
      // Simulate or call submission endpoint
      const payload = {
        name: formData.name.trim(),
        phone: cleanPhone,
        lineId: formData.lineId.trim() || undefined,
        device: formData.device.trim() || undefined,
        issue: formData.issue.trim() || undefined,
        branch: formData.branch,
        submittedAt: new Date().toISOString(),
      };

      // Optional hook for integration tests or parent component callbacks
      if (onSubmitSuccess) {
        onSubmitSuccess(payload);
      }

      // Small network feel
      await new Promise((resolve) => setTimeout(resolve, 600));

      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMessage("เกิดข้อผิดพลาดในการส่งข้อมูล กรุณาลองใหม่อีกครั้งหรือติดต่อผ่าน LINE");
    }
  };

  const handleReset = () => {
    setFormData({
      name: "",
      phone: "",
      lineId: "",
      device: "",
      issue: "",
      branch: branchList[0] || "",
      hp_website: "",
    });
    setStatus("idle");
    setErrorMessage("");
  };

  return (
    <section
      id={id}
      aria-label="แบบฟอร์มปรึกษาและนัดหมายคิวซ่อม"
      className={`w-full py-10 sm:py-14 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto overflow-hidden ${className}`}
    >
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ backgroundColor: palette.primary }}
        />

        {/* Header */}
        <div className="text-center space-y-3 mb-8 relative z-10">
          {resolvedBadge && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-slate-950/80 border border-slate-700/80 text-white shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{resolvedBadge}</span>
            </div>
          )}

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight break-words">
            {resolvedTitle}
          </h2>

          {resolvedSubtitle && (
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed break-words">
              {resolvedSubtitle}
            </p>
          )}
        </div>

        {/* Success View */}
        {status === "success" ? (
          <div className="text-center py-10 space-y-4 animate-fade-in relative z-10">
            <div className="inline-flex p-4 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h3 className="text-xl font-bold text-white">ส่งข้อมูลเรียบร้อยแล้ว!</h3>
            <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
              {successMessage}
            </p>
            <div className="pt-4">
              <button
                type="button"
                onClick={handleReset}
                className="min-h-[44px] px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-colors"
              >
                ส่งคำขออื่นเพิ่มเติม
              </button>
            </div>
          </div>
        ) : (
          /* Form View */
          <form onSubmit={handleSubmit} className="space-y-4 relative z-10" noValidate>
            {/* Error Banner */}
            {status === "error" && errorMessage && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Anti-Spam Honeypot Field (invisible to humans) */}
            <div
              style={{ display: "none", opacity: 0, position: "absolute", zIndex: -10 }}
              aria-hidden="true"
            >
              <label htmlFor={`${id}-hp-website`}>อย่ากรอกช่องนี้ (Leave blank):</label>
              <input
                id={`${id}-hp-website`}
                type="text"
                name="hp_website"
                value={formData.hp_website}
                onChange={handleChange}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Customer Name */}
              <div className="space-y-1.5">
                <label
                  htmlFor={`${id}-name`}
                  className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>ชื่อผู้ติดต่อ <span className="text-rose-400">*</span></span>
                </label>
                <input
                  id={`${id}-name`}
                  type="text"
                  name="name"
                  required
                  placeholder="เช่น คุณสมชาย หรือ นามสกุล"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-1.5">
                <label
                  htmlFor={`${id}-phone`}
                  className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>เบอร์โทรศัพท์ <span className="text-rose-400">*</span></span>
                </label>
                <input
                  id={`${id}-phone`}
                  type="tel"
                  name="phone"
                  required
                  placeholder="เช่น 081-234-5678"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Device Model */}
              <div className="space-y-1.5">
                <label
                  htmlFor={`${id}-device`}
                  className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5"
                >
                  <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                  <span>รุ่นอุปกรณ์ที่ต้องการซ่อม</span>
                </label>
                <input
                  id={`${id}-device`}
                  type="text"
                  name="device"
                  placeholder="เช่น iPhone 15 Pro, iPad Air 5"
                  value={formData.device}
                  onChange={handleChange}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Line ID */}
              <div className="space-y-1.5">
                <label
                  htmlFor={`${id}-lineId`}
                  className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                  <span>LINE ID (เพื่อรับใบเสนอราคา)</span>
                </label>
                <input
                  id={`${id}-lineId`}
                  type="text"
                  name="lineId"
                  placeholder="เช่น @fixme หรือ somchai_fix"
                  value={formData.lineId}
                  onChange={handleChange}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            {/* Branch Selection */}
            {branchList.length > 1 && (
              <div className="space-y-1.5">
                <label
                  htmlFor={`${id}-branch`}
                  className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5"
                >
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>สาขาที่สะดวกเข้ารับบริการ</span>
                </label>
                <select
                  id={`${id}-branch`}
                  name="branch"
                  value={formData.branch}
                  onChange={handleChange}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  {branchList.map((b: string) => (
                    <option key={b} value={b} className="bg-slate-900 text-white">
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Repair Issue / Symptom Description */}
            <div className="space-y-1.5">
              <label
                htmlFor={`${id}-issue`}
                className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5"
              >
                <Wrench className="w-3.5 h-3.5 text-slate-400" />
                <span>อาการเสียหรือบริการที่ต้องการ</span>
              </label>
              <textarea
                id={`${id}-issue`}
                name="issue"
                rows={3}
                placeholder="เช่น จอแตกทัชไม่ได้, แบตบวมเสื่อมไว, เครื่องตกน้ำเปิดไม่ติด ฯลฯ"
                value={formData.issue}
                onChange={handleChange}
                className="w-full min-h-[80px] p-4 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors resize-y leading-relaxed"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={status === "submitting"}
                className={`w-full min-h-[48px] px-6 py-3.5 rounded-2xl font-bold text-sm sm:text-base text-white shadow-xl flex items-center justify-center gap-2.5 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none ${palette.button}`}
              >
                {status === "submitting" ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>กำลังส่งข้อมูล...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{resolvedBtnText}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

export default ContactFormBlock;
