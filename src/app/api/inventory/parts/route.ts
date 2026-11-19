import { AccessError } from "@/lib/staff-context";
import { safeError, takeParam, withStaff } from "@/lib/staff-http";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId");
    const search = searchParams.get("search") || "";

    const where: any = {
      category: "SPARE_PART",
    };

    if (search.trim()) {
      const s = search.trim();
      where.OR = [
        { name: { contains: s } },
        { code: { contains: s } },
        { brand: { contains: s } },
        { model: { contains: s } },
        { compatibleModels: { contains: s } },
      ];
    }

    const parts = await prisma.product.findMany({
      where,
      include: {
        stockItems: branchId
          ? {
              where: { branchId },
            }
          : true,
      },
      orderBy: { name: "asc" },
      take: takeParam(searchParams.get("take"), 200, 500),
    });

    const mapped = parts.map((p) => {
      const stock = branchId
        ? p.stockItems[0]?.quantity || 0
        : p.stockItems.reduce((acc, s) => acc + s.quantity, 0);

      return {
        id: p.id,
        code: p.code,
        name: p.name,
        brand: p.brand,
        model: p.model,
        compatibleModels: p.compatibleModels,
        costPrice: p.costPrice,
        sellPrice: p.sellPrice,
        stock,
      };
    });

    return NextResponse.json({ success: true, data: mapped });
  } catch (error: any) {
    if (error instanceof AccessError) return safeError(error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch spare parts" },
      { status: 500 }
    );
  }
}

export const GET = withStaff(handleGET, ["ADMIN","MANAGER","CASHIER","TECHNICIAN"]);
