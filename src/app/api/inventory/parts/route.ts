import { AccessError, staffContext } from "@/lib/staff-context";
import { safeError, takeParam, withStaff } from "@/lib/staff-http";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function handleGET(request: NextRequest) {
  try {
    const actor = staffContext();
    const isStaffMarginRole = actor.role === "ADMIN" || actor.role === "MANAGER";
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
        ...(isStaffMarginRole ? { costPrice: p.costPrice } : {}),
        sellPrice: p.sellPrice,
        stock,
      };
    });

    return NextResponse.json({ success: true, data: mapped });
  } catch (error) {
    return safeError(error);
  }
}

export const GET = withStaff(handleGET, ["ADMIN","MANAGER","CASHIER","TECHNICIAN"]);
