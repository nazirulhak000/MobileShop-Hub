/**
 * WordPress Gutenberg Block Style Variations Engine (`register_block_style`) - Round 53
 *
 * Reverse-engineers WordPress Gutenberg block style variations:
 * Provides registered visual style variants for core and custom blocks:
 * - RichText: default, callout-card, blueprint-grid, bordered-minimal
 * - PromoBanner: gradient-glow, solid-flat, bordered-glass
 * - CtaBlock: default, compact-bar, floating-card
 * - PhotoGallery: default, masonry-polaroid, rounded-pill
 */

export interface BlockStyle {
  name: string;
  label: string;
  isDefault?: boolean;
  className: string;
  description?: string;
}

// Built-in style variants per block type
const DEFAULT_BLOCK_STYLES: Record<string, BlockStyle[]> = {
  // Rich Text / Markdown
  rich_text: [
    {
      name: "default",
      label: "มาตรฐาน (Default Clean)",
      isDefault: true,
      className: "is-style-default",
      description: "ตัวอักษรมาตรฐานอ่านง่าย สไตล์เอกสารทางการ",
    },
    {
      name: "callout-card",
      label: "การ์ดข้อความเน้นย้ำ (Callout Card)",
      className: "is-style-callout-card bg-slate-900/60 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-xl backdrop-blur-md",
      description: "กรอบการ์ดพื้นหลังโปร่งแสงสำหรับข้อความเน้นพิเศษ",
    },
    {
      name: "blueprint-grid",
      label: "ตารางบลูพริ้นต์เชิงเทคนิค (Blueprint Grid)",
      className: "is-style-blueprint-grid bg-slate-950 border border-emerald-500/30 p-6 sm:p-8 rounded-3xl font-mono text-emerald-400/90 shadow-2xl relative",
      description: "พื้นหลังลายตารางกริดวิศวกรรมสำหรับข้อมูลสเปกเครื่องมือและอะไหล่",
    },
    {
      name: "bordered-minimal",
      label: "ขอบข้างเน้นย้ำ (Bordered Minimal)",
      className: "is-style-bordered-minimal border-l-4 border-emerald-500 pl-6 py-2 bg-slate-900/20 rounded-r-2xl",
      description: "แถบสีไฮไลต์ด้านซ้ายสไตล์คำคมหรือข้อควรระวังสำคัญ",
    },
  ],

  // Promo Banner
  promo_banner: [
    {
      name: "gradient-glow",
      label: "ไล่เฉดสีเปล่งประกาย (Gradient Glow)",
      isDefault: true,
      className: "is-style-gradient-glow shadow-2xl",
      description: "การไล่เฉดสีสวยงามพร้อมแสงเรืองรองดึงดูดสายตา",
    },
    {
      name: "solid-flat",
      label: "สีทึบคมชัด (Solid Flat)",
      className: "is-style-solid-flat border-2 border-slate-800 bg-slate-950",
      description: "สไตล์มินิมอลสีเข้มทึบ ชัดเจน ไม่ฟุ้งกระจาย",
    },
    {
      name: "bordered-glass",
      label: "กระจกใสโปร่งแสง (Bordered Glass)",
      className: "is-style-bordered-glass backdrop-blur-xl bg-slate-900/50 border border-slate-700/80 shadow-xl",
      description: "สไตล์กระจกเงาโปร่งแสงโมเดิร์นทันสมัย",
    },
  ],

  // CTA Block
  cta: [
    {
      name: "default",
      label: "แบนเนอร์เต็มความกว้าง (Full Banner)",
      isDefault: true,
      className: "is-style-default",
      description: "แบนเนอร์กล่องข้อความขนาดใหญ่พร้อมปุ่มติดต่อครบชุด",
    },
    {
      name: "compact-bar",
      label: "แถบกะทัดรัด (Compact Bar)",
      className: "is-style-compact-bar py-4 px-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between",
      description: "แถบแนวนอนกระชับพื้นที่สำหรับแทรกท้ายเนื้อหา",
    },
    {
      name: "floating-card",
      label: "การ์ดลอยมิติสูง (Floating Card)",
      className: "is-style-floating-card shadow-2xl hover:scale-[1.01] transition-transform border border-slate-700/80 rounded-3xl",
      description: "การ์ดยกสูงมีมิติพร้อมแอนิเมชันตอนชี้เมาส์",
    },
  ],

  // Photo Gallery
  photo_gallery: [
    {
      name: "default",
      label: "ตารางมาตรฐาน (Standard Grid)",
      isDefault: true,
      className: "is-style-default",
      description: "ตารางรูปภาพสัดส่วนมาตรฐาน 4:3 คมชัด",
    },
    {
      name: "masonry-polaroid",
      label: "สไตล์โพลารอยด์ (Polaroid Cards)",
      className: "is-style-masonry-polaroid p-3 bg-white text-slate-950 rounded-2xl shadow-xl rotate-[-0.5deg]",
      description: "กรอบขอบขาวสไตล์ภาพถ่ายโพลารอยด์วินเทจ",
    },
    {
      name: "rounded-pill",
      label: "มุมโค้งมนนุ่มนวล (Soft Rounded)",
      className: "is-style-rounded-pill rounded-3xl overflow-hidden shadow-2xl",
      description: "มุมโค้งมนขนาดใหญ่พิเศษเข้ากับดีไซน์โมเดิร์น",
    },
  ],
};

// In-memory registry (blockType -> BlockStyle[])
const blockStyleRegistry = new Map<string, BlockStyle[]>();

function initDefaultBlockStyles(): void {
  if (blockStyleRegistry.size === 0) {
    for (const [blockType, styles] of Object.entries(DEFAULT_BLOCK_STYLES)) {
      blockStyleRegistry.set(blockType, [...styles]);
      // Also register kebab-case alias
      const kebab = blockType.replace(/_/g, "-");
      if (kebab !== blockType) {
        blockStyleRegistry.set(kebab, [...styles]);
      }
    }
  }
}

// Auto-initialize
initDefaultBlockStyles();

/**
 * Registers a new block style variation (WordPress `register_block_style`)
 */
export function register_block_style(blockType: string, style: BlockStyle): void {
  initDefaultBlockStyles();
  const cleanType = (blockType || "").trim().toLowerCase();
  if (!cleanType) throw new Error("Block type must be a non-empty string");
  if (!style.name) throw new Error("Block style name must be a non-empty string");

  const existing = blockStyleRegistry.get(cleanType) || [];
  const idx = existing.findIndex((s) => s.name === style.name);

  if (idx >= 0) {
    existing[idx] = { ...style };
  } else {
    existing.push({ ...style });
  }

  blockStyleRegistry.set(cleanType, existing);
}

/**
 * Unregisters a block style variation (WordPress `unregister_block_style`)
 */
export function unregister_block_style(blockType: string, styleName: string): boolean {
  initDefaultBlockStyles();
  const cleanType = (blockType || "").trim().toLowerCase();
  const existing = blockStyleRegistry.get(cleanType);
  if (!existing) return false;

  const filtered = existing.filter((s) => s.name !== styleName);
  const removed = filtered.length !== existing.length;
  blockStyleRegistry.set(cleanType, filtered);
  return removed;
}

/**
 * Retrieves all registered block style variations for a block type
 */
export function get_block_styles(blockType: string): BlockStyle[] {
  initDefaultBlockStyles();
  const cleanType = (blockType || "").trim().toLowerCase();
  return blockStyleRegistry.get(cleanType) || [];
}

/**
 * Resolves the CSS class name for a given block type and style variant name
 */
export function get_block_style_class(blockType: string, styleName?: string): string {
  initDefaultBlockStyles();
  const styles = get_block_styles(blockType);
  if (styles.length === 0) return "";

  if (styleName) {
    const matched = styles.find((s) => s.name === styleName.trim().toLowerCase());
    if (matched) return matched.className;
  }

  // Fallback to default style
  const defaultStyle = styles.find((s) => s.isDefault);
  return defaultStyle ? defaultStyle.className : styles[0].className;
}

/**
 * Resets block styles to factory defaults
 */
export function reset_block_styles(): void {
  blockStyleRegistry.clear();
  initDefaultBlockStyles();
}
