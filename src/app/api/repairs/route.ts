import { AccessError, staffContext } from "@/lib/staff-context";
import { readJson, safeError, withStaff } from "@/lib/staff-http";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateNextTrackingCode, getRepairJobs, redactDeviceLock, staffUserSelect } from "@/lib/repairs";

export const dynamic = "force-dynamic";

async function handleGET(request: NextRequest) {
  try {
    const actor = staffContext();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const branchId = searchParams.get("branchId") || undefined;
    const technicianId = searchParams.get("technicianId") || undefined;
    const search = searchParams.get("search") || undefined;

    const jobs = await getRepairJobs({ tenantId: actor.tenantId, status, branchId, technicianId, search });
    return NextResponse.json({ success: true, data: jobs });
  } catch (error) {
    return safeError(error);
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const actor = staffContext();
    const body = await readJson(request);
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

    if (!branchId) {
      return NextResponse.json({ success: false, error: "กรุณาเลือกสาขารับเครื่อง" }, { status: 400 });
    }

    let assignedTechnicianId: string | null = technicianId || null;
    if (actor.role === "TECHNICIAN" && !assignedTechnicianId) {
      assignedTechnicianId = actor.id;
    }
    if (assignedTechnicianId) {
      const validTech = await prisma.user.findFirst({
        where: { id: assignedTechnicianId, tenantId: actor.tenantId },
        select: { id: true },
      });
      if (!validTech) {
        throw new AccessError(400, "ไม่พบข้อมูลช่างเทคนิคที่ระบุในร้าน");
      }
    }

    // Warranty/RMA claims: copy the device lock from the original job server-side,
    // strictly tenant-scoped so secrets never leak across tenants or travel to the browser.
    let finalPasscode: string | null = passcode || null;
    let finalPatternLock: string | null = patternLock || null;
    if (lockFromJobId && !finalPasscode && !finalPatternLock) {
      if (typeof lockFromJobId !== "string") throw new AccessError(400, "ข้อมูลงานซ่อมเดิมไม่ถูกต้อง");
      const source = await prisma.repairJob.findFirst({
        where: { id: lockFromJobId, tenantId: actor.tenantId },
        select: { passcode: true, patternLock: true },
      });
      if (!source) throw new AccessError(404, "ไม่พบงานซ่อมเดิม");
      finalPasscode = source.passcode;
      finalPatternLock = source.patternLock;
    }

    const parsedLaborFee = Math.max(0, Number(laborFee) || 0);
    const parsedEstimatedCost = Math.max(0, Number(estimatedCost) || parsedLaborFee);
    const parsedDeposit = Math.max(0, Number(body.depositAmount) || 0);
    const parsedDiscount = Math.max(0, Number(body.discount) || 0);
    const parsedFinish = estimatedFinish && !isNaN(new Date(estimatedFinish).getTime()) ? new Date(estimatedFinish) : null;

    const newJob = await prisma.$transaction(async (tx) => {
      // Resolve Customer
      let finalCustomerId = customerId;
      if (!finalCustomerId) {
        if (!customerPhone || !customerName) {
          throw new AccessError(400, "กรุณาระบุชื่อและเบอร์โทรศัพท์ลูกค้า");
        }

        const rawPhone = customerPhone.trim();
        const cleanPhone = rawPhone.replace(/[\s()-]/g, "");

        let existingCustomer = await tx.customer.findFirst({
          where: {
            tenantId: actor.tenantId,
            OR: [
              { phone: rawPhone },
              ...(cleanPhone ? [{ phone: cleanPhone }] : []),
            ],
          },
        });

        if (!existingCustomer) {
          existingCustomer = await tx.customer.create({
            data: {
              tenantId: actor.tenantId,
              name: customerName.trim(),
              phone: cleanPhone || rawPhone,
              lineId: customerLineId ? customerLineId.trim() : null,
              address: customerAddress ? customerAddress.trim() : null,
              nationalId: customerNationalId ? customerNationalId.trim() : null,
            },
          });
        }
        finalCustomerId = existingCustomer.id;
      }

      // Generate tracking code atomically inside transaction
      const trackingCode = await generateNextTrackingCode(tx);

      const job = await tx.repairJob.create({
        data: {
          tenantId: actor.tenantId,
          trackingCode,
          branchId,
          customerId: finalCustomerId,
          technicianId: assignedTechnicianId,
          deviceBrand,
          deviceModel,
          deviceColor: deviceColor || null,
          serialIMEI: serialIMEI || null,
          passcode: finalPasscode,
          patternLock: finalPatternLock,
          preCheckData: preCheckData ? (typeof preCheckData === "string" ? preCheckData : JSON.stringify(preCheckData)) : null,
          issueDescription,
          customerSignature: customerSignature || null,
          status: "PENDING",
          laborFee: parsedLaborFee,
          estimatedCost: parsedEstimatedCost,
          totalCost: parsedEstimatedCost,
          depositAmount: parsedDeposit,
          discount: parsedDiscount,
          customerApproved: true,
          estimatedFinish: parsedFinish,
          notes: notes || null,
        },
        include: {
          customer: {
            select: { id: true, name: true, phone: true, lineId: true, address: true },
          },
          branch: true,
          technician: { select: staffUserSelect },
        },
      });

      // Record initial intake timeline event
      await tx.repairStatusEvent.create({
        data: {
          tenantId: actor.tenantId,
          repairJobId: job.id,
          status: "PENDING",
          customerMessage: "รับเครื่องเข้าระบบแล้ว รอช่างตรวจเช็ก",
          actorId: actor.id,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          module: "REPAIRS",
          action: "CREATE",
          targetId: job.id,
          details: `รับเครื่องซ่อม ${trackingCode} (${deviceBrand} ${deviceModel})`,
          severity: "INFO",
        },
      });

      return job;
    });

    return NextResponse.json({ success: true, data: redactDeviceLock(newJob) }, { status: 201 });
  } catch (error) {
    return safeError(error);
  }
}

export const GET = withStaff(handleGET, ["ADMIN","MANAGER","CASHIER","TECHNICIAN"]);

export const POST = withStaff(handlePOST, ["ADMIN","MANAGER","CASHIER","TECHNICIAN"]);
