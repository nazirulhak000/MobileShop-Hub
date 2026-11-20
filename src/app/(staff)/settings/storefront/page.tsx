"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Palette,
  Megaphone,
  Layers,
  PhoneCall,
  Sliders,
  Monitor,
  Tablet,
  Smartphone,
  ExternalLink,
  Save,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Copy,
  Check,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  HelpCircle,
  MapPin,
  Plus,
  Trash2,
  RefreshCw,
  Lock,
  X,
  GripVertical,
  ChevronUp,
  ChevronDown,
  FileText,
  Layout,
  Type,
  Menu,
  Edit3,
  Image,
  Video,
  Clock,
  Code,
  Share2,
  Compass,
  Search,
  FilePlus,
  CornerDownRight,
  ChevronRight,
} from "lucide-react";

import { AnnouncementBar } from "@/components/landing/AnnouncementBar";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { LandingHero } from "@/components/landing/LandingHero";
import { ServicesBento } from "@/components/landing/ServicesBento";
import { LiveTrackingShowcase } from "@/components/landing/LiveTrackingShowcase";
import { InspectionStandard } from "@/components/landing/InspectionStandard";
import { PriceEstimator } from "@/components/landing/PriceEstimator";
import { CustomerReviews, BeforeAfterCase, BEFORE_AFTER_CASES } from "@/components/landing/CustomerReviews";
import { ShopLocation } from "@/components/landing/ShopLocation";
import { LandingFaq } from "@/components/landing/LandingFaq";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { MobileQuickBar } from "@/components/landing/MobileQuickBar";
import { DynamicBlockRenderer } from "@/components/landing/blocks/DynamicBlockRenderer";

import {
  DEFAULT_STOREFRONT_CONFIG,
  StorefrontConfigData,
  StorefrontThemeColor,
  StorefrontFontFamily,
  HeroLayoutType,
  THEME_PALETTES,
  ALLOWED_FONT_FAMILIES,
  FONT_FAMILY_CONFIG,
  ALLOWED_HERO_LAYOUTS,
  HERO_LAYOUT_OPTIONS,
  CustomBlock,
  CustomPage,
  NavigationMenuItem,
  DEFAULT_SECTIONS_ORDER,
  DEFAULT_CUSTOM_PAGES,
  DEFAULT_NAV_MENU,
  safeParseBeforeAfterCases,
  safeParseCustomPages,
  safeParseCustomSections,
  safeParseSectionsOrder,
  safeParseNavMenu,
} from "@/lib/storefrontTheme";

type ActiveTab =
  | "theme"
  | "blocks"
  | "pages"
  | "navigation"
  | "announcement"
  | "contact"
  | "cases";

type ViewportMode = "desktop" | "tablet" | "mobile";

interface ToastState {
  message: string;
  type: "success" | "error" | "warning";
}

/**
 * Validate HTTP/HTTPS URLs
 */
function isValidHttpUrl(str: string): boolean {
  if (!str || !str.trim()) return true;
  try {
    const url = new URL(str.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Standard Home Page Sections Catalog
 */
interface StandardSectionMeta {
  id: string;
  name: string;
  desc: string;
  toggleKey?: keyof StorefrontConfigData;
  icon: React.ElementType;
}

const STANDARD_SECTIONS: StandardSectionMeta[] = [
  { id: "hero", name: "Hero Header", desc: "ส่วนพาดหัวหลักและปุ่มนำทาง", icon: Sparkles },
  { id: "services", name: "Services Bento Grid", desc: "การ์ดแสดง 6 บริการหลักของร้าน", toggleKey: "showServicesBento", icon: Layers },
  { id: "tracking", name: "Live Tracking Lookup", desc: "กล่องค้นหาติดตามสถานะงานซ่อมสด", toggleKey: "showLiveTracking", icon: Search },
  { id: "inspection", name: "10-Point Inspection Bench", desc: "แท่นทดสอบจำลองเครื่องมือวัดทางวิศวกรรม", toggleKey: "showInspectionBench", icon: CheckCircle2 },
  { id: "estimator", name: "Price Estimator", desc: "ระบบประเมินราคาซ่อมตามรุ่นและอาการ", toggleKey: "showPriceEstimator", icon: Sliders },
  { id: "reviews", name: "Before & After Slider & Reviews", desc: "ตัวเลื่อนเปรียบเทียบก่อน-หลังซ่อมและรีวิว", toggleKey: "showBeforeAfterSlider", icon: Sparkles },
  { id: "location", name: "Store Location & Maps", desc: "ที่ตั้งสาขา เวลาเปิดทำการ และแผนที่", toggleKey: "showLocationSection", icon: MapPin },
  { id: "faq", name: "Technical FAQ", desc: "กล่องคำถามพบบ่อย", toggleKey: "showFaqSection", icon: HelpCircle },
];

/**
 * Block Library Templates
 */
interface BlockTemplate {
  type: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  desc: string;
  sample: Partial<CustomBlock>;
}

const BLOCK_TEMPLATES: BlockTemplate[] = [
  {
    type: "promo_banner",
    title: "แบนเนอร์โปรโมชั่น (Promo Banner)",
    subtitle: "แบนเนอร์ข้อเสนอพิเศษพร้อมปุ่ม Action ด่วน",
    icon: Sparkles,
    desc: "เหมาะสำหรับโปรโมชั่นลดราคา แจกโค้ดส่วนลด หรือแคมเปญตรวจเช็คฟรีประจำเดือน",
    sample: {
      type: "promo_banner",
      title: "🎉 โปรโมชั่นเปลี่ยนแบตเตอรี่แท้ ลดทันที 200 บาท",
      subtitle: "รับประกันสุขภาพแบต 100% มาตรฐาน มอก. พร้อมตรวจเช็คระบบไฟฟรี 10 จุด",
      badge: "โปรโมชั่นจำกัดเวลา",
      buttonText: "แอด LINE จองคิวรับสิทธิ์",
      buttonUrl: "https://line.me",
      bgType: "gradient",
      discountTag: "ลด 200.-",
      expiryNotice: "สิทธิ์จำกัด 50 ท่านแรกของเดือนนี้",
      visible: true,
    },
  },
  {
    type: "photo_gallery",
    title: "แกลเลอรีภาพผลงาน (Photo Gallery)",
    subtitle: "กริดแสดงภาพผลงานการซ่อมหรือบรรยากาศร้าน 2-4 คอลัมน์",
    icon: Image,
    desc: "โชว์ห้องแล็บปลอดฝุ่น เครื่องมือวัดทางวิศวกรรม หรือรูปงานซ่อมบอร์ดไอซี",
    sample: {
      type: "photo_gallery",
      title: "บรรยากาศห้องแล็บ & ผลงานงานซ่อมจริง",
      subtitle: "ภาพถ่ายเครื่องมือวัดทางวิศวกรรมและงานซ่อมระดับไมโครอิเล็กทรอนิกส์",
      columns: 3,
      images: [
        { url: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=800", caption: "งานซ่อมบอร์ดไอซีระดับไมโคร" },
        { url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800", caption: "เครื่องเลเซอร์แยกฝาหลังมาตรฐานโรงงาน" },
        { url: "https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=800", caption: "การตรวจเช็คหน้าจอด้วยเครื่องวัดสี True Tone" },
      ],
      visible: true,
    },
  },
  {
    type: "video_embed",
    title: "วิดีโอแนะนำร้าน (Video Embed)",
    subtitle: "วิดีโอ YouTube หรือคลิปสั้นขั้นตอนการซ่อม",
    icon: Video,
    desc: "สร้างความน่าเชื่อถือด้วยวิดีโอพาชมร้าน หรืออธิบายอาการเสียยอดนิยม",
    sample: {
      type: "video_embed",
      title: "วิดีโอแนะนำขั้นตอนการซ่อมมาตรฐานแล็บ",
      description: "ชมขั้นตอนการตรวจวิเคราะห์อาการ 10 จุดและการซ่อมในห้องแล็บปลอดฝุ่น",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      platform: "youtube",
      aspectRatio: "16:9",
      visible: true,
    },
  },
  {
    type: "rich_text",
    title: "บทความข้อความ (Rich Text Article)",
    subtitle: "ส่วนเนื้อหาบทความ ประวัติร้าน หรือรายละเอียดเชิงลึก",
    icon: FileText,
    desc: "เหมาะสำหรับแสดงประวัติร้าน นโยบายความปลอดภัยของข้อมูล หรือบทความทางเทคนิค",
    sample: {
      type: "rich_text",
      title: "มาตรฐานการบริการและความปลอดภัยของข้อมูลลูกค้า",
      subtitle: "ทำไมลูกค้ากว่า 10,000 รายจึงไว้วางใจให้เราดูแลสมาร์ตโฟนเครื่องสำคัญ",
      badge: "ความปลอดภัยระดับ 100%",
      content:
        "เราให้ความสำคัญสูงสุดกับความเป็นส่วนตัวของข้อมูล (Data Privacy Guarantee) ช่างทุกคนปฏิบัติตามมาตรฐาน QC อย่างเคร่งครัด ไม่เปิดดูรูปถ่าย ไม่เข้าถึงแชตหรือข้อมูลส่วนตัวในแอพธนาคาร ลูกค้าสามารถนั่งรอดูการทำงานของช่างผ่านกระจกห้องแล็บได้ตลอดขั้นตอน พร้อมระบบบันทึกภาพถ่ายการซ่อม Live Tracking ตรวจสอบได้แบบเรียลไทม์",
      align: "left",
      visible: true,
    },
  },
  {
    type: "cta",
    title: "ป้ายติดต่อด่วน (Call to Action)",
    subtitle: "แบนเนอร์กระตุ้นการติดต่อทางโทรศัพท์หรือ LINE",
    icon: PhoneCall,
    desc: "ป้ายแถบสีสดใสสำหรับปิดการขาย สอบถามอาการ หรือเชิญชวนส่งเครื่องมาซ่อม",
    sample: {
      type: "cta",
      title: "ต้องการปรึกษาอาการเสียกับช่างผู้ชำนาญการ?",
      subtitle: "สอบถามประเมินราคาเบื้องต้นฟรี ไม่มีค่าเปิดเครื่อง ทัก LINE หรือโทรหาเราได้ทันที",
      badge: "ปรึกษาฟรี ไม่มีค่าเปิดเครื่อง",
      customButtonText: "แชตสอบถามทาง LINE",
      customButtonUrl: "https://line.me",
      secondaryButtonText: "โทรปรึกษาช่าง",
      secondaryButtonUrl: "tel:0812345678",
      benefits: ["ตรวจเช็ค 10 จุดฟรี", "อะไหล่แท้ตรงรุ่น รับประกันสูงสุด 1 ปี", "รอรับเครื่องใน 30 นาที"],
      visible: true,
    },
  },
  {
    type: "business_hours",
    title: "เวลาเปิดให้บริการ (Business Hours)",
    subtitle: "ตารางเวลาเปิด-ปิดร้าน 7 วัน พร้อมป้ายเปิด/ปิดสด",
    icon: Clock,
    desc: "แจ้งเวลาเปิดทำการ วันหยุดประจำสัปดาห์ และวันหยุดนักขัตฤกษ์ให้ลูกค้าทราบชัดเจน",
    sample: {
      type: "business_hours",
      title: "เวลาเปิดให้บริการ (Operating Hours)",
      subtitle: "เปิดให้บริการทุกวัน มีที่จอดรถสะดวกสบายหน้าร้าน พร้อมห้องรับรองปรับอากาศ",
      schedule: [
        { day: "วันจันทร์ - วันศุกร์", hours: "09:00 - 20:00", isOpen: true },
        { day: "วันเสาร์ - วันอาทิตย์", hours: "10:00 - 19:00", isOpen: true },
        { day: "วันหยุดนักขัตฤกษ์", hours: "10:00 - 18:00", isOpen: true },
      ],
      emergencyNote: "กรณีฉุกเฉินนอกเวลาทำการ สามารถติดต่อผ่าน LINE Official Account ได้ตลอด 24 ชั่วโมง",
      showLiveStatus: true,
      visible: true,
    },
  },
  {
    type: "html_embed",
    title: "โค้ด HTML / วิดเจ็ต (HTML / Widget)",
    subtitle: "แทรกโค้ด HTML, แผนที่ Google หรือวิดเจ็ตโซเชียลภายนอก",
    icon: Code,
    desc: "สำหรับผู้ใช้งานขั้นสูงที่ต้องการฝัง iframe แผนที่ภายนอก หรือโค้ดตกแต่งพิเศษ",
    sample: {
      type: "html_embed",
      title: "วิดเจ็ตแสดงผลเพิ่มเติม",
      subtitle: "ส่วนแสดงผลปรับแต่งพิเศษสำหรับร้านค้า",
      html: '<div style="padding: 24px; text-align: center; background: linear-gradient(135deg, #0f172a, #1e293b); color: white; border-radius: 16px;"><h3 style="font-weight: bold; font-size: 18px; margin-bottom: 8px;">ศูนย์บริการซ่อมมาตรฐาน ISO / Lab Grade</h3><p style="color: #94a3b8; font-size: 13px;">เครื่องมือวัดมาตรฐานสูง บุคลากรผ่านการอบรมจากศูนย์บริการสากล</p></div>',
      height: 180,
      visible: true,
    },
  },
];

export default function StorefrontCustomizerPage() {
  const [config, setConfig] = useState<StorefrontConfigData>(DEFAULT_STOREFRONT_CONFIG);
  const [initialConfig, setInitialConfig] = useState<StorefrontConfigData | null>(null);

  const [shopName, setShopName] = useState<string>("MobileShop");
  const [initialShopName, setInitialShopName] = useState<string>("MobileShop");

  const [shopSlug, setShopSlug] = useState<string>("mobileshop");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("theme");
  const [viewport, setViewport] = useState<ViewportMode>("desktop");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<boolean>(false);
  const [storeOrigin, setStoreOrigin] = useState<string>("");

  // Multi-Page state
  const [customPagesList, setCustomPagesList] = useState<CustomPage[]>(DEFAULT_CUSTOM_PAGES);
  const [initialCustomPagesList, setInitialCustomPagesList] = useState<CustomPage[]>(DEFAULT_CUSTOM_PAGES);
  const [selectedPageSlug, setSelectedPageSlug] = useState<string>(""); // "" = Home page

  // Modular Blocks & Order state
  const [sectionsOrder, setSectionsOrder] = useState<string[]>(DEFAULT_SECTIONS_ORDER);
  const [initialSectionsOrder, setInitialSectionsOrder] = useState<string[]>(DEFAULT_SECTIONS_ORDER);
  const [customSectionsList, setCustomSectionsList] = useState<CustomBlock[]>([]);
  const [initialCustomSectionsList, setInitialCustomSectionsList] = useState<CustomBlock[]>([]);

  // Navigation Menu state
  const [navMenuList, setNavMenuList] = useState<NavigationMenuItem[]>(DEFAULT_NAV_MENU);
  const [initialNavMenuList, setInitialNavMenuList] = useState<NavigationMenuItem[]>(DEFAULT_NAV_MENU);

  // Custom Cases state
  const [casesList, setCasesList] = useState<BeforeAfterCase[]>(BEFORE_AFTER_CASES);
  const [initialCasesList, setInitialCasesList] = useState<BeforeAfterCase[]>(BEFORE_AFTER_CASES);

  // Modals & Drawers state
  const [isAddPageModalOpen, setIsAddPageModalOpen] = useState<boolean>(false);
  const [newPageTitle, setNewPageTitle] = useState<string>("");
  const [newPageSlug, setNewPageSlug] = useState<string>("");
  const [newPageSubtitle, setNewPageSubtitle] = useState<string>("");
  const [newPageContent, setNewPageContent] = useState<string>("");

  const [isAddBlockModalOpen, setIsAddBlockModalOpen] = useState<boolean>(false);
  const [editingBlock, setEditingBlock] = useState<CustomBlock | null>(null);

  const [isAddNavModalOpen, setIsAddNavModalOpen] = useState<boolean>(false);
  const [newNavLabel, setNewNavLabel] = useState<string>("");
  const [newNavHref, setNewNavHref] = useState<string>("#services");
  const [newNavIsExternal, setNewNavIsExternal] = useState<boolean>(false);

  // Set browser origin on client mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setStoreOrigin(window.location.origin);
    }
  }, []);

  // Load configuration from API on mount
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch("/api/storefront/config");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.config) {
            const raw = data.config;
            const loadedConfig: StorefrontConfigData = {
              ...DEFAULT_STOREFRONT_CONFIG,
              ...raw,
              themeColor: (raw.themeColor as StorefrontThemeColor) || "emerald",
              fontFamily: (raw.fontFamily as StorefrontFontFamily) || "anuphan",
              heroLayout: (raw.heroLayout as HeroLayoutType) || "split",
            };
            setConfig(loadedConfig);
            setInitialConfig(loadedConfig);

            if (data.tenant) {
              if (data.tenant.name) {
                setShopName(data.tenant.name);
                setInitialShopName(data.tenant.name);
              }
              if (data.tenant.slug) setShopSlug(data.tenant.slug);
            }

            // Parse cases
            if (raw.customBeforeAfterCases) {
              const safeCases = safeParseBeforeAfterCases(raw.customBeforeAfterCases);
              if (safeCases && safeCases.length > 0) {
                setCasesList(safeCases);
                setInitialCasesList(safeCases);
              }
            }

            // Parse sections order
            if (raw.sectionsOrder) {
              const order = safeParseSectionsOrder(raw.sectionsOrder);
              if (order && order.length > 0) {
                setSectionsOrder(order);
                setInitialSectionsOrder(order);
              }
            }

            // Parse custom sections
            if (raw.customSections) {
              const sections = safeParseCustomSections(raw.customSections);
              setCustomSectionsList(sections);
              setInitialCustomSectionsList(sections);
            }

            // Parse custom pages
            if (raw.customPages) {
              const pages = safeParseCustomPages(raw.customPages);
              if (pages && pages.length > 0) {
                setCustomPagesList(pages);
                setInitialCustomPagesList(pages);
              }
            }

            // Parse navigation menu
            if (raw.navigationMenu) {
              const menu = safeParseNavMenu(raw.navigationMenu);
              if (menu && menu.length > 0) {
                setNavMenuList(menu);
                setInitialNavMenuList(menu);
              }
            }
          }
        } else {
          setToast({
            message: "ไม่สามารถดึงข้อมูลการตั้งค่าหน้าร้านได้ กรุณาลองใหม่อีกครั้ง",
            type: "error",
          });
        }
      } catch (err) {
        console.error("Failed to load storefront config:", err);
        setToast({
          message: "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์",
          type: "error",
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadConfig();
  }, []);

  // Unsaved changes check
  const isDirty = useMemo(() => {
    if (!initialConfig) return false;
    return (
      shopName.trim() !== initialShopName.trim() ||
      JSON.stringify(config) !== JSON.stringify(initialConfig) ||
      JSON.stringify(casesList) !== JSON.stringify(initialCasesList) ||
      JSON.stringify(sectionsOrder) !== JSON.stringify(initialSectionsOrder) ||
      JSON.stringify(customSectionsList) !== JSON.stringify(initialCustomSectionsList) ||
      JSON.stringify(customPagesList) !== JSON.stringify(initialCustomPagesList) ||
      JSON.stringify(navMenuList) !== JSON.stringify(initialNavMenuList)
    );
  }, [
    config,
    shopName,
    casesList,
    sectionsOrder,
    customSectionsList,
    customPagesList,
    navMenuList,
    initialConfig,
    initialShopName,
    initialCasesList,
    initialSectionsOrder,
    initialCustomSectionsList,
    initialCustomPagesList,
    initialNavMenuList,
  ]);

  // Prompt before navigating away if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Form Input Validation Rules
  const validationErrors = useMemo(() => {
    const errs: Record<string, string> = {};

    // 1. Shop Display Name
    const trimmedShopName = shopName.trim();
    if (!trimmedShopName) {
      errs.shopName = "กรุณาระบุชื่อร้านค้าที่แสดง (ไม่สามารถเว้นว่างได้)";
    } else if (trimmedShopName.length > 50) {
      errs.shopName = "ชื่อร้านค้าต้องมีความยาวไม่เกิน 50 ตัวอักษร";
    }

    // 2. Hero Headline
    const trimmedHeadline = config.headline?.trim() || "";
    if (trimmedHeadline.length < 5) {
      errs.headline = "ข้อความพาดหัวหลักต้องมีความยาวอย่างน้อย 5 ตัวอักษร";
    } else if (config.headline && config.headline.length > 150) {
      errs.headline = "ข้อความพาดหัวหลักต้องมีความยาวไม่เกิน 150 ตัวอักษร";
    }

    // 3. Hero Subheadline
    if (config.subheadline && config.subheadline.length > 300) {
      errs.subheadline = "ข้อความบรรยายประกอบต้องมีความยาวไม่เกิน 300 ตัวอักษร";
    }

    // 4. Hero Badge
    if (config.badge && config.badge.length > 50) {
      errs.badge = "ป้ายกำกับด้านบนต้องมีความยาวไม่เกิน 50 ตัวอักษร";
    }

    // 5. Announcement Text
    if (config.announcementEnabled) {
      const trimmedAnnounce = config.announcementText?.trim() || "";
      if (!trimmedAnnounce) {
        errs.announcementText = "เมื่อเปิดใช้งานแถบประกาศ กรุณาระบุข้อความประกาศ";
      } else if (config.announcementText && config.announcementText.length > 200) {
        errs.announcementText = "ข้อความประกาศต้องมีความยาวไม่เกิน 200 ตัวอักษร";
      }
    }

    // 6. Phone Number formatting
    if (config.phone && config.phone.trim()) {
      const digitsOnly = config.phone.replace(/[\s-]/g, "");
      const isThaiPhone = /^(0[2-9]\d{7,8}|\+66\d{8,9})$/.test(digitsOnly);
      if (!isThaiPhone) {
        errs.phone = "รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง (เช่น 081-234-5678 หรือ 02-123-4567)";
      }
    }

    // 7. LINE ID validation
    if (config.lineId && config.lineId.trim()) {
      if (/\s/.test(config.lineId)) {
        errs.lineId = "LINE Official Account ID ต้องไม่มีช่องว่าง";
      } else if (config.lineId.length > 30) {
        errs.lineId = "LINE ID ต้องมีความยาวไม่เกิน 30 ตัวอักษร";
      }
    }

    // 8. Google Maps URL validation
    if (config.googleMapsUrl && config.googleMapsUrl.trim()) {
      if (!isValidHttpUrl(config.googleMapsUrl)) {
        errs.googleMapsUrl = "กรุณาระบุ URL แผนที่ที่ถูกต้อง (ขึ้นต้นด้วย https:// หรือ http://)";
      }
    }

    // 9. Line QR Image URL validation
    if (config.lineQrUrl && config.lineQrUrl.trim()) {
      if (!isValidHttpUrl(config.lineQrUrl)) {
        errs.lineQrUrl = "กรุณาระบุ URL รูปภาพที่ถูกต้อง (ขึ้นต้นด้วย https:// หรือ http://)";
      }
    }

    // 10. Cases list validation
    casesList.forEach((c, idx) => {
      if (!c.device?.trim()) {
        errs[`case_${idx}_device`] = `เคสที่ ${idx + 1}: กรุณาระบุชื่อรุ่นอุปกรณ์`;
      }
    });

    return errs;
  }, [shopName, config, casesList]);

  // Tab errors grouping
  const tabErrors = useMemo(() => {
    return {
      theme: Boolean(
        validationErrors.shopName ||
          validationErrors.headline ||
          validationErrors.subheadline ||
          validationErrors.badge
      ),
      blocks: false,
      pages: false,
      navigation: false,
      announcement: Boolean(validationErrors.announcementText),
      contact: Boolean(
        validationErrors.phone ||
          validationErrors.lineId ||
          validationErrors.googleMapsUrl ||
          validationErrors.lineQrUrl
      ),
      cases: Object.keys(validationErrors).some((k) => k.startsWith("case_")),
    };
  }, [validationErrors]);

  const hasErrors = Object.keys(validationErrors).length > 0;

  // Active page resolution
  const activeSubPage = useMemo(() => {
    if (!selectedPageSlug) return null;
    return customPagesList.find((p) => p.slug === selectedPageSlug) || null;
  }, [selectedPageSlug, customPagesList]);

  // Handle Save
  const handleSave = async () => {
    if (hasErrors) {
      const firstError = Object.values(validationErrors)[0];
      setToast({
        message: `กรุณาแก้ไขข้อผิดพลาดก่อนบันทึก: ${firstError}`,
        type: "error",
      });

      if (tabErrors.theme) setActiveTab("theme");
      else if (tabErrors.announcement) setActiveTab("announcement");
      else if (tabErrors.contact) setActiveTab("contact");
      else if (tabErrors.cases) setActiveTab("cases");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...config,
        shopName: shopName.trim(),
        fontFamily: config.fontFamily || "anuphan",
        heroLayout: config.heroLayout || "split",
        sectionsOrder: JSON.stringify(sectionsOrder),
        customSections: JSON.stringify(customSectionsList),
        customPages: JSON.stringify(customPagesList),
        navigationMenu: JSON.stringify(navMenuList),
        customBeforeAfterCases: JSON.stringify(casesList),
      };

      const res = await fetch("/api/storefront/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setToast({ message: "บันทึกการตั้งค่าหน้าร้านเรียบร้อยแล้ว!", type: "success" });

        if (data.config) {
          const freshConfig: StorefrontConfigData = {
            ...DEFAULT_STOREFRONT_CONFIG,
            ...data.config,
            themeColor: (data.config.themeColor as StorefrontThemeColor) || "emerald",
            fontFamily: (data.config.fontFamily as StorefrontFontFamily) || "anuphan",
            heroLayout: (data.config.heroLayout as HeroLayoutType) || "split",
          };
          setConfig(freshConfig);
          setInitialConfig(freshConfig);
        }
        if (data.tenant?.name) {
          setShopName(data.tenant.name);
          setInitialShopName(data.tenant.name);
        }
        setInitialCasesList([...casesList]);
        setInitialSectionsOrder([...sectionsOrder]);
        setInitialCustomSectionsList([...customSectionsList]);
        setInitialCustomPagesList([...customPagesList]);
        setInitialNavMenuList([...navMenuList]);
      } else {
        setToast({
          message: data.error || `ไม่สามารถบันทึกข้อมูลได้ (รหัสสถานะ: ${res.status})`,
          type: "error",
        });
      }
    } catch (err) {
      console.error("Save error:", err);
      setToast({
        message: "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ กรุณาตรวจสอบอินเทอร์เน็ต",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to Defaults
  const handleResetDefaults = () => {
    if (
      window.confirm(
        "คุณต้องการรีเซ็ตการตั้งค่าธีม ส่วนประกอบ และเมนูกลับเป็นค่าเริ่มต้นมาตรฐานใช่หรือไม่?\n(การเปลี่ยนแปลงจะมีผลเมื่อคลิก 'บันทึกการเปลี่ยนแปลง')"
      )
    ) {
      setConfig({ ...DEFAULT_STOREFRONT_CONFIG });
      setCasesList([...BEFORE_AFTER_CASES]);
      setSectionsOrder([...DEFAULT_SECTIONS_ORDER]);
      setCustomSectionsList([]);
      setCustomPagesList([...DEFAULT_CUSTOM_PAGES]);
      setNavMenuList([...DEFAULT_NAV_MENU]);
      setSelectedPageSlug("");
      setToast({
        message: "รีเซ็ตค่าเป็นค่ามาตรฐานแล้ว (คลิก 'บันทึกการเปลี่ยนแปลง' เพื่อนำไปใช้จริง)",
        type: "success",
      });
    }
  };

  // Phone input formatting on blur
  const handlePhoneBlur = () => {
    if (!config.phone) return;
    const raw = config.phone.trim();
    const digits = raw.replace(/\D/g, "");
    if (digits.length === 10 && digits.startsWith("0")) {
      setConfig((prev) => ({
        ...prev,
        phone: `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`,
      }));
    } else if (digits.length === 9 && digits.startsWith("02")) {
      setConfig((prev) => ({
        ...prev,
        phone: `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5, 9)}`,
      }));
    } else if (digits.length === 9 && digits.startsWith("0")) {
      setConfig((prev) => ({
        ...prev,
        phone: `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}`,
      }));
    }
  };

  // Copy Store URL
  const copyStoreUrl = async (path = "") => {
    if (!shopSlug) return;
    const origin = storeOrigin || (typeof window !== "undefined" ? window.location.origin : "");
    const targetUrl = `${origin}/store/${shopSlug}${path ? `/${path.replace(/^\//, "")}` : ""}`;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(targetUrl);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = targetUrl;
        textArea.setAttribute("readonly", "");
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedSlug(true);
      setToast({ message: `คัดลอกลิงก์เรียบร้อย: ${targetUrl}`, type: "success" });
      setTimeout(() => setCopiedSlug(false), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
      setToast({ message: "ไม่สามารถคัดลอกลิงก์ได้ กรุณาคัดลอกด้วยตนเอง", type: "error" });
    }
  };

  // Section Reordering Helpers
  const moveSection = (idx: number, direction: "up" | "down") => {
    if (selectedPageSlug && activeSubPage) {
      // Reorder blocks within subpage
      const subBlocks = [...(activeSubPage.sections || [])];
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= subBlocks.length) return;
      const [moved] = subBlocks.splice(idx, 1);
      subBlocks.splice(targetIdx, 0, moved);

      setCustomPagesList((prev) =>
        prev.map((p) => (p.slug === selectedPageSlug ? { ...p, sections: subBlocks } : p))
      );
    } else {
      // Reorder home page sectionsOrder
      const current = [...sectionsOrder];
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= current.length) return;
      const [moved] = current.splice(idx, 1);
      current.splice(targetIdx, 0, moved);
      setSectionsOrder(current);
    }
  };

  // Toggle Section Visibility
  const toggleSectionVisibility = (secId: string) => {
    const std = STANDARD_SECTIONS.find((s) => s.id === secId);
    if (std && std.toggleKey) {
      setConfig((prev) => ({
        ...prev,
        [std.toggleKey!]: !prev[std.toggleKey!],
      }));
      return;
    }

    if (selectedPageSlug && activeSubPage) {
      // Custom subpage block visibility
      setCustomPagesList((prev) =>
        prev.map((p) => {
          if (p.slug !== selectedPageSlug) return p;
          const updatedSections = (p.sections || []).map((b) =>
            b.id === secId ? { ...b, visible: b.visible === false ? true : false } : b
          );
          return { ...p, sections: updatedSections };
        })
      );
    } else {
      // Home page custom block visibility
      setCustomSectionsList((prev) =>
        prev.map((b) => (b.id === secId ? { ...b, visible: b.visible === false ? true : false } : b))
      );
    }
  };

  // Add Block to active page or home
  const handleSelectTemplate = (template: BlockTemplate) => {
    const newId = `block_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newBlock: CustomBlock = {
      id: newId,
      ...template.sample,
      title: template.sample.title || template.title,
      type: template.type,
      visible: true,
    };

    if (selectedPageSlug && activeSubPage) {
      // Add to subpage
      setCustomPagesList((prev) =>
        prev.map((p) =>
          p.slug === selectedPageSlug
            ? { ...p, sections: [...(p.sections || []), newBlock] }
            : p
        )
      );
    } else {
      // Add to Home page
      setCustomSectionsList((prev) => [...prev, newBlock]);
      setSectionsOrder((prev) => [...prev, newId]);
    }

    setIsAddBlockModalOpen(false);
    setEditingBlock(newBlock);
    setToast({ message: `เพิ่มบล็อก "${template.title}" เรียบร้อยแล้ว`, type: "success" });
  };

  // Delete Custom Block
  const handleDeleteBlock = (blockId: string) => {
    if (!window.confirm("คุณต้องการลบบล็อกนี้ใช่หรือไม่?")) return;

    if (selectedPageSlug && activeSubPage) {
      setCustomPagesList((prev) =>
        prev.map((p) =>
          p.slug === selectedPageSlug
            ? { ...p, sections: (p.sections || []).filter((b) => b.id !== blockId) }
            : p
        )
      );
    } else {
      setCustomSectionsList((prev) => prev.filter((b) => b.id !== blockId));
      setSectionsOrder((prev) => prev.filter((id) => id !== blockId));
    }
    setToast({ message: "ลบบล็อกเรียบร้อยแล้ว", type: "success" });
  };

  // Save Editing Block
  const handleSaveBlockEdit = () => {
    if (!editingBlock) return;

    if (selectedPageSlug && activeSubPage) {
      setCustomPagesList((prev) =>
        prev.map((p) =>
          p.slug === selectedPageSlug
            ? {
                ...p,
                sections: (p.sections || []).map((b) =>
                  b.id === editingBlock.id ? editingBlock : b
                ),
              }
            : p
        )
      );
    } else {
      setCustomSectionsList((prev) =>
        prev.map((b) => (b.id === editingBlock.id ? editingBlock : b))
      );
    }
    setEditingBlock(null);
    setToast({ message: "บันทึกการแก้ไขบล็อกเรียบร้อยแล้ว", type: "success" });
  };

  // Add New Subpage
  const handleAddNewPage = () => {
    const trimmedTitle = newPageTitle.trim();
    const rawSlug = (newPageSlug.trim() || newPageTitle.trim())
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (!trimmedTitle) {
      window.alert("กรุณาระบุชื่อหน้าเพจ");
      return;
    }
    if (!rawSlug) {
      window.alert("กรุณาระบุ Slug ภาษาอังกฤษ (เช่น about, warranty, contact)");
      return;
    }

    // Check duplicate slug
    if (customPagesList.some((p) => p.slug === rawSlug)) {
      window.alert(`Slug "/${rawSlug}" ถูกใช้งานแล้ว กรุณาระบุชื่ออื่น`);
      return;
    }

    const newPage: CustomPage = {
      id: `page-${Date.now()}`,
      slug: rawSlug,
      title: trimmedTitle,
      subtitle: newPageSubtitle.trim() || undefined,
      content: newPageContent.trim() || undefined,
      sections: [],
      published: true,
    };

    setCustomPagesList((prev) => [...prev, newPage]);
    setSelectedPageSlug(rawSlug);
    setIsAddPageModalOpen(false);
    setNewPageTitle("");
    setNewPageSlug("");
    setNewPageSubtitle("");
    setNewPageContent("");

    setToast({ message: `สร้างหน้าใหม่ "/${rawSlug}" สำเร็จและสลับมายังหน้านี้แล้ว`, type: "success" });
  };

  // Delete Subpage
  const handleDeletePage = (pageSlug: string) => {
    const target = customPagesList.find((p) => p.slug === pageSlug);
    if (!target) return;
    if (window.confirm(`คุณต้องการลบหน้า "${target.title}" (/${target.slug}) ใช่หรือไม่?`)) {
      setCustomPagesList((prev) => prev.filter((p) => p.slug !== pageSlug));
      if (selectedPageSlug === pageSlug) {
        setSelectedPageSlug("");
      }
      setToast({ message: `ลบหน้า "/${pageSlug}" เรียบร้อยแล้ว`, type: "success" });
    }
  };

  // Navigation Menu Helpers
  const handleAddNavMenuItem = () => {
    const label = newNavLabel.trim();
    const href = newNavHref.trim();
    if (!label || !href) {
      window.alert("กรุณาระบุชื่อเมนูและลิงก์ปลายทาง");
      return;
    }

    const newItem: NavigationMenuItem = {
      id: `nav-${Date.now()}`,
      label,
      href,
      isExternal: newNavIsExternal,
    };

    setNavMenuList((prev) => [...prev, newItem]);
    setIsAddNavModalOpen(false);
    setNewNavLabel("");
    setNewNavHref("#services");
    setNewNavIsExternal(false);
    setToast({ message: `เพิ่มเมนู "${label}" เรียบร้อยแล้ว`, type: "success" });
  };

  const moveNavMenuItem = (idx: number, direction: "up" | "down") => {
    const current = [...navMenuList];
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= current.length) return;
    const [moved] = current.splice(idx, 1);
    current.splice(targetIdx, 0, moved);
    setNavMenuList(current);
  };

  const handleDeleteNavMenuItem = (idx: number) => {
    setNavMenuList((prev) => prev.filter((_, i) => i !== idx));
  };

  // Add sample case
  const handleAddNewCase = () => {
    const newCase: BeforeAfterCase = {
      id: `case-${Date.now()}`,
      device: "iPhone 15 Pro Max",
      issue: "กระจกหน้าจอแตกร้าว ทัชสกรีนไม่ตอบสนอง",
      repairSolution: "เปลี่ยนชุดหน้าจอแท้มาตรฐานโรงงาน พร้อมปรับจูน True Tone",
      repairTime: "30 นาที",
      warranty: "รับประกัน 90 วัน",
      beforeImg: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=900&auto=format&fit=crop&q=80",
      beforeDesc: "กระจกหน้าจอแตกร้าวละเอียด สัมผัสค้าง",
      afterImg: "https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=900&auto=format&fit=crop&q=80",
      afterDesc: "เปลี่ยนหน้าจอแท้ใหม่กริ๊บ ผ่าน QC 100%",
      pins: [],
    };
    setCasesList((prev) => [...prev, newCase]);
    setToast({ message: "เพิ่มเคสซ่อมตัวอย่างใหม่แล้ว", type: "success" });
  };

  const theme = THEME_PALETTES[config.themeColor] || THEME_PALETTES.emerald;
  const currentFont = FONT_FAMILY_CONFIG[config.fontFamily || "anuphan"] || FONT_FAMILY_CONFIG.anuphan;

  // Hidden navigation anchors
  const hiddenSections = useMemo(() => {
    const list: string[] = [];
    if (!config.showServicesBento) list.push("#services");
    if (!config.showLiveTracking) list.push("#track-search");
    if (!config.showInspectionBench) list.push("#inspection");
    if (!config.showPriceEstimator) list.push("#estimate");
    if (!config.showBeforeAfterSlider && !config.showCustomerReviews) list.push("#reviews");
    if (!config.showLocationSection) list.push("#location");
    if (!config.showFaqSection) list.push("#faq");
    return list;
  }, [
    config.showServicesBento,
    config.showLiveTracking,
    config.showInspectionBench,
    config.showPriceEstimator,
    config.showBeforeAfterSlider,
    config.showCustomerReviews,
    config.showLocationSection,
    config.showFaqSection,
  ]);

  // Current sections list in editor
  const currentDisplaySections = useMemo(() => {
    if (selectedPageSlug && activeSubPage) {
      return (activeSubPage.sections || []).map((block, idx) => ({
        id: block.id,
        isCustom: true,
        block,
        name: block.title || `บล็อก #${idx + 1}`,
        desc: `${block.type} - ปรับแต่งได้อิสระ`,
        visible: block.visible !== false,
      }));
    }

    return sectionsOrder.map((secId) => {
      const std = STANDARD_SECTIONS.find((s) => s.id === secId);
      if (std) {
        const isVisible = std.toggleKey ? Boolean(config[std.toggleKey]) : true;
        return {
          id: std.id,
          isCustom: false,
          name: std.name,
          desc: std.desc,
          visible: isVisible,
          icon: std.icon,
        };
      }
      const customBlock = customSectionsList.find((b) => b.id === secId);
      return {
        id: secId,
        isCustom: true,
        block: customBlock,
        name: customBlock?.title || `บล็อกพิเศษ (${secId})`,
        desc: customBlock?.type || "Custom Block",
        visible: customBlock?.visible !== false,
      };
    });
  }, [selectedPageSlug, activeSubPage, sectionsOrder, customSectionsList, config]);

  if (isLoading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-8 text-center space-y-4">
        <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
        <p className="text-sm text-slate-500 font-medium">กำลังโหลดเครื่องมือสร้างและปรับแต่งหน้าร้าน...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] min-h-[680px] bg-slate-100/70 -m-4 md:-m-6 lg:-m-8 select-none-safe">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-fade-in shadow-xl max-w-md">
          <div
            className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-xs sm:text-sm font-semibold border ${
              toast.type === "success"
                ? "bg-emerald-950 text-emerald-100 border-emerald-600 shadow-emerald-950/20"
                : toast.type === "warning"
                ? "bg-amber-950 text-amber-100 border-amber-600 shadow-amber-950/20"
                : "bg-rose-950 text-rose-100 border-rose-600 shadow-rose-950/20"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {toast.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : toast.type === "warning" ? (
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              )}
              <span className="truncate">{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              title="ปิดการแจ้งเตือน"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 1. TOP ACTION & MULTI-PAGE BAR */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
            title="กลับสู่การตั้งค่าระบบ"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                <Palette className="h-4 w-4 text-emerald-600" />
                <span>Site Editor & Block Builder</span>
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync
              </span>
              {isDirty && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  ยังไม่บันทึก
                </span>
              )}
            </div>

            {/* Current Editing URL Link */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
              <Globe className="h-3 w-3 text-slate-400" />
              <span className="font-mono text-[11px] truncate max-w-[200px] sm:max-w-xs text-slate-600">
                {storeOrigin
                  ? `${storeOrigin}/store/${shopSlug}${selectedPageSlug ? `/${selectedPageSlug}` : ""}`
                  : `/store/${shopSlug}${selectedPageSlug ? `/${selectedPageSlug}` : ""}`}
              </span>
              <button
                type="button"
                onClick={() => copyStoreUrl(selectedPageSlug)}
                className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors"
                title="คัดลอกลิงก์หน้าปัจจุบัน"
              >
                {copiedSlug ? (
                  <Check className="h-3 w-3 text-emerald-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Center: Multi-Page Selector Dropdown */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100/80 rounded-xl p-1 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 px-2 flex items-center gap-1">
              <Layout className="h-3.5 w-3.5 text-slate-400" />
              <span className="hidden sm:inline">หน้า:</span>
            </span>
            <select
              value={selectedPageSlug}
              onChange={(e) => setSelectedPageSlug(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer shadow-2xs"
            >
              <option value="">🏠 หน้าแรก (Home Page) - /</option>
              <optgroup label="── หน้าเพจย่อย (Sub-pages) ──">
                {customPagesList.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    📄 {p.title} (/{p.slug})
                  </option>
                ))}
              </optgroup>
            </select>

            <button
              type="button"
              onClick={() => setIsAddPageModalOpen(true)}
              className="ml-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 transition-all shadow-xs shrink-0"
              title="สร้างหน้าใหม่"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden md:inline">สร้างหน้าใหม่</span>
            </button>
          </div>

          {selectedPageSlug && (
            <button
              type="button"
              onClick={() => setSelectedPageSlug("")}
              className="text-[11px] font-medium text-slate-500 hover:text-slate-900 bg-white px-2 py-1.5 rounded-lg border border-slate-200 transition-colors"
              title="กลับสู่หน้าแรก"
            >
              ← หน้าแรก
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors min-h-[36px]"
            title="รีเซ็ตการตั้งค่าธีมและส่วนประกอบทั้งหมดกลับสู่ค่ามาตรฐาน"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>ค่าเริ่มต้น</span>
          </button>

          <Link
            href={`/store/${shopSlug}${selectedPageSlug ? `/${selectedPageSlug}` : ""}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-colors min-h-[36px]"
            title="เปิดหน้าร้านจริงในแท็บใหม่"
          >
            <span className="hidden sm:inline">ดูหน้าร้านจริง</span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
          </Link>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className={`inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-1.5 rounded-xl text-white text-xs font-semibold shadow-xs transition-all active:scale-95 min-h-[36px] ${
              isSaving
                ? "bg-slate-400 cursor-not-allowed"
                : hasErrors
                ? "bg-rose-600 hover:bg-rose-500"
                : "bg-slate-900 hover:bg-slate-800"
            }`}
            title={hasErrors ? "กรุณาตรวจสอบและแก้ไขข้อผิดพลาดก่อนบันทึก" : "บันทึกการเปลี่ยนแปลงทั้งหมด"}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>กำลังบันทึก...</span>
              </>
            ) : hasErrors ? (
              <>
                <AlertCircle className="h-3.5 w-3.5" />
                <span>มีข้อผิดพลาด ({Object.keys(validationErrors).length})</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>บันทึกการเปลี่ยนแปลง</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* 2. MAIN TWO-COLUMN SPLIT WORKSPACE */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* LEFT COLUMN: Controls & Settings Tabs */}
        <aside className="w-full lg:w-[480px] xl:w-[510px] bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-0 z-20 shadow-xs">
          {/* Tabs Navigation Header */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 p-1 gap-0.5 shrink-0">
            {[
              { id: "theme", label: "ธีม & ฟอนต์", icon: Palette, hasErr: tabErrors.theme },
              { id: "blocks", label: "บล็อก & ลำดับ", icon: Layers, hasErr: tabErrors.blocks },
              { id: "pages", label: "หน้าเพจ", icon: FileText, hasErr: tabErrors.pages },
              { id: "navigation", label: "เมนูนำทาง", icon: Compass, hasErr: tabErrors.navigation },
              { id: "announcement", label: "แถบประกาศ", icon: Megaphone, hasErr: tabErrors.announcement },
              { id: "contact", label: "ติดต่อ", icon: PhoneCall, hasErr: tabErrors.contact },
              { id: "cases", label: "เคสซ่อม", icon: Sliders, hasErr: tabErrors.cases },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as ActiveTab)}
                  className={`relative flex flex-col items-center justify-center gap-1 py-2 px-0.5 rounded-xl text-[10px] font-semibold transition-all min-h-[50px] ${
                    isActive
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                      : "text-slate-500 hover:text-slate-900 hover:bg-white/60"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
                  <span className="leading-tight text-center truncate max-w-full">{tab.label}</span>
                  {tab.hasErr && (
                    <span
                      className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white"
                      title="มีข้อมูลที่ต้องแก้ไขในแท็บนี้"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab Content Panels */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {/* TAB 1: Theme & Typography */}
            {activeTab === "theme" && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">ธีมสี & ฟอนต์ตัวอักษร (Theme & Typography)</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    เลือกชุดสี ฟอนต์ภาษาไทย และสไตล์การจัดวางเลย์เอาต์ Hero สำหรับทั้งเว็บไซต์
                  </p>
                </div>

                {/* Color Palette Picker */}
                <div className="space-y-2.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    ชุดสีธีมหลัก (Theme Color Palette)
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {(Object.keys(THEME_PALETTES) as StorefrontThemeColor[]).map((cKey) => {
                      const p = THEME_PALETTES[cKey];
                      const isSelected = config.themeColor === cKey;
                      return (
                        <button
                          key={cKey}
                          type="button"
                          onClick={() => setConfig({ ...config, themeColor: cKey })}
                          className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${
                            isSelected
                              ? "border-slate-900 bg-slate-900/5 ring-2 ring-slate-900/10 shadow-xs"
                              : "border-slate-200 hover:border-slate-300 bg-white"
                          }`}
                        >
                          <span
                            className="h-6 w-6 rounded-full shadow-inner shrink-0 flex items-center justify-center text-white"
                            style={{ backgroundColor: p.hex }}
                          >
                            {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate">{p.labelEn}</div>
                            <div className="text-[10px] text-slate-500 truncate">{p.label.split(" ")[0]}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Thai Font Family Picker */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 block flex items-center gap-1.5">
                      <Type className="h-3.5 w-3.5 text-emerald-600" />
                      <span>แบบอักษรภาษาไทย (Thai Typography)</span>
                    </label>
                    <span className="text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Google Fonts
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ALLOWED_FONT_FAMILIES.map((fKey) => {
                      const fMeta = FONT_FAMILY_CONFIG[fKey];
                      const isSelected = (config.fontFamily || "anuphan") === fKey;
                      return (
                        <button
                          key={fKey}
                          type="button"
                          onClick={() => setConfig({ ...config, fontFamily: fKey })}
                          className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between min-h-[72px] ${
                            isSelected
                              ? "border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-500/20 shadow-xs"
                              : "border-slate-200 hover:border-slate-300 bg-white"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs font-bold text-slate-900">{fMeta.label.split(" ")[0]}</span>
                            {isSelected && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                          </div>
                          <p
                            className="text-[12px] text-slate-600 mt-1 line-clamp-1"
                            style={{ fontFamily: fMeta.fontFamily }}
                          >
                            ศูนย์ซ่อมมือถือด่วน 0123456789
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Hero Layout Switcher */}
                <div className="space-y-2.5">
                  <label className="text-xs font-semibold text-slate-700 block flex items-center gap-1.5">
                    <Layout className="h-3.5 w-3.5 text-emerald-600" />
                    <span>สไตล์การจัดวางส่วน Hero (Hero Layout Style)</span>
                  </label>
                  <div className="space-y-2">
                    {ALLOWED_HERO_LAYOUTS.map((layoutKey) => {
                      const opt = HERO_LAYOUT_OPTIONS[layoutKey];
                      const isSelected = (config.heroLayout || "split") === layoutKey;
                      return (
                        <button
                          key={layoutKey}
                          type="button"
                          onClick={() => setConfig({ ...config, heroLayout: layoutKey })}
                          className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                            isSelected
                              ? "border-slate-900 bg-slate-900/5 ring-2 ring-slate-900/10 shadow-xs"
                              : "border-slate-200 hover:border-slate-300 bg-white"
                          }`}
                        >
                          <div
                            className={`p-2 rounded-xl mt-0.5 ${
                              isSelected ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            <Layout className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900">{opt.label}</span>
                              {isSelected && <Check className="h-3.5 w-3.5 text-slate-900" />}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{opt.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Shop Name */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 block">
                      ชื่อร้านค้าที่แสดง (Shop Display Name) *
                    </label>
                    <span className="text-[11px] font-mono text-slate-400">
                      {shopName.length}/50
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={50}
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className={`w-full text-xs h-10 px-3.5 rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 transition-all font-medium ${
                      validationErrors.shopName
                        ? "border-rose-400 focus:ring-rose-400 bg-rose-50/20"
                        : "border-slate-300 focus:ring-emerald-500 focus:border-emerald-500"
                    }`}
                    placeholder="เช่น MobileShop Lab Express"
                  />
                  {validationErrors.shopName && (
                    <p className="text-[11px] text-rose-600 flex items-center gap-1 mt-1 font-medium">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{validationErrors.shopName}</span>
                    </p>
                  )}
                </div>

                {/* Hero Badge */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 block">
                      ป้ายกำกับด้านบน (Hero Badge Tag)
                    </label>
                    <span className="text-[11px] font-mono text-slate-400">
                      {(config.badge || "").length}/50
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={50}
                    value={config.badge}
                    onChange={(e) => setConfig({ ...config, badge: e.target.value })}
                    className="w-full text-xs h-10 px-3.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    placeholder="เช่น ศูนย์บริการซ่อมมาตรฐานแล็บ"
                  />
                </div>

                {/* Hero Headline */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 block">
                      ข้อความพาดหัวหลัก (Hero Main Headline) *
                    </label>
                    <span className="text-[11px] font-mono text-slate-400">
                      {(config.headline || "").length}/150
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={160}
                    value={config.headline}
                    onChange={(e) => setConfig({ ...config, headline: e.target.value })}
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all leading-relaxed"
                    placeholder="พาดหัวหลักที่ดึงดูดลูกค้าและสร้างความมั่นใจ"
                  />
                  {validationErrors.headline && (
                    <p className="text-[11px] text-rose-600 flex items-center gap-1 mt-1 font-medium">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{validationErrors.headline}</span>
                    </p>
                  )}
                </div>

                {/* Hero Subheadline */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 block">
                      ข้อความบรรยายประกอบ (Hero Subheadline)
                    </label>
                    <span className="text-[11px] font-mono text-slate-400">
                      {(config.subheadline || "").length}/300
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    maxLength={320}
                    value={config.subheadline}
                    onChange={(e) => setConfig({ ...config, subheadline: e.target.value })}
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all leading-relaxed"
                    placeholder="คำบรรยายสั้นๆ เกี่ยวกับมาตรฐานและบริการของร้าน"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: Modular Blocks & Layout Builder */}
            {activeTab === "blocks" && (
              <div className="space-y-5 animate-fade-in">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-emerald-600" />
                      <span>
                        {selectedPageSlug && activeSubPage
                          ? `บล็อกบนหน้า: ${activeSubPage.title}`
                          : "จัดการบล็อก & ลำดับหน้าแรก (Home Layout)"}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      จัดลำดับขึ้น-ลง เปิด/ปิดการแสดงผล หรือเพิ่มบล็อกใหม่สไตล์ Gutenberg
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddBlockModalOpen(true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>เพิ่มบล็อก</span>
                  </button>
                </div>

                {/* Blocks List */}
                <div className="space-y-2.5">
                  {currentDisplaySections.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                        item.visible
                          ? "bg-white border-slate-200/90 shadow-2xs"
                          : "bg-slate-50/80 border-slate-200/60 opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        {/* Drag indicator */}
                        <GripVertical className="h-4 w-4 text-slate-300 shrink-0" />

                        {/* Title and details */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900 truncate">{item.name}</span>
                            {item.isCustom ? (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                                บล็อกกำหนดเอง
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                                มาตรฐาน
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">{item.desc}</p>
                        </div>
                      </div>

                      {/* Controls: Move Up, Move Down, Edit, Toggle, Delete */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Move Up */}
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveSection(idx, "up")}
                          className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="เลื่อนขึ้น"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>

                        {/* Move Down */}
                        <button
                          type="button"
                          disabled={idx === currentDisplaySections.length - 1}
                          onClick={() => moveSection(idx, "down")}
                          className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="เลื่อนลง"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>

                        {/* Edit Custom Block Properties */}
                        {item.isCustom && item.block && (
                          <button
                            type="button"
                            onClick={() => setEditingBlock(item.block!)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                            title="แก้ไขเนื้อหาบล็อก"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {/* Visibility Switch */}
                        <button
                          type="button"
                          onClick={() => toggleSectionVisibility(item.id)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            item.visible
                              ? "text-emerald-600 hover:bg-emerald-50"
                              : "text-slate-400 hover:bg-slate-100"
                          }`}
                          title={item.visible ? "คลิกเพื่อซ่อนส่วนนี้" : "คลิกเพื่อแสดงส่วนนี้"}
                        >
                          {item.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>

                        {/* Delete Custom Block */}
                        {item.isCustom && (
                          <button
                            type="button"
                            onClick={() => handleDeleteBlock(item.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                            title="ลบบล็อกนี้"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddBlockModalOpen(true)}
                    className="w-full py-3 rounded-2xl border border-dashed border-slate-300 hover:border-emerald-500 bg-white hover:bg-emerald-50/30 text-xs font-bold text-slate-700 hover:text-emerald-700 flex items-center justify-center gap-2 transition-all shadow-2xs"
                  >
                    <Plus className="h-4 w-4" />
                    <span>เพิ่มบล็อกเนื้อหาใหม่ (Add Block)</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: Multi-Page Manager */}
            {activeTab === "pages" && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-emerald-600" />
                      <span>จัดการหน้าเว็บไซต์ (Multi-Page Manager)</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      สร้างหน้าเพจเพิ่มเติม เช่น เกี่ยวกับเรา, เงื่อนไขการรับประกัน, นโยบายความเป็นส่วนตัว
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddPageModalOpen(true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs shrink-0"
                  >
                    <FilePlus className="h-3.5 w-3.5" />
                    <span>สร้างหน้าใหม่</span>
                  </button>
                </div>

                {/* Pages List */}
                <div className="space-y-3">
                  {/* Home Page Card */}
                  <div
                    className={`p-4 rounded-2xl border transition-all ${
                      selectedPageSlug === ""
                        ? "border-emerald-600 bg-emerald-50/30 ring-2 ring-emerald-500/20 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="p-2 rounded-xl bg-slate-100 text-slate-700 font-bold">🏠</span>
                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <span>หน้าแรก (Home Page)</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-slate-100 text-slate-600">
                              /
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            หน้ารวมบริการ ตรวจเช็ค 10 จุด ติดตามสถานะงานซ่อม และรีวิว
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedPageSlug("")}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-all ${
                          selectedPageSlug === ""
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {selectedPageSlug === "" ? "กำลังแก้ไข" : "เลือกแก้ไข"}
                      </button>
                    </div>
                  </div>

                  {/* Custom Subpages Cards */}
                  {customPagesList.map((p) => {
                    const isSelected = selectedPageSlug === p.slug;
                    return (
                      <div
                        key={p.slug}
                        className={`p-4 rounded-2xl border transition-all space-y-3 ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-50/30 ring-2 ring-emerald-500/20 shadow-xs"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 truncate">{p.title}</span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-100 text-emerald-800 shrink-0">
                                /{p.slug}
                              </span>
                            </div>
                            {p.subtitle && (
                              <p className="text-[11px] text-slate-500 mt-0.5 truncate">{p.subtitle}</p>
                            )}
                            <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2">
                              <span>บล็อกเนื้อหา: {(p.sections || []).length} บล็อก</span>
                              <button
                                type="button"
                                onClick={() => copyStoreUrl(p.slug)}
                                className="text-emerald-700 hover:underline flex items-center gap-0.5"
                              >
                                <span>คัดลอกลิงก์</span>
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPageSlug(p.slug);
                                setActiveTab("blocks");
                              }}
                              className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-all ${
                                isSelected
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                              }`}
                            >
                              {isSelected ? "กำลังแก้ไข" : "เลือกแก้ไข"}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeletePage(p.slug)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                              title="ลบหน้านี้"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Inline Metadata Editor when Selected */}
                        {isSelected && (
                          <div className="pt-3 border-t border-slate-200/80 space-y-2.5">
                            <div>
                              <label className="text-[11px] font-semibold text-slate-700 block">
                                หัวข้อหน้า (Page Title)
                              </label>
                              <input
                                type="text"
                                value={p.title}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setCustomPagesList((prev) =>
                                    prev.map((item) => (item.slug === p.slug ? { ...item, title: val } : item))
                                  );
                                }}
                                className="w-full text-xs h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-semibold text-slate-700 block">
                                คำบรรยายประกอบ (Page Subtitle)
                              </label>
                              <input
                                type="text"
                                value={p.subtitle || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setCustomPagesList((prev) =>
                                    prev.map((item) => (item.slug === p.slug ? { ...item, subtitle: val } : item))
                                  );
                                }}
                                className="w-full text-xs h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-semibold text-slate-700 block">
                                เนื้อหาบทความหลัก (Page Content Markdown/Text)
                              </label>
                              <textarea
                                rows={3}
                                value={p.content || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setCustomPagesList((prev) =>
                                    prev.map((item) => (item.slug === p.slug ? { ...item, content: val } : item))
                                  );
                                }}
                                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="รายละเอียดเนื้อหาในหน้านี้..."
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 4: Navigation Menu Manager */}
            {activeTab === "navigation" && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Compass className="h-4 w-4 text-emerald-600" />
                      <span>จัดการเมนูนำทาง (Navigation Menu)</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ปรับแต่งลิงก์แถบ Header บนเว็บไซต์ เชื่อมโยงไปยังหน้าย่อยหรือส่วนต่างๆ
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddNavModalOpen(true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>เพิ่มเมนู</span>
                  </button>
                </div>

                {/* Nav Links List */}
                <div className="space-y-2">
                  {navMenuList.map((navItem, idx) => (
                    <div
                      key={navItem.id || idx}
                      className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 bg-white shadow-2xs"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{navItem.label}</span>
                          {navItem.isExternal && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-100 text-slate-600 flex items-center gap-0.5">
                              <span>ภายนอก</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-slate-400 truncate block mt-0.5">
                          {navItem.href}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveNavMenuItem(idx, "up")}
                          className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="เลื่อนขึ้น"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === navMenuList.length - 1}
                          onClick={() => moveNavMenuItem(idx, "down")}
                          className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="เลื่อนลง"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteNavMenuItem(idx)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                          title="ลบเมนูนี้"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setNavMenuList([...DEFAULT_NAV_MENU])}
                  className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 text-xs text-slate-600 font-semibold hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>คืนค่าเมนูมาตรฐาน (Reset Menu)</span>
                </button>
              </div>
            )}

            {/* TAB 5: Announcement Bar */}
            {activeTab === "announcement" && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">แถบประกาศด้านบนสุด (Announcement Bar)</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    แสดงแถบข้อความโปรโมชั่น ประกาศแจ้งเตือน หรือสิทธิพิเศษที่หัวเว็บ
                  </p>
                </div>

                {/* Enable Switch */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div>
                    <div className="text-xs font-bold text-slate-900">เปิดใช้งานแถบประกาศ</div>
                    <div className="text-[11px] text-slate-500">แสดงผลด้านบนสุดของหน้าเว็บ</div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={config.announcementEnabled}
                    onClick={() =>
                      setConfig({ ...config, announcementEnabled: !config.announcementEnabled })
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      config.announcementEnabled ? "bg-emerald-600" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        config.announcementEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Announcement Text */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 block">
                      ข้อความประกาศ (Announcement Text) {config.announcementEnabled && "*"}
                    </label>
                    <span className="text-[11px] font-mono text-slate-400">
                      {(config.announcementText || "").length}/200
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={220}
                    value={config.announcementText}
                    onChange={(e) => setConfig({ ...config, announcementText: e.target.value })}
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all leading-relaxed"
                    placeholder="เช่น 🎉 พิเศษ! ตรวจเช็คสภาพเครื่อง 10 จุดฟรี ไม่มีค่าใช้จ่าย พร้อมรับประกันงานซ่อมสูงสุด 1 ปีเต็ม"
                  />
                  {validationErrors.announcementText && (
                    <p className="text-[11px] text-rose-600 flex items-center gap-1 mt-1 font-medium">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{validationErrors.announcementText}</span>
                    </p>
                  )}
                </div>

                {/* Mini Preview Box */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 block">
                    ตัวอย่างแถบประกาศตามธีมสี:
                  </label>
                  <div
                    className={`p-3 rounded-xl text-xs font-medium border flex items-center gap-2 ${theme.announcement.bg} ${theme.announcement.text} ${theme.announcement.border}`}
                  >
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${theme.announcement.badgeBg} ${theme.announcement.badgeText}`}
                    >
                      ประกาศ
                    </span>
                    <span className="truncate">{config.announcementText || "ข้อความตัวอย่าง"}</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: Contact & Social */}
            {activeTab === "contact" && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">ช่องทางติดต่อ & โซเชียล (Contact & Social)</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    กำหนดเบอร์โทรศัพท์ LINE Official Account และพิกัด Google Maps หน้าร้าน
                  </p>
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 block">
                      เบอร์โทรศัพท์ติดต่อหน้าร้าน (Phone)
                    </label>
                    <span className="text-[11px] text-slate-400">จัดรูปแบบอัตโนมัติ</span>
                  </div>
                  <input
                    type="text"
                    value={config.phone}
                    onChange={(e) => setConfig({ ...config, phone: e.target.value })}
                    onBlur={handlePhoneBlur}
                    className="w-full text-xs h-10 px-3.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    placeholder="เช่น 02-123-4567 หรือ 081-999-8888"
                  />
                  {validationErrors.phone && (
                    <p className="text-[11px] text-rose-600 flex items-center gap-1 mt-1 font-medium">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{validationErrors.phone}</span>
                    </p>
                  )}
                </div>

                {/* LINE ID */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    LINE Official Account ID
                  </label>
                  <input
                    type="text"
                    value={config.lineId}
                    onChange={(e) => setConfig({ ...config, lineId: e.target.value.replace(/\s+/g, "") })}
                    className="w-full text-xs h-10 px-3.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    placeholder="เช่น @mobileshophub"
                  />
                </div>

                {/* Google Maps URL */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 block">
                      ลิงก์หมุดแผนที่ (Google Maps Link)
                    </label>
                    {config.googleMapsUrl && isValidHttpUrl(config.googleMapsUrl) && (
                      <a
                        href={config.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-emerald-600 hover:underline flex items-center gap-0.5"
                      >
                        <span>ทดสอบลิงก์</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                  <input
                    type="url"
                    value={config.googleMapsUrl}
                    onChange={(e) => setConfig({ ...config, googleMapsUrl: e.target.value })}
                    className="w-full text-xs h-10 px-3.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    placeholder="เช่น https://maps.app.goo.gl/..."
                  />
                </div>
              </div>
            )}

            {/* TAB 7: Cases & Reviews */}
            {activeTab === "cases" && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">เคสซ่อมตัวอย่าง (Before & After Cases)</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      จัดการเคสตัวอย่างสำหรับตัวเลื่อนเปรียบเทียบก่อน-หลังการซ่อม
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddNewCase}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold transition-colors shrink-0 border border-emerald-200"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>เพิ่มเคส</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {casesList.map((cItem, cIdx) => (
                    <div
                      key={cItem.id || cIdx}
                      className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Sliders className="h-3.5 w-3.5 text-emerald-600" />
                          <span>
                            เคสที่ {cIdx + 1}: {(cItem.device || "เคสซ่อม").split(" ")[0]}
                          </span>
                        </span>
                        {casesList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = casesList.filter((_, idx) => idx !== cIdx);
                              setCasesList(updated);
                            }}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                            title="ลบเคสนี้"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block">
                            ชื่อรุ่นอุปกรณ์ *
                          </label>
                          <input
                            type="text"
                            value={cItem.device}
                            onChange={(e) => {
                              const updated = [...casesList];
                              updated[cIdx] = { ...updated[cIdx], device: e.target.value };
                              setCasesList(updated);
                            }}
                            className="w-full text-xs h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block">
                            อาการแรกเข้า
                          </label>
                          <input
                            type="text"
                            value={cItem.issue}
                            onChange={(e) => {
                              const updated = [...casesList];
                              updated[cIdx] = { ...updated[cIdx], issue: e.target.value };
                              setCasesList(updated);
                            }}
                            className="w-full text-xs h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-800"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* RIGHT COLUMN: Live Interactive Responsive Preview */}
        <section className="flex-1 flex flex-col min-w-0 bg-slate-200/70 overflow-hidden relative">
          {/* Viewport Control Bar */}
          <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between gap-4 shrink-0 shadow-2xs z-10">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              {[
                { id: "desktop", label: "Desktop (Full)", icon: Monitor },
                { id: "tablet", label: "Tablet (768px)", icon: Tablet },
                { id: "mobile", label: "Mobile (375px)", icon: Smartphone },
              ].map((v) => {
                const Icon = v.icon;
                const isSelected = viewport === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setViewport(v.id as ViewportMode)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{v.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-500 font-mono hidden md:inline">
                ฟอนต์: <strong className="text-slate-800">{currentFont.label.split(" ")[0]}</strong> | เลย์เอาต์:{" "}
                <strong className="text-slate-800">{config.heroLayout}</strong>
              </span>
              <div
                className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"
                title="Live Sync ทำงานตลอดเวลา"
              />
            </div>
          </div>

          {/* Preview Canvas Area with Google Fonts dynamically linked */}
          <div
            className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 lg:p-8 flex items-start justify-center scroll-smooth min-h-0 bg-slate-200/70"
            style={{ fontFamily: currentFont.fontFamily }}
          >
            {/* Inject Google Font stylesheet for live fidelity */}
            <link
              rel="stylesheet"
              href={`https://fonts.googleapis.com/css2?family=${currentFont.googleFont}&display=swap`}
            />

            {/* Desktop Frame */}
            {viewport === "desktop" && (
              <div className="w-full bg-white transition-all duration-300 rounded-2xl shadow-xl overflow-hidden border border-slate-300 flex flex-col max-w-full">
                {/* Desktop Chrome Bar */}
                <div className="bg-slate-900 text-slate-300 px-4 py-2.5 flex items-center justify-between gap-4 text-xs border-b border-slate-800 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-rose-500/90 shadow-xs" />
                    <span className="h-3 w-3 rounded-full bg-amber-500/90 shadow-xs" />
                    <span className="h-3 w-3 rounded-full bg-emerald-500/90 shadow-xs" />
                  </div>
                  <div className="flex-1 max-w-md mx-auto bg-slate-950 px-3.5 py-1.5 rounded-xl text-center font-mono text-[11px] text-slate-300 truncate border border-slate-800 flex items-center justify-center gap-1.5 shadow-inner">
                    <Lock className="h-3 w-3 text-emerald-400 shrink-0" />
                    <span className="truncate">
                      {storeOrigin || "https://mobileshophub.com"}/store/{shopSlug}
                      {selectedPageSlug ? `/${selectedPageSlug}` : ""}
                    </span>
                  </div>
                  <Link
                    href={`/store/${shopSlug}${selectedPageSlug ? `/${selectedPageSlug}` : ""}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-400 hover:text-white p-1 rounded transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {/* Rendered Live Storefront */}
                <div className="flex-1 bg-white overflow-x-hidden w-full flex flex-col">
                  {/* Announcement Bar */}
                  {config.announcementEnabled && config.announcementText && (
                    <AnnouncementBar
                      text={config.announcementText}
                      enabled={config.announcementEnabled}
                      themeColor={config.themeColor}
                    />
                  )}

                  {/* Header */}
                  <LandingNavbar
                    shopName={shopName}
                    shopSlug={shopSlug}
                    phone={config.phone}
                    lineId={config.lineId}
                    hiddenSections={hiddenSections}
                    navigationMenu={navMenuList}
                    isSubpage={Boolean(selectedPageSlug)}
                  />

                  {/* If Subpage is selected -> Render Subpage View */}
                  {selectedPageSlug && activeSubPage ? (
                    <div className="flex-1 flex flex-col">
                      {/* Subpage Hero Header */}
                      <div className="bg-slate-900 text-white py-12 px-6 sm:px-12 border-b border-slate-800">
                        <div className="max-w-5xl mx-auto space-y-3">
                          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                            <span>หน้าแรก</span>
                            <ChevronRight className="h-3 w-3 text-slate-500" />
                            <span className="text-white font-bold">{activeSubPage.title}</span>
                          </div>
                          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                            {activeSubPage.title}
                          </h1>
                          {activeSubPage.subtitle && (
                            <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
                              {activeSubPage.subtitle}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Subpage Rich Content */}
                      {activeSubPage.content && (
                        <div className="max-w-4xl mx-auto px-6 py-10 w-full">
                          <div className="prose prose-slate max-w-none text-slate-700 text-sm leading-relaxed whitespace-pre-line bg-slate-50 p-6 sm:p-8 rounded-2xl border border-slate-200">
                            {activeSubPage.content}
                          </div>
                        </div>
                      )}

                      {/* Subpage Custom Blocks */}
                      <div className="flex-1 space-y-8 pb-12">
                        {(activeSubPage.sections || []).map((b) => (
                          <DynamicBlockRenderer
                            key={b.id}
                            block={b}
                            themeColor={config.themeColor}
                            tenantInfo={{ phone: config.phone, lineId: config.lineId }}
                          />
                        ))}
                      </div>

                      {/* Footer */}
                      <LandingFooter shopName={shopName} phone={config.phone} hiddenSections={hiddenSections} />
                    </div>
                  ) : (
                    /* Home Page Sections Rendered According to Dynamic sectionsOrder */
                    <div className="flex-1 flex flex-col">
                      {sectionsOrder.map((secId) => {
                        // Standard sections dispatcher
                        if (secId === "hero") {
                          return (
                            <LandingHero
                              key="hero"
                              shopName={shopName}
                              shopSlug={shopSlug}
                              headline={config.headline}
                              subheadline={config.subheadline}
                              badge={config.badge}
                              themeColor={config.themeColor}
                              showScanner={config.showHardwareScanner}
                              showLiveTracking={config.showLiveTracking}
                              heroLayout={config.heroLayout || "split"}
                            />
                          );
                        }
                        if (secId === "services" && config.showServicesBento) {
                          return (
                            <ServicesBento
                              key="services"
                              lineId={config.lineId}
                              showEstimate={config.showPriceEstimator}
                            />
                          );
                        }
                        if (secId === "tracking" && config.showLiveTracking) {
                          return <LiveTrackingShowcase key="tracking" />;
                        }
                        if (secId === "inspection" && config.showInspectionBench) {
                          return (
                            <InspectionStandard
                              key="inspection"
                              showEstimate={config.showPriceEstimator}
                              showBench={config.showInspectionBench}
                              themeColor={config.themeColor}
                            />
                          );
                        }
                        if (secId === "estimator" && config.showPriceEstimator) {
                          return (
                            <PriceEstimator
                              key="estimator"
                              phone={config.phone}
                              lineId={config.lineId}
                              themeColor={config.themeColor}
                            />
                          );
                        }
                        if (
                          secId === "reviews" &&
                          (config.showBeforeAfterSlider || config.showCustomerReviews)
                        ) {
                          return (
                            <CustomerReviews
                              key="reviews"
                              showSlider={config.showBeforeAfterSlider}
                              showReviews={config.showCustomerReviews}
                              customCases={casesList}
                              themeColor={config.themeColor}
                            />
                          );
                        }
                        if (secId === "location" && config.showLocationSection) {
                          return (
                            <ShopLocation
                              key="location"
                              shopName={shopName}
                              phone={config.phone}
                              lineId={config.lineId}
                              googleMapsUrl={config.googleMapsUrl}
                              demo={false}
                            />
                          );
                        }
                        if (secId === "faq" && config.showFaqSection) {
                          return (
                            <LandingFaq
                              key="faq"
                              lineId={config.lineId}
                              themeColor={config.themeColor}
                            />
                          );
                        }

                        // Custom Block Dispatcher
                        const customBlock = customSectionsList.find((b) => b.id === secId);
                        if (customBlock) {
                          return (
                            <DynamicBlockRenderer
                              key={customBlock.id}
                              block={customBlock}
                              themeColor={config.themeColor}
                              tenantInfo={{ phone: config.phone, lineId: config.lineId }}
                            />
                          );
                        }

                        return null;
                      })}

                      {/* Footer */}
                      <LandingFooter shopName={shopName} phone={config.phone} hiddenSections={hiddenSections} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tablet Frame */}
            {viewport === "tablet" && (
              <div className="w-[768px] max-w-[768px] bg-slate-900 p-3 sm:p-4 rounded-[36px] shadow-2xl ring-1 ring-slate-800/80 mx-auto transition-all duration-300 flex flex-col">
                <div className="flex justify-center pb-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-950 ring-1 ring-slate-700/80" />
                </div>
                <div className="bg-white rounded-2xl overflow-hidden border border-slate-700 flex flex-col w-full">
                  {/* Tablet Browser Header */}
                  <div className="bg-slate-900 text-slate-300 px-3.5 py-2 flex items-center justify-between gap-3 text-xs border-b border-slate-800 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                    </div>
                    <div className="flex-1 max-w-sm mx-auto bg-slate-950 px-3 py-1 rounded-lg text-center font-mono text-[11px] text-slate-300 truncate border border-slate-800 flex items-center justify-center gap-1.5">
                      <Lock className="h-2.5 w-2.5 text-emerald-400 shrink-0" />
                      <span className="truncate">
                        {storeOrigin || "https://mobileshophub.com"}/store/{shopSlug}
                        {selectedPageSlug ? `/${selectedPageSlug}` : ""}
                      </span>
                    </div>
                  </div>

                  {/* Tablet Storefront Content */}
                  <div className="w-full bg-white overflow-x-hidden flex flex-col">
                    {config.announcementEnabled && config.announcementText && (
                      <AnnouncementBar
                        text={config.announcementText}
                        enabled={config.announcementEnabled}
                        themeColor={config.themeColor}
                      />
                    )}

                    <LandingNavbar
                      shopName={shopName}
                      shopSlug={shopSlug}
                      phone={config.phone}
                      lineId={config.lineId}
                      hiddenSections={hiddenSections}
                      navigationMenu={navMenuList}
                      isSubpage={Boolean(selectedPageSlug)}
                    />

                    {selectedPageSlug && activeSubPage ? (
                      <div className="flex-1 flex flex-col">
                        <div className="bg-slate-900 text-white py-8 px-6 border-b border-slate-800">
                          <h1 className="text-xl font-bold text-white">{activeSubPage.title}</h1>
                          {activeSubPage.subtitle && (
                            <p className="text-xs text-slate-300 mt-1">{activeSubPage.subtitle}</p>
                          )}
                        </div>
                        {activeSubPage.content && (
                          <div className="p-6 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                            {activeSubPage.content}
                          </div>
                        )}
                        <div className="space-y-6 pb-8">
                          {(activeSubPage.sections || []).map((b) => (
                            <DynamicBlockRenderer
                              key={b.id}
                              block={b}
                              themeColor={config.themeColor}
                              tenantInfo={{ phone: config.phone, lineId: config.lineId }}
                            />
                          ))}
                        </div>
                        <LandingFooter shopName={shopName} phone={config.phone} hiddenSections={hiddenSections} />
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col">
                        {sectionsOrder.map((secId) => {
                          if (secId === "hero") {
                            return (
                              <LandingHero
                                key="hero"
                                shopName={shopName}
                                shopSlug={shopSlug}
                                headline={config.headline}
                                subheadline={config.subheadline}
                                badge={config.badge}
                                themeColor={config.themeColor}
                                showScanner={config.showHardwareScanner}
                                showLiveTracking={config.showLiveTracking}
                                heroLayout={config.heroLayout || "split"}
                              />
                            );
                          }
                          if (secId === "services" && config.showServicesBento) {
                            return (
                              <ServicesBento
                                key="services"
                                lineId={config.lineId}
                                showEstimate={config.showPriceEstimator}
                              />
                            );
                          }
                          if (secId === "tracking" && config.showLiveTracking) return <LiveTrackingShowcase key="tracking" />;
                          if (secId === "inspection" && config.showInspectionBench) {
                            return (
                              <InspectionStandard
                                key="inspection"
                                showEstimate={config.showPriceEstimator}
                                showBench={config.showInspectionBench}
                                themeColor={config.themeColor}
                              />
                            );
                          }
                          if (secId === "estimator" && config.showPriceEstimator) {
                            return (
                              <PriceEstimator
                                key="estimator"
                                phone={config.phone}
                                lineId={config.lineId}
                                themeColor={config.themeColor}
                              />
                            );
                          }
                          if (
                            secId === "reviews" &&
                            (config.showBeforeAfterSlider || config.showCustomerReviews)
                          ) {
                            return (
                              <CustomerReviews
                                key="reviews"
                                showSlider={config.showBeforeAfterSlider}
                                showReviews={config.showCustomerReviews}
                                customCases={casesList}
                                themeColor={config.themeColor}
                              />
                            );
                          }
                          if (secId === "location" && config.showLocationSection) {
                            return (
                              <ShopLocation
                                key="location"
                                shopName={shopName}
                                phone={config.phone}
                                lineId={config.lineId}
                                googleMapsUrl={config.googleMapsUrl}
                                demo={false}
                              />
                            );
                          }
                          if (secId === "faq" && config.showFaqSection) {
                            return (
                              <LandingFaq
                                key="faq"
                                lineId={config.lineId}
                                themeColor={config.themeColor}
                              />
                            );
                          }
                          const customBlock = customSectionsList.find((b) => b.id === secId);
                          if (customBlock) {
                            return (
                              <DynamicBlockRenderer
                                key={customBlock.id}
                                block={customBlock}
                                themeColor={config.themeColor}
                                tenantInfo={{ phone: config.phone, lineId: config.lineId }}
                              />
                            );
                          }
                          return null;
                        })}
                        <LandingFooter shopName={shopName} phone={config.phone} hiddenSections={hiddenSections} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Mobile Frame */}
            {viewport === "mobile" && (
              <div className="w-[375px] max-w-[375px] bg-slate-900 p-2.5 rounded-[48px] shadow-2xl ring-1 ring-slate-950 mx-auto transition-all duration-300 relative flex flex-col">
                <div className="bg-white rounded-[38px] overflow-hidden border border-slate-800 flex flex-col relative w-full">
                  {/* Status Bar */}
                  <div className="bg-slate-950 text-white px-5 py-2 flex items-center justify-between text-[11px] font-medium shrink-0 select-none">
                    <span>09:41</span>
                    <div className="h-4 w-20 bg-black rounded-full flex items-center justify-center gap-1.5 px-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-800" />
                      <span className="h-2 w-2 rounded-full bg-slate-900 ring-1 ring-slate-700/50" />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <div className="w-4 h-2 border border-white/80 rounded-xs p-0.5 flex items-center">
                        <div className="w-full h-full bg-white rounded-3xs" />
                      </div>
                    </div>
                  </div>

                  {/* Mobile URL Bar */}
                  <div className="bg-slate-900/95 text-slate-300 px-3 py-1 flex items-center justify-between text-[10px] font-mono border-b border-slate-800 shrink-0">
                    <span className="flex items-center gap-1 truncate max-w-[260px]">
                      <Lock className="h-2.5 w-2.5 text-emerald-400 shrink-0" />
                      <span className="truncate">
                        /store/{shopSlug}
                        {selectedPageSlug ? `/${selectedPageSlug}` : ""}
                      </span>
                    </span>
                    <RefreshCw className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                  </div>

                  {/* Storefront inside Mobile Frame */}
                  <div className="w-full bg-white overflow-x-hidden flex-1 flex flex-col">
                    {config.announcementEnabled && config.announcementText && (
                      <AnnouncementBar
                        text={config.announcementText}
                        enabled={config.announcementEnabled}
                        themeColor={config.themeColor}
                      />
                    )}

                    <LandingNavbar
                      shopName={shopName}
                      shopSlug={shopSlug}
                      phone={config.phone}
                      lineId={config.lineId}
                      hiddenSections={hiddenSections}
                      navigationMenu={navMenuList}
                      isSubpage={Boolean(selectedPageSlug)}
                    />

                    {selectedPageSlug && activeSubPage ? (
                      <div className="flex-1 flex flex-col">
                        <div className="bg-slate-900 text-white py-6 px-4 border-b border-slate-800">
                          <h1 className="text-lg font-bold text-white">{activeSubPage.title}</h1>
                          {activeSubPage.subtitle && (
                            <p className="text-xs text-slate-300 mt-1">{activeSubPage.subtitle}</p>
                          )}
                        </div>
                        {activeSubPage.content && (
                          <div className="p-4 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                            {activeSubPage.content}
                          </div>
                        )}
                        <div className="space-y-4 pb-6">
                          {(activeSubPage.sections || []).map((b) => (
                            <DynamicBlockRenderer
                              key={b.id}
                              block={b}
                              themeColor={config.themeColor}
                              tenantInfo={{ phone: config.phone, lineId: config.lineId }}
                            />
                          ))}
                        </div>
                        <LandingFooter shopName={shopName} phone={config.phone} hiddenSections={hiddenSections} />
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col">
                        {sectionsOrder.map((secId) => {
                          if (secId === "hero") {
                            return (
                              <LandingHero
                                key="hero"
                                shopName={shopName}
                                shopSlug={shopSlug}
                                headline={config.headline}
                                subheadline={config.subheadline}
                                badge={config.badge}
                                themeColor={config.themeColor}
                                showScanner={config.showHardwareScanner}
                                showLiveTracking={config.showLiveTracking}
                                heroLayout={config.heroLayout || "split"}
                              />
                            );
                          }
                          if (secId === "services" && config.showServicesBento) {
                            return (
                              <ServicesBento
                                key="services"
                                lineId={config.lineId}
                                showEstimate={config.showPriceEstimator}
                              />
                            );
                          }
                          if (secId === "tracking" && config.showLiveTracking) return <LiveTrackingShowcase key="tracking" />;
                          if (secId === "inspection" && config.showInspectionBench) {
                            return (
                              <InspectionStandard
                                key="inspection"
                                showEstimate={config.showPriceEstimator}
                                showBench={config.showInspectionBench}
                                themeColor={config.themeColor}
                              />
                            );
                          }
                          if (secId === "estimator" && config.showPriceEstimator) {
                            return (
                              <PriceEstimator
                                key="estimator"
                                phone={config.phone}
                                lineId={config.lineId}
                                themeColor={config.themeColor}
                              />
                            );
                          }
                          if (
                            secId === "reviews" &&
                            (config.showBeforeAfterSlider || config.showCustomerReviews)
                          ) {
                            return (
                              <CustomerReviews
                                key="reviews"
                                showSlider={config.showBeforeAfterSlider}
                                showReviews={config.showCustomerReviews}
                                customCases={casesList}
                                themeColor={config.themeColor}
                              />
                            );
                          }
                          if (secId === "location" && config.showLocationSection) {
                            return (
                              <ShopLocation
                                key="location"
                                shopName={shopName}
                                phone={config.phone}
                                lineId={config.lineId}
                                googleMapsUrl={config.googleMapsUrl}
                                demo={false}
                              />
                            );
                          }
                          if (secId === "faq" && config.showFaqSection) {
                            return (
                              <LandingFaq
                                key="faq"
                                lineId={config.lineId}
                                themeColor={config.themeColor}
                              />
                            );
                          }
                          const customBlock = customSectionsList.find((b) => b.id === secId);
                          if (customBlock) {
                            return (
                              <DynamicBlockRenderer
                                key={customBlock.id}
                                block={customBlock}
                                themeColor={config.themeColor}
                                tenantInfo={{ phone: config.phone, lineId: config.lineId }}
                              />
                            );
                          }
                          return null;
                        })}

                        <LandingFooter shopName={shopName} phone={config.phone} hiddenSections={hiddenSections} />

                        {config.showMobileQuickBar && (
                          <div className="z-30 sticky bottom-0">
                            <MobileQuickBar
                              phone={config.phone}
                              lineId={config.lineId}
                              shopSlug={shopSlug}
                              showEstimate={config.showPriceEstimator}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── MODALS ── */}

      {/* MODAL 1: Create New Page Modal */}
      {isAddPageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <FilePlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">สร้างหน้าเพจใหม่ (Create Sub-Page)</h3>
                  <p className="text-xs text-slate-500">สร้างหน้าเนื้อหาสำหรับร้านค้าของคุณ</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddPageModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block">ชื่อหน้าเพจ (Page Title) *</label>
                <input
                  type="text"
                  value={newPageTitle}
                  onChange={(e) => {
                    setNewPageTitle(e.target.value);
                    if (!newPageSlug) {
                      const autoSlug = e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9_-]/g, "-")
                        .replace(/-+/g, "-")
                        .replace(/^-|-$/g, "");
                      setNewPageSlug(autoSlug);
                    }
                  }}
                  placeholder="เช่น เกี่ยวกับศูนย์บริการ หรือ เงื่อนไขการรับประกัน"
                  className="w-full text-xs h-10 px-3.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 block">Slug URL (Path) *</label>
                  <span className="text-[11px] font-mono text-slate-400">ภาษาอังกฤษ ตัวพิมพ์เล็ก และขีดกลาง</span>
                </div>
                <div className="flex items-center mt-1">
                  <span className="text-xs font-mono text-slate-400 bg-slate-100 px-3 h-10 rounded-l-xl border border-r-0 border-slate-300 flex items-center">
                    /store/{shopSlug}/
                  </span>
                  <input
                    type="text"
                    value={newPageSlug}
                    onChange={(e) =>
                      setNewPageSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9_-]/g, "-")
                      )
                    }
                    placeholder="about"
                    className="w-full text-xs h-10 px-3 rounded-r-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block">คำบรรยายสั้น (Subtitle)</label>
                <input
                  type="text"
                  value={newPageSubtitle}
                  onChange={(e) => setNewPageSubtitle(e.target.value)}
                  placeholder="เช่น มาตรฐานการทำงานและประวัติทีมช่างผู้ชำนาญการ"
                  className="w-full text-xs h-10 px-3.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block">เนื้อหาบทความเริ่มต้น (Content)</label>
                <textarea
                  rows={4}
                  value={newPageContent}
                  onChange={(e) => setNewPageContent(e.target.value)}
                  placeholder="รายละเอียดเนื้อหาในหน้านี้... (สามารถเพิ่มบล็อกภาพ แกลเลอรี หรือวิดีโอเพิ่มเติมได้ภายหลัง)"
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddPageModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleAddNewPage}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all"
              >
                สร้างหน้าใหม่
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Add Block Library Picker */}
      {isAddBlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">คลังบล็อกสำเร็จรูป (Block Library)</h3>
                  <p className="text-xs text-slate-500">
                    เลือกบล็อกที่ต้องการเพิ่มลงใน
                    <strong className="text-slate-800 ml-1">
                      {selectedPageSlug && activeSubPage ? `หน้า "${activeSubPage.title}"` : "หน้าแรก (Home Page)"}
                    </strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddBlockModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Templates Grid */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {BLOCK_TEMPLATES.map((tpl) => {
                const Icon = tpl.icon;
                return (
                  <button
                    key={tpl.type}
                    type="button"
                    onClick={() => handleSelectTemplate(tpl)}
                    className="w-full p-4 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 text-left transition-all flex items-start gap-3.5 group shadow-2xs"
                  >
                    <div className="p-3 rounded-2xl bg-slate-100 text-slate-600 group-hover:bg-emerald-600 group-hover:text-white transition-all shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-900">
                          {tpl.title}
                        </span>
                        <span className="text-[10px] text-slate-400 group-hover:text-emerald-600 font-bold flex items-center gap-0.5">
                          <span>เลือกใช้</span>
                          <ChevronRight className="h-3 w-3" />
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{tpl.subtitle}</p>
                      <p className="text-[10px] text-slate-400 mt-1 leading-snug">{tpl.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setIsAddBlockModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Edit Custom Block Properties */}
      {editingBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Edit3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    แก้ไขคุณสมบัติบล็อก ({editingBlock.type})
                  </h3>
                  <p className="text-xs text-slate-500">ปรับแต่งข้อความ รูปภาพ ลิงก์ และการแสดงผล</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingBlock(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Edit Fields Form */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div>
                <label className="text-xs font-semibold text-slate-700 block">หัวข้อบล็อก (Title)</label>
                <input
                  type="text"
                  value={editingBlock.title || ""}
                  onChange={(e) => setEditingBlock({ ...editingBlock, title: e.target.value })}
                  className="w-full text-xs h-9 px-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block">คำบรรยายรอง (Subtitle)</label>
                <input
                  type="text"
                  value={editingBlock.subtitle || ""}
                  onChange={(e) => setEditingBlock({ ...editingBlock, subtitle: e.target.value })}
                  className="w-full text-xs h-9 px-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block">ป้ายกำกับ (Badge)</label>
                <input
                  type="text"
                  value={editingBlock.badge || ""}
                  onChange={(e) => setEditingBlock({ ...editingBlock, badge: e.target.value })}
                  placeholder="เช่น สิทธิพิเศษ หรือ มาตรฐานแล็บ"
                  className="w-full text-xs h-9 px-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Contextual: Button Links for Promo and CTA */}
              {(editingBlock.type.includes("promo") || editingBlock.type.includes("cta")) && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block">ข้อความบนปุ่ม (Button Text)</label>
                    <input
                      type="text"
                      value={editingBlock.buttonText || editingBlock.customButtonText || ""}
                      onChange={(e) =>
                        setEditingBlock({
                          ...editingBlock,
                          buttonText: e.target.value,
                          customButtonText: e.target.value,
                        })
                      }
                      className="w-full text-xs h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block">ลิงก์ปลายทาง (Button URL)</label>
                    <input
                      type="text"
                      value={editingBlock.buttonUrl || editingBlock.customButtonUrl || ""}
                      onChange={(e) =>
                        setEditingBlock({
                          ...editingBlock,
                          buttonUrl: e.target.value,
                          customButtonUrl: e.target.value,
                        })
                      }
                      className="w-full text-xs h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Contextual: Video URL */}
              {editingBlock.type.includes("video") && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block">URL วิดีโอ (YouTube / TikTok / MP4)</label>
                  <input
                    type="text"
                    value={editingBlock.videoUrl || ""}
                    onChange={(e) => setEditingBlock({ ...editingBlock, videoUrl: e.target.value })}
                    className="w-full text-xs h-9 px-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-mono"
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>
              )}

              {/* Contextual: Rich Text Content */}
              {editingBlock.type.includes("rich") && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block">เนื้อหาบทความ (Article Content)</label>
                  <textarea
                    rows={6}
                    value={editingBlock.content || ""}
                    onChange={(e) => setEditingBlock({ ...editingBlock, content: e.target.value })}
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                  />
                </div>
              )}

              {/* Contextual: HTML Snippet */}
              {editingBlock.type.includes("html") && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block">โค้ด HTML Snippet</label>
                  <textarea
                    rows={5}
                    value={editingBlock.html || ""}
                    onChange={(e) => setEditingBlock({ ...editingBlock, html: e.target.value })}
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-mono"
                    placeholder="<div ...>...</div>"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setEditingBlock(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveBlockEdit}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all"
              >
                บันทึกการแก้ไข
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Add Navigation Menu Link */}
      {isAddNavModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Compass className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">เพิ่มเมนูนำทาง (Add Menu Link)</h3>
                  <p className="text-xs text-slate-500">กำหนดชื่อเมนูและปลายทางของลิงก์</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddNavModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block">ชื่อเมนู (Menu Label) *</label>
                <input
                  type="text"
                  value={newNavLabel}
                  onChange={(e) => setNewNavLabel(e.target.value)}
                  placeholder="เช่น เกี่ยวกับเรา หรือ นโยบายรับประกัน"
                  className="w-full text-xs h-10 px-3.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block">ปลายทางของลิงก์ (Link Target) *</label>
                <div className="space-y-2 mt-1">
                  {/* Quick Select Buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setNewNavHref("#services")}
                      className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[10px] font-medium text-slate-700"
                    >
                      #บริการช่าง
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewNavHref("#reviews")}
                      className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[10px] font-medium text-slate-700"
                    >
                      #ผลงานซ่อม
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewNavHref("#faq")}
                      className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[10px] font-medium text-slate-700"
                    >
                      #คำถามพบบ่อย
                    </button>
                    {customPagesList.map((p) => (
                      <button
                        key={p.slug}
                        type="button"
                        onClick={() => setNewNavHref(`/store/${shopSlug}/${p.slug}`)}
                        className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[10px] font-bold text-emerald-800"
                      >
                        /{p.slug}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={newNavHref}
                    onChange={(e) => setNewNavHref(e.target.value)}
                    placeholder="#services หรือ /store/slug/about"
                    className="w-full text-xs h-10 px-3.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="navExternal"
                  checked={newNavIsExternal}
                  onChange={(e) => setNewNavIsExternal(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="navExternal" className="text-xs text-slate-700 font-medium cursor-pointer">
                  เปิดในแท็บใหม่ (External Link)
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddNavModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleAddNavMenuItem}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all"
              >
                เพิ่มเมนู
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
