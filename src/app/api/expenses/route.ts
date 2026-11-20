import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AccessError, staffContext } from "@/lib/staff-context";
import {
  bangkokDateString,
  bangkokDayRange,
  bangkokMonthRange,
  bangkokYYYYMM,
  optId,
  reqEnum,
  reqId,
  reqMoney,
  takeParam,
  withStaff,
} from "@/lib/staff-http";

// Must match the categories offered by the expenses page.
const EXPENSE_CATEGORIES = ["RENT", "UTILITIES", "CONSUMABLES", "MARKETING", "MAINTENANCE", "WELFARE", "OTHER"] as const;

const expenseSelect = {
  id: true,
  expenseNo: true,
  branchId: true,
  category: true,
  title: true,
  amount: true,
  date: true,
  receiptUrl: true,
  createdAt: true,
  branch: { select: { id: true, name: true, code: true } },
  createdBy: { select: { id: true, name: true } },
} as const;

function reqText(value: unknown, field: string, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw new AccessError(400, `ข้อมูลไม่ถูกต้อง: ${field}`);
  return value.trim();
}

/** Strict "YYYY-MM-DD" that is a real calendar date. */
function reqDay(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new AccessError(400, `วันที่ไม่ถูกต้อง: ${field}`);
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) throw new AccessError(400, `วันที่ไม่ถูกต้อง: ${field}`);
  return value;
}

/** Optional receipt link: only absolute http(s) URLs are stored. */
function optUrl(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 1000) throw new AccessError(400, "ลิงก์ใบเสร็จไม่ถูกต้อง");
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
    return url.toString();
  } catch {
    throw new AccessError(400, "ลิงก์ใบเสร็จไม่ถูกต้อง");
  }
}

async function handleGET(req: NextRequest) {
  const actor = staffContext();
  const params = new URL(req.url).searchParams;
  const month = params.get("month");
  if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new AccessError(400, "รูปแบบเดือนไม่ถูกต้อง (YYYY-MM)");
  const { start, end } = bangkokMonthRange(month ?? undefined);

  const where: Record<string, unknown> = {
    tenantId: actor.tenantId,
    date: { gte: start, lt: end },
  };
  const branch = optId(params.get("branch"), "branch");
  if (branch) {
    if (!actor.branchIds.includes(branch)) throw new AccessError(404, "ไม่พบสาขาที่มีสิทธิ์");
    where.branchId = branch;
  } else {
    where.branchId = { in: actor.branchIds };
  }
  const category = params.get("category");
  if (category && category !== "ALL") where.category = reqEnum(category, "category", EXPENSE_CATEGORIES);

  const take = takeParam(params.get("take"), 200, 500);
  const [items, grouped] = await Promise.all([
    prisma.shopExpense.findMany({ where, select: expenseSelect, orderBy: [{ date: "desc" }, { createdAt: "desc" }], take }),
    prisma.shopExpense.groupBy({ by: ["category"], where, _sum: { amount: true }, _count: { _all: true } }),
  ]);

  // Totals cover the whole filter, not just the returned page.
  const byCategory: Record<string, { amount: number; count: number }> = {};
  let total = 0;
  let count = 0;
  for (const g of grouped) {
    const amount = Math.round((g._sum.amount ?? 0) * 100) / 100;
    byCategory[g.category] = { amount, count: g._count._all };
    total += amount;
    count += g._count._all;
  }

  return NextResponse.json({
    success: true,
    data: items.map(e => ({ ...e, date: bangkokDateString(e.date) })),
    totals: { total: Math.round(total * 100) / 100, count, byCategory },
    truncated: count > items.length,
  });
}

async function handlePOST(req: NextRequest) {
  const actor = staffContext();
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") throw new AccessError(400, "ข้อมูลไม่ถูกต้อง");

  const title = reqText(body.title ?? body.description, "title", 300);
  const category = reqEnum(body.category, "category", EXPENSE_CATEGORIES);
  const amount = reqMoney(body.amount, "amount", 0.01, 10_000_000);
  const day = reqDay(body.date ?? bangkokDateString(), "date");
  if (day > bangkokDateString()) throw new AccessError(400, "ไม่สามารถบันทึกค่าใช้จ่ายล่วงหน้าได้");
  const receiptUrl = optUrl(body.receiptUrl);
  const branchId = optId(body.branchId, "branchId") ?? actor.branchId;
  if (!actor.branchIds.includes(branchId)) throw new AccessError(404, "ไม่พบสาขาที่มีสิทธิ์");

  // Stored as the UTC instant of Bangkok midnight for that calendar day.
  const date = bangkokDayRange(day).start;
  const yyyymm = bangkokYYYYMM();

  const created = await prisma.$transaction(async tx => {
    const counter = await tx.sequenceCounter.upsert({
      where: { id: `EXP-${yyyymm}` },
      update: { current: { increment: 1 } },
      create: { id: `EXP-${yyyymm}`, current: 1 },
    });
    const expenseNo = `EXP-${yyyymm}-${String(counter.current).padStart(3, "0")}`;
    const expense = await tx.shopExpense.create({
      data: { tenantId: actor.tenantId, expenseNo, branchId, category, title, amount, date, receiptUrl, createdById: actor.id },
      select: expenseSelect,
    });
    await tx.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.id,
        module: "EXPENSES",
        action: "CREATE",
        targetId: expense.id,
        details: `บันทึกค่าใช้จ่าย ${expenseNo} ${title} ${amount.toFixed(2)} บาท`,
        afterJson: JSON.stringify({ expenseNo, branchId, category, title, amount, date: day, receiptUrl }),
        severity: "INFO",
      },
    });
    return expense;
  });

  return NextResponse.json({ success: true, data: { ...created, date: bangkokDateString(created.date) } }, { status: 201 });
}

async function handleDELETE(req: NextRequest) {
  const actor = staffContext();
  const id = reqId(new URL(req.url).searchParams.get("id"), "id");

  await prisma.$transaction(async tx => {
    const existing = await tx.shopExpense.findFirst({
      where: { id, tenantId: actor.tenantId, branchId: { in: actor.branchIds } },
      select: expenseSelect,
    });
    if (!existing) throw new AccessError(404, "ไม่พบรายการค่าใช้จ่าย");
    await tx.shopExpense.delete({ where: { id } });
    await tx.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.id,
        module: "EXPENSES",
        action: "DELETE",
        targetId: id,
        details: `ลบค่าใช้จ่าย ${existing.expenseNo} ${existing.title} ${existing.amount.toFixed(2)} บาท`,
        beforeJson: JSON.stringify({ ...existing, date: bangkokDateString(existing.date) }),
        severity: "WARNING",
      },
    });
  });

  return NextResponse.json({ success: true });
}

export const GET = withStaff(handleGET, ["ADMIN", "MANAGER"]);
export const POST = withStaff(handlePOST, ["ADMIN", "MANAGER"]);
export const DELETE = withStaff(handleDELETE, ["ADMIN"]);
