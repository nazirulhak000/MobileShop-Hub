import { NextRequest, NextResponse } from "next/server";
import { requireCustomer } from "@/lib/customer-auth";
import { mutateBooking } from "@/lib/bookings";
import { checkOrigin, throttle } from "@/lib/staff-auth";
import { AccessError } from "@/lib/staff-context";
import { safeError } from "@/lib/staff-http";
export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    const body = await request.json();
    if (!body || typeof body !== "object") throw new AccessError(400, "รูปแบบข้อมูลไม่ถูกต้อง");
    if (!["create", "cancel", "reschedule"].includes(body.action)) throw new AccessError(400, "การทำรายการไม่ถูกต้อง");
    const actor = await requireCustomer(body.shopSlug);
    await throttle(`customer-booking:${actor.shop.id}:${actor.account.id}`, 20, 60_000);
    return NextResponse.json({ booking: await mutateBooking({ tenantId: actor.shop.id, accountId: actor.account.id }, body.action, body) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return safeError(error); }
}
