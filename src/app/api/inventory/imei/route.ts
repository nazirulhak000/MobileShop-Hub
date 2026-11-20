import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/inventory/imei?productId=... or imei=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const imei = searchParams.get("imei");

    const where: any = {};
    if (productId) where.productId = productId;
    if (imei) where.imei = imei;

    const imeis = await prisma.deviceIMEI.findMany({
      where,
      include: {
        product: true,
        branch: true,
        tradeInContract: {
          include: { customer: true },
        },
        saleItem: {
          include: { sale: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, imeis });
  } catch (error: any) {
    console.error("GET /api/inventory/imei error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/inventory/imei - Add new IMEI
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, branchCode, imei, serialNo, conditionGrade, costPrice, sellPrice } = body;

    if (!productId || !branchCode || !imei) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุ productId, สาขา และหมายเลข IMEI" },
        { status: 400 }
      );
    }

    const branch = await prisma.branch.findFirst({
      where: { OR: [{ code: branchCode }, { id: branchCode }] },
    });
    if (!branch) {
      return NextResponse.json({ success: false, error: "ไม่พบสาขา" }, { status: 404 });
    }

    // Check if IMEI already exists
    const existing = await prisma.deviceIMEI.findFirst({
      where: { imei },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `หมายเลข IMEI ${imei} มีอยู่ในระบบแล้ว` },
        { status: 400 }
      );
    }

    const newImei = await prisma.deviceIMEI.create({
      data: {
        productId,
        branchId: branch.id,
        imei,
        serialNo: serialNo || null,
        conditionGrade: conditionGrade || "A",
        status: "IN_STOCK",
        costPrice: Number(costPrice) || 0,
        sellPrice: Number(sellPrice) || 0,
      },
      include: { product: true, branch: true },
    });

    // Update stock quantity for this product at this branch
    await prisma.stockItem.upsert({
      where: {
        productId_branchId: {
          productId,
          branchId: branch.id,
        },
      },
      update: {
        quantity: { increment: 1 },
      },
      create: {
        productId,
        branchId: branch.id,
        quantity: 1,
      },
    });

    return NextResponse.json({ success: true, imei: newImei });
  } catch (error: any) {
    console.error("POST /api/inventory/imei error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH /api/inventory/imei - Update status or condition grade
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, conditionGrade, sellPrice, costPrice } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ต้องระบุ ID ของ IMEI" }, { status: 400 });
    }

    const currentImei = await prisma.deviceIMEI.findUnique({ where: { id } });
    if (!currentImei) {
      return NextResponse.json({ success: false, error: "ไม่พบเครื่อง IMEI" }, { status: 404 });
    }

    const data: any = {};
    if (status) data.status = status;
    if (conditionGrade) data.conditionGrade = conditionGrade;
    if (sellPrice !== undefined) data.sellPrice = Number(sellPrice);
    if (costPrice !== undefined) data.costPrice = Number(costPrice);

    const updated = await prisma.deviceIMEI.update({
      where: { id },
      data,
      include: { product: true, branch: true },
    });

    // Sync StockItem quantity if IN_STOCK status toggles
    if (status && status !== currentImei.status) {
      if (currentImei.status === "IN_STOCK" && status !== "IN_STOCK") {
        // Left stock -> decrement
        const stock = await prisma.stockItem.findUnique({
          where: { productId_branchId: { productId: currentImei.productId, branchId: currentImei.branchId } },
        });
        if (stock) {
          await prisma.stockItem.update({
            where: { id: stock.id },
            data: { quantity: Math.max(0, stock.quantity - 1) },
          });
        }
      } else if (currentImei.status !== "IN_STOCK" && status === "IN_STOCK") {
        // Returned to stock -> increment
        await prisma.stockItem.upsert({
          where: { productId_branchId: { productId: currentImei.productId, branchId: currentImei.branchId } },
          update: { quantity: { increment: 1 } },
          create: { productId: currentImei.productId, branchId: currentImei.branchId, quantity: 1 },
        });
      }
    }

    return NextResponse.json({ success: true, imei: updated });
  } catch (error: any) {
    console.error("PATCH /api/inventory/imei error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
