import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { db } from "@/lib/db";
import { withStaff } from "@/lib/staff-http";
import { AccessError, staffContext } from "@/lib/staff-context";
import { hashToken } from "@/lib/staff-auth";
export const POST = withStaff(async (_request: NextRequest, { params }: { params: { id: string } }) => {
  const tenantId = staffContext().tenantId;
  const job = await prisma.repairJob.findFirst({ where: { id: params.id, tenantId }, select: { id: true } });
  if (!job) throw new AccessError(404, "ไม่พบงานซ่อม");
  const token = randomBytes(32).toString("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 90 * 86_400_000);
  // Re-issuing a link invalidates every earlier link for this job (e.g. a leaked/old QR) atomically.
  await db.$transaction([
    db.publicTrackingToken.updateMany({ where: { tenantId, repairJobId: job.id, revokedAt: null }, data: { revokedAt: now } }),
    db.publicTrackingToken.create({ data: { tenantId, repairJobId: job.id, tokenHash: hashToken(token), expiresAt } }),
  ]);
  return NextResponse.json({ token, expiresAt });
}, ["ADMIN", "MANAGER", "CASHIER", "TECHNICIAN"]);
export const DELETE = withStaff(async (_request: NextRequest, { params }: { params: { id: string } }) => {
  const job = await prisma.repairJob.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!job) throw new AccessError(404, "ไม่พบงานซ่อม");
  await db.publicTrackingToken.updateMany({ where: { tenantId: staffContext().tenantId, repairJobId: job.id, revokedAt: null }, data: { revokedAt: new Date() } });
  return NextResponse.json({ success: true });
}, ["ADMIN", "MANAGER"]);
