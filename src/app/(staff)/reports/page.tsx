"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Wrench,
  Download,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Printer,
  Layers,
  ShoppingBag,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { formatTHB } from "@/lib/utils";

type MonthRow = {
  month: string;
  salesCount: number;
  salesGross: number;
  vatOutput: number;
  salesRevenue: number;
  cogs: number;
  grossProfitSales: number;
  repairCount: number;
  repairRevenue: number;
  repairPartsCost: number;
  grossProfit: number;
  expenses: number;
  payroll: number;
  buybackCount: number;
  buybackSpend: number;
  netProfit: number;
};
type Summary = {
  from: string;
  to: string;
  months: MonthRow[];
  totals: Omit<MonthRow, "month">;
  topProducts: { productId: string; name: string; category: string; quantity: number; revenue: number }[];
  topRepairs: { device: string; jobs: number; revenue: number }[];
  branches: { branchId: string; name: string; code: string; salesRevenue: number; repairRevenue: number; totalRevenue: number; expenses: number }[];
  notes: string[];
};

type Period = "MONTH" | "3M" | "6M" | "YTD" | "12M";
const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

/** Current month in Asia/Bangkok as YYYY-MM. */
function bangkokMonth(): string {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 7);
}
function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const total = y * 12 + (m - 1) + delta;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}
function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${THAI_MONTHS[m - 1]} ${String(y + 543).slice(-2)}`;
}
function periodRange(period: Period): { from: string; to: string } {
  const to = bangkokMonth();
  switch (period) {
    case "3M": return { from: shiftMonth(to, -2), to };
    case "6M": return { from: shiftMonth(to, -5), to };
    case "12M": return { from: shiftMonth(to, -11), to };
    case "YTD": return { from: `${to.slice(0, 4)}-01`, to };
    default: return { from: to, to };
  }
}
const pct = (part: number, whole: number) => (whole !== 0 ? (part / whole) * 100 : 0);
const csvCell = (v: string | number) => (typeof v === "number" ? v.toFixed(2) : `"${v.replace(/"/g, '""')}"`);

export default function ReportsPage() {
  const { branches } = useApp();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("MONTH");
  const [selectedBranch, setSelectedBranch] = useState("ALL");
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => periodRange(selectedPeriod), [selectedPeriod]);
  // The trend chart always shows at least the last 6 months.
  const trendFrom = useMemo(() => {
    const six = shiftMonth(range.to, -5);
    return six < range.from ? six : range.from;
  }, [range]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ from: trendFrom, to: range.to, branch: selectedBranch });
      const res = await fetch(`/api/reports/summary?${qs}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "โหลดรายงานไม่สำเร็จ");
      setData(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดรายงานไม่สำเร็จ");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [trendFrom, range.to, selectedBranch]);

  useEffect(() => { void load(); }, [load]);

  // Totals for the selected period only (the fetched range may be wider for the trend chart).
  const reportData = useMemo(() => {
    const rows = (data?.months ?? []).filter((m) => m.month >= range.from && m.month <= range.to);
    const sum = (k: keyof Omit<MonthRow, "month">) => rows.reduce((acc, r) => acc + r[k], 0);
    const revenuePOS = sum("salesRevenue");
    const revenueRepairs = sum("repairRevenue");
    const totalRevenue = revenuePOS + revenueRepairs;
    const cogsPOS = sum("cogs");
    const cogsParts = sum("repairPartsCost");
    const totalCOGS = cogsPOS + cogsParts;
    const grossProfit = sum("grossProfit");
    const expenses = sum("expenses");
    const payroll = sum("payroll");
    const operatingExpenses = expenses + payroll;
    const netProfit = sum("netProfit");
    return {
      revenuePOS,
      revenueRepairs,
      totalRevenue,
      vatOutput: sum("vatOutput"),
      cogsPOS,
      cogsParts,
      totalCOGS,
      grossProfit,
      gpMargin: pct(grossProfit, totalRevenue),
      expenses,
      payroll,
      operatingExpenses,
      buybackSpend: sum("buybackSpend"),
      netProfit,
      netMargin: pct(netProfit, totalRevenue),
    };
  }, [data, range]);

  const monthlyTrends = useMemo(
    () => (data?.months ?? []).slice(-6).map((m) => ({
      month: monthLabel(m.month),
      revenue: m.salesRevenue + m.repairRevenue,
      gp: m.grossProfit,
      expense: m.expenses + m.payroll,
    })),
    [data],
  );
  const chartMax = Math.max(1, ...monthlyTrends.flatMap((t) => [t.revenue, t.gp, t.expense]));
  const topProductMax = Math.max(1, ...(data?.topProducts ?? []).map((p) => p.revenue));
  const topRepairMax = Math.max(1, ...(data?.topRepairs ?? []).map((r) => r.revenue));
  const rangeLabel = range.from === range.to ? monthLabel(range.from) : `${monthLabel(range.from)} – ${monthLabel(range.to)}`;
  // Rankings and branch matrix come from the whole fetched range.
  const rankingLabel = trendFrom === range.from ? rangeLabel : `${monthLabel(trendFrom)} – ${monthLabel(range.to)}`;

  const exportCSV = () => {
    if (!data) return;
    const lines = [
      `"รายงานกำไรขาดทุน ${rangeLabel}"`,
      "หัวข้อ,จำนวนเงิน (บาท),หมายเหตุ",
      `"รายรับจากขายสินค้าหน้าร้าน (POS) ไม่รวม VAT",${reportData.revenuePOS.toFixed(2)},""`,
      `"ภาษีขาย (Output VAT)",${reportData.vatOutput.toFixed(2)},""`,
      `"รายรับจากบริการงานซ่อม (Repairs)",${reportData.revenueRepairs.toFixed(2)},""`,
      `"รายรับรวมทั้งสิ้น (Total Revenue)",${reportData.totalRevenue.toFixed(2)},""`,
      `"ต้นทุนขายสินค้า (COGS Products)",${reportData.cogsPOS.toFixed(2)},""`,
      `"ต้นทุนอะไหล่ซ่อม (Parts Cost)",${reportData.cogsParts.toFixed(2)},""`,
      `"กำไรขั้นต้น (Gross Profit)",${reportData.grossProfit.toFixed(2)},"${reportData.gpMargin.toFixed(1)}% Margin"`,
      `"ค่าใช้จ่ายร้าน (Expenses)",${reportData.expenses.toFixed(2)},""`,
      `"ค่าแรงพนักงาน (Payroll)",${reportData.payroll.toFixed(2)},""`,
      `"กำไรสุทธิก่อนภาษี (Net Profit)",${reportData.netProfit.toFixed(2)},"${reportData.netMargin.toFixed(1)}% Net Margin"`,
      `"เงินรับซื้อเครื่อง (Buyback — ไม่หักจากกำไร)",${reportData.buybackSpend.toFixed(2)},""`,
      "",
      "เดือน,ยอดขาย(ไม่รวมVAT),VAT ขาย,ต้นทุนขาย,รายรับซ่อม,ต้นทุนอะไหล่,กำไรขั้นต้น,ค่าใช้จ่าย,เงินเดือน,รับซื้อเครื่อง,กำไรสุทธิ",
      ...data.months.map((m) => [m.month, m.salesRevenue, m.vatOutput, m.cogs, m.repairRevenue, m.repairPartsCost, m.grossProfit, m.expenses, m.payroll, m.buybackSpend, m.netProfit].map(csvCell).join(",")),
      "",
      "อันดับ,สินค้าขายดี,หมวดหมู่,จำนวนที่ขาย,ยอดขายรวม",
      ...data.topProducts.map((p, i) => [String(i + 1), p.name, p.category, String(p.quantity), p.revenue].map(csvCell).join(",")),
      "",
      "อันดับ,รุ่นเครื่องที่ซ่อม,จำนวนเคส,รายรับรวม",
      ...data.topRepairs.map((r, i) => [String(i + 1), r.device, String(r.jobs), r.revenue].map(csvCell).join(",")),
    ];
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pnl_report_${range.from}_${range.to}_${selectedBranch}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">รายงานสถิติ & งบกำไรขาดทุน (Analytics & P&L)</h1>
            <p className="text-xs text-slate-500">คำนวณจากข้อมูลขาย งานซ่อม ค่าใช้จ่าย และเงินเดือนในระบบ · ช่วง {rangeLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportCSV} disabled={!data || loading} className="gap-2 text-xs h-9 border-slate-300 hover:bg-slate-50">
            <Download className="h-3.5 w-3.5" />
            ส่งออก CSV
          </Button>
          <Button onClick={() => window.print()} className="gap-2 text-xs h-9 bg-slate-900 text-white hover:bg-slate-800">
            <Printer className="h-3.5 w-3.5" />
            พิมพ์รายงาน
          </Button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 mr-1">ช่วงเวลา:</span>
          {([
            { id: "MONTH", label: "เดือนนี้" },
            { id: "3M", label: "3 เดือนล่าสุด" },
            { id: "6M", label: "6 เดือนล่าสุด" },
            { id: "YTD", label: "ตั้งแต่ต้นปี" },
            { id: "12M", label: "12 เดือนล่าสุด" },
          ] as const).map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPeriod(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedPeriod === p.id ? "bg-blue-600 text-white font-semibold shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600">สาขา:</span>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 bg-slate-50 text-slate-800 font-medium cursor-pointer outline-none"
          >
            <option value="ALL">ทุกสาขารวมกัน</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</span>
          <Button variant="outline" size="sm" onClick={() => void load()} className="gap-1.5"><RefreshCw className="h-3.5 w-3.5" />ลองใหม่</Button>
        </div>
      )}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />กำลังโหลดข้อมูลรายงาน...</div>
      )}

      {data && (
        <>
          {/* KPI Cards: P&L Summary */}
          <div className={`grid grid-cols-2 lg:grid-cols-5 gap-3.5 ${loading ? "opacity-60" : ""}`}>
            <Card className="border-blue-200 bg-blue-50/40 shadow-2xs">
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-xs text-blue-700 mb-1">
                  <span>รายรับรวม (ไม่รวม VAT)</span>
                  <DollarSign className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-blue-900 tabular-nums">{formatTHB(reportData.totalRevenue)}</div>
                <p className="text-[11px] text-blue-600 mt-0.5">POS: {formatTHB(reportData.revenuePOS)} | ซ่อม: {formatTHB(reportData.revenueRepairs)}</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 bg-white shadow-2xs">
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>ต้นทุนสินค้า & อะไหล่ (COGS)</span>
                  <Layers className="h-4 w-4 text-slate-400" />
                </div>
                <div className="text-2xl font-bold text-slate-900 tabular-nums">{formatTHB(reportData.totalCOGS)}</div>
                <p className="text-[11px] text-slate-400 mt-0.5">สินค้า: {formatTHB(reportData.cogsPOS)} | อะไหล่: {formatTHB(reportData.cogsParts)}</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 bg-emerald-50/40 shadow-2xs">
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-xs text-emerald-700 mb-1">
                  <span>กำไรขั้นต้น (Gross Profit)</span>
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-bold text-emerald-800 tabular-nums">{formatTHB(reportData.grossProfit)}</div>
                <div className="text-[11px] font-semibold text-emerald-600 mt-0.5">GP Margin {reportData.gpMargin.toFixed(1)}%</div>
              </CardContent>
            </Card>
            <Card className="border-amber-200 bg-amber-50/40 shadow-2xs">
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-xs text-amber-700 mb-1">
                  <span>ค่าใช้จ่ายดำเนินงาน (OPEX)</span>
                  <Building2 className="h-4 w-4 text-amber-600" />
                </div>
                <div className="text-2xl font-bold text-amber-900 tabular-nums">{formatTHB(reportData.operatingExpenses)}</div>
                <p className="text-[11px] text-amber-600 mt-0.5">ค่าใช้จ่าย: {formatTHB(reportData.expenses)} | เงินเดือน: {formatTHB(reportData.payroll)}</p>
              </CardContent>
            </Card>
            <Card className="border-purple-200 bg-purple-50/40 shadow-2xs">
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-xs text-purple-700 mb-1">
                  <span>กำไรสุทธิ (Net Profit)</span>
                  <CheckCircle2 className="h-4 w-4 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-purple-900 tabular-nums">{formatTHB(reportData.netProfit)}</div>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-purple-700 mt-0.5">
                  {reportData.netProfit >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  <span>Net Margin {reportData.netMargin.toFixed(1)}%</span>
                </div>
              </CardContent>
            </Card>
          </div>
          <p className="text-[11px] text-slate-500">
            ภาษีขาย (VAT) ช่วงนี้ {formatTHB(reportData.vatOutput)} · เงินรับซื้อเครื่อง {formatTHB(reportData.buybackSpend)} (ถือเป็นทุนสินค้าคงคลัง ไม่หักจากกำไรสุทธิ)
          </p>

          {/* Monthly trend chart */}
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">แนวโน้มรายรับ กำไรขั้นต้น และค่าใช้จ่าย (Monthly Trend)</CardTitle>
                  <CardDescription className="text-xs text-slate-500">ย้อนหลัง {monthlyTrends.length} เดือน (บาท)</CardDescription>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-xs bg-blue-600 inline-block" /><span className="text-slate-600">รายรับรวม</span></div>
                  <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-xs bg-emerald-500 inline-block" /><span className="text-slate-600">กำไรขั้นต้น (GP)</span></div>
                  <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-xs bg-amber-400 inline-block" /><span className="text-slate-600">ค่าใช้จ่าย+เงินเดือน</span></div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-60 flex items-end justify-between gap-4 pt-6 border-b border-slate-200 px-2">
                {monthlyTrends.map((t) => (
                  <div key={t.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <div className="flex items-end gap-1.5 w-full justify-center h-full">
                      <div style={{ height: `${(Math.max(t.revenue, 0) / chartMax) * 100}%` }} className="w-1/4 bg-blue-600 rounded-t" title={`รายรับ: ${formatTHB(t.revenue)}`} />
                      <div style={{ height: `${(Math.max(t.gp, 0) / chartMax) * 100}%` }} className="w-1/4 bg-emerald-500 rounded-t" title={`กำไร GP: ${formatTHB(t.gp)}`} />
                      <div style={{ height: `${(Math.max(t.expense, 0) / chartMax) * 100}%` }} className="w-1/4 bg-amber-400 rounded-t" title={`ค่าใช้จ่าย: ${formatTHB(t.expense)}`} />
                    </div>
                    <span className="text-xs font-medium text-slate-600 mt-2">{t.month}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top products vs top repairs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-slate-200 shadow-2xs">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-blue-600" />
                    <CardTitle className="text-sm font-bold text-slate-900">5 อันดับสินค้าขายดี (Top Products)</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{rankingLabel}</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50/75">
                    <TableRow>
                      <TableHead className="text-xs font-semibold text-slate-600 w-10">#</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600">ชื่อสินค้า</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 text-right">จำนวน</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 text-right">ยอดขายรวม</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topProducts.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="py-4 text-center text-xs text-slate-500">ยังไม่มียอดขายในช่วงนี้</TableCell></TableRow>
                    )}
                    {data.topProducts.map((p, i) => (
                      <TableRow key={p.productId} className="hover:bg-slate-50/60">
                        <TableCell className="py-2.5 font-bold text-xs text-slate-400 font-mono">0{i + 1}</TableCell>
                        <TableCell className="py-2.5">
                          <div className="font-semibold text-xs text-slate-900">{p.name}</div>
                          <div className="w-full bg-slate-100 rounded-full h-1 mt-1.5 overflow-hidden">
                            <div className="bg-blue-600 h-1 rounded-full" style={{ width: `${(p.revenue / topProductMax) * 100}%` }} />
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5 text-right font-mono text-xs text-slate-700">{p.quantity} ชิ้น</TableCell>
                        <TableCell className="py-2.5 text-right font-mono text-xs font-bold text-slate-900">{formatTHB(p.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-2xs">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-emerald-600" />
                    <CardTitle className="text-sm font-bold text-slate-900">5 อันดับรุ่นที่สร้างรายได้งานซ่อมสูงสุด</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{rankingLabel}</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50/75">
                    <TableRow>
                      <TableHead className="text-xs font-semibold text-slate-600 w-10">#</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600">รุ่นเครื่อง</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 text-right">จำนวนเคส</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-600 text-right">ยอดรับรวม</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topRepairs.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="py-4 text-center text-xs text-slate-500">ยังไม่มีงานซ่อมที่ปิดงานในช่วงนี้</TableCell></TableRow>
                    )}
                    {data.topRepairs.map((r, i) => (
                      <TableRow key={r.device + i} className="hover:bg-slate-50/60">
                        <TableCell className="py-2.5 font-bold text-xs text-slate-400 font-mono">0{i + 1}</TableCell>
                        <TableCell className="py-2.5">
                          <div className="font-semibold text-xs text-slate-900">{r.device}</div>
                          <div className="w-full bg-slate-100 rounded-full h-1 mt-1.5 overflow-hidden">
                            <div className="bg-emerald-500 h-1 rounded-full" style={{ width: `${(r.revenue / topRepairMax) * 100}%` }} />
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5 text-right font-mono text-xs text-slate-700">{r.jobs} เครื่อง</TableCell>
                        <TableCell className="py-2.5 text-right font-mono text-xs font-bold text-slate-900">{formatTHB(r.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Branch comparison */}
          <Card className="border-slate-200 shadow-2xs overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900">เปรียบเทียบผลประกอบการรายสาขา (Branch Performance)</CardTitle>
              <CardDescription className="text-xs text-slate-500">ช่วง {rankingLabel} · ยอดขายไม่รวม VAT · ค่าใช้จ่ายจากบันทึกค่าใช้จ่ายร้าน (ไม่รวมเงินเดือน)</CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/75 border-b border-slate-200">
                  <TableRow>
                    <TableHead className="text-xs font-semibold text-slate-600">สาขา</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600 text-right">ยอดขาย POS</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600 text-right">ยอดรับงานซ่อม</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600 text-right">รายรับรวม</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600 text-right">ค่าใช้จ่ายสาขา</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-600 text-center">สัดส่วนรายรับ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.branches.map((b) => {
                    const allRevenue = data.branches.reduce((acc, x) => acc + x.totalRevenue, 0);
                    return (
                      <TableRow key={b.branchId} className="hover:bg-slate-50/60">
                        <TableCell className="py-3">
                          <div className="font-semibold text-xs text-slate-900">{b.name}</div>
                          <div className="text-[11px] text-slate-400">รหัส: {b.code}</div>
                        </TableCell>
                        <TableCell className="py-3 text-right font-mono text-xs">{formatTHB(b.salesRevenue)}</TableCell>
                        <TableCell className="py-3 text-right font-mono text-xs">{formatTHB(b.repairRevenue)}</TableCell>
                        <TableCell className="py-3 text-right font-mono text-xs font-bold text-blue-900">{formatTHB(b.totalRevenue)}</TableCell>
                        <TableCell className="py-3 text-right font-mono text-xs text-rose-600">{formatTHB(b.expenses)}</TableCell>
                        <TableCell className="py-3 text-center">
                          <Badge variant="success" className="text-[10px]">{pct(b.totalRevenue, allRevenue).toFixed(1)}%</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
