import { NextResponse } from "next/server";
import { withStaff } from "@/lib/staff-http";
import { staffContext } from "@/lib/staff-context";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
// Only ADMIN/MANAGER receive the staff directory (incl. usernames = login identifiers).
// Other roles get their own profile plus a minimal technician roster (no usernames) so repair
// assignment dropdowns keep working.
const DIRECTORY_ROLES = ["ADMIN", "MANAGER"];
export const GET = withStaff(async () => {
  const user = staffContext();
  const fullDirectory = DIRECTORY_ROLES.includes(user.role);
  const [branches, directory, tenant] = await Promise.all([
    prisma.branch.findMany({ select: { id: true, code: true, name: true } }),
    prisma.user.findMany({ where: fullDirectory ? { isActive: true } : { isActive: true, OR: [{ id: user.id }, { role: "TECHNICIAN" }] }, select: { id: true, name: true, role: true, username: true, branch: { select: { code: true } } } }),
    prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { name: true, slug: true } }),
  ]);
  const users = directory.map(u => ({ id: u.id, name: u.name, role: u.role, username: fullDirectory || u.id === user.id ? u.username : "", branchCode: u.branch?.code ?? "" }));
  return NextResponse.json({ user: { ...user, branchCode: branches.find(b => b.id === user.branchId)?.code ?? "" }, branches, users, tenant });
}, ["ADMIN", "MANAGER", "CASHIER", "TECHNICIAN"]);
