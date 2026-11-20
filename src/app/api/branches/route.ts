import { AccessError, staffContext } from "@/lib/staff-context";
import { reqId, safeError, withStaff, readJson } from "@/lib/staff-http";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function reqText(value: unknown, field: string, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw new AccessError(400, `ข้อมูลไม่ถูกต้อง: ${field}`);
  return value.trim();
}

/** Optional free-text field: undefined = not provided, ""/null = clear. */
function optText(value: unknown, field: string, max: number): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string" || value.trim().length > max) throw new AccessError(400, `ข้อมูลไม่ถูกต้อง: ${field}`);
  return value.trim() || null;
}

function reqCode(value: unknown): string {
  const code = reqText(value, "code", 30).toUpperCase();
  if (!/^[A-Z0-9_-]+$/.test(code)) throw new AccessError(400, "รหัสสาขาใช้ได้เฉพาะ A-Z, 0-9, - และ _");
  return code;
}

function isPrismaError(error: unknown, code: string) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
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
            sales: true,
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
    const code = reqCode(body.code);

    // Plan limit (Tenant.maxBranches) scoped per tenant.
    const tenant = await prisma.tenant.findUnique({
      where: { id: actor.tenantId },
      select: { maxBranches: true },
    });
    const branchCount = await prisma.branch.count({ where: { tenantId: actor.tenantId } });
    if (tenant && branchCount >= tenant.maxBranches) {
      throw new AccessError(409, "เกินจำนวนสาขาตามแพ็กเกจ");
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
      select: { id: true },
    });
    if (!existing) throw new AccessError(404, "ไม่พบสาขา");

    // Only update fields that are present in the request body.
    const data: Prisma.BranchUpdateInput = {};
    if (body.name !== undefined) data.name = reqText(body.name, "name", 150);
    if (body.code !== undefined) data.code = reqCode(body.code);
    const address = optText(body.address, "address", 500);
    if (address !== undefined) data.address = address;
    const phone = optText(body.phone, "phone", 50);
    if (phone !== undefined) data.phone = phone;
    const taxId = optText(body.taxId, "taxId", 20);
    if (taxId !== undefined) data.taxId = taxId;

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
      include: { _count: true },
    });
    if (!branch) throw new AccessError(404, "ไม่พบสาขา");

    // Pre-check FK relations plus tables that reference branchId without a Prisma relation.
    const relationCount = Object.values(branch._count as Record<string, number>).reduce((sum, n) => sum + n, 0);
    const [appointments, slots] = await Promise.all([
      prisma.appointment.count({ where: { branchId: id } }),
      prisma.bookingSlot.count({ where: { branchId: id } }),
    ]);
    if (relationCount + appointments + slots > 0) throw new AccessError(409, IN_USE_MESSAGE);

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
