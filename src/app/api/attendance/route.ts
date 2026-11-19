import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AccessError, staffContext } from "@/lib/staff-context";
import {
  bangkokDateString,
  bangkokDayRange,
  bangkokMonthRange,
  optId,
  reqEnum,
  reqId,
  takeParam,
  withStaff,
} from "@/lib/staff-http";

// ---------- Shift policy (single place to change) ----------
/** Shift start in Bangkok local time, "HH:mm". */
const SHIFT_START = "09:00";
/** Minutes after SHIFT_START before a clock-in counts as LATE (matches the page's 09:15 rule). */
const LATE_GRACE_MINUTES = 15;

const STATUSES = ["ON_TIME", "LATE", "ABSENT", "LEAVE"] as const;
const MANAGERS = ["ADMIN", "MANAGER"];

const recordSelect = {
  id: true,
  userId: true,
  branchId: true,
  date: true,
  clockIn: true,
  clockOut: true,
  totalHours: true,
  status: true,
  notes: true,
  verifiedBy: true,
  createdAt: true,
  user: { select: { id: true, name: true, role: true } },
  branch: { select: { id: true, name: true, code: true } },
} as const;

type RecordRow = Prisma.AttendanceRecordGetPayload<{ select: typeof recordSelect }>;

function serialize(r: RecordRow) {
  return { ...r, day: bangkokDateString(r.date) };
}

/** UTC instant for "HH:mm" (Bangkok) on the Bangkok day that starts at `dayStart`. */
function minutesToInstant(dayStart: Date, minutes: number) {
  return new Date(dayStart.getTime() + minutes * 60_000);
}
function parseHHmm(value: unknown, field: string): number {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new AccessError(400, `เวลาไม่ถูกต้อง: ${field}`);
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}
function lateStatus(dayStart: Date, clockIn: Date): "ON_TIME" | "LATE" {
  const limit = minutesToInstant(dayStart, parseHHmm(SHIFT_START, "SHIFT_START") + LATE_GRACE_MINUTES);
  return clockIn.getTime() > limit.getTime() ? "LATE" : "ON_TIME";
}
function hoursBetween(a: Date, b: Date) {
  return Math.round(((b.getTime() - a.getTime()) / 3_600_000) * 100) / 100;
}
function reqDay(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new AccessError(400, `วันที่ไม่ถูกต้อง: ${field}`);
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) throw new AccessError(400, `วันที่ไม่ถูกต้อง: ${field}`);
  return value;
}
function isUniqueError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function handleGET(req: NextRequest) {
  const actor = staffContext();
  const params = new URL(req.url).searchParams;
  const month = params.get("month");
  const dayParam = params.get("day");

  let range: { start: Date; end: Date };
  if (month) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new AccessError(400, "รูปแบบเดือนไม่ถูกต้อง (YYYY-MM)");
    range = bangkokMonthRange(month);
  } else {
    range = bangkokDayRange(dayParam ? reqDay(dayParam, "day") : undefined);
  }

  const where: Prisma.AttendanceRecordWhereInput = { date: { gte: range.start, lt: range.end } };
  // Cashiers/technicians only ever see their own records.
  if (!MANAGERS.includes(actor.role)) where.userId = actor.id;
  else {
    const userId = optId(params.get("userId"), "userId");
    if (userId) where.userId = userId;
    const branch = optId(params.get("branch"), "branch");
    if (branch) {
      if (!actor.branchIds.includes(branch)) throw new AccessError(404, "ไม่พบสาขาที่มีสิทธิ์");
      where.branchId = branch;
    }
  }

  const today = bangkokDayRange();
  const [rows, mine] = await Promise.all([
    prisma.attendanceRecord.findMany({ where, select: recordSelect, orderBy: [{ date: "desc" }, { clockIn: "asc" }], take: takeParam(params.get("take"), 500, 1000) }),
    prisma.attendanceRecord.findFirst({ where: { userId: actor.id, date: today.start }, select: recordSelect }),
  ]);

  return NextResponse.json({
    success: true,
    data: rows.map(serialize),
    me: mine ? serialize(mine) : null,
    today: bangkokDateString(),
    policy: { shiftStart: SHIFT_START, lateGraceMinutes: LATE_GRACE_MINUTES },
  });
}

async function handlePOST(req: NextRequest) {
  const actor = staffContext();
  const body = await req.json().catch(() => null);
  const action = reqEnum(body?.action, "action", ["CLOCK_IN", "CLOCK_OUT"] as const);
  const now = new Date(); // Server time only; clients cannot choose their own timestamps.
  const { start: dayStart } = bangkokDayRange();

  if (action === "CLOCK_IN") {
    const existing = await prisma.attendanceRecord.findFirst({ where: { userId: actor.id, date: dayStart }, select: { id: true } });
    if (existing) throw new AccessError(409, "วันนี้คุณลงเวลาเข้างานแล้ว");
    try {
      const created = await prisma.attendanceRecord.create({
        data: { userId: actor.id, branchId: actor.branchId, date: dayStart, clockIn: now, status: lateStatus(dayStart, now) },
        select: recordSelect,
      });
      return NextResponse.json({ success: true, data: serialize(created) }, { status: 201 });
    } catch (error) {
      if (isUniqueError(error)) throw new AccessError(409, "วันนี้คุณลงเวลาเข้างานแล้ว");
      throw error;
    }
  }

  // CLOCK_OUT: the open record from today, or yesterday (overnight shift).
  const open = await prisma.attendanceRecord.findFirst({
    where: { userId: actor.id, clockIn: { not: null }, clockOut: null, date: { gte: new Date(dayStart.getTime() - 24 * 3_600_000), lte: dayStart } },
    orderBy: { date: "desc" },
    select: { id: true, clockIn: true },
  });
  if (!open?.clockIn) throw new AccessError(409, "ยังไม่มีการลงเวลาเข้างานที่เปิดอยู่");
  // Conditional update so a double-click cannot clock out twice.
  const result = await prisma.attendanceRecord.updateMany({
    where: { id: open.id, clockOut: null },
    data: { clockOut: now, totalHours: hoursBetween(open.clockIn, now) },
  });
  if (result.count !== 1) throw new AccessError(409, "บันทึกเวลาออกงานไปแล้ว");
  const updated = await prisma.attendanceRecord.findFirst({ where: { id: open.id }, select: recordSelect });
  return NextResponse.json({ success: true, data: updated ? serialize(updated) : null });
}

/**
 * Manager correction. Body: { id } or { userId, day } (creates the day's record when missing),
 * plus clockIn/clockOut "HH:mm" (Bangkok, null to clear), optional status, and a required reason.
 */
async function handlePATCH(req: NextRequest) {
  const actor = staffContext();
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") throw new AccessError(400, "ข้อมูลไม่ถูกต้อง");
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (reason.length < 3 || reason.length > 500) throw new AccessError(400, "กรุณาระบุเหตุผลการแก้ไข (3-500 ตัวอักษร)");

  const id = optId(body.id, "id");
  let existing: RecordRow | null = null;
  let userId: string;
  let dayStart: Date;
  let branchId: string;
  if (id) {
    existing = await prisma.attendanceRecord.findFirst({ where: { id }, select: recordSelect });
    if (!existing) throw new AccessError(404, "ไม่พบบันทึกเวลา");
    userId = existing.userId;
    dayStart = existing.date;
    branchId = existing.branchId;
  } else {
    userId = reqId(body.userId, "userId");
    const day = reqDay(body.day, "day");
    if (day > bangkokDateString()) throw new AccessError(400, "ไม่สามารถบันทึกเวลาล่วงหน้าได้");
    dayStart = bangkokDayRange(day).start;
    const user = await prisma.user.findFirst({ where: { id: userId }, select: { id: true, branchId: true } });
    if (!user) throw new AccessError(404, "ไม่พบพนักงานในสาขาที่มีสิทธิ์");
    branchId = user.branchId;
    existing = await prisma.attendanceRecord.findFirst({ where: { userId, date: dayStart }, select: recordSelect });
  }
  // Segregation of duties: managers cannot correct their own time records.
  if (userId === actor.id && actor.role !== "ADMIN") throw new AccessError(403, "ไม่สามารถแก้ไขเวลาของตนเองได้ กรุณาให้ผู้ดูแลระบบแก้ไข");

  let clockIn = existing?.clockIn ?? null;
  let clockOut = existing?.clockOut ?? null;
  if (body.clockIn !== undefined) clockIn = body.clockIn === null || body.clockIn === "" ? null : minutesToInstant(dayStart, parseHHmm(body.clockIn, "clockIn"));
  if (body.clockOut !== undefined) {
    if (body.clockOut === null || body.clockOut === "") clockOut = null;
    else {
      clockOut = minutesToInstant(dayStart, parseHHmm(body.clockOut, "clockOut"));
      // Clock-out earlier than clock-in means the shift ended after midnight.
      if (clockIn && clockOut.getTime() <= clockIn.getTime()) clockOut = new Date(clockOut.getTime() + 24 * 3_600_000);
    }
  }
  if (clockOut && !clockIn) throw new AccessError(400, "ต้องมีเวลาเข้างานก่อนเวลาออกงาน");
  if (clockOut && clockOut.getTime() > Date.now() + 60_000) throw new AccessError(400, "เวลาออกงานต้องไม่อยู่ในอนาคต");
  if (clockIn && clockIn.getTime() > Date.now() + 60_000) throw new AccessError(400, "เวลาเข้างานต้องไม่อยู่ในอนาคต");

  const status =
    body.status !== undefined && body.status !== null && body.status !== ""
      ? reqEnum(body.status, "status", STATUSES)
      : clockIn
        ? lateStatus(dayStart, clockIn)
        : (existing?.status as (typeof STATUSES)[number] | undefined) ?? "ABSENT";
  if ((status === "ON_TIME" || status === "LATE") && !clockIn) throw new AccessError(400, "สถานะนี้ต้องมีเวลาเข้างาน");
  const totalHours = clockIn && clockOut ? hoursBetween(clockIn, clockOut) : null;
  if (totalHours !== null && totalHours > 24) throw new AccessError(400, "ชั่วโมงทำงานเกิน 24 ชั่วโมง");

  const data = { clockIn, clockOut, totalHours, status, notes: reason, verifiedBy: actor.id };
  const saved = await prisma.$transaction(async tx => {
    const row = existing
      ? await tx.attendanceRecord.update({ where: { id: existing.id }, data, select: recordSelect })
      : await tx.attendanceRecord.create({ data: { ...data, userId, branchId, date: dayStart }, select: recordSelect });
    await tx.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.id,
        module: "ATTENDANCE",
        action: existing ? "CORRECT" : "CREATE",
        targetId: row.id,
        details: `แก้ไขเวลาทำงานของ ${row.user?.name ?? userId} วันที่ ${bangkokDateString(dayStart)}: ${reason}`,
        beforeJson: existing
          ? JSON.stringify({ clockIn: existing.clockIn, clockOut: existing.clockOut, totalHours: existing.totalHours, status: existing.status, notes: existing.notes })
          : null,
        afterJson: JSON.stringify({ clockIn, clockOut, totalHours, status, notes: reason }),
        severity: "WARNING",
      },
    });
    return row;
  });

  return NextResponse.json({ success: true, data: serialize(saved) });
}

export const GET = withStaff(handleGET, ["ADMIN", "MANAGER", "CASHIER", "TECHNICIAN"]);
export const POST = withStaff(handlePOST, ["ADMIN", "MANAGER", "CASHIER", "TECHNICIAN"]);
export const PATCH = withStaff(handlePATCH, ["ADMIN", "MANAGER"]);
