export interface GeneralStoreSettings {
  shopName: string;
  shopSlogan: string;
  phone: string;
  email: string;
  address: string;
  taxId: string;
  branchCode: string;
  branchName: string;

  // Localization & Financial
  currency: string;
  currencySymbol: string;
  timezone: string;

  // Receipt & Printing
  paperWidth: "80mm" | "58mm";
  receiptHeader: string;
  receiptFooter: string;
  showPromptPayQR: boolean;
  promptPayId: string;

  // Tax & VAT
  vatEnabled: boolean;
  vatRate: number;
  vatPriceMode: "INCLUDED" | "EXCLUDED";

  // LINE OA
  lineChannelId?: string;
  lineChannelSecret?: string;
  lineChannelAccessToken?: string;
  lineNotifyRepairs?: boolean;
  lineNotifyLowStock?: boolean;

  updatedAt?: string;
}

export const DEFAULT_STORE_SETTINGS: GeneralStoreSettings = {
  shopName: "FixMe Mobile & Service Hub",
  shopSlogan: "ศูนย์บริการซ่อมมือถือด่วนและจำหน่ายอุปกรณ์แท้ครบวงจร",
  phone: "02-123-4567",
  email: "contact@mobileshop.co.th",
  address: "เลขที่ 888 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110",
  taxId: "0105558123451",
  branchCode: "00000",
  branchName: "สำนักงานใหญ่ (HQ)",

  currency: "THB",
  currencySymbol: "฿",
  timezone: "Asia/Bangkok",

  paperWidth: "80mm",
  receiptHeader: "FIXME MOBILE SERVICE & ACCESSORIES",
  receiptFooter: "ขอบคุณที่ใช้บริการ งานซ่อมรับประกัน 90 วัน กรุณาเก็บใบเสร็จเพื่อการรับประกัน",
  showPromptPayQR: true,
  promptPayId: "0105558123451",

  vatEnabled: true,
  vatRate: 7,
  vatPriceMode: "INCLUDED",

  lineChannelId: "",
  lineChannelSecret: "",
  lineChannelAccessToken: "",
  lineNotifyRepairs: true,
  lineNotifyLowStock: true,
};
