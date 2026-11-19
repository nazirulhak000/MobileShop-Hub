import { NextRequest, NextResponse } from "next/server";
import { requireCustomer } from "@/lib/customer-auth";
import { mutateBooking } from "@/lib/bookings";
import { checkOrigin } from "@/lib/staff-auth";
import { AccessError } from "@/lib/staff-context";
import { safeError } from "@/lib/staff-http";
export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    const body = await request.json();
    if (!["create", "cancel", "reschedule"].includes(body.action)) throw new AccessError(400, "การทำรายการไม่ถูกต้อง");
    const actor = await requireCustomer(body.shopSlug);
    return NextResponse.json({ booking: await mutateBooking({ tenantId: actor.shop.id, accountId: actor.account.id }, body.action, body) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return safeError(error); }
}
