import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { AccessError, staffContext } from "@/lib/staff-context";
import { bangkokDateString, bangkokMonthRange, withStaff } from "@/lib/staff-http";

export const dynamic = "force-dynamic";

const MAX_MONTHS = 24;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const round2 = (n: number) => Math.round(n * 100) / 100;

function monthList(from: string, to: string): string[] {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  const count = (ty - fy) * 12 + (tm - fm) + 1;
  if (count < 1) throw new AccessError(400, "ช่วงเดือนไม่ถูกต้อง (from ต้องไม่เกิน to)");
  if (count > MAX_MONTHS) throw new AccessError(400, `เลือกช่วงได้สูงสุด ${MAX_MONTHS} เดือน`);
  return Array.from({ length: count }, (_, i) => {
    const total = fm - 1 + i;
    return `${fy + Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
  });
}

/** Sum of costPrice * quantity using groupBy on costPrice (Prisma cannot multiply columns in aggregate). */
function costFromGroups(groups: Array<{ costPrice: number; _sum: { quantity: number | null } }>) {
  return groups.reduce((acc, g) => acc + g.costPrice * (g._sum.quantity ?? 0), 0);
}

type MonthRow = {
  month: string;
  salesCount: number;
  salesGross: number; // netAmount incl. VAT
  vatOutput: number;
  salesRevenue: number; // excl. VAT
  cogs: number;
  grossProfitSales: number;
  repairCount: number;
  repairRevenue: number;
  repairPartsCost: number;
  grossProfit: number; // sales GP + repair revenue - repair parts cost
  expenses: number;
  payroll: number;
  buybackCount: number;
  buybackSpend: number;
  netProfit: number;
};

async function summarizeMonth(month: string, branchFilter: { branchId?: string | { in: string[] } }): Promise<MonthRow> {
  const { start, end } = bangkokMonthRange(month);
  const saleWhere = { ...branchFilter, status: "COMPLETED", createdAt: { gte: start, lt: end } };
  const repairWhere = {
    ...branchFilter,
    status: "COMPLETED",
    OR: [
      { completedAt: { gte: start, lt: end } },
      { completedAt: null, updatedAt: { gte: start, lt: end } },
    ],
  };
  const [sales, cogsGroups, repairs, partGroups, expenses, payroll, buyback] = await Promise.all([
    prisma.sale.aggregate({ where: saleWhere, _sum: { netAmount: true, vatAmount: true }, _count: { _all: true } }),
    prisma.saleItem.groupBy({ by: ["costPrice"], where: { sale: saleWhere }, _sum: { quantity: true } }),
    prisma.repairJob.aggregate({ where: repairWhere, _sum: { totalCost: true }, _count: { _all: true } }),
    prisma.repairPartUsage.groupBy({ by: ["costPrice"], where: { repairJob: repairWhere }, _sum: { quantity: true } }),
    prisma.shopExpense.aggregate({ where: { ...branchFilter, date: { gte: start, lt: end } }, _sum: { amount: true } }),
    prisma.payrollSlip.aggregate({
      where: { ...branchFilter, month },
      _sum: { baseSalary: true, repairCommission: true, salesCommission: true, allowance: true, overtimePay: true },
    }),
    prisma.tradeInContract.aggregate({
      where: { ...branchFilter, type: "BUYBACK", startDate: { gte: start, lt: end } },
      _sum: { agreedPrice: true },
      _count: { _all: true },
    }),
  ]);

  const salesGross = sales._sum.netAmount ?? 0;
  const vatOutput = sales._sum.vatAmount ?? 0;
  const salesRevenue = salesGross - vatOutput;
  const cogs = costFromGroups(cogsGroups);
  const repairRevenue = repairs._sum.totalCost ?? 0;
  const repairPartsCost = costFromGroups(partGroups);
  const grossProfit = salesRevenue - cogs + repairRevenue - repairPartsCost;
  const expenseTotal = expenses._sum.amount ?? 0;
  const p = payroll._sum;
  // Employer payroll cost = gross pay (before employee deductions).
  const payrollCost = (p.baseSalary ?? 0) + (p.repairCommission ?? 0) + (p.salesCommission ?? 0) + (p.allowance ?? 0) + (p.overtimePay ?? 0);

  return {
    month,
    salesCount: sales._count._all,
    salesGross: round2(salesGross),
    vatOutput: round2(vatOutput),
    salesRevenue: round2(salesRevenue),
    cogs: round2(cogs),
    grossProfitSales: round2(salesRevenue - cogs),
    repairCount: repairs._count._all,
    repairRevenue: round2(repairRevenue),
    repairPartsCost: round2(repairPartsCost),
    grossProfit: round2(grossProfit),
    expenses: round2(expenseTotal),
    payroll: round2(payrollCost),
    buybackCount: buyback._count._all,
    buybackSpend: round2(buyback._sum.agreedPrice ?? 0),
    // Buyback spend is an inventory purchase (cost flows through COGS when resold), so it is not deducted here.
    netProfit: round2(grossProfit - expenseTotal - payrollCost),
  };
}

const SUM_KEYS = [
  "salesCount", "salesGross", "vatOutput", "salesRevenue", "cogs", "grossProfitSales", "repairCount", "repairRevenue",
  "repairPartsCost", "grossProfit", "expenses", "payroll", "buybackCount", "buybackSpend", "netProfit",
] as const;

export const GET = withStaff(async (request: NextRequest) => {
  const actor = staffContext();
  const params = new URL(request.url).searchParams;
  const current = bangkokDateString().slice(0, 7);
  const from = params.get("from") || current;
  const to = params.get("to") || from;
  if (!MONTH_RE.test(from) || !MONTH_RE.test(to)) throw new AccessError(400, "รูปแบบเดือนไม่ถูกต้อง (YYYY-MM)");
  const months = monthList(from, to);

  const branchParam = params.get("branch");
  const branchId = branchParam && branchParam !== "ALL" ? branchParam : undefined;
  if (branchId && !actor.branchIds.includes(branchId)) throw new AccessError(404, "ไม่พบสาขาที่มีสิทธิ์");
  const branchFilter = branchId ? { branchId } : { branchId: { in: actor.branchIds } };

  const rows = await Promise.all(months.map((m) => summarizeMonth(m, branchFilter)));
  const totals = Object.fromEntries(SUM_KEYS.map((k) => [k, round2(rows.reduce((acc, r) => acc + r[k], 0))])) as Record<(typeof SUM_KEYS)[number], number>;

  // Whole-range rankings and branch breakdown
  const range = { start: bangkokMonthRange(months[0]).start, end: bangkokMonthRange(months[months.length - 1]).end };
  const saleWhere = { ...branchFilter, status: "COMPLETED", createdAt: { gte: range.start, lt: range.end } };
  const repairWhere = {
    ...branchFilter,
    status: "COMPLETED",
    OR: [
      { completedAt: { gte: range.start, lt: range.end } },
      { completedAt: null, updatedAt: { gte: range.start, lt: range.end } },
    ],
  };
  const [productGroups, repairGroups, salesByBranch, repairsByBranch, expensesByBranch, branches] = await Promise.all([
    prisma.saleItem.groupBy({
      by: ["productId"],
      where: { sale: saleWhere },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { subtotal: "desc" } },
      take: 5,
    }),
    prisma.repairJob.groupBy({
      by: ["deviceBrand", "deviceModel"],
      where: repairWhere,
      _sum: { totalCost: true },
      _count: { _all: true },
      orderBy: { _sum: { totalCost: "desc" } },
      take: 5,
    }),
    prisma.sale.groupBy({ by: ["branchId"], where: saleWhere, _sum: { netAmount: true, vatAmount: true } }),
    prisma.repairJob.groupBy({ by: ["branchId"], where: repairWhere, _sum: { totalCost: true } }),
    prisma.shopExpense.groupBy({ by: ["branchId"], where: { ...branchFilter, date: { gte: range.start, lt: range.end } }, _sum: { amount: true } }),
    prisma.branch.findMany({ select: { id: true, name: true, code: true }, orderBy: { code: "asc" } }),
  ]);
  const products = productGroups.length
    ? await prisma.product.findMany({ where: { id: { in: productGroups.map((g) => g.productId) } }, select: { id: true, name: true, category: true } })
    : [];

  const branchRows = branches
    .filter((b) => !branchId || b.id === branchId)
    .map((b) => {
      const s = salesByBranch.find((g) => g.branchId === b.id)?._sum;
      const salesRevenue = (s?.netAmount ?? 0) - (s?.vatAmount ?? 0);
      const repairRevenue = repairsByBranch.find((g) => g.branchId === b.id)?._sum.totalCost ?? 0;
      const expenses = expensesByBranch.find((g) => g.branchId === b.id)?._sum.amount ?? 0;
      return {
        branchId: b.id,
        name: b.name,
        code: b.code,
        salesRevenue: round2(salesRevenue),
        repairRevenue: round2(repairRevenue),
        totalRevenue: round2(salesRevenue + repairRevenue),
        expenses: round2(expenses),
      };
    });

  return NextResponse.json({
    success: true,
    data: {
      from: months[0],
      to: months[months.length - 1],
      branchId: branchId ?? null,
      months: rows,
      totals,
      topProducts: productGroups.map((g) => {
        const p = products.find((x) => x.id === g.productId);
        return { productId: g.productId, name: p?.name ?? "-", category: p?.category ?? "", quantity: g._sum.quantity ?? 0, revenue: round2(g._sum.subtotal ?? 0) };
      }),
      topRepairs: repairGroups.map((g) => ({
        device: `${g.deviceBrand} ${g.deviceModel}`.trim(),
        jobs: g._count._all,
        revenue: round2(g._sum.totalCost ?? 0),
      })),
      branches: branchRows,
      notes: [
        "salesRevenue = ยอดขายสุทธิ (netAmount) หักภาษีขาย เฉพาะบิล COMPLETED (ไม่รวม VOID)",
        "repairRevenue = totalCost ของงานซ่อม COMPLETED ตามวันที่ปิดงาน (completedAt)",
        "payroll = เงินเดือน+คอมมิชชั่น+เบี้ยเลี้ยง+OT ตามสลิปของเดือนนั้น",
        "buybackSpend = เงินรับซื้อเครื่อง (ทุนสินค้าคงคลัง) ไม่ได้หักจากกำไรสุทธิ",
      ],
    },
  });
}, ["ADMIN", "MANAGER"]);
