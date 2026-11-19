import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getRepairJobById } from "@/lib/repairs";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const job = await getRepairJobById(params.id);
    if (!job) {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูลใบงานซ่อม" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: job });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch repair job" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      status,
      technicianId,
      notes,
      postCheckData,
      laborFee,
      estimatedCost,
      warrantyDays,
      estimatedFinish,
      customerApproved,
      photos,
    } = body;

    const existing = await prisma.repairJob.findUnique({
      where: { id: params.id },
      include: {
        partUsages: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูลใบงานซ่อม" },
        { status: 404 }
      );
    }

    const updateData: any = {};

    if (status !== undefined) {
      updateData.status = status;
      if (status === "COMPLETED" && !existing.completedAt) {
        updateData.completedAt = new Date();
      }
    }

    if (technicianId !== undefined) {
      updateData.technicianId = technicianId || null;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    if (postCheckData !== undefined) {
      updateData.postCheckData =
        typeof postCheckData === "string"
          ? postCheckData
          : JSON.stringify(postCheckData);
    }

    if (laborFee !== undefined) {
      updateData.laborFee = Number(laborFee);
      // Recalculate totalCost: laborFee + sum of spare parts sellPrice
      const partsTotal = existing.partUsages.reduce(
        (sum, p) => sum + p.sellPrice * p.quantity,
        0
      );
      updateData.totalCost = Number(laborFee) + partsTotal;
    }

    if (estimatedCost !== undefined) {
      updateData.estimatedCost = Number(estimatedCost);
    }

    if (warrantyDays !== undefined) {
      updateData.warrantyDays = Number(warrantyDays);
    }

    if (estimatedFinish !== undefined) {
      updateData.estimatedFinish = estimatedFinish ? new Date(estimatedFinish) : null;
    }

    if (customerApproved !== undefined) {
      updateData.customerApproved = Boolean(customerApproved);
    }

    if (photos !== undefined) {
      updateData.photos = typeof photos === "string" ? photos : JSON.stringify(photos);
    }

    const updatedJob = await prisma.repairJob.update({
      where: { id: params.id },
      data: updateData,
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

    return NextResponse.json({ success: true, data: updatedJob });
  } catch (error: any) {
    console.error("Error updating repair job:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update repair job" },
      { status: 500 }
    );
  }
}
