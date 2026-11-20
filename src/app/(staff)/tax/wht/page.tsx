"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Percent,
  FileText,
  Printer,
  Plus,
  Search,
  ChevronRight,
  Building2,
  Calendar,
  CheckCircle2,
  DollarSign,
  Download,
  Loader2,
  AlertCircle,
  Trash2,
  RefreshCw,
  Clock,
  ShieldCheck,
  User,
  Building,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { formatTHB } from "@/lib/tax";
import { validateThaiTaxId, bahtText } from "@/lib/utils";

// WHT applies only when a single payment (excluding VAT) is at least 1,000 THB.
const WHT_MIN_PAYMENT = 1000;
const VAT_RATE = 0.07;
const BKK_OFFSET = 7 * 3600 * 1000;
const bangkokDate = () => new Date(Date.now() + BKK_OFFSET).toISOString().slice(0, 10);
const bkkMonth = () => bangkokDate().slice(0, 7);

interface WhtTransaction {
  id: string;
  certNo: string; // 50 ทวิ
  type: "PND3" | "PND53"; // PND3 (Individual) or PND53 (Corporate)
  date: string;
  payeeName: string;
  payeeTaxId: string;
  payeeAddress: string;
  incomeType: string;
  rate: number;
  baseAmount: number;
  whtAmount: number;
  netPayment: number;
  branchId?: string;
  status: "ISSUED" | "VOID";
}

interface WhtSummary {
  totalBase: number;
  totalWht: number;
  totalCount: number;
  pnd3Count: number;
  pnd53Count: number;
  pnd3Wht: number;
  pnd53Wht: number;
  byRate: Record<string, { base: number; wht: number; count: number }>;
}

interface CompanyInfo {
  companyName: string;
  taxId: string;
  branchCode: string;
  branchName: string;
  address: string;
  phone: string;
}

export default function WithholdingTaxPage() {
  const { currentBranch } = useApp();
  const [filterType, setFilterType] = useState<"ALL" | "PND3" | "PND53">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  const [transactions, setTransactions] = useState<WhtTransaction[]>([]);
  const [summary, setSummary] = useState<WhtSummary | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    companyName: "บริษัท โมบายช็อป เซอร์วิส จำกัด",
    taxId: "0105558123456",
    branchCode: "00000",
    branchName: "สำนักงานใหญ่ (HQ)",
    address: "เลขที่ 123/45 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110",
    phone: "02-123-4567",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Cert 50 ทวิ modal
  const [selectedCert, setSelectedCert] = useState<WhtTransaction | null>(null);
  const [certModalOpen, setCertModalOpen] = useState(false);

  // New WHT Modal
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newPayee, setNewPayee] = useState("");
  const [newTaxId, setNewTaxId] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newType, setNewType] = useState<"PND3" | "PND53">("PND3");
  const [newIncomeType, setNewIncomeType] = useState("ค่าจ้างทำของ/ซ่อมบอร์ดภายนอก (3%)");
  const [newRate, setNewRate] = useState(3);
  const [newBase, setNewBase] = useState("");
  const [newIncludesVat, setNewIncludesVat] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Load WHT list & company settings
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (selectedMonth) qs.set("month", selectedMonth);
      if (filterType !== "ALL") qs.set("type", filterType);
      if (searchQuery) qs.set("search", searchQuery);

      const [whtRes, settingsRes] = await Promise.all([
        fetch(`/api/tax/wht?${qs}`, { cache: "no-store" }),
        fetch("/api/tax/settings", { cache: "no-store" }),
      ]);

      const whtJson = await whtRes.json();
      if (!whtRes.ok || !whtJson.success) throw new Error(whtJson.error || "โหลดข้อมูล WHT ไม่สำเร็จ");
      setTransactions(whtJson.data.certificates);
      setSummary(whtJson.data.summary);

      if (settingsRes.ok) {
        const settingsJson = await settingsRes.json();
        if (settingsJson.success && settingsJson.data.company) {
          setCompanyInfo(settingsJson.data.company);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูล WHT ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, filterType, searchQuery]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Tax ID Check for New Payee
  const newTaxIdCheck = useMemo(() => {
    if (!newTaxId) return { valid: false, message: "" };
    return validateThaiTaxId(newTaxId);
  }, [newTaxId]);

  // Base excludes VAT; WHT is 0 when the payment is below 1,000 THB.
  const preview = useMemo(() => {
    const amount = parseFloat(newBase) || 0;
    const base = Math.round((newIncludesVat ? amount / (1 + VAT_RATE) : amount) * 100) / 100;
    const applies = base >= WHT_MIN_PAYMENT;
    const wht = applies ? Math.round(base * newRate) / 100 : 0;
    const net = Math.round((base - wht) * 100) / 100;
    return { base, applies, wht, net };
  }, [newBase, newIncludesVat, newRate]);

  // Handle Preset Rate Changes
  const handleRatePreset = (rate: number, label: string) => {
    setNewRate(rate);
    setNewIncomeType(label);
  };

  // Submit New WHT
  const handleAddWht = async () => {
    setModalError(null);
    const payeeTrimmed = newPayee.trim();
    const addressTrimmed = newAddress.trim();
    if (!payeeTrimmed) {
      setModalError("กรุณากรอกชื่อผู้รับเงิน");
      return;
    }
    const cleanTaxId = newTaxId.replace(/[^0-9]/g, "");
    const taxCheck = validateThaiTaxId(cleanTaxId);
    if (!taxCheck.valid) {
      setModalError(taxCheck.message || "เลขประจำตัวผู้เสียภาษี 13 หลักไม่ถูกต้อง (Checksum ไม่ผ่าน)");
      return;
    }
    if (preview.base < WHT_MIN_PAYMENT) {
      setModalError("ยอดเงินก่อนหักภาษีขั้นต่ำสำหรับการหัก ณ ที่จ่ายคือ 1,000 บาท");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/tax/wht", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payeeName: payeeTrimmed,
          payeeTaxId: cleanTaxId,
          payeeAddress: addressTrimmed,
          type: newType,
          incomeType: newIncomeType,
          rate: newRate,
          baseAmount: preview.base,
          date: bangkokDate(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "ออกหนังสือ 50 ทวิ ไม่สำเร็จ");

      setNewModalOpen(false);
      setNewPayee("");
      setNewTaxId("");
      setNewAddress("");
      setNewBase("");
      setNewIncludesVat(false);

      // Reload list and open the newly created certificate for preview/print
      await loadData();
      if (json.data) {
        setSelectedCert(json.data);
        setCertModalOpen(true);
      }
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "เกิดข้อผิดพลาดในการออกหนังสือ 50 ทวิ");
    } finally {
      setSubmitting(false);
    }
  };

  // Void WHT Certificate
  const handleVoidCert = async (certNo: string) => {
    if (!confirm(`คุณต้องการยกเลิกหนังสือรับรอง 50 ทวิ เลขที่ ${certNo} ใช่หรือไม่?`)) return;
    try {
      const res = await fetch(`/api/tax/wht?certNo=${encodeURIComponent(certNo)}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "ยกเลิกไม่สำเร็จ");
      await loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : "เกิดข้อผิดพลาดในการยกเลิกหนังสือ 50 ทวิ");
    }
  };

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/tax" className="hover:text-blue-600 transition-colors">
          ภาษี & การเงิน
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-semibold text-slate-800">
          ภาษีหัก ณ ที่จ่าย ภ.ง.ด.3 / ภ.ง.ด.53 & หนังสือรับรอง 50 ทวิ
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>ภาษีหัก ณ ที่จ่าย (Withholding Tax ภ.ง.ด.3 / 53)</span>
            <span className="rounded bg-indigo-100 text-indigo-700 font-mono text-xs px-2 py-0.5 font-bold">
              50 ทวิ
            </span>
          </h1>
          <p className="text-sm text-slate-500">
            บันทึกการหักภาษี ณ ที่จ่าย ออกหนังสือรับรอง 50 ทวิ (ขนส่ง 1%, ค่าจ้าง/บริการ 3%, ค่าเช่า 5%) และสรุปแบบยื่น ภ.ง.ด.3 / ภ.ง.ด.53
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setNewModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 shadow-sm rounded-xl"
          >
            <Plus className="h-4 w-4" />
            <span>ออกหนังสือ 50 ทวิ ใหม่</span>
          </Button>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</span>
          <Button variant="outline" size="sm" onClick={() => void loadData()} className="gap-1.5"><RefreshCw className="h-3.5 w-3.5" />ลองใหม่</Button>
        </div>
      )}

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-semibold text-slate-500">รวมภาษีหัก ณ ที่จ่าย (WHT)</span>
            <div className="text-2xl font-bold font-mono text-indigo-700">{formatTHB(summary?.totalWht ?? 0)}</div>
            <div className="text-[11px] text-slate-400">ฐานเงินจ่ายรวม {formatTHB(summary?.totalBase ?? 0)}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">ภ.ง.ด.3 (บุคคลธรรมดา)</span>
              <User className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900">{formatTHB(summary?.pnd3Wht ?? 0)}</div>
            <div className="text-[11px] text-slate-400">จำนวน {summary?.pnd3Count ?? 0} ฉบับ</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">ภ.ง.ด.53 (นิติบุคคล)</span>
              <Building className="h-3.5 w-3.5 text-purple-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-purple-700">{formatTHB(summary?.pnd53Wht ?? 0)}</div>
            <div className="text-[11px] text-slate-400">จำนวน {summary?.pnd53Count ?? 0} ฉบับ</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">กำหนดส่งแบบ e-Filing</span>
              <Clock className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <div className="text-base font-bold font-mono text-slate-800">วันที่ 15 ของเดือนถัดไป</div>
            <div className="text-[11px] text-slate-400">ยื่นผ่านระบบ e-Filing สรรพากร</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFilterType("ALL")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              filterType === "ALL" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            ทั้งหมด ({transactions.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("PND3")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              filterType === "PND3" ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700 hover:bg-blue-100"
            }`}
          >
            ภ.ง.ด.3 (บุคคล)
          </button>
          <button
            type="button"
            onClick={() => setFilterType("PND53")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              filterType === "PND53" ? "bg-purple-600 text-white" : "bg-purple-50 text-purple-700 hover:bg-purple-100"
            }`}
          >
            ภ.ง.ด.53 (นิติบุคคล)
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            type="text"
            placeholder="ค้นหาเลขที่ 50 ทวิ, ชื่อ, Tax ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8 text-xs"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">รายการหนังสือรับรองการหักภาษี ณ ที่จ่าย (50 ทวิ)</CardTitle>
              <CardDescription>เกณฑ์หักภาษีขั้นต่ำ 1,000 บาท อัตรา 1%, 3%, 5%</CardDescription>
            </div>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-3 text-left">เลขที่ 50 ทวิ / วันที่</th>
                <th className="py-2.5 px-3 text-left">แบบยื่น</th>
                <th className="py-2.5 px-3 text-left">ผู้รับเงิน / เลขประจำตัวผู้เสียภาษี</th>
                <th className="py-2.5 px-3 text-left">ประเภทเงินได้</th>
                <th className="py-2.5 px-3 text-right">ยอดก่อนภาษี</th>
                <th className="py-2.5 px-3 text-right">อัตรา</th>
                <th className="py-2.5 px-3 text-right">ภาษีที่หัก</th>
                <th className="py-2.5 px-3 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {transactions.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="py-8 text-center font-sans text-slate-400">
                    ยังไม่มีรายการหักภาษี ณ ที่จ่ายในเงื่อนไขที่เลือก
                  </td>
                </tr>
              )}
              {transactions.map((t) => {
                const isVoid = t.status === "VOID";
                return (
                  <tr key={t.id} className={`hover:bg-slate-50 ${isVoid ? "opacity-40 bg-slate-50/50" : ""}`}>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{t.certNo}</div>
                      <div className="text-[10px] text-slate-400">{t.date}</div>
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      {t.type === "PND3" ? (
                        <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50/50 text-[10px]">
                          ภ.ง.ด.3
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-purple-300 text-purple-700 bg-purple-50/50 text-[10px]">
                          ภ.ง.ด.53
                        </Badge>
                      )}
                      {isVoid && <Badge variant="danger" className="ml-1 text-[9px]">ยกเลิก</Badge>}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <div className="font-bold text-slate-800">{t.payeeName}</div>
                      <div className="text-[10px] font-mono text-slate-500">Tax ID: {t.payeeTaxId}</div>
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-600">{t.incomeType}</td>
                    <td className="py-2.5 px-3 text-right text-slate-700">{formatTHB(t.baseAmount)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-800">{t.rate}%</td>
                    <td className="py-2.5 px-3 text-right font-bold text-indigo-700">{formatTHB(t.whtAmount)}</td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1 font-sans">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedCert(t);
                            setCertModalOpen(true);
                          }}
                          className="h-7 px-2 text-[11px] gap-1"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          <span>50 ทวิ</span>
                        </Button>
                        {!isVoid && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleVoidCert(t.certNo)}
                            className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600"
                            title="ยกเลิกหนังสือ 50 ทวิ"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* NEW WHT CERTIFICATE MODAL */}
      <Dialog open={newModalOpen} onOpenChange={setNewModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Percent className="h-4 w-4 text-indigo-600" />
              <span>ออกหนังสือรับรองการหักภาษี ณ ที่จ่าย (50 ทวิ)</span>
            </DialogTitle>
          </DialogHeader>

          {modalError && (
            <div role="alert" className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <div className="space-y-4 py-2 text-xs">
            {/* Entity Type Toggle */}
            <div>
              <label className="font-semibold text-slate-700 mb-1.5 block">แบบยื่นภาษีหัก ณ ที่จ่าย</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewType("PND3")}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    newType === "PND3"
                      ? "border-blue-500 bg-blue-50/70 font-bold text-blue-900"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <div className="font-bold">ภ.ง.ด.3 (บุคคลธรรมดา)</div>
                  <div className="text-[10px] text-slate-500">ช่างอิสระ, ผู้ให้เช่าบุคคล</div>
                </button>
                <button
                  type="button"
                  onClick={() => setNewType("PND53")}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    newType === "PND53"
                      ? "border-purple-500 bg-purple-50/70 font-bold text-purple-900"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <div className="font-bold">ภ.ง.ด.53 (นิติบุคคล)</div>
                  <div className="text-[10px] text-slate-500">บริษัทขนส่ง, บริษัทให้เช่า</div>
                </button>
              </div>
            </div>

            {/* Payee Info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="font-semibold text-slate-700 mb-1 block">ชื่อผู้ถูกหักภาษี (Payee Name) *</label>
                <Input
                  type="text"
                  placeholder="เช่น นายช่าง สมเกียรติ หรือ บริษัท ขนส่งสายฟ้า จำกัด"
                  value={newPayee}
                  onChange={(e) => setNewPayee(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 block">เลขประจำตัวผู้เสียภาษี 13 หลัก *</label>
                  {newTaxId && (
                    <span className={`text-[10px] font-bold ${newTaxIdCheck.valid ? "text-emerald-600" : "text-rose-600"}`}>
                      {newTaxIdCheck.valid ? "✓ Checksum ถูกต้อง" : "✗ ไม่ถูกต้อง"}
                    </span>
                  )}
                </div>
                <Input
                  type="text"
                  maxLength={13}
                  placeholder="เช่น 1100500876543 หรือ 0105558123456"
                  value={newTaxId}
                  onChange={(e) => setNewTaxId(e.target.value.replace(/[^0-9]/g, ""))}
                  className="font-mono text-xs font-bold"
                />
                {newTaxId && !newTaxIdCheck.valid && (
                  <span className="text-[10px] text-rose-600 mt-1 block">{newTaxIdCheck.message}</span>
                )}
              </div>

              <div className="col-span-2">
                <label className="font-semibold text-slate-700 mb-1 block">ที่อยู่ตามบัตรประชาชน / หนังสือรับรอง</label>
                <Input
                  type="text"
                  placeholder="เลขที่ ถนน ตำบล อำเภอ จังหวัด"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            {/* Income Type & Rate Presets */}
            <div>
              <label className="font-semibold text-slate-700 mb-1.5 block">ประเภทเงินได้ & อัตราหักภาษี</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleRatePreset(1, "ค่าบริการขนส่ง (Transport)")}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    newRate === 1 ? "border-indigo-600 bg-indigo-50 font-bold text-indigo-900" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="font-bold text-xs">1% ขนส่ง</div>
                  <div className="text-[10px] text-slate-500">พัสดุ / ขนส่ง</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleRatePreset(3, "ค่าจ้างทำของ/บริการ/ซ่อม (Services)")}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    newRate === 3 ? "border-indigo-600 bg-indigo-50 font-bold text-indigo-900" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="font-bold text-xs">3% บริการ/ซ่อม</div>
                  <div className="text-[10px] text-slate-500">ค่าแรงช่างนอก</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleRatePreset(5, "ค่าเช่าพื้นที่/อาคาร (Rent)")}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    newRate === 5 ? "border-indigo-600 bg-indigo-50 font-bold text-indigo-900" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="font-bold text-xs">5% ค่าเช่า</div>
                  <div className="text-[10px] text-slate-500">ค่าเช่าร้าน/บูธ</div>
                </button>
              </div>
            </div>

            {/* Base Amount & VAT Inclusive Check */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700 block">จำนวนเงินที่จ่าย (บาท) *</label>
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-600">
                  <input
                    type="checkbox"
                    checked={newIncludesVat}
                    onChange={(e) => setNewIncludesVat(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>ยอดนี้รวม VAT 7% แล้ว</span>
                </label>
              </div>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={newBase}
                onChange={(e) => setNewBase(e.target.value)}
                className="font-mono text-sm font-bold text-indigo-700"
              />
            </div>

            {/* Live Calculation Preview */}
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 space-y-1.5 font-mono text-xs">
              <div className="flex justify-between text-slate-600">
                <span>ฐานเงินได้ก่อนภาษี:</span>
                <span className="font-bold">{formatTHB(preview.base)}</span>
              </div>
              <div className="flex justify-between text-indigo-700 font-bold">
                <span>ภาษีหัก ณ ที่จ่าย ({newRate}%):</span>
                <span>{preview.applies ? formatTHB(preview.wht) : "0.00 (ยอดต่ำกว่า 1,000 บ.)"}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-indigo-200 font-bold text-slate-900">
                <span>ยอดจ่ายสุทธิให้ผู้รับเงิน:</span>
                <span className="text-emerald-700">{formatTHB(preview.net)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNewModalOpen(false)} disabled={submitting}>
              ยกเลิก
            </Button>
            <Button
              size="sm"
              onClick={handleAddWht}
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              <span>ออกหนังสือ 50 ทวิ</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 50 ทวิ PRINTABLE CERTIFICATE PREVIEW DIALOG */}
      <Dialog open={certModalOpen} onOpenChange={setCertModalOpen}>
        <DialogContent className="max-w-2xl bg-white p-6 printable-cert">
          {selectedCert && (
            <div className="space-y-4 text-xs font-sans text-slate-900">
              {/* Certificate Header */}
              <div className="text-center border-b pb-3 space-y-1">
                <div className="font-extrabold text-sm sm:text-base">
                  หนังสือรับรองการหักภาษี ณ ที่จ่าย
                </div>
                <div className="text-[11px] text-slate-600">
                  ตามมาตรา 50 ทวิ แห่งประมวลรัษฎากร
                </div>
                <div className="flex justify-between items-center text-[11px] font-mono pt-1 text-slate-500">
                  <span>เลขที่เอกสาร: <strong className="text-slate-900">{selectedCert.certNo}</strong></span>
                  <span>วันที่: <strong>{selectedCert.date}</strong></span>
                </div>
              </div>

              {/* Payer & Payee Boxes */}
              <div className="space-y-3">
                {/* 1. ผู้มีหน้าที่หักภาษี ณ ที่จ่าย (Payer) */}
                <div className="rounded-lg border border-slate-300 p-3 space-y-1 bg-slate-50/50">
                  <div className="font-bold text-[11px] text-indigo-900 flex items-center justify-between">
                    <span>1. ผู้มีหน้าที่หักภาษี ณ ที่จ่าย (Payer)</span>
                    <span className="font-mono text-slate-700">รหัสสาขา: {companyInfo.branchCode}</span>
                  </div>
                  <div className="font-bold text-xs">{companyInfo.companyName}</div>
                  <div className="text-[11px] text-slate-600">
                    เลขประจำตัวผู้เสียภาษีอากร: <strong className="font-mono text-slate-900">{companyInfo.taxId}</strong>
                  </div>
                  <div className="text-[11px] text-slate-600">{companyInfo.address}</div>
                </div>

                {/* 2. ผู้ถูกหักภาษี ณ ที่จ่าย (Payee) */}
                <div className="rounded-lg border border-slate-300 p-3 space-y-1 bg-slate-50/50">
                  <div className="font-bold text-[11px] text-blue-900 flex items-center justify-between">
                    <span>2. ผู้ถูกหักภาษี ณ ที่จ่าย (Payee)</span>
                    <Badge variant="outline" className="text-[9px] font-mono">
                      {selectedCert.type === "PND3" ? "ภ.ง.ด.3 (บุคคล)" : "ภ.ง.ด.53 (นิติบุคคล)"}
                    </Badge>
                  </div>
                  <div className="font-bold text-xs">{selectedCert.payeeName}</div>
                  <div className="text-[11px] text-slate-600">
                    เลขประจำตัวผู้เสียภาษี / บัตรประชาชน: <strong className="font-mono text-slate-900">{selectedCert.payeeTaxId}</strong>
                  </div>
                  <div className="text-[11px] text-slate-600">{selectedCert.payeeAddress || "-"}</div>
                </div>
              </div>

              {/* Tax Table */}
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-semibold">
                    <tr>
                      <th className="p-2 text-left">ประเภทเงินได้พึงประเมินที่จ่าย</th>
                      <th className="p-2 text-center">วัน เดือน ปี</th>
                      <th className="p-2 text-right">จำนวนเงินที่จ่าย (บาท)</th>
                      <th className="p-2 text-center">อัตราภาษี</th>
                      <th className="p-2 text-right">ภาษีที่หักและนำส่ง (บาท)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    <tr>
                      <td className="p-2 font-sans font-medium">{selectedCert.incomeType}</td>
                      <td className="p-2 text-center">{selectedCert.date}</td>
                      <td className="p-2 text-right font-bold">{formatTHB(selectedCert.baseAmount)}</td>
                      <td className="p-2 text-center">{selectedCert.rate}%</td>
                      <td className="p-2 text-right font-bold text-indigo-700">{formatTHB(selectedCert.whtAmount)}</td>
                    </tr>
                    <tr className="bg-slate-50 font-bold">
                      <td colSpan={2} className="p-2 font-sans text-right">รวมเงินที่จ่ายและภาษีที่หักนำส่ง</td>
                      <td className="p-2 text-right">{formatTHB(selectedCert.baseAmount)}</td>
                      <td className="p-2"></td>
                      <td className="p-2 text-right text-indigo-700">{formatTHB(selectedCert.whtAmount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Baht Text */}
              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                <span className="font-bold text-slate-700">จำนวนเงินภาษีที่หักนำส่ง (ตัวอักษร): </span>
                <span className="font-bold text-indigo-900">{bahtText(selectedCert.whtAmount)}</span>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-6 pt-4 text-center text-xs">
                <div></div>
                <div className="space-y-6">
                  <div className="text-[11px] text-slate-600">ขอรับรองว่าข้อความและตัวเลขดังกล่าวถูกต้องตรงกับความเป็นจริงทุกประการ</div>
                  <div className="border-b border-dotted border-slate-400 w-48 mx-auto"></div>
                  <div className="text-[11px] text-slate-700">
                    <div>(ผู้มีหน้าที่หักภาษี ณ ที่จ่าย)</div>
                    <div className="text-[10px] text-slate-400">ลงชื่อและประทับตรานิติบุคคล (ถ้ามี)</div>
                  </div>
                </div>
              </div>

              {/* Print Action */}
              <div className="pt-4 border-t flex justify-end gap-2 non-printable">
                <Button variant="outline" size="sm" onClick={() => setCertModalOpen(false)}>
                  ปิด
                </Button>
                <Button
                  size="sm"
                  onClick={() => window.print()}
                  className="bg-slate-900 hover:bg-slate-800 text-white gap-1.5"
                >
                  <Printer className="h-4 w-4" />
                  <span>พิมพ์หนังสือรับรอง 50 ทวิ</span>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
