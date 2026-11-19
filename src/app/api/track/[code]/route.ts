import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getRepairJobByTrackingCode } from "@/lib/repairs";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const job = await getRepairJobByTrackingCode(params.code);
    if (!job) {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูลหมายเลขติดตามงานซ่อมนี้" },
        { status: 404 }
      );
    }

    // Sanitize for customer: exclude internal password / pattern lock
    const sanitized = {
      id: job.id,
      trackingCode: job.trackingCode,
      deviceBrand: job.deviceBrand,
      deviceModel: job.deviceModel,
      deviceColor: job.deviceColor,
      serialIMEI: job.serialIMEI ? `••••••••${job.serialIMEI.slice(-4)}` : null,
      issueDescription: job.issueDescription,
      status: job.status,
      estimatedFinish: job.estimatedFinish,
      completedAt: job.completedAt,
      laborFee: job.laborFee,
      estimatedCost: job.estimatedCost,
      totalCost: job.totalCost,
      customerApproved: job.customerApproved,
      notes: job.notes,
      photos: job.photos ? JSON.parse(job.photos) : [],
      warrantyDays: job.warrantyDays,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      customerName: job.customer.name,
      customerPhone: job.customer.phone.replace(/(\d{3})\d{4}(\d{3})/, "$1-XXXX-$2"),
      branch: {
        name: job.branch.name,
        phone: job.branch.phone,
        address: job.branch.address,
      },
      technician: job.technician
        ? {
            name: job.technician.name,
          }
        : null,
      partUsages: job.partUsages.map((pu) => ({
        id: pu.id,
        name: pu.product.name,
        quantity: pu.quantity,
        sellPrice: pu.sellPrice,
      })),
    };

    return NextResponse.json({ success: true, data: sanitized });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch tracking data" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const body = await request.json();
    const { action } = body; // "approve" or "reject"

    const job = await prisma.repairJob.findUnique({
      where: { trackingCode: params.code },
    });

    if (!job) {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูลหมายเลขติดตามงานซ่อมนี้" },
        { status: 404 }
      );
    }

    const updated = await prisma.repairJob.update({
      where: { id: job.id },
      data: {
        customerApproved: action === "approve",
        status: action === "approve" && job.status === "PENDING" ? "DIAGNOSING" : job.status,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        action === "approve"
          ? "ท่านได้ยืนยันอนุมัติการซ่อมเรียบร้อยแล้ว ทางช่างจะเร่งดำเนินการให้ทันที"
          : "ท่านได้ปฏิเสธการซ่อม เจ้าหน้าที่จะติดต่อกลับ",
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to approve quote" },
      { status: 500 }
    );
  }
}
