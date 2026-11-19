import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/customers?search=081 or ?q=081
export async function GET(request: NextRequest) {
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
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ success: true, data: customers, customers });
  } catch (error: any) {
    console.error("GET /api/customers error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/customers - Create or update customer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, nationalId, lineId, address } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุชื่อและเบอร์โทรศัพท์ลูกค้า" },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.upsert({
      where: { phone: phone.trim() },
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
  } catch (error: any) {
    console.error("POST /api/customers error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
