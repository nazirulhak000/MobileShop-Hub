import { NextRequest, NextResponse } from "next/server";
// This is a navigation convenience only; server layouts, DAL and handlers verify sessions.
// Public route segments. Match whole segments only: a bare startsWith("/customer")
// would also match staff routes such as /customers and /customer-access,
// and "/s" would match /settings, /shift, /suppliers, etc.
const PUBLIC_SEGMENTS = ["/store", "/landing", "/track", "/customer", "/s"];
const isUnder = (path: string, prefix: string) => path === prefix || path.startsWith(prefix + "/");
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (
    path === "/" ||
    path === "/login" ||
    path === "/register" ||
    PUBLIC_SEGMENTS.some(prefix => isUnder(path, prefix)) ||
    path.startsWith("/api/")
  ) {
    return NextResponse.next();
  }
  // Production uses the "__Host-" prefixed cookie; dev/e2e use the legacy name (see src/lib/staff-auth.ts).
  const hasStaffCookie = request.cookies.get("__Host-mobileshop_staff_session") || request.cookies.get("mobileshop_staff_session");
  if (!hasStaffCookie) return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico|webp)$).*)"] };
