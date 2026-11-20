import { AccessError, staffContext } from "@/lib/staff-context";
import { withStaff, reqId } from "@/lib/staff-http";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/sales/[id] - one sale with its items (scoped to the actor's tenant/branches)
async function handleGET(_request: NextRequest, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  const actor = staffContext();
  const resolved = await Promise.resolve(params);
  const id = reqId(resolved?.id, "id");
  const sale = await prisma.sale.findFirst({
    where: {
      id,
      tenantId: actor.tenantId,
      ...(actor.role === "CASHIER" ? { branchId: { in: actor.branchIds } } : {}),
    },
    select: {
      id: true,
      invoiceNo: true,
      branchId: true,
      branch: { select: { id: true, code: true, name: true } },
      customer: { select: { id: true, name: true, phone: true } },
      cashier: { select: { id: true, name: true } },
      totalAmount: true,
      discount: true,
      vatAmount: true,
      netAmount: true,
      paymentMethod: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      items: {
        select: {
          id: true,
          productId: true,
          quantity: true,
          unitPrice: true,
          subtotal: true,
          product: { select: { id: true, code: true, name: true } },
          deviceImei: { select: { id: true, imei: true } },
        },
      },
    },
  });
  if (!sale) throw new AccessError(404, "ไม่พบบิลขายนี้");
  return NextResponse.json({ success: true, data: sale });
}

export const GET = withStaff(handleGET, ["ADMIN", "MANAGER", "CASHIER"]);
