import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/inventory?branch=HQ&category=SPARE_PART&search=iPhone
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branchCode = searchParams.get("branch") || "";
    const category = searchParams.get("category") || "";
    const search = searchParams.get("search") || "";

    // Resolve branch
    let branch = null;
    if (branchCode) {
      branch = await prisma.branch.findFirst({
        where: {
          OR: [{ code: branchCode }, { id: branchCode }],
        },
      });
    }

    const where: any = {};
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
          include: {
            branch: true,
          },
        },
        imeis: {
          include: {
            branch: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Format products with branch-specific stock calculation
    const formatted = products.map((p) => {
      let currentStock = 0;
      let totalStock = p.stockItems.reduce((acc, s) => acc + s.quantity, 0);

      if (branch) {
        const branchStock = p.stockItems.find((s) => s.branchId === branch!.id);
        currentStock = branchStock ? branchStock.quantity : 0;
      } else {
        currentStock = totalStock;
      }

      // Filter IMEIs if branch specified
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
        compatibleModels: p.compatibleModels ? JSON.parse(p.compatibleModels) : [],
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
      };
    });

    return NextResponse.json({ success: true, products: formatted });
  } catch (error: any) {
    console.error("GET /api/inventory error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/inventory - Create a new product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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

    if (!code || !name || !category) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุรหัสสินค้า ชื่อ และหมวดหมู่" },
        { status: 400 }
      );
    }

    const newProduct = await prisma.product.create({
      data: {
        code,
        name,
        category,
        brand: brand || null,
        model: model || null,
        compatibleModels: compatibleModels ? JSON.stringify(compatibleModels) : null,
        costPrice: Number(costPrice) || 0,
        sellPrice: Number(sellPrice) || 0,
        minStock: Number(minStock) || 5,
      },
    });

    // If initial stock and branchId provided, create stock item
    if (branchId && initialStock !== undefined) {
      const branch = await prisma.branch.findFirst({
        where: { OR: [{ id: branchId }, { code: branchId }] },
      });
      if (branch) {
        await prisma.stockItem.create({
          data: {
            productId: newProduct.id,
            branchId: branch.id,
            quantity: Number(initialStock) || 0,
          },
        });
      }
    }

    return NextResponse.json({ success: true, product: newProduct });
  } catch (error: any) {
    console.error("POST /api/inventory error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
