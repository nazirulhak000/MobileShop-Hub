import { CustomerPortal } from "@/components/customer/CustomerPortal";
import Link from "next/link";
export default async function CustomerPage({ searchParams: query }: { searchParams: Promise<{ shopSlug?: string; tab?: string }> }) {
  const searchParams = await query;
  const slug = searchParams.shopSlug?.trim();
  if (!slug) return <main className="max-w-lg mx-auto px-5 py-16"><h1 className="text-2xl font-bold text-slate-900">เข้าบัญชีลูกค้า</h1><p className="mt-4 text-slate-600">เปิดลิงก์หน้าร้านที่คุณใช้บริการ หรือกรอกรหัสร้านด้านล่าง</p><form className="mt-6 space-y-4" action="/customer"><label className="block text-sm font-medium text-slate-800">รหัสร้าน (Shop Slug)<input name="shopSlug" required maxLength={100} placeholder="เช่น fixme-service หรือรหัสร้านของคุณ" className="mt-2 block min-h-12 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700" /></label><button type="submit" className="min-h-12 w-full sm:w-auto rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white hover:bg-teal-800 transition-colors">เปิดหน้าร้าน</button></form><Link href="/" className="mt-6 inline-flex min-h-11 items-center text-teal-800 underline">กลับหน้าหลัก</Link></main>;
  return <CustomerPortal key={slug} shopSlug={slug} initialTab={searchParams.tab} />;
}
