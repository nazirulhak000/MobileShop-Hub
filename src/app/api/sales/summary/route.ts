import { AccessError, staffContext } from "@/lib/staff-context";
import { withStaff, bangkokDayRange, bangkokDateString } from "@/lib/staff-http";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * GET /api/sales/summary?day=YYYY-MM-DD&branch=HQ
 * Aggregates for one Bangkok day (daily takings / shift cash count / branch breakdown).
 * Fully isolated by tenantId.
 */
async function handleGET(request: NextRequest) {
  const actor = staffContext();
  const { searchParams } = new URL(request.url);
  const tenantId = actor.tenantId;
  const dayRaw = searchParams.get("day")?.trim() || "";
  if (dayRaw && !/^\d{4}-\d{2}-\d{2}$/.test(dayRaw)) throw new AccessError(400, "รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)");
  const day = dayRaw || bangkokDateString();
  const { start, end } = bangkokDayRange(day);

  const branchKey = searchParams.get("branch")?.trim() || "";
  let branchId: string | undefined;
  if (branchKey && branchKey !== "ALL") {
    const branch = await prisma.branch.findFirst({
      where: { tenantId, OR: [{ code: branchKey }, { id: branchKey }] },
      select: { id: true },
    });
    if (!branch || (actor.role === "CASHIER" && !actor.branchIds.includes(branch.id))) {
      throw new AccessError(404, "ไม่พบข้อมูลสาขา");
    }
    branchId = branch.id;
  }
  const branchWhere: Prisma.SaleWhereInput = {
    tenantId,
    ...(branchId ? { branchId } : (actor.role === "CASHIER" ? { branchId: { in: actor.branchIds } } : {})),
  };
  const dayWhere: Prisma.SaleWhereInput = { ...branchWhere, createdAt: { gte: start, lt: end } };

  const [byMethod, voided, lateVoids, topRaw, byBranchRaw, tenantBranches] = await Promise.all([
    prisma.sale.groupBy({
      by: ["paymentMethod"],
      where: { ...dayWhere, status: { in: ["COMPLETED", "PARTIAL_REFUND"] } },
      _count: { _all: true },
      _sum: { totalAmount: true, netAmount: true, vatAmount: true, discount: true },
    }),
    // Sales made this day that were later voided.
    prisma.sale.aggregate({
      where: { ...dayWhere, status: "VOID" },
      _count: { _all: true },
      _sum: { netAmount: true },
    }),
    // Sales from earlier days that were voided (refunded) during this day.
    prisma.sale.groupBy({
      by: ["paymentMethod"],
      where: { ...branchWhere, status: "VOID", createdAt: { lt: start }, updatedAt: { gte: start, lt: end } },
      _count: { _all: true },
      _sum: { netAmount: true },
    }),
    prisma.saleItem.groupBy({
      by: ["productId"],
      where: { tenantId, sale: { ...dayWhere, status: { in: ["COMPLETED", "PARTIAL_REFUND"] } } },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { subtotal: "desc" } },
      take: 5,
    }),
    // Branch breakdown for the selected day across the tenant
    prisma.sale.groupBy({
      by: ["branchId"],
      where: { tenantId, createdAt: { gte: start, lt: end }, status: { in: ["COMPLETED", "PARTIAL_REFUND"] } },
      _count: { _all: true },
      _sum: { netAmount: true, vatAmount: true, discount: true },
    }),
    prisma.branch.findMany({
      where: { tenantId },
      select: { id: true, code: true, name: true },
    }),
  ]);

  const branchMap = new Map(tenantBranches.map((b) => [b.id, b]));

  const products = topRaw.length
    ? await prisma.product.findMany({
        where: { tenantId, id: { in: topRaw.map((t) => t.productId) } },
        select: { id: true, code: true, name: true },
      })
    : [];
  const productMap = new Map(products.map((p) => [p.id, p]));

  const methods = byMethod.map((g) => ({
    paymentMethod: g.paymentMethod,
    count: g._count._all,
    grossAmount: round2(g._sum.totalAmount ?? 0),
    netAmount: round2(g._sum.netAmount ?? 0),
    vatAmount: round2(g._sum.vatAmount ?? 0),
    discount: round2(g._sum.discount ?? 0),
  }));
  const sum = (key: "count" | "grossAmount" | "netAmount" | "vatAmount" | "discount") =>
    round2(methods.reduce((a, m) => a + m[key], 0));
  const refundsOfEarlierSales = lateVoids.map((g) => ({
    paymentMethod: g.paymentMethod,
    count: g._count._all,
    amount: round2(g._sum.netAmount ?? 0),
  }));

  const byBranch = byBranchRaw.map((b) => {
    const meta = branchMap.get(b.branchId);
    return {
      branchId: b.branchId,
      branchCode: meta?.code ?? "-",
      branchName: meta?.name ?? "ไม่ทราบสาขา",
      count: b._count._all,
      netAmount: round2(b._sum.netAmount ?? 0),
      vatAmount: round2(b._sum.vatAmount ?? 0),
      discount: round2(b._sum.discount ?? 0),
    };
  });

  return NextResponse.json({
    success: true,
    data: {
      day,
      branchId: branchId ?? null,
      byPaymentMethod: methods,
      totals: {
        count: sum("count"),
        grossAmount: sum("grossAmount"),
        netAmount: sum("netAmount"),
        vatAmount: sum("vatAmount"),
        discount: sum("discount"),
      },
      cashSales: round2(methods.find((m) => m.paymentMethod === "CASH")?.netAmount ?? 0),
      voided: { count: voided._count._all, amount: round2(voided._sum.netAmount ?? 0) },
      refundsOfEarlierSales,
      cashRefundsOfEarlierSales: round2(refundsOfEarlierSales.find((r) => r.paymentMethod === "CASH")?.amount ?? 0),
      topProducts: topRaw.map((t) => ({
        productId: t.productId,
        code: productMap.get(t.productId)?.code ?? "",
        name: productMap.get(t.productId)?.name ?? "(ไม่พบสินค้า)",
        quantity: t._sum.quantity ?? 0,
        amount: round2(t._sum.subtotal ?? 0),
      })),
      byBranch,
      branches: tenantBranches,
    },
  });
}

export const GET = withStaff(handleGET, ["ADMIN", "MANAGER", "CASHIER"]);
