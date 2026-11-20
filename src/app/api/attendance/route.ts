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
/** Shift end standard working time in Bangkok local time (9 hours including lunch = 8 work hours). */
const SHIFT_END = "18:00";
/** Standard work hours per day before overtime kicks in. */
const STANDARD_WORK_HOURS = 8;
/** Minutes after SHIFT_START before a clock-in counts as LATE. */
const LATE_GRACE_MINUTES = 15;

const LEAVE_TYPES = ["SICK", "ANNUAL", "PERSONAL"] as const;
const STATUSES = [
  "ON_TIME",
  "LATE",
  "ABSENT",
  "LEAVE",
  "LEAVE_SICK",
  "LEAVE_ANNUAL",
  "LEAVE_PERSONAL",
] as const;
const MANAGERS = ["ADMIN", "MANAGER"];

const recordSelect = {
  id: true,
  tenantId: true,
  userId: true,
  branchId: true,
  date: true,
  clockIn: true,
  clockOut: true,
  totalHours: true,
  overtimeHours: true,
  otMultiplier: true,
  lateMinutes: true,
  status: true,
  leaveType: true,
  notes: true,
  verifiedBy: true,
  createdAt: true,
  user: { select: { id: true, name: true, role: true } },
  branch: { select: { id: true, name: true, code: true } },
} as const;

type RecordRow = Prisma.AttendanceRecordGetPayload<{ select: typeof recordSelect }>;

function serialize(r: RecordRow) {
  return {
    ...r,
    day: bangkokDateString(r.date),
    overtimeHours: r.overtimeHours ?? 0,
    otMultiplier: r.otMultiplier ?? 1.5,
    lateMinutes: r.lateMinutes ?? 0,
  };
}

/** UTC instant for "HH:mm" (Bangkok) on the Bangkok day that starts at `dayStart`. */
function minutesToInstant(dayStart: Date, minutes: number) {
  return new Date(dayStart.getTime() + minutes * 60_000);
}

function parseHHmm(value: unknown, field: string): number {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new AccessError(400, `เวลาไม่ถูกต้อง: ${field}`);
  }
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function calculateLateMinutes(dayStart: Date, clockIn: Date): number {
  const startMinute = parseHHmm(SHIFT_START, "SHIFT_START");
  const shiftStartInstant = minutesToInstant(dayStart, startMinute);
  if (clockIn.getTime() <= shiftStartInstant.getTime()) return 0;
  return Math.floor((clockIn.getTime() - shiftStartInstant.getTime()) / 60_000);
}

function lateStatus(dayStart: Date, clockIn: Date): "ON_TIME" | "LATE" {
  const lateMins = calculateLateMinutes(dayStart, clockIn);
  return lateMins > LATE_GRACE_MINUTES ? "LATE" : "ON_TIME";
}

function hoursBetween(a: Date, b: Date) {
  return Math.round(((b.getTime() - a.getTime()) / 3_600_000) * 100) / 100;
}

function reqDay(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AccessError(400, `วันที่ไม่ถูกต้อง: ${field}`);
  }
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) {
    throw new AccessError(400, `วันที่ไม่ถูกต้อง: ${field}`);
  }
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
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      throw new AccessError(400, "รูปแบบเดือนไม่ถูกต้อง (YYYY-MM)");
    }
    range = bangkokMonthRange(month);
  } else {
    range = bangkokDayRange(dayParam ? reqDay(dayParam, "day") : undefined);
  }

  // Multi-tenant isolation: always enforce tenantId
  const where: Prisma.AttendanceRecordWhereInput = {
    tenantId: actor.tenantId,
    date: { gte: range.start, lt: range.end },
  };

  // Cashiers/technicians only ever see their own records within their branch
  if (!MANAGERS.includes(actor.role)) {
    where.userId = actor.id;
    where.branchId = { in: actor.branchIds };
  } else {
    const userId = optId(params.get("userId"), "userId");
    if (userId) where.userId = userId;
    const branch = optId(params.get("branch"), "branch");
    if (branch) {
      if (!actor.branchIds.includes(branch)) throw new AccessError(404, "ไม่พบสาขาที่มีสิทธิ์");
      where.branchId = branch;
    } else {
      where.branchId = { in: actor.branchIds };
    }
  }

  const statusParam = params.get("status");
  if (statusParam && statusParam !== "ALL") {
    if (statusParam === "LEAVE") {
      where.status = { in: ["LEAVE", "LEAVE_SICK", "LEAVE_ANNUAL", "LEAVE_PERSONAL"] };
    } else {
      where.status = statusParam;
    }
  }

  const today = bangkokDayRange();
  const [rows, mine] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where,
      select: recordSelect,
      orderBy: [{ date: "desc" }, { clockIn: "asc" }],
      take: takeParam(params.get("take"), 500, 1000),
    }),
    prisma.attendanceRecord.findFirst({
      where: { tenantId: actor.tenantId, userId: actor.id, date: today.start },
      select: recordSelect,
    }),
  ]);

  const serialized = rows.map(serialize);

  // Compute stats for overview
  const countOf = (st: string) => serialized.filter((r) => r.status === st).length;
  const leaveCount = serialized.filter((r) => r.status.startsWith("LEAVE")).length;
  const totalOtHours = Math.round(serialized.reduce((acc, r) => acc + (r.overtimeHours || 0), 0) * 10) / 10;
  const totalLateMinutes = serialized.reduce((acc, r) => acc + (r.lateMinutes || 0), 0);

  return NextResponse.json({
    success: true,
    data: serialized,
    me: mine ? serialize(mine) : null,
    today: bangkokDateString(),
    policy: {
      shiftStart: SHIFT_START,
      shiftEnd: SHIFT_END,
      standardWorkHours: STANDARD_WORK_HOURS,
      lateGraceMinutes: LATE_GRACE_MINUTES,
    },
    summary: {
      total: serialized.length,
      onTime: countOf("ON_TIME"),
      late: countOf("LATE"),
      leave: leaveCount,
      leaveSick: countOf("LEAVE_SICK"),
      leaveAnnual: countOf("LEAVE_ANNUAL"),
      leavePersonal: countOf("LEAVE_PERSONAL"),
      absent: countOf("ABSENT"),
      totalOtHours,
      totalLateMinutes,
    },
  });
}

async function handlePOST(req: NextRequest) {
  const actor = staffContext();
  const body = await req.json().catch(() => null);
  const action = reqEnum(body?.action, "action", ["CLOCK_IN", "CLOCK_OUT", "LEAVE"] as const);
  const now = new Date(); // Server time only; clients cannot choose their own timestamps.
  const { start: dayStart } = bangkokDayRange();

  if (action === "CLOCK_IN") {
    const existing = await prisma.attendanceRecord.findFirst({
      where: { tenantId: actor.tenantId, userId: actor.id, date: dayStart },
      select: { id: true, status: true },
    });
    if (existing) {
      if (existing.status.startsWith("LEAVE")) {
        throw new AccessError(409, "วันนี้คุณได้บันทึกลางานไว้แล้ว ไม่สามารถลงเวลาเข้างานได้");
      }
      throw new AccessError(409, "วันนี้คุณลงเวลาเข้างานแล้ว");
    }

    const lateMins = calculateLateMinutes(dayStart, now);
    const status = lateMins > LATE_GRACE_MINUTES ? "LATE" : "ON_TIME";

    try {
      const created = await prisma.attendanceRecord.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          branchId: actor.branchId,
          date: dayStart,
          clockIn: now,
          lateMinutes: lateMins,
          status,
        },
        select: recordSelect,
      });
      return NextResponse.json({ success: true, data: serialize(created) }, { status: 201 });
    } catch (error) {
      if (isUniqueError(error)) throw new AccessError(409, "วันนี้คุณลงเวลาเข้างานแล้ว");
      throw error;
    }
  }

  if (action === "CLOCK_OUT") {
    // CLOCK_OUT: the open record from today, or yesterday (overnight shift).
    const open = await prisma.attendanceRecord.findFirst({
      where: {
        tenantId: actor.tenantId,
        userId: actor.id,
        clockIn: { not: null },
        clockOut: null,
        date: { gte: new Date(dayStart.getTime() - 24 * 3_600_000), lte: dayStart },
      },
      orderBy: { date: "desc" },
      select: { id: true, clockIn: true },
    });
    if (!open?.clockIn) throw new AccessError(409, "ยังไม่มีการลงเวลาเข้างานที่เปิดอยู่");

    const totalHours = hoursBetween(open.clockIn, now);
    // Overtime tracking: regular hours beyond standard 8 hours
    const overtimeHours = Math.max(0, Math.round((totalHours - STANDARD_WORK_HOURS) * 100) / 100);
    const otMultiplier =
      typeof body?.otMultiplier === "number" && [1.5, 2.0, 3.0].includes(body.otMultiplier)
        ? body.otMultiplier
        : 1.5;

    // Conditional update so a double-click cannot clock out twice.
    const result = await prisma.attendanceRecord.updateMany({
      where: { id: open.id, tenantId: actor.tenantId, clockOut: null },
      data: {
        clockOut: now,
        totalHours,
        overtimeHours,
        otMultiplier,
      },
    });
    if (result.count !== 1) throw new AccessError(409, "บันทึกเวลาออกงานไปแล้ว");
    const updated = await prisma.attendanceRecord.findFirst({
      where: { id: open.id, tenantId: actor.tenantId },
      select: recordSelect,
    });
    return NextResponse.json({ success: true, data: updated ? serialize(updated) : null });
  }

  // action === "LEAVE" (Leave requests: Sick, Annual, Personal)
  const targetUserId =
    MANAGERS.includes(actor.role) && body?.userId ? reqId(body.userId, "userId") : actor.id;
  const user = await prisma.user.findFirst({
    where: { id: targetUserId, tenantId: actor.tenantId, branchId: { in: actor.branchIds } },
    select: { id: true, branchId: true, name: true },
  });
  if (!user) throw new AccessError(404, "ไม่พบพนักงานในสาขาที่มีสิทธิ์");

  const leaveType = reqEnum(body?.leaveType, "leaveType", LEAVE_TYPES);
  const day = reqDay(body?.day, "day");
  const leaveDayStart = bangkokDayRange(day).start;
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (reason.length < 3 || reason.length > 500) {
    throw new AccessError(400, "กรุณาระบุเหตุผลการลา (3-500 ตัวอักษร)");
  }

  const existing = await prisma.attendanceRecord.findFirst({
    where: { tenantId: actor.tenantId, userId: targetUserId, date: leaveDayStart },
    select: { id: true, clockIn: true },
  });
  if (existing?.clockIn) {
    throw new AccessError(409, "ไม่สามารถบันทึกลาในวันที่ลงเวลาเข้างานแล้ว");
  }

  const status = `LEAVE_${leaveType}`;
  const data = {
    tenantId: actor.tenantId,
    userId: targetUserId,
    branchId: user.branchId,
    date: leaveDayStart,
    clockIn: null,
    clockOut: null,
    totalHours: null,
    overtimeHours: 0,
    lateMinutes: 0,
    status,
    leaveType,
    notes: reason,
    verifiedBy: actor.id,
  };

  const saved = existing
    ? await prisma.attendanceRecord.update({
        where: { id: existing.id },
        data,
        select: recordSelect,
      })
    : await prisma.attendanceRecord.create({
        data,
        select: recordSelect,
      });

  await prisma.auditLog.create({
    data: {
      tenantId: actor.tenantId,
      userId: actor.id,
      module: "ATTENDANCE",
      action: "LEAVE_REQUEST",
      targetId: saved.id,
      details: `บันทึกการลา (${leaveType}) ของ ${user.name} วันที่ ${day}: ${reason}`,
      afterJson: JSON.stringify({ userId: targetUserId, day, leaveType, status, reason }),
      severity: "INFO",
    },
  });

  return NextResponse.json({ success: true, data: serialize(saved) }, { status: 201 });
}

/**
 * Manager correction & manual entry.
 * Body: { id } or { userId, day }, plus clockIn, clockOut, overtimeHours, otMultiplier, status, leaveType, reason.
 */
async function handlePATCH(req: NextRequest) {
  const actor = staffContext();
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") throw new AccessError(400, "ข้อมูลไม่ถูกต้อง");
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (reason.length < 3 || reason.length > 500) {
    throw new AccessError(400, "กรุณาระบุเหตุผลการแก้ไข (3-500 ตัวอักษร)");
  }

  const id = optId(body.id, "id");
  let existing: RecordRow | null = null;
  let userId: string;
  let dayStart: Date;
  let branchId: string;

  if (id) {
    existing = await prisma.attendanceRecord.findFirst({
      where: { id, tenantId: actor.tenantId, branchId: { in: actor.branchIds } },
      select: recordSelect,
    });
    if (!existing) throw new AccessError(404, "ไม่พบบันทึกเวลา");
    userId = existing.userId;
    dayStart = existing.date;
    branchId = existing.branchId;
  } else {
    userId = reqId(body.userId, "userId");
    const day = reqDay(body.day, "day");
    if (day > bangkokDateString()) throw new AccessError(400, "ไม่สามารถบันทึกเวลาล่วงหน้าได้");
    dayStart = bangkokDayRange(day).start;
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId: actor.tenantId, branchId: { in: actor.branchIds } },
      select: { id: true, branchId: true },
    });
    if (!user) throw new AccessError(404, "ไม่พบพนักงานในสาขาที่มีสิทธิ์");
    branchId = user.branchId;
    existing = await prisma.attendanceRecord.findFirst({
      where: { userId, tenantId: actor.tenantId, date: dayStart },
      select: recordSelect,
    });
  }

  // Segregation of duties: managers cannot correct their own time records.
  if (userId === actor.id && actor.role !== "ADMIN") {
    throw new AccessError(403, "ไม่สามารถแก้ไขเวลาของตนเองได้ กรุณาให้ผู้ดูแลระบบแก้ไข");
  }

  let clockIn = existing?.clockIn ?? null;
  let clockOut = existing?.clockOut ?? null;
  if (body.clockIn !== undefined) {
    clockIn =
      body.clockIn === null || body.clockIn === ""
        ? null
        : minutesToInstant(dayStart, parseHHmm(body.clockIn, "clockIn"));
  }
  if (body.clockOut !== undefined) {
    if (body.clockOut === null || body.clockOut === "") {
      clockOut = null;
    } else {
      clockOut = minutesToInstant(dayStart, parseHHmm(body.clockOut, "clockOut"));
      // Clock-out earlier than clock-in means the shift ended after midnight.
      if (clockIn && clockOut.getTime() <= clockIn.getTime()) {
        clockOut = new Date(clockOut.getTime() + 24 * 3_600_000);
      }
    }
  }
  if (clockOut && !clockIn) throw new AccessError(400, "ต้องมีเวลาเข้างานก่อนเวลาออกงาน");
  if (clockOut && clockOut.getTime() > Date.now() + 60_000) throw new AccessError(400, "เวลาออกงานต้องไม่อยู่ในอนาคต");
  if (clockIn && clockIn.getTime() > Date.now() + 60_000) throw new AccessError(400, "เวลาเข้างานต้องไม่อยู่ในอนาคต");

  const lateMinutes = clockIn ? calculateLateMinutes(dayStart, clockIn) : 0;

  let status: string;
  let leaveType: string | null = null;

  if (body.status !== undefined && body.status !== null && body.status !== "") {
    status = reqEnum(body.status, "status", STATUSES);
    if (status.startsWith("LEAVE_")) {
      leaveType = status.replace("LEAVE_", "");
    } else if (status === "LEAVE") {
      leaveType =
        body.leaveType && LEAVE_TYPES.includes(body.leaveType) ? body.leaveType : "PERSONAL";
      status = `LEAVE_${leaveType}`;
    }
  } else if (clockIn) {
    status = lateMinutes > LATE_GRACE_MINUTES ? "LATE" : "ON_TIME";
  } else {
    status = existing?.status ?? "ABSENT";
  }

  if ((status === "ON_TIME" || status === "LATE") && !clockIn) {
    throw new AccessError(400, "สถานะนี้ต้องมีเวลาเข้างาน");
  }

  const totalHours = clockIn && clockOut ? hoursBetween(clockIn, clockOut) : null;
  if (totalHours !== null && totalHours > 24) throw new AccessError(400, "ชั่วโมงทำงานเกิน 24 ชั่วโมง");

  let overtimeHours = 0;
  if (body.overtimeHours !== undefined && body.overtimeHours !== null && body.overtimeHours !== "") {
    const ot = Number(body.overtimeHours);
    if (!Number.isFinite(ot) || ot < 0 || ot > 24) throw new AccessError(400, "ชั่วโมง OT ไม่ถูกต้อง");
    overtimeHours = Math.round(ot * 100) / 100;
  } else if (totalHours !== null && totalHours > STANDARD_WORK_HOURS) {
    overtimeHours = Math.max(0, Math.round((totalHours - STANDARD_WORK_HOURS) * 100) / 100);
  }

  let otMultiplier = 1.5;
  if (body.otMultiplier !== undefined && body.otMultiplier !== null) {
    const mult = Number(body.otMultiplier);
    if (![1.5, 2.0, 3.0].includes(mult)) throw new AccessError(400, "ตัวคูณ OT ต้องเป็น 1.5, 2.0 หรือ 3.0");
    otMultiplier = mult;
  } else if (existing?.otMultiplier) {
    otMultiplier = existing.otMultiplier;
  }

  const data = {
    tenantId: actor.tenantId,
    clockIn,
    clockOut,
    totalHours,
    overtimeHours,
    otMultiplier,
    lateMinutes,
    status,
    leaveType,
    notes: reason,
    verifiedBy: actor.id,
  };

  const saved = await prisma.$transaction(async (tx) => {
    const row = existing
      ? await tx.attendanceRecord.update({
          where: { id: existing.id },
          data,
          select: recordSelect,
        })
      : await tx.attendanceRecord.create({
          data: { ...data, userId, branchId, date: dayStart },
          select: recordSelect,
        });

    await tx.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.id,
        module: "ATTENDANCE",
        action: existing ? "CORRECT" : "CREATE",
        targetId: row.id,
        details: `แก้ไขเวลาทำงานของ ${row.user?.name ?? userId} วันที่ ${bangkokDateString(dayStart)}: ${reason}`,
        beforeJson: existing
          ? JSON.stringify({
              clockIn: existing.clockIn,
              clockOut: existing.clockOut,
              totalHours: existing.totalHours,
              overtimeHours: existing.overtimeHours,
              status: existing.status,
              notes: existing.notes,
            })
          : null,
        afterJson: JSON.stringify({
          clockIn,
          clockOut,
          totalHours,
          overtimeHours,
          status,
          notes: reason,
        }),
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
