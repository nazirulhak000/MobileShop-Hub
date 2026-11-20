/**
 * WordPress-inspired Synced Patterns & Reusable Blocks Engine (`wp_block`)
 *
 * Reverse-engineers WordPress pattern registration, category grouping,
 * block tree expansion, and tenant-scoped custom synced patterns.
 */

import { CustomBlock } from "../storefrontTheme";

export type PatternSyncStatus = "synced" | "unsynced";

export interface BlockPattern {
  name: string;
  title: string;
  description?: string;
  categories: string[];
  keywords?: string[];
  syncStatus?: PatternSyncStatus;
  blocks: CustomBlock[];
  tenantId?: string; // Optional tenant owner for tenant-scoped custom patterns
  createdAt?: number;
}

// Global pattern registry
const patternRegistry = new Map<string, BlockPattern>();

// In-memory tenant pattern storage (tenantId -> Map<patternName, BlockPattern>)
const tenantPatternStore = new Map<string, Map<string, BlockPattern>>();

/**
 * Generates high-entropy collision-free block IDs during pattern expansion
 */
function generateBlockId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `block_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  }
  return `block_${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${Math.floor(
    Math.random() * 10000
  )}`;
}

/**
 * Registers a block pattern in the system
 */
export function registerBlockPattern(pattern: BlockPattern): void {
  if (!pattern.name || typeof pattern.name !== "string") {
    throw new Error("Pattern name must be a non-empty string");
  }
  if (!Array.isArray(pattern.blocks)) {
    throw new Error("Pattern blocks must be an array");
  }

  patternRegistry.set(pattern.name, {
    ...pattern,
    syncStatus: pattern.syncStatus || "unsynced",
    categories: Array.isArray(pattern.categories) ? pattern.categories : ["general"],
    keywords: Array.isArray(pattern.keywords) ? pattern.keywords : [],
  });
}

/**
 * Unregisters a block pattern
 */
export function unregisterBlockPattern(name: string): boolean {
  return patternRegistry.delete(name);
}

/**
 * Retrieves a block pattern by name
 */
export function getBlockPattern(name: string, tenantId?: string): BlockPattern | undefined {
  if (tenantId && tenantPatternStore.has(tenantId)) {
    const tenantMap = tenantPatternStore.get(tenantId)!;
    if (tenantMap.has(name)) {
      return tenantMap.get(name);
    }
  }
  return patternRegistry.get(name);
}

/**
 * Returns all registered block patterns, optionally filtered by category
 */
export function getAllBlockPatterns(category?: string, tenantId?: string): BlockPattern[] {
  const result: BlockPattern[] = [];

  // Global patterns
  for (const pattern of patternRegistry.values()) {
    if (!category || pattern.categories.includes(category)) {
      result.push(pattern);
    }
  }

  // Tenant patterns
  if (tenantId && tenantPatternStore.has(tenantId)) {
    const tenantMap = tenantPatternStore.get(tenantId)!;
    for (const pattern of tenantMap.values()) {
      if (!category || pattern.categories.includes(category)) {
        result.push(pattern);
      }
    }
  }

  return result;
}

/**
 * Expands a pattern into a fresh array of CustomBlocks with brand-new unique IDs.
 * Prevents ID collisions when instantiating patterns multiple times into the page tree.
 */
export function expandPattern(
  patternName: string,
  overrides?: Partial<CustomBlock>[],
  tenantId?: string
): CustomBlock[] {
  const pattern = getBlockPattern(patternName, tenantId);
  if (!pattern) {
    throw new Error(`Block pattern "${patternName}" not found`);
  }

  return pattern.blocks.map((block, index) => {
    const cloned: CustomBlock = JSON.parse(JSON.stringify(block));
    const override = overrides && overrides[index] ? overrides[index] : {};

    return {
      ...cloned,
      ...override,
      id: generateBlockId(), // Guarantees fresh unique ID
      data: {
        ...(cloned.data || {}),
        ...(override.data || {}),
      },
    };
  });
}

/**
 * Creates and saves a tenant-scoped custom pattern (WordPress Synced/Reusable Block)
 */
export function createCustomPattern(
  tenantId: string,
  patternData: Omit<BlockPattern, "name" | "categories"> & { name?: string; categories?: string[] }
): BlockPattern {
  if (!tenantId) {
    throw new Error("Tenant ID is required for custom patterns");
  }

  const slug =
    patternData.name ||
    `tenant/${tenantId}/${patternData.title.toLowerCase().replace(/[^a-z0-9_-]/g, "-")}`;

  const pattern: BlockPattern = {
    ...patternData,
    name: slug,
    tenantId,
    syncStatus: patternData.syncStatus || "synced",
    categories: patternData.categories || ["custom"],
    keywords: patternData.keywords || [],
    createdAt: Date.now(),
  };

  if (!tenantPatternStore.has(tenantId)) {
    tenantPatternStore.set(tenantId, new Map());
  }

  tenantPatternStore.get(tenantId)!.set(slug, pattern);
  return pattern;
}

/**
 * Lists custom patterns belonging to a tenant
 */
export function getTenantPatterns(tenantId: string): BlockPattern[] {
  if (!tenantPatternStore.has(tenantId)) return [];
  return Array.from(tenantPatternStore.get(tenantId)!.values());
}

/**
 * Deletes a tenant-scoped custom pattern
 */
export function deleteTenantPattern(tenantId: string, patternName: string): boolean {
  if (!tenantPatternStore.has(tenantId)) return false;
  return tenantPatternStore.get(tenantId)!.delete(patternName);
}

/* -------------------------------------------------------------------------- */
/* Built-in Predefined WordPress Patterns                                     */
/* -------------------------------------------------------------------------- */

export const PREDEFINED_PATTERNS: BlockPattern[] = [
  // 1. Hero Promo Pattern
  {
    name: "fixme/hero-promo",
    title: "แบนเนอร์โปรโมชั่นพร้อมปุ่มแอ็กชัน (Hero Promo)",
    description: "แบนเนอร์โปรโมชั่นลดราคาพร้อมโค้ดส่วนลดและปุ่มติดต่อสอบถามด่วน",
    categories: ["promotions", "featured"],
    keywords: ["promo", "banner", "discount", "sale"],
    syncStatus: "unsynced",
    blocks: [
      {
        id: "pattern_promo",
        type: "promo-banner",
        title: "โปรโมชั่นพิเศษประจำเดือนนี้",
        subtitle: "รับส่วนลดค่าแรงตรวจเช็คและเปลี่ยนแบตเตอรี่แท้ 20% ทันที",
        data: {
          badge: "🔥 โปรโมชั่นจำกัดเวลา",
          discountTag: "FIXME20",
          buttonText: "รับสิทธิ์เลย",
          buttonUrl: "#estimate",
          bgType: "gradient",
        },
      },
      {
        id: "pattern_cta",
        type: "cta",
        title: "ปรึกษาอาการเครื่องเสียกับช่างเทคนิค",
        subtitle: "ประเมินราคาก่อนซ่อมฟรีผ่าน LINE OA ตอบไวใน 5 นาที",
        data: {
          lineId: "@fixmeshop",
          phone: "081-234-5678",
          primaryAction: "line",
          benefits: ["ตรวจเช็ค 20 รายการฟรี", "รับประกันงานซ่อม 90 วัน", "อะไหล่แท้ศูนย์"],
        },
      },
    ],
  },

  // 2. 3-Card Services Grid Pattern
  {
    name: "fixme/services-grid",
    title: "แกลเลอรีผลงานพร้อมตารางบริการ (Services Gallery Grid)",
    description: "ตารางแสดงผลงานการซ่อม 3 คอลัมน์พร้อมข้อมูลการบริการคุณภาพสูง",
    categories: ["services", "gallery"],
    keywords: ["gallery", "services", "photos", "portfolio"],
    syncStatus: "unsynced",
    blocks: [
      {
        id: "pattern_gallery",
        type: "photo-gallery",
        title: "ภาพบรรยากาศห้องแล็บและผลงานซ่อมจริง",
        subtitle: "มาตรฐานการทำงานระดับวิศวกรรมด้วยเครื่องมือวัด ESD Safe",
        data: {
          columns: 3,
        },
      },
      {
        id: "pattern_gallery_cta",
        type: "cta",
        title: "จองคิวตรวจเช็คเครื่องด่วน",
        subtitle: "ไม่ต้องรอคิวหน้าร้าน นำเครื่องเข้าซ่อมได้ทันที",
        data: {
          lineId: "@fixmeshop",
          primaryAction: "line",
        },
      },
    ],
  },

  // 3. FAQ Accordion & Credentials Pattern
  {
    name: "fixme/faq-accordion",
    title: "บทความมาตรฐานและคำถามที่พบบ่อย (FAQ & Standards)",
    description: "เนื้อหารายละเอียดมาตรฐานการซ่อมแซมและตารางเวลาทำการของศูนย์",
    categories: ["faq", "about"],
    keywords: ["faq", "article", "hours", "schedule"],
    syncStatus: "unsynced",
    blocks: [
      {
        id: "pattern_rich_text",
        type: "rich-text",
        title: "คำถามที่พบบ่อยและมาตรฐานการรับประกัน",
        subtitle: "ข้อมูลที่ลูกค้าควรรู้ก่อนส่งเครื่องเข้าซ่อมแซม",
        data: {
          align: "left",
          badge: "มาตรฐานและการรับรอง",
          author: "หัวหน้าทีมวิศวกรซ่อม",
          authorRole: "Technical Lead Engineer",
        },
      },
      {
        id: "pattern_hours",
        type: "business-hours",
        title: "เวลาทำการและตารางเปิดให้บริการ",
        subtitle: "ยินดีต้อนรับทุกท่าน พร้อมให้บริการงานซ่อมด่วน",
        data: {
          showLiveStatus: true,
        },
      },
    ],
  },

  // 4. Delivery & Drop-off Notice Pattern
  {
    name: "fixme/delivery-notice",
    title: "แจ้งเตือนการส่งซ่อมพัสดุและเดลิเวอรี (Delivery Notice)",
    description: "แบนเนอร์แจ้งขั้นตอนส่งซ่อมทางไปรษณีย์พร้อมช่องทางติดตามพัสดุ",
    categories: ["promotions", "delivery"],
    keywords: ["delivery", "shipping", "notice"],
    syncStatus: "unsynced",
    blocks: [
      {
        id: "pattern_delivery_promo",
        type: "promo-banner",
        title: "บริการส่งซ่อมทั่วประเทศผ่านขนส่งเอกชน",
        subtitle: "ส่งเครื่องมาซ่อมง่ายๆ พร้อมระบบ Live Tracking ติดตามสถานะผ่านมือถือได้ 24 ชั่วโมง",
        data: {
          badge: "📦 บริการส่งซ่อมพัสดุ",
          buttonText: "ขั้นตอนการแพ็คเครื่อง",
          buttonUrl: "#delivery-guide",
          discountTag: "FREESHIP",
          bgType: "gradient",
        },
      },
    ],
  },
];

// Initialize predefined patterns
for (const pattern of PREDEFINED_PATTERNS) {
  registerBlockPattern(pattern);
}
