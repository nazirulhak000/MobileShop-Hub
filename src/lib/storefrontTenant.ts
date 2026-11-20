import { db as prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export type ResolvedTenant = NonNullable<
  Awaited<ReturnType<typeof resolveTenantBySlug>>
>;

/**
 * Resolves a tenant by slug (case-insensitively, trimmed).
 * Handles:
 * - URL decoding (e.g. %20mobileshop%20)
 * - Leading and trailing whitespace trimming
 * - Case insensitivity (e.g. MobileShop, MOBILESHOP, mobileshop)
 * - Defensive fallback query via LOWER(TRIM(slug)) for SQLite collation compatibility
 */
export async function resolveTenantBySlug(rawSlug: string | null | undefined) {
  if (!rawSlug) return null;
  const decoded = decodeURIComponent(String(rawSlug)).trim();
  if (!decoded) return null;
  const normalized = decoded.toLowerCase();

  // Fast-path: Query matching normalized lowercase or decoded input
  const tenant = await prisma.tenant.findFirst({
    where: {
      OR: [{ slug: normalized }, { slug: decoded }],
      status: { in: ["ACTIVE", "TRIAL"] },
    },
    include: {
      storefrontConfig: true,
      branches: {
        take: 1,
      },
    },
  });

  if (tenant) return tenant;

  // Fallback case-insensitive check with LOWER(TRIM(slug)) for SQLite collation compatibility
  try {
    const rawMatches = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM Tenant WHERE LOWER(TRIM(slug)) = ? AND status IN ('ACTIVE', 'TRIAL') LIMIT 1`,
      normalized
    );

    if (rawMatches && rawMatches.length > 0 && rawMatches[0]?.id) {
      return await prisma.tenant.findUnique({
        where: { id: rawMatches[0].id },
        include: {
          storefrontConfig: true,
          branches: {
            take: 1,
          },
        },
      });
    }
  } catch (err) {
    console.error("Error in fallback resolveTenantBySlug query:", err);
  }

  return null;
}
