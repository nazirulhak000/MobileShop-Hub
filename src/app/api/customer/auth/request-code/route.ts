import { NextRequest, NextResponse } from "next/server";
import { requestOtp } from "@/lib/customer-auth";
import { checkOrigin } from "@/lib/staff-auth";
import { safeError } from "@/lib/staff-http";
import { clientIp, isLocalRequest } from "@/lib/client-ip";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    const body = await request.json();
    const result = await requestOtp(body?.shopSlug, body?.phone, { ip: clientIp(request), local: isLocalRequest(request) });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return safeError(error); }
}
