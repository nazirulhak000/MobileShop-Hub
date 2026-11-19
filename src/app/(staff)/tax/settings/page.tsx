"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Settings,
  Building,
  User,
  ShieldCheck,
  Percent,
  Receipt,
  Heart,
  PiggyBank,
  Home,
  Gift,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Info,
  ArrowRight,
  Calculator,
  ChevronRight,
  Scale,
  Sparkles,
  Coins,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { DEFAULT_TAX_SETTINGS, TaxSettings, formatTHB } from "@/lib/tax";
import { DemoBanner } from "@/components/ui/DemoBanner";

export default function TaxSettingsPage() {
  const { currentBranch } = useApp();
  const [settings, setSettings] = useState<TaxSettings>(DEFAULT_TAX_SETTINGS);

  // Computed allowance totals per group
  const allowancesSummary = useMemo(() => {
    // Group 1
    const g1Personal = 60000;
    const g1Spouse = settings.spouseAllowance ? 60000 : 0;
    const g1Child = (settings.childCount || 0) * 30000;
    const g1Parents = Math.min(4, settings.parentsCount || 0) * 30000;
    const g1ParentsHealth = Math.min(15000, settings.parentsHealthInsurance || 0);
    const g1Total = g1Personal + g1Spouse + g1Child + g1Parents + g1ParentsHealth;

    // Group 2
    const rawHealth = Math.min(25000, settings.healthInsurance || 0);
    const rawLife = Math.min(100000, settings.lifeInsurance || 0);
    const g2LifeAndHealth = Math.min(100000, rawLife + rawHealth);
    const g2SocialSecurity = Math.min(9000, settings.socialSecurity || 0);
    const rawRmf = Math.min(500000, settings.rmfFund || 0);
    const rawSsf = Math.min(200000, settings.ssfFund || 0);
    const rawPvd = Math.min(500000, settings.providentFund || 0);
    const retirementPool = Math.min(500000, rawRmf + rawSsf + rawPvd);
    const g2ThaiEsg = Math.min(300000, settings.thaiEsgFund || 0);
    const g2Total = g2LifeAndHealth + g2SocialSecurity + retirementPool + g2ThaiEsg;

    // Group 3
    const g3HomeLoan = Math.min(100000, settings.homeLoanInterest || 0);
    const g3EasyEReceipt = Math.min(50000, settings.easyEReceipt || 0);
    const g3Total = g3HomeLoan + g3EasyEReceipt;

    // Group 4
    const g4Education2x = (settings.educationDonation || 0) * 2;
    const g4General = settings.generalDonation || 0;
    const g4Total = g4Education2x + g4General;

    const grandTotal = g1Total + g2Total + g3Total + g4Total;

    return {
      g1Total,
      g2Total,
      g3Total,
      g4Total,
      grandTotal,
    };
  }, [settings]);

  return (
    <div className="space-y-6 w-full pb-12">
      <DemoBanner message="การตั้งค่าภาษีและค่าลดหย่อนในหน้านี้ยังไม่ถูกบันทึกลงฐานข้อมูล ใช้เพื่อดูสรุปสิทธิลดหย่อนเท่านั้น และจะกลับเป็นค่าเริ่มต้นเมื่อรีเฟรชหน้า" />

      {/* Breadcrumb Navigation - Matching Screenshot */}
      <div>
        <Link href="/tax" className="text-xs text-slate-500 hover:text-teal-600 transition-colors inline-flex items-center gap-1 font-medium">
          <span>← กลับหน้าภาษี</span>
        </Link>
      </div>

      {/* Page Title - Matching Screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            ตั้งค่าภาษี
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            ประเภทผู้เสียภาษี วิธีหักค่าใช้จ่าย และค่าลดหย่อน 4 กลุ่ม ตาม ภ.ง.ด.90 ปี 2568
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/tax/pit">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-xl border-slate-200 hover:bg-slate-50">
              <Calculator className="h-4 w-4 text-teal-600" />
              <span>คำนวณ ภ.ง.ด.90/94</span>
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================= LEFT COLUMN: SETTINGS FORM ================= */}
        <div className="lg:col-span-8 space-y-6">
          {/* CARD 1: TAXPAYER PROFILE & EXPENSE METHOD - Matching Screenshot */}
          <Card className="rounded-2xl border-slate-200/90 shadow-2xs">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-emerald-600" />
                <CardTitle className="text-base font-bold text-slate-900">ภาษีเงินได้ (ภ.ง.ด.)</CardTitle>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-5">
              {/* Scope Alert Box - Exact Copy from Screenshot */}
              <div className="rounded-xl border border-sky-200/80 bg-sky-50/70 p-3.5 text-xs text-sky-900 flex items-start gap-2.5">
                <Info className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong className="font-semibold text-sky-950">ขอบเขต:</strong> การตั้งค่านี้ใช้กับทั้ง <span className="font-semibold">tenant</span> ไม่ใช่ระดับสาขา เนื่องจากภาษีเงินได้บุคคลธรรมดายื่นในนามบุคคลคนเดียว (เจ้าของกิจการ) ที่รวมรายได้ทุกสาขา
                </p>
              </div>

              {/* Taxpayer Type Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-2 block">
                  ประเภทผู้เสียภาษี (Taxpayer Entity Type)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setSettings({ ...settings, taxpayerType: "INDIVIDUAL" })}
                    className={`rounded-xl border p-4 cursor-pointer transition-all ${
                      settings.taxpayerType === "INDIVIDUAL"
                        ? "border-teal-500 bg-teal-50/60 ring-2 ring-teal-100"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-blue-600" />
                        <span className="font-bold text-sm text-slate-900">บุคคลธรรมดา</span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        ภ.ง.ด.90 / 94
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      อัตราภาษีก้าวหน้า 0% - 35% หักค่าลดหย่อนส่วนตัวและครอบครัวได้
                    </p>
                  </div>

                  <div
                    onClick={() => setSettings({ ...settings, taxpayerType: "CORPORATE" })}
                    className={`rounded-xl border p-4 cursor-pointer transition-all ${
                      settings.taxpayerType === "CORPORATE"
                        ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20 shadow-xs"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-purple-600" />
                        <span className="font-bold text-sm text-slate-900">นิติบุคคล (บริษัท/หจก.)</span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        ภ.ง.ด.50 / 51
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      อัตรา SME 0% - 20% คำนวณจากกำไรสุทธิทางบัญชีหลังหักค่าใช้จ่ายตามจริง
                    </p>
                  </div>
                </div>
              </div>

              {/* Expense Deduction Method */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-700 block">
                    วิธีการหักค่าใช้จ่าย (มาตรา 40(8) ร้านขายโทรศัพท์ & อะไหล่)
                  </label>
                  <span className="text-[11px] text-blue-600 flex items-center gap-1">
                    <Scale className="h-3.5 w-3.5" />
                    <span>เปรียบเทียบความคุ้มค่าอัตโนมัติ</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setSettings({ ...settings, expenseDeductionMethod: "FLAT_60" })}
                    className={`rounded-xl border p-3.5 cursor-pointer transition-all ${
                      settings.expenseDeductionMethod === "FLAT_60"
                        ? "border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-500/20 shadow-xs"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-900">หักเหมา 60% ตามกฎหมาย</span>
                      <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 font-bold">
                        ยอดนิยม
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      ไม่ต้องเก็บเอกสารใบเสร็จรายจ่าย หัก 60% จากรายได้พึงประเมินทันที
                    </p>
                  </div>

                  <div
                    onClick={() => setSettings({ ...settings, expenseDeductionMethod: "ACTUAL" })}
                    className={`rounded-xl border p-3.5 cursor-pointer transition-all ${
                      settings.expenseDeductionMethod === "ACTUAL"
                        ? "border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-500/20 shadow-xs"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-900">หักตามจริง (มีเอกสารหลักฐาน)</span>
                      <span className="rounded-full bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.2 font-mono">
                        สมุดรายจ่าย
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      เหมาะกับร้านที่มีต้นทุนค่าเครื่อง/ค่าอะไหล่สูงกว่า 60% ของยอดขาย
                    </p>
                  </div>
                </div>

                {settings.expenseDeductionMethod === "ACTUAL" && (
                  <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">
                      ยอดรวมรายจ่ายตามจริงที่มีหลักฐาน (บาท/ปี)
                    </label>
                    <Input
                      type="number"
                      value={settings.actualExpenses}
                      onChange={(e) =>
                        setSettings({ ...settings, actualExpenses: Math.max(0, parseFloat(e.target.value) || 0) })
                      }
                      className="font-mono text-sm font-bold"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* CARD 2: 4 ALLOWANCE GROUPS FOR TAX YEAR 2568 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-emerald-600" />
                <span>2. รายการลดหย่อนภาษี 4 กลุ่ม (ปีภาษี 2568)</span>
              </h2>
              <span className="text-xs text-slate-500 font-mono">
                รวมลดหย่อน: <strong className="text-emerald-700">{formatTHB(allowancesSummary.grandTotal)}</strong>
              </span>
            </div>

            {/* GROUP 1: Personal & Family */}
            <Card>
              <CardHeader className="bg-slate-50/60 p-4 border-b border-slate-100 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600" />
                  <CardTitle className="text-sm font-semibold text-slate-900">
                    กลุ่มที่ 1: ลดหย่อนส่วนตัวและครอบครัว (Personal & Family)
                  </CardTitle>
                </div>
                <span className="font-mono text-xs font-bold text-blue-700">
                  {formatTHB(allowancesSummary.g1Total)}
                </span>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Self */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50/50">
                    <div>
                      <span className="font-bold text-slate-800 block">ผู้มีเงินได้ (ตนเอง)</span>
                      <span className="text-slate-400 text-[10px]">สิทธิตามกฎหมายกำหนด</span>
                    </div>
                    <span className="font-mono font-bold text-slate-900 text-sm">60,000 บาท</span>
                  </div>

                  {/* Spouse */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white">
                    <div>
                      <span className="font-bold text-slate-800 block">คู่สมรส (ไม่มีเงินได้)</span>
                      <span className="text-slate-400 text-[10px]">จดทะเบียนถูกต้องตามกฎหมาย</span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.spouseAllowance}
                        onChange={(e) => setSettings({ ...settings, spouseAllowance: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-mono font-bold text-slate-900 text-xs">
                        {settings.spouseAllowance ? "60,000 บาท" : "ไม่มี"}
                      </span>
                    </label>
                  </div>

                  {/* Child Count */}
                  <div>
                    <label className="font-bold text-slate-800 mb-1 block">
                      บุตรชอบด้วยกฎหมาย (30,000 บาท/คน)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      value={settings.childCount}
                      onChange={(e) => setSettings({ ...settings, childCount: parseInt(e.target.value) || 0 })}
                      className="font-mono text-xs"
                    />
                  </div>

                  {/* Parents Count */}
                  <div>
                    <label className="font-bold text-slate-800 mb-1 block">
                      อุปการะบิดา-มารดา (30,000 บาท/คน, อายุ &gt; 60 ปี)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="4"
                      value={settings.parentsCount}
                      onChange={(e) =>
                        setSettings({ ...settings, parentsCount: parseInt(e.target.value) || 0 })
                      }
                      className="font-mono text-xs"
                    />
                  </div>

                  {/* Parents Health Insurance */}
                  <div className="sm:col-span-2">
                    <label className="font-bold text-slate-800 mb-1 block">
                      เบี้ยประกันสุขภาพบิดา-มารดา (สูงสุด 15,000 บาท)
                    </label>
                    <Input
                      type="number"
                      value={settings.parentsHealthInsurance}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          parentsHealthInsurance: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* GROUP 2: Insurance, Savings & Retirement */}
            <Card>
              <CardHeader className="bg-slate-50/60 p-4 border-b border-slate-100 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <CardTitle className="text-sm font-semibold text-slate-900">
                    กลุ่มที่ 2: ประกัน การออม และกองทุนลดหย่อนภาษี (SSF, RMF, Thai ESG)
                  </CardTitle>
                </div>
                <span className="font-mono text-xs font-bold text-emerald-700">
                  {formatTHB(allowancesSummary.g2Total)}
                </span>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-bold text-slate-800 mb-1 block">
                      ประกันชีวิตทั่วไป / สะสมทรัพย์ (สูงสุด 100,000 บ.)
                    </label>
                    <Input
                      type="number"
                      value={settings.lifeInsurance}
                      onChange={(e) =>
                        setSettings({ ...settings, lifeInsurance: parseFloat(e.target.value) || 0 })
                      }
                      className="font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-800 mb-1 block">
                      ประกันสุขภาพตนเอง (สูงสุด 25,000 บ., รวมประกันชีวิต &le; 100k)
                    </label>
                    <Input
                      type="number"
                      value={settings.healthInsurance}
                      onChange={(e) =>
                        setSettings({ ...settings, healthInsurance: parseFloat(e.target.value) || 0 })
                      }
                      className="font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-800 mb-1 block">
                      ประกันสังคม มาตรา 33 (สูงสุด 9,000 บาท)
                    </label>
                    <Input
                      type="number"
                      value={settings.socialSecurity}
                      onChange={(e) =>
                        setSettings({ ...settings, socialSecurity: parseFloat(e.target.value) || 0 })
                      }
                      className="font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-800 mb-1 block">
                      กองทุนรวมเพื่อการเลี้ยงชีพ RMF (สูงสุด 500,000 บ.)
                    </label>
                    <Input
                      type="number"
                      value={settings.rmfFund}
                      onChange={(e) =>
                        setSettings({ ...settings, rmfFund: parseFloat(e.target.value) || 0 })
                      }
                      className="font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-800 mb-1 block">
                      กองทุนเพื่อการออม SSF (สูงสุด 200,000 บ.)
                    </label>
                    <Input
                      type="number"
                      value={settings.ssfFund}
                      onChange={(e) =>
                        setSettings({ ...settings, ssfFund: parseFloat(e.target.value) || 0 })
                      }
                      className="font-mono text-xs"
                    />
                  </div>

                  {/* Thai ESG */}
                  <div className="rounded-lg border border-emerald-300 bg-emerald-50/30 p-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-emerald-950 block">
                        กองทุนไทยเพื่อความยั่งยืน Thai ESG (เกณฑ์ใหม่ 2568)
                      </label>
                      <span className="rounded bg-emerald-200 text-emerald-900 text-[10px] px-1 font-bold">
                        Max 300k
                      </span>
                    </div>
                    <Input
                      type="number"
                      value={settings.thaiEsgFund}
                      onChange={(e) =>
                        setSettings({ ...settings, thaiEsgFund: parseFloat(e.target.value) || 0 })
                      }
                      className="font-mono text-xs bg-white"
                    />
                    <span className="text-[10px] text-emerald-700 mt-1 block">
                      วงเงินแยกอิสระจากกองทุนเกษียณอื่นๆ ถือครองเพียง 5 ปี
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* GROUP 3: Stimulus & Real Estate */}
            <Card>
              <CardHeader className="bg-slate-50/60 p-4 border-b border-slate-100 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-purple-600" />
                  <CardTitle className="text-sm font-semibold text-slate-900">
                    กลุ่มที่ 3: กระตุ้นเศรษฐกิจ & อสังหาริมทรัพย์ (Economic Stimulus)
                  </CardTitle>
                </div>
                <span className="font-mono text-xs font-bold text-purple-700">
                  {formatTHB(allowancesSummary.g3Total)}
                </span>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-bold text-slate-800 mb-1 block">
                      ดอกเบี้ยกู้ยืมเพื่อซื้อที่อยู่อาศัย (สูงสุด 100,000 บ.)
                    </label>
                    <Input
                      type="number"
                      value={settings.homeLoanInterest}
                      onChange={(e) =>
                        setSettings({ ...settings, homeLoanInterest: parseFloat(e.target.value) || 0 })
                      }
                      className="font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-800 mb-1 block">
                      มาตรการ Easy E-Receipt / ช้อปดีมีคืน (สูงสุด 50,000 บ.)
                    </label>
                    <Input
                      type="number"
                      value={settings.easyEReceipt}
                      onChange={(e) =>
                        setSettings({ ...settings, easyEReceipt: parseFloat(e.target.value) || 0 })
                      }
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* GROUP 4: Donations */}
            <Card>
              <CardHeader className="bg-slate-50/60 p-4 border-b border-slate-100 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-amber-600" />
                  <CardTitle className="text-sm font-semibold text-slate-900">
                    กลุ่มที่ 4: เงินบริจาคสาธารณกุศล (Donations)
                  </CardTitle>
                </div>
                <span className="font-mono text-xs font-bold text-amber-700">
                  {formatTHB(allowancesSummary.g4Total)}
                </span>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-bold text-slate-800 mb-1 block">
                      บริจาคเพื่อการศึกษา/กีฬา/รพ.รัฐ (ลดหย่อนได้ 2 เท่า)
                    </label>
                    <Input
                      type="number"
                      value={settings.educationDonation}
                      onChange={(e) =>
                        setSettings({ ...settings, educationDonation: parseFloat(e.target.value) || 0 })
                      }
                      className="font-mono text-xs"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      ยอดหักลดหย่อนจริง = {formatTHB((settings.educationDonation || 0) * 2)}
                    </span>
                  </div>

                  <div>
                    <label className="font-bold text-slate-800 mb-1 block">
                      บริจาคทั่วไป / วัด / มูลนิธิ (ลดหย่อนตามจริง 1 เท่า)
                    </label>
                    <Input
                      type="number"
                      value={settings.generalDonation}
                      onChange={(e) =>
                        setSettings({ ...settings, generalDonation: parseFloat(e.target.value) || 0 })
                      }
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: SUMMARY & RECOMMENDATIONS ================= */}
        <div className="lg:col-span-4 space-y-5 sticky top-20">
          <Card className="border-slate-300 shadow-md">
            <CardHeader className="bg-slate-900 text-white p-4 rounded-t-xl">
              <span className="text-[11px] font-semibold text-slate-400">สรุปสิทธิลดหย่อนประจำปี 2568</span>
              <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-0.5">
                {formatTHB(allowancesSummary.grandTotal)}
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3.5 text-xs">
              <div className="space-y-2 divide-y divide-slate-100">
                <div className="flex justify-between items-center pt-1.5">
                  <span className="text-slate-600">กลุ่ม 1: ส่วนตัว & ครอบครัว</span>
                  <span className="font-mono font-bold">{formatTHB(allowancesSummary.g1Total)}</span>
                </div>
                <div className="flex justify-between items-center pt-1.5">
                  <span className="text-slate-600">กลุ่ม 2: ประกัน, RMF, Thai ESG</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {formatTHB(allowancesSummary.g2Total)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1.5">
                  <span className="text-slate-600">กลุ่ม 3: ดอกเบี้ยบ้าน & Easy E-Receipt</span>
                  <span className="font-mono font-bold">{formatTHB(allowancesSummary.g3Total)}</span>
                </div>
                <div className="flex justify-between items-center pt-1.5">
                  <span className="text-slate-600">กลุ่ม 4: บริจาค (2x + 1x)</span>
                  <span className="font-mono font-bold">{formatTHB(allowancesSummary.g4Total)}</span>
                </div>
              </div>

              {/* Strategy Advice Callout */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-[11px] space-y-1.5 text-amber-950">
                <div className="font-bold flex items-center gap-1.5 text-amber-900">
                  <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                  <span>คำแนะนำการวางแผนภาษี (Tax Insights):</span>
                </div>
                <p className="text-slate-700 leading-relaxed">
                  ร้านค้าปลีกมือถือมีต้นทุนเครื่องสูง หากเก็บใบกำกับภาษีซื้อได้ครบ การเลือกหัก
                  <strong> &quot;ตามจริง&quot;</strong> มักช่วยประหยัดภาษีได้มากกว่าวิธีหักเหมา 60%
                </p>
              </div>

              {/* Quick Action Buttons */}
              <div className="space-y-2 pt-2">
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  ยอดนี้ยังไม่รวมเพดานตามสัดส่วนรายได้ (RMF/SSF/Thai ESG 30%, PVD 15%) และเพดานเงินบริจาค 10% ของเงินได้สุทธิ
                  ซึ่งจะคำนวณในหน้าคำนวณ ภ.ง.ด.90/94 · ผลลัพธ์เป็นการประมาณการ กรุณาตรวจสอบกับนักบัญชี
                </p>

                <Link href="/tax/pit" className="block">
                  <Button variant="outline" className="w-full text-xs gap-1.5 h-9">
                    <span>จำลองผลคำนวณภาษี ภ.ง.ด.90 &rarr;</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
