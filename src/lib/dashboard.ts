import { prisma } from "@/lib/prisma";

export async function getDashboardData() {
  const [
    repairJobs,
    sales,
    stockItems,
    branches,
  ] = await Promise.all([
    prisma.repairJob.findMany({
      include: {
        customer: true,
        technician: true,
        branch: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.sale.findMany({
      include: {
        customer: true,
        cashier: true,
        branch: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.stockItem.findMany({
      include: {
        product: true,
        branch: true,
      },
    }),
    prisma.branch.findMany(),
  ]);

  // Status breakdown
  const activeRepairs = repairJobs.filter(
    (r) => r.status !== "COMPLETED" && r.status !== "CANCELLED"
  );
  const pendingRepairs = repairJobs.filter((r) => r.status === "PENDING");
  const diagnosingRepairs = repairJobs.filter((r) => r.status === "DIAGNOSING");
  const waitingPartsRepairs = repairJobs.filter((r) => r.status === "WAITING_PARTS");
  const repairingRepairs = repairJobs.filter((r) => r.status === "REPAIRING");
  const readyRepairs = repairJobs.filter((r) => r.status === "READY");
  const completedRepairs = repairJobs.filter((r) => r.status === "COMPLETED");

  // Revenue calculation
  const totalPosRevenue = sales.reduce((acc, s) => acc + s.netAmount, 0);
  const completedRepairRevenue = completedRepairs.reduce(
    (acc, r) => acc + r.totalCost,
    0
  );
  const totalRevenue = totalPosRevenue + completedRepairRevenue;

  // Low stock items
  const lowStockItems = stockItems.filter(
    (s) => s.quantity <= s.product.minStock
  );

  return {
    stats: {
      activeRepairsCount: activeRepairs.length,
      pendingCount: pendingRepairs.length,
      diagnosingCount: diagnosingRepairs.length,
      waitingPartsCount: waitingPartsRepairs.length,
      repairingCount: repairingRepairs.length,
      readyCount: readyRepairs.length,
      completedCount: completedRepairs.length,
      todayRevenue: totalRevenue,
      posRevenue: totalPosRevenue,
      repairRevenue: completedRepairRevenue,
      lowStockCount: lowStockItems.length,
      totalCustomers: await prisma.customer.count(),
    },
    recentRepairs: repairJobs.slice(0, 6),
    recentSales: sales.slice(0, 5),
    lowStockItems: lowStockItems.slice(0, 6),
    branches,
  };
}
