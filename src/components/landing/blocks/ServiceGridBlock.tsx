"use client";

import React from "react";
import Link from "next/link";
import {
  Wrench,
  Battery,
  Cpu,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Layers,
  Camera,
  CheckCircle2,
  LucideIcon,
} from "lucide-react";
import { StorefrontThemeColor, THEME_PALETTES } from "@/lib/storefrontTheme";
import { ServiceGridBlockProps, ServiceItem } from "./types";

const ICON_MAP: Record<string, LucideIcon> = {
  wrench: Wrench,
  battery: Battery,
  cpu: Cpu,
  smartphone: Smartphone,
  shield: ShieldCheck,
  refresh: RefreshCw,
  layers: Layers,
  camera: Camera,
  sparkles: Sparkles,
};

const DEFAULT_SERVICES: ServiceItem[] = [
  {
    id: "screen",
    title: "เปลี่ยนกระจกจอ & จอแท้ศูนย์",
    description: "ลอกเปลี่ยนเฉพาะกระจกชั้นนอกด้วยระบบกาว OCA มาตรฐานแล็บ ภาพคมชัด สีตรง 100% รองรับ 120Hz",
    price: "เริ่มต้น ฿890",
    badge: "รอรับ 30 นาที",
    iconName: "layers",
    linkUrl: "#estimate",
  },
  {
    id: "battery",
    title: "เปลี่ยนแบตเตอรี่มาตรฐาน มอก.",
    description: "เซลล์แบตแท้ ความจุเต็ม 100% มีใบรับรองความปลอดภัย มอก. สุขภาพแบตขึ้นปกติ ไม่ฟ้องแจ้งเตือน",
    price: "เริ่มต้น ฿790",
    badge: "ประกัน 1 ปี",
    iconName: "battery",
    linkUrl: "#estimate",
  },
  {
    id: "motherboard",
    title: "ซ่อมเมนบอร์ด ยกวางชิปไอซี",
    description: "แก้ไขอาการเปิดไม่ติด ชาร์จไม่เข้า เครื่องร้อน ดับเอง ซ่อมตรงจุดด้วยกล้องจุลทรรศน์สเตอริโอ 45X",
    price: "เริ่มต้น ฿1,500",
    badge: "เครื่องมือมาตรฐานแล็บ",
    iconName: "cpu",
    linkUrl: "#estimate",
  },
  {
    id: "backglass",
    title: "เปลี่ยนกระจกฝาหลังเลเซอร์",
    description: "ยิงเลเซอร์ลอกกาวฝาหลังเดิมอย่างประณีต โครงเครื่องไม่บิดงอ บอร์ดและชิ้นส่วนภายในปลอดภัย 100%",
    price: "เริ่มต้น ฿1,200",
    badge: "เลเซอร์ไร้รอย",
    iconName: "smartphone",
    linkUrl: "#estimate",
  },
  {
    id: "tradein",
    title: "บริการรับซื้อ & เทรดอินเครื่อง",
    description: "ประเมินราคาตามสภาพจริง ให้ราคาสูง จ่ายเงินสดหรือโอนทันที หรือนำมาเทรดอัปเกรดเครื่องใหม่",
    price: "ให้ราคาสูงสุด",
    badge: "จ่ายสดทันที",
    iconName: "refresh",
    linkUrl: "#estimate",
  },
  {
    id: "installment",
    title: "บริการผ่อนชำระเครื่อง & งานซ่อม",
    description: "ผ่อน 0% นานสูงสุด 10 เดือน หรือผ่อนไม่ง้อบัตรเครดิต อนุมัติไว เอกสารน้อย รับเครื่องได้ทันที",
    price: "ผ่อน 0%",
    badge: "ไม่ง้อบัตร",
    iconName: "shield",
    linkUrl: "#estimate",
  },
];

export function ServiceGridBlock({
  id = "service-grid",
  title = "บริการงานซ่อมมาตรฐานแล็บ & อะไหล่แท้",
  subtitle = "ตรวจเช็คสภาพเครื่อง 10 จุดฟรี ประเมินราคาจริงก่อนซ่อม พร้อมรับประกันงานซ่อมยาวนาน",
  badge = "🛠️ บริการครบวงจร",
  columns = 3,
  services,
  themeColor = "emerald",
  className = "",
  data,
}: ServiceGridBlockProps) {
  const resolvedTitle = title || data?.title || "บริการงานซ่อมมาตรฐานแล็บ & อะไหล่แท้";
  const resolvedSubtitle = subtitle || data?.subtitle;
  const resolvedBadge = badge || data?.badge;
  const resolvedColumns = Number(columns || data?.columns || 3);
  const items: ServiceItem[] = (services && services.length > 0)
    ? services
    : (data?.services && Array.isArray(data.services) && data.services.length > 0)
    ? data.services
    : DEFAULT_SERVICES;

  const palette = THEME_PALETTES[themeColor] || THEME_PALETTES.emerald;

  const gridColsClass =
    resolvedColumns === 2
      ? "grid-cols-1 md:grid-cols-2"
      : resolvedColumns === 4
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <section id={id} className={`w-full py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto ${className}`}>
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-10 space-y-3">
        {resolvedBadge && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border shadow-2xs">
            <span className={`px-2 py-0.5 rounded-full ${palette.badge.lightBg} ${palette.badge.lightText} border ${palette.badge.lightBorder}`}>
              {resolvedBadge}
            </span>
          </div>
        )}
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          {resolvedTitle}
        </h2>
        {resolvedSubtitle && (
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            {resolvedSubtitle}
          </p>
        )}
      </div>

      {/* Grid */}
      <div className={`grid gap-5 sm:gap-6 ${gridColsClass}`}>
        {items.map((item, index) => {
          const Icon = (item.iconName && ICON_MAP[item.iconName.toLowerCase()]) || Wrench;
          return (
            <div
              key={item.id || `service-${index}`}
              className="group relative flex flex-col justify-between bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all duration-200"
            >
              <div>
                {/* Icon & Badge */}
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`h-12 w-12 rounded-xl flex items-center justify-center ${palette.lightBg} ${palette.iconColor} border ${palette.lightBorder} transition-transform duration-200 group-hover:scale-105`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  {item.badge && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {item.badge}
                    </span>
                  )}
                </div>

                {/* Title & Description */}
                <h3 className="text-base font-bold text-slate-900 mb-2 group-hover:text-emerald-700 transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
                  {item.description}
                </p>
              </div>

              {/* Price & Link */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                {item.price ? (
                  <span className="text-xs font-bold text-slate-900 tabular-nums">
                    {item.price}
                  </span>
                ) : (
                  <span />
                )}
                {item.linkUrl && (
                  <a
                    href={item.linkUrl}
                    className={`inline-flex items-center gap-1 text-xs font-semibold ${palette.accentText} hover:underline`}
                  >
                    <span>รายละเอียด</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default ServiceGridBlock;
