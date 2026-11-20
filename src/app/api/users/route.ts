import { AccessError, staffContext } from "@/lib/staff-context";
import { reqEnum, reqId, safeError, takeParam, withStaff, readJson } from "@/lib/staff-http";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const ROLES = ["ADMIN", "MANAGER", "CASHIER", "TECHNICIAN"] as const;
type AppRole = (typeof ROLES)[number];
const PASSWORD_ERROR = "รหัสผ่านต้องยาว 12-72 ตัวอักษร";

function normalizeRole(role: unknown): AppRole {
  if (role === "SUPER_ADMIN") return "ADMIN";
  if (role === "BRANCH_MANAGER") return "MANAGER";
  return reqEnum(role, "role", ROLES);
}

const userSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  role: true,
  isActive: true,
  branchId: true,
  branch: { select: { id: true, name: true, code: true } },
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Password policy. Same normalisation as /api/auth/login: the raw string is
 * hashed/compared as-is (no trimming). 72 is bcrypt's input limit in bytes,
 * so multi-byte characters are checked by UTF-8 byte length too.
 */
function reqPassword(value: unknown): string {
  if (typeof value !== "string" || value.length < 12 || value.length > 72 || Buffer.byteLength(value, "utf8") > 72) {
    throw new AccessError(400, PASSWORD_ERROR);
  }
  return value;
}

function reqText(value: unknown, field: string, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
    throw new AccessError(400, `ข้อมูลไม่ถูกต้อง: ${field}`);
  }
  return value.trim();
}

function optEmail(value: unknown): string | null {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || value.trim().length > 200 || (value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))) {
    throw new AccessError(400, "รูปแบบอีเมลไม่ถูกต้อง");
  }
  return value.trim() || null;
}

/** Active admins in the current tenant (prisma client is tenant-scoped). */
async function countOtherActiveAdmins(excludeUserId: string) {
  const actor = staffContext();
  return prisma.user.count({ where: { tenantId: actor.tenantId, role: "ADMIN", isActive: true, id: { not: excludeUserId } } });
}

async function revokeSessions(userId: string) {
  const { tenantId } = staffContext();
  await db.staffSession.updateMany({ where: { userId, tenantId, revokedAt: null }, data: { revokedAt: new Date() } });
}

async function handleGET(request: NextRequest) {
  try {
    const actor = staffContext();
    const users = await prisma.user.findMany({
      where: { tenantId: actor.tenantId },
      select: userSelect,
      orderBy: { createdAt: "asc" },
      take: takeParam(new URL(request.url).searchParams.get("take"), 200, 500),
    });
    return NextResponse.json(users);
  } catch (error) {
    return safeError(error);
  }
}

async function handlePOST(req: Request) {
  try {
    const actor = staffContext();
    const body = await readJson<Record<string, any>>(req);
    if (!body || typeof body !== "object") throw new AccessError(400, "รูปแบบข้อมูลไม่ถูกต้อง");
    const name = reqText(body.name, "name", 100);
    const username = reqText(body.username, "username", 100);
    const password = reqPassword(body.password);
    const email = body.email === undefined ? null : optEmail(body.email);
    const role = body.role === undefined || body.role === "" ? "CASHIER" : normalizeRole(body.role);
    const branchId = reqId(body.branchId, "branchId");

    // Verify branch belongs to current tenant
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, tenantId: actor.tenantId },
      select: { id: true },
    });
    if (!branch) throw new AccessError(404, "ไม่พบสาขาที่ระบุในร้านนี้");

    // Plan limit: active users only (deactivated users do not consume a seat).
    const tenant = await prisma.tenant.findUnique({
      where: { id: actor.tenantId },
      select: { maxUsers: true },
    });
    if (tenant) {
      const activeUsers = await prisma.user.count({ where: { tenantId: actor.tenantId, isActive: true } });
      if (activeUsers >= tenant.maxUsers) throw new AccessError(409, "เกินจำนวนผู้ใช้ตามแพ็กเกจ");
    }

    const existing = await prisma.user.findFirst({
      where: { tenantId: actor.tenantId, username },
      select: { id: true },
    });
    if (existing) throw new AccessError(409, "ชื่อผู้ใช้นี้มีในระบบแล้ว กรุณาเลือกชื่ออื่น");

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        tenantId: actor.tenantId,
        name,
        username,
        password: hashedPassword,
        email,
        role,
        branchId,
        isActive: true,
      },
      select: userSelect,
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return safeError(error);
  }
}

async function handlePUT(req: Request) {
  try {
    const actor = staffContext();
    const body = await readJson<Record<string, any>>(req);
    if (!body || typeof body !== "object") throw new AccessError(400, "รูปแบบข้อมูลไม่ถูกต้อง");
    const id = reqId(body.id, "id");

    const target = await prisma.user.findFirst({
      where: { id, tenantId: actor.tenantId },
      select: { id: true, username: true, role: true, isActive: true, branchId: true },
    });
    if (!target) throw new AccessError(404, "ไม่พบผู้ใช้งาน");

    // Only update fields that are present in the request body.
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = reqText(body.name, "name", 100);
    if (body.username !== undefined) {
      const username = reqText(body.username, "username", 100);
      const clash = await prisma.user.findFirst({
        where: { tenantId: actor.tenantId, username, id: { not: id } },
        select: { id: true },
      });
      if (clash) throw new AccessError(409, "ชื่อผู้ใช้นี้มีในระบบแล้ว กรุณาเลือกชื่ออื่น");
      data.username = username;
    }
    if (body.email !== undefined) data.email = optEmail(body.email);
    if (body.role !== undefined) data.role = normalizeRole(body.role);
    if (body.branchId !== undefined) {
      const branchId = reqId(body.branchId, "branchId");
      const branch = await prisma.branch.findFirst({
        where: { id: branchId, tenantId: actor.tenantId },
        select: { id: true },
      });
      if (!branch) throw new AccessError(404, "ไม่พบสาขาที่ระบุในร้านนี้");
      data.branchId = branchId;
    }
    if (body.isActive !== undefined) {
      if (typeof body.isActive !== "boolean") throw new AccessError(400, "ข้อมูลไม่ถูกต้อง: isActive");
      data.isActive = body.isActive;
    }

    // Empty string / null password on edit means "keep the current password".
    const passwordChanged = body.password !== undefined && body.password !== null && body.password !== "";
    if (passwordChanged) data.password = await bcrypt.hash(reqPassword(body.password), 12);

    const nextRole = (data.role as string | undefined) ?? target.role;
    const nextActive = (data.isActive as boolean | undefined) ?? target.isActive;

    // Self protection: prevent self-demotion and self-deactivation
    if (target.id === actor.id && (nextRole !== "ADMIN" || !nextActive)) {
      throw new AccessError(409, "ไม่สามารถลดสิทธิ์หรือระงับบัญชีของตัวเองได้");
    }

    // Minimum admin guarantee: cannot demote or deactivate the last admin
    if (target.role === "ADMIN" && target.isActive && (nextRole !== "ADMIN" || !nextActive)) {
      if ((await countOtherActiveAdmins(id)) === 0) {
        throw new AccessError(409, "ต้องมีผู้ดูแลระบบ (ADMIN) ที่ใช้งานอยู่อย่างน้อย 1 คน");
      }
    }

    // Reactivation consumes a seat again.
    if (nextActive && !target.isActive) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: actor.tenantId },
        select: { maxUsers: true },
      });
      if (tenant && (await prisma.user.count({ where: { tenantId: actor.tenantId, isActive: true } })) >= tenant.maxUsers) {
        throw new AccessError(409, "เกินจำนวนผู้ใช้ตามแพ็กเกจ");
      }
    }

    const user = await prisma.user.update({ where: { id }, data, select: userSelect });

    const roleChanged = data.role !== undefined && data.role !== target.role;
    const branchChanged = data.branchId !== undefined && data.branchId !== target.branchId;
    const usernameChanged = data.username !== undefined && data.username !== target.username;
    if (passwordChanged || roleChanged || branchChanged || data.isActive === false || usernameChanged) {
      await revokeSessions(user.id);
    }
    return NextResponse.json(user);
  } catch (error) {
    return safeError(error);
  }
}

/** Soft delete: deactivate the user and revoke their sessions. Reactivate via PUT { isActive: true }. */
async function handleDELETE(req: Request) {
  try {
    const actor = staffContext();
    const id = reqId(new URL(req.url).searchParams.get("id"), "id");
    if (id === actor.id) throw new AccessError(409, "ไม่สามารถลบบัญชีของตัวเองได้");

    const target = await prisma.user.findFirst({
      where: { id, tenantId: actor.tenantId },
      select: { id: true, role: true, isActive: true },
    });
    if (!target) throw new AccessError(404, "ไม่พบผู้ใช้งาน");
    if (target.role === "ADMIN" && target.isActive && (await countOtherActiveAdmins(id)) === 0) {
      throw new AccessError(409, "ต้องมีผู้ดูแลระบบ (ADMIN) ที่ใช้งานอยู่อย่างน้อย 1 คน");
    }

    await prisma.user.update({ where: { id }, data: { isActive: false } });
    await revokeSessions(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return safeError(error);
  }
}

export const GET = withStaff(handleGET, ["ADMIN"]);
export const POST = withStaff(handlePOST, ["ADMIN"]);
export const PUT = withStaff(handlePUT, ["ADMIN"]);
export const DELETE = withStaff(handleDELETE, ["ADMIN"]);
