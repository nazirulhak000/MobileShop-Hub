export type StorefrontThemeColor = "emerald" | "cyan" | "blue" | "purple" | "amber" | "rose";

export interface ThemePalette {
  id: StorefrontThemeColor;
  label: string;
  labelEn: string;
  hex: string;
  gradientText: string;
  primaryButton: string;
  primaryButtonHover: string;
  badge: {
    bg: string;
    text: string;
    border: string;
    radarPing: string;
    radarDot: string;
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
}

export const THEME_PALETTES: Record<StorefrontThemeColor, ThemePalette> = {
  emerald: {
    id: "emerald",
    label: "เขียวมรกต (Emerald Green)",
    labelEn: "Emerald",
    hex: "#10b981",
    gradientText: "from-emerald-400 via-teal-300 to-cyan-400",
    primaryButton: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20",
    primaryButtonHover: "hover:bg-emerald-500",
    badge: {
      bg: "bg-emerald-950/80",
      text: "text-emerald-300",
      border: "border-emerald-800/80",
      radarPing: "bg-emerald-400",
      radarDot: "bg-emerald-500",
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
  },
  cyan: {
    id: "cyan",
    label: "ฟ้าไซแอน (Cyber Cyan)",
    labelEn: "Cyan",
    hex: "#06b6d4",
    gradientText: "from-cyan-400 via-sky-300 to-blue-400",
    primaryButton: "bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/20",
    primaryButtonHover: "hover:bg-cyan-500",
    badge: {
      bg: "bg-cyan-950/80",
      text: "text-cyan-300",
      border: "border-cyan-800/80",
      radarPing: "bg-cyan-400",
      radarDot: "bg-cyan-500",
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
  },
  blue: {
    id: "blue",
    label: "น้ำเงินรอยัล (Royal Blue)",
    labelEn: "Blue",
    hex: "#3b82f6",
    gradientText: "from-blue-400 via-indigo-300 to-cyan-400",
    primaryButton: "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20",
    primaryButtonHover: "hover:bg-blue-500",
    badge: {
      bg: "bg-blue-950/80",
      text: "text-blue-300",
      border: "border-blue-800/80",
      radarPing: "bg-blue-400",
      radarDot: "bg-blue-500",
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
  },
  purple: {
    id: "purple",
    label: "ม่วงอุลตร้า (Ultra Purple)",
    labelEn: "Purple",
    hex: "#a855f7",
    gradientText: "from-purple-400 via-violet-300 to-indigo-400",
    primaryButton: "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/20",
    primaryButtonHover: "hover:bg-purple-500",
    badge: {
      bg: "bg-purple-950/80",
      text: "text-purple-300",
      border: "border-purple-800/80",
      radarPing: "bg-purple-400",
      radarDot: "bg-purple-500",
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
  },
  amber: {
    id: "amber",
    label: "ส้มอำพัน (Amber Gold)",
    labelEn: "Amber",
    hex: "#f59e0b",
    gradientText: "from-amber-400 via-yellow-300 to-orange-400",
    primaryButton: "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/20",
    primaryButtonHover: "hover:bg-amber-500",
    badge: {
      bg: "bg-amber-950/80",
      text: "text-amber-300",
      border: "border-amber-800/80",
      radarPing: "bg-amber-400",
      radarDot: "bg-amber-500",
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
  },
  rose: {
    id: "rose",
    label: "ชมพูกุหลาบ (Crimson Rose)",
    labelEn: "Rose",
    hex: "#f43f5e",
    gradientText: "from-rose-400 via-pink-300 to-red-400",
    primaryButton: "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/20",
    primaryButtonHover: "hover:bg-rose-500",
    badge: {
      bg: "bg-rose-950/80",
      text: "text-rose-300",
      border: "border-rose-800/80",
      radarPing: "bg-rose-400",
      radarDot: "bg-rose-500",
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
  customBeforeAfterCases?: string;
  customPricingRates?: string;
  customFaqs?: string;
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
