import { AccessError, staffContext } from "@/lib/staff-context";
import { withStaff, reqId, reqEnum, reqMoney, assertTransition, takeParam } from "@/lib/staff-http";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// All DeviceIMEI statuses used across the codebase (inventory, POS, trade-in, pawn).
const IMEI_STATUSES = ["IN_STOCK", "SOLD", "IN_REPAIR", "PAWNED", "RETURNED"] as const;
type ImeiStatus = (typeof IMEI_STATUSES)[number];
const CONDITION_GRADES = ["A", "B", "C"] as const;

// Manual status transitions allowed via PATCH. Sales go through POS; reversing a
// sale should go through the refund flow, so SOLD has no exits for non-admins.
const IMEI_TRANSITIONS: Record<ImeiStatus, readonly ImeiStatus[]> = {
  IN_STOCK: ["SOLD", "IN_REPAIR", "RETURNED"],
  IN_REPAIR: ["IN_STOCK", "RETURNED"],
  PAWNED: ["IN_STOCK", "RETURNED"],
  RETURNED: ["IN_STOCK"],
  SOLD: [],
};
// ADMIN-only overrides (e.g. correcting a sale outside the refund flow).
const ADMIN_TRANSITIONS: Record<ImeiStatus, readonly ImeiStatus[]> = {
  ...IMEI_TRANSITIONS,
  SOLD: ["IN_STOCK", "RETURNED"],
};

async function readJson(request: NextRequest) {
  try {
    return await request.json();
  } catch {
    throw new AccessError(400, "รูปแบบข้อมูลไม่ถูกต้อง");
  }
}

// GET /api/inventory/imei?productId=... or imei=...
async function handleGET(request: NextRequest) {
  const actor = staffContext();
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId");
  const imei = searchParams.get("imei");

  const where: any = {};
  if (productId) where.productId = productId;
  if (imei) where.imei = imei;

  const imeis = await prisma.deviceIMEI.findMany({
    where,
    include: {
      product: true,
      branch: true,
      tradeInContract: {
        include: { customer: true },
      },
      saleItem: {
        include: { sale: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: takeParam(searchParams.get("take"), 200, 500),
  });

  // Hide cost prices from roles that should not see margins.
  if (actor.role === "CASHIER" || actor.role === "TECHNICIAN") {
    const stripped = imeis.map(({ costPrice: _c, product, ...rest }) => {
      const { costPrice: _pc, ...productRest } = product;
      return { ...rest, product: productRest };
    });
    return NextResponse.json({ success: true, imeis: stripped });
  }

  return NextResponse.json({ success: true, imeis });
}

// POST /api/inventory/imei - Add new IMEI
async function handlePOST(request: NextRequest) {
  const actor = staffContext();
  const body = await readJson(request);
  const productId = reqId(body?.productId, "productId");
  const branchCode = reqId(body?.branchCode, "branchCode");
  const imei = reqId(body?.imei, "imei");
  const serialNo = typeof body?.serialNo === "string" && body.serialNo.trim() ? body.serialNo.trim() : null;
  const conditionGrade =
    body?.conditionGrade === undefined || body?.conditionGrade === null || body?.conditionGrade === ""
      ? "A"
      : reqEnum(body.conditionGrade, "conditionGrade", CONDITION_GRADES);
  const costPrice = body?.costPrice === undefined || body?.costPrice === "" ? 0 : reqMoney(body.costPrice, "costPrice");
  const sellPrice = body?.sellPrice === undefined || body?.sellPrice === "" ? 0 : reqMoney(body.sellPrice, "sellPrice");

  const newImei = await prisma.$transaction(async (tx) => {
    const branch = await tx.branch.findFirst({
      where: { OR: [{ code: branchCode }, { id: branchCode }] },
    });
    if (!branch) throw new AccessError(404, "ไม่พบสาขา");

    // Duplicate check inside the tx; the @@unique([tenantId, imei]) index is the final guard.
    const existing = await tx.deviceIMEI.findFirst({ where: { imei } });
    if (existing) throw new AccessError(409, `หมายเลข IMEI ${imei} มีอยู่ในระบบแล้ว`);

    const created = await tx.deviceIMEI.create({
      data: {
        productId,
        branchId: branch.id,
        imei,
        serialNo,
        conditionGrade,
        status: "IN_STOCK",
        costPrice,
        sellPrice,
      },
      include: { product: true, branch: true },
    });

    await tx.stockItem.upsert({
      where: { productId_branchId: { productId, branchId: branch.id } },
      update: { quantity: { increment: 1 } },
      create: { productId, branchId: branch.id, quantity: 1 },
    });

    await tx.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.id,
        module: "INVENTORY",
        action: "IMEI_CREATE",
        targetId: created.id,
        details: JSON.stringify({ imei, productId, branchCode: branch.code }),
        afterJson: JSON.stringify({ status: "IN_STOCK", conditionGrade, costPrice, sellPrice }),
        severity: "INFO",
      },
    });

    return created;
  });

  return NextResponse.json({ success: true, imei: newImei });
}

// PATCH /api/inventory/imei - Update status, condition grade or prices
async function handlePATCH(request: NextRequest) {
  const actor = staffContext();
  const body = await readJson(request);
  const id = reqId(body?.id, "id");

  const data: { status?: ImeiStatus; conditionGrade?: string; sellPrice?: number; costPrice?: number } = {};
  if (body?.status !== undefined && body?.status !== null && body?.status !== "") {
    data.status = reqEnum(body.status, "status", IMEI_STATUSES);
  }
  if (body?.conditionGrade !== undefined && body?.conditionGrade !== null && body?.conditionGrade !== "") {
    data.conditionGrade = reqEnum(body.conditionGrade, "conditionGrade", CONDITION_GRADES);
  }
  if (body?.sellPrice !== undefined && body?.sellPrice !== null && body?.sellPrice !== "") {
    data.sellPrice = reqMoney(body.sellPrice, "sellPrice");
  }
  if (body?.costPrice !== undefined && body?.costPrice !== null && body?.costPrice !== "") {
    data.costPrice = reqMoney(body.costPrice, "costPrice");
  }
  if (Object.keys(data).length === 0) throw new AccessError(400, "ไม่มีข้อมูลที่ต้องการแก้ไข");

  const updated = await prisma.$transaction(async (tx) => {
    const current = await tx.deviceIMEI.findFirst({ where: { id } });
    if (!current) throw new AccessError(404, "ไม่พบ IMEI นี้");

    const from = current.status as ImeiStatus;
    const to = data.status ?? from;
    if (from !== to) {
      if (from === "SOLD" && actor.role !== "ADMIN") {
        throw new AccessError(409, "เครื่องที่ขายแล้วต้องทำรายการคืนสินค้าผ่านระบบคืนเงิน");
      }
      assertTransition(actor.role === "ADMIN" ? ADMIN_TRANSITIONS : IMEI_TRANSITIONS, from, to);
    }

    // Optimistic concurrency: only update if status has not changed since we read it.
    const { count } = await tx.deviceIMEI.updateMany({
      where: { id, status: current.status },
      data,
    });
    if (count !== 1) throw new AccessError(409, "สถานะ IMEI ถูกเปลี่ยนโดยผู้อื่น กรุณาโหลดใหม่");

    // Keep StockItem in sync when moving into / out of IN_STOCK.
    let stockSync: string | null = null;
    if (from !== to && to === "IN_STOCK") {
      await tx.stockItem.upsert({
        where: { productId_branchId: { productId: current.productId, branchId: current.branchId } },
        update: { quantity: { increment: 1 } },
        create: { productId: current.productId, branchId: current.branchId, quantity: 1 },
      });
      stockSync = "INCREMENT";
    } else if (from !== to && from === "IN_STOCK") {
      const dec = await tx.stockItem.updateMany({
        where: { productId: current.productId, branchId: current.branchId, quantity: { gte: 1 } },
        data: { quantity: { decrement: 1 } },
      });
      // If stock was already 0 (out of sync), do not go negative; record it in the audit log.
      stockSync = dec.count === 1 ? "DECREMENT" : "SKIPPED_ZERO_STOCK";
    }

    await tx.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.id,
        module: "INVENTORY",
        action: from !== to ? "IMEI_STATUS_CHANGE" : "IMEI_UPDATE",
        targetId: id,
        details: JSON.stringify({ imei: current.imei, from, to, stockSync }),
        beforeJson: JSON.stringify({
          status: current.status,
          conditionGrade: current.conditionGrade,
          costPrice: current.costPrice,
          sellPrice: current.sellPrice,
        }),
        afterJson: JSON.stringify(data),
        severity: from === "SOLD" && from !== to ? "WARNING" : "INFO",
      },
    });

    return tx.deviceIMEI.findFirst({ where: { id }, include: { product: true, branch: true } });
  });

  return NextResponse.json({ success: true, imei: updated });
}

export const GET = withStaff(handleGET, ["ADMIN", "MANAGER", "CASHIER"]);

export const POST = withStaff(handlePOST, ["ADMIN", "MANAGER"]);

export const PATCH = withStaff(handlePATCH, ["ADMIN", "MANAGER"]);
