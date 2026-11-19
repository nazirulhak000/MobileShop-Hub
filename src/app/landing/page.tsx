import type { Metadata } from "next";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { LandingHero } from "@/components/landing/LandingHero";
import { ServicesBento } from "@/components/landing/ServicesBento";
import { LiveTrackingShowcase } from "@/components/landing/LiveTrackingShowcase";
import { InspectionStandard } from "@/components/landing/InspectionStandard";
import { PriceEstimator } from "@/components/landing/PriceEstimator";
import { CustomerReviews } from "@/components/landing/CustomerReviews";
import { ShopLocation } from "@/components/landing/ShopLocation";
import { LandingFaq } from "@/components/landing/LandingFaq";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { MobileQuickBar } from "@/components/landing/MobileQuickBar";

export const metadata: Metadata = {
  title: "MobileShop-Hub | ศูนย์บริการซ่อมมือถือด่วนมาตรฐานแล็บ ตรวจสอบสถานะงานซ่อม 24 ชั่วโมง",
  description:
    "ศูนย์บริการซ่อมสมาร์ตโฟนและแท็บเล็ตมาตรฐานสากล iPhone, iPad, Samsung และแบรนด์ชั้นนำ ด้วยเครื่องมือตรวจวัดเฉพาะทาง อะไหล่มาตรฐาน มอก. พร้อมระบบติดตามงานซ่อม Live Tracking ตลอด 24 ชั่วโมง",
  keywords: [
    "ซ่อมมือถือด่วน",
    "ศูนย์ซ่อมไอโฟน",
    "ลอกกระจกจอแท้ OCA",
    "เปลี่ยนแบตเตอรี่ มอก.",
    "ตรวจวัดกระแสไฟแล็บ",
    "ติดตามงานซ่อมมือถือ",
    "Live Tracking",
    "ซ่อม Samsung",
    "MobileShop-Hub",
  ],
  openGraph: {
    title: "MobileShop-Hub | ศูนย์บริการซ่อมมือถือด่วนมาตรฐานแล็บ ตรวจสอบสถานะงานซ่อม 24 ชั่วโมง",
    description:
      "บริการซ่อมด่วนมาตรฐานแล็บวิศวกรรมอิเล็กทรอนิกส์ อะไหล่มาตรฐาน มอก. รับประกันงานซ่อม 90-180 วัน ตรวจเช็คละเอียด 10 จุดก่อนและหลังซ่อม พร้อมระบบติดตามภาพถ่ายช่างแบบเรียลไทม์",
    type: "website",
    locale: "th_TH",
  },
};

export default function LandingPage() {
  // This is the platform's demo/marketing page, not a real repair shop:
  // describe the software only (no fake phone, address or opening hours).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "MobileShop-Hub",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "ระบบจัดการร้านมือถือ: POS, งานซ่อมพร้อม Live Tracking, สต็อก/IMEI, ผ่อน, จำนำ/เทิร์น และหลายสาขา",
    inLanguage: "th",
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-emerald-600 selection:text-white flex flex-col font-sans overflow-x-hidden antialiased">
      {/* Schema.org JSON-LD for Local Search SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* 1. Header */}
      <LandingNavbar />

      <main className="flex-1 pb-24 md:pb-0 overflow-x-hidden">
        {/* 2. Hero Section */}
        <LandingHero />

        {/* 3. Core Services Grid */}
        <ServicesBento />

        {/* 4. 5-Step Live Tracking Workflow */}
        <LiveTrackingShowcase />

        {/* 5. 10-Point Pre/Post Inspection Checklist */}
        <InspectionStandard />

        {/* 6. Repair Price & Turnaround Estimator */}
        <PriceEstimator />

        {/* 7. Verified Customer Reviews & Before/After Repair */}
        <CustomerReviews />

        {/* 8. Store Location, Hours, Google Maps & LINE OA */}
        <ShopLocation />

        {/* 9. Frequently Asked Questions */}
        <LandingFaq />
      </main>

      {/* 10. Footer */}
      <LandingFooter />

      {/* 11. Mobile Bottom Bar */}
      <MobileQuickBar />
    </div>
  );
}
