"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Building2, Printer, RefreshCw, AlertCircle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatTHB } from "@/lib/utils";

interface MethodRow {
  paymentMethod: string;
  count: number;
  grossAmount: number;
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
}

const METHOD_LABELS: Record<string, string> = {
  CASH: "เงินสดหน้าร้าน (Cash)",
  PROMPTPAY: "พร้อมเพย์ QR (PromptPay)",
  CARD: "บัตรเครดิต/เดบิต (Card)",
  SPLIT: "แยกชำระหลายช่องทาง (Split)",
};

// Client-safe "YYYY-MM-DD" in Bangkok time.
const bangkokToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());

export default function DailyTakingsPage() {
  const { currentBranch } = useApp();
  const [selectedDate, setSelectedDate] = useState(() => bangkokToday());
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Cash drawer reconciliation: manager enters the physical counted cash amount.
  const [drawerCash, setDrawerCash] = useState("");

  const loadSummary = useCallback(async () => {
    if (!currentBranch.code || !/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) return;
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({ day: selectedDate, branch: currentBranch.code });
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
  }, [currentBranch.code, selectedDate]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const totals = summary?.totals ?? { count: 0, grossAmount: 0, netAmount: 0, vatAmount: 0, discount: 0 };
  const lateRefundTotal = (summary?.refundsOfEarlierSales ?? []).reduce((a, r) => a + r.amount, 0);

  // Cash drawer reconciliation derived values.
  // Expected cash in drawer = cash sales today − cash refunds of earlier bills.
  const expectedCash = (summary?.cashSales ?? 0) - (summary?.cashRefundsOfEarlierSales ?? 0);
  const actualCash = Number(drawerCash);
  const drawerDiscrepancy = Number.isFinite(actualCash) && drawerCash !== "" ? actualCash - expectedCash : null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              ยอดรับเงินประจำวัน (Daily Takings)
            </h1>
            <Badge variant="outline" className="border-blue-300 bg-blue-50/50 text-blue-700 font-medium">
              <Building2 className="mr-1 h-3 w-3 inline" />
              {currentBranch.name}
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            แยกยอดรับเงินตามช่องทางชำระจากบิลขาย POS จริง (เงินสด, PromptPay, บัตร, แยกชำระ) พร้อมภาษีขายและส่วนลด
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={selectedDate}
            max={bangkokToday()}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40 text-xs font-mono"
          />
          <Button variant="outline" size="sm" onClick={loadSummary} disabled={loading} className="text-xs gap-1.5">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>รีเฟรช</span>
          </Button>
          <Button
            size="sm"
            onClick={() => window.print()}
            disabled={loading || !summary}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs gap-1.5"
          >
            <Printer className="h-4 w-4" />
            <span>พิมพ์รายงานยอดประจำวัน</span>
          </Button>
        </div>
      </div>

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
        {summary && summary.byPaymentMethod.some((m) => m.paymentMethod === "SPLIT") && (
          <div className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-500">
            หมายเหตุ: บิลแบบแยกชำระ (Split) แสดงเป็นยอดรวม ระบบยังไม่แยกส่วนเงินสด/โอนของบิลประเภทนี้
          </div>
        )}
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

      {/* Cash Drawer Reconciliation */}
      <Card className="rounded-2xl border-slate-200/90 shadow-2xs overflow-hidden print:hidden">
        <CardHeader className="p-4 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-900">ตรวจนับเงินสดลิ้นชักประจำวัน</CardTitle>
          <CardDescription className="text-xs text-slate-500">
            เปรียบเทียบยอดเงินสดในลิ้นชักที่นับได้จริงกับยอดที่ระบบคำนวณ
          </CardDescription>
        </CardHeader>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
              <span className="text-slate-500 font-medium">ยอดขายเงินสดวันนี้</span>
              <div className="text-lg font-bold tabular-nums text-slate-900">{formatTHB(summary?.cashSales ?? 0)}</div>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-3 space-y-1">
              <span className="text-rose-700 font-medium">คืนเงินสดบิลวันก่อน (หัก)</span>
              <div className="text-lg font-bold tabular-nums text-rose-700">-{formatTHB(summary?.cashRefundsOfEarlierSales ?? 0)}</div>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3 space-y-1">
              <span className="text-blue-700 font-medium">ยอดเงินสดที่คาดในลิ้นชัก</span>
              <div className="text-lg font-bold tabular-nums text-blue-900">{formatTHB(expectedCash)}</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1 max-w-xs">
              <label className="text-xs font-semibold text-slate-700 mb-1 block">จำนวนเงินสดที่นับได้จริง (บาท)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
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
                  ? "✓ ยอดตรง"
                  : drawerDiscrepancy > 0
                  ? `เงินเกิน +${formatTHB(drawerDiscrepancy)}`
                  : `เงินขาด ${formatTHB(drawerDiscrepancy)}`}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
