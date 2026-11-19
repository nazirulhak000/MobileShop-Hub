import { CustomerPortal } from "@/components/customer/CustomerPortal";
export default async function ShopCustomerPage({ params, searchParams }: { params: Promise<{ shopSlug: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { shopSlug } = await params;
  const { tab } = await searchParams;
  return <CustomerPortal key={shopSlug} shopSlug={shopSlug} initialTab={tab === "bookings" ? "bookings" : "home"} />;
}
