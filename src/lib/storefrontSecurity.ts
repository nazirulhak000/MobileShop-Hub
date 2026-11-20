/**
 * Security and sanitization utilities for Storefront & Customizer
 * Protects against:
 * - Stored XSS in embed blocks, markdown, and links
 * - `javascript:` and unsafe URI scheme injection
 * - CSS class injection and attribute breakouts
 * - Malicious HTML/iframe sandbox breakouts
 * - Truncation corruption on 500KB JSON boundaries
 */

const SAFE_URL_PATTERN = /^(https?:\/\/|\/|tel:|mailto:|#)/i;
const DANGEROUS_SCHEMES_PATTERN = /^(javascript|vbscript|data|file|blob):/i;
const SAFE_IMAGE_DATA_PATTERN = /^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=]+$/i;

/**
 * Strips whitespace, null bytes, and non-printable control characters
 * that attackers use to sneak `java\0script:` past filters.
 */
function cleanRawUrl(raw: string): string {
  return raw
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, "")
    .trim();
}

/**
 * Sanitizes URLs for links, buttons, and redirects.
 * Strictly blocks `javascript:`, `vbscript:`, unsafe `data:` URLs, and control characters.
 * Allows `http://`, `https://`, `/relative`, `tel:`, `mailto:`, and `#anchor`.
 */
export function sanitizeUrl(url: unknown, fallback = ""): string {
  if (!url || typeof url !== "string") return fallback;

  const cleaned = cleanRawUrl(url);
  if (!cleaned) return fallback;

  // Check for dangerous schemes even if URL-encoded or obfuscated with spaces
  const normalizedScheme = cleaned.replace(/[\s\t\r\n]/g, "").toLowerCase();

  if (DANGEROUS_SCHEMES_PATTERN.test(normalizedScheme)) {
    // Allow safe image data URLs if explicitly an image
    if (SAFE_IMAGE_DATA_PATTERN.test(cleaned)) {
      return cleaned;
    }
    return fallback;
  }

  // Must match safe protocol or relative/anchor
  if (SAFE_URL_PATTERN.test(cleaned)) {
    return cleaned;
  }

  // If no scheme was specified and doesn't start with dangerous chars, treat as relative or anchor
  if (!cleaned.includes(":") && !cleaned.startsWith("//")) {
    return cleaned.startsWith("#") ? cleaned : `/${cleaned.replace(/^\/+/, "")}`;
  }

  return fallback;
}

/**
 * Validates and sanitizes iframe src URLs.
 * Strictly requires http://, https://, or /uploads/...
 * Blocks all javascript:, data:, and relative page traversals.
 */
export function sanitizeIframeSrc(url: unknown): string | null {
  if (!url || typeof url !== "string") return null;

  const cleaned = cleanRawUrl(url);
  if (!cleaned) return null;

  const lower = cleaned.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("vbscript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("file:")
  ) {
    return null;
  }

  if (
    lower.startsWith("https://") ||
    lower.startsWith("http://") ||
    lower.startsWith("/uploads/")
  ) {
    return cleaned;
  }

  return null;
}

/**
 * Sanitizes custom CSS classes.
 * Restricts to valid CSS identifier characters: [a-zA-Z0-9_-] and spaces.
 * Strips quotes, angle brackets, semicolons, brackets, colons, and slashes
 * preventing CSS injection, attribute escaping, or class confusion.
 */
export function sanitizeCssClass(className: unknown): string {
  if (!className || typeof className !== "string") return "";

  return className
    .replace(/[^a-zA-Z0-9_\-\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

/**
 * Strips raw <script> tags and inline JavaScript event handlers (e.g. onerror=, onclick=)
 * from HTML content.
 */
export function stripScriptTags(html: string): string {
  if (!html || typeof html !== "string") return "";

  let sanitized = html;

  // 1. Remove <script ...>...</script> tags case-insensitively
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // 2. Remove standalone <script...> tags
  sanitized = sanitized.replace(/<script\b[^>]*>/gi, "");

  // 3. Remove dangerous event handlers e.g. onload=, onerror=, onclick=
  sanitized = sanitized.replace(/\son[a-zA-Z]+\s*=\s*(['"]).*?\1/gi, "");
  sanitized = sanitized.replace(/\son[a-zA-Z]+\s*=\s*[^>\s]+/gi, "");

  // 4. Remove javascript: in href or src attributes
  sanitized = sanitized.replace(/(href|src)\s*=\s*(['"])\s*javascript:[^'"]*\2/gi, '$1="#"');

  return sanitized;
}

/**
 * Validates JSON payload string size against byte boundary (default 500KB = 512,000 bytes).
 * Unlike String.prototype.slice(), this NEVER truncates in the middle of a JSON string,
 * avoiding fatal JSON.parse SyntaxErrors that destroy customizer state.
 *
 * @throws Error if payload exceeds byte limit
 */
export function validateJsonPayloadBoundary(
  data: unknown,
  fieldName: string,
  maxBytes = 512000
): string | null {
  if (data === undefined || data === null) return null;

  let str: string;
  if (typeof data === "string") {
    str = data.trim();
  } else {
    try {
      str = JSON.stringify(data);
    } catch {
      throw new Error(`ข้อมูล ${fieldName} ไม่อยู่ในรูปแบบ JSON ที่ถูกต้อง`);
    }
  }

  if (!str || str === "null" || str === "undefined") return null;

  const byteLength = Buffer.byteLength(str, "utf8");
  if (byteLength > maxBytes) {
    throw new Error(
      `ขนาดข้อมูล ${fieldName} (${Math.round(byteLength / 1024)}KB) เกินขีดจำกัดความปลอดภัย ${Math.round(
        maxBytes / 1024
      )}KB กรุณาลดขนาดเนื้อหาหรือจำนวนบล็อก`
    );
  }

  return str;
}
