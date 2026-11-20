/**
 * WordPress theme.json 3-Layer Design Token Engine (Round 22)
 *
 * Implements WordPress Full Site Editing (FSE) theme.json v2/v3 specification:
 * - Layer 1: Settings (Design Tokens: palette, gradients, typography, spacing, layout)
 * - Layer 2: Styles (Global styles, element defaults for button, link, heading)
 * - Layer 3: Custom Properties (CSS variables compilation conforming to --wp--preset--*)
 */

import {
  StorefrontThemeColor,
  StorefrontFontFamily,
  THEME_PALETTES,
  FONT_FAMILY_CONFIG,
  StorefrontConfigData,
} from "@/lib/storefrontTheme";

export interface WordPressColorToken {
  slug: string;
  color: string;
  name: string;
}

export interface WordPressGradientToken {
  slug: string;
  gradient: string;
  name: string;
}

export interface WordPressFontFamilyToken {
  slug: string;
  fontFamily: string;
  name: string;
}

export interface WordPressFontSizeToken {
  slug: string;
  size: string;
  name: string;
}

export interface WordPressSpacingToken {
  slug: string;
  size: string;
  name: string;
}

export interface WordPressThemeJsonSettings {
  appearanceTools?: boolean;
  color?: {
    palette?: WordPressColorToken[];
    gradients?: WordPressGradientToken[];
    defaultPalette?: boolean;
    defaultGradients?: boolean;
  };
  typography?: {
    fontFamilies?: WordPressFontFamilyToken[];
    fontSizes?: WordPressFontSizeToken[];
    lineHeight?: boolean;
  };
  spacing?: {
    spacingSizes?: WordPressSpacingToken[];
    units?: string[];
  };
  layout?: {
    contentSize?: string;
    wideSize?: string;
  };
  custom?: Record<string, any>;
}

export interface WordPressThemeJsonStyles {
  color?: {
    background?: string;
    text?: string;
  };
  typography?: {
    fontFamily?: string;
    fontSize?: string;
    lineHeight?: string;
  };
  elements?: {
    button?: Record<string, any>;
    link?: Record<string, any>;
    heading?: Record<string, any>;
  };
}

export interface WordPressThemeJson {
  $schema: string;
  version: number;
  title?: string;
  settings: WordPressThemeJsonSettings;
  styles: WordPressThemeJsonStyles;
}

/**
 * Standard WordPress spacing presets (10 to 60)
 */
export const DEFAULT_WP_SPACING_TOKENS: WordPressSpacingToken[] = [
  { slug: "10", size: "0.25rem", name: "Extra Small (4px)" },
  { slug: "20", size: "0.5rem", name: "Small (8px)" },
  { slug: "30", size: "1rem", name: "Medium (16px)" },
  { slug: "40", size: "1.5rem", name: "Large (24px)" },
  { slug: "50", size: "2rem", name: "Extra Large (32px)" },
  { slug: "60", size: "3rem", name: "Huge (48px)" },
];

/**
 * Standard WordPress font size presets
 */
export const DEFAULT_WP_FONT_SIZES: WordPressFontSizeToken[] = [
  { slug: "small", size: "0.875rem", name: "Small" },
  { slug: "medium", size: "1rem", name: "Medium" },
  { slug: "large", size: "1.25rem", name: "Large" },
  { slug: "x-large", size: "1.75rem", name: "Extra Large" },
  { slug: "2x-large", size: "2.5rem", name: "Huge" },
];

/**
 * Generates a standard WordPress theme.json v3 object from FixMe storefront settings.
 */
export function generateThemeJson(
  config: Partial<StorefrontConfigData>,
  tenantName = "FixMe Store"
): WordPressThemeJson {
  const themeColor = (config.themeColor as StorefrontThemeColor) || "emerald";
  const palette = THEME_PALETTES[themeColor] || THEME_PALETTES.emerald;
  const fontFamilyKey = (config.fontFamily as StorefrontFontFamily) || "anuphan";
  const fontConfig = FONT_FAMILY_CONFIG[fontFamilyKey] || FONT_FAMILY_CONFIG.anuphan;

  // 1. Color Palette Tokens
  const colorPalette: WordPressColorToken[] = [
    { slug: "primary", color: palette.hex, name: palette.labelEn || "Primary Accent" },
    { slug: "secondary", color: "#06C755", name: "LINE Green" },
    { slug: "foreground", color: "#0f172a", name: "Text Slate 900" },
    { slug: "background", color: "#ffffff", name: "Pure White" },
    { slug: "surface-dark", color: "#020617", name: "Slate Dark 950" },
    { slug: "surface-card", color: "#0f172a", name: "Slate Card 900" },
    { slug: "border", color: "#1e293b", name: "Border Slate 800" },
    { slug: "muted", color: "#94a3b8", name: "Muted Text 400" },
  ];

  // 2. Gradient Tokens
  const gradients: WordPressGradientToken[] = [
    {
      slug: "primary-gradient",
      gradient: `linear-gradient(135deg, ${palette.hex} 0%, #38bdf8 100%)`,
      name: "Primary Radiant",
    },
    {
      slug: "dark-glow",
      gradient: "linear-gradient(180deg, #0f172a 0%, #020617 100%)",
      name: "Dark Surface Glow",
    },
  ];

  // 3. Font Family Tokens
  const fontFamilies: WordPressFontFamilyToken[] = Object.values(FONT_FAMILY_CONFIG).map((f) => ({
    slug: f.id,
    fontFamily: f.fontFamily,
    name: f.label,
  }));

  return {
    $schema: "https://schemas.wp.org/trunk/theme.json",
    version: 3,
    title: `${tenantName} WordPress Block Theme`,
    settings: {
      appearanceTools: true,
      color: {
        palette: colorPalette,
        gradients,
        defaultPalette: false,
        defaultGradients: false,
      },
      typography: {
        fontFamilies,
        fontSizes: DEFAULT_WP_FONT_SIZES,
        lineHeight: true,
      },
      spacing: {
        spacingSizes: DEFAULT_WP_SPACING_TOKENS,
        units: ["px", "em", "rem", "vh", "vw", "%"],
      },
      layout: {
        contentSize: "800px",
        wideSize: "1280px",
      },
      custom: {
        themeColor,
        primaryHex: palette.hex,
        headline: config.headline || "",
        subheadline: config.subheadline || "",
        phone: config.phone || "",
        lineId: config.lineId || "",
      },
    },
    styles: {
      color: {
        background: "var(--wp--preset--color--background)",
        text: "var(--wp--preset--color--foreground)",
      },
      typography: {
        fontFamily: `var(--wp--preset--font-family--${fontConfig.id})`,
        fontSize: "var(--wp--preset--font-size--medium)",
        lineHeight: "1.6",
      },
      elements: {
        button: {
          color: {
            background: "var(--wp--preset--color--primary)",
            text: "#ffffff",
          },
          typography: {
            fontWeight: "700",
            fontSize: "var(--wp--preset--font-size--medium)",
          },
          border: {
            radius: "1rem",
          },
        },
        link: {
          color: {
            text: "var(--wp--preset--color--primary)",
          },
        },
        heading: {
          typography: {
            fontWeight: "800",
            lineHeight: "1.25",
          },
          color: {
            text: "var(--wp--preset--color--foreground)",
          },
        },
      },
    },
  };
}

/**
 * Compiles a WordPress theme.json into standard WordPress CSS custom properties.
 * Emits :root { --wp--preset--color--*: ...; --wp--preset--font-size--*: ...; }
 * and utility classes (.has-*-color, .has-*-background-color).
 */
export function compileThemeJsonToCss(themeJson: WordPressThemeJson): string {
  const cssVars: string[] = [];
  const utilityClasses: string[] = [];

  // Colors
  const palette = themeJson.settings.color?.palette || [];
  for (const item of palette) {
    cssVars.push(`  --wp--preset--color--${item.slug}: ${item.color};`);
    utilityClasses.push(`.has-${item.slug}-color { color: var(--wp--preset--color--${item.slug}) !important; }`);
    utilityClasses.push(`.has-${item.slug}-background-color { background-color: var(--wp--preset--color--${item.slug}) !important; }`);
  }

  // Gradients
  const gradients = themeJson.settings.color?.gradients || [];
  for (const item of gradients) {
    cssVars.push(`  --wp--preset--gradient--${item.slug}: ${item.gradient};`);
    utilityClasses.push(`.has-${item.slug}-gradient-background { background: var(--wp--preset--gradient--${item.slug}) !important; }`);
  }

  // Font Families
  const fontFamilies = themeJson.settings.typography?.fontFamilies || [];
  for (const item of fontFamilies) {
    cssVars.push(`  --wp--preset--font-family--${item.slug}: ${item.fontFamily};`);
  }

  // Font Sizes
  const fontSizes = themeJson.settings.typography?.fontSizes || [];
  for (const item of fontSizes) {
    cssVars.push(`  --wp--preset--font-size--${item.slug}: ${item.size};`);
    utilityClasses.push(`.has-${item.slug}-font-size { font-size: var(--wp--preset--font-size--${item.slug}) !important; }`);
  }

  // Spacing
  const spacing = themeJson.settings.spacing?.spacingSizes || [];
  for (const item of spacing) {
    cssVars.push(`  --wp--preset--spacing--${item.slug}: ${item.size};`);
  }

  // Layout bounds
  if (themeJson.settings.layout?.contentSize) {
    cssVars.push(`  --wp--style--global--content-size: ${themeJson.settings.layout.contentSize};`);
  }
  if (themeJson.settings.layout?.wideSize) {
    cssVars.push(`  --wp--style--global--wide-size: ${themeJson.settings.layout.wideSize};`);
  }

  // Custom properties
  if (themeJson.settings.custom) {
    for (const [key, val] of Object.entries(themeJson.settings.custom)) {
      if (typeof val === "string" || typeof val === "number") {
        cssVars.push(`  --wp--custom--${key}: ${val};`);
      }
    }
  }

  return [
    `/* WordPress theme.json Compiled Design Tokens */`,
    `:root {`,
    ...cssVars,
    `}`,
    "",
    ...utilityClasses,
  ].join("\n");
}

/**
 * Safely parses raw theme.json text string into WordPressThemeJson.
 */
export function parseThemeJson(rawText: string): WordPressThemeJson {
  try {
    const parsed = JSON.parse(rawText);
    if (parsed && typeof parsed === "object" && parsed.settings && parsed.styles) {
      return parsed as WordPressThemeJson;
    }
  } catch (_) {
    // Fall back to default
  }
  return generateThemeJson({});
}
