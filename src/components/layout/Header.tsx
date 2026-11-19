"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import {
  Building2,
  ChevronDown,
  Bell,
  Search,
  Check,
  PlusCircle,
  ShoppingCart,
  Wrench,
  X,
  LogOut,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export function Header() {
  const { currentBranch, setCurrentBranch, branches, currentUser, logout } =
    useApp();
  const [branchOpen, setBranchOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const roleColorMap: Record<string, "default" | "success" | "warning" | "danger" | "secondary"> = {
    ADMIN: "danger",
    MANAGER: "warning",
    TECHNICIAN: "default",
    CASHIER: "success",
  };

  const roleThaiMap: Record<string, string> = {
    ADMIN: "เจ้าของร้าน",
    MANAGER: "ผู้จัดการสาขา",
    TECHNICIAN: "ช่างเทคนิค",
    CASHIER: "พนักงานขาย",
  };

  const quickLinks = [
    { label: "เปิดใบรับซ่อม", href: "/repair-intake", icon: Wrench, color: "text-teal-600" },
    { label: "ขายหน้าร้าน", href: "/pos", icon: ShoppingCart, color: "text-emerald-600" },
    { label: "ศูนย์ภาษี 2568", href: "/tax/settings", icon: PlusCircle, color: "text-cyan-600" },
  ];

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/90 bg-white/95 px-5 backdrop-blur-md select-none">
      {/* Left side: Space for mobile menu + Quick Search */}
      <div className="flex items-center gap-3 pl-12 lg:pl-0">
        <div className="relative hidden md:block w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            placeholder="ค้นหาด่วน (ใบซ่อม, สินค้า, ลูกค้า)..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 focus:outline-none transition-all"
          />

          {/* Quick search popup suggestions */}
          {searchOpen && searchQuery && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setSearchOpen(false)} />
              <div className="absolute left-0 top-full mt-2 z-50 w-full rounded-xl border border-slate-200 bg-white p-2 shadow-xl animate-fade-in text-sm space-y-1">
                <div className="text-[11px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                  ทางลัดด่วน (Quick Links)
                </div>
                {quickLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchQuery("");
                    }}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-slate-50 text-slate-700 transition-colors"
                  >
                    <link.icon className={cn("h-4 w-4", link.color)} />
                    <span className="font-medium text-sm">{link.label}</span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right side: Quick Action Buttons, Branch Switcher, Role Simulator, Notifications */}
      <div className="flex items-center gap-3">
        {/* Quick Shortcuts */}
        <div className="hidden xl:flex items-center gap-2 mr-1">
          <Link
            href="/landing"
            target="_blank"
            className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 rounded-xl px-3 py-2 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 text-teal-600" />
            <span>หน้าเว็บลูกค้า</span>
            <ExternalLink className="h-3 w-3 text-teal-500 opacity-70" />
          </Link>
          <Link
            href="/repair-intake"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl px-3 py-2 transition-colors"
          >
            <Wrench className="h-3.5 w-3.5 text-blue-600" />
            <span>รับเครื่องซ่อม</span>
          </Link>
          <Link
            href="/pos"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl px-3 py-2 transition-colors"
          >
            <ShoppingCart className="h-3.5 w-3.5 text-emerald-600" />
            <span>ขายหน้าร้าน</span>
          </Link>
        </div>

        {/* Branch Switcher Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setBranchOpen(!branchOpen);
              setUserOpen(false);
            }}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <Building2 className="h-4 w-4 text-teal-600" />
            <span className="font-semibold text-slate-900">{currentBranch.name}</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {branchOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setBranchOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-xl animate-fade-in t-dropdown">
                <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  เลือกสาขาที่กำลังปฏิบัติงาน
                </div>
                <div className="pt-1 space-y-0.5">
                  {branches.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        setCurrentBranch(b);
                        setBranchOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left",
                        currentBranch.code === b.code
                          ? "bg-teal-50 text-teal-800 font-semibold"
                          : "text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      <div>
                        <div className="font-semibold">{b.name}</div>
                        <div className="text-xs text-slate-400 font-mono">รหัสสาขา: {b.code}</div>
                      </div>
                      {currentBranch.code === b.code && (
                        <Check className="h-4 w-4 text-teal-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Notifications Icon */}
        {/* Notifications are not implemented yet — disabled, no fake unread dot. */}
        <button
          type="button"
          disabled
          title="เร็วๆ นี้"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-2xs cursor-not-allowed opacity-60"
          aria-label="การแจ้งเตือน (เร็วๆ นี้)"
        >
          <Bell className="h-4.5 w-4.5" />
        </button>

        {/* User Role Switcher Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setUserOpen(!userOpen);
              setBranchOpen(false);
            }}
            className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-white font-bold text-sm shadow-2xs">
              {currentUser.name ? currentUser.name[0].toUpperCase() : "R"}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="font-semibold text-slate-900 leading-tight text-sm">
                {currentUser.name || "rizan"}
              </span>
              <span className="text-xs text-slate-500 leading-none mt-0.5">
                {roleThaiMap[currentUser.role] || "เจ้าของร้าน"}
              </span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 ml-0.5" />
          </button>

          {userOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setUserOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1.5 z-50 w-72 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl animate-fade-in t-dropdown">
                <div className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  บัญชีที่เข้าสู่ระบบ
                </div>
                <div className="pt-1 space-y-0.5">
                  {[currentUser].map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        setUserOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors text-left",
                        currentUser.id === u.id
                          ? "bg-teal-50 text-teal-800 font-semibold"
                          : "text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      <div>
                        <div className="font-semibold">{u.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">@{u.username} • {roleThaiMap[u.role] || u.role}</div>
                      </div>
                      <Badge variant={roleColorMap[u.role] || "default"} className="text-[9px] py-0 px-1.5">
                        {u.role}
                      </Badge>
                    </button>
                  ))}
                </div>

                <div className="p-1 border-t border-slate-100 mt-1">
                  <button
                    type="button"
                    onClick={() => { void logout().catch(() => alert("ออกจากระบบไม่สำเร็จ กรุณาลองใหม่")); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>ออกจากระบบ (Logout)</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
