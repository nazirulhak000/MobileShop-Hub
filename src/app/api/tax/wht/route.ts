import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { AccessError, staffContext } from "@/lib/staff-context";
import { bangkokDateString, takeParam, withStaff } from "@/lib/staff-http";
import { validateThaiTaxId } from "@/lib/utils";

export const dynamic = "force-dynamic";

const round2 = (n: number) => Math.round(n * 100) / 100;
const VALID_RATES = [1, 2, 3, 5];
const VALID_TYPES = ["PND3", "PND53"] as const;

export interface WhtRecord {
  id: string;
  certNo: string;
  type: "PND3" | "PND53";
  date: string;
  payeeName: string;
  payeeTaxId: string;
  payeeAddress: string;
  incomeType: string;
  rate: number;
  baseAmount: number;
  whtAmount: number;
  netPayment: number;
  branchId: string;
  status: "ISSUED" | "VOID";
  createdAt: string;
}

/**
 * GET /api/tax/wht
 * List Withholding Tax (50 ทวิ) certificates and monthly totals.
 * Multi-tenant isolated via actor.tenantId.
 */
export const GET = withStaff(async (request: NextRequest) => {
  const actor = staffContext();
  const params = new URL(request.url).searchParams;
  const month = params.get("month"); // YYYY-MM
  const type = params.get("type"); // PND3, PND53, or ALL
  const search = (params.get("search") || "").trim().toLowerCase();
  const take = takeParam(params.get("take"), 200, 1000);

  // Retrieve WHT audit log records for this tenant
  const logs = await prisma.auditLog.findMany({
    where: {
      tenantId: actor.tenantId,
      module: "TAX_WHT",
      action: { in: ["ISSUE", "VOID"] },
    },
    orderBy: { createdAt: "desc" },
    take: take * 2,
    select: {
      id: true,
      targetId: true,
      action: true,
      afterJson: true,
      createdAt: true,
    },
  });

  // Reconcile certificates (latest state per certNo)
  const certMap = new Map<string, WhtRecord>();
  for (const log of logs) {
    if (!log.targetId || !log.afterJson) continue;
    try {
      const data = JSON.parse(log.afterJson);
      if (!certMap.has(log.targetId)) {
        certMap.set(log.targetId, {
          id: log.id,
          certNo: data.certNo || log.targetId,
          type: data.type || "PND3",
          date: data.date || log.createdAt.toISOString().slice(0, 10),
          payeeName: data.payeeName || "-",
          payeeTaxId: data.payeeTaxId || "-",
          payeeAddress: data.payeeAddress || "-",
          incomeType: data.incomeType || "-",
          rate: Number(data.rate) || 3,
          baseAmount: round2(Number(data.baseAmount) || 0),
          whtAmount: round2(Number(data.whtAmount) || 0),
          netPayment: round2(Number(data.netPayment) || 0),
          branchId: data.branchId || actor.branchId,
          status: log.action === "VOID" || data.status === "VOID" ? "VOID" : "ISSUED",
          createdAt: log.createdAt.toISOString(),
        });
      }
    } catch {
      // Ignore corrupted JSON defensively
    }
  }

  let certificates = Array.from(certMap.values());

  // Filter by month (YYYY-MM)
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    certificates = certificates.filter((c) => c.date.startsWith(month));
  }

  // Filter by type
  if (type && type !== "ALL") {
    certificates = certificates.filter((c) => c.type === type);
  }

  // Filter by search query
  if (search) {
    certificates = certificates.filter(
      (c) =>
        c.certNo.toLowerCase().includes(search) ||
        c.payeeName.toLowerCase().includes(search) ||
        c.payeeTaxId.toLowerCase().includes(search) ||
        c.incomeType.toLowerCase().includes(search)
    );
  }

  // Calculate summary metrics (exclude VOID)
  const activeCerts = certificates.filter((c) => c.status !== "VOID");
  let totalBase = 0;
  let totalWht = 0;
  let pnd3Count = 0;
  let pnd53Count = 0;
  let pnd3Wht = 0;
  let pnd53Wht = 0;
  const byRate: Record<string, { base: number; wht: number; count: number }> = {
    "1%": { base: 0, wht: 0, count: 0 },
    "3%": { base: 0, wht: 0, count: 0 },
    "5%": { base: 0, wht: 0, count: 0 },
  };

  for (const c of activeCerts) {
    totalBase += c.baseAmount;
    totalWht += c.whtAmount;
    if (c.type === "PND3") {
      pnd3Count++;
      pnd3Wht += c.whtAmount;
    } else {
      pnd53Count++;
      pnd53Wht += c.whtAmount;
    }
    const rateKey = `${c.rate}%`;
    if (!byRate[rateKey]) {
      byRate[rateKey] = { base: 0, wht: 0, count: 0 };
    }
    byRate[rateKey].base += c.baseAmount;
    byRate[rateKey].wht += c.whtAmount;
    byRate[rateKey].count += 1;
  }

  return NextResponse.json({
    success: true,
    data: {
      summary: {
        totalBase: round2(totalBase),
        totalWht: round2(totalWht),
        totalCount: activeCerts.length,
        pnd3Count,
        pnd53Count,
        pnd3Wht: round2(pnd3Wht),
        pnd53Wht: round2(pnd53Wht),
        byRate,
      },
      certificates: certificates.slice(0, take),
      truncated: certificates.length > take,
    },
  });
}, ["ADMIN", "MANAGER", "CASHIER"]);

/**
 * POST /api/tax/wht
 * Issue a new 50 ทวิ Withholding Tax Certificate.
 * Enforces:
 * - 13-digit Tax ID validation with checksum
 * - Minimum threshold of 1,000 THB
 * - Atomic cert number generation (50T-YYYYMM-XXX)
 * - Strict multi-tenant isolation
 */
export const POST = withStaff(async (request: NextRequest) => {
  const actor = staffContext();
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") throw new AccessError(400, "ข้อมูลไม่ถูกต้อง");

  const payeeName = typeof body.payeeName === "string" ? body.payeeName.trim() : "";
  if (!payeeName || payeeName.length > 200) throw new AccessError(400, "กรุณาระบุชื่อผู้ถูกหักภาษี ณ ที่จ่าย");

  const payeeTaxId = typeof body.payeeTaxId === "string" ? body.payeeTaxId.replace(/[^0-9]/g, "") : "";
  const taxIdValidation = validateThaiTaxId(payeeTaxId);
  if (!taxIdValidation.valid) {
    throw new AccessError(400, taxIdValidation.message || "เลขประจำตัวผู้เสียภาษีอากร 13 หลักไม่ถูกต้อง");
  }

  const type = body.type;
  if (!VALID_TYPES.includes(type)) {
    throw new AccessError(400, "ประเภทภาษีหัก ณ ที่จ่ายต้องเป็น ภ.ง.ด.3 หรือ ภ.ง.ด.53");
  }

  const rate = Number(body.rate);
  if (!VALID_RATES.includes(rate)) {
    throw new AccessError(400, "อัตราภาษีหัก ณ ที่จ่ายต้องเป็น 1%, 2%, 3% หรือ 5%");
  }

  const baseAmount = round2(Number(body.baseAmount) || 0);
  if (baseAmount < 1000) {
    throw new AccessError(400, "ยอดเงินได้ก่อนหักภาษีขั้นต่ำสำหรับการหัก ณ ที่จ่ายคือ 1,000 บาท");
  }

  const payeeAddress = typeof body.payeeAddress === "string" ? body.payeeAddress.trim() : "";
  const incomeType = typeof body.incomeType === "string" && body.incomeType.trim() ? body.incomeType.trim() : "ค่าจ้างทำของ/บริการ";
  const date = typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : bangkokDateString();
  const branchId = typeof body.branchId === "string" && actor.branchIds.includes(body.branchId) ? body.branchId : actor.branchId;

  const whtAmount = round2(baseAmount * (rate / 100));
  const netPayment = round2(baseAmount - whtAmount);

  const yyyymm = date.slice(0, 7).replace("-", "");

  const result = await prisma.$transaction(async (tx) => {
    // Sequential counter per tenant
    const counter = await tx.sequenceCounter.upsert({
      where: { id: `WHT-${actor.tenantId}-${yyyymm}` },
      update: { current: { increment: 1 } },
      create: { id: `WHT-${actor.tenantId}-${yyyymm}`, current: 1 },
    });

    const certNo = `50T-${yyyymm}-${String(counter.current).padStart(3, "0")}`;

    const recordData: Omit<WhtRecord, "id" | "createdAt"> = {
      certNo,
      type,
      date,
      payeeName,
      payeeTaxId,
      payeeAddress,
      incomeType,
      rate,
      baseAmount,
      whtAmount,
      netPayment,
      branchId,
      status: "ISSUED",
    };

    const log = await tx.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.id,
        module: "TAX_WHT",
        action: "ISSUE",
        targetId: certNo,
        details: `ออกหนังสือรับรอง 50 ทวิ ${certNo} ให้ ${payeeName} (${incomeType}) ภาษีหัก ${whtAmount.toFixed(2)} บาท`,
        afterJson: JSON.stringify(recordData),
        severity: "INFO",
      },
    });

    return { id: log.id, ...recordData, createdAt: log.createdAt.toISOString() };
  });

  return NextResponse.json({ success: true, data: result }, { status: 201 });
}, ["ADMIN", "MANAGER", "CASHIER"]);

/**
 * DELETE /api/tax/wht?certNo=50T-YYYYMM-XXX
 * Void an existing Withholding Tax Certificate.
 */
export const DELETE = withStaff(async (request: NextRequest) => {
  const actor = staffContext();
  const params = new URL(request.url).searchParams;
  const certNo = params.get("certNo");
  if (!certNo) throw new AccessError(400, "กรุณาระบุเลขที่หนังสือรับรอง (certNo)");

  // Check existence in this tenant
  const existing = await prisma.auditLog.findFirst({
    where: {
      tenantId: actor.tenantId,
      module: "TAX_WHT",
      targetId: certNo,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!existing || !existing.afterJson) {
    throw new AccessError(404, "ไม่พบหนังสือรับรองหัก ณ ที่จ่าย");
  }

  const prevData = JSON.parse(existing.afterJson);
  const updatedData = { ...prevData, status: "VOID" };

  await prisma.auditLog.create({
    data: {
      tenantId: actor.tenantId,
      userId: actor.id,
      module: "TAX_WHT",
      action: "VOID",
      targetId: certNo,
      details: `ยกเลิกหนังสือรับรอง 50 ทวิ ${certNo} ของ ${prevData.payeeName}`,
      beforeJson: existing.afterJson,
      afterJson: JSON.stringify(updatedData),
      severity: "WARNING",
    },
  });

  return NextResponse.json({ success: true, message: `ยกเลิกหนังสือรับรอง ${certNo} สำเร็จ` });
}, ["ADMIN", "MANAGER"]);
