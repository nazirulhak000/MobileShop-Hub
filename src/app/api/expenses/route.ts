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
import { validateThaiTaxId } from "@/lib/utils";

export const dynamic = "force-dynamic";

const EXPENSE_CATEGORIES = [
  "RENT",
  "UTILITIES",
  "SUPPLIES",
  "SALARIES",
  "MAINTENANCE",
  "MARKETING",
  "CONSUMABLES",
  "WELFARE",
  "OTHER",
] as const;

type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

const PAYMENT_METHODS = [
  "CASH",
  "TRANSFER",
  "CREDIT_CARD",
  "PROMPTPAY",
  "CHEQUE",
] as const;

type PaymentMethod = (typeof PAYMENT_METHODS)[number];

const WHT_TYPES = ["PND3", "PND53"] as const;

const expenseSelect = {
  id: true,
  expenseNo: true,
  branchId: true,
  category: true,
  title: true,
  amount: true,
  date: true,
  paymentMethod: true,
  payee: true,
  payeeTaxId: true,
  taxInvoiceNo: true,
  isVatEligible: true,
  vatRate: true,
  vatAmount: true,
  whtRate: true,
  whtAmount: true,
  whtType: true,
  netPayment: true,
  notes: true,
  receiptUrl: true,
  createdAt: true,
  updatedAt: true,
  branch: { select: { id: true, name: true, code: true } },
  createdBy: { select: { id: true, name: true } },
} as const;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function reqText(value: unknown, field: string, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
    throw new AccessError(400, `ข้อมูลไม่ถูกต้อง: ${field}`);
  }
  return value.trim();
}

function optText(value: unknown, max: number): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new AccessError(400, "ข้อมูลตัวอักษรไม่ถูกต้อง");
  const trimmed = value.trim();
  if (trimmed.length > max) throw new AccessError(400, `ข้อความยาวเกินกำหนด (สูงสุด ${max} ตัวอักษร)`);
  return trimmed || null;
}

/** Strict "YYYY-MM-DD" that is a real calendar date. */
function reqDay(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AccessError(400, `วันที่ไม่ถูกต้อง: ${field}`);
  }
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) {
    throw new AccessError(400, `วันที่ไม่ถูกต้อง: ${field}`);
  }
  return value;
}

/** Optional receipt link: supports absolute http(s) URLs and local /uploads/ paths. */
function optReceiptUrl(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 1000) throw new AccessError(400, "ลิงก์ใบเสร็จไม่ถูกต้อง");
  const trimmed = value.trim();
  if (trimmed.startsWith("/uploads/")) {
    return trimmed;
  }
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
    return url.toString();
  } catch {
    throw new AccessError(400, "ลิงก์ใบเสร็จไม่ถูกต้อง");
  }
}

/** Validate 13-digit Thai tax ID if provided */
function optTaxId(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new AccessError(400, "เลขประจำตัวผู้เสียภาษีไม่ถูกต้อง");
  const cleaned = value.replace(/[^0-9]/g, "");
  if (!cleaned) return null;
  const result = validateThaiTaxId(cleaned);
  if (!result.valid) {
    throw new AccessError(400, result.message || "เลขประจำตัวผู้เสียภาษี 13 หลักไม่ถูกต้อง");
  }
  return cleaned;
}

async function handleGET(req: NextRequest) {
  const actor = staffContext();
  const params = new URL(req.url).searchParams;
  const month = params.get("month");
  if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new AccessError(400, "รูปแบบเดือนไม่ถูกต้อง (YYYY-MM)");
  }
  const targetMonth = month ?? bangkokDateString().slice(0, 7);
  const { start, end } = bangkokMonthRange(targetMonth);

  // 1. Multi-Tenant isolation: strictly scoped to actor.tenantId
  const where: Record<string, unknown> = {
    tenantId: actor.tenantId,
    date: { gte: start, lt: end },
  };

  const branchParam = params.get("branch");
  let branchFilter: Record<string, unknown>;
  if (branchParam && branchParam !== "ALL") {
    if (!actor.branchIds.includes(branchParam)) {
      throw new AccessError(404, "ไม่พบสาขาที่มีสิทธิ์");
    }
    where.branchId = branchParam;
    branchFilter = { branchId: branchParam };
  } else {
    where.branchId = { in: actor.branchIds };
    branchFilter = { branchId: { in: actor.branchIds } };
  }

  const category = params.get("category");
  if (category && category !== "ALL") {
    where.category = reqEnum(category, "category", EXPENSE_CATEGORIES);
  }

  const paymentMethod = params.get("paymentMethod");
  if (paymentMethod && paymentMethod !== "ALL") {
    where.paymentMethod = reqEnum(paymentMethod, "paymentMethod", PAYMENT_METHODS);
  }

  const vatParam = params.get("isVatEligible");
  if (vatParam === "true") where.isVatEligible = true;
  else if (vatParam === "false") where.isVatEligible = false;

  const search = params.get("search")?.trim();
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { expenseNo: { contains: search } },
      { payee: { contains: search } },
      { taxInvoiceNo: { contains: search } },
      { payeeTaxId: { contains: search } },
    ];
  }

  const take = takeParam(params.get("take"), 200, 1000);
  const skip = Math.max(0, parseInt(params.get("skip") || "0", 10) || 0);

  // 2. Fetch paginated records, all category sums, payment method sums, and tax totals
  const [items, allExpensesInMonth, salesAgg] = await Promise.all([
    prisma.shopExpense.findMany({
      where,
      select: expenseSelect,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take,
      skip,
    }),
    // Query entire month for accurate KPI cards & analytics
    prisma.shopExpense.findMany({
      where: {
        tenantId: actor.tenantId,
        ...branchFilter,
        date: { gte: start, lt: end },
      },
      select: {
        category: true,
        amount: true,
        paymentMethod: true,
        isVatEligible: true,
        vatAmount: true,
        whtRate: true,
        whtAmount: true,
        whtType: true,
        netPayment: true,
      },
    }),
    // P&L context: sales revenue in this month and branch scope
    prisma.sale.aggregate({
      where: {
        tenantId: actor.tenantId,
        ...branchFilter,
        status: "COMPLETED",
        createdAt: { gte: start, lt: end },
      },
      _sum: { netAmount: true, vatAmount: true },
    }),
  ]);

  // 3. Compute detailed category, payment, and tax aggregates
  const byCategory: Record<string, { amount: number; count: number }> = {};
  const byPaymentMethod: Record<string, { amount: number; count: number }> = {};
  let totalAmount = 0;
  let totalInputVat = 0;
  let eligibleExpenseAmount = 0;
  let eligibleCount = 0;
  let totalWht = 0;
  let whtPnd3 = 0;
  let whtPnd53 = 0;
  let whtCount = 0;
  let totalNetPayment = 0;

  for (const exp of allExpensesInMonth) {
    const amt = round2(exp.amount);
    totalAmount += amt;

    // Category breakdown
    if (!byCategory[exp.category]) byCategory[exp.category] = { amount: 0, count: 0 };
    byCategory[exp.category].amount = round2(byCategory[exp.category].amount + amt);
    byCategory[exp.category].count += 1;

    // Payment method breakdown
    const pm = exp.paymentMethod || "CASH";
    if (!byPaymentMethod[pm]) byPaymentMethod[pm] = { amount: 0, count: 0 };
    byPaymentMethod[pm].amount = round2(byPaymentMethod[pm].amount + amt);
    byPaymentMethod[pm].count += 1;

    // Tax & VAT
    if (exp.isVatEligible) {
      eligibleCount += 1;
      eligibleExpenseAmount = round2(eligibleExpenseAmount + amt);
      totalInputVat = round2(totalInputVat + (exp.vatAmount || 0));
    }

    // WHT
    if (exp.whtAmount && exp.whtAmount > 0) {
      whtCount += 1;
      const wAmt = round2(exp.whtAmount);
      totalWht = round2(totalWht + wAmt);
      if (exp.whtType === "PND3") whtPnd3 = round2(whtPnd3 + wAmt);
      if (exp.whtType === "PND53") whtPnd53 = round2(whtPnd53 + wAmt);
    }

    const net = exp.netPayment !== null && exp.netPayment !== undefined ? exp.netPayment : amt - (exp.whtAmount || 0);
    totalNetPayment = round2(totalNetPayment + net);
  }

  // 4. Profit & Loss Context
  const grossSales = salesAgg._sum.netAmount ?? 0;
  const salesVatOutput = salesAgg._sum.vatAmount ?? 0;
  const salesRevenue = round2(grossSales - salesVatOutput);
  const operatingProfit = round2(salesRevenue - totalAmount);
  const opexRatio = salesRevenue > 0 ? round2((totalAmount / salesRevenue) * 100) : 0;

  // 5. Monthly Trend: 6-month historical lookback
  const trendMonths: Array<{ month: string; amount: number; count: number }> = [];
  const [targetY, targetM] = targetMonth.split("-").map(Number);
  for (let i = 5; i >= 0; i--) {
    let y = targetY;
    let m = targetM - i;
    while (m < 1) {
      y -= 1;
      m += 12;
    }
    const mStr = `${y}-${String(m).padStart(2, "0")}`;
    const range = bangkokMonthRange(mStr);
    const monthAgg = await prisma.shopExpense.aggregate({
      where: {
        tenantId: actor.tenantId,
        ...branchFilter,
        date: { gte: range.start, lt: range.end },
      },
      _sum: { amount: true },
      _count: { _all: true },
    });
    trendMonths.push({
      month: mStr,
      amount: round2(monthAgg._sum.amount ?? 0),
      count: monthAgg._count._all,
    });
  }

  return NextResponse.json({
    success: true,
    data: items.map((e) => ({
      ...e,
      date: bangkokDateString(e.date),
      amount: round2(e.amount),
      vatAmount: round2(e.vatAmount),
      whtAmount: round2(e.whtAmount),
      netPayment: round2(e.netPayment ?? e.amount - e.whtAmount),
    })),
    totals: {
      total: round2(totalAmount),
      count: allExpensesInMonth.length,
      byCategory,
      byPaymentMethod,
      taxSummary: {
        totalInputVat: round2(totalInputVat),
        eligibleExpenseAmount: round2(eligibleExpenseAmount),
        eligibleCount,
        totalWht: round2(totalWht),
        whtPnd3: round2(whtPnd3),
        whtPnd53: round2(whtPnd53),
        whtCount,
        totalNetPayment: round2(totalNetPayment),
      },
    },
    analytics: {
      salesRevenue,
      grossSales: round2(grossSales),
      salesVatOutput: round2(salesVatOutput),
      totalOpex: round2(totalAmount),
      operatingProfit,
      opexRatio,
      monthlyTrend: trendMonths,
    },
    truncated: allExpensesInMonth.length > items.length,
  });
}

async function handlePOST(req: NextRequest) {
  const actor = staffContext();
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") throw new AccessError(400, "ข้อมูลไม่ถูกต้อง");

  const title = reqText(body.title ?? body.description, "title", 300);
  const category = reqEnum(body.category, "category", EXPENSE_CATEGORIES);
  const amount = reqMoney(body.amount, "amount", 0.01, 10_000_000);
  const paymentMethod = body.paymentMethod
    ? reqEnum(body.paymentMethod, "paymentMethod", PAYMENT_METHODS)
    : "CASH";

  const day = reqDay(body.date ?? bangkokDateString(), "date");
  if (day > bangkokDateString()) {
    throw new AccessError(400, "ไม่สามารถบันทึกค่าใช้จ่ายล่วงหน้าได้");
  }

  const branchId = optId(body.branchId, "branchId") ?? actor.branchId;
  if (!actor.branchIds.includes(branchId)) {
    throw new AccessError(404, "ไม่พบสาขาที่มีสิทธิ์");
  }

  const payee = optText(body.payee ?? body.vendor, 200);
  const payeeTaxId = optTaxId(body.payeeTaxId);
  const taxInvoiceNo = optText(body.taxInvoiceNo, 100);
  const receiptUrl = optReceiptUrl(body.receiptUrl);
  const notes = optText(body.notes, 1000);

  // Tax Integration calculations
  const isVatEligible = Boolean(body.isVatEligible);
  let vatRate = 0;
  let vatAmount = 0;
  if (isVatEligible) {
    vatRate = typeof body.vatRate === "number" && body.vatRate >= 0 ? body.vatRate : 7.0;
    if (typeof body.vatAmount === "number" && body.vatAmount >= 0) {
      vatAmount = round2(body.vatAmount);
    } else {
      // Standard Thai VAT: Amount is inclusive -> Base = Amount / 1.07 -> VAT = Amount - Base
      const base = round2(amount / (1 + vatRate / 100));
      vatAmount = round2(amount - base);
    }
  }

  // WHT Withholding Tax calculation
  let whtRate = 0;
  let whtAmount = 0;
  let whtType: "PND3" | "PND53" | null = null;
  if (typeof body.whtRate === "number" && body.whtRate > 0) {
    whtRate = body.whtRate;
    whtType = body.whtType ? (reqEnum(body.whtType, "whtType", WHT_TYPES) as "PND3" | "PND53") : "PND53";
    if (typeof body.whtAmount === "number" && body.whtAmount >= 0) {
      whtAmount = round2(body.whtAmount);
    } else {
      // Base for WHT is amount excluding VAT
      const baseForWht = isVatEligible ? round2(amount / (1 + vatRate / 100)) : amount;
      whtAmount = round2(baseForWht * (whtRate / 100));
    }
  }

  const netPayment = round2(amount - whtAmount);

  // Stored as Bangkok midnight UTC timestamp
  const date = bangkokDayRange(day).start;
  const yyyymm = bangkokYYYYMM();

  const created = await prisma.$transaction(async (tx) => {
    // Multi-tenant sequence counter prefix
    const sequenceKey = `EXP-${actor.tenantId}-${yyyymm}`;
    const counter = await tx.sequenceCounter.upsert({
      where: { id: sequenceKey },
      update: { current: { increment: 1 } },
      create: { id: sequenceKey, current: 1 },
    });
    const expenseNo = `EXP-${yyyymm}-${String(counter.current).padStart(3, "0")}`;

    const expense = await tx.shopExpense.create({
      data: {
        tenantId: actor.tenantId,
        expenseNo,
        branchId,
        category,
        title,
        amount,
        date,
        paymentMethod,
        payee,
        payeeTaxId,
        taxInvoiceNo,
        isVatEligible,
        vatRate,
        vatAmount,
        whtRate,
        whtAmount,
        whtType,
        netPayment,
        notes,
        receiptUrl,
        createdById: actor.id,
      },
      select: expenseSelect,
    });

    await tx.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.id,
        module: "EXPENSES",
        action: "CREATE",
        targetId: expense.id,
        details: `บันทึกค่าใช้จ่าย ${expenseNo} ${title} ${amount.toFixed(2)} บาท [${paymentMethod}]${
          isVatEligible ? ` ภาษีซื้อ ${vatAmount.toFixed(2)}บ.` : ""
        }${whtAmount > 0 ? ` หัก ณ ที่จ่าย ${whtAmount.toFixed(2)}บ.` : ""}`,
        afterJson: JSON.stringify({
          expenseNo,
          branchId,
          category,
          title,
          amount,
          date: day,
          paymentMethod,
          payee,
          payeeTaxId,
          taxInvoiceNo,
          isVatEligible,
          vatAmount,
          whtRate,
          whtAmount,
          whtType,
          netPayment,
          receiptUrl,
        }),
        severity: "INFO",
      },
    });

    return expense;
  });

  return NextResponse.json(
    {
      success: true,
      data: {
        ...created,
        date: bangkokDateString(created.date),
        amount: round2(created.amount),
        vatAmount: round2(created.vatAmount),
        whtAmount: round2(created.whtAmount),
        netPayment: round2(created.netPayment ?? created.amount - created.whtAmount),
      },
    },
    { status: 201 }
  );
}

async function handlePUT(req: NextRequest) {
  const actor = staffContext();
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") throw new AccessError(400, "ข้อมูลไม่ถูกต้อง");

  const id = reqId(body.id, "id");

  // Multi-tenant verification: check record belongs to actor.tenantId
  const existing = await prisma.shopExpense.findFirst({
    where: {
      id,
      tenantId: actor.tenantId,
      branchId: { in: actor.branchIds },
    },
  });

  if (!existing) {
    throw new AccessError(404, "ไม่พบรายการค่าใช้จ่ายหรือไม่มีสิทธิ์แก้ไข");
  }

  const title = body.title !== undefined ? reqText(body.title, "title", 300) : existing.title;
  const category = body.category !== undefined ? reqEnum(body.category, "category", EXPENSE_CATEGORIES) : existing.category;
  const amount = body.amount !== undefined ? reqMoney(body.amount, "amount", 0.01, 10_000_000) : existing.amount;
  const paymentMethod = body.paymentMethod !== undefined
    ? reqEnum(body.paymentMethod, "paymentMethod", PAYMENT_METHODS)
    : existing.paymentMethod;

  let date = existing.date;
  let day = bangkokDateString(existing.date);
  if (body.date !== undefined) {
    day = reqDay(body.date, "date");
    if (day > bangkokDateString()) {
      throw new AccessError(400, "ไม่สามารถบันทึกค่าใช้จ่ายล่วงหน้าได้");
    }
    date = bangkokDayRange(day).start;
  }

  let branchId = existing.branchId;
  if (body.branchId !== undefined) {
    const bId = reqId(body.branchId, "branchId");
    if (!actor.branchIds.includes(bId)) {
      throw new AccessError(404, "ไม่พบสาขาที่มีสิทธิ์");
    }
    branchId = bId;
  }

  const payee = body.payee !== undefined ? optText(body.payee, 200) : existing.payee;
  const payeeTaxId = body.payeeTaxId !== undefined ? optTaxId(body.payeeTaxId) : existing.payeeTaxId;
  const taxInvoiceNo = body.taxInvoiceNo !== undefined ? optText(body.taxInvoiceNo, 100) : existing.taxInvoiceNo;
  const receiptUrl = body.receiptUrl !== undefined ? optReceiptUrl(body.receiptUrl) : existing.receiptUrl;
  const notes = body.notes !== undefined ? optText(body.notes, 1000) : existing.notes;

  const isVatEligible = body.isVatEligible !== undefined ? Boolean(body.isVatEligible) : existing.isVatEligible;
  let vatRate = 0;
  let vatAmount = 0;
  if (isVatEligible) {
    vatRate = typeof body.vatRate === "number" && body.vatRate >= 0 ? body.vatRate : existing.vatRate || 7.0;
    if (typeof body.vatAmount === "number" && body.vatAmount >= 0) {
      vatAmount = round2(body.vatAmount);
    } else {
      const base = round2(amount / (1 + vatRate / 100));
      vatAmount = round2(amount - base);
    }
  }

  let whtRate = 0;
  let whtAmount = 0;
  let whtType: "PND3" | "PND53" | null = null;
  const inputWhtRate = body.whtRate !== undefined ? body.whtRate : existing.whtRate;
  if (typeof inputWhtRate === "number" && inputWhtRate > 0) {
    whtRate = inputWhtRate;
    const inputWhtType = body.whtType !== undefined ? body.whtType : existing.whtType;
    whtType = inputWhtType ? (reqEnum(inputWhtType, "whtType", WHT_TYPES) as "PND3" | "PND53") : "PND53";
    if (typeof body.whtAmount === "number" && body.whtAmount >= 0) {
      whtAmount = round2(body.whtAmount);
    } else {
      const baseForWht = isVatEligible ? round2(amount / (1 + vatRate / 100)) : amount;
      whtAmount = round2(baseForWht * (whtRate / 100));
    }
  }

  const netPayment = round2(amount - whtAmount);

  const updated = await prisma.$transaction(async (tx) => {
    const exp = await tx.shopExpense.update({
      where: { id },
      data: {
        title,
        category,
        amount,
        paymentMethod,
        date,
        branchId,
        payee,
        payeeTaxId,
        taxInvoiceNo,
        isVatEligible,
        vatRate,
        vatAmount,
        whtRate,
        whtAmount,
        whtType,
        netPayment,
        notes,
        receiptUrl,
      },
      select: expenseSelect,
    });

    await tx.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.id,
        module: "EXPENSES",
        action: "UPDATE",
        targetId: id,
        details: `แก้ไขค่าใช้จ่าย ${exp.expenseNo} ${title} ${amount.toFixed(2)} บาท`,
        beforeJson: JSON.stringify(existing),
        afterJson: JSON.stringify(exp),
        severity: "INFO",
      },
    });

    return exp;
  });

  return NextResponse.json({
    success: true,
    data: {
      ...updated,
      date: bangkokDateString(updated.date),
      amount: round2(updated.amount),
      vatAmount: round2(updated.vatAmount),
      whtAmount: round2(updated.whtAmount),
      netPayment: round2(updated.netPayment ?? updated.amount - updated.whtAmount),
    },
  });
}

async function handleDELETE(req: NextRequest) {
  const actor = staffContext();
  const id = reqId(new URL(req.url).searchParams.get("id"), "id");

  await prisma.$transaction(async (tx) => {
    // Multi-tenant check: tenantId must match actor.tenantId
    const existing = await tx.shopExpense.findFirst({
      where: {
        id,
        tenantId: actor.tenantId,
        branchId: { in: actor.branchIds },
      },
      select: expenseSelect,
    });

    if (!existing) {
      throw new AccessError(404, "ไม่พบรายการค่าใช้จ่ายหรือไม่มีสิทธิ์ลบ");
    }

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

export const GET = withStaff(handleGET, ["ADMIN", "MANAGER", "TECHNICIAN", "SALE"]);
export const POST = withStaff(handlePOST, ["ADMIN", "MANAGER"]);
export const PUT = withStaff(handlePUT, ["ADMIN", "MANAGER"]);
export const DELETE = withStaff(handleDELETE, ["ADMIN"]);
