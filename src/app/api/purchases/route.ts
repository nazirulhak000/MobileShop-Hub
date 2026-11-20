import { AccessError, staffContext } from "@/lib/staff-context";
import { readJson, safeError, withStaff, bangkokYYYYMM, takeParam } from "@/lib/staff-http";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// GET /api/purchases
async function handleGET(request: NextRequest) {
  const actor = staffContext();
  const { searchParams } = new URL(request.url);

  const supplierId = searchParams.get("supplierId") || "";
  const branchId = searchParams.get("branchId") || searchParams.get("branch") || "";
  const status = searchParams.get("status") || "";
  const paymentStatus = searchParams.get("paymentStatus") || "";
  const search = (searchParams.get("search") || "").trim();
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";

  const where: Prisma.PurchaseOrderWhereInput = {
    tenantId: actor.tenantId,
  };

  // Branch restriction if user is assigned to specific branches
  if (actor.branchId && actor.role !== "ADMIN") {
    where.branchId = actor.branchId;
  } else if (branchId && branchId !== "ALL") {
    // Resolve branch by id or code
    const b = await prisma.branch.findFirst({
      where: {
        tenantId: actor.tenantId,
        OR: [{ id: branchId }, { code: branchId }],
      },
    });
    if (b) where.branchId = b.id;
  }

  if (supplierId && supplierId !== "ALL") {
    where.supplierId = supplierId;
  }

  if (status && status !== "ALL") {
    where.status = status;
  }

  if (paymentStatus && paymentStatus !== "ALL") {
    where.paymentStatus = paymentStatus;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      where.createdAt.lte = e;
    }
  }

  if (search) {
    where.OR = [
      { poNumber: { contains: search } },
      { supplierName: { contains: search } },
      { notes: { contains: search } },
      {
        items: {
          some: {
            OR: [
              { productName: { contains: search } },
              { productCode: { contains: search } },
            ],
          },
        },
      },
    ];
  }

  const purchases = await prisma.purchaseOrder.findMany({
    where,
    include: {
      branch: {
        select: { id: true, code: true, name: true, phone: true, address: true, taxId: true },
      },
      supplier: {
        select: { id: true, name: true, phone: true, contactPerson: true, address: true, lineId: true, taxId: true, creditTerms: true },
      },
      items: {
        include: {
          product: {
            select: { id: true, code: true, name: true, category: true, costPrice: true, sellPrice: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: takeParam(searchParams.get("take"), 100, 500),
  });

  return NextResponse.json({ success: true, purchases });
}

// POST /api/purchases - Create a new Purchase Order
async function handlePOST(request: NextRequest) {
  const actor = staffContext();
  const body = await readJson(request);

  const rawBranchId = body.branchId || body.branchCode || actor.branchId;
  if (!rawBranchId) throw new AccessError(400, "กรุณาระบุสาขาที่สั่งซื้อ");

  // Validate branch belongs to tenant
  const branch = await prisma.branch.findFirst({
    where: {
      tenantId: actor.tenantId,
      OR: [{ id: rawBranchId }, { code: rawBranchId }],
    },
  });
  if (!branch) throw new AccessError(404, "ไม่พบสาขาในระบบของท่าน");

  const supplierId = typeof body.supplierId === "string" ? body.supplierId.trim() : null;
  let supplierName = typeof body.supplierName === "string" ? body.supplierName.trim() : "";
  let supplierPhone = typeof body.supplierPhone === "string" ? body.supplierPhone.trim() : null;

  if (supplierId) {
    const s = await prisma.supplier.findFirst({
      where: { id: supplierId, tenantId: actor.tenantId },
    });
    if (!s) throw new AccessError(404, "ไม่พบข้อมูลซัพพลายเออร์ในระบบ");
    supplierName = s.name;
    supplierPhone = s.phone;
  }

  if (!supplierName) {
    throw new AccessError(400, "กรุณาระบุชื่อซัพพลายเออร์");
  }

  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    throw new AccessError(400, "กรุณาระบุรายการสินค้าที่ต้องการสั่งซื้ออย่างน้อย 1 รายการ");
  }

  // Validate items
  const processedItems: Array<{
    productId: string | null;
    productCode: string;
    productName: string;
    category: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
  }> = [];

  let subtotal = 0;

  for (const item of items) {
    const qty = parseInt(item.quantity, 10);
    const unitCost = typeof item.unitCost === "number" ? item.unitCost : parseFloat(item.unitCost) || 0;
    const name = (item.productName || item.name || "").trim();
    const code = (item.productCode || item.code || "").trim();
    const category = (item.category || "SPARE_PART").toUpperCase();

    if (!name) throw new AccessError(400, "รายการสินค้าต้องมีชื่อ");
    if (!Number.isInteger(qty) || qty <= 0) throw new AccessError(400, `จำนวนสินค้าไม่ถูกต้อง (${name})`);
    if (unitCost < 0) throw new AccessError(400, `ต้นทุนต่อหน่วยไม่ถูกต้อง (${name})`);

    const itemTotal = Math.round(qty * unitCost * 100) / 100;
    subtotal += itemTotal;

    let productId: string | null = item.productId || null;
    if (productId) {
      const p = await prisma.product.findFirst({
        where: { id: productId, tenantId: actor.tenantId },
      });
      if (!p) productId = null;
    }

    processedItems.push({
      productId,
      productCode: code || (productId ? "PROD" : "ITEM"),
      productName: name,
      category,
      quantity: qty,
      unitCost,
      totalCost: itemTotal,
    });
  }

  subtotal = Math.round(subtotal * 100) / 100;
  const taxRate = typeof body.taxRate === "number" ? Math.max(0, body.taxRate) : 7;
  const includeVat = body.includeVat !== false;
  const vatAmount = includeVat ? Math.round(subtotal * (taxRate / 100) * 100) / 100 : 0;
  const totalAmount = Math.round((subtotal + vatAmount) * 100) / 100;

  const status = body.status === "ORDERED" ? "ORDERED" : "DRAFT";
  const paymentStatus = body.paymentStatus === "PAID" ? "PAID" : "PENDING";
  const notes = typeof body.notes === "string" ? body.notes.trim() : null;

  const yyyymm = bangkokYYYYMM();

  const purchaseOrder = await prisma.$transaction(async (tx) => {
    // Generate sequential PO number
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
        status,
        paymentStatus,
        subtotal,
        taxRate: includeVat ? taxRate : 0,
        vatAmount,
        totalAmount,
        notes,
        orderedAt: status === "ORDERED" ? new Date() : null,
        items: {
          create: processedItems.map((it) => ({
            tenantId: actor.tenantId,
            productId: it.productId,
            productCode: it.productCode,
            productName: it.productName,
            category: it.category,
            quantity: it.quantity,
            receivedQty: 0,
            unitCost: it.unitCost,
            totalCost: it.totalCost,
          })),
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
        details: `สร้างใบสั่งซื้อ ${poNumber} (${supplierName}) ยอดรวม ${totalAmount.toLocaleString()} บาท [สถานะ: ${status}]`,
      },
    });

    return po;
  });

  return NextResponse.json({ success: true, purchase: purchaseOrder }, { status: 201 });
}

// PATCH /api/purchases - Update PO, status transitions, or RECEIVE SHIPMENT
async function handlePATCH(request: NextRequest) {
  const actor = staffContext();
  const body = await readJson(request);

  const id = typeof body.id === "string" ? body.id.trim() : "";
  const action = typeof body.action === "string" ? body.action.toUpperCase() : "UPDATE";

  if (!id) throw new AccessError(400, "กรุณาระบุรหัสใบสั่งซื้อ (id)");

  const po = await prisma.purchaseOrder.findFirst({
    where: { id, tenantId: actor.tenantId },
    include: {
      items: {
        include: { product: true },
      },
      branch: true,
    },
  });
  if (!po) throw new AccessError(404, "ไม่พบข้อมูลใบสั่งซื้อในระบบ");

  // 1. RECEIVE SHIPMENT (Atomic inventory credit, batch IMEI registration, updating cost price)
  if (action === "RECEIVE" || body.status === "RECEIVED") {
    if (po.status === "RECEIVED") {
      throw new AccessError(409, "ใบสั่งซื้อนี้ได้ทำการตรวจรับสินค้าเข้าสต็อกไปแล้ว");
    }
    if (po.status === "CANCELLED") {
      throw new AccessError(409, "ไม่สามารถตรวจรับสินค้าของใบสั่งซื้อที่ถูกยกเลิกแล้ว");
    }

    const itemImeisMap: Record<string, string[]> = body.itemImeis || {};

    const updatedPo = await prisma.$transaction(async (tx) => {
      // Process each item for atomic inventory credit
      for (const item of po.items) {
        if (!item.productId) continue;

        const product = await tx.product.findFirst({
          where: { id: item.productId, tenantId: actor.tenantId },
        });
        if (!product) continue;

        // A. Credit branch StockItem atomically
        await tx.stockItem.upsert({
          where: {
            productId_branchId: {
              productId: item.productId,
              branchId: po.branchId,
            },
          },
          update: {
            quantity: { increment: item.quantity },
          },
          create: {
            tenantId: actor.tenantId,
            branchId: po.branchId,
            productId: item.productId,
            quantity: item.quantity,
          },
        });

        // B. Update product costPrice
        await tx.product.update({
          where: { id: item.productId },
          data: {
            costPrice: item.unitCost,
          },
        });

        // C. Batch IMEI registration if DEVICE
        const imeis = itemImeisMap[item.id] || [];
        if (item.category === "DEVICE" && Array.isArray(imeis) && imeis.length > 0) {
          // Check for duplicate IMEIs in this tenant
          for (const rawImei of imeis) {
            const cleanImei = String(rawImei).trim();
            if (!cleanImei) continue;

            const existingImei = await tx.deviceIMEI.findFirst({
              where: {
                tenantId: actor.tenantId,
                imei: cleanImei,
                status: "IN_STOCK",
              },
            });

            if (existingImei) {
              throw new AccessError(409, `IMEI ${cleanImei} มีอยู่ในสต็อกของระบบแล้ว ไม่สามารถรับเข้าซ้ำได้`);
            }

            await tx.deviceIMEI.create({
              data: {
                tenantId: actor.tenantId,
                branchId: po.branchId,
                productId: item.productId,
                imei: cleanImei,
                conditionGrade: "A",
                status: "IN_STOCK",
                costPrice: item.unitCost,
                sellPrice: product.sellPrice || 0,
              },
            });
          }

          // Save recorded IMEIs on PurchaseOrderItem
          await tx.purchaseOrderItem.update({
            where: { id: item.id },
            data: {
              receivedQty: item.quantity,
              imeis: JSON.stringify(imeis),
            },
          });
        } else {
          await tx.purchaseOrderItem.update({
            where: { id: item.id },
            data: { receivedQty: item.quantity },
          });
        }
      }

      // Update PO status to RECEIVED
      const received = await tx.purchaseOrder.update({
        where: { id: po.id },
        data: {
          status: "RECEIVED",
          receivedAt: new Date(),
          paymentStatus: body.paymentStatus ? (body.paymentStatus === "PAID" ? "PAID" : "PENDING") : po.paymentStatus,
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
          action: "UPDATE",
          targetId: po.id,
          details: `ตรวจรับสินค้าเข้าสต็อกตามใบสั่งซื้อ ${po.poNumber} สาขา ${po.branch.name} รวม ${po.items.length} รายการ มูลค่า ${po.totalAmount.toLocaleString()} บาท`,
        },
      });

      return received;
    });

    return NextResponse.json({ success: true, purchase: updatedPo });
  }

  // 2. ORDER / SEND PO TO SUPPLIER
  if (action === "ORDER" || body.status === "ORDERED") {
    if (po.status === "RECEIVED") throw new AccessError(409, "ใบสั่งซื้อนี้รับสินค้าเข้าสต็อกแล้ว");
    if (po.status === "CANCELLED") throw new AccessError(409, "ไม่สามารถสั่งซื้อรายการที่ยกเลิกแล้ว");

    const updated = await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: {
        status: "ORDERED",
        orderedAt: new Date(),
      },
      include: { items: true, branch: true, supplier: true },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.id,
        module: "INVENTORY",
        action: "UPDATE",
        targetId: po.id,
        details: `ส่งใบสั่งซื้อ ${po.poNumber} ถึงซัพพลายเออร์ ${po.supplierName}`,
      },
    });

    return NextResponse.json({ success: true, purchase: updated });
  }

  // 3. CANCEL PO
  if (action === "CANCEL" || body.status === "CANCELLED") {
    if (po.status === "RECEIVED") {
      throw new AccessError(409, "ไม่สามารถยกเลิกใบสั่งซื้อที่ตรวจรับสินค้าเข้าสต็อกไปแล้ว");
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: { status: "CANCELLED" },
      include: { items: true, branch: true, supplier: true },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.id,
        module: "INVENTORY",
        action: "UPDATE",
        targetId: po.id,
        details: `ยกเลิกใบสั่งซื้อ ${po.poNumber}`,
      },
    });

    return NextResponse.json({ success: true, purchase: updated });
  }

  // 4. UPDATE PAYMENT STATUS
  if (action === "PAYMENT" || body.paymentStatus) {
    const paymentStatus = body.paymentStatus === "PAID" ? "PAID" : "PENDING";
    const updated = await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: { paymentStatus },
      include: { items: true, branch: true, supplier: true },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.id,
        module: "INVENTORY",
        action: "UPDATE",
        targetId: po.id,
        details: `อัปเดตสถานะชำระเงินใบสั่งซื้อ ${po.poNumber} เป็น ${paymentStatus}`,
      },
    });

    return NextResponse.json({ success: true, purchase: updated });
  }

  // 5. UPDATE DRAFT PO
  if (po.status !== "DRAFT") {
    throw new AccessError(409, "แก้ไขได้เฉพาะใบสั่งซื้อสถานะ DRAFT (ร่าง) เท่านั้น");
  }

  const notes = typeof body.notes === "string" ? body.notes.trim() : po.notes;
  const updated = await prisma.purchaseOrder.update({
    where: { id: po.id },
    data: { notes },
    include: { items: true, branch: true, supplier: true },
  });

  return NextResponse.json({ success: true, purchase: updated });
}

export const GET = withStaff(handleGET, ["ADMIN", "MANAGER", "TECHNICIAN", "CASHIER"]);
export const POST = withStaff(handlePOST, ["ADMIN", "MANAGER", "TECHNICIAN", "CASHIER"]);
export const PATCH = withStaff(handlePATCH, ["ADMIN", "MANAGER"]);
