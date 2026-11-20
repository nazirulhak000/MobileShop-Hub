import { AccessError, staffContext } from "@/lib/staff-context";
import { withStaff, bangkokDayRange, takeParam } from "@/lib/staff-http";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES = ["COMPLETED", "VOID"];

// Fields returned for a sale (never the full User / cost prices).
const SALE_SELECT = {
  id: true,
  invoiceNo: true,
  branchId: true,
  branch: { select: { id: true, code: true, name: true } },
  customer: { select: { id: true, name: true, phone: true } },
  cashier: { select: { id: true, name: true } },
  totalAmount: true,
  discount: true,
  vatAmount: true,
  netAmount: true,
  paymentMethod: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: {
      id: true,
      productId: true,
      quantity: true,
      unitPrice: true,
      subtotal: true,
      product: { select: { id: true, code: true, name: true } },
      deviceImei: { select: { id: true, imei: true } },
    },
  },
} satisfies Prisma.SaleSelect;

interface VoidInfo {
  reason: string;
  voidedAt: Date;
  voidedBy: { id: string; name: string } | null;
  imeis: Record<string, string>; // saleItemId -> IMEI released at void time
}

// GET /api/sales?branch=HQ&from=YYYY-MM-DD&to=YYYY-MM-DD&status=COMPLETED|VOID&search=&take=
async function handleGET(request: NextRequest) {
  const actor = staffContext();
  const { searchParams } = new URL(request.url);
  const branchKey = searchParams.get("branch")?.trim() || "";
  const from = searchParams.get("from")?.trim() || "";
  const to = searchParams.get("to")?.trim() || "";
  const status = searchParams.get("status")?.trim() || "";
  const search = (searchParams.get("search") || "").trim().slice(0, 100);
  const take = takeParam(searchParams.get("take"), 200, 500);

  const where: Prisma.SaleWhereInput = {
    tenantId: actor.tenantId,
  };
  if (branchKey) {
    const branch = await prisma.branch.findFirst({
      where: {
        tenantId: actor.tenantId,
        OR: [{ code: branchKey }, { id: branchKey }],
      },
      select: { id: true },
    });
    if (!branch || !actor.branchIds.includes(branch.id)) throw new AccessError(404, "ไม่พบข้อมูลสาขา");
    where.branchId = branch.id;
  } else {
    where.branchId = { in: actor.branchIds };
  }
  if ((from && !DAY_RE.test(from)) || (to && !DAY_RE.test(to))) throw new AccessError(400, "รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)");
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = bangkokDayRange(from).start;
    if (to) where.createdAt.lt = bangkokDayRange(to).end;
  }
  if (status && status !== "ALL") {
    if (!STATUSES.includes(status)) throw new AccessError(400, "ค่าไม่ถูกต้อง: status");
    where.status = status;
  }
  if (search) {
    where.OR = [
      { invoiceNo: { contains: search } },
      { customer: { name: { contains: search } } },
      { customer: { phone: { contains: search } } },
    ];
  }

  const sales = await prisma.sale.findMany({ where, select: SALE_SELECT, orderBy: { createdAt: "desc" }, take });

  // Void reason/actor live in AuditLog (Sale has no void fields): one query for all VOID sales.
  const voidIds = sales.filter((s) => s.status === "VOID").map((s) => s.id);
  const voidInfo = new Map<string, VoidInfo>();
  if (voidIds.length > 0) {
    const logs = await prisma.auditLog.findMany({
      where: { module: "POS", action: "VOID", targetId: { in: voidIds } },
      select: { targetId: true, details: true, createdAt: true, user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    for (const log of logs) {
      if (!log.targetId || voidInfo.has(log.targetId)) continue;
      let details: any = {};
      try { details = JSON.parse(log.details); } catch { /* ignore malformed details */ }
      voidInfo.set(log.targetId, {
        reason: typeof details.reason === "string" ? details.reason : "",
        voidedAt: log.createdAt,
        voidedBy: log.user ?? null,
        imeis: details.imeis && typeof details.imeis === "object" ? details.imeis : {},
      });
    }
  }

  const data = sales.map((s) => {
    const info = voidInfo.get(s.id) ?? null;
    return {
      ...s,
      // IMEIs are detached from voided items so the device can be sold again; restore them for display.
      items: s.items.map((it) => ({ ...it, imei: it.deviceImei?.imei ?? info?.imeis[it.id] ?? null })),
      voidInfo: info ? { reason: info.reason, voidedAt: info.voidedAt, voidedBy: info.voidedBy } : null,
    };
  });

  return NextResponse.json({ success: true, data });
}

export const GET = withStaff(handleGET, ["ADMIN", "MANAGER", "CASHIER"]);
