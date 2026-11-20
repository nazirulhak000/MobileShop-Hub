import { AccessError, staffContext } from "@/lib/staff-context";
import { readJson, safeError, withStaff, bangkokYYYYMM } from "@/lib/staff-http";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/reorders - Detect low stock items against minStock threshold and auto-suggest reorder quantities
async function handleGET(request: NextRequest) {
  const actor = staffContext();
  const { searchParams } = new URL(request.url);

  const branchParam = searchParams.get("branch") || actor.branchId || "";
  const search = (searchParams.get("search") || "").trim().toLowerCase();

  // Resolve target branch
  let branch = null;
  if (branchParam) {
    branch = await prisma.branch.findFirst({
      where: {
        tenantId: actor.tenantId,
        OR: [{ id: branchParam }, { code: branchParam }],
      },
    });
  }

  if (!branch) {
    branch = await prisma.branch.findFirst({
      where: { tenantId: actor.tenantId },
      orderBy: { createdAt: "asc" },
    });
  }

  if (!branch) {
    throw new AccessError(404, "ไม่พบข้อมูลสาขาในระบบ");
  }

  // Fetch all products for this tenant
  const products = await prisma.product.findMany({
    where: {
      tenantId: actor.tenantId,
    },
    include: {
      stockItems: {
        where: { branchId: branch.id },
      },
    },
    orderBy: { name: "asc" },
  });

  const reorderSuggestions: any[] = [];
  let totalEstimatedCost = 0;

  for (const p of products) {
    const stockItem = p.stockItems[0];
    const currentStock = stockItem ? stockItem.quantity : 0;
    const minStock = p.minStock || 5;

    // Low-stock detection: currentStock <= minStock
    const isLowStock = currentStock <= minStock;

    if (!isLowStock) continue;

    // Text search filter
    if (search) {
      const match =
        p.name.toLowerCase().includes(search) ||
        p.code.toLowerCase().includes(search) ||
        (p.brand || "").toLowerCase().includes(search) ||
        (p.model || "").toLowerCase().includes(search);
      if (!match) continue;
    }

    // Auto-suggest quantity: target stock is 2x minStock, minimum order of 1
    const suggestedQuantity = Math.max(1, minStock * 2 - currentStock);
    const estimatedCost = Math.round(suggestedQuantity * p.costPrice * 100) / 100;
    totalEstimatedCost += estimatedCost;

    reorderSuggestions.push({
      id: p.id,
      productId: p.id,
      code: p.code,
      name: p.name,
      category: p.category,
      brand: p.brand || "-",
      model: p.model || "-",
      currentStock,
      minStock,
      suggestedQuantity,
      costPrice: p.costPrice,
      sellPrice: p.sellPrice,
      estimatedCost,
      isLowStock: true,
    });
  }

  totalEstimatedCost = Math.round(totalEstimatedCost * 100) / 100;

  return NextResponse.json({
    success: true,
    branch: {
      id: branch.id,
      code: branch.code,
      name: branch.name,
    },
    items: reorderSuggestions,
    lowStockCount: reorderSuggestions.length,
    totalEstimatedCost,
  });
}

// POST /api/reorders - 1-Click convert low-stock reorder suggestions into PO draft
async function handlePOST(request: NextRequest) {
  const actor = staffContext();
  const body = await readJson(request);

  const rawBranch = body.branchId || body.branchCode || actor.branchId;
  const branch = await prisma.branch.findFirst({
    where: {
      tenantId: actor.tenantId,
      OR: [{ id: rawBranch }, { code: rawBranch }],
    },
  });
  if (!branch) throw new AccessError(404, "ไม่พบสาขาในระบบ");

  const supplierId = typeof body.supplierId === "string" ? body.supplierId.trim() : null;
  let supplierName = typeof body.supplierName === "string" ? body.supplierName.trim() : "";
  let supplierPhone: string | null = null;

  if (supplierId) {
    const sup = await prisma.supplier.findFirst({
      where: { id: supplierId, tenantId: actor.tenantId },
    });
    if (sup) {
      supplierName = sup.name;
      supplierPhone = sup.phone;
    }
  }

  if (!supplierName) {
    supplierName = "ซัพพลายเออร์ทั่วไป (สั่งซื้อด่วน)";
  }

  const rawItems = Array.isArray(body.items) ? body.items : [];
  if (rawItems.length === 0) {
    throw new AccessError(400, "ไม่มีรายการสินค้าที่ต้องการสั่งซื้อ");
  }

  const productIds = rawItems.map((it: any) => it.productId || it.id).filter(Boolean);
  const products = await prisma.product.findMany({
    where: {
      tenantId: actor.tenantId,
      id: { in: productIds },
    },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  let subtotal = 0;
  const poItemsData: any[] = [];

  for (const it of rawItems) {
    const pid = it.productId || it.id;
    const prod = productMap.get(pid);
    const qty = parseInt(it.quantity || it.suggestedQuantity, 10);
    if (!Number.isInteger(qty) || qty <= 0) continue;

    const unitCost = typeof it.unitCost === "number" ? it.unitCost : prod ? prod.costPrice : 0;
    const totalCost = Math.round(qty * unitCost * 100) / 100;
    subtotal += totalCost;

    poItemsData.push({
      tenantId: actor.tenantId,
      productId: prod ? prod.id : null,
      productCode: prod ? prod.code : (it.code || "ITEM"),
      productName: prod ? prod.name : (it.name || "สินค้า"),
      category: prod ? prod.category : (it.category || "SPARE_PART"),
      quantity: qty,
      receivedQty: 0,
      unitCost,
      totalCost,
    });
  }

  if (poItemsData.length === 0) {
    throw new AccessError(400, "ไม่พบรายการสินค้าที่ถูกต้องในการสั่งซื้อ");
  }

  subtotal = Math.round(subtotal * 100) / 100;
  const includeVat = body.includeVat !== false;
  const taxRate = includeVat ? (typeof body.taxRate === "number" ? body.taxRate : 7) : 0;
  const vatAmount = includeVat ? Math.round(subtotal * (taxRate / 100) * 100) / 100 : 0;
  const totalAmount = Math.round((subtotal + vatAmount) * 100) / 100;

  const yyyymm = bangkokYYYYMM();

  const purchaseOrder = await prisma.$transaction(async (tx) => {
    const counter = await tx.sequenceCounter.upsert({
      where: { id: `PO-${actor.tenantId}-${yyyymm}` },
      update: { current: { increment: 1 } },
      create: { id: `PO-${actor.tenantId}-${yyyymm}`, current: 1, tenantId: actor.tenantId },
    });
    const poNumber = `PO-${yyyymm}-${String(counter.current).padStart(4, "0")}`;

    const po = await tx.purchaseOrder.create({
      data: {
        tenantId: actor.tenantId,
        poNumber,
        branchId: branch.id,
        supplierId,
        supplierName,
        supplierPhone,
        status: "DRAFT",
        paymentStatus: "PENDING",
        subtotal,
        taxRate,
        vatAmount,
        totalAmount,
        notes: body.notes || `สร้างอัตโนมัติจากระบบแจ้งเตือนสต็อกต่ำ (${poItemsData.length} รายการ)`,
        items: {
          create: poItemsData,
        },
      },
      include: {
        items: true,
        branch: true,
        supplier: true,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.id,
        module: "INVENTORY",
        action: "CREATE",
        targetId: po.id,
        details: `1-Click Auto PO Draft: ${poNumber} จากระบบเตือนสต็อกต่ำ (${poItemsData.length} รายการ) ยอดรวม ${totalAmount.toLocaleString()} บาท`,
      },
    });

    return po;
  });

  return NextResponse.json({
    success: true,
    purchaseOrder,
    message: `สร้างร่างใบสั่งซื้อ ${purchaseOrder.poNumber} สำเร็จ`,
  }, { status: 201 });
}

export const GET = withStaff(handleGET, ["ADMIN", "MANAGER", "TECHNICIAN", "CASHIER"]);
export const POST = withStaff(handlePOST, ["ADMIN", "MANAGER", "TECHNICIAN", "CASHIER"]);
