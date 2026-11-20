/**
 * WordPress REST API v2 Schema & Serialization Engine (Round 41)
 *
 * Conforms strictly to standard WordPress `/wp/v2/pages` endpoint schema:
 * - `id`, `date`, `date_gmt`, `guid`, `modified`, `modified_gmt`
 * - `slug`, `status: "publish" | "draft"`
 * - `type: "page"`
 * - `link: string`
 * - `title: { rendered: string }`
 * - `content: { rendered: string, protected: boolean }`
 * - `excerpt: { rendered: string, protected: boolean }`
 * - `template: string`
 * - `meta: Record<string, any>`
 * - `_links: Record<string, any>` (HATEOAS HAL format)
 */

import { CustomPage } from "../storefrontTheme";
import { serializeToGutenberg } from "./gutenbergConverter";
import { strip_shortcodes } from "./shortcodeEngine";

export interface WpRenderedField {
  rendered: string;
  protected?: boolean;
}

export interface WpRestLink {
  href: string;
  embeddable?: boolean;
  count?: number;
  templated?: boolean;
  name?: string;
}

export interface WpRestLinks {
  self: WpRestLink[];
  collection: WpRestLink[];
  about: WpRestLink[];
  author?: WpRestLink[];
  "version-history"?: WpRestLink[];
  "wp:attachment"?: WpRestLink[];
  curies?: WpRestLink[];
  [key: string]: WpRestLink[] | undefined;
}

export interface WpRestPage {
  id: number;
  date: string;
  date_gmt: string;
  guid: WpRenderedField;
  modified: string;
  modified_gmt: string;
  slug: string;
  status: "publish" | "draft" | "private";
  type: "page";
  link: string;
  title: WpRenderedField;
  content: WpRenderedField;
  excerpt: WpRenderedField;
  author: number;
  featured_media: number;
  parent: number;
  menu_order: number;
  comment_status: "open" | "closed";
  ping_status: "open" | "closed";
  template: string;
  meta: Record<string, any>;
  _links: WpRestLinks;
}

export interface WpRestPagesQuery {
  page?: number;
  per_page?: number;
  search?: string;
  slug?: string;
  status?: string;
  order?: "asc" | "desc";
  orderby?: "date" | "title" | "slug" | "id";
}

/**
 * Strips HTML tags from string to produce plain text
 */
function stripHtmlTags(input: string): string {
  if (!input) return "";
  return input.replace(/<\/?[^>]+(>|$)/g, "").trim();
}

/**
 * Generates an automated excerpt from page content and subtitle
 */
export function generateWpExcerpt(page: CustomPage, maxLength = 150): string {
  if (page.subtitle && page.subtitle.trim()) {
    return `<p>${page.subtitle.trim()}</p>\n`;
  }

  const raw = page.content || "";
  const cleaned = stripHtmlTags(strip_shortcodes(raw)).replace(/\s+/g, " ");

  if (!cleaned) {
    return "<p></p>\n";
  }

  if (cleaned.length <= maxLength) {
    return `<p>${cleaned}</p>\n`;
  }

  return `<p>${cleaned.slice(0, maxLength).trim()}&hellip;</p>\n`;
}

/**
 * Formats a single CustomPage into a WordPress REST API v2 Page object
 */
export function formatCustomPageToWpRest(
  page: CustomPage,
  index: number,
  baseUrl: string,
  shopSlug: string
): WpRestPage {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const pageId = index + 1;
  const canonicalUrl = `${normalizedBaseUrl}/store/${shopSlug}/${page.slug}`;

  // Deterministic mock ISO date (or current time if not stored)
  const now = new Date();
  const dateIso = now.toISOString().split(".")[0];

  // Compile content: If sections exist, serialize them with Gutenberg comments; otherwise use narrative content
  let renderedContent = "";
  if (page.sections && page.sections.length > 0) {
    const gutenbergMarkup = serializeToGutenberg(page.sections);
    renderedContent = page.content
      ? `<!-- wp:paragraph -->\n<p>${page.content.replace(/\n\n/g, "</p>\n<p>")}</p>\n<!-- /wp:paragraph -->\n\n${gutenbergMarkup}`
      : gutenbergMarkup;
  } else if (page.content) {
    renderedContent = `<p>${page.content.replace(/\n\n/g, "</p>\n<p>")}</p>\n`;
  }

  const excerptRendered = generateWpExcerpt(page);
  const status: "publish" | "draft" = page.published !== false ? "publish" : "draft";

  const selfUrl = `${normalizedBaseUrl}/api/storefront/v2/pages?shop=${shopSlug}&slug=${page.slug}`;
  const collectionUrl = `${normalizedBaseUrl}/api/storefront/v2/pages?shop=${shopSlug}`;

  return {
    id: pageId,
    date: dateIso,
    date_gmt: dateIso,
    guid: {
      rendered: `${normalizedBaseUrl}/?page_id=${pageId}`,
    },
    modified: dateIso,
    modified_gmt: dateIso,
    slug: page.slug,
    status,
    type: "page",
    link: canonicalUrl,
    title: {
      rendered: page.title || "Untitled Page",
    },
    content: {
      rendered: renderedContent,
      protected: false,
    },
    excerpt: {
      rendered: excerptRendered,
      protected: false,
    },
    author: 1,
    featured_media: 0,
    parent: 0,
    menu_order: index,
    comment_status: "closed",
    ping_status: "closed",
    template: page.template || "default",
    meta: {
      fixme_shop_slug: shopSlug,
      fixme_subtitle: page.subtitle || "",
      fixme_sections_count: page.sections?.length || 0,
      fixme_tags: page.tags || [],
      fixme_categories: page.categories || [],
      _wp_page_template: page.template || "default",
    },
    _links: {
      self: [{ href: selfUrl }],
      collection: [{ href: collectionUrl }],
      about: [{ href: "https://api.w.org/v2/types/page" }],
      author: [{ embeddable: true, href: `${normalizedBaseUrl}/api/storefront/v2/users/1` }],
      curies: [{ name: "wp", href: "https://api.w.org/{rel}", templated: true }],
    },
  };
}

/**
 * Formats an array of CustomPages into WP REST API v2 Pages
 */
export function formatCustomPagesToWpRestList(
  pages: CustomPage[],
  baseUrl: string,
  shopSlug: string
): WpRestPage[] {
  if (!Array.isArray(pages)) return [];
  return pages.map((page, idx) => formatCustomPageToWpRest(page, idx, baseUrl, shopSlug));
}

/**
 * Filters, searches, sorts, and paginates a list of WP REST Pages
 */
export function queryWpRestPages(
  pages: WpRestPage[],
  query: WpRestPagesQuery
): { items: WpRestPage[]; total: number; totalPages: number; page: number; perPage: number } {
  let filtered = [...pages];

  // 1. Filter by slug
  if (query.slug) {
    const targetSlug = query.slug.toLowerCase().trim();
    filtered = filtered.filter((p) => p.slug.toLowerCase() === targetSlug);
  }

  // 2. Filter by status (default is "publish" if unspecified)
  if (query.status && query.status !== "any") {
    const targetStatus = query.status.toLowerCase().trim();
    filtered = filtered.filter((p) => p.status === targetStatus);
  }

  // 3. Search query (matches title or content)
  if (query.search) {
    const searchTerm = query.search.toLowerCase().trim();
    filtered = filtered.filter(
      (p) =>
        p.title.rendered.toLowerCase().includes(searchTerm) ||
        p.content.rendered.toLowerCase().includes(searchTerm) ||
        p.slug.toLowerCase().includes(searchTerm)
    );
  }

  // 4. Sort order
  const order = query.order === "asc" ? 1 : -1;
  const orderby = query.orderby || "id";

  filtered.sort((a, b) => {
    if (orderby === "title") {
      return a.title.rendered.localeCompare(b.title.rendered) * order;
    }
    if (orderby === "slug") {
      return a.slug.localeCompare(b.slug) * order;
    }
    if (orderby === "date") {
      return a.date.localeCompare(b.date) * order;
    }
    return (a.id - b.id) * order;
  });

  // 5. Pagination
  const total = filtered.length;
  const perPage = Math.min(Math.max(Number(query.per_page) || 10, 1), 100);
  const totalPages = Math.max(Math.ceil(total / perPage), 1);
  const page = Math.min(Math.max(Number(query.page) || 1, 1), totalPages);

  const startIndex = (page - 1) * perPage;
  const items = filtered.slice(startIndex, startIndex + perPage);

  return {
    items,
    total,
    totalPages,
    page,
    perPage,
  };
}
