import { AccessError, staffContext } from "@/lib/staff-context";
import { readJson, safeError, withStaff, reqId, reqInt, reqEnum, requireRole, addMonthsClamped } from "@/lib/staff-http";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ACTIONS = ["REDEEM", "FORFEIT", "EXTEND"] as const;

// PATCH /api/trade-in/[id] — pawn lifecycle actions (REDEEM / FORFEIT / EXTEND)
async function handlePATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = reqId(params.id, "id");
    const body = await readJson(request);
    const action = reqEnum(body.action, "action", ACTIONS);
    const actor = staffContext();
    if (action === "FORFEIT") requireRole(actor.role, ["ADMIN", "MANAGER"]);
    const months = action === "EXTEND" ? reqInt(body.months ?? 1, "จำนวนเดือน", 1, 12) : 0;

    const result = await prisma.$transaction(async (tx) => {
      const contract = await tx.tradeInContract.findFirst({
        where: { id, tenantId: actor.tenantId },
        include: { deviceImeis: true },
      });
      if (!contract) throw new AccessError(404, "ไม่พบข้อมูลสัญญา");
      if (contract.type !== "PAWN" || contract.status !== "ACTIVE") {
        throw new AccessError(409, "ทำรายการได้เฉพาะสัญญาจำนำที่ยังมีผลอยู่เท่านั้น");
      }

      // Conditional status change guards against concurrent double actions.
      const guard = { id, tenantId: actor.tenantId, type: "PAWN", status: "ACTIVE" };
      let message = "";
      let details: Record<string, unknown> = { contractNo: contract.contractNo };

      if (action === "REDEEM") {
        const changed = await tx.tradeInContract.updateMany({ where: guard, data: { status: "REDEEMED" } });
        if (changed.count !== 1) throw new AccessError(409, "สัญญานี้ถูกดำเนินการไปแล้ว");
        const returned = await tx.deviceIMEI.updateMany({
          where: { tenantId: actor.tenantId, tradeInContractId: id, status: "PAWNED" },
          data: { status: "RETURNED" },
        });
        details = { ...details, imeisReturned: returned.count };
        message = "บันทึกการไถ่ถอนเครื่องสำเร็จ ลูกค้ารับเครื่องคืนเรียบร้อย";
      } else if (action === "FORFEIT") {
        const changed = await tx.tradeInContract.updateMany({ where: guard, data: { status: "FORFEITED" } });
        if (changed.count !== 1) throw new AccessError(409, "สัญญานี้ถูกดำเนินการไปแล้ว");
        let moved = 0;
        for (const im of contract.deviceImeis) {
          // Only a device still held as collateral moves into sellable stock.
          const r = await tx.deviceIMEI.updateMany({
            where: { id: im.id, tenantId: actor.tenantId, status: "PAWNED" },
            data: { status: "IN_STOCK" },
          });
          if (r.count !== 1) continue;
          moved++;
          await tx.stockItem.upsert({
            where: { productId_branchId: { productId: im.productId, branchId: im.branchId } },
            update: { quantity: { increment: 1 } },
            create: { tenantId: actor.tenantId, productId: im.productId, branchId: im.branchId, quantity: 1 },
          });
        }
        if (moved === 0) {
          throw new AccessError(409, "สัญญานี้ไม่มีข้อมูลเครื่องในสต็อก กรุณารับเข้าสต็อกผ่านหน้าเทิร์น/รับซื้อ");
        }
        details = { ...details, imeisToStock: moved };
        message = "ยึดเครื่องหลุดจำนำเข้าสต็อกร้านเพื่อวางจำหน่ายเรียบร้อย";
      } else {
        const base = contract.dueDate ? new Date(contract.dueDate) : new Date();
        const newDue = addMonthsClamped(base, months);
        const changed = await tx.tradeInContract.updateMany({
          where: guard,
          data: { dueDate: newDue, durationMonths: { increment: months } },
        });
        if (changed.count !== 1) throw new AccessError(409, "สัญญานี้ถูกดำเนินการไปแล้ว");
        details = { ...details, months, previousDueDate: contract.dueDate, newDueDate: newDue };
        message = `ต่อสัญญาจำนำเพิ่ม ${months} เดือนเรียบร้อย วันครบกำหนดใหม่: ${newDue.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" })}`;
      }

      await tx.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          module: "PAWN",
          action,
          targetId: id,
          details: JSON.stringify(details),
          severity: action === "FORFEIT" ? "WARNING" : "INFO",
        },
      });

      const updated = await tx.tradeInContract.findFirst({ where: { id, tenantId: actor.tenantId } });
      return { message, updated };
    });

    return NextResponse.json({ success: true, message: result.message, contract: result.updated });
  } catch (error) {
    return safeError(error);
  }
}

export const PATCH = withStaff(handlePATCH, ["ADMIN","MANAGER","CASHIER"]);
