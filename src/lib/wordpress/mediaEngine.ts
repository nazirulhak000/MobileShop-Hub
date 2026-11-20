/**
 * WordPress Media Library Attachment Metadata & Responsive Srcset Engine (Round 28)
 *
 * Reverse-engineers WordPress core media functions:
 * - `wp_get_attachment_metadata` / `wp_generate_attachment_metadata`
 * - `wp_calculate_image_srcset`
 * - `wp_calculate_image_sizes`
 * - `wp_image_add_srcset_and_sizes`
 * - Standard WordPress image sizes (thumbnail, medium, medium_large, large, full)
 * - Custom size registration via `add_image_size`
 * - Proportional dimension scaling & aspect-ratio-aware srcset filtering
 */

export interface ImageSizeDefinition {
  width: number;
  height: number;
  crop: boolean;
}

export interface ImageSizeMeta {
  file: string;
  width: number;
  height: number;
  mime_type: string;
  filesize?: number;
  url: string;
}

export interface AttachmentImageMeta {
  aperture?: string;
  credit?: string;
  camera?: string;
  caption?: string;
  created_timestamp?: number;
  copyright?: string;
  focal_length?: string;
  iso?: string;
  shutter_speed?: string;
  title?: string;
  orientation?: string;
  keywords?: string[];
}

export interface AttachmentMetadata {
  id?: string | number;
  width: number;
  height: number;
  file: string;
  url: string;
  mime_type: string;
  filesize?: number;
  sizes: Record<string, ImageSizeMeta>;
  image_meta?: AttachmentImageMeta;
}

export interface ResponsiveImageProps {
  src: string;
  srcSet?: string;
  sizes?: string;
  width: number;
  height: number;
  alt: string;
  loading: "lazy" | "eager";
  decoding: "async" | "sync" | "auto";
}

// Standard WordPress Core default image sizes
export const WP_DEFAULT_SIZES: Record<string, ImageSizeDefinition> = {
  thumbnail: { width: 150, height: 150, crop: true },
  medium: { width: 300, height: 300, crop: false },
  medium_large: { width: 768, height: 0, crop: false },
  large: { width: 1024, height: 1024, crop: false },
};

// Registered image sizes store
const registeredSizes = new Map<string, ImageSizeDefinition>(
  Object.entries(WP_DEFAULT_SIZES)
);

/**
 * Registers an additional image size in the system (WordPress `add_image_size`)
 */
export function add_image_size(
  name: string,
  width: number,
  height: number = 0,
  crop: boolean = false
): void {
  if (!name || typeof name !== "string") {
    throw new Error("Image size name must be a non-empty string");
  }
  registeredSizes.set(name, {
    width: Math.max(0, Math.floor(width || 0)),
    height: Math.max(0, Math.floor(height || 0)),
    crop: Boolean(crop),
  });
}

/**
 * Retrieves all registered image sizes
 */
export function get_image_sizes(): Record<string, ImageSizeDefinition> {
  const result: Record<string, ImageSizeDefinition> = {};
  for (const [name, def] of registeredSizes.entries()) {
    result[name] = { ...def };
  }
  return result;
}

/**
 * Resets registered sizes to default WordPress sizes
 */
export function reset_image_sizes(): void {
  registeredSizes.clear();
  for (const [name, def] of Object.entries(WP_DEFAULT_SIZES)) {
    registeredSizes.set(name, { ...def });
  }
}

/**
 * Calculates scaled dimensions preserving aspect ratio or cropping
 * Mimics WordPress `wp_constrain_dimensions` and image resize calculations
 */
export function image_downscale_dimensions(
  origW: number,
  origH: number,
  targetW: number,
  targetH: number,
  crop: boolean
): { width: number; height: number } {
  if (origW <= 0 || origH <= 0) return { width: 0, height: 0 };

  // If crop is requested and target dimensions are both non-zero
  if (crop && targetW > 0 && targetH > 0) {
    return {
      width: Math.min(origW, targetW),
      height: Math.min(origH, targetH),
    };
  }

  // If only width is constrained (e.g. medium_large 768x0)
  if (targetW > 0 && targetH === 0) {
    if (origW <= targetW) return { width: origW, height: origH };
    const ratio = targetW / origW;
    return {
      width: targetW,
      height: Math.max(1, Math.round(origH * ratio)),
    };
  }

  // If only height is constrained
  if (targetH > 0 && targetW === 0) {
    if (origH <= targetH) return { width: origW, height: origH };
    const ratio = targetH / origH;
    return {
      width: Math.max(1, Math.round(origW * ratio)),
      height: targetH,
    };
  }

  // Both dimensions are box constraints (max bounding box)
  if (targetW > 0 && targetH > 0) {
    if (origW <= targetW && origH <= targetH) {
      return { width: origW, height: origH };
    }
    const ratio = Math.min(targetW / origW, targetH / origH);
    return {
      width: Math.max(1, Math.round(origW * ratio)),
      height: Math.max(1, Math.round(origH * ratio)),
    };
  }

  return { width: origW, height: origH };
}

/**
 * Generates an image URL for an intermediate size.
 * Handles both Unsplash/dynamic CDN query URLs and static file URLs.
 */
export function build_subsize_url(
  originalUrl: string,
  width: number,
  height: number,
  crop: boolean
): string {
  if (!originalUrl || typeof originalUrl !== "string") return "";

  // Unsplash or query-based dynamic CDN
  if (originalUrl.includes("images.unsplash.com") || originalUrl.includes("cdn.")) {
    try {
      const urlObj = new URL(originalUrl);
      urlObj.searchParams.set("w", String(width));
      if (crop && height > 0) {
        urlObj.searchParams.set("h", String(height));
        urlObj.searchParams.set("fit", "crop");
      } else {
        urlObj.searchParams.delete("h");
        urlObj.searchParams.set("fit", "max");
      }
      urlObj.searchParams.set("q", "80");
      return urlObj.toString();
    } catch {
      // Fall through to path modification if URL parsing fails
    }
  }

  // Standard WordPress file naming: /uploads/2026/11/image.jpg -> /uploads/2026/11/image-300x200.jpg
  const hashIdx = originalUrl.indexOf("#");
  const queryIdx = originalUrl.indexOf("?");
  const endIdx = queryIdx !== -1 ? queryIdx : (hashIdx !== -1 ? hashIdx : originalUrl.length);
  const pathPart = originalUrl.substring(0, endIdx);
  const extraPart = originalUrl.substring(endIdx);

  const dotIdx = pathPart.lastIndexOf(".");
  if (dotIdx > 0 && dotIdx > pathPart.lastIndexOf("/")) {
    const base = pathPart.substring(0, dotIdx);
    const ext = pathPart.substring(dotIdx);
    return `${base}-${width}x${height}${ext}${extraPart}`;
  }

  // Fallback query string
  const sep = originalUrl.includes("?") ? "&" : "?";
  return `${originalUrl}${sep}w=${width}&h=${height}`;
}

/**
 * Derives MIME type from URL file extension
 */
export function get_mime_type_from_url(url: string): string {
  if (!url || typeof url !== "string") return "image/jpeg";
  const cleanUrl = url.split("?")[0].split("#")[0].toLowerCase();
  if (cleanUrl.endsWith(".png")) return "image/png";
  if (cleanUrl.endsWith(".webp")) return "image/webp";
  if (cleanUrl.endsWith(".gif")) return "image/gif";
  if (cleanUrl.endsWith(".svg")) return "image/svg+xml";
  if (cleanUrl.endsWith(".avif")) return "image/avif";
  return "image/jpeg";
}

/**
 * Reverse-engineers `wp_generate_attachment_metadata` & `wp_get_attachment_metadata`
 * Generates metadata object with sizes breakdown, dimensions, and URLs.
 */
export function wp_generate_attachment_metadata(
  url: string,
  width: number = 1920,
  height: number = 1080,
  options?: {
    id?: string | number;
    mime_type?: string;
    filesize?: number;
    title?: string;
    caption?: string;
  }
): AttachmentMetadata {
  const safeW = Math.max(1, Math.floor(width || 1920));
  const safeH = Math.max(1, Math.floor(height || 1080));
  const mimeType = options?.mime_type || get_mime_type_from_url(url);

  // Extract filename
  const cleanPath = url.split("?")[0].split("#")[0];
  const filename = cleanPath.substring(cleanPath.lastIndexOf("/") + 1) || "image.jpg";

  const sizes: Record<string, ImageSizeMeta> = {};

  // Build intermediate sizes for all registered image sizes
  for (const [sizeName, def] of registeredSizes.entries()) {
    // WordPress behavior: Do not generate intermediate size if original image is smaller
    if (!def.crop && safeW < def.width && (def.height === 0 || safeH < def.height)) {
      continue;
    }

    const scaled = image_downscale_dimensions(safeW, safeH, def.width, def.height, def.crop);
    if (scaled.width <= 0 || scaled.height <= 0) continue;

    // Do not create subsize if it matches original dimensions exactly
    if (scaled.width === safeW && scaled.height === safeH && !def.crop) {
      continue;
    }

    const subUrl = build_subsize_url(url, scaled.width, scaled.height, def.crop);
    const subClean = subUrl.split("?")[0].split("#")[0];
    const subFilename = subClean.substring(subClean.lastIndexOf("/") + 1);

    sizes[sizeName] = {
      file: subFilename,
      width: scaled.width,
      height: scaled.height,
      mime_type: mimeType,
      url: subUrl,
      filesize: options?.filesize
        ? Math.max(1024, Math.round(options.filesize * (scaled.width / safeW)))
        : undefined,
    };
  }

  // Full / original size entry
  sizes.full = {
    file: filename,
    width: safeW,
    height: safeH,
    mime_type: mimeType,
    filesize: options?.filesize,
    url,
  };

  return {
    id: options?.id,
    width: safeW,
    height: safeH,
    file: filename,
    url,
    mime_type: mimeType,
    filesize: options?.filesize,
    sizes,
    image_meta: {
      title: options?.title || filename.replace(/\.[^/.]+$/, ""),
      caption: options?.caption || "",
      created_timestamp: Date.now(),
    },
  };
}

/**
 * Alias for wp_get_attachment_metadata for WordPress parity
 */
export const wp_get_attachment_metadata = wp_generate_attachment_metadata;

/**
 * Calculates a responsive srcset string for an image (WordPress `wp_calculate_image_srcset`)
 *
 * @param size Target size name (e.g. "large", "full") or numeric dimensions [width, height]
 * @param imageSrc Source URL of the target image
 * @param imageMeta Attachment metadata object
 * @param imageId Optional attachment ID
 * @returns Comma-separated srcset string or false if insufficient candidates
 */
export function wp_calculate_image_srcset(
  size: string | [number, number],
  imageSrc: string,
  imageMeta: AttachmentMetadata,
  imageId?: string | number
): string | false {
  if (!imageMeta || !imageMeta.width || !imageMeta.height || !imageMeta.sizes) {
    return false;
  }

  // Determine target aspect ratio and dimensions
  let targetW = imageMeta.width;
  let targetH = imageMeta.height;

  if (Array.isArray(size) && size.length === 2 && size[0] > 0 && size[1] > 0) {
    targetW = size[0];
    targetH = size[1];
  } else if (typeof size === "string" && imageMeta.sizes[size]) {
    targetW = imageMeta.sizes[size]!.width;
    targetH = imageMeta.sizes[size]!.height;
  }

  const targetRatio = targetW / targetH;
  const sources: Map<number, string> = new Map();

  // WordPress aspect ratio tolerance: ~0.03
  const RATIO_TOLERANCE = 0.035;

  // Add all sizes that closely match the aspect ratio
  for (const [sizeName, sizeObj] of Object.entries(imageMeta.sizes)) {
    if (!sizeObj || !sizeObj.width || !sizeObj.height || !sizeObj.url) continue;

    const sourceRatio = sizeObj.width / sizeObj.height;
    const isCropped = registeredSizes.get(sizeName)?.crop ?? false;

    // If target is uncropped, skip cropped thumbnails with disparate ratios
    if (Math.abs(sourceRatio - targetRatio) <= RATIO_TOLERANCE || (targetW === sizeObj.width && targetH === sizeObj.height)) {
      sources.set(sizeObj.width, sizeObj.url);
    }
  }

  // Ensure original full image is included if matching ratio
  const origRatio = imageMeta.width / imageMeta.height;
  if (Math.abs(origRatio - targetRatio) <= RATIO_TOLERANCE) {
    sources.set(imageMeta.width, imageMeta.url);
  }

  // If we only have 1 or 0 candidate, srcset is unnecessary
  if (sources.size <= 1) {
    return false;
  }

  // Sort ascending by width
  const sortedWidths = Array.from(sources.keys()).sort((a, b) => a - b);

  return sortedWidths
    .map((w) => `${sources.get(w)!} ${w}w`)
    .join(", ");
}

/**
 * Calculates responsive sizes attribute (WordPress `wp_calculate_image_sizes`)
 *
 * @param size Target size name or numeric dimensions
 * @param imageSrc Image URL
 * @param imageMeta Optional attachment metadata
 * @returns Sizes attribute string (e.g. "(max-width: 1024px) 100vw, 1024px")
 */
export function wp_calculate_image_sizes(
  size: string | [number, number],
  imageSrc: string,
  imageMeta?: AttachmentMetadata
): string {
  let targetWidth = 1024;

  if (Array.isArray(size) && size[0] > 0) {
    targetWidth = size[0];
  } else if (typeof size === "string") {
    if (imageMeta?.sizes?.[size]?.width) {
      targetWidth = imageMeta.sizes[size]!.width;
    } else if (registeredSizes.has(size)) {
      targetWidth = registeredSizes.get(size)!.width || 1024;
    } else if (size === "thumbnail") {
      targetWidth = 150;
    } else if (size === "medium") {
      targetWidth = 300;
    } else if (size === "medium_large") {
      targetWidth = 768;
    } else if (size === "large") {
      targetWidth = 1024;
    } else if (imageMeta?.width) {
      targetWidth = imageMeta.width;
    }
  } else if (imageMeta?.width) {
    targetWidth = imageMeta.width;
  }

  // WordPress default standard sizes logic:
  // (max-width: ${width}px) 100vw, ${width}px
  return `(max-width: ${targetWidth}px) 100vw, ${targetWidth}px`;
}

/**
 * Injects responsive `srcset` and `sizes` attributes into `<img>` tags in HTML markup
 * Reverse-engineers WordPress `wp_image_add_srcset_and_sizes` & `wp_filter_content_tags`
 */
export function wp_image_add_srcset_and_sizes(
  html: string,
  imageMetaMap: AttachmentMetadata | Record<string, AttachmentMetadata>,
  targetSize: string | [number, number] = "full"
): string {
  if (!html || typeof html !== "string") return "";

  // Normalize imageMetaMap to lookup table
  const metaLookup = new Map<string, AttachmentMetadata>();
  if ("sizes" in imageMetaMap && "width" in imageMetaMap) {
    // Single AttachmentMetadata
    const singleMeta = imageMetaMap as AttachmentMetadata;
    metaLookup.set(singleMeta.url, singleMeta);
    metaLookup.set(singleMeta.file, singleMeta);
  } else {
    // Map of url -> AttachmentMetadata
    const multiMap = imageMetaMap as Record<string, AttachmentMetadata>;
    for (const [key, meta] of Object.entries(multiMap)) {
      if (meta && typeof meta === "object") {
        metaLookup.set(key, meta);
        if (meta.url) metaLookup.set(meta.url, meta);
        if (meta.file) metaLookup.set(meta.file, meta);
      }
    }
  }

  // Match <img> tags
  return html.replace(/<img\b([^>]*?)(\/?)>/gi, (match, attrs, selfClose) => {
    // Extract src
    const srcMatch = attrs.match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    if (!srcMatch) return match;

    const src = srcMatch[1] ?? srcMatch[2] ?? srcMatch[3];
    if (!src) return match;

    // Find matching metadata
    let meta = metaLookup.get(src);
    if (!meta) {
      // Try matching by base filename
      const cleanSrc = src.split("?")[0].split("#")[0];
      const filename = cleanSrc.substring(cleanSrc.lastIndexOf("/") + 1);
      meta = metaLookup.get(filename);
    }

    if (!meta) return match; // No metadata available to calculate srcset

    let newAttrs = attrs;

    // Check if srcset is already present
    if (!/\bsrcset\s*=/i.test(newAttrs)) {
      const srcset = wp_calculate_image_srcset(targetSize, src, meta);
      if (srcset) {
        newAttrs += ` srcset="${srcset}"`;
      }
    }

    // Check if sizes is already present
    if (!/\bsizes\s*=/i.test(newAttrs)) {
      const sizesAttr = wp_calculate_image_sizes(targetSize, src, meta);
      if (sizesAttr) {
        newAttrs += ` sizes="${sizesAttr}"`;
      }
    }

    // Add width and height if missing
    if (!/\bwidth\s*=/i.test(newAttrs) && meta.width) {
      newAttrs += ` width="${meta.width}"`;
    }
    if (!/\bheight\s*=/i.test(newAttrs) && meta.height) {
      newAttrs += ` height="${meta.height}"`;
    }

    // Modern WordPress lazy-loading and async decoding
    if (!/\bloading\s*=/i.test(newAttrs)) {
      newAttrs += ` loading="lazy"`;
    }
    if (!/\bdecoding\s*=/i.test(newAttrs)) {
      newAttrs += ` decoding="async"`;
    }

    return `<img${newAttrs}${selfClose ? " /" : ""}>`;
  });
}

/**
 * Helper to generate responsive image props for React <img> or Next.js components
 */
export function generateResponsiveImageProps(
  url: string,
  width: number = 1920,
  height: number = 1080,
  alt: string = "",
  size: string | [number, number] = "large"
): ResponsiveImageProps {
  const meta = wp_generate_attachment_metadata(url, width, height, { title: alt });
  const srcset = wp_calculate_image_srcset(size, url, meta);
  const sizes = wp_calculate_image_sizes(size, url, meta);

  let renderW = meta.width;
  let renderH = meta.height;

  if (typeof size === "string" && meta.sizes[size]) {
    renderW = meta.sizes[size]!.width;
    renderH = meta.sizes[size]!.height;
  } else if (Array.isArray(size) && size[0] > 0) {
    renderW = size[0];
    renderH = size[1] || Math.round(meta.height * (size[0] / meta.width));
  }

  return {
    src: typeof size === "string" && meta.sizes[size] ? meta.sizes[size]!.url : url,
    srcSet: srcset ? srcset : undefined,
    sizes: srcset ? sizes : undefined,
    width: renderW,
    height: renderH,
    alt,
    loading: "lazy",
    decoding: "async",
  };
}
