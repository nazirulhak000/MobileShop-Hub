/**
 * WordPress-compatible Dynamic XML Sitemap 0.9 & Robots.txt Engine (Round 51)
 *
 * Reverse-engineers WordPress Core XML sitemap functionality (wp-sitemap.xml):
 * - Valid XML Sitemap schema (http://www.sitemaps.org/schemas/sitemap/0.9)
 * - Automatic priority and changefreq calculation
 * - Multi-tenant published page indexing with strict draft exclusion
 * - Per-tenant robots.txt directive generator pointing to tenant sitemap
 */

import { CustomPage } from "../storefrontTheme";

export type SitemapChangeFreq =
  | "always"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "never";

export interface SitemapUrlEntry {
  loc: string;
  lastmod?: string;
  changefreq?: SitemapChangeFreq;
  priority?: number;
}

export interface SitemapOptions {
  baseUrl: string;
  shopSlug: string;
  pages?: CustomPage[];
  updatedAt?: Date | string | number;
}

export interface RobotsTxtOptions {
  baseUrl: string;
  shopSlug: string;
  allowIndexing?: boolean;
}

/**
 * Formats a Date into standard W3C Datetime format (YYYY-MM-DD)
 */
export function formatW3cDate(dateInput?: Date | string | number): string {
  if (!dateInput) {
    return new Date().toISOString().split("T")[0];
  }
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) {
    return new Date().toISOString().split("T")[0];
  }
  return d.toISOString().split("T")[0];
}

/**
 * Escapes XML text entities
 */
function escapeXml(unsafe: string): string {
  if (!unsafe) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Generates standard XML Sitemap 0.9 document from storefront configuration
 */
export function generateSitemapXml(options: SitemapOptions): string {
  const { baseUrl, shopSlug, pages = [], updatedAt } = options;
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const defaultLastMod = formatW3cDate(updatedAt);

  const entries: SitemapUrlEntry[] = [];

  // 1. Homepage Entry (Priority 1.0, Daily changefreq)
  entries.push({
    loc: `${normalizedBase}/store/${shopSlug}`,
    lastmod: defaultLastMod,
    changefreq: "daily",
    priority: 1.0,
  });

  // 2. Published Subpage Entries (Priority 0.8, Weekly changefreq)
  // Strictly filter out unpublished drafts
  const publishedPages = pages.filter((p) => p && p.published !== false && p.slug);

  for (const page of publishedPages) {
    const slug = page.slug.trim().replace(/^\/+/, "");
    entries.push({
      loc: `${normalizedBase}/store/${shopSlug}/${slug}`,
      lastmod: defaultLastMod,
      changefreq: "weekly",
      priority: 0.8,
    });
  }

  // Build XML markup
  const urlsXml = entries
    .map(
      (entry) => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority?.toFixed(1)}</priority>
  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}
</urlset>`.trim();
}

/**
 * Generates standard robots.txt directives for tenant storefront
 */
export function generateRobotsTxt(options: RobotsTxtOptions): string {
  const { baseUrl, shopSlug, allowIndexing = true } = options;
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const sitemapUrl = `${normalizedBase}/store/${shopSlug}/sitemap.xml`;

  if (!allowIndexing) {
    return `# Robots.txt for FixMe Storefront: ${shopSlug}
User-agent: *
Disallow: /
`.trim();
  }

  return `# Robots.txt for FixMe Storefront: ${shopSlug}
User-agent: *
Allow: /store/${shopSlug}
Disallow: /api/
Disallow: /settings/
Disallow: /track
Disallow: /customer/
Disallow: /staff/

# Sitemap location
Sitemap: ${sitemapUrl}
`.trim();
}
