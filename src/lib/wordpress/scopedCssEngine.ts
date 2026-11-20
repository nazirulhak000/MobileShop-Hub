/**
 * WordPress Scoped Block CSS Engine (`wp_style_engine` Custom CSS Scoper) - Round 44
 *
 * Reverse-engineers WordPress Gutenberg custom block CSS scoping:
 * Prefixes custom block CSS selectors with a target container or block ID,
 * blocks global style bleed, preserves media queries and keyframes,
 * and strips malicious vectors (XSS, expressions, @import).
 */

/**
 * Sanitizes CSS string against known CSS injection and XSS vectors
 */
export function sanitizeCss(rawCss: string): string {
  if (!rawCss || typeof rawCss !== "string") return "";

  return rawCss
    // Strip JavaScript protocol execution in CSS
    .replace(/javascript\s*:/gi, "")
    .replace(/vbscript\s*:/gi, "")
    .replace(/expression\s*\([^)]*\)/gi, "")
    .replace(/-moz-binding\s*:/gi, "")
    .replace(/behavior\s*:/gi, "")
    // Block @import to prevent arbitrary external resource pulling
    .replace(/@import\s+[^;]+;/gi, "")
    // Clean HTML tag closures that could break out of <style>
    .replace(/<\/style/gi, "<\\/style")
    .replace(/<!--/g, "")
    .replace(/-->/g, "");
}

/**
 * Validates whether a scope selector is safe and structurally valid
 */
export function isValidCssSelector(selector: string): boolean {
  if (!selector || typeof selector !== "string") return false;
  const clean = selector.trim();
  // Valid selectors: #id, .class, [data-attr], element name, or compounds
  if (/[;{}<>]/.test(clean)) return false;
  return clean.length > 0 && clean.length < 256;
}

/**
 * Prefixes a single selector or comma-separated list of selectors with the scopeSelector
 */
function prefixSelectorList(selectorsStr: string, scopeSelector: string): string {
  const parts = selectorsStr.split(",");
  const prefixedParts = parts.map((part) => {
    const trimmed = part.trim();
    if (!trimmed) return "";

    // If selector starts with parent reference '&'
    if (trimmed.startsWith("&")) {
      return trimmed.replace(/^&/, scopeSelector);
    }

    // If selector targets root/html/body
    if (/^(html|body|:root)\b/i.test(trimmed)) {
      return trimmed.replace(/^(html|body|:root)\s*/i, `${scopeSelector} `).trim();
    }

    // Default descendant selector prefix
    return `${scopeSelector} ${trimmed}`;
  });

  return prefixedParts.filter(Boolean).join(", ");
}

/**
 * Recursively scopes CSS rules within blocks (supporting @media, @container, @supports)
 */
export function scopeCssRules(
  css: string,
  scopeSelector: string,
  options: { minify?: boolean } = {}
): string {
  if (!css || typeof css !== "string") return "";
  const cleanScope = (scopeSelector || "").trim();
  if (!isValidCssSelector(cleanScope)) {
    throw new Error(`Invalid CSS scope selector: "${scopeSelector}"`);
  }

  const sanitized = sanitizeCss(css);
  let result = "";
  let i = 0;
  const len = sanitized.length;

  while (i < len) {
    // Skip whitespace
    while (i < len && /\s/.test(sanitized[i])) i++;
    if (i >= len) break;

    // Check for comment
    if (sanitized[i] === "/" && sanitized[i + 1] === "*") {
      const endComment = sanitized.indexOf("*/", i + 2);
      if (endComment === -1) break;
      i = endComment + 2;
      continue;
    }

    // Find next '{'
    const openBrace = sanitized.indexOf("{", i);
    if (openBrace === -1) break;

    const selectorOrAtRule = sanitized.substring(i, openBrace).trim();

    // Find matching '}'
    let depth = 1;
    let j = openBrace + 1;
    while (j < len && depth > 0) {
      if (sanitized[j] === "{") depth++;
      else if (sanitized[j] === "}") depth--;
      j++;
    }

    const blockBody = sanitized.substring(openBrace + 1, j - 1);
    i = j;

    // Handle @keyframes (do not prefix keyframe steps like 0%, from, to)
    if (/^@keyframes\b/i.test(selectorOrAtRule) || /^@-webkit-keyframes\b/i.test(selectorOrAtRule)) {
      result += `${selectorOrAtRule} { ${blockBody.trim()} }\n`;
      continue;
    }

    // Handle @media, @supports, @container (recurse inner rules)
    if (/^@(media|supports|container)\b/i.test(selectorOrAtRule)) {
      const innerScoped = scopeCssRules(blockBody, cleanScope, options);
      result += `${selectorOrAtRule} {\n${innerScoped}\n}\n`;
      continue;
    }

    // Other at-rules (e.g. @font-face, @page) - keep as-is
    if (selectorOrAtRule.startsWith("@")) {
      result += `${selectorOrAtRule} { ${blockBody.trim()} }\n`;
      continue;
    }

    // Normal CSS rule: prefix selectors
    const scopedSelector = prefixSelectorList(selectorOrAtRule, cleanScope);
    if (scopedSelector) {
      result += `${scopedSelector} { ${blockBody.trim()} }\n`;
    }
  }

  if (options.minify) {
    return result
      .replace(/\s+/g, " ")
      .replace(/\s*([{:;,])\s*/g, "$1")
      .trim();
  }

  return result.trim();
}
