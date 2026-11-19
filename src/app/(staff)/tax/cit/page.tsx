"use client";

import React, { useState, useMemo } from "react";
import { Download, Loader2 } from "lucide-react";
import Link from "next/link";
import {
  Building2,
  Building,
  Calculator,
  ChevronRight,
  TrendingUp,
  Percent,
  Receipt,
  Printer,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { calculateCIT, CIT_SME_BRACKETS, formatTHB } from "@/lib/tax";

export default function CorporateIncomeTaxPage() {
  const { currentBranch } = useApp();
  const [revenue, setRevenue] = useState<number>(5200000);
  const [expenses, setExpenses] = useState<number>(3950000);
  const [isSme, setIsSme] = useState<boolean>(true);
  const [paidCapital, setPaidCapital] = useState<number>(3000000); // <= 5M qualifies for SME

  // Prefill from real system data (manual entry still allowed).
  const currentYear = new Date(Date.now() + 7 * 3600 * 1000).getUTCFullYear();
  const [importYear, setImportYear] = useState<number>(currentYear);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const importFromSystem = async () => {
    setImporting(true);
    setImportMsg(null);
    try {
      const qs = new URLSearchParams({ from: `${importYear}-01`, to: `${importYear}-12` });
      const res = await fetch(`/api/reports/summary?${qs}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "ดึงข้อมูลไม่สำเร็จ");
      const t = json.data.totals;
      const rev = Math.round((t.salesRevenue + t.repairRevenue) * 100) / 100;
      const exp = Math.round((t.cogs + t.repairPartsCost + t.expenses + t.payroll) * 100) / 100;
      setRevenue(rev);
      setExpenses(exp);
      setImportMsg({ ok: true, text: `ดึงข้อมูลปี ${importYear + 543} แล้ว: รายได้ (ไม่รวม VAT) ${formatTHB(rev)} · ต้นทุน+ค่าใช้จ่าย+เงินเดือน ${formatTHB(exp)}` });
    } catch (e) {
      setImportMsg({ ok: false, text: e instanceof Error ? e.message : "ดึงข้อมูลไม่สำเร็จ" });
    } finally {
      setImporting(false);
    }
  };

  const citResult = useMemo(() => {
    return calculateCIT(revenue, expenses, isSme);
  }, [revenue, expenses, isSme]);

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/tax" className="hover:text-blue-600 transition-colors">
          ภาษี & การเงิน
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-semibold text-slate-800">
          ภาษีเงินได้นิติบุคคล ภ.ง.ด.50 / ภ.ง.ด.51 (CIT Engine)
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>คำนวณภาษีเงินได้นิติบุคคล (Corporate Income Tax)</span>
            <span className="rounded bg-purple-100 text-purple-700 font-mono text-xs px-2 py-0.5 font-bold">
              ภ.ง.ด.50 / 51
            </span>
          </h1>
          <p className="text-sm text-slate-500">
            ระบบคำนวณภาษีนิติบุคคลอัตราสิทธิประโยชน์ SME (ยกเว้นภาษี 300,000 แรก, 15% และ 20%) ตามกำไรสุทธิทางภาษี
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => window.print()}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs gap-1.5"
          >
            <Printer className="h-4 w-4" />
            <span>พิมพ์รายงานภาษี</span>
          </Button>
        </div>
      </div>

      {/* SME Condition Alert Banner */}
      <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-4 text-xs text-purple-900 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold text-sm text-purple-950">
            คุณสมบัติอัตราภาษี SME ตามมาตรา 3 แห่ง พ.ร.ฎ. (ฉบับที่ 530)
          </strong>
          <p className="text-purple-800 mt-1 leading-relaxed">
            1. ทุนจดทะเบียนที่ชำระแล้วในวันสุดท้ายของรอบระยะเวลาบัญชีต้องไม่เกิน 5 ล้านบาท
            <br />
            2. รายได้จากการขายสินค้าและให้บริการในรอบระยะเวลาบัญชีต้องไม่เกิน 30 ล้านบาท
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <span>ผลลัพธ์เป็นการประมาณการเบื้องต้นเท่านั้น กำไรทางบัญชีอาจต่างจากกำไรทางภาษี (รายจ่ายต้องห้าม ค่าเสื่อมราคา ฯลฯ) กรุณาตรวจสอบกับผู้สอบบัญชี/นักบัญชีก่อนยื่นแบบ</span>
      </div>

      {/* Grid: Inputs & Calculation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: P&L INPUTS (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <CardHeader className="p-4 border-b border-slate-100">
              <CardTitle className="text-sm">ข้อมูลงบกำไรขาดทุนทางภาษี (P&L Tax Basis)</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 space-y-2">
                <div className="flex items-center gap-2">
                  <select
                    value={importYear}
                    onChange={(e) => setImportYear(Number(e.target.value))}
                    className="text-xs rounded-md border border-slate-300 px-2 py-1.5 bg-white"
                    aria-label="ปีภาษีที่ต้องการดึงข้อมูล"
                  >
                    {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                      <option key={y} value={y}>ปี {y + 543}</option>
                    ))}
                  </select>
                  <Button type="button" size="sm" variant="outline" onClick={importFromSystem} disabled={importing} className="text-xs gap-1.5">
                    {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    ดึงข้อมูลจากระบบ
                  </Button>
                </div>
                {importMsg && (
                  <p className={`text-[11px] ${importMsg.ok ? "text-emerald-700" : "text-rose-700"}`}>{importMsg.text}</p>
                )}
                <p className="text-[10px] text-slate-500">ใช้ข้อมูลขาย งานซ่อม ค่าใช้จ่าย และเงินเดือนในระบบ แก้ไขตัวเลขเองได้ด้านล่าง</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">
                  รายได้รวมทั้งสิ้น (Total Revenue)
                </label>
                <Input
                  type="number"
                  value={revenue}
                  onChange={(e) => setRevenue(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="font-mono text-base font-bold text-purple-700"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">
                  รายจ่ายในการดำเนินงาน & ต้นทุนขาย (Total Expenses)
                </label>
                <Input
                  type="number"
                  value={expenses}
                  onChange={(e) => setExpenses(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="font-mono text-base font-bold text-slate-800"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  ต้นทุนค่าเครื่อง, อะไหล่, เงินเดือนพนักงาน, ค่าเช่าร้าน, ค่าสาธารณูปโภค
                </span>
              </div>

              {/* SME Toggle */}
              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center justify-between cursor-pointer p-2 rounded-lg border border-slate-200 bg-slate-50">
                  <div>
                    <span className="font-bold text-xs text-slate-900 block">
                      ใช้อัตราภาษีผู้ประกอบการ SME (0% / 15% / 20%)
                    </span>
                    <span className="text-[10px] text-slate-500">
                      ทุนชำระแล้ว &le; 5M และรายได้ &le; 30M
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isSme}
                    onChange={(e) => setIsSme(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                  />
                </label>
              </div>

              {/* Profit Summary */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">รายได้รวม:</span>
                  <span className="font-mono font-semibold">{formatTHB(citResult.revenue)}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>รายจ่ายรวม:</span>
                  <span className="font-mono">-{formatTHB(citResult.expenses)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
                  <span>กำไรสุทธิทางภาษี (Net Profit):</span>
                  <span className="font-mono text-emerald-700">{formatTHB(citResult.netProfit)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: CIT BRACKETS & TOTAL (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border-purple-200 bg-gradient-to-br from-purple-900 to-slate-900 text-white shadow-lg">
            <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs text-purple-200 uppercase tracking-wider font-semibold">
                  ภาษีเงินได้นิติบุคคลที่ต้องชำระ (CIT Payable)
                </span>
                <div className="text-3xl font-black font-mono text-emerald-400 mt-1">
                  {formatTHB(citResult.totalTax)}
                </div>
                <div className="mt-1 text-xs text-purple-200/80">
                  อัตราภาษีที่แท้จริง: <strong>{citResult.effectiveTaxRate.toFixed(2)}%</strong> ของกำไรสุทธิ
                </div>
              </div>

              <div className="bg-white/10 p-3 rounded-xl backdrop-blur-xs text-xs space-y-1 border border-white/10">
                <div className="text-[11px] text-purple-200">แบบแสดงรายการที่ต้องยื่น:</div>
                <div className="font-semibold text-white">ภ.ง.ด.50 (ประจำปี) ภายใน 150 วัน</div>
                <div className="text-[10px] text-purple-200">ภ.ง.ด.51 (ครึ่งปี) ภายใน 2 เดือนหลังครึ่งรอบ</div>
              </div>
            </CardContent>
          </Card>

          {/* SME Tax Brackets Table */}
          <Card>
            <CardHeader className="p-4 border-b border-slate-100">
              <CardTitle className="text-sm">
                ตารางแจกแจงภาษีตามขั้นกำไรสุทธิ (SME Tiered Tax Brackets)
              </CardTitle>
            </CardHeader>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 text-left">ช่วงกำไรสุทธิ</th>
                    <th className="py-2.5 px-3 text-center">อัตราภาษี</th>
                    <th className="py-2.5 px-3 text-right">กำไรในแต่ละช่วง</th>
                    <th className="py-2.5 px-3 text-right">ภาษีที่ต้องชำระ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {citResult.brackets.map((b, idx) => {
                    const isActive = b.taxable > 0;
                    return (
                      <tr
                        key={idx}
                        className={isActive ? "bg-purple-50/40 font-semibold text-slate-900" : "text-slate-400"}
                      >
                        <td className="py-2 px-3">{b.label}</td>
                        <td className="py-2 px-3 text-center">{b.rateLabel}</td>
                        <td className="py-2 px-3 text-right">
                          {isActive ? formatTHB(b.taxable) : "-"}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          {isActive ? formatTHB(b.tax) : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-100/80 font-mono font-bold border-t border-slate-200 text-slate-900">
                  <tr>
                    <td colSpan={3} className="py-2.5 px-3 text-right">
                      รวมภาษีเงินได้นิติบุคคล:
                    </td>
                    <td className="py-2.5 px-3 text-right text-sm text-purple-700">
                      {formatTHB(citResult.totalTax)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
