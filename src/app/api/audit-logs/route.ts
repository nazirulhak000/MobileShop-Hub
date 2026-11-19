import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AccessError, staffContext } from "@/lib/staff-context";
import { bangkokDayRange, optId, reqEnum, takeParam, withStaff } from "@/lib/staff-http";

const SEVERITIES = ["INFO", "WARNING", "DANGER"] as const;

function optDay(value: string | null, field: string): string | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new AccessError(400, `วันที่ไม่ถูกต้อง: ${field}`);
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) throw new AccessError(400, `วันที่ไม่ถูกต้อง: ${field}`);
  return value;
}

/**
 * GET /api/audit-logs?module=&severity=&action=&userId=&from=YYYY-MM-DD&to=YYYY-MM-DD&take=&cursor=<id>
 * Newest first; `nextCursor` is the id to pass as `cursor` for the next page (null when done).
 */
async function handleGET(req: NextRequest) {
  const actor = staffContext();
  const params = new URL(req.url).searchParams;
  const where: Prisma.AuditLogWhereInput = {};

  const mod = params.get("module");
  if (mod && mod !== "ALL") {
    if (!/^[A-Z_]{1,40}$/.test(mod)) throw new AccessError(400, "ค่าไม่ถูกต้อง: module");
    where.module = mod;
  }
  const severity = params.get("severity");
  if (severity && severity !== "ALL") where.severity = reqEnum(severity, "severity", SEVERITIES);
  const action = params.get("action");
  if (action) {
    if (!/^[A-Z_]{1,60}$/.test(action)) throw new AccessError(400, "ค่าไม่ถูกต้อง: action");
    where.action = action;
  }
  const from = optDay(params.get("from"), "from");
  const to = optDay(params.get("to"), "to");
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: bangkokDayRange(from).start } : {}),
      ...(to ? { lt: bangkokDayRange(to).end } : {}),
    };
  }

  // AuditLog has no branchId: managers are limited to entries written by users of their branches.
  const userIdFilter = optId(params.get("userId"), "userId");
  if (actor.role !== "ADMIN") {
    const branchUsers = await prisma.user.findMany({ select: { id: true } });
    const allowed = branchUsers.map(u => u.id);
    if (userIdFilter && !allowed.includes(userIdFilter)) throw new AccessError(404, "ไม่พบผู้ใช้งานในสาขาที่มีสิทธิ์");
    where.userId = userIdFilter ?? { in: allowed };
  } else if (userIdFilter) where.userId = userIdFilter;

  const take = takeParam(params.get("take"), 100, 500);
  const cursor = optId(params.get("cursor"), "cursor");
  const rows = await prisma.auditLog.findMany({
    where,
    select: {
      id: true,
      module: true,
      action: true,
      targetId: true,
      details: true,
      beforeJson: true,
      afterJson: true,
      severity: true,
      ipAddress: true,
      createdAt: true,
      user: { select: { id: true, name: true, role: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > take;
  const data = hasMore ? rows.slice(0, take) : rows;
  return NextResponse.json({ success: true, data, nextCursor: hasMore ? data[data.length - 1].id : null });
}

export const GET = withStaff(handleGET, ["ADMIN", "MANAGER"]);
