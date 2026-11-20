import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const contracts = await prisma.tradeInContract.findMany({
      where: { type: "PAWN" },
      include: {
        customer: true,
        branch: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: contracts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerId,
      customerName,
      customerPhone,
      nationalId,
      branchId,
      deviceBrand,
      deviceModel,
      imei,
      conditionGrade,
      agreedPrice,
      interestRateMonthly = 2.5,
      durationMonths = 1,
    } = body;

    // Resolve Customer
    let finalCustId = customerId;
    if (!finalCustId) {
      let existingCust = await prisma.customer.findFirst({
        where: { phone: customerPhone.trim() },
      });
      if (!existingCust) {
        existingCust = await prisma.customer.create({
          data: {
            name: customerName.trim(),
            phone: customerPhone.trim(),
            nationalId: nationalId ? nationalId.trim() : null,
          },
        });
      }
      finalCustId = existingCust.id;
    }

    const count = await prisma.tradeInContract.count({ where: { type: "PAWN" } });
    const contractNo = `PW-202611-${String(count + 1).padStart(4, "0")}`;

    const startDate = new Date();
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + Number(durationMonths));

    const contract = await prisma.tradeInContract.create({
      data: {
        contractNo,
        type: "PAWN",
        branchId: branchId || (await prisma.branch.findFirst())!.id,
        customerId: finalCustId,
        nationalId: nationalId || "1100400123451",
        deviceBrand,
        deviceModel,
        imei,
        conditionGrade: conditionGrade || "A",
        agreedPrice: Number(agreedPrice),
        interestRateMonthly: Number(interestRateMonthly),
        durationMonths: Number(durationMonths),
        startDate,
        dueDate,
        status: "ACTIVE",
      },
      include: {
        customer: true,
        branch: true,
      },
    });

    return NextResponse.json({ success: true, data: contract }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action } = body; // action: "pay_interest" | "redeem" | "forfeit"

    const contract = await prisma.tradeInContract.findUnique({
      where: { id },
    });

    if (!contract) {
      return NextResponse.json({ success: false, error: "Contract not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (action === "pay_interest") {
      // Extend due date by 1 month
      const currentDue = contract.dueDate || new Date();
      const newDue = new Date(currentDue);
      newDue.setMonth(newDue.getMonth() + 1);
      updateData.dueDate = newDue;
    } else if (action === "redeem") {
      updateData.status = "REDEEMED";
    } else if (action === "forfeit") {
      updateData.status = "FORFEITED";
      // Find or auto-create Product matching deviceBrand and deviceModel
      let product = await prisma.product.findFirst({
        where: {
          category: "DEVICE",
          model: { contains: contract.deviceModel },
        },
      });

      if (!product) {
        product = await prisma.product.create({
          data: {
            code: `DEV-PWN-${Math.floor(1000 + Math.random() * 9000)}`,
            name: `${contract.deviceBrand} ${contract.deviceModel} (หลุดจำนำ เกรด ${contract.conditionGrade})`,
            category: "DEVICE",
            brand: contract.deviceBrand,
            model: contract.deviceModel,
            costPrice: contract.agreedPrice,
            sellPrice: Math.round(contract.agreedPrice * 1.3),
            minStock: 1,
          },
        });
      }

      // Upsert DeviceIMEI into inventory to prevent unique constraint crashes
      const existingImei = await prisma.deviceIMEI.findFirst({
        where: { imei: contract.imei },
      });
      if (existingImei) {
        await prisma.deviceIMEI.update({
          where: { id: existingImei.id },
          data: {
            productId: product.id,
            branchId: contract.branchId,
            conditionGrade: contract.conditionGrade,
            status: "IN_STOCK",
            costPrice: contract.agreedPrice,
            sellPrice: Math.round(contract.agreedPrice * 1.3),
            tradeInContractId: contract.id,
          },
        });
      } else {
        await prisma.deviceIMEI.create({
          data: {
            tenantId: contract.tenantId || null,
            productId: product.id,
            branchId: contract.branchId,
            imei: contract.imei,
            conditionGrade: contract.conditionGrade,
            status: "IN_STOCK",
            costPrice: contract.agreedPrice,
            sellPrice: Math.round(contract.agreedPrice * 1.3),
            tradeInContractId: contract.id,
          },
        });
      }

      // Synchronize StockItem quantity for the branch
      await prisma.stockItem.upsert({
        where: {
          productId_branchId: {
            productId: product.id,
            branchId: contract.branchId,
          },
        },
        update: { quantity: { increment: 1 } },
        create: {
          productId: product.id,
          branchId: contract.branchId,
          quantity: 1,
        },
      });
    }

    const updated = await prisma.tradeInContract.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        branch: true,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
