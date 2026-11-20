import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { CUSTOMER_COOKIE, requireCustomer } from "@/lib/customer-auth";
import { checkOrigin, cookieOptions, hashToken } from "@/lib/staff-auth";
import { safeError } from "@/lib/staff-http";
export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    const body = await request.json().catch(() => ({}));
    const actor = await requireCustomer(body?.shopSlug);
    const token = (await cookies()).get(CUSTOMER_COOKIE)?.value;
    if (body?.all === true) {
      await db.customerSession.updateMany({ where: { tenantId: actor.shop.id, accountId: actor.account.id }, data: { revokedAt: new Date() } });
    } else if (token) {
      await db.customerSession.updateMany({ where: { tenantId: actor.shop.id, accountId: actor.account.id, tokenHash: hashToken(token) }, data: { revokedAt: new Date() } });
    }
    (await cookies()).set(CUSTOMER_COOKIE, "", { ...cookieOptions, maxAge: 0 });
    return NextResponse.json({ success: true });
  } catch (error) { return safeError(error); }
}
