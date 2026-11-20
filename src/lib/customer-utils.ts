export type CustomerTag = "VIP" | "REGULAR" | "WHOLESALE" | "BLACKLIST" | "NEW";

export interface CustomerMetadata {
  address: string;
  email: string;
  tag: CustomerTag;
  notes: string;
}

/**
 * Normalizes a Thai/international phone number to pure digits with leading 0.
 * Examples:
 *   "081-234-5678" -> "0812345678"
 *   "+66 81 234 5678" -> "0812345678"
 *   "+66812345678" -> "0812345678"
 *   "(081) 234-5678" -> "0812345678"
 *   "02-721-8899" -> "027218899"
 */
export function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return "";
  let cleaned = String(raw).trim().replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+66")) {
    cleaned = "0" + cleaned.slice(3);
  } else if (cleaned.startsWith("66") && cleaned.length >= 11) {
    cleaned = "0" + cleaned.slice(2);
  }
  return cleaned.replace(/\D/g, "");
}

/**
 * Formats a phone number for UI display (e.g. 081-234-5678 or 02-721-8899).
 */
export function formatPhoneDisplay(phone: string | null | undefined): string {
  const norm = normalizePhone(phone);
  if (norm.length === 10) {
    return `${norm.slice(0, 3)}-${norm.slice(3, 6)}-${norm.slice(6)}`;
  }
  if (norm.length === 9) {
    return `${norm.slice(0, 2)}-${norm.slice(2, 5)}-${norm.slice(5)}`;
  }
  return norm || phone || "-";
}

/**
 * Packs address, email, customer tag, and internal notes into structured address JSON.
 */
export function packCustomerAddress(metadata: {
  address?: string | null;
  email?: string | null;
  tag?: string | null;
  notes?: string | null;
}): string {
  const cleanAddress = (metadata.address || "").trim();
  const cleanEmail = (metadata.email || "").trim().toLowerCase();
  const cleanTag = (metadata.tag || "REGULAR").trim().toUpperCase() as CustomerTag;
  const cleanNotes = (metadata.notes || "").trim();

  // If only plain address without email, notes, or non-regular tag, can store clean string or JSON
  return JSON.stringify({
    address: cleanAddress,
    email: cleanEmail,
    tag: ["VIP", "REGULAR", "WHOLESALE", "BLACKLIST"].includes(cleanTag) ? cleanTag : "REGULAR",
    notes: cleanNotes,
  });
}

/**
 * Safely unpacks address, email, customer tag, and internal notes from address field.
 */
export function unpackCustomerAddress(raw: string | null | undefined): CustomerMetadata {
  const fallback: CustomerMetadata = {
    address: "",
    email: "",
    tag: "REGULAR",
    notes: "",
  };

  if (!raw || !raw.trim()) return fallback;
  const trimmed = raw.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      return {
        address: typeof parsed.address === "string" ? parsed.address : "",
        email: typeof parsed.email === "string" ? parsed.email : "",
        tag: ["VIP", "REGULAR", "WHOLESALE", "BLACKLIST"].includes(parsed.tag)
          ? parsed.tag
          : "REGULAR",
        notes: typeof parsed.notes === "string" ? parsed.notes : "",
      };
    } catch {
      // JSON parse failed, treat whole string as address
    }
  }

  return {
    ...fallback,
    address: trimmed,
  };
}

/**
 * Computes lifetime spend with Satang precision.
 */
export function calculateCustomerLTV(
  sales: Array<{ netAmount?: number | null; status?: string | null }> = [],
  repairs: Array<{ totalCost?: number | null; status?: string | null }> = []
) {
  const totalSalesSpend = sales
    .filter((s) => s.status === "COMPLETED")
    .reduce((sum, s) => sum + (s.netAmount ?? 0), 0);

  const totalRepairSpend = repairs
    .filter((r) => r.status === "COMPLETED")
    .reduce((sum, r) => sum + (r.totalCost ?? 0), 0);

  const totalSpend = Math.round((totalSalesSpend + totalRepairSpend) * 100) / 100;
  const totalOrders =
    sales.filter((s) => s.status === "COMPLETED").length +
    repairs.filter((r) => r.status === "COMPLETED").length;

  return {
    totalSalesSpend: Math.round(totalSalesSpend * 100) / 100,
    totalRepairSpend: Math.round(totalRepairSpend * 100) / 100,
    totalSpend,
    totalOrders,
  };
}

/**
 * Resolves customer loyalty tier / tag.
 */
export function determineCustomerTier(
  totalSpend: number,
  totalOrders: number,
  explicitTag?: string | null
): CustomerTag {
  const tag = (explicitTag || "").trim().toUpperCase();
  if (tag === "BLACKLIST") return "BLACKLIST";
  if (tag === "WHOLESALE") return "WHOLESALE";
  if (tag === "VIP") return "VIP";

  if (totalSpend >= 20000 || totalOrders >= 5) return "VIP";
  if (totalOrders >= 2 || tag === "REGULAR") return "REGULAR";
  return "NEW";
}
