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
  Gift,
  Palette,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp, type UserInfo } from "@/context/AppContext";

type Role = UserInfo["role"];

// Role sets for menu visibility. UI-only: every API still enforces roles server-side.
// Keep these aligned with the withStaff(...) role lists of the corresponding APIs.
const ALL: Role[] = ["ADMIN", "MANAGER", "CASHIER", "TECHNICIAN"];
const FRONT: Role[] = ["ADMIN", "MANAGER", "CASHIER"]; // sales, stock, customers
const REPAIR: Role[] = ["ADMIN", "MANAGER", "CASHIER", "TECHNICIAN"]; // repair workflow
const MGMT: Role[] = ["ADMIN", "MANAGER"]; // finance, tax, HR, reports, audit
const ADMIN_ONLY: Role[] = ["ADMIN"]; // users/branches/settings (APIs are ADMIN-only)

interface SubMenuItem {
  title: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string;
  /** Roles allowed to see this item. */
  roles: Role[];
}

interface MenuGroup {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  /** Roles allowed to see a single-link group (groups with subItems are shown if any item is visible). */
  roles?: Role[];
  subItems?: SubMenuItem[];
}

const MENU_GROUPS: MenuGroup[] = [
  {
    id: "overview",
    title: "ภาพรวม",
    icon: LayoutDashboard,
    href: "/dashboard",
    roles: ALL,
  },
  {
    id: "sales_pos",
    title: "ขาย & ลูกค้า",
    icon: ShoppingCart,
    subItems: [
      { title: "ขายหน้าร้าน POS", href: "/pos", icon: ShoppingCart, roles: FRONT },
      { title: "เปิด/ปิดกะแคชเชียร์", href: "/shift", icon: Clock, roles: FRONT },
      { title: "สรุปยอดรับเงินประจำวัน", href: "/daily-takings", icon: Coins, roles: FRONT },
      { title: "ประวัติการขาย & บิล", href: "/sales-history", icon: History, roles: FRONT },
      { title: "คืนสินค้า & ยกเลิกบิล", href: "/refunds", icon: RotateCcw, roles: FRONT },
      { title: "ใบเสร็จ & ใบกำกับภาษี", href: "/invoices", icon: FileText, roles: FRONT },
      { title: "สัญญาผ่อนชำระมือถือ", href: "/installments", icon: CreditCard, roles: FRONT },
      { title: "รับจำนำมือถือ", href: "/pawn", icon: HandCoins, roles: FRONT },
      { title: "รับซื้อ-เทิร์นเครื่อง (Trade-in)", href: "/trade-in", icon: Smartphone, roles: FRONT },
    ],
  },
  {
    id: "inventory",
    title: "คลังสินค้า & จัดซื้อ",
    icon: Package,
    subItems: [
      { title: "สินค้าคงคลัง & IMEI", href: "/inventory", icon: Package, roles: FRONT },
      { title: "อุปกรณ์เสริม & เคส", href: "/accessories", icon: Headphones, roles: FRONT },
      { title: "ประกันสินค้า & เคลม", href: "/warranty", icon: ShieldCheck, roles: FRONT },
      { title: "ตรวจนับสต็อก (Stock Count)", href: "/stock-count", icon: ClipboardCheck, roles: FRONT },
      { title: "โอนย้ายสินค้าระหว่างสาขา", href: "/stock-transfer", icon: ArrowLeftRight, roles: MGMT },
      { title: "รับซื้อเครื่องมือสอง (Appraise)", href: "/purchase", icon: Truck, roles: FRONT },
      { title: "ทะเบียนลูกค้า (CRM)", href: "/customers", icon: Users, roles: FRONT },
      { title: "เชื่อมบัญชีลูกค้า", href: "/customer-access", icon: UserCheck, roles: MGMT },
      { title: "ทะเบียนซัพพลายเออร์", href: "/suppliers", icon: Building, roles: MGMT },
      { title: "ประวัติการสั่งซื้อสินค้า", href: "/purchase-history", icon: Receipt, roles: MGMT },
      { title: "แจ้งเตือนสั่งซื้อซ้ำ (Reorder)", href: "/reorders", icon: AlertCircle, badge: "Low", roles: FRONT },
    ],
  },
  {
    id: "repairs",
    title: "งานซ่อม & ช่าง",
    icon: Wrench,
    subItems: [
      { title: "เปิดใบรับซ่อมด่วน", href: "/repair-intake", icon: FileText, badge: "New", roles: FRONT },
      { title: "โต๊ะช่าง & รายการดำเนินการ", href: "/technician-repairs", icon: Cpu, roles: REPAIR },
      { title: "รายการส่งซ่อมทั้งหมด", href: "/repairs", icon: Wrench, roles: REPAIR },
      { title: "นัดหมายลูกค้า", href: "/appointments", icon: CalendarCheck, roles: FRONT },
      { title: "เบิกอะไหล่ซ่อม (Parts)", href: "/spare-parts", icon: Package, roles: REPAIR },
      { title: "ตรวจเช็คก่อน/หลังซ่อม QC", href: "/repair-checklist", icon: CheckSquare, roles: REPAIR },
      { title: "เอกสารซ่อม & พิมพ์สลิป", href: "/repair-documents", icon: FileCheck, roles: REPAIR },
      { title: "เคลมประกันงานซ่อม", href: "/repair-warranty", icon: ShieldAlert, roles: REPAIR },
    ],
  },
  {
    id: "tax_accounting",
    title: "ภาษี & บัญชี",
    icon: Landmark,
    subItems: [
      { title: "ศูนย์ภาษี & ภาพรวม", href: "/tax", icon: Landmark, roles: MGMT },
      { title: "ภาษีบุคคลธรรมดา (ภ.ง.ด.)", href: "/tax/pit", icon: Calculator, roles: MGMT },
      { title: "ภาษีนิติบุคคล (ภ.ง.ด.50)", href: "/tax/cit", icon: Percent, roles: MGMT },
      { title: "ภาษีมูลค่าเพิ่ม (ภ.พ.30)", href: "/tax/vat", icon: FileSpreadsheet, roles: MGMT },
      { title: "หัก ณ ที่จ่าย (ภ.ง.ด.3/53)", href: "/tax/wht", icon: Receipt, roles: MGMT },
      { title: "ตั้งค่าภาษี & ลดหย่อน 2568", href: "/tax/settings", icon: Settings, roles: MGMT },
    ],
  },
  {
    id: "hr_expenses",
    title: "บุคลากร & ค่าใช้จ่าย",
    icon: Users,
    subItems: [
      { title: "บันทึกเวลาเข้า-ออกงาน", href: "/attendance", icon: CalendarCheck, roles: ALL },
      { title: "เงินเดือน & คอมมิชชั่น", href: "/payroll", icon: DollarSign, roles: MGMT },
      { title: "บันทึกค่าใช้จ่ายร้าน", href: "/expenses", icon: Wallet, roles: MGMT },
    ],
  },
  {
    id: "reports",
    title: "รายงาน & สถิติ",
    icon: BarChart3,
    href: "/reports",
    roles: MGMT,
  },
  {
    id: "crm_line",
    title: "CRM & LINE OA",
    icon: MessageSquare,
    subItems: [
      { title: "เชื่อมต่อ LINE OA & Flex", href: "/line-oa", icon: Send, roles: MGMT },
      { title: "แชทสดลูกค้า (Inbox)", href: "/line-chat", icon: MessageSquare, roles: FRONT },
    ],
  },
  {
    id: "settings_branch",
    title: "ตั้งค่า & สาขา",
    icon: Settings,
    subItems: [
      { title: "จัดการข้อมูลสาขา", href: "/branches", icon: GitBranch, roles: ADMIN_ONLY },
      { title: "พนักงาน & สิทธิ์เข้าถึง", href: "/users", icon: UserCheck, roles: ADMIN_ONLY },
      { title: "ฐานข้อมูลหลัก (Masters)", href: "/masters", icon: Database, roles: MGMT },
      { title: "ตั้งค่าระบบทั่วไป", href: "/settings", icon: Sliders, roles: ADMIN_ONLY },
      { title: "ปรับแต่งหน้าร้านออนไลน์", href: "/settings/storefront", icon: Palette, badge: "Theme", roles: ADMIN_ONLY },
      { title: "บันทึกความปลอดภัย (Audit)", href: "/audit-logs", icon: Shield, roles: MGMT },
    ],
  },
];

/** Menu groups visible to the given role (empty while the user is not loaded yet). */
function menuForRole(role: Role | null): MenuGroup[] {
  if (!role) return [];
  return MENU_GROUPS.flatMap((group) => {
    if (!group.subItems) return (group.roles ?? ALL).includes(role) ? [group] : [];
    const subItems = group.subItems.filter((item) => item.roles.includes(role));
    return subItems.length > 0 ? [{ ...group, subItems }] : [];
  });
}

export function Sidebar() {
  const pathname = usePathname();
  const { currentUser } = useApp();
  const visibleGroups = React.useMemo(
    () => menuForRole(currentUser.id ? currentUser.role : null),
    [currentUser.id, currentUser.role]
  );
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
    ? visibleGroups.map((group) => {
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
    : visibleGroups;

  return (
    <>
      {/* Mobile Drawer Trigger */}
      <div className="lg:hidden fixed top-3 left-4 z-50">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
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
          "fixed top-0 bottom-0 left-0 z-40 w-72 border-r border-slate-200/90 bg-white flex flex-col transition-transform duration-200 ease-out lg:translate-x-0 select-none shadow-xs",
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
              <span className="text-[11px] text-teal-600 font-semibold tracking-wide mt-0.5">MobileHub ERP</span>
            </div>
          </Link>

          <button
            type="button"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-semibold hover:bg-teal-100 transition-all cursor-pointer"
          >
            <Gift className="h-3.5 w-3.5 text-teal-600" />
            <span>ชวนเพื่อน</span>
          </button>
        </div>

        {/* Quick Menu Search Filter */}
        <div className="px-3.5 pt-3.5 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="ค้นหาเมนู (เช่น ซ่อม, POS, สต็อก)..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/90 py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Navigation Groups List */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 text-sm">
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
                    "flex items-center gap-3 rounded-xl px-3.5 py-2.5 min-h-[44px] text-[14.5px] font-semibold transition-all duration-150",
                    active
                      ? "bg-teal-50 text-teal-900 font-bold border-l-4 border-teal-600 shadow-2xs pl-3"
                      : "text-slate-700 hover:bg-slate-100/70 hover:text-slate-950 hover:translate-x-0.5"
                  )}
                >
                  <group.icon className={cn("h-[18px] w-[18px]", active ? "text-teal-600" : "text-slate-400")} />
                  <span>{group.title}</span>
                </Link>
              );
            }

            return (
              <div key={group.id} className="pt-1">
                {/* Group Accordion Header */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 min-h-[44px] text-[12px] font-bold text-slate-500 uppercase tracking-wider hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <group.icon className="h-4 w-4 text-slate-400" />
                    <span>{group.title}</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 text-slate-400 transition-transform duration-200",
                      isOpen ? "rotate-0 text-teal-600" : "-rotate-90"
                    )}
                  />
                </button>

                {/* Sub items */}
                {isOpen && (
                  <div className="ml-3 pl-3 border-l-2 border-slate-100 space-y-0.5 mt-1">
                    {group.subItems!.map((item) => {
                      const active = isItemActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "group flex items-center justify-between rounded-xl px-3 py-2.5 min-h-[44px] text-[14px] leading-snug font-medium transition-all duration-150",
                            active
                              ? "bg-teal-50 text-teal-900 font-bold border-l-4 border-teal-600 shadow-2xs pl-2.5"
                              : "text-slate-700 hover:bg-slate-100/70 hover:text-slate-950 hover:translate-x-0.5"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {item.icon && (
                              <item.icon
                                className={cn(
                                  "h-[17px] w-[17px] shrink-0 transition-colors",
                                  active ? "text-teal-600" : "text-slate-400 group-hover:text-slate-600"
                                )}
                              />
                            )}
                            <span className="truncate">{item.title}</span>
                          </div>
                          {item.badge && (
                            <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-bold text-teal-800 border border-teal-200/50">
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
