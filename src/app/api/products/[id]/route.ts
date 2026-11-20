import { AccessError, staffContext } from "@/lib/staff-context";
import { readJson, safeError, withStaff, reqInt, reqMoney } from "@/lib/staff-http";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const VALID_CATEGORIES = ["DEVICE", "ACCESSORY", "SPARE_PART", "SERVICE"] as const;

// GET /api/products/[id]
async function handleGET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = staffContext();
    const { id } = await params;

    const product = await prisma.product.findFirst({
      where: {
        id,
        tenantId: actor.tenantId,
      },
      include: {
        stockItems: {
          where: { tenantId: actor.tenantId, branchId: { in: actor.branchIds } },
          include: { branch: { select: { id: true, code: true, name: true } } },
        },
        imeis: {
          where: { tenantId: actor.tenantId, branchId: { in: actor.branchIds } },
          include: { branch: { select: { id: true, code: true, name: true } } },
          orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        },
      },
    });

    if (!product) {
      return NextResponse.json({ success: false, error: "ไม่พบสินค้า" }, { status: 404 });
    }

    const totalStock = product.stockItems.reduce((acc, s) => acc + s.quantity, 0);
    const formatted = {
      id: product.id,
      code: product.code,
      name: product.name,
      category: product.category,
      brand: product.brand || "",
      model: product.model || "",
      compatibleModels: (() => {
        if (!product.compatibleModels) return [];
        try {
          const parsed = JSON.parse(product.compatibleModels);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })(),
      costPrice: product.costPrice,
      sellPrice: product.sellPrice,
      minStock: product.minStock,
      totalStock,
      isLowStock: totalStock <= product.minStock,
      imeis: product.imeis,
      stockPerBranch: product.stockItems.map((s) => ({
        branchId: s.branchId,
        branchName: s.branch.name,
        branchCode: s.branch.code,
        quantity: s.quantity,
      })),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };

    if (actor.role === "CASHIER" || actor.role === "TECHNICIAN") {
      const { costPrice: _c, imeis, ...rest } = formatted;
      return NextResponse.json({
        success: true,
        product: {
          ...rest,
          imeis: imeis.map(({ costPrice: _ic, ...im }) => im),
        },
      });
    }

    return NextResponse.json({ success: true, product: formatted });
  } catch (error) {
    return safeError(error);
  }
}

// PUT or PATCH /api/products/[id]
async function handlePUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = staffContext();
    const { id } = await params;
    const body = await readJson(request);
    const { name, category, brand, model, compatibleModels, costPrice, sellPrice, minStock } = body;

    const existing = await prisma.product.findFirst({
      where: { id, tenantId: actor.tenantId },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: "ไม่พบสินค้า" }, { status: 404 });
    }

    const data: any = {};
    if (name !== undefined) data.name = String(name).trim();
    if (category !== undefined) {
      const cat = String(category).trim().toUpperCase();
      if (!VALID_CATEGORIES.includes(cat as any)) {
        return NextResponse.json({ success: false, error: `หมวดหมู่ไม่ถูกต้อง: ${cat}` }, { status: 400 });
      }
      data.category = cat;
    }
    if (brand !== undefined) data.brand = brand ? String(brand).trim() : null;
    if (model !== undefined) data.model = model ? String(model).trim() : null;
    if (compatibleModels !== undefined) {
      data.compatibleModels = Array.isArray(compatibleModels) && compatibleModels.length > 0
        ? JSON.stringify(compatibleModels.map((m: any) => String(m).trim()).filter(Boolean))
        : null;
    }
    if (costPrice !== undefined) data.costPrice = reqMoney(costPrice, "costPrice");
    if (sellPrice !== undefined) data.sellPrice = reqMoney(sellPrice, "sellPrice");
    if (minStock !== undefined) data.minStock = reqInt(minStock, "minStock", 0, 100_000);

    const updated = await prisma.$transaction(async (tx) => {
      const prod = await tx.product.update({
        where: { id },
        data,
      });

      await tx.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          module: "INVENTORY",
          action: "UPDATE",
          targetId: id,
          details: JSON.stringify({ code: prod.code, updatedFields: Object.keys(data) }),
          beforeJson: JSON.stringify({
            name: existing.name,
            category: existing.category,
            costPrice: existing.costPrice,
            sellPrice: existing.sellPrice,
            minStock: existing.minStock,
          }),
          afterJson: JSON.stringify(data),
        },
      });

      return prod;
    });

    return NextResponse.json({ success: true, product: updated });
  } catch (error) {
    return safeError(error);
  }
}

// DELETE /api/products/[id]
async function handleDELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = staffContext();
    const { id } = await params;

    const product = await prisma.product.findFirst({
      where: { id, tenantId: actor.tenantId },
      include: {
        stockItems: true,
        imeis: true,
        partUsages: { take: 1 },
        saleItems: { take: 1 },
      },
    });

    if (!product) {
      return NextResponse.json({ success: false, error: "ไม่พบสินค้า" }, { status: 404 });
    }

    const currentStockTotal = product.stockItems.reduce((acc, s) => acc + s.quantity, 0);
    if (currentStockTotal > 0) {
      return NextResponse.json(
        { success: false, error: `ไม่สามารถลบสินค้าได้เนื่องจากยังมีสต็อกคงเหลือ ${currentStockTotal} ชิ้น` },
        { status: 400 }
      );
    }

    const activeImeis = product.imeis.filter((i) => i.status === "IN_STOCK");
    if (activeImeis.length > 0) {
      return NextResponse.json(
        { success: false, error: `ไม่สามารถลบสินค้าได้เนื่องจากยังมี IMEI สถานะพร้อมขาย ${activeImeis.length} เครื่อง` },
        { status: 400 }
      );
    }

    if (product.saleItems.length > 0 || product.partUsages.length > 0) {
      return NextResponse.json(
        { success: false, error: "ไม่สามารถลบสินค้าที่มีประวัติการขายหรือการเบิกใช้ในงานซ่อมได้" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.stockItem.deleteMany({ where: { productId: id } });
      await tx.deviceIMEI.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          module: "INVENTORY",
          action: "DELETE",
          targetId: id,
          details: JSON.stringify({ code: product.code, name: product.name }),
        },
      });
    });

    return NextResponse.json({ success: true, message: `ลบสินค้า ${product.name} เรียบร้อยแล้ว` });
  } catch (error) {
    return safeError(error);
  }
}

export const GET = withStaff(handleGET, ["ADMIN", "MANAGER", "CASHIER", "TECHNICIAN"]);
export const PUT = withStaff(handlePUT, ["ADMIN", "MANAGER"]);
export const PATCH = withStaff(handlePUT, ["ADMIN", "MANAGER"]);
export const DELETE = withStaff(handleDELETE, ["ADMIN", "MANAGER"]);
