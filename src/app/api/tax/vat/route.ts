import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { AccessError, staffContext } from "@/lib/staff-context";
import { bangkokDateString, bangkokMonthRange, takeParam, withStaff } from "@/lib/staff-http";

export const dynamic = "force-dynamic";

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Monthly VAT summary (ภ.พ.30 working figures).
 * Output VAT comes from Sale.vatAmount of COMPLETED sales.
 * ShopExpense has no VAT field, so input VAT is not tracked (reported as 0 with inputVatSource = "not-tracked").
 */
export const GET = withStaff(async (request: NextRequest) => {
  const actor = staffContext();
  const params = new URL(request.url).searchParams;
  const month = params.get("month") || bangkokDateString().slice(0, 7);
  if (!MONTH_RE.test(month)) throw new AccessError(400, "รูปแบบเดือนไม่ถูกต้อง (YYYY-MM)");
  const branchParam = params.get("branch");
  const branchId = branchParam && branchParam !== "ALL" ? branchParam : undefined;
  if (branchId && !actor.branchIds.includes(branchId)) throw new AccessError(404, "ไม่พบสาขาที่มีสิทธิ์");
  const take = takeParam(params.get("take"), 200, 1000);

  const { start, end } = bangkokMonthRange(month);
  const branchFilter = branchId ? { branchId } : { branchId: { in: actor.branchIds } };
  const where = { ...branchFilter, status: "COMPLETED", createdAt: { gte: start, lt: end } };
  const [agg, voidCount, docs] = await Promise.all([
    prisma.sale.aggregate({ where, _sum: { netAmount: true, vatAmount: true, discount: true }, _count: { _all: true } }),
    prisma.sale.count({ where: { ...where, status: "VOID" } }),
    prisma.sale.findMany({
      where,
      orderBy: { createdAt: "asc" },
      take,
      select: {
        id: true,
        invoiceNo: true,
        createdAt: true,
        netAmount: true,
        vatAmount: true,
        customer: { select: { name: true } },
        branch: { select: { code: true } },
      },
    }),
  ]);

  const grossSales = agg._sum.netAmount ?? 0; // VAT-inclusive
  const outputVat = agg._sum.vatAmount ?? 0;
  const inputVat = 0;

  return NextResponse.json({
    success: true,
    data: {
      month,
      branchId: branchId ?? null,
      salesCount: agg._count._all,
      voidCount,
      grossSales: round2(grossSales),
      salesBase: round2(grossSales - outputVat),
      outputVat: round2(outputVat),
      inputVat,
      inputVatSource: "not-tracked" as const,
      netVatPayable: round2(outputVat - inputVat),
      documents: docs.map((d) => ({
        id: d.id,
        invoiceNo: d.invoiceNo,
        date: d.createdAt,
        customerName: d.customer?.name ?? "ลูกค้าทั่วไป",
        branchCode: d.branch.code,
        base: round2(d.netAmount - d.vatAmount),
        vat: round2(d.vatAmount),
        total: round2(d.netAmount),
      })),
      documentsTruncated: agg._count._all > docs.length,
    },
  });
}, ["ADMIN", "MANAGER"]);
