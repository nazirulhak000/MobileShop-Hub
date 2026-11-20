"use client";

import React from "react";
import { StorefrontThemeColor } from "@/lib/storefrontTheme";
import { sanitizeCssClass } from "@/lib/storefrontSecurity";
import { CustomBlock, DynamicBlockRendererProps } from "./types";
import { PromoBannerBlock } from "./PromoBannerBlock";
import { PhotoGalleryBlock } from "./PhotoGalleryBlock";
import { VideoEmbedBlock } from "./VideoEmbedBlock";
import { RichTextBlock } from "./RichTextBlock";
import { CtaBlock } from "./CtaBlock";
import { HtmlEmbedBlock } from "./HtmlEmbedBlock";
import { BusinessHoursBlock } from "./BusinessHoursBlock";

/**
 * Normalizes block type string to a standard discriminator
 */
function normalizeBlockType(typeStr: string | undefined): string {
  if (!typeStr) return "";
  const cleaned = typeStr.toLowerCase().replace(/[-_]/g, "");
  if (cleaned.includes("promo")) return "promo-banner";
  if (cleaned.includes("gallery") || cleaned.includes("photo")) return "photo-gallery";
  if (cleaned.includes("video")) return "video-embed";
  if (cleaned.includes("rich") || cleaned.includes("article") || cleaned === "text")
    return "rich-text";
  if (cleaned.includes("cta")) return "cta";
  if (cleaned.includes("html") || cleaned.includes("widget") || cleaned.includes("embed") || cleaned.includes("map"))
    return "html-embed";
  if (cleaned.includes("hour") || cleaned.includes("schedule") || cleaned.includes("time"))
    return "business-hours";
  return cleaned;
}

export function DynamicBlockRenderer({
  block,
  themeColor = "emerald",
  className = "",
  tenantInfo,
}: DynamicBlockRendererProps) {
  // If block is undefined or null, fail safely
  if (!block || typeof block !== "object") {
    return null;
  }

  // If block is explicitly marked hidden or disabled, do not render
  if (block.visible === false || block.enabled === false) {
    return null;
  }

  // Combine top-level fields with metadata or data
  const mergedData = {
    ...(block.metadata || {}),
    ...(block.data || {}),
    ...block,
  };

  const safeCustomClass = sanitizeCssClass(mergedData.customCssClass);
  const safeMergedClass = sanitizeCssClass(mergedData.className);
  const blockClassName = [className, safeCustomClass, safeMergedClass]
    .filter(Boolean)
    .join(" ");

  const normalizedType = normalizeBlockType(block.type);

  try {
    switch (normalizedType) {
      case "promo-banner":
        return (
          <PromoBannerBlock
            id={block.id}
            title={mergedData.title}
            subtitle={mergedData.subtitle}
            badge={mergedData.badge}
            buttonText={mergedData.buttonText}
            buttonUrl={mergedData.buttonUrl}
            bgType={mergedData.bgType}
            bgImageUrl={mergedData.bgImageUrl || mergedData.imageUrl}
            imageUrl={mergedData.imageUrl}
            discountTag={mergedData.discountTag}
            expiryNotice={mergedData.expiryNotice}
            themeColor={themeColor}
            className={blockClassName}
            data={block.data || block.metadata}
          />
        );

      case "photo-gallery":
        return (
          <PhotoGalleryBlock
            id={block.id}
            title={mergedData.title}
            subtitle={mergedData.subtitle}
            columns={mergedData.columns}
            images={mergedData.images}
            themeColor={themeColor}
            className={blockClassName}
            data={block.data || block.metadata}
          />
        );

      case "video-embed":
        return (
          <VideoEmbedBlock
            id={block.id}
            title={mergedData.title}
            description={mergedData.description}
            videoUrl={mergedData.videoUrl || mergedData.url}
            platform={mergedData.platform || mergedData.videoType}
            videoType={mergedData.videoType}
            aspectRatio={mergedData.aspectRatio}
            themeColor={themeColor}
            className={blockClassName}
            data={block.data || block.metadata}
          />
        );

      case "rich-text":
        return (
          <RichTextBlock
            id={block.id}
            title={mergedData.title}
            subtitle={mergedData.subtitle}
            content={mergedData.content}
            author={mergedData.author}
            authorRole={mergedData.authorRole}
            authorAvatar={mergedData.authorAvatar}
            badge={mergedData.badge}
            align={mergedData.align}
            themeColor={themeColor}
            className={blockClassName}
            data={block.data || block.metadata}
          />
        );

      case "cta":
        return (
          <CtaBlock
            id={block.id}
            title={mergedData.title}
            subtitle={mergedData.subtitle}
            badge={mergedData.badge}
            lineId={mergedData.lineId || tenantInfo?.lineId || undefined}
            lineUrl={mergedData.lineUrl}
            phone={mergedData.phone || tenantInfo?.phone || undefined}
            primaryAction={mergedData.primaryAction}
            customButtonText={mergedData.customButtonText}
            customButtonUrl={mergedData.customButtonUrl}
            secondaryButtonText={mergedData.secondaryButtonText}
            secondaryButtonUrl={mergedData.secondaryButtonUrl}
            benefits={mergedData.benefits}
            themeColor={themeColor}
            className={blockClassName}
            data={block.data || block.metadata}
          />
        );

      case "html-embed":
        return (
          <HtmlEmbedBlock
            id={block.id}
            title={mergedData.title}
            subtitle={mergedData.subtitle}
            html={mergedData.html || mergedData.code}
            embedType={mergedData.embedType}
            height={mergedData.height}
            themeColor={themeColor}
            className={blockClassName}
            data={block.data || block.metadata}
          />
        );

      case "business-hours": {
        // Map hours array [{day, open, close, isClosed}] to schedule format if needed
        const rawSchedule = mergedData.schedule || mergedData.hours;
        const normalizedSchedule = Array.isArray(rawSchedule)
          ? rawSchedule.map((item: any) => ({
              day: item.day,
              openTime: item.openTime || item.open,
              closeTime: item.closeTime || item.close,
              hoursText:
                item.hoursText ||
                (item.open && item.close ? `${item.open} - ${item.close} น.` : undefined),
              isClosed: Boolean(item.isClosed),
            }))
          : undefined;

        return (
          <BusinessHoursBlock
            id={block.id}
            title={mergedData.title}
            subtitle={mergedData.subtitle}
            schedule={normalizedSchedule}
            hours={mergedData.hours}
            emergencyNote={mergedData.emergencyNote}
            showLiveStatus={mergedData.showLiveStatus}
            phone={mergedData.phone || tenantInfo?.phone || undefined}
            lineId={mergedData.lineId || tenantInfo?.lineId || undefined}
            themeColor={themeColor}
            className={blockClassName}
            data={block.data || block.metadata}
          />
        );
      }

      default:
        if (process.env.NODE_ENV === "development") {
          console.warn(`[DynamicBlockRenderer] Unrecognized block type: "${block.type}"`, block);
        }
        return null;
    }
  } catch (err) {
    console.error(`[DynamicBlockRenderer] Error rendering block ${block?.id}:`, err);
    return null;
  }
}

export default DynamicBlockRenderer;
