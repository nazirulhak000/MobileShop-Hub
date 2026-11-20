/**
 * WordPress Template Parts Engine (`wp_template_part`) - Round 42
 *
 * Reverse-engineers WordPress Block Theme Template Parts:
 * - Swappable Header parts (standard, minimal, centered-brand)
 * - Swappable Footer parts (standard, 4-column, minimal-copyright)
 * - Template part registration & area querying (header, footer, sidebar, general)
 */

export type TemplatePartArea = "header" | "footer" | "sidebar" | "general";

export interface TemplatePartDefinition {
  slug: string;
  name: string;
  area: TemplatePartArea;
  title: string;
  description: string;
  layoutType: string;
  defaultAttributes?: Record<string, any>;
}

// Built-in Header Template Parts
export const DEFAULT_HEADER_PARTS: TemplatePartDefinition[] = [
  {
    slug: "header-standard",
    name: "header-standard",
    area: "header",
    title: "แถบนำทางมาตรฐาน (Standard Glassmorphism)",
    description: "แถบนำทางโปร่งแสงพร้อมโลโก้ร้านทางซ้าย เมนูนำทางตรงกลาง และปุ่มติดต่อด่วนทางขวา",
    layoutType: "standard",
    defaultAttributes: {
      sticky: true,
      showSearch: false,
      showContactButton: true,
    },
  },
  {
    slug: "header-minimal",
    name: "header-minimal",
    area: "header",
    title: "แถบนำทางแบบเรียบง่าย (Minimalist Navigation)",
    description: "แถบนำทางขนาดกะทัดรัด เน้นเฉพาะปุ่มกลับหน้าแรกและชื่อร้าน เหมาะกับหน้า Landing หรือชำระเงิน",
    layoutType: "minimal",
    defaultAttributes: {
      sticky: false,
      showHomeLink: true,
      showBackButton: true,
    },
  },
  {
    slug: "header-centered-brand",
    name: "header-centered-brand",
    area: "header",
    title: "แถบนำทางโลโก้กึ่งกลาง (Centered Brand Layout)",
    description: "จัดวางชื่อร้านและโลโก้ไว้กึ่งกลางหน้าจอ พร้อมแบ่งเมนูนำทางเป็นสองฝั่งซ้าย-ขวาอย่างสมดุล",
    layoutType: "centered",
    defaultAttributes: {
      sticky: true,
      splitNavigation: true,
    },
  },
];

// Built-in Footer Template Parts
export const DEFAULT_FOOTER_PARTS: TemplatePartDefinition[] = [
  {
    slug: "footer-standard",
    name: "footer-standard",
    area: "footer",
    title: "ส่วนท้ายมาตรฐาน 3 คอลัมน์ (Standard 3-Column Footer)",
    description: "คอลัมน์ข้อมูลร้าน, เมนูลิงก์หน้าย่อย และช่องทางติดต่อพร้อมปุ่ม LINE/โทรศัพท์",
    layoutType: "three-column",
    defaultAttributes: {
      showSocialLinks: true,
      showBranchAddress: true,
    },
  },
  {
    slug: "footer-4-column",
    name: "footer-4-column",
    area: "footer",
    title: "ส่วนท้ายองค์กร 4 คอลัมน์ (Enterprise 4-Column Footer)",
    description: "คอลัมน์ข้อมูลศูนย์ซ่อม, รายการบริการยอดนิยม, เวลาทำการ & แผนที่, และนโยบายความเป็นส่วนตัว",
    layoutType: "four-column",
    defaultAttributes: {
      showHoursTable: true,
      showMapLink: true,
      showPolicies: true,
    },
  },
  {
    slug: "footer-minimal-copyright",
    name: "footer-minimal-copyright",
    area: "footer",
    title: "ส่วนท้ายแบบย่อ (Minimal Copyright Bar)",
    description: "แถบข้อความลิขสิทธิ์แถวเดียวขนาดกะทัดรัด พร้อมลิงก์ข้อกำหนดสิทธิ์การใช้งาน",
    layoutType: "minimal",
    defaultAttributes: {
      showSocialLinks: false,
      singleLine: true,
    },
  },
];

// In-memory template part registry
const templatePartRegistry = new Map<string, TemplatePartDefinition>();

/**
 * Initializes default WordPress template parts
 */
function initDefaultTemplateParts(): void {
  if (templatePartRegistry.size === 0) {
    for (const part of [...DEFAULT_HEADER_PARTS, ...DEFAULT_FOOTER_PARTS]) {
      templatePartRegistry.set(part.slug, { ...part });
    }
  }
}

// Auto-initialize registry
initDefaultTemplateParts();

/**
 * Registers a template part in the registry (WordPress `register_block_template_part`)
 */
export function register_template_part(part: TemplatePartDefinition): void {
  if (!part.slug || typeof part.slug !== "string") {
    throw new Error("Template part slug must be a non-empty string");
  }
  templatePartRegistry.set(part.slug, { ...part });
}

/**
 * Unregisters a template part
 */
export function unregister_template_part(slug: string): boolean {
  return templatePartRegistry.delete(slug);
}

/**
 * Retrieves a template part by its slug (WordPress `get_template_part`)
 */
export function get_template_part(slug: string): TemplatePartDefinition | undefined {
  initDefaultTemplateParts();
  return templatePartRegistry.get(slug);
}

/**
 * Retrieves all registered template parts for a specific area (header, footer, etc.)
 */
export function get_template_parts_by_area(area: TemplatePartArea): TemplatePartDefinition[] {
  initDefaultTemplateParts();
  return Array.from(templatePartRegistry.values()).filter((part) => part.area === area);
}

/**
 * Returns all registered template parts
 */
export function getAllTemplateParts(): TemplatePartDefinition[] {
  initDefaultTemplateParts();
  return Array.from(templatePartRegistry.values());
}

/**
 * Resolves appropriate template part with fallback to area default
 */
export function resolve_template_part_layout(
  area: TemplatePartArea,
  preferredSlug?: string
): TemplatePartDefinition {
  initDefaultTemplateParts();
  if (preferredSlug && templatePartRegistry.has(preferredSlug)) {
    const part = templatePartRegistry.get(preferredSlug)!;
    if (part.area === area) return part;
  }

  // Fallback to primary default of the area
  if (area === "header") return DEFAULT_HEADER_PARTS[0];
  if (area === "footer") return DEFAULT_FOOTER_PARTS[0];

  const candidates = get_template_parts_by_area(area);
  return candidates[0] || DEFAULT_HEADER_PARTS[0];
}

/**
 * Resets registry to factory defaults
 */
export function reset_template_parts(): void {
  templatePartRegistry.clear();
  initDefaultTemplateParts();
}
