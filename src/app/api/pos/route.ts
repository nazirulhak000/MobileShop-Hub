import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/pos - Process Checkout & Create Invoice
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      branchCode,
      cashierUsername,
      customerData,
      items,
      discount = 0,
      paymentMethod = "CASH",
      paymentDetails = null,
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "ไม่มีสินค้าในตะกร้า" },
        { status: 400 }
      );
    }

    // Resolve branch
    const branch = await prisma.branch.findFirst({
      where: { OR: [{ code: branchCode || "HQ" }, { id: branchCode || "HQ" }] },
    });
    if (!branch) {
      return NextResponse.json({ success: false, error: "ไม่พบข้อมูลสาขา" }, { status: 404 });
    }

    // Resolve cashier user
    let cashier = null;
    if (cashierUsername) {
      cashier = await prisma.user.findFirst({
        where: { OR: [{ username: cashierUsername }, { id: cashierUsername }] },
      });
    }

    // Resolve or create customer if provided
    let customerId: string | null = null;
    if (customerData?.phone && customerData?.name) {
      const cleanPhone = String(customerData.phone).trim();
      let cust = await prisma.customer.findFirst({
        where: { phone: cleanPhone },
      });
      if (cust) {
        cust = await prisma.customer.update({
          where: { id: cust.id },
          data: {
            name: customerData.name,
            nationalId: customerData.nationalId || undefined,
            address: customerData.address || undefined,
          },
        });
      } else {
        cust = await prisma.customer.create({
          data: {
            name: customerData.name,
            phone: cleanPhone,
            nationalId: customerData.nationalId || null,
            address: customerData.address || null,
          },
        });
      }
      customerId = cust.id;
    } else if (customerData?.id) {
      customerId = customerData.id;
    }

    // Calculate totals
    const totalAmount = items.reduce(
      (sum: number, it: any) => sum + Number(it.unitPrice) * Number(it.quantity),
      0
    );
    const numDiscount = Number(discount) || 0;
    const netAmount = Math.max(0, totalAmount - numDiscount);
    // ภ.พ.30 VAT 7% Calculation (inclusive):
    // Net before VAT = Net / 1.07
    // VAT Amount = Net - (Net / 1.07)
    const netBeforeVat = +(netAmount / 1.07).toFixed(2);
    const vatAmount = +(netAmount - netBeforeVat).toFixed(2);

    // Generate unique invoice number: INV-YYYYMM-XXXX
    const now = new Date();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const countThisMonth = await prisma.sale.count({
      where: {
        invoiceNo: { startsWith: `INV-${yyyymm}` },
      },
    });
    const invoiceNo = `INV-${yyyymm}-${String(countThisMonth + 1).padStart(4, "0")}`;

    // Transaction to create Sale, SaleItems, decrement stocks, update IMEIs
    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          invoiceNo,
          branchId: branch.id,
          customerId,
          cashierId: cashier?.id || null,
          totalAmount,
          discount: numDiscount,
          vatAmount,
          netAmount,
          paymentMethod,
          paymentDetails: paymentDetails ? JSON.stringify(paymentDetails) : null,
          status: "COMPLETED",
        },
      });

      // Process each sale item
      for (const it of items) {
        const subtotal = Number(it.unitPrice) * Number(it.quantity);
        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId: it.productId,
            deviceImeiId: it.deviceImeiId || null,
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice),
            costPrice: Number(it.costPrice) || 0,
            subtotal,
          },
        });

        // Deduct inventory stock for the branch
        const stock = await tx.stockItem.findUnique({
          where: {
            productId_branchId: {
              productId: it.productId,
              branchId: branch.id,
            },
          },
        });
        if (stock) {
          if (stock.quantity < Number(it.quantity)) {
            throw new Error(`สินค้ามีจำนวนในสต็อกสาขานี้ไม่เพียงพอ (คงเหลือ ${stock.quantity} ชิ้น, ต้องการ ${it.quantity} ชิ้น)`);
          }
          await tx.stockItem.update({
            where: { id: stock.id },
            data: {
              quantity: { decrement: Number(it.quantity) },
            },
          });
        }

        // If it's a device with IMEI, mark status as SOLD
        if (it.deviceImeiId) {
          const deviceToSell = await tx.deviceIMEI.findUnique({
            where: { id: it.deviceImeiId },
          });
          if (deviceToSell && deviceToSell.status !== "IN_STOCK") {
            throw new Error(`เครื่อง IMEI: ${deviceToSell.imei} ไม่ได้อยู่ในสถานะพร้อมขาย (${deviceToSell.status})`);
          }
          await tx.deviceIMEI.update({
            where: { id: it.deviceImeiId },
            data: { status: "SOLD" },
          });
        }
      }

      return sale;
    });

    // Fetch full sale record for receipt printing
    const fullSale = await prisma.sale.findUnique({
      where: { id: result.id },
      include: {
        branch: true,
        cashier: true,
        customer: true,
        items: {
          include: {
            product: true,
            deviceImei: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `บันทึกการขายสำเร็จ เลขที่ใบเสร็จ: ${invoiceNo}`,
      sale: fullSale,
      taxCalculation: {
        totalAmount,
        discount: numDiscount,
        netBeforeVat,
        vatRate: 7,
        vatAmount,
        netAmount,
      },
    });
  } catch (error: any) {
    console.error("POST /api/pos error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
