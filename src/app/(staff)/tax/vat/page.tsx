"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Printer,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Loader2,
  RefreshCw,
  Building2,
  Clock,
  CheckCircle2,
  Receipt,
  ShoppingCart,
  FileSpreadsheet,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatTHB } from "@/lib/tax";

type VatData = {
  month: string;
  branchId: string | null;
  salesCount: number;
  voidCount: number;
  grossSales: number;
  salesBase: number;
  outputVat: number;
  purchasesCount: number;
  grossPurchases: number;
  purchasesBase: number;
  inputVat: number;
  inputVatSource: "purchase_orders";
  netVatPayable: number;
  excessCredit: number;
  filingDeadline: string;
  filingStatus: "PENDING_FILING" | "DUE_SOON" | "OVERDUE";
  daysRemaining: number;
  documents: {
    id: string;
    invoiceNo: string;
    date: string;
    customerName: string;
    branchCode: string;
    base: number;
    vat: number;
    total: number;
  }[];
  purchaseDocuments: {
    id: string;
    poNumber: string;
    date: string;
    supplierName: string;
    branchCode: string;
    base: number;
    vat: number;
    total: number;
  }[];
  documentsTruncated: boolean;
};

const THAI_MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const bkkMonth = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 7);
const shiftMonth = (month: string, delta: number) => {
  const [y, m] = month.split("-").map(Number);
  const t = y * 12 + (m - 1) + delta;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
};
const monthName = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return `${THAI_MONTHS[m - 1]} ${y + 543}`;
};
const bkkDate = new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", day: "2-digit", month: "2-digit", year: "numeric" });

export default function VatFilingPage() {
  const { branches } = useApp();
  const currentMonth = useMemo(() => bkkMonth(), []);
  const monthOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => shiftMonth(currentMonth, -i)), [currentMonth]);
  // Default: previous month (the one being filed by the 23rd of this month)
  const [selectedMonth, setSelectedMonth] = useState(() => shiftMonth(bkkMonth(), -1));
  const [branch, setBranch] = useState("ALL");
  const [additionalInputVat, setAdditionalInputVat] = useState("");
  const [activeTab, setActiveTab] = useState<"OUTPUT" | "INPUT">("OUTPUT");
  const [data, setData] = useState<VatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tax/vat?${new URLSearchParams({ month: selectedMonth, branch })}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "โหลดข้อมูล VAT ไม่สำเร็จ");
      setData(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูล VAT ไม่สำเร็จ");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, branch]);

  useEffect(() => { void load(); }, [load]);

  // Combined Input VAT (POs + optional manual/paper invoices)
  const parsedManualInput = Math.max(0, parseFloat(additionalInputVat) || 0);
  const totalInputVat = data ? Math.round((data.inputVat + parsedManualInput) * 100) / 100 : 0;
  const netDiff = data ? Math.round((data.outputVat - totalInputVat) * 100) / 100 : 0;
  const netPayable = netDiff > 0 ? netDiff : 0;
  const taxCredit = netDiff < 0 ? Math.abs(netDiff) : 0;

  const dueLabel = `ยื่น e-Filing ภายใน 23 ${monthName(shiftMonth(selectedMonth, 1))}`;

  return (
    <div className="space-y-6 w-full pb-12">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/tax" className="hover:text-blue-600 transition-colors">ภาษี & การเงิน</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-semibold text-slate-800">ภาษีมูลค่าเพิ่ม ภ.พ.30 (Value Added Tax 7%)</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>สรุปภาษีมูลค่าเพิ่ม (ภ.พ.30)</span>
            <span className="rounded bg-emerald-100 text-emerald-800 font-mono text-xs px-2 py-0.5 font-bold">VAT 7%</span>
          </h1>
          <p className="text-sm text-slate-500">
            คำนวณภาษีขาย (Output Tax) ปะทะ ภาษีซื้อ (Input Tax จากใบสั่งซื้อ/รับสินค้า POs) พร้อมตรวจสอบยอดสุทธิและกำหนดส่งแบบ
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
            aria-label="เดือนภาษี"
          >
            {monthOptions.map((m) => <option key={m} value={m}>{monthName(m)}</option>)}
          </select>
          <div className="flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
              aria-label="สาขา"
            >
              <option value="ALL">ทุกสาขา</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <Button size="sm" onClick={() => window.print()} className="bg-slate-900 hover:bg-slate-800 text-white text-xs gap-1.5">
            <Printer className="h-4 w-4" />
            <span>พิมพ์สรุป ภ.พ.30</span>
          </Button>
        </div>
      </div>

      {/* Filing Schedule & Status Banner */}
      {data && (
        <div className={`rounded-xl border p-3.5 text-xs flex items-center justify-between gap-3 ${
          data.filingStatus === "OVERDUE"
            ? "border-rose-300 bg-rose-50 text-rose-900"
            : data.filingStatus === "DUE_SOON"
            ? "border-amber-300 bg-amber-50 text-amber-900"
            : "border-blue-200 bg-blue-50/70 text-blue-900"
        }`}>
          <div className="flex items-center gap-2.5">
            <Clock className="h-4 w-4 shrink-0" />
            <div>
              <span className="font-bold">กำหนดเวลา e-Filing สรรพากร: </span>
              <span>{dueLabel} ({data.filingDeadline})</span>
            </div>
          </div>
          <div>
            {data.filingStatus === "OVERDUE" ? (
              <Badge variant="danger" className="text-[10px]">เลยกำหนดส่งแบบ ({Math.abs(data.daysRemaining)} วัน)</Badge>
            ) : data.filingStatus === "DUE_SOON" ? (
              <Badge variant="warning" className="text-[10px] animate-pulse">ใกล้ครบกำหนด (เหลือ {data.daysRemaining} วัน)</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] border-blue-400 text-blue-700">รอบปกติ (เหลือ {data.daysRemaining} วัน)</Badge>
            )}
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</span>
          <Button variant="outline" size="sm" onClick={() => void load()} className="gap-1.5"><RefreshCw className="h-3.5 w-3.5" />ลองใหม่</Button>
        </div>
      )}
      {loading && <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />กำลังคำนวณภาษี...</div>}

      {data && (
        <>
          {/* 3 Core Tax Cards: Output Tax, Input Tax, Net Tax Payable / Tax Credit */}
          <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 ${loading ? "opacity-60" : ""}`}>
            {/* Card 1: Output Tax */}
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">1. ภาษีขาย (Output VAT)</span>
                  <span className="rounded-full bg-emerald-100 p-1 text-emerald-700"><ArrowUpRight className="h-4 w-4" /></span>
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-700">{formatTHB(data.outputVat)}</div>
                <div className="text-[11px] text-slate-500">
                  ฐานภาษีขาย: <span className="font-mono font-semibold">{formatTHB(data.salesBase)}</span> · {data.salesCount} บิล
                  {data.voidCount > 0 && <> · ไม่รวมบิลยกเลิก {data.voidCount} ใบ</>}
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Input Tax (from POs + manual) */}
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">2. ภาษีซื้อรวม (Input VAT)</span>
                  <span className="rounded-full bg-blue-100 p-1 text-blue-700"><ArrowDownRight className="h-4 w-4" /></span>
                </div>
                <div className="text-2xl font-bold font-mono text-blue-700">{formatTHB(totalInputVat)}</div>
                <div className="text-[11px] text-slate-500 space-y-1">
                  <div>จากระบบ POs: <span className="font-mono font-bold text-slate-800">{formatTHB(data.inputVat)}</span> ({data.purchasesCount} รายการ)</div>
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">+ ใบกำกับภาษีอื่น:</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={additionalInputVat}
                      onChange={(e) => setAdditionalInputVat(e.target.value)}
                      className="h-6 text-xs font-mono font-bold text-blue-800 bg-slate-50 w-24 px-1.5"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Net VAT Payable or Tax Credit Refundable */}
            <Card className="bg-slate-900 text-white shadow-md">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300">
                    {taxCredit > 0 ? "3. ภาษีชำระเกินยกไป (Tax Credit)" : "3. ภาษีที่ต้องชำระสุทธิ (Net VAT Payable)"}
                  </span>
                  <Badge variant={taxCredit > 0 ? "warning" : "success"} className="text-[10px]">
                    {taxCredit > 0 ? "เครดิตภาษียกไป" : "นำส่งสรรพากร"}
                  </Badge>
                </div>
                <div className={`text-3xl font-extrabold font-mono ${taxCredit > 0 ? "text-amber-300" : "text-emerald-400"}`}>
                  {formatTHB(taxCredit > 0 ? taxCredit : netPayable)}
                </div>
                <div className="text-[11px] text-slate-300">
                  {taxCredit > 0
                    ? `ภาษีซื้อ (${formatTHB(totalInputVat)}) สูงกว่าภาษีขาย (${formatTHB(data.outputVat)}) ยกไปเป็นเครดิตเดือนถัดไป`
                    : `ภาษีขาย (${formatTHB(data.outputVat)}) - ภาษีซื้อ (${formatTHB(totalInputVat)}) ชำระด้วยสตางค์แม่นยำ`}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Dual Report Tabs: Sales Tax vs Purchase Tax */}
          <Card>
            <CardHeader className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm">เอกสารประกอบแบบ ภ.พ.30 ประจำเดือน {monthName(data.month)}</CardTitle>
                <CardDescription>แสดงรายการภาษีขายจากระบบ POS และรายการภาษีซื้อจากใบสั่งซื้อ POs</CardDescription>
              </div>

              {/* Tab Selector */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab("OUTPUT")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-bold transition-all ${
                    activeTab === "OUTPUT" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Receipt className="h-3.5 w-3.5 text-emerald-600" />
                  <span>รายงานภาษีขาย ({data.documents.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("INPUT")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-bold transition-all ${
                    activeTab === "INPUT" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <ShoppingCart className="h-3.5 w-3.5 text-blue-600" />
                  <span>รายงานภาษีซื้อ POs ({data.purchaseDocuments.length})</span>
                </button>
              </div>
            </CardHeader>

            {activeTab === "OUTPUT" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3 text-left">เลขที่บิล / วันที่</th>
                      <th className="py-2.5 px-3 text-left">ลูกค้า</th>
                      <th className="py-2.5 px-3 text-left">สาขา</th>
                      <th className="py-2.5 px-3 text-right">มูลค่าก่อน VAT</th>
                      <th className="py-2.5 px-3 text-right">ภาษีขาย (7%)</th>
                      <th className="py-2.5 px-3 text-right">รวมเงิน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {data.documents.length === 0 && (
                      <tr><td colSpan={6} className="py-6 text-center font-sans text-slate-500">ไม่มีบิลขายในเดือนนี้</td></tr>
                    )}
                    {data.documents.map((it) => (
                      <tr key={it.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3">
                          <div className="font-bold text-slate-900">{it.invoiceNo}</div>
                          <div className="text-[10px] text-slate-400">{bkkDate.format(new Date(it.date))}</div>
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-700">{it.customerName}</td>
                        <td className="py-2 px-3 text-slate-500">{it.branchCode}</td>
                        <td className="py-2 px-3 text-right text-slate-600">{formatTHB(it.base)}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700">{formatTHB(it.vat)}</td>
                        <td className="py-2 px-3 text-right text-slate-800">{formatTHB(it.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3 text-left">เลขที่ PO / วันที่</th>
                      <th className="py-2.5 px-3 text-left">ผู้ขาย (Supplier)</th>
                      <th className="py-2.5 px-3 text-left">สาขา</th>
                      <th className="py-2.5 px-3 text-right">มูลค่าก่อน VAT</th>
                      <th className="py-2.5 px-3 text-right">ภาษีซื้อ (7%)</th>
                      <th className="py-2.5 px-3 text-right">รวมเงิน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {data.purchaseDocuments.length === 0 && (
                      <tr><td colSpan={6} className="py-6 text-center font-sans text-slate-500">ไม่มีใบสั่งซื้อ/รับสินค้าในเดือนนี้</td></tr>
                    )}
                    {data.purchaseDocuments.map((po) => (
                      <tr key={po.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3">
                          <div className="font-bold text-blue-700">{po.poNumber}</div>
                          <div className="text-[10px] text-slate-400">{bkkDate.format(new Date(po.date))}</div>
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-800">{po.supplierName}</td>
                        <td className="py-2 px-3 text-slate-500">{po.branchCode}</td>
                        <td className="py-2 px-3 text-right text-slate-600">{formatTHB(po.base)}</td>
                        <td className="py-2 px-3 text-right font-bold text-blue-700">{formatTHB(po.vat)}</td>
                        <td className="py-2 px-3 text-right text-slate-800">{formatTHB(po.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {data.documentsTruncated && (
              <p className="p-3 text-[11px] text-slate-500 border-t border-slate-100">
                แสดงรายการบางส่วน ยอดรวมด้านบนคำนวณจากเอกสารทั้งหมดในรอบเดือนภาษีนี้
              </p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
