import type { Metadata } from "next";
import { safeParseCustomPages } from "@/lib/storefrontTheme";

/**
 * Builds dynamic metadata for the storefront root page /store/[shopSlug]
 */
export function buildStoreMetadata(tenant: any, shopSlug: string): Metadata {
  if (!tenant) {
    return {
      title: "FixMe | ไม่พบร้านค้า",
      description: "ไม่พบข้อมูลร้านค้าในระบบ",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  let cfg = tenant.storefrontConfig || {};
  if (cfg.footerSocialLinks && (!cfg.seoTitle || !cfg.bannerUrl)) {
    try {
      const parsed = JSON.parse(cfg.footerSocialLinks);
      cfg = { ...cfg, ...parsed };
    } catch {}
  }

  const title =
    cfg.seoTitle ||
    (cfg.headline
      ? `${tenant.name} | ${cfg.headline}`
      : `${tenant.name} | ศูนย์บริการซ่อมมือถือด่วน เช็คสถานะสด 24 ชม.`);
  const description =
    cfg.seoDescription ||
    cfg.subheadline ||
    `ศูนย์บริการซ่อมมือถือและจำหน่ายสมาร์ตโฟนครบวงจร ${tenant.name} ตรวจเช็คมาตรฐานแล็บ ติดตามสถานะงานซ่อมออนไลน์`;

  const canonicalUrl = `/store/${tenant.slug || shopSlug}`;
  const ogImageUrl = cfg.bannerUrl || tenant.logoUrl;
  const ogImages = ogImageUrl
    ? [{ url: ogImageUrl, width: 1200, height: 630, alt: tenant.name }]
    : undefined;

  const keywords = cfg.seoKeywords
    ? cfg.seoKeywords.split(",").map((k: string) => k.trim()).filter(Boolean)
    : undefined;

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: tenant.name,
      images: ogImages,
      locale: "th_TH",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImageUrl ? [ogImageUrl] : undefined,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

/**
 * Builds dynamic metadata for storefront custom subpages /store/[shopSlug]/[pageSlug]
 * Strictly protects draft/unpublished pages from crawler indexing.
 */
export function buildSubpageMetadata(
  tenant: any,
  shopSlug: string,
  pageSlug: string,
  isAuthorizedStaff: boolean = false
): Metadata {
  if (!tenant) {
    return {
      title: "FixMe | ไม่พบร้านค้า",
      description: "ไม่พบร้านค้าที่ต้องการในระบบ",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  let normalizedPageSlug = "";
  try {
    normalizedPageSlug = decodeURIComponent(pageSlug).trim().toLowerCase();
  } catch {
    return {
      title: `ไม่พบหน้า | ${tenant.name}`,
      robots: { index: false, follow: false },
    };
  }

  const customPages = safeParseCustomPages(tenant.storefrontConfig?.customPages);
  const page = customPages.find(
    (p) => p.slug.toLowerCase() === normalizedPageSlug && (p.published !== false || isAuthorizedStaff)
  );

  // If subpage is missing or not viewable, strictly block indexing to protect drafts from SEO indexing
  if (!page) {
    return {
      title: `ไม่พบหน้า | ${tenant.name}`,
      description: `ไม่พบหน้าที่คุณต้องการในระบบร้านค้า ${tenant.name}`,
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const isDraft = page.published === false;
  const title = isDraft ? `[ฉบับร่าง] ${page.title} | ${tenant.name}` : `${page.title} | ${tenant.name}`;
  const description =
    page.metaDescription ||
    page.subtitle ||
    (page.content ? page.content.slice(0, 160) : "") ||
    tenant.storefrontConfig?.subheadline ||
    `${page.title} ศูนย์บริการ ${tenant.name}`;

  const canonicalUrl = `/store/${tenant.slug || shopSlug}/${page.slug}`;
  const logoImage = tenant.logoUrl
    ? [{ url: tenant.logoUrl, width: 800, height: 600, alt: page.title }]
    : undefined;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: tenant.name,
      images: logoImage,
      locale: "th_TH",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: tenant.logoUrl ? [tenant.logoUrl] : undefined,
    },
    robots: isDraft
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}
