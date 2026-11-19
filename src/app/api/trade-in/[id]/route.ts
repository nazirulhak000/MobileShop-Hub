import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/trade-in/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { action, months = 1 } = body; // action: "REDEEM" | "FORFEIT" | "EXTEND"

    const contract = await prisma.tradeInContract.findUnique({
      where: { id },
      include: { deviceImeis: true, branch: true },
    });

    if (!contract) {
      return NextResponse.json({ success: false, error: "ไม่พบข้อมูลสัญญา" }, { status: 404 });
    }

    if (action === "REDEEM") {
      // Customer pays back loan & redeems device
      const updated = await prisma.tradeInContract.update({
        where: { id },
        data: { status: "REDEEMED" },
      });

      // Update IMEI status to RETURNED
      await prisma.deviceIMEI.updateMany({
        where: { tradeInContractId: id },
        data: { status: "RETURNED" },
      });

      return NextResponse.json({
        success: true,
        message: "บันทึกการไถ่ถอนเครื่องสำเร็จ ลูกค้ารับเครื่องคืนเรียบร้อย",
        contract: updated,
      });
    }

    if (action === "FORFEIT") {
      // Pawn forfeited: shop seizes device into inventory for sale
      const updated = await prisma.tradeInContract.update({
        where: { id },
        data: { status: "FORFEITED" },
      });

      // Update IMEIs to IN_STOCK so they appear in POS / Inventory for sale!
      const imeis = await prisma.deviceIMEI.findMany({
        where: { tradeInContractId: id },
      });

      for (const im of imeis) {
        await prisma.deviceIMEI.update({
          where: { id: im.id },
          data: { status: "IN_STOCK" },
        });

        // Increment stockItem
        await prisma.stockItem.upsert({
          where: {
            productId_branchId: {
              productId: im.productId,
              branchId: contract.branchId,
            },
          },
          update: { quantity: { increment: 1 } },
          create: {
            productId: im.productId,
            branchId: contract.branchId,
            quantity: 1,
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: "ยึดเครื่องหลุดจำนำเข้าสต็อกร้านเพื่อวางจำหน่ายเรียบร้อย",
        contract: updated,
      });
    }

    if (action === "EXTEND") {
      // Pay interest and extend due date
      const currentDue = contract.dueDate ? new Date(contract.dueDate) : new Date();
      const newDue = new Date(currentDue);
      newDue.setMonth(newDue.getMonth() + Number(months || 1));

      const updated = await prisma.tradeInContract.update({
        where: { id },
        data: {
          dueDate: newDue,
          durationMonths: contract.durationMonths + Number(months || 1),
        },
      });

      return NextResponse.json({
        success: true,
        message: `ต่อสัญญาจำนำเพิ่ม ${months} เดือนเรียบร้อย วันครบกำหนดใหม่: ${newDue.toLocaleDateString("th-TH")}`,
        contract: updated,
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("PATCH /api/trade-in/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
