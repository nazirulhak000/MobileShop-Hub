import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { checkOrigin, clearStaffCookies, hashToken, requireStaffSession, staffTokens } from "@/lib/staff-auth";
import { safeError } from "@/lib/staff-http";
export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    const all = new URL(request.url).searchParams.get("all") === "true";
    const store = await cookies();
    const tokens = staffTokens(store);
    if (all) {
      const user = await requireStaffSession();
      await db.staffSession.updateMany({ where: { userId: user.id, tenantId: user.tenantId, revokedAt: null }, data: { revokedAt: new Date() } });
    } else if (tokens.length) await db.staffSession.updateMany({ where: { tokenHash: { in: tokens.map(hashToken) } }, data: { revokedAt: new Date() } });
    clearStaffCookies(store);
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return safeError(error); }
}
