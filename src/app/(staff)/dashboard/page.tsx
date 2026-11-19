import React from "react";
import Link from "next/link";
import {
  Wrench,
  DollarSign,
  AlertTriangle,
  FileQuestion,
  PlusCircle,
  ShoppingCart,
  HandCoins,
  ChevronRight,
  Smartphone,
  ShieldCheck,
  Activity,
  CreditCard,
  QrCode,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { getDashboardData } from "@/lib/dashboard";
import { cn, formatTHB } from "@/lib/utils";
import { RepairStatusMap, RepairStatusType } from "@/types";

export const dynamic = "force-dynamic";

// Server may run in UTC; always render staff-facing times in Bangkok time.
const bkkDateTime = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const bkkToday = new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "full" });

// Link styled as a button (avoid <a><button> nesting).
const linkBtn =
  "inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500";

const PAYMENT_LABEL: Record<string, { label: string; sub: string; icon: React.ElementType; tone: string }> = {
  PROMPTPAY: { label: "PromptPay QR", sub: "สแกนจ่าย", icon: QrCode, tone: "bg-sky-100 text-sky-700" },
  CASH: { label: "เงินสด (Cash)", sub: "รับเงินในลิ้นชัก", icon: DollarSign, tone: "bg-emerald-100 text-emerald-700" },
  CARD: { label: "บัตรเครดิต/เดบิต", sub: "รูดบัตร", icon: CreditCard, tone: "bg-indigo-100 text-indigo-700" },
  SPLIT: { label: "แบ่งชำระหลายช่องทาง", sub: "Split payment", icon: CreditCard, tone: "bg-slate-200 text-slate-700" },
};

export default async function DashboardPage() {
  const { canSeeMoney, stats, money, topBrands, recentRepairs, lowStockItems } = await getDashboardData();

  // Status percentages for active repairs breakdown infographic
  const totalActive = stats.activeRepairsCount || 1;
  const pendingPct = Math.round((stats.pendingCount / totalActive) * 100);
  const repairingPct = Math.round((stats.repairingCount / totalActive) * 100);
  const readyPct = Math.round((stats.readyCount / totalActive) * 100);

  // Revenue breakdown (today, Bangkok)
  const posPct = money && money.todayRevenue > 0 ? Math.round((money.posRevenue / money.todayRevenue) * 100) : 0;
  const repairPct = money && money.todayRevenue > 0 ? 100 - posPct : 0;
  const mixTotal = money?.paymentMix.reduce((acc, m) => acc + m.amount, 0) ?? 0;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* 1. Hero Header & Quick Actions Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-white p-5 md:p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200/80">
              <span className="h-2 w-2 rounded-full bg-teal-500" />
              {bkkToday.format(new Date())}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-2">
            ภาพรวมศูนย์บริการ & ร้านค้า
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {canSeeMoney
              ? "สรุปงานซ่อม ยอดขายหน้าร้าน POS และสต็อกสินค้า ประจำวันนี้ (เวลาไทย)"
              : "สรุปงานซ่อมที่ได้รับมอบหมายและสต็อกอะไหล่"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/repairs/new" className={cn(linkBtn, "flex-1 sm:flex-initial h-11 px-5 bg-teal-600 hover:bg-teal-700 text-white shadow-sm")}>
            <PlusCircle className="h-4 w-4" />
            <span>เปิดใบรับซ่อม</span>
          </Link>
          {canSeeMoney && (
            <>
              <Link href="/pos" className={cn(linkBtn, "flex-1 sm:flex-initial h-11 px-5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-800")}>
                <ShoppingCart className="h-4 w-4 text-emerald-600" />
                <span>แคชเชียร์ POS</span>
              </Link>
              <Link href="/trade-in" className={cn(linkBtn, "flex-1 sm:flex-initial h-11 px-5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-800")}>
                <HandCoins className="h-4 w-4 text-indigo-600" />
                <span>รับซื้อ / จำนำ</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", canSeeMoney ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
        {/* KPI 1: Active Repairs */}
        <Card className="border-slate-200/80 shadow-2xs bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">งานซ่อมที่กำลังดำเนินการ</span>
              <div className="flex items-baseline gap-1.5 pt-1">
                <span className="text-3xl font-extrabold text-slate-900 tabular-nums">{stats.activeRepairsCount}</span>
                <span className="text-xs font-semibold text-slate-500">เครื่องในศูนย์</span>
              </div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 border border-teal-100">
              <Wrench className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <div className="h-2.5 w-full rounded-full bg-slate-100 flex overflow-hidden">
                <div style={{ width: `${pendingPct}%` }} className="bg-amber-400 h-full" title={`รอตรวจ ${stats.pendingCount} เครื่อง`} />
                <div style={{ width: `${repairingPct}%` }} className="bg-indigo-500 h-full" title={`กำลังซ่อม ${stats.repairingCount} เครื่อง`} />
                <div style={{ width: `${readyPct}%` }} className="bg-emerald-500 h-full" title={`พร้อมส่งมอบ ${stats.readyCount} เครื่อง`} />
              </div>
              <div className="flex items-center justify-between text-[11px] font-medium text-slate-600">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />รอรับ ({stats.pendingCount})</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-indigo-500" />กำลังซ่อม ({stats.repairingCount})</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />พร้อมรับ ({stats.readyCount})</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Today's revenue (hidden for technicians) */}
        {money && (
          <Card className="border-slate-200/80 shadow-2xs bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">ยอดรับเงินวันนี้ (Revenue)</span>
                <div className="flex items-baseline gap-1.5 pt-1">
                  <span className="text-3xl font-extrabold text-slate-900 tabular-nums">{formatTHB(money.todayRevenue)}</span>
                </div>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <DollarSign className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <div className="h-2.5 w-full rounded-full bg-slate-100 flex overflow-hidden">
                  <div style={{ width: `${posPct}%` }} className="bg-emerald-500 h-full" title={`POS ${posPct}%`} />
                  <div style={{ width: `${repairPct}%` }} className="bg-teal-600 h-full" title={`งานซ่อม ${repairPct}%`} />
                </div>
                <div className="flex items-center justify-between text-[11px] font-semibold">
                  <span className="text-emerald-700">POS: {formatTHB(money.posRevenue)}</span>
                  <span className="text-teal-800">ซ่อม: {formatTHB(money.repairRevenue)}</span>
                </div>
                <p className="text-[10px] text-slate-400">เฉพาะบิลสถานะสำเร็จ (ไม่รวมบิลยกเลิก) และงานซ่อมที่ปิดงานวันนี้</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPI 3: Low stock */}
        <Card className="border-slate-200/80 shadow-2xs bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">เตือนสินค้าใกล้หมด</span>
              <div className="flex items-baseline gap-1.5 pt-1">
                <span className="text-3xl font-extrabold text-amber-600 tabular-nums">{stats.lowStockCount}</span>
                <span className="text-xs font-semibold text-slate-500">รายการ ≤ เกณฑ์ขั้นต่ำ</span>
              </div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-100">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-2">
            <Link href="/reorders" className="flex items-center justify-between text-xs text-teal-700 font-semibold hover:text-teal-900 group pt-1">
              <span>ดูรายการสินค้าต้องสั่งเพิ่ม</span>
              <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </CardContent>
        </Card>

        {/* KPI 4: Awaiting diagnosis / quote */}
        <Card className="border-slate-200/80 shadow-2xs bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">รอตรวจเช็ค / เสนอราคา</span>
              <div className="flex items-baseline gap-1.5 pt-1">
                <span className="text-3xl font-extrabold text-slate-900 tabular-nums">{stats.pendingCount + stats.diagnosingCount}</span>
                <span className="text-xs font-semibold text-slate-500">ใบรับซ่อม</span>
              </div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 border border-purple-100">
              <FileQuestion className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="font-medium">กำลังตรวจเช็ค:</span>
              <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200/60">
                {stats.diagnosingCount} ใบ
              </span>
            </div>
            <Link href="/technician-repairs" className="flex items-center justify-between text-xs text-purple-700 font-semibold hover:text-purple-900 group pt-1">
              <span>เปิดโต๊ะงานช่างเทคนิค</span>
              <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* 3. Analytics cards */}
      <div className={cn("grid grid-cols-1 gap-4", canSeeMoney ? "lg:grid-cols-3" : "lg:grid-cols-2")}>
        {/* Top device brands (30 days) */}
        <Card className="border-slate-200/80 shadow-2xs bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Activity className="h-4 w-4 text-teal-600" />
                <span>ยี่ห้อเครื่องที่รับซ่อมมากที่สุด</span>
              </CardTitle>
              <span className="text-xs font-medium text-slate-400">30 วันล่าสุด</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3.5">
            {topBrands.length === 0 && <p className="text-xs text-slate-500">ยังไม่มีงานซ่อมใน 30 วันที่ผ่านมา</p>}
            {topBrands.map((b) => (
              <div key={b.brand} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-slate-800">
                    <Smartphone className="h-3.5 w-3.5 text-teal-600" />
                    <span>{b.brand}</span>
                  </span>
                  <span className="text-teal-700 tabular-nums">{b.count} งาน ({b.pct}%)</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-teal-500 rounded-full" style={{ width: `${b.pct}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Payment mix today (hidden for technicians) */}
        {money && (
          <Card className="border-slate-200/80 shadow-2xs bg-white">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-indigo-600" />
                  <span>สัดส่วนช่องทางชำระเงิน (POS)</span>
                </CardTitle>
                <span className="text-xs font-medium text-slate-400">วันนี้ · {money.salesCountToday} บิล</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3.5">
              {money.paymentMix.length === 0 && <p className="text-xs text-slate-500">ยังไม่มียอดขายวันนี้</p>}
              {money.paymentMix.map((m) => {
                const meta = PAYMENT_LABEL[m.method] ?? { label: m.method, sub: "", icon: CreditCard, tone: "bg-slate-200 text-slate-700" };
                const Icon = meta.icon;
                const pct = mixTotal > 0 ? Math.round((m.amount / mixTotal) * 100) : 0;
                return (
                  <div key={m.method} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", meta.tone)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{meta.label}</div>
                        <div className="text-[11px] text-slate-500">{m.count} บิล{meta.sub ? ` · ${meta.sub}` : ""}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-slate-900 tabular-nums">{pct}%</div>
                      <div className="text-[11px] text-slate-600 font-semibold">{formatTHB(m.amount)}</div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Repair throughput today */}
        <Card className="border-slate-200/80 shadow-2xs bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>งานซ่อมวันนี้</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <div className="text-[11px] font-semibold text-slate-500">รับเครื่องเข้า</div>
                <div className="text-xl font-extrabold text-slate-900 mt-0.5 tabular-nums">{stats.receivedTodayCount}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <div className="text-[11px] font-semibold text-slate-500">ปิดงานสำเร็จ</div>
                <div className="text-xl font-extrabold text-emerald-600 mt-0.5 tabular-nums">{stats.completedTodayCount}</div>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200/60 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-rose-950">เกินกำหนดเสร็จ</div>
                <div className="text-[11px] text-rose-700 mt-0.5">งานที่ยังไม่ปิดและเลยวันนัดเสร็จแล้ว</div>
              </div>
              <span className="flex items-center gap-1 text-lg font-extrabold text-rose-700 tabular-nums">
                <Clock className="h-4 w-4" />
                {stats.overdueCount}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Recent repairs / sales + low stock */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200/80 shadow-2xs overflow-hidden bg-white">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 bg-slate-50/50 p-4 sm:p-5">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-teal-600" />
                  <span>รายการส่งซ่อมล่าสุด (Recent Repairs)</span>
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">ติดตามขั้นตอนงานซ่อมและสถานะช่างดำเนินการ</CardDescription>
              </div>
              <Link href="/repairs" className={cn(linkBtn, "h-8 px-3 text-xs text-teal-700 hover:text-teal-900 hover:bg-slate-100")}>
                <span>ดูงานซ่อมทั้งหมด</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {recentRepairs.length === 0 && <p className="p-4 text-sm text-slate-500">ยังไม่มีงานซ่อม</p>}
                {recentRepairs.map((job) => {
                  const statusInfo = RepairStatusMap[job.status as RepairStatusType] || {
                    label: job.status,
                    color: "text-slate-700",
                    bg: "bg-slate-50",
                    border: "border-slate-200",
                  };
                  return (
                    <div key={job.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-md border border-teal-200/60">{job.trackingCode}</span>
                          <span className="font-bold text-sm text-slate-900">{job.deviceBrand} {job.deviceModel}</span>
                        </div>
                        <div className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-teal-500 shrink-0" />
                          <span className="truncate">{job.issueDescription}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                          <span className="font-medium text-slate-700">ลูกค้า: {job.customer.name}</span>
                          <span>•</span>
                          <span className="text-slate-600">ช่าง: {job.technician?.name || "รอมอบหมาย"}</span>
                          <span>•</span>
                          <span className="text-slate-400">{bkkDateTime.format(job.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${statusInfo.bg} ${statusInfo.color} ${statusInfo.border}`}>
                          {statusInfo.label}
                        </span>
                        <Link href={`/repairs/${job.id}`} className={cn(linkBtn, "h-8 px-3 text-xs border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 rounded-lg")}>
                          จัดการ
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {money && (
            <Card className="border-slate-200/80 shadow-2xs overflow-hidden bg-white">
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 bg-slate-50/50 p-4 sm:p-5">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-emerald-600" />
                    <span>รายการขายหน้าร้านล่าสุด (POS Sales)</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">ใบเสร็จรับเงินล่าสุด (ไม่รวมบิลยกเลิก)</CardDescription>
                </div>
                <Link href="/pos" className={cn(linkBtn, "h-8 px-3 text-xs text-emerald-700 hover:text-emerald-900 hover:bg-slate-100")}>
                  <span>ไปที่แคชเชียร์ POS</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {money.recentSales.length === 0 && <p className="p-4 text-sm text-slate-500">ยังไม่มีรายการขาย</p>}
                  {money.recentSales.map((sale) => (
                    <div key={sale.id} className="p-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                      <div>
                        <div className="font-mono text-xs font-bold text-slate-800">{sale.invoiceNo}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {sale.customer?.name || "ลูกค้าทั่วไป"} • แคชเชียร์: {sale.cashier?.name ?? "-"} • {bkkDateTime.format(sale.createdAt)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-extrabold text-sm text-slate-900 tabular-nums">{formatTHB(sale.netAmount)}</div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 mt-0.5">{sale.paymentMethod}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="border-amber-200/80 bg-white shadow-2xs overflow-hidden">
            <CardHeader className="bg-amber-50/50 border-b border-amber-100 p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <div>
                  <CardTitle className="text-base font-bold text-amber-950">แจ้งเตือนสต็อกต่ำ (Low Stock)</CardTitle>
                  <CardDescription className="text-xs text-amber-800 mt-0.5">สินค้าและอะไหล่ที่เหลือไม่เกินเกณฑ์ขั้นต่ำ</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3.5 space-y-3">
              {lowStockItems.length === 0 && <p className="text-xs text-slate-500">ไม่มีสินค้าต่ำกว่าเกณฑ์</p>}
              {lowStockItems.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 shadow-2xs space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-900 truncate">{item.product.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">{item.product.code} • สาขา {item.branch.code}</div>
                    </div>
                    <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-extrabold text-rose-700 shrink-0 tabular-nums">เหลือ {item.quantity}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded-full"
                        style={{ width: `${Math.min((Math.max(item.quantity, 0) / Math.max(item.product.minStock, 1)) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>เกณฑ์ขั้นต่ำ: {item.product.minStock} ชิ้น</span>
                      <Link href="/inventory" className="text-teal-700 hover:text-teal-900 font-bold hover:underline flex items-center gap-0.5">
                        <span>สั่งเพิ่ม</span>
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
              <Link href="/inventory" className={cn(linkBtn, "w-full h-9 text-xs border border-slate-300 bg-white hover:bg-slate-50 text-slate-700")}>
                เปิดคลังสินค้า & สั่งซื้ออะไหล่
              </Link>
            </CardContent>
          </Card>

          {/* Customer self-tracking info (no hardcoded tracking code) */}
          <Card className="bg-gradient-to-br from-teal-700 to-slate-900 text-white shadow-md rounded-2xl border-0 overflow-hidden">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-teal-300" />
                </div>
                <div>
                  <CardTitle className="text-white text-base font-bold">หน้าติดตามสถานะลูกค้า</CardTitle>
                  <CardDescription className="text-teal-200 text-xs">Mobile-First Tracking ไม่ต้องล็อกอิน</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-3">
              <p className="text-xs text-slate-300 leading-relaxed">
                ลูกค้าสแกน QR Code จากใบรับซ่อมเพื่อดูสถานะงานซ่อมผ่านมือถือได้ทันที
              </p>
              {recentRepairs[0] && (
                <Link
                  href={`/track/${encodeURIComponent(recentRepairs[0].trackingCode)}`}
                  target="_blank"
                  className={cn(linkBtn, "w-full h-10 text-xs font-bold bg-teal-500 hover:bg-teal-400 text-slate-950")}
                >
                  ดูตัวอย่างหน้าลูกค้า ({recentRepairs[0].trackingCode})
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
