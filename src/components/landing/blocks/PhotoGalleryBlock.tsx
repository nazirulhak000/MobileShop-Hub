"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  ZoomIn,
  X,
  ChevronLeft,
  ChevronRight,
  Images,
  Maximize2,
} from "lucide-react";
import { StorefrontThemeColor, THEME_PALETTES } from "@/lib/storefrontTheme";
import { sanitizeUrl } from "@/lib/storefrontSecurity";
import { PhotoGalleryBlockProps, GalleryImageItem } from "./types";

const DEFAULT_GALLERY_IMAGES: GalleryImageItem[] = [
  {
    url: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=900&auto=format&fit=crop&q=80",
    caption: "เครื่องตรวจเช็คบอร์ดวงจรดิจิทัลมาตรฐานวิศวกรรม",
    alt: "การซ่อมบอร์ดไอโฟนด้วยกล้องไมโครสโคป",
  },
  {
    url: "https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=900&auto=format&fit=crop&q=80",
    caption: "ห้องแล็บซ่อมปลอดฝุ่น Cleanroom สำหรับเปลี่ยนกระจกหน้าจอ",
    alt: "ห้องแล็บซ่อมมือถือปลอดฝุ่น Cleanroom",
  },
  {
    url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=900&auto=format&fit=crop&q=80",
    caption: "คลังอะไหล่แท้ระดับศูนย์บริการ พร้อมรับประกันคุณภาพ",
    alt: "คลังอะไหล่แท้สมาร์ตโฟน",
  },
  {
    url: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=900&auto=format&fit=crop&q=80",
    caption: "โต๊ะช่างซ่อมระบบ ESD ป้องกันไฟฟ้าสถิตทำลายชิปเซ็ต",
    alt: "สถานีซ่อมบำรุงระบบป้องกันไฟฟ้าสถิต",
  },
  {
    url: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=900&auto=format&fit=crop&q=80",
    caption: "ทีมช่างผู้ชำนาญการผ่านการอบรมและรับรองมาตรฐาน",
    alt: "วิศวกรซ่อมมือถือ",
  },
  {
    url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=900&auto=format&fit=crop&q=80",
    caption: "ขั้นตอน QC ตรวจสอบ 20 ฟังก์ชันการทำงานก่อนส่งมอบ",
    alt: "การตรวจสอบคุณภาพก่อนส่งมอบเครื่อง",
  },
];

export function PhotoGalleryBlock({
  title,
  subtitle,
  columns = 3,
  images,
  themeColor = "emerald",
  className = "",
  data,
}: PhotoGalleryBlockProps) {
  const resolvedTitle = title || data?.title || "ภาพบรรยากาศร้านและผลงานซ่อม";
  const resolvedSubtitle =
    subtitle ||
    data?.subtitle ||
    "ชมผลงานการซ่อมจริง เครื่องมือมาตรฐานระดับสูง และบรรยากาศความพร้อมของศูนย์บริการ";
  const rawCol = Number(columns ?? data?.columns);
  const resolvedColumns: 2 | 3 | 4 = rawCol === 2 || rawCol === 4 ? rawCol : 3;

  const rawImages = images || data?.images;
  const imageList: GalleryImageItem[] = React.useMemo(() => {
    if (!rawImages || !Array.isArray(rawImages) || rawImages.length === 0) {
      return DEFAULT_GALLERY_IMAGES;
    }
    return rawImages
      .filter((item): item is string | GalleryImageItem => Boolean(item))
      .map((item, idx) => {
        const fallbackUrl = DEFAULT_GALLERY_IMAGES[idx % DEFAULT_GALLERY_IMAGES.length].url;
        if (typeof item === "string") {
          return {
            id: `img-${idx}`,
            url: sanitizeUrl(item, fallbackUrl),
            caption: `ภาพผลงานที่ ${idx + 1}`,
            alt: `ภาพผลงานที่ ${idx + 1}`,
          };
        }
        return {
          id: (item as any).id || `img-${idx}`,
          url: sanitizeUrl((item as any).url, fallbackUrl),
          caption: (item as any).caption || `ภาพผลงานที่ ${idx + 1}`,
          alt: (item as any).alt || (item as any).caption || `ภาพผลงานที่ ${idx + 1}`,
        };
      });
  }, [rawImages]);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const palette = THEME_PALETTES[themeColor] || THEME_PALETTES.emerald;

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  const showNext = useCallback(() => {
    setLightboxIndex((prev) =>
      prev === null ? null : (prev + 1) % imageList.length
    );
  }, [imageList.length]);

  const showPrev = useCallback(() => {
    setLightboxIndex((prev) =>
      prev === null ? null : (prev - 1 + imageList.length) % imageList.length
    );
  }, [imageList.length]);

  // Handle keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") showNext();
      if (e.key === "ArrowLeft") showPrev();
    };

    window.addEventListener("keydown", handleKeyDown);
    // Prevent body scroll when lightbox is open
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [lightboxIndex, closeLightbox, showNext, showPrev]);

  // Determine grid column classes
  const getColClasses = () => {
    switch (resolvedColumns) {
      case 2:
        return "grid-cols-1 sm:grid-cols-2";
      case 4:
        return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
      case 3:
      default:
        return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
    }
  };

  return (
    <section
      className={`w-full py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto ${className}`}
      aria-label="Photo Gallery"
    >
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12 space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold border backdrop-blur-md shadow-sm border-slate-700/80 bg-slate-900/80 text-white">
          <Images className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>แกลเลอรีภาพถ่าย</span>
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
          {resolvedTitle}
        </h2>
        {resolvedSubtitle && (
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            {resolvedSubtitle}
          </p>
        )}
      </div>

      {/* Image Grid */}
      <div className={`grid ${getColClasses()} gap-4 sm:gap-6`}>
        {imageList.map((img, index) => (
          <div
            key={img.id || index}
            role="button"
            tabIndex={0}
            onClick={() => setLightboxIndex(index)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setLightboxIndex(index);
              }
            }}
            className="group relative h-64 sm:h-72 rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/70 shadow-lg cursor-pointer transition-all duration-300 hover:border-slate-700 hover:shadow-2xl hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-label={`ดูรูปภาพขนาดเต็ม: ${img.caption || img.alt}`}
          >
            {/* Image */}
            <img
              src={img.url}
              alt={img.alt || img.caption || "ภาพผลงานซ่อม"}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
            />

            {/* Gradient Overlay & Caption */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-white text-sm font-medium line-clamp-2 drop-shadow-md">
                  {img.caption}
                </p>
                <div className="shrink-0 p-2 rounded-xl bg-slate-900/80 text-white border border-slate-700/60 shadow-md group-hover:bg-emerald-600 transition-colors">
                  <ZoomIn className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {lightboxIndex !== null && imageList[lightboxIndex] && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="ภาพถ่ายขนาดเต็ม"
          className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-8 animate-fade-in"
          onClick={closeLightbox}
        >
          {/* Top Bar with Counter and Close Button */}
          <div
            className="w-full max-w-6xl flex items-center justify-between z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-sm sm:text-base font-medium text-slate-300 bg-slate-900/80 px-4 py-2 rounded-full border border-slate-800">
              ภาพที่ {lightboxIndex + 1} จาก {imageList.length}
            </span>

            <button
              type="button"
              onClick={closeLightbox}
              className="min-w-[44px] min-h-[44px] p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 shadow-lg transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              aria-label="ปิดหน้าต่างรูปภาพ"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Central Image View with Navigation Buttons */}
          <div
            className="relative flex-1 w-full max-w-6xl flex items-center justify-center my-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Prev Button */}
            {imageList.length > 1 && (
              <button
                type="button"
                onClick={showPrev}
                className="absolute left-2 sm:left-4 z-20 min-w-[48px] min-h-[48px] p-3 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700/80 shadow-2xl transition-all hover:scale-110 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                aria-label="ดูภาพก่อนหน้า"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Current Large Image */}
            <div className="relative max-h-[75vh] max-w-full flex items-center justify-center">
              <img
                src={imageList[lightboxIndex].url}
                alt={
                  imageList[lightboxIndex].alt ||
                  imageList[lightboxIndex].caption ||
                  "ภาพขนาดเต็ม"
                }
                className="max-h-[75vh] max-w-full object-contain rounded-xl shadow-2xl border border-slate-800"
              />
            </div>

            {/* Next Button */}
            {imageList.length > 1 && (
              <button
                type="button"
                onClick={showNext}
                className="absolute right-2 sm:right-4 z-20 min-w-[48px] min-h-[48px] p-3 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700/80 shadow-2xl transition-all hover:scale-110 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                aria-label="ดูภาพถัดไป"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Bottom Caption Bar */}
          <div
            className="w-full max-w-3xl text-center z-10 bg-slate-900/80 px-6 py-3 rounded-2xl border border-slate-800 backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-white text-sm sm:text-base font-medium">
              {imageList[lightboxIndex].caption || imageList[lightboxIndex].alt}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

export default PhotoGalleryBlock;
