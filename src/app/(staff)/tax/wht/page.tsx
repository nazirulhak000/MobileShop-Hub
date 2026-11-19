"use client";

import React, { useState, useMemo } from "react";
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
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { formatTHB } from "@/lib/utils";
import { DemoBanner } from "@/components/ui/DemoBanner";

// WHT applies only when a single payment (excluding VAT) is at least 1,000 THB.
const WHT_MIN_PAYMENT = 1000;
const VAT_RATE = 0.07;
const BKK_OFFSET = 7 * 3600 * 1000;
/** "YYYY-MM-DD" in Asia/Bangkok. */
const bangkokDate = () => new Date(Date.now() + BKK_OFFSET).toISOString().slice(0, 10);
/** "YYYYMM" in Asia/Bangkok, used for certificate numbers. */
const bangkokYYYYMM = () => bangkokDate().slice(0, 7).replace("-", "");

interface WhtTransaction {
  id: string;
  certNo: string; // 50 ทวิ
  type: "PND3" | "PND53"; // PND3 (Individual) or PND53 (Corporate)
  date: string;
  payeeName: string;
  payeeTaxId: string;
  payeeAddress: string;
  incomeType: string; // "ค่าจ้างซ่อม/บริการ", "ค่าเช่าพื้นที่", "ค่าขนส่ง"
  rate: number; // 3%, 5%, 1%
  baseAmount: number;
  whtAmount: number;
}

export default function WithholdingTaxPage() {
  const { currentBranch } = useApp();
  const [filterType, setFilterType] = useState<"ALL" | "PND3" | "PND53">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [transactions, setTransactions] = useState<WhtTransaction[]>([
    {
      id: "WHT-202610-001",
      certNo: "50T-202610-001",
      type: "PND53",
      date: "2026-10-05",
      payeeName: "บริษัท สุขุมวิท พร็อพเพอร์ตี้ จำกัด",
      payeeTaxId: "0105558123456",
      payeeAddress: "88/1 สุขุมวิท 55 วัฒนา กทม. 10110",
      incomeType: "ค่าเช่าพื้นที่ร้าน (Rent)",
      rate: 5,
      baseAmount: 45000,
      whtAmount: 2250,
    },
    {
      id: "WHT-202610-002",
      certNo: "50T-202610-002",
      type: "PND3",
      date: "2026-10-12",
      payeeName: "นายสมเกียรติ ช่างเลเซอร์",
      payeeTaxId: "3100600123456",
      payeeAddress: "12/5 รามคำแหง 24 บางกะปิ กทม.",
      incomeType: "ค่าจ้างซ่อมบอร์ดภายนอก (Service)",
      rate: 3,
      baseAmount: 18000,
      whtAmount: 540,
    },
    {
      id: "WHT-202610-003",
      certNo: "50T-202610-003",
      type: "PND53",
      date: "2026-10-20",
      payeeName: "บริษัท ขนส่งด่วนฟ้าแลบ จำกัด",
      payeeTaxId: "0105562098765",
      payeeAddress: "99 ถนนบางนา-ตราด กม.14 สมุทรปราการ",
      incomeType: "ค่าบริการขนส่งพัสดุ (Transport)",
      rate: 1,
      baseAmount: 12000,
      whtAmount: 120,
    },
    {
      id: "WHT-202610-004",
      certNo: "50T-202610-004",
      type: "PND3",
      date: "2026-10-25",
      payeeName: "นายณัฐพล ช่างกระจกจอ",
      payeeTaxId: "1100500876543",
      payeeAddress: "45 ซอยลาดพร้าว 101 วังทองหลาง กทม.",
      incomeType: "ค่าบริการลอกเปลี่ยนกระจกหน้าจอ (Service)",
      rate: 3,
      baseAmount: 31333.33,
      whtAmount: 940,
    },
  ]);

  // Cert 50 ทวิ modal
  const [selectedCert, setSelectedCert] = useState<WhtTransaction | null>(null);
  const [certModalOpen, setCertModalOpen] = useState(false);

  // New WHT Modal
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newPayee, setNewPayee] = useState("");
  const [newTaxId, setNewTaxId] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newType, setNewType] = useState<"PND3" | "PND53">("PND3");
  const [newIncomeType, setNewIncomeType] = useState("ค่าจ้างซ่อม/บริการ (3%)");
  const [newRate, setNewRate] = useState(3);
  const [newBase, setNewBase] = useState("");
  const [newIncludesVat, setNewIncludesVat] = useState(false);

  // Base excludes VAT; WHT is 0 when the payment is below 1,000 THB.
  const preview = useMemo(() => {
    const amount = parseFloat(newBase) || 0;
    const base = Math.round((newIncludesVat ? amount / (1 + VAT_RATE) : amount) * 100) / 100;
    const applies = base >= WHT_MIN_PAYMENT;
    const wht = applies ? Math.round(base * newRate) / 100 : 0;
    return { base, applies, wht };
  }, [newBase, newIncludesVat, newRate]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filterType !== "ALL" && t.type !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.certNo.toLowerCase().includes(q) ||
          t.payeeName.toLowerCase().includes(q) ||
          t.payeeTaxId.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [transactions, filterType, searchQuery]);

  const totalWht = useMemo(() => {
    return filtered.reduce((acc, t) => acc + t.whtAmount, 0);
  }, [filtered]);

  const handleAddWht = () => {
    // Validation
    const payeeTrimmed = newPayee.trim();
    const addressTrimmed = newAddress.trim();
    if (!payeeTrimmed) {
      alert("กรุณากรอกชื่อผู้รับเงิน");
      return;
    }
    const taxId = newTaxId.replace(/[\s-]/g, "");
    if (!/^\d{13}$/.test(taxId)) {
      alert("กรุณากรอกเลขประจำตัวผู้เสียภาษีของผู้รับเงิน 13 หลัก");
      return;
    }
    if (preview.base <= 0) {
      alert("กรุณากรอกยอดเงินที่จ่ายให้ถูกต้อง (มากกว่า 0)");
      return;
    }
    const period = bangkokYYYYMM();
    const seq = String(transactions.filter((t) => t.certNo.startsWith(`50T-${period}-`)).length + 1).padStart(3, "0");
    const newItem: WhtTransaction = {
      id: `WHT-${period}-${seq}`,
      certNo: `50T-${period}-${seq}`,
      type: newType,
      date: bangkokDate(),
      payeeName: payeeTrimmed,
      payeeTaxId: taxId,
      payeeAddress: addressTrimmed,
      incomeType: newIncomeType,
      rate: newRate,
      baseAmount: preview.base,
      whtAmount: preview.wht,
    };
    setTransactions([newItem, ...transactions]);
    setNewModalOpen(false);
    setNewPayee("");
    setNewTaxId("");
    setNewAddress("");
    setNewBase("");
    setNewIncludesVat(false);
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
            บันทึกการหักภาษี ณ ที่จ่าย ออกหนังสือรับรอง 50 ทวิ และสรุปแบบยื่น ภ.ง.ด.3 (บุคคล) / ภ.ง.ด.53 (นิติบุคคล)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setNewModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>ออกหนังสือ 50 ทวิ ใหม่</span>
          </Button>
        </div>
      </div>

      <DemoBanner message="ใบ 50 ทวิ ยังไม่ถูกบันทึกลงฐานข้อมูล รายการในหน้านี้เป็นตัวอย่าง/ใช้คำนวณเท่านั้น และจะหายเมื่อรีเฟรชหน้า" />

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-semibold text-slate-500">รวมภาษีหัก ณ ที่จ่าย (รายการที่แสดง)</span>
            <div className="text-2xl font-bold font-mono text-indigo-700">{formatTHB(totalWht)}</div>
            <div className="text-[11px] text-slate-400">กำหนดนำส่งภายในวันที่ 15 ของเดือนถัดไป</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-semibold text-slate-500">ภ.ง.ด.3 (บุคคลธรรมดา 3%)</span>
            <div className="text-2xl font-bold font-mono text-slate-900">
              {formatTHB(transactions.filter((t) => t.type === "PND3").reduce((a, b) => a + b.whtAmount, 0))}
            </div>
            <div className="text-[11px] text-slate-400">{transactions.filter((t) => t.type === "PND3").length} รายการ</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs font-semibold text-slate-500">ภ.ง.ด.53 (นิติบุคคล 1%, 5%)</span>
            <div className="text-2xl font-bold font-mono text-slate-900">
              {formatTHB(transactions.filter((t) => t.type === "PND53").reduce((a, b) => a + b.whtAmount, 0))}
            </div>
            <div className="text-[11px] text-slate-400">{transactions.filter((t) => t.type === "PND53").length} รายการ</div>
          </CardContent>
        </Card>
      </div>

      {/* Table & Filters */}
      <Card>
        <div className="border-b border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilterType("ALL")}
                className={`rounded px-2.5 py-1 ${filterType === "ALL" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"}`}
              >
                ทั้งหมด
              </button>
              <button
                type="button"
                onClick={() => setFilterType("PND3")}
                className={`rounded px-2.5 py-1 ${filterType === "PND3" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"}`}
              >
                ภ.ง.ด.3 (บุคคล)
              </button>
              <button
                type="button"
                onClick={() => setFilterType("PND53")}
                className={`rounded px-2.5 py-1 ${filterType === "PND53" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"}`}
              >
                ภ.ง.ด.53 (นิติบุคคล)
              </button>
            </div>

            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อผู้รับเงิน, 50 ทวิ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-3 text-left">เลขที่ 50 ทวิ</th>
                <th className="py-2.5 px-3 text-left">ผู้รับเงิน / เลขประจำตัวผู้เสียภาษี</th>
                <th className="py-2.5 px-3 text-left">ประเภทเงินได้</th>
                <th className="py-2.5 px-3 text-center">อัตรา</th>
                <th className="py-2.5 px-3 text-right">ยอดจ่ายเงิน</th>
                <th className="py-2.5 px-3 text-right">ภาษีที่หักไว้</th>
                <th className="py-2.5 px-3 text-right">ใบเสร็จ 50 ทวิ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-slate-900">{t.certNo}</div>
                    <div className="text-[10px] text-slate-400">{t.date}</div>
                  </td>
                  <td className="py-2.5 px-3 font-sans">
                    <div className="font-semibold text-slate-800">{t.payeeName}</div>
                    <div className="font-mono text-[10px] text-slate-400">ID: {t.payeeTaxId}</div>
                  </td>
                  <td className="py-2.5 px-3 font-sans text-slate-600">{t.incomeType}</td>
                  <td className="py-2.5 px-3 text-center">
                    <Badge variant="outline" className="text-[10px]">
                      {t.rate}%
                    </Badge>
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-700">{formatTHB(t.baseAmount)}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-indigo-700">
                    {formatTHB(t.whtAmount)}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedCert(t);
                        setCertModalOpen(true);
                      }}
                      className="text-xs h-7 px-2 gap-1 font-sans"
                    >
                      <FileText className="h-3 w-3" />
                      <span>ดูหนังสือ 50 ทวิ</span>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 50 ทวิ CERTIFICATE MODAL */}
      <Dialog open={certModalOpen} onOpenChange={setCertModalOpen} maxWidth="max-w-4xl">
          <DialogHeader>
            <DialogTitle onClose={() => setCertModalOpen(false)}>
              หนังสือรับรองการหักภาษี ณ ที่จ่าย (มาตรา 50 ทวิ)
            </DialogTitle>
          </DialogHeader>

          {selectedCert && (
            <DialogContent className="max-h-[75vh] overflow-y-auto p-6 bg-slate-50 flex justify-center print:max-h-none print:overflow-visible print:bg-white print:p-0">
              <div className="bg-white border border-slate-300 shadow-md p-6 text-slate-900 text-xs space-y-4 rounded w-full print:border-none print:shadow-none">
                {/* Header */}
                <div className="text-center space-y-1 border-b border-slate-300 pb-3">
                  <h3 className="font-extrabold text-sm text-slate-900">
                    หนังสือรับรองการหักภาษี ณ ที่จ่าย ตามมาตรา 50 ทวิ
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    แห่งประมวลรัษฎากร (สำหรับผู้ถูกหักภาษี ณ ที่จ่าย นำไปยื่นภาษี)
                  </p>
                  <div className="text-right font-mono text-[11px] font-bold text-blue-700">
                    เลขที่: {selectedCert.certNo}
                  </div>
                </div>

                {/* Payer vs Payee */}
                <div className="grid grid-cols-2 gap-4 border-b border-slate-200 pb-3">
                  <div>
                    <span className="font-bold text-[11px] text-slate-500 block">ผู้มีหน้าที่หักภาษี (ผู้จ่าย):</span>
                    <div className="font-bold text-slate-900">{currentBranch.name}</div>
                    <div className="text-slate-500 text-[10px]">เลขประจำตัวผู้เสียภาษี: ..............................</div>
                  </div>
                  <div>
                    <span className="font-bold text-[11px] text-slate-500 block">ผู้ถูกหักภาษี ณ ที่จ่าย (ผู้รับ):</span>
                    <div className="font-bold text-slate-900">{selectedCert.payeeName}</div>
                    <div className="font-mono text-slate-500 text-[10px]">เลขประจำตัว: {selectedCert.payeeTaxId}</div>
                    {selectedCert.payeeAddress && (
                      <div className="text-slate-500 text-[10px]">{selectedCert.payeeAddress}</div>
                    )}
                  </div>
                </div>

                {/* Details Table */}
                <table className="w-full text-xs border border-slate-200">
                  <thead className="bg-slate-100 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2 text-left">ประเภทเงินได้พึงประเมิน</th>
                      <th className="p-2 text-center w-24">วันเดือนปีที่จ่าย</th>
                      <th className="p-2 text-right w-28">จำนวนเงินที่จ่าย (บาท)</th>
                      <th className="p-2 text-right w-28">ภาษีที่หักไว้ (บาท)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    <tr>
                      <td className="p-2 font-sans">{selectedCert.incomeType} ({selectedCert.rate}%)</td>
                      <td className="p-2 text-center">{selectedCert.date}</td>
                      <td className="p-2 text-right">{formatTHB(selectedCert.baseAmount)}</td>
                      <td className="p-2 text-right font-bold text-indigo-700">{formatTHB(selectedCert.whtAmount)}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Signatures */}
                <div className="pt-6 grid grid-cols-2 gap-4 text-center text-xs text-slate-500">
                  <div>
                    <div className="border-b border-slate-300 w-36 mx-auto mb-1 pb-4" />
                    <div>ลงชื่อ ผู้จ่ายเงิน (ผู้มีหน้าที่หัก)</div>
                  </div>
                  <div>
                    <div className="border-b border-slate-300 w-36 mx-auto mb-1 pb-4" />
                    <div>ลงชื่อ ผู้รับเงิน</div>
                  </div>
                </div>
              </div>
            </DialogContent>
          )}

          <DialogFooter className="flex justify-between print:hidden">
            <Button variant="outline" size="sm" onClick={() => setCertModalOpen(false)}>
              ปิดหน้าต่าง
            </Button>
            <Button size="sm" onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
              <Printer className="h-4 w-4" />
              <span>พิมพ์ใบรับรอง 50 ทวิ</span>
            </Button>
          </DialogFooter>
      </Dialog>

      {/* CREATE NEW WHT MODAL */}
      <Dialog open={newModalOpen} onOpenChange={setNewModalOpen}>
        <DialogHeader>
          <DialogTitle onClose={() => setNewModalOpen(false)}>
            ออกหนังสือรับรองการหัก ณ ที่จ่าย 50 ทวิ
          </DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">ประเภทผู้รับเงิน</label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => { setNewType("PND3"); setNewRate(3); setNewIncomeType("ค่าจ้างซ่อม/บริการ (3%)"); }}
                className={`p-2 rounded-lg border text-center font-bold ${newType === "PND3" ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200"}`}
              >
                บุคคลธรรมดา (ภ.ง.ด.3)
              </button>
              <button
                type="button"
                onClick={() => { setNewType("PND53"); setNewRate(5); setNewIncomeType("ค่าเช่าพื้นที่ (5%)"); }}
                className={`p-2 rounded-lg border text-center font-bold ${newType === "PND53" ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200"}`}
              >
                นิติบุคคล (ภ.ง.ด.53)
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">ชื่อผู้รับเงิน / บริษัท *</label>
            <Input placeholder="เช่น นายสมเกียรติ ช่างเลเซอร์" value={newPayee} onChange={(e) => setNewPayee(e.target.value)} className="text-xs" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">เลขบัตรประชาชน / เลขนิติบุคคล (13 หลัก)</label>
            <Input placeholder="1100400123451" value={newTaxId} onChange={(e) => setNewTaxId(e.target.value)} className="font-mono text-xs" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">ที่อยู่ผู้รับเงิน *</label>
            <Input
              placeholder="เช่น 12/5 รามคำแหง 24 บางกะปิ กรุงเทพฯ 10240"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              className="text-xs"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">อัตราภาษีหัก ณ ที่จ่าย</label>
            <select
              value={newRate}
              onChange={(e) => {
                const r = parseInt(e.target.value);
                setNewRate(r);
                if (r === 3) setNewIncomeType("ค่าจ้างซ่อม/บริการ (3%)");
                else if (r === 5) setNewIncomeType("ค่าเช่าพื้นที่ร้าน (5%)");
                else if (r === 1) setNewIncomeType("ค่าบริการขนส่งพัสดุ (1%)");
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold"
            >
              <option value="3">3% - ค่าจ้างทำของ / ค่าบริการซ่อม</option>
              <option value="5">5% - ค่าเช่าอาคาร / พื้นที่ร้านค้า</option>
              <option value="1">1% - ค่าขนส่งและโลจิสติกส์</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">ยอดเงินที่จ่ายก่อนหักภาษี (บาท) *</label>
            <Input type="number" placeholder="0" value={newBase} onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v) && v < 0) return; // reject negatives
              setNewBase(e.target.value);
            }} className="font-mono text-sm font-bold" />
            <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={newIncludesVat} onChange={(e) => setNewIncludesVat(e.target.checked)} className="h-3.5 w-3.5" />
              ยอดนี้รวม VAT 7% แล้ว (ระบบจะถอด VAT ออกก่อนคำนวณ)
            </label>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs space-y-1">
            <div className="flex justify-between"><span className="text-slate-500">ฐานภาษี (ไม่รวม VAT)</span><span className="font-mono">{formatTHB(preview.base)}</span></div>
            <div className="flex justify-between font-bold"><span>ภาษีหัก ณ ที่จ่าย {newRate}%</span><span className="font-mono text-indigo-700">{formatTHB(preview.wht)}</span></div>
            {!preview.applies && preview.base > 0 && (
              <p className="text-[11px] text-amber-700">ยอดจ่ายต่ำกว่า 1,000 บาทต่อครั้ง (ไม่รวม VAT) ไม่ต้องหักภาษี ณ ที่จ่าย</p>
            )}
            <p className="text-[10px] text-slate-400">หักภาษี ณ ที่จ่ายเมื่อจ่ายครั้งละ 1,000 บาทขึ้นไป โดยคำนวณจากยอดก่อน VAT</p>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setNewModalOpen(false)}>ยกเลิก</Button>
          <Button size="sm" onClick={handleAddWht} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">บันทึกและออกใบ 50 ทวิ</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
