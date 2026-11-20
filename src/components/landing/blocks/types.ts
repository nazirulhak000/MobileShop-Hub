import {
  StorefrontThemeColor,
  CustomBlock as StorefrontCustomBlock,
  CustomBlockType as StorefrontCustomBlockType,
} from "@/lib/storefrontTheme";

export type CustomBlock = StorefrontCustomBlock;
export type CustomBlockType = StorefrontCustomBlockType;

export interface PromoBannerBlockProps {
  id?: string;
  title?: string;
  subtitle?: string;
  badge?: string;
  buttonText?: string;
  buttonUrl?: string;
  bgType?: "gradient" | "image" | "solid";
  bgImageUrl?: string;
  imageUrl?: string;
  discountTag?: string;
  expiryNotice?: string;
  themeColor?: StorefrontThemeColor;
  className?: string;
  data?: Record<string, any>;
}

export interface GalleryImageItem {
  id?: string;
  url: string;
  caption?: string;
  alt?: string;
}

export interface PhotoGalleryBlockProps {
  id?: string;
  title?: string;
  subtitle?: string;
  columns?: 2 | 3 | 4 | number;
  images?: (GalleryImageItem | string | { url: string; caption?: string })[];
  themeColor?: StorefrontThemeColor;
  className?: string;
  data?: Record<string, any>;
}

export interface VideoEmbedBlockProps {
  id?: string;
  title?: string;
  description?: string;
  videoUrl?: string;
  platform?: "youtube" | "tiktok" | "mp4" | "auto" | string;
  videoType?: string;
  aspectRatio?: "16:9" | "4:3" | "1:1";
  themeColor?: StorefrontThemeColor;
  className?: string;
  data?: Record<string, any>;
}

export interface RichTextBlockProps {
  id?: string;
  title?: string;
  subtitle?: string;
  content?: string;
  author?: string;
  authorRole?: string;
  authorAvatar?: string;
  badge?: string;
  align?: "left" | "center" | "right";
  themeColor?: StorefrontThemeColor;
  className?: string;
  data?: Record<string, any>;
  shopSlug?: string;
  tenantInfo?: {
    phone?: string | null;
    lineId?: string | null;
    shopName?: string | null;
    branchName?: string | null;
    shopSlug?: string | null;
  };
}

export interface CtaBlockProps {
  id?: string;
  title?: string;
  subtitle?: string;
  badge?: string;
  lineId?: string;
  lineUrl?: string;
  phone?: string;
  primaryAction?: "line" | "phone" | "custom";
  customButtonText?: string;
  customButtonUrl?: string;
  secondaryButtonText?: string;
  secondaryButtonUrl?: string;
  benefits?: string[];
  themeColor?: StorefrontThemeColor;
  className?: string;
  data?: Record<string, any>;
}

export interface HtmlEmbedBlockProps {
  id?: string;
  title?: string;
  subtitle?: string;
  html?: string;
  embedType?: "custom" | "map" | "widget";
  height?: number | string;
  themeColor?: StorefrontThemeColor;
  className?: string;
  data?: Record<string, any>;
}

export interface BusinessDaySchedule {
  day: string;
  openTime?: string;
  closeTime?: string;
  hoursText?: string;
  isClosed?: boolean;
}

export interface BusinessHoursBlockProps {
  id?: string;
  title?: string;
  subtitle?: string;
  schedule?: (BusinessDaySchedule | { day: string; open?: string; close?: string; isClosed?: boolean })[];
  hours?: Array<{ day: string; open: string; close: string; isClosed?: boolean }>;
  emergencyNote?: string;
  showLiveStatus?: boolean;
  phone?: string;
  lineId?: string;
  themeColor?: StorefrontThemeColor;
  className?: string;
  data?: Record<string, any>;
}

export interface ContactFormBlockProps {
  id?: string;
  title?: string;
  subtitle?: string;
  badge?: string;
  successMessage?: string;
  buttonText?: string;
  branches?: string[];
  themeColor?: StorefrontThemeColor;
  className?: string;
  data?: Record<string, any>;
  onSubmitSuccess?: (data: any) => void;
}

export interface QueryLoopBlockProps {
  id?: string;
  title?: string;
  subtitle?: string;
  category?: string;
  tag?: string;
  perPage?: number;
  columns?: 2 | 3 | 4 | number;
  layout?: "grid" | "list";
  showExcerpt?: boolean;
  themeColor?: StorefrontThemeColor;
  className?: string;
  shopSlug?: string;
  customPages?: any[];
  data?: Record<string, any>;
}

export interface DynamicBlockRendererProps {
  block: CustomBlock;
  themeColor?: StorefrontThemeColor;
  className?: string;
  shopSlug?: string;
  tenantInfo?: {
    phone?: string | null;
    lineId?: string | null;
    shopName?: string | null;
    branchName?: string | null;
    shopSlug?: string | null;
  };
}
