/**
 * WordPress oEmbed Consumer Engine (Round 58)
 *
 * Reverse-engineers WordPress core oEmbed architecture:
 * - `wp_oembed_get` / `WP_oEmbed`
 * - `wp_filter_oembed_result` (sandbox & privacy enforcement)
 * - `autoembed` (parses standalone URLs into responsive media wrappers)
 * - Privacy-preserving iframe providers (YouTube-nocookie, Vimeo DNT, TikTok, Google Maps)
 * - Gutenberg `wp-block-embed` HTML class structure & aspect ratio containers
 */

export interface OEmbedArgs {
  width?: number;
  height?: number;
  maxwidth?: number;
  maxheight?: number;
  discover?: boolean;
}

export interface OEmbedProvider {
  name: string;
  type: "video" | "rich" | "photo" | "link";
  patterns: RegExp[];
  endpoint?: string;
  aspectRatio?: "16-9" | "9-16" | "4-3" | "1-1" | "none";
  render: (url: string, args?: OEmbedArgs) => string | false;
}

// Built-in core providers registry
const coreProviders: OEmbedProvider[] = [
  {
    name: "youtube",
    type: "video",
    aspectRatio: "16-9",
    patterns: [
      /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i,
    ],
    render: (url: string, args?: OEmbedArgs) => {
      const match = url.match(
        /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i
      );
      if (!match || !match[1]) return false;
      const videoId = match[1];
      const width = args?.width || args?.maxwidth || 560;
      const height = args?.height || args?.maxheight || 315;

      return (
        `<iframe src="https://www.youtube-nocookie.com/embed/${videoId}?rel=0" ` +
        `width="${width}" height="${height}" ` +
        `title="YouTube video player" frameborder="0" ` +
        `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ` +
        `allowfullscreen="true" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`
      );
    },
  },
  {
    name: "vimeo",
    type: "video",
    aspectRatio: "16-9",
    patterns: [/^(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^/]*)\/videos\/|album\/(?:\d+)\/video\/|)(\d+)/i],
    render: (url: string, args?: OEmbedArgs) => {
      const match = url.match(/vimeo\.com\/(?:.*\/)?(\d+)/i);
      if (!match || !match[1]) return false;
      const videoId = match[1];
      const width = args?.width || args?.maxwidth || 640;
      const height = args?.height || args?.maxheight || 360;

      return (
        `<iframe src="https://player.vimeo.com/video/${videoId}?dnt=1" ` +
        `width="${width}" height="${height}" ` +
        `title="Vimeo video player" frameborder="0" ` +
        `allow="autoplay; fullscreen; picture-in-picture" ` +
        `allowfullscreen="true" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`
      );
    },
  },
  {
    name: "tiktok",
    type: "video",
    aspectRatio: "9-16",
    patterns: [
      /^(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[^/]+\/video\/(\d+)/i,
      /^(?:https?:\/\/)?(?:vm|vt)\.tiktok\.com\/([a-zA-Z0-9]+)/i,
    ],
    render: (url: string, args?: OEmbedArgs) => {
      const videoIdMatch = url.match(/video\/(\d+)/i);
      const videoId = videoIdMatch ? videoIdMatch[1] : "video";
      const width = args?.width || args?.maxwidth || 325;
      const height = args?.height || args?.maxheight || 580;

      return (
        `<iframe src="https://www.tiktok.com/embed/v2/${videoId}" ` +
        `width="${width}" height="${height}" ` +
        `title="TikTok video player" frameborder="0" ` +
        `allow="autoplay; encrypted-media; fullscreen" ` +
        `allowfullscreen="true" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`
      );
    },
  },
  {
    name: "google-maps",
    type: "rich",
    aspectRatio: "16-9",
    patterns: [
      /^(?:https?:\/\/)?(?:www\.)?(?:google\.[a-z.]+|maps\.google\.[a-z.]+)\/maps/i,
      /^(?:https?:\/\/)?maps\.app\.goo\.gl\/[a-zA-Z0-9]+/i,
    ],
    render: (url: string, args?: OEmbedArgs) => {
      const width = args?.width || args?.maxwidth || 600;
      const height = args?.height || args?.maxheight || 450;
      // Encode safe map embed URL
      const embedSrc = url.includes("output=embed")
        ? url
        : `${url}${url.includes("?") ? "&" : "?"}output=embed`;

      return (
        `<iframe src="${embedSrc.replace(/"/g, "&quot;")}" ` +
        `width="${width}" height="${height}" ` +
        `title="Google Maps Location" frameborder="0" style="border:0;" ` +
        `allowfullscreen="true" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`
      );
    },
  },
];

// Active registry of providers
const activeProviders: OEmbedProvider[] = [...coreProviders];

/**
 * Registers a new oEmbed provider (WordPress `wp_oembed_add_provider`).
 */
export function wp_oembed_add_provider(
  formatRegex: RegExp | string,
  providerEndpoint: string,
  isRegex: boolean = false
): void {
  const pattern =
    typeof formatRegex === "string"
      ? new RegExp(isRegex ? formatRegex : `^${formatRegex.replace(/\*/g, ".*")}$`, "i")
      : formatRegex;

  activeProviders.unshift({
    name: "custom-provider",
    type: "rich",
    aspectRatio: "16-9",
    patterns: [pattern],
    endpoint: providerEndpoint,
    render: (url: string, args?: OEmbedArgs) => {
      const w = args?.width || 600;
      const h = args?.height || 400;
      return (
        `<iframe src="${providerEndpoint}?url=${encodeURIComponent(url)}" ` +
        `width="${w}" height="${h}" loading="lazy" frameborder="0" allowfullscreen="true"></iframe>`
      );
    },
  });
}

/**
 * Retrieves all registered oEmbed providers.
 */
export function get_oembed_providers(): OEmbedProvider[] {
  return [...activeProviders];
}

/**
 * Resets providers to the default core list.
 */
export function reset_oembed_providers(): void {
  activeProviders.length = 0;
  activeProviders.push(...coreProviders);
}

/**
 * Filters and sanitizes oEmbed HTML markup (WordPress `wp_filter_oembed_result`).
 * Enforces lazy loading, referrer policy, and removes inline scripts or dangerous event handlers.
 */
export function wp_filter_oembed_result(
  html: string,
  url: string,
  args?: OEmbedArgs
): string {
  if (!html || typeof html !== "string") return "";

  // Strip script tags completely for security
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // Strip inline javascript event handlers
  sanitized = sanitized.replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  // Ensure iframe has loading="lazy" and referrerpolicy
  sanitized = sanitized.replace(/<iframe\b([^>]*)>/gi, (match, attrs) => {
    let newAttrs = attrs;
    if (!/\bloading\s*=/i.test(newAttrs)) {
      newAttrs += ` loading="lazy"`;
    }
    if (!/\breferrerpolicy\s*=/i.test(newAttrs)) {
      newAttrs += ` referrerpolicy="no-referrer-when-downgrade"`;
    }
    return `<iframe${newAttrs}>`;
  });

  return sanitized;
}

/**
 * Wraps oEmbed HTML in standard WordPress Gutenberg block structure.
 */
export function wrapInGutenbergEmbedBlock(
  html: string,
  providerName: string,
  aspectRatio: string = "16-9",
  type: string = "video"
): string {
  const aspectClass = aspectRatio !== "none" ? ` wp-embed-aspect-${aspectRatio}` : "";
  return (
    `<figure class="wp-block-embed is-type-${type} is-provider-${providerName}${aspectClass}">` +
    `<div class="wp-block-embed__wrapper">` +
    `${html}` +
    `</div>` +
    `</figure>`
  );
}

/**
 * Reverse-engineers WordPress `wp_oembed_get`.
 *
 * @param url Media URL to embed
 * @param args Options like width and height
 * @returns Embed HTML string or false if no matching provider found
 */
export function wp_oembed_get(url: string, args?: OEmbedArgs): string | false {
  if (!url || typeof url !== "string") return false;

  const trimmed = url.trim();

  for (const provider of activeProviders) {
    for (const pattern of provider.patterns) {
      if (pattern.test(trimmed)) {
        const rawHtml = provider.render(trimmed, args);
        if (!rawHtml) continue;

        const filteredHtml = wp_filter_oembed_result(rawHtml, trimmed, args);
        return wrapInGutenbergEmbedBlock(
          filteredHtml,
          provider.name,
          provider.aspectRatio || "16-9",
          provider.type
        );
      }
    }
  }

  return false;
}

/**
 * Auto-embeds bare URLs on their own lines (WordPress `WP_Embed::autoembed`).
 * Parses paragraph tags or line breaks containing single media URLs and replaces them with responsive embeds.
 */
export function autoembed(content: string, args?: OEmbedArgs): string {
  if (!content || typeof content !== "string") return "";

  // 1. Matches <p>(https?://...)</p>
  let processed = content.replace(
    /<p>\s*(https?:\/\/[^\s<]+)\s*<\/p>/gi,
    (match, url) => {
      const embed = wp_oembed_get(url, args);
      return embed ? embed : match;
    }
  );

  // 2. Matches bare URLs on their own lines
  processed = processed.replace(
    /(^|[\r\n])(https?:\/\/[^\s<]+)(?=[\r\n]|$)/gi,
    (match, prefix, url) => {
      const embed = wp_oembed_get(url, args);
      return embed ? `${prefix}${embed}` : match;
    }
  );

  return processed;
}
