// Thai PromptPay EMVCo Payload Generator & Validator

export function generatePromptPayPayload(target: string, amount?: number): string {
  // target can be phone (e.g. 0812345678, 081-234-5678) or tax/national ID (13 digits)
  const cleanTarget = (target || "").replace(/[^0-9]/g, "");
  let targetType = "01"; // 01 for mobile, 02 for tax ID/national ID
  let formattedTarget = cleanTarget;

  if (cleanTarget.length === 10 && cleanTarget.startsWith("0")) {
    formattedTarget = "0066" + cleanTarget.substring(1);
    targetType = "01";
  } else if (cleanTarget.length === 13) {
    targetType = "02";
  } else {
    // Default fallback to 13-digit standard store tax ID if not standard format
    formattedTarget = cleanTarget.padEnd(13, "0").slice(0, 13);
    targetType = "02";
  }

  const f = (id: string, val: string) => `${id}${String(val.length).padStart(2, "0")}${val}`;

  const merchantInfo = f("00", "A000000677010111") + f(targetType, formattedTarget);

  const hasAmount = typeof amount === "number" && !isNaN(amount) && amount > 0;

  let payload =
    f("00", "01") + // Payload Format Indicator
    f("01", hasAmount ? "12" : "11") + // Point of Initiation: 12 = dynamic, 11 = static
    f("29", merchantInfo) + // Merchant Account Info
    f("58", "TH") + // Country Code
    f("53", "764"); // Currency: THB (764)

  if (hasAmount) {
    payload += f("54", amount.toFixed(2)); // Transaction Amount
  }

  // Calculate CRC-16/CCITT-FALSE
  const crcInput = payload + "6304";
  let crc = 0xffff;
  for (let i = 0; i < crcInput.length; i++) {
    crc ^= crcInput.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  const crcHex = crc.toString(16).toUpperCase().padStart(4, "0");
  return crcInput + crcHex;
}
