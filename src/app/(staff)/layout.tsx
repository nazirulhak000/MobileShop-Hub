import { redirect } from "next/navigation";
import { requireStaffSession } from "@/lib/staff-auth";
import { AccessError } from "@/lib/staff-context";
export const dynamic = "force-dynamic";
export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  try { await requireStaffSession(); }
  catch (error) { if (error instanceof AccessError) redirect("/login"); throw error; }
  return <>{children}</>;
}
