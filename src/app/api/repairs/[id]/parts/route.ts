import { AccessError, staffContext } from "@/lib/staff-context";
import { withStaff, reqId, reqInt, requireRole } from "@/lib/staff-http";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { staffUserSelect, redactDeviceLock } from "@/lib/repairs";

export const dynamic = "force-dynamic";

// Jobs in these states are closed; parts can no longer be added or returned.
const LOCKED_STATUSES = ["COMPLETED", "CANCELLED"];

const JOB_INCLUDE = {
  customer: true,
  branch: true,
  technician: { select: staffUserSelect },
  partUsages: { include: { product: true } },
} as const;

async function readJson(request: NextRequest) {
  try {
    return await request.json();
  } catch {
    throw new AccessError(400, "รูปแบบข้อมูลไม่ถูกต้อง");
  }
}

/** Recompute job totalCost = laborFee + sum(parts sellPrice * qty), inside the given tx. */
async function recomputeTotal(tx: Prisma.TransactionClient, jobId: string, laborFee: number) {
  const usages = await tx.repairPartUsage.findMany({ where: { repairJobId: jobId } });
  const partsTotal = usages.reduce((sum, p) => sum + p.sellPrice * p.quantity, 0);
  const totalCost = Math.round((laborFee + partsTotal) * 100) / 100;
  return tx.repairJob.update({
    where: { id: jobId },
    data: { totalCost },
    include: JOB_INCLUDE,
  });
}

async function handlePOST(request: NextRequest, { params }: { params: { id: string } }) {
  const actor = staffContext();
  const jobId = reqId(params?.id, "id");
  const body = await readJson(request);
  const productId = reqId(body?.productId, "productId");
  const quantity = reqInt(body?.quantity, "quantity", 1, 100);

  const { updatedJob, productName } = await prisma.$transaction(async (tx) => {
    const job = await tx.repairJob.findFirst({ where: { id: jobId } });
    if (!job) throw new AccessError(404, "ไม่พบข้อมูลใบงานซ่อม");
    if (LOCKED_STATUSES.includes(job.status)) {
      throw new AccessError(409, "ใบงานนี้ปิดแล้ว ไม่สามารถเบิกอะไหล่เพิ่มได้");
    }

    const product = await tx.product.findFirst({ where: { id: productId } });
    if (!product) throw new AccessError(404, "ไม่พบข้อมูลสินค้าอะไหล่");

    // Atomic guarded decrement: fails if another request consumed the stock first.
    const { count } = await tx.stockItem.updateMany({
      where: { productId, branchId: job.branchId, quantity: { gte: quantity } },
      data: { quantity: { decrement: quantity } },
    });
    if (count !== 1) throw new AccessError(409, "อะไหล่ในสต็อกไม่พอ");

    const usage = await tx.repairPartUsage.create({
      data: {
        repairJobId: job.id,
        productId,
        quantity,
        costPrice: product.costPrice,
        sellPrice: product.sellPrice,
      },
    });

    const updated = await recomputeTotal(tx, job.id, job.laborFee);

    await tx.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.id,
        module: "REPAIRS",
        action: "PART_ADD",
        targetId: job.id,
        details: JSON.stringify({ usageId: usage.id, productId, quantity, sellPrice: product.sellPrice }),
        beforeJson: JSON.stringify({ totalCost: job.totalCost }),
        afterJson: JSON.stringify({ totalCost: updated.totalCost }),
        severity: "INFO",
      },
    });

    return { updatedJob: updated, productName: product.name };
  });

  return NextResponse.json({
    success: true,
    data: redactDeviceLock(updatedJob),
    message: `เบิกอะไหล่ ${productName} จำนวน ${quantity} ชิ้น เรียบร้อยแล้ว`,
  });
}

async function handleDELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const actor = staffContext();
  requireRole(actor.role, ["ADMIN", "MANAGER"]);
  const jobId = reqId(params?.id, "id");
  const { searchParams } = new URL(request.url);
  const usageId = reqId(searchParams.get("usageId"), "usageId");

  const updatedJob = await prisma.$transaction(async (tx) => {
    const usage = await tx.repairPartUsage.findFirst({
      where: { id: usageId },
      include: { repairJob: true },
    });
    if (!usage || usage.repairJobId !== jobId) throw new AccessError(404, "ไม่พบรายการเบิกอะไหล่นี้");
    if (LOCKED_STATUSES.includes(usage.repairJob.status)) {
      throw new AccessError(409, "ใบงานนี้ปิดแล้ว ไม่สามารถคืนอะไหล่ได้");
    }

    // Delete first (deleteMany guards against a concurrent double-return).
    const del = await tx.repairPartUsage.deleteMany({ where: { id: usageId, repairJobId: jobId } });
    if (del.count !== 1) throw new AccessError(409, "รายการนี้ถูกยกเลิกไปแล้ว");

    await tx.stockItem.upsert({
      where: {
        productId_branchId: { productId: usage.productId, branchId: usage.repairJob.branchId },
      },
      create: {
        productId: usage.productId,
        branchId: usage.repairJob.branchId,
        quantity: usage.quantity,
      },
      update: { quantity: { increment: usage.quantity } },
    });

    const updated = await recomputeTotal(tx, jobId, usage.repairJob.laborFee);

    await tx.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.id,
        module: "REPAIRS",
        action: "PART_RETURN",
        targetId: jobId,
        details: JSON.stringify({ usageId, productId: usage.productId, quantity: usage.quantity }),
        beforeJson: JSON.stringify({ totalCost: usage.repairJob.totalCost }),
        afterJson: JSON.stringify({ totalCost: updated.totalCost }),
        severity: "WARNING",
      },
    });

    return updated;
  });

  return NextResponse.json({
    success: true,
    data: redactDeviceLock(updatedJob),
    message: "คืนอะไหล่เข้าสต็อกเรียบร้อยแล้ว",
  });
}

export const POST = withStaff(handlePOST, ["ADMIN", "MANAGER", "CASHIER", "TECHNICIAN"]);

export const DELETE = withStaff(handleDELETE, ["ADMIN", "MANAGER"]);
