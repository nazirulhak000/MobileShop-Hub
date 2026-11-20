"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Home,
  Wrench,
  CalendarDays,
  Bell,
  UserRound,
  ArrowRight,
  Store,
  LogOut,
  Check,
  Camera,
  X,
  ChevronLeft,
  ChevronRight,
  Phone,
  Clock,
  ShieldCheck,
  MapPin,
  Search,
  Receipt,
  ExternalLink,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Calendar,
  Layers,
  ChevronDown,
} from "lucide-react";
import { extractTrackingToken, TRACKING_INPUT_ERROR } from "@/components/landing/trackingToken";

const input = "mt-2 block min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-teal-700 transition-all";
const primary = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-50 transition-all shadow-xs cursor-pointer active:scale-98";
const secondary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50 transition-all shadow-2xs cursor-pointer active:scale-98";

const labels: Record<string, string> = {
  PENDING: "รับเครื่องแล้ว",
  DIAGNOSING: "กำลังตรวจอาการ",
  WAITING_PARTS: "รออะไหล่",
  REPAIRING: "กำลังซ่อม",
  QC_PASSED: "ผ่านการตรวจคุณภาพ",
  READY: "พร้อมรับเครื่อง",
  COMPLETED: "เสร็จสิ้น",
  CANCELLED: "ยกเลิกแล้ว",
  CONFIRMED: "ยืนยันนัดแล้ว",
  CHECKED_IN: "เข้ารับบริการแล้ว",
  NO_SHOW: "ไม่ได้มาตามนัด",
};

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  PENDING: { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200" },
  DIAGNOSING: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" },
  WAITING_PARTS: { bg: "bg-orange-50", text: "text-orange-800", border: "border-orange-200" },
  REPAIRING: { bg: "bg-purple-50", text: "text-purple-800", border: "border-purple-200" },
  QC_PASSED: { bg: "bg-cyan-50", text: "text-cyan-800", border: "border-cyan-200" },
  READY: { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200" },
  COMPLETED: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" },
  CANCELLED: { bg: "bg-rose-50", text: "text-rose-800", border: "border-rose-200" },
  CONFIRMED: { bg: "bg-teal-50", text: "text-teal-800", border: "border-teal-200" },
  CHECKED_IN: { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200" },
};

const quoteLabels: Record<string, string> = {
  PENDING: "รอยืนยัน",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ปฏิเสธแล้ว",
  SUPERSEDED: "มีฉบับใหม่แล้ว",
  EXPIRED: "หมดอายุ",
};

const quoteStatusText = (quote: Quote) => {
  if (quote.status === "PENDING" && new Date(quote.expiresAt) <= new Date()) return quoteLabels.EXPIRED;
  return quoteLabels[quote.status] ?? quote.status;
};

const money = (amount: number) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(amount);

const dateTime = (date: string | null | undefined) => {
  if (!date) return "-";
  const d = new Date(date);
  return Number.isNaN(d.getTime())
    ? "-"
    : d.toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" });
};

interface Branch {
  id: string;
  name: string;
  phone: string | null;
  address?: string | null;
}

interface Quote {
  id: string;
  version: number;
  description: string;
  amountSatang: number;
  status: string;
  expiresAt: string;
}

interface Repair {
  id: string;
  trackingCode: string;
  deviceBrand: string;
  deviceModel: string;
  status: string;
  estimatedFinish: string | null;
  updatedAt: string;
  totalCost: number;
  warrantyDays?: number;
  completedAt?: string | null;
  photos?: string[];
  branch: Branch;
  events: { id: string; status: string; customerMessage: string; occurredAt: string }[];
  quotes: Quote[];
}

interface Booking {
  id: string;
  bookingRef: string;
  status: string;
  deviceModel: string;
  startsAt: string;
  branchId: string;
  branch?: Branch;
}

interface PortalData {
  repairsNext: string | null;
  purchasesNext: string | null;
  account: { displayName: string; phone: string; linked: boolean };
  repairs: Repair[];
  purchases: {
    id: string;
    invoiceNo: string;
    createdAt: string;
    netAmount: number;
    status: string;
    branch: { name: string };
    items: { quantity: number; unitPrice: number; subtotal: number; product: { name: string } }[];
  }[];
  bookings: Booking[];
  notifications: { id: string; message: string; href: string; readAt: string | null; createdAt: string }[];
}

interface ShopData {
  shop: { name: string; slug: string };
  branches: Branch[];
  services: Record<string, string>;
}

async function request(url: string, body?: unknown, method = "POST") {
  const response = await fetch(
    url,
    body === undefined
      ? { cache: "no-store" }
      : { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
  );
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || "ไม่สามารถทำรายการได้") as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return data;
}

export function CustomerPortal({ shopSlug, initialTab = "home" }: { shopSlug: string; initialTab?: string }) {
  const [shop, setShop] = useState<ShopData | null>(null);
  const [data, setData] = useState<PortalData | null>(null);
  const [tab, setTab] = useState(initialTab);
  const [repairsSubTab, setRepairsSubTab] = useState<"repairs" | "purchases">("repairs");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [directTrackingCode, setDirectTrackingCode] = useState("");
  const [directTrackingError, setDirectTrackingError] = useState("");
  const [lightboxImages, setLightboxImages] = useState<string[] | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const loadVersion = useRef(0);

  async function reload() {
    const version = ++loadVersion.current;
    const response = await fetch(`/api/customer/portal?shopSlug=${encodeURIComponent(shopSlug)}`, { cache: "no-store" });
    if (response.status === 401) {
      if (version === loadVersion.current) setData(null);
      return;
    }
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    if (version === loadVersion.current) setData(result);
  }

  const authenticated = !!data;

  useEffect(() => {
    if (!authenticated || tab === "repairs") return;
    let pending = false;
    const refresh = async () => {
      if (pending || document.visibilityState !== "visible") return;
      pending = true;
      try {
        await reload();
      } catch {
        /* Keep last valid state */
      } finally {
        pending = false;
      }
    };
    const timer = setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [authenticated, shopSlug, tab]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setData(null);
    setShop(null);
    Promise.all([
      request(`/api/public/shops/${encodeURIComponent(shopSlug)}`).then((value) => {
        if (active) setShop(value);
      }),
      reload(),
    ])
      .catch((failure) => {
        if (active) setError(failure.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [shopSlug]);

  async function act(work: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await work();
      await reload();
    } catch (failure) {
      if ((failure as { status?: number })?.status === 401) {
        setData(null);
      }
      setError(failure instanceof Error ? failure.message : "เชื่อมต่อไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function more(section: "repairs" | "purchases") {
    if (!data) return;
    const cursor = section === "repairs" ? data.repairsNext : data.purchasesNext;
    if (!cursor) return;
    setBusy(true);
    setError("");
    try {
      const result = await request(
        `/api/customer/portal?shopSlug=${encodeURIComponent(shopSlug)}&section=${section}&cursor=${encodeURIComponent(cursor)}`
      );
      setData((previous) =>
        previous
          ? {
              ...previous,
              [section]: [...previous[section], ...result[section]],
              [section === "repairs" ? "repairsNext" : "purchasesNext"]:
                result[section === "repairs" ? "repairsNext" : "purchasesNext"],
            }
          : null
      );
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setBusy(false);
    }
  }

  const handleDirectTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const token = extractTrackingToken(directTrackingCode);
    if (!token) {
      setDirectTrackingError(TRACKING_INPUT_ERROR);
      return;
    }
    setDirectTrackingError("");
    window.location.href = `/track/${token}`;
  };

  const nav = [
    { key: "home", title: "หน้าหลัก", icon: Home },
    { key: "repairs", title: "งานของฉัน", icon: Wrench },
    { key: "bookings", title: "จองคิว", icon: CalendarDays },
    { key: "notifications", title: "แจ้งเตือน", icon: Bell },
    { key: "profile", title: "บัญชี", icon: UserRound },
  ];

  const primaryBranch = shop?.branches[0] || null;
  const primaryPhone = primaryBranch?.phone || null;
  const unreadCount = data?.notifications.filter((n) => !n.readAt).length || 0;
  const activeRepairsCount = data?.repairs.filter((r) => !["COMPLETED", "CANCELLED"].includes(r.status)).length || 0;
  const confirmedBookings = data?.bookings.filter((b) => b.status === "CONFIRMED") || [];
  const nextBooking = confirmedBookings.length > 0 ? confirmedBookings.sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0] : null;

  if (loading) {
    return (
      <main role="status" className="min-h-screen grid place-items-center bg-slate-50 text-slate-700">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-3 border-teal-700 border-t-transparent" />
          <p className="text-sm font-medium text-slate-600">กำลังโหลดข้อมูลศูนย์บริการ…</p>
        </div>
      </main>
    );
  }

  if (!shop) {
    return (
      <main className="max-w-lg mx-auto px-5 py-20 text-center">
        <div className="h-16 w-16 mx-auto rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-200 mb-5 shadow-xs">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">เปิดหน้าร้านไม่สำเร็จ</h1>
        <p role="alert" className="mt-3 text-sm text-slate-600 leading-relaxed">
          {error || "ไม่พบร้านค้าที่เปิดให้บริการ หรือการเชื่อมต่อเครือข่ายมีปัญหา กรุณาตรวจสอบรหัสร้านค้าอีกครั้ง"}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setError("");
              Promise.all([
                request(`/api/public/shops/${encodeURIComponent(shopSlug)}`).then((value) => setShop(value)),
                reload(),
              ])
                .catch((failure) => setError(failure.message))
                .finally(() => setLoading(false));
            }}
            className={primary}
          >
            <RefreshCw className="h-4 w-4" />
            <span>ลองใหม่อีกครั้ง</span>
          </button>
          <Link href="/landing" className={secondary}>
            กลับหน้าหลัก
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-28 md:pb-12 font-sans selection:bg-teal-700 selection:text-white overflow-x-hidden">
      {/* 1. Header (Responsive for Desktop & Mobile) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs overflow-x-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand Logo & Shop Name */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
            <Link
              href={`/s/${shopSlug}`}
              className="flex items-center gap-2 sm:gap-2.5 font-bold text-slate-900 hover:text-teal-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 rounded-lg p-1 min-w-0"
            >
              <div className="h-9 w-9 rounded-xl bg-teal-700 text-white flex items-center justify-center shadow-xs shrink-0">
                <Store className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="text-left min-w-0">
                <span className="block text-sm sm:text-base font-extrabold tracking-tight leading-tight truncate max-w-[140px] sm:max-w-[200px]">
                  {shop.shop.name}
                </span>
                <span className="block text-[10px] sm:text-[11px] font-medium text-teal-800">Customer Portal</span>
              </div>
            </Link>

            <Link
              href={`/store/${shopSlug}`}
              className="hidden lg:inline-flex min-h-8 items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200/80 shrink-0"
              title="เปิดดูหน้าร้านออนไลน์"
            >
              <span>หน้าร้าน</span>
              <ExternalLink className="h-3 w-3 text-slate-400" />
            </Link>
          </div>

          {/* Desktop Navigation Center Pills (Visible on md+) */}
          {authenticated && (
            <nav
              className="hidden md:flex items-center gap-1 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/70 shadow-inner shrink-0"
              aria-label="เมนูหลักสำหรับคอมพิวเตอร์"
            >
              {nav.map((item) => {
                const isActive = tab === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setTab(item.key)}
                    aria-current={isActive ? "page" : undefined}
                    aria-label={item.title}
                    title={item.title}
                    className={`relative min-h-10 flex items-center gap-2 px-2.5 lg:px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${
                      isActive
                        ? "bg-white text-teal-900 shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                    }`}
                  >
                    <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-teal-700" : "text-slate-500"}`} />
                    <span className="hidden lg:inline">{item.title}</span>
                    {item.key === "notifications" && unreadCount > 0 && (
                      <span className="h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
                    )}
                  </button>
                );
              })}
            </nav>
          )}

          {/* Right Action Group */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {primaryPhone && (
              <a
                href={`tel:${primaryPhone}`}
                className="hidden xl:inline-flex min-h-9 items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 transition-colors"
                title={`โทรสอบถามสาขา ${primaryPhone}`}
              >
                <Phone className="h-3.5 w-3.5 text-teal-700" />
                <span className="font-mono tabular-nums">{primaryPhone}</span>
              </a>
            )}

            {data ? (
              <button
                type="button"
                onClick={() => setTab("profile")}
                className="flex items-center gap-2.5 p-1 sm:px-3 sm:py-1.5 rounded-xl hover:bg-slate-100 text-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                aria-label="ไปยังหน้าบัญชีของฉัน"
              >
                <div className="h-8 w-8 rounded-full bg-teal-100 text-teal-900 flex items-center justify-center font-bold text-xs ring-1 ring-teal-200 shrink-0">
                  {data.account.displayName.slice(0, 1)}
                </div>
                <div className="hidden lg:block text-left">
                  <span className="block text-xs font-bold leading-tight truncate max-w-[120px]">
                    {data.account.displayName}
                  </span>
                  <span className="block text-[10px] font-mono text-slate-500">
                    {data.account.phone}
                  </span>
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setTab("home")}
                className="inline-flex min-h-9 items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-700 text-white hover:bg-teal-800 text-xs font-semibold transition-colors shadow-2xs"
              >
                <UserRound className="h-3.5 w-3.5" />
                <span>เข้าสู่ระบบ</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Error Announcement Bar */}
        {error && (
          <div
            role="alert"
            className="flex items-center justify-between gap-4 rounded-2xl bg-rose-50 border border-rose-200/90 p-4 text-xs sm:text-sm text-rose-800 shadow-xs animate-fade-in"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg border border-rose-300 bg-white hover:bg-rose-100 text-rose-800 text-xs font-semibold cursor-pointer shrink-0"
              onClick={() => {
                void act(reload);
              }}
            >
              ลองใหม่
            </button>
          </div>
        )}

        {/* 2. Authentication View (When not signed in and not explicitly on bookings) */}
        {!data && tab !== "bookings" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start py-4">
            <section className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-semibold border border-teal-200">
                <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                <span>ศูนย์บริการมาตรฐานและระบบ Live Tracking 24 ชม.</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                ดูแลงานซ่อมของคุณ <br className="hidden sm:inline" />
                <span className="text-teal-700">ได้ง่ายดายจากที่นี่</span>
              </h1>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl">
                ติดตามสถานะงานซ่อมแบบเรียลไทม์ ตรวจสอบประวัติการส่งซ่อม อนุมัติใบเสนอราคาทางออนไลน์
                และจองเวลานำเครื่องเข้ารับบริการกับ {shop.shop.name}
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  className={primary}
                  onClick={() => setTab("bookings")}
                >
                  <CalendarDays className="h-4 w-4" />
                  <span>จองคิวเข้ารับบริการ</span>
                  <ArrowRight className="h-4 w-4 ml-1" />
                </button>

                <Link
                  href={`/store/${shopSlug}`}
                  className={secondary}
                >
                  <Store className="h-4 w-4 text-slate-500" />
                  <span>ดูหน้าร้านและบริการ</span>
                </Link>
              </div>

              {/* Branch Information Bento */}
              <div className="pt-6 space-y-3">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-teal-700" />
                  <span>สาขาที่เปิดให้บริการ ({shop.branches.length} สาขา)</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {shop.branches.map((branch) => (
                    <div
                      key={branch.id}
                      className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2 hover:border-teal-300 transition-colors"
                    >
                      <div className="font-bold text-sm text-slate-900">{branch.name}</div>
                      {branch.address && (
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{branch.address}</p>
                      )}
                      {branch.phone && (
                        <a
                          href={`tel:${branch.phone}`}
                          className="inline-flex min-h-8 items-center gap-1.5 text-xs font-semibold text-teal-800 hover:text-teal-950 underline"
                        >
                          <Phone className="h-3 w-3" />
                          <span>{branch.phone}</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Login Box */}
            <div className="lg:col-span-5">
              <LoginForm shopSlug={shopSlug} onSuccess={reload} />
            </div>
          </div>
        ) : (
          <>
            {/* 3. Dashboard Tab (หน้าหลัก) */}
            {tab === "home" && data && (
              <section className="space-y-6">
                {/* Hero Greeting Card */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-teal-900/60">
                  <div className="relative z-10 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-500/30">
                          <Check className="h-3 w-3" />
                          <span>ระบบพอร์ทัลลูกค้า {shop.shop.name}</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                          สวัสดี {data.account.displayName}
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-300">
                          งานและนัดหมายของคุณกับ {shop.shop.name} พร้อมบริการตรวจสอบสถานะ 24 ชั่วโมง
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setTab("bookings")}
                          className="min-h-10 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                        >
                          <CalendarDays className="h-3.5 w-3.5" />
                          <span>จองคิวใหม่</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setTab("repairs")}
                          className="min-h-10 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
                        >
                          <Wrench className="h-3.5 w-3.5" />
                          <span>ดูงานซ่อมทั้งหมด</span>
                        </button>
                      </div>
                    </div>

                    {/* Unlinked Account Warning Card */}
                    {!data.account.linked && (
                      <div className="rounded-2xl border border-amber-400/40 bg-amber-950/40 p-4 text-xs sm:text-sm leading-relaxed text-amber-200 flex items-start gap-3 backdrop-blur-xs">
                        <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-semibold block text-amber-100">บัญชียังไม่ได้เชื่อมกับประวัติลูกค้าเดิม</strong>
                          <span>
                            หากคุณเคยมีประวัติส่งซ่อมกับร้านมาก่อน กรุณาแจ้งเบอร์โทรนี้แก่ทางร้านเพื่อตรวจหลักฐานและเปิดสิทธิ์เข้าถึงประวัติเดิม
                            คุณยังสามารถจองคิวใหม่หรือติดตามงานซ่อมผ่านรหัสใบรับเครื่องได้ตามปกติ
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Pending Quote Action Alert */}
                    {data.repairs.some((r) => r.quotes.some((q) => q.status === "PENDING" && new Date(q.expiresAt) > new Date())) && (
                      <div className="rounded-2xl border border-emerald-400/50 bg-emerald-950/60 p-4 text-xs sm:text-sm text-emerald-200 flex flex-wrap items-center justify-between gap-3 shadow-lg">
                        <div className="flex items-center gap-2.5">
                          <Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />
                          <span className="font-bold">มีใบเสนอราคาที่รอคุณยืนยันการอนุมัติ</span>
                        </div>
                        <button
                          type="button"
                          className="min-h-9 px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                          onClick={() => setTab("repairs")}
                        >
                          <span>ตรวจสอบและอนุมัติราคา</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4 Metric Cards Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div
                    onClick={() => {
                      setTab("repairs");
                      setRepairsSubTab("repairs");
                    }}
                    className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-teal-400 hover:shadow-xs transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-500">งานซ่อมกำลังดำเนินการ</span>
                      <div className="h-8 w-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Wrench className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
                      {activeRepairsCount}
                    </div>
                    <p className="text-[11px] text-teal-800 font-medium mt-1 flex items-center gap-1">
                      <span>ตรวจสอบสถานะ</span>
                      <ArrowRight className="h-3 w-3" />
                    </p>
                  </div>

                  <div
                    onClick={() => setTab("bookings")}
                    className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-teal-400 hover:shadow-xs transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-500">นัดหมายที่ยืนยันแล้ว</span>
                      <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <CalendarDays className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
                      {confirmedBookings.length}
                    </div>
                    <p className="text-[11px] text-blue-800 font-medium mt-1 flex items-center gap-1">
                      <span>ดูตารางนัด</span>
                      <ArrowRight className="h-3 w-3" />
                    </p>
                  </div>

                  <div
                    onClick={() => {
                      setTab("repairs");
                      setRepairsSubTab("purchases");
                    }}
                    className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-teal-400 hover:shadow-xs transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-500">ประวัติการซื้อสินค้า</span>
                      <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Receipt className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
                      {data.purchases.length}
                    </div>
                    <p className="text-[11px] text-purple-800 font-medium mt-1 flex items-center gap-1">
                      <span>ดูใบเสร็จรับเงิน</span>
                      <ArrowRight className="h-3 w-3" />
                    </p>
                  </div>

                  <div
                    onClick={() => setTab("notifications")}
                    className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-teal-400 hover:shadow-xs transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-500">การแจ้งเตือนใหม่</span>
                      <div className="h-8 w-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Bell className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
                      {unreadCount}
                    </div>
                    <p className="text-[11px] text-rose-800 font-medium mt-1 flex items-center gap-1">
                      <span>เปิดดูแจ้งเตือน</span>
                      <ArrowRight className="h-3 w-3" />
                    </p>
                  </div>
                </div>

                {/* Direct QR Tracking Box */}
                <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Search className="h-4 w-4 text-teal-700" />
                      <span>ค้นหาสถานะงานซ่อมด้วยลิงก์ใบรับเครื่อง (Live Tracking)</span>
                    </span>
                    <span className="text-xs text-slate-400 hidden sm:inline">สแกน QR หรือวางลิงก์จากใบรับเครื่อง</span>
                  </div>

                  <form onSubmit={handleDirectTrackSubmit} className="space-y-2">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="วางลิงก์ติดตามงานซ่อมจากใบรับเครื่อง เช่น https://…/track/…"
                        value={directTrackingCode}
                        onChange={(e) => {
                          setDirectTrackingCode(e.target.value);
                          if (directTrackingError) setDirectTrackingError("");
                        }}
                        className={`flex-1 min-h-11 px-3.5 py-2 text-xs font-mono rounded-xl border bg-slate-50 focus:bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700 ${
                          directTrackingError ? "border-rose-400" : "border-slate-300"
                        }`}
                      />
                      <button
                        type="submit"
                        className="min-h-11 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shrink-0"
                      >
                        <Search className="h-3.5 w-3.5" />
                        <span>ค้นหา</span>
                      </button>
                    </div>

                    {directTrackingError && (
                      <p className="text-xs text-rose-600 font-medium flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>{directTrackingError}</span>
                      </p>
                    )}
                  </form>
                </div>

                {/* 2-Column: Recent Repairs & Next Booking */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent Repairs Column */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-teal-700" />
                        <span>งานซ่อมล่าสุด</span>
                      </h2>
                      {data.repairs.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setTab("repairs");
                            setRepairsSubTab("repairs");
                          }}
                          className="text-xs font-semibold text-teal-800 hover:text-teal-950 underline"
                        >
                          ดูทั้งหมด ({data.repairs.length})
                        </button>
                      )}
                    </div>

                    {data.repairs.length > 0 ? (
                      <div className="space-y-3">
                        {data.repairs.slice(0, 3).map((repair) => {
                          const color = statusColors[repair.status] || { bg: "bg-slate-50", text: "text-slate-800", border: "border-slate-200" };
                          return (
                            <button
                              key={repair.id}
                              type="button"
                              onClick={() => {
                                setTab("repairs");
                                setRepairsSubTab("repairs");
                              }}
                              className="w-full text-left p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-teal-400 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between gap-4 cursor-pointer"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 text-sm">
                                    {repair.deviceBrand} {repair.deviceModel}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${color.bg} ${color.text} ${color.border}`}>
                                    {labels[repair.status] ?? repair.status}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 font-mono">
                                  {repair.trackingCode} · {repair.branch.name}
                                </p>
                              </div>
                              <ArrowRight className="h-4 w-4 text-teal-700 shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-8 rounded-2xl bg-white border border-slate-200/90 text-center space-y-3 shadow-2xs">
                        <div className="h-12 w-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto border border-teal-100">
                          <Wrench className="h-6 w-6" />
                        </div>
                        <h3 className="font-bold text-slate-800 text-sm">ยังไม่มีประวัติงานซ่อมที่เชื่อมกับบัญชีนี้</h3>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                          หากส่งเครื่องซ่อมไว้แล้ว แจ้งเบอร์โทรของคุณแก่พนักงาน หรือจองคิวนำเครื่องเข้าตรวจเช็กได้ล่วงหน้า
                        </p>
                        <div className="pt-1 flex flex-wrap justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setTab("bookings")}
                            className="min-h-9 px-3.5 py-1.5 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 transition-colors"
                          >
                            จองคิวตรวจเช็ก
                          </button>
                          <Link
                            href={`/store/${shopSlug}`}
                            className="min-h-9 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-medium hover:bg-slate-100 transition-colors"
                          >
                            ดูสาขาและบริการ
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Next Booking Column */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-teal-700" />
                        <span>นัดหมายถัดไป</span>
                      </h2>
                      <button
                        type="button"
                        onClick={() => setTab("bookings")}
                        className="text-xs font-semibold text-teal-800 hover:text-teal-950 underline"
                      >
                        จัดการนัดหมาย
                      </button>
                    </div>

                    {nextBooking ? (
                      <div className="p-5 rounded-2xl bg-white border border-teal-200 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                            {labels[nextBooking.status] ?? nextBooking.status}
                          </span>
                          <span className="text-xs font-mono text-slate-400 font-medium">
                            {nextBooking.bookingRef}
                          </span>
                        </div>

                        <div>
                          <div className="text-lg font-black text-teal-950">
                            {dateTime(nextBooking.startsAt)}
                          </div>
                          <p className="text-xs text-slate-600 mt-1">
                            {nextBooking.branch?.name} · {nextBooking.deviceModel}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-xs text-slate-400">กรุณามาก่อนเวลานัด 5-10 นาที</span>
                          <button
                            type="button"
                            onClick={() => setTab("bookings")}
                            className="min-h-8 px-3 rounded-lg bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 transition-colors"
                          >
                            รายละเอียด
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 rounded-2xl bg-white border border-slate-200/90 text-center space-y-3 shadow-2xs">
                        <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mx-auto border border-blue-100">
                          <Calendar className="h-6 w-6" />
                        </div>
                        <h3 className="font-bold text-slate-800 text-sm">ยังไม่มีนัดหมายเร็ว ๆ นี้</h3>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                          เลือกวันและเวลาที่สะดวกนำเครื่องเข้ารับการตรวจเช็ก เพื่อรับบริการที่รวดเร็วโดยไม่ต้องรอคิวนาน
                        </p>
                        <button
                          type="button"
                          className={primary + " mt-1"}
                          onClick={() => setTab("bookings")}
                        >
                          จองคิวใหม่
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Action Bento Grid */}
                <div className="pt-4 space-y-3">
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    บริการเสริมและข้อมูลศูนย์บริการ
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div
                      onClick={() => setTab("bookings")}
                      className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-teal-400 transition-colors cursor-pointer space-y-1.5"
                    >
                      <CalendarDays className="h-5 w-5 text-teal-700" />
                      <div className="font-bold text-xs text-slate-900">จองคิวนำเครื่องเข้าซ่อม</div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">เลือกช่างและเวลาที่สะดวก ไม่ต้องรอคิวหน้าร้าน</p>
                    </div>

                    <Link
                      href={`/store/${shopSlug}#location`}
                      className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-teal-400 transition-colors space-y-1.5"
                    >
                      <MapPin className="h-5 w-5 text-blue-700" />
                      <div className="font-bold text-xs text-slate-900">แผนที่และการเดินทาง</div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">ดูตำแหน่งสาขา นำทางผ่าน Google Maps</p>
                    </Link>

                    <Link
                      href={`/store/${shopSlug}#inspection`}
                      className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-teal-400 transition-colors space-y-1.5"
                    >
                      <ShieldCheck className="h-5 w-5 text-emerald-700" />
                      <div className="font-bold text-xs text-slate-900">นโยบายการรับประกัน 90-180 วัน</div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">ตรวจเช็กมาตรฐานแล็บ 10 จุด มั่นใจอะไหล่ มอก.</p>
                    </Link>
                  </div>
                </div>
              </section>
            )}

            {/* 4. Repairs & Purchases Tab (งานของฉัน) */}
            {tab === "repairs" && data && (
              <section className="space-y-6">
                {/* Header & Segmented Switcher */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
                  <div>
                    <h1 className="text-2xl font-extrabold text-slate-900">งานและประวัติของฉัน</h1>
                    <p className="text-xs text-slate-500 mt-1">
                      ประวัติการส่งซ่อม อนุมัติใบเสนอราคา และประวัติการซื้อสินค้ากับ {shop.shop.name}
                    </p>
                  </div>

                  {/* Sub-segmented Switcher */}
                  <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setRepairsSubTab("repairs")}
                      className={`flex-1 sm:flex-initial min-h-9 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        repairsSubTab === "repairs"
                          ? "bg-white text-teal-900 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      งานซ่อม ({data.repairs.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRepairsSubTab("purchases")}
                      className={`flex-1 sm:flex-initial min-h-9 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        repairsSubTab === "purchases"
                          ? "bg-white text-teal-900 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      ประวัติซื้อ ({data.purchases.length})
                    </button>
                  </div>
                </div>

                {/* Sub Tab: Repairs */}
                {repairsSubTab === "repairs" && (
                  <div className="space-y-4">
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-teal-700" />
                      <span>งานซ่อม</span>
                    </h2>

                    {!data.repairs.length && <Empty text="ยังไม่มีงานซ่อมที่เชื่อมกับบัญชีนี้" />}

                    <div className="space-y-4">
                      {data.repairs.map((repair) => {
                        const color = statusColors[repair.status] || { bg: "bg-slate-50", text: "text-slate-800", border: "border-slate-200" };
                        return (
                          <details
                            key={repair.id}
                            className="border border-slate-200 rounded-2xl bg-white p-5 shadow-2xs hover:border-teal-300 transition-all group"
                          >
                            <summary className="cursor-pointer rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700 list-none select-none">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2.5">
                                    <span className="font-bold text-base text-slate-900">
                                      {repair.deviceBrand} {repair.deviceModel}
                                    </span>
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${color.bg} ${color.text} ${color.border}`}>
                                      {labels[repair.status] ?? repair.status}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 font-mono break-all">
                                    {repair.trackingCode} · {repair.branch.name}
                                  </p>
                                </div>

                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-bold text-slate-900 tabular-nums">
                                    {money(repair.totalCost)}
                                  </span>
                                  <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-open:rotate-180 transition-transform">
                                    <ChevronDown className="h-4 w-4" />
                                  </div>
                                </div>
                              </div>
                            </summary>

                            {/* Details Expanded Content */}
                            <div className="mt-5 pt-5 border-t border-slate-100 space-y-5 pl-1 sm:pl-2">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                  <span className="text-slate-500 block">อัปเดตสถานะล่าสุด</span>
                                  <span className="font-semibold text-slate-800 block mt-0.5">{dateTime(repair.updatedAt)}</span>
                                </div>

                                {repair.estimatedFinish && (
                                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                    <span className="text-slate-500 block">กำหนดเสร็จโดยประมาณ</span>
                                    <span className="font-semibold text-slate-800 block mt-0.5">{dateTime(repair.estimatedFinish)}</span>
                                  </div>
                                )}
                              </div>

                              {repair.status === "COMPLETED" && (
                                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-medium flex items-center gap-2">
                                  <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0" />
                                  <span>
                                    รับประกันงานซ่อม {repair.warrantyDays ?? 90} วัน
                                    {repair.completedAt && ` (ส่งมอบเครื่องเมื่อ ${dateTime(repair.completedAt)})`}
                                  </span>
                                </div>
                              )}

                              <p className="text-xs font-semibold text-slate-700">
                                ยอดค่าบริการรวม: <span className="text-base text-teal-800 font-bold ml-1">{money(repair.totalCost)}</span>
                              </p>

                              {/* Repair Photos */}
                              {repair.photos && repair.photos.length > 0 && (
                                <div className="space-y-2 pt-1">
                                  <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                                    <Camera className="h-3.5 w-3.5 text-teal-700" />
                                    <span>ภาพถ่ายการตรวจซ่อม ({repair.photos.length} ภาพ)</span>
                                  </p>
                                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                    {repair.photos.map((src, idx) => (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                          setLightboxImages(repair.photos!);
                                          setLightboxIndex(idx);
                                        }}
                                        className="group relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 hover:ring-2 hover:ring-teal-600 transition-all cursor-pointer"
                                      >
                                        <img
                                          src={src}
                                          alt={`ภาพงานซ่อม ${idx + 1}`}
                                          className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                                          onError={(e) => {
                                            (e.currentTarget as HTMLElement).style.display = "none";
                                          }}
                                        />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Timeline Events */}
                              <div className="space-y-2">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                                  บันทึกประวัติความคืบหน้า
                                </span>
                                {repair.events.length > 0 ? (
                                  <ol className="space-y-3 relative border-l border-slate-200 ml-2 pl-4">
                                    {repair.events.map((event) => (
                                      <li key={event.id} className="text-xs relative">
                                        <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-teal-600 ring-4 ring-white" />
                                        <p className="font-bold text-slate-800">{labels[event.status] ?? event.status}</p>
                                        <p className="text-slate-500 mt-0.5">
                                          {event.customerMessage} · {dateTime(event.occurredAt)}
                                        </p>
                                      </li>
                                    ))}
                                  </ol>
                                ) : (
                                  <p className="text-xs text-slate-500">
                                    ประวัติก่อนเริ่มใช้ระบบนี้ไม่มีเวลาเหตุการณ์ แสดงสถานะล่าสุดด้านบน
                                  </p>
                                )}
                              </div>

                              {/* Repair Quotes */}
                              {repair.quotes.map((quote) => (
                                <div
                                  key={quote.id}
                                  className="rounded-2xl border border-teal-200 bg-teal-50/40 p-4 space-y-2.5"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <h3 className="font-bold text-sm text-teal-950">
                                      ใบเสนอราคาฉบับ {quote.version} · {money(quote.amountSatang / 100)}
                                    </h3>
                                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white text-teal-800 border border-teal-200">
                                      {quoteStatusText(quote)}
                                    </span>
                                  </div>

                                  <p className="whitespace-pre-wrap text-xs text-slate-700 leading-relaxed">
                                    {quote.description}
                                  </p>

                                  <p className="text-[11px] text-slate-500">
                                    ใช้ได้ถึง {dateTime(quote.expiresAt)}
                                  </p>

                                  {quote.status === "PENDING" && new Date(quote.expiresAt) > new Date() && (
                                    <div className="mt-3 flex flex-wrap gap-2.5 pt-1">
                                      <button
                                        type="button"
                                        disabled={busy}
                                        className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white hover:bg-teal-800 disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
                                        onClick={() => {
                                          if (
                                            window.confirm(
                                              `ยืนยันการอนุมัติใบเสนอราคาฉบับ ${quote.version} ยอด ${money(quote.amountSatang / 100)}? ทางร้านจะเริ่มซ่อมทันที`
                                            )
                                          )
                                            void act(() =>
                                              request("/api/customer/quotes", {
                                                shopSlug,
                                                quoteId: quote.id,
                                                version: quote.version,
                                                action: "APPROVED",
                                              })
                                            );
                                        }}
                                      >
                                        <Check className="h-4 w-4" />
                                        <span>อนุมัติราคา</span>
                                      </button>
                                      <button
                                        type="button"
                                        disabled={busy}
                                        className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 transition-colors cursor-pointer"
                                        onClick={() => {
                                          if (
                                            window.confirm(
                                              `ยืนยันการปฏิเสธใบเสนอราคาฉบับ ${quote.version}? ทางร้านจะประสานงานเรื่องการรับเครื่องคืน`
                                            )
                                          )
                                            void act(() =>
                                              request("/api/customer/quotes", {
                                                shopSlug,
                                                quoteId: quote.id,
                                                version: quote.version,
                                                action: "REJECTED",
                                              })
                                            );
                                        }}
                                      >
                                        <X className="h-4 w-4" />
                                        <span>ปฏิเสธราคา</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </details>
                        );
                      })}
                    </div>

                    {data.repairsNext && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          void more("repairs");
                        }}
                        className={secondary + " mt-4 block"}
                      >
                        โหลดงานซ่อมเพิ่มเติม
                      </button>
                    )}
                  </div>
                )}

                {/* Sub Tab: Purchases */}
                {repairsSubTab === "purchases" && (
                  <div className="space-y-4">
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-purple-700" />
                      <span>ประวัติซื้อ</span>
                    </h2>

                    {!data.purchases.length && <Empty text="ยังไม่มีประวัติซื้อที่เชื่อมกับบัญชีนี้" />}

                    <div className="space-y-3">
                      {data.purchases.map((purchase) => (
                        <details
                          key={purchase.id}
                          className="border border-slate-200 rounded-2xl bg-white p-5 shadow-2xs hover:border-purple-300 transition-all group"
                        >
                          <summary className="cursor-pointer list-none select-none">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-slate-900 font-mono">
                                    {purchase.invoiceNo}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                      purchase.status === "VOID"
                                        ? "bg-rose-50 text-rose-800 border-rose-200"
                                        : "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    }`}
                                  >
                                    {purchase.status === "VOID" ? "ยกเลิกบิล" : "ชำระแล้ว"}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500">
                                  {purchase.branch.name} · {dateTime(purchase.createdAt)}
                                </p>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="text-base font-bold text-slate-900 tabular-nums">
                                  {money(purchase.netAmount)}
                                </span>
                                <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-open:rotate-180 transition-transform">
                                  <ChevronDown className="h-4 w-4" />
                                </div>
                              </div>
                            </div>
                          </summary>

                          <div className="mt-4 pt-4 border-t border-slate-100">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                              รายการสินค้าและบริการ
                            </span>
                            <ul className="divide-y divide-slate-100 text-xs">
                              {purchase.items.map((item, index) => (
                                <li key={index} className="py-2.5 flex justify-between gap-4">
                                  <div>
                                    <span className="font-medium text-slate-800">{item.product.name}</span>
                                    <span className="text-slate-400 block text-[11px]">
                                      {money(item.unitPrice)} × {item.quantity}
                                    </span>
                                  </div>
                                  <span className="font-bold text-slate-900 tabular-nums">{money(item.subtotal)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </details>
                      ))}
                    </div>

                    {data.purchasesNext && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          void more("purchases");
                        }}
                        className={secondary + " mt-4 block"}
                      >
                        โหลดประวัติซื้อเพิ่มเติม
                      </button>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    void act(reload);
                  }}
                  className={secondary + " mt-6"}
                >
                  <RefreshCw className="h-4 w-4 text-slate-500" />
                  <span>ตรวจข้อมูลล่าสุด</span>
                </button>
              </section>
            )}

            {/* 5. Bookings Tab (จองคิว) */}
            {tab === "bookings" && (
              <section className="space-y-6">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900">จองคิวเข้ารับบริการ</h1>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    เป็นเวลานำเครื่องเข้าตรวจ ระยะเวลาซ่อมขึ้นอยู่กับอาการและอะไหล่ · เวลาประเทศไทย
                  </p>
                </div>

                <div className="p-4 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-2xs overflow-hidden">
                  <BookingForm
                    shop={shop}
                    signedIn={!!data}
                    shopSlug={shopSlug}
                    onLogin={reload}
                    onSuccess={reload}
                  />
                </div>

                {data && (
                  <div className="pt-6 space-y-4">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <CalendarDays className="h-5 w-5 text-teal-700" />
                      <span>นัดหมายของฉัน</span>
                    </h2>

                    {!data.bookings.length && <Empty text="ยังไม่มีนัดหมาย" />}

                    <div className="space-y-3">
                      {data.bookings.map((booking) => (
                        <BookingItem
                          key={booking.id}
                          booking={booking}
                          shopSlug={shopSlug}
                          busy={busy}
                          act={act}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* 6. Notifications Tab (แจ้งเตือน) */}
            {tab === "notifications" && data && (
              <section className="space-y-6">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900">แจ้งเตือน</h1>
                  <p className="text-xs text-slate-500 mt-1">
                    การแจ้งเตือนสถานะงานซ่อม ใบเสนอราคา และการนัดหมายทั้งหมด
                  </p>
                </div>

                {!data.notifications.length && <Empty text="ยังไม่มีการแจ้งเตือน" />}

                <div className="space-y-2">
                  {data.notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => {
                        void act(() =>
                          request("/api/customer/portal", { shopSlug, notificationId: notification.id }, "PATCH")
                        );
                        setTab(notification.href === "repairs" ? "repairs" : "bookings");
                      }}
                      className={`flex w-full items-start gap-3 p-4 rounded-2xl border text-left transition-colors cursor-pointer ${
                        notification.readAt
                          ? "bg-white border-slate-200/80 hover:bg-slate-50"
                          : "bg-teal-50/70 border-teal-200 hover:bg-teal-100/70"
                      }`}
                    >
                      <Bell
                        className={`mt-0.5 h-5 w-5 shrink-0 ${
                          notification.readAt ? "text-slate-400" : "text-teal-700 font-bold"
                        }`}
                      />
                      <div className="space-y-1">
                        <span className={`block text-xs sm:text-sm ${notification.readAt ? "text-slate-700" : "font-bold text-slate-900"}`}>
                          {notification.message}
                        </span>
                        <span className="block text-[11px] text-slate-500">
                          {dateTime(notification.createdAt)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* 7. Profile Tab (บัญชี) */}
            {tab === "profile" && data && (
              <section className="max-w-xl space-y-6">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900">บัญชีของฉัน</h1>
                  <p className="mt-1 text-xs text-slate-500">บัญชีสำหรับศูนย์บริการร้าน {shop.shop.name}</p>
                </div>

                <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-6">
                  <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
                    <div className="h-16 w-16 rounded-2xl bg-teal-700 text-white flex items-center justify-center font-black text-2xl shadow-xs">
                      {data.account.displayName.slice(0, 1)}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-900">{data.account.displayName}</h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{data.account.phone}</p>
                      <span
                        className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          data.account.linked
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-amber-50 text-amber-800 border-amber-200"
                        }`}
                      >
                        <ShieldCheck className="h-3 w-3" />
                        <span>{data.account.linked ? "เชื่อมข้อมูลลูกค้าแล้ว" : "รอร้านตรวจหลักฐาน"}</span>
                      </span>
                    </div>
                  </div>

                  <form
                    className="space-y-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const form = new FormData(event.currentTarget);
                      void act(() =>
                        request("/api/customer/portal", { shopSlug, displayName: form.get("displayName") }, "PATCH")
                      );
                    }}
                  >
                    <label className="block text-xs font-semibold text-slate-700">
                      ชื่อที่แสดง
                      <input
                        className={input}
                        name="displayName"
                        defaultValue={data.account.displayName}
                        required
                        minLength={2}
                        maxLength={100}
                      />
                    </label>

                    <div className="space-y-1 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      <p>เบอร์โทรศัพท์ที่ยืนยันแล้ว: <strong className="font-mono text-slate-900">{data.account.phone}</strong></p>
                      <p className="text-[11px] text-slate-500">
                        {data.account.linked
                          ? "บัญชีนี้เชื่อมต่อกับประวัติการซื้อ-ซ่อมเดิมเรียบร้อยแล้ว"
                          : "รอร้านตรวจหลักฐานเพื่อเชื่อมประวัติเก่า คุณยังจองคิวใหม่ได้ตามปกติ"}
                      </p>
                    </div>

                    <button disabled={busy} type="submit" className={primary}>
                      <span>บันทึกชื่อ</span>
                    </button>
                  </form>

                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      การจัดการเซสชัน
                    </span>
                    <div className="flex flex-wrap gap-2.5">
                      {[false, true].map((all) => (
                        <button
                          key={String(all)}
                          type="button"
                          className={secondary}
                          disabled={busy}
                          onClick={() => {
                            void act(async () => {
                              await request("/api/customer/auth/logout", { shopSlug, all });
                              setData(null);
                              setTab("home");
                            });
                          }}
                        >
                          <LogOut className="h-3.5 w-3.5 text-slate-500" />
                          <span>{all ? "ออกจากระบบทุกอุปกรณ์" : "ออกจากระบบ"}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-slate-500">
                  หากเปลี่ยนเบอร์หรือเข้าใช้เบอร์เดิมไม่ได้ กรุณาติดต่อทางร้านเพื่อตรวจหลักฐานความเป็นเจ้าของเครื่องก่อนเปลี่ยนสิทธิ์การเข้าถึงข้อมูล
                </p>
              </section>
            )}
          </>
        )}
      </main>

      {/* 8. Mobile Fixed Bottom Navigation Bar (Hidden on desktop md+) */}
      {(data || tab === "bookings") && (
        <nav
          aria-label="เมนูลูกค้า"
          className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/90 bg-white/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] shadow-lg"
        >
          <div className="grid grid-cols-5 h-16 items-center">
            {nav.map((item) => {
              const isActive = tab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key)}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700 ${
                    isActive ? "text-teal-800 font-bold" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <div className="relative">
                    <item.icon className={`h-5 w-5 ${isActive ? "text-teal-700" : "text-slate-500"}`} />
                    {item.key === "notifications" && unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-rose-500" />
                    )}
                  </div>
                  <span>{item.title}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* 9. Lightbox Modal */}
      {lightboxImages && lightboxImages[lightboxIndex] && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setLightboxImages(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setLightboxImages(null);
            if (e.key === "ArrowLeft" && lightboxIndex > 0) setLightboxIndex(lightboxIndex - 1);
            if (e.key === "ArrowRight" && lightboxIndex < (lightboxImages?.length || 0) - 1)
              setLightboxIndex(lightboxIndex + 1);
          }}
          tabIndex={0}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-full flex items-center justify-between text-white pb-3 px-1">
              <span className="text-xs font-mono font-medium">
                รูปที่ {lightboxIndex + 1} จาก {lightboxImages.length}
              </span>
              <button
                type="button"
                onClick={() => setLightboxImages(null)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                aria-label="ปิดรูปภาพ"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative overflow-hidden rounded-2xl bg-black max-h-[75vh] flex items-center justify-center">
              <img
                src={lightboxImages[lightboxIndex]}
                alt={`ภาพงานซ่อมขยาย ${lightboxIndex + 1}`}
                className="max-h-[75vh] max-w-full object-contain select-none"
              />
              {lightboxIndex > 0 && (
                <button
                  type="button"
                  onClick={() => setLightboxIndex(lightboxIndex - 1)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all cursor-pointer"
                  aria-label="รูปก่อนหน้า"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              {lightboxIndex < lightboxImages.length - 1 && (
                <button
                  type="button"
                  onClick={() => setLightboxIndex(lightboxIndex + 1)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all cursor-pointer"
                  aria-label="รูปถัดไป"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="py-12 px-4 rounded-2xl bg-white border border-slate-200/80 text-center space-y-2 shadow-2xs">
      <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
        <Layers className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium text-slate-600">{text}</p>
    </div>
  );
}

function LoginForm({ shopSlug, onSuccess }: { shopSlug: string; onSuccess: () => Promise<void> }) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [proof, setProof] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">เข้าสู่ระบบบัญชีลูกค้า</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          ยืนยันตัวตนด้วยเบอร์โทรศัพท์และเลขท้าย 4 ตัว เพื่อดูประวัติงานซ่อมและใบเสนอราคา
        </p>
      </div>

      <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200/80 text-xs text-teal-900 space-y-1">
        <p className="font-semibold flex items-center gap-1.5">
          <span>⚡</span> เข้าใช้งานด่วนฟรี ไม่ต้องรอรหัส SMS
        </p>
        <p className="text-teal-700 leading-relaxed">
          ใช้เลขท้าย 4 ตัวของ IMEI หรือเลขที่ใบรับซ่อม (เช่น 1234 หรือ 0001) ที่ระบุในใบรับเครื่องเพื่อยืนยันตัวตนทันที
        </p>
      </div>

      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          try {
            await request("/api/customer/auth/verify-code", {
              shopSlug,
              phone,
              ticketProof: proof,
              code: proof,
              displayName: name,
            });
            await onSuccess();
          } catch (failure) {
            setError(failure instanceof Error ? failure.message : "เข้าสู่ระบบไม่สำเร็จ");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="block text-xs font-semibold text-slate-700">
          ชื่อของคุณ
          <input
            className={input}
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            maxLength={100}
            placeholder="เช่น คุณสมชาย"
          />
        </label>

        <label className="block text-xs font-semibold text-slate-700">
          เบอร์โทรศัพท์ (ที่แจ้งไว้กับร้าน)
          <input
            className={input}
            autoComplete="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            maxLength={20}
            placeholder="08XXXXXXXX"
          />
        </label>

        <label className="block text-xs font-semibold text-slate-700">
          เลขท้าย 4 ตัวของ IMEI หรือเลขที่ใบรับซ่อม
          <input
            className={input}
            value={proof}
            onChange={(e) => setProof(e.target.value)}
            required
            minLength={4}
            maxLength={30}
            placeholder="เช่น 1234 หรือ 0001"
          />
          <span className="block mt-1 text-[11px] font-normal text-slate-500">
            ดูได้จากใบรับเครื่อง หรือหลังตัวเครื่อง (ลูกค้าใหม่สามารถกำหนดรหัส 4 หลักเพื่อเริ่มต้นใช้งาน)
          </span>
        </label>

        {error && (
          <p role="alert" className="text-xs font-medium text-rose-700 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
            {error}
          </p>
        )}

        <button disabled={busy} type="submit" className={primary + " w-full mt-2"}>
          {busy ? "กำลังตรวจสอบข้อมูล…" : "เข้าสู่ระบบเพื่อดูงานซ่อม"}
        </button>

        <div className="pt-2 border-t border-slate-100 text-center">
          <Link
            href="/track"
            className="text-xs font-semibold text-teal-700 hover:text-teal-900 inline-flex items-center gap-1"
          >
            <span>🔍</span> มีใบรับเครื่อง? สแกน QR หรือใส่รหัสติดตามฉบับเดียว ไม่ต้องล็อกอิน →
          </Link>
        </div>
      </form>
    </div>
  );
}

function BookingForm({
  shop,
  signedIn,
  shopSlug,
  onLogin,
  onSuccess,
}: {
  shop: ShopData;
  signedIn: boolean;
  shopSlug: string;
  onLogin: () => Promise<void>;
  onSuccess: () => Promise<void>;
}) {
  const [step, setStep] = useState(1);
  const [branchId, setBranch] = useState("");
  const [service, setService] = useState("DIAGNOSIS");
  const [deviceModel, setModel] = useState("");
  const [issueDescription, setIssue] = useState("");
  const [date, setDate] = useState("");
  const [startsAt, setStart] = useState("");
  const [slots, setSlots] = useState<{ startsAt: string; remaining: number }[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState("");
  const [success, setSuccess] = useState("");
  const firstDay = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);

  useEffect(() => {
    if (!branchId || !date) return;
    const abort = new AbortController();
    setStart("");
    setError("");
    setSlots([]);
    setBusy(true);
    fetch(`/api/public/shops/${encodeURIComponent(shopSlug)}?branchId=${encodeURIComponent(branchId)}&date=${date}`, {
      cache: "no-store",
      signal: abort.signal,
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setSlots(result.slots);
      })
      .catch((failure) => {
        if (failure.name !== "AbortError") setError(failure.message);
      })
      .finally(() => {
        if (!abort.signal.aborted) setBusy(false);
      });
    return () => abort.abort();
  }, [branchId, date, shopSlug]);

  if (success) {
    return (
      <div role="status" className="p-4 sm:p-8 rounded-2xl bg-teal-50 border border-teal-200 text-center space-y-4 overflow-hidden">
        <div className="h-14 w-14 rounded-full bg-teal-700 text-white flex items-center justify-center mx-auto shadow-xs">
          <Check className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-teal-950">จองคิวเรียบร้อยแล้ว</h2>
          <p className="text-xs sm:text-sm text-teal-900 font-mono font-medium break-all">
            รหัสอ้างอิง: <strong className="text-teal-950">{success}</strong> <span className="inline-block">· {dateTime(startsAt)}</span>
          </p>
        </div>
        <p className="text-xs text-teal-800 max-w-md mx-auto leading-relaxed">
          ระบบได้บันทึกเวลานัดหมายของคุณเรียบร้อยแล้ว กรุณานำเครื่องเข้ารับการตรวจเช็กตามวันและเวลาดังกล่าว
        </p>
        <button
          type="button"
          className={secondary}
          onClick={() => {
            setSuccess("");
            setStep(1);
            setKey("");
          }}
        >
          จองคิวใหม่
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Visual Stepper */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-teal-800">
          <span>
            ขั้นตอน {step} จาก 5 ·{" "}
            {step === 1
              ? "เลือกสาขา"
              : step === 2
              ? "ระบุบริการ"
              : step === 3
              ? "เลือกวันและเวลา"
              : step === 4
              ? "ตรวจข้อมูลและยืนยันตัวตน"
              : "ยืนยันการจอง"}
          </span>
          <span className="font-mono">{step * 20}%</span>
        </div>
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-700 rounded-full transition-all duration-300"
            style={{ width: `${step * 20}%` }}
          />
        </div>
      </div>

      <form
        className="space-y-5"
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          if (step < 5) {
            if (step === 4 && !signedIn) return;
            setStep(step + 1);
            return;
          }
          setBusy(true);
          try {
            const idempotency = key || crypto.randomUUID();
            setKey(idempotency);
            const result = await request("/api/customer/bookings", {
              shopSlug,
              action: "create",
              key: idempotency,
              branchId,
              startsAt,
              service,
              deviceModel,
              issueDescription,
            });
            setSuccess(result.booking.bookingRef);
            await onSuccess();
          } catch (failure) {
            setError(failure instanceof Error ? failure.message : "จองไม่สำเร็จ");
          } finally {
            setBusy(false);
          }
        }}
      >
        {step === 1 && (
          <label className="block text-xs font-semibold text-slate-700">
            สาขา
            <select
              className={input}
              required
              value={branchId}
              onChange={(e) => {
                setBranch(e.target.value);
                setKey("");
              }}
            >
              <option value="">เลือกสาขา</option>
              {shop.branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {step === 2 && (
          <>
            <label className="block text-xs font-semibold text-slate-700">
              บริการ
              <select
                className={input}
                value={service}
                onChange={(e) => {
                  setService(e.target.value);
                  setKey("");
                }}
              >
                {Object.entries(shop.services).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-semibold text-slate-700">
              ยี่ห้อ / รุ่นเครื่อง
              <input
                required
                maxLength={100}
                className={input}
                value={deviceModel}
                onChange={(e) => {
                  setModel(e.target.value);
                  setKey("");
                }}
                placeholder="เช่น iPhone 14"
              />
            </label>

            <label className="block text-xs font-semibold text-slate-700">
              อาการที่ต้องการให้ตรวจ
              <textarea
                required
                maxLength={2000}
                className={input}
                rows={3}
                value={issueDescription}
                onChange={(e) => {
                  setIssue(e.target.value);
                  setKey("");
                }}
                placeholder="อธิบายอาการเสีย เช่น แบตหมดไว ชาร์จไม่เข้า จอแตก"
              />
            </label>
          </>
        )}

        {step === 3 && (
          <>
            <label className="block text-xs font-semibold text-slate-700">
              วันที่
              <input
                className={input}
                type="date"
                required
                min={firstDay}
                max={new Date(Date.now() + 30 * 86_400_000 + 7 * 3_600_000).toISOString().slice(0, 10)}
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setKey("");
                }}
              />
            </label>

            {busy ? (
              <p role="status" className="text-xs text-slate-500 py-2">
                กำลังค้นหาคิวว่าง…
              </p>
            ) : date && !slots.some((s) => s.remaining) ? (
              <p className="text-xs text-slate-500 py-2">
                วันที่นี้ไม่มีคิวว่าง หรือสาขายังไม่เปิดรับจองออนไลน์ กรุณาเลือกวันอื่นหรือติดต่อร้าน
              </p>
            ) : (
              <label className="block text-xs font-semibold text-slate-700">
                เวลา
                <select
                  className={input}
                  required
                  value={startsAt}
                  onChange={(e) => {
                    setStart(e.target.value);
                    setKey("");
                  }}
                >
                  <option value="">เลือกเวลา</option>
                  {slots
                    .filter((s) => s.remaining > 0)
                    .map((slot) => (
                      <option key={slot.startsAt} value={slot.startsAt}>
                        {new Date(slot.startsAt).toLocaleTimeString("th-TH", {
                          timeZone: "Asia/Bangkok",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        · ว่าง {slot.remaining} คิว
                      </option>
                    ))}
                </select>
              </label>
            )}
          </>
        )}

        {step >= 4 && (
          <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-5 text-xs sm:text-sm leading-relaxed space-y-2">
            <div className="flex items-center gap-2 text-teal-900 font-bold">
              <Store className="h-4 w-4 text-teal-700" />
              <span>{shop.branches.find((b) => b.id === branchId)?.name}</span>
            </div>
            <p className="text-slate-700">
              บริการ: <strong>{shop.services[service]}</strong> · {deviceModel}
            </p>
            <p className="text-slate-700">
              เวลานัดหมาย: <strong>{dateTime(startsAt)}</strong>
            </p>
            <p className="text-[11px] text-slate-500 pt-2 border-t border-teal-100">
              เลื่อนหรือยกเลิกเองได้ก่อนนัดอย่างน้อย 2 ชั่วโมง เวลาที่เลือกจะถูกจองเมื่อกดยืนยันสำเร็จ
            </p>
          </div>
        )}

        {error && (
          <p role="alert" className="text-xs text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          {step > 1 && (
            <button
              type="button"
              className={secondary}
              disabled={busy}
              onClick={() => {
                setStep(step - 1);
                setKey("");
              }}
            >
              ย้อนกลับ
            </button>
          )}

          <button
            type="submit"
            className={primary}
            disabled={busy || (step === 3 && !startsAt) || (step === 4 && !signedIn)}
          >
            {busy ? "กำลังดำเนินการ…" : step === 5 ? "ยืนยันการจอง" : "ถัดไป"}
          </button>
        </div>
      </form>

      {step === 4 && !signedIn && (
        <div className="mt-8 border-t border-slate-200 pt-6">
          <LoginForm shopSlug={shopSlug} onSuccess={onLogin} />
        </div>
      )}
    </div>
  );
}

function BookingItem({
  booking,
  shopSlug,
  busy,
  act,
}: {
  booking: Booking;
  shopSlug: string;
  busy: boolean;
  act: (work: () => Promise<unknown>) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<{ startsAt: string; remaining: number }[]>([]);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");

  return (
    <article className="border border-slate-200/90 rounded-2xl bg-white p-4 sm:p-5 shadow-2xs space-y-3 overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <h3 className="font-bold text-sm sm:text-base text-slate-900">
              {booking.deviceModel}
            </h3>
            <span className="font-mono text-xs text-slate-400 font-medium break-all">· {booking.bookingRef}</span>
          </div>

          <p className="text-xs text-slate-500">
            {booking.startsAt ? dateTime(booking.startsAt) : "กรุณาติดต่อร้าน"} · {booking.branch?.name}
          </p>

          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
            {labels[booking.status] ?? booking.status}
          </span>
        </div>

        {booking.status === "CONFIRMED" && (
          <div className="flex gap-2">
            <button
              type="button"
              className={secondary}
              disabled={busy}
              onClick={() => setEditing(!editing)}
            >
              เลื่อนนัด
            </button>
            <button
              type="button"
              className={secondary}
              disabled={busy}
              onClick={() => {
                if (window.confirm(`ยกเลิกนัด ${booking.bookingRef}?`))
                  void act(() =>
                    request("/api/customer/bookings", {
                      shopSlug,
                      action: "cancel",
                      id: booking.id,
                      key: crypto.randomUUID(),
                    })
                  );
              }}
            >
              ยกเลิก
            </button>
          </div>
        )}
      </div>

      {editing && (
        <div className="mt-4 pt-4 border-t border-slate-100 max-w-md space-y-3">
          <label className="block text-xs font-semibold text-slate-700">
            เลือกวันใหม่
            <input
              className={input}
              type="date"
              value={date}
              onChange={async (e) => {
                setDate(e.target.value);
                setSelected("");
                setSlots([]);
                setError("");
                try {
                  const result = await request(
                    `/api/public/shops/${shopSlug}?branchId=${booking.branchId}&date=${e.target.value}`
                  );
                  setSlots(result.slots);
                } catch (failure) {
                  setError(failure instanceof Error ? failure.message : "ค้นหาไม่สำเร็จ");
                }
              }}
            />
          </label>

          <label className="block text-xs font-semibold text-slate-700">
            เวลาใหม่
            <select
              className={input}
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">เลือกเวลา</option>
              {slots
                .filter((s) => s.remaining > 0)
                .map((slot) => (
                  <option key={slot.startsAt} value={slot.startsAt}>
                    {dateTime(slot.startsAt)}
                  </option>
                ))}
            </select>
          </label>

          {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}

          <button
            type="button"
            className={primary}
            disabled={busy || !selected}
            onClick={() => {
              if (window.confirm(`เลื่อนเป็น ${dateTime(selected)}?`))
                void act(async () => {
                  await request("/api/customer/bookings", {
                    shopSlug,
                    action: "reschedule",
                    id: booking.id,
                    startsAt: selected,
                    key: crypto.randomUUID(),
                  });
                  setEditing(false);
                });
            }}
          >
            ยืนยันเวลาใหม่
          </button>
        </div>
      )}
    </article>
  );
}
