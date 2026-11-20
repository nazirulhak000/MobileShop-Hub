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

    // Support single item or batch items
    const rawItems = Array.isArray(body?.items)
      ? body.items
      : [
          {
            productId: body?.productId,
            branchIdentifier: body?.branchCode || body?.branchId,
            type: body?.type || "SET",
            quantity: body?.quantity,
            reason: body?.reason,
          },
        ];

    if (rawItems.length === 0 || !rawItems[0].productId) {
      return NextResponse.json(
        { success: false, error: "ข้อมูลไม่ครบถ้วน (productId, branchCode/branchId, quantity)" },
        { status: 400 }
      );
    }

    const defaultBranchIdent = body?.branchCode || body?.branchId;

    const result = await prisma.$transaction(async (tx) => {
      const adjusted: any[] = [];

      for (const item of rawItems) {
        const productId = item.productId;
        const branchIdentifier = item.branchIdentifier || item.branchCode || item.branchId || defaultBranchIdent;
        const type = (item.type || "SET").toUpperCase();
        const quantity = item.quantity;
        const reason = item.reason || body?.reason;

        if (!productId || !branchIdentifier || quantity === undefined) {
          throw new AccessError(400, "ข้อมูลไม่ครบถ้วน (productId, branchCode/branchId, quantity)");
        }

        if (!["ADD", "DEDUCT", "SET"].includes(type)) {
          throw new AccessError(400, `ประเภทการปรับปรุงสต็อกไม่ถูกต้อง (${type}): รองรับเฉพาะ ADD, DEDUCT, SET`);
        }

        const qtyNum = Number(quantity);
        if (isNaN(qtyNum) || qtyNum < 0) {
          throw new AccessError(400, "จำนวนสต็อกไม่ถูกต้อง (ต้องเป็นตัวเลขที่ไม่ติดลบ)");
        }

        // Branch verification with tenant isolation
        const branch = await tx.branch.findFirst({
          where: {
            tenantId: actor.tenantId,
            OR: [{ code: branchIdentifier }, { id: branchIdentifier }],
          },
        });

        if (!branch) {
          throw new AccessError(404, `ไม่พบสาขา ${branchIdentifier} ในองค์กรของคุณ`);
        }

        // Branch access check for non-admin
        if (actor.role !== "ADMIN" && actor.role !== "MANAGER" && !actor.branchIds.includes(branch.id)) {
          throw new AccessError(403, `ไม่มีสิทธิ์ปรับปรุงสต็อกของสาขา ${branch.name}`);
        }

        // Product verification with tenant isolation
        const product = await tx.product.findFirst({
          where: {
            id: productId,
            tenantId: actor.tenantId,
          },
        });

        if (!product) {
          throw new AccessError(404, `ไม่พบข้อมูลสินค้า (${productId}) ในองค์กรของคุณ`);
        }

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

        adjusted.push({ currentQty, newQty, updatedStock });
      }

      return adjusted;
    });

    const first = result[0];
    return NextResponse.json({
      success: true,
      message: `ปรับปรุงสต็อกสำเร็จ: ${first.currentQty} -> ${first.newQty} ชิ้น`,
      stock: first.updatedStock,
      adjustedCount: result.length,
    });
  } catch (error: any) {
    return safeError(error);
  }
}

export const POST = withStaff(handlePOST, ["ADMIN", "MANAGER", "TECHNICIAN"]);
