import { AccessError, staffContext } from "@/lib/staff-context";
import { readJson, safeError, withStaff, reqInt, reqMoney, takeParam } from "@/lib/staff-http";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const VALID_CATEGORIES = ["DEVICE", "ACCESSORY", "SPARE_PART", "SERVICE"] as const;

// GET /api/inventory?branch=HQ&category=SPARE_PART&search=iPhone&lowStock=true
async function handleGET(request: NextRequest) {
  try {
    const actor = staffContext();
    const { searchParams } = new URL(request.url);
    const branchCode = searchParams.get("branch")?.trim() || "";
    const category = searchParams.get("category")?.trim() || "";
    const search = searchParams.get("search")?.trim() || "";
    const lowStockOnly = searchParams.get("lowStock") === "true";

    // Resolve branch within actor tenant
    let branch = null;
    if (branchCode) {
      branch = await prisma.branch.findFirst({
        where: {
          tenantId: actor.tenantId,
          OR: [{ code: branchCode }, { id: branchCode }],
        },
      });
      if (!branch || !actor.branchIds.includes(branch.id)) {
        throw new AccessError(404, "ไม่พบสาขาหรือไม่ได้รับอนุญาต");
      }
    }

    const where: any = {
      tenantId: actor.tenantId,
    };

    if (category && category !== "ALL") {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { brand: { contains: search } },
        { model: { contains: search } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        stockItems: {
          where: {
            tenantId: actor.tenantId,
            ...(branch ? { branchId: branch.id } : { branchId: { in: actor.branchIds } }),
          },
          include: {
            branch: {
              select: { id: true, code: true, name: true },
            },
          },
        },
        imeis: {
          where: {
            tenantId: actor.tenantId,
            ...(branch ? { branchId: branch.id } : { branchId: { in: actor.branchIds } }),
          },
          include: {
            branch: {
              select: { id: true, code: true, name: true },
            },
          },
          orderBy: [{ status: "asc" }, { createdAt: "desc" }],
          take: 100,
        },
      },
      orderBy: { createdAt: "desc" },
      take: takeParam(searchParams.get("take"), 200, 500),
    });

    // Format products with branch-specific stock calculation
    let formatted = products.map((p) => {
      let currentStock = 0;
      const totalStock = p.stockItems.reduce((acc, s) => acc + s.quantity, 0);

      if (branch) {
        const branchStock = p.stockItems.find((s) => s.branchId === branch!.id);
        currentStock = branchStock ? branchStock.quantity : 0;
      } else {
        currentStock = totalStock;
      }

      const relevantImeis = branch
        ? p.imeis.filter((i) => i.branchId === branch!.id)
        : p.imeis;

      return {
        id: p.id,
        code: p.code,
        name: p.name,
        category: p.category,
        brand: p.brand || "",
        model: p.model || "",
        compatibleModels: (() => {
          if (!p.compatibleModels) return [];
          try {
            const parsed = JSON.parse(p.compatibleModels);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })(),
        costPrice: p.costPrice,
        sellPrice: p.sellPrice,
        minStock: p.minStock,
        currentStock,
        totalStock,
        isLowStock: currentStock <= p.minStock,
        imeis: relevantImeis,
        stockPerBranch: p.stockItems.map((s) => ({
          branchId: s.branchId,
          branchName: s.branch.name,
          branchCode: s.branch.code,
          quantity: s.quantity,
        })),
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });

    if (lowStockOnly) {
      formatted = formatted.filter((p) => p.isLowStock);
    }

    // Hide cost prices from roles that should not see margins.
    const role = actor.role;
    if (role === "CASHIER" || role === "TECHNICIAN") {
      const stripped = formatted.map(({ costPrice: _c, imeis, ...rest }) => ({
        ...rest,
        imeis: imeis.map(({ costPrice: _ic, ...im }) => im),
      }));
      return NextResponse.json({ success: true, products: stripped });
    }

    return NextResponse.json({ success: true, products: formatted });
  } catch (error) {
    return safeError(error);
  }
}

// POST /api/inventory - Create a new product
async function handlePOST(request: NextRequest) {
  try {
    const actor = staffContext();
    const body = await readJson(request);
    const {
      code,
      name,
      category,
      brand,
      model,
      compatibleModels,
      costPrice,
      sellPrice,
      minStock,
      branchId,
      initialStock,
    } = body;

    if (!code?.trim() || !name?.trim() || !category?.trim()) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุรหัสสินค้า ชื่อ และหมวดหมู่" },
        { status: 400 }
      );
    }

    const trimmedCode = code.trim();
    const trimmedName = name.trim();
    const cleanCategory = category.trim().toUpperCase();

    if (!VALID_CATEGORIES.includes(cleanCategory as any)) {
      return NextResponse.json(
        { success: false, error: `หมวดหมู่ไม่ถูกต้อง ต้องเป็นหนึ่งใน: ${VALID_CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }

    // Check duplicate code in tenant
    const existing = await prisma.product.findFirst({
      where: {
        tenantId: actor.tenantId,
        code: trimmedCode,
      },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `รหัสสินค้า "${trimmedCode}" มีอยู่ในระบบแล้ว` },
        { status: 400 }
      );
    }

    const cost = costPrice === undefined || costPrice === null || costPrice === "" ? 0 : reqMoney(costPrice, "costPrice");
    const sell = sellPrice === undefined || sellPrice === null || sellPrice === "" ? 0 : reqMoney(sellPrice, "sellPrice");
    const min = minStock === undefined || minStock === null || minStock === "" ? 5 : reqInt(minStock, "minStock", 0, 100_000);
    const hasInitial = initialStock !== undefined && initialStock !== null && initialStock !== "";
    const initialQty = hasInitial ? reqInt(initialStock, "initialStock", 0, 100_000) : 0;

    let targetBranch: { id: string; tenantId: string | null } | null = null;
    if (branchId) {
      targetBranch = await prisma.branch.findFirst({
        where: {
          tenantId: actor.tenantId,
          OR: [{ id: branchId }, { code: branchId }],
        },
        select: { id: true, tenantId: true },
      });
      if (!targetBranch) throw new AccessError(404, "ไม่พบสาขาสำหรับสต็อกเริ่มต้น");
      if (!actor.branchIds.includes(targetBranch.id)) throw new AccessError(403, "ไม่มีสิทธิ์จัดการสต็อกสาขานี้");
    }

    // Product + initial stock + AuditLog atomically
    const newProduct = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          tenantId: actor.tenantId,
          code: trimmedCode,
          name: trimmedName,
          category: cleanCategory,
          brand: brand?.trim() || null,
          model: model?.trim() || null,
          compatibleModels: Array.isArray(compatibleModels) && compatibleModels.length > 0
            ? JSON.stringify(compatibleModels.map((m: any) => String(m).trim()).filter(Boolean))
            : null,
          costPrice: cost,
          sellPrice: sell,
          minStock: min,
        },
      });

      if (targetBranch && initialQty > 0) {
        await tx.stockItem.create({
          data: {
            tenantId: actor.tenantId,
            productId: product.id,
            branchId: targetBranch.id,
            quantity: initialQty,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          module: "INVENTORY",
          action: "CREATE",
          targetId: product.id,
          details: JSON.stringify({
            code: product.code,
            name: product.name,
            category: product.category,
            initialStock: initialQty,
            branchId: targetBranch?.id ?? null,
          }),
        },
      });

      return product;
    });

    return NextResponse.json({ success: true, product: newProduct });
  } catch (error) {
    return safeError(error);
  }
}

// PUT /api/inventory - Update existing product
async function handlePUT(request: NextRequest) {
  try {
    const actor = staffContext();
    const body = await readJson(request);
    const {
      id,
      name,
      category,
      brand,
      model,
      compatibleModels,
      costPrice,
      sellPrice,
      minStock,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ต้องระบุ ID ของสินค้าที่ต้องการแก้ไข" }, { status: 400 });
    }

    const existing = await prisma.product.findFirst({
      where: { id, tenantId: actor.tenantId },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: "ไม่พบข้อมูลสินค้า" }, { status: 404 });
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

// DELETE /api/inventory?id=... - Delete product if no stock and no history
async function handleDELETE(request: NextRequest) {
  try {
    const actor = staffContext();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ต้องระบุ ID ของสินค้าที่ต้องการลบ" }, { status: 400 });
    }

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
        { success: false, error: `ไม่สามารถลบสินค้าได้เนื่องจากยังมีสต็อกคงเหลือ ${currentStockTotal} ชิ้น กรุณาปรับสต็อกเป็น 0 ก่อน` },
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
      // Clean up empty stockItems & inactive IMEIs if safe
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
export const POST = withStaff(handlePOST, ["ADMIN", "MANAGER"]);
export const PUT = withStaff(handlePUT, ["ADMIN", "MANAGER"]);
export const DELETE = withStaff(handleDELETE, ["ADMIN", "MANAGER"]);
