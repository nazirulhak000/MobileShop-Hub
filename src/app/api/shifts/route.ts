import { AccessError, staffContext } from "@/lib/staff-context";
import { withStaff, reqMoney, bangkokDayRange, bangkokDateString } from "@/lib/staff-http";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const round2 = (n: number) => Math.round(n * 100) / 100;

interface CashMovement {
  id: string;
  time: string;
  type: "CASH_IN" | "CASH_OUT";
  amount: number;
  reason: string;
  createdBy: string;
}

/**
 * GET /api/shifts?branch=HQ&day=YYYY-MM-DD
 * Retrieves active or closed shift for the branch and day.
 * Reconstructed from AuditLog entries scoped strictly to actor.tenantId.
 */
async function handleGET(request: NextRequest) {
  const actor = staffContext();
  const { searchParams } = new URL(request.url);
  const branchKey = searchParams.get("branch")?.trim() || "";
  const day = searchParams.get("day")?.trim() || bangkokDateString();
  const { start, end } = bangkokDayRange(day);

  let branchId: string | undefined;
  let branchName = "";
  if (branchKey) {
    const branch = await prisma.branch.findFirst({
      where: { tenantId: actor.tenantId, OR: [{ code: branchKey }, { id: branchKey }] },
      select: { id: true, name: true },
    });
    if (!branch) throw new AccessError(404, "ไม่พบข้อมูลสาขา");
    branchId = branch.id;
    branchName = branch.name;
  }

  // Load shift events from AuditLog
  const logs = await prisma.auditLog.findMany({
    where: {
      tenantId: actor.tenantId,
      module: "SHIFT",
      ...(branchId ? { targetId: branchId } : {}),
      createdAt: { gte: start, lt: end },
    },
    include: {
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Reconstruct shift state
  let currentShift: {
    shiftId: string;
    isOpen: boolean;
    openedAt: string;
    openedBy: string;
    openingFloat: number;
    movements: CashMovement[];
    closedAt?: string;
    closedBy?: string;
    countedCash?: number;
    expectedCash?: number;
    discrepancy?: number;
    denominations?: Record<string, number>;
    note?: string;
  } | null = null;

  for (const log of logs) {
    let details: any = {};
    try {
      details = JSON.parse(log.details);
    } catch {
      continue;
    }

    if (log.action === "OPEN") {
      currentShift = {
        shiftId: details.shiftId || log.id,
        isOpen: true,
        openedAt: details.openedAt || log.createdAt.toISOString(),
        openedBy: details.openedBy || log.user?.name || "แคชเชียร์",
        openingFloat: Number(details.openingFloat) || 0,
        movements: [],
      };
    } else if (log.action === "MOVEMENT" && currentShift) {
      currentShift.movements.push({
        id: log.id,
        time: details.time || log.createdAt.toLocaleTimeString("th-TH"),
        type: details.type === "CASH_IN" ? "CASH_IN" : "CASH_OUT",
        amount: Number(details.amount) || 0,
        reason: details.reason || "-",
        createdBy: details.createdBy || log.user?.name || "-",
      });
    } else if (log.action === "CLOSE" && currentShift) {
      currentShift.isOpen = false;
      currentShift.closedAt = details.closedAt || log.createdAt.toISOString();
      currentShift.closedBy = details.closedBy || log.user?.name || "ผู้จัดการ";
      currentShift.countedCash = Number(details.countedCash) || 0;
      currentShift.expectedCash = Number(details.expectedCash) || 0;
      currentShift.discrepancy = Number(details.discrepancy) || 0;
      currentShift.denominations = details.denominations || {};
      currentShift.note = details.note || "";
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      day,
      branchId,
      branchName,
      shift: currentShift,
    },
  });
}

/**
 * POST /api/shifts
 * Body:
 * 1. { action: "OPEN", branchCode: string, openingFloat: number }
 * 2. { action: "MOVEMENT", branchCode: string, shiftId: string, type: "CASH_IN" | "CASH_OUT", amount: number, reason: string }
 * 3. { action: "CLOSE", branchCode: string, shiftId: string, openingFloat: number, countedCash: number, expectedCash: number, discrepancy: number, denominations: object, note: string }
 */
async function handlePOST(request: NextRequest) {
  const actor = staffContext();
  const body = await request.json().catch(() => null);
  const action = body?.action;

  const branchKey = (body?.branchCode || body?.branchId || "").trim();
  const branch = await prisma.branch.findFirst({
    where: { tenantId: actor.tenantId, OR: [{ code: branchKey }, { id: branchKey }] },
    select: { id: true, code: true, name: true },
  });
  if (!branch) throw new AccessError(404, "ไม่พบข้อมูลสาขา");

  if (action === "OPEN") {
    const openingFloat = reqMoney(body?.openingFloat ?? 0, "openingFloat", 0, 10_000_000);
    const shiftId = `SHIFT-${Date.now()}`;
    const openedAt = new Date().toISOString();

    await prisma.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.id,
        module: "SHIFT",
        action: "OPEN",
        targetId: branch.id,
        severity: "INFO",
        details: JSON.stringify({
          shiftId,
          openingFloat,
          branchCode: branch.code,
          branchName: branch.name,
          openedBy: actor.name,
          openedAt,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `เปิดกะสำเร็จ (เงินทอนตั้งต้น: ${openingFloat.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท)`,
      data: {
        shiftId,
        isOpen: true,
        openedAt,
        openedBy: actor.name,
        openingFloat,
        movements: [],
      },
    });
  }

  if (action === "MOVEMENT") {
    const shiftId = String(body?.shiftId || "").trim();
    const type = body?.type === "CASH_IN" ? "CASH_IN" : "CASH_OUT";
    const amount = reqMoney(body?.amount, "amount", 0.01, 10_000_000);
    const reason = String(body?.reason || "").trim();
    if (reason.length < 3) throw new AccessError(400, "กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร");

    const timeStr = new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น.";

    const log = await prisma.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.id,
        module: "SHIFT",
        action: "MOVEMENT",
        targetId: branch.id,
        severity: type === "CASH_OUT" ? "WARNING" : "INFO",
        details: JSON.stringify({
          shiftId,
          type,
          amount,
          reason,
          time: timeStr,
          createdBy: actor.name,
          branchCode: branch.code,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `บันทึกรายการเงินเข้า/ออกสำเร็จ`,
      data: {
        id: log.id,
        time: timeStr,
        type,
        amount,
        reason,
        createdBy: actor.name,
      },
    });
  }

  if (action === "CLOSE") {
    const shiftId = String(body?.shiftId || "").trim();
    const openingFloat = reqMoney(body?.openingFloat ?? 0, "openingFloat", 0);
    const countedCash = reqMoney(body?.countedCash ?? 0, "countedCash", 0);
    const expectedCash = reqMoney(body?.expectedCash ?? 0, "expectedCash", 0);
    const discrepancy = round2(countedCash - expectedCash);
    const denominations = body?.denominations || {};
    const note = String(body?.note || "").trim();
    const closedAt = new Date().toISOString();

    await prisma.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.id,
        module: "SHIFT",
        action: "CLOSE",
        targetId: branch.id,
        severity: discrepancy === 0 ? "INFO" : "WARNING",
        details: JSON.stringify({
          shiftId,
          openingFloat,
          countedCash,
          expectedCash,
          discrepancy,
          denominations,
          note,
          closedBy: actor.name,
          closedAt,
          branchCode: branch.code,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `ตรวจนับเงินและปิดกะสำเร็จ (ผลต่าง: ${discrepancy === 0 ? "ยอดตรง" : discrepancy > 0 ? `+${discrepancy}` : `${discrepancy}`})`,
      data: {
        shiftId,
        isOpen: false,
        closedAt,
        closedBy: actor.name,
        countedCash,
        expectedCash,
        discrepancy,
        denominations,
        note,
      },
    });
  }

  throw new AccessError(400, "การกระทำไม่ถูกต้อง (action must be OPEN, MOVEMENT, or CLOSE)");
}

export const GET = withStaff(handleGET, ["ADMIN", "MANAGER", "CASHIER"]);
export const POST = withStaff(handlePOST, ["ADMIN", "MANAGER", "CASHIER"]);
