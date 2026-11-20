import { AccessError, staffContext } from "@/lib/staff-context";
import { withStaff, reqId } from "@/lib/staff-http";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/sales/[id]/void  body: { reason }
 * Full void/refund of a COMPLETED sale (no partial refunds): flips status to VOID,
 * restocks every item at the sale's branch, returns IMEI devices to IN_STOCK and
 * writes an AuditLog entry (the only place the reason is stored - Sale has no void fields).
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
      where: { id },
      select: {
        id: true,
        invoiceNo: true,
        branchId: true,
        status: true,
        netAmount: true,
        paymentMethod: true,
        items: {
          select: { id: true, productId: true, quantity: true, deviceImeiId: true, deviceImei: { select: { imei: true } } },
        },
      },
    });
    if (!before) throw new AccessError(404, "ไม่พบบิลขายนี้");

    // Conditional flip guards against double refunds (concurrent requests or already-voided bills).
    const flipped = await tx.sale.updateMany({ where: { id, status: "COMPLETED" }, data: { status: "VOID" } });
    if (flipped.count !== 1) throw new AccessError(409, "บิลนี้ถูกยกเลิก/คืนเงินไปแล้ว");

    const imeis: Record<string, string> = {};
    for (const item of before.items) {
      await tx.stockItem.upsert({
        where: { productId_branchId: { productId: item.productId, branchId: before.branchId } },
        update: { quantity: { increment: item.quantity } },
        create: { productId: item.productId, branchId: before.branchId, quantity: item.quantity },
      });

      if (item.deviceImeiId) {
        const released = await tx.deviceIMEI.updateMany({
          where: { id: item.deviceImeiId, status: "SOLD" },
          data: { status: "IN_STOCK" },
        });
        if (released.count !== 1) {
          throw new AccessError(409, `เครื่อง IMEI ${item.deviceImei?.imei ?? ""} ไม่อยู่ในสถานะขายแล้ว ไม่สามารถคืนเข้าสต็อกได้`);
        }
        imeis[item.id] = item.deviceImei?.imei ?? "";
        // SaleItem.deviceImeiId is @unique: detach it so the device can be sold again (IMEI kept in the audit log).
        await tx.saleItem.updateMany({ where: { id: item.id }, data: { deviceImeiId: null } });
      }
    }

    await tx.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.id,
        module: "POS",
        action: "VOID",
        targetId: before.id,
        severity: "WARNING",
        details: JSON.stringify({ invoiceNo: before.invoiceNo, netAmount: before.netAmount, reason, imeis }),
        beforeJson: JSON.stringify({
          status: before.status,
          items: before.items.map((i) => ({ id: i.id, productId: i.productId, quantity: i.quantity, deviceImeiId: i.deviceImeiId })),
        }),
        afterJson: JSON.stringify({
          status: "VOID",
          restocked: before.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          imeisReleased: Object.values(imeis),
        }),
      },
    });
    return before.id;
  });

  const sale = await prisma.sale.findFirst({
    where: { id: saleId },
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
