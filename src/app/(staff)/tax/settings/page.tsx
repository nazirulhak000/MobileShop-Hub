"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Building,
  User,
  ShieldCheck,
  Receipt,
  Heart,
  PiggyBank,
  Home,
  Gift,
  Save,
  CheckCircle2,
  AlertCircle,
  Info,
  Calculator,
  ChevronRight,
  Scale,
  Sparkles,
  Coins,
  Loader2,
  Building2,
  FileCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { DEFAULT_TAX_SETTINGS, TaxSettings, formatTHB } from "@/lib/tax";
import { validateThaiTaxId, validateThaiBranchId } from "@/lib/utils";

interface CompanyTaxProfile {
  companyName: string;
  taxId: string;
  branchCode: string;
  branchName: string;
  address: string;
  phone: string;
}

export default function TaxSettingsPage() {
  const [settings, setSettings] = useState<TaxSettings>(DEFAULT_TAX_SETTINGS);
  const [company, setCompany] = useState<CompanyTaxProfile>({
    companyName: "",
    taxId: "",
    branchCode: "00000",
    branchName: "สำนักงานใหญ่ (HQ)",
    address: "",
    phone: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load existing settings from API
  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tax/settings", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "โหลดข้อมูลไม่สำเร็จ");
      if (json.data.company) setCompany(json.data.company);
      if (json.data.taxSettings) setSettings(json.data.taxSettings);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลการตั้งค่าไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  // Live validations for Thai Tax ID and Branch Code
  const taxIdCheck = useMemo(() => {
    if (!company.taxId) return { valid: false, message: "กรุณาระบุเลขประจำตัวผู้เสียภาษี 13 หลัก" };
    return validateThaiTaxId(company.taxId);
  }, [company.taxId]);

  const branchCodeCheck = useMemo(() => {
    if (!company.branchCode) return { valid: false, message: "กรุณาระบุรหัสสาขา 5 หลัก" };
    return validateThaiBranchId(company.branchCode);
  }, [company.branchCode]);

  // Handle Save
  const handleSave = async () => {
    setError(null);
    setSaveSuccess(null);

    if (!taxIdCheck.valid) {
      setError(taxIdCheck.message || "เลขประจำตัวผู้เสียภาษีไม่ถูกต้อง");
      return;
    }
    if (!branchCodeCheck.valid) {
      setError(branchCodeCheck.message || "รหัสสาขาไม่ถูกต้อง (ต้องมี 5 หลัก เช่น 00000)");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/tax/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, taxSettings: settings }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "บันทึกไม่สำเร็จ");
      setSaveSuccess(json.message || "บันทึกข้อมูลการตั้งค่าภาษีเรียบร้อยแล้ว");
      if (json.data.company) setCompany(json.data.company);
      if (json.data.taxSettings) setSettings(json.data.taxSettings);
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSaving(false);
    }
  };

  // Computed allowance totals per group
  const allowancesSummary = useMemo(() => {
    // Group 1: Personal & Family
    const g1Personal = 60000;
    const g1Spouse = settings.spouseAllowance ? 60000 : 0;
    const g1Child = (settings.childCount || 0) * 30000;
    const g1Parents = Math.min(4, settings.parentsCount || 0) * 30000;
    const g1ParentsHealth = Math.min(15000, settings.parentsHealthInsurance || 0);
    const g1Total = g1Personal + g1Spouse + g1Child + g1Parents + g1ParentsHealth;

    // Group 2: Insurance & Retirement
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

    // Group 3: Stimulus & Home Loan
    const g3HomeLoan = Math.min(100000, settings.homeLoanInterest || 0);
    const g3EasyEReceipt = Math.min(50000, settings.easyEReceipt || 0);
    const g3Total = g3HomeLoan + g3EasyEReceipt;

    // Group 4: Donations
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
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/tax" className="hover:text-blue-600 transition-colors inline-flex items-center gap-1 font-medium">
          <span>ภาษี & การเงิน</span>
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-semibold text-slate-800">ตั้งค่าภาษี & รายละเอียดจดทะเบียนพาณิชย์</span>
      </div>

      {/* Page Title & Save Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>ตั้งค่าข้อมูลภาษี & ลดหย่อน</span>
            <Badge variant="outline" className="border-blue-300 bg-blue-50/50 text-blue-700 font-medium">
              ปีภาษี {settings.taxYear}
            </Badge>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            ข้อมูลจดทะเบียนพาณิชย์ (Tax ID 13 หลัก, รหัสสาขา 5 หลัก) และเกณฑ์คำนวณภาษีเงินได้ ภ.ง.ด.90/94/50
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/tax/pit">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-xl border-slate-200 hover:bg-slate-50">
              <Calculator className="h-4 w-4 text-teal-600" />
              <span>คำนวณ ภ.ง.ด.90/94</span>
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm rounded-xl"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>บันทึกการตั้งค่า</span>
          </Button>
        </div>
      </div>

      {saveSuccess && (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <span>กำลังโหลดข้อมูลการตั้งค่าภาษี...</span>
        </div>
      )}

      <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 items-start ${loading ? "opacity-60 pointer-events-none" : ""}`}>
        {/* ================= LEFT COLUMN: SETTINGS FORM ================= */}
        <div className="lg:col-span-8 space-y-6">
          {/* CARD 0: COMPANY REGISTRATION & TAX ID CHECK (Requirement 5) */}
          <Card className="rounded-2xl border-slate-200/90 shadow-2xs">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  <CardTitle className="text-base font-bold text-slate-900">
                    ข้อมูลจดทะเบียนพาณิชย์ & เลขประจำตัวผู้เสียภาษี
                  </CardTitle>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  ใช้สำหรับ ภ.พ.30, 50 ทวิ & ใบเสร็จ
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Company Name */}
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">
                    ชื่อนิติบุคคล / ชื่อจดทะเบียนพาณิชย์ (Company / Legal Name) <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="เช่น บริษัท โมบายช็อป เซอร์วิส จำกัด หรือ นายช่าง โมบาย"
                    value={company.companyName}
                    onChange={(e) => setCompany({ ...company, companyName: e.target.value })}
                    className="text-xs font-medium"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    ชื่อทางการที่ใช้ระบุบนใบกำกับภาษี, หนังสือรับรอง 50 ทวิ, และแบบยื่นกรมสรรพากร
                  </span>
                </div>

                {/* 13-Digit Tax ID with Validation */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 block">
                      เลขประจำตัวผู้เสียภาษี 13 หลัก (Tax ID) <span className="text-rose-500">*</span>
                    </label>
                    {company.taxId && (
                      <span className={`text-[10px] font-bold ${taxIdCheck.valid ? "text-emerald-600" : "text-rose-600"}`}>
                        {taxIdCheck.valid ? "✓ Checksum ถูกต้อง" : "✗ ไม่ถูกต้อง"}
                      </span>
                    )}
                  </div>
                  <Input
                    type="text"
                    maxLength={13}
                    placeholder="0105558123456"
                    value={company.taxId}
                    onChange={(e) => setCompany({ ...company, taxId: e.target.value.replace(/[^0-9]/g, "") })}
                    className={`font-mono text-xs font-bold tracking-wider ${
                      company.taxId && (taxIdCheck.valid ? "border-emerald-500 focus:ring-emerald-500" : "border-rose-400 focus:ring-rose-400")
                    }`}
                  />
                  {company.taxId && !taxIdCheck.valid && (
                    <span className="text-[10px] text-rose-600 mt-1 block">{taxIdCheck.message}</span>
                  )}
                  {(!company.taxId || taxIdCheck.valid) && (
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      เลข 13 หลักสำหรับนิติบุคคล หรือเลขประจำตัวประชาชน 13 หลักสำหรับบุคคลธรรมดา
                    </span>
                  )}
                </div>

                {/* 5-Digit Branch Code with HQ check */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 block">
                      รหัสสาขา 5 หลัก (Branch Code) <span className="text-rose-500">*</span>
                    </label>
                    {company.branchCode === "00000" && (
                      <Badge variant="success" className="text-[9px] py-0 px-1.5 bg-emerald-100 text-emerald-800">
                        สำนักงานใหญ่ (HQ)
                      </Badge>
                    )}
                  </div>
                  <Input
                    type="text"
                    maxLength={5}
                    placeholder="00000"
                    value={company.branchCode}
                    onChange={(e) => setCompany({ ...company, branchCode: e.target.value.replace(/[^0-9]/g, "") })}
                    className={`font-mono text-xs font-bold ${
                      company.branchCode && (branchCodeCheck.valid ? "border-emerald-500" : "border-rose-400")
                    }`}
                  />
                  {company.branchCode && !branchCodeCheck.valid && (
                    <span className="text-[10px] text-rose-600 mt-1 block">{branchCodeCheck.message}</span>
                  )}
                  {(!company.branchCode || branchCodeCheck.valid) && (
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      ระบุ 00000 สำหรับสำนักงานใหญ่ หรือ 00001 เป็นต้นไปสำหรับสาขาย่อย
                    </span>
                  )}
                </div>

                {/* Branch Name */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">ชื่อสาขา (Branch Name)</label>
                  <Input
                    type="text"
                    placeholder="สำนักงานใหญ่ (HQ)"
                    value={company.branchName}
                    onChange={(e) => setCompany({ ...company, branchName: e.target.value })}
                    className="text-xs"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">เบอร์โทรศัพท์ติดต่อ</label>
                  <Input
                    type="text"
                    placeholder="02-123-4567 หรือ 081-234-5678"
                    value={company.phone}
                    onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                    className="text-xs"
                  />
                </div>

                {/* Registered Address */}
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">
                    ที่อยู่จดทะเบียนตามแบบ ภ.พ.09 / หนังสือรับรอง (Registered Address)
                  </label>
                  <Input
                    type="text"
                    placeholder="เลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
                    value={company.address}
                    onChange={(e) => setCompany({ ...company, address: e.target.value })}
                    className="text-xs"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CARD 1: TAXPAYER PROFILE & EXPENSE METHOD */}
          <Card className="rounded-2xl border-slate-200/90 shadow-2xs">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-emerald-600" />
                <CardTitle className="text-base font-bold text-slate-900">เกณฑ์คำนวณภาษีเงินได้ (ภ.ง.ด.)</CardTitle>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-5">
              <div className="rounded-xl border border-sky-200/80 bg-sky-50/70 p-3.5 text-xs text-sky-900 flex items-start gap-2.5">
                <Info className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong className="font-semibold text-sky-950">ขอบเขต:</strong> การตั้งค่านี้มีผลต่อทั้ง <span className="font-semibold">tenant</span> เพื่อใช้ในการจำลองประมาณการภาษีเงินได้บุคคลธรรมดาและนิติบุคคล
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
                      className="font-mono text-xs"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 4 ALLOWANCE GROUPS */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-teal-600" />
              <span>ค่าลดหย่อนประจำปี 2568 (4 กลุ่มตามเกณฑ์สรรพากร)</span>
            </h2>

            {/* GROUP 1: Personal & Family */}
            <Card>
              <CardHeader className="bg-slate-50/60 p-4 border-b border-slate-100 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-rose-500" />
                  <CardTitle className="text-sm font-semibold text-slate-900">
                    กลุ่มที่ 1: ลดหย่อนส่วนตัวและครอบครัว
                  </CardTitle>
                </div>
                <span className="font-mono text-xs font-bold text-rose-600">
                  {formatTHB(allowancesSummary.g1Total)}
                </span>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-bold text-slate-800 mb-1 block">ลดหย่อนผู้มีเงินได้ (ตนเอง)</label>
                    <Input type="text" disabled value="60,000 บาท (สิทธิตามกฎหมาย)" className="bg-slate-100 font-mono text-xs" />
                  </div>

                  <div className="flex items-center gap-3 pt-6">
                    <input
                      type="checkbox"
                      id="spouse"
                      checked={settings.spouseAllowance}
                      onChange={(e) => setSettings({ ...settings, spouseAllowance: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <label htmlFor="spouse" className="text-xs font-semibold text-slate-800 cursor-pointer">
                      คู่สมรสไม่มีเงินได้ (+60,000 บาท)
                    </label>
                  </div>

                  <div>
                    <label className="font-bold text-slate-800 mb-1 block">จำนวนบุตร (คนละ 30,000 บาท)</label>
                    <Input
                      type="number"
                      min={0}
                      value={settings.childCount}
                      onChange={(e) => setSettings({ ...settings, childCount: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-800 mb-1 block">บิดามารดาที่ดูแล (คนละ 30,000 สูงสุด 4 คน)</label>
                    <Input
                      type="number"
                      min={0}
                      max={4}
                      value={settings.parentsCount}
                      onChange={(e) => setSettings({ ...settings, parentsCount: Math.min(4, Math.max(0, parseInt(e.target.value) || 0)) })}
                      className="font-mono text-xs"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-bold text-slate-800 mb-1 block">เบี้ยประกันสุขภาพบิดามารดา (สูงสุด 15,000 บ.)</label>
                    <Input
                      type="number"
                      value={settings.parentsHealthInsurance}
                      onChange={(e) => setSettings({ ...settings, parentsHealthInsurance: parseFloat(e.target.value) || 0 })}
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* GROUP 2: Insurance & Savings */}
            <Card>
              <CardHeader className="bg-slate-50/60 p-4 border-b border-slate-100 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <PiggyBank className="h-4 w-4 text-emerald-600" />
                  <CardTitle className="text-sm font-semibold text-slate-900">
                    กลุ่มที่ 2: ประกัน การออม และการลงทุน (SSF / RMF / Thai ESG)
                  </CardTitle>
                </div>
                <span className="font-mono text-xs font-bold text-emerald-700">
                  {formatTHB(allowancesSummary.g2Total)}
                </span>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-bold text-slate-800 mb-1 block">ประกันชีวิตทั่วไป (สูงสุด 100,000 บ.)</label>
                    <Input
                      type="number"
                      value={settings.lifeInsurance}
                      onChange={(e) => setSettings({ ...settings, lifeInsurance: parseFloat(e.target.value) || 0 })}
                      className="font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-800 mb-1 block">ประกันสุขภาพตนเอง (สูงสุด 25,000 บ.)</label>
                    <Input
                      type="number"
                      value={settings.healthInsurance}
                      onChange={(e) => setSettings({ ...settings, healthInsurance: parseFloat(e.target.value) || 0 })}
                      className="font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-800 mb-1 block">เงินสมทบประกันสังคม (สูงสุด 9,000 บ./ปี)</label>
                    <Input
                      type="number"
                      value={settings.socialSecurity}
                      onChange={(e) => setSettings({ ...settings, socialSecurity: parseFloat(e.target.value) || 0 })}
                      className="font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-800 mb-1 block">กองทุนรวม RMF (สูงสุด 500,000 บ.)</label>
                    <Input
                      type="number"
                      value={settings.rmfFund}
                      onChange={(e) => setSettings({ ...settings, rmfFund: parseFloat(e.target.value) || 0 })}
                      className="font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-800 mb-1 block">กองทุนรวม SSF (สูงสุด 200,000 บ.)</label>
                    <Input
                      type="number"
                      value={settings.ssfFund}
                      onChange={(e) => setSettings({ ...settings, ssfFund: parseFloat(e.target.value) || 0 })}
                      className="font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-800 mb-1 block text-teal-800">
                      กองทุน Thai ESG ใหม่ 2568 (สูงสุด 300,000 บ.)
                    </label>
                    <Input
                      type="number"
                      value={settings.thaiEsgFund}
                      onChange={(e) => setSettings({ ...settings, thaiEsgFund: parseFloat(e.target.value) || 0 })}
                      className="font-mono text-xs border-teal-300 bg-teal-50/20"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* GROUP 3: Stimulus & Home Loan */}
            <Card>
              <CardHeader className="bg-slate-50/60 p-4 border-b border-slate-100 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-blue-600" />
                  <CardTitle className="text-sm font-semibold text-slate-900">
                    กลุ่มที่ 3: กระตุ้นเศรษฐกิจ & อสังหาริมทรัพย์
                  </CardTitle>
                </div>
                <span className="font-mono text-xs font-bold text-blue-700">
                  {formatTHB(allowancesSummary.g3Total)}
                </span>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-bold text-slate-800 mb-1 block">ดอกเบี้ยเงินกู้ยืมเพื่อซื้อที่อยู่อาศัย (สูงสุด 100,000 บ.)</label>
                    <Input
                      type="number"
                      value={settings.homeLoanInterest}
                      onChange={(e) => setSettings({ ...settings, homeLoanInterest: parseFloat(e.target.value) || 0 })}
                      className="font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-800 mb-1 block">มาตรการ Easy E-Receipt / ช้อปดีมีคืน (สูงสุด 50,000 บ.)</label>
                    <Input
                      type="number"
                      value={settings.easyEReceipt}
                      onChange={(e) => setSettings({ ...settings, easyEReceipt: parseFloat(e.target.value) || 0 })}
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
                    <label className="font-bold text-slate-800 mb-1 block">บริจาคเพื่อการศึกษา/กีฬา/รพ.รัฐ (ลดหย่อนได้ 2 เท่า)</label>
                    <Input
                      type="number"
                      value={settings.educationDonation}
                      onChange={(e) => setSettings({ ...settings, educationDonation: parseFloat(e.target.value) || 0 })}
                      className="font-mono text-xs"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      ยอดหักลดหย่อนจริง = {formatTHB((settings.educationDonation || 0) * 2)}
                    </span>
                  </div>

                  <div>
                    <label className="font-bold text-slate-800 mb-1 block">บริจาคทั่วไป / วัด / มูลนิธิ (ลดหย่อนตามจริง 1 เท่า)</label>
                    <Input
                      type="number"
                      value={settings.generalDonation}
                      onChange={(e) => setSettings({ ...settings, generalDonation: parseFloat(e.target.value) || 0 })}
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
              <span className="text-[11px] font-semibold text-slate-400">สรุปสิทธิลดหย่อนประจำปี {settings.taxYear}</span>
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

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <Button
                  onClick={handleSave}
                  disabled={saving || loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 h-9"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>บันทึกการตั้งค่าภาษี</span>
                </Button>

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
