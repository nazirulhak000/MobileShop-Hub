import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AccessError, staffContext } from "@/lib/staff-context";
import { bangkokDateString, reqEnum, reqId, reqMoney, withStaff } from "@/lib/staff-http";

// ---------- Thai Social Security (SSO) — change here when the law changes ----------
// Section 33 contribution: 5% of monthly wage, wage base clamped to [MIN, MAX].
// MAX raised from 15,000 to 17,500 THB effective 1 Jan 2026 => max 875 THB/month.
const SSO_RATE = 0.05;
const SSO_WAGE_MIN = 1_650;
const SSO_WAGE_MAX = 17_500;
/** Employer contributes the same amount as the employee. */
const SSO_EMPLOYER_MATCH = 1;

const MONEY_FIELDS = ["baseSalary", "repairCommission", "salesCommission", "allowance", "overtimePay", "taxDeduction", "otherDeductions"] as const;
type MoneyField = (typeof MONEY_FIELDS)[number];
type SlipAmounts = Record<MoneyField, number>;

const slipSelect = {
  id: true,
  userId: true,
  branchId: true,
  month: true,
  baseSalary: true,
  repairCommission: true,
  salesCommission: true,
  allowance: true,
  overtimePay: true,
  ssoDeduction: true,
  taxDeduction: true,
  otherDeductions: true,
  netPayout: true,
  status: true,
  paidDate: true,
  updatedAt: true,
  user: { select: { id: true, name: true, role: true, isActive: true } },
  branch: { select: { id: true, name: true, code: true } },
} as const;
type SlipRow = Prisma.PayrollSlipGetPayload<{ select: typeof slipSelect }>;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Gross wage = base + commissions + allowance + OT (all count as SSO wages). */
function grossOf(a: SlipAmounts) {
  return round2(a.baseSalary + a.repairCommission + a.salesCommission + a.allowance + a.overtimePay);
}
/** Employee SSO contribution in whole baht (0 when there is no wage). */
function ssoOf(gross: number) {
  if (gross <= 0) return 0;
  const base = Math.min(Math.max(gross, SSO_WAGE_MIN), SSO_WAGE_MAX);
  return Math.round(base * SSO_RATE);
}
function computeSlip(a: SlipAmounts) {
  const gross = grossOf(a);
  const ssoDeduction = ssoOf(gross);
  const netPayout = round2(gross - ssoDeduction - a.taxDeduction - a.otherDeductions);
  if (netPayout < 0) throw new AccessError(400, "ยอดหักมากกว่ารายได้ เงินได้สุทธิติดลบ");
  return { gross, ssoDeduction, netPayout };
}
function serialize(s: SlipRow) {
  const gross = grossOf(s);
  return {
    ...s,
    gross,
    employerSso: round2(s.ssoDeduction * SSO_EMPLOYER_MATCH),
    paidDate: s.paidDate ? bangkokDateString(s.paidDate) : null,
  };
}
function reqMonth(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) throw new AccessError(400, "รูปแบบเดือนไม่ถูกต้อง (YYYY-MM)");
  // Allow up to next month (prepare payroll early), never further.
  const now = bangkokDateString().slice(0, 7);
  const [y, m] = now.split("-").map(Number);
  const next = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}`;
  if (value > next) throw new AccessError(400, "ไม่สามารถสร้างเงินเดือนล่วงหน้าเกิน 1 เดือน");
  return value;
}
function prevMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}
/** Parse provided money fields only (undefined = keep). */
function parseAmounts(body: Record<string, unknown>): Partial<SlipAmounts> {
  const out: Partial<SlipAmounts> = {};
  for (const f of MONEY_FIELDS) if (body[f] !== undefined && body[f] !== null && body[f] !== "") out[f] = reqMoney(body[f], f, 0, 10_000_000);
  return out;
}
function amountsOf(s: SlipAmounts): SlipAmounts {
  return Object.fromEntries(MONEY_FIELDS.map(f => [f, s[f]])) as SlipAmounts;
}

async function handleGET(req: NextRequest) {
  const month = reqMonth(new URL(req.url).searchParams.get("month") ?? bangkokDateString().slice(0, 7));
  const [slips, activeUsers] = await Promise.all([
    prisma.payrollSlip.findMany({ where: { month }, select: slipSelect, orderBy: [{ branchId: "asc" }, { createdAt: "asc" }] }),
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true, role: true, branchId: true } }),
  ]);
  const withSlip = new Set(slips.map(s => s.userId));
  const data = slips.map(serialize);
  const summary = data.reduce(
    (acc, s) => {
      acc.count += 1;
      acc.baseSalary += s.baseSalary;
      acc.repairCommission += s.repairCommission;
      acc.salesCommission += s.salesCommission;
      acc.gross += s.gross;
      acc.sso += s.ssoDeduction;
      acc.employerSso += s.employerSso;
      acc.tax += s.taxDeduction;
      acc.net += s.netPayout;
      return acc;
    },
    { count: 0, baseSalary: 0, repairCommission: 0, salesCommission: 0, gross: 0, sso: 0, employerSso: 0, tax: 0, net: 0 }
  );
  return NextResponse.json({
    success: true,
    month,
    data,
    summary: Object.fromEntries(Object.entries(summary).map(([k, v]) => [k, round2(v)])),
    usersWithoutSlip: activeUsers.filter(u => !withSlip.has(u.id)),
    policy: { ssoRate: SSO_RATE, ssoWageMin: SSO_WAGE_MIN, ssoWageMax: SSO_WAGE_MAX, ssoMax: Math.round(SSO_WAGE_MAX * SSO_RATE) },
  });
}

/**
 * Generate/upsert slips for a month. Body: { month, entries?: [{ userId, baseSalary?, allowance?, ... }] }.
 * Creates a PENDING slip for every active user without one (amounts from `entries`, else carried
 * forward from last month's slip, else 0). Existing PENDING slips are updated only when an entry is given;
 * APPROVED/PAID slips are never touched.
 */
async function handlePOST(req: NextRequest) {
  const actor = staffContext();
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") throw new AccessError(400, "ข้อมูลไม่ถูกต้อง");
  const month = reqMonth(body.month);
  const entries = new Map<string, Partial<SlipAmounts>>();
  if (body.entries !== undefined) {
    if (!Array.isArray(body.entries) || body.entries.length > 1000) throw new AccessError(400, "ข้อมูลไม่ถูกต้อง: entries");
    for (const e of body.entries) {
      if (!e || typeof e !== "object") throw new AccessError(400, "ข้อมูลไม่ถูกต้อง: entries");
      const userId = reqId(e.userId, "userId");
      if (userId === actor.id && actor.role !== "ADMIN") throw new AccessError(403, "ไม่สามารถแก้ไขสลิปเงินเดือนของตนเองได้");
      entries.set(userId, parseAmounts(e));
    }
  }

  const result = await prisma.$transaction(async tx => {
    const users = await tx.user.findMany({ where: { isActive: true }, select: { id: true, name: true, branchId: true } });
    for (const id of entries.keys()) if (!users.some(u => u.id === id)) throw new AccessError(404, "ไม่พบพนักงานในสาขาที่มีสิทธิ์");
    const ids = users.map(u => u.id);
    const [existing, previous] = await Promise.all([
      tx.payrollSlip.findMany({ where: { month, userId: { in: ids } }, select: slipSelect }),
      tx.payrollSlip.findMany({ where: { month: prevMonth(month), userId: { in: ids } }, select: slipSelect }),
    ]);
    const existingBy = new Map(existing.map(s => [s.userId, s]));
    const prevBy = new Map(previous.map(s => [s.userId, s]));
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const user of users) {
      const entry = entries.get(user.id);
      const current = existingBy.get(user.id);
      if (current) {
        if (!entry || current.status !== "PENDING") {
          skipped += 1;
          continue;
        }
        const amounts = { ...amountsOf(current), ...entry };
        const { ssoDeduction, netPayout } = computeSlip(amounts);
        await tx.payrollSlip.update({ where: { id: current.id }, data: { ...amounts, ssoDeduction, netPayout } });
        updated += 1;
        continue;
      }
      // Carry forward recurring items (base + allowance) from last month; commissions/OT/deductions start at 0.
      const prev = prevBy.get(user.id);
      const amounts: SlipAmounts = {
        baseSalary: prev?.baseSalary ?? 0,
        repairCommission: 0,
        salesCommission: 0,
        allowance: prev?.allowance ?? 0,
        overtimePay: 0,
        taxDeduction: 0,
        otherDeductions: 0,
        ...entry,
      };
      const { ssoDeduction, netPayout } = computeSlip(amounts);
      await tx.payrollSlip.create({ data: { userId: user.id, branchId: user.branchId, month, ...amounts, ssoDeduction, netPayout, status: "PENDING" } });
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
        afterJson: JSON.stringify({ month, created, updated, skipped, entries: Object.fromEntries(entries) }),
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
  if (action === "PAY" && actor.role !== "ADMIN") throw new AccessError(403, "เฉพาะผู้ดูแลระบบเท่านั้นที่บันทึกการจ่ายเงินเดือนได้");

  const saved = await prisma.$transaction(async tx => {
    const slip = await tx.payrollSlip.findFirst({ where: { id }, select: slipSelect });
    if (!slip) throw new AccessError(404, "ไม่พบสลิปเงินเดือน");
    if (slip.status === "PAID") throw new AccessError(409, "สลิปที่จ่ายแล้วไม่สามารถแก้ไขได้");
    // Payroll staff cannot change their own slip (except ADMIN, who is the final authority).
    if (slip.userId === actor.id && actor.role !== "ADMIN") throw new AccessError(403, "ไม่สามารถแก้ไขสลิปเงินเดือนของตนเองได้");

    const required: Record<typeof action, string> = { UPDATE: "PENDING", APPROVE: "PENDING", REOPEN: "APPROVED", PAY: "APPROVED" };
    if (slip.status !== required[action]) throw new AccessError(409, `ไม่สามารถทำรายการนี้กับสลิปสถานะ ${slip.status}`);

    let data: Prisma.PayrollSlipUpdateManyMutationInput;
    let severity = "INFO";
    if (action === "UPDATE") {
      const amounts = { ...amountsOf(slip), ...parseAmounts(body) };
      const { ssoDeduction, netPayout } = computeSlip(amounts);
      data = { ...amounts, ssoDeduction, netPayout };
    } else if (action === "APPROVE") data = { status: "APPROVED" };
    else if (action === "REOPEN") data = { status: "PENDING" };
    else {
      data = { status: "PAID", paidDate: new Date() };
      severity = "WARNING";
    }

    // Conditional write: fails if another request changed the status meanwhile.
    const res = await tx.payrollSlip.updateMany({ where: { id, status: slip.status }, data });
    if (res.count !== 1) throw new AccessError(409, "สลิปถูกเปลี่ยนแปลงโดยผู้ใช้อื่น กรุณาโหลดใหม่");
    const after = await tx.payrollSlip.findFirst({ where: { id }, select: slipSelect });
    if (!after) throw new AccessError(404, "ไม่พบสลิปเงินเดือน");

    await tx.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.id,
        module: "PAYROLL",
        action: action === "PAY" ? "MARK_PAID" : action,
        targetId: id,
        details: `${action} สลิปเงินเดือน ${slip.user?.name ?? slip.userId} งวด ${slip.month} สุทธิ ${after.netPayout.toFixed(2)} บาท`,
        beforeJson: JSON.stringify({ status: slip.status, ...amountsOf(slip), ssoDeduction: slip.ssoDeduction, netPayout: slip.netPayout }),
        afterJson: JSON.stringify({ status: after.status, ...amountsOf(after), ssoDeduction: after.ssoDeduction, netPayout: after.netPayout, paidDate: after.paidDate }),
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
