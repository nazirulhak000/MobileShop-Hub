import { db as prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export type ResolvedTenant = NonNullable<
  Awaited<ReturnType<typeof resolveTenantBySlug>>
>;

/**
 * Resolves a tenant by slug (case-insensitively, trimmed).
 * Handles:
 * - Safe URL decoding with try/catch against URIError
 * - Unicode NFKC normalization and zero-width/control character stripping (preventing spoofing)
 * - Leading and trailing whitespace trimming
 * - Path traversal characters rejection (/ \ .. null-byte)
 * - Case insensitivity (e.g. MobileShop, MOBILESHOP, mobileshop)
 * - Parameterized query fallback via LOWER(TRIM(slug)) for SQLite collation compatibility
 */
export async function resolveTenantBySlug(rawSlug: string | null | undefined) {
  if (!rawSlug || typeof rawSlug !== "string") return null;

  let decoded: string;
  try {
    decoded = decodeURIComponent(rawSlug).trim();
  } catch {
    // Malformed URI encoding (e.g. %E0%A4%A)
    return null;
  }

  if (!decoded) return null;

  // Path traversal and null byte prevention
  if (
    decoded.includes("/") ||
    decoded.includes("\\") ||
    decoded.includes("..") ||
    decoded.includes("\0")
  ) {
    return null;
  }

  // Unicode NFKC normalization and zero-width / control character stripping
  const sanitized = decoded
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF\u0000-\u001F\u007F-\u009F]/g, "")
    .trim()
    .slice(0, 100);

  if (!sanitized) return null;

  const normalized = sanitized.toLowerCase();

  // Fast-path: Query matching normalized lowercase or sanitized input
  const tenant = await prisma.tenant.findFirst({
    where: {
      OR: [{ slug: normalized }, { slug: sanitized }],
      status: { in: ["ACTIVE", "TRIAL"] },
    },
    include: {
      storefrontConfig: true,
      branches: {
        take: 1,
      },
    },
  });

  if (tenant) {
    if (tenant.storefrontConfig?.footerSocialLinks) {
      try {
        const meta = JSON.parse(tenant.storefrontConfig.footerSocialLinks);
        if (meta.seoTitle) (tenant.storefrontConfig as any).seoTitle = meta.seoTitle;
        if (meta.seoDescription) (tenant.storefrontConfig as any).seoDescription = meta.seoDescription;
        if (meta.seoKeywords) (tenant.storefrontConfig as any).seoKeywords = meta.seoKeywords;
        if (meta.bannerUrl) (tenant.storefrontConfig as any).bannerUrl = meta.bannerUrl;
      } catch {}
    }
    return tenant;
  }

  // Fallback case-insensitive check with LOWER(TRIM(slug)) for SQLite collation compatibility
  try {
    const rawMatches = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM Tenant WHERE LOWER(TRIM(slug)) = ${normalized} AND status IN ('ACTIVE', 'TRIAL') LIMIT 1
    `;

    if (rawMatches && rawMatches.length > 0 && rawMatches[0]?.id) {
      const match = await prisma.tenant.findUnique({
        where: { id: rawMatches[0].id },
        include: {
          storefrontConfig: true,
          branches: {
            take: 1,
          },
        },
      });
      if (match?.storefrontConfig?.footerSocialLinks) {
        try {
          const meta = JSON.parse(match.storefrontConfig.footerSocialLinks);
          if (meta.seoTitle) (match.storefrontConfig as any).seoTitle = meta.seoTitle;
          if (meta.seoDescription) (match.storefrontConfig as any).seoDescription = meta.seoDescription;
          if (meta.seoKeywords) (match.storefrontConfig as any).seoKeywords = meta.seoKeywords;
          if (meta.bannerUrl) (match.storefrontConfig as any).bannerUrl = meta.bannerUrl;
        } catch {}
      }
      return match;
    }
  } catch (err) {
    console.error("Error in fallback resolveTenantBySlug query:", err);
  }

  return null;
}
