// Thai PromptPay EMVCo Payload Generator & Validator
// Follows Bank of Thailand (BOT) Standard EMVCo QR Code Specification

export type PromptPayTargetType = "MOBILE" | "TAX_ID" | "E_WALLET" | "INVALID";

export interface PromptPayTargetValidation {
  valid: boolean;
  type: PromptPayTargetType;
  formatted: string;
  message?: string;
}

export interface PromptPayPayloadVerification {
  valid: boolean;
  crcValid: boolean;
  target?: string;
  targetType?: string;
  amount?: number;
  currency?: string;
  countryCode?: string;
}

/**
 * Validate PromptPay Target Identifier:
 * - Mobile Phone (10 digits starting with 0, 11 digits starting with 66, or 9 digits)
 * - 13-Digit Tax ID / National ID
 * - 15-Digit E-Wallet ID
 */
export function validatePromptPayTarget(target: string): PromptPayTargetValidation {
  if (!target || typeof target !== "string") {
    return { valid: false, type: "INVALID", formatted: "", message: "กรุณาระบุหมายเลข PromptPay" };
  }

  const clean = target.replace(/[^0-9]/g, "");

  // 1. Mobile phone: 10 digits starting with 0 (e.g. 0812345678)
  if (clean.length === 10 && clean.startsWith("0")) {
    const formatted = "0066" + clean.substring(1);
    return { valid: true, type: "MOBILE", formatted };
  }

  // 1.1 Mobile phone with international prefix 66 (11 digits: e.g. 66812345678)
  if (clean.length === 11 && clean.startsWith("66")) {
    const formatted = "00" + clean;
    return { valid: true, type: "MOBILE", formatted };
  }

  // 1.2 Mobile phone without leading zero (9 digits: e.g. 812345678)
  if (clean.length === 9 && ["6", "8", "9"].includes(clean[0])) {
    const formatted = "0066" + clean;
    return { valid: true, type: "MOBILE", formatted };
  }

  // 2. 13-Digit Tax ID / National ID (e.g. 0105567012345)
  if (clean.length === 13) {
    return { valid: true, type: "TAX_ID", formatted: clean };
  }

  // 3. 15-Digit E-Wallet ID
  if (clean.length === 15) {
    return { valid: true, type: "E_WALLET", formatted: clean };
  }

  return {
    valid: false,
    type: "INVALID",
    formatted: clean,
    message: "หมายเลขพร้อมเพย์ต้องเป็นเบอร์มือถือ (10 หลัก), เลขประจำตัวผู้เสียภาษี/บัตรประชาชน (13 หลัก), หรือ e-Wallet ID (15 หลัก)",
  };
}

/**
 * Convert Thai Baht to integer Satang (1 THB = 100 Satang) with round-half-up
 */
export function toSatang(baht: number): number {
  if (isNaN(baht) || !isFinite(baht)) return 0;
  return Math.round(baht * 100);
}

/**
 * Convert integer Satang back to Thai Baht
 */
export function fromSatang(satang: number): number {
  if (isNaN(satang) || !isFinite(satang)) return 0;
  return Math.round(satang) / 100;
}

/**
 * Format Thai Baht amount to standard 2-decimal satang representation (e.g. 150 -> "150.00")
 */
export function formatPromptPayAmount(amount: number): string {
  const satang = toSatang(amount);
  return (satang / 100).toFixed(2);
}

/**
 * Calculate CRC-16/CCITT-FALSE checksum for EMVCo QR code
 */
export function calculateCrc16(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Thai PromptPay EMVCo Payload Generator:
 * Generates official Thai QR PromptPay string compliant with Bank of Thailand & EMVCo specifications.
 * Supports exact satang precision formatting for fast cashier payments.
 */
export function generatePromptPayPayload(target: string, amount?: number | string): string {
  const validation = validatePromptPayTarget(target);

  let targetType = "02";
  let formattedTarget = validation.formatted;

  if (validation.valid) {
    if (validation.type === "MOBILE") {
      targetType = "01";
    } else if (validation.type === "TAX_ID") {
      targetType = "02";
    } else if (validation.type === "E_WALLET") {
      targetType = "03";
    }
  } else {
    // Graceful fallback for non-standard target
    const clean = (target || "").replace(/[^0-9]/g, "");
    if (clean.length === 10 && clean.startsWith("0")) {
      formattedTarget = "0066" + clean.substring(1);
      targetType = "01";
    } else {
      formattedTarget = clean.padEnd(13, "0").slice(0, 13);
      targetType = "02";
    }
  }

  // TLV (Tag-Length-Value) Helper
  const f = (id: string, val: string) => `${id}${String(val.length).padStart(2, "0")}${val}`;

  const merchantInfo = f("00", "A000000677010111") + f(targetType, formattedTarget);

  const numAmount = typeof amount === "string" ? parseFloat(amount.replace(/,/g, "")) : amount;
  const hasAmount = typeof numAmount === "number" && !isNaN(numAmount) && numAmount > 0;

  let payload =
    f("00", "01") + // Payload Format Indicator (01)
    f("01", hasAmount ? "12" : "11") + // Point of Initiation Method: 12 = Dynamic (amount specified), 11 = Static
    f("29", merchantInfo) + // Merchant Account Information (Thai PromptPay AID)
    f("58", "TH") + // Country Code (TH)
    f("53", "764"); // Transaction Currency: 764 (THB)

  if (hasAmount) {
    // Standard satang formatting with exactly 2 decimal places
    payload += f("54", formatPromptPayAmount(numAmount)); // Transaction Amount (Tag 54)
  }

  // Calculate CRC-16 checksum on payload + "6304"
  const crcInput = payload + "6304";
  const crcHex = calculateCrc16(crcInput);

  return crcInput + crcHex;
}

/**
 * Verify and parse an EMVCo PromptPay payload string
 */
export function verifyPromptPayPayload(payload: string): PromptPayPayloadVerification {
  if (!payload || typeof payload !== "string" || payload.length < 20) {
    return { valid: false, crcValid: false };
  }

  // Check CRC tag 63 at the end
  const crcIndex = payload.lastIndexOf("6304");
  if (crcIndex === -1 || crcIndex + 8 !== payload.length) {
    return { valid: false, crcValid: false };
  }

  const expectedCrc = payload.substring(crcIndex + 4);
  const dataToCrc = payload.substring(0, crcIndex + 4);
  const actualCrc = calculateCrc16(dataToCrc);
  const crcValid = expectedCrc.toUpperCase() === actualCrc.toUpperCase();

  if (!crcValid) {
    return { valid: false, crcValid: false };
  }

  let amount: number | undefined;
  let target: string | undefined;
  let targetType: string | undefined;
  let currency: string | undefined;
  let countryCode: string | undefined;

  // Simple TLV Parser
  let i = 0;
  while (i < crcIndex) {
    const tag = payload.substring(i, i + 2);
    const len = parseInt(payload.substring(i + 2, i + 4), 10);
    if (isNaN(len) || i + 4 + len > payload.length) break;

    const val = payload.substring(i + 4, i + 4 + len);
    i += 4 + len;

    if (tag === "54") {
      amount = parseFloat(val);
    } else if (tag === "53") {
      currency = val;
    } else if (tag === "58") {
      countryCode = val;
    } else if (tag === "29") {
      // Sub-TLVs inside Tag 29
      let subI = 0;
      while (subI < val.length) {
        const subTag = val.substring(subI, subI + 2);
        const subLen = parseInt(val.substring(subI + 2, subI + 4), 10);
        if (isNaN(subLen) || subI + 4 + subLen > val.length) break;
        const subVal = val.substring(subI + 4, subI + 4 + subLen);
        subI += 4 + subLen;

        if (subTag === "01") {
          targetType = "MOBILE";
          // Convert from 0066XXXXXXXXX to 0XXXXXXXXX
          target = subVal.startsWith("0066") ? "0" + subVal.substring(4) : subVal;
        } else if (subTag === "02") {
          targetType = "TAX_ID";
          target = subVal;
        } else if (subTag === "03") {
          targetType = "E_WALLET";
          target = subVal;
        }
      }
    }
  }

  return {
    valid: crcValid,
    crcValid,
    target,
    targetType,
    amount,
    currency,
    countryCode,
  };
}
