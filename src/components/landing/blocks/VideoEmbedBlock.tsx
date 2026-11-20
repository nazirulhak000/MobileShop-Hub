"use client";

import React, { useMemo } from "react";
import {
  Play,
  Film,
  ExternalLink,
  AlertCircle,
  Video,
} from "lucide-react";
import { StorefrontThemeColor, THEME_PALETTES } from "@/lib/storefrontTheme";
import { VideoEmbedBlockProps } from "./types";

/**
 * Extracts YouTube video ID from various YouTube URL formats:
 * - https://www.youtube.com/watch?v=dQw4w9WgXcQ
 * - https://youtu.be/dQw4w9WgXcQ
 * - https://www.youtube.com/embed/dQw4w9WgXcQ
 * - https://www.youtube.com/shorts/dQw4w9WgXcQ
 */
function extractYouTubeId(url: string): string | null {
  if (!url || typeof url !== "string") return null;
  const regExp =
    /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/;
  const match = url.trim().match(regExp);
  return match && match[1].length === 11 ? match[1] : null;
}

/**
 * Checks if a URL is an MP4 or web video file
 */
function isDirectVideoUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const cleanUrl = url.split("?")[0].toLowerCase();
  return (
    cleanUrl.endsWith(".mp4") ||
    cleanUrl.endsWith(".webm") ||
    cleanUrl.endsWith(".ogg") ||
    cleanUrl.endsWith(".mov")
  );
}

/**
 * Checks if a URL is a TikTok URL
 */
function isTikTokUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  return url.includes("tiktok.com");
}

export function VideoEmbedBlock({
  title,
  description,
  videoUrl,
  platform,
  videoType,
  aspectRatio = "16:9",
  themeColor = "emerald",
  className = "",
  data,
}: VideoEmbedBlockProps) {
  const resolvedTitle =
    title || data?.title || "ชมขั้นตอนการซ่อมจริงด้วยเครื่องมือมาตรฐานศูนย์";
  const resolvedDescription =
    description ||
    data?.description ||
    "วิดีโอสาธิตการทำงานของทีมช่าง ตั้งแต่การตรวจเช็คอาการ เปลี่ยนอะไหล่แท้ จนถึงขั้นตอน QC ทดสอบก่อนส่งมอบ";
  const rawUrl =
    typeof videoUrl === "string"
      ? videoUrl
      : typeof data?.videoUrl === "string"
      ? data.videoUrl
      : typeof data?.url === "string"
      ? data.url
      : "";
  const resolvedUrl = rawUrl.trim() || "https://www.youtube.com/watch?v=dQw4w9WgXcQ"; // Fallback demo
  const resolvedPlatform = platform || videoType || data?.platform || data?.videoType || "auto";

  const palette = THEME_PALETTES[themeColor] || THEME_PALETTES.emerald;

  // Detect platform & embed source
  const videoDetails = useMemo(() => {
    if (!resolvedUrl) return { type: "empty" };

    if (
      resolvedPlatform === "youtube" ||
      (resolvedPlatform === "auto" &&
        (resolvedUrl.includes("youtube.com") || resolvedUrl.includes("youtu.be")))
    ) {
      const ytId = extractYouTubeId(resolvedUrl);
      if (ytId) {
        return {
          type: "youtube",
          embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}?rel=0&modestbranding=1`,
          id: ytId,
        };
      }
    }

    if (
      resolvedPlatform === "tiktok" ||
      (resolvedPlatform === "auto" && isTikTokUrl(resolvedUrl))
    ) {
      // For TikTok, parse video id or render standard embed
      const match = resolvedUrl.match(/video\/(\d+)/);
      const videoId = match ? match[1] : "";
      return {
        type: "tiktok",
        embedUrl: videoId
          ? `https://www.tiktok.com/embed/v2/${videoId}`
          : resolvedUrl,
        originalUrl: resolvedUrl,
      };
    }

    if (
      resolvedPlatform === "mp4" ||
      (resolvedPlatform === "auto" && isDirectVideoUrl(resolvedUrl))
    ) {
      return {
        type: "mp4",
        url: resolvedUrl,
      };
    }

    // Default if URL has embed format or iframe-friendly URL
    if (resolvedUrl.startsWith("http://") || resolvedUrl.startsWith("https://")) {
      return {
        type: "generic-embed",
        embedUrl: resolvedUrl,
      };
    }

    return { type: "invalid" };
  }, [resolvedUrl, resolvedPlatform]);

  const aspectClass =
    aspectRatio === "4:3"
      ? "aspect-[4/3]"
      : aspectRatio === "1:1"
      ? "aspect-square"
      : "aspect-video";

  return (
    <section
      className={`w-full py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto ${className}`}
      aria-label="Video Presentation"
    >
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10 space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold border backdrop-blur-md shadow-sm border-slate-700/80 bg-slate-900/80 text-white">
          <Film className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>วิดีโอสาธิตการบริการ</span>
        </div>

        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
          {resolvedTitle}
        </h2>

        {resolvedDescription && (
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            {resolvedDescription}
          </p>
        )}
      </div>

      {/* Video Container Frame */}
      <div className="relative mx-auto rounded-3xl p-1 sm:p-2 bg-gradient-to-b from-slate-700/40 via-slate-800/20 to-slate-900/60 shadow-2xl border border-slate-800">
        <div
          className={`relative w-full ${aspectClass} rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center`}
        >
          {videoDetails.type === "youtube" && (
            <iframe
              src={videoDetails.embedUrl}
              title={resolvedTitle}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full border-0 rounded-2xl"
              loading="lazy"
            />
          )}

          {videoDetails.type === "tiktok" && (
            <iframe
              src={videoDetails.embedUrl}
              title={resolvedTitle}
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
              className="w-full h-full border-0 rounded-2xl"
              loading="lazy"
            />
          )}

          {videoDetails.type === "mp4" && (
            <video
              src={videoDetails.url}
              controls
              playsInline
              preload="metadata"
              className="w-full h-full object-cover rounded-2xl"
            >
              เบราว์เซอร์ของคุณไม่รองรับการเล่นวิดีโอ HTML5
            </video>
          )}

          {videoDetails.type === "generic-embed" && (
            <iframe
              src={videoDetails.embedUrl}
              title={resolvedTitle}
              allowFullScreen
              sandbox="allow-scripts allow-popups allow-forms"
              className="w-full h-full border-0 rounded-2xl"
              loading="lazy"
            />
          )}

          {videoDetails.type === "invalid" && (
            <div className="p-8 text-center space-y-3">
              <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
              <p className="text-slate-200 font-semibold">
                ไม่พบรูปแบบวิดีโอที่ถูกต้อง
              </p>
              <p className="text-slate-400 text-sm max-w-md mx-auto">
                รองรับลิงก์ YouTube (watch, shorts, youtu.be), TikTok หรือไฟล์วิดีโอ .mp4
              </p>
              <p className="text-xs text-slate-500 font-mono break-all">
                {resolvedUrl}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default VideoEmbedBlock;
