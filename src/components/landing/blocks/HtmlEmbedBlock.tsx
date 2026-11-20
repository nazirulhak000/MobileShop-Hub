"use client";

import React, { useMemo } from "react";
import { Code2, MapPin, AlertCircle } from "lucide-react";
import { StorefrontThemeColor, THEME_PALETTES } from "@/lib/storefrontTheme";
import { HtmlEmbedBlockProps } from "./types";

/**
 * Extracts iframe src if the user pasted a raw <iframe> tag
 */
function extractIframeSrc(html: string): string | null {
  if (!html) return null;
  const match = html.match(/<iframe.*?src=["'](.*?)["']/i);
  return match ? match[1] : null;
}

export function HtmlEmbedBlock({
  title,
  subtitle,
  html,
  embedType = "custom",
  height = 450,
  themeColor = "emerald",
  className = "",
  data,
}: HtmlEmbedBlockProps) {
  const resolvedTitle = title || data?.title;
  const resolvedSubtitle = subtitle || data?.subtitle;
  const rawHtml = (html || data?.html || data?.code || "").trim();
  const resolvedHeight = Number(height || data?.height || 450);

  const palette = THEME_PALETTES[themeColor] || THEME_PALETTES.emerald;

  // Check if content is an iframe or raw HTML
  const parsed = useMemo(() => {
    if (!rawHtml) return { type: "empty" };

    const iframeSrc = extractIframeSrc(rawHtml);
    if (iframeSrc) {
      return {
        type: "iframe-src",
        src: iframeSrc,
      };
    }

    // Direct URL pasted (e.g. Google Maps URL)
    if (
      (rawHtml.startsWith("https://") || rawHtml.startsWith("http://")) &&
      !rawHtml.includes("<")
    ) {
      return {
        type: "iframe-src",
        src: rawHtml,
      };
    }

    return {
      type: "srcdoc",
      content: rawHtml,
    };
  }, [rawHtml]);

  return (
    <section
      className={`w-full py-10 sm:py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto ${className}`}
      aria-label={resolvedTitle || "Custom Widget & Embed"}
    >
      {/* Header if provided */}
      {(resolvedTitle || resolvedSubtitle) && (
        <div className="text-center max-w-3xl mx-auto mb-8 space-y-2">
          {resolvedTitle && (
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              {resolvedTitle}
            </h2>
          )}
          {resolvedSubtitle && (
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              {resolvedSubtitle}
            </p>
          )}
        </div>
      )}

      {/* Frame Container */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-800 bg-slate-900/60 shadow-xl">
        {parsed.type === "iframe-src" && parsed.src && (
          <iframe
            src={parsed.src}
            style={{ height: `${resolvedHeight}px` }}
            className="w-full border-0 rounded-3xl"
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            title={resolvedTitle || "Custom Embed"}
          />
        )}

        {parsed.type === "srcdoc" && parsed.content && (
          <iframe
            srcDoc={parsed.content}
            style={{ height: `${resolvedHeight}px` }}
            className="w-full border-0 rounded-3xl bg-white"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            title={resolvedTitle || "Custom HTML Widget"}
          />
        )}

        {parsed.type === "empty" && (
          <div
            style={{ height: `${Math.min(resolvedHeight, 260)}px` }}
            className="flex flex-col items-center justify-center p-8 text-center space-y-3 bg-slate-900/40"
          >
            <Code2 className="w-10 h-10 text-slate-500" />
            <p className="text-slate-300 font-medium text-sm sm:text-base">
              บล็อก HTML / แผนที่ Embed
            </p>
            <p className="text-slate-500 text-xs max-w-md">
              กรุณาใส่โค้ด HTML, iframe แผนที่ Google Maps หรือวิดเจ็ตจากระบบจัดการหน้าร้าน
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export default HtmlEmbedBlock;
