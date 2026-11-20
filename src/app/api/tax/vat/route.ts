import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { AccessError, staffContext } from "@/lib/staff-context";
import { bangkokDateString, bangkokMonthRange, takeParam, withStaff } from "@/lib/staff-http";

export const dynamic = "force-dynamic";

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Monthly VAT summary (ภ.พ.30 working figures).
 * - Output VAT comes from Sale.vatAmount of COMPLETED sales.
 * - Input VAT comes from PurchaseOrder.vatAmount of RECEIVED/COMPLETED purchases.
 * - Net VAT payable / excess credit refundable calculated with satang precision.
 * - Monthly filing status computed against Thai Revenue Department e-Filing schedule (23rd of following month).
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

  const salesWhere = {
    tenantId: actor.tenantId,
    ...branchFilter,
    status: "COMPLETED",
    createdAt: { gte: start, lt: end },
  };

  const poWhere = {
    tenantId: actor.tenantId,
    ...branchFilter,
    status: { in: ["RECEIVED", "COMPLETED", "ORDERED"] },
    createdAt: { gte: start, lt: end },
  };

  const [salesAgg, voidCount, salesDocs, poAgg, poDocs] = await Promise.all([
    prisma.sale.aggregate({ where: salesWhere, _sum: { netAmount: true, vatAmount: true, discount: true }, _count: { _all: true } }),
    prisma.sale.count({ where: { ...salesWhere, status: "VOID" } }),
    prisma.sale.findMany({
      where: salesWhere,
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
    prisma.purchaseOrder.aggregate({
      where: poWhere,
      _sum: { subtotal: true, vatAmount: true, totalAmount: true },
      _count: { _all: true },
    }),
    prisma.purchaseOrder.findMany({
      where: poWhere,
      orderBy: { createdAt: "asc" },
      take,
      select: {
        id: true,
        poNumber: true,
        createdAt: true,
        subtotal: true,
        vatAmount: true,
        totalAmount: true,
        supplierName: true,
        branch: { select: { code: true } },
      },
    }),
  ]);

  const grossSales = salesAgg._sum.netAmount ?? 0; // VAT-inclusive
  const outputVat = salesAgg._sum.vatAmount ?? 0;
  const purchasesSubtotal = poAgg._sum.subtotal ?? 0;
  const inputVat = poAgg._sum.vatAmount ?? 0;
  const grossPurchases = poAgg._sum.totalAmount ?? (purchasesSubtotal + inputVat);

  const diff = round2(outputVat - inputVat);
  const netVatPayable = Math.max(0, diff);
  const excessCredit = diff < 0 ? round2(Math.abs(diff)) : 0;

  // Monthly filing deadline: 23rd of following month (Thai Revenue e-Filing)
  const [yearNum, monthNum] = month.split("-").map(Number);
  const deadlineMonth = monthNum === 12 ? `${yearNum + 1}-01` : `${yearNum}-${String(monthNum + 1).padStart(2, "0")}`;
  const filingDeadline = `${deadlineMonth}-23`;

  const todayStr = bangkokDateString();
  const deadlineDate = new Date(`${filingDeadline}T23:59:59+07:00`);
  const todayDate = new Date(`${todayStr}T00:00:00+07:00`);
  const daysRemaining = Math.round((deadlineDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
  const filingStatus = daysRemaining < 0 ? "OVERDUE" : daysRemaining <= 7 ? "DUE_SOON" : "PENDING_FILING";

  return NextResponse.json({
    success: true,
    data: {
      month,
      branchId: branchId ?? null,
      salesCount: salesAgg._count._all,
      voidCount,
      grossSales: round2(grossSales),
      salesBase: round2(grossSales - outputVat),
      outputVat: round2(outputVat),
      purchasesCount: poAgg._count._all,
      grossPurchases: round2(grossPurchases),
      purchasesBase: round2(purchasesSubtotal),
      inputVat: round2(inputVat),
      inputVatSource: "purchase_orders" as const,
      netVatPayable: round2(netVatPayable),
      excessCredit: round2(excessCredit),
      filingDeadline,
      filingStatus,
      daysRemaining,
      documents: salesDocs.map((d) => ({
        id: d.id,
        invoiceNo: d.invoiceNo,
        date: d.createdAt,
        customerName: d.customer?.name ?? "ลูกค้าทั่วไป",
        branchCode: d.branch.code,
        base: round2(d.netAmount - d.vatAmount),
        vat: round2(d.vatAmount),
        total: round2(d.netAmount),
      })),
      purchaseDocuments: poDocs.map((p) => ({
        id: p.id,
        poNumber: p.poNumber,
        date: p.createdAt,
        supplierName: p.supplierName,
        branchCode: p.branch.code,
        base: round2(p.subtotal),
        vat: round2(p.vatAmount),
        total: round2(p.totalAmount),
      })),
      documentsTruncated: salesAgg._count._all > salesDocs.length || poAgg._count._all > poDocs.length,
    },
  });
}, ["ADMIN", "MANAGER"]);
