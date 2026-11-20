/**
 * WordPress Multilingual Gettext i18n Engine (Round 59)
 *
 * Reverse-engineers WordPress core Gettext internationalization architecture:
 * - `__` (translate)
 * - `_e` (translate & echo)
 * - `_n` (pluralized translation)
 * - `_x` (translate with context)
 * - `load_textdomain` / `unload_textdomain`
 * - `switch_to_locale` / `restore_previous_locale` / `get_locale` / `determine_locale`
 * - Multi-language support for Thai (`th-TH`) and English (`en-US`)
 * - Storefront content translation & language switcher helpers
 */

export interface LocaleDefinition {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  direction: "ltr" | "rtl";
}

export interface PluralRule {
  (n: number): number;
}

export interface TranslationDictionary {
  [msgid: string]: string | [string, string];
}

export interface ContextDictionary {
  [context: string]: TranslationDictionary;
}

export interface DomainCatalog {
  [locale: string]: {
    messages: TranslationDictionary;
    contexts?: ContextDictionary;
  };
}

// Supported core storefront locales
export const SUPPORTED_LOCALES: Record<string, LocaleDefinition> = {
  "th-TH": {
    code: "th-TH",
    name: "Thai",
    nativeName: "ไทย",
    flag: "🇹🇭",
    direction: "ltr",
  },
  "en-US": {
    code: "en-US",
    name: "English",
    nativeName: "English",
    flag: "🇺🇸",
    direction: "ltr",
  },
};

// Default fallback locale
export const DEFAULT_LOCALE = "th-TH";

// Core storefront dictionary (FixMe repair domain)
const CORE_TRANSLATIONS: DomainCatalog = {
  "th-TH": {
    messages: {
      "Book a Repair": "จองคิวซ่อม",
      "Track Status": "ติดตามสถานะงานซ่อม",
      "Check Repair Status": "ตรวจสอบสถานะงานซ่อม",
      "Shop Hours": "เวลาทำการ",
      "Services": "บริการของเรา",
      "All Services": "บริการทั้งหมด",
      "Contact Us": "ติดต่อเรา",
      "Reviews": "รีวิวจากลูกค้า",
      "Warranty": "การรับประกัน",
      "Device": "อุปกรณ์",
      "Estimated Cost": "ประเมินราคา",
      "Call Now": "โทรเลย",
      "Branches": "สาขาที่ให้บริการ",
      "Free Diagnostics": "ตรวจเช็คสภาพเครื่องฟรี",
      "Certified Technicians": "ช่างซ่อมมืออาชีพมาตรฐานสากล",
      "Original Quality Parts": "อะไหล่แท้มาตรฐานศูนย์",
      "Quick Turnaround": "ซ่อมด่วนรอรับได้",
      "Read More": "อ่านเพิ่มเติม",
      "Search": "ค้นหา",
      "%d day warranty": ["%d วันรับประกัน", "%d วันรับประกัน"],
      "%d device repaired": ["ซ่อมแล้ว %d เครื่อง", "ซ่อมแล้ว %d เครื่อง"],
    },
    contexts: {
      action: {
        Save: "บันทึกข้อมูล",
        Back: "ย้อนกลับ",
        Submit: "ส่งข้อมูล",
      },
      noun: {
        Save: "การประหยัด",
        Back: "ด้านหลัง",
        Post: "บทความ",
      },
    },
  },
  "en-US": {
    messages: {
      "จองคิวซ่อม": "Book a Repair",
      "ติดตามสถานะงานซ่อม": "Track Repair Status",
      "ตรวจสอบสถานะงานซ่อม": "Check Repair Status",
      "เวลาทำการ": "Shop Hours",
      "บริการของเรา": "Our Services",
      "บริการทั้งหมด": "All Services",
      "ติดต่อเรา": "Contact Us",
      "รีวิวจากลูกค้า": "Customer Reviews",
      "การรับประกัน": "Warranty",
      "อุปกรณ์": "Device",
      "ประเมินราคา": "Estimated Cost",
      "โทรเลย": "Call Now",
      "สาขาที่ให้บริการ": "Our Branches",
      "ตรวจเช็คสภาพเครื่องฟรี": "Free Diagnostics",
      "ช่างซ่อมมืออาชีพมาตรฐานสากล": "Certified Technicians",
      "อะไหล่แท้มาตรฐานศูนย์": "Original Quality Parts",
      "ซ่อมด่วนรอรับได้": "Quick Turnaround",
      "อ่านเพิ่มเติม": "Read More",
      "ค้นหา": "Search",
      "%d day warranty": ["%d day warranty", "%d days warranty"],
      "%d device repaired": ["%d device repaired", "%d devices repaired"],
    },
    contexts: {
      action: {
        Save: "Save Changes",
        Back: "Go Back",
        Submit: "Submit Form",
      },
      noun: {
        Save: "Savings",
        Back: "Back",
        Post: "Blog Post",
      },
    },
  },
};

// Domain registration store: domain -> DomainCatalog
const textDomains: Map<string, DomainCatalog> = new Map([["default", CORE_TRANSLATIONS]]);

// Active locale state & history stack
let currentLocale: string = DEFAULT_LOCALE;
const localeStack: string[] = [];

/**
 * Normalizes locale code (e.g. "th" -> "th-TH", "en" -> "en-US")
 */
export function normalizeLocale(locale: string): string {
  if (!locale || typeof locale !== "string") return DEFAULT_LOCALE;
  const lower = locale.toLowerCase().replace(/_/g, "-");
  if (lower.startsWith("th")) return "th-TH";
  if (lower.startsWith("en")) return "en-US";
  return SUPPORTED_LOCALES[locale] ? locale : DEFAULT_LOCALE;
}

/**
 * Gets the active locale (WordPress `get_locale`).
 */
export function get_locale(): string {
  return currentLocale;
}

/**
 * Switches the current locale to a new one, pushing previous onto stack (WordPress `switch_to_locale`).
 */
export function switch_to_locale(locale: string): boolean {
  const norm = normalizeLocale(locale);
  localeStack.push(currentLocale);
  currentLocale = norm;
  return true;
}

/**
 * Restores the previous locale from the stack (WordPress `restore_previous_locale`).
 */
export function restore_previous_locale(): string {
  if (localeStack.length > 0) {
    currentLocale = localeStack.pop()!;
  } else {
    currentLocale = DEFAULT_LOCALE;
  }
  return currentLocale;
}

/**
 * Determines current locale based on URL parameters, path prefixes, or Accept-Language headers.
 */
export function determine_locale(hint?: string): string {
  if (!hint) return currentLocale;

  // 1. Query parameter: ?lang=en or ?locale=th-TH
  const queryMatch = hint.match(/[?&](?:lang|locale)=([a-zA-Z-]+)/i);
  if (queryMatch && queryMatch[1]) {
    return normalizeLocale(queryMatch[1]);
  }

  // 2. URL Path prefix: /en/store or /th/store
  const pathMatch = hint.match(/^\/([a-zA-Z]{2}(?:-[a-zA-Z]{2})?)(?:\/|$)/);
  if (pathMatch && pathMatch[1]) {
    return normalizeLocale(pathMatch[1]);
  }

  // 3. Accept-Language header
  if (hint.includes(",") || hint.includes(";")) {
    const primary = hint.split(",")[0].trim().split(";")[0].trim();
    return normalizeLocale(primary);
  }

  return normalizeLocale(hint);
}

/**
 * Loads a textdomain's translations into memory (WordPress `load_textdomain`).
 */
export function load_textdomain(
  domain: string,
  catalog: {
    locale: string;
    messages: TranslationDictionary;
    contexts?: ContextDictionary;
  }
): boolean {
  if (!domain || typeof domain !== "string" || !catalog?.locale) return false;
  const normLoc = normalizeLocale(catalog.locale);

  let domObj = textDomains.get(domain);
  if (!domObj) {
    domObj = {};
    textDomains.set(domain, domObj);
  }

  if (!domObj[normLoc]) {
    domObj[normLoc] = { messages: {}, contexts: {} };
  }

  Object.assign(domObj[normLoc].messages, catalog.messages);
  if (catalog.contexts) {
    domObj[normLoc].contexts = domObj[normLoc].contexts || {};
    for (const [ctx, mapping] of Object.entries(catalog.contexts)) {
      domObj[normLoc].contexts![ctx] = {
        ...(domObj[normLoc].contexts![ctx] || {}),
        ...mapping,
      };
    }
  }

  return true;
}

/**
 * Unloads a textdomain from memory (WordPress `unload_textdomain`).
 */
export function unload_textdomain(domain: string): boolean {
  return textDomains.delete(domain);
}

/**
 * Translates a single text string (WordPress `__`).
 */
export function __(text: string, domain: string = "default"): string {
  if (!text || typeof text !== "string") return "";

  const dom = textDomains.get(domain);
  if (dom && dom[currentLocale]?.messages?.[text]) {
    const val = dom[currentLocale].messages[text];
    return typeof val === "string" ? val : val[0];
  }

  // Fallback to default domain if custom domain doesn't match
  if (domain !== "default") {
    const defDom = textDomains.get("default");
    if (defDom && defDom[currentLocale]?.messages?.[text]) {
      const val = defDom[currentLocale].messages[text];
      return typeof val === "string" ? val : val[0];
    }
  }

  return text;
}

/**
 * Translates and outputs a string (WordPress `_e`).
 */
export function _e(text: string, domain: string = "default"): string {
  const translated = __(text, domain);
  return translated;
}

/**
 * Translates plural strings depending on number (WordPress `_n`).
 */
export function _n(
  single: string,
  plural: string,
  count: number,
  domain: string = "default"
): string {
  const n = Math.abs(Number(count) || 0);
  const dom = textDomains.get(domain) || textDomains.get("default");

  const entry = dom?.[currentLocale]?.messages?.[single];
  let formatString = n === 1 ? single : plural;

  if (Array.isArray(entry)) {
    // In Thai, plural index is usually always 0 (no plural inflection)
    const isThai = currentLocale.startsWith("th");
    const idx = isThai ? 0 : n === 1 ? 0 : 1;
    formatString = entry[idx] || entry[0];
  } else if (typeof entry === "string") {
    formatString = entry;
  }

  return formatString.replace(/%d/g, String(n));
}

/**
 * Translates string with disambiguating context (WordPress `_x`).
 */
export function _x(
  text: string,
  context: string,
  domain: string = "default"
): string {
  const dom = textDomains.get(domain) || textDomains.get("default");
  const ctxVal = dom?.[currentLocale]?.contexts?.[context]?.[text];
  if (typeof ctxVal === "string") {
    return ctxVal;
  }
  return __(text, domain);
}

/**
 * Retrieves all registered locales with metadata.
 */
export function get_available_locales(): LocaleDefinition[] {
  return Object.values(SUPPORTED_LOCALES);
}

/**
 * Helper to build interactive language switcher data for React header components.
 */
export function renderLanguageSwitcher(
  current: string,
  currentUrlPath: string = "/"
): {
  currentLocale: string;
  options: Array<{
    code: string;
    label: string;
    flag: string;
    url: string;
    isActive: boolean;
  }>;
} {
  const normCurrent = normalizeLocale(current);
  const cleanPath = currentUrlPath.split("?")[0];
  const search = currentUrlPath.includes("?") ? currentUrlPath.substring(currentUrlPath.indexOf("?")) : "";

  const options = Object.values(SUPPORTED_LOCALES).map((loc) => {
    const urlObj = new URL(cleanPath, "https://fixme.local");
    if (search) {
      new URLSearchParams(search).forEach((v, k) => urlObj.searchParams.set(k, v));
    }
    urlObj.searchParams.set("lang", loc.code === "th-TH" ? "th" : "en");

    return {
      code: loc.code,
      label: loc.nativeName,
      flag: loc.flag,
      url: `${urlObj.pathname}${urlObj.search}`,
      isActive: loc.code === normCurrent,
    };
  });

  return {
    currentLocale: normCurrent,
    options,
  };
}
