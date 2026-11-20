import type { Metadata } from "next";
import "./globals.css";
import { AppLayout } from "@/components/layout/AppLayout";

export const metadata: Metadata = {
  title: "FixMe | ระบบบริหารร้านซ่อมมือถือ & จัดการงานซ่อมครบวงจร",
  description:
    "FixMe: Complete Management Suite for Mobile Repair Services, Inventory, Multi-Branch POS, and Trade-in / Pawn Operations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className="font-sans antialiased">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
