"use client";

import React from "react";

interface FixMeLogoProps {
  /**
   * "light" for dark navy/black backgrounds (white wordmark)
   * "dark" for light/white backgrounds (navy/dark wordmark)
   */
  variant?: "light" | "dark";
  /** Size variant: sm (28px icon), md (36px icon), lg (44px icon) */
  size?: "sm" | "md" | "lg";
  /** Whether to show the 'ซ่อมมือถือ' badge */
  showSubtitle?: boolean;
  /** Whether to display only the smartphone checkmark mark */
  iconOnly?: boolean;
  className?: string;
}

export function FixMePhoneIcon({
  size = 36,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <defs>
        {/* Phone Body Gradient: Royal Blue to Bright Cyan */}
        <linearGradient id="fixmePhoneGradient" x1="0" y1="0" x2="36" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0B57D0" />
          <stop offset="100%" stopColor="#0084FF" />
        </linearGradient>

        {/* Screen Background Gradient: Deep Navy */}
        <linearGradient id="fixmeScreenGradient" x1="6" y1="6" x2="30" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#081734" />
          <stop offset="100%" stopColor="#0F2B5C" />
        </linearGradient>

        {/* Checkmark subtle glow */}
        <filter id="fixmeGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#00E5FF" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Outer Phone Chassis */}
      <rect
        x="3"
        y="1"
        width="30"
        height="38"
        rx="7"
        fill="url(#fixmePhoneGradient)"
        stroke="#0EA5E9"
        strokeWidth="1"
      />

      {/* Inner Screen */}
      <rect
        x="5.5"
        y="4.5"
        width="25"
        height="31"
        rx="4.5"
        fill="url(#fixmeScreenGradient)"
      />

      {/* Top Camera Notch / Dynamic Island */}
      <rect
        x="13.5"
        y="6"
        width="9"
        height="2.5"
        rx="1.25"
        fill="#050B18"
      />
      <circle cx="20" cy="7.25" r="0.75" fill="#38BDF8" opacity="0.8" />

      {/* Bold White Checkmark (✓) */}
      <path
        d="M11 20.5L15.5 25L25 14.5"
        stroke="#FFFFFF"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#fixmeGlow)"
      />

      {/* Subtle Bottom Home Bar Indicator */}
      <line
        x1="14"
        y1="32.5"
        x2="22"
        y2="32.5"
        stroke="#60A5FA"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
}

export function FixMeLogo({
  variant = "dark",
  size = "md",
  showSubtitle = true,
  iconOnly = false,
  className = "",
}: FixMeLogoProps) {
  const iconPixelSize = size === "sm" ? 30 : size === "lg" ? 44 : 36;
  const isLight = variant === "light";

  if (iconOnly) {
    return <FixMePhoneIcon size={iconPixelSize} className={className} />;
  }

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Smartphone Silhouette Mark with Bold Checkmark */}
      <div className="relative shrink-0 flex items-center justify-center drop-shadow-xs transition-transform duration-200 group-hover:scale-105">
        <FixMePhoneIcon size={iconPixelSize} />
      </div>

      {/* Brand Wordmark & Subtitle Badge */}
      <div className="flex flex-col justify-center leading-none">
        <div className="flex items-center gap-2">
          <span
            className={`font-black tracking-tight font-sans ${
              size === "sm" ? "text-lg" : size === "lg" ? "text-2xl" : "text-xl"
            }`}
          >
            <span className={isLight ? "text-white" : "text-slate-900"}>Fix</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
              Me
            </span>
          </span>

          {showSubtitle && (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold text-white bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 shadow-xs border border-blue-400/30 tracking-tight"
            >
              ซ่อมมือถือ
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
