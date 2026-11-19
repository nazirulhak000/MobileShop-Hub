"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Printer, AlertCircle, ArrowDownRight, ArrowUpRight, Loader2, RefreshCw, Building2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatTHB } from "@/lib/tax";

type VatData = {
  month: string;
  salesCount: number;
  voidCount: number;
  grossSales: number;
  salesBase: number;
  outputVat: number;
  inputVat: number;
  inputVatSource: "not-tracked";
  netVatPayable: number;
  documents: { id: string; invoiceNo: string; date: string; customerName: string; branchCode: string; base: number; vat: number; total: number }[];
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

  const dueLabel = `ยื่นภายใน 23 ${monthName(shiftMonth(selectedMonth, 1))}`;

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
          <p className="text-sm text-slate-500">สรุปภาษีขายจากบิล POS ที่สำเร็จในเดือนที่เลือก นำส่งกรมสรรพากรภายในวันที่ 23 ของเดือนถัดไป</p>
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
            <span>พิมพ์สรุป</span>
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <span>
          ระบบยังไม่ได้บันทึกภาษีซื้อ (Input VAT) จากใบกำกับภาษีของผู้ขาย ภาษีซื้อจึงแสดงเป็น 0 และยอดชำระสุทธิด้านล่างคือภาษีขายทั้งหมด
          กรุณานำภาษีซื้อจากใบกำกับภาษีจริงมาหักเองก่อนยื่น ภ.พ.30 และตรวจสอบกับนักบัญชี
        </span>
      </div>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</span>
          <Button variant="outline" size="sm" onClick={() => void load()} className="gap-1.5"><RefreshCw className="h-3.5 w-3.5" />ลองใหม่</Button>
        </div>
      )}
      {loading && <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />กำลังโหลดข้อมูล...</div>}

      {data && (
        <>
          <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 ${loading ? "opacity-60" : ""}`}>
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">1. ภาษีขาย (Output VAT)</span>
                  <span className="rounded-full bg-emerald-100 p-1 text-emerald-700"><ArrowUpRight className="h-4 w-4" /></span>
                </div>
                <div className="text-2xl font-bold font-mono text-slate-900">{formatTHB(data.outputVat)}</div>
                <div className="text-[11px] text-slate-500">
                  มูลค่าขายก่อน VAT: <span className="font-mono font-semibold">{formatTHB(data.salesBase)}</span> · {data.salesCount} บิล
                  {data.voidCount > 0 && <> · ไม่รวมบิลยกเลิก {data.voidCount} ใบ</>}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">2. ภาษีซื้อ (Input VAT)</span>
                  <span className="rounded-full bg-blue-100 p-1 text-blue-700"><ArrowDownRight className="h-4 w-4" /></span>
                </div>
                <div className="text-2xl font-bold font-mono text-slate-400">{formatTHB(data.inputVat)}</div>
                <div className="text-[11px] text-amber-700 font-semibold">ยังไม่บันทึกในระบบ</div>
              </CardContent>
            </Card>
            <Card className="bg-emerald-900 text-white shadow-md">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-emerald-200">3. ภาษีที่ต้องชำระ (ก่อนหักภาษีซื้อ)</span>
                  <Badge variant="success" className="text-[10px] bg-emerald-800 text-emerald-100 border-emerald-700">{dueLabel}</Badge>
                </div>
                <div className="text-3xl font-extrabold font-mono text-emerald-400">{formatTHB(data.netVatPayable)}</div>
                <div className="text-[11px] text-emerald-200/80">(ภาษีขาย {formatTHB(data.outputVat)} - ภาษีซื้อ {formatTHB(data.inputVat)})</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm">รายงานภาษีขาย {monthName(data.month)}</CardTitle>
                <CardDescription>บิล POS สถานะสำเร็จ (ไม่รวมบิลยกเลิก)</CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px]">{data.documents.length} รายการ</Badge>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2 px-3 text-left">เลขที่บิล / วันที่</th>
                    <th className="py-2 px-3 text-left">ลูกค้า</th>
                    <th className="py-2 px-3 text-left">สาขา</th>
                    <th className="py-2 px-3 text-right">ก่อน VAT</th>
                    <th className="py-2 px-3 text-right">VAT 7%</th>
                    <th className="py-2 px-3 text-right">รวม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {data.documents.length === 0 && (
                    <tr><td colSpan={6} className="py-4 text-center font-sans text-slate-500">ไม่มีบิลขายในเดือนนี้</td></tr>
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
            {data.documentsTruncated && (
              <p className="p-3 text-[11px] text-slate-500 border-t border-slate-100">แสดงรายการบางส่วน ยอดรวมด้านบนคำนวณจากบิลทั้งหมดของเดือน</p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
