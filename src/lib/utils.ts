import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTHB(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDateThai(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  return new Intl.DateTimeFormat("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Validates 13-digit Thai National ID using standard Modulo 11 checksum algorithm
 */
export function validateThaiNationalId(id: string): { valid: boolean; message?: string } {
  if (!id || typeof id !== "string") {
    return { valid: false, message: "กรุณากรอกเลขบัตรประจำตัวประชาชน" };
  }
  const cleaned = id.replace(/[^0-9]/g, "");
  if (cleaned.length !== 13) {
    return { valid: false, message: "เลขบัตรประชาชนต้องมี 13 หลัก" };
  }
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned.charAt(i), 10) * (13 - i);
  }
  const checkDigit = (11 - (sum % 11)) % 10;
  if (checkDigit !== parseInt(cleaned.charAt(12), 10)) {
    return { valid: false, message: "เลขบัตรประชาชนไม่ถูกต้องตามหลักตรวจสอบ (Checksum Failed)" };
  }
  return { valid: true };
}
