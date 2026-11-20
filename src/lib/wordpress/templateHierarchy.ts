/**
 * WordPress-Style Template Hierarchy & Page Layout Engine
 * Reverse-engineers WP template hierarchy (page-$slug.php -> page-$id.php -> page.php -> singular.php -> index.php)
 * 
 * Supports 5 distinct layout templates for subpages:
 * 1. "default": Standard container with breadcrumbs, hero header, content, blocks, contact card, footer.
 * 2. "blank-canvas": Full-width distraction-free landing page/funnel mode without standard hero/footer.
 * 3. "sidebar-right": 2-column layout (70% content / 30% sticky sidebar with shop info, CTA, hours, quick track).
 * 4. "boxed-fluid": Elegant centered boxed card with backdrop blur and subtle shadow, ideal for policies & terms.
 * 5. "landing-lead": High-converting lead-generation layout with prominent hero banner, trust badges, action buttons.
 */

import { PageTemplateType, CustomPage } from "@/lib/storefrontTheme";

export interface TemplateDefinition {
  id: PageTemplateType;
  name: string;
  nameEn: string;
  description: string;
  recommendedFor: string[];
  features: {
    hasHeroBanner: boolean;
    hasNavbar: boolean;
    hasFooter: boolean;
    hasSidebar: boolean;
    hasQuickContact: boolean;
    containerStyle: "standard" | "full" | "boxed" | "sidebar";
  };
}

export const SUPPORTED_PAGE_TEMPLATES: Record<PageTemplateType, TemplateDefinition> = {
  default: {
    id: "default",
    name: "ค่าเริ่มต้น (Standard Subpage)",
    nameEn: "Standard Default",
    description: "โครงสร้างมาตรฐานสมบูรณ์แบบ พร้อมหัวข้อแบนเนอร์ แถบนำทาง บล็อกเนื้อหา และการ์ดติดต่อ",
    recommendedFor: ["ข้อมูลทั่วไป", "แนะนำทีมช่าง", "สาขาและบริการ", "รีวิว"],
    features: {
      hasHeroBanner: true,
      hasNavbar: true,
      hasFooter: true,
      hasSidebar: false,
      hasQuickContact: true,
      containerStyle: "standard",
    },
  },
  "blank-canvas": {
    id: "blank-canvas",
    name: "หน้าเปล่าไร้สิ่งรบกวน (Blank Canvas)",
    nameEn: "Blank Canvas Landing",
    description: "หน้าว่างเต็มจอ ไม่มีแบนเนอร์หรือฟุตเตอร์มาตรฐาน เหมาะสำหรับหน้าโปรโมชันหรือ Landing Page เฉพาะกิจ",
    recommendedFor: ["แคมเปญโฆษณา", "โปรโมชันประจำเดือน", "Sales Funnel", "แบบฟอร์มภายนอก"],
    features: {
      hasHeroBanner: false,
      hasNavbar: false,
      hasFooter: false,
      hasSidebar: false,
      hasQuickContact: false,
      containerStyle: "full",
    },
  },
  "sidebar-right": {
    id: "sidebar-right",
    name: "คอลัมน์คู่พร้อมแถบข้างขวา (Sidebar Right)",
    nameEn: "2-Column Sidebar Right",
    description: "เลย์เอาต์ 2 คอลัมน์ (เนื้อหา 70% ด้านซ้าย / แถบข้อมูลร้านและเวลาทำการ 30% ด้านขวา)",
    recommendedFor: ["อัตราค่าบริการ", "วิธีส่งซ่อม", "คำถามที่พบบ่อย (FAQ)", "ติดต่อเรา"],
    features: {
      hasHeroBanner: true,
      hasNavbar: true,
      hasFooter: true,
      hasSidebar: true,
      hasQuickContact: true,
      containerStyle: "sidebar",
    },
  },
  "boxed-fluid": {
    id: "boxed-fluid",
    name: "การ์ดลอยจัดกลาง (Boxed Fluid Card)",
    nameEn: "Centered Boxed Card",
    description: "การ์ดเนื้อหาจัดกึ่งกลางความกว้างพอดีสายตา พร้อมพื้นหลังซอฟต์เกรเดียนต์และขอบมนสวยงาม",
    recommendedFor: ["นโยบายการรับประกัน", "ข้อกำหนดและเงื่อนไข", "นโยบายความเป็นส่วนตัว", "ประวัติร้าน"],
    features: {
      hasHeroBanner: true,
      hasNavbar: true,
      hasFooter: true,
      hasSidebar: false,
      hasQuickContact: false,
      containerStyle: "boxed",
    },
  },
  "landing-lead": {
    id: "landing-lead",
    name: "หน้าโปรโมตสร้างยอดขาย (Landing Lead)",
    nameEn: "Lead-Gen Hero Landing",
    description: "เน้นกระตุ้นการตัดสินใจด้วยหัวข้อโปรโมชั่นเด่น ปุ่ม Call-to-Action ขนาดใหญ่ และไฮไลต์ความน่าเชื่อถือ",
    recommendedFor: ["บริการซ่อมด่วนรอรับ", "โปรโมชันเปลี่ยนแบต-หน้าจอ", "ประกันหน้าจอแตก", "บริการนอกสถานที่"],
    features: {
      hasHeroBanner: true,
      hasNavbar: true,
      hasFooter: true,
      hasSidebar: false,
      hasQuickContact: true,
      containerStyle: "standard",
    },
  },
};

/**
 * Resolves the layout template for a subpage following WordPress Template Hierarchy principles.
 * Checks page.template against supported templates.
 * Falls back to hierarchical conventions based on page slug if template is unset.
 */
export function resolvePageTemplate(
  page?: Partial<CustomPage> | null,
  fallback: PageTemplateType = "default"
): PageTemplateType {
  if (!page) return fallback;

  // 1. Explicit template choice
  if (page.template && page.template in SUPPORTED_PAGE_TEMPLATES) {
    return page.template as PageTemplateType;
  }

  // 2. Slug-based template hierarchy conventions
  const slug = (page.slug || "").toLowerCase().trim();

  // Legal / Terms / Privacy / Warranty auto-resolves to boxed-fluid if not explicitly set
  if (
    slug.includes("terms") ||
    slug.includes("privacy") ||
    slug.includes("policy") ||
    slug.includes("warranty") ||
    slug.includes("condition")
  ) {
    return "boxed-fluid";
  }

  // Promo / Campaign / Special offer auto-resolves to landing-lead
  if (
    slug.includes("promo") ||
    slug.includes("campaign") ||
    slug.includes("special") ||
    slug.includes("lead")
  ) {
    return "landing-lead";
  }

  // Contact / FAQ / Guide auto-resolves to sidebar-right
  if (
    slug.includes("contact") ||
    slug.includes("faq") ||
    slug.includes("how-to") ||
    slug.includes("guide")
  ) {
    return "sidebar-right";
  }

  return fallback;
}

/**
 * Returns candidate template filenames in hierarchy order matching WordPress conventions
 * e.g. ["page-promo.tsx", "page-template-landing-lead.tsx", "page.tsx", "singular.tsx", "index.tsx"]
 */
export function getPageTemplateHierarchyCandidates(
  shopSlug: string,
  pageSlug: string,
  template?: string
): string[] {
  const cleanShop = (shopSlug || "").trim().toLowerCase();
  const cleanPage = (pageSlug || "").trim().toLowerCase();
  const cleanTemplate = (template || "default").trim().toLowerCase();

  const candidates: string[] = [];

  // Specific page slug template
  if (cleanPage) {
    candidates.push(`page-${cleanPage}.tsx`);
  }

  // Custom template
  if (cleanTemplate && cleanTemplate !== "default") {
    candidates.push(`page-template-${cleanTemplate}.tsx`);
  }

  // General page template
  candidates.push("page.tsx");
  candidates.push("singular.tsx");
  candidates.push("index.tsx");

  return candidates;
}
