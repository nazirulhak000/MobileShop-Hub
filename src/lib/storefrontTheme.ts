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

export interface StorefrontConfigData {
  id?: string;
  tenantId?: string;
  themeColor: StorefrontThemeColor;
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
  customBeforeAfterCases?: string | null;
  customPricingRates?: string | null;
  customFaqs?: string | null;
}

export const DEFAULT_STOREFRONT_CONFIG: StorefrontConfigData = {
  themeColor: "emerald",
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
