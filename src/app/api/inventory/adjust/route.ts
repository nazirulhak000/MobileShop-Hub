import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AccessError, staffContext } from "@/lib/staff-context";
import { safeError, withStaff } from "@/lib/staff-http";

export const dynamic = "force-dynamic";

// POST /api/inventory/adjust
async function handlePOST(request: NextRequest) {
  try {
    const actor = staffContext();
    const body = await request.json().catch(() => null);
    const productId = body?.productId;
    const branchIdentifier = body?.branchCode || body?.branchId;
    const type = body?.type || "SET";
    const quantity = body?.quantity;
    const reason = body?.reason;

    if (!productId || !branchIdentifier || quantity === undefined) {
      return NextResponse.json(
        { success: false, error: "ข้อมูลไม่ครบถ้วน (productId, branchCode/branchId, quantity)" },
        { status: 400 }
      );
    }

    const branch = await prisma.branch.findFirst({
      where: {
        tenantId: actor.tenantId,
        OR: [{ code: branchIdentifier }, { id: branchIdentifier }],
      },
    });

    if (!branch) {
      return NextResponse.json(
        { success: false, error: `ไม่พบสาขา ${branchIdentifier}` },
        { status: 404 }
      );
    }

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        tenantId: actor.tenantId,
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูลสินค้า" },
        { status: 404 }
      );
    }

    const qtyNum = Number(quantity);
    if (isNaN(qtyNum) || qtyNum < 0) {
      return NextResponse.json(
        { success: false, error: "จำนวนสต็อกไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const existingStock = await tx.stockItem.findUnique({
        where: {
          productId_branchId: {
            productId,
            branchId: branch.id,
          },
        },
      });

      const currentQty = existingStock ? existingStock.quantity : 0;
      let newQty = currentQty;

      if (type === "ADD") {
        newQty = currentQty + qtyNum;
      } else if (type === "DEDUCT") {
        if (currentQty < qtyNum) {
          throw new AccessError(409, `สต็อกคงเหลือ (${currentQty} ชิ้น) ไม่เพียงพอสำหรับตัด ${qtyNum} ชิ้น`);
        }
        newQty = currentQty - qtyNum;
      } else if (type === "SET") {
        newQty = qtyNum;
      }

      const updatedStock = await tx.stockItem.upsert({
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
          tenantId: actor.tenantId,
          productId,
          branchId: branch.id,
          quantity: newQty,
        },
        include: {
          product: true,
          branch: true,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          module: "INVENTORY",
          action: "STOCK_ADJUST",
          targetId: productId,
          details: JSON.stringify({
            productName: product.name,
            productCode: product.code,
            branchName: branch.name,
            branchCode: branch.code,
            type,
            quantity: qtyNum,
            from: currentQty,
            to: newQty,
            reason: reason || "เบิกใช้อะไหล่/ปรับปรุงสต็อก",
          }),
          beforeJson: JSON.stringify({ quantity: currentQty }),
          afterJson: JSON.stringify({ quantity: newQty }),
          severity: type === "DEDUCT" ? "INFO" : "WARNING",
        },
      });

      return { currentQty, newQty, updatedStock };
    });

    return NextResponse.json({
      success: true,
      message: `ปรับปรุงสต็อกสำเร็จ: ${result.currentQty} -> ${result.newQty} ชิ้น (เหตุผล: ${reason || "ไม่ระบุ"})`,
      stock: result.updatedStock,
    });
  } catch (error: any) {
    return safeError(error);
  }
}

export const POST = withStaff(handlePOST, ["ADMIN", "MANAGER", "TECHNICIAN"]);
