import prisma from "@/lib/prisma";
import { db } from "@/lib/db";
import { AccessError } from "@/lib/staff-context";
import { validateThaiTaxId, validateThaiBranchId } from "@/lib/utils";
import { validatePromptPayTarget } from "@/lib/promptpay";
import { GeneralStoreSettings, DEFAULT_STORE_SETTINGS } from "@/types/settings";

export type { GeneralStoreSettings };
export { DEFAULT_STORE_SETTINGS };

/**
 * Retrieve General Store Settings for a Tenant with strict multi-tenant scoping
 */
export async function getStoreSettings(tenantId: string): Promise<GeneralStoreSettings> {
  if (!tenantId) throw new AccessError(400, "ไม่พบรหัสร้านค้า (tenantId)");

  const [tenant, branch, latestAudit] = await Promise.all([
    db.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, taxId: true, slug: true },
    }),
    db.branch.findFirst({
      where: { tenantId },
      orderBy: [{ code: "asc" }, { createdAt: "asc" }],
      select: { id: true, code: true, name: true, address: true, phone: true, taxId: true },
    }),
    db.auditLog.findFirst({
      where: {
        tenantId,
        module: "SETTINGS",
        action: "UPDATE",
      },
      orderBy: { createdAt: "desc" },
      select: { afterJson: true, createdAt: true },
    }),
  ]);

  if (!tenant) throw new AccessError(404, "ไม่พบข้อมูลร้านค้าในระบบ");

  let customSettings: Partial<GeneralStoreSettings> = {};
  if (latestAudit?.afterJson) {
    try {
      customSettings = JSON.parse(latestAudit.afterJson);
    } catch {
      // Fallback if parsing fails
    }
  }

  return {
    ...DEFAULT_STORE_SETTINGS,
    ...customSettings,
    shopName: tenant.name || customSettings.shopName || DEFAULT_STORE_SETTINGS.shopName,
    taxId: tenant.taxId || branch?.taxId || customSettings.taxId || DEFAULT_STORE_SETTINGS.taxId,
    branchCode: branch?.code || customSettings.branchCode || "00000",
    branchName: branch?.name || customSettings.branchName || "สำนักงานใหญ่ (HQ)",
    phone: branch?.phone || customSettings.phone || DEFAULT_STORE_SETTINGS.phone,
    address: branch?.address || customSettings.address || DEFAULT_STORE_SETTINGS.address,
    updatedAt: latestAudit?.createdAt ? latestAudit.createdAt.toISOString() : undefined,
  };
}

/**
 * Update General Store Settings with strict multi-tenant isolation, data sanitization, and audit logging
 */
export async function updateStoreSettings(
  tenantId: string,
  actorId: string,
  input: Partial<GeneralStoreSettings>
): Promise<GeneralStoreSettings> {
  if (!tenantId) throw new AccessError(400, "ไม่พบรหัสร้านค้า (tenantId)");

  // 1. Sanitize & Validate Shop Name
  const shopName = typeof input.shopName === "string" ? input.shopName.trim() : "";
  if (!shopName || shopName.length > 200) {
    throw new AccessError(400, "กรุณาระบุชื่อร้านค้าหรือชื่อนิติบุคคล (1 - 200 ตัวอักษร)");
  }

  // 2. Validate Tax ID (13 digits)
  const rawTaxId = typeof input.taxId === "string" ? input.taxId.replace(/[^0-9]/g, "") : "";
  if (rawTaxId) {
    const taxValidation = validateThaiTaxId(rawTaxId);
    if (!taxValidation.valid) {
      throw new AccessError(400, taxValidation.message || "เลขประจำตัวผู้เสียภาษีอากร 13 หลักไม่ถูกต้อง");
    }
  }

  // 3. Validate Branch Code (5 digits, e.g. 00000)
  const branchCode = typeof input.branchCode === "string" && input.branchCode.trim() ? input.branchCode.trim() : "00000";
  const branchValidation = validateThaiBranchId(branchCode);
  if (!branchValidation.valid) {
    throw new AccessError(400, branchValidation.message || "รหัสสาขาต้องเป็นตัวเลข 5 หลัก เช่น 00000 สำหรับสำนักงานใหญ่");
  }

  // 4. Validate PromptPay Recipient ID
  const showPromptPayQR = input.showPromptPayQR !== false;
  const promptPayId = typeof input.promptPayId === "string" ? input.promptPayId.trim() : "";
  if (showPromptPayQR && promptPayId) {
    const ppCheck = validatePromptPayTarget(promptPayId);
    if (!ppCheck.valid) {
      throw new AccessError(400, ppCheck.message || "หมายเลข PromptPay ไม่ถูกต้อง (ต้องเป็นเบอร์มือถือ หรือ Tax ID 13 หลัก)");
    }
  }

  // 5. Sanitize text fields
  const shopSlogan = typeof input.shopSlogan === "string" ? input.shopSlogan.trim().slice(0, 300) : "";
  const phone = typeof input.phone === "string" ? input.phone.trim().slice(0, 50) : "";
  const email = typeof input.email === "string" ? input.email.trim().slice(0, 100) : "";
  const address = typeof input.address === "string" ? input.address.trim().slice(0, 500) : "";
  const branchName = typeof input.branchName === "string" && input.branchName.trim() ? input.branchName.trim().slice(0, 100) : "สำนักงานใหญ่ (HQ)";

  const currency = typeof input.currency === "string" && input.currency.trim() ? input.currency.trim().toUpperCase().slice(0, 10) : "THB";
  const currencySymbol = typeof input.currencySymbol === "string" && input.currencySymbol.trim() ? input.currencySymbol.trim().slice(0, 5) : "฿";
  const timezone = typeof input.timezone === "string" && input.timezone.trim() ? input.timezone.trim().slice(0, 50) : "Asia/Bangkok";

  const paperWidth: "80mm" | "58mm" = input.paperWidth === "58mm" ? "58mm" : "80mm";
  const receiptHeader = typeof input.receiptHeader === "string" ? input.receiptHeader.trim().slice(0, 200) : shopName;
  const receiptFooter = typeof input.receiptFooter === "string" ? input.receiptFooter.trim().slice(0, 500) : DEFAULT_STORE_SETTINGS.receiptFooter;

  const vatEnabled = Boolean(input.vatEnabled);
  const vatRate = typeof input.vatRate === "number" && !isNaN(input.vatRate) ? Math.max(0, Math.min(100, input.vatRate)) : 7;
  const vatPriceMode: "INCLUDED" | "EXCLUDED" = input.vatPriceMode === "EXCLUDED" ? "EXCLUDED" : "INCLUDED";

  const lineChannelId = typeof input.lineChannelId === "string" ? input.lineChannelId.trim().slice(0, 100) : "";
  const lineChannelSecret = typeof input.lineChannelSecret === "string" ? input.lineChannelSecret.trim().slice(0, 200) : "";
  const lineChannelAccessToken = typeof input.lineChannelAccessToken === "string" ? input.lineChannelAccessToken.trim().slice(0, 500) : "";
  const lineNotifyRepairs = input.lineNotifyRepairs !== false;
  const lineNotifyLowStock = input.lineNotifyLowStock !== false;

  const cleanedSettings: GeneralStoreSettings = {
    shopName,
    shopSlogan,
    phone,
    email,
    address,
    taxId: rawTaxId,
    branchCode,
    branchName,
    currency,
    currencySymbol,
    timezone,
    paperWidth,
    receiptHeader,
    receiptFooter,
    showPromptPayQR,
    promptPayId,
    vatEnabled,
    vatRate,
    vatPriceMode,
    lineChannelId,
    lineChannelSecret,
    lineChannelAccessToken,
    lineNotifyRepairs,
    lineNotifyLowStock,
  };

  // 1. Update Tenant legal entity name and Tax ID
  await db.tenant.update({
    where: { id: tenantId },
    data: {
      name: shopName,
      taxId: rawTaxId || null,
    },
  });

  // 2. Update Primary Branch & Audit Log in transaction
  await prisma.$transaction(async (tx) => {
    const existingBranch = await tx.branch.findFirst({
      where: { tenantId },
      orderBy: [{ code: "asc" }, { createdAt: "asc" }],
    });

    if (existingBranch) {
      await tx.branch.update({
        where: { id: existingBranch.id },
        data: {
          name: branchName,
          code: branchCode,
          address: address || null,
          phone: phone || null,
          taxId: rawTaxId || null,
        },
      });
    }

    // 3. Log Audit Trail
    await tx.auditLog.create({
      data: {
        tenantId,
        userId: actorId,
        module: "SETTINGS",
        action: "UPDATE",
        targetId: tenantId,
        details: `อัปเดตการตั้งค่าระบบทั่วไป: ${shopName} (PromptPay: ${promptPayId || "-"}, VAT: ${vatEnabled ? vatRate + "%" : "ปิด"})`,
        afterJson: JSON.stringify(cleanedSettings),
        severity: "INFO",
      },
    });
  });

  return {
    ...cleanedSettings,
    updatedAt: new Date().toISOString(),
  };
}
