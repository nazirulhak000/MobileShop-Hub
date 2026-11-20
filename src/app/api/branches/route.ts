import { AccessError, staffContext } from "@/lib/staff-context";
import { reqId, safeError, withStaff, readJson } from "@/lib/staff-http";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function reqText(value: unknown, field: string, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
    throw new AccessError(400, `ข้อมูลไม่ถูกต้อง: ${field}`);
  }
  return value.trim();
}

/** Optional free-text field: undefined = not provided, ""/null = clear. */
function optText(value: unknown, field: string, max: number): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string" || value.trim().length > max) {
    throw new AccessError(400, `ข้อมูลไม่ถูกต้อง: ${field}`);
  }
  return value.trim() || null;
}

function reqCode(value: unknown): string {
  const code = reqText(value, "code", 30).toUpperCase();
  if (!/^[A-Z0-9_-]+$/.test(code)) {
    throw new AccessError(400, "รหัสสาขาใช้ได้เฉพาะตัวเลข 5 หลัก (เช่น 00000 = HQ) หรือ A-Z, 0-9, - และ _");
  }
  return code;
}

function isPrismaError(error: unknown, code: string) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

/** Finds next available 5-digit code (00001, 00002, ...) for a tenant */
async function findNextFreeCode(tenantId: string): Promise<string> {
  const branches = await prisma.branch.findMany({
    where: { tenantId },
    select: { code: true },
  });
  const existingCodes = new Set(branches.map((b) => b.code));
  for (let i = 1; i <= 99999; i++) {
    const candidate = String(i).padStart(5, "0");
    if (!existingCodes.has(candidate)) return candidate;
  }
  return `BR-${Date.now().toString().slice(-4)}`;
}

async function handleGET() {
  try {
    const actor = staffContext();
    const branches = await prisma.branch.findMany({
      where: { tenantId: actor.tenantId },
      include: {
        _count: {
          select: {
            users: true,
            repairJobs: true,
            stockItems: true,
            deviceImeis: true,
            sales: true,
            expenses: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(branches);
  } catch (error) {
    return safeError(error);
  }
}

async function handlePOST(req: Request) {
  try {
    const actor = staffContext();
    const body = await readJson<Record<string, any>>(req);
    if (!body || typeof body !== "object") throw new AccessError(400, "รูปแบบข้อมูลไม่ถูกต้อง");
    const name = reqText(body.name, "name", 150);
    let code = reqCode(body.code);

    // Plan limit (Tenant.maxBranches) scoped per tenant.
    const tenant = await prisma.tenant.findUnique({
      where: { id: actor.tenantId },
      select: { maxBranches: true },
    });
    const branchCount = await prisma.branch.count({ where: { tenantId: actor.tenantId } });
    if (tenant && branchCount >= tenant.maxBranches) {
      throw new AccessError(409, "เกินจำนวนสาขาตามแพ็กเกจ");
    }

    const wantsMain = body.isMain === true || code === "00000";
    if (wantsMain) {
      code = "00000";
      // If another HQ already exists, reassign it to the next free 5-digit code
      const existingHq = await prisma.branch.findFirst({
        where: { tenantId: actor.tenantId, code: { in: ["00000", "HQ"] } },
        select: { id: true },
      });
      if (existingHq) {
        const nextFree = await findNextFreeCode(actor.tenantId);
        await prisma.branch.update({
          where: { id: existingHq.id },
          data: { code: nextFree },
        });
      }
    }

    const branch = await prisma.branch.create({
      data: {
        tenantId: actor.tenantId,
        name,
        code,
        address: optText(body.address, "address", 500) ?? null,
        phone: optText(body.phone, "phone", 50) ?? null,
        taxId: optText(body.taxId, "taxId", 20) ?? null,
      },
    });
    return NextResponse.json(branch, { status: 201 });
  } catch (error) {
    if (isPrismaError(error, "P2002")) return safeError(new AccessError(409, "รหัสสาขานี้มีอยู่แล้ว"));
    return safeError(error);
  }
}

async function handlePUT(req: Request) {
  try {
    const actor = staffContext();
    const body = await readJson<Record<string, any>>(req);
    if (!body || typeof body !== "object") throw new AccessError(400, "รูปแบบข้อมูลไม่ถูกต้อง");
    const id = reqId(body.id, "id");

    const existing = await prisma.branch.findFirst({
      where: { id, tenantId: actor.tenantId },
    });
    if (!existing) throw new AccessError(404, "ไม่พบสาขา");

    const data: Prisma.BranchUpdateInput = {};
    if (body.name !== undefined) data.name = reqText(body.name, "name", 150);
    const address = optText(body.address, "address", 500);
    if (address !== undefined) data.address = address;
    const phone = optText(body.phone, "phone", 50);
    if (phone !== undefined) data.phone = phone;
    const taxId = optText(body.taxId, "taxId", 20);
    if (taxId !== undefined) data.taxId = taxId;

    const wantsMain = body.isMain === true || (body.code !== undefined && (body.code === "00000" || body.code === "HQ"));
    const isCurrentlyMain = existing.code === "00000" || existing.code === "HQ";

    if (wantsMain && !isCurrentlyMain) {
      // User is toggling this branch to become the main branch (HQ / 00000)
      const existingHq = await prisma.branch.findFirst({
        where: { tenantId: actor.tenantId, code: { in: ["00000", "HQ"] }, id: { not: id } },
      });
      if (existingHq) {
        // Swap or reassign: existing HQ gets old code (or next free code)
        const newCodeForOldHq = existing.code || (await findNextFreeCode(actor.tenantId));
        // Use a temporary code first to avoid unique constraint collision on [tenantId, code]
        await prisma.branch.update({
          where: { id: existingHq.id },
          data: { code: `TMP_${Date.now().toString().slice(-6)}` },
        });
        data.code = "00000";
        const updated = await prisma.branch.update({ where: { id }, data });
        await prisma.branch.update({
          where: { id: existingHq.id },
          data: { code: newCodeForOldHq },
        });
        return NextResponse.json(updated);
      } else {
        data.code = "00000";
      }
    } else if (body.code !== undefined) {
      data.code = reqCode(body.code);
    }

    const branch = await prisma.branch.update({ where: { id }, data });
    return NextResponse.json(branch);
  } catch (error) {
    if (isPrismaError(error, "P2002")) return safeError(new AccessError(409, "รหัสสาขานี้มีอยู่แล้ว"));
    return safeError(error);
  }
}

const IN_USE_MESSAGE = "ลบสาขาไม่ได้เพราะมีข้อมูลผูกอยู่ (พนักงาน งานซ่อม สต็อก การขาย ฯลฯ) กรุณาย้ายหรือปิดข้อมูลเหล่านั้นก่อน";

async function handleDELETE(req: Request) {
  try {
    const actor = staffContext();
    const id = reqId(new URL(req.url).searchParams.get("id"), "id");

    const branch = await prisma.branch.findFirst({
      where: { id, tenantId: actor.tenantId },
      include: {
        _count: {
          select: {
            users: true,
            repairJobs: true,
            stockItems: true,
            deviceImeis: true,
            sales: true,
            tradeInContracts: true,
            installmentContracts: true,
            expenses: true,
            attendance: true,
            payrollSlips: true,
            purchaseOrders: true,
          },
        },
      },
    });
    if (!branch) throw new AccessError(404, "ไม่พบสาขา");

    // Guard 1: Cannot delete HQ / Main Branch (00000 or HQ)
    if (branch.code === "00000" || branch.code === "HQ") {
      throw new AccessError(409, "ไม่สามารถลบสาขาสำนักงานใหญ่ (HQ / 00000) ได้");
    }

    // Guard 2: Cannot delete the last remaining branch of tenant
    const totalBranches = await prisma.branch.count({ where: { tenantId: actor.tenantId } });
    if (totalBranches <= 1) {
      throw new AccessError(409, "ไม่สามารถลบสาขาสุดท้ายของร้านได้ ระบบต้องมีสาขาอย่างน้อย 1 สาขา");
    }

    // Guard 3: Relations and dependencies check
    const [appointments, slots, branchAccess] = await Promise.all([
      prisma.appointment.count({ where: { branchId: id } }),
      prisma.bookingSlot.count({ where: { branchId: id } }),
      prisma.staffBranchAccess.count({ where: { branchId: id } }),
    ]);

    const activeCounts = {
      staff: (branch._count?.users ?? 0) + branchAccess,
      repairs: (branch._count?.repairJobs ?? 0) + appointments,
      stock: (branch._count?.stockItems ?? 0) + (branch._count?.deviceImeis ?? 0),
      sales: branch._count?.sales ?? 0,
      financial:
        (branch._count?.tradeInContracts ?? 0) +
        (branch._count?.installmentContracts ?? 0) +
        (branch._count?.expenses ?? 0),
      hr: (branch._count?.attendance ?? 0) + (branch._count?.payrollSlips ?? 0),
      po: branch._count?.purchaseOrders ?? 0,
      slots,
    };

    const totalBlocked = Object.values(activeCounts).reduce((a, b) => a + b, 0);
    if (totalBlocked > 0) {
      const details: string[] = [];
      if (activeCounts.staff > 0) details.push(`พนักงาน ${activeCounts.staff} คน`);
      if (activeCounts.repairs > 0) details.push(`งานซ่อม/นัดหมาย ${activeCounts.repairs} รายการ`);
      if (activeCounts.stock > 0) details.push(`สต็อก/IMEI ${activeCounts.stock} รายการ`);
      if (activeCounts.sales > 0) details.push(`การขาย ${activeCounts.sales} รายการ`);
      if (activeCounts.financial > 0) details.push(`สัญญาการเงิน/ค่าใช้จ่าย ${activeCounts.financial} รายการ`);
      if (activeCounts.po > 0) details.push(`ใบสั่งซื้อ ${activeCounts.po} ใบ`);

      throw new AccessError(
        409,
        `ไม่สามารถลบสาขานี้ได้เนื่องจากมีข้อมูลผูกอยู่: ${details.join(", ")} กรุณาย้ายหรือปิดข้อมูลเหล่านั้นก่อน`
      );
    }

    await prisma.branch.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (isPrismaError(error, "P2003")) return safeError(new AccessError(409, IN_USE_MESSAGE));
    return safeError(error);
  }
}

export const GET = withStaff(handleGET, ["ADMIN", "MANAGER", "CASHIER", "TECHNICIAN"]);
export const POST = withStaff(handlePOST, ["ADMIN"]);
export const PUT = withStaff(handlePUT, ["ADMIN"]);
export const DELETE = withStaff(handleDELETE, ["ADMIN"]);
