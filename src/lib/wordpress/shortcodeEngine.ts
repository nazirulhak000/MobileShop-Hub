/**
 * WordPress-compatible Shortcode API Engine
 *
 * Reverse-engineers `add_shortcode`, `do_shortcode`, `strip_shortcodes`,
 * and attribute parsing (`shortcode_parse_atts`).
 *
 * Provides out-of-the-box repair shop embed shortcodes:
 * - `[repair_tracker]`
 * - `[booking_calendar]`
 * - `[price_calculator]`
 * - `[contact_card]`
 * - `[shop_hours]`
 */

export interface ShortcodeAttributes {
  [key: string]: string | boolean | undefined;
}

export interface ShortcodeContext {
  tenantId?: string;
  shopSlug?: string;
  shopName?: string;
  phone?: string;
  lineId?: string;
}

export type ShortcodeHandler = (
  atts: ShortcodeAttributes,
  content: string | null,
  tag: string,
  context?: ShortcodeContext
) => string;

// Shortcode handler registry
const shortcodeTags = new Map<string, ShortcodeHandler>();

/**
 * Escapes HTML entities to prevent XSS injection through shortcode attributes
 */
export function escapeHtml(unsafe: string): string {
  if (!unsafe) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Parses WordPress shortcode attributes string into a key-value object
 * Matches WordPress `shortcode_parse_atts` behavior
 */
export function parseShortcodeAtts(text: string): ShortcodeAttributes {
  const atts: ShortcodeAttributes = {};
  if (!text || typeof text !== "string") return atts;

  // Regex pattern matching:
  // 1. key="value"
  // 2. key='value'
  // 3. key=value
  // 4. "value" or standalone value
  const pattern =
    /([a-zA-Z0-9_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))|(?:"([^"]*)"|'([^']*)'|(\S+))/g;

  let match: RegExpExecArray | null;
  let positionalIndex = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match[1]) {
      // Named attribute: key = value
      const key = match[1].toLowerCase();
      const val = match[2] ?? match[3] ?? match[4] ?? "";
      atts[key] = val;
    } else {
      // Positional / Valueless attribute
      const val = match[5] ?? match[6] ?? match[7];
      if (val !== undefined) {
        atts[positionalIndex] = val;
        positionalIndex++;
      }
    }
  }

  return atts;
}

/**
 * Registers a new shortcode tag and its handler
 */
export function add_shortcode(tag: string, callback: ShortcodeHandler): void {
  if (!tag || typeof tag !== "string") {
    throw new Error("Shortcode tag must be a non-empty string");
  }
  shortcodeTags.set(tag.toLowerCase(), callback);
}

/**
 * Removes a shortcode tag
 */
export function remove_shortcode(tag: string): boolean {
  return shortcodeTags.delete(tag.toLowerCase());
}

/**
 * Checks whether a shortcode tag is registered
 */
export function shortcode_exists(tag: string): boolean {
  return shortcodeTags.has(tag.toLowerCase());
}

/**
 * Removes all registered shortcodes
 */
export function remove_all_shortcodes(): void {
  shortcodeTags.clear();
}

/**
 * Strips all shortcode tags from content, leaving clean text
 */
export function strip_shortcodes(content: string): string {
  if (!content || typeof content !== "string") return "";
  // Matches [tag ...]content[/tag] or [tag ...]
  return content.replace(/\[([a-zA-Z0-9_-]+)[^\]]*\](?:[\s\S]*?\[\/\1\])?/g, "");
}

/**
 * Processes all registered shortcodes within the content string
 */
export function do_shortcode(content: string, context: ShortcodeContext = {}): string {
  if (!content || typeof content !== "string") return "";
  if (shortcodeTags.size === 0) return content;

  // Regex matching [tag ... /], [tag ...]...[/tag], or [tag ...]
  const pattern =
    /\[([a-zA-Z0-9_-]+)([\s\S]*?)(?:\/\]|\](?:([\s\S]*?)\[\/\1\])?)/g;

  return content.replace(pattern, (match, tag, rawAtts, enclosedContent) => {
    const normalizedTag = tag.toLowerCase();
    const handler = shortcodeTags.get(normalizedTag);

    if (!handler) {
      // Shortcode not registered - leave intact
      return match;
    }

    const atts = parseShortcodeAtts(rawAtts || "");
    const safeContent = enclosedContent !== undefined ? enclosedContent : null;

    try {
      return handler(atts, safeContent, normalizedTag, context);
    } catch (err) {
      console.error(`[do_shortcode] Error executing shortcode [${normalizedTag}]:`, err);
      return `<!-- Error in shortcode [${escapeHtml(normalizedTag)}] -->`;
    }
  });
}

/* -------------------------------------------------------------------------- */
/* Built-in FixMe Core Shortcodes                                              */
/* -------------------------------------------------------------------------- */

// 1. [repair_tracker]
add_shortcode("repair_tracker", (atts, _content, _tag, context) => {
  const placeholder = escapeHtml(String(atts.placeholder || "วางลิงก์ติดตามงานซ่อมจากใบรับเครื่อง"));
  const btnText = escapeHtml(String(atts.button || "ตรวจสอบสถานะ"));
  const shopSlug = escapeHtml(String(atts.shop_slug || context?.shopSlug || ""));

  return `
<div class="fixme-shortcode fixme-repair-tracker my-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 text-white shadow-xl max-w-xl mx-auto">
  <div class="flex items-center gap-2 mb-3">
    <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
    <span class="text-xs font-semibold uppercase tracking-wider text-emerald-400">Live Tracking</span>
  </div>
  <form action="/track" method="GET" class="flex flex-col sm:flex-row gap-2">
    <input type="text" name="code" placeholder="${placeholder}" class="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-white focus:outline-none focus:border-emerald-500" required />
    ${shopSlug ? `<input type="hidden" name="shop" value="${shopSlug}" />` : ""}
    <button type="submit" class="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-colors shadow-md min-h-[44px]">
      ${btnText}
    </button>
  </form>
</div>`.trim();
});

// 2. [booking_calendar]
add_shortcode("booking_calendar", (atts, _content, _tag, context) => {
  const shopSlug = escapeHtml(String(atts.shop_slug || context?.shopSlug || ""));
  const btnText = escapeHtml(String(atts.text || atts.button || "จองคิวออนไลน์ทันที"));
  const targetUrl = shopSlug ? `/s/${shopSlug}` : "/customer";

  return `
<div class="fixme-shortcode fixme-booking-cta my-4 p-6 rounded-2xl bg-gradient-to-r from-teal-900/60 to-slate-900 border border-teal-800/60 text-white text-center max-w-xl mx-auto shadow-xl">
  <h4 class="text-lg font-bold text-white mb-2">นัดหมายคิวซ่อมล่วงหน้า ไม่ต้องรอ</h4>
  <p class="text-xs text-slate-300 mb-4">เลือกวันและเวลาที่สะดวก พร้อมช่างผู้เชี่ยวชาญเตรียมอะไหล่รอ</p>
  <a href="${targetUrl}" class="inline-flex items-center justify-center min-h-[44px] px-8 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm shadow-lg transition-transform hover:scale-105">
    ${btnText}
  </a>
</div>`.trim();
});

// 3. [price_calculator]
add_shortcode("price_calculator", (atts, _content, _tag) => {
  const device = escapeHtml(String(atts.device || "สมาร์ตโฟน"));
  const discount = escapeHtml(String(atts.discount || ""));

  return `
<div class="fixme-shortcode fixme-estimator my-4 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 text-white max-w-xl mx-auto shadow-xl">
  <div class="flex items-center justify-between mb-3">
    <span class="text-sm font-bold text-white">ประเมินราคาซ่อม: ${device}</span>
    ${discount ? `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-slate-950">ลด ${discount}.-</span>` : ""}
  </div>
  <p class="text-xs text-slate-400 mb-4">ตรวจเช็คค่าบริการเปลี่ยนจอ แบตเตอรี่ และซ่อมบอร์ดฟรี</p>
  <a href="#estimate" class="inline-flex items-center justify-center w-full min-h-[44px] py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors">
    คำนวณราคาประเมินเบื้องต้น
  </a>
</div>`.trim();
});

// 4. [contact_card]
add_shortcode("contact_card", (atts, _content, _tag, context) => {
  const phone = escapeHtml(String(atts.phone || context?.phone || "081-234-5678"));
  const lineId = escapeHtml(String(atts.line || context?.lineId || "@fixmeshop"));
  const address = escapeHtml(String(atts.address || "ศูนย์บริการซ่อมมาตรฐาน"));

  return `
<div class="fixme-shortcode fixme-contact-card my-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 text-white max-w-xl mx-auto shadow-xl space-y-3">
  <div class="text-xs text-slate-400 flex items-center gap-2">
    <span>📍</span>
    <span>${address}</span>
  </div>
  <div class="flex flex-wrap items-center gap-3 pt-2">
    <a href="tel:${phone.replace(/[^\d+]/g, "")}" class="inline-flex items-center justify-center min-h-[44px] px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white transition-colors">
      📞 โทร: ${phone}
    </a>
    <a href="https://line.me/R/ti/p/${encodeURIComponent(lineId.startsWith("@") ? lineId : `@${lineId}`)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center min-h-[44px] px-5 py-2 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-xs font-semibold text-white shadow-md transition-colors">
      💬 LINE: ${lineId}
    </a>
  </div>
</div>`.trim();
});

// 5. [shop_hours]
add_shortcode("shop_hours", (atts, _content, _tag) => {
  const open = escapeHtml(String(atts.open || "09:00"));
  const close = escapeHtml(String(atts.close || "19:30"));
  const showStatus = atts.show_status !== "false" && atts.show_status !== false;

  return `
<div class="fixme-shortcode fixme-hours-widget my-4 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 text-white max-w-xl mx-auto shadow-xl">
  <div class="flex items-center justify-between">
    <span class="text-sm font-bold text-white">เวลาเปิดให้บริการ</span>
    ${showStatus ? `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-800"><span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>เปิดให้บริการ</span>` : ""}
  </div>
  <p class="text-xs text-slate-300 mt-2">วันจันทร์ - วันอาทิตย์: ${open} - ${close} น.</p>
</div>`.trim();
});
