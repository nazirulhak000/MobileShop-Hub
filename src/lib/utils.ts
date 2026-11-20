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

/**
 * Validates 13-digit Thai Tax ID (เลขประจำตัวผู้เสียภาษีอากร 13 หลัก) using standard Modulo 11 checksum algorithm
 */
export function validateThaiTaxId(id: string): { valid: boolean; message?: string } {
  if (!id || typeof id !== "string") {
    return { valid: false, message: "กรุณากรอกเลขประจำตัวผู้เสียภาษีอากร" };
  }
  const cleaned = id.replace(/[^0-9]/g, "");
  if (cleaned.length !== 13) {
    return { valid: false, message: "เลขประจำตัวผู้เสียภาษีอากรต้องมี 13 หลัก" };
  }
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned.charAt(i), 10) * (13 - i);
  }
  const checkDigit = (11 - (sum % 11)) % 10;
  if (checkDigit !== parseInt(cleaned.charAt(12), 10)) {
    return { valid: false, message: "เลขประจำตัวผู้เสียภาษีอากรไม่ถูกต้องตามหลักตรวจสอบ (Checksum Failed)" };
  }
  return { valid: true };
}

/**
 * Validates 5-digit Thai Branch ID (รหัสสาขา 5 หลัก e.g. 00000 = สำนักงานใหญ่)
 */
export function validateThaiBranchId(branchId: string): { valid: boolean; message?: string } {
  if (!branchId || typeof branchId !== "string") {
    return { valid: false, message: "กรุณาระบุรหัสสาขา 5 หลัก (เช่น 00000 สำหรับสำนักงานใหญ่)" };
  }
  const cleaned = branchId.trim();
  if (!/^\d{5}$/.test(cleaned)) {
    return { valid: false, message: "รหัสสาขาต้องเป็นตัวเลข 5 หลัก (เช่น 00000 หรือ 00001)" };
  }
  return { valid: true };
}

/**
 * Thai Baht Text Generator (แปลงจำนวนเงินเป็นตัวอักษรภาษาไทยตามหลักไวยากรณ์สรรพากร)
 */
export function bahtText(amount: number): string {
  if (isNaN(amount) || amount === 0) return "ศูนย์บาทถ้วน";
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const roundedSatang = Math.round(absAmount * 100);
  const baht = Math.floor(roundedSatang / 100);
  const satang = roundedSatang % 100;

  const thaiNums = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
  const units = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];

  function convertChunk(num: number): string {
    const s = num.toString();
    const len = s.length;
    let res = "";
    for (let i = 0; i < len; i++) {
      const d = parseInt(s.charAt(i), 10);
      const pos = len - i - 1;
      if (d === 0) continue;
      if (pos === 0 && d === 1 && len > 1) {
        res += "เอ็ด";
      } else if (pos === 1 && d === 2) {
        res += "ยี่สิบ";
      } else if (pos === 1 && d === 1) {
        res += "สิบ";
      } else {
        res += thaiNums[d] + units[pos];
      }
    }
    return res;
  }

  function convertNumber(num: number): string {
    if (num === 0) return "";
    let res = "";
    let n = num;
    let millionCount = 0;
    while (n > 0) {
      const chunk = n % 1000000;
      if (chunk > 0) {
        let chunkText = convertChunk(chunk);
        for (let m = 0; m < millionCount; m++) {
          chunkText += "ล้าน";
        }
        res = chunkText + res;
      }
      n = Math.floor(n / 1000000);
      millionCount++;
    }
    return res;
  }

  let text = (isNegative ? "ลบ" : "");
  if (baht > 0) {
    text += convertNumber(baht) + "บาท";
  }
  if (satang === 0) {
    text += "ถ้วน";
  } else {
    text += convertChunk(satang) + "สตางค์";
  }
  return text;
}
