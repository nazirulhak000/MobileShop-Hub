import { AccessError } from "@/lib/staff-context";
import { readJson, safeError, withStaff } from "@/lib/staff-http";
import { staffTenantId } from "@/lib/staff-context";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/customers?search=081 or ?q=081
async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || searchParams.get("q") || "";

    const where: any = {};
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
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ success: true, data: customers, customers });
  } catch (error) {
    return safeError(error);
  }
}

// POST /api/customers - Create or update customer
async function handlePOST(request: NextRequest) {
  try {
    const body = await readJson(request);
    const { name, phone, nationalId, lineId, address } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุชื่อและเบอร์โทรศัพท์ลูกค้า" },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.upsert({
      where: { tenantId_phone: { tenantId: staffTenantId(), phone: phone.trim() } },
      update: {
        name: name.trim(),
        nationalId: nationalId ? nationalId.trim() : undefined,
        lineId: lineId ? lineId.trim() : undefined,
        address: address ? address.trim() : undefined,
      },
      create: {
        name: name.trim(),
        phone: phone.trim(),
        nationalId: nationalId ? nationalId.trim() : null,
        lineId: lineId ? lineId.trim() : null,
        address: address ? address.trim() : null,
      },
    });

    return NextResponse.json({ success: true, data: customer, customer });
  } catch (error) {
    return safeError(error);
  }
}

export const GET = withStaff(handleGET, ["ADMIN","MANAGER","CASHIER"]);

export const POST = withStaff(handlePOST, ["ADMIN","MANAGER","CASHIER"]);
