"use client";

import React from "react";
import Link from "next/link";
import {
  MessageCircle,
  PhoneCall,
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { StorefrontThemeColor, THEME_PALETTES } from "@/lib/storefrontTheme";
import { sanitizeUrl } from "@/lib/storefrontSecurity";
import { CtaBlockProps } from "./types";

function formatTelHref(phone: string): string {
  if (!phone || typeof phone !== "string") return "";
  const digits = phone.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : "";
}

function formatLineHref(lineId: string, directUrl?: string): string {
  if (directUrl && typeof directUrl === "string") {
    const safeDirect = sanitizeUrl(directUrl);
    if (safeDirect.startsWith("http://") || safeDirect.startsWith("https://")) {
      return safeDirect;
    }
  }
  if (!lineId || typeof lineId !== "string") return "#";
  const cleanId = lineId.trim();
  if (!cleanId) return "#";
  const formattedId = cleanId.startsWith("@") ? cleanId : `@${cleanId}`;
  return `https://line.me/R/ti/p/${encodeURIComponent(formattedId)}`;
}

const DEFAULT_BENEFITS = [
  "ประเมินราคาและตรวจสอบอาการฟรี",
  "รับคูปองส่วนลดทันทีหลังแอดไลน์",
  "ช่างผู้เชี่ยวชาญตอบไวภายใน 5 นาที",
];

export function CtaBlock({
  title,
  subtitle,
  badge,
  lineId,
  lineUrl,
  phone,
  primaryAction = "line",
  customButtonText,
  customButtonUrl,
  secondaryButtonText,
  secondaryButtonUrl,
  benefits,
  themeColor = "emerald",
  className = "",
  data,
}: CtaBlockProps) {
  const resolvedTitle =
    title || data?.title || "แอด LINE รับคูปองส่วนลด 100 บาท ทันที";
  const resolvedSubtitle =
    subtitle ||
    data?.subtitle ||
    "ปรึกษาอาการเครื่องเสีย ตรวจสอบราคาอะไหล่แท้ และจองคิวซ่อมด่วนกับช่างผู้เชี่ยวชาญ";
  const resolvedBadge = badge || data?.badge || "⚡ สิทธิพิเศษลูกค้าออนไลน์";
  const resolvedLineId = lineId || data?.lineId || "@mobileshop";
  const resolvedLineUrl = lineUrl || data?.lineUrl;
  const resolvedPhone = phone || data?.phone || "081-234-5678";
  const resolvedBenefits = Array.isArray(benefits)
    ? benefits
    : Array.isArray(data?.benefits)
    ? data.benefits
    : DEFAULT_BENEFITS;
  const resolvedPrimaryAction = primaryAction || data?.primaryAction || "line";

  const resolvedCustomText = customButtonText || data?.customButtonText;
  const rawCustomUrl = customButtonUrl || data?.customButtonUrl;
  const resolvedCustomUrl = rawCustomUrl ? sanitizeUrl(rawCustomUrl) : "";

  const resolvedSecondaryText = secondaryButtonText || data?.secondaryButtonText;
  const rawSecondaryUrl = secondaryButtonUrl || data?.secondaryButtonUrl;
  const resolvedSecondaryUrl = rawSecondaryUrl ? sanitizeUrl(rawSecondaryUrl) : "";

  const palette = THEME_PALETTES[themeColor] || THEME_PALETTES.emerald;

  return (
    <section
      className={`w-full py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto ${className}`}
      aria-label="Call to Action"
    >
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 p-8 sm:p-12 md:p-16 shadow-2xl">
        {/* Glow Effects */}
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: palette.primary }}
        />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full blur-3xl opacity-15 bg-[#06C755] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto space-y-6">
          {/* Badge */}
          {resolvedBadge && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold border backdrop-blur-md shadow-sm border-slate-700/80 bg-slate-900/80 text-white">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
              <span>{resolvedBadge}</span>
            </div>
          )}

          {/* Heading */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-snug">
            {resolvedTitle}
          </h2>

          {/* Subtitle */}
          <p className="text-slate-300 text-base sm:text-lg md:text-xl leading-relaxed max-w-2xl">
            {resolvedSubtitle}
          </p>

          {/* Value Proposition Pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {resolvedBenefits.map((benefit: string, i: number) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs sm:text-sm text-slate-200"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="pt-6 w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4">
            {/* LINE Action Button */}
            {resolvedLineId && (
              <a
                href={formatLineHref(resolvedLineId, resolvedLineUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[52px] min-w-[44px] px-8 py-3.5 rounded-2xl font-bold text-base sm:text-lg text-white bg-[#06C755] hover:bg-[#05b34c] shadow-xl shadow-[#06C755]/25 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#06C755]/50"
              >
                <MessageCircle className="w-6 h-6 shrink-0 fill-white" />
                <span>แอด LINE: {resolvedLineId}</span>
              </a>
            )}

            {/* Phone Call Button */}
            {resolvedPhone && (
              <a
                href={formatTelHref(resolvedPhone)}
                className="min-h-[52px] min-w-[44px] px-8 py-3.5 rounded-2xl font-bold text-base sm:text-lg text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 shadow-xl flex items-center justify-center gap-3 transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-500"
              >
                <PhoneCall className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>โทรสายด่วน: {resolvedPhone}</span>
              </a>
            )}

            {/* Optional Custom Button */}
            {resolvedCustomText && resolvedCustomUrl && (
              <a
                href={resolvedCustomUrl}
                className={`min-h-[52px] min-w-[44px] px-8 py-3.5 rounded-2xl font-bold text-base sm:text-lg text-white shadow-xl flex items-center justify-center gap-3 transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] ${palette.button}`}
              >
                <span>{resolvedCustomText}</span>
                <ArrowRight className="w-5 h-5 shrink-0" />
              </a>
            )}

            {/* Optional Secondary Button */}
            {resolvedSecondaryText && resolvedSecondaryUrl && (
              <a
                href={resolvedSecondaryUrl}
                className="min-h-[52px] min-w-[44px] px-8 py-3.5 rounded-2xl font-bold text-base sm:text-lg text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 shadow-xl flex items-center justify-center gap-3 transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
              >
                <span>{resolvedSecondaryText}</span>
                <ExternalLink className="w-5 h-5 shrink-0" />
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default CtaBlock;
