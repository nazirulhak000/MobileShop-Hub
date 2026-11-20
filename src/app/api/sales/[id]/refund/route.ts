import { AccessError, staffContext } from "@/lib/staff-context";
import { withStaff, reqId } from "@/lib/staff-http";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const round2 = (n: number) => Math.round(n * 100) / 100;

interface RefundItemInput {
  saleItemId?: string;
  itemId?: string;
  quantity?: number;
}

/**
 * POST /api/sales/[id]/refund
 * Body: { reason: string, items?: RefundItemInput[] }
 * Supports full or partial refund of a COMPLETED or PARTIAL_REFUND sale.
 * - Enforces tenantId on all queries.
 * - Reverts stock quantity at the branch and sets IMEI status to IN_STOCK.
 * - Creates POS audit log and INVENTORY RESTOCK audit log.
 */
async function handlePOST(request: NextRequest, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  const actor = staffContext();
  const resolved = await Promise.resolve(params);
  const id = reqId(resolved?.id, "id");
  const body = await request.json().catch(() => null);
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (reason.length < 3) throw new AccessError(400, "กรุณาระบุเหตุผลการคืนเงิน (อย่างน้อย 3 ตัวอักษร)");
  if (reason.length > 500) throw new AccessError(400, "เหตุผลยาวเกินไป (ไม่เกิน 500 ตัวอักษร)");

  const requestedItems: RefundItemInput[] = Array.isArray(body?.items) ? body.items : [];

  const result = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({
      where: { id, tenantId: actor.tenantId },
      include: {
        branch: { select: { id: true, code: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, code: true, name: true } },
            deviceImei: { select: { id: true, imei: true, status: true } },
          },
        },
      },
    });

    if (!sale) throw new AccessError(404, "ไม่พบบิลขายนี้");
    if (sale.status === "VOID") throw new AccessError(409, "บิลนี้ถูกยกเลิก/คืนเงินครบถ้วนแล้ว");

    const isFullRefund =
      requestedItems.length === 0 ||
      requestedItems.length >= sale.items.length;

    const imeisReleased: Record<string, string> = {};
    const restockedProducts: Array<{ productId: string; name: string; quantity: number }> = [];

    if (isFullRefund) {
      // Full Void / Refund
      const flipped = await tx.sale.updateMany({
        where: { id, tenantId: actor.tenantId, status: sale.status },
        data: { status: "VOID" },
      });
      if (flipped.count !== 1) throw new AccessError(409, "สถานะบิลเปลี่ยนแปลงแล้ว กรุณาลองใหม่");

      for (const item of sale.items) {
        if (item.quantity <= 0) continue;

        await tx.stockItem.upsert({
          where: { productId_branchId: { productId: item.productId, branchId: sale.branchId } },
          update: { quantity: { increment: item.quantity } },
          create: { tenantId: actor.tenantId, productId: item.productId, branchId: sale.branchId, quantity: item.quantity },
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
            imeisReleased[item.id] = item.deviceImei?.imei ?? "";
          }
          await tx.saleItem.updateMany({ where: { id: item.id }, data: { deviceImeiId: null } });
        }
      }

      // 1. AuditLog: POS REFUND/VOID
      await tx.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          module: "POS",
          action: "REFUND",
          targetId: sale.id,
          severity: "WARNING",
          details: JSON.stringify({
            invoiceNo: sale.invoiceNo,
            refundType: "FULL",
            refundAmount: sale.netAmount,
            reason,
            imeis: imeisReleased,
          }),
          beforeJson: JSON.stringify({
            status: sale.status,
            netAmount: sale.netAmount,
            items: sale.items.map((i) => ({ id: i.id, productId: i.productId, quantity: i.quantity })),
          }),
          afterJson: JSON.stringify({
            status: "VOID",
            refundAmount: sale.netAmount,
            restocked: restockedProducts,
            imeisReleased: Object.values(imeisReleased),
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
          targetId: sale.id,
          severity: "INFO",
          details: JSON.stringify({
            invoiceNo: sale.invoiceNo,
            branchId: sale.branchId,
            branchCode: sale.branch.code,
            reason: `คืนสินค้าจากบิล ${sale.invoiceNo}: ${reason}`,
            items: restockedProducts,
            imeis: Object.values(imeisReleased),
          }),
        },
      });

      return {
        refundType: "FULL",
        refundAmount: sale.netAmount,
        invoiceNo: sale.invoiceNo,
        status: "VOID",
      };
    } else {
      // Partial Refund
      let totalRefundGross = 0;
      let totalRefundDiscount = 0;

      for (const reqItem of requestedItems) {
        const itemKey = reqItem.saleItemId || reqItem.itemId;
        const targetItem = sale.items.find((it) => it.id === itemKey);
        if (!targetItem) throw new AccessError(400, `ไม่พบสินค้ารายการ ${itemKey} ในบิลนี้`);

        const refundQty = Math.min(targetItem.quantity, Math.max(1, reqItem.quantity || 1));
        const itemGrossRefund = round2(targetItem.unitPrice * refundQty);
        totalRefundGross = round2(totalRefundGross + itemGrossRefund);

        // Calculate proportional discount if sale had discount
        const itemDiscount =
          sale.totalAmount > 0 ? round2((itemGrossRefund / sale.totalAmount) * sale.discount) : 0;
        totalRefundDiscount = round2(totalRefundDiscount + itemDiscount);

        // Replenish stock
        await tx.stockItem.upsert({
          where: { productId_branchId: { productId: targetItem.productId, branchId: sale.branchId } },
          update: { quantity: { increment: refundQty } },
          create: { tenantId: actor.tenantId, productId: targetItem.productId, branchId: sale.branchId, quantity: refundQty },
        });

        restockedProducts.push({
          productId: targetItem.productId,
          name: targetItem.product.name,
          quantity: refundQty,
        });

        // Revert IMEI if attached
        if (targetItem.deviceImeiId) {
          const released = await tx.deviceIMEI.updateMany({
            where: { id: targetItem.deviceImeiId, tenantId: actor.tenantId, status: "SOLD" },
            data: { status: "IN_STOCK" },
          });
          if (released.count === 1) {
            imeisReleased[targetItem.id] = targetItem.deviceImei?.imei ?? "";
          }
          await tx.saleItem.updateMany({ where: { id: targetItem.id }, data: { deviceImeiId: null } });
        }

        // Update or delete sale item
        const remainingQty = targetItem.quantity - refundQty;
        if (remainingQty <= 0) {
          await tx.saleItem.delete({ where: { id: targetItem.id } });
        } else {
          await tx.saleItem.update({
            where: { id: targetItem.id },
            data: {
              quantity: remainingQty,
              subtotal: round2(targetItem.unitPrice * remainingQty),
            },
          });
        }
      }

      const refundNet = round2(Math.max(0, totalRefundGross - totalRefundDiscount));
      const newTotalAmount = round2(Math.max(0, sale.totalAmount - totalRefundGross));
      const newDiscount = round2(Math.max(0, sale.discount - totalRefundDiscount));
      const newNetAmount = round2(Math.max(0, sale.netAmount - refundNet));
      const newNetBeforeVat = round2(newNetAmount / 1.07);
      const newVatAmount = round2(newNetAmount - newNetBeforeVat);
      const newStatus = newNetAmount <= 0 ? "VOID" : "PARTIAL_REFUND";

      await tx.sale.update({
        where: { id: sale.id },
        data: {
          totalAmount: newTotalAmount,
          discount: newDiscount,
          netAmount: newNetAmount,
          vatAmount: newVatAmount,
          status: newStatus,
        },
      });

      // AuditLog: POS PARTIAL_REFUND
      await tx.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          module: "POS",
          action: "PARTIAL_REFUND",
          targetId: sale.id,
          severity: "WARNING",
          details: JSON.stringify({
            invoiceNo: sale.invoiceNo,
            refundType: "PARTIAL",
            refundAmount: refundNet,
            reason,
            restocked: restockedProducts,
            imeis: imeisReleased,
          }),
          beforeJson: JSON.stringify({ netAmount: sale.netAmount, status: sale.status }),
          afterJson: JSON.stringify({ netAmount: newNetAmount, status: newStatus }),
        },
      });

      // AuditLog: INVENTORY RESTOCK
      await tx.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          module: "INVENTORY",
          action: "RESTOCK",
          targetId: sale.id,
          severity: "INFO",
          details: JSON.stringify({
            invoiceNo: sale.invoiceNo,
            branchId: sale.branchId,
            branchCode: sale.branch.code,
            reason: `คืนสินค้าบางส่วนจากบิล ${sale.invoiceNo}: ${reason}`,
            items: restockedProducts,
            imeis: Object.values(imeisReleased),
          }),
        },
      });

      return {
        refundType: "PARTIAL",
        refundAmount: refundNet,
        remainingNetAmount: newNetAmount,
        invoiceNo: sale.invoiceNo,
        status: newStatus,
      };
    }
  });

  return NextResponse.json({
    success: true,
    message: `ทำรายการคืนเงินบิล ${result.invoiceNo} สำเร็จ (ยอดเงินคืน: ${round2(result.refundAmount).toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท)`,
    data: result,
  });
}

export const POST = withStaff(handlePOST, ["ADMIN", "MANAGER"]);
