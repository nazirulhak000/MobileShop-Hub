import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { clearCustomerCookies, getCustomerToken, requireCustomer } from "@/lib/customer-auth";
import { checkOrigin, hashToken } from "@/lib/staff-auth";
import { safeError } from "@/lib/staff-http";

export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    const body = await request.json().catch(() => ({}));
    const cookieStore = await cookies();
    const token = getCustomerToken(cookieStore);

    if (token) {
      const hashed = hashToken(token);
      if (body?.all === true) {
        try {
          const actor = await requireCustomer(body?.shopSlug);
          await db.customerSession.updateMany({
            where: { tenantId: actor.shop.id, accountId: actor.account.id },
            data: { revokedAt: new Date() },
          });
        } catch {
          // If session is already expired or invalid, still try to revoke this token
          const session = await db.customerSession.findUnique({ where: { tokenHash: hashed } });
          if (session) {
            await db.customerSession.updateMany({
              where: { tenantId: session.tenantId, accountId: session.accountId },
              data: { revokedAt: new Date() },
            });
          }
        }
      } else {
        await db.customerSession.updateMany({
          where: { tokenHash: hashed },
          data: { revokedAt: new Date() },
        });
      }
    }

    clearCustomerCookies(cookieStore);
    return NextResponse.json({ success: true });
  } catch (error) {
    return safeError(error);
  }
}
