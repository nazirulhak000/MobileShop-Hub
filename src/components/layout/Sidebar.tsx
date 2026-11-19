"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Clock,
  Coins,
  History,
  RotateCcw,
  FileText,
  CreditCard,
  HandCoins,
  Package,
  Headphones,
  ShieldCheck,
  ClipboardCheck,
  ArrowLeftRight,
  Truck,
  Users,
  Building,
  Receipt,
  AlertCircle,
  Wrench,
  Cpu,
  CheckSquare,
  FileCheck,
  ShieldAlert,
  Landmark,
  Calculator,
  Percent,
  FileSpreadsheet,
  Settings,
  CalendarCheck,
  DollarSign,
  Wallet,
  BarChart3,
  MessageSquare,
  Send,
  GitBranch,
  UserCheck,
  Database,
  Sliders,
  Shield,
  ChevronDown,
  Menu,
  X,
  Smartphone,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SubMenuItem {
  title: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface MenuGroup {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  subItems?: SubMenuItem[];
}

const MENU_GROUPS: MenuGroup[] = [
  {
    id: "overview",
    title: "ภาพรวม",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    id: "sales_pos",
    title: "ขาย & ลูกค้า",
    icon: ShoppingCart,
    subItems: [
      { title: "ขายหน้าร้าน POS", href: "/sales", icon: ShoppingCart },
      { title: "เปิด/ปิดกะแคชเชียร์", href: "/shift", icon: Clock },
      { title: "สรุปยอดรับเงินประจำวัน", href: "/daily-takings", icon: Coins },
      { title: "ประวัติการขาย & บิล", href: "/sales-history", icon: History },
      { title: "คืนสินค้า & ยกเลิกบิล", href: "/refunds", icon: RotateCcw },
      { title: "ใบเสร็จ & ใบกำกับภาษี", href: "/invoices", icon: FileText },
      { title: "สัญญาผ่อนชำระมือถือ", href: "/installments", icon: CreditCard },
      { title: "รับซื้อ & ฝากจำนำ", href: "/pawn", icon: HandCoins },
    ],
  },
  {
    id: "inventory",
    title: "คลังสินค้า & จัดซื้อ",
    icon: Package,
    subItems: [
      { title: "สินค้าคงคลัง & IMEI", href: "/stock", icon: Package },
      { title: "อุปกรณ์เสริม & เคส", href: "/accessories", icon: Headphones },
      { title: "ประกันสินค้า & เคลม", href: "/warranty", icon: ShieldCheck },
      { title: "ตรวจนับสต็อก (Stock Count)", href: "/stock-count", icon: ClipboardCheck },
      { title: "โอนย้ายสินค้าระหว่างสาขา", href: "/stock-transfer", icon: ArrowLeftRight },
      { title: "รับซื้อเครื่องมือสอง (Appraise)", href: "/purchase", icon: Truck },
      { title: "ทะเบียนลูกค้า (CRM)", href: "/customers", icon: Users },
      { title: "ทะเบียนซัพพลายเออร์", href: "/suppliers", icon: Building },
      { title: "ประวัติการสั่งซื้อสินค้า", href: "/purchase-history", icon: Receipt },
      { title: "แจ้งเตือนสั่งซื้อซ้ำ (Reorder)", href: "/reorders", icon: AlertCircle, badge: "Low" },
    ],
  },
  {
    id: "repairs",
    title: "งานซ่อม & ช่าง",
    icon: Wrench,
    subItems: [
      { title: "เปิดใบรับซ่อมด่วน", href: "/repair-intake", icon: FileText, badge: "New" },
      { title: "โต๊ะช่าง & รายการดำเนินการ", href: "/technician-repairs", icon: Cpu },
      { title: "รายการส่งซ่อมทั้งหมด", href: "/repair", icon: Wrench },
      { title: "เบิกอะไหล่ซ่อม (Parts)", href: "/spare-parts", icon: Package },
      { title: "ตรวจเช็คก่อน/หลังซ่อม QC", href: "/repair-checklist", icon: CheckSquare },
      { title: "เอกสารซ่อม & พิมพ์สลิป", href: "/repair-documents", icon: FileCheck },
      { title: "เคลมประกันงานซ่อม", href: "/repair-warranty", icon: ShieldAlert },
    ],
  },
  {
    id: "tax_accounting",
    title: "ภาษี & บัญชี",
    icon: Landmark,
    subItems: [
      { title: "ศูนย์ภาษี & ภาพรวม", href: "/tax", icon: Landmark },
      { title: "ภาษีบุคคลธรรมดา (ภ.ง.ด.)", href: "/tax/pit", icon: Calculator },
      { title: "ภาษีนิติบุคคล (ภ.ง.ด.50)", href: "/tax/cit", icon: Percent },
      { title: "ภาษีมูลค่าเพิ่ม (ภ.พ.30)", href: "/tax/vat", icon: FileSpreadsheet },
      { title: "หัก ณ ที่จ่าย (ภ.ง.ด.3/53)", href: "/tax/wht", icon: Receipt },
      { title: "ตั้งค่าภาษี & ลดหย่อน 2568", href: "/tax/settings", icon: Settings },
    ],
  },
  {
    id: "hr_expenses",
    title: "บุคลากร & ค่าใช้จ่าย",
    icon: Users,
    subItems: [
      { title: "บันทึกเวลาเข้า-ออกงาน", href: "/attendance", icon: CalendarCheck },
      { title: "เงินเดือน & คอมมิชชั่น", href: "/payroll", icon: DollarSign },
      { title: "บันทึกค่าใช้จ่ายร้าน", href: "/expenses", icon: Wallet },
    ],
  },
  {
    id: "reports",
    title: "รายงาน & สถิติ",
    icon: BarChart3,
    href: "/reports",
  },
  {
    id: "crm_line",
    title: "CRM & LINE OA",
    icon: MessageSquare,
    subItems: [
      { title: "เชื่อมต่อ LINE OA & Flex", href: "/line-oa", icon: Send },
      { title: "แชทสดลูกค้า (Inbox)", href: "/line-chat", icon: MessageSquare },
    ],
  },
  {
    id: "settings_branch",
    title: "ตั้งค่า & สาขา",
    icon: Settings,
    subItems: [
      { title: "จัดการข้อมูลสาขา", href: "/branches", icon: GitBranch },
      { title: "พนักงาน & สิทธิ์เข้าถึง", href: "/users", icon: UserCheck },
      { title: "ฐานข้อมูลหลัก (Masters)", href: "/masters", icon: Database },
      { title: "ตั้งค่าระบบทั่วไป", href: "/settings", icon: Sliders },
      { title: "บันทึกความปลอดภัย (Audit)", href: "/audit-logs", icon: Shield },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  // Default open groups
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    overview: true,
    sales_pos: true,
    inventory: true,
    repairs: true,
    tax_accounting: true,
    hr_expenses: false,
    crm_line: false,
    settings_branch: false,
  });

  // Automatically expand group containing active route
  useEffect(() => {
    MENU_GROUPS.forEach((group) => {
      if (group.subItems) {
        const matches = group.subItems.some((item) =>
          pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
        );
        if (matches) {
          setOpenGroups((prev) => ({ ...prev, [group.id]: true }));
        }
      }
    });
  }, [pathname]);

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isItemActive = (href: string) => {
    if (href === "/dashboard" || href === "/") {
      return pathname === "/" || pathname === "/dashboard";
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  // Filter menu items if search filter is active
  const filteredGroups = searchFilter.trim()
    ? MENU_GROUPS.map((group) => {
        if (!group.subItems) {
          return group.title.toLowerCase().includes(searchFilter.toLowerCase())
            ? group
            : null;
        }
        const matchedSubs = group.subItems.filter(
          (s) =>
            s.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
            s.href.toLowerCase().includes(searchFilter.toLowerCase())
        );
        return matchedSubs.length > 0
          ? { ...group, subItems: matchedSubs }
          : null;
      }).filter(Boolean) as MenuGroup[]
    : MENU_GROUPS;

  return (
    <>
      {/* Mobile Drawer Trigger */}
      <div className="lg:hidden fixed top-3 left-4 z-50">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Overlay Backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Desktop & Mobile Shell */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-40 w-64 border-r border-slate-200/90 bg-white flex flex-col transition-transform duration-200 ease-out lg:translate-x-0 select-none",
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        )}
      >
        {/* Brand Banner - MobileHub / Fixme Style */}
        <div className="flex h-16 items-center px-4 border-b border-slate-100 justify-between">
          <Link
            href="/dashboard"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2.5 group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-white font-bold shadow-xs transition-transform group-hover:scale-105">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 text-base leading-none tracking-tight">Fixme</span>
              <span className="text-[10px] text-teal-600 font-semibold tracking-wide mt-0.5">MobileHub ERP</span>
            </div>
          </Link>

          <button
            type="button"
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-[11px] font-medium hover:bg-teal-100 transition-all cursor-pointer"
          >
            <span>🎁</span>
            <span>ชวนเพื่อน</span>
          </button>
        </div>

        {/* Quick Menu Search Filter */}
        <div className="px-3 pt-3 pb-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="ค้นหาเมนู..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-2.5 text-xs placeholder:text-slate-400 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Navigation Groups List */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-2 space-y-1 text-xs">
          {filteredGroups.map((group) => {
            const hasSub = !!group.subItems;
            const isOpen = openGroups[group.id] || !!searchFilter.trim();

            if (!hasSub) {
              const active = isItemActive(group.href!);
              return (
                <Link
                  key={group.id}
                  href={group.href!}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-all",
                    active
                      ? "bg-teal-50 text-teal-800 font-semibold border border-teal-100 shadow-2xs"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <group.icon className={cn("h-4 w-4", active ? "text-teal-600" : "text-slate-400")} />
                  <span>{group.title}</span>
                </Link>
              );
            }

            return (
              <div key={group.id} className="pt-0.5">
                {/* Group Accordion Header */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <group.icon className="h-3.5 w-3.5 text-slate-400" />
                    <span>{group.title}</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 text-slate-400 transition-transform duration-150",
                      isOpen ? "rotate-0 text-teal-600" : "-rotate-90"
                    )}
                  />
                </button>

                {/* Sub items */}
                {isOpen && (
                  <div className="ml-3 pl-2.5 border-l border-slate-100 space-y-0.5 mt-0.5">
                    {group.subItems!.map((item) => {
                      const active = isItemActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "group flex items-center justify-between rounded-xl px-2.5 py-1.5 text-[11.5px] transition-all",
                            active
                              ? "bg-teal-50 text-teal-800 font-semibold border border-teal-100 shadow-2xs"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {item.icon && (
                              <item.icon
                                className={cn(
                                  "h-3.5 w-3.5 shrink-0 transition-colors",
                                  active ? "text-teal-600" : "text-slate-400 group-hover:text-slate-600"
                                )}
                              />
                            )}
                            <span className="truncate">{item.title}</span>
                          </div>
                          {item.badge && (
                            <span className="rounded-full bg-teal-100/80 px-1.5 py-0.2 text-[9px] font-bold text-teal-700">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer info: Local SQLite & Quick shortcut */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/70 text-[11px] text-slate-500">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-700">ฐานข้อมูลท้องถิ่น</span>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              SQLite Synced
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">MobileShop dev.db • 38 Modules</div>
        </div>
      </aside>
    </>
  );
}
