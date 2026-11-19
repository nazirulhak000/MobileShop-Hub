"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Calculator,
  Calendar,
  Building,
  User,
  Receipt,
  Percent,
  FileSpreadsheet,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Settings,
  HelpCircle,
  TrendingUp,
  FileText,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatTHB } from "@/lib/tax";

const THAI_MONTHS_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const BKK_OFFSET = 7 * 3600 * 1000;
/** Today's date parts in Asia/Bangkok. */
function bkkToday() {
  const d = new Date(Date.now() + BKK_OFFSET);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, day: d.getUTCDate() };
}
const ym = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;
const thaiDate = (y: number, m: number, d: number) => `${d} ${THAI_MONTHS_SHORT[m - 1]} ${y + 543}`;
const daysUntil = (y: number, m: number, d: number) => {
  const t = bkkToday();
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(t.y, t.m - 1, t.day)) / 86400000);
};

type Summary = { totals: { salesRevenue: number; repairRevenue: number; netProfit: number; vatOutput: number } };
type Vat = { outputVat: number; salesBase: number; netVatPayable: number };

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || "โหลดข้อมูลไม่สำเร็จ");
  return json.data as T;
}

export default function TaxOverviewPage() {
  const today = useMemo(() => bkkToday(), []);
  const taxYear = today.y + 543;
  const thisMonth = ym(today.y, today.m);
  const prev = today.m === 1 ? { y: today.y - 1, m: 12 } : { y: today.y, m: today.m - 1 };
  const prevMonth = ym(prev.y, prev.m);

  const [ytd, setYtd] = useState<Summary | null>(null);
  const [vatPrev, setVatPrev] = useState<Vat | null>(null);
  const [vatNow, setVatNow] = useState<Vat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [s, vp, vn] = await Promise.all([
          getJson<Summary>(`/api/reports/summary?from=${today.y}-01&to=${thisMonth}`),
          getJson<Vat>(`/api/tax/vat?month=${prevMonth}`),
          getJson<Vat>(`/api/tax/vat?month=${thisMonth}`),
        ]);
        if (!cancelled) { setYtd(s); setVatPrev(vp); setVatNow(vn); }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [today.y, thisMonth, prevMonth]);

  const ytdRevenue = ytd ? ytd.totals.salesRevenue + ytd.totals.repairRevenue : 0;
  const show = (v: number | undefined) => (loading ? "…" : v === undefined ? "-" : formatTHB(v));

  // Filing deadlines (e-Filing dates), computed from today's Bangkok date.
  const pp30Due = { y: today.y, m: today.m, d: 23 }; // for previous month
  const whtDue = { y: today.y, m: today.m, d: 15 }; // for previous month
  const pnd94Due = { y: today.y, m: 10, d: 8 };
  const pnd90Due = { y: today.y + 1, m: 4, d: 8 };
  const statusOf = (due: { y: number; m: number; d: number }) => {
    const n = daysUntil(due.y, due.m, due.d);
    return n < 0 ? "PASSED" : n <= 10 ? "DUE_SOON" : "UPCOMING";
  };
  const taxDeadlines = [
    {
      title: "ภ.พ.30 (ภาษีมูลค่าเพิ่ม VAT ประจำเดือน)",
      deadline: `${thaiDate(pp30Due.y, pp30Due.m, pp30Due.d)} (e-Filing)`,
      frequency: "รายเดือน",
      status: statusOf(pp30Due),
      actionUrl: "/tax/vat",
      description: `ยอดขายเดือน ${THAI_MONTHS_SHORT[prev.m - 1]} ${prev.y + 543} นำส่งภาษีขายหักภาษีซื้อ`,
    },
    {
      title: "ภ.ง.ด.3 / ภ.ง.ด.53 (ภาษีหัก ณ ที่จ่าย)",
      deadline: `${thaiDate(whtDue.y, whtDue.m, whtDue.d)} (e-Filing)`,
      frequency: "รายเดือน",
      status: statusOf(whtDue),
      actionUrl: "/tax/wht",
      description: `หัก ณ ที่จ่ายของเดือน ${THAI_MONTHS_SHORT[prev.m - 1]} ${prev.y + 543} (ระบบยังไม่บันทึกรายการ WHT)`,
    },
    {
      title: `ภ.ง.ด.94 (ภาษีเงินได้ครึ่งปี ${today.y + 543})`,
      deadline: `${thaiDate(pnd94Due.y, pnd94Due.m, pnd94Due.d)} (e-Filing)`,
      frequency: "ครึ่งปี",
      status: statusOf(pnd94Due),
      actionUrl: "/tax/pit",
      description: "คำนวณรายได้ ม.ค. - มิ.ย.",
    },
    {
      title: `ภ.ง.ด.90 (ภาษีเงินได้ประจำปี ${today.y + 543})`,
      deadline: `${thaiDate(pnd90Due.y, pnd90Due.m, pnd90Due.d)} (e-Filing)`,
      frequency: "รายปี",
      status: statusOf(pnd90Due),
      actionUrl: "/tax/pit",
      description: "สรุปรายได้ทั้งปี หักค่าใช้จ่ายและลดหย่อน",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              ศูนย์รวมการจัดการภาษี & บัญชี (Tax Management Hub)
            </h1>
            <Badge variant="outline" className="border-blue-300 bg-blue-50/50 text-blue-700 font-medium">
              ปีภาษี {taxYear}
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            ภาพรวมภาษีเงินได้บุคคลธรรมดา (ภ.ง.ด.90/94), นิติบุคคล (ภ.ง.ด.50), ภาษีมูลค่าเพิ่ม (ภ.พ.30) และปฏิทินยื่นภาษี
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/tax/settings" className="inline-flex items-center gap-1.5 h-8 px-3 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50">
            <Settings className="h-4 w-4 text-slate-600" />
            <span>ตั้งค่าภาษี & ลดหย่อน</span>
          </Link>
          <Link href="/tax/pit" className="inline-flex items-center gap-1.5 h-8 px-3 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
            <Calculator className="h-4 w-4" />
            <span>คำนวณภาษีปี {taxYear}</span>
          </Link>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <AlertTriangle className="h-4 w-4" />{error}
        </div>
      )}

      {/* 4 Core Stat Cards (real data) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">รายได้ตั้งแต่ต้นปี (ไม่รวม VAT)</span>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{show(ytd ? ytdRevenue : undefined)}</div>
            <div className="mt-1 text-[11px] text-slate-400">กำไรสุทธิโดยประมาณ {show(ytd?.totals.netProfit)}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">ภ.พ.30 เดือน {THAI_MONTHS_SHORT[prev.m - 1]} (ภาษีขาย)</span>
              <Receipt className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-700">{show(vatPrev?.netVatPayable)}</div>
            <div className="mt-1 text-[11px] text-slate-400">ยังไม่หักภาษีซื้อ (ระบบไม่ได้บันทึก)</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">ภาษีขายเดือนนี้ (สะสม)</span>
              <FileText className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-indigo-700">{show(vatNow?.outputVat)}</div>
            <div className="mt-1 text-[11px] text-slate-400">ยอดขายก่อน VAT {show(vatNow?.salesBase)}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">ภาษีหัก ณ ที่จ่าย (ภ.ง.ด.3/53)</span>
              <Percent className="h-4 w-4 text-purple-600" />
            </div>
            <div className="mt-2 text-base font-bold text-slate-400">ไม่ได้บันทึกในระบบ</div>
            <div className="mt-1 text-[11px] text-slate-400">ใช้เครื่องคิดเลข WHT และเก็บสำเนา 50 ทวิ เอง</div>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Tax Modules Navigation & Deadlines Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: TAX CALCULATION ENGINES (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-blue-600" />
            <span>ระบบคำนวณและเตรียมแบบยื่นภาษี (Tax Engines)</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Engine 1: PIT */}
            <Link href="/tax/pit" className="group">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-blue-400 hover:shadow-md transition-all h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="rounded-md bg-blue-100 p-2 text-blue-700">
                      <User className="h-5 w-5" />
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      ภ.ง.ด.90 / 94
                    </Badge>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                    ภาษีเงินได้บุคคลธรรมดา (PIT)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    คำนวณตามขั้นบันได 0% - 35% หักเหมา 60% หรือตามจริง พร้อมหักลดหย่อน 4 กลุ่ม (ประมาณการ)
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600">
                  <span>เปิดเครื่องคิดเลขภาษี</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>

            {/* Engine 2: CIT */}
            <Link href="/tax/cit" className="group">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-purple-400 hover:shadow-md transition-all h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="rounded-md bg-purple-100 p-2 text-purple-700">
                      <Building className="h-5 w-5" />
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      ภ.ง.ด.50 / 51
                    </Badge>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 group-hover:text-purple-600 transition-colors">
                    ภาษีเงินได้นิติบุคคล (CIT)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    อัตราภาษี SME 0% - 20% คำนวณจากกำไรสุทธิทางภาษี (Net Taxable Profit)
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-purple-600">
                  <span>คำนวณกำไรสุทธิ & ภาษี</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>

            {/* Engine 3: VAT */}
            <Link href="/tax/vat" className="group">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-emerald-400 hover:shadow-md transition-all h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="rounded-md bg-emerald-100 p-2 text-emerald-700">
                      <Receipt className="h-5 w-5" />
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      ภ.พ.30 (7%)
                    </Badge>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 group-hover:text-emerald-600 transition-colors">
                    ภาษีมูลค่าเพิ่ม (VAT 7%)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    สรุปรายงานภาษีขายจากบิล POS รายเดือน (ภาษีซื้อยังไม่ถูกบันทึกในระบบ)
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-600">
                  <span>สรุปยอด ภ.พ.30 ประจำเดือน</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>

            {/* Engine 4: WHT */}
            <Link href="/tax/wht" className="group">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-indigo-400 hover:shadow-md transition-all h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="rounded-md bg-indigo-100 p-2 text-indigo-700">
                      <Percent className="h-5 w-5" />
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      ภ.ง.ด.3 / 53
                    </Badge>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                    ภาษีหัก ณ ที่จ่าย (WHT)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    บันทึกหนังสือรับรองการหัก ณ ที่จ่าย (50 ทวิ) ค่าจ้างช่างภายนอก 3% และค่าเช่า 5%
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
                  <span>ดูรายการหัก ณ ที่จ่าย</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* RIGHT COLUMN: TAX CALENDAR & FILING DEADLINES (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-600" />
              <span>ปฏิทินยื่นภาษีสรรพากร (e-Filing Deadlines)</span>
            </h2>
          </div>

          <Card>
            <div className="divide-y divide-slate-100">
              {taxDeadlines.map((item, idx) => {
                const statusBadge =
                  item.status === "DUE_SOON" ? (
                    <Badge variant="danger" className="text-[10px] animate-pulse">
                      ใกล้ถึงกำหนด
                    </Badge>
                  ) : item.status === "PASSED" ? (
                    <Badge variant="outline" className="text-[10px]">
                      เลยกำหนดแล้ว
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="text-[10px]">
                      รอบถัดไป
                    </Badge>
                  );

                return (
                  <div key={idx} className="p-3.5 hover:bg-slate-50/70 transition-colors space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{item.title}</span>
                      {statusBadge}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono font-semibold text-blue-700">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>{item.deadline}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">{item.description}</p>
                    <div className="pt-1 flex justify-end">
                      <Link href={item.actionUrl} className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1">
                        <span>ไปที่หน้านี้</span>
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
