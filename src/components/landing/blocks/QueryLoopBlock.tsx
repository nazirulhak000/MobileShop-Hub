"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  FileText,
  Sparkles,
  ChevronRight,
  Calendar,
  Layers,
  Wrench,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { StorefrontThemeColor, THEME_PALETTES } from "@/lib/storefrontTheme";
import { wp_query_pages } from "@/lib/wordpress/queryLoopEngine";
import { QueryLoopBlockProps } from "./types";

const SAMPLE_QUERY_PAGES = [
  {
    id: "sample-screen",
    slug: "screen-replacement",
    title: "บริการเปลี่ยนกระจกจอแท้ศูนย์",
    subtitle: "ซ่อมเฉพาะกระจกหน้าจอชั้นนอกด้วยระบบ OCA มาตรฐานแล็บ ปลอดฝุ่น คมชัดเหมือนเดิม 100%",
    categories: ["บริการซ่อม", "หน้าจอ"],
    tags: ["จอแท้", "OCA", "แล็บปลอดฝุ่น"],
    published: true,
  },
  {
    id: "sample-battery",
    slug: "battery-replacement",
    title: "เปลี่ยนแบตเตอรี่มาตรฐาน มอก.",
    subtitle: "แบตเตอรี่ความจุเต็ม 100% สุขภาพแบตขึ้นปกติ ไม่ฟ้องแจ้งเตือน พร้อมรับประกันยาวนาน 1 ปี",
    categories: ["บริการซ่อม", "แบตเตอรี่"],
    tags: ["แบตแท้", "รับประกัน1ปี", "มอก"],
    published: true,
  },
  {
    id: "sample-motherboard",
    slug: "motherboard-repair",
    title: "ซ่อมเมนบอร์ดและเปลี่ยนชิปเซ็ต IC",
    subtitle: "แก้ปัญหาเปิดไม่ติด ชาร์จไม่เข้า เครื่องรีสตาร์ทเอง ด้วยกล้องไมโครสโคปและเครื่องวัด ESD Safe",
    categories: ["บริการซ่อม", "เมนบอร์ด"],
    tags: ["ชิปIC", "เปิดไม่ติด", "งานด่วน"],
    published: true,
  },
  {
    id: "sample-warranty",
    slug: "warranty-terms",
    title: "เงื่อนไขการรับประกันงานซ่อม 90-365 วัน",
    subtitle: "รายละเอียดขอบเขตการรับประกันอะไหล่แท้ และนโยบายดูแลหลังการขายเพื่อความสบายใจสูงสุด",
    categories: ["นโยบาย", "การรับประกัน"],
    tags: ["รับประกัน", "ศูนย์บริการ"],
    published: true,
  },
];

export function QueryLoopBlock({
  id = "query-loop",
  title = "บริการและบทความแนะนำ",
  subtitle = "ค้นพบบทความ คู่มือการดูแลรักษา และบริการซ่อมยอดนิยมจากศูนย์บริการ",
  category,
  tag,
  perPage = 6,
  columns = 3,
  layout = "grid",
  showExcerpt = true,
  themeColor = "emerald",
  className = "",
  shopSlug = "",
  customPages = [],
  data,
}: QueryLoopBlockProps) {
  const resolvedTitle = title || data?.title || "บริการและบทความแนะนำ";
  const resolvedSubtitle = subtitle || data?.subtitle;
  const resolvedCat = category || data?.category;
  const resolvedTag = tag || data?.tag;
  const resolvedPerPage = Number(perPage || data?.perPage || 6);
  const resolvedCol = Number(columns || data?.columns || 3);
  const safeCols = resolvedCol === 2 || resolvedCol === 4 ? resolvedCol : 3;

  const palette = THEME_PALETTES[themeColor] || THEME_PALETTES.emerald;

  // Execute WP_Query logic
  const queryResult = useMemo(() => {
    const sourcePages =
      Array.isArray(customPages) && customPages.length > 0
        ? customPages
        : SAMPLE_QUERY_PAGES;

    return wp_query_pages(sourcePages, {
      category: resolvedCat,
      tag: resolvedTag,
      perPage: resolvedPerPage,
      status: "publish",
      orderBy: "menu_order",
    });
  }, [customPages, resolvedCat, resolvedTag, resolvedPerPage]);

  const colClass =
    safeCols === 2
      ? "grid-cols-1 md:grid-cols-2"
      : safeCols === 4
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";

  return (
    <section
      id={id}
      aria-label="รายการหน้าและบริการแนะนำ (WordPress Query Loop)"
      className={`w-full py-10 sm:py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden ${className}`}
    >
      {/* Block Header */}
      <div className="text-center space-y-3 mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 shadow-xs">
          <Layers className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Dynamic Query Loop</span>
        </div>

        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight break-words">
          {resolvedTitle}
        </h2>

        {resolvedSubtitle && (
          <p className="text-xs sm:text-sm md:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed break-words">
            {resolvedSubtitle}
          </p>
        )}
      </div>

      {/* Query Loop Output Grid */}
      {queryResult.items.length === 0 ? (
        <div className="p-8 text-center bg-slate-900/60 rounded-3xl border border-dashed border-slate-800">
          <FileText className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          <p className="text-xs sm:text-sm text-slate-400">ไม่พบบทความหรือบริการที่ตรงตามเงื่อนไข</p>
        </div>
      ) : (
        <div className={`grid ${colClass} gap-6`}>
          {queryResult.items.map((page, idx) => {
            const pageHref = shopSlug
              ? `/store/${shopSlug}/${page.slug}`
              : `#${page.slug}`;

            return (
              <div
                key={page.id || page.slug || idx}
                className="group relative bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-3xl p-6 shadow-xl transition-all duration-300 flex flex-col justify-between hover:scale-[1.02]"
              >
                <div className="space-y-4">
                  {/* Category Pills & Icon */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {Array.isArray(page.categories) && page.categories.length > 0 ? (
                        page.categories.slice(0, 2).map((cat) => (
                          <span
                            key={cat}
                            className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-950 text-slate-300 border border-slate-800"
                          >
                            {cat}
                          </span>
                        ))
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-950 text-slate-400 border border-slate-800">
                          ทั่วไป
                        </span>
                      )}
                    </div>

                    <div className="p-2 rounded-xl bg-slate-950 text-slate-400 group-hover:text-emerald-400 border border-slate-800 transition-colors">
                      <Wrench className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-2 leading-snug">
                    {page.title}
                  </h3>

                  {/* Subtitle / Excerpt */}
                  {showExcerpt && page.subtitle && (
                    <p className="text-xs sm:text-sm text-slate-300 line-clamp-3 leading-relaxed">
                      {page.subtitle}
                    </p>
                  )}

                  {/* Tags */}
                  {Array.isArray(page.tags) && page.tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 pt-1">
                      {page.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] font-mono text-slate-400 bg-slate-950/60 px-2 py-0.5 rounded-md"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Link */}
                <div className="pt-6 mt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 group-hover:text-white transition-colors">
                    ดูรายละเอียด
                  </span>
                  <div className="p-2 rounded-xl bg-slate-950 group-hover:bg-emerald-600 text-slate-400 group-hover:text-white transition-all shadow-md">
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>

                {/* Clickable Overlay Link */}
                <Link
                  href={pageHref}
                  className="absolute inset-0 z-10 rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                  aria-label={`ไปยังหน้า ${page.title}`}
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default QueryLoopBlock;
