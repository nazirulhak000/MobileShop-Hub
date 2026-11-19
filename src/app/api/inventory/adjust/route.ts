import { AccessError, staffContext } from "@/lib/staff-context";
import { withStaff, reqId, reqInt, reqEnum } from "@/lib/staff-http";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ADJUST_TYPES = ["ADD", "DEDUCT", "SET"] as const;

// POST /api/inventory/adjust
// Body: { productId, branchCode (code or id), type: ADD|DEDUCT|SET, quantity, reason }
async function handlePOST(request: NextRequest) {
  const actor = staffContext();
  const body = await request.json().catch(() => {
    throw new AccessError(400, "รูปแบบข้อมูลไม่ถูกต้อง");
  });

  const productId = reqId(body?.productId, "productId");
  const branchCode = reqId(body?.branchCode, "branchCode");
  const type = reqEnum(body?.type, "type", ADJUST_TYPES);
  const quantity = reqInt(body?.quantity, "quantity", type === "SET" ? 0 : 1, 100_000);
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (!reason) throw new AccessError(400, "กรุณาระบุเหตุผลการปรับสต็อก");
  if (reason.length > 200) throw new AccessError(400, "เหตุผลยาวเกิน 200 ตัวอักษร");

  const result = await prisma.$transaction(async (tx) => {
    const branch = await tx.branch.findFirst({
      where: { OR: [{ code: branchCode }, { id: branchCode }] },
    });
    if (!branch) throw new AccessError(404, `ไม่พบสาขา ${branchCode}`);

    const product = await tx.product.findFirst({ where: { id: productId }, select: { id: true } });
    if (!product) throw new AccessError(404, "ไม่พบสินค้า");

    const key = { productId_branchId: { productId, branchId: branch.id } };
    const before = await tx.stockItem.findUnique({ where: key });
    const beforeQty = before?.quantity ?? 0;

    if (type === "ADD") {
      await tx.stockItem.upsert({
        where: key,
        update: { quantity: { increment: quantity } },
        create: { productId, branchId: branch.id, quantity },
      });
    } else if (type === "DEDUCT") {
      // Atomic guarded decrement: only succeeds if enough stock remains.
      const { count } = await tx.stockItem.updateMany({
        where: { productId, branchId: branch.id, quantity: { gte: quantity } },
        data: { quantity: { decrement: quantity } },
      });
      if (count !== 1) throw new AccessError(409, "สต็อกไม่พอ");
    } else {
      await tx.stockItem.upsert({
        where: key,
        update: { quantity },
        create: { productId, branchId: branch.id, quantity },
      });
    }

    const after = await tx.stockItem.findUnique({
      where: key,
      include: { product: true, branch: true },
    });
    const afterQty = after?.quantity ?? 0;

    await tx.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.id,
        module: "INVENTORY",
        action: "ADJUST",
        targetId: productId,
        details: JSON.stringify({ type, quantity, reason, branchCode: branch.code }),
        beforeJson: JSON.stringify({ quantity: beforeQty }),
        afterJson: JSON.stringify({ quantity: afterQty }),
        severity: type === "SET" ? "WARNING" : "INFO",
      },
    });

    return { stock: after, beforeQty, afterQty };
  });

  return NextResponse.json({
    success: true,
    message: `ปรับปรุงสต็อกสำเร็จ: ${result.beforeQty} -> ${result.afterQty} ชิ้น (เหตุผล: ${reason})`,
    stock: result.stock,
  });
}

export const POST = withStaff(handlePOST, ["ADMIN", "MANAGER"]);
