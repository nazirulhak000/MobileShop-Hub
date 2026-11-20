/**
 * WordPress-Style Dynamic RSS 2.0 / Atom Syndication Feed Engine
 * Reverse-engineers WordPress feed generation (`/feed/`, `/feed/atom/`, `the_excerpt_rss`, `the_content_feed`).
 * 
 * Generates standards-compliant XML feeds for search engines, news readers, and social syndication.
 */

import { CustomPage, StorefrontConfigData } from "@/lib/storefrontTheme";

export interface FeedChannelInfo {
  title: string;
  link: string;
  feedUrl: string;
  description: string;
  language?: string;
  shopName: string;
  lastBuildDate?: Date | string;
}

export interface FeedItem {
  title: string;
  link: string;
  guid?: string;
  pubDate: Date | string;
  creator?: string;
  categories?: string[];
  excerpt?: string;
  content?: string;
}

/**
 * Formats date into RFC 822 / RFC 2822 specification required for RSS 2.0 feeds
 * e.g. "Fri, 20 Nov 2026 06:45:00 +0000"
 */
export function toRfc822Date(dateInput?: Date | string | number): string {
  const date = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(date.getTime())) return new Date().toUTCString();
  return date.toUTCString();
}

/**
 * Formats date into ISO 8601 / RFC 3339 required for Atom 1.0 feeds
 */
export function toIsoDate(dateInput?: Date | string | number): string {
  const date = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

/**
 * Escapes XML text entities
 */
export function escapeXml(str?: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Wraps content in CDATA block, escaping any nested CDATA closing tokens
 */
export function toCdata(content?: string): string {
  if (!content) return "<![CDATA[]]>";
  const safe = String(content).replace(/]]>/g, "]]]]><![CDATA[>");
  return `<![CDATA[${safe}]]>`;
}

/**
 * Generates standard RSS 2.0 XML syndication feed
 */
export function generateRssFeed(channel: FeedChannelInfo, items: FeedItem[]): string {
  const buildDate = toRfc822Date(channel.lastBuildDate);
  const language = channel.language || "th-TH";

  const xmlItems = items
    .map((item) => {
      const pubDate = toRfc822Date(item.pubDate);
      const guid = item.guid || item.link;
      const creator = item.creator || channel.shopName;
      const categoriesXml = (item.categories || [])
        .map((cat) => `      <category>${toCdata(cat)}</category>`)
        .join("\n");

      return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <pubDate>${pubDate}</pubDate>
      <dc:creator>${toCdata(creator)}</dc:creator>
      <guid isPermaLink="true">${escapeXml(guid)}</guid>
${categoriesXml ? categoriesXml + "\n" : ""}      <description>${toCdata(item.excerpt || item.title)}</description>
      <content:encoded>${toCdata(item.content || item.excerpt || "")}</content:encoded>
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:wfw="http://wellformedweb.org/CommentAPI/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:sy="http://purl.org/rss/1.0/modules/syndication/"
  xmlns:slash="http://purl.org/rss/1.0/modules/slash/"
>
  <channel>
    <title>${escapeXml(channel.title)}</title>
    <atom:link href="${escapeXml(channel.feedUrl)}" rel="self" type="application/rss+xml" />
    <link>${escapeXml(channel.link)}</link>
    <description>${escapeXml(channel.description)}</description>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <language>${escapeXml(language)}</language>
    <sy:updatePeriod>hourly</sy:updatePeriod>
    <sy:updateFrequency>1</sy:updateFrequency>
    <generator>FixMe Enterprise WordPress Feed Engine v2.0</generator>
${xmlItems}
  </channel>
</rss>`.trim();
}

/**
 * Generates standard Atom 1.0 XML syndication feed
 */
export function generateAtomFeed(channel: FeedChannelInfo, items: FeedItem[]): string {
  const buildDate = toIsoDate(channel.lastBuildDate);

  const xmlEntries = items
    .map((item) => {
      const pubDate = toIsoDate(item.pubDate);
      const guid = item.guid || item.link;
      const creator = item.creator || channel.shopName;

      return `  <entry>
    <title type="text">${escapeXml(item.title)}</title>
    <link rel="alternate" type="text/html" href="${escapeXml(item.link)}" />
    <id>${escapeXml(guid)}</id>
    <updated>${pubDate}</updated>
    <author>
      <name>${escapeXml(creator)}</name>
    </author>
    <summary type="html">${toCdata(item.excerpt || item.title)}</summary>
    <content type="html">${toCdata(item.content || item.excerpt || "")}</content>
  </entry>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${escapeXml(channel.language || "th")}">
  <title>${escapeXml(channel.title)}</title>
  <link rel="self" type="application/atom+xml" href="${escapeXml(channel.feedUrl)}" />
  <link rel="alternate" type="text/html" href="${escapeXml(channel.link)}" />
  <id>${escapeXml(channel.link)}</id>
  <updated>${buildDate}</updated>
  <subtitle>${escapeXml(channel.description)}</subtitle>
  <generator uri="https://fixme.in.th" version="2.0">FixMe Enterprise Feed Engine</generator>
${xmlEntries}
</feed>`.trim();
}

/**
 * High-level helper: Transforms storefront custom pages & announcements into feed items
 */
export function createFeedItemsFromStorefront(
  shopSlug: string,
  pages: CustomPage[],
  config: Partial<StorefrontConfigData>,
  baseUrl = "https://fixme.in.th"
): FeedItem[] {
  const items: FeedItem[] = [];

  // 1. Published subpages
  const publishedPages = pages.filter((p) => p.published !== false);
  for (const page of publishedPages) {
    items.push({
      title: page.title,
      link: `${baseUrl}/store/${shopSlug}/${page.slug}`,
      pubDate: page.updatedAt ? new Date(page.updatedAt) : new Date(),
      categories: page.categories || ["บริการ"],
      excerpt: page.subtitle || page.metaDescription || page.title,
      content: page.content || page.subtitle || page.title,
    });
  }

  // 2. Announcement item if present
  if (config.announcementEnabled && config.announcementText?.trim()) {
    items.unshift({
      title: "ประกาศสำคัญจากทางร้าน",
      link: `${baseUrl}/store/${shopSlug}#announcement`,
      pubDate: new Date(),
      categories: ["ประกาศ"],
      excerpt: config.announcementText,
      content: `<p>${config.announcementText}</p>`,
    });
  }

  return items;
}
