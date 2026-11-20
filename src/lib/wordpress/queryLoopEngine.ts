/**
 * WordPress Query Loop Engine (`core/query` & `WP_Query`) - Round 57
 *
 * Reverse-engineers WordPress WP_Query for storefront subpages and services:
 * Supports category and tag filtering, status checks, pagination,
 * multi-key sorting (date, title, menu_order, random), search querying,
 * and current-page exclusion.
 */

import { CustomPage } from "../storefrontTheme";

export interface WPQueryArgs {
  postType?: "page" | "post" | "service" | string;
  category?: string;
  tag?: string;
  status?: "publish" | "draft" | "all";
  perPage?: number;
  page?: number;
  orderBy?: "date" | "title" | "random" | "menu_order";
  order?: "asc" | "desc";
  excludeSlugs?: string[];
  onlyFeatured?: boolean;
  search?: string;
}

export interface WPQueryResult {
  items: CustomPage[];
  total: number;
  totalPages: number;
  currentPage: number;
  perPage: number;
  hasMore: boolean;
}

/**
 * Executes a WP_Query against an array of CustomPages
 */
export function wp_query_pages(
  pages: CustomPage[],
  args: WPQueryArgs = {}
): WPQueryResult {
  const safePages = Array.isArray(pages) ? [...pages] : [];
  const status = args.status || "publish";
  const perPage = Math.max(1, Math.min(50, Math.floor(args.perPage || 6)));
  const currentPage = Math.max(1, Math.floor(args.page || 1));
  const orderBy = args.orderBy || "menu_order";
  const order = args.order || "asc";
  const cleanCat = args.category && args.category !== "all" ? args.category.trim().toLowerCase() : "";
  const cleanTag = args.tag ? args.tag.trim().toLowerCase() : "";
  const cleanSearch = args.search ? args.search.trim().toLowerCase() : "";
  const excludeSet = new Set((args.excludeSlugs || []).map((s) => s.trim().toLowerCase()));

  // 1. Filter pages
  const filtered = safePages.filter((p) => {
    if (!p || typeof p !== "object") return false;

    // Published status filter
    if (status === "publish" && p.published === false) return false;
    if (status === "draft" && p.published !== false) return false;

    // Excluded slugs filter
    if (p.slug && excludeSet.has(p.slug.trim().toLowerCase())) return false;

    // Category filter
    if (cleanCat) {
      const cats = Array.isArray(p.categories) ? p.categories.map((c) => String(c).toLowerCase()) : [];
      if (!cats.some((c) => c === cleanCat || c.includes(cleanCat))) return false;
    }

    // Tag filter
    if (cleanTag) {
      const tags = Array.isArray(p.tags) ? p.tags.map((t) => String(t).toLowerCase()) : [];
      if (!tags.some((t) => t === cleanTag || t.includes(cleanTag))) return false;
    }

    // Search query filter
    if (cleanSearch) {
      const title = String(p.title || "").toLowerCase();
      const subtitle = String(p.subtitle || "").toLowerCase();
      const content = String(p.content || "").toLowerCase();
      if (!title.includes(cleanSearch) && !subtitle.includes(cleanSearch) && !content.includes(cleanSearch)) {
        return false;
      }
    }

    return true;
  });

  // 2. Sort pages
  filtered.sort((a, b) => {
    let cmp = 0;
    if (orderBy === "title") {
      cmp = String(a.title || "").localeCompare(String(b.title || ""), "th-TH");
    } else if (orderBy === "date") {
      const timeA = (a as any).updatedAt || (a as any).createdAt || 0;
      const timeB = (b as any).updatedAt || (b as any).createdAt || 0;
      cmp = timeA - timeB;
    } else if (orderBy === "random") {
      cmp = Math.random() - 0.5;
    } else {
      // menu_order: original order in the array
      cmp = safePages.indexOf(a) - safePages.indexOf(b);
    }

    return order === "desc" ? -cmp : cmp;
  });

  // 3. Paginate
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const offset = (currentPage - 1) * perPage;
  const items = filtered.slice(offset, offset + perPage);
  const hasMore = currentPage < totalPages;

  return {
    items,
    total,
    totalPages,
    currentPage,
    perPage,
    hasMore,
  };
}
