"use client";

import React, { useState } from "react";
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
import { useApp } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatTHB } from "@/lib/tax";

export default function TaxOverviewPage() {
  const { currentBranch } = useApp();

  // Mock Tax metrics based on store revenue
  const [taxYear] = useState(2568);
  const estimatedAnnualSales = 3850000;
  const estimatedNetProfit = 680000;
  const estimatedPitTax = 54500;
  const monthlyOutputVat = 45500;
  const monthlyInputVat = 31200;
  const netVatPayable = monthlyOutputVat - monthlyInputVat;
  const whtMonthlyPayable = 3850;

  // Revenue Department e-Filing Calendar Deadlines for 2568
  const taxDeadlines = [
    {
      title: "ภ.พ.30 (ภาษีมูลค่าเพิ่ม VAT ประจำเดือน)",
      deadline: "23 พ.ย. 2568 (e-Filing)",
      frequency: "รายเดือน",
      status: "DUE_SOON",
      actionUrl: "/tax/vat",
      description: "ยอดขายเดือน ต.ค. 2568 นำส่งภาษีขายหักภาษีซื้อสุทธิ",
    },
    {
      title: "ภ.ง.ด.3 / ภ.ง.ด.53 (ภาษีหัก ณ ที่จ่าย)",
      deadline: "15 พ.ย. 2568 (e-Filing)",
      frequency: "รายเดือน",
      status: "UPCOMING",
      actionUrl: "/tax/wht",
      description: "หัก ณ ที่จ่าย ค่าบริการซ่อม 3%, ค่าเช่าพื้นที่ร้าน 5%",
    },
    {
      title: "ภ.ง.ด.94 (ภาษีเงินได้บุคคลธรรมดาครึ่งปี)",
      deadline: "8 ต.ค. 2568 (เสร็จสิ้น)",
      frequency: "ครึ่งปี",
      status: "COMPLETED",
      actionUrl: "/tax/pit",
      description: "คำนวณรายได้ ม.ค. - มิ.ย. ยื่นชำระเรียบร้อย",
    },
    {
      title: "ภ.ง.ด.90 / 50 (ภาษีเงินได้ประจำปี 2568)",
      deadline: "8 เม.ย. 2569 (e-Filing)",
      frequency: "รายปี",
      status: "PLANNED",
      actionUrl: "/tax/pit",
      description: "สรุปรายได้ทั้งปี หักค่าใช้จ่ายและลดหย่อน 4 กลุ่ม",
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
          <Link href="/tax/settings">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Settings className="h-4 w-4 text-slate-600" />
              <span>ตั้งค่าภาษี & ลดหย่อน 2568</span>
            </Button>
          </Link>

          <Link href="/tax/pit">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-sm text-xs">
              <Calculator className="h-4 w-4" />
              <span>คำนวณภาษีปี 2568</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Core Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Estimated PIT */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">ภาษีเงินได้ทั้งปีประมาณการ</span>
              <Calculator className="h-4 w-4 text-blue-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {formatTHB(estimatedPitTax)}
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
              <span>ฐานรายได้รวม {formatTHB(estimatedAnnualSales)}</span>
            </div>
          </CardContent>
        </Card>

        {/* VAT ภ.พ.30 Net Balance */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">ภ.พ.30 เดือนนี้ (ภาษีสุทธิ)</span>
              <Receipt className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-700">
              {formatTHB(netVatPayable)}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              ภาษีขาย {formatTHB(monthlyOutputVat)} - ซื้อ {formatTHB(monthlyInputVat)}
            </div>
          </CardContent>
        </Card>

        {/* WHT Balance */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">ภาษีหัก ณ ที่จ่าย (ภ.ง.ด.3/53)</span>
              <Percent className="h-4 w-4 text-purple-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {formatTHB(whtMonthlyPayable)}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              ค่าบริการ 3% และค่าเช่า 5% รวม 4 รายการ
            </div>
          </CardContent>
        </Card>

        {/* Allowances Used */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">สิทธิลดหย่อนที่ใช้แล้ว</span>
              <ShieldCheck className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-indigo-700">
              {formatTHB(284000)}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              ลดหย่อน 4 กลุ่ม (ตนเอง, ประกัน, Thai ESG)
            </div>
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
                    คำนวณตามขั้นบันได 0% - 35% หักเหมา 60% หรือตามจริง พร้อมหักลดหย่อน 4 กลุ่มปี 2568
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
                    สรุปรายงานภาษีขายจากบิล POS หักด้วยภาษีซื้อจากการสั่งซื้ออะไหล่ นำส่งกรมสรรพากร
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
                  ) : item.status === "COMPLETED" ? (
                    <Badge variant="success" className="text-[10px]">
                      ยื่นแล้ว
                    </Badge>
                  ) : item.status === "UPCOMING" ? (
                    <Badge variant="warning" className="text-[10px]">
                      รอบถัดไป
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">
                      ตามกำหนดปี
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
