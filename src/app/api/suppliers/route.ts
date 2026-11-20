import { AccessError, staffContext } from "@/lib/staff-context";
import { readJson, safeError, withStaff, takeParam } from "@/lib/staff-http";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// GET /api/suppliers
async function handleGET(request: NextRequest) {
  const actor = staffContext();
  const { searchParams } = new URL(request.url);
  const search = (searchParams.get("search") || "").trim();

  const where: Prisma.SupplierWhereInput = {
    tenantId: actor.tenantId,
    active: true,
  };

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { contactPerson: { contains: search } },
      { phone: { contains: search } },
      { lineId: { contains: search } },
      { categories: { contains: search } },
    ];
  }

  const suppliers = await prisma.supplier.findMany({
    where,
    include: {
      _count: {
        select: { purchaseOrders: true },
      },
    },
    orderBy: { name: "asc" },
    take: takeParam(searchParams.get("take"), 100, 500),
  });

  const formatted = suppliers.map((s) => ({
    id: s.id,
    name: s.name,
    contactPerson: s.contactPerson || "-",
    phone: s.phone,
    lineId: s.lineId || "-",
    address: s.address || "",
    taxId: s.taxId || "",
    creditTerms: s.creditTerms || "เครดิต 30 วัน",
    categories: s.categories ? s.categories.split(",").map((c) => c.trim()).filter(Boolean) : [],
    totalOrders: s._count.purchaseOrders,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));

  return NextResponse.json({ success: true, suppliers: formatted });
}

// POST /api/suppliers
async function handlePOST(request: NextRequest) {
  const actor = staffContext();
  const body = await readJson(request);

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const contactPerson = typeof body.contactPerson === "string" ? body.contactPerson.trim() : "";
  const lineId = typeof body.lineId === "string" ? body.lineId.trim() : "";
  const address = typeof body.address === "string" ? body.address.trim() : "";
  const taxId = typeof body.taxId === "string" ? body.taxId.trim() : "";
  const creditTerms = typeof body.creditTerms === "string" ? body.creditTerms.trim() : "เครดิต 30 วัน";
  
  let categoriesStr = "";
  if (Array.isArray(body.categories)) {
    categoriesStr = body.categories.filter((c: any) => typeof c === "string").join(", ");
  } else if (typeof body.categories === "string") {
    categoriesStr = body.categories.trim();
  }

  if (!name) throw new AccessError(400, "กรุณาระบุชื่อร้านหรือบริษัทซัพพลายเออร์");
  if (!phone) throw new AccessError(400, "กรุณาระบุเบอร์โทรศัพท์ซัพพลายเออร์");

  // Check unique name per tenant
  const existing = await prisma.supplier.findFirst({
    where: {
      tenantId: actor.tenantId,
      name,
    },
  });

  if (existing) {
    if (!existing.active) {
      // Re-activate
      const restored = await prisma.supplier.update({
        where: { id: existing.id },
        data: {
          active: true,
          phone,
          contactPerson: contactPerson || existing.contactPerson,
          lineId: lineId || existing.lineId,
          address: address || existing.address,
          taxId: taxId || existing.taxId,
          creditTerms: creditTerms || existing.creditTerms,
          categories: categoriesStr || existing.categories,
        },
      });
      return NextResponse.json({ success: true, supplier: restored });
    }
    throw new AccessError(409, `มีซัพพลายเออร์ชื่อ "${name}" อยู่ในระบบแล้ว`);
  }

  const supplier = await prisma.$transaction(async (tx) => {
    const s = await tx.supplier.create({
      data: {
        tenantId: actor.tenantId,
        name,
        contactPerson: contactPerson || null,
        phone,
        lineId: lineId || null,
        address: address || null,
        taxId: taxId || null,
        creditTerms: creditTerms || "เครดิต 30 วัน",
        categories: categoriesStr || null,
        active: true,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.id,
        module: "INVENTORY",
        action: "CREATE",
        targetId: s.id,
        details: `เพิ่มซัพพลายเออร์ใหม่: ${name} (${phone})`,
      },
    });

    return s;
  });

  return NextResponse.json({ success: true, supplier }, { status: 201 });
}

// PUT /api/suppliers
async function handlePUT(request: NextRequest) {
  const actor = staffContext();
  const body = await readJson(request);

  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) throw new AccessError(400, "กรุณาระบุรหัสซัพพลายเออร์ (id)");

  const existing = await prisma.supplier.findFirst({
    where: { id, tenantId: actor.tenantId },
  });
  if (!existing) throw new AccessError(404, "ไม่พบข้อมูลซัพพลายเออร์");

  const name = typeof body.name === "string" ? body.name.trim() : existing.name;
  const phone = typeof body.phone === "string" ? body.phone.trim() : existing.phone;
  const contactPerson = typeof body.contactPerson === "string" ? body.contactPerson.trim() : existing.contactPerson;
  const lineId = typeof body.lineId === "string" ? body.lineId.trim() : existing.lineId;
  const address = typeof body.address === "string" ? body.address.trim() : existing.address;
  const taxId = typeof body.taxId === "string" ? body.taxId.trim() : existing.taxId;
  const creditTerms = typeof body.creditTerms === "string" ? body.creditTerms.trim() : existing.creditTerms;

  let categoriesStr = existing.categories;
  if (Array.isArray(body.categories)) {
    categoriesStr = body.categories.filter((c: any) => typeof c === "string").join(", ");
  } else if (typeof body.categories === "string") {
    categoriesStr = body.categories.trim();
  }

  const updated = await prisma.$transaction(async (tx) => {
    const s = await tx.supplier.update({
      where: { id },
      data: {
        name,
        phone,
        contactPerson: contactPerson || null,
        lineId: lineId || null,
        address: address || null,
        taxId: taxId || null,
        creditTerms,
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

// DELETE /api/suppliers
async function handleDELETE(request: NextRequest) {
  const actor = staffContext();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) throw new AccessError(400, "กรุณาระบุรหัสซัพพลายเออร์ที่ต้องการลบ");

  const existing = await prisma.supplier.findFirst({
    where: { id, tenantId: actor.tenantId },
  });
  if (!existing) throw new AccessError(404, "ไม่พบข้อมูลซัพพลายเออร์");

  await prisma.$transaction(async (tx) => {
    // Soft delete to preserve PO history integrity
    await tx.supplier.update({
      where: { id },
      data: { active: false },
    });

    await tx.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId: actor.id,
        module: "INVENTORY",
        action: "DELETE",
        targetId: id,
        details: `ลบซัพพลายเออร์: ${existing.name}`,
      },
    });
  });

  return NextResponse.json({ success: true, message: "ลบซัพพลายเออร์สำเร็จ" });
}

export const GET = withStaff(handleGET, ["ADMIN", "MANAGER", "TECHNICIAN", "CASHIER"]);
export const POST = withStaff(handlePOST, ["ADMIN", "MANAGER"]);
export const PUT = withStaff(handlePUT, ["ADMIN", "MANAGER"]);
export const DELETE = withStaff(handleDELETE, ["ADMIN", "MANAGER"]);
