/**
 * WordPress-Style Taxonomy & Tagging Engine
 * Reverse-engineers WP Categories (hierarchical) and Tags (flat)
 * (register_taxonomy / wp_get_post_terms / wp_set_post_terms / get_terms)
 * 
 * Provides taxonomy management for custom subpages and generates
 * filterable category navigation pills with live counts.
 */

import { CustomPage } from "@/lib/storefrontTheme";

export interface TaxonomyOptions {
  hierarchical?: boolean;
  label?: string;
  singularLabel?: string;
  public?: boolean;
  showUi?: boolean;
  description?: string;
}

export interface TaxonomyDefinition extends Required<TaxonomyOptions> {
  name: string;
}

export interface TaxonomyTerm {
  id: string;
  taxonomy: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  parentSlug?: string;
  count: number;
}

export interface TaxonomyPill {
  slug: string;
  name: string;
  count: number;
  isActive: boolean;
  href: string;
  color?: string;
}

export interface GetTermsOptions {
  hideEmpty?: boolean;
  sortBy?: "name" | "count" | "slug";
  sortOrder?: "asc" | "desc";
  parentSlug?: string | null;
}

// In-memory repositories with tenant isolation
const registeredTaxonomies = new Map<string, TaxonomyDefinition>();
const termStore = new Map<string, TaxonomyTerm[]>(); // key: `${tenantId}:${taxonomy}`
const postTermStore = new Map<string, string[]>(); // key: `${tenantId}:${taxonomy}:${postId}` -> array of term slugs

/**
 * Normalizes taxonomy slug
 */
function normalizeSlug(raw: string): string {
  return String(raw || "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Isolated storage key for tenant and taxonomy
 */
function getStorageKey(tenantId: string, taxonomy: string): string {
  const cleanTenant = String(tenantId || "default").trim().toLowerCase();
  const cleanTax = String(taxonomy || "category").trim().toLowerCase();
  return `${cleanTenant}:${cleanTax}`;
}

/**
 * Post-term storage key
 */
function getPostStorageKey(tenantId: string, taxonomy: string, postId: string): string {
  return `${getStorageKey(tenantId, taxonomy)}:${String(postId).trim().toLowerCase()}`;
}

/**
 * Registers default WordPress core taxonomies
 */
function initCoreTaxonomies(): void {
  if (registeredTaxonomies.size === 0) {
    registerTaxonomy("category", {
      hierarchical: true,
      label: "หมวดหมู่ (Categories)",
      singularLabel: "หมวดหมู่",
      public: true,
      showUi: true,
      description: "การจัดกลุ่มเนื้อหาแบบมีลำดับขั้น (Hierarchical Taxonomy)",
    });

    registerTaxonomy("post_tag", {
      hierarchical: false,
      label: "ป้ายกำกับ (Tags)",
      singularLabel: "ป้ายกำกับ",
      public: true,
      showUi: true,
      description: "คำค้นหาหรือป้ายกำกับอิสระ (Flat Taxonomy)",
    });
  }
}

// Auto-initialize core taxonomies
initCoreTaxonomies();

/**
 * Registers a new taxonomy (similar to WP register_taxonomy)
 */
export function registerTaxonomy(
  name: string,
  options: TaxonomyOptions = {}
): TaxonomyDefinition {
  const cleanName = normalizeSlug(name);
  const def: TaxonomyDefinition = {
    name: cleanName,
    hierarchical: Boolean(options.hierarchical),
    label: options.label || cleanName,
    singularLabel: options.singularLabel || options.label || cleanName,
    public: options.public !== false,
    showUi: options.showUi !== false,
    description: options.description || "",
  };

  registeredTaxonomies.set(cleanName, def);
  return def;
}

/**
 * Returns all registered taxonomy definitions
 */
export function getRegisteredTaxonomies(): Record<string, TaxonomyDefinition> {
  initCoreTaxonomies();
  const result: Record<string, TaxonomyDefinition> = {};
  for (const [key, val] of registeredTaxonomies.entries()) {
    result[key] = { ...val };
  }
  return result;
}

/**
 * Adds or updates a taxonomy term (similar to wp_insert_term)
 */
export function addTerm(
  taxonomy: string,
  term: Partial<TaxonomyTerm> & { name: string },
  tenantId = "default"
): TaxonomyTerm {
  initCoreTaxonomies();
  const cleanTax = normalizeSlug(taxonomy);
  const key = getStorageKey(tenantId, cleanTax);
  const list = termStore.get(key) || [];

  const rawName = String(term.name || "").trim().slice(0, 100);
  const slug = normalizeSlug(term.slug || rawName) || `term-${list.length + 1}`;

  // Check if term already exists
  const existingIdx = list.findIndex((t) => t.slug === slug);
  if (existingIdx >= 0) {
    const existing = list[existingIdx];
    const updated: TaxonomyTerm = {
      ...existing,
      name: rawName || existing.name,
      description: term.description !== undefined ? term.description : existing.description,
      color: term.color !== undefined ? term.color : existing.color,
      parentSlug: term.parentSlug !== undefined ? term.parentSlug : existing.parentSlug,
    };
    list[existingIdx] = updated;
    termStore.set(key, list);
    return updated;
  }

  const newTerm: TaxonomyTerm = {
    id: `term_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    taxonomy: cleanTax,
    tenantId: String(tenantId).trim().toLowerCase(),
    name: rawName,
    slug,
    description: term.description ? String(term.description).slice(0, 300) : undefined,
    color: term.color ? String(term.color).slice(0, 20) : undefined,
    parentSlug: term.parentSlug ? normalizeSlug(term.parentSlug) : undefined,
    count: term.count || 0,
  };

  list.push(newTerm);
  termStore.set(key, list);
  return newTerm;
}

/**
 * Retrieves taxonomy terms for a tenant (similar to get_terms)
 */
export function getTerms(
  taxonomy: string,
  tenantId = "default",
  options: GetTermsOptions = {}
): TaxonomyTerm[] {
  const cleanTax = normalizeSlug(taxonomy);
  const key = getStorageKey(tenantId, cleanTax);
  let terms = [...(termStore.get(key) || [])];

  if (options.parentSlug !== undefined) {
    const parent = options.parentSlug ? normalizeSlug(options.parentSlug) : null;
    terms = terms.filter((t) => (t.parentSlug || null) === parent);
  }

  if (options.hideEmpty) {
    terms = terms.filter((t) => t.count > 0);
  }

  const sortBy = options.sortBy || "name";
  const isAsc = options.sortOrder !== "desc";

  terms.sort((a, b) => {
    let comparison = 0;
    if (sortBy === "count") {
      comparison = a.count - b.count;
    } else if (sortBy === "slug") {
      comparison = a.slug.localeCompare(b.slug);
    } else {
      comparison = a.name.localeCompare(b.name, "th-TH");
    }
    return isAsc ? comparison : -comparison;
  });

  return terms;
}

/**
 * Retrieves a single term by slug
 */
export function getTerm(
  taxonomy: string,
  slug: string,
  tenantId = "default"
): TaxonomyTerm | null {
  const cleanTax = normalizeSlug(taxonomy);
  const cleanSlug = normalizeSlug(slug);
  const terms = getTerms(cleanTax, tenantId);
  return terms.find((t) => t.slug === cleanSlug) || null;
}

/**
 * Assigns terms to a post/subpage (similar to wp_set_post_terms)
 * Recalculates term usage counts.
 */
export function assignTermsToPost(
  postId: string,
  taxonomy: string,
  termSlugs: string[],
  tenantId = "default"
): TaxonomyTerm[] {
  initCoreTaxonomies();
  const cleanTax = normalizeSlug(taxonomy);
  const postKey = getPostStorageKey(tenantId, cleanTax, postId);

  // Normalize incoming slugs
  const cleanSlugs = Array.from(new Set(termSlugs.map((s) => normalizeSlug(s)).filter(Boolean)));
  postTermStore.set(postKey, cleanSlugs);

  // Ensure terms exist in termStore
  const assignedTerms: TaxonomyTerm[] = [];
  for (const slug of cleanSlugs) {
    let term = getTerm(cleanTax, slug, tenantId);
    if (!term) {
      term = addTerm(cleanTax, { name: slug, slug }, tenantId);
    }
    assignedTerms.push(term);
  }

  // Recalculate usage counts across all terms for this tenant & taxonomy
  recalculateTermCounts(tenantId, cleanTax);

  return assignedTerms;
}

/**
 * Gets terms assigned to a specific post/subpage
 */
export function getPostTerms(
  postId: string,
  taxonomy: string,
  tenantId = "default"
): TaxonomyTerm[] {
  const cleanTax = normalizeSlug(taxonomy);
  const postKey = getPostStorageKey(tenantId, cleanTax, postId);
  const slugs = postTermStore.get(postKey) || [];

  return slugs
    .map((slug) => getTerm(cleanTax, slug, tenantId))
    .filter((t): t is TaxonomyTerm => t !== null);
}

/**
 * Finds all post IDs assigned to a specific term
 */
export function getPostsByTerm(
  taxonomy: string,
  termSlug: string,
  tenantId = "default"
): string[] {
  const cleanTax = normalizeSlug(taxonomy);
  const cleanSlug = normalizeSlug(termSlug);
  const prefix = `${getStorageKey(tenantId, cleanTax)}:`;

  const postIds: string[] = [];
  for (const [key, slugs] of postTermStore.entries()) {
    if (key.startsWith(prefix) && slugs.includes(cleanSlug)) {
      const postId = key.substring(prefix.length);
      postIds.push(postId);
    }
  }
  return postIds;
}

/**
 * Recalculates term count metrics
 */
function recalculateTermCounts(tenantId: string, taxonomy: string): void {
  const key = getStorageKey(tenantId, taxonomy);
  const terms = termStore.get(key) || [];
  const prefix = `${key}:`;

  const countMap = new Map<string, number>();
  for (const [pKey, slugs] of postTermStore.entries()) {
    if (pKey.startsWith(prefix)) {
      for (const s of slugs) {
        countMap.set(s, (countMap.get(s) || 0) + 1);
      }
    }
  }

  for (const term of terms) {
    term.count = countMap.get(term.slug) || 0;
  }

  termStore.set(key, terms);
}

/**
 * Filters CustomPage array by category or tag slug
 */
export function filterCustomPagesByTerm(
  pages: CustomPage[],
  taxonomy: "category" | "tag" | string,
  termSlug: string
): CustomPage[] {
  const cleanSlug = normalizeSlug(termSlug);
  if (!cleanSlug || cleanSlug === "all") return pages;

  const isTag = taxonomy === "tag" || taxonomy === "post_tag";

  return pages.filter((p) => {
    const list = isTag ? p.tags : p.categories;
    if (!Array.isArray(list)) return false;
    return list.some((item) => normalizeSlug(item) === cleanSlug);
  });
}

/**
 * Generates filterable category/tag navigation pills with active states and live item counts
 */
export function generateTaxonomyPills(
  pages: CustomPage[],
  taxonomy: "category" | "tag" = "category",
  activeTermSlug = "all",
  baseUrl = ""
): TaxonomyPill[] {
  const isTag = taxonomy === "tag";
  const cleanActive = normalizeSlug(activeTermSlug) || "all";

  // Calculate counts per term from published pages
  const publishedPages = pages.filter((p) => p.published !== false);
  const termCounts = new Map<string, { name: string; count: number }>();

  for (const page of publishedPages) {
    const items = isTag ? page.tags : page.categories;
    if (Array.isArray(items)) {
      for (const item of items) {
        const rawName = String(item).trim();
        const slug = normalizeSlug(rawName);
        if (slug) {
          const current = termCounts.get(slug) || { name: rawName, count: 0 };
          current.count++;
          termCounts.set(slug, current);
        }
      }
    }
  }

  const pills: TaxonomyPill[] = [
    {
      slug: "all",
      name: "ทั้งหมด",
      count: publishedPages.length,
      isActive: cleanActive === "all",
      href: baseUrl || "?",
    },
  ];

  // Sort terms by count descending, then alphabetical
  const sortedEntries = Array.from(termCounts.entries()).sort((a, b) => {
    if (b[1].count !== a[1].count) {
      return b[1].count - a[1].count;
    }
    return a[1].name.localeCompare(b[1].name, "th-TH");
  });

  for (const [slug, data] of sortedEntries) {
    const queryParam = isTag ? `tag=${encodeURIComponent(slug)}` : `category=${encodeURIComponent(slug)}`;
    const separator = baseUrl.includes("?") ? "&" : "?";
    const href = baseUrl ? `${baseUrl}${separator}${queryParam}` : `?${queryParam}`;

    pills.push({
      slug,
      name: data.name,
      count: data.count,
      isActive: cleanActive === slug,
      href,
    });
  }

  return pills;
}

/**
 * Extracts all unique categories and tags from an array of custom pages and registers them
 */
export function extractTaxonomiesFromCustomPages(
  pages: CustomPage[],
  tenantId = "default"
): { categories: TaxonomyTerm[]; tags: TaxonomyTerm[] } {
  for (const page of pages) {
    const pageId = page.id || page.slug;

    if (Array.isArray(page.categories) && page.categories.length > 0) {
      assignTermsToPost(pageId, "category", page.categories, tenantId);
    }

    if (Array.isArray(page.tags) && page.tags.length > 0) {
      assignTermsToPost(pageId, "post_tag", page.tags, tenantId);
    }
  }

  return {
    categories: getTerms("category", tenantId),
    tags: getTerms("post_tag", tenantId),
  };
}

/**
 * Clears stores for testing
 */
export function clearTaxonomiesForTesting(): void {
  termStore.clear();
  postTermStore.clear();
  registeredTaxonomies.clear();
  initCoreTaxonomies();
}
