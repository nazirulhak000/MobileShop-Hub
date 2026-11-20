import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { db } from "@/lib/db";
import { reqId, withStaff } from "@/lib/staff-http";
import { staffContext, AccessError } from "@/lib/staff-context";
import { hashToken, throttle } from "@/lib/staff-auth";

export const GET = withStaff(async () => {
  const actor = staffContext();
  const [accounts, links, customers, sessions, repairJobs] = await Promise.all([
    prisma.customerAccount.findMany({
      where: { tenantId: actor.tenantId },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.customerAccountLink.findMany({
      where: { tenantId: actor.tenantId },
    }),
    prisma.customer.findMany({
      where: { tenantId: actor.tenantId },
      select: { id: true, name: true, phone: true },
      take: 300,
    }),
    prisma.customerSession.findMany({
      where: { tenantId: actor.tenantId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        accountId: true,
        createdAt: true,
        expiresAt: true,
        revokedAt: true,
      },
      take: 500,
    }),
    prisma.repairJob.findMany({
      where: { tenantId: actor.tenantId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        customerId: true,
        trackingCode: true,
        deviceBrand: true,
        deviceModel: true,
        status: true,
      },
      take: 200,
    }),
  ]);

  // Aggregate session statistics per account
  const now = new Date();
  const sessionStats = new Map<string, { lastLoginAt: string | null; activeSessionsCount: number }>();
  for (const s of sessions) {
    const existing = sessionStats.get(s.accountId);
    const isActive = !s.revokedAt && s.expiresAt > now;
    if (!existing) {
      sessionStats.set(s.accountId, {
        lastLoginAt: s.createdAt.toISOString(),
        activeSessionsCount: isActive ? 1 : 0,
      });
    } else {
      if (isActive) {
        existing.activeSessionsCount += 1;
      }
    }
  }

  const enrichedAccounts = accounts.map((acc) => {
    const stats = sessionStats.get(acc.id);
    return {
      ...acc,
      lastLoginAt: stats?.lastLoginAt || null,
      activeSessionsCount: stats?.activeSessionsCount || 0,
    };
  });

  return NextResponse.json({
    accounts: enrichedAccounts,
    links,
    customers,
    repairJobs,
  });
}, ["ADMIN", "MANAGER", "CASHIER"]);

export const POST = withStaff(async (request: NextRequest) => {
  const body = await request.json();
  if (!body || typeof body !== "object") throw new AccessError(400, "รูปแบบข้อมูลไม่ถูกต้อง");
  const actor = staffContext();
  await throttle(`staff-customer-access:${actor.tenantId}:${actor.id}`, 60, 60_000);

  // 1. Action: Generate 1-Click Public Tracking Link for Support
  if (body.action === "GENERATE_TRACKING_LINK") {
    const repairJobId = reqId(body.repairJobId, "repairJobId");
    const job = await prisma.repairJob.findFirst({
      where: { id: repairJobId, tenantId: actor.tenantId },
      select: { id: true, trackingCode: true, deviceBrand: true, deviceModel: true },
    });
    if (!job) throw new AccessError(404, "ไม่พบงานซ่อมในร้านนี้");

    const token = randomBytes(32).toString("hex");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 90 * 86_400_000);

    await db.$transaction([
      db.publicTrackingToken.updateMany({
        where: { tenantId: actor.tenantId, repairJobId: job.id, revokedAt: null },
        data: { revokedAt: now },
      }),
      db.publicTrackingToken.create({
        data: {
          tenantId: actor.tenantId,
          repairJobId: job.id,
          tokenHash: hashToken(token),
          expiresAt,
        },
      }),
      db.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          module: "CUSTOMERS",
          action: "PORTAL_TRACKING_LINK_GENERATED",
          targetId: job.id,
          details: JSON.stringify({ trackingCode: job.trackingCode }),
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      token,
      trackingUrl: `/track/${token}`,
      trackingCode: job.trackingCode,
      deviceBrand: job.deviceBrand,
      deviceModel: job.deviceModel,
    });
  }

  // 2. Action: Revoke active customer sessions (Kick Out)
  if (body.action === "REVOKE_PORTAL_SESSIONS") {
    const accountId = reqId(body.accountId, "accountId");
    const account = await prisma.customerAccount.findFirst({
      where: { id: accountId, tenantId: actor.tenantId },
    });
    if (!account) throw new AccessError(404, "ไม่พบบัญชีลูกค้าในร้านนี้");

    const result = await db.customerSession.updateMany({
      where: { tenantId: actor.tenantId, accountId: account.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await db.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.id,
        module: "CUSTOMERS",
        action: "PORTAL_SESSIONS_REVOKED",
        targetId: account.id,
        details: JSON.stringify({ revokedCount: result.count }),
      },
    });

    return NextResponse.json({ success: true, revokedCount: result.count });
  }

  // 3. Action: Toggle Account Status (ACTIVE vs SUSPENDED)
  if (body.action === "TOGGLE_STATUS") {
    const accountId = reqId(body.accountId, "accountId");
    const nextStatus = body.status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE";
    const account = await prisma.customerAccount.findFirst({
      where: { id: accountId, tenantId: actor.tenantId },
    });
    if (!account) throw new AccessError(404, "ไม่พบบัญชีลูกค้าในร้านนี้");

    await db.$transaction(async (tx) => {
      await tx.customerAccount.update({
        where: { id: account.id },
        data: { status: nextStatus },
      });
      if (nextStatus === "SUSPENDED") {
        await tx.customerSession.updateMany({
          where: { tenantId: actor.tenantId, accountId: account.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      await tx.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          module: "CUSTOMERS",
          action: "PORTAL_STATUS_CHANGED",
          targetId: account.id,
          details: JSON.stringify({ oldStatus: account.status, newStatus: nextStatus }),
        },
      });
    });

    return NextResponse.json({ success: true, status: nextStatus });
  }

  // 4. Default Action: KYC Verification & Link Account to CRM
  if (typeof body.evidence !== "string" || body.evidence.trim().length < 10 || body.evidence.length > 500) {
    throw new AccessError(400, "กรุณาบันทึกวิธีตรวจหลักฐานอย่างน้อย 10 ตัวอักษร โดยไม่ใส่เลขบัตรหรือรหัสลับ");
  }
  const accountId = reqId(body.accountId, "accountId");
  const customerId = reqId(body.customerId, "customerId");
  const [account, customer] = await Promise.all([
    prisma.customerAccount.findFirst({ where: { id: accountId, tenantId: actor.tenantId } }),
    prisma.customer.findFirst({ where: { id: customerId, tenantId: actor.tenantId } }),
  ]);
  if (!account || !customer) throw new AccessError(404, "ไม่พบข้อมูลในร้านนี้");

  await db.$transaction(async (tx) => {
    if (
      await tx.customerAccountLink.findFirst({
        where: { tenantId: actor.tenantId, OR: [{ accountId: account.id }, { customerId: customer.id }] },
      })
    ) {
      throw new AccessError(409, "มีบัญชีเชื่อมกับข้อมูลนี้แล้ว กรุณาตรวจสอบก่อน");
    }
    await tx.customerAccountLink.create({
      data: {
        tenantId: actor.tenantId,
        accountId: account.id,
        customerId: customer.id,
        approvedBy: actor.id,
        evidence: body.evidence.trim(),
      },
    });
    await tx.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.id,
        module: "CUSTOMERS",
        action: "PORTAL_LINK",
        targetId: customer.id,
        details: JSON.stringify({ accountId: account.id, evidence: body.evidence.trim() }),
      },
    });
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

  await db.$transaction(async (tx) => {
    await tx.customerAccountLink.deleteMany({ where: { id: link.id, tenantId: actor.tenantId } });
    await tx.customerSession.updateMany({
      where: { tenantId: actor.tenantId, accountId: link.accountId },
      data: { revokedAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.id,
        module: "CUSTOMERS",
        action: "PORTAL_UNLINK",
        targetId: link.customerId,
        details: JSON.stringify({ accountId: link.accountId }),
      },
    });
  });

  return NextResponse.json({ success: true });
}, ["ADMIN", "MANAGER"]);
