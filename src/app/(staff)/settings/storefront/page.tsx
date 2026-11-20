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
  Activity,
  History,
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
import {
  getAllBlockPatterns,
  expandPattern,
  BlockPattern,
} from "@/lib/wordpress/blockPatterns";
import {
  serializeToGutenberg,
  parseGutenbergContent,
} from "@/lib/wordpress/gutenbergConverter";
import {
  generateThemeJson,
  compileThemeJsonToCss,
} from "@/lib/wordpress/themeJsonEngine";

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
  type: "success" | "error" | "warning" | "info";
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
  const [newPageTemplate, setNewPageTemplate] = useState<string>("default");

  const [isAddBlockModalOpen, setIsAddBlockModalOpen] = useState<boolean>(false);
  const [editingBlock, setEditingBlock] = useState<CustomBlock | null>(null);

  const [isAddNavModalOpen, setIsAddNavModalOpen] = useState<boolean>(false);
  const [newNavLabel, setNewNavLabel] = useState<string>("");
  const [newNavHref, setNewNavHref] = useState<string>("#services");
  const [newNavIsExternal, setNewNavIsExternal] = useState<boolean>(false);

  // Disaster Recovery / Factory Reset modal state
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [resetStep, setResetStep] = useState<1 | 2>(1);

  // Round 19: Offline draft & network error recovery states
  const [tenantId, setTenantId] = useState<string>("");
  const [hasOfflineDraft, setHasOfflineDraft] = useState<boolean>(false);
  const [offlineDraftTimestamp, setOfflineDraftTimestamp] = useState<number>(0);
  const [saveFailed, setSaveFailed] = useState<boolean>(false);

  // Round 32: Site Health Diagnostic Modal state
  const [isHealthModalOpen, setIsHealthModalOpen] = useState<boolean>(false);
  const [healthReport, setHealthReport] = useState<any>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState<boolean>(false);

  // Round 33: Revision History & 1-Click Rollback Modal state
  const [isRevisionsModalOpen, setIsRevisionsModalOpen] = useState<boolean>(false);
  const [revisionsList, setRevisionsList] = useState<any[]>([]);
  const [isLoadingRevisions, setIsLoadingRevisions] = useState<boolean>(false);
  const [isRollingBack, setIsRollingBack] = useState<boolean>(false);

  // Round 34: WordPress Block Patterns Library state
  const [isPatternLibraryOpen, setIsPatternLibraryOpen] = useState<boolean>(false);
  const [patternFilterCategory, setPatternFilterCategory] = useState<string>("all");

  // Round 35: Gutenberg HTML Import/Export Modal state
  const [isGutenbergModalOpen, setIsGutenbergModalOpen] = useState<boolean>(false);
  const [gutenbergMode, setGutenbergMode] = useState<"export" | "import">("export");
  const [gutenbergHtml, setGutenbergHtml] = useState<string>("");
  const [copiedGutenberg, setCopiedGutenberg] = useState<boolean>(false);
  const [gutenbergError, setGutenbergError] = useState<string | null>(null);

  // Round 39: WordPress theme.json CSS Variables compilation for preview canvas
  const compiledThemeCss = useMemo(() => {
    try {
      const tj = generateThemeJson(
        { themeColor: config.themeColor, fontFamily: config.fontFamily },
        config.headline
      );
      return compileThemeJsonToCss(tj);
    } catch {
      return "";
    }
  }, [config.themeColor, config.fontFamily, config.headline]);

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
              if (data.tenant.id) setTenantId(data.tenant.id);
              if (data.tenant.name) {
                setShopName(data.tenant.name);
                setInitialShopName(data.tenant.name);
              }
              if (data.tenant.slug) setShopSlug(data.tenant.slug);

              // Check for locally backed-up offline draft
              const targetKey = `fixme_storefront_draft_${data.tenant.id || data.tenant.slug || "default"}`;
              try {
                const localDraftRaw = typeof window !== "undefined" ? localStorage.getItem(targetKey) : null;
                if (localDraftRaw) {
                  const parsed = JSON.parse(localDraftRaw);
                  if (parsed?.savedAt) {
                    setHasOfflineDraft(true);
                    setOfflineDraftTimestamp(parsed.savedAt);
                  }
                }
              } catch (_) {}
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

  // Round 19: Auto-save offline draft to localStorage when dirty
  useEffect(() => {
    if (!isDirty || typeof window === "undefined") return;
    const key = `fixme_storefront_draft_${tenantId || shopSlug || "default"}`;
    const timer = setTimeout(() => {
      try {
        const draft = {
          config,
          shopName,
          casesList,
          sectionsOrder,
          customSectionsList,
          customPagesList,
          navMenuList,
          savedAt: Date.now(),
        };
        localStorage.setItem(key, JSON.stringify(draft));
      } catch (_) {}
    }, 1000);
    return () => clearTimeout(timer);
  }, [
    isDirty,
    config,
    shopName,
    casesList,
    sectionsOrder,
    customSectionsList,
    customPagesList,
    navMenuList,
    tenantId,
    shopSlug,
  ]);

  // Restore offline draft
  const restoreOfflineDraft = () => {
    const key = `fixme_storefront_draft_${tenantId || shopSlug || "default"}`;
    try {
      const local = typeof window !== "undefined" ? localStorage.getItem(key) : null;
      if (!local) return;
      const parsed = JSON.parse(local);
      if (parsed.config) setConfig(parsed.config);
      if (parsed.shopName) setShopName(parsed.shopName);
      if (parsed.casesList) setCasesList(parsed.casesList);
      if (parsed.sectionsOrder) setSectionsOrder(parsed.sectionsOrder);
      if (parsed.customSectionsList) setCustomSectionsList(parsed.customSectionsList);
      if (parsed.customPagesList) setCustomPagesList(parsed.customPagesList);
      if (parsed.navMenuList) setNavMenuList(parsed.navMenuList);
      setHasOfflineDraft(false);
      setToast({
        message: "กู้คืนข้อมูลฉบับร่างที่สำรองไว้ในเครื่องเรียบร้อยแล้ว",
        type: "success",
      });
    } catch (err) {
      console.error("Failed to restore draft:", err);
    }
  };

  // Discard offline draft
  const discardOfflineDraft = () => {
    const key = `fixme_storefront_draft_${tenantId || shopSlug || "default"}`;
    try {
      if (typeof window !== "undefined") localStorage.removeItem(key);
    } catch (_) {}
    setHasOfflineDraft(false);
    setToast({ message: "ละทิ้งฉบับร่างเรียบร้อยแล้ว", type: "warning" });
  };

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
    if (isSaving) return; // Prevent concurrent duplicate saves & race conditions
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

        // Round 19: Clear local offline draft upon verified server save
        const draftKey = `fixme_storefront_draft_${tenantId || shopSlug || "default"}`;
        try {
          if (typeof window !== "undefined") localStorage.removeItem(draftKey);
        } catch (_) {}
        setSaveFailed(false);
        setHasOfflineDraft(false);

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
        // Round 19: Persist local draft backup on server error
        const draftKey = `fixme_storefront_draft_${tenantId || shopSlug || "default"}`;
        try {
          const draftPayload = {
            config,
            shopName,
            casesList,
            sectionsOrder,
            customSectionsList,
            customPagesList,
            navMenuList,
            savedAt: Date.now(),
          };
          if (typeof window !== "undefined") localStorage.setItem(draftKey, JSON.stringify(draftPayload));
        } catch (_) {}
        setSaveFailed(true);
        setToast({
          message: data.error || `ไม่สามารถบันทึกข้อมูลได้ (รหัสสถานะ: ${res.status}) - ข้อมูลถูกสำรองไว้ในเครื่องแล้ว`,
          type: "error",
        });
      }
    } catch (err) {
      console.error("Save error:", err);
      // Round 19: Offline resilience backup on network drop
      const draftKey = `fixme_storefront_draft_${tenantId || shopSlug || "default"}`;
      try {
        const draftPayload = {
          config,
          shopName,
          casesList,
          sectionsOrder,
          customSectionsList,
          customPagesList,
          navMenuList,
          savedAt: Date.now(),
        };
        if (typeof window !== "undefined") localStorage.setItem(draftKey, JSON.stringify(draftPayload));
      } catch (_) {}
      setSaveFailed(true);
      setToast({
        message: "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ (ข้อมูลถูกสำรองไว้ในเครื่องแล้ว กด 'ลองใหม่')",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Execute Factory Reset / Disaster Recovery
  const executeResetDefaults = () => {
    setConfig({ ...DEFAULT_STOREFRONT_CONFIG });
    setCasesList([...BEFORE_AFTER_CASES]);
    setSectionsOrder([...DEFAULT_SECTIONS_ORDER]);
    setCustomSectionsList([]);
    setCustomPagesList([...DEFAULT_CUSTOM_PAGES]);
    setNavMenuList([...DEFAULT_NAV_MENU]);
    setSelectedPageSlug("");
    setIsResetModalOpen(false);
    setResetStep(1);

    // Clear auto-saved localStorage draft if present
    try {
      if (typeof window !== "undefined" && shopSlug) {
        localStorage.removeItem(`fixme_storefront_draft_${shopSlug}`);
      }
    } catch (_) {}

    setToast({
      message: "รีเซ็ตค่ากลับเป็นพิมพ์เขียวมาตรฐาน (Blueprint) เรียบร้อยแล้ว (คลิก 'บันทึกการเปลี่ยนแปลง' เพื่อนำไปใช้งานจริง)",
      type: "success",
    });
  };

  // Round 35: Import blocks from Gutenberg HTML markup
  const handleImportGutenberg = () => {
    if (!gutenbergHtml.trim()) {
      setGutenbergError("กรุณาวางโค้ด Gutenberg HTML ก่อนดำเนินการนำเข้า");
      return;
    }
    try {
      const parsedBlocks = parseGutenbergContent(gutenbergHtml);
      if (!parsedBlocks || parsedBlocks.length === 0) {
        setGutenbergError("ไม่พบโครงสร้างบล็อก Gutenberg ที่ถูกต้องในโค้ดที่วาง");
        return;
      }

      if (selectedPageSlug && activeSubPage) {
        // Append blocks to active subpage
        setCustomPagesList((prev) =>
          prev.map((page) =>
            page.slug === selectedPageSlug
              ? {
                  ...page,
                  sections: [...(page.sections || []), ...parsedBlocks],
                }
              : page
          )
        );
      } else {
        // Append blocks to customSectionsList and sectionsOrder
        setCustomSectionsList((prev) => [...prev, ...parsedBlocks]);
        setSectionsOrder((prev) => [
          ...prev,
          ...parsedBlocks.map((b) => b.id).filter((id) => !prev.includes(id)),
        ]);
      }

      setToast({
        message: `นำเข้าบล็อก WordPress Gutenberg สำเร็จ ${parsedBlocks.length} บล็อก!`,
        type: "success",
      });
      setIsGutenbergModalOpen(false);
      setGutenbergHtml("");
      setGutenbergError(null);
    } catch (err: any) {
      setGutenbergError(`เกิดข้อผิดพลาดในการแปลงบล็อก: ${err?.message || "Invalid markup"}`);
    }
  };

  // Reset to Defaults (Opens double-confirmation Disaster Recovery modal)
  const handleResetDefaults = () => {
    setResetStep(1);
    setIsResetModalOpen(true);
  };

  // Round 32: Open Site Health Diagnostic modal & fetch report
  const handleOpenSiteHealth = async () => {
    setIsHealthModalOpen(true);
    setIsLoadingHealth(true);
    try {
      const res = await fetch("/api/storefront/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: {
            ...config,
            sectionsOrder: JSON.stringify(sectionsOrder),
            customSections: JSON.stringify(customSectionsList),
            customPages: JSON.stringify(customPagesList),
            navigationMenu: JSON.stringify(navMenuList),
          },
        }),
      });
      const data = await res.json();
      if (data.success && data.report) {
        setHealthReport(data.report);
      }
    } catch (err) {
      console.error("Site Health fetch error:", err);
    } finally {
      setIsLoadingHealth(false);
    }
  };

  // Round 33: Open Revisions History modal & fetch revisions
  const handleOpenRevisions = async () => {
    setIsRevisionsModalOpen(true);
    setIsLoadingRevisions(true);
    try {
      const res = await fetch("/api/storefront/config?action=revisions");
      const data = await res.json();
      if (data.success && Array.isArray(data.revisions)) {
        setRevisionsList(data.revisions);
      }
    } catch (err) {
      console.error("Revisions fetch error:", err);
    } finally {
      setIsLoadingRevisions(false);
    }
  };

  // Round 33: Rollback to selected revision
  const handleRollback = async (revisionId: string) => {
    if (!confirm("คุณต้องการย้อนกลับไปยังเวอร์ชันนี้หรือไม่? การเปลี่ยนแปลงที่ยังไม่ได้บันทึกจะถูกแทนที่")) {
      return;
    }
    setIsRollingBack(true);
    try {
      const res = await fetch("/api/storefront/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rollback", revisionId }),
      });
      const data = await res.json();
      if (data.success && data.config) {
        const restored = data.config;
        setConfig((prev) => ({
          ...prev,
          themeColor: restored.themeColor || prev.themeColor,
          fontFamily: restored.fontFamily || prev.fontFamily,
          heroLayout: restored.heroLayout || prev.heroLayout,
          headline: restored.headline ?? prev.headline,
          subheadline: restored.subheadline ?? prev.subheadline,
          badge: restored.badge ?? prev.badge,
          announcementText: restored.announcementText ?? prev.announcementText,
          announcementEnabled: restored.announcementEnabled ?? prev.announcementEnabled,
          phone: restored.phone ?? prev.phone,
          lineId: restored.lineId ?? prev.lineId,
          lineQrUrl: restored.lineQrUrl ?? prev.lineQrUrl,
          googleMapsUrl: restored.googleMapsUrl ?? prev.googleMapsUrl,
          showLiveTracking: restored.showLiveTracking ?? prev.showLiveTracking,
          showHardwareScanner: restored.showHardwareScanner ?? prev.showHardwareScanner,
          showServicesBento: restored.showServicesBento ?? prev.showServicesBento,
          showInspectionBench: restored.showInspectionBench ?? prev.showInspectionBench,
          showPriceEstimator: restored.showPriceEstimator ?? prev.showPriceEstimator,
          showBeforeAfterSlider: restored.showBeforeAfterSlider ?? prev.showBeforeAfterSlider,
          showCustomerReviews: restored.showCustomerReviews ?? prev.showCustomerReviews,
          showLocationSection: restored.showLocationSection ?? prev.showLocationSection,
          showFaqSection: restored.showFaqSection ?? prev.showFaqSection,
          showMobileQuickBar: restored.showMobileQuickBar ?? prev.showMobileQuickBar,
        }));
        if (restored.sectionsOrder) setSectionsOrder(safeParseSectionsOrder(restored.sectionsOrder));
        if (restored.customSections) setCustomSectionsList(safeParseCustomSections(restored.customSections));
        if (restored.customPages) setCustomPagesList(safeParseCustomPages(restored.customPages));
        if (restored.navigationMenu) setNavMenuList(safeParseNavMenu(restored.navigationMenu));
        setInitialConfig(restored);
        if (restored.sectionsOrder) setInitialSectionsOrder(safeParseSectionsOrder(restored.sectionsOrder));
        if (restored.customSections) setInitialCustomSectionsList(safeParseCustomSections(restored.customSections));
        if (restored.customPages) setInitialCustomPagesList(safeParseCustomPages(restored.customPages));
        if (restored.navigationMenu) setInitialNavMenuList(safeParseNavMenu(restored.navigationMenu));
        setIsRevisionsModalOpen(false);
        setToast({
          message: "ย้อนกลับไปยังเวอร์ชันที่เลือกเรียบร้อยแล้ว",
          type: "success",
        });
      } else {
        setToast({
          message: data.error || "เกิดข้อผิดพลาดในการย้อนกลับเวอร์ชัน",
          type: "error",
        });
      }
    } catch {
      setToast({
        message: "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์",
        type: "error",
      });
    } finally {
      setIsRollingBack(false);
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
      if (idx < 0 || idx >= subBlocks.length || targetIdx < 0 || targetIdx >= subBlocks.length) return;
      const [moved] = subBlocks.splice(idx, 1);
      if (!moved) return;
      subBlocks.splice(targetIdx, 0, moved);

      setCustomPagesList((prev) =>
        prev.map((p) => (p.slug === selectedPageSlug ? { ...p, sections: subBlocks } : p))
      );
    } else {
      // Reorder home page sectionsOrder
      const current = [...sectionsOrder];
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (idx < 0 || idx >= current.length || targetIdx < 0 || targetIdx >= current.length) return;
      const [moved] = current.splice(idx, 1);
      if (!moved) return;
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

  // Round 34: Insert WordPress Synced Pattern into active page or homepage
  const handleInsertPattern = (pattern: BlockPattern) => {
    try {
      const expandedBlocks = expandPattern(pattern.name, undefined, tenantId);
      if (!expandedBlocks || expandedBlocks.length === 0) {
        setToast({ message: "ไม่พบบล็อกในชุดคลังสำเร็จรูปนี้", type: "error" });
        return;
      }

      if (selectedPageSlug && activeSubPage) {
        // Insert into active custom subpage
        setCustomPagesList((prev) =>
          prev.map((p) =>
            p.slug === selectedPageSlug
              ? { ...p, sections: [...(p.sections || []), ...expandedBlocks] }
              : p
          )
        );
      } else {
        // Insert into Home page custom sections
        setCustomSectionsList((prev) => [...prev, ...expandedBlocks]);
        setSectionsOrder((prev) => [...prev, ...expandedBlocks.map((b) => b.id)]);
      }

      setIsPatternLibraryOpen(false);
      setToast({
        message: `เพิ่มบล็อกสำเร็จรูป "${pattern.title}" (${expandedBlocks.length} บล็อก) เรียบร้อยแล้ว`,
        type: "success",
      });
    } catch (err) {
      console.error("Failed to insert block pattern:", err);
      setToast({ message: "เกิดข้อผิดพลาดในการเพิ่มบล็อกสำเร็จรูป", type: "error" });
    }
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

  // Duplicate Custom Block
  const handleDuplicateBlock = (blockId: string) => {
    const newId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? `block_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`
        : `block_${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${Math.floor(Math.random() * 10000)}`;

    if (selectedPageSlug && activeSubPage) {
      const subBlocks = [...(activeSubPage.sections || [])];
      const sourceIdx = subBlocks.findIndex((b) => b.id === blockId);
      if (sourceIdx === -1) return;
      const sourceBlock = subBlocks[sourceIdx];
      const clonedBlock: CustomBlock = JSON.parse(JSON.stringify(sourceBlock));
      clonedBlock.id = newId;
      clonedBlock.title = sourceBlock.title ? `${sourceBlock.title} (คัดลอก)` : "บล็อกคัดลอก";
      subBlocks.splice(sourceIdx + 1, 0, clonedBlock);

      setCustomPagesList((prev) =>
        prev.map((p) => (p.slug === selectedPageSlug ? { ...p, sections: subBlocks } : p))
      );
    } else {
      const customBlock = customSectionsList.find((b) => b.id === blockId);
      if (!customBlock) return;
      const clonedBlock: CustomBlock = JSON.parse(JSON.stringify(customBlock));
      clonedBlock.id = newId;
      clonedBlock.title = customBlock.title ? `${customBlock.title} (คัดลอก)` : "บล็อกคัดลอก";

      setCustomSectionsList((prev) => [...prev, clonedBlock]);
      setSectionsOrder((prev) => {
        const orderIdx = prev.indexOf(blockId);
        if (orderIdx === -1) return [...prev, newId];
        const nextOrder = [...prev];
        nextOrder.splice(orderIdx + 1, 0, newId);
        return nextOrder;
      });
    }

    setToast({ message: "ทำสำเนาบล็อกเรียบร้อยแล้ว", type: "success" });
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
      template: newPageTemplate || "default",
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
    setNewPageTemplate("default");

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
          {/* Round 32: Site Health Diagnostic Button */}
          <button
            type="button"
            onClick={handleOpenSiteHealth}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/80 text-emerald-800 text-xs font-semibold transition-colors min-h-[36px]"
            title="ตรวจสอบความพร้อมและสุขภาพเว็บไซต์ (Site Health Diagnostic)"
          >
            <Activity className="h-3.5 w-3.5 text-emerald-600" />
            <span className="hidden sm:inline">สุขภาพเว็บ</span>
          </button>

          {/* Round 33: Revision History Button */}
          <button
            type="button"
            onClick={handleOpenRevisions}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors min-h-[36px]"
            title="ดูประวัติการแก้ไขและย้อนกลับเวอร์ชัน (Revisions)"
          >
            <History className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden sm:inline">ประวัติแก้ไข</span>
          </button>

          {/* Round 35: Gutenberg HTML Import/Export Modal Button */}
          <button
            type="button"
            onClick={() => {
              const targetBlocks =
                selectedPageSlug && activeSubPage
                  ? activeSubPage.sections || []
                  : customSectionsList;
              setGutenbergHtml(serializeToGutenberg(targetBlocks));
              setGutenbergMode("export");
              setGutenbergError(null);
              setCopiedGutenberg(false);
              setIsGutenbergModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/80 text-indigo-800 text-xs font-semibold transition-colors min-h-[36px]"
            title="แปลงโค้ดบล็อก WordPress Gutenberg (นำเข้า / ส่งออก)"
          >
            <Code className="h-3.5 w-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Gutenberg WP</span>
          </button>

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

          {saveFailed && (
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-xs transition-all active:scale-95 min-h-[36px]"
              title="ลองบันทึกอีกครั้ง"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${isSaving ? "animate-spin" : ""}`} />
              <span>ลองใหม่</span>
            </button>
          )}

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

      {/* Round 19: Offline Draft Restoration Banner */}
      {hasOfflineDraft && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between text-xs text-amber-900 gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold">⚠️ พบฉบับร่างที่บันทึกไว้ในเครื่อง (Offline Backup):</span>
            <span className="text-amber-700">
              {offlineDraftTimestamp ? `บันทึกเมื่อ ${new Date(offlineDraftTimestamp).toLocaleTimeString("th-TH")}` : "บันทึกจากการแก้ไขล่าสุด"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={restoreOfflineDraft}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
            >
              กู้คืนฉบับร่าง
            </button>
            <button
              type="button"
              onClick={discardOfflineDraft}
              className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-300 text-amber-800 rounded-lg font-medium transition-colors"
            >
              ละทิ้ง
            </button>
          </div>
        </div>
      )}

      {/* Round 19: Network Save Error Banner with Retry */}
      {saveFailed && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2.5 flex items-center justify-between text-xs text-rose-900 gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>การเชื่อมต่อขัดข้อง: บันทึกข้อมูลไม่สำเร็จ แต่ข้อมูลถูกสำรองไว้ในเครื่องแล้ว (Offline Backup)</span>
          </div>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold shadow-xs transition-colors shrink-0 flex items-center gap-1.5"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${isSaving ? "animate-spin" : ""}`} />
            <span>ลองบันทึกอีกครั้ง</span>
          </button>
        </div>
      )}

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
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const targetBlocks =
                          selectedPageSlug && activeSubPage
                            ? activeSubPage.sections || []
                            : customSectionsList;
                        setGutenbergHtml(serializeToGutenberg(targetBlocks));
                        setGutenbergMode("export");
                        setGutenbergError(null);
                        setCopiedGutenberg(false);
                        setIsGutenbergModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold transition-all shadow-2xs"
                      title="ส่งออก / นำเข้าโค้ด WordPress Gutenberg"
                    >
                      <Code className="h-3.5 w-3.5 text-slate-600" />
                      <span className="hidden sm:inline">Gutenberg Code</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPatternLibraryOpen(true)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-all shadow-2xs"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                      <span>คลังสำเร็จรูป (Patterns)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddBlockModalOpen(true)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>เพิ่มบล็อก</span>
                    </button>
                  </div>
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

                        {/* Duplicate Custom Block */}
                        {item.isCustom && item.block && (
                          <button
                            type="button"
                            onClick={() => handleDuplicateBlock(item.id)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                            title="ทำสำเนาบล็อกนี้ (Duplicate)"
                          >
                            <Copy className="h-3.5 w-3.5" />
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

                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsAddBlockModalOpen(true)}
                    className="py-3 px-4 rounded-2xl border border-dashed border-slate-300 hover:border-emerald-500 bg-white hover:bg-emerald-50/30 text-xs font-bold text-slate-700 hover:text-emerald-700 flex items-center justify-center gap-2 transition-all shadow-2xs"
                  >
                    <Plus className="h-4 w-4" />
                    <span>เพิ่มบล็อกเดี่ยว (Add Block)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPatternLibraryOpen(true)}
                    className="py-3 px-4 rounded-2xl border border-dashed border-indigo-300 hover:border-indigo-500 bg-white hover:bg-indigo-50/40 text-xs font-bold text-indigo-700 flex items-center justify-center gap-2 transition-all shadow-2xs"
                  >
                    <Sparkles className="h-4 w-4 text-indigo-600" />
                    <span>เลือกชุดบล็อกสำเร็จรูป (Pattern Library)</span>
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
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-900 truncate">{p.title}</span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-100 text-emerald-800 shrink-0">
                                /{p.slug}
                              </span>
                              {p.published === false ? (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                                  ฉบับร่าง (Draft)
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                  เผยแพร่แล้ว
                                </span>
                              )}
                              {p.template && p.template !== "default" && (
                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono border shrink-0 ${
                                  p.template === "blank-canvas"
                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                    : p.template === "sidebar-right"
                                    ? "bg-sky-50 text-sky-700 border-sky-200"
                                    : p.template === "boxed-fluid"
                                    ? "bg-purple-50 text-purple-700 border-purple-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                }`}>
                                  {p.template}
                                </span>
                              )}
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

                            {/* Draft / Published & Template Controls */}
                            <div className="grid grid-cols-2 gap-3 pt-1">
                              <div>
                                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                                  สถานะการเผยแพร่ (Status)
                                </label>
                                <select
                                  value={p.published !== false ? "published" : "draft"}
                                  onChange={(e) => {
                                    const isPub = e.target.value === "published";
                                    setCustomPagesList((prev) =>
                                      prev.map((item) => (item.slug === p.slug ? { ...item, published: isPub } : item))
                                    );
                                  }}
                                  className="w-full text-xs h-8 px-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-medium"
                                >
                                  <option value="published">🟢 เผยแพร่แล้ว (Published)</option>
                                  <option value="draft">🟡 ฉบับร่าง (Draft / Unpublished)</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                                  รูปแบบหน้า (Template)
                                </label>
                                <select
                                  value={p.template || "default"}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setCustomPagesList((prev) =>
                                      prev.map((item) => (item.slug === p.slug ? { ...item, template: val } : item))
                                    );
                                  }}
                                  className="w-full text-xs h-8 px-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-medium"
                                >
                                  <option value="default">ค่ามาตรฐาน (Default with Banner)</option>
                                  <option value="blank-canvas">หน้าว่าง / แคมเปญ (Blank Canvas)</option>
                                  <option value="sidebar-right">คอลัมน์คู่พร้อมแถบข้าง (Sidebar Right)</option>
                                  <option value="boxed-fluid">การ์ดลอยจัดกึ่งกลาง (Boxed Fluid Card)</option>
                                  <option value="landing-lead">โปรโมตยอดขาย (Landing Lead)</option>
                                </select>
                              </div>
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

            {/* Round 39: WordPress theme.json CSS Variables preview style */}
            <style
              id="wp-theme-json-preview-presets"
              dangerouslySetInnerHTML={{ __html: compiledThemeCss }}
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
                    themeColor={config.themeColor}
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
                            tenantInfo={{ phone: config.phone, lineId: config.lineId, shopName, shopSlug }}
                            shopSlug={shopSlug}
                          />
                        ))}
                      </div>

                      {/* Footer */}
                      <LandingFooter
                        shopName={shopName}
                        shopSlug={shopSlug}
                        phone={config.phone}
                        hiddenSections={hiddenSections}
                        isSubpage={true}
                        themeColor={config.themeColor}
                      />
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
                              themeColor={config.themeColor}
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
                              themeColor={config.themeColor}
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
                              tenantInfo={{ phone: config.phone, lineId: config.lineId, shopName, shopSlug }}
                            shopSlug={shopSlug}
                            />
                          );
                        }

                        return null;
                      })}

                      {/* Footer */}
                      <LandingFooter
                        shopName={shopName}
                        shopSlug={shopSlug}
                        phone={config.phone}
                        hiddenSections={hiddenSections}
                        isSubpage={false}
                        themeColor={config.themeColor}
                      />
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
                      themeColor={config.themeColor}
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
                              tenantInfo={{ phone: config.phone, lineId: config.lineId, shopName, shopSlug }}
                            shopSlug={shopSlug}
                            />
                          ))}
                        </div>
                        <LandingFooter
                          shopName={shopName}
                          shopSlug={shopSlug}
                          phone={config.phone}
                          hiddenSections={hiddenSections}
                          isSubpage={true}
                          themeColor={config.themeColor}
                        />
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
                                themeColor={config.themeColor}
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
                                themeColor={config.themeColor}
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
                                tenantInfo={{ phone: config.phone, lineId: config.lineId, shopName, shopSlug }}
                            shopSlug={shopSlug}
                              />
                            );
                          }
                          return null;
                        })}
                        <LandingFooter
                          shopName={shopName}
                          shopSlug={shopSlug}
                          phone={config.phone}
                          hiddenSections={hiddenSections}
                          isSubpage={false}
                          themeColor={config.themeColor}
                        />
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
                      themeColor={config.themeColor}
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
                              tenantInfo={{ phone: config.phone, lineId: config.lineId, shopName, shopSlug }}
                            shopSlug={shopSlug}
                            />
                          ))}
                        </div>
                        <LandingFooter
                          shopName={shopName}
                          shopSlug={shopSlug}
                          phone={config.phone}
                          hiddenSections={hiddenSections}
                          isSubpage={true}
                          themeColor={config.themeColor}
                        />
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
                                themeColor={config.themeColor}
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
                                themeColor={config.themeColor}
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
                                tenantInfo={{ phone: config.phone, lineId: config.lineId, shopName, shopSlug }}
                            shopSlug={shopSlug}
                              />
                            );
                          }
                          return null;
                        })}

                        <LandingFooter
                          shopName={shopName}
                          shopSlug={shopSlug}
                          phone={config.phone}
                          hiddenSections={hiddenSections}
                          isSubpage={false}
                          themeColor={config.themeColor}
                        />

                        {config.showMobileQuickBar && (
                          <div className="z-30 sticky bottom-0">
                            <MobileQuickBar
                              phone={config.phone}
                              lineId={config.lineId}
                              shopSlug={shopSlug}
                              showEstimate={config.showPriceEstimator}
                              themeColor={config.themeColor}
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
                <label className="text-xs font-semibold text-slate-700 block">รูปแบบเทมเพลต (Page Template)</label>
                <select
                  value={newPageTemplate}
                  onChange={(e) => setNewPageTemplate(e.target.value)}
                  className="w-full text-xs h-10 px-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="default">ค่ามาตรฐาน (Default with Banner)</option>
                  <option value="blank-canvas">หน้าว่าง / แคมเปญ (Blank Canvas / Landing Page)</option>
                  <option value="sidebar-right">คอลัมน์คู่พร้อมแถบข้าง (Sidebar Right)</option>
                  <option value="boxed-fluid">การ์ดลอยจัดกึ่งกลาง (Boxed Fluid Card)</option>
                  <option value="landing-lead">โปรโมตยอดขาย (Landing Lead)</option>
                </select>
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

      {/* MODAL 2.5: WordPress Synced Patterns Library (Round 34) */}
      {isPatternLibraryOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="คลังบล็อกสำเร็จรูป (Pattern Library)"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
        >
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    คลังบล็อกสำเร็จรูป (WordPress Pattern Library)
                  </h3>
                  <p className="text-xs text-slate-500">
                    เลือกชุดบล็อกที่ออกแบบไว้ล่วงหน้าเพื่อแทรกลงใน
                    <strong className="text-slate-800 ml-1">
                      {selectedPageSlug && activeSubPage ? `หน้า "${activeSubPage.title}"` : "หน้าแรก (Home Page)"}
                    </strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPatternLibraryOpen(false)}
                className="min-w-[40px] min-h-[40px] p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors flex items-center justify-center"
                aria-label="ปิดหน้าต่างคลังบล็อกสำเร็จรูป"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 shrink-0">
              {[
                { id: "all", label: "ทั้งหมด" },
                { id: "promotions", label: "โปรโมชั่น (Promotions)" },
                { id: "services", label: "บริการ (Services)" },
                { id: "faq", label: "คำถามที่พบบ่อย (FAQ)" },
                { id: "delivery", label: "การจัดส่ง (Delivery)" },
              ].map((cat) => {
                const isActive = patternFilterCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setPatternFilterCategory(cat.id)}
                    className={`min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Patterns List Grid */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
              {(() => {
                const patterns = getAllBlockPatterns(
                  patternFilterCategory === "all" ? undefined : patternFilterCategory,
                  tenantId
                );

                if (patterns.length === 0) {
                  return (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <p className="text-xs text-slate-500">ไม่พบบล็อกสำเร็จรูปในหมวดหมู่นี้</p>
                    </div>
                  );
                }

                return patterns.map((pat) => (
                  <div
                    key={pat.name}
                    className="p-5 rounded-2xl border border-slate-200/90 hover:border-indigo-400 hover:bg-indigo-50/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs group"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-900">
                          {pat.title}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          {pat.blocks.length} บล็อก
                        </span>
                        {pat.syncStatus === "synced" && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Synced Pattern
                          </span>
                        )}
                      </div>

                      {pat.description && (
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {pat.description}
                        </p>
                      )}

                      {/* Block chips preview */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[11px] text-slate-400 font-medium">ประกอบด้วย:</span>
                        {pat.blocks.map((b, bIdx) => (
                          <span
                            key={`${pat.name}-b-${bIdx}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200/60"
                          >
                            <span>🧩</span>
                            <span>{b.title || b.type}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleInsertPattern(pat)}
                      className="min-h-[42px] px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 shrink-0 group-hover:scale-105"
                    >
                      <Plus className="h-4 w-4" />
                      <span>แทรกชุดบล็อกนี้</span>
                    </button>
                  </div>
                ));
              })()}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0">
              <span className="text-[11px] text-slate-400 font-mono">
                Reverse-engineered WordPress Pattern Architecture
              </span>
              <button
                type="button"
                onClick={() => setIsPatternLibraryOpen(false)}
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

              {/* Contextual: Promo Banner Extra Fields */}
              {editingBlock.type.includes("promo") && (
                <div className="space-y-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block">
                        ข้อความบนปุ่ม (Button Text)
                      </label>
                      <input
                        type="text"
                        value={editingBlock.buttonText || ""}
                        onChange={(e) =>
                          setEditingBlock({
                            ...editingBlock,
                            buttonText: e.target.value,
                          })
                        }
                        className="w-full text-xs h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block">
                        ลิงก์ปลายทาง (Button URL)
                      </label>
                      <input
                        type="text"
                        value={editingBlock.buttonUrl || ""}
                        onChange={(e) =>
                          setEditingBlock({
                            ...editingBlock,
                            buttonUrl: e.target.value,
                          })
                        }
                        className="w-full text-xs h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-mono"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block">
                        โค้ดส่วนลด (Coupon / Discount Tag)
                      </label>
                      <input
                        type="text"
                        value={editingBlock.discountTag || ""}
                        onChange={(e) =>
                          setEditingBlock({
                            ...editingBlock,
                            discountTag: e.target.value,
                          })
                        }
                        placeholder="เช่น SAVE200 หรือ BATTERY10"
                        className="w-full text-xs h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block">
                        เงื่อนไข/เวลาหมดเขต (Expiry Notice)
                      </label>
                      <input
                        type="text"
                        value={editingBlock.expiryNotice || ""}
                        onChange={(e) =>
                          setEditingBlock({
                            ...editingBlock,
                            expiryNotice: e.target.value,
                          })
                        }
                        placeholder="เช่น จำกัด 50 สิทธิ์แรกของเดือน"
                        className="w-full text-xs h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Contextual: CTA Block Extra Fields */}
              {editingBlock.type.includes("cta") && (
                <div className="space-y-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block">
                        ข้อความปุ่มพิเศษ (Custom Button Text)
                      </label>
                      <input
                        type="text"
                        value={editingBlock.customButtonText || editingBlock.buttonText || ""}
                        onChange={(e) =>
                          setEditingBlock({
                            ...editingBlock,
                            customButtonText: e.target.value,
                            buttonText: e.target.value,
                          })
                        }
                        className="w-full text-xs h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block">
                        ลิงก์ปุ่มพิเศษ (Custom Button URL)
                      </label>
                      <input
                        type="text"
                        value={editingBlock.customButtonUrl || editingBlock.buttonUrl || ""}
                        onChange={(e) =>
                          setEditingBlock({
                            ...editingBlock,
                            customButtonUrl: e.target.value,
                            buttonUrl: e.target.value,
                          })
                        }
                        className="w-full text-xs h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block">
                      จุดเด่นบริการ / สิทธิประโยชน์ (Benefits คั่นด้วยจุลภาค ,)
                    </label>
                    <input
                      type="text"
                      value={
                        Array.isArray(editingBlock.benefits)
                          ? editingBlock.benefits.join(", ")
                          : editingBlock.benefits || ""
                      }
                      onChange={(e) => {
                        const list = e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean);
                        setEditingBlock({ ...editingBlock, benefits: list });
                      }}
                      placeholder="ตรวจเช็ค 10 จุดฟรี, อะไหล่แท้ตรงรุ่น, รอรับเครื่องใน 30 นาที"
                      className="w-full text-xs h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-900"
                    />
                  </div>
                </div>
              )}

              {/* Contextual: Photo Gallery */}
              {(editingBlock.type.includes("gallery") || editingBlock.type.includes("photo")) && (
                <div className="space-y-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block">
                      จำนวนคอลัมน์ (Columns)
                    </label>
                    <select
                      value={editingBlock.columns || 3}
                      onChange={(e) =>
                        setEditingBlock({ ...editingBlock, columns: Number(e.target.value) })
                      }
                      className="w-full text-xs h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-medium"
                    >
                      <option value={2}>2 คอลัมน์ (ภาพใหญ่ชัดเจน)</option>
                      <option value={3}>3 คอลัมน์ (ค่ามาตรฐาน)</option>
                      <option value={4}>4 คอลัมน์ (ภาพขนาดกะทัดรัด)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block">
                      รายการรูปภาพและคำบรรยาย (1 บรรทัดต่อ 1 รูป: URL | คำบรรยาย)
                    </label>
                    <p className="text-[11px] text-slate-500 mb-1">
                      ตัวอย่าง: https://images.unsplash.com/... | งานซ่อมบอร์ดไอซี
                    </p>
                    <textarea
                      rows={4}
                      value={
                        Array.isArray(editingBlock.images)
                          ? editingBlock.images
                              .map((img: any) =>
                                typeof img === "string"
                                  ? img
                                  : `${img.url || ""}${img.caption ? ` | ${img.caption}` : ""}`
                              )
                              .join("\n")
                          : ""
                      }
                      onChange={(e) => {
                        const lines = e.target.value.split("\n").filter((l) => l.trim().length > 0);
                        const parsed = lines.map((l) => {
                          const parts = l.split("|");
                          return {
                            url: parts[0]?.trim() || "",
                            caption: parts[1]?.trim() || "",
                          };
                        });
                        setEditingBlock({ ...editingBlock, images: parsed });
                      }}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-mono"
                      placeholder="https://images.unsplash.com/... | ภาพผลงาน 1&#10;https://images.unsplash.com/... | ภาพผลงาน 2"
                    />
                  </div>
                </div>
              )}

              {/* Contextual: Video Embed */}
              {editingBlock.type.includes("video") && (
                <div className="space-y-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block">
                      URL วิดีโอ (YouTube / TikTok / MP4)
                    </label>
                    <input
                      type="text"
                      value={editingBlock.videoUrl || ""}
                      onChange={(e) => setEditingBlock({ ...editingBlock, videoUrl: e.target.value })}
                      className="w-full text-xs h-9 px-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-mono"
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block">
                      อัตราส่วนวิดีโอ (Aspect Ratio)
                    </label>
                    <select
                      value={editingBlock.aspectRatio || "16:9"}
                      onChange={(e) =>
                        setEditingBlock({ ...editingBlock, aspectRatio: e.target.value as any })
                      }
                      className="w-full text-xs h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-medium"
                    >
                      <option value="16:9">16:9 แนวนอน (YouTube มาตรฐาน)</option>
                      <option value="4:3">4:3 คลาสสิก</option>
                      <option value="1:1">1:1 จัตุรัส (TikTok / Reels)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Contextual: Rich Text Content */}
              {editingBlock.type.includes("rich") && (
                <div className="space-y-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block">
                      การจัดวางข้อความ (Text Alignment)
                    </label>
                    <select
                      value={editingBlock.align || "left"}
                      onChange={(e) =>
                        setEditingBlock({ ...editingBlock, align: e.target.value as any })
                      }
                      className="w-full text-xs h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-medium"
                    >
                      <option value="left">ชิดซ้าย (Left Align)</option>
                      <option value="center">กึ่งกลาง (Center Align)</option>
                      <option value="right">ชิดขวา (Right Align)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block">
                      เนื้อหาบทความ (Article Content Markdown)
                    </label>
                    <textarea
                      rows={6}
                      value={editingBlock.content || ""}
                      onChange={(e) => setEditingBlock({ ...editingBlock, content: e.target.value })}
                      className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Contextual: HTML Snippet & Height */}
              {editingBlock.type.includes("html") && (
                <div className="space-y-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block">
                      ความสูงของบล็อก (Height in px: 150 - 800px)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={150}
                        max={800}
                        step={10}
                        value={Number(editingBlock.height || 450)}
                        onChange={(e) =>
                          setEditingBlock({ ...editingBlock, height: Number(e.target.value) })
                        }
                        className="flex-1 accent-emerald-600"
                      />
                      <span className="text-xs font-mono font-bold text-slate-800 w-14 text-right">
                        {editingBlock.height || 450}px
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block">
                      โค้ด HTML Snippet
                    </label>
                    <textarea
                      rows={5}
                      value={editingBlock.html || ""}
                      onChange={(e) => setEditingBlock({ ...editingBlock, html: e.target.value })}
                      className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-mono"
                      placeholder="<div ...>...</div>"
                    />
                  </div>
                </div>
              )}

              {/* Contextual: Business Hours Block */}
              {(editingBlock.type.includes("hour") ||
                editingBlock.type.includes("business") ||
                editingBlock.type.includes("schedule")) && (
                <div className="space-y-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block">
                      ข้อความแจ้งกรณีฉุกเฉิน (Emergency Note)
                    </label>
                    <input
                      type="text"
                      value={editingBlock.emergencyNote || ""}
                      onChange={(e) =>
                        setEditingBlock({ ...editingBlock, emergencyNote: e.target.value })
                      }
                      placeholder="เช่น กรณีฉุกเฉินนอกเวลาทำการ ติดต่อ LINE OA ตลอด 24 ชม."
                      className="w-full text-xs h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block">
                      ตารางเวลาทำการ (1 บรรทัดต่อช่วงวัน: วัน | เวลา | เปิด/ปิด)
                    </label>
                    <p className="text-[11px] text-slate-500 mb-1">
                      ตัวอย่าง: วันจันทร์ - วันศุกร์ | 09:00 - 19:30 | เปิด
                    </p>
                    <textarea
                      rows={4}
                      value={
                        Array.isArray(editingBlock.schedule || editingBlock.hours)
                          ? (editingBlock.schedule || editingBlock.hours)
                              .map((item: any) => {
                                const day = item.day || "";
                                const time =
                                  item.hours ||
                                  item.hoursText ||
                                  (item.open && item.close ? `${item.open} - ${item.close}` : "09:00 - 19:30");
                                const status = item.isClosed || item.isOpen === false ? "ปิด" : "เปิด";
                                return `${day} | ${time} | ${status}`;
                              })
                              .join("\n")
                          : ""
                      }
                      onChange={(e) => {
                        const lines = e.target.value.split("\n").filter((l) => l.trim().length > 0);
                        const parsedSchedule = lines.map((line) => {
                          const parts = line.split("|").map((p) => p.trim());
                          const day = parts[0] || "";
                          const hours = parts[1] || "09:00 - 19:30";
                          const isClosed = parts[2] === "ปิด";
                          const times = hours.split("-").map((t) => t.replace("น.", "").trim());
                          const open = times[0] || "09:00";
                          const close = times[1] || "19:30";
                          return {
                            day,
                            open,
                            close,
                            hours,
                            hoursText: `${hours} น.`,
                            isClosed,
                            isOpen: !isClosed,
                          };
                        });
                        setEditingBlock({
                          ...editingBlock,
                          schedule: parsedSchedule,
                          hours: parsedSchedule,
                        });
                      }}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-mono"
                      placeholder="วันจันทร์ - วันศุกร์ | 09:00 - 19:30 | เปิด&#10;วันเสาร์ - วันอาทิตย์ | 10:00 - 18:30 | เปิด"
                    />
                  </div>
                </div>
              )}

              {/* Universal: Custom CSS Class */}
              <div className="pt-2 border-t border-slate-100">
                <label className="text-xs font-semibold text-slate-700 block">
                  คลาส CSS กำหนดเอง (Custom CSS Class)
                </label>
                <input
                  type="text"
                  value={editingBlock.customCssClass || ""}
                  onChange={(e) =>
                    setEditingBlock({ ...editingBlock, customCssClass: e.target.value })
                  }
                  placeholder="เช่น custom-promo-shadow border-t-2"
                  className="w-full text-xs h-9 px-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-mono"
                />
              </div>
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

      {/* MODAL 5: Disaster Recovery & Factory Reset Double Confirmation Modal */}
      {isResetModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="กู้คืนการตั้งค่าเริ่มต้นมาตรฐาน"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${resetStep === 1 ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"}`}>
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {resetStep === 1 ? "กู้คืนการตั้งค่าเริ่มต้น (Factory Reset)" : "ยืนยันการคืนค่าขั้นสุดท้าย (Double Confirm)"}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    ขั้นตอนที่ {resetStep} จาก 2
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsResetModalOpen(false);
                  setResetStep(1);
                }}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                aria-label="ปิดหน้าต่างยืนยัน"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {resetStep === 1 ? (
              <div className="space-y-3.5 text-xs text-slate-600 leading-relaxed">
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-900 space-y-1.5">
                  <span className="font-bold flex items-center gap-1.5 text-amber-800">
                    ⚠️ คำเตือนการรีเซ็ตหน้าร้าน
                  </span>
                  <p className="text-[11px]">
                    ระบบจะล้างการปรับแต่งธีม สี บล็อกกำหนดเอง และเมนูนำทางทั้งหมด เพื่อคืนค่ากลับสู่พิมพ์เขียวมาตรฐาน (Blueprint Template)
                  </p>
                </div>

                <ul className="space-y-1.5 pl-2 list-disc text-slate-600 text-[11px]">
                  <li>ธีมและสี: รีเซ็ตเป็นสี Emerald (เขียวมรกต)</li>
                  <li>ฟอนต์: รีเซ็ตเป็น Anuphan</li>
                  <li>บล็อกกำหนดเอง: ล้างบล็อกที่เพิ่มเองทั้งหมด</li>
                  <li>หน้าพิเศษ: คืนค่าเป็นหน้าตัวอย่างมาตรฐาน</li>
                  <li>เมนูนำทาง: รีเซ็ตกลับเป็นเมนูมาตรฐาน</li>
                </ul>

                <p className="text-slate-500 text-[11px] pt-1">
                  คลิก &apos;ต่อไป&apos; เพื่อเข้าสู่ขั้นตอนยืนยันขั้นสุดท้าย
                </p>
              </div>
            ) : (
              <div className="space-y-3.5 text-xs text-slate-600 leading-relaxed">
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1.5">
                  <span className="font-bold flex items-center gap-1.5 text-rose-800">
                    🚨 ยืนยันการดำเนินการขั้นสุดท้าย
                  </span>
                  <p className="text-[11px]">
                    ท่านแน่ใจหรือไม่ว่าต้องการคืนค่ากลับสู่พิมพ์เขียวเริ่มต้นทันที? เมื่อคลิกบันทึกหลังจากนี้ ข้อมูลเดิมจะไม่สามารถกู้คืนได้
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  if (resetStep === 2) {
                    setResetStep(1);
                  } else {
                    setIsResetModalOpen(false);
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                {resetStep === 2 ? "ย้อนกลับ" : "ยกเลิก"}
              </button>

              {resetStep === 1 ? (
                <button
                  type="button"
                  onClick={() => setResetStep(2)}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-xs transition-all"
                >
                  ต่อไป (ขั้นตอนที่ 2)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={executeResetDefaults}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition-all"
                >
                  ยืนยันรีเซ็ตกลับเป็นพิมพ์เขียวมาตรฐาน
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: Site Health Diagnostic Modal (Round 32) */}
      {isHealthModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="ตรวจสุขภาพเว็บไซต์ (Site Health Diagnostic)"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
        >
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    สุขภาพเว็บไซต์และการตรวจวินิจฉัย (Site Health)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    วิเคราะห์ความปลอดภัย, SEO, ประสิทธิภาพ และความสมบูรณ์ของเนื้อหาหน้าร้าน
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHealthModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                aria-label="ปิดหน้าต่าง"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {isLoadingHealth ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500 text-xs">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                  <span>กำลังรันระบบตรวจสุขภาพหน้าร้านอัตโนมัติ...</span>
                </div>
              ) : healthReport ? (
                <div className="space-y-4">
                  {/* Score & Status Banner */}
                  <div className={`p-4 rounded-2xl flex items-center justify-between border ${
                    healthReport.status === "good"
                      ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                      : healthReport.status === "recommended"
                      ? "bg-amber-50/70 border-amber-200 text-amber-950"
                      : "bg-rose-50/70 border-rose-200 text-rose-950"
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-xl shadow-xs ${
                        healthReport.status === "good"
                          ? "bg-emerald-600 text-white"
                          : healthReport.status === "recommended"
                          ? "bg-amber-600 text-white"
                          : "bg-rose-600 text-white"
                      }`}>
                        {healthReport.score}
                      </div>
                      <div>
                        <div className="text-sm font-bold">
                          {healthReport.status === "good"
                            ? "✅ ระบบมีสุขภาพดีเยี่ยม (Good)"
                            : healthReport.status === "recommended"
                            ? "⚠️ มีข้อแนะนำที่ควรปรับปรุง (Should Improve)"
                            : "🚨 พบปัญหาสำคัญที่ควรแก้ไข (Critical Issues)"}
                        </div>
                        <div className="text-[11px] opacity-80 pt-0.5">
                          ผ่าน {healthReport.passedCount} รายการ • ควรปรับปรุง {healthReport.recommendedCount} รายการ • สำคัญ {healthReport.criticalCount} รายการ
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenSiteHealth}
                      className="px-3 py-1.5 rounded-xl bg-white/80 hover:bg-white text-xs font-semibold text-slate-700 shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>ตรวจซ้ำ</span>
                    </button>
                  </div>

                  {/* Categories Overview */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {healthReport.categories && Object.entries(healthReport.categories).map(([catKey, cat]: [string, any]) => (
                      <div key={catKey} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                        <div className="text-[11px] text-slate-500 truncate">{cat.label}</div>
                        <div className="font-bold flex items-center justify-between">
                          <span>{cat.passed} / {cat.total} ผ่าน</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                            cat.status === "good"
                              ? "bg-emerald-100 text-emerald-800"
                              : cat.status === "recommended"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                          }`}>
                            {cat.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Diagnostic Tests List */}
                  <div className="space-y-2 pt-2">
                    <h4 className="text-xs font-bold text-slate-700">รายการทดสอบและผลวินิจฉัยละเอียด ({healthReport.tests?.length || 0})</h4>
                    <div className="space-y-2">
                      {healthReport.tests?.map((t: any) => (
                        <div
                          key={t.id}
                          className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${
                            t.status === "good"
                              ? "bg-white border-slate-200"
                              : t.status === "recommended"
                              ? "bg-amber-50/40 border-amber-200"
                              : "bg-rose-50/40 border-rose-200"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-900 flex items-center gap-1.5">
                              {t.status === "good" ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              ) : t.status === "recommended" ? (
                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                              )}
                              <span>{t.label}</span>
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                              t.status === "good"
                                ? "bg-emerald-100 text-emerald-800"
                                : t.status === "recommended"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-800"
                            }`}>
                              {t.status === "good" ? "ผ่าน" : t.status === "recommended" ? "แนะนำ" : "ต้องแก้ไข"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed">{t.description}</p>
                          {t.recommendation && (
                            <div className="p-2 rounded-xl bg-slate-900/5 text-slate-800 text-[11px] font-medium flex items-start gap-1.5">
                              <span>💡</span>
                              <span>{t.recommendation}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-500">
                  ไม่พบข้อมูลรายงานสุขภาพ
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsHealthModalOpen(false)}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: Revisions History & 1-Click Rollback Modal (Round 33) */}
      {isRevisionsModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="ประวัติการแก้ไขและจุดย้อนกลับ (Revisions)"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
        >
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    ประวัติการแก้ไขและย้อนกลับเวอร์ชัน (Revisions)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    เก็บบันทึก snapshot ย้อนหลัง 10 เวอร์ชันล่าสุด พร้อมระบบกู้คืนในคลิกเดียว (Time-Travel)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRevisionsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                aria-label="ปิดหน้าต่าง"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {isLoadingRevisions ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500 text-xs">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <span>กำลังดึงประวัติการแก้ไขล่าสุด...</span>
                </div>
              ) : revisionsList.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 space-y-2">
                  <History className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-medium text-slate-700">ยังไม่มีประวัติการแก้ไขที่ถูกบันทึก</p>
                  <p className="text-[11px]">ระบบจะสร้าง snapshot อัตโนมัติทุกครั้งที่คุณกด &apos;บันทึกการตั้งค่า&apos;</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {revisionsList.map((rev: any, idx: number) => {
                    const isLatest = idx === 0;
                    return (
                      <div
                        key={rev.id}
                        className={`p-4 rounded-2xl border text-xs space-y-2 transition-all ${
                          isLatest
                            ? "bg-blue-50/50 border-blue-200 ring-1 ring-blue-200"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-xs">
                                {new Date(rev.timestamp).toLocaleString("th-TH", {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })}
                              </span>
                              {isLatest && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                                  เวอร์ชันปัจจุบัน
                                </span>
                              )}
                              <span className="text-[10px] font-mono text-slate-400">
                                #{rev.id.slice(0, 12)}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2">
                              <span>👤 โดย {rev.author?.name || "ไม่ระบุผู้ใช้"}</span>
                              {rev.note && <span className="text-slate-600">• {rev.note}</span>}
                            </div>
                          </div>

                          {!isLatest && (
                            <button
                              type="button"
                              disabled={isRollingBack}
                              onClick={() => handleRollback(rev.id)}
                              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-transform active:scale-95 shrink-0 flex items-center gap-1.5"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>ย้อนกลับ</span>
                            </button>
                          )}
                        </div>

                        {rev.snapshot && (
                          <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2 text-[10px] text-slate-500">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                              ธีม: {rev.snapshot.themeColor || "emerald"}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                              ฟอนต์: {rev.snapshot.fontFamily || "anuphan"}
                            </span>
                            {rev.snapshot.headline && (
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 truncate max-w-[200px]">
                                {rev.snapshot.headline}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRevisionsModalOpen(false)}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 8: Gutenberg HTML Import & Export Modal (Round 35) */}
      {isGutenbergModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="WordPress Gutenberg Block Code Import & Export"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
        >
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col p-6 shadow-2xl border border-slate-200 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Code className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    WordPress Gutenberg Block Code (Import / Export)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    แปลงโค้ดบล็อกไป-กลับระหว่าง FixMe Storefront และ WordPress Block Grammar
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsGutenbergModalOpen(false);
                  setGutenbergError(null);
                }}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                aria-label="ปิดหน้าต่าง Gutenberg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold shrink-0">
              <button
                type="button"
                onClick={() => {
                  const targetBlocks =
                    selectedPageSlug && activeSubPage
                      ? activeSubPage.sections || []
                      : customSectionsList;
                  setGutenbergHtml(serializeToGutenberg(targetBlocks));
                  setGutenbergMode("export");
                  setGutenbergError(null);
                  setCopiedGutenberg(false);
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-center transition-all ${
                  gutenbergMode === "export"
                    ? "bg-white text-indigo-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                📤 ส่งออกโค้ด (Export to WordPress)
              </button>
              <button
                type="button"
                onClick={() => {
                  setGutenbergMode("import");
                  setGutenbergHtml("");
                  setGutenbergError(null);
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-center transition-all ${
                  gutenbergMode === "import"
                    ? "bg-white text-indigo-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                📥 นำเข้าโค้ด (Import from WordPress)
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {gutenbergMode === "export" ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 text-indigo-950 text-xs leading-relaxed">
                    <span className="font-bold block mb-1">
                      💡 คำแนะนำการใช้งานบน WordPress
                    </span>
                    <p className="text-[11px] text-indigo-900/90">
                      คัดลอกโค้ด Gutenberg ด้านล่างนี้ แล้วไปที่หน้าแก้ไข Page หรือ Post ใน WordPress คลิกเมนูสามจุดมุมขวาบน เลือก &quot;Code Editor&quot; แล้ววางโค้ดนี้ลงไป บล็อกจะถูกแสดงผลตามมาตรฐานบล็อกของ WordPress ทันที
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-semibold text-slate-700">
                        โค้ดมาร์กอัป Gutenberg HTML
                      </label>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {selectedPageSlug && activeSubPage
                          ? `(หน้า: ${activeSubPage.title})`
                          : `(${customSectionsList.length} บล็อกกำหนดเอง)`}
                      </span>
                    </div>

                    <textarea
                      readOnly
                      value={gutenbergHtml}
                      onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                      className="w-full font-mono text-xs p-3.5 rounded-xl border border-slate-200 bg-slate-900 text-emerald-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 h-64 select-all leading-relaxed"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-950 text-xs leading-relaxed">
                    <span className="font-bold block mb-1">
                      📥 นำเข้าบล็อก Gutenberg สู่ FixMe
                    </span>
                    <p className="text-[11px] text-amber-900/90">
                      วางโค้ด Gutenberg Block Comments (เช่น <code>&lt;!-- wp:fixme/promo-banner ... --&gt;</code> หรือบล็อกมาตรฐาน WordPress เช่น <code>&lt;!-- wp:paragraph --&gt;</code>) เพื่อแปลงเป็นบล็อกหน้าร้านโดยอัตโนมัติ
                    </p>
                    <div className="text-[11px] text-amber-800 font-semibold mt-1">
                      เป้าหมายการนำเข้า: {selectedPageSlug && activeSubPage ? `หน้า "${activeSubPage.title}"` : "หน้าแรก (Home Layout)"}
                    </div>
                  </div>

                  {gutenbergError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{gutenbergError}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">
                      วางโค้ด Gutenberg HTML ที่นี่ *
                    </label>
                    <textarea
                      placeholder={`<!-- wp:fixme/promo-banner {"title":"โปรโมชั่นเปลี่ยนแบตเตอรี่แท้"} /-->\n\n<!-- wp:core/paragraph -->\n<p>ข้อความตัวอย่างจาก WordPress</p>\n<!-- /wp:core/paragraph -->`}
                      value={gutenbergHtml}
                      onChange={(e) => {
                        setGutenbergHtml(e.target.value);
                        setGutenbergError(null);
                      }}
                      className="w-full font-mono text-xs p-3.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 h-64 leading-relaxed"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsGutenbergModalOpen(false);
                  setGutenbergError(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                ยกเลิก
              </button>

              <div className="flex items-center gap-2">
                {gutenbergMode === "export" ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!gutenbergHtml) return;
                      navigator.clipboard.writeText(gutenbergHtml);
                      setCopiedGutenberg(true);
                      setTimeout(() => setCopiedGutenberg(false), 2000);
                      setToast({
                        message: "คัดลอกโค้ด Gutenberg เรียบร้อยแล้ว!",
                        type: "success",
                      });
                    }}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-all flex items-center gap-1.5"
                  >
                    {copiedGutenberg ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>คัดลอกแล้ว</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>คัดลอกโค้ด Gutenberg</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleImportGutenberg}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-all flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>แปลงและนำเข้าบล็อก</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
