import { prisma } from "@/lib/prisma";
import { staffStorage, type StaffPrincipal } from "@/lib/staff-context";
import { requireStaffSession } from "@/lib/staff-auth";
import { bangkokDayRange } from "@/lib/staff-http";

const ACTIVE_REPAIR_STATUSES = ["PENDING", "DIAGNOSING", "WAITING_PARTS", "REPAIRING", "QC_PASSED", "READY"];
const LOW_STOCK_SCAN_LIMIT = 500;

/**
 * Dashboard data for the signed-in staff member.
 * The session is resolved once and the whole load runs inside staffStorage,
 * so the scoped Prisma client does not re-query the session for every call.
 */
export async function getDashboardData() {
  const principal = await requireStaffSession();
  return staffStorage.run(principal, () => loadDashboard(principal));
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

async function loadDashboard(principal: StaffPrincipal) {
  // Technicians only see repair statistics (no money, no sales).
  const canSeeMoney = principal.role !== "TECHNICIAN";
  const today = bangkokDayRange();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    statusGroups,
    receivedToday,
    completedToday,
    overdueCount,
    topBrands,
    recentRepairs,
    lowStock,
    money,
  ] = await Promise.all([
    prisma.repairJob.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.repairJob.count({ where: { createdAt: { gte: today.start, lt: today.end } } }),
    prisma.repairJob.count({ where: { status: "COMPLETED", completedAt: { gte: today.start, lt: today.end } } }),
    prisma.repairJob.count({ where: { status: { in: ACTIVE_REPAIR_STATUSES }, estimatedFinish: { lt: now } } }),
    prisma.repairJob.groupBy({
      by: ["deviceBrand"],
      where: { createdAt: { gte: thirtyDaysAgo } },
      _count: { _all: true },
      orderBy: { _count: { deviceBrand: "desc" } },
      take: 4,
    }),
    prisma.repairJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        trackingCode: true,
        deviceBrand: true,
        deviceModel: true,
        issueDescription: true,
        status: true,
        createdAt: true,
        customer: { select: { name: true } },
        technician: { select: { id: true, name: true } },
      },
    }),
    loadLowStock(),
    canSeeMoney ? loadMoney(today) : Promise.resolve(null),
  ]);

  const statusCount = (status: string) => statusGroups.find((g) => g.status === status)?._count._all ?? 0;
  const activeRepairsCount = statusGroups
    .filter((g) => ACTIVE_REPAIR_STATUSES.includes(g.status))
    .reduce((acc, g) => acc + g._count._all, 0);
  const brandTotal = topBrands.reduce((acc, b) => acc + b._count._all, 0);

  return {
    canSeeMoney,
    stats: {
      activeRepairsCount,
      pendingCount: statusCount("PENDING"),
      diagnosingCount: statusCount("DIAGNOSING"),
      waitingPartsCount: statusCount("WAITING_PARTS"),
      repairingCount: statusCount("REPAIRING"),
      qcPassedCount: statusCount("QC_PASSED"),
      readyCount: statusCount("READY"),
      receivedTodayCount: receivedToday,
      completedTodayCount: completedToday,
      overdueCount,
      lowStockCount: lowStock.count,
    },
    // null for TECHNICIAN
    money,
    topBrands: topBrands.map((b) => ({
      brand: b.deviceBrand,
      count: b._count._all,
      pct: brandTotal > 0 ? Math.round((b._count._all / brandTotal) * 100) : 0,
    })),
    recentRepairs,
    lowStockItems: lowStock.items,
  };
}

async function loadMoney(today: { start: Date; end: Date }) {
  const salesToday = { status: "COMPLETED", createdAt: { gte: today.start, lt: today.end } };
  const [posAgg, repairAgg, byMethod, recentSales] = await Promise.all([
    prisma.sale.aggregate({ where: salesToday, _sum: { netAmount: true }, _count: { _all: true } }),
    prisma.repairJob.aggregate({
      where: { status: "COMPLETED", completedAt: { gte: today.start, lt: today.end } },
      _sum: { totalCost: true },
    }),
    prisma.sale.groupBy({ by: ["paymentMethod"], where: salesToday, _sum: { netAmount: true }, _count: { _all: true } }),
    prisma.sale.findMany({
      where: { status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        invoiceNo: true,
        netAmount: true,
        paymentMethod: true,
        createdAt: true,
        customer: { select: { name: true } },
        cashier: { select: { id: true, name: true } },
      },
    }),
  ]);
  const posRevenue = posAgg._sum.netAmount ?? 0;
  const repairRevenue = repairAgg._sum.totalCost ?? 0;
  return {
    // Bangkok "today" only: COMPLETED sales (VOID excluded) + repairs completed today.
    todayRevenue: posRevenue + repairRevenue,
    posRevenue,
    repairRevenue,
    salesCountToday: posAgg._count._all,
    paymentMix: byMethod
      .map((m) => ({ method: m.paymentMethod, amount: m._sum.netAmount ?? 0, count: m._count._all }))
      .sort((a, b) => b.amount - a.amount),
    recentSales,
  };
}

/**
 * Prisma cannot compare StockItem.quantity with Product.minStock (different tables),
 * so fetch rows at or below the highest minStock in the shop and filter in memory.
 */
async function loadLowStock() {
  const maxMin = await prisma.product.aggregate({ _max: { minStock: true } });
  const threshold = maxMin._max.minStock ?? 0;
  const rows = await prisma.stockItem.findMany({
    where: { quantity: { lte: threshold } },
    orderBy: { quantity: "asc" },
    take: LOW_STOCK_SCAN_LIMIT,
    select: {
      id: true,
      quantity: true,
      product: { select: { name: true, code: true, minStock: true } },
      branch: { select: { code: true } },
    },
  });
  const low = rows.filter((r) => r.quantity <= r.product.minStock);
  return { count: low.length, items: low.slice(0, 10) };
}
