/**
 * WordPress eXtended RSS (WXR 1.2) XML Export & Import Engine (Round 46)
 *
 * Reverse-engineers WordPress core WXR import/export format:
 * - `exportToWxrXml()`: Generates WXR 1.2 XML compliant with standard WordPress export files
 * - `importFromWxrXml()`: Parses WXR XML documents and converts `<item>` nodes into FixMe `CustomPage[]`
 *
 * Interoperates bidirectionally with WordPress core Gutenberg block comments and template metadata.
 */

import { CustomPage, CustomBlock } from "../storefrontTheme";
import { serializeToGutenberg, parseGutenbergContent } from "./gutenbergConverter";

export interface WxrExportOptions {
  shopName: string;
  shopSlug: string;
  baseUrl?: string;
  description?: string;
  language?: string;
  pages: CustomPage[];
}

export interface WxrImportResult {
  siteInfo: {
    title: string;
    link: string;
    description: string;
    language: string;
    wxrVersion: string;
  };
  pages: CustomPage[];
}

/**
 * Escapes XML special characters for safe inclusion in XML text nodes
 */
function escapeXml(unsafe: string): string {
  if (!unsafe) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Wraps content in CDATA, escaping any existing nested ]]> sequences
 */
function wrapCdata(content: string): string {
  if (content === undefined || content === null) return "<![CDATA[]]>";
  const safeContent = String(content).replace(/]]>/g, "]]]]><![CDATA[>");
  return `<![CDATA[${safeContent}]]>`;
}

/**
 * Formats a Date object into standard RFC 822 format (e.g. "Thu, 20 Nov 2026 12:00:00 +0000")
 */
function toRfc822Date(date: Date = new Date()): string {
  return date.toUTCString().replace("GMT", "+0000");
}

/**
 * Formats a Date object into WordPress post_date format (e.g. "2026-11-20 12:00:00")
 */
function toWpPostDate(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = date.getUTCFullYear();
  const mm = pad(date.getUTCMonth() + 1);
  const dd = pad(date.getUTCDate());
  const hh = pad(date.getUTCHours());
  const mi = pad(date.getUTCMinutes());
  const ss = pad(date.getUTCSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

/**
 * Generates standard WordPress eXtended RSS (WXR 1.2) XML document from FixMe pages
 */
export function exportToWxrXml(options: WxrExportOptions): string {
  const {
    shopName,
    shopSlug,
    baseUrl = "https://fixme.co",
    description = "FixMe Storefront WordPress Export",
    language = "th-TH",
    pages = [],
  } = options;

  const siteUrl = `${baseUrl.replace(/\/+$/, "")}/store/${shopSlug}`;
  const now = new Date();
  const rfcDate = toRfc822Date(now);
  const wpDate = toWpPostDate(now);

  const itemsXml: string[] = [];

  pages.forEach((page, index) => {
    const pageId = index + 101;
    const pageUrl = `${siteUrl}/${page.slug}`;

    // Combine narrative content and serialized Gutenberg blocks
    let encodedContent = "";
    if (page.sections && page.sections.length > 0) {
      const gutenbergBlocks = serializeToGutenberg(page.sections);
      encodedContent = page.content
        ? `<!-- wp:paragraph -->\n<p>${page.content.replace(/\n\n/g, "</p>\n<p>")}</p>\n<!-- /wp:paragraph -->\n\n${gutenbergBlocks}`
        : gutenbergBlocks;
    } else if (page.content) {
      encodedContent = `<!-- wp:paragraph -->\n<p>${page.content.replace(/\n\n/g, "</p>\n<p>")}</p>\n<!-- /wp:paragraph -->`;
    }

    const encodedExcerpt = page.subtitle ? `<p>${page.subtitle}</p>` : "";
    const status = page.published !== false ? "publish" : "draft";

    // Categories and Tags XML
    const categoriesXml: string[] = [];
    if (page.categories && Array.isArray(page.categories)) {
      for (const cat of page.categories) {
        const slug = cat.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
        categoriesXml.push(
          `      <category domain="category" nicename="${escapeXml(slug)}">${wrapCdata(cat)}</category>`
        );
      }
    }
    if (page.tags && Array.isArray(page.tags)) {
      for (const tag of page.tags) {
        const slug = tag.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
        categoriesXml.push(
          `      <category domain="post_tag" nicename="${escapeXml(slug)}">${wrapCdata(tag)}</category>`
        );
      }
    }

    const itemStr = `
    <item>
      <title>${wrapCdata(page.title || "Untitled Page")}</title>
      <link>${escapeXml(pageUrl)}</link>
      <pubDate>${rfcDate}</pubDate>
      <dc:creator>${wrapCdata("admin")}</dc:creator>
      <guid isPermaLink="false">${escapeXml(`${siteUrl}/?page_id=${pageId}`)}</guid>
      <description></description>
      <content:encoded>${wrapCdata(encodedContent)}</content:encoded>
      <excerpt:encoded>${wrapCdata(encodedExcerpt)}</excerpt:encoded>
      <wp:post_id>${pageId}</wp:post_id>
      <wp:post_date>${wrapCdata(wpDate)}</wp:post_date>
      <wp:post_date_gmt>${wrapCdata(wpDate)}</wp:post_date_gmt>
      <wp:comment_status>${wrapCdata("closed")}</wp:comment_status>
      <wp:ping_status>${wrapCdata("closed")}</wp:ping_status>
      <wp:post_name>${wrapCdata(page.slug)}</wp:post_name>
      <wp:status>${wrapCdata(status)}</wp:status>
      <wp:post_parent>0</wp:post_parent>
      <wp:menu_order>${index}</wp:menu_order>
      <wp:post_type>${wrapCdata("page")}</wp:post_type>
      <wp:is_sticky>0</wp:is_sticky>
${categoriesXml.join("\n")}
      <wp:postmeta>
        <wp:meta_key>${wrapCdata("_wp_page_template")}</wp:meta_key>
        <wp:meta_value>${wrapCdata(page.template || "default")}</wp:meta_value>
      </wp:postmeta>
${page.subtitle ? `      <wp:postmeta>
        <wp:meta_key>${wrapCdata("_fixme_subtitle")}</wp:meta_key>
        <wp:meta_value>${wrapCdata(page.subtitle)}</wp:meta_value>
      </wp:postmeta>` : ""}
    </item>`.trimEnd();

    itemsXml.push(itemStr);
  });

  return `<?xml version="1.0" encoding="UTF-8" ?>
<!-- generator="FixMe-Storefront-Engine/1.0" created="${rfcDate}" -->
<rss version="2.0"
  xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:wfw="http://wellformedweb.org/CommentAPI/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:wp="http://wordpress.org/export/1.2/"
>
  <channel>
    <title>${wrapCdata(shopName)}</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>${wrapCdata(description)}</description>
    <pubDate>${rfcDate}</pubDate>
    <language>${escapeXml(language)}</language>
    <wp:wxr_version>1.2</wp:wxr_version>
    <wp:base_site_url>${escapeXml(baseUrl)}</wp:base_site_url>
    <wp:base_blog_url>${escapeXml(siteUrl)}</wp:base_blog_url>
    <wp:author>
      <wp:author_id>1</wp:author_id>
      <wp:author_login>${wrapCdata("admin")}</wp:author_login>
      <wp:author_email>${wrapCdata("admin@fixme.co")}</wp:author_email>
      <wp:author_display_name>${wrapCdata(shopName)}</wp:author_display_name>
    </wp:author>
${itemsXml.join("\n")}
  </channel>
</rss>`.trim();
}

/**
 * Helper to extract tag text or CDATA from XML node string
 */
function extractTag(xml: string, tag: string): string {
  // 1. Try CDATA: <tag[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/tag>
  const cdataRegex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i");
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) {
    return cdataMatch[1].trim();
  }

  // 2. Try plain content: <tag[^>]*>([\s\S]*?)<\/tag>
  const plainRegex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const plainMatch = xml.match(plainRegex);
  if (plainMatch) {
    return plainMatch[1].trim();
  }

  return "";
}

/**
 * Normalizes title into URL-safe slug
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\u0E00-\u0E7F-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Parses standard WordPress WXR XML export document and converts into CustomPages
 */
export function importFromWxrXml(xmlContent: string): WxrImportResult {
  if (!xmlContent || typeof xmlContent !== "string") {
    throw new Error("Invalid or empty WXR XML content");
  }

  // Extract channel site metadata
  const channelMatch = xmlContent.match(/<channel>([\s\S]*?)<\/channel>/i);
  const channelXml = channelMatch ? channelMatch[1] : xmlContent;

  const title = extractTag(channelXml, "title") || "Imported WordPress Site";
  const link = extractTag(channelXml, "link") || "";
  const description = extractTag(channelXml, "description") || "";
  const language = extractTag(channelXml, "language") || "th-TH";
  const wxrVersion = extractTag(channelXml, "wp:wxr_version") || "1.2";

  const pages: CustomPage[] = [];

  // Match all <item>...</item> blocks
  const itemPattern = /<item>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemPattern.exec(xmlContent)) !== null) {
    const itemXml = match[1];

    // Check post type: we only import "page" and "post"
    const postType = extractTag(itemXml, "wp:post_type");
    if (postType && !["page", "post"].includes(postType.toLowerCase())) {
      continue;
    }

    const itemTitle = extractTag(itemXml, "title") || "Untitled Page";
    let rawSlug = extractTag(itemXml, "wp:post_name");
    if (!rawSlug) {
      rawSlug = slugify(itemTitle);
    }
    const slug = rawSlug.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/^-+|-+$/g, "") || `page-${pages.length + 1}`;

    const rawStatus = extractTag(itemXml, "wp:status").toLowerCase();
    const published = rawStatus === "publish" || rawStatus === "published";

    // Extract raw content
    const rawContent = extractTag(itemXml, "content:encoded");
    const rawExcerpt = extractTag(itemXml, "excerpt:encoded");

    // Extract categories and tags
    const categories: string[] = [];
    const tags: string[] = [];
    const catRegex = /<category\s+domain=["']([^"']+)["'][^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]+))<\/category>/gi;
    let catMatch: RegExpExecArray | null;
    while ((catMatch = catRegex.exec(itemXml)) !== null) {
      const domain = catMatch[1].toLowerCase();
      const val = (catMatch[2] || catMatch[3] || "").trim();
      if (!val) continue;

      if (domain === "category") {
        if (!categories.includes(val)) categories.push(val);
      } else if (domain === "post_tag") {
        if (!tags.includes(val)) tags.push(val);
      }
    }

    // Extract postmeta values (template, subtitle)
    let template = "default";
    let customSubtitle: string | undefined = undefined;

    const metaRegex = /<wp:postmeta>([\s\S]*?)<\/wp:postmeta>/gi;
    let metaMatch: RegExpExecArray | null;
    while ((metaMatch = metaRegex.exec(itemXml)) !== null) {
      const metaXml = metaMatch[1];
      const key = extractTag(metaXml, "wp:meta_key");
      const val = extractTag(metaXml, "wp:meta_value");

      if (key === "_wp_page_template" && val) {
        template = val.replace(/\.php$/i, "");
      } else if (key === "_fixme_subtitle" && val) {
        customSubtitle = val;
      }
    }

    // Convert Gutenberg blocks from content:encoded
    let parsedSections: CustomBlock[] = [];
    let narrativeContent = "";

    if (rawContent) {
      if (rawContent.includes("<!-- wp:")) {
        // Parse Gutenberg blocks
        parsedSections = parseGutenbergContent(rawContent);

        // Separate narrative text from blocks if first block was paragraph
        const firstBlock = parsedSections[0];
        if (firstBlock && firstBlock.type === "rich_text" && firstBlock.content) {
          narrativeContent = firstBlock.content;
          parsedSections.shift(); // remove from sections to avoid duplication
        }
      } else {
        // Plain HTML or text
        narrativeContent = rawContent
          .replace(/<p>/gi, "")
          .replace(/<\/p>/gi, "\n\n")
          .replace(/<br\s*\/?>/gi, "\n")
          .trim();
      }
    }

    const subtitle = customSubtitle || (rawExcerpt ? rawExcerpt.replace(/<\/?[^>]+(>|$)/g, "").trim() : undefined);

    pages.push({
      slug,
      title: itemTitle,
      subtitle: subtitle || undefined,
      content: narrativeContent || undefined,
      template,
      published,
      categories: categories.length > 0 ? categories : undefined,
      tags: tags.length > 0 ? tags : undefined,
      sections: parsedSections.length > 0 ? parsedSections : undefined,
    });
  }

  return {
    siteInfo: {
      title,
      link,
      description,
      language,
      wxrVersion,
    },
    pages,
  };
}
