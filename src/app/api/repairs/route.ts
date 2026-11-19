import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateNextTrackingCode, getRepairJobs } from "@/lib/repairs";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const branchId = searchParams.get("branchId") || undefined;
    const technicianId = searchParams.get("technicianId") || undefined;
    const search = searchParams.get("search") || undefined;

    const jobs = await getRepairJobs({ status, branchId, technicianId, search });
    return NextResponse.json({ success: true, data: jobs });
  } catch (error: any) {
    console.error("Error fetching repair jobs:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch repairs" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerId,
      customerName,
      customerPhone,
      customerLineId,
      customerAddress,
      customerNationalId,
      branchId,
      technicianId,
      deviceBrand,
      deviceModel,
      deviceColor,
      serialIMEI,
      passcode,
      patternLock,
      preCheckData,
      issueDescription,
      customerSignature,
      laborFee,
      estimatedCost,
      estimatedFinish,
      notes,
    } = body;

    if (!deviceBrand || !deviceModel || !issueDescription) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุข้อมูลยี่ห้อ รุ่น และอาการเสียให้ครบถ้วน" },
        { status: 400 }
      );
    }

    // Resolve Customer
    let finalCustomerId = customerId;
    if (!finalCustomerId) {
      if (!customerPhone || !customerName) {
        return NextResponse.json(
          { success: false, error: "กรุณาระบุชื่อและเบอร์โทรศัพท์ลูกค้า" },
          { status: 400 }
        );
      }

      // Check if customer exists by phone
      let existingCustomer = await prisma.customer.findUnique({
        where: { phone: customerPhone.trim() },
      });

      if (!existingCustomer) {
        existingCustomer = await prisma.customer.create({
          data: {
            name: customerName.trim(),
            phone: customerPhone.trim(),
            lineId: customerLineId ? customerLineId.trim() : null,
            address: customerAddress ? customerAddress.trim() : null,
            nationalId: customerNationalId ? customerNationalId.trim() : null,
          },
        });
      }
      finalCustomerId = existingCustomer.id;
    }

    // Resolve Branch
    let targetBranchId = branchId;
    if (!targetBranchId) {
      const defaultBranch = await prisma.branch.findFirst();
      if (!defaultBranch) {
        throw new Error("No branch found in system");
      }
      targetBranchId = defaultBranch.id;
    }

    // Generate tracking code
    const trackingCode = await generateNextTrackingCode();

    const newJob = await prisma.repairJob.create({
      data: {
        trackingCode,
        branchId: targetBranchId,
        customerId: finalCustomerId,
        technicianId: technicianId || null,
        deviceBrand,
        deviceModel,
        deviceColor: deviceColor || null,
        serialIMEI: serialIMEI || null,
        passcode: passcode || null,
        patternLock: patternLock || null,
        preCheckData: preCheckData ? JSON.stringify(preCheckData) : null,
        issueDescription,
        customerSignature: customerSignature || null,
        status: "PENDING",
        laborFee: Number(laborFee) || 0,
        estimatedCost: Number(estimatedCost) || Number(laborFee) || 0,
        totalCost: Number(estimatedCost) || Number(laborFee) || 0,
        customerApproved: true,
        estimatedFinish: estimatedFinish ? new Date(estimatedFinish) : null,
        notes: notes || null,
      },
      include: {
        customer: true,
        branch: true,
        technician: true,
      },
    });

    return NextResponse.json({ success: true, data: newJob }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating repair job:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create repair job" },
      { status: 500 }
    );
  }
}
