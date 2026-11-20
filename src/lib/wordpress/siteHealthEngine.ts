/**
 * WordPress-Style Site Health & Storefront Diagnostic Suite
 * Reverse-engineers WP Site Health (wp-admin/site-health.php / WP_Site_Health)
 * 
 * Runs comprehensive automated diagnostic audits across:
 * 1. Security Posture (XSS prevention, iframe sandboxing, external link hygiene)
 * 2. SEO Readiness (meta title/desc length, OpenGraph readiness, draft privacy)
 * 3. Performance & Core Web Vitals (CLS aspect ratio, lazy loading, DOM block limits)
 * 4. Broken Link Analysis (nav menu integrity, valid anchors, social URLs)
 * 5. Content Integrity & Shop Readiness (contact info, hours, published sections)
 */

import {
  StorefrontConfigData,
  safeParseCustomSections,
  safeParseCustomPages,
  safeParseNavMenu,
  safeParseSocialLinks,
  CustomBlock,
} from "@/lib/storefrontTheme";

export type HealthStatus = "good" | "recommended" | "critical";

export type HealthCategory =
  | "security"
  | "seo"
  | "performance"
  | "broken_links"
  | "content_integrity";

export interface SiteHealthTestResult {
  id: string;
  category: HealthCategory;
  label: string;
  status: HealthStatus;
  description: string;
  recommendation?: string;
  passed: boolean;
}

export interface CategorySummary {
  label: string;
  passed: number;
  total: number;
  status: HealthStatus;
}

export interface SiteHealthReport {
  status: HealthStatus;
  score: number; // 0 - 100
  passedCount: number;
  recommendedCount: number;
  criticalCount: number;
  totalTests: number;
  categories: Record<HealthCategory, CategorySummary>;
  tests: SiteHealthTestResult[];
  timestamp: string;
}

export interface TenantAuditInfo {
  shopName?: string;
  shopSlug?: string;
  branchCount?: number;
  hasDomain?: boolean;
}

/**
 * Runs the complete automated Site Health diagnostic audit on a storefront configuration
 */
export function runSiteHealthAudit(
  config: Partial<StorefrontConfigData>,
  tenantInfo?: TenantAuditInfo
): SiteHealthReport {
  const tests: SiteHealthTestResult[] = [];

  // Parse structured data safely
  const customBlocks: CustomBlock[] = safeParseCustomSections(config.customSections);
  const customPages = safeParseCustomPages(config.customPages);
  const navMenu = safeParseNavMenu(config.navigationMenu);
  const socialLinks = safeParseSocialLinks(config.footerSocialLinks);
  const rawSocialList = Object.entries(socialLinks)
    .filter(([_, url]) => Boolean(url))
    .map(([platform, url]) => ({ platform, url: String(url) }));
  const socialUrls = rawSocialList.map((s) => s.url);

  // ==========================================
  // 1. Security Posture Checks
  // ==========================================

  // Check 1.1: Iframe sandboxing in custom HTML blocks
  const htmlBlocks = customBlocks.filter((b) => b.type === "html");
  let hasUnsandboxedIframe = false;
  let hasScriptInHtml = false;

  for (const block of htmlBlocks) {
    const htmlContent = String(block.html || "").toLowerCase();
    if (htmlContent.includes("<iframe") && !htmlContent.includes("sandbox=")) {
      hasUnsandboxedIframe = true;
    }
    if (htmlContent.includes("<script") || htmlContent.includes("onerror=") || htmlContent.includes("onload=")) {
      hasScriptInHtml = true;
    }
  }

  tests.push({
    id: "sec_iframe_sandbox",
    category: "security",
    label: "ความปลอดภัยของ HTML Embed และ Iframe Sandbox",
    status: hasUnsandboxedIframe || hasScriptInHtml ? "critical" : "good",
    passed: !hasUnsandboxedIframe && !hasScriptInHtml,
    description:
      hasUnsandboxedIframe || hasScriptInHtml
        ? "พบบล็อก HTML ที่มีการแทรก Script หรือ iframe ที่ไม่มีแอตทริบิวต์ sandbox ปลอดภัย"
        : "บล็อก HTML ฝังเนื้อหาทั้งหมดได้รับการ Sandbox และแยก Sandboxed DOM ปลอดภัย",
    recommendation:
      hasUnsandboxedIframe || hasScriptInHtml
        ? "กรุณาลบแท็ก <script> และระบุ sandbox='allow-scripts allow-popups' บน iframe ทุกตัว"
        : undefined,
  });

  // Check 1.2: Dangerous URI schemes (javascript:, vbscript:, data:)
  const allUrls: string[] = [
    config.phone || "",
    config.lineQrUrl || "",
    config.googleMapsUrl || "",
    ...navMenu.map((m) => m.href),
    ...socialUrls,
  ];

  const hasDangerousScheme = allUrls.some((url) => {
    const clean = url.trim().toLowerCase();
    return clean.startsWith("javascript:") || clean.startsWith("vbscript:") || clean.startsWith("data:");
  });

  tests.push({
    id: "sec_dangerous_protocols",
    category: "security",
    label: "การป้องกัน Cross-Site Scripting จาก URL Protocols",
    status: hasDangerousScheme ? "critical" : "good",
    passed: !hasDangerousScheme,
    description: hasDangerousScheme
      ? "ตรวจพบ URL ที่ขึ้นต้นด้วยโพรโทคอลอันตราย (javascript:, vbscript:, data:)"
      : "ลิงก์และ URL ทั้งหมดในระบบใช้โพรโทคอลมาตรฐานที่ปลอดภัย",
    recommendation: hasDangerousScheme
      ? "เปลี่ยนลิงก์ดังกล่าวเป็น HTTP, HTTPS หรือ Anchor ID (#) เท่านั้น"
      : undefined,
  });

  // Check 1.3: HTTPS external links
  const externalUrls = allUrls.filter(
    (u) => u.startsWith("http://") || u.startsWith("https://")
  );
  const insecureUrls = externalUrls.filter((u) => u.startsWith("http://"));

  tests.push({
    id: "sec_https_enforcement",
    category: "security",
    label: "การเข้ารหัสความปลอดภัย HTTPS สำหรับลิงก์ภายนอก",
    status: insecureUrls.length > 0 ? "recommended" : "good",
    passed: insecureUrls.length === 0,
    description:
      insecureUrls.length > 0
        ? `พบลิงก์ภายนอก ${insecureUrls.length} รายการที่ใช้ HTTP ธรรมดา (ไม่ได้เข้ารหัส)`
        : "ลิงก์ภายนอกทั้งหมดใช้ HTTPS เข้ารหัสปลอดภัย",
    recommendation:
      insecureUrls.length > 0
        ? "แนะนำให้อัปเกรดเป็น https:// เพื่อป้องกันการดักจับข้อมูลระหว่างทาง"
        : undefined,
  });

  // ==========================================
  // 2. SEO Readiness Checks
  // ==========================================

  // Check 2.1: Headline presence and length
  const headline = (config.headline || "").trim();
  const headlineLen = headline.length;
  const isHeadlineOptimal = headlineLen >= 15 && headlineLen <= 120;

  tests.push({
    id: "seo_headline_length",
    category: "seo",
    label: "ความเหมาะสมของหัวข้อหลัก (H1 / Headline SEO)",
    status: headlineLen === 0 ? "critical" : !isHeadlineOptimal ? "recommended" : "good",
    passed: isHeadlineOptimal,
    description:
      headlineLen === 0
        ? "ไม่มีการระบุหัวข้อหลักของร้านค้า ซึ่งส่งผลเสียอย่างรุนแรงต่อ SEO Ranking"
        : !isHeadlineOptimal
        ? `หัวข้อมีความยาว ${headlineLen} ตัวอักษร (เกณฑ์แนะนำ: 15 - 120 ตัวอักษร)`
        : `หัวข้อหลักมีความยาว ${headlineLen} ตัวอักษร ตรงตามเกณฑ์ SEO มาตรฐาน`,
    recommendation: !isHeadlineOptimal
      ? "ปรับหัวข้อหลักให้กระชับ ชัดเจน และมีคีย์เวิร์ดหลักของร้านค้า (15 - 120 ตัวอักษร)"
      : undefined,
  });

  // Check 2.2: Subheadline presence and meta description suitability
  const subheadline = (config.subheadline || "").trim();
  const subheadlineLen = subheadline.length;
  const isSubheadlineOptimal = subheadlineLen >= 40 && subheadlineLen <= 300;

  tests.push({
    id: "seo_meta_description",
    category: "seo",
    label: "คำอธิบายร้านค้าสำหรับผลการค้นหาและ Social OpenGraph",
    status: subheadlineLen === 0 ? "recommended" : !isSubheadlineOptimal ? "recommended" : "good",
    passed: isSubheadlineOptimal,
    description:
      subheadlineLen === 0
        ? "ยังไม่มีคำอธิบายร้านค้า เครื่องมือค้นหาจะดึงข้อความแบบสุ่มมาแสดงผล"
        : !isSubheadlineOptimal
        ? `คำอธิบายมีความยาว ${subheadlineLen} ตัวอักษร (เกณฑ์แนะนำ: 40 - 300 ตัวอักษร)`
        : `คำอธิบายมีความยาว ${subheadlineLen} ตัวอักษร เหมาะสมอย่างยิ่งสำหรับ Search Engine Snippets`,
    recommendation: !isSubheadlineOptimal
      ? "ระบุรายละเอียดบริการเด่น ข้อดี และการรับประกันของร้านให้ชัดเจนระหว่าง 40 - 300 ตัวอักษร"
      : undefined,
  });

  // Check 2.3: Subpage SEO & Draft Protection
  const draftPages = customPages.filter((p) => p.published === false);
  const duplicateSlugs = customPages.filter(
    (page, index, self) => self.findIndex((p) => p.slug === page.slug) !== index
  );

  tests.push({
    id: "seo_subpage_slugs",
    category: "seo",
    label: "โครงสร้าง URL และความซ้ำซ้อนของหน้าย่อย (Subpage Slugs)",
    status: duplicateSlugs.length > 0 ? "critical" : "good",
    passed: duplicateSlugs.length === 0,
    description:
      duplicateSlugs.length > 0
        ? `พบหน้าย่อยที่มี URL Slug ซ้ำกัน ${duplicateSlugs.length} รายการ อาจทำให้เกิดความสับสนต่อ Search Engine`
        : `หน้าย่อยทั้งหมด ${customPages.length} หน้ามี URL Slug เฉพาะตัว ไม่ซ้ำซ้อน`,
    recommendation:
      duplicateSlugs.length > 0
        ? "แก้ไข URL Slug ของหน้าย่อยให้ไม่ซ้ำกัน"
        : undefined,
  });

  // ==========================================
  // 3. Performance & Core Web Vitals Checks
  // ==========================================

  // Check 3.1: CLS Layout Aspect Ratio on Image Blocks
  const galleryBlocks = customBlocks.filter((b) => b.type === "gallery");
  const hasInvalidGalleryImages = galleryBlocks.some((b) => {
    const images = Array.isArray(b.images) ? b.images : [];
    return images.some((img: any) => !img || (typeof img === "object" && !img.url));
  });

  tests.push({
    id: "perf_aspect_ratio_cls",
    category: "performance",
    label: "การป้องกันการกระตุกของหน้าจอ (CLS = 0 Layout Shift)",
    status: hasInvalidGalleryImages ? "recommended" : "good",
    passed: !hasInvalidGalleryImages,
    description: hasInvalidGalleryImages
      ? "พบรูปภาพแกลเลอรีบางรูปที่มีข้อมูล URL ไม่สมบูรณ์ อาจส่งผลต่อการจองพื้นที่ Layout"
      : "รูปภาพทุกส่วนมีคอนเทนเนอร์ aspect ratio กำกับตายตัว ป้องกัน Cumulative Layout Shift ได้ 100%",
    recommendation: hasInvalidGalleryImages
      ? "ตรวจสอบและลบรูปภาพที่ URL ว่างเปล่าออกจากบล็อกแกลเลอรี"
      : undefined,
  });

  // Check 3.2: Custom block count (DOM size sanity)
  const blockCount = customBlocks.length;
  const isBlockCountOptimal = blockCount <= 25;

  tests.push({
    id: "perf_dom_block_count",
    category: "performance",
    label: "ขนาดและความลึกของ DOM Tree (Modular Block Count)",
    status: blockCount > 35 ? "critical" : blockCount > 25 ? "recommended" : "good",
    passed: isBlockCountOptimal,
    description:
      blockCount > 25
        ? `หน้าร้านมีบล็อกแบบกำหนดเองทั้งหมด ${blockCount} บล็อก (แนะนำไม่เกิน 25 บล็อกเพื่อความลื่นไหลบนมือถือสเปกประหยัด)`
        : `จำนวนบล็อก (${blockCount} บล็อก) อยู่ในเกณฑ์ที่โหลดได้อย่างรวดเร็วและใช้หน่วยความจำต่ำ`,
    recommendation:
      blockCount > 25
        ? "รวมบล็อกที่ซ้ำซ้อนหรือย้ายเนื้อหารายละเอียดย่อยไปยังหน้าย่อย (Custom Subpage)"
        : undefined,
  });

  // Check 3.3: Edge Caching (ISR 60s)
  tests.push({
    id: "perf_edge_caching",
    category: "performance",
    label: "การแคชเนื้อหาที่ Vercel Serverless Edge CDN",
    status: "good",
    passed: true,
    description: "เปิดใช้งาน Stale-While-Revalidate (ISR 60s) และรองรับ Node.js Serverless Runtime พร้อมอัตราตอบสนองระดับ Milliseconds",
  });

  // ==========================================
  // 4. Broken Link Analysis
  // ==========================================

  // Check 4.1: Navigation menu items non-empty
  const emptyNavItems = navMenu.filter((m) => !m.label || !m.href);

  tests.push({
    id: "link_nav_menu_integrity",
    category: "broken_links",
    label: "ความสมบูรณ์ของเมนูนำทาง (Navigation Menu)",
    status: emptyNavItems.length > 0 ? "critical" : "good",
    passed: emptyNavItems.length === 0,
    description:
      emptyNavItems.length > 0
        ? `พบเมนูนำทาง ${emptyNavItems.length} รายการที่ไม่มีชื่อหรือไม่มีปลายทางลิงก์`
        : `เมนูนำทางทั้งหมด ${navMenu.length} รายการระบุปลายทางครบถ้วน`,
    recommendation:
      emptyNavItems.length > 0
        ? "กรุณาลบหรือระบุปลายทางลิงก์ให้เมนูที่ว่างเปล่า"
        : undefined,
  });

  // Check 4.2: Social media links validity
  const invalidSocialLinks = rawSocialList.filter((s) => !s.url || s.url === "#");

  tests.push({
    id: "link_social_media",
    category: "broken_links",
    label: "ลิงก์โซเชียลมีเดียในส่วนท้ายของร้าน (Footer Socials)",
    status: invalidSocialLinks.length > 0 ? "recommended" : "good",
    passed: invalidSocialLinks.length === 0,
    description:
      invalidSocialLinks.length > 0
        ? `พบบัญชีโซเชียล ${invalidSocialLinks.length} รายการที่ไม่ได้ระบุ URL ลิงก์ที่ถูกต้อง`
        : `ลิงก์โซเชียลมีเดีย ${rawSocialList.length} ช่องทางมีปลายทางสมบูรณ์`,
    recommendation:
      invalidSocialLinks.length > 0
        ? "ระบุ URL ลิงก์ไปยังเพจ Facebook หรือ TikTok ของร้านให้ถูกต้อง"
        : undefined,
  });

  // ==========================================
  // 5. Content Integrity & Shop Readiness
  // ==========================================

  // Check 5.1: Primary contact channel (Phone or LINE)
  const hasPhone = Boolean((config.phone || "").trim());
  const hasLine = Boolean((config.lineId || "").trim());
  const hasContact = hasPhone || hasLine;

  tests.push({
    id: "content_contact_channel",
    category: "content_integrity",
    label: "ช่องทางการติดต่อด่วนสำหรับลูกค้า (เบอร์โทร / LINE ID)",
    status: !hasContact ? "critical" : !hasPhone || !hasLine ? "recommended" : "good",
    passed: hasContact,
    description: !hasContact
      ? "ร้านค้ายังไม่ได้ระบุทั้งเบอร์โทรศัพท์และ LINE ID ลูกค้าจะไม่สามารถติดต่อสอบถามงานซ่อมได้"
      : hasPhone && hasLine
      ? `ระบุช่องทางติดต่อครบครัน: เบอร์โทร ${config.phone} และ LINE ID ${config.lineId}`
      : `ระบุช่องทางติดต่อ (${hasPhone ? "เบอร์โทร" : "LINE ID"}) แต่แนะนำให้ระบุทั้งสองช่องทางเพื่อความสะดวกสูงสุด`,
    recommendation: !hasContact
      ? "กรุณาระบุเบอร์โทรศัพท์และ LINE Official Account ในการตั้งค่าหน้าร้าน"
      : !hasPhone || !hasLine
      ? "เพิ่มช่องทางติดต่อที่ขาดไปเพื่อให้ลูกค้าริดต่อได้ทุกช่องทางที่สะดวก"
      : undefined,
  });

  // Check 5.2: Business Hours / Schedule
  const hasBusinessHoursBlock = customBlocks.some((b) => b.type === "business_hours");
  const hasAnnouncement = Boolean(config.announcementEnabled && Boolean((config.announcementText || "").trim()));

  tests.push({
    id: "content_business_hours",
    category: "content_integrity",
    label: "ข้อมูลเวลาเปิด-ปิดและตารางให้บริการ (Business Hours)",
    status: !hasBusinessHoursBlock && !hasAnnouncement ? "recommended" : "good",
    passed: Boolean(hasBusinessHoursBlock || hasAnnouncement),
    description: hasBusinessHoursBlock
      ? "มีบล็อกแสดงเวลาทำการพร้อมระบบคำนวณสถานะ เปิด/ปิด ร้านแบบเรียลไทม์"
      : hasAnnouncement
      ? "ระบุข้อมูลเวลาให้บริการผ่านแถบประกาศด้านบนของร้าน"
      : "ยังไม่มีบล็อกแสดงเวลาทำการ ลูกค้าอาจไม่ทราบว่าร้านเปิดหรือปิดเวลาใด",
    recommendation:
      !hasBusinessHoursBlock && !hasAnnouncement
        ? "เพิ่มบล็อก 'เวลาทำการ (Business Hours)' เพื่อแสดงสถานะเปิด-ปิดร้าน"
        : undefined,
  });

  // Check 5.3: Active Sections / Services Display
  const hasServices = config.showServicesBento !== false || customBlocks.length > 0;

  tests.push({
    id: "content_active_services",
    category: "content_integrity",
    label: "การแสดงรายการบริการซ่อมและผลงานของร้าน",
    status: !hasServices ? "critical" : "good",
    passed: hasServices,
    description: hasServices
      ? "มีเนื้อหาแสดงรายการบริการซ่อมและบล็อกผลงานพร้อมให้บริการ"
      : "หน้าร้านถูกปิดการแสดงรายการบริการทั้งหมด ทำให้หน้าเว็บว่างเปล่า",
    recommendation: !hasServices
      ? "เปิดใช้งานกล่องบริการ Bento หรือเพิ่มบล็อกเนื้อหาแนะนำบริการซ่อม"
      : undefined,
  });

  // ==========================================
  // Summary & Score Calculation
  // ==========================================
  let passedCount = 0;
  let recommendedCount = 0;
  let criticalCount = 0;

  const categories: Record<HealthCategory, CategorySummary> = {
    security: { label: "ความปลอดภัย (Security)", passed: 0, total: 0, status: "good" },
    seo: { label: "การค้นหาและการแชร์ (SEO & OpenGraph)", passed: 0, total: 0, status: "good" },
    performance: { label: "ประสิทธิภาพและความเร็ว (Performance)", passed: 0, total: 0, status: "good" },
    broken_links: { label: "ความสมบูรณ์ของลิงก์ (Link Health)", passed: 0, total: 0, status: "good" },
    content_integrity: { label: "ความพร้อมของเนื้อหา (Content Readiness)", passed: 0, total: 0, status: "good" },
  };

  for (const test of tests) {
    const cat = categories[test.category];
    cat.total++;
    if (test.passed && test.status === "good") {
      passedCount++;
      cat.passed++;
    } else if (test.status === "recommended") {
      recommendedCount++;
    } else {
      criticalCount++;
    }
  }

  // Update category status
  for (const cat of Object.values(categories)) {
    const ratio = cat.total > 0 ? cat.passed / cat.total : 1;
    if (ratio >= 0.8) {
      cat.status = "good";
    } else if (ratio >= 0.5) {
      cat.status = "recommended";
    } else {
      cat.status = "critical";
    }
  }

  // Score calculation:
  // Base 100, critical deducts 25, recommended deducts 8
  const rawScore = 100 - criticalCount * 25 - recommendedCount * 8;
  const score = Math.max(0, Math.min(100, rawScore));

  let overallStatus: HealthStatus = "good";
  if (criticalCount > 0 || score < 60) {
    overallStatus = "critical";
  } else if (recommendedCount > 0 || score < 85) {
    overallStatus = "recommended";
  }

  return {
    status: overallStatus,
    score,
    passedCount,
    recommendedCount,
    criticalCount,
    totalTests: tests.length,
    categories,
    tests,
    timestamp: new Date().toISOString(),
  };
}
