import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { db } from "@/lib/db";
import { AccessError, staffContext } from "@/lib/staff-context";
import { withStaff } from "@/lib/staff-http";
import { validateThaiTaxId, validateThaiBranchId } from "@/lib/utils";
import { DEFAULT_TAX_SETTINGS, TaxSettings } from "@/lib/tax";

export const dynamic = "force-dynamic";

export interface CompanyTaxProfile {
  companyName: string;
  taxId: string;
  branchCode: string;
  branchName: string;
  address: string;
  phone: string;
}

export interface TaxSettingsResponse {
  company: CompanyTaxProfile;
  taxSettings: TaxSettings;
}

/**
 * GET /api/tax/settings
 * Retrieve company registration details (13-digit Tax ID, 5-digit Branch Code)
 * and tax calculation policy settings for the current tenant.
 */
export const GET = withStaff(async (request: NextRequest) => {
  const actor = staffContext();

  const [tenant, branch, latestLog] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: actor.tenantId },
      select: { id: true, name: true, taxId: true, slug: true },
    }),
    prisma.branch.findFirst({
      where: { tenantId: actor.tenantId },
      orderBy: [{ code: "asc" }, { createdAt: "asc" }],
      select: { id: true, code: true, name: true, address: true, phone: true, taxId: true },
    }),
    prisma.auditLog.findFirst({
      where: {
        tenantId: actor.tenantId,
        module: "TAX_SETTINGS",
        action: "UPDATE",
      },
      orderBy: { createdAt: "desc" },
      select: { afterJson: true },
    }),
  ]);

  if (!tenant) throw new AccessError(404, "ไม่พบข้อมูล Tenant");

  let taxSettings: TaxSettings = { ...DEFAULT_TAX_SETTINGS };
  if (latestLog?.afterJson) {
    try {
      const parsed = JSON.parse(latestLog.afterJson);
      taxSettings = { ...DEFAULT_TAX_SETTINGS, ...parsed };
    } catch {
      // Use defaults if corrupted
    }
  }

  const company: CompanyTaxProfile = {
    companyName: tenant.name || "",
    taxId: tenant.taxId || branch?.taxId || "",
    branchCode: branch?.code || "00000",
    branchName: branch?.name || "สำนักงานใหญ่ (HQ)",
    address: branch?.address || "",
    phone: branch?.phone || "",
  };

  return NextResponse.json({
    success: true,
    data: { company, taxSettings },
  });
}, ["ADMIN", "MANAGER", "CASHIER"]);

/**
 * PUT /api/tax/settings
 * Update company registration profile and tax allowance settings.
 * Enforces:
 * - 13-digit Thai Tax ID checksum validation
 * - 5-digit Thai Branch Code (00000 for Headquarter)
 * - Strict multi-tenant isolation
 */
export const PUT = withStaff(async (request: NextRequest) => {
  const actor = staffContext();
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") throw new AccessError(400, "ข้อมูลไม่ถูกต้อง");

  const company = body.company || {};
  const taxSettings = body.taxSettings || {};

  // 1. Company Legal Name
  const companyName = typeof company.companyName === "string" ? company.companyName.trim() : "";
  if (!companyName || companyName.length > 200) {
    throw new AccessError(400, "กรุณาระบุชื่อนิติบุคคลหรือชื่อจดทะเบียนพาณิชย์");
  }

  // 2. 13-Digit Tax ID Checksum Validation
  const rawTaxId = typeof company.taxId === "string" ? company.taxId.replace(/[^0-9]/g, "") : "";
  if (!rawTaxId) {
    throw new AccessError(400, "กรุณากรอกเลขประจำตัวผู้เสียภาษีอากร 13 หลัก");
  }
  const taxIdResult = validateThaiTaxId(rawTaxId);
  if (!taxIdResult.valid) {
    throw new AccessError(400, taxIdResult.message || "เลขประจำตัวผู้เสียภาษีอากร 13 หลักไม่ถูกต้องตามหลักตรวจสอบ (Checksum Failed)");
  }

  // 3. 5-Digit Branch Code Validation (00000 for HQ)
  const rawBranchCode = typeof company.branchCode === "string" ? company.branchCode.trim() : "00000";
  const branchResult = validateThaiBranchId(rawBranchCode);
  if (!branchResult.valid) {
    throw new AccessError(400, branchResult.message || "รหัสสาขาต้องเป็นตัวเลข 5 หลัก เช่น 00000 สำหรับสำนักงานใหญ่");
  }

  const branchName = typeof company.branchName === "string" && company.branchName.trim() ? company.branchName.trim() : "สำนักงานใหญ่ (HQ)";
  const address = typeof company.address === "string" ? company.address.trim() : "";
  const phone = typeof company.phone === "string" ? company.phone.trim() : "";

  // 4. Clean Tax Settings
  const cleanedSettings: TaxSettings = {
    taxYear: Number(taxSettings.taxYear) || 2568,
    taxpayerType: taxSettings.taxpayerType === "CORPORATE" ? "CORPORATE" : "INDIVIDUAL",
    businessCategory: typeof taxSettings.businessCategory === "string" ? taxSettings.businessCategory : DEFAULT_TAX_SETTINGS.businessCategory,
    expenseDeductionMethod: taxSettings.expenseDeductionMethod === "ACTUAL" ? "ACTUAL" : "FLAT_60",
    actualExpenses: Math.max(0, Number(taxSettings.actualExpenses) || 0),

    selfAllowance: 60000,
    spouseAllowance: Boolean(taxSettings.spouseAllowance),
    childCount: Math.max(0, Number(taxSettings.childCount) || 0),
    parentsCount: Math.min(4, Math.max(0, Number(taxSettings.parentsCount) || 0)),
    parentsHealthInsurance: Math.min(15000, Math.max(0, Number(taxSettings.parentsHealthInsurance) || 0)),

    lifeInsurance: Math.min(100000, Math.max(0, Number(taxSettings.lifeInsurance) || 0)),
    healthInsurance: Math.min(25000, Math.max(0, Number(taxSettings.healthInsurance) || 0)),
    socialSecurity: Math.min(9000, Math.max(0, Number(taxSettings.socialSecurity) || 0)),
    providentFund: Math.min(500000, Math.max(0, Number(taxSettings.providentFund) || 0)),
    rmfFund: Math.min(500000, Math.max(0, Number(taxSettings.rmfFund) || 0)),
    ssfFund: Math.min(200000, Math.max(0, Number(taxSettings.ssfFund) || 0)),
    thaiEsgFund: Math.min(300000, Math.max(0, Number(taxSettings.thaiEsgFund) || 0)),

    homeLoanInterest: Math.min(100000, Math.max(0, Number(taxSettings.homeLoanInterest) || 0)),
    easyEReceipt: Math.min(50000, Math.max(0, Number(taxSettings.easyEReceipt) || 0)),

    educationDonation: Math.max(0, Number(taxSettings.educationDonation) || 0),
    generalDonation: Math.max(0, Number(taxSettings.generalDonation) || 0),
  };

  await prisma.$transaction(async (tx) => {
    // Update Tenant using unscoped db client
    await db.tenant.update({
      where: { id: actor.tenantId },
      data: {
        name: companyName,
        taxId: rawTaxId,
      },
    });

    // Update or create Primary Branch
    const existingBranch = await tx.branch.findFirst({
      where: { tenantId: actor.tenantId },
      orderBy: [{ code: "asc" }, { createdAt: "asc" }],
    });

    if (existingBranch) {
      await tx.branch.update({
        where: { id: existingBranch.id },
        data: {
          name: branchName,
          code: rawBranchCode,
          address: address || null,
          phone: phone || null,
          taxId: rawTaxId,
        },
      });
    }

    // Persist tax settings in AuditLog
    await tx.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.id,
        module: "TAX_SETTINGS",
        action: "UPDATE",
        targetId: actor.tenantId,
        details: `อัปเดตข้อมูลภาษีและค่าลดหย่อน: ${companyName} (Tax ID: ${rawTaxId}, สาขา: ${rawBranchCode})`,
        afterJson: JSON.stringify(cleanedSettings),
        severity: "INFO",
      },
    });
  });

  return NextResponse.json({
    success: true,
    message: "บันทึกข้อมูลการตั้งค่าภาษีสำเร็จ",
    data: {
      company: {
        companyName,
        taxId: rawTaxId,
        branchCode: rawBranchCode,
        branchName,
        address,
        phone,
      },
      taxSettings: cleanedSettings,
    },
  });
}, ["ADMIN", "MANAGER"]);
