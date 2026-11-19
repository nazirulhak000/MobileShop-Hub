"use client";

import React, { useState, useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Package,
  Wrench,
  Download,
  Calendar,
  Building2,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  CheckCircle2,
  Printer,
  PieChart,
  Layers,
  ShoppingBag,
  Cpu,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { formatTHB } from "@/lib/utils";

export default function ReportsPage() {
  const { currentBranch, branches } = useApp();
  const [selectedPeriod, setSelectedPeriod] = useState<"TODAY" | "7DAYS" | "MONTH" | "Q4" | "YEAR">("MONTH");
  const [selectedBranch, setSelectedBranch] = useState("ALL");

  // Sample Aggregated Data based on MobileShop Hub
  const reportData = useMemo(() => {
    // Multiplier based on period
    const mult = selectedPeriod === "TODAY" ? 0.05 : selectedPeriod === "7DAYS" ? 0.28 : selectedPeriod === "Q4" ? 2.8 : selectedPeriod === "YEAR" ? 11.5 : 1.0;
    const branchMult = selectedBranch === "HQ" ? 0.6 : selectedBranch === "BR-02" ? 0.4 : 1.0;

    const baseRevenuePOS = 485000 * mult * branchMult;
    const baseRevenueRepairs = 265000 * mult * branchMult;
    const totalRevenue = baseRevenuePOS + baseRevenueRepairs;

    const cogsPOS = 345000 * mult * branchMult;
    const cogsParts = 112000 * mult * branchMult;
    const totalCOGS = cogsPOS + cogsParts;

    const grossProfit = totalRevenue - totalCOGS;
    const gpMargin = (grossProfit / totalRevenue) * 100;

    const operatingExpenses = (62000 + 40000) * mult * branchMult; // Rent, utilities, payroll, etc.
    const netProfit = grossProfit - operatingExpenses;
    const netMargin = (netProfit / totalRevenue) * 100;

    return {
      revenuePOS: baseRevenuePOS,
      revenueRepairs: baseRevenueRepairs,
      totalRevenue,
      cogsPOS,
      cogsParts,
      totalCOGS,
      grossProfit,
      gpMargin,
      operatingExpenses,
      netProfit,
      netMargin,
    };
  }, [selectedPeriod, selectedBranch]);

  // Top Selling Items
  const topSellingProducts = [
    { rank: 1, name: "ฟิล์มกระจกเต็มจอโฟกัส iPhone 15 Pro", category: "ACCESSORY", qty: 184, revenue: 53360, share: 88 },
    { rank: 2, name: "เคสใสกันกระแทก Magnetic Clear Case", category: "ACCESSORY", qty: 142, revenue: 69580, share: 72 },
    { rank: 3, name: "หัวชาร์จเร็ว 20W USB-C Fast Charger", category: "ACCESSORY", qty: 98, revenue: 57820, share: 55 },
    { rank: 4, name: "iPhone 15 Pro 256GB Natural Titanium (มือสองเกรด A)", category: "DEVICE", qty: 7, revenue: 209300, share: 40 },
    { rank: 5, name: "สายชาร์จถัก Braided Type-C to Type-C 60W", category: "ACCESSORY", qty: 76, revenue: 29640, share: 32 },
  ];

  // Top Repair Services
  const topRepairServices = [
    { rank: 1, name: "เปลี่ยนหน้าจอแท้ iPhone 13 / 14 / 15", jobs: 42, revenue: 151200, avgLabor: 1200, share: 92 },
    { rank: 2, name: "เปลี่ยนแบตเตอรี่แท้ มอก. iPhone ทุกรุ่น", jobs: 38, revenue: 57000, avgLabor: 500, share: 80 },
    { rank: 3, name: "ซ่อมเมนบอร์ด ยกชิป / ลายวงจรช็อตเปิดไม่ติด", jobs: 19, revenue: 47500, avgLabor: 2500, share: 48 },
    { rank: 4, name: "เปลี่ยนชุดแพร์กล้องหลัง iPhone / Samsung", jobs: 14, revenue: 35000, avgLabor: 800, share: 35 },
    { rank: 5, name: "ซ่อมตูดชาร์จ / เปลี่ยนพอร์ต Type-C & Lightning", jobs: 12, revenue: 14400, avgLabor: 600, share: 28 },
  ];

  // Monthly Trend Chart Mock Data
  const monthlyTrends = [
    { month: "ก.ค.", revenue: 620000, gp: 210000, expense: 95000 },
    { month: "ส.ค.", revenue: 680000, gp: 235000, expense: 98000 },
    { month: "ก.ย.", revenue: 710000, gp: 250000, expense: 102000 },
    { month: "ต.ค.", revenue: 740000, gp: 275000, expense: 105000 },
    { month: "พ.ย. (ปัจจุบัน)", revenue: 750000, gp: 293000, expense: 102000 },
  ];

  const exportCSV = () => {
    const lines = [
      "หัวข้อ,จำนวนเงิน (บาท),หมายเหตุ",
      `"รายรับจากขายสินค้าหน้าร้าน (POS)",${reportData.revenuePOS.toFixed(2)},"สินค้าเคส ฟิล์ม เครื่อง"`,
      `"รายรับจากบริการงานซ่อม (Repairs)",${reportData.revenueRepairs.toFixed(2)},"ค่าแรงซ่อมและอะไหล่"`,
      `"รายรับรวมทั้งสิ้น (Total Revenue)",${reportData.totalRevenue.toFixed(2)},""`,
      `"ต้นทุนขายสินค้า (COGS Products)",${reportData.cogsPOS.toFixed(2)},""`,
      `"ต้นทุนอะไหล่ซ่อม (Parts Cost)",${reportData.cogsParts.toFixed(2)},""`,
      `"ต้นทุนขายและบริการรวม (Total COGS)",${reportData.totalCOGS.toFixed(2)},""`,
      `"กำไรขั้นต้น (Gross Profit)",${reportData.grossProfit.toFixed(2)},"${reportData.gpMargin.toFixed(1)}% Margin"`,
      `"ค่าใช้จ่ายดำเนินงาน (Operating Expenses)",${reportData.operatingExpenses.toFixed(2)},"ค่าเช่า น้ำไฟ พนักงาน"`,
      `"กำไรสุทธิก่อนภาษี (Net Operating Profit)",${reportData.netProfit.toFixed(2)},"${reportData.netMargin.toFixed(1)}% Net Margin"`,
      "",
      "อันดับ,สินค้าขายดี,หมวดหมู่,จำนวนที่ขาย,รายรับรวม",
      ...topSellingProducts.map((p) => `${p.rank},"${p.name}",${p.category},${p.qty},${p.revenue}`),
      "",
      "อันดับ,บริการงานซ่อม,จำนวนเคส,รายรับรวม,ค่าแรงเฉลี่ย",
      ...topRepairServices.map((r) => `${r.rank},"${r.name}",${r.jobs},${r.revenue},${r.avgLabor}`),
    ];

    const csvContent = "\uFEFF" + lines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pnl_report_${selectedPeriod}_${selectedBranch}.csv`;
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
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              รายงานสถิติ & งบกำไรขาดทุน (Analytics & P&L)
            </h1>
            <p className="text-xs text-slate-500">
              วิเคราะห์รายได้ กำไรขั้นต้น (GP) กำไรสุทธิ ผลิตภัณฑ์และงานซ่อมยอดนิยม พร้อมส่งออกข้อมูล
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={exportCSV}
            className="gap-2 text-xs h-9 border-slate-300 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            ส่งออก CSV
          </Button>

          <Button
            onClick={() => window.print()}
            className="gap-2 text-xs h-9 bg-slate-900 text-white hover:bg-slate-800"
          >
            <Printer className="h-3.5 w-3.5" />
            พิมพ์รายงาน
          </Button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 mr-1">ช่วงเวลา:</span>
          {[
            { id: "TODAY", label: "วันนี้" },
            { id: "7DAYS", label: "7 วันล่าสุด" },
            { id: "MONTH", label: "เดือนนี้ (พ.ย. 2569)" },
            { id: "Q4", label: "ไตรมาส 4" },
            { id: "YEAR", label: "ทั้งปี 2569" },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPeriod(p.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedPeriod === p.id
                  ? "bg-blue-600 text-white font-semibold shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
              <option key={b.id} value={b.code}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards: P&L Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <Card className="border-blue-200 bg-blue-50/40 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-blue-700 mb-1">
              <span>รายรับรวม (Total Revenue)</span>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-900 tabular-nums">
              {formatTHB(reportData.totalRevenue)}
            </div>
            <p className="text-[11px] text-blue-600 mt-0.5">
              POS: {formatTHB(reportData.revenuePOS)} | ซ่อม: {formatTHB(reportData.revenueRepairs)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>ต้นทุนสินค้า & อะไหล่ (COGS)</span>
              <Layers className="h-4 w-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">
              {formatTHB(reportData.totalCOGS)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              สินค้า: {formatTHB(reportData.cogsPOS)} | อะไหล่: {formatTHB(reportData.cogsParts)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/40 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-emerald-700 mb-1">
              <span>กำไรขั้นต้น (Gross Profit)</span>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-800 tabular-nums">
              {formatTHB(reportData.grossProfit)}
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 mt-0.5">
              <ArrowUpRight className="h-3 w-3" />
              <span>GP Margin {reportData.gpMargin.toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/40 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-amber-700 mb-1">
              <span>ค่าใช้จ่ายดำเนินงาน (OPEX)</span>
              <Building2 className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-amber-900 tabular-nums">
              {formatTHB(reportData.operatingExpenses)}
            </div>
            <p className="text-[11px] text-amber-600 mt-0.5">ค่าเช่า น้ำไฟ พนักงาน การตลาด</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/40 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-purple-700 mb-1">
              <span>กำไรสุทธิ (Net Profit)</span>
              <CheckCircle2 className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-900 tabular-nums">
              {formatTHB(reportData.netProfit)}
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-purple-700 mt-0.5">
              <ArrowUpRight className="h-3 w-3" />
              <span>Net Margin {reportData.netMargin.toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visual Chart: Monthly Revenue & Gross Profit Comparison */}
      <Card className="border-slate-200 shadow-2xs">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">แนวโน้มรายรับ กำไรขั้นต้น และค่าใช้จ่าย (Monthly Trend)</CardTitle>
              <CardDescription className="text-xs text-slate-500">เปรียบเทียบย้อนหลัง 5 เดือนล่าสุด (บาท)</CardDescription>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-xs bg-blue-600 inline-block" />
                <span className="text-slate-600">รายรับรวม</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-xs bg-emerald-500 inline-block" />
                <span className="text-slate-600">กำไรขั้นต้น (GP)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-xs bg-amber-400 inline-block" />
                <span className="text-slate-600">ค่าใช้จ่าย</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-60 flex items-end justify-between gap-4 pt-6 border-b border-slate-200 px-2">
            {monthlyTrends.map((t, idx) => {
              const maxVal = 800000;
              const hRev = (t.revenue / maxVal) * 100;
              const hGp = (t.gp / maxVal) * 100;
              const hExp = (t.expense / maxVal) * 100;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="flex items-end gap-1.5 w-full justify-center h-full">
                    <div
                      style={{ height: `${hRev}%` }}
                      className="w-1/4 bg-blue-600 rounded-t hover:bg-blue-700 transition-all cursor-pointer relative"
                      title={`รายรับ: ${formatTHB(t.revenue)}`}
                    />
                    <div
                      style={{ height: `${hGp}%` }}
                      className="w-1/4 bg-emerald-500 rounded-t hover:bg-emerald-600 transition-all cursor-pointer relative"
                      title={`กำไร GP: ${formatTHB(t.gp)}`}
                    />
                    <div
                      style={{ height: `${hExp}%` }}
                      className="w-1/4 bg-amber-400 rounded-t hover:bg-amber-500 transition-all cursor-pointer relative"
                      title={`ค่าใช้จ่าย: ${formatTHB(t.expense)}`}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-600 mt-2">{t.month}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Two Column Grid: Top Selling Products vs Top Repair Services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-blue-600" />
                <CardTitle className="text-sm font-bold text-slate-900">5 อันดับสินค้าขายดีที่สุด (Top Products)</CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px]">
                หน้าร้าน POS
              </Badge>
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
                {topSellingProducts.map((p) => (
                  <TableRow key={p.rank} className="hover:bg-slate-50/60">
                    <TableCell className="py-2.5 font-bold text-xs text-slate-400 font-mono">
                      0{p.rank}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div className="font-semibold text-xs text-slate-900">{p.name}</div>
                      <div className="w-full bg-slate-100 rounded-full h-1 mt-1.5 overflow-hidden">
                        <div
                          className="bg-blue-600 h-1 rounded-full"
                          style={{ width: `${p.share}%` }}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 text-right font-mono text-xs text-slate-700">
                      {p.qty} ชิ้น
                    </TableCell>
                    <TableCell className="py-2.5 text-right font-mono text-xs font-bold text-slate-900">
                      {formatTHB(p.revenue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top Repair Services */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-emerald-600" />
                <CardTitle className="text-sm font-bold text-slate-900">5 อันดับบริการงานซ่อมยอดนิยม (Top Repairs)</CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px]">
                ศูนย์ซ่อม Service
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/75">
                <TableRow>
                  <TableHead className="text-xs font-semibold text-slate-600 w-10">#</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">อาการเสีย / บริการ</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 text-right">จำนวนเคส</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 text-right">ยอดรับรวม</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topRepairServices.map((r) => (
                  <TableRow key={r.rank} className="hover:bg-slate-50/60">
                    <TableCell className="py-2.5 font-bold text-xs text-slate-400 font-mono">
                      0{r.rank}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div className="font-semibold text-xs text-slate-900">{r.name}</div>
                      <div className="w-full bg-slate-100 rounded-full h-1 mt-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-1 rounded-full"
                          style={{ width: `${r.share}%` }}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 text-right font-mono text-xs text-slate-700">
                      {r.jobs} เครื่อง
                    </TableCell>
                    <TableCell className="py-2.5 text-right font-mono text-xs font-bold text-slate-900">
                      {formatTHB(r.revenue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Branch Comparison Table */}
      <Card className="border-slate-200 shadow-2xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-900">เปรียบเทียบผลประกอบการรายสาขา (Branch Performance Matrix)</CardTitle>
          <CardDescription className="text-xs text-slate-500">ข้อมูลยอดขาย งานซ่อม และอัตรากำไรแยกตามที่ตั้งสาขา</CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/75 border-b border-slate-200">
              <TableRow>
                <TableHead className="text-xs font-semibold text-slate-600">สาขา</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-right">ยอดขาย POS</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-right">ยอดรับงานซ่อม</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-right">รายรับรวม</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-right">กำไรขั้นต้น (GP)</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-right">ค่าใช้จ่ายสาขา</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-right">กำไรสุทธิ</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">Net Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="hover:bg-slate-50/60">
                <TableCell className="py-3">
                  <div className="font-semibold text-xs text-slate-900">MobileShop HQ (สุขุมวิท)</div>
                  <div className="text-[11px] text-slate-400">รหัส: HQ • 6 พนักงาน</div>
                </TableCell>
                <TableCell className="py-3 text-right font-mono text-xs">{formatTHB(291000)}</TableCell>
                <TableCell className="py-3 text-right font-mono text-xs">{formatTHB(159000)}</TableCell>
                <TableCell className="py-3 text-right font-mono text-xs font-bold text-blue-900">{formatTHB(450000)}</TableCell>
                <TableCell className="py-3 text-right font-mono text-xs text-emerald-700">{formatTHB(175800)}</TableCell>
                <TableCell className="py-3 text-right font-mono text-xs text-rose-600">{formatTHB(61200)}</TableCell>
                <TableCell className="py-3 text-right font-mono text-xs font-bold text-slate-900">{formatTHB(114600)}</TableCell>
                <TableCell className="py-3 text-center">
                  <Badge variant="success" className="text-[10px]">25.5%</Badge>
                </TableCell>
              </TableRow>

              <TableRow className="hover:bg-slate-50/60">
                <TableCell className="py-3">
                  <div className="font-semibold text-xs text-slate-900">MobileShop สาขา 2 (เซ็นทรัลพระราม 9)</div>
                  <div className="text-[11px] text-slate-400">รหัส: BR-02 • 4 พนักงาน</div>
                </TableCell>
                <TableCell className="py-3 text-right font-mono text-xs">{formatTHB(194000)}</TableCell>
                <TableCell className="py-3 text-right font-mono text-xs">{formatTHB(106000)}</TableCell>
                <TableCell className="py-3 text-right font-mono text-xs font-bold text-blue-900">{formatTHB(300000)}</TableCell>
                <TableCell className="py-3 text-right font-mono text-xs text-emerald-700">{formatTHB(117200)}</TableCell>
                <TableCell className="py-3 text-right font-mono text-xs text-rose-600">{formatTHB(40800)}</TableCell>
                <TableCell className="py-3 text-right font-mono text-xs font-bold text-slate-900">{formatTHB(76400)}</TableCell>
                <TableCell className="py-3 text-center">
                  <Badge variant="success" className="text-[10px]">25.5%</Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
