import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { db } from "@/lib/db";
import { reqId, withStaff } from "@/lib/staff-http";
import { staffContext, AccessError } from "@/lib/staff-context";
import { throttle } from "@/lib/staff-auth";

export const GET = withStaff(async () => {
  const actor = staffContext();
  const [accounts, links, customers] = await Promise.all([
    prisma.customerAccount.findMany({ where: { tenantId: actor.tenantId }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.customerAccountLink.findMany({ where: { tenantId: actor.tenantId } }),
    prisma.customer.findMany({ where: { tenantId: actor.tenantId }, select: { id: true, name: true, phone: true }, take: 200 }),
  ]);
  return NextResponse.json({ accounts, links, customers });
}, ["ADMIN", "MANAGER"]);

export const POST = withStaff(async (request: NextRequest) => {
  const body = await request.json();
  if (!body || typeof body !== "object") throw new AccessError(400, "รูปแบบข้อมูลไม่ถูกต้อง");
  const actor = staffContext();
  await throttle(`staff-customer-access:${actor.tenantId}:${actor.id}`, 30, 60_000);
  if (typeof body.evidence !== "string" || body.evidence.trim().length < 10 || body.evidence.length > 500) throw new AccessError(400, "กรุณาบันทึกวิธีตรวจหลักฐานอย่างน้อย 10 ตัวอักษร โดยไม่ใส่เลขบัตรหรือรหัสลับ");
  // Validate ids first: findFirst with an undefined id would match an arbitrary row.
  const accountId = reqId(body.accountId, "accountId"); const customerId = reqId(body.customerId, "customerId");
  const [account, customer] = await Promise.all([
    prisma.customerAccount.findFirst({ where: { id: accountId, tenantId: actor.tenantId } }),
    prisma.customer.findFirst({ where: { id: customerId, tenantId: actor.tenantId } }),
  ]);
  if (!account || !customer) throw new AccessError(404, "ไม่พบข้อมูลในร้านนี้");
  await db.$transaction(async tx => {
    if (await tx.customerAccountLink.findFirst({ where: { tenantId: actor.tenantId, OR: [{ accountId: account.id }, { customerId: customer.id }] } })) throw new AccessError(409, "มีบัญชีเชื่อมกับข้อมูลนี้แล้ว กรุณาตรวจสอบก่อน");
    await tx.customerAccountLink.create({ data: { tenantId: actor.tenantId, accountId: account.id, customerId: customer.id, approvedBy: actor.id, evidence: body.evidence.trim() } });
    await tx.auditLog.create({ data: { tenantId: actor.tenantId, userId: actor.id, module: "CUSTOMERS", action: "PORTAL_LINK", targetId: customer.id, details: JSON.stringify({ accountId: account.id, evidence: body.evidence.trim() }) } });
  });
  return NextResponse.json({ success: true });
}, ["ADMIN", "MANAGER"]);

export const DELETE = withStaff(async (request: NextRequest) => {
  const body = await request.json();
  if (!body || typeof body !== "object") throw new AccessError(400, "รูปแบบข้อมูลไม่ถูกต้อง");
  const actor = staffContext();
  await throttle(`staff-customer-unlink:${actor.tenantId}:${actor.id}`, 30, 60_000);
  const accountId = reqId(body.accountId, "accountId");
  const link = await prisma.customerAccountLink.findFirst({ where: { accountId, tenantId: actor.tenantId } });
  if (!link) throw new AccessError(404, "ไม่พบการเชื่อมบัญชี");
  await db.$transaction(async tx => {
    await tx.customerAccountLink.deleteMany({ where: { id: link.id, tenantId: actor.tenantId } });
    await tx.customerSession.updateMany({ where: { tenantId: actor.tenantId, accountId: link.accountId }, data: { revokedAt: new Date() } });
    await tx.auditLog.create({ data: { tenantId: actor.tenantId, userId: actor.id, module: "CUSTOMERS", action: "PORTAL_UNLINK", targetId: link.customerId, details: JSON.stringify({ accountId: link.accountId }) } });
  });
  return NextResponse.json({ success: true });
}, ["ADMIN", "MANAGER"]);
