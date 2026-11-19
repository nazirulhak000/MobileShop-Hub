"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Receipt,
  Building2,
  Calendar,
  ChevronRight,
  TrendingUp,
  Percent,
  Download,
  Printer,
  CheckCircle2,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  FileText,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatTHB } from "@/lib/tax";

export default function VatFilingPage() {
  const { currentBranch } = useApp();
  const [selectedMonth, setSelectedMonth] = useState("10"); // October 2568
  const [taxYear] = useState("2568");

  // Sample sales output VAT data
  const outputSalesData = [
    { id: "INV-202610-0089", date: "28/10/2568", customer: "คุณวรวิทย์ พัฒนากุล", amountBeforeVat: 23271.03, vat: 1628.97, total: 24900 },
    { id: "INV-202610-0090", date: "29/10/2568", customer: "บริษัท ดิจิทัลเวิลด์ จำกัด", amountBeforeVat: 54205.61, vat: 3794.39, total: 58000 },
    { id: "INV-202610-0091", date: "30/10/2568", customer: "ลูกค้าทั่วไป (Walk-in)", amountBeforeVat: 18598.13, vat: 1301.87, total: 19900 },
    { id: "INV-202610-0092", date: "31/10/2568", customer: "คุณศิริพร บุญรักษา", amountBeforeVat: 41962.62, vat: 2937.38, total: 44900 },
  ];

  // Sample purchases input VAT data
  const inputPurchaseData = [
    { id: "PO-202610-0012", date: "15/10/2568", supplier: "Synnex Thailand PCL", desc: "อะไหล่จอ OLED & แบตเตอรี่แท้", amountBeforeVat: 65420.56, vat: 4579.44, total: 70000 },
    { id: "PO-202610-0013", date: "22/10/2568", supplier: "Com7 Public Co., Ltd.", desc: "อุปกรณ์เสริม Anker & Remax", amountBeforeVat: 32710.28, vat: 2289.72, total: 35000 },
    { id: "PO-202610-0014", date: "26/10/2568", supplier: "True Distribution", desc: "สต็อกเครื่อง iPhone & Galaxy", amountBeforeVat: 112149.53, vat: 7850.47, total: 120000 },
  ];

  const totalOutputBeforeVat = 650000;
  const totalOutputVat = 45500; // 7% of 650,000

  const totalInputBeforeVat = 445714.29;
  const totalInputVat = 31200; // 7% of 445,714.29

  const netVatPayable = totalOutputVat - totalInputVat; // 14,300 THB

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/tax" className="hover:text-blue-600 transition-colors">
          ภาษี & การเงิน
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-semibold text-slate-800">
          ภาษีมูลค่าเพิ่ม ภ.พ.30 (Value Added Tax 7%)
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>แบบยื่นภาษีมูลค่าเพิ่ม (ภ.พ.30 e-Filing)</span>
            <span className="rounded bg-emerald-100 text-emerald-800 font-mono text-xs px-2 py-0.5 font-bold">
              VAT 7%
            </span>
          </h1>
          <p className="text-sm text-slate-500">
            สรุปยอดภาษีขายจากบิล POS และภาษีซื้อจากการสั่งซื้ออะไหล่ นำส่งกรมสรรพากรภายในวันที่ 23 ของเดือนถัดไป
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Month selector */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
          >
            <option value="9">กันยายน 2568</option>
            <option value="10">ตุลาคม 2568</option>
            <option value="11">พฤศจิกายน 2568</option>
            <option value="12">ธันวาคม 2568</option>
          </select>

          <Button
            size="sm"
            onClick={() => window.print()}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs gap-1.5"
          >
            <Printer className="h-4 w-4" />
            <span>พิมพ์แบบ ภ.พ.30</span>
          </Button>
        </div>
      </div>

      {/* 3 Core VAT Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Output VAT */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">1. ภาษีขาย (Output VAT)</span>
              <span className="rounded-full bg-emerald-100 p-1 text-emerald-700">
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900">
              {formatTHB(totalOutputVat)}
            </div>
            <div className="text-[11px] text-slate-500">
              ยอดขายที่เสียภาษี: <span className="font-mono font-semibold">{formatTHB(totalOutputBeforeVat)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Input VAT */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">2. ภาษีซื้อ (Input VAT)</span>
              <span className="rounded-full bg-blue-100 p-1 text-blue-700">
                <ArrowDownRight className="h-4 w-4" />
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900">
              {formatTHB(totalInputVat)}
            </div>
            <div className="text-[11px] text-slate-500">
              ยอดซื้ออะไหล่/สินค้า: <span className="font-mono font-semibold">{formatTHB(totalInputBeforeVat)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Net VAT Payable */}
        <Card className="bg-emerald-900 text-white shadow-md">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-200">3. ภาษีที่ต้องชำระสุทธิ (Net VAT)</span>
              <Badge variant="success" className="text-[10px] bg-emerald-800 text-emerald-100 border-emerald-700">
                ยื่นภายใน 23 พ.ย.
              </Badge>
            </div>
            <div className="text-3xl font-extrabold font-mono text-emerald-400">
              {formatTHB(netVatPayable)}
            </div>
            <div className="text-[11px] text-emerald-200/80">
              (ภาษีขาย {formatTHB(totalOutputVat)} - ภาษีซื้อ {formatTHB(totalInputVat)})
            </div>
          </CardContent>
        </Card>
      </div>

      {/* VAT Filing Ledger: Sales vs Purchases */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Output VAT Report */}
        <Card>
          <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm">รายงานภาษีขาย (Sales Tax Invoice Report)</CardTitle>
              <CardDescription>บิล POS และใบกำกับภาษีเต็มรูปที่ออกให้ลูกค้า</CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px]">
              สาขา {currentBranch.code}
            </Badge>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2 px-3 text-left">เลขที่บิล / วันที่</th>
                  <th className="py-2 px-3 text-left">ลูกค้า</th>
                  <th className="py-2 px-3 text-right">ก่อน VAT</th>
                  <th className="py-2 px-3 text-right">VAT 7%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {outputSalesData.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3">
                      <div className="font-bold text-slate-900">{it.id}</div>
                      <div className="text-[10px] text-slate-400">{it.date}</div>
                    </td>
                    <td className="py-2 px-3 font-sans text-slate-700">{it.customer}</td>
                    <td className="py-2 px-3 text-right text-slate-600">{formatTHB(it.amountBeforeVat)}</td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-700">{formatTHB(it.vat)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Input VAT Report */}
        <Card>
          <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm">รายงานภาษีซื้อ (Purchase Tax Report)</CardTitle>
              <CardDescription>ใบกำกับภาษีซื้อจากการสั่งซื้ออะไหล่จาก Supplier</CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px]">
              หักลดหย่อนได้
            </Badge>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2 px-3 text-left">เลขที่ PO / วันที่</th>
                  <th className="py-2 px-3 text-left">ผู้จัดจำหน่าย / รายการ</th>
                  <th className="py-2 px-3 text-right">ก่อน VAT</th>
                  <th className="py-2 px-3 text-right">ภาษีซื้อ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {inputPurchaseData.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3">
                      <div className="font-bold text-slate-900">{it.id}</div>
                      <div className="text-[10px] text-slate-400">{it.date}</div>
                    </td>
                    <td className="py-2 px-3 font-sans">
                      <div className="font-semibold text-slate-800">{it.supplier}</div>
                      <div className="text-[10px] text-slate-400">{it.desc}</div>
                    </td>
                    <td className="py-2 px-3 text-right text-slate-600">{formatTHB(it.amountBeforeVat)}</td>
                    <td className="py-2 px-3 text-right font-bold text-blue-700">{formatTHB(it.vat)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
