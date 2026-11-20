"use client";

import React from "react";
import {
  BookOpen,
  Award,
  ShieldCheck,
  CheckCircle2,
  FileText,
  UserCheck,
} from "lucide-react";
import { StorefrontThemeColor, THEME_PALETTES } from "@/lib/storefrontTheme";
import { RichTextBlockProps } from "./types";

/**
 * Lightweight, safe parser for markdown-like text to formatted HTML elements
 */
function renderMarkdownContent(content: string, themeColor: StorefrontThemeColor) {
  if (!content) return null;

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inList = false;
  let listItems: React.ReactNode[] = [];

  const flushList = () => {
    if (inList && listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="space-y-2 my-4 pl-2">
          {listItems}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  const parseInlineStyles = (text: string): React.ReactNode => {
    // Basic bold and italic parsing
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-bold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return (
          <em key={i} className="italic text-slate-200">
            {part.slice(1, -1)}
          </em>
        );
      }
      return part;
    });
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Horizontal Rule
    if (trimmed === "---" || trimmed === "***") {
      flushList();
      elements.push(
        <hr
          key={`hr-${index}`}
          className="my-8 border-slate-800"
        />
      );
      return;
    }

    // Headings
    if (trimmed.startsWith("### ")) {
      flushList();
      elements.push(
        <h3
          key={`h3-${index}`}
          className="text-xl sm:text-2xl font-bold text-white mt-6 mb-3 tracking-tight"
        >
          {parseInlineStyles(trimmed.slice(4))}
        </h3>
      );
      return;
    }

    if (trimmed.startsWith("## ")) {
      flushList();
      elements.push(
        <h2
          key={`h2-${index}`}
          className="text-2xl sm:text-3xl font-extrabold text-white mt-8 mb-4 tracking-tight"
        >
          {parseInlineStyles(trimmed.slice(3))}
        </h2>
      );
      return;
    }

    if (trimmed.startsWith("# ")) {
      flushList();
      elements.push(
        <h1
          key={`h1-${index}`}
          className="text-3xl sm:text-4xl font-black text-white mt-8 mb-4 tracking-tight"
        >
          {parseInlineStyles(trimmed.slice(2))}
        </h1>
      );
      return;
    }

    // Blockquote
    if (trimmed.startsWith("> ")) {
      flushList();
      elements.push(
        <blockquote
          key={`quote-${index}`}
          className="my-4 pl-4 py-2 border-l-4 border-emerald-500 bg-slate-900/60 rounded-r-xl italic text-slate-300"
        >
          {parseInlineStyles(trimmed.slice(2))}
        </blockquote>
      );
      return;
    }

    // Unordered List Items
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      inList = true;
      listItems.push(
        <li
          key={`li-${index}`}
          className="flex items-start gap-2.5 text-slate-300 text-sm sm:text-base leading-relaxed"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
          <span>{parseInlineStyles(trimmed.slice(2))}</span>
        </li>
      );
      return;
    }

    // Empty lines
    if (trimmed === "") {
      flushList();
      return;
    }

    // Regular Paragraph
    flushList();
    elements.push(
      <p
        key={`p-${index}`}
        className="text-slate-300 text-sm sm:text-base md:text-lg leading-relaxed mb-4"
      >
        {parseInlineStyles(trimmed)}
      </p>
    );
  });

  flushList();
  return elements;
}

const DEFAULT_RICH_TEXT = `## ความเป็นมาและปณิธานของเรา
เราเริ่มต้นจากการเป็นศูนย์ซ่อมอิเล็กทรอนิกส์ขนาดเล็กด้วยความมุ่งมั่นที่จะให้บริการซ่อมแซมสมาร์ตโฟนด้วยความซื่อสัตย์ ใช้อะไหล่คุณภาพมาตรฐานสูง และมีราคาที่สมเหตุสมผลสำหรับทุกคน

### มาตรฐานการตรวจซ่อมและเครื่องมือ
- **การวินิจฉัยเชิงลึกด้วยกล้องจุลทรรศน์และเครื่องวัดกระแสไฟ:** ตรวจสอบแม่นยำตรงจุด ไม่เปลี่ยนอะไหล่เกินความจำเป็น
- **ห้องประกอบปลอดฝุ่น (Clean Bench):** รักษาความสะอาด 100% สำหรับงานเปลี่ยนหน้าจอ ป้องกันฝุ่นละอองและคราบสกปรก
- **อะไหล่มาตรฐานแท้ OEM & Premium Grade:** มั่นใจในสีสันความคมชัดของจอภาพ และความจุแบตเตอรี่เต็มประสิทธิภาพ
- **รับประกันคุณภาพงานซ่อม:** อุ่นใจสูงสุดด้วยการรับประกันนาน 90 วันเต็ม พร้อมบริการดูแลหลังการขาย

> "เรามุ่งมั่นให้บริการประดุจเครื่องของคนในครอบครัว ด้วยช่างผู้ชำนาญการและอุปกรณ์มาตรฐานสากล"`;

export function RichTextBlock({
  title,
  subtitle,
  content,
  author,
  authorRole,
  authorAvatar,
  badge,
  align = "left",
  themeColor = "emerald",
  className = "",
  data,
}: RichTextBlockProps) {
  const resolvedTitle = title || data?.title;
  const resolvedSubtitle = subtitle || data?.subtitle;
  const resolvedContent = content || data?.content || DEFAULT_RICH_TEXT;
  const resolvedAuthor = author || data?.author;
  const resolvedAuthorRole = authorRole || data?.authorRole;
  const resolvedAuthorAvatar = authorAvatar || data?.authorAvatar;
  const resolvedBadge = badge || data?.badge || "มาตรฐานและการรับรอง";
  const resolvedAlign = align || data?.align || "left";

  const palette = THEME_PALETTES[themeColor] || THEME_PALETTES.emerald;

  return (
    <section
      className={`w-full py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto ${className}`}
      aria-label="Article & Credentials"
    >
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-10 md:p-12 shadow-xl backdrop-blur-sm">
        {/* Header (optional if provided) */}
        {(resolvedBadge || resolvedTitle || resolvedSubtitle) && (
          <div
            className={`mb-8 space-y-3 ${
              resolvedAlign === "center" ? "text-center" : "text-left"
            }`}
          >
            {resolvedBadge && (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold border backdrop-blur-md shadow-sm border-slate-700/80 bg-slate-900/80 text-white">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{resolvedBadge}</span>
              </div>
            )}

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

            <hr className="border-slate-800 my-6" />
          </div>
        )}

        {/* Content Body */}
        <div className="prose prose-invert max-w-none">
          {renderMarkdownContent(resolvedContent, themeColor)}
        </div>

        {/* Author / Technician Card (if provided) */}
        {(resolvedAuthor || resolvedAuthorRole) && (
          <div className="mt-10 pt-6 border-t border-slate-800 flex items-center gap-4">
            {resolvedAuthorAvatar ? (
              <img
                src={resolvedAuthorAvatar}
                alt={resolvedAuthor || "ผู้เขียน"}
                className="w-14 h-14 rounded-full object-cover border-2 border-emerald-500 shadow-md"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
                <UserCheck className="w-7 h-7 text-emerald-400" />
              </div>
            )}

            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-base sm:text-lg">
                  {resolvedAuthor || "หัวหน้าทีมช่างเทคนิค"}
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              </div>
              {resolvedAuthorRole && (
                <p className="text-xs sm:text-sm text-slate-400">
                  {resolvedAuthorRole}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default RichTextBlock;
