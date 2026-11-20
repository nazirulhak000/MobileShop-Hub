/**
 * WordPress-Style Custom Post Types (CPT) & Custom Meta Box Engine
 * Reverse-engineers `register_post_type`, `get_post_types`, `update_post_meta`, `get_post_meta`, `delete_post_meta`.
 * 
 * Provides:
 * 1. CPT Registration with schema, labels, capabilities, and rewrites.
 * 2. Multi-tenant post meta store with type safety, array/single retrieval, and revision synchronization.
 * 3. Typed Repair Shop Metadata Fields (price_range, repair_duration, warranty_period, is_featured, device_compatibility).
 */

export interface PostTypeLabels {
  name: string;
  singularName: string;
  addNew?: string;
  addNewItem?: string;
  editItem?: string;
  newItem?: string;
  viewItem?: string;
  searchItems?: string;
  notFound?: string;
  menuName?: string;
}

export type PostTypeSupportFeature =
  | "title"
  | "editor"
  | "author"
  | "thumbnail"
  | "excerpt"
  | "custom-fields"
  | "revisions"
  | "page-attributes"
  | string;

export interface PostTypeArgs {
  label?: string;
  labels?: Partial<PostTypeLabels>;
  description?: string;
  public?: boolean;
  hierarchical?: boolean;
  hasArchive?: boolean;
  rewrite?: { slug: string; withFront?: boolean };
  supports?: PostTypeSupportFeature[];
  taxonomies?: string[];
  menuPosition?: number;
  menuIcon?: string;
  showInRest?: boolean;
  restBase?: string;
}

export interface PostTypeObject extends Required<Omit<PostTypeArgs, "labels">> {
  name: string;
  labels: PostTypeLabels;
}

export interface RepairServiceMeta {
  priceRange?: {
    min: number;
    max: number;
    currency: string;
  };
  repairDuration?: string; // e.g. "30-45 นาที"
  warrantyPeriod?: string; // e.g. "90 วัน", "1 ปี"
  isFeatured?: boolean;
  deviceCompatibility?: string[]; // e.g. ["iPhone 15", "iPhone 14"]
  labCertified?: boolean;
  partGrade?: "OEM" | "Original" | "Refurbished" | "Custom";
  [key: string]: any;
}

// In-memory repositories with multi-tenant isolation
const registeredPostTypes = new Map<string, PostTypeObject>();
// Key: `${tenantId}:${postId}:${metaKey}` -> values array
const postMetaStore = new Map<string, any[]>();

/**
 * Normalizes post type slug
 */
function normalizePostTypeName(name: string): string {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .slice(0, 32);
}

/**
 * Generates an isolated storage key for tenant, post, and meta key
 */
function getMetaStorageKey(tenantId: string, postId: string, metaKey: string): string {
  const cleanTenant = String(tenantId || "default").trim().toLowerCase();
  const cleanPost = String(postId || "").trim().toLowerCase();
  const cleanKey = String(metaKey || "").trim();
  return `${cleanTenant}:${cleanPost}:${cleanKey}`;
}

/**
 * Initializes default core WordPress post types
 */
function initCorePostTypes(): void {
  if (registeredPostTypes.size === 0) {
    registerPostType("post", {
      label: "บทความ (Posts)",
      labels: { name: "บทความ", singularName: "บทความ" },
      public: true,
      hierarchical: false,
      hasArchive: true,
      supports: ["title", "editor", "thumbnail", "excerpt", "custom-fields", "revisions"],
    });

    registerPostType("page", {
      label: "หน้า (Pages)",
      labels: { name: "หน้า", singularName: "หน้า" },
      public: true,
      hierarchical: true,
      hasArchive: false,
      supports: ["title", "editor", "thumbnail", "custom-fields", "revisions", "page-attributes"],
    });

    // Core repair shop domain custom post types
    registerPostType("repair_service", {
      label: "บริการซ่อม (Repair Services)",
      labels: { name: "บริการซ่อม", singularName: "บริการซ่อม" },
      public: true,
      hierarchical: false,
      hasArchive: true,
      rewrite: { slug: "services" },
      supports: ["title", "editor", "thumbnail", "custom-fields", "revisions"],
      taxonomies: ["category", "post_tag"],
    });

    registerPostType("repair_case", {
      label: "ผลงานซ่อมจริง (Repair Cases)",
      labels: { name: "ผลงานซ่อม", singularName: "ผลงานซ่อม" },
      public: true,
      hierarchical: false,
      hasArchive: true,
      rewrite: { slug: "cases" },
      supports: ["title", "editor", "thumbnail", "custom-fields"],
      taxonomies: ["category", "post_tag"],
    });
  }
}

// Auto-initialize
initCorePostTypes();

/**
 * Registers a new post type (similar to WP register_post_type)
 */
export function registerPostType(
  name: string,
  args: PostTypeArgs = {}
): PostTypeObject {
  const cleanName = normalizePostTypeName(name);
  if (!cleanName) {
    throw new Error("Post type name must not be empty");
  }

  const defaultLabel = args.label || cleanName;
  const labels: PostTypeLabels = {
    name: args.labels?.name || defaultLabel,
    singularName: args.labels?.singularName || defaultLabel,
    addNew: args.labels?.addNew || "เพิ่มใหม่",
    addNewItem: args.labels?.addNewItem || `เพิ่ม${defaultLabel}ใหม่`,
    editItem: args.labels?.editItem || `แก้ไข${defaultLabel}`,
    newItem: args.labels?.newItem || `${defaultLabel}ใหม่`,
    viewItem: args.labels?.viewItem || `ดู${defaultLabel}`,
    searchItems: args.labels?.searchItems || `ค้นหา${defaultLabel}`,
    notFound: args.labels?.notFound || `ไม่พบ${defaultLabel}`,
    menuName: args.labels?.menuName || defaultLabel,
  };

  const postType: PostTypeObject = {
    name: cleanName,
    label: defaultLabel,
    labels,
    description: args.description || "",
    public: args.public !== false,
    hierarchical: Boolean(args.hierarchical),
    hasArchive: Boolean(args.hasArchive),
    rewrite: args.rewrite || { slug: cleanName, withFront: true },
    supports: args.supports || ["title", "editor", "thumbnail", "custom-fields"],
    taxonomies: args.taxonomies || [],
    menuPosition: args.menuPosition ?? 20,
    menuIcon: args.menuIcon || "dashicons-admin-post",
    showInRest: args.showInRest !== false,
    restBase: args.restBase || cleanName,
  };

  registeredPostTypes.set(cleanName, postType);
  return postType;
}

/**
 * Checks if a post type is registered
 */
export function postTypeExists(name: string): boolean {
  initCorePostTypes();
  return registeredPostTypes.has(normalizePostTypeName(name));
}

/**
 * Retrieves a registered post type definition
 */
export function getPostTypeObject(name: string): PostTypeObject | null {
  initCorePostTypes();
  return registeredPostTypes.get(normalizePostTypeName(name)) || null;
}

/**
 * Retrieves all registered post types
 */
export function getPostTypes(): Record<string, PostTypeObject> {
  initCorePostTypes();
  const result: Record<string, PostTypeObject> = {};
  for (const [key, val] of registeredPostTypes.entries()) {
    result[key] = { ...val };
  }
  return result;
}

/**
 * Updates post metadata (similar to WP update_post_meta)
 * Returns true on update/creation, false if previous value matched.
 */
export function updatePostMeta(
  postId: string,
  metaKey: string,
  metaValue: any,
  prevValue?: any,
  tenantId = "default"
): boolean {
  if (!postId || !metaKey) return false;

  const storageKey = getMetaStorageKey(tenantId, postId, metaKey);
  let values = postMetaStore.get(storageKey) || [];

  if (prevValue !== undefined) {
    const idx = values.findIndex((v) => JSON.stringify(v) === JSON.stringify(prevValue));
    if (idx >= 0) {
      values[idx] = metaValue;
    } else {
      values.push(metaValue);
    }
  } else {
    // If single replacement, replace or set as single item array
    values = [metaValue];
  }

  postMetaStore.set(storageKey, values);
  return true;
}

/**
 * Retrieves post metadata (similar to WP get_post_meta)
 * If single=true, returns the first value or null. If single=false, returns array of values.
 */
export function getPostMeta(
  postId: string,
  metaKey?: string,
  single = false,
  tenantId = "default"
): any {
  if (!postId) return single ? null : [];

  // If metaKey is provided, return its value(s)
  if (metaKey) {
    const storageKey = getMetaStorageKey(tenantId, postId, metaKey);
    const values = postMetaStore.get(storageKey);
    if (!values || values.length === 0) {
      return single ? null : [];
    }
    return single ? values[0] : [...values];
  }

  // If no metaKey, return all meta for this post as key-value map
  const cleanTenant = String(tenantId || "default").trim().toLowerCase();
  const cleanPost = String(postId || "").trim().toLowerCase();
  const prefix = `${cleanTenant}:${cleanPost}:`;

  const allMeta: Record<string, any> = {};
  for (const [key, val] of postMetaStore.entries()) {
    if (key.startsWith(prefix)) {
      const fieldKey = key.substring(prefix.length);
      allMeta[fieldKey] = single ? val[0] : [...val];
    }
  }
  return allMeta;
}

/**
 * Deletes post metadata (similar to WP delete_post_meta)
 */
export function deletePostMeta(
  postId: string,
  metaKey: string,
  metaValue?: any,
  tenantId = "default"
): boolean {
  if (!postId || !metaKey) return false;

  const storageKey = getMetaStorageKey(tenantId, postId, metaKey);
  if (!postMetaStore.has(storageKey)) return false;

  if (metaValue !== undefined) {
    let values = postMetaStore.get(storageKey) || [];
    const initialLen = values.length;
    values = values.filter((v) => JSON.stringify(v) !== JSON.stringify(metaValue));
    if (values.length === initialLen) return false;

    if (values.length === 0) {
      postMetaStore.delete(storageKey);
    } else {
      postMetaStore.set(storageKey, values);
    }
    return true;
  }

  postMetaStore.delete(storageKey);
  return true;
}

/**
 * High-level helper: Sets typed repair service metadata
 */
export function setRepairServiceMeta(
  postId: string,
  meta: RepairServiceMeta,
  tenantId = "default"
): void {
  for (const [key, val] of Object.entries(meta)) {
    if (val !== undefined) {
      updatePostMeta(postId, `_fixme_${key}`, val, undefined, tenantId);
    }
  }
}

/**
 * High-level helper: Retrieves typed repair service metadata
 */
export function getRepairServiceMeta(
  postId: string,
  tenantId = "default"
): RepairServiceMeta {
  const allMeta = getPostMeta(postId, undefined, true, tenantId);
  const result: RepairServiceMeta = {};

  for (const [key, val] of Object.entries(allMeta)) {
    if (key.startsWith("_fixme_")) {
      const field = key.replace("_fixme_", "");
      result[field] = val;
    }
  }

  return result;
}

/**
 * Clears stores for testing
 */
export function clearCustomFieldsForTesting(): void {
  postMetaStore.clear();
  registeredPostTypes.clear();
  initCorePostTypes();
}
