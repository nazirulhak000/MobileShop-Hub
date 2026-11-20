import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AccessError, staffContext } from "@/lib/staff-context";
import { bangkokDateString, bangkokMonthRange, reqEnum, reqId, reqMoney, withStaff } from "@/lib/staff-http";
import { bahtText } from "@/lib/utils";
import {
  SSO_RATE,
  SSO_WAGE_MIN,
  SSO_WAGE_MAX,
  SSO_MAX_DEDUCTION,
  SSO_EMPLOYER_MATCH,
  toSatang,
  fromSatang,
  calculateOtPay,
  ssoOf,
} from "@/lib/payroll-calc";

const MONEY_FIELDS = [
  "baseSalary",
  "repairCommission",
  "salesCommission",
  "allowance",
  "bonus",
  "overtimePay",
  "ot15Hours",
  "ot20Hours",
  "ot30Hours",
  "taxDeduction",
  "lateDeduction",
  "unpaidDeduction",
  "otherDeductions",
] as const;

type MoneyField = (typeof MONEY_FIELDS)[number];
type SlipAmounts = Record<MoneyField, number>;

const slipSelect = {
  id: true,
  tenantId: true,
  userId: true,
  branchId: true,
  month: true,
  baseSalary: true,
  repairCommission: true,
  salesCommission: true,
  allowance: true,
  bonus: true,
  overtimePay: true,
  ot15Hours: true,
  ot20Hours: true,
  ot30Hours: true,
  ssoDeduction: true,
  taxDeduction: true,
  lateDeduction: true,
  unpaidDeduction: true,
  otherDeductions: true,
  netPayout: true,
  status: true,
  paidDate: true,
  updatedAt: true,
  user: { select: { id: true, name: true, role: true, isActive: true } },
  branch: { select: { id: true, name: true, code: true } },
} as const;

type SlipRow = Prisma.PayrollSlipGetPayload<{ select: typeof slipSelect }>;

/** Gross wage = base + commissions + allowance + bonus + OT. */
function grossSatangOf(a: SlipAmounts): number {
  return (
    toSatang(a.baseSalary) +
    toSatang(a.repairCommission) +
    toSatang(a.salesCommission) +
    toSatang(a.allowance) +
    toSatang(a.bonus) +
    toSatang(a.overtimePay)
  );
}

function computeSlip(a: SlipAmounts) {
  // If OT hours provided but overtimePay is 0, auto-calculate OT pay
  if ((a.ot15Hours > 0 || a.ot20Hours > 0 || a.ot30Hours > 0) && a.overtimePay === 0) {
    a.overtimePay = calculateOtPay(a.baseSalary, a.ot15Hours, a.ot20Hours, a.ot30Hours);
  }

  const grossSatang = grossSatangOf(a);
  const gross = fromSatang(grossSatang);

  const ssoDeduction = ssoOf(gross);
  const ssoDeductionSatang = toSatang(ssoDeduction);

  const totalDeductionsSatang =
    ssoDeductionSatang +
    toSatang(a.taxDeduction) +
    toSatang(a.lateDeduction) +
    toSatang(a.unpaidDeduction) +
    toSatang(a.otherDeductions);

  const netPayoutSatang = grossSatang - totalDeductionsSatang;
  if (netPayoutSatang < 0) {
    throw new AccessError(400, "ยอดหักมากกว่ารายได้ เงินได้สุทธิติดลบ");
  }

  const netPayout = fromSatang(netPayoutSatang);
  return {
    gross,
    grossSatang,
    ssoDeduction,
    totalDeductions: fromSatang(totalDeductionsSatang),
    netPayout,
    netPayoutSatang,
  };
}

function serialize(s: SlipRow) {
  const amounts: SlipAmounts = {
    baseSalary: s.baseSalary,
    repairCommission: s.repairCommission,
    salesCommission: s.salesCommission,
    allowance: s.allowance,
    bonus: s.bonus,
    overtimePay: s.overtimePay,
    ot15Hours: s.ot15Hours,
    ot20Hours: s.ot20Hours,
    ot30Hours: s.ot30Hours,
    taxDeduction: s.taxDeduction,
    lateDeduction: s.lateDeduction,
    unpaidDeduction: s.unpaidDeduction,
    otherDeductions: s.otherDeductions,
  };
  const { gross, totalDeductions } = computeSlip(amounts);

  return {
    ...s,
    bonus: s.bonus ?? 0,
    ot15Hours: s.ot15Hours ?? 0,
    ot20Hours: s.ot20Hours ?? 0,
    ot30Hours: s.ot30Hours ?? 0,
    lateDeduction: s.lateDeduction ?? 0,
    unpaidDeduction: s.unpaidDeduction ?? 0,
    gross,
    totalDeductions,
    employerSso: s.ssoDeduction * SSO_EMPLOYER_MATCH,
    netBahtText: bahtText(s.netPayout),
    paidDate: s.paidDate ? bangkokDateString(s.paidDate) : null,
  };
}

function reqMonth(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    throw new AccessError(400, "รูปแบบเดือนไม่ถูกต้อง (YYYY-MM)");
  }
  const now = bangkokDateString().slice(0, 7);
  const [y, m] = now.split("-").map(Number);
  const next = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}`;
  if (value > next) {
    throw new AccessError(400, "ไม่สามารถสร้างเงินเดือนล่วงหน้าเกิน 1 เดือน");
  }
  return value;
}

function prevMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

function parseAmounts(body: Record<string, unknown>): Partial<SlipAmounts> {
  const out: Partial<SlipAmounts> = {};
  for (const f of MONEY_FIELDS) {
    if (body[f] !== undefined && body[f] !== null && body[f] !== "") {
      out[f] = reqMoney(body[f], f, 0, 10_000_000);
    }
  }
  return out;
}

function amountsOf(s: SlipAmounts): SlipAmounts {
  return Object.fromEntries(MONEY_FIELDS.map((f) => [f, s[f] ?? 0])) as SlipAmounts;
}

async function handleGET(req: NextRequest) {
  const actor = staffContext();
  const params = new URL(req.url).searchParams;
  const month = reqMonth(params.get("month") ?? bangkokDateString().slice(0, 7));

  // Multi-tenant isolation: always filter by tenantId and actor.branchIds
  const [slips, activeUsers] = await Promise.all([
    prisma.payrollSlip.findMany({
      where: {
        tenantId: actor.tenantId,
        month,
        branchId: { in: actor.branchIds },
      },
      select: slipSelect,
      orderBy: [{ branchId: "asc" }, { createdAt: "asc" }],
    }),
    prisma.user.findMany({
      where: {
        tenantId: actor.tenantId,
        isActive: true,
        branchId: { in: actor.branchIds },
      },
      select: { id: true, name: true, role: true, branchId: true },
    }),
  ]);

  const withSlip = new Set(slips.map((s) => s.userId));
  const data = slips.map(serialize);

  // Satang precision accumulation for summary
  const summarySatang = data.reduce(
    (acc, s) => {
      acc.count += 1;
      acc.baseSalary += toSatang(s.baseSalary);
      acc.repairCommission += toSatang(s.repairCommission);
      acc.salesCommission += toSatang(s.salesCommission);
      acc.allowance += toSatang(s.allowance);
      acc.bonus += toSatang(s.bonus);
      acc.overtimePay += toSatang(s.overtimePay);
      acc.gross += toSatang(s.gross);
      acc.sso += toSatang(s.ssoDeduction);
      acc.employerSso += toSatang(s.employerSso);
      acc.tax += toSatang(s.taxDeduction);
      acc.late += toSatang(s.lateDeduction);
      acc.unpaid += toSatang(s.unpaidDeduction);
      acc.otherDeductions += toSatang(s.otherDeductions);
      acc.totalDeductions += toSatang(s.totalDeductions);
      acc.net += toSatang(s.netPayout);
      return acc;
    },
    {
      count: 0,
      baseSalary: 0,
      repairCommission: 0,
      salesCommission: 0,
      allowance: 0,
      bonus: 0,
      overtimePay: 0,
      gross: 0,
      sso: 0,
      employerSso: 0,
      tax: 0,
      late: 0,
      unpaid: 0,
      otherDeductions: 0,
      totalDeductions: 0,
      net: 0,
    }
  );

  const summary = Object.fromEntries(
    Object.entries(summarySatang).map(([k, v]) => [k, k === "count" ? v : fromSatang(v)])
  );

  return NextResponse.json({
    success: true,
    month,
    data,
    summary,
    usersWithoutSlip: activeUsers.filter((u) => !withSlip.has(u.id)),
    policy: {
      ssoRate: SSO_RATE,
      ssoWageMin: SSO_WAGE_MIN,
      ssoWageMax: SSO_WAGE_MAX,
      ssoMax: SSO_MAX_DEDUCTION,
    },
  });
}

/**
 * Generate/upsert slips for a month with multi-tenant isolation.
 * Automatically carries forward base + allowance from previous month,
 * and optionally aggregates attendance (OT hours, late minutes, unpaid leave).
 */
async function handlePOST(req: NextRequest) {
  const actor = staffContext();
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") throw new AccessError(400, "ข้อมูลไม่ถูกต้อง");
  const month = reqMonth(body.month);
  const syncAttendance = Boolean(body.syncAttendance);

  const entries = new Map<string, Partial<SlipAmounts>>();
  if (body.entries !== undefined) {
    if (!Array.isArray(body.entries) || body.entries.length > 1000) {
      throw new AccessError(400, "ข้อมูลไม่ถูกต้อง: entries");
    }
    for (const e of body.entries) {
      if (!e || typeof e !== "object") throw new AccessError(400, "ข้อมูลไม่ถูกต้อง: entries");
      const userId = reqId(e.userId, "userId");
      if (userId === actor.id && actor.role !== "ADMIN") {
        throw new AccessError(403, "ไม่สามารถแก้ไขสลิปเงินเดือนของตนเองได้");
      }
      entries.set(userId, parseAmounts(e));
    }
  }

  const monthRange = bangkokMonthRange(month);

  const result = await prisma.$transaction(async (tx) => {
    const users = await tx.user.findMany({
      where: {
        tenantId: actor.tenantId,
        isActive: true,
        branchId: { in: actor.branchIds },
      },
      select: { id: true, name: true, branchId: true },
    });

    for (const id of entries.keys()) {
      if (!users.some((u) => u.id === id)) throw new AccessError(404, "ไม่พบพนักงานในสาขาที่มีสิทธิ์");
    }

    const ids = users.map((u) => u.id);
    const [existing, previous, attendanceRecords] = await Promise.all([
      tx.payrollSlip.findMany({
        where: {
          tenantId: actor.tenantId,
          month,
          branchId: { in: actor.branchIds },
          userId: { in: ids },
        },
        select: slipSelect,
      }),
      tx.payrollSlip.findMany({
        where: {
          tenantId: actor.tenantId,
          month: prevMonth(month),
          branchId: { in: actor.branchIds },
          userId: { in: ids },
        },
        select: slipSelect,
      }),
      syncAttendance
        ? tx.attendanceRecord.findMany({
            where: {
              tenantId: actor.tenantId,
              userId: { in: ids },
              date: { gte: monthRange.start, lt: monthRange.end },
            },
            select: {
              userId: true,
              totalHours: true,
              overtimeHours: true,
              otMultiplier: true,
              lateMinutes: true,
              status: true,
            },
          })
        : Promise.resolve([]),
    ]);

    const existingBy = new Map(existing.map((s) => [s.userId, s]));
    const prevBy = new Map(previous.map((s) => [s.userId, s]));

    // Group attendance by user
    const attendanceByUser = new Map<string, { ot15: number; ot20: number; ot30: number; lateMins: number; absentDays: number }>();
    if (syncAttendance) {
      for (const r of attendanceRecords) {
        let stats = attendanceByUser.get(r.userId);
        if (!stats) {
          stats = { ot15: 0, ot20: 0, ot30: 0, lateMins: 0, absentDays: 0 };
          attendanceByUser.set(r.userId, stats);
        }
        const ot = r.overtimeHours || 0;
        const mult = r.otMultiplier || 1.5;
        if (mult === 1.5) stats.ot15 += ot;
        else if (mult === 2.0) stats.ot20 += ot;
        else if (mult === 3.0) stats.ot30 += ot;
        else stats.ot15 += ot;

        stats.lateMins += r.lateMinutes || 0;
        if (r.status === "ABSENT") stats.absentDays += 1;
      }
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const user of users) {
      const entry = entries.get(user.id);
      const current = existingBy.get(user.id);
      const att = attendanceByUser.get(user.id);

      if (current) {
        if (!entry || current.status !== "PENDING") {
          skipped += 1;
          continue;
        }
        const amounts: SlipAmounts = {
          ...amountsOf(current),
          ...entry,
        };
        const { ssoDeduction, netPayout } = computeSlip(amounts);
        await tx.payrollSlip.update({
          where: { id: current.id },
          data: { ...amounts, ssoDeduction, netPayout },
        });
        updated += 1;
        continue;
      }

      // Carry forward recurring items (base + allowance) from last month
      const prev = prevBy.get(user.id);
      const baseSalary = prev?.baseSalary ?? 0;
      const allowance = prev?.allowance ?? 0;

      let ot15Hours = 0;
      let ot20Hours = 0;
      let ot30Hours = 0;
      let overtimePay = 0;
      let lateDeduction = 0;
      let unpaidDeduction = 0;

      if (att) {
        ot15Hours = Math.round(att.ot15 * 10) / 10;
        ot20Hours = Math.round(att.ot20 * 10) / 10;
        ot30Hours = Math.round(att.ot30 * 10) / 10;
        overtimePay = calculateOtPay(baseSalary, ot15Hours, ot20Hours, ot30Hours);

        // Auto deduction rules if applicable:
        // Absent: 1 day = baseSalary / 30
        if (att.absentDays > 0 && baseSalary > 0) {
          unpaidDeduction = fromSatang(Math.round((baseSalary / 30) * att.absentDays * 100));
        }
        // Late deduction: e.g. 5 baht per minute over 15 mins if configured or 0
        if (att.lateMins > 60 && baseSalary > 0) {
          // deduction for excessive lateness (> 1 hr late)
          lateDeduction = fromSatang(Math.round((baseSalary / 30 / 8 / 60) * att.lateMins * 100));
        }
      }

      const amounts: SlipAmounts = {
        baseSalary,
        repairCommission: 0,
        salesCommission: 0,
        allowance,
        bonus: 0,
        overtimePay,
        ot15Hours,
        ot20Hours,
        ot30Hours,
        taxDeduction: 0,
        lateDeduction,
        unpaidDeduction,
        otherDeductions: 0,
        ...entry,
      };

      const { ssoDeduction, netPayout } = computeSlip(amounts);
      await tx.payrollSlip.create({
        data: {
          tenantId: actor.tenantId,
          userId: user.id,
          branchId: user.branchId,
          month,
          ...amounts,
          ssoDeduction,
          netPayout,
          status: "PENDING",
        },
      });
      created += 1;
    }

    await tx.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.id,
        module: "PAYROLL",
        action: "GENERATE",
        targetId: month,
        details: `สร้าง/ปรับปรุงเงินเดือนงวด ${month}: สร้าง ${created} แก้ไข ${updated} ข้าม ${skipped}`,
        afterJson: JSON.stringify({ month, created, updated, skipped, syncAttendance }),
        severity: "INFO",
      },
    });

    return { created, updated, skipped };
  });

  return NextResponse.json({ success: true, data: result });
}

/**
 * Body: { id, action: "UPDATE" | "APPROVE" | "REOPEN" | "PAY", ...amounts }.
 * UPDATE (A/M, PENDING only), APPROVE (A/M, PENDING->APPROVED), REOPEN (A/M, APPROVED->PENDING),
 * PAY (ADMIN only, APPROVED->PAID). PAID slips are immutable.
 */
async function handlePATCH(req: NextRequest) {
  const actor = staffContext();
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") throw new AccessError(400, "ข้อมูลไม่ถูกต้อง");
  const id = reqId(body.id, "id");
  const action = reqEnum(body.action, "action", ["UPDATE", "APPROVE", "REOPEN", "PAY"] as const);

  if (action === "PAY" && actor.role !== "ADMIN") {
    throw new AccessError(403, "เฉพาะผู้ดูแลระบบเท่านั้นที่บันทึกการจ่ายเงินเดือนได้");
  }

  const saved = await prisma.$transaction(async (tx) => {
    // Multi-tenant check
    const slip = await tx.payrollSlip.findFirst({
      where: {
        id,
        tenantId: actor.tenantId,
        branchId: { in: actor.branchIds },
      },
      select: slipSelect,
    });
    if (!slip) throw new AccessError(404, "ไม่พบสลิปเงินเดือน");
    if (slip.status === "PAID") throw new AccessError(409, "สลิปที่จ่ายแล้วไม่สามารถแก้ไขได้");

    // Payroll staff cannot change their own slip (except ADMIN)
    if (slip.userId === actor.id && actor.role !== "ADMIN") {
      throw new AccessError(403, "ไม่สามารถแก้ไขสลิปเงินเดือนของตนเองได้");
    }

    const required: Record<typeof action, string> = {
      UPDATE: "PENDING",
      APPROVE: "PENDING",
      REOPEN: "APPROVED",
      PAY: "APPROVED",
    };
    if (slip.status !== required[action]) {
      throw new AccessError(409, `ไม่สามารถทำรายการนี้กับสลิปสถานะ ${slip.status}`);
    }

    let data: Prisma.PayrollSlipUpdateManyMutationInput;
    let severity = "INFO";

    if (action === "UPDATE") {
      const amounts = { ...amountsOf(slip), ...parseAmounts(body) };
      const { ssoDeduction, netPayout } = computeSlip(amounts);
      data = { ...amounts, ssoDeduction, netPayout };
    } else if (action === "APPROVE") {
      data = { status: "APPROVED" };
    } else if (action === "REOPEN") {
      data = { status: "PENDING" };
    } else {
      data = { status: "PAID", paidDate: new Date() };
      severity = "WARNING";
    }

    // Conditional write ensuring status concurrency and tenant isolation
    const res = await tx.payrollSlip.updateMany({
      where: { id, tenantId: actor.tenantId, status: slip.status },
      data,
    });
    if (res.count !== 1) throw new AccessError(409, "สลิปถูกเปลี่ยนแปลงโดยผู้ใช้อื่น กรุณาโหลดใหม่");

    const after = await tx.payrollSlip.findFirst({
      where: { id, tenantId: actor.tenantId },
      select: slipSelect,
    });
    if (!after) throw new AccessError(404, "ไม่พบสลิปเงินเดือน");

    await tx.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.id,
        module: "PAYROLL",
        action: action === "PAY" ? "MARK_PAID" : action,
        targetId: id,
        details: `${action} สลิปเงินเดือน ${slip.user?.name ?? slip.userId} งวด ${slip.month} สุทธิ ${after.netPayout.toFixed(2)} บาท`,
        beforeJson: JSON.stringify({
          status: slip.status,
          ...amountsOf(slip),
          ssoDeduction: slip.ssoDeduction,
          netPayout: slip.netPayout,
        }),
        afterJson: JSON.stringify({
          status: after.status,
          ...amountsOf(after),
          ssoDeduction: after.ssoDeduction,
          netPayout: after.netPayout,
          paidDate: after.paidDate,
        }),
        severity,
      },
    });

    return after;
  });

  return NextResponse.json({ success: true, data: serialize(saved) });
}

export const GET = withStaff(handleGET, ["ADMIN", "MANAGER"]);
export const POST = withStaff(handlePOST, ["ADMIN", "MANAGER"]);
export const PATCH = withStaff(handlePATCH, ["ADMIN", "MANAGER"]);
