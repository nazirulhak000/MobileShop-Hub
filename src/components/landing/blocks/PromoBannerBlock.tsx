"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Tag,
  Sparkles,
  ArrowRight,
  Clock,
  Copy,
  Check,
  Percent,
  ExternalLink,
} from "lucide-react";
import { StorefrontThemeColor, THEME_PALETTES } from "@/lib/storefrontTheme";
import { sanitizeUrl } from "@/lib/storefrontSecurity";
import { generateResponsiveImageProps } from "@/lib/wordpress/mediaEngine";
import { PromoBannerBlockProps } from "./types";

export function PromoBannerBlock({
  title,
  subtitle,
  badge,
  buttonText,
  buttonUrl,
  bgType,
  bgImageUrl,
  imageUrl,
  discountTag,
  expiryNotice,
  themeColor = "emerald",
  className = "",
  data,
}: PromoBannerBlockProps) {
  // Merge direct props with data object if provided
  const resolvedTitle = title || data?.title || "โปรโมชั่นพิเศษประจำเดือนนี้";
  const resolvedSubtitle =
    subtitle ||
    data?.subtitle ||
    "รับส่วนลดค่าบริการซ่อมและเปลี่ยนแบตเตอรี่แท้ พร้อมตรวจเช็คสภาพเครื่อง 20 รายการฟรี";
  const resolvedBadge = badge || data?.badge || "🔥 โปรโมชั่นจำกัดเวลา";
  const resolvedButtonText = buttonText || data?.buttonText || "รับสิทธิ์โปรโมชั่นเลย";
  const rawButtonUrl = buttonUrl || data?.buttonUrl || "#repair-quote";
  const resolvedButtonUrl = sanitizeUrl(rawButtonUrl, "#repair-quote");
  const resolvedBgImage = bgImageUrl || imageUrl || data?.bgImageUrl || data?.imageUrl;
  const rawBgType = bgType || data?.bgType;
  const resolvedBgType =
    rawBgType === "image" || rawBgType === "solid" || rawBgType === "gradient"
      ? rawBgType
      : resolvedBgImage
      ? "image"
      : "gradient";
  const resolvedDiscountTag = discountTag || data?.discountTag;
  const resolvedExpiryNotice =
    expiryNotice || data?.expiryNotice || "⚡ สิทธิ์มีจำนวนจำกัดต่อวัน หรือจนกว่าจะสิ้นสุดแคมเปญ";

  const palette = THEME_PALETTES[themeColor] || THEME_PALETTES.emerald;
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Memory leak prevention: clear timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleCopyCode = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!resolvedDiscountTag) return;
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    navigator.clipboard.writeText(resolvedDiscountTag);
    setCopied(true);
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
  };

  const isExternal =
    resolvedButtonUrl.startsWith("http://") ||
    resolvedButtonUrl.startsWith("https://") ||
    resolvedButtonUrl.startsWith("tel:") ||
    resolvedButtonUrl.startsWith("mailto:");

  return (
    <section
      className={`w-full py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden ${className}`}
      aria-label="Promotion Banner"
    >
      <div
        className={`relative overflow-hidden rounded-3xl border border-slate-800 shadow-2xl transition-all duration-300 ${
          resolvedBgType === "image" && resolvedBgImage
            ? "bg-slate-950"
            : "bg-gradient-to-br from-slate-900/95 via-slate-900/80 to-slate-950/95 backdrop-blur-xl"
        }`}
      >
        {/* Responsive Background Image with Srcset & Sizes */}
        {resolvedBgType === "image" && resolvedBgImage && (
          <>
            {(() => {
              const bgProps = generateResponsiveImageProps(
                resolvedBgImage,
                1920,
                1080,
                resolvedTitle,
                "large"
              );
              return (
                <img
                  src={bgProps.src}
                  srcSet={bgProps.srcSet}
                  sizes={bgProps.sizes || "100vw"}
                  alt={bgProps.alt}
                  loading={bgProps.loading}
                  decoding={bgProps.decoding}
                  width={bgProps.width}
                  height={bgProps.height}
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                />
              );
            })()}
            {/* Dark readability gradient overlay over the image */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/85 to-slate-950/65 pointer-events-none" />
          </>
        )}

        {/* Decorative Ambient Radial Glow */}
        {resolvedBgType !== "image" && (
          <>
            <div
              className="absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20"
              style={{ backgroundColor: palette.primary }}
            />
            <div
              className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-15"
              style={{ backgroundColor: palette.primary }}
            />
          </>
        )}

        <div className="relative z-10 p-6 sm:p-10 md:p-14 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          {/* Left Text Content */}
          <div className="flex-1 space-y-4 max-w-2xl">
            {/* Top Badge */}
            {resolvedBadge && (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold border backdrop-blur-md shadow-sm border-slate-700/80 bg-slate-900/80 text-white">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                <span>{resolvedBadge}</span>
              </div>
            )}

            {/* Headline */}
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white leading-snug break-words">
              {resolvedTitle}
            </h2>

            {/* Subtitle */}
            <p className="text-slate-300 text-sm sm:text-base md:text-lg leading-relaxed break-words">
              {resolvedSubtitle}
            </p>

            {/* Promo Code / Discount Pill (if provided) */}
            {resolvedDiscountTag && (
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-950/80 border border-slate-700/80 shadow-inner">
                  <Percent className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs sm:text-sm text-slate-300 font-medium">โค้ดส่วนลด:</span>
                  <span className="font-mono font-bold text-amber-300 text-sm sm:text-base tracking-wider">
                    {resolvedDiscountTag}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="ml-2 inline-flex items-center justify-center min-w-[44px] min-h-[44px] p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                    title="คัดลอกโค้ดส่วนลด"
                    aria-label="คัดลอกโค้ดส่วนลด"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {copied && (
                  <span className="text-xs text-emerald-400 font-medium animate-fade-in">
                    คัดลอกโค้ดแล้ว!
                  </span>
                )}
              </div>
            )}

            {/* Expiry / Availability Notice */}
            {resolvedExpiryNotice && (
              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-400 pt-1">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{resolvedExpiryNotice}</span>
              </div>
            )}
          </div>

          {/* Right Action Button Column & Optional Graphic */}
          <div className="w-full lg:w-auto shrink-0 flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center gap-4">
            {resolvedBgType !== "image" && (imageUrl || data?.imageUrl) && (
              <div className="hidden sm:block shrink-0 rounded-2xl overflow-hidden border border-slate-700/80 shadow-lg max-w-[220px]">
                {(() => {
                  const imgProps = generateResponsiveImageProps(
                    imageUrl || data?.imageUrl || "",
                    400,
                    300,
                    resolvedTitle,
                    "medium"
                  );
                  return (
                    <img
                      src={imgProps.src}
                      srcSet={imgProps.srcSet}
                      sizes={imgProps.sizes || "220px"}
                      alt={imgProps.alt}
                      loading={imgProps.loading}
                      decoding={imgProps.decoding}
                      width={imgProps.width}
                      height={imgProps.height}
                      className="w-full h-auto object-cover"
                    />
                  );
                })()}
              </div>
            )}
            {isExternal ? (
              <a
                href={resolvedButtonUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`min-h-[50px] min-w-[44px] px-8 py-3.5 rounded-2xl font-bold text-base sm:text-lg text-white shadow-xl flex items-center justify-center gap-3 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${palette.button}`}
              >
                <span>{resolvedButtonText}</span>
                <ExternalLink className="w-5 h-5 shrink-0" />
              </a>
            ) : (
              <Link
                href={resolvedButtonUrl}
                className={`min-h-[50px] min-w-[44px] px-8 py-3.5 rounded-2xl font-bold text-base sm:text-lg text-white shadow-xl flex items-center justify-center gap-3 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${palette.button}`}
              >
                <span>{resolvedButtonText}</span>
                <ArrowRight className="w-5 h-5 shrink-0 transition-transform group-hover:translate-x-1" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default PromoBannerBlock;
