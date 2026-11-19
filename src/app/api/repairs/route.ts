import { AccessError } from "@/lib/staff-context";
import { safeError } from "@/lib/staff-http";
import { withStaff } from "@/lib/staff-http";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateNextTrackingCode, getRepairJobs, redactDeviceLock, staffUserSelect } from "@/lib/repairs";

export const dynamic = "force-dynamic";

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const branchId = searchParams.get("branchId") || undefined;
    const technicianId = searchParams.get("technicianId") || undefined;
    const search = searchParams.get("search") || undefined;

    const jobs = await getRepairJobs({ status, branchId, technicianId, search });
    return NextResponse.json({ success: true, data: jobs });
  } catch (error: any) {
    if (error instanceof AccessError) return safeError(error);
    console.error("Error fetching repair jobs:");
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch repairs" },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest) {
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
      lockFromJobId,
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
      let existingCustomer = await prisma.customer.findFirst({
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
    const targetBranchId = branchId;
    if (!targetBranchId) {
      return NextResponse.json({ success: false, error: "กรุณาเลือกสาขารับเครื่อง" }, { status: 400 });
    }

    // Warranty/RMA claims: copy the device lock from the original job server-side,
    // so the secret never has to travel through the list API to the browser.
    let finalPasscode: string | null = passcode || null;
    let finalPatternLock: string | null = patternLock || null;
    if (lockFromJobId && !finalPasscode && !finalPatternLock) {
      if (typeof lockFromJobId !== "string") throw new AccessError(400, "ข้อมูลงานซ่อมเดิมไม่ถูกต้อง");
      const source = await prisma.repairJob.findUnique({
        where: { id: lockFromJobId },
        select: { passcode: true, patternLock: true },
      });
      if (!source) throw new AccessError(404, "ไม่พบงานซ่อมเดิม");
      finalPasscode = source.passcode;
      finalPatternLock = source.patternLock;
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
        passcode: finalPasscode,
        patternLock: finalPatternLock,
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
        technician: { select: staffUserSelect },
      },
    });

    return NextResponse.json({ success: true, data: redactDeviceLock(newJob) }, { status: 201 });
  } catch (error: any) {
    if (error instanceof AccessError) return safeError(error);
    console.error("Error creating repair job:");
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create repair job" },
      { status: 500 }
    );
  }
}

export const GET = withStaff(handleGET, ["ADMIN","MANAGER","CASHIER","TECHNICIAN"]);

export const POST = withStaff(handlePOST, ["ADMIN","MANAGER","CASHIER"]);
