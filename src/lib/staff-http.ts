import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { AccessError, staffStorage } from "./staff-context";
import { checkOrigin, requireStaffSession } from "./staff-auth";

export function safeError(error: unknown) {
  if (error instanceof SyntaxError) {
    return NextResponse.json(
      { success: false, error: "รูปแบบข้อมูล JSON ไม่ถูกต้อง" },
      { status: 400, headers: { "Cache-Control": "private, no-store" } }
    );
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(", ") : "";
      return NextResponse.json(
        { success: false, error: target ? `ข้อมูลซ้ำซ้อนในระบบ (${target})` : "ข้อมูลนี้มีอยู่ในระบบแล้ว (ซ้ำซ้อน)" },
        { status: 409, headers: { "Cache-Control": "private, no-store" } }
      );
    }
    if (error.code === "P2003") {
      return NextResponse.json(
        { success: false, error: "ไม่สามารถดำเนินการได้เนื่องจากข้อมูลเชื่อมโยงกันอยู่" },
        { status: 409, headers: { "Cache-Control": "private, no-store" } }
      );
    }
    if (error.code === "P2025") {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูลที่ต้องการ" },
        { status: 404, headers: { "Cache-Control": "private, no-store" } }
      );
    }
  }
  const status = error instanceof AccessError ? error.status : 500;
  return NextResponse.json(
    { success: false, error: error instanceof AccessError ? error.message : "ไม่สามารถทำรายการได้ กรุณาลองใหม่" },
    { status, headers: { "Cache-Control": "private, no-store" } }
  );
}

export async function readJson<T = any>(request: NextRequest | Request): Promise<T> {
  try {
    return await request.json();
  } catch {
    throw new AccessError(400, "รูปแบบข้อมูล JSON ไม่ถูกต้อง");
  }
}
function redact(value: unknown, isMarginRole = true): unknown {
  if (Array.isArray(value)) return value.map(v => redact(v, isMarginRole));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => {
          if (["password", "tokenHash", "secretHash"].includes(key)) return false;
          if (!isMarginRole && key === "costPrice") return false;
          return true;
        })
        .map(([key, entry]) => [key, redact(entry, isMarginRole)])
    );
  }
  return value;
}
// ---------- Shared input validation (throw AccessError(400) on bad input) ----------
export function reqId(value: unknown, field = "id"): string {
  if (typeof value !== "string" || !value.trim()) throw new AccessError(400, `ข้อมูลไม่ถูกต้อง: ${field}`);
  return value.trim();
}
export function optId(value: unknown, field = "id"): string | null {
  if (value === undefined || value === null || value === "") return null;
  return reqId(value, field);
}
/** Integer in [min, max]. Rejects NaN, decimals, strings that are not numbers. */
export function reqInt(value: unknown, field: string, min: number, max: number): number {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isInteger(n) || n < min || n > max) throw new AccessError(400, `ข้อมูลตัวเลขไม่ถูกต้อง: ${field}`);
  return n;
}
/** Finite number in [min, max], rounded to 2 decimals (baht/satang). */
export function reqMoney(value: unknown, field: string, min = 0, max = 100_000_000): number {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n) || n < min || n > max) throw new AccessError(400, `จำนวนเงินไม่ถูกต้อง: ${field}`);
  return Math.round(n * 100) / 100;
}
export function reqEnum<T extends string>(value: unknown, field: string, allowed: readonly T[]): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) throw new AccessError(400, `ค่าไม่ถูกต้อง: ${field}`);
  return value as T;
}
export function requireRole(role: string, allowed: readonly string[]) {
  if (!allowed.includes(role)) throw new AccessError(403, "ไม่มีสิทธิ์ทำรายการนี้");
}
/** Throws 409 unless `from -> to` is listed in `map`. */
export function assertTransition(map: Record<string, readonly string[]>, from: string, to: string) {
  if (from === to) return;
  if (!(map[from] ?? []).includes(to)) throw new AccessError(409, `ไม่สามารถเปลี่ยนสถานะจาก ${from} เป็น ${to}`);
}

// ---------- Asia/Bangkok date helpers (server may run in UTC) ----------
const BKK_OFFSET_MS = 7 * 60 * 60 * 1000;
/** "YYYYMM" for document numbers, in Bangkok time. */
export function bangkokYYYYMM(date = new Date()): string {
  const d = new Date(date.getTime() + BKK_OFFSET_MS);
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
/** "YYYY-MM-DD" in Bangkok time. */
export function bangkokDateString(date = new Date()): string {
  return new Date(date.getTime() + BKK_OFFSET_MS).toISOString().slice(0, 10);
}
/** UTC instants [start, end) covering one Bangkok calendar day. `day` = "YYYY-MM-DD" (default: today in Bangkok). */
export function bangkokDayRange(day?: string): { start: Date; end: Date } {
  const d = day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : bangkokDateString();
  const start = new Date(new Date(`${d}T00:00:00.000Z`).getTime() - BKK_OFFSET_MS);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}
/** UTC instants [start, end) covering one Bangkok calendar month. `month` = "YYYY-MM" (default: current Bangkok month). */
export function bangkokMonthRange(month?: string): { start: Date; end: Date } {
  const m = month && /^\d{4}-\d{2}$/.test(month) ? month : bangkokDateString().slice(0, 7);
  const [y, mo] = m.split("-").map(Number);
  const start = new Date(Date.UTC(y, mo - 1, 1) - BKK_OFFSET_MS);
  const end = new Date(Date.UTC(y, mo, 1) - BKK_OFFSET_MS);
  return { start, end };
}
/** Parse `?take=` with a safe default and hard cap. */
export function takeParam(raw: string | null, def = 100, max = 500): number {
  const n = raw ? Number(raw) : def;
  return Number.isInteger(n) && n > 0 ? Math.min(n, max) : def;
}

/** Add months without overflow (Jan 31 + 1 month = Feb 28/29). */
export function addMonthsClamped(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return d;
}

export function withStaff<C>(handler: (request: NextRequest, context: C) => Promise<Response>, roles: string[]) {
  return async (request: NextRequest, context: { params: Promise<Record<string, string>> }) => {
    try {
      checkOrigin(request);
      const principal = await requireStaffSession();
      if (!roles.includes(principal.role)) throw new AccessError(403, "ไม่มีสิทธิ์ทำรายการนี้");
      const isMarginRole = ["ADMIN", "MANAGER"].includes(principal.role);
      const resolved = { ...context, params: await context.params } as C;
      const response = await staffStorage.run(principal, () => handler(request, resolved));
      if (response.status >= 500) return safeError(new Error());
      if (response.headers.get("content-type")?.includes("application/json")) return NextResponse.json(redact(await response.json(), isMarginRole), { status: response.status, headers: { "Cache-Control": "private, no-store" } });
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    } catch (error) { return safeError(error); }
  };
}
