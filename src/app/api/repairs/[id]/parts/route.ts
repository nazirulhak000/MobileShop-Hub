import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { productId, quantity = 1 } = await request.json();

    if (!productId) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุรหัสสินค้าอะไหล่" },
        { status: 400 }
      );
    }

    const job = await prisma.repairJob.findUnique({
      where: { id: params.id },
      include: { partUsages: true },
    });

    if (!job) {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูลใบงานซ่อม" },
        { status: 404 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูลสินค้าอะไหล่" },
        { status: 404 }
      );
    }

    const qtyToDeduct = Number(quantity) || 1;

    // Check & Deduct Stock
    const stock = await prisma.stockItem.findUnique({
      where: {
        productId_branchId: {
          productId,
          branchId: job.branchId,
        },
      },
    });

    if (!stock || stock.quantity < qtyToDeduct) {
      return NextResponse.json(
        {
          success: false,
          error: `สต็อกคงเหลือไม่เพียงพอ (คงเหลือ ${stock ? stock.quantity : 0} ชิ้น)`,
        },
        { status: 400 }
      );
    }

    // Deduct stock in transaction
    const [usage, updatedStock] = await prisma.$transaction([
      prisma.stockItem.update({
        where: { id: stock.id },
        data: { quantity: { decrement: qtyToDeduct } },
      }),
      prisma.repairPartUsage.create({
        data: {
          repairJobId: job.id,
          productId,
          quantity: qtyToDeduct,
          costPrice: product.costPrice,
          sellPrice: product.sellPrice,
        },
        include: {
          product: true,
        },
      }),
    ]);

    // Recalculate total cost
    const allUsages = await prisma.repairPartUsage.findMany({
      where: { repairJobId: job.id },
    });
    const partsTotal = allUsages.reduce(
      (sum, p) => sum + p.sellPrice * p.quantity,
      0
    );
    const newTotalCost = job.laborFee + partsTotal;

    const updatedJob = await prisma.repairJob.update({
      where: { id: job.id },
      data: { totalCost: newTotalCost },
      include: {
        customer: true,
        branch: true,
        technician: true,
        partUsages: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedJob,
      message: `เบิกอะไหล่ ${product.name} จำนวน ${qtyToDeduct} ชิ้น เรียบร้อยแล้ว`,
    });
  } catch (error: any) {
    console.error("Error adding spare part:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to add spare part" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const usageId = searchParams.get("usageId");

    if (!usageId) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุ usageId ที่ต้องการยกเลิก" },
        { status: 400 }
      );
    }

    const usage = await prisma.repairPartUsage.findUnique({
      where: { id: usageId },
      include: {
        repairJob: true,
      },
    });

    if (!usage || usage.repairJobId !== params.id) {
      return NextResponse.json(
        { success: false, error: "ไม่พบรายการเบิกอะไหล่นี้" },
        { status: 404 }
      );
    }

    // Restore stock and delete usage
    await prisma.$transaction([
      prisma.stockItem.upsert({
        where: {
          productId_branchId: {
            productId: usage.productId,
            branchId: usage.repairJob.branchId,
          },
        },
        create: {
          productId: usage.productId,
          branchId: usage.repairJob.branchId,
          quantity: usage.quantity,
        },
        update: {
          quantity: { increment: usage.quantity },
        },
      }),
      prisma.repairPartUsage.delete({
        where: { id: usageId },
      }),
    ]);

    // Recalculate total cost
    const remainingUsages = await prisma.repairPartUsage.findMany({
      where: { repairJobId: params.id },
    });
    const partsTotal = remainingUsages.reduce(
      (sum, p) => sum + p.sellPrice * p.quantity,
      0
    );
    const newTotalCost = usage.repairJob.laborFee + partsTotal;

    const updatedJob = await prisma.repairJob.update({
      where: { id: params.id },
      data: { totalCost: newTotalCost },
      include: {
        customer: true,
        branch: true,
        technician: true,
        partUsages: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedJob,
      message: "คืนอะไหล่เข้าสต็อกเรียบร้อยแล้ว",
    });
  } catch (error: any) {
    console.error("Error removing spare part:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to remove spare part" },
      { status: 500 }
    );
  }
}
