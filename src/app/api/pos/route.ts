import { staffContext } from "@/lib/staff-context";
import { AccessError } from "@/lib/staff-context";
import { safeError } from "@/lib/staff-http";
import { withStaff } from "@/lib/staff-http";
import { reqId, optId, reqInt, reqMoney, reqEnum, bangkokYYYYMM } from "@/lib/staff-http";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PAYMENT_METHODS = ["CASH", "PROMPTPAY", "CARD", "SPLIT"] as const;
const PRICE_OVERRIDE_ROLES = ["ADMIN", "MANAGER"];
const MAX_ITEMS = 100;
// Cashiers may discount up to this fraction of the bill; larger discounts need ADMIN/MANAGER.
const CASHIER_DISCOUNT_CAP = 0.1;

const round2 = (n: number) => Math.round(n * 100) / 100;

interface LineInput {
  productId: string;
  deviceImeiId: string | null;
  quantity: number;
  clientUnitPrice: unknown;
}

// POST /api/pos - Process Checkout & Create Invoice
async function handlePOST(request: NextRequest) {
  try {
    const actor = staffContext();
    const body = await request.json();
    const {
      branchCode,
      customerData,
      items,
      discount = 0,
      paymentMethod: rawPaymentMethod = "CASH",
      paymentDetails = null,
    } = body ?? {};

    // ---------- Input validation ----------
    if (!Array.isArray(items) || items.length === 0) {
      throw new AccessError(400, "ไม่มีสินค้าในตะกร้า");
    }
    if (items.length > MAX_ITEMS) {
      throw new AccessError(400, `สินค้าในตะกร้าต้องไม่เกิน ${MAX_ITEMS} รายการ`);
    }
    const lines: LineInput[] = items.map((it: any, idx: number) => {
      const productId = reqId(it?.productId, `items[${idx}].productId`);
      const quantity = reqInt(it?.quantity, `items[${idx}].quantity`, 1, 999);
      const deviceImeiId = optId(it?.deviceImeiId, `items[${idx}].deviceImeiId`);
      if (deviceImeiId && quantity !== 1) {
        throw new AccessError(400, "สินค้าที่มี IMEI ต้องขายครั้งละ 1 เครื่อง");
      }
      return { productId, deviceImeiId, quantity, clientUnitPrice: it?.unitPrice };
    });
    const paymentMethod = reqEnum(rawPaymentMethod, "paymentMethod", PAYMENT_METHODS);
    const requestedDiscount = reqMoney(discount ?? 0, "discount");
    if (paymentDetails !== null && (typeof paymentDetails !== "object" || Array.isArray(paymentDetails))) {
      throw new AccessError(400, "ข้อมูลการชำระเงินไม่ถูกต้อง");
    }
    const paymentDetailsJson = paymentDetails ? JSON.stringify(paymentDetails) : null;
    if (paymentDetailsJson && paymentDetailsJson.length > 2000) {
      throw new AccessError(400, "ข้อมูลการชำระเงินไม่ถูกต้อง");
    }
    const canOverridePrice = PRICE_OVERRIDE_ROLES.includes(actor.role);

    // Resolve branch (scoped client limits to branches the actor may access)
    const branchKey = reqId(branchCode, "branchCode");
    const branch = await prisma.branch.findFirst({
      where: { OR: [{ code: branchKey }, { id: branchKey }] },
    });
    if (!branch) {
      throw new AccessError(404, "ไม่พบข้อมูลสาขา");
    }

    // Resolve or create customer only when real contact data is provided (no walk-in placeholders)
    let customerId: string | null = null;
    const custPhone = typeof customerData?.phone === "string" ? customerData.phone.trim() : "";
    const custName = typeof customerData?.name === "string" ? customerData.name.trim() : "";
    if (custPhone && custName) {
      const cust = await prisma.customer.upsert({
        where: { tenantId_phone: { tenantId: actor.tenantId, phone: custPhone } },
        update: {
          name: custName,
          nationalId: customerData.nationalId || undefined,
          address: customerData.address || undefined,
        },
        create: {
          name: custName,
          phone: custPhone,
          nationalId: customerData.nationalId || null,
          address: customerData.address || null,
        },
      });
      customerId = cust.id;
    } else if (customerData?.id) {
      customerId = reqId(customerData.id, "customerData.id");
    }

    const yyyymm = bangkokYYYYMM();

    // Transaction: price from DB, atomic stock/IMEI decrement, sale + items + audit log
    const result = await prisma.$transaction(async (tx) => {
      const priced: Array<LineInput & { name: string; unitPrice: number; costPrice: number; subtotal: number }> = [];
      const priceOverrides: Array<{ productId: string; deviceImeiId: string | null; listPrice: number; soldPrice: number }> = [];

      for (const line of lines) {
        const product = await tx.product.findFirst({ where: { id: line.productId } });
        if (!product) throw new AccessError(404, "ไม่พบสินค้าในระบบ");

        let listPrice = product.sellPrice;
        let costPrice = product.costPrice;
        if (line.deviceImeiId) {
          const imei = await tx.deviceIMEI.findFirst({
            where: { id: line.deviceImeiId, productId: product.id, branchId: branch.id },
          });
          if (!imei) throw new AccessError(404, "ไม่พบเครื่อง IMEI นี้ในสาขา");
          // Per-device prices take precedence when set
          if (imei.sellPrice > 0) listPrice = imei.sellPrice;
          if (imei.costPrice > 0) costPrice = imei.costPrice;
        }
        listPrice = round2(listPrice);

        let unitPrice = listPrice;
        if (canOverridePrice && line.clientUnitPrice !== undefined && line.clientUnitPrice !== null && line.clientUnitPrice !== "") {
          const requested = reqMoney(line.clientUnitPrice, "unitPrice");
          if (requested !== listPrice) {
            unitPrice = requested;
            priceOverrides.push({ productId: product.id, deviceImeiId: line.deviceImeiId, listPrice, soldPrice: requested });
          }
        }
        if (!(unitPrice > 0)) throw new AccessError(400, `สินค้ายังไม่ได้ตั้งราคาขาย: ${product.name}`);

        priced.push({
          ...line,
          name: product.name,
          unitPrice,
          costPrice: round2(costPrice || 0),
          subtotal: round2(unitPrice * line.quantity),
        });
      }

      // Server-side totals
      const totalAmount = round2(priced.reduce((sum, p) => sum + p.subtotal, 0));
      if (requestedDiscount > totalAmount) {
        throw new AccessError(400, "ส่วนลดต้องไม่เกินยอดรวม");
      }
      const discountCap = round2(totalAmount * CASHIER_DISCOUNT_CAP);
      const discountOverCap = requestedDiscount > discountCap;
      if (discountOverCap && !canOverridePrice) {
        throw new AccessError(403, `ส่วนลดเกิน ${CASHIER_DISCOUNT_CAP * 100}% ต้องให้ผู้จัดการหรือแอดมินทำรายการ`);
      }
      const numDiscount = requestedDiscount;
      const netAmount = round2(totalAmount - numDiscount);
      // VAT 7% inclusive: net before VAT = net / 1.07, VAT = net - net before VAT
      const netBeforeVat = round2(netAmount / 1.07);
      const vatAmount = round2(netAmount - netBeforeVat);

      const counter = await tx.sequenceCounter.upsert({
        where: { id: `INV-${yyyymm}` },
        update: { current: { increment: 1 } },
        create: { id: `INV-${yyyymm}`, current: 1 },
      });
      const invoiceNo = `INV-${yyyymm}-${String(counter.current).padStart(4, "0")}`;

      const sale = await tx.sale.create({
        data: {
          invoiceNo,
          branchId: branch.id,
          customerId,
          cashierId: actor.id,
          totalAmount,
          discount: numDiscount,
          vatAmount,
          netAmount,
          paymentMethod,
          paymentDetails: paymentDetailsJson,
          status: "COMPLETED",
        },
      });

      for (const p of priced) {
        // Atomic stock decrement: fails if stock row missing or insufficient
        const stock = await tx.stockItem.updateMany({
          where: { productId: p.productId, branchId: branch.id, quantity: { gte: p.quantity } },
          data: { quantity: { decrement: p.quantity } },
        });
        if (stock.count !== 1) throw new AccessError(409, `สต็อกไม่พอ: ${p.name}`);

        // Atomic IMEI status change: only an IN_STOCK device of this product/branch can be sold
        if (p.deviceImeiId) {
          const imei = await tx.deviceIMEI.updateMany({
            where: { id: p.deviceImeiId, productId: p.productId, branchId: branch.id, status: "IN_STOCK" },
            data: { status: "SOLD" },
          });
          if (imei.count !== 1) throw new AccessError(409, "เครื่องนี้ไม่พร้อมขาย");
        }

        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId: p.productId,
            deviceImeiId: p.deviceImeiId,
            quantity: p.quantity,
            unitPrice: p.unitPrice,
            costPrice: p.costPrice,
            subtotal: p.subtotal,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          userId: actor.id,
          module: "POS",
          action: "CREATE",
          targetId: sale.id,
          severity: priceOverrides.length > 0 || discountOverCap ? "WARNING" : "INFO",
          details: JSON.stringify({ invoiceNo, netAmount, discount: numDiscount, priceOverrides }),
        },
      });

      return { sale, taxCalculation: { totalAmount, discount: numDiscount, netBeforeVat, vatRate: 7, vatAmount, netAmount } };
    });

    // Fetch full sale record for receipt printing
    const fullSale = await prisma.sale.findUnique({
      where: { id: result.sale.id },
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
      message: `บันทึกการขายสำเร็จ เลขที่ใบเสร็จ: ${result.sale.invoiceNo}`,
      sale: fullSale,
      taxCalculation: result.taxCalculation,
    });
  } catch (error: any) {
    if (error instanceof AccessError) return safeError(error);
    console.error("POST /api/pos error:", error?.message);
    return NextResponse.json({ success: false, error: "ไม่สามารถทำรายการได้ กรุณาลองใหม่" }, { status: 500 });
  }
}

export const POST = withStaff(handlePOST, ["ADMIN","MANAGER","CASHIER"]);
