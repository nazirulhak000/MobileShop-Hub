/**
 * WordPress Gutenberg Block Grammar Serialization & Deserialization Engine (Round 21)
 *
 * Implements WordPress Gutenberg block comment grammar:
 * - Void block: `<!-- wp:namespace/block {"attr":"val"} /-->`
 * - Container block: `<!-- wp:namespace/block {"attr":"val"} -->...innerHTML...<!-- /wp:namespace/block -->`
 * Converts bidirectionally between FixMe JSON blocks and Gutenberg markup.
 */

import { CustomBlock, CustomBlockType } from "@/lib/storefrontTheme";
import { safeParseJson } from "@/lib/storefrontTheme";
import { stripScriptTags } from "@/lib/storefrontSecurity";

/**
 * Mapping between FixMe block types and WordPress Gutenberg block identifiers
 */
const TYPE_TO_WP_NAME: Record<string, string> = {
  promo_banner: "fixme/promo-banner",
  "promo-banner": "fixme/promo-banner",
  photo_gallery: "fixme/photo-gallery",
  "photo-gallery": "fixme/photo-gallery",
  video_embed: "fixme/video-embed",
  "video-embed": "fixme/video-embed",
  rich_text: "fixme/rich-text",
  "rich-text": "fixme/rich-text",
  cta: "fixme/cta",
  html_embed: "fixme/html-embed",
  "html-embed": "fixme/html-embed",
  business_hours: "fixme/business-hours",
  "business-hours": "fixme/business-hours",
  contact_form: "fixme/contact-form",
  "contact-form": "fixme/contact-form",
  query_loop: "fixme/query-loop",
  "query-loop": "fixme/query-loop",
  service_grid: "fixme/service-grid",
  "service-grid": "fixme/service-grid",
  services_grid: "fixme/service-grid",
  "services-grid": "fixme/service-grid",
};

const WP_NAME_TO_TYPE: Record<string, string> = {
  "fixme/promo-banner": "promo_banner",
  "fixme/photo-gallery": "photo_gallery",
  "fixme/video-embed": "video_embed",
  "fixme/rich-text": "rich_text",
  "fixme/cta": "cta",
  "fixme/html-embed": "html_embed",
  "fixme/business-hours": "business_hours",
  "fixme/contact-form": "contact_form",
  "fixme/query-loop": "query_loop",
  "fixme/service-grid": "service_grid",
  // Standard WP Core fallbacks
  "core/paragraph": "rich_text",
  paragraph: "rich_text",
  "core/heading": "rich_text",
  heading: "rich_text",
  "core/html": "html_embed",
  html: "html_embed",
  "core/image": "photo_gallery",
  image: "photo_gallery",
  "core/query": "query_loop",
  "core/post-template": "query_loop",
};

/**
 * Serializes FixMe custom blocks into WordPress Gutenberg block HTML grammar.
 *
 * @param blocks Array of FixMe CustomBlock objects
 * @returns Standard Gutenberg HTML string with block comments
 */
export function serializeToGutenberg(blocks: CustomBlock[]): string {
  if (!Array.isArray(blocks) || blocks.length === 0) return "";

  const chunks: string[] = [];

  for (const block of blocks) {
    if (!block || typeof block !== "object") continue;

    const rawType = (block.type || "promo_banner").toLowerCase();
    const wpBlockName = TYPE_TO_WP_NAME[rawType] || `fixme/${rawType.replace(/_/g, "-")}`;

    // Extract attributes (omitting big raw inner content from json attributes to keep comments lean)
    const { content, html, id, type, ...attrs } = block;
    const cleanAttrs: Record<string, any> = {
      id,
      type,
      ...attrs,
    };

    // Remove undefined or null fields for concise json output
    for (const key of Object.keys(cleanAttrs)) {
      if (cleanAttrs[key] === undefined || cleanAttrs[key] === null) {
        delete cleanAttrs[key];
      }
    }

    const attrsJson = Object.keys(cleanAttrs).length > 0 ? ` ${JSON.stringify(cleanAttrs)}` : "";

    // Container blocks with inner HTML
    if (rawType.includes("rich") || rawType.includes("text")) {
      const innerHtml = content
        ? `<div class="wp-block-fixme-rich-text">\n<p>${content.replace(/\n\n/g, "</p>\n<p>")}</p>\n</div>`
        : "";
      chunks.push(`<!-- wp:${wpBlockName}${attrsJson} -->\n${innerHtml}\n<!-- /wp:${wpBlockName} -->`);
    } else if (rawType.includes("html") || rawType.includes("embed")) {
      const safeHtml = html ? stripScriptTags(html) : "";
      chunks.push(`<!-- wp:${wpBlockName}${attrsJson} -->\n<div class="wp-block-fixme-html-embed">\n${safeHtml}\n</div>\n<!-- /wp:${wpBlockName} -->`);
    } else {
      // Void / Self-closing Gutenberg block comment
      chunks.push(`<!-- wp:${wpBlockName}${attrsJson} /-->`);
    }
  }

  return chunks.join("\n\n");
}

/**
 * Parses WordPress Gutenberg HTML markup into FixMe CustomBlock array.
 * Robust regex tokenizer parses both self-closing and paired block comments,
 * and extracts attributes safely.
 *
 * @param content Gutenberg HTML markup
 * @returns Array of FixMe CustomBlock items
 */
export function parseGutenbergContent(content: string): CustomBlock[] {
  if (!content || typeof content !== "string") return [];

  const blocks: CustomBlock[] = [];
  const text = content.trim();
  if (!text) return [];

  // Regex matches:
  // 1. Self-closing: <!-- wp:name {"attr":"val"} /-->
  // 2. Container:    <!-- wp:name {"attr":"val"} -->...innerHTML...<!-- /wp:name -->
  const blockRegex =
    /<!--\s+wp:([a-z0-9_\-\/]+)(?:\s+(\{.*?\}))?\s*(?:\/-->|-->([\s\S]*?)<!--\s+\/wp:\1\s+-->)/gi;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(text)) !== null) {
    const [fullMatch, wpName, jsonAttrsStr, innerHtml] = match;
    const matchIndex = match.index;

    // Check if there was freeform HTML between blocks
    if (matchIndex > lastIndex) {
      const freeform = text.slice(lastIndex, matchIndex).trim();
      if (freeform && !freeform.startsWith("<!--")) {
        blocks.push({
          id: `block_freeform_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          type: "rich_text",
          title: "ข้อความ",
          content: freeform.replace(/<[^>]+>/g, "").trim(),
          visible: true,
          enabled: true,
        });
      }
    }

    lastIndex = matchIndex + fullMatch.length;

    const lowerName = wpName.toLowerCase();
    const fixmeType = WP_NAME_TO_TYPE[lowerName] || (lowerName.startsWith("fixme/") ? lowerName.replace("fixme/", "").replace(/-/g, "_") : "promo_banner");

    // Parse attributes safely
    const parsedAttrs = jsonAttrsStr ? safeParseJson<Record<string, any>>(jsonAttrsStr, {}) : {};

    const id = parsedAttrs.id || `block_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Build standard CustomBlock
    const block: CustomBlock = {
      ...parsedAttrs,
      id,
      type: fixmeType as CustomBlockType,
      visible: parsedAttrs.visible !== undefined ? Boolean(parsedAttrs.visible) : true,
      enabled: parsedAttrs.enabled !== undefined ? Boolean(parsedAttrs.enabled) : true,
    };

    // If block has innerHtml and content was not in attrs, extract from innerHtml
    if (innerHtml) {
      const cleanedInner = innerHtml.trim();
      if (fixmeType === "rich_text" && !block.content) {
        // Strip wrapper divs and parse plain paragraphs
        block.content = cleanedInner
          .replace(/<div[^>]*>/gi, "")
          .replace(/<\/div>/gi, "")
          .replace(/<p>/gi, "")
          .replace(/<\/p>/gi, "\n\n")
          .replace(/<br\s*\/?>/gi, "\n")
          .trim();
      } else if (fixmeType === "html_embed" && !block.html) {
        block.html = cleanedInner
          .replace(/<div\s+class="wp-block-fixme-html-embed">/gi, "")
          .replace(/<\/div>$/gi, "")
          .trim();
      }
    }

    blocks.push(block);
  }

  // Handle trailing freeform HTML after the last block
  if (lastIndex < text.length) {
    const trailing = text.slice(lastIndex).trim();
    if (trailing && !trailing.startsWith("<!--")) {
      blocks.push({
        id: `block_freeform_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: "rich_text",
        title: "ข้อความ",
        content: trailing.replace(/<[^>]+>/g, "").trim(),
        visible: true,
        enabled: true,
      });
    }
  }

  return blocks;
}
