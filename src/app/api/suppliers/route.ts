import { AccessError, staffContext } from "@/lib/staff-context";
import { readJson, withStaff, takeParam } from "@/lib/staff-http";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

// Email regex pattern
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validate 13-digit Thai Tax ID (or numeric string)
export function validateTaxId(taxId?: string | null): string | null {
  if (!taxId) return null;
  const cleaned = taxId.replace(/[\s-]/g, "");
  if (!cleaned) return null;
  if (!/^\d{13}$/.test(cleaned)) {
    throw new AccessError(400, "เลขประจำตัวผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก");
  }
  return cleaned;
}

// Validate Email format if supplied
export function validateEmail(email?: string | null): string | null {
  if (!email) return null;
  const trimmed = email.trim();
  if (!trimmed) return null;
  if (!EMAIL_REGEX.test(trimmed)) {
    throw new AccessError(400, "รูปแบบอีเมลไม่ถูกต้อง");
  }
  return trimmed;
}

// Normalize phone digits/format
export function normalizePhone(phone?: string | null): string {
  if (!phone) return "";
  return phone.trim();
}

// GET /api/suppliers
async function handleGET(request: NextRequest) {
  const actor = staffContext();
  const { searchParams } = new URL(request.url);
  const search = (searchParams.get("search") || "").trim();
  const creditTermsFilter = (searchParams.get("creditTerms") || "").trim();

  const where: Prisma.SupplierWhereInput = {
    tenantId: actor.tenantId,
    active: true,
  };

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { contactPerson: { contains: search } },
      { phone: { contains: search } },
      { email: { contains: search } },
      { lineId: { contains: search } },
      { taxId: { contains: search } },
      { bankName: { contains: search } },
      { bankAccountName: { contains: search } },
      { bankAccountNumber: { contains: search } },
      { categories: { contains: search } },
    ];
  }

  if (creditTermsFilter && creditTermsFilter !== "ALL") {
    where.creditTerms = creditTermsFilter;
  }

  const suppliers = await prisma.supplier.findMany({
    where,
    include: {
      _count: {
        select: { purchaseOrders: true },
      },
      purchaseOrders: {
        where: {
          tenantId: actor.tenantId,
        },
        select: {
          totalAmount: true,
          status: true,
          items: {
            select: {
              productName: true,
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
    take: takeParam(searchParams.get("take"), 100, 500),
  });

  const formatted = suppliers.map((s) => {
    // Calculate non-cancelled spend
    const nonCancelledOrders = s.purchaseOrders.filter((po) => po.status !== "CANCELLED");
    const totalSpend = Math.round(
      nonCancelledOrders.reduce((sum, po) => sum + (po.totalAmount || 0), 0) * 100
    ) / 100;

    // Aggregate unique supplied product names
    const productSet = new Set<string>();
    for (const po of s.purchaseOrders) {
      for (const item of po.items) {
        if (item.productName) productSet.add(item.productName.trim());
      }
    }
    const suppliedProducts = Array.from(productSet);

    return {
      id: s.id,
      name: s.name,
      contactPerson: s.contactPerson || "-",
      phone: s.phone,
      email: s.email || "",
      lineId: s.lineId || "-",
      address: s.address || "",
      taxId: s.taxId || "",
      creditTerms: s.creditTerms || "เครดิต 30 วัน",
      bankName: s.bankName || "",
      bankAccountNumber: s.bankAccountNumber || "",
      bankAccountName: s.bankAccountName || "",
      categories: s.categories ? s.categories.split(",").map((c) => c.trim()).filter(Boolean) : [],
      totalOrders: s._count.purchaseOrders,
      totalSpend,
      suppliedProducts,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  });

  return NextResponse.json({ success: true, suppliers: formatted });
}

// POST /api/suppliers
async function handlePOST(request: NextRequest) {
  const actor = staffContext();
  const body = await readJson(request);

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phone = normalizePhone(body.phone);
  const contactPerson = typeof body.contactPerson === "string" ? body.contactPerson.trim() : "";
  const email = validateEmail(body.email);
  const lineId = typeof body.lineId === "string" ? body.lineId.trim() : "";
  const address = typeof body.address === "string" ? body.address.trim() : "";
  const taxId = validateTaxId(body.taxId);
  const creditTerms = typeof body.creditTerms === "string" && body.creditTerms.trim()
    ? body.creditTerms.trim()
    : "เครดิต 30 วัน";
  const bankName = typeof body.bankName === "string" ? body.bankName.trim() : "";
  const bankAccountNumber = typeof body.bankAccountNumber === "string" ? body.bankAccountNumber.trim() : "";
  const bankAccountName = typeof body.bankAccountName === "string" ? body.bankAccountName.trim() : "";

  let categoriesStr = "";
  if (Array.isArray(body.categories)) {
    categoriesStr = body.categories.filter((c: any) => typeof c === "string" && c.trim()).map((c: string) => c.trim()).join(", ");
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
      // Re-activate previously deleted supplier
      const restored = await prisma.$transaction(async (tx) => {
        const sup = await tx.supplier.update({
          where: { id: existing.id },
          data: {
            active: true,
            phone,
            contactPerson: contactPerson || existing.contactPerson,
            email: email !== undefined ? email : existing.email,
            lineId: lineId || existing.lineId,
            address: address || existing.address,
            taxId: taxId !== undefined ? taxId : existing.taxId,
            creditTerms: creditTerms || existing.creditTerms,
            bankName: bankName || existing.bankName,
            bankAccountNumber: bankAccountNumber || existing.bankAccountNumber,
            bankAccountName: bankAccountName || existing.bankAccountName,
            categories: categoriesStr || existing.categories,
          },
        });

        await tx.auditLog.create({
          data: {
            tenantId: actor.tenantId,
            userId: actor.id,
            module: "INVENTORY",
            action: "RESTORE",
            targetId: sup.id,
            details: `เปิดใช้งานซัพพลายเออร์อีกครั้ง: ${name} (${phone})`,
          },
        });

        return sup;
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
        email: email || null,
        lineId: lineId || null,
        address: address || null,
        taxId: taxId || null,
        creditTerms,
        bankName: bankName || null,
        bankAccountNumber: bankAccountNumber || null,
        bankAccountName: bankAccountName || null,
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

  // If name changed, check uniqueness within tenant
  if (name !== existing.name) {
    const dup = await prisma.supplier.findFirst({
      where: {
        tenantId: actor.tenantId,
        name,
        id: { not: id },
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
      where: { id },
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
