import { AccessError, staffContext } from "@/lib/staff-context";
import { withStaff, reqId } from "@/lib/staff-http";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/sales/[id]/void  body: { reason }
 * Full void/refund of a sale: flips status to VOID,
 * restocks every item at the sale's branch, returns IMEI devices to IN_STOCK,
 * logs POS VOID AuditLog and INVENTORY RESTOCK AuditLog.
 * Strictly scoped to actor.tenantId.
 */
async function handlePOST(request: NextRequest, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  const actor = staffContext();
  const resolved = await Promise.resolve(params);
  const id = reqId(resolved?.id, "id");
  const body = await request.json().catch(() => null);
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (reason.length < 3) throw new AccessError(400, "กรุณาระบุเหตุผลการยกเลิก/คืนเงิน (อย่างน้อย 3 ตัวอักษร)");
  if (reason.length > 500) throw new AccessError(400, "เหตุผลยาวเกินไป (ไม่เกิน 500 ตัวอักษร)");

  const saleId = await prisma.$transaction(async (tx) => {
    const before = await tx.sale.findFirst({
      where: { id, tenantId: actor.tenantId },
      include: {
        branch: { select: { id: true, code: true, name: true } },
        items: {
          select: {
            id: true,
            productId: true,
            quantity: true,
            deviceImeiId: true,
            product: { select: { id: true, code: true, name: true } },
            deviceImei: { select: { imei: true } },
          },
        },
      },
    });
    if (!before) throw new AccessError(404, "ไม่พบบิลขายนี้");
    if (before.status === "VOID") throw new AccessError(409, "บิลนี้ถูกยกเลิก/คืนเงินไปแล้ว");

    // Guard against concurrent voiding
    const flipped = await tx.sale.updateMany({
      where: { id, tenantId: actor.tenantId, status: before.status },
      data: { status: "VOID" },
    });
    if (flipped.count !== 1) throw new AccessError(409, "สถานะบิลเปลี่ยนแปลงแล้ว กรุณาลองใหม่");

    const imeis: Record<string, string> = {};
    const restockedProducts: Array<{ productId: string; name: string; quantity: number }> = [];

    for (const item of before.items) {
      if (item.quantity <= 0) continue;

      await tx.stockItem.upsert({
        where: { productId_branchId: { productId: item.productId, branchId: before.branchId } },
        update: { quantity: { increment: item.quantity } },
        create: { tenantId: actor.tenantId, productId: item.productId, branchId: before.branchId, quantity: item.quantity },
      });

      restockedProducts.push({
        productId: item.productId,
        name: item.product.name,
        quantity: item.quantity,
      });

      if (item.deviceImeiId) {
        const released = await tx.deviceIMEI.updateMany({
          where: { id: item.deviceImeiId, tenantId: actor.tenantId, status: "SOLD" },
          data: { status: "IN_STOCK" },
        });
        if (released.count === 1) {
          imeis[item.id] = item.deviceImei?.imei ?? "";
        }
        // SaleItem.deviceImeiId is @unique: detach it so the device can be sold again
        await tx.saleItem.updateMany({ where: { id: item.id }, data: { deviceImeiId: null } });
      }
    }

    // 1. AuditLog: POS VOID
    await tx.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.id,
        module: "POS",
        action: "VOID",
        targetId: before.id,
        severity: "WARNING",
        details: JSON.stringify({
          invoiceNo: before.invoiceNo,
          netAmount: before.netAmount,
          reason,
          imeis,
        }),
        beforeJson: JSON.stringify({
          status: before.status,
          items: before.items.map((i) => ({ id: i.id, productId: i.productId, quantity: i.quantity, deviceImeiId: i.deviceImeiId })),
        }),
        afterJson: JSON.stringify({
          status: "VOID",
          restocked: restockedProducts,
          imeisReleased: Object.values(imeis),
        }),
      },
    });

    // 2. AuditLog: INVENTORY RESTOCK
    await tx.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.id,
        module: "INVENTORY",
        action: "RESTOCK",
        targetId: before.id,
        severity: "INFO",
        details: JSON.stringify({
          invoiceNo: before.invoiceNo,
          branchId: before.branchId,
          branchCode: before.branch.code,
          reason: `ยกเลิกบิลขาย ${before.invoiceNo}: ${reason}`,
          items: restockedProducts,
          imeis: Object.values(imeis),
        }),
      },
    });

    return before.id;
  });

  const sale = await prisma.sale.findFirst({
    where: { id: saleId, tenantId: actor.tenantId },
    select: {
      id: true,
      invoiceNo: true,
      branchId: true,
      status: true,
      totalAmount: true,
      discount: true,
      vatAmount: true,
      netAmount: true,
      paymentMethod: true,
      createdAt: true,
      updatedAt: true,
      customer: { select: { id: true, name: true, phone: true } },
      cashier: { select: { id: true, name: true } },
      items: {
        select: { id: true, productId: true, quantity: true, unitPrice: true, subtotal: true, product: { select: { id: true, code: true, name: true } } },
      },
    },
  });

  return NextResponse.json({
    success: true,
    message: `ยกเลิกบิล ${sale?.invoiceNo ?? ""} และคืนสินค้าเข้าสต็อกเรียบร้อย`,
    data: sale,
  });
}

export const POST = withStaff(handlePOST, ["ADMIN", "MANAGER"]);
