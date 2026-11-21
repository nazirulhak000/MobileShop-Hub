import { AccessError } from "@/lib/staff-context";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateTaxId(taxId?: string | null): string | null {
  if (!taxId) return null;
  const cleaned = taxId.replace(/[\s-]/g, "");
  if (!cleaned) return null;
  if (!/^\d{13}$/.test(cleaned)) {
    throw new AccessError(400, "เลขประจำตัวผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก");
  }
  return cleaned;
}

export function validateEmail(email?: string | null): string | null {
  if (!email) return null;
  const trimmed = email.trim();
  if (!trimmed) return null;
  if (!EMAIL_REGEX.test(trimmed)) {
    throw new AccessError(400, "รูปแบบอีเมลไม่ถูกต้อง");
  }
  return trimmed;
}

export function normalizePhone(phone?: string | null): string {
  if (!phone) return "";
  return phone.trim();
}
