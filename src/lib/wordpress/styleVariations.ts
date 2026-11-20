/**
 * WordPress Global Style Variations & Colorways Engine - Round 43
 *
 * Reverse-engineers WordPress 6.x Block Theme Global Style Variations:
 * Bundles color palettes, font pairings, border-radius scales, and aesthetic tokens
 * into 1-click selectable variations for instant storefront redesign.
 */

import {
  StorefrontThemeColor,
  StorefrontFontFamily,
  StorefrontConfigData,
} from "../storefrontTheme";

export type BorderRadiusScale = "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "full";
export type BackgroundTone = "dark" | "light" | "neutral" | "vibrant";

export interface StyleVariation {
  id: string;
  name: string;
  title: string;
  description: string;
  colorPalette: StorefrontThemeColor;
  fontFamily: StorefrontFontFamily;
  borderRadius: BorderRadiusScale;
  backgroundTone: BackgroundTone;
  previewColors: {
    primary: string;
    secondary: string;
    surface: string;
    text: string;
  };
  customCssVariables?: Record<string, string>;
}

// 5 Curated 1-Click Style Variations
export const STYLE_VARIATIONS: StyleVariation[] = [
  {
    id: "midnight-pro",
    name: "midnight-pro",
    title: "Midnight Pro (มือโปรทันสมัย)",
    description: "ธีมดาร์กโหมดโทนลึก ดำสนิท ผสานสีมรกตสดใส เหมาะกับศูนย์ซ่อมมาตรฐานระดับสูง",
    colorPalette: "emerald",
    fontFamily: "kanit",
    borderRadius: "2xl",
    backgroundTone: "dark",
    previewColors: {
      primary: "#059669",
      secondary: "#10b981",
      surface: "#020617",
      text: "#f8fafc",
    },
    customCssVariables: {
      "--fixme-card-radius": "1rem",
      "--fixme-header-blur": "16px",
    },
  },
  {
    id: "minimalist-clean",
    name: "minimalist-clean",
    title: "Minimalist Clean (มินิมอลสบายตา)",
    description: "ธีมสีขาวสะอาดตา ตัดกับตัวอักษรสีเข้ม ให้ความรู้สึกเรียบหรูและน่าเชื่อถือ",
    colorPalette: "blue",
    fontFamily: "prompt",
    borderRadius: "lg",
    backgroundTone: "light",
    previewColors: {
      primary: "#2563eb",
      secondary: "#3b82f6",
      surface: "#ffffff",
      text: "#0f172a",
    },
    customCssVariables: {
      "--fixme-card-radius": "0.75rem",
      "--fixme-header-blur": "8px",
    },
  },
  {
    id: "cyber-neon",
    name: "cyber-neon",
    title: "Cyber Neon (ไซเบอร์เทคโนโลยี)",
    description: "ธีมล้ำสมัยสไตล์ Cyberpunk สีฟ้าไซยานีออน สื่อถึงเครื่องมือวัดและฮาร์ดแวร์ไฮเทค",
    colorPalette: "cyan",
    fontFamily: "mitr",
    borderRadius: "xl",
    backgroundTone: "vibrant",
    previewColors: {
      primary: "#0891b2",
      secondary: "#06b6d4",
      surface: "#080c14",
      text: "#ecfeff",
    },
    customCssVariables: {
      "--fixme-card-radius": "0.875rem",
      "--fixme-header-blur": "20px",
    },
  },
  {
    id: "warm-amber",
    name: "warm-amber",
    title: "Warm Amber (คลาสสิกอบอุ่น)",
    description: "ธีมสีอำพันทองประกายอบอุ่น ให้ความรู้สึกเป็นมิตร พร้อมการดูแลแบบพรีเมียม",
    colorPalette: "amber",
    fontFamily: "anuphan",
    borderRadius: "3xl",
    backgroundTone: "neutral",
    previewColors: {
      primary: "#b45309",
      secondary: "#d97706",
      surface: "#0f172a",
      text: "#fffbeb",
    },
    customCssVariables: {
      "--fixme-card-radius": "1.5rem",
      "--fixme-header-blur": "12px",
    },
  },
  {
    id: "pastel-modern",
    name: "pastel-modern",
    title: "Pastel Modern (โมเดิร์นสดใส)",
    description: "ธีมสีม่วงพาสเทลอ่อนโยน มุมโค้งมนพิเศษ ให้ความรู้สึกเป็นกันเอง เข้าถึงง่าย",
    colorPalette: "purple",
    fontFamily: "sarabun",
    borderRadius: "full",
    backgroundTone: "light",
    previewColors: {
      primary: "#9333ea",
      secondary: "#a855f7",
      surface: "#faf5ff",
      text: "#1e1b4b",
    },
    customCssVariables: {
      "--fixme-card-radius": "9999px",
      "--fixme-header-blur": "10px",
    },
  },
];

/**
 * Returns all available global style variations
 */
export function getStyleVariations(): StyleVariation[] {
  return [...STYLE_VARIATIONS];
}

/**
 * Retrieves a style variation by ID
 */
export function getStyleVariationById(id: string): StyleVariation | undefined {
  if (!id || typeof id !== "string") return undefined;
  const cleanId = id.trim().toLowerCase();
  return STYLE_VARIATIONS.find((v) => v.id === cleanId || v.name === cleanId);
}

/**
 * Applies a style variation to a Storefront configuration object
 */
export function applyStyleVariationToConfig(
  config: Partial<StorefrontConfigData>,
  variationId: string
): Partial<StorefrontConfigData> {
  const variation = getStyleVariationById(variationId);
  if (!variation) return { ...config };

  return {
    ...config,
    themeColor: variation.colorPalette,
    fontFamily: variation.fontFamily,
  };
}
