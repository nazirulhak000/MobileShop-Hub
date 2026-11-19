import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveShop } from "@/lib/customer-auth";
import { availability, services } from "@/lib/bookings";
import { safeError } from "@/lib/staff-http";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const shop = await resolveShop((await params).slug);
    const query = request.nextUrl.searchParams;
    if (query.has("date") && query.has("branchId")) return NextResponse.json({ slots: await availability(shop.id, query.get("branchId")!, query.get("date")!) }, { headers: { "Cache-Control": "no-store" } });
    const branches = await db.branch.findMany({ where: { tenantId: shop.id }, select: { id: true, name: true, address: true, phone: true } });
    return NextResponse.json({ shop: { name: shop.name, slug: shop.slug }, branches, services });
  } catch (error) { return safeError(error); }
}
