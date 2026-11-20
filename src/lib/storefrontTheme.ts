export type StorefrontThemeColor = "emerald" | "cyan" | "blue" | "purple" | "amber" | "rose";

export interface ThemePalette {
  id: StorefrontThemeColor;
  label: string;
  labelEn: string;
  hex: string;
  primary: string;
  gradient: string;
  gradientText: string;
  button: string;
  primaryButton: string;
  primaryButtonHover: string;
  badge: {
    bg: string;
    text: string;
    border: string;
    radarPing: string;
    radarDot: string;
    lightBg: string;
    lightText: string;
    lightBorder: string;
  };
  radar: {
    ping: string;
    dot: string;
    sweep: string;
    shadow: string;
  };
  announcement: {
    bg: string;
    text: string;
    border: string;
    badgeBg: string;
    badgeText: string;
  };
  accentText: string;
  accentBorder: string;
  accentBg: string;
  accentRing: string;
  iconColor: string;
  glowBg: string;
  lightBg: string;
  lightText: string;
  lightBorder: string;
  darkBg: string;
  darkBorder: string;
  radarSweep: string;
  radarShadow: string;
  activePill: string;
  activeTile: string;
}

export const THEME_PALETTES: Record<StorefrontThemeColor, ThemePalette> = {
  emerald: {
    id: "emerald",
    label: "เขียวมรกต (Emerald Green)",
    labelEn: "Emerald",
    hex: "#10b981",
    primary: "#10b981",
    gradient: "from-emerald-400 via-teal-300 to-cyan-400",
    gradientText: "from-emerald-400 via-teal-300 to-cyan-400",
    button: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20",
    primaryButton: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20",
    primaryButtonHover: "hover:bg-emerald-500",
    badge: {
      bg: "bg-emerald-950/80",
      text: "text-emerald-300",
      border: "border-emerald-800/80",
      radarPing: "bg-emerald-400",
      radarDot: "bg-emerald-500",
      lightBg: "bg-emerald-50",
      lightText: "text-emerald-900",
      lightBorder: "border-emerald-200",
    },
    radar: {
      ping: "bg-emerald-400",
      dot: "bg-emerald-500",
      sweep: "via-emerald-400",
      shadow: "#10b981",
    },
    announcement: {
      bg: "bg-emerald-950",
      text: "text-emerald-200",
      border: "border-emerald-800/60",
      badgeBg: "bg-emerald-900/90",
      badgeText: "text-emerald-200",
    },
    accentText: "text-emerald-400",
    accentBorder: "border-emerald-500/40",
    accentBg: "bg-emerald-500/10",
    accentRing: "focus-visible:ring-emerald-500",
    iconColor: "text-emerald-400",
    glowBg: "bg-emerald-500/10",
    lightBg: "bg-emerald-50",
    lightText: "text-emerald-900",
    lightBorder: "border-emerald-200",
    darkBg: "bg-emerald-950",
    darkBorder: "border-emerald-800",
    radarSweep: "via-emerald-400",
    radarShadow: "#10b981",
    activePill: "bg-emerald-600 text-white border-emerald-400 shadow-sm",
    activeTile: "bg-emerald-500 border-emerald-300 text-slate-950 font-bold shadow-[0_0_8px_#10b981]",
  },
  cyan: {
    id: "cyan",
    label: "ฟ้าไซแอน (Cyber Cyan)",
    labelEn: "Cyan",
    hex: "#06b6d4",
    primary: "#06b6d4",
    gradient: "from-cyan-400 via-sky-300 to-blue-400",
    gradientText: "from-cyan-400 via-sky-300 to-blue-400",
    button: "bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/20",
    primaryButton: "bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/20",
    primaryButtonHover: "hover:bg-cyan-500",
    badge: {
      bg: "bg-cyan-950/80",
      text: "text-cyan-300",
      border: "border-cyan-800/80",
      radarPing: "bg-cyan-400",
      radarDot: "bg-cyan-500",
      lightBg: "bg-cyan-50",
      lightText: "text-cyan-900",
      lightBorder: "border-cyan-200",
    },
    radar: {
      ping: "bg-cyan-400",
      dot: "bg-cyan-500",
      sweep: "via-cyan-400",
      shadow: "#06b6d4",
    },
    announcement: {
      bg: "bg-cyan-950",
      text: "text-cyan-200",
      border: "border-cyan-800/60",
      badgeBg: "bg-cyan-900/90",
      badgeText: "text-cyan-200",
    },
    accentText: "text-cyan-400",
    accentBorder: "border-cyan-500/40",
    accentBg: "bg-cyan-500/10",
    accentRing: "focus-visible:ring-cyan-500",
    iconColor: "text-cyan-400",
    glowBg: "bg-cyan-500/10",
    lightBg: "bg-cyan-50",
    lightText: "text-cyan-900",
    lightBorder: "border-cyan-200",
    darkBg: "bg-cyan-950",
    darkBorder: "border-cyan-800",
    radarSweep: "via-cyan-400",
    radarShadow: "#06b6d4",
    activePill: "bg-cyan-600 text-white border-cyan-400 shadow-sm",
    activeTile: "bg-cyan-500 border-cyan-300 text-slate-950 font-bold shadow-[0_0_8px_#06b6d4]",
  },
  blue: {
    id: "blue",
    label: "น้ำเงินรอยัล (Royal Blue)",
    labelEn: "Blue",
    hex: "#3b82f6",
    primary: "#3b82f6",
    gradient: "from-blue-400 via-indigo-300 to-cyan-400",
    gradientText: "from-blue-400 via-indigo-300 to-cyan-400",
    button: "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20",
    primaryButton: "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20",
    primaryButtonHover: "hover:bg-blue-500",
    badge: {
      bg: "bg-blue-950/80",
      text: "text-blue-300",
      border: "border-blue-800/80",
      radarPing: "bg-blue-400",
      radarDot: "bg-blue-500",
      lightBg: "bg-blue-50",
      lightText: "text-blue-900",
      lightBorder: "border-blue-200",
    },
    radar: {
      ping: "bg-blue-400",
      dot: "bg-blue-500",
      sweep: "via-blue-400",
      shadow: "#3b82f6",
    },
    announcement: {
      bg: "bg-blue-950",
      text: "text-blue-200",
      border: "border-blue-800/60",
      badgeBg: "bg-blue-900/90",
      badgeText: "text-blue-200",
    },
    accentText: "text-blue-400",
    accentBorder: "border-blue-500/40",
    accentBg: "bg-blue-500/10",
    accentRing: "focus-visible:ring-blue-500",
    iconColor: "text-blue-400",
    glowBg: "bg-blue-500/10",
    lightBg: "bg-blue-50",
    lightText: "text-blue-900",
    lightBorder: "border-blue-200",
    darkBg: "bg-blue-950",
    darkBorder: "border-blue-800",
    radarSweep: "via-blue-400",
    radarShadow: "#3b82f6",
    activePill: "bg-blue-600 text-white border-blue-400 shadow-sm",
    activeTile: "bg-blue-500 border-blue-300 text-slate-950 font-bold shadow-[0_0_8px_#3b82f6]",
  },
  purple: {
    id: "purple",
    label: "ม่วงอุลตร้า (Ultra Purple)",
    labelEn: "Purple",
    hex: "#a855f7",
    primary: "#a855f7",
    gradient: "from-purple-400 via-violet-300 to-indigo-400",
    gradientText: "from-purple-400 via-violet-300 to-indigo-400",
    button: "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/20",
    primaryButton: "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/20",
    primaryButtonHover: "hover:bg-purple-500",
    badge: {
      bg: "bg-purple-950/80",
      text: "text-purple-300",
      border: "border-purple-800/80",
      radarPing: "bg-purple-400",
      radarDot: "bg-purple-500",
      lightBg: "bg-purple-50",
      lightText: "text-purple-900",
      lightBorder: "border-purple-200",
    },
    radar: {
      ping: "bg-purple-400",
      dot: "bg-purple-500",
      sweep: "via-purple-400",
      shadow: "#a855f7",
    },
    announcement: {
      bg: "bg-purple-950",
      text: "text-purple-200",
      border: "border-purple-800/60",
      badgeBg: "bg-purple-900/90",
      badgeText: "text-purple-200",
    },
    accentText: "text-purple-400",
    accentBorder: "border-purple-500/40",
    accentBg: "bg-purple-500/10",
    accentRing: "focus-visible:ring-purple-500",
    iconColor: "text-purple-400",
    glowBg: "bg-purple-500/10",
    lightBg: "bg-purple-50",
    lightText: "text-purple-900",
    lightBorder: "border-purple-200",
    darkBg: "bg-purple-950",
    darkBorder: "border-purple-800",
    radarSweep: "via-purple-400",
    radarShadow: "#a855f7",
    activePill: "bg-purple-600 text-white border-purple-400 shadow-sm",
    activeTile: "bg-purple-500 border-purple-300 text-slate-950 font-bold shadow-[0_0_8px_#a855f7]",
  },
  amber: {
    id: "amber",
    label: "ส้มอำพัน (Amber Gold)",
    labelEn: "Amber",
    hex: "#f59e0b",
    primary: "#f59e0b",
    gradient: "from-amber-400 via-yellow-300 to-orange-400",
    gradientText: "from-amber-400 via-yellow-300 to-orange-400",
    button: "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/20",
    primaryButton: "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/20",
    primaryButtonHover: "hover:bg-amber-500",
    badge: {
      bg: "bg-amber-950/80",
      text: "text-amber-300",
      border: "border-amber-800/80",
      radarPing: "bg-amber-400",
      radarDot: "bg-amber-500",
      lightBg: "bg-amber-50",
      lightText: "text-amber-900",
      lightBorder: "border-amber-200",
    },
    radar: {
      ping: "bg-amber-400",
      dot: "bg-amber-500",
      sweep: "via-amber-400",
      shadow: "#f59e0b",
    },
    announcement: {
      bg: "bg-amber-950",
      text: "text-amber-200",
      border: "border-amber-800/60",
      badgeBg: "bg-amber-900/90",
      badgeText: "text-amber-200",
    },
    accentText: "text-amber-400",
    accentBorder: "border-amber-500/40",
    accentBg: "bg-amber-500/10",
    accentRing: "focus-visible:ring-amber-500",
    iconColor: "text-amber-400",
    glowBg: "bg-amber-500/10",
    lightBg: "bg-amber-50",
    lightText: "text-amber-900",
    lightBorder: "border-amber-200",
    darkBg: "bg-amber-950",
    darkBorder: "border-amber-800",
    radarSweep: "via-amber-400",
    radarShadow: "#f59e0b",
    activePill: "bg-amber-600 text-white border-amber-400 shadow-sm",
    activeTile: "bg-amber-500 border-amber-300 text-slate-950 font-bold shadow-[0_0_8px_#f59e0b]",
  },
  rose: {
    id: "rose",
    label: "ชมพูกุหลาบ (Crimson Rose)",
    labelEn: "Rose",
    hex: "#f43f5e",
    primary: "#f43f5e",
    gradient: "from-rose-400 via-pink-300 to-red-400",
    gradientText: "from-rose-400 via-pink-300 to-red-400",
    button: "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/20",
    primaryButton: "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/20",
    primaryButtonHover: "hover:bg-rose-500",
    badge: {
      bg: "bg-rose-950/80",
      text: "text-rose-300",
      border: "border-rose-800/80",
      radarPing: "bg-rose-400",
      radarDot: "bg-rose-500",
      lightBg: "bg-rose-50",
      lightText: "text-rose-900",
      lightBorder: "border-rose-200",
    },
    radar: {
      ping: "bg-rose-400",
      dot: "bg-rose-500",
      sweep: "via-rose-400",
      shadow: "#f43f5e",
    },
    announcement: {
      bg: "bg-rose-950",
      text: "text-rose-200",
      border: "border-rose-800/60",
      badgeBg: "bg-rose-900/90",
      badgeText: "text-rose-200",
    },
    accentText: "text-rose-400",
    accentBorder: "border-rose-500/40",
    accentBg: "bg-rose-500/10",
    accentRing: "focus-visible:ring-rose-500",
    iconColor: "text-rose-400",
    glowBg: "bg-rose-500/10",
    lightBg: "bg-rose-50",
    lightText: "text-rose-900",
    lightBorder: "border-rose-200",
    darkBg: "bg-rose-950",
    darkBorder: "border-rose-800",
    radarSweep: "via-rose-400",
    radarShadow: "#f43f5e",
    activePill: "bg-rose-600 text-white border-rose-400 shadow-sm",
    activeTile: "bg-rose-500 border-rose-300 text-slate-950 font-bold shadow-[0_0_8px_#f43f5e]",
  },
};

export type StorefrontFontFamily = "anuphan" | "prompt" | "sarabun" | "mitr" | "kanit" | "inter";

export const ALLOWED_FONT_FAMILIES: readonly StorefrontFontFamily[] = [
  "anuphan",
  "prompt",
  "sarabun",
  "mitr",
  "kanit",
  "inter",
];

export const FONT_FAMILY_CONFIG: Record<
  StorefrontFontFamily,
  { id: StorefrontFontFamily; label: string; googleFont: string; fontFamily: string; className: string }
> = {
  anuphan: {
    id: "anuphan",
    label: "อนุพันธ์ (Anuphan - ค่าเริ่มต้น/อ่านง่าย)",
    googleFont: "Anuphan:wght@300;400;500;600;700",
    fontFamily: "'Anuphan', sans-serif",
    className: "font-anuphan",
  },
  prompt: {
    id: "prompt",
    label: "พร้อมท์ (Prompt - โมเดิร์นทันสมัย)",
    googleFont: "Prompt:wght@300;400;500;600;700",
    fontFamily: "'Prompt', sans-serif",
    className: "font-prompt",
  },
  sarabun: {
    id: "sarabun",
    label: "สารบรรณ (Sarabun - ทางการมาตรฐาน)",
    googleFont: "Sarabun:wght@300;400;500;600;700",
    fontFamily: "'Sarabun', sans-serif",
    className: "font-sarabun",
  },
  mitr: {
    id: "mitr",
    label: "มิตร (Mitr - มินิมอลอบอุ่น)",
    googleFont: "Mitr:wght@300;400;500;600",
    fontFamily: "'Mitr', sans-serif",
    className: "font-mitr",
  },
  kanit: {
    id: "kanit",
    label: "คณิต (Kanit - พรีเมียมหนักแน่น)",
    googleFont: "Kanit:wght@300;400;500;600;700",
    fontFamily: "'Kanit', sans-serif",
    className: "font-kanit",
  },
  inter: {
    id: "inter",
    label: "อินเตอร์ (Inter - สากลเรียบหรู)",
    googleFont: "Inter:wght@300;400;500;600;700",
    fontFamily: "'Inter', sans-serif",
    className: "font-inter",
  },
};

export type HeroLayoutType = "split" | "centered" | "banner";

export const ALLOWED_HERO_LAYOUTS: readonly HeroLayoutType[] = [
  "split",
  "centered",
  "banner",
];

export const HERO_LAYOUT_OPTIONS: Record<HeroLayoutType, { id: HeroLayoutType; label: string; description: string }> = {
  split: {
    id: "split",
    label: "แบบแยกซ้ายขวา (Split Columns)",
    description: "ข้อความและปุ่มแอ็กชันด้านซ้าย พร้อมเครื่องมือสแกนเนอร์/ภาพประกอบทางวิศวกรรมด้านขวา",
  },
  centered: {
    id: "centered",
    label: "แบบกึ่งกลางโดดเด่น (Centered Hero)",
    description: "เน้นหัวข้อและสโลแกนตรงกลาง จัดวางเรียบหรู เหมาะกับร้านค้าที่มีภาพลักษณ์มินิมอลพรีเมียม",
  },
  banner: {
    id: "banner",
    label: "แบบภาพแบนเนอร์กว้าง (Fullwidth Banner)",
    description: "แบนเนอร์ภาพกราฟิกขนาดใหญ่เต็มความกว้างพร้อมกล่องข้อความโปรโมชันซ้อนทับ",
  },
};

export type CustomBlockType =
  | "promo_banner"
  | "photo_gallery"
  | "video_embed"
  | "rich_text"
  | "cta"
  | "html_embed"
  | "business_hours"
  | string;

export interface CustomBlock {
  id: string;
  type: CustomBlockType;
  title?: string;
  subtitle?: string;
  content?: string;
  badge?: string;
  buttonText?: string;
  buttonUrl?: string;
  imageUrl?: string;
  images?: Array<string | { url: string; caption?: string }>;
  videoUrl?: string;
  videoType?: "youtube" | "tiktok" | "mp4" | string;
  html?: string;
  columns?: number;
  align?: "left" | "center" | "right";
  hours?: Array<{ day: string; open: string; close: string; isClosed?: boolean }>;
  enabled?: boolean;
  order?: number;
  metadata?: Record<string, any>;
  [key: string]: any;
}

export interface CustomPage {
  id?: string;
  slug: string;
  title: string;
  subtitle?: string;
  content?: string;
  sections?: CustomBlock[];
  metaDescription?: string;
  published?: boolean;
  updatedAt?: string;
}

export interface NavigationMenuItem {
  id?: string;
  label: string;
  href: string;
  isExternal?: boolean;
  icon?: string;
}

export interface FooterSocialLinks {
  facebook?: string;
  tiktok?: string;
  instagram?: string;
  youtube?: string;
  line?: string;
}

export const DEFAULT_SECTIONS_ORDER: string[] = [
  "hero",
  "services",
  "tracking",
  "inspection",
  "estimator",
  "reviews",
  "location",
  "faq",
];

export const DEFAULT_CUSTOM_PAGES: CustomPage[] = [
  {
    id: "page-about",
    slug: "about",
    title: "เกี่ยวกับศูนย์บริการ",
    subtitle: "ทีมช่างผู้ชำนาญการ เครื่องมือมาตรฐานแล็บ อะไหล่แท้ตรงรุ่น",
    content: "ศูนย์บริการซ่อมสมาร์ตโฟนครบวงจร ดำเนินงานโดยวิศวกรและช่างอิเล็กทรอนิกส์มืออาชีพ พร้อมห้องแล็บปลอดฝุ่นและเครื่องมือวัดทางวิศวกรรมระดับสูง",
    sections: [],
    published: true,
  },
  {
    id: "page-warranty",
    slug: "warranty",
    title: "นโยบายการรับประกัน",
    subtitle: "การรับประกันงานซ่อมและเปลี่ยนอะไหล่สูงสุด 1 ปีเต็ม",
    content: "งานซ่อมทุกชิ้นผ่านการตรวจสอบ 10 จุดตามมาตรฐาน QC และมีบัตรรับประกันอิเล็กทรอนิกส์ ตรวจสอบสถานะและประวัติการซ่อมได้ตลอด 24 ชั่วโมง",
    sections: [],
    published: true,
  },
];

export const DEFAULT_NAV_MENU: NavigationMenuItem[] = [
  { id: "nav-services", label: "บริการซ่อม", href: "#services", isExternal: false },
  { id: "nav-track", label: "ติดตามสถานะ", href: "#track-search", isExternal: false },
  { id: "nav-inspection", label: "ตรวจเช็ค 10 จุด", href: "#inspection", isExternal: false },
  { id: "nav-estimate", label: "ประเมินราคา", href: "#estimate", isExternal: false },
  { id: "nav-reviews", label: "ผลงานซ่อม", href: "#reviews", isExternal: false },
  { id: "nav-location", label: "ที่ตั้งร้าน", href: "#location", isExternal: false },
  { id: "nav-faq", label: "คำถามพบบ่อย", href: "#faq", isExternal: false },
];

export interface StorefrontConfigData {
  id?: string;
  tenantId?: string;
  themeColor: StorefrontThemeColor;
  fontFamily?: StorefrontFontFamily;
  heroLayout?: HeroLayoutType;
  headline: string;
  subheadline: string;
  badge: string;
  announcementText: string;
  announcementEnabled: boolean;
  phone: string;
  lineId: string;
  lineQrUrl: string;
  googleMapsUrl: string;
  showLiveTracking: boolean;
  showHardwareScanner: boolean;
  showServicesBento: boolean;
  showInspectionBench: boolean;
  showPriceEstimator: boolean;
  showBeforeAfterSlider: boolean;
  showCustomerReviews: boolean;
  showLocationSection: boolean;
  showFaqSection: boolean;
  showMobileQuickBar: boolean;
  sectionsOrder?: string | null;
  customSections?: string | null;
  customPages?: string | null;
  navigationMenu?: string | null;
  footerSocialLinks?: string | null;
  customBeforeAfterCases?: string | null;
  customPricingRates?: string | null;
  customFaqs?: string | null;
}

export const DEFAULT_STOREFRONT_CONFIG: StorefrontConfigData = {
  themeColor: "emerald",
  fontFamily: "anuphan",
  heroLayout: "split",
  headline: "บริการซ่อมมือถือด่วนมาตรฐานแล็บ รอรับใน 30 นาที พร้อมระบบ Live Tracking ตรวจสอบได้ 24 ชั่วโมง",
  subheadline:
    "ศูนย์บริการซ่อมสมาร์ตโฟนด้วยเครื่องมือวัดทางวิศวกรรมอิเล็กทรอนิกส์ ตรวจสอบประวัติเครื่องและเลข IMEI 15 หลัก พร้อมระบบ Live Tracking บันทึกภาพถ่ายขั้นตอนซ่อมจริงทุกระยะ ตรวจเช็ควิเคราะห์อาการ 10 จุดก่อนซ่อมโดยไม่มีค่าเปิดเครื่อง",
  badge: "ศูนย์บริการซ่อมมาตรฐานแล็บ",
  announcementText: "🎉 พิเศษ! ตรวจเช็คสภาพเครื่อง 10 จุดฟรี ไม่มีค่าใช้จ่าย พร้อมรับประกันงานซ่อมสูงสุด 1 ปีเต็ม",
  announcementEnabled: true,
  phone: "",
  lineId: "",
  lineQrUrl: "",
  googleMapsUrl: "",
  showLiveTracking: true,
  showHardwareScanner: true,
  showServicesBento: true,
  showInspectionBench: true,
  showPriceEstimator: true,
  showBeforeAfterSlider: true,
  showCustomerReviews: true,
  showLocationSection: true,
  showFaqSection: true,
  showMobileQuickBar: true,
  sectionsOrder: JSON.stringify(DEFAULT_SECTIONS_ORDER),
  customSections: "[]",
  customPages: JSON.stringify(DEFAULT_CUSTOM_PAGES),
  navigationMenu: JSON.stringify(DEFAULT_NAV_MENU),
  footerSocialLinks: "{}",
  customBeforeAfterCases: "",
  customPricingRates: "",
  customFaqs: "",
};

// Safe JSON parser utilities to guarantee zero crashes on corrupted database inputs
export function safeParseJson<T>(raw: unknown, fallback: T): T {
  if (raw === null || raw === undefined || raw === "") return fallback;
  if (typeof raw === "object") return raw as T;
  if (typeof raw !== "string") return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed !== null && parsed !== undefined ? (parsed as T) : fallback;
  } catch (_) {
    return fallback;
  }
}

export const DEFAULT_BEFORE_IMAGE = "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=900&auto=format&fit=crop&q=80";
export const DEFAULT_AFTER_IMAGE = "https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=900&auto=format&fit=crop&q=80";

export function safeParseBeforeAfterCases(raw: unknown): any[] | null {
  const parsed = safeParseJson<unknown>(raw, null);
  if (!Array.isArray(parsed) || parsed.length === 0) return null;

  const sanitized = parsed
    .filter((item): item is Record<string, any> => Boolean(item && typeof item === "object"))
    .map((item, idx) => ({
      id: String(item.id || `case-${idx + 1}`),
      device: String(item.device || "สมาร์ตโฟน (ซ่อมเปลี่ยนอะไหล่)"),
      issue: String(item.issue || "อาการตรวจเช็คแรกเข้า"),
      repairSolution: String(item.repairSolution || "ดำเนินการเปลี่ยนอะไหล่แท้มาตรฐานโรงงาน"),
      repairTime: String(item.repairTime || "30 นาที"),
      warranty: String(item.warranty || "รับประกัน 90 วัน"),
      beforeImg: String(item.beforeImg || item.beforeImage || item.beforeUrl || DEFAULT_BEFORE_IMAGE),
      beforeDesc: String(item.beforeDesc || item.beforeDescription || "สภาพก่อนเข้ารับบริการซ่อม"),
      afterImg: String(item.afterImg || item.afterImage || item.afterUrl || DEFAULT_AFTER_IMAGE),
      afterDesc: String(item.afterDesc || item.afterDescription || "สภาพหลังการซ่อมแซมและผ่าน QC 100%"),
      pins: Array.isArray(item.pins)
        ? item.pins
            .filter((p: any) => Boolean(p && typeof p === "object"))
            .map((p: any, pIdx: number) => ({
              id: String(p.id || `pin-${pIdx}`),
              x: typeof p.x === "number" ? Math.max(0, Math.min(100, p.x)) : 50,
              y: typeof p.y === "number" ? Math.max(0, Math.min(100, p.y)) : 50,
              title: String(p.title || "จุดตรวจสอบวิศวกรรม"),
              detail: String(p.detail || "ผ่านเกณฑ์มาตรฐานการตรวจสอบ"),
              category: ["before", "after", "both"].includes(p.category) ? p.category : "both",
            }))
        : [],
    }));

  return sanitized.length > 0 ? sanitized : null;
}

export function safeParsePricingRates(raw: unknown): any[] | null {
  const parsed = safeParseJson<unknown>(raw, null);
  if (!Array.isArray(parsed) || parsed.length === 0) return null;

  const sanitized = parsed
    .filter((item): item is Record<string, any> => Boolean(item && typeof item === "object"))
    .map((item, idx) => {
      const rawPrice = item.basePrice !== undefined ? item.basePrice : item.price;
      const num = typeof rawPrice === "number" ? rawPrice : parseFloat(String(rawPrice || "").replace(/,/g, ""));
      const basePrice = !isNaN(num) && num > 0 ? num : 990;

      return {
        id: String(item.id || `rate-${idx + 1}`),
        name: String(item.name || item.service || item.title || "บริการซ่อมบำรุง"),
        badge: String(item.badge || "มาตรฐานศูนย์"),
        basePrice,
        timeEst: String(item.timeEst || item.time || "30 นาที"),
      };
    });

  return sanitized.length > 0 ? sanitized : null;
}

export function safeParseFaqs(raw: unknown): any[] | null {
  const parsed = safeParseJson<unknown>(raw, null);
  if (!Array.isArray(parsed) || parsed.length === 0) return null;

  const sanitized = parsed
    .filter((item): item is Record<string, any> => Boolean(item && typeof item === "object"))
    .map((item, idx) => ({
      id: String(item.id || `faq-${idx + 1}`),
      question: String(item.question || item.q || item.title || "คำถามพบบ่อย"),
      answer: String(item.answer || item.a || item.detail || "คำตอบทางเทคนิคจากทีมช่าง"),
      highlight: item.highlight ? String(item.highlight) : undefined,
    }));

  return sanitized.length > 0 ? sanitized : null;
}

export function safeParseSectionsOrder(raw: unknown): string[] {
  const parsed = safeParseJson<unknown>(raw, null);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return [...DEFAULT_SECTIONS_ORDER];
  }

  const list = parsed
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);

  return list.length > 0 ? list : [...DEFAULT_SECTIONS_ORDER];
}

export function safeParseCustomSections(raw: unknown): CustomBlock[] {
  const parsed = safeParseJson<unknown>(raw, null);
  if (!Array.isArray(parsed) || parsed.length === 0) return [];

  return parsed
    .filter((item): item is Record<string, any> => Boolean(item && typeof item === "object"))
    .map((item, idx) => {
      const id = String(item.id || `block-${idx + 1}-${Date.now()}`);
      const type = String(item.type || "promo_banner").toLowerCase();

      let images: Array<string | { url: string; caption?: string }> | undefined;
      if (Array.isArray(item.images)) {
        images = item.images
          .filter(Boolean)
          .map((img: any) => {
            if (typeof img === "string") return img.trim();
            if (typeof img === "object" && img.url) {
              return {
                url: String(img.url).trim(),
                caption: img.caption ? String(img.caption).trim() : undefined,
              };
            }
            return null;
          })
          .filter(Boolean) as Array<string | { url: string; caption?: string }>;
      }

      let hours: Array<{ day: string; open: string; close: string; isClosed?: boolean }> | undefined;
      if (Array.isArray(item.hours)) {
        hours = item.hours
          .filter((h: any) => Boolean(h && typeof h === "object"))
          .map((h: any) => ({
            day: String(h.day || ""),
            open: String(h.open || "09:00"),
            close: String(h.close || "19:00"),
            isClosed: Boolean(h.isClosed),
          }));
      }

      return {
        ...item,
        id,
        type,
        title: item.title ? String(item.title).slice(0, 300) : undefined,
        subtitle: item.subtitle ? String(item.subtitle).slice(0, 500) : undefined,
        content: item.content ? String(item.content).slice(0, 50000) : undefined,
        badge: item.badge ? String(item.badge).slice(0, 100) : undefined,
        buttonText: item.buttonText ? String(item.buttonText).slice(0, 100) : undefined,
        buttonUrl: item.buttonUrl ? String(item.buttonUrl).slice(0, 1000) : undefined,
        imageUrl: item.imageUrl ? String(item.imageUrl).slice(0, 2000) : undefined,
        images,
        videoUrl: item.videoUrl ? String(item.videoUrl).slice(0, 1000) : undefined,
        videoType: item.videoType ? String(item.videoType).slice(0, 50) : undefined,
        html: item.html ? String(item.html).slice(0, 50000) : undefined,
        columns: typeof item.columns === "number" ? Math.max(1, Math.min(6, item.columns)) : undefined,
        align: ["left", "center", "right"].includes(item.align) ? item.align : undefined,
        hours,
        enabled: item.enabled !== undefined ? Boolean(item.enabled) : true,
        order: typeof item.order === "number" ? item.order : idx,
      };
    });
}

export function safeParseCustomPages(raw: unknown): CustomPage[] {
  const parsed = safeParseJson<unknown>(raw, null);
  if (!Array.isArray(parsed) || parsed.length === 0) return [];

  return parsed
    .filter((item): item is Record<string, any> => Boolean(item && typeof item === "object"))
    .map((item, idx) => {
      const rawSlug = String(item.slug || `page-${idx + 1}`)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      const slug = rawSlug || `page-${idx + 1}`;

      return {
        id: String(item.id || `custom-page-${idx + 1}`),
        slug,
        title: String(item.title || "หน้าใหม่").slice(0, 200),
        subtitle: item.subtitle ? String(item.subtitle).slice(0, 500) : undefined,
        content: item.content ? String(item.content).slice(0, 50000) : undefined,
        sections: safeParseCustomSections(item.sections),
        metaDescription: item.metaDescription ? String(item.metaDescription).slice(0, 300) : undefined,
        published: item.published !== undefined ? Boolean(item.published) : true,
        updatedAt: item.updatedAt ? String(item.updatedAt) : undefined,
      };
    });
}

export function safeParseNavMenu(raw: unknown): NavigationMenuItem[] {
  const parsed = safeParseJson<unknown>(raw, null);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return [...DEFAULT_NAV_MENU];
  }

  const items = parsed
    .filter((item): item is Record<string, any> => Boolean(item && typeof item === "object"))
    .map((item, idx) => ({
      id: String(item.id || `nav-${idx + 1}`),
      label: String(item.label || item.title || "เมนู").slice(0, 100),
      href: String(item.href || item.url || "#").slice(0, 500),
      isExternal: Boolean(item.isExternal),
      icon: item.icon ? String(item.icon).slice(0, 50) : undefined,
    }))
    .filter((item) => Boolean(item.label && item.href));

  return items.length > 0 ? items : [...DEFAULT_NAV_MENU];
}

export function safeParseSocialLinks(raw: unknown): FooterSocialLinks {
  const parsed = safeParseJson<unknown>(raw, null);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {};
  }

  const obj = parsed as Record<string, any>;
  const cleanUrl = (val: unknown) => (typeof val === "string" && val.trim() ? val.trim().slice(0, 500) : undefined);

  return {
    facebook: cleanUrl(obj.facebook),
    tiktok: cleanUrl(obj.tiktok),
    instagram: cleanUrl(obj.instagram),
    youtube: cleanUrl(obj.youtube),
    line: cleanUrl(obj.line),
  };
}
