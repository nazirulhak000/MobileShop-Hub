"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Search,
  Printer,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Calendar,
  Send,
  Download,
  DollarSign,
  ChevronRight,
  Eye,
  Receipt,
  FileCheck,
  Building,
  CreditCard,
  X,
  Sparkles,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { formatTHB, bahtText, validateThaiTaxId, validateThaiBranchId } from "@/lib/utils";

// --- Types ---
interface B2BInvoice {
  id: string;
  invoiceNo: string;
  companyName: string;
  taxId: string;
  branchId: string;
  address: string;
  poNumber: string;
  issueDate: string;
  dueDate: string;
  status: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "VOID";
  items: Array<{ name: string; qty: number; unitPrice: number; total: number; isVatExempt?: boolean }>;
  taxableSubtotal?: number;
  nonVatSubtotal?: number;
  subtotal: number;
  vatAmount: number;
  grandTotal: number;
  bahtText?: string;
}

interface TaxInvoice {
  id: string;
  invoiceNo: string;
  createdAt: string;
  branchName: string;
  customerName: string;
  customerPhone: string | null;
  cashierName: string;
  paymentMethod: string;
  status: string;
  items: Array<{ name: string; qty: number; unitPrice: number; total: number; imei: string | null }>;
  totalAmount: number;
  discount: number;
  vatAmount: number;
  netAmount: number;
}

const formatBkk = (d: string) =>
  new Date(d).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "medium",
    timeStyle: "short",
  });

const formatDateThaiOnly = (d: string) =>
  new Date(d).toLocaleDateString("th-TH", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const bangkokToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());

const round2 = (n: number) => Math.round(n * 100) / 100;

export default function InvoicesPage() {
  const { currentBranch } = useApp();
  const [activeTab, setActiveTab] = useState<"b2b" | "pos">("b2b");

  // --- B2B Invoices State ---
  const [b2bInvoices, setB2bInvoices] = useState<B2BInvoice[]>([]);
  const [b2bLoading, setB2bLoading] = useState(false);
  const [b2bFilter, setB2bFilter] = useState("ALL");
  const [b2bSearch, setB2bSearch] = useState("");

  // --- POS Sales Tax Invoices State ---
  const [posInvoices, setPosInvoices] = useState<TaxInvoice[]>([]);
  const [posLoading, setPosLoading] = useState(false);
  const [posStatusFilter, setPosStatusFilter] = useState("ALL");
  const [posFromDate, setPosFromDate] = useState(() => `${bangkokToday().slice(0, 7)}-01`);
  const [posToDate, setPosToDate] = useState(() => bangkokToday());
  const [posSearch, setPosSearch] = useState("");

  // --- Modals State ---
  const [selectedB2B, setSelectedB2B] = useState<B2BInvoice | null>(null);
  const [selectedPOS, setSelectedPOS] = useState<TaxInvoice | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [newB2BModalOpen, setNewB2BModalOpen] = useState(false);

  // New B2B Form State
  const [newCompany, setNewCompany] = useState("");
  const [newTaxId, setNewTaxId] = useState("");
  const [newBranchId, setNewBranchId] = useState("00000");
  const [newAddress, setNewAddress] = useState("");
  const [newPo, setNewPo] = useState("");
  const [newDueDate, setNewDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemPrice, setNewItemPrice] = useState(0);
  const [newItemIsVatExempt, setNewItemIsVatExempt] = useState(false);
  const [b2bFormError, setB2bFormError] = useState("");
  const [b2bBusy, setB2bBusy] = useState(false);

  const loadB2BInvoices = useCallback(async () => {
    setB2bLoading(true);
    try {
      const params = new URLSearchParams({ take: "100" });
      if (currentBranch?.code) params.set("branch", currentBranch.code);
      if (b2bSearch) params.set("search", b2bSearch.trim());
      const res = await fetch(`/api/invoices?${params.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setB2bInvoices(json.data);
      }
    } catch (err) {
      console.error("loadB2BInvoices error", err);
    } finally {
      setB2bLoading(false);
    }
  }, [currentBranch?.code, b2bSearch]);

  useEffect(() => {
    loadB2BInvoices();
  }, [loadB2BInvoices]);

  // Load POS sales invoices from backend
  const loadPosInvoices = useCallback(async () => {
    if (!currentBranch.code) return;
    setPosLoading(true);
    try {
      const params = new URLSearchParams({ branch: currentBranch.code, take: "100" });
      if (posFromDate) params.set("from", posFromDate);
      if (posToDate) params.set("to", posToDate);
      if (posSearch) params.set("search", posSearch.trim());
      const res = await fetch(`/api/sales?${params.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setPosInvoices(
          (json.data as any[]).map((s: any) => ({
            id: s.id,
            invoiceNo: s.invoiceNo,
            createdAt: s.createdAt,
            branchName: s.branch?.name ?? "",
            customerName: s.customer?.name ?? "ลูกค้าทั่วไป (Walk-in)",
            customerPhone: s.customer?.phone ?? null,
            cashierName: s.cashier?.name ?? "-",
            paymentMethod: s.paymentMethod,
            status: s.status,
            items: (s.items ?? []).map((it: any) => ({
              name: it.product?.name ?? "-",
              qty: it.quantity,
              unitPrice: it.unitPrice,
              total: it.subtotal,
              imei: it.imei ?? null,
            })),
            totalAmount: s.totalAmount,
            discount: s.discount,
            vatAmount: s.vatAmount,
            netAmount: s.netAmount,
          }))
        );
      }
    } catch {
      // Keep empty if API is quiet
    } finally {
      setPosLoading(false);
    }
  }, [currentBranch.code, posFromDate, posToDate, posSearch]);

  useEffect(() => {
    if (activeTab === "pos") {
      loadPosInvoices();
    }
  }, [activeTab, loadPosInvoices]);

  // B2B Filters
  const filteredB2B = useMemo(() => {
    return b2bInvoices.filter((inv) => {
      if (b2bFilter === "SENT" && inv.status !== "SENT") return false;
      if (b2bFilter === "PAID" && inv.status !== "PAID") return false;
      if (b2bFilter === "OVERDUE" && inv.status !== "OVERDUE") return false;
      if (b2bSearch.trim()) {
        const q = b2bSearch.toLowerCase();
        return (
          inv.invoiceNo.toLowerCase().includes(q) ||
          inv.companyName.toLowerCase().includes(q) ||
          inv.poNumber.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [b2bInvoices, b2bFilter, b2bSearch]);

  const b2bTotalAmount = b2bInvoices.reduce((sum, i) => sum + i.grandTotal, 0);
  const b2bOverdueAmount = b2bInvoices
    .filter((i) => i.status === "OVERDUE")
    .reduce((sum, i) => sum + i.grandTotal, 0);

  // Handle Mark as Paid
  const handleMarkAsPaid = async (id: string) => {
    try {
      const res = await fetch("/api/invoices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "PAID" }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setB2bInvoices((prev) =>
          prev.map((inv) => (inv.id === id ? { ...inv, status: "PAID" } : inv))
        );
      } else {
        alert(json?.error || "ไม่สามารถอัปเดตสถานะได้");
      }
    } catch {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย");
    }
  };

  // Handle Create B2B Invoice
  const handleCreateB2B = async () => {
    setB2bFormError("");
    if (!newCompany.trim() || !newItemName.trim() || newItemPrice <= 0) {
      setB2bFormError("กรุณากรอกชื่อบริษัท รายการ และราคาให้ครบถ้วน");
      return;
    }
    const cleanTaxId = newTaxId.replace(/[^0-9]/g, "");
    const taxCheck = validateThaiTaxId(cleanTaxId);
    if (!taxCheck.valid) {
      setB2bFormError(taxCheck.message || "เลขประจำตัวผู้เสียภาษีอากร 13 หลักไม่ถูกต้อง");
      return;
    }
    const branchCheck = validateThaiBranchId(newBranchId);
    if (!branchCheck.valid) {
      setB2bFormError(branchCheck.message || "รหัสสาขาต้องเป็นตัวเลข 5 หลัก (เช่น 00000 สำหรับสำนักงานใหญ่)");
      return;
    }

    setB2bBusy(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: newCompany.trim(),
          taxId: cleanTaxId,
          branchId: newBranchId.trim(),
          address: newAddress.trim() || "กรุงเทพมหานคร",
          poNumber: newPo.trim() || undefined,
          dueDate: newDueDate || undefined,
          branchCode: currentBranch?.code || "HQ",
          items: [
            {
              name: newItemName.trim(),
              qty: newItemQty,
              unitPrice: newItemPrice,
              isVatExempt: newItemIsVatExempt,
            },
          ],
        }),
      });

      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setNewB2BModalOpen(false);
        setNewCompany("");
        setNewTaxId("");
        setNewBranchId("00000");
        setNewAddress("");
        setNewPo("");
        setNewItemName("");
        setNewItemQty(1);
        setNewItemPrice(0);
        setNewItemIsVatExempt(false);
        setB2bFormError("");
        loadB2BInvoices();
      } else {
        setB2bFormError(json?.error || "ไม่สามารถสร้างใบแจ้งหนี้ได้");
      }
    } catch {
      setB2bFormError("เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ");
    } finally {
      setB2bBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
              <FileCheck className="h-3.5 w-3.5 text-teal-600" />
              ระบบเอกสารภาษี & การวางบิล
            </span>
            <Badge variant="outline" className="border-slate-200 text-slate-600 font-medium">
              <Building2 className="mr-1 h-3 w-3 inline text-slate-400" />
              {currentBranch.name}
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-2">
            ใบกำกับภาษี & ใบแจ้งหนี้ (Invoices & Billing)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            ออกใบแจ้งหนี้องค์กร B2B คุมเครดิตเทอม และใบกำกับภาษีเต็มรูปขายหน้าร้าน พิมพ์ขนาดกระดาษจริง A4 (210 × 297 มม.)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            onClick={() => setNewB2BModalOpen(true)}
            className="h-11 px-5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl gap-2 shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>สร้างใบแจ้งหนี้ B2B ใหม่</span>
          </Button>

          <Link href="/pos">
            <Button
              variant="outline"
              className="h-11 px-4 border-slate-200 hover:bg-slate-50 text-slate-800 font-semibold rounded-xl gap-2 cursor-pointer"
            >
              <Receipt className="h-4 w-4 text-emerald-600" />
              <span>เปิดหน้าจอขาย POS</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200/80 shadow-2xs bg-white p-5">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            ใบแจ้งหนี้ทั้งหมด (Total Invoices)
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-slate-900 tabular-nums">
              {b2bInvoices.length}
            </span>
            <span className="text-xs font-semibold text-slate-500">ฉบับ</span>
          </div>
          <div className="text-xs font-medium text-slate-500 mt-1">
            มูลค่ารวม {formatTHB(b2bTotalAmount)}
          </div>
        </Card>

        <Card className="border-slate-200/80 shadow-2xs bg-white p-5">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            รอรับเงิน (Pending Payment)
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-blue-600 tabular-nums">
              {b2bInvoices.filter((i) => i.status === "SENT").length}
            </span>
            <span className="text-xs font-semibold text-slate-500">ฉบับ</span>
          </div>
          <div className="text-xs font-medium text-blue-700 mt-1">
            ยอดรอเก็บ {formatTHB(b2bInvoices.filter((i) => i.status === "SENT").reduce((s, i) => s + i.grandTotal, 0))}
          </div>
        </Card>

        <Card className="border-slate-200/80 shadow-2xs bg-white p-5">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            ชำระแล้ว (Paid / Completed)
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-emerald-600 tabular-nums">
              {b2bInvoices.filter((i) => i.status === "PAID").length}
            </span>
            <span className="text-xs font-semibold text-slate-500">ฉบับ</span>
          </div>
          <div className="text-xs font-medium text-emerald-700 mt-1">
            ยอดรับเงินแล้ว {formatTHB(b2bInvoices.filter((i) => i.status === "PAID").reduce((s, i) => s + i.grandTotal, 0))}
          </div>
        </Card>

        <Card className="border-rose-200 bg-rose-50/40 shadow-2xs p-5">
          <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">
            เกินกำหนดชำระ (Overdue)
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-rose-700 tabular-nums">
              {formatTHB(b2bOverdueAmount)}
            </span>
          </div>
          <div className="text-xs font-semibold text-rose-600 mt-1">
            {b2bInvoices.filter((i) => i.status === "OVERDUE").length} รายการเลยกำหนดนัดจ่าย
          </div>
        </Card>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("b2b")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "b2b"
              ? "border-teal-600 text-teal-800 bg-teal-50/50"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Building className="h-4 w-4" />
          <span>ใบแจ้งหนี้องค์กร (B2B Invoices)</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs bg-slate-200/80 text-slate-700 font-mono">
            {b2bInvoices.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("pos")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "pos"
              ? "border-teal-600 text-teal-800 bg-teal-50/50"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Receipt className="h-4 w-4" />
          <span>ใบกำกับภาษีขายหน้าร้าน (POS Tax Invoices)</span>
        </button>
      </div>

      {/* 4. Tab 1: B2B Invoices Table */}
      {activeTab === "b2b" && (
        <Card className="border-slate-200/90 shadow-2xs overflow-hidden bg-white">
          {/* Filters Bar */}
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center gap-2">
              {["ALL", "SENT", "PAID", "OVERDUE"].map((status) => (
                <button
                  key={status}
                  onClick={() => setB2bFilter(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    b2bFilter === status
                      ? "bg-teal-600 text-white shadow-2xs"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {status === "ALL" && "ทั้งหมด"}
                  {status === "SENT" && "รอชำระเงิน"}
                  {status === "PAID" && "ชำระแล้ว"}
                  {status === "OVERDUE" && "เกินกำหนด"}
                </button>
              ))}
            </div>

            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={b2bSearch}
                onChange={(e) => setB2bSearch(e.target.value)}
                placeholder="ค้นหาเลขที่, ชื่อบริษัท, PO..."
                className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs focus:ring-2 focus:ring-teal-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">เลขที่ใบแจ้งหนี้</th>
                  <th className="py-3 px-4">บริษัท / ผู้ซื้อ</th>
                  <th className="py-3 px-4">PO อ้างอิง</th>
                  <th className="py-3 px-4">วันครบกำหนด</th>
                  <th className="py-3 px-4 text-right">ยอดรวมสุทธิ (VAT 7%)</th>
                  <th className="py-3 px-4 text-center">สถานะ</th>
                  <th className="py-3 px-4 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredB2B.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-teal-800 text-xs">
                      {inv.invoiceNo}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{inv.companyName}</div>
                      <div className="text-xs text-slate-400 font-mono">Tax ID: {inv.taxId}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                      {inv.poNumber}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      {inv.dueDate}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-slate-900 tabular-nums">
                      {formatTHB(inv.grandTotal)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {inv.status === "PAID" && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ชำระแล้ว
                        </span>
                      )}
                      {inv.status === "SENT" && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          รอรับเงิน
                        </span>
                      )}
                      {inv.status === "OVERDUE" && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          เกินกำหนด
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedB2B(inv);
                            setSelectedPOS(null);
                            setPreviewModalOpen(true);
                          }}
                          className="h-8 px-2.5 text-xs font-semibold gap-1.5 border-slate-200 hover:bg-slate-100 cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5 text-slate-500" />
                          <span>ดูบิล A4</span>
                        </Button>

                        {inv.status !== "PAID" && (
                          <Button
                            size="sm"
                            onClick={() => handleMarkAsPaid(inv.id)}
                            className="h-8 px-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                          >
                            รับชำระ
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 5. Tab 2: POS Tax Invoices Table */}
      {activeTab === "pos" && (
        <Card className="border-slate-200/90 shadow-2xs overflow-hidden bg-white">
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={posFromDate}
                onChange={(e) => setPosFromDate(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs"
              />
              <span className="text-xs text-slate-400">ถึง</span>
              <input
                type="date"
                value={posToDate}
                onChange={(e) => setPosToDate(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs"
              />
            </div>

            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={posSearch}
                onChange={(e) => setPosSearch(e.target.value)}
                placeholder="ค้นหาเลขที่บิล, ชื่อลูกค้า..."
                className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs focus:ring-2 focus:ring-teal-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">เลขที่ใบกำกับภาษี</th>
                  <th className="py-3 px-4">วันที่ / เวลา</th>
                  <th className="py-3 px-4">ลูกค้า (Customer)</th>
                  <th className="py-3 px-4 text-right">มูลค่าก่อน VAT</th>
                  <th className="py-3 px-4 text-right">VAT 7%</th>
                  <th className="py-3 px-4 text-right">ยอดสุทธิ</th>
                  <th className="py-3 px-4 text-center">สถานะ</th>
                  <th className="py-3 px-4 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {posInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-teal-800 text-xs">
                      {inv.invoiceNo}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {formatBkk(inv.createdAt)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{inv.customerName}</div>
                      {inv.customerPhone && (
                        <div className="text-xs text-slate-400 font-mono">{inv.customerPhone}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-600 tabular-nums">
                      {formatTHB(round2(inv.netAmount - inv.vatAmount))}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-600 tabular-nums">
                      {formatTHB(inv.vatAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 tabular-nums">
                      {formatTHB(inv.netAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {inv.status === "COMPLETED" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                          สมบูรณ์
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700">
                          ยกเลิก
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedPOS(inv);
                          setSelectedB2B(null);
                          setPreviewModalOpen(true);
                        }}
                        className="h-8 px-2.5 text-xs font-semibold gap-1.5 border-slate-200 hover:bg-slate-100 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5 text-slate-500" />
                        <span>ดูบิล A4</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 6. TRUE REAL A4 DOCUMENT PREVIEW MODAL (ขนาดมาตรฐานสากล 210mm x 297mm) */}
      {/* ========================================================================= */}
      <Dialog
        open={previewModalOpen}
        onOpenChange={setPreviewModalOpen}
        maxWidth="max-w-5xl"
        className="p-0 overflow-hidden"
      >
        <div className="w-full flex flex-col bg-slate-900/90 text-white">
          {/* Modal Top Header Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950 no-print">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-teal-600/20 text-teal-400 flex items-center justify-center font-bold">
                <FileCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {selectedB2B
                    ? "ใบแจ้งหนี้ / ใบกำกับภาษี (Invoice / Tax Invoice)"
                    : "ใบเสร็จรับเงิน / ใบกำกับภาษี (Receipt / Tax Invoice)"}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-teal-400 font-mono">
                    {selectedB2B?.invoiceNo || selectedPOS?.invoiceNo}
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-emerald-400 font-medium">
                    สัดส่วนกระดาษจริง A4 (210 × 297 มม.) มาตรฐานสากล
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setPreviewModalOpen(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Modal Body: Document Viewer with Realistic Paper Elevation */}
          <div className="max-h-[78vh] overflow-y-auto p-4 sm:p-10 bg-slate-200/90 flex justify-center">
            {/* The Authentic A4 Paper Sheet */}
            <div
              id="printable-a4-sheet"
              className="printable-a4-sheet invoice-a4-preview bg-white shadow-2xl border border-slate-300 w-full max-w-[210mm] min-h-[297mm] p-8 sm:p-14 text-slate-900 font-sans space-y-6 rounded-xs"
              style={{ minHeight: "297mm" }}
            >
              {/* Document Header (บริษัทผู้ออกบิล & ข้อมูลภาษี) */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-teal-600" />
                    <h2 className="font-black text-xl text-slate-900 tracking-tight">
                      บริษัท โมบายช็อป ฮับ จำกัด
                    </h2>
                  </div>
                  <div className="font-bold text-xs text-slate-700">
                    MobileShop HQ ({selectedPOS?.branchName || currentBranch.name})
                  </div>
                  <div className="text-xs text-slate-600 max-w-md leading-relaxed">
                    123/45 ถนนสุขุมวิท ซอย 55 แขวงคลองเตยเหนือ เขตวัฒนา กรุงเทพฯ 10110
                  </div>
                  <div className="text-xs text-slate-700 font-mono">
                    เลขประจำตัวผู้เสียภาษีอากร: <strong>0105561234567</strong> (สำนักงานใหญ่)
                  </div>
                  <div className="text-xs text-slate-600">
                    โทร: 02-123-4567 • www.mobileshophub.com
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <h1 className="font-black text-2xl text-slate-900 tracking-tight">
                    {selectedB2B ? "ใบแจ้งหนี้ / ใบกำกับภาษี" : "ใบเสร็จรับเงิน / ใบกำกับภาษี"}
                  </h1>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    {selectedB2B ? "INVOICE / TAX INVOICE" : "RECEIPT / TAX INVOICE"}
                  </div>
                  <div className="text-xs font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded inline-block mt-1">
                    ต้นฉบับ (Original)
                  </div>

                  <div className="pt-2 text-xs font-mono space-y-0.5">
                    <div>
                      เลขที่เอกสาร:{" "}
                      <strong className="text-sm font-extrabold text-slate-900">
                        {selectedB2B?.invoiceNo || selectedPOS?.invoiceNo}
                      </strong>
                    </div>
                    <div>
                      วันที่ออก:{" "}
                      {selectedB2B
                        ? formatDateThaiOnly(selectedB2B.issueDate)
                        : selectedPOS && formatDateThaiOnly(selectedPOS.createdAt)}
                    </div>
                    {selectedB2B?.dueDate && (
                      <div className="text-rose-700 font-bold">
                        วันครบกำหนด: {formatDateThaiOnly(selectedB2B.dueDate)}
                      </div>
                    )}
                    {selectedB2B?.poNumber && (
                      <div>
                        PO อ้างอิง: <strong>{selectedB2B.poNumber}</strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Customer Box (ข้อมูลลูกค้า / บริษัทผู้ซื้อ) */}
              <div className="rounded-xl border border-slate-300 bg-slate-50/70 p-4 text-xs grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="font-bold text-slate-500 uppercase tracking-wider block text-[11px]">
                    ลูกค้า / ผู้รับบริการ (Customer Details):
                  </span>
                  <div className="font-extrabold text-sm text-slate-900">
                    {selectedB2B?.companyName || selectedPOS?.customerName}
                  </div>
                  <div className="text-slate-700 leading-relaxed">
                    {selectedB2B?.address || "กรุงเทพมหานคร"}
                  </div>
                  {selectedPOS?.customerPhone && (
                    <div className="text-slate-600 font-mono">
                      โทร: {selectedPOS.customerPhone}
                    </div>
                  )}
                </div>

                <div className="space-y-1 md:text-right">
                  <span className="font-bold text-slate-500 uppercase tracking-wider block text-[11px]">
                    ข้อมูลภาษี & อ้างอิง (Tax & Terms):
                  </span>
                  <div className="font-mono text-slate-800">
                    เลขประจำตัวผู้เสียภาษี:{" "}
                    <strong>{selectedB2B?.taxId || "0105561098765"}</strong>
                  </div>
                  <div className="text-slate-600">
                    สาขา:{" "}
                    <strong>
                      {selectedB2B?.branchId === "00000" || !selectedB2B?.branchId
                        ? "สำนักงานใหญ่ (00000)"
                        : `สาขาที่ ${selectedB2B.branchId}`}
                    </strong>
                  </div>
                  <div className="text-slate-600">
                    เงื่อนไขการชำระ: เครดิตเทอม 30 วัน (โอนเข้าบัญชีบริษัท)
                  </div>
                </div>
              </div>

              {/* Items Table with True A4 Desktop Column Spacing */}
              <div className="border border-slate-300 rounded-lg overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 font-extrabold text-slate-800 border-b border-slate-300">
                    <tr>
                      <th className="p-3 text-center w-12 border-r border-slate-200">#</th>
                      <th className="p-3 text-left border-r border-slate-200">
                        รายการสินค้า / บริการ (Description)
                      </th>
                      <th className="p-3 text-center w-20 border-r border-slate-200">
                        จำนวน (Qty)
                      </th>
                      <th className="p-3 text-right w-32 border-r border-slate-200">
                        ราคา/หน่วย (Unit Price)
                      </th>
                      <th className="p-3 text-right w-36">รวมเงิน (Amount)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    {selectedB2B?.items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-3 text-center text-slate-400 font-mono border-r border-slate-200">
                          {idx + 1}
                        </td>
                        <td className="p-3 font-semibold text-slate-900 border-r border-slate-200 leading-normal">
                          {it.name}
                        </td>
                        <td className="p-3 text-center font-mono border-r border-slate-200">
                          {it.qty}
                        </td>
                        <td className="p-3 text-right font-mono border-r border-slate-200 tabular-nums">
                          {formatTHB(it.unitPrice)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                          {formatTHB(it.total)}
                        </td>
                      </tr>
                    ))}

                    {selectedPOS?.items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-3 text-center text-slate-400 font-mono border-r border-slate-200">
                          {idx + 1}
                        </td>
                        <td className="p-3 font-semibold text-slate-900 border-r border-slate-200 leading-normal">
                          {it.name}
                          {it.imei && (
                            <div className="text-[11px] font-mono font-normal text-slate-500 mt-0.5">
                              IMEI: {it.imei}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center font-mono border-r border-slate-200">
                          {it.qty}
                        </td>
                        <td className="p-3 text-right font-mono border-r border-slate-200 tabular-nums">
                          {formatTHB(it.unitPrice)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                          {formatTHB(it.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals & Thai Baht Text */}
              <div className="flex flex-col md:flex-row justify-between items-start gap-4 pt-2">
                {/* Thai Baht text box */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700 flex-1 w-full">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">
                    จำนวนเงินตัวอักษร (Total in words):
                  </div>
                  <div className="font-bold text-sm text-slate-900 mt-1">
                    (
                    {bahtText(
                      selectedB2B?.grandTotal || selectedPOS?.netAmount || 0
                    )}
                    )
                  </div>
                </div>

                {/* Calculation breakdown */}
                <div className="w-full md:w-80 space-y-1.5 font-mono text-xs">
                  {selectedB2B && (selectedB2B.nonVatSubtotal || 0) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>มูลค่ายกเว้นภาษี (Non-VAT):</span>
                      <span className="font-semibold tabular-nums text-slate-700">
                        {formatTHB(selectedB2B.nonVatSubtotal || 0)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-600">
                    <span>มูลค่าก่อนภาษี (Taxable Base):</span>
                    <span className="font-semibold tabular-nums">
                      {formatTHB(
                        selectedB2B
                          ? (selectedB2B.taxableSubtotal ?? selectedB2B.subtotal)
                          : selectedPOS
                          ? round2(selectedPOS.netAmount - selectedPOS.vatAmount)
                          : 0
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-600">
                    <span>ภาษีมูลค่าเพิ่ม 7% (VAT):</span>
                    <span className="font-semibold tabular-nums">
                      {formatTHB(
                        selectedB2B?.vatAmount || selectedPOS?.vatAmount || 0
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t-2 border-slate-900">
                    <span className="font-sans">ยอดรวมทั้งสิ้น (Grand Total):</span>
                    <span className="text-teal-800 tabular-nums">
                      {formatTHB(
                        selectedB2B?.grandTotal || selectedPOS?.netAmount || 0
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Signatures Block (ผู้มีอำนาจลงนาม & ผู้รับสินค้า) */}
              <div className="pt-10 grid grid-cols-2 gap-8 text-center text-xs text-slate-600 border-t border-slate-200 mt-6">
                <div>
                  <div className="border-b border-slate-400 w-52 mx-auto mb-2 pb-6" />
                  <div className="font-bold text-slate-900">ผู้มีอำนาจลงนาม / ผู้ออกบิล</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Authorized Signature</div>
                  <div className="text-[11px] text-slate-500 mt-1 font-mono">วันที่: ....../....../......</div>
                </div>

                <div>
                  <div className="border-b border-slate-400 w-52 mx-auto mb-2 pb-6" />
                  <div className="font-bold text-slate-900">ผู้รับสินค้า / บริการ</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Received By / Customer Signature</div>
                  <div className="text-[11px] text-slate-500 mt-1 font-mono">วันที่: ....../....../......</div>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Bottom Action Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950 no-print">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewModalOpen(false)}
              className="text-slate-300 border-slate-700 hover:bg-slate-800 cursor-pointer"
            >
              ปิดหน้าต่าง
            </Button>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 hidden sm:inline">
                เคล็ดลับ: สั่งพิมพ์และเลือก "Save as PDF" ได้ไฟล์ A4 คุณภาพสูง
              </span>
              <Button
                onClick={() => window.print()}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold gap-2 px-5 cursor-pointer shadow-sm"
              >
                <Printer className="h-4 w-4" />
                <span>พิมพ์ใบแจ้งหนี้ A4 (Print A4)</span>
              </Button>
            </div>
          </div>
        </div>
      </Dialog>

      {/* ========================================================================= */}
      {/* 7. CREATE NEW B2B INVOICE MODAL */}
      {/* ========================================================================= */}
      <Dialog
        open={newB2BModalOpen}
        onOpenChange={setNewB2BModalOpen}
        maxWidth="max-w-xl"
      >
        <DialogHeader>
          <DialogTitle onClose={() => setNewB2BModalOpen(false)}>
            สร้างใบแจ้งหนี้องค์กร (B2B Tax Invoice)
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            ออกใบแจ้งหนี้ วางบิลเครดิตเทอมสำหรับลูกค้าบริษัทและองค์กร
          </DialogDescription>
        </DialogHeader>

        <DialogContent className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1 block">
              ชื่อบริษัท / องค์กรคู่ค้า *
            </label>
            <Input
              placeholder="เช่น บริษัท เอสซีบี ดิจิทัล จำกัด"
              value={newCompany}
              onChange={(e) => setNewCompany(e.target.value)}
              className="text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  เลขประจำตัวผู้เสียภาษี (13 หลัก) *
                </label>
                {newTaxId && (
                  <span className={`text-[10px] font-bold ${validateThaiTaxId(newTaxId.replace(/[^0-9]/g, "")).valid ? "text-emerald-600" : "text-rose-600"}`}>
                    {validateThaiTaxId(newTaxId.replace(/[^0-9]/g, "")).valid ? "✓ ถูกต้อง" : "✕ ไม่ถูกต้อง"}
                  </span>
                )}
              </div>
              <Input
                placeholder="0105562000000"
                value={newTaxId}
                onChange={(e) => setNewTaxId(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">
                รหัสสาขา (00000 = สำนักงานใหญ่) *
              </label>
              <Input
                placeholder="00000"
                value={newBranchId}
                onChange={(e) => setNewBranchId(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">
                เลขที่ PO ลูกค้า
              </label>
              <Input
                placeholder="PO-2026-001"
                value={newPo}
                onChange={(e) => setNewPo(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">
                วันครบกำหนดชำระ (Due Date)
              </label>
              <Input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 mb-1 block">
              ที่อยู่ตามใบกำกับภาษี *
            </label>
            <Input
              placeholder="เลขที่ ถนน แขวง เขต จังหวัด รหัสไปรษณีย์"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              className="text-sm"
            />
          </div>

          <div className="pt-3 border-t border-slate-200">
            <label className="text-xs font-bold text-slate-700 mb-1 block">
              รายการสินค้า / อะไหล่ / ค่าบริการซ่อม *
            </label>
            <Input
              placeholder="เช่น เปลี่ยนจอ iPhone 15 3 เครื่อง (งานเคลมองค์กร)"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">จำนวน</label>
              <Input
                type="number"
                min="1"
                value={newItemQty}
                onChange={(e) => setNewItemQty(parseInt(e.target.value) || 1)}
                className="font-mono text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">
                ราคา/หน่วย
              </label>
              <Input
                type="number"
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(parseFloat(e.target.value) || 0)}
                className="font-mono text-sm font-bold"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="exemptVat"
              checked={newItemIsVatExempt}
              onChange={(e) => setNewItemIsVatExempt(e.target.checked)}
              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
            />
            <label htmlFor="exemptVat" className="text-xs font-medium text-slate-700 cursor-pointer">
              สินค้ายกเว้นภาษีมูลค่าเพิ่ม (Non-VAT / Tax-exempt)
            </label>
          </div>

          {/* Live Calculation Preview */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs font-mono">
            <div className="flex justify-between text-slate-500">
              <span>{newItemIsVatExempt ? "มูลค่ายกเว้นภาษี (Non-VAT):" : "มูลค่าก่อนภาษี (Taxable Base):"}</span>
              <span className="font-bold text-slate-800">
                {formatTHB(newItemQty * newItemPrice)}
              </span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>ภาษีมูลค่าเพิ่ม 7% (VAT):</span>
              <span className="font-bold text-teal-700">
                {formatTHB(newItemIsVatExempt ? 0 : round2(newItemQty * newItemPrice * 0.07))}
              </span>
            </div>
            <div className="flex justify-between text-slate-900 font-bold pt-1 border-t border-slate-200">
              <span>ยอดรวมทั้งสิ้น (Grand Total):</span>
              <span className="text-teal-800 text-sm">
                {formatTHB(
                  newItemIsVatExempt
                    ? newItemQty * newItemPrice
                    : round2(newItemQty * newItemPrice + round2(newItemQty * newItemPrice * 0.07))
                )}
              </span>
            </div>
          </div>

          {b2bFormError && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{b2bFormError}</span>
            </div>
          )}
        </DialogContent>

        <DialogFooter className="flex justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={b2bBusy}
            onClick={() => setNewB2BModalOpen(false)}
            className="cursor-pointer"
          >
            ยกเลิก
          </Button>
          <Button
            size="sm"
            disabled={b2bBusy}
            onClick={handleCreateB2B}
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer"
          >
            {b2bBusy ? "กำลังบันทึก..." : "ออกใบแจ้งหนี้ B2B"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
