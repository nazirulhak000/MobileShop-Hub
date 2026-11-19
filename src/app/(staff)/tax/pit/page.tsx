"use client";

import React, { useState, useMemo } from "react";
import { Download, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import {
  Calculator,
  User,
  Scale,
  Receipt,
  PiggyBank,
  CheckCircle2,
  ChevronRight,
  TrendingDown,
  Percent,
  Printer,
  Sparkles,
  Info,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { calculatePIT, DEFAULT_TAX_SETTINGS, TaxSettings, formatTHB } from "@/lib/tax";

export default function PersonalIncomeTaxPage() {
  const { currentBranch } = useApp();
  const [revenue, setRevenue] = useState<number>(3850000);
  const [filingType, setFilingType] = useState<"PND90" | "PND94">("PND90");
  const [settings, setSettings] = useState<TaxSettings>(DEFAULT_TAX_SETTINGS);

  // Revenue is entered for the filing period itself: full year (ภ.ง.ด.90) or Jan-Jun (ภ.ง.ด.94).
  // ภ.ง.ด.94 halves the personal/family allowances inside calculatePIT.
  const halfYear = filingType === "PND94";
  const pitResult = useMemo(() => calculatePIT(revenue, settings, { halfYear }), [revenue, settings, halfYear]);

  // Prefill from real system data (manual entry still allowed).
  const currentYear = new Date(Date.now() + 7 * 3600 * 1000).getUTCFullYear();
  const [importYear, setImportYear] = useState<number>(currentYear);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const importFromSystem = async () => {
    setImporting(true);
    setImportMsg(null);
    try {
      const qs = new URLSearchParams({ from: `${importYear}-01`, to: halfYear ? `${importYear}-06` : `${importYear}-12` });
      const res = await fetch(`/api/reports/summary?${qs}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "ดึงข้อมูลไม่สำเร็จ");
      const t = json.data.totals;
      const rev = Math.round((t.salesRevenue + t.repairRevenue) * 100) / 100;
      const exp = Math.round((t.cogs + t.repairPartsCost + t.expenses + t.payroll) * 100) / 100;
      setRevenue(rev);
      setSettings((prev) => ({ ...prev, actualExpenses: exp }));
      setImportMsg({
        ok: true,
        text: `ดึงข้อมูล${halfYear ? " ม.ค.–มิ.ย." : "ทั้งปี"} ${importYear + 543} แล้ว: รายรับ (ไม่รวม VAT) ${formatTHB(rev)} · ค่าใช้จ่ายจริง ${formatTHB(exp)}`,
      });
    } catch (e) {
      setImportMsg({ ok: false, text: e instanceof Error ? e.message : "ดึงข้อมูลไม่สำเร็จ" });
    } finally {
      setImporting(false);
    }
  };

  // Comparison: What if we switched between Flat 60% and Actual?
  const comparisonResult = useMemo(() => {
    const alternativeMethod: "FLAT_60" | "ACTUAL" = settings.expenseDeductionMethod === "FLAT_60" ? "ACTUAL" : "FLAT_60";
    const altSettings: TaxSettings = { ...settings, expenseDeductionMethod: alternativeMethod };
    const altResult = calculatePIT(revenue, altSettings, { halfYear });
    const diff = pitResult.finalTaxPayable - altResult.finalTaxPayable;

    return {
      alternativeMethod,
      altTax: altResult.finalTaxPayable,
      diff,
      isBetter: diff > 0, // Alt pays less tax
    };
  }, [revenue, halfYear, settings, pitResult]);

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/tax" className="hover:text-blue-600 transition-colors">
          ภาษี & การเงิน
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-semibold text-slate-800">
          ภาษีเงินได้บุคคลธรรมดา ภ.ง.ด.90 / ภ.ง.ด.94 (PIT Engine)
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>เครื่องคิดเลขภาษีเงินได้บุคคลธรรมดา 2568</span>
            <span className="rounded bg-blue-100 text-blue-700 font-mono text-xs px-2 py-0.5 font-bold">
              ม.40(8)
            </span>
          </h1>
          <p className="text-sm text-slate-500">
            จำลองแบบยื่น ภ.ง.ด.90 (รายปี) และ ภ.ง.ด.94 (ครึ่งปี) ตามขั้นบันได 0% - 35% พร้อมเปรียบเทียบหักเหมา 60% vs ตามจริง
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/tax/settings">
            <Button variant="outline" size="sm" className="text-xs">
              ปรับปรุงค่าลดหย่อน
            </Button>
          </Link>
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

      {/* Type Toggle: ภ.ง.ด.90 vs ภ.ง.ด.94 */}
      <div className="flex items-center justify-between bg-slate-100 p-1 rounded-xl max-w-md">
        <button
          type="button"
          onClick={() => setFilingType("PND90")}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            filingType === "PND90" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          ภ.ง.ด.90 (เต็มปี ม.ค. - ธ.ค.)
        </button>
        <button
          type="button"
          onClick={() => setFilingType("PND94")}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            filingType === "PND94" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          ภ.ง.ด.94 (ครึ่งปี ม.ค. - มิ.ย.)
        </button>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <span>
          ผลลัพธ์เป็นการประมาณการเบื้องต้นเท่านั้น กรุณาตรวจสอบกับนักบัญชีหรือกรมสรรพากรก่อนยื่นแบบ
          {halfYear && " · ภ.ง.ด.94: กรอกรายรับเฉพาะ ม.ค.–มิ.ย. ระบบหักลดหย่อนส่วนตัว/คู่สมรส/บุตร/บิดามารดา ครึ่งหนึ่ง"}
        </span>
      </div>

      {/* Grid: Inputs & Live Calculation Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: REVENUE & EXPENSES INPUTS (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <CardHeader className="p-4 border-b border-slate-100">
              <CardTitle className="text-sm">ฐานรายได้พึงประเมิน ({halfYear ? "ม.ค.–มิ.ย." : "ทั้งปี"})</CardTitle>
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
                {importMsg && <p className={`text-[11px] ${importMsg.ok ? "text-emerald-700" : "text-rose-700"}`}>{importMsg.text}</p>}
                <p className="text-[10px] text-slate-500">รายรับจากยอดขาย (ไม่รวม VAT) + งานซ่อม · ค่าใช้จ่ายจริง = ต้นทุนขาย + อะไหล่ + ค่าใช้จ่ายร้าน + เงินเดือน</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">
                  รายรับจากยอดขายหน้าร้านและค่าบริการซ่อม (บาท)
                </label>
                <Input
                  type="number"
                  value={revenue}
                  onChange={(e) => setRevenue(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="font-mono text-base font-bold text-blue-700"
                />
                <div className="mt-1 flex gap-1.5">
                  {[1500000, 2500000, 3850000, 5000000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setRevenue(val)}
                      className="rounded border border-slate-200 px-2 py-0.5 text-[10px] font-mono text-slate-600 hover:bg-slate-100"
                    >
                      {formatTHB(val)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Deduction Method Selector */}
              <div className="pt-2 border-t border-slate-100">
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                  วิธีหักค่าใช้จ่าย
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, expenseDeductionMethod: "FLAT_60" })}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      settings.expenseDeductionMethod === "FLAT_60"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-200"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    <div className="font-bold">หักเหมา 60%</div>
                    <div className="text-[10px] text-slate-500">ตามกฎหมายกำหนด</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, expenseDeductionMethod: "ACTUAL" })}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      settings.expenseDeductionMethod === "ACTUAL"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-200"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    <div className="font-bold">หักตามจริง</div>
                    <div className="text-[10px] text-slate-500">
                      {formatTHB(settings.actualExpenses)}
                    </div>
                  </button>
                </div>
              </div>

              {/* Deduction Breakdown Details */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">รายได้พึงประเมิน:</span>
                  <span className="font-mono font-semibold">{formatTHB(pitResult.revenue)}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>หักค่าใช้จ่าย ({settings.expenseDeductionMethod === "FLAT_60" ? "เหมา 60%" : "ตามจริง"}):</span>
                  <span className="font-mono">-{formatTHB(pitResult.expenseAmount)}</span>
                </div>
                <div className="flex justify-between text-indigo-700">
                  <span>หักค่าลดหย่อนรวม 4 กลุ่ม:</span>
                  <span className="font-mono">-{formatTHB(pitResult.allowanceBreakdown.totalAllowances)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
                  <span>เงินได้สุทธิที่นำไปคำนวณภาษี:</span>
                  <span className="font-mono text-blue-700">{formatTHB(pitResult.netTaxableIncome)}</span>
                </div>
              </div>

              {/* Comparison Advice Card */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-xs space-y-1.5 text-amber-950">
                <div className="font-bold flex items-center gap-1.5 text-amber-900">
                  <Sparkles className="h-4 w-4 text-amber-600" />
                  <span>ผลวิเคราะห์วิธีหักค่าใช้จ่ายที่คุ้มกว่า:</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-700">
                  หากเปลี่ยนเป็นหัก{" "}
                  <strong>{comparisonResult.alternativeMethod === "FLAT_60" ? "เหมา 60%" : "ตามจริง"}</strong> จะเสียภาษี{" "}
                  <strong>{formatTHB(comparisonResult.altTax)}</strong>{" "}
                  {comparisonResult.isBetter ? (
                    <span className="text-emerald-700 font-bold">
                      (ประหยัดภาษีได้มากกว่า {formatTHB(comparisonResult.diff)})
                    </span>
                  ) : (
                    <span className="text-slate-500 font-normal">
                      (วิธีปัจจุบันคุ้มกว่า {formatTHB(Math.abs(comparisonResult.diff))})
                    </span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: TAX BRACKETS & FINAL TAX (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Main Grand Total Tax Card */}
          <Card className="border-blue-200 bg-gradient-to-br from-blue-900 to-indigo-950 text-white shadow-lg">
            <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs text-blue-200 uppercase tracking-wider font-semibold">
                  ภาษีเงินได้บุคคลธรรมดาที่ต้องชำระสุทธิ
                </span>
                <div className="text-3xl font-black font-mono text-emerald-400 mt-1">
                  {formatTHB(pitResult.finalTaxPayable)}
                </div>
                <div className="mt-1 text-xs text-blue-200/80">
                  อัตราภาษีที่แท้จริง (Effective Tax Rate): <strong>{pitResult.effectiveTaxRate.toFixed(2)}%</strong> ของรายได้
                </div>
              </div>

              <div className="bg-white/10 p-3 rounded-xl backdrop-blur-xs text-xs space-y-1 border border-white/10">
                <div className="text-[11px] text-blue-200">เกณฑ์คำนวณขั้นต่ำ ม.40(8):</div>
                <div className="font-mono text-xs">
                  ร้อยละ 0.5 ของรายรับ (เมื่อรายรับ ≥ 1 ล้าน และเกิน 5,000 บาท) = {formatTHB(pitResult.flatHalfPercent)}
                </div>
                <div className="text-[10px] text-emerald-300">
                  {pitResult.progressiveTax >= pitResult.flatHalfPercent
                    ? "✓ เสียตามอัตราก้าวหน้า (สูงกว่าเกณฑ์ขั้นต่ำ)"
                    : "เสียตามเกณฑ์ร้อยละ 0.5 ของรายรับ"}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progressive Brackets Table */}
          <Card>
            <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm">รายละเอียดการคำนวณตามขั้นบันไดภาษี</CardTitle>
                <CardDescription>เกณฑ์อัตราก้าวหน้าประมวลรัษฎากร 8 ขั้น (0% - 35%)</CardDescription>
              </div>
            </CardHeader>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 text-left">ขั้นเงินได้สุทธิ</th>
                    <th className="py-2.5 px-3 text-center">อัตราภาษี</th>
                    <th className="py-2.5 px-3 text-right">เงินได้ในขั้น</th>
                    <th className="py-2.5 px-3 text-right">ภาษีแต่ละขั้น</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {pitResult.bracketDetails.map((b, idx) => {
                    const isActive = b.taxableInBracket > 0;
                    return (
                      <tr
                        key={idx}
                        className={isActive ? "bg-blue-50/40 font-semibold text-slate-900" : "text-slate-400"}
                      >
                        <td className="py-2 px-3">{b.label}</td>
                        <td className="py-2 px-3 text-center">{b.rateLabel}</td>
                        <td className="py-2 px-3 text-right">
                          {isActive ? formatTHB(b.taxableInBracket) : "-"}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          {isActive ? formatTHB(b.taxAmount) : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-100/80 font-mono font-bold border-t border-slate-200 text-slate-900">
                  <tr>
                    <td colSpan={3} className="py-2.5 px-3 text-right">
                      รวมภาษีตามอัตราก้าวหน้า:
                    </td>
                    <td className="py-2.5 px-3 text-right text-sm text-blue-700">
                      {formatTHB(pitResult.progressiveTax)}
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
