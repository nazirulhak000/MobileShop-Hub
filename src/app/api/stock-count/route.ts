import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AccessError, staffContext } from "@/lib/staff-context";
import {
  withStaff,
  readJson,
  safeError,
  reqId,
  reqInt,
  bangkokYYYYMM,
  takeParam,
} from "@/lib/staff-http";

export const dynamic = "force-dynamic";

export interface StockCountDiscrepancy {
  productId: string;
  productCode: string;
  productName: string;
  category: string;
  systemQty: number;
  countedQty: number;
  diff: number;
  status: "MATCH" | "SURPLUS" | "DEFICIT";
  costPrice: number;
  costImpact: number;
}

export interface StockCountSessionRecord {
  id: string;
  sessionCode: string;
  branchId: string;
  branchCode: string;
  branchName: string;
  countedBy: string;
  createdAt: string;
  itemsCounted: number;
  discrepancyCount: number;
  surplusCount: number;
  deficitCount: number;
  matchedCount: number;
  totalSurplusQty: number;
  totalDeficitQty: number;
  totalVarianceQty: number;
  totalCostImpact: number;
  note?: string;
  autoAdjusted: boolean;
  discrepancies: StockCountDiscrepancy[];
}

/**
 * GET /api/stock-count
 * Returns previous stock count audit sessions for the tenant
 */
async function handleGET(request: NextRequest) {
  const actor = staffContext();
  const { searchParams } = new URL(request.url);
  const branchKey = searchParams.get("branch")?.trim() || "";
  const take = takeParam(searchParams.get("take"), 50, 200);

  let branchId: string | undefined;
  if (branchKey) {
    const branch = await prisma.branch.findFirst({
      where: {
        tenantId: actor.tenantId,
        OR: [{ code: branchKey }, { id: branchKey }],
      },
      select: { id: true },
    });
    if (branch) branchId = branch.id;
  }

  const logs = await prisma.auditLog.findMany({
    where: {
      tenantId: actor.tenantId,
      module: "STOCK_COUNT",
      action: "SESSION_COMPLETE",
      ...(branchId ? { targetId: branchId } : {}),
    },
    include: {
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  const sessions: StockCountSessionRecord[] = [];

  for (const log of logs) {
    let details: any = {};
    try {
      details = JSON.parse(log.details);
    } catch {
      continue;
    }

    // Role scoping: Cashier/Tech limited to their assigned branches
    const isAllBranchRole = actor.role === "ADMIN" || actor.role === "MANAGER";
    if (!isAllBranchRole && details.branchId && !actor.branchIds.includes(details.branchId)) {
      continue;
    }

    sessions.push({
      id: log.id,
      sessionCode: details.sessionCode || `CNT-${log.id.slice(-6)}`,
      branchId: details.branchId || log.targetId || "",
      branchCode: details.branchCode || "",
      branchName: details.branchName || "สาขา",
      countedBy: details.countedBy || log.user?.name || "เจ้าหน้าที่",
      createdAt: details.createdAt || log.createdAt.toISOString(),
      itemsCounted: details.itemsCounted || 0,
      discrepancyCount: details.discrepancyCount || 0,
      surplusCount: details.surplusCount || 0,
      deficitCount: details.deficitCount || 0,
      matchedCount: details.matchedCount || 0,
      totalSurplusQty: details.totalSurplusQty || 0,
      totalDeficitQty: details.totalDeficitQty || 0,
      totalVarianceQty: details.totalVarianceQty || 0,
      totalCostImpact: details.totalCostImpact || 0,
      note: details.note || undefined,
      autoAdjusted: details.autoAdjusted ?? true,
      discrepancies: details.discrepancies || [],
    });
  }

  return NextResponse.json({
    success: true,
    sessions,
  });
}

/**
 * POST /api/stock-count
 * Reconciles physical stock count against system inventory.
 * Calculates Surplus / Deficit variances, adjusts stock if autoAdjust=true, and creates complete audit trail.
 */
async function handlePOST(request: NextRequest) {
  const actor = staffContext();
  const body = await readJson(request);

  const branchKey = reqId(body?.branchCode || body?.branchId, "branch");
  const rawCounts = Array.isArray(body?.counts) ? body.counts : [];
  const note = typeof body?.note === "string" ? body.note.trim() : (body?.reason || "");
  const autoAdjust = body?.autoAdjust !== false; // Default true

  if (rawCounts.length === 0) {
    throw new AccessError(400, "กรุณาระบุรายการสินค้าที่ตรวจนับอย่างน้อย 1 รายการ");
  }

  // Branch multi-tenant validation
  const branch = await prisma.branch.findFirst({
    where: {
      tenantId: actor.tenantId,
      OR: [{ id: branchKey }, { code: branchKey }],
    },
  });

  if (!branch) {
    throw new AccessError(404, `ไม่พบสาขา (${branchKey}) ในองค์กรของคุณ`);
  }

  // Role scoping: Cashier/Tech can only audit their assigned branch
  const isAllBranchRole = actor.role === "ADMIN" || actor.role === "MANAGER";
  if (!isAllBranchRole && !actor.branchIds.includes(branch.id)) {
    throw new AccessError(403, "ไม่มีสิทธิ์ตรวจนับสต็อกของสาขานี้");
  }

  // Discrepancy calculation and product validation
  const discrepancies: StockCountDiscrepancy[] = [];
  let totalSurplusQty = 0;
  let totalDeficitQty = 0;
  let totalVarianceQty = 0;
  let totalCostImpact = 0;
  let surplusCount = 0;
  let deficitCount = 0;
  let matchedCount = 0;

  for (const c of rawCounts) {
    const pKey = reqId(c.productId || c.id || c.code, "productId");
    const countedQty = reqInt(c.countedQty ?? c.quantity, "countedQty", 0, 1_000_000);

    const product = await prisma.product.findFirst({
      where: {
        tenantId: actor.tenantId,
        OR: [{ id: pKey }, { code: pKey }],
      },
      include: {
        stockItems: {
          where: { branchId: branch.id },
        },
      },
    });

    if (!product) {
      throw new AccessError(404, `ไม่พบสินค้ารหัส ${pKey} ในองค์กรของคุณ`);
    }

    const systemQty = product.stockItems[0]?.quantity ?? 0;
    const diff = countedQty - systemQty;
    const costPrice = product.costPrice ?? 0;
    const impact = diff * costPrice;

    let status: StockCountDiscrepancy["status"] = "MATCH";
    if (diff > 0) {
      status = "SURPLUS";
      surplusCount++;
      totalSurplusQty += diff;
    } else if (diff < 0) {
      status = "DEFICIT";
      deficitCount++;
      totalDeficitQty += Math.abs(diff);
    } else {
      matchedCount++;
    }

    totalVarianceQty += diff;
    totalCostImpact += impact;

    discrepancies.push({
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      category: product.category,
      systemQty,
      countedQty,
      diff,
      status,
      costPrice,
      costImpact: Math.round(impact * 100) / 100,
    });
  }

  const discrepancyItems = discrepancies.filter((d) => d.diff !== 0);
  const discrepancyCount = discrepancyItems.length;
  const yyyymm = bangkokYYYYMM();

  const result = await prisma.$transaction(async (tx) => {
    // Generate sequential session code CNT-YYYYMM-XXXX
    const counter = await tx.sequenceCounter.upsert({
      where: { id: `CNT-${yyyymm}` },
      update: { current: { increment: 1 } },
      create: { id: `CNT-${yyyymm}`, current: 1 },
    });
    const sessionCode = `CNT-${yyyymm}-${String(counter.current).padStart(4, "0")}`;

    // Auto-adjust inventory variances
    if (autoAdjust && discrepancyCount > 0) {
      for (const item of discrepancyItems) {
        await tx.stockItem.upsert({
          where: {
            productId_branchId: {
              productId: item.productId,
              branchId: branch.id,
            },
          },
          update: {
            quantity: item.countedQty,
          },
          create: {
            tenantId: actor.tenantId,
            productId: item.productId,
            branchId: branch.id,
            quantity: item.countedQty,
          },
        });

        // AuditLog for each inventory adjustment
        await tx.auditLog.create({
          data: {
            tenantId: actor.tenantId,
            userId: actor.id,
            module: "INVENTORY",
            action: "STOCK_ADJUST",
            targetId: item.productId,
            details: JSON.stringify({
              sessionCode,
              productName: item.productName,
              productCode: item.productCode,
              branchName: branch.name,
              branchCode: branch.code,
              type: "SET",
              fromQty: item.systemQty,
              toQty: item.countedQty,
              variance: item.diff,
              status: item.status,
              reason: note || `ปรับยอดจากการตรวจนับจริง (${sessionCode})`,
            }),
            beforeJson: JSON.stringify({ quantity: item.systemQty }),
            afterJson: JSON.stringify({ quantity: item.countedQty }),
            severity: "WARNING",
          },
        });
      }
    }

    const sessionPayload = {
      sessionCode,
      branchId: branch.id,
      branchCode: branch.code,
      branchName: branch.name,
      countedBy: actor.name,
      createdAt: new Date().toISOString(),
      itemsCounted: discrepancies.length,
      discrepancyCount,
      surplusCount,
      deficitCount,
      matchedCount,
      totalSurplusQty,
      totalDeficitQty,
      totalVarianceQty,
      totalCostImpact: Math.round(totalCostImpact * 100) / 100,
      note: note || undefined,
      autoAdjusted: autoAdjust,
      discrepancies,
    };

    // AuditLog for the overall Stock Count session
    const sessionLog = await tx.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.id,
        module: "STOCK_COUNT",
        action: "SESSION_COMPLETE",
        targetId: branch.id,
        severity: discrepancyCount > 0 ? "WARNING" : "INFO",
        details: JSON.stringify(sessionPayload),
      },
    });

    return {
      id: sessionLog.id,
      ...sessionPayload,
    };
  });

  return NextResponse.json({
    success: true,
    message: `บันทึกผลการตรวจนับ ${result.sessionCode} สำเร็จ (${discrepancyCount} รายการมีผลต่าง)`,
    session: result,
    discrepancies,
  });
}

export const GET = withStaff(handleGET, ["ADMIN", "MANAGER", "TECHNICIAN", "CASHIER"]);
export const POST = withStaff(handlePOST, ["ADMIN", "MANAGER", "TECHNICIAN", "CASHIER"]);
