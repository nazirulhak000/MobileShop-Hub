import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/inventory/adjust
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, branchCode, type, quantity, reason } = body;

    if (!productId || !branchCode || quantity === undefined || !type) {
      return NextResponse.json(
        { success: false, error: "ข้อมูลไม่ครบถ้วน (productId, branchCode, type, quantity)" },
        { status: 400 }
      );
    }

    const branch = await prisma.branch.findFirst({
      where: { OR: [{ code: branchCode }, { id: branchCode }] },
    });

    if (!branch) {
      return NextResponse.json(
        { success: false, error: `ไม่พบสาขา ${branchCode}` },
        { status: 404 }
      );
    }

    const existingStock = await prisma.stockItem.findUnique({
      where: {
        productId_branchId: {
          productId,
          branchId: branch.id,
        },
      },
    });

    let currentQty = existingStock ? existingStock.quantity : 0;
    let newQty = currentQty;
    const qtyChange = Number(quantity);

    if (type === "ADD") {
      newQty = currentQty + qtyChange;
    } else if (type === "DEDUCT") {
      newQty = Math.max(0, currentQty - qtyChange);
    } else if (type === "SET") {
      newQty = Math.max(0, qtyChange);
    }

    const updatedStock = await prisma.stockItem.upsert({
      where: {
        productId_branchId: {
          productId,
          branchId: branch.id,
        },
      },
      update: {
        quantity: newQty,
      },
      create: {
        productId,
        branchId: branch.id,
        quantity: newQty,
      },
      include: {
        product: true,
        branch: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `ปรับปรุงสต็อกสำเร็จ: ${currentQty} -> ${newQty} ชิ้น (เหตุผล: ${reason || "ไม่ระบุ"})`,
      stock: updatedStock,
    });
  } catch (error: any) {
    console.error("POST /api/inventory/adjust error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
