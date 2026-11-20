import { NextRequest, NextResponse } from "next/server";
import { AccessError, staffContext } from "@/lib/staff-context";
import { withStaff, readJson, safeError, reqId } from "@/lib/staff-http";
import { getTenantTransfers } from "../route";

export const dynamic = "force-dynamic";

/**
 * GET /api/stock-transfers/[id]
 */
async function handleGET(
  _request: NextRequest,
  context: { params: { id: string } }
) {
  const actor = staffContext();
  const transferId = reqId(context.params.id, "id");

  const transferMap = await getTenantTransfers(actor.tenantId, transferId);
  const transfer = transferMap.get(transferId);

  if (!transfer) {
    throw new AccessError(404, "ไม่พบข้อมูลใบโอนย้ายสินค้า");
  }

  // Scoping check for branch
  const isAllBranchRole = actor.role === "ADMIN" || actor.role === "MANAGER";
  if (
    !isAllBranchRole &&
    !actor.branchIds.includes(transfer.sourceBranchId) &&
    !actor.branchIds.includes(transfer.destBranchId)
  ) {
    throw new AccessError(403, "ไม่มีสิทธิ์เข้าถึงใบโอนสินค้านี้");
  }

  return NextResponse.json({
    success: true,
    transfer,
  });
}

/**
 * PATCH /api/stock-transfers/[id]
 * Forward to POST /api/stock-transfers with action
 */
async function handlePATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const transferId = reqId(context.params.id, "id");
  const body = await readJson(request);

  // Map requested status/action
  let action = (body?.action || body?.status || "").toUpperCase();
  if (action === "IN_TRANSIT") action = "DISPATCH";
  if (action === "RECEIVED") action = "RECEIVE";
  if (action === "REJECTED") action = "REJECT";
  if (action === "CANCELLED") action = "CANCEL";

  const forwardRequest = new NextRequest(new URL("/api/stock-transfers", request.url), {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify({
      action,
      transferId,
      note: body?.note || body?.trackingNote,
    }),
  });

  const { POST } = await import("../route");
  return POST(forwardRequest, { params: Promise.resolve({}) });
}

export const GET = withStaff(handleGET, ["ADMIN", "MANAGER", "TECHNICIAN", "CASHIER"]);
export const PATCH = withStaff(handlePATCH, ["ADMIN", "MANAGER", "TECHNICIAN", "CASHIER"]);
export const POST = withStaff(handlePATCH, ["ADMIN", "MANAGER", "TECHNICIAN", "CASHIER"]);
