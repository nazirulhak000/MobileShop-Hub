"use client";

import React, { useState } from "react";
import { Sparkles, Megaphone, ArrowRight, X } from "lucide-react";
import { StorefrontThemeColor, THEME_PALETTES } from "@/lib/storefrontTheme";

interface AnnouncementBarProps {
  text?: string | null;
  enabled?: boolean;
  themeColor?: StorefrontThemeColor;
  actionText?: string;
  actionUrl?: string;
  closable?: boolean;
}

export function AnnouncementBar({
  text,
  enabled = true,
  themeColor = "emerald",
  actionText,
  actionUrl,
  closable = true,
}: AnnouncementBarProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!enabled || !text || text.trim() === "" || dismissed) {
    return null;
  }

  const theme = THEME_PALETTES[themeColor] || THEME_PALETTES.emerald;

  return (
    <aside
      aria-label="ประกาศร้านค้า"
      className={`relative w-full py-2.5 px-4 text-xs font-medium border-b transition-all duration-200 z-50 overflow-hidden ${theme.announcement.bg} ${theme.announcement.text} ${theme.announcement.border}`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex-1 flex items-center justify-center gap-2.5 text-center flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase ${theme.announcement.badgeBg} ${theme.announcement.badgeText}`}
          >
            <Sparkles className="h-3 w-3" />
            <span>ประกาศ</span>
          </span>
          <span className="leading-snug break-words">{text}</span>
          {actionText && actionUrl && (
            <a
              href={actionUrl}
              className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity ml-1"
            >
              <span>{actionText}</span>
              <ArrowRight className="h-3 w-3" />
            </a>
          )}
        </div>

        {closable && (
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-2 rounded-md opacity-70 hover:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="ปิดประกาศ"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
