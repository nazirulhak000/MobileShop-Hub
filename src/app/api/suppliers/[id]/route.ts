import { AccessError, staffContext } from "@/lib/staff-context";
import { readJson, reqId, withStaff } from "@/lib/staff-http";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateEmail, validateTaxId, normalizePhone } from "@/lib/supplier-utils";

export const dynamic = "force-dynamic";

// GET /api/suppliers/[id]
async function handleGET(
  _request: NextRequest,
  context: { params: { id: string } }
) {
  const actor = staffContext();
  const supplierId = reqId(context.params?.id, "id");

  const supplier = await prisma.supplier.findFirst({
    where: {
      id: supplierId,
      tenantId: actor.tenantId,
    },
    include: {
      purchaseOrders: {
        where: {
          tenantId: actor.tenantId,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          branch: {
            select: { id: true, name: true, code: true },
          },
          items: true,
        },
      },
      _count: {
        select: { purchaseOrders: true },
      },
    },
  });

  if (!supplier || !supplier.active) {
    throw new AccessError(404, "ไม่พบข้อมูลซัพพลายเออร์");
  }

  // Calculate non-cancelled spend
  const nonCancelledOrders = supplier.purchaseOrders.filter((po) => po.status !== "CANCELLED");
  const totalSpend = Math.round(
    nonCancelledOrders.reduce((sum, po) => sum + (po.totalAmount || 0), 0) * 100
  ) / 100;

  // Aggregate supplied products
  const productMap = new Map<
    string,
    {
      productName: string;
      category: string;
      totalQuantity: number;
      lastUnitCost: number;
      lastOrderedAt: Date | null;
    }
  >();

  for (const po of supplier.purchaseOrders) {
    for (const item of po.items) {
      const name = item.productName.trim();
      if (!name) continue;
      const existing = productMap.get(name);
      if (existing) {
        existing.totalQuantity += item.quantity;
        if (po.createdAt && (!existing.lastOrderedAt || po.createdAt > existing.lastOrderedAt)) {
          existing.lastOrderedAt = po.createdAt;
          existing.lastUnitCost = item.unitCost;
        }
      } else {
        productMap.set(name, {
          productName: name,
          category: item.category || "SPARE_PART",
          totalQuantity: item.quantity,
          lastUnitCost: item.unitCost,
          lastOrderedAt: po.createdAt || null,
        });
      }
    }
  }

  const suppliedProducts = Array.from(productMap.values());

  const formatted = {
    id: supplier.id,
    name: supplier.name,
    contactPerson: supplier.contactPerson || "-",
    phone: supplier.phone,
    email: supplier.email || "",
    lineId: supplier.lineId || "-",
    address: supplier.address || "",
    taxId: supplier.taxId || "",
    creditTerms: supplier.creditTerms || "เครดิต 30 วัน",
    bankName: supplier.bankName || "",
    bankAccountNumber: supplier.bankAccountNumber || "",
    bankAccountName: supplier.bankAccountName || "",
    categories: supplier.categories ? supplier.categories.split(",").map((c) => c.trim()).filter(Boolean) : [],
    totalOrders: supplier._count.purchaseOrders,
    totalSpend,
    suppliedProducts,
    purchaseOrders: supplier.purchaseOrders.map((po) => ({
      id: po.id,
      poNumber: po.poNumber,
      status: po.status,
      paymentStatus: po.paymentStatus,
      branchName: po.branch.name,
      totalAmount: po.totalAmount,
      itemCount: po.items.length,
      orderedAt: po.orderedAt,
      receivedAt: po.receivedAt,
      createdAt: po.createdAt,
    })),
    createdAt: supplier.createdAt,
    updatedAt: supplier.updatedAt,
  };

  return NextResponse.json({ success: true, supplier: formatted });
}

// PUT /api/suppliers/[id]
async function handlePUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const actor = staffContext();
  const supplierId = reqId(context.params?.id, "id");
  const body = await readJson(request);

  const existing = await prisma.supplier.findFirst({
    where: { id: supplierId, tenantId: actor.tenantId },
  });
  if (!existing) throw new AccessError(404, "ไม่พบข้อมูลซัพพลายเออร์");

  const name = typeof body.name === "string" ? body.name.trim() : existing.name;
  const phone = body.phone !== undefined ? normalizePhone(body.phone) : existing.phone;
  const contactPerson = typeof body.contactPerson === "string" ? body.contactPerson.trim() : existing.contactPerson;
  const email = body.email !== undefined ? validateEmail(body.email) : existing.email;
  const lineId = typeof body.lineId === "string" ? body.lineId.trim() : existing.lineId;
  const address = typeof body.address === "string" ? body.address.trim() : existing.address;
  const taxId = body.taxId !== undefined ? validateTaxId(body.taxId) : existing.taxId;
  const creditTerms = typeof body.creditTerms === "string" && body.creditTerms.trim()
    ? body.creditTerms.trim()
    : existing.creditTerms;
  const bankName = body.bankName !== undefined ? (typeof body.bankName === "string" ? body.bankName.trim() : null) : existing.bankName;
  const bankAccountNumber = body.bankAccountNumber !== undefined ? (typeof body.bankAccountNumber === "string" ? body.bankAccountNumber.trim() : null) : existing.bankAccountNumber;
  const bankAccountName = body.bankAccountName !== undefined ? (typeof body.bankAccountName === "string" ? body.bankAccountName.trim() : null) : existing.bankAccountName;

  if (!name) throw new AccessError(400, "กรุณาระบุชื่อร้านหรือบริษัทซัพพลายเออร์");
  if (!phone) throw new AccessError(400, "กรุณาระบุเบอร์โทรศัพท์ซัพพลายเออร์");

  // If name changed, check uniqueness
  if (name !== existing.name) {
    const dup = await prisma.supplier.findFirst({
      where: {
        tenantId: actor.tenantId,
        name,
        id: { not: supplierId },
      },
    });
    if (dup && dup.active) {
      throw new AccessError(409, `มีซัพพลายเออร์ชื่อ "${name}" อยู่ในระบบแล้ว`);
    }
  }

  let categoriesStr = existing.categories;
  if (Array.isArray(body.categories)) {
    categoriesStr = body.categories.filter((c: any) => typeof c === "string" && c.trim()).map((c: string) => c.trim()).join(", ");
  } else if (typeof body.categories === "string") {
    categoriesStr = body.categories.trim();
  }

  const updated = await prisma.$transaction(async (tx) => {
    const s = await tx.supplier.update({
      where: { id: supplierId },
      data: {
        name,
        phone,
        contactPerson: contactPerson || null,
        email: email || null,
        lineId: lineId || null,
        address: address || null,
        taxId: taxId || null,
        creditTerms,
        bankName: bankName || null,
        bankAccountNumber: bankAccountNumber || null,
        bankAccountName: bankAccountName || null,
        categories: categoriesStr || null,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.id,
        module: "INVENTORY",
        action: "UPDATE",
        targetId: s.id,
        details: `แก้ไขข้อมูลซัพพลายเออร์: ${name}`,
      },
    });

    return s;
  });

  return NextResponse.json({ success: true, supplier: updated });
}

// DELETE /api/suppliers/[id]
async function handleDELETE(
  _request: NextRequest,
  context: { params: { id: string } }
) {
  const actor = staffContext();
  const supplierId = reqId(context.params?.id, "id");

  const existing = await prisma.supplier.findFirst({
    where: { id: supplierId, tenantId: actor.tenantId },
  });
  if (!existing) throw new AccessError(404, "ไม่พบข้อมูลซัพพลายเออร์");

  await prisma.$transaction(async (tx) => {
    await tx.supplier.update({
      where: { id: supplierId },
      data: { active: false },
    });

    await tx.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.id,
        module: "INVENTORY",
        action: "DELETE",
        targetId: supplierId,
        details: `ลบซัพพลายเออร์: ${existing.name}`,
      },
    });
  });

  return NextResponse.json({ success: true, message: "ลบซัพพลายเออร์สำเร็จ" });
}

export const GET = withStaff(handleGET, ["ADMIN", "MANAGER", "TECHNICIAN", "CASHIER"]);
export const PUT = withStaff(handlePUT, ["ADMIN", "MANAGER"]);
export const DELETE = withStaff(handleDELETE, ["ADMIN", "MANAGER"]);
