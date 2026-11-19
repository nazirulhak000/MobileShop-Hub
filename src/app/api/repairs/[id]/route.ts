import { staffContext } from "@/lib/staff-context";
import { AccessError } from "@/lib/staff-context";
import { assertTransition, reqInt, reqMoney, requireRole, safeError } from "@/lib/staff-http";
import { withStaff } from "@/lib/staff-http";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getRepairJobById, redactDeviceLock, staffUserSelect } from "@/lib/repairs";
import { RepairStatusMap } from "@/types";

export const dynamic = "force-dynamic";

const REPAIR_STATUSES = [
  "PENDING",
  "DIAGNOSING",
  "WAITING_PARTS",
  "REPAIRING",
  "QC_PASSED",
  "READY",
  "COMPLETED",
  "CANCELLED",
] as const;
type RepairStatusValue = (typeof REPAIR_STATUSES)[number];

/**
 * Allowed forward/backward moves of a repair job. Terminal states have none.
 * PENDING may skip diagnosis when the price was agreed at intake (quote approved),
 * and REPAIRING may go straight to READY for shops that don't run a separate QC step.
 * Money-related gating is still enforced by APPROVAL_REQUIRED below.
 */
const REPAIR_TRANSITIONS: Record<RepairStatusValue, readonly RepairStatusValue[]> = {
  PENDING: ["DIAGNOSING", "WAITING_PARTS", "REPAIRING", "CANCELLED"],
  DIAGNOSING: ["WAITING_PARTS", "REPAIRING", "CANCELLED"],
  WAITING_PARTS: ["REPAIRING", "CANCELLED"],
  REPAIRING: ["WAITING_PARTS", "QC_PASSED", "READY", "CANCELLED"],
  QC_PASSED: ["REPAIRING", "READY"],
  READY: ["COMPLETED", "REPAIRING"],
  COMPLETED: [],
  CANCELLED: [],
};

/** Statuses that require the customer to have approved the quote. */
const APPROVAL_REQUIRED: readonly RepairStatusValue[] = ["REPAIRING", "QC_PASSED", "READY", "COMPLETED"];

/** Customer-facing message per status (shown in tracking timeline). */
const CUSTOMER_MESSAGES: Record<RepairStatusValue, string> = {
  PENDING: "รับเครื่องเข้าระบบแล้ว รอช่างตรวจเช็ก",
  DIAGNOSING: "ช่างกำลังตรวจเช็กอาการเครื่อง",
  WAITING_PARTS: "รออะไหล่",
  REPAIRING: "กำลังซ่อม",
  QC_PASSED: "ซ่อมเสร็จ กำลังตรวจสอบคุณภาพ",
  READY: "เครื่องพร้อมรับแล้ว",
  COMPLETED: "รับเครื่องเรียบร้อย ขอบคุณที่ใช้บริการ",
  CANCELLED: "งานซ่อมถูกยกเลิก",
};

const ASSIGNABLE_ROLES = ["TECHNICIAN", "ADMIN", "MANAGER"];

const jobResponseInclude = {
  customer: true,
  branch: true,
  technician: { select: staffUserSelect },
  partUsages: {
    include: {
      product: true,
    },
  },
} as const;

async function handleGET(
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
    if (error instanceof AccessError) return safeError(error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch repair job" },
      { status: 500 }
    );
  }
}

async function handlePATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      status: rawStatus,
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
    const actor = staffContext();

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
    if (actor.role === "TECHNICIAN" && [technicianId, laborFee, estimatedCost, warrantyDays, customerApproved].some(value => value !== undefined)) throw new AccessError(403, "ช่างแก้ไขได้เฉพาะสถานะ ผลตรวจ และบันทึกงานที่รับผิดชอบ");
    if (customerApproved !== undefined) throw new AccessError(400, "กรุณาใช้ขั้นตอนยืนยันใบเสนอราคา");

    if (rawStatus !== undefined && !REPAIR_STATUSES.includes(rawStatus)) throw new AccessError(400, "สถานะงานซ่อมไม่ถูกต้อง");
    const status = rawStatus as RepairStatusValue | undefined;
    const fromStatus = existing.status as RepairStatusValue;
    const statusChanged = status !== undefined && status !== fromStatus;
    let isReopen = false;

    if (statusChanged) {
      // Quote gate: moving into work/hand-over states needs customer approval.
      if (APPROVAL_REQUIRED.includes(status) && !existing.customerApproved) throw new AccessError(409, "กรุณารอการอนุมัติใบเสนอราคาจากลูกค้า");
      // Technicians may not cancel a job; front desk / management decides.
      if (status === "CANCELLED") requireRole(actor.role, ["ADMIN", "MANAGER", "CASHIER"]);
      // Only ADMIN may reopen a terminal job back to PENDING.
      if ((fromStatus === "COMPLETED" || fromStatus === "CANCELLED") && status === "PENDING") {
        requireRole(actor.role, ["ADMIN"]);
        isReopen = true;
      } else {
        assertTransition(REPAIR_TRANSITIONS, fromStatus, status);
      }
      updateData.status = status;
      if (status === "COMPLETED" && !existing.completedAt) {
        updateData.completedAt = new Date();
      }
      if (isReopen && fromStatus === "COMPLETED") {
        updateData.completedAt = null;
      }
    }

    if (technicianId !== undefined) {
      if (technicianId) {
        if (typeof technicianId !== "string") throw new AccessError(400, "ข้อมูลช่างไม่ถูกต้อง");
        const assignee = await prisma.user.findFirst({
          where: { id: technicianId, isActive: true },
          select: { id: true, role: true },
        });
        if (!assignee || !ASSIGNABLE_ROLES.includes(assignee.role)) {
          throw new AccessError(400, "ผู้ใช้ที่เลือกไม่ใช่ช่างซ่อม");
        }
        updateData.technicianId = assignee.id;
      } else {
        updateData.technicianId = null;
      }
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
      updateData.laborFee = reqMoney(laborFee, "laborFee");
    }

    if (estimatedCost !== undefined) {
      updateData.estimatedCost = reqMoney(estimatedCost, "estimatedCost");
    }

    if (warrantyDays !== undefined) {
      updateData.warrantyDays = reqInt(warrantyDays, "warrantyDays", 0, 3650);
    }

    if (estimatedFinish !== undefined) {
      updateData.estimatedFinish = estimatedFinish ? new Date(estimatedFinish) : null;
    }

    if (photos !== undefined) {
      updateData.photos = typeof photos === "string" ? photos : JSON.stringify(photos);
    }

    const updatedJob = await prisma.$transaction(async tx => {
      // Optimistic guard: the status must still be what we validated against.
      const guard = await tx.repairJob.updateMany({
        where: { id: existing.id, status: existing.status },
        data: updateData,
      });
      if (guard.count !== 1) throw new AccessError(409, "สถานะงานซ่อมถูกเปลี่ยนโดยผู้ใช้อื่น กรุณาโหลดข้อมูลใหม่");

      let returnedParts: { productId: string; quantity: number }[] = [];
      if (statusChanged && status === "CANCELLED") {
        // Return every used part to the job's branch stock and drop the usages,
        // so a later part removal cannot return the same stock twice.
        const usages = await tx.repairPartUsage.findMany({ where: { repairJobId: existing.id } });
        for (const usage of usages) {
          await tx.stockItem.upsert({
            where: { productId_branchId: { productId: usage.productId, branchId: existing.branchId } },
            create: { productId: usage.productId, branchId: existing.branchId, quantity: usage.quantity },
            update: { quantity: { increment: usage.quantity } },
          });
        }
        if (usages.length > 0) {
          await tx.repairPartUsage.deleteMany({ where: { repairJobId: existing.id } });
        }
        returnedParts = usages.map(u => ({ productId: u.productId, quantity: u.quantity }));
      }

      // Recalculate totalCost from current labor fee + remaining parts.
      if (laborFee !== undefined || returnedParts.length > 0) {
        const remaining = await tx.repairPartUsage.findMany({ where: { repairJobId: existing.id } });
        const partsTotal = remaining.reduce((sum, p) => sum + p.sellPrice * p.quantity, 0);
        const fee = updateData.laborFee ?? existing.laborFee;
        await tx.repairJob.update({ where: { id: existing.id }, data: { totalCost: fee + partsTotal } });
      }

      const updated = await tx.repairJob.findUniqueOrThrow({
        where: { id: existing.id },
        include: jobResponseInclude,
      });

      if (statusChanged && status) {
        const label = RepairStatusMap[status].label;
        await tx.repairStatusEvent.create({ data: { tenantId: actor.tenantId, repairJobId: existing.id, status, customerMessage: CUSTOMER_MESSAGES[status], actorId: actor.id } });
        const link = await tx.customerAccountLink.findFirst({ where: { customerId: existing.customerId } });
        if (link) await tx.customerNotification.create({ data: { tenantId: actor.tenantId, accountId: link.accountId, eventKey: `repair:${existing.id}:${updated.updatedAt.getTime()}`, message: `งานซ่อม ${existing.trackingCode} อัปเดตสถานะ: ${label}`, href: "repairs" } });
        await tx.auditLog.create({
          data: {
            tenantId: actor.tenantId,
            userId: actor.id,
            module: "REPAIRS",
            action: "STATUS_CHANGE",
            targetId: existing.id,
            details: isReopen
              ? `เปิดงานซ่อม ${existing.trackingCode} ใหม่ (${fromStatus} → ${status})`
              : `เปลี่ยนสถานะงานซ่อม ${existing.trackingCode} (${fromStatus} → ${status})`,
            beforeJson: JSON.stringify({ status: fromStatus, completedAt: existing.completedAt }),
            afterJson: JSON.stringify({ status, completedAt: updated.completedAt, returnedParts }),
            severity: isReopen || status === "CANCELLED" ? "WARNING" : "INFO",
          },
        });
      }
      return updated;
    });

    return NextResponse.json({ success: true, data: redactDeviceLock(updatedJob) });
  } catch (error: any) {
    if (error instanceof AccessError) return safeError(error);
    console.error("Error updating repair job:");
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update repair job" },
      { status: 500 }
    );
  }
}

export const GET = withStaff(handleGET, ["ADMIN","MANAGER","CASHIER","TECHNICIAN"]);

export const PATCH = withStaff(handlePATCH, ["ADMIN","MANAGER","CASHIER","TECHNICIAN"]);
