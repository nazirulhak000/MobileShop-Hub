"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Building2, Printer, RefreshCw, CheckCircle2, Lock, FileCheck2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { formatTHB } from "@/lib/utils";

interface MethodRow {
  paymentMethod: string;
  count: number;
  grossAmount: number;
  netAmount: number;
  vatAmount: number;
  discount: number;
}

interface BranchBreakdownRow {
  branchId: string;
  branchCode: string;
  branchName: string;
  count: number;
  netAmount: number;
  vatAmount: number;
  discount: number;
}

interface DailySummary {
  day: string;
  byPaymentMethod: MethodRow[];
  totals: { count: number; grossAmount: number; netAmount: number; vatAmount: number; discount: number };
  cashSales: number;
  voided: { count: number; amount: number };
  refundsOfEarlierSales: Array<{ paymentMethod: string; count: number; amount: number }>;
  cashRefundsOfEarlierSales: number;
  topProducts: Array<{ productId: string; code: string; name: string; quantity: number; amount: number }>;
  byBranch?: BranchBreakdownRow[];
  branches?: Array<{ id: string; code: string; name: string }>;
}

interface CloseRecord {
  closedAt: string;
  closedBy: string;
  openingFloat: number;
  actualCash: number;
  expectedCash: number;
  discrepancy: number;
  note: string;
}

const METHOD_LABELS: Record<string, string> = {
  CASH: "เงินสดหน้าร้าน (Cash)",
  PROMPTPAY: "พร้อมเพย์ QR (PromptPay)",
  CARD: "บัตรเครดิต/เดบิต (Card)",
  SPLIT: "แยกชำระหลายช่องทาง (Split)",
};

const bangkokToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());

const parseSafeNum = (val: string) => {
  if (!val) return 0;
  const cleaned = val.replace(/,/g, "").trim();
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
};

export default function DailyTakingsPage() {
  const { currentBranch, currentUser } = useApp();
  const [selectedDate, setSelectedDate] = useState(() => bangkokToday());
  const [selectedBranch, setSelectedBranch] = useState(() => currentBranch.code || "HQ");
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Cash drawer reconciliation: manager enters opening float and physical counted cash.
  const [openingFloat, setOpeningFloat] = useState("0");
  const [drawerCash, setDrawerCash] = useState("");

  // End of Day closing state
  const [closeRecord, setCloseRecord] = useState<CloseRecord | null>(null);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [closeNote, setCloseNote] = useState("");
  const [zReportModalOpen, setZReportModalOpen] = useState(false);
  const [zReportPaper, setZReportPaper] = useState<"80mm" | "58mm" | "a4">("80mm");

  const isAllBranches = selectedBranch === "ALL";
  const storageKey = `mobileshop_daily_close_${selectedBranch}_${selectedDate}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setCloseRecord(JSON.parse(saved));
      } else {
        setCloseRecord(null);
      }
    } catch {
      setCloseRecord(null);
    }
  }, [storageKey]);

  const loadSummary = useCallback(async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) return;
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({ day: selectedDate, branch: selectedBranch });
      const res = await fetch(`/api/sales/summary?${params.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.error || "โหลดยอดรับเงินประจำวันไม่สำเร็จ");
      setSummary(json.data as DailySummary);
    } catch (err: any) {
      setSummary(null);
      setLoadError(err?.message || "โหลดยอดรับเงินประจำวันไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [selectedBranch, selectedDate]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const totals = summary?.totals ?? { count: 0, grossAmount: 0, netAmount: 0, vatAmount: 0, discount: 0 };
  const lateRefundTotal = (summary?.refundsOfEarlierSales ?? []).reduce((a, r) => a + r.amount, 0);

  // Cash drawer reconciliation calculations
  const openingFloatNum = parseSafeNum(openingFloat);
  const expectedCash = openingFloatNum + (summary?.cashSales ?? 0) - (summary?.cashRefundsOfEarlierSales ?? 0);
  const hasCounted = drawerCash.trim() !== "";
  const actualCashNum = parseSafeNum(drawerCash);
  const drawerDiscrepancy = hasCounted ? actualCashNum - expectedCash : null;

  const handleConfirmClose = () => {
    const record: CloseRecord = {
      closedAt: new Date().toISOString(),
      closedBy: currentUser.name || "ผู้จัดการสาขา",
      openingFloat: openingFloatNum,
      actualCash: hasCounted ? actualCashNum : expectedCash,
      expectedCash: expectedCash,
      discrepancy: drawerDiscrepancy ?? 0,
      note: closeNote.trim(),
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(record));
      setCloseRecord(record);
      setCloseModalOpen(false);
      setZReportModalOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePrint = () => {
    document.body.classList.add("printing-slip");
    window.print();
    setTimeout(() => {
      document.body.classList.remove("printing-slip");
    }, 1000);
  };

  const branchDisplayLabel = isAllBranches
    ? "ทุกสาขาในระบบ (All Branches)"
    : (summary?.branches?.find((b) => b.code === selectedBranch)?.name || currentBranch.name);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              ยอดรับเงินประจำวัน (Daily Takings & Z-Report)
            </h1>
            <Badge variant="outline" className="border-blue-300 bg-blue-50/50 text-blue-700 font-medium">
              <Building2 className="mr-1 h-3 w-3 inline" />
              {branchDisplayLabel}
            </Badge>
            {!isAllBranches && closeRecord ? (
              <Badge className="bg-emerald-600 text-white font-semibold gap-1">
                <CheckCircle2 className="h-3 w-3" />
                ปิดรอบสิ้นวันแล้ว
              </Badge>
            ) : !isAllBranches ? (
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 font-semibold gap-1">
                <Lock className="h-3 w-3" />
                กำลังเปิดกะขาย
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-slate-500">
            แยกยอดรับเงินตามช่องทางชำระจากบิลขาย POS จริง ตรวจสอบเงินสดในลิ้นชัก และปิดรอบสิ้นวัน (Z-Report)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {summary?.branches && summary.branches.length > 1 && (
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 font-semibold shadow-xs"
            >
              <option value="ALL">🏢 ทุกสาขาในระบบ</option>
              {summary.branches.map((b) => (
                <option key={b.id} value={b.code}>
                  📍 สาขา {b.name} ({b.code})
                </option>
              ))}
            </select>
          )}

          <Input
            type="date"
            value={selectedDate}
            max={bangkokToday()}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-36 text-xs font-mono"
          />
          <Button variant="outline" size="sm" onClick={loadSummary} disabled={loading} className="text-xs gap-1.5">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>รีเฟรช</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setZReportModalOpen(true)}
            disabled={loading || !summary}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs gap-1.5 font-bold"
          >
            <Printer className="h-4 w-4" />
            <span>พิมพ์รายงาน Z-Report</span>
          </Button>
        </div>
      </div>

      {!isAllBranches && closeRecord && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-bold text-emerald-800 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>รอบการขายประจำวันที่ {selectedDate} ปิดยอดสมบูรณ์แล้ว</span>
            </div>
            <div className="text-emerald-700">
              ผู้ปิดรอบ: <span className="font-semibold">{closeRecord.closedBy}</span> เมื่อเวลา{" "}
              {new Date(closeRecord.closedAt).toLocaleTimeString("th-TH")} น. • เงินในลิ้นชักนับได้:{" "}
              <span className="font-semibold">{formatTHB(closeRecord.actualCash)}</span>{" "}
              {closeRecord.discrepancy === 0 ? (
                <span className="text-emerald-700 font-bold">(ยอดตรง)</span>
              ) : closeRecord.discrepancy > 0 ? (
                <span className="text-blue-700 font-bold">(เกิน +{formatTHB(closeRecord.discrepancy)})</span>
              ) : (
                <span className="text-rose-700 font-bold">(ขาด {formatTHB(closeRecord.discrepancy)})</span>
              )}
            </div>
            {closeRecord.note && <div className="text-slate-600 italic">บันทึก: "{closeRecord.note}"</div>}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZReportModalOpen(true)}
            className="border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-semibold gap-1.5"
          >
            <FileCheck2 className="h-4 w-4 text-emerald-600" />
            ดูใบสรุป Z-Report
          </Button>
        </div>
      )}

      {loadError && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {loadError}{" "}
          <button type="button" onClick={loadSummary} className="font-semibold underline">
            ลองใหม่
          </button>
        </div>
      )}

      {/* 4 Stat Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 space-y-1 rounded-2xl border-slate-200/90 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">ยอดรับเงินรวม (Net Takings)</span>
          <div className="text-2xl font-bold tabular-nums tracking-tight text-slate-900">{formatTHB(totals.netAmount)}</div>
          <div className="text-[11px] text-slate-400">ทั้งหมด {totals.count} บิลที่สมบูรณ์</div>
        </Card>

        <Card className="p-4 space-y-1 rounded-2xl border-slate-200/90 shadow-2xs">
          <span className="text-xs font-semibold text-blue-700">ภาษีขาย (VAT 7%)</span>
          <div className="text-2xl font-bold tabular-nums tracking-tight text-blue-700">{formatTHB(totals.vatAmount)}</div>
          <div className="text-[11px] text-slate-400">รวมอยู่ในยอดรับเงินแล้ว</div>
        </Card>

        <Card className="p-4 space-y-1 rounded-2xl border-teal-200/80 bg-teal-50/40 shadow-2xs">
          <span className="text-xs font-semibold text-teal-800">ส่วนลดที่ให้ลูกค้า</span>
          <div className="text-2xl font-bold tabular-nums tracking-tight text-teal-700">{formatTHB(totals.discount)}</div>
          <div className="text-[11px] text-teal-700 font-medium">ยอดก่อนหักส่วนลด {formatTHB(totals.grossAmount)}</div>
        </Card>

        <Card className="p-4 space-y-1 rounded-2xl border-rose-200 bg-rose-50/40 shadow-2xs">
          <span className="text-xs font-semibold text-rose-700">บิลยกเลิก / คืนเงิน</span>
          <div className="text-2xl font-bold tabular-nums tracking-tight text-rose-700">
            {formatTHB(summary?.voided.amount ?? 0)}
          </div>
          <div className="text-[11px] text-rose-600">
            {summary?.voided.count ?? 0} บิลของวันนี้
            {lateRefundTotal > 0 && ` • คืนเงินบิลวันก่อน ${formatTHB(lateRefundTotal)}`}
          </div>
        </Card>
      </div>

      {/* Multi-Branch Comparison Breakdown (when viewing all branches) */}
      {isAllBranches && summary?.byBranch && summary.byBranch.length > 0 && (
        <Card className="rounded-2xl border-blue-200 bg-blue-50/20 shadow-2xs overflow-hidden">
          <CardHeader className="p-4 border-b border-blue-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">เปรียบเทียบยอดขายรายสาขา (Branch Breakdown)</CardTitle>
              <CardDescription className="text-xs text-slate-500">ยอดขายสุทธิและจำนวนบิลแยกตามสาขาประจำวันที่ {selectedDate}</CardDescription>
            </div>
            <Badge variant="outline" className="text-xs bg-white text-blue-700 border-blue-300">
              {summary.byBranch.length} สาขา
            </Badge>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-blue-50/60 border-b border-blue-100 text-slate-600 font-semibold">
                <tr>
                  <th className="p-3 text-left">สาขา</th>
                  <th className="p-3 text-center">รหัสสาขา</th>
                  <th className="p-3 text-center">จำนวนบิล</th>
                  <th className="p-3 text-right">ส่วนลด</th>
                  <th className="p-3 text-right">VAT 7%</th>
                  <th className="p-3 text-right">ยอดรับเงินสุทธิ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-100/50 tabular-nums bg-white">
                {summary.byBranch.map((br) => (
                  <tr key={br.branchId} className="hover:bg-blue-50/40 transition-colors">
                    <td className="p-3 font-bold text-slate-900">{br.branchName}</td>
                    <td className="p-3 text-center font-mono text-slate-500">{br.branchCode}</td>
                    <td className="p-3 text-center font-semibold text-slate-700">{br.count}</td>
                    <td className="p-3 text-right text-rose-600">{br.discount > 0 ? `-${formatTHB(br.discount)}` : "-"}</td>
                    <td className="p-3 text-right text-slate-600">{formatTHB(br.vatAmount)}</td>
                    <td className="p-3 text-right font-bold text-teal-700">{formatTHB(br.netAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Breakdown by payment method */}
      <Card className="rounded-2xl border-slate-200/90 shadow-2xs overflow-hidden">
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">รายละเอียดการรับเงินแยกตามช่องทาง</CardTitle>
            <CardDescription className="text-xs text-slate-500">ยอดจากบิลขาย POS ที่สมบูรณ์ (ไม่รวมบิลที่ยกเลิก)</CardDescription>
          </div>
          <Badge variant="outline" className="text-xs font-medium tabular-nums">
            {selectedDate}
          </Badge>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50/90 border-b border-slate-200/80 text-slate-600 font-semibold">
              <tr>
                <th className="p-3 text-left">ช่องทางการชำระเงิน</th>
                <th className="p-3 text-center w-24">จำนวนบิล</th>
                <th className="p-3 text-right w-32">ยอดก่อนส่วนลด</th>
                <th className="p-3 text-right w-28">ส่วนลด</th>
                <th className="p-3 text-right w-28">VAT 7%</th>
                <th className="p-3 text-right w-36">ยอดรับเงินสุทธิ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums">
              {loading && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400">กำลังโหลดข้อมูล...</td>
                </tr>
              )}
              {!loading && summary && summary.byPaymentMethod.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400">ไม่มีรายการขายในวันที่เลือก</td>
                </tr>
              )}
              {!loading &&
                summary?.byPaymentMethod.map((c) => (
                  <tr key={c.paymentMethod} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-semibold text-slate-900">{METHOD_LABELS[c.paymentMethod] ?? c.paymentMethod}</td>
                    <td className="p-3 text-center text-slate-600">{c.count}</td>
                    <td className="p-3 text-right text-slate-700">{formatTHB(c.grossAmount)}</td>
                    <td className="p-3 text-right text-rose-600 font-medium">{c.discount > 0 ? `-${formatTHB(c.discount)}` : "-"}</td>
                    <td className="p-3 text-right text-slate-600">{formatTHB(c.vatAmount)}</td>
                    <td className="p-3 text-right font-bold text-teal-700">{formatTHB(c.netAmount)}</td>
                  </tr>
                ))}
            </tbody>
            <tfoot className="bg-slate-50/90 tabular-nums font-bold text-slate-900 border-t border-slate-200">
              <tr>
                <td className="p-3 font-bold">รวมยอดประจำวันทั้งหมด:</td>
                <td className="p-3 text-center">{totals.count}</td>
                <td className="p-3 text-right">{formatTHB(totals.grossAmount)}</td>
                <td className="p-3 text-right text-rose-600">-{formatTHB(totals.discount)}</td>
                <td className="p-3 text-right">{formatTHB(totals.vatAmount)}</td>
                <td className="p-3 text-right text-sm text-teal-700">{formatTHB(totals.netAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Top products of the day */}
      <Card className="rounded-2xl border-slate-200/90 shadow-2xs overflow-hidden">
        <CardHeader className="p-4 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-900">สินค้าขายดีประจำวัน (Top 5)</CardTitle>
          <CardDescription className="text-xs text-slate-500">เรียงตามยอดขาย (ก่อนหักส่วนลดท้ายบิล)</CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50/90 border-b border-slate-200/80 text-slate-600 font-semibold">
              <tr>
                <th className="p-3 text-left w-12">#</th>
                <th className="p-3 text-left">สินค้า</th>
                <th className="p-3 text-center w-24">จำนวน</th>
                <th className="p-3 text-right w-36">ยอดขาย</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums">
              {!loading && (summary?.topProducts.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-400">ยังไม่มีข้อมูล</td>
                </tr>
              )}
              {!loading &&
                summary?.topProducts.map((p, idx) => (
                  <tr key={p.productId} className="hover:bg-slate-50">
                    <td className="p-3 text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-semibold text-slate-900">
                      {p.name}
                      {p.code && <span className="ml-1 text-[10px] font-mono font-normal text-slate-400">{p.code}</span>}
                    </td>
                    <td className="p-3 text-center text-slate-600">{p.quantity}</td>
                    <td className="p-3 text-right font-bold text-slate-900">{formatTHB(p.amount)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Cash Drawer Reconciliation (Shown when specific branch is selected) */}
      {!isAllBranches && (
        <Card className="rounded-2xl border-slate-200/90 shadow-2xs overflow-hidden print:hidden">
          <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">ตรวจนับเงินสดลิ้นชัก & ปิดรอบสิ้นวัน (Cash Reconciliation)</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                เปรียบเทียบยอดเงินสดในลิ้นชักที่นับได้จริงกับยอดที่ระบบคำนวณ พร้อมบันทึกปิดรอบสิ้นวัน
              </CardDescription>
            </div>
            {!closeRecord && (
              <Button
                size="sm"
                onClick={() => setCloseModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>ปิดกะ / ปิดยอดสิ้นวัน</span>
              </Button>
            )}
          </CardHeader>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
                <span className="text-slate-500 font-medium">เงินทอนตั้งต้น (Opening Float)</span>
                <Input
                  type="text"
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(e.target.value)}
                  placeholder="0.00"
                  className="h-8 text-xs font-mono mt-1"
                />
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
                <span className="text-slate-500 font-medium">ยอดขายเงินสดวันนี้ (+)</span>
                <div className="text-lg font-bold tabular-nums text-slate-900 mt-1">{formatTHB(summary?.cashSales ?? 0)}</div>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-3 space-y-1">
                <span className="text-rose-700 font-medium">คืนเงินสดบิลวันก่อน (-)</span>
                <div className="text-lg font-bold tabular-nums text-rose-700 mt-1">-{formatTHB(summary?.cashRefundsOfEarlierSales ?? 0)}</div>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3 space-y-1">
                <span className="text-blue-700 font-medium">ยอดเงินสดที่ควรมีในลิ้นชัก (=)</span>
                <div className="text-lg font-bold tabular-nums text-blue-900 mt-1">{formatTHB(expectedCash)}</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end gap-3 pt-2 border-t border-slate-100">
              <div className="flex-1 max-w-xs">
                <label className="text-xs font-semibold text-slate-700 mb-1 block">จำนวนเงินสดที่นับได้จริง (Actual Cash)</label>
                <Input
                  type="text"
                  placeholder="0.00"
                  value={drawerCash}
                  onChange={(e) => setDrawerCash(e.target.value)}
                  className="text-sm h-10 font-mono"
                />
              </div>
              {drawerDiscrepancy !== null && (
                <div className={`rounded-xl border px-4 py-2.5 text-sm font-bold tabular-nums ${
                  drawerDiscrepancy === 0
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : drawerDiscrepancy > 0
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-rose-200 bg-rose-50 text-rose-700"
                }`}>
                  {drawerDiscrepancy === 0
                    ? "✓ ยอดเงินสดตรงเป๊ะ (ไม่มีผลต่าง)"
                    : drawerDiscrepancy > 0
                    ? `เงินเกิน +${formatTHB(drawerDiscrepancy)}`
                    : `เงินขาด ${formatTHB(drawerDiscrepancy)}`}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* CLOSE REGISTER MODAL */}
      <Dialog open={closeModalOpen} onOpenChange={setCloseModalOpen}>
        <div className="max-w-lg w-full">
          <DialogHeader>
            <DialogTitle onClose={() => setCloseModalOpen(false)}>
              ยืนยันการปิดยอดประจำวัน (End-of-Day Register Closing)
            </DialogTitle>
          </DialogHeader>
          <DialogContent className="space-y-4 text-xs">
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 space-y-1">
              <div className="font-semibold text-amber-900">การปิดรอบบัญชีสิ้นวัน (Z-Report)</div>
              <div className="text-amber-800">
                เมื่อปิดรอบแล้ว ยอดเงินสดและผลต่างตรวจนับจะถูกบันทึกเพื่อใช้เป็นหลักฐานส่งมอบเงินสดให้ผู้จัดการสาขา
              </div>
            </div>

            <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-600 font-sans">สาขา:</span>
                <span className="font-bold text-slate-900">{branchDisplayLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 font-sans">วันที่:</span>
                <span className="font-bold text-slate-900">{selectedDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 font-sans">ผู้ปิดรอบ:</span>
                <span className="font-bold text-slate-900">{currentUser.name || "แคชเชียร์"}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1">
                <span className="text-slate-600 font-sans">ยอดขายรวมสุทธิ:</span>
                <span className="font-bold text-teal-700">{formatTHB(totals.netAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 font-sans">ยอดเงินสดที่ควรมี:</span>
                <span className="font-bold text-slate-900">{formatTHB(expectedCash)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 font-sans">ยอดเงินสดที่นับได้:</span>
                <span className="font-bold text-blue-700">{formatTHB(hasCounted ? actualCashNum : expectedCash)}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-slate-200 pt-1">
                <span className="text-slate-800 font-sans">ผลต่างเงินสด:</span>
                <span className={drawerDiscrepancy && drawerDiscrepancy < 0 ? "text-rose-700" : "text-emerald-700"}>
                  {drawerDiscrepancy !== null
                    ? drawerDiscrepancy === 0
                      ? "0.00 (ยอดตรง)"
                      : formatTHB(drawerDiscrepancy)
                    : "0.00 (ยอดตรง)"}
                </span>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 mb-1 block">หมายเหตุการปิดรอบ / ส่งมอบเงินสด</label>
              <textarea
                value={closeNote}
                onChange={(e) => setCloseNote(e.target.value)}
                placeholder="เช่น เงินสดตรวจนับและส่งมอบใส่ซองปลอดภัยเรียบร้อย..."
                rows={2}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </DialogContent>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCloseModalOpen(false)}>
              ยกเลิก
            </Button>
            <Button size="sm" onClick={handleConfirmClose} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              ยืนยันปิดรอบ & พิมพ์ Z-Report
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* Z-REPORT PRINT MODAL */}
      <Dialog open={zReportModalOpen} onOpenChange={setZReportModalOpen}>
        <div className="max-w-2xl w-full">
          <DialogHeader>
            <DialogTitle onClose={() => setZReportModalOpen(false)}>
              รายงานปิดรอบสิ้นวัน (Daily Z-Report)
            </DialogTitle>
          </DialogHeader>
          <DialogContent className="p-4 bg-slate-100 flex flex-col items-center">
            {/* Paper Size selector */}
            <div className="flex items-center gap-2 mb-4 bg-white p-1.5 rounded-xl border border-slate-300 text-xs no-print">
              <span className="font-semibold text-slate-600 pl-2">รูปแบบกระดาษ:</span>
              <button
                type="button"
                onClick={() => setZReportPaper("80mm")}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  zReportPaper === "80mm" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                สลิปความร้อน 80 มม.
              </button>
              <button
                type="button"
                onClick={() => setZReportPaper("58mm")}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  zReportPaper === "58mm" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                สลิปความร้อน 58 มม.
              </button>
              <button
                type="button"
                onClick={() => setZReportPaper("a4")}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  zReportPaper === "a4" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                กระดาษ A4 สรุปรายวัน
              </button>
            </div>

            {/* Document Content */}
            {zReportPaper === "a4" ? (
              <div className="printable-a4-sheet bg-white p-8 w-full max-w-[210mm] border border-slate-300 rounded shadow-md text-xs font-sans space-y-4 text-slate-900">
                <div className="text-center border-b pb-4">
                  <h2 className="text-xl font-bold tracking-tight">รายงานสรุปยอดขายและปิดรอบประจำวัน (Z-REPORT)</h2>
                  <p className="text-sm text-slate-600">MOBILESHOP HUB • {branchDisplayLabel}</p>
                  <p className="text-xs text-slate-500 font-mono mt-1">ประจำวันที่ {selectedDate} | พิมพ์เมื่อ {new Date().toLocaleString("th-TH")}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-500">ผู้ปิดรอบ:</span> <span className="font-bold">{closeRecord?.closedBy || currentUser.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">สถานะ:</span>{" "}
                    <span className="font-bold text-emerald-700">{closeRecord ? "ปิดรอบสมบูรณ์ (CLOSED)" : "กำลังดำเนินการ"}</span>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-slate-800 mb-2">สรุปยอดตามช่องทางการชำระเงิน</h3>
                  <table className="w-full text-xs border border-slate-200">
                    <thead className="bg-slate-100 border-b">
                      <tr>
                        <th className="p-2 text-left">ช่องทาง</th>
                        <th className="p-2 text-center">จำนวนบิล</th>
                        <th className="p-2 text-right">ยอดรวมก่อนลด</th>
                        <th className="p-2 text-right">ส่วนลด</th>
                        <th className="p-2 text-right">VAT 7%</th>
                        <th className="p-2 text-right">ยอดรับเงินสุทธิ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {summary?.byPaymentMethod.map((m) => (
                        <tr key={m.paymentMethod}>
                          <td className="p-2 font-semibold">{METHOD_LABELS[m.paymentMethod] ?? m.paymentMethod}</td>
                          <td className="p-2 text-center">{m.count}</td>
                          <td className="p-2 text-right">{formatTHB(m.grossAmount)}</td>
                          <td className="p-2 text-right text-rose-600">{m.discount > 0 ? `-${formatTHB(m.discount)}` : "-"}</td>
                          <td className="p-2 text-right">{formatTHB(m.vatAmount)}</td>
                          <td className="p-2 text-right font-bold">{formatTHB(m.netAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t">
                      <tr>
                        <td className="p-2">รวมทั้งหมด</td>
                        <td className="p-2 text-center">{totals.count}</td>
                        <td className="p-2 text-right">{formatTHB(totals.grossAmount)}</td>
                        <td className="p-2 text-right text-rose-600">-{formatTHB(totals.discount)}</td>
                        <td className="p-2 text-right">{formatTHB(totals.vatAmount)}</td>
                        <td className="p-2 text-right text-teal-700 text-sm">{formatTHB(totals.netAmount)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="border border-slate-200 rounded-lg p-3 space-y-1.5 bg-slate-50">
                  <h4 className="font-bold text-slate-800">สรุปการตรวจนับเงินสดลิ้นชัก (Cash Reconciliation)</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>เงินทอนตั้งต้น: <span className="font-mono font-bold">{formatTHB(openingFloatNum)}</span></div>
                    <div>ยอดขายเงินสด: <span className="font-mono font-bold text-emerald-700">{formatTHB(summary?.cashSales ?? 0)}</span></div>
                    <div>คืนเงินสด: <span className="font-mono font-bold text-rose-700">-{formatTHB(summary?.cashRefundsOfEarlierSales ?? 0)}</span></div>
                    <div>ยอดเงินสดที่ควรมี: <span className="font-mono font-bold text-blue-700">{formatTHB(expectedCash)}</span></div>
                    <div>ยอดเงินสดที่นับได้จริง: <span className="font-mono font-bold">{formatTHB(hasCounted ? actualCashNum : (closeRecord?.actualCash ?? expectedCash))}</span></div>
                    <div>ผลต่าง: <span className="font-mono font-bold">{formatTHB(drawerDiscrepancy ?? closeRecord?.discrepancy ?? 0)}</span></div>
                  </div>
                </div>

                <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
                  <div className="border-t border-slate-400 pt-2">
                    <p className="font-bold">ลงชื่อ .......................................................</p>
                    <p className="text-slate-500 mt-1">ผู้ส่งมอบเงินสด / แคชเชียร์</p>
                  </div>
                  <div className="border-t border-slate-400 pt-2">
                    <p className="font-bold">ลงชื่อ .......................................................</p>
                    <p className="text-slate-500 mt-1">ผู้รับมอบเงินสด / ผู้จัดการสาขา</p>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={`${
                  zReportPaper === "58mm" ? "thermal-58mm" : "thermal-80mm"
                } bg-white border border-slate-300 p-4 text-xs font-mono space-y-2 rounded shadow-sm text-slate-900`}
              >
                <div className="text-center border-b border-dashed border-slate-400 pb-2">
                  <div className="font-extrabold text-sm">MOBILESHOP HUB</div>
                  <div className="text-[10px]">{branchDisplayLabel}</div>
                  <div className="text-[11px] font-bold mt-1 text-slate-800">*** DAILY Z-REPORT ***</div>
                  <div className="text-[9px] text-slate-500">รายงานปิดรอบสิ้นวัน</div>
                </div>

                <div className="text-[10px] space-y-0.5 border-b border-dashed border-slate-400 pb-2">
                  <div className="flex justify-between">
                    <span>วันที่: {selectedDate}</span>
                    <span>{new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div>ผู้ปิดรอบ: {closeRecord?.closedBy || currentUser.name}</div>
                  <div>จำนวนบิล: {totals.count} บิล</div>
                </div>

                <div className="text-[10px] space-y-1 border-b border-dashed border-slate-400 pb-2">
                  <div className="font-bold">สรุปยอดตามช่องทาง:</div>
                  {summary?.byPaymentMethod.map((m) => (
                    <div key={m.paymentMethod} className="flex justify-between">
                      <span>{m.paymentMethod} ({m.count}):</span>
                      <span>{formatTHB(m.netAmount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-dotted border-slate-300 pt-1 font-bold">
                    <span>ยอดขายรวมสุทธิ:</span>
                    <span>{formatTHB(totals.netAmount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[9px]">
                    <span>รวมภาษี VAT 7%:</span>
                    <span>{formatTHB(totals.vatAmount)}</span>
                  </div>
                  {totals.discount > 0 && (
                    <div className="flex justify-between text-slate-500 text-[9px]">
                      <span>ส่วนลดรวม:</span>
                      <span>-{formatTHB(totals.discount)}</span>
                    </div>
                  )}
                </div>

                <div className="text-[10px] space-y-1 border-b border-dashed border-slate-400 pb-2">
                  <div className="font-bold">กระทบยอดเงินสดลิ้นชัก:</div>
                  <div className="flex justify-between">
                    <span>เงินทอนตั้งต้น:</span>
                    <span>{formatTHB(openingFloatNum)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ยอดขายเงินสด (+):</span>
                    <span>{formatTHB(summary?.cashSales ?? 0)}</span>
                  </div>
                  {(summary?.cashRefundsOfEarlierSales ?? 0) > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>คืนเงินสด (-):</span>
                      <span>-{formatTHB(summary?.cashRefundsOfEarlierSales ?? 0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold border-t border-dotted border-slate-300 pt-0.5">
                    <span>เงินสดที่ควรมี:</span>
                    <span>{formatTHB(expectedCash)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>นับได้จริง:</span>
                    <span>{formatTHB(hasCounted ? actualCashNum : (closeRecord?.actualCash ?? expectedCash))}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>ผลต่าง:</span>
                    <span>{formatTHB(drawerDiscrepancy ?? closeRecord?.discrepancy ?? 0)}</span>
                  </div>
                </div>

                <div className="pt-4 text-center text-[9px] text-slate-400 space-y-3">
                  <div>ลงชื่อ ...................................... แคชเชียร์</div>
                  <div>ลงชื่อ ...................................... ผู้จัดการ</div>
                  <div className="text-[8px]">*** สิ้นสุดรายงานปิดรอบ ***</div>
                </div>
              </div>
            )}
          </DialogContent>
          <DialogFooter className="flex justify-between">
            <Button variant="outline" size="sm" onClick={() => setZReportModalOpen(false)}>
              ปิด
            </Button>
            <Button size="sm" onClick={handlePrint} className="bg-slate-900 hover:bg-slate-800 text-white gap-1.5 font-bold">
              <Printer className="h-4 w-4" />
              <span>สั่งพิมพ์ ({zReportPaper.toUpperCase()})</span>
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  );
}
