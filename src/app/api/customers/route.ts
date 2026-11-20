import { AccessError, staffTenantId } from "@/lib/staff-context";
import { readJson, safeError, withStaff } from "@/lib/staff-http";
import { throttle } from "@/lib/staff-auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/customers?search=081 or ?id=...
async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const search = searchParams.get("search") || searchParams.get("q") || "";

    // 1. Single Customer Detail View
    if (id) {
      const customer = await prisma.customer.findFirst({
        where: { id, tenantId: staffTenantId() },
        include: {
          repairJobs: {
            orderBy: { createdAt: "desc" },
            take: 20,
            select: {
              id: true,
              trackingCode: true,
              deviceBrand: true,
              deviceModel: true,
              deviceColor: true,
              status: true,
              totalCost: true,
              estimatedCost: true,
              createdAt: true,
              completedAt: true,
              issueDescription: true,
            },
          },
          sales: {
            orderBy: { createdAt: "desc" },
            take: 20,
            select: {
              id: true,
              invoiceNo: true,
              netAmount: true,
              status: true,
              paymentMethod: true,
              createdAt: true,
              items: {
                select: {
                  quantity: true,
                  unitPrice: true,
                  subtotal: true,
                  product: { select: { name: true, code: true } },
                },
              },
            },
          },
          installmentContracts: {
            orderBy: { createdAt: "desc" },
            take: 10,
            select: {
              id: true,
              contractNo: true,
              deviceModel: true,
              totalPrice: true,
              downPayment: true,
              financedAmount: true,
              monthlyPayment: true,
              paidMonths: true,
              termMonths: true,
              status: true,
              isOverdue: true,
              overdueDays: true,
              nextDueDate: true,
            },
          },
          tradeInContracts: {
            orderBy: { createdAt: "desc" },
            take: 10,
            select: {
              id: true,
              contractNo: true,
              type: true,
              deviceBrand: true,
              deviceModel: true,
              agreedPrice: true,
              status: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              repairJobs: true,
              sales: true,
              tradeInContracts: true,
              installmentContracts: true,
            },
          },
        },
      });

      if (!customer) {
        throw new AccessError(404, "ไม่พบข้อมูลลูกค้า");
      }

      // Compute Customer Lifetime Value & Metrics
      const totalSalesSpend = customer.sales.reduce((sum, s) => s.status === "COMPLETED" ? sum + s.netAmount : sum, 0);
      const totalRepairSpend = customer.repairJobs.reduce((sum, r) => r.status === "COMPLETED" ? sum + r.totalCost : sum, 0);
      const totalSpend = Math.round((totalSalesSpend + totalRepairSpend) * 100) / 100;

      // Active Debt / Remaining Installments
      const activeDebts = customer.installmentContracts
        .filter((ins) => ["ACTIVE", "OVERDUE"].includes(ins.status))
        .reduce((sum, ins) => sum + Math.max(0, (ins.termMonths - ins.paidMonths) * ins.monthlyPayment), 0);

      // Customer Loyalty Tier
      let tier: "VIP" | "REGULAR" | "NEW" = "NEW";
      const totalOrders = (customer._count.repairJobs ?? 0) + (customer._count.sales ?? 0);
      if (totalSpend >= 20000 || totalOrders >= 5) tier = "VIP";
      else if (totalOrders >= 2) tier = "REGULAR";

      return NextResponse.json({
        success: true,
        customer: {
          ...customer,
          totalSpend,
          activeDebts: Math.round(activeDebts * 100) / 100,
          tier,
        },
      });
    }

    // 2. Customer List View
    const tenantId = staffTenantId();
    const where: any = { tenantId };
    if (search.trim()) {
      const s = search.trim();
      where.OR = [
        { name: { contains: s } },
        { phone: { contains: s } },
        { lineId: { contains: s } },
        { nationalId: { contains: s } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        _count: {
          select: {
            repairJobs: true,
            sales: true,
            tradeInContracts: true,
            installmentContracts: true,
          },
        },
        sales: {
          where: { status: "COMPLETED" },
          select: { netAmount: true },
        },
        repairJobs: {
          where: { status: "COMPLETED" },
          select: { totalCost: true },
        },
        installmentContracts: {
          where: { status: { in: ["ACTIVE", "OVERDUE"] } },
          select: { monthlyPayment: true, termMonths: true, paidMonths: true, isOverdue: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const formattedCustomers = customers.map(({ sales, repairJobs, installmentContracts, ...c }) => {
      const totalSalesSpend = sales.reduce((sum, s) => sum + s.netAmount, 0);
      const totalRepairSpend = repairJobs.reduce((sum, r) => sum + r.totalCost, 0);
      const totalSpend = Math.round((totalSalesSpend + totalRepairSpend) * 100) / 100;
      const totalOrders = (c._count.repairJobs ?? 0) + (c._count.sales ?? 0);

      const activeDebts = installmentContracts.reduce(
        (sum, ins) => sum + Math.max(0, (ins.termMonths - ins.paidMonths) * ins.monthlyPayment),
        0
      );
      const hasOverdueDebt = installmentContracts.some((ins) => ins.isOverdue);

      let tier: "VIP" | "REGULAR" | "NEW" = "NEW";
      if (totalSpend >= 20000 || totalOrders >= 5) tier = "VIP";
      else if (totalOrders >= 2) tier = "REGULAR";

      return {
        ...c,
        totalSpend,
        activeDebts: Math.round(activeDebts * 100) / 100,
        hasOverdueDebt,
        tier,
      };
    });

    return NextResponse.json({ success: true, data: formattedCustomers, customers: formattedCustomers });
  } catch (error) {
    return safeError(error);
  }
}

// POST /api/customers - Create or update customer
async function handlePOST(request: NextRequest) {
  try {
    const tenantId = staffTenantId();
    await throttle(`staff-customers:${tenantId}`, 60, 60_000);

    const body = await readJson(request);
    const { name, phone, nationalId, lineId, address } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุชื่อและเบอร์โทรศัพท์ลูกค้า" },
        { status: 400 }
      );
    }

    const cleanPhone = String(phone).trim();
    const cleanName = String(name).trim();

    const customer = await prisma.customer.upsert({
      where: { tenantId_phone: { tenantId, phone: cleanPhone } },
      update: {
        name: cleanName,
        nationalId: nationalId ? String(nationalId).trim() : undefined,
        lineId: lineId ? String(lineId).trim() : undefined,
        address: address ? String(address).trim() : undefined,
      },
      create: {
        tenantId,
        name: cleanName,
        phone: cleanPhone,
        nationalId: nationalId ? String(nationalId).trim() : null,
        lineId: lineId ? String(lineId).trim() : null,
        address: address ? String(address).trim() : null,
      },
    });

    return NextResponse.json({ success: true, data: customer, customer });
  } catch (error) {
    return safeError(error);
  }
}

export const GET = withStaff(handleGET, ["ADMIN","MANAGER","CASHIER"]);

export const POST = withStaff(handlePOST, ["ADMIN","MANAGER","CASHIER"]);
