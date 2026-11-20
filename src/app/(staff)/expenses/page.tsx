"use client";

import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  Wallet,
  Plus,
  Download,
  Calendar,
  Building2,
  Search,
  Filter,
  Tag,
  Paperclip,
  Trash2,
  AlertCircle,
  Home,
  Zap,
  Coffee,
  Wrench,
  Megaphone,
  Layers,
  Loader2,
  RefreshCw,
  FileText,
  CreditCard,
  Banknote,
  DollarSign,
  TrendingUp,
  Percent,
  CheckCircle2,
  FileCheck,
  Edit2,
  ExternalLink,
  Eye,
  UploadCloud,
  X,
  PieChart as PieChartIcon,
  BarChart3,
  ShieldAlert,
  ArrowUpRight,
  Receipt,
  Users,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { formatTHB, validateThaiTaxId } from "@/lib/utils";

type ExpenseCategory =
  | "RENT"
  | "UTILITIES"
  | "SUPPLIES"
  | "SALARIES"
  | "MAINTENANCE"
  | "MARKETING"
  | "CONSUMABLES"
  | "WELFARE"
  | "OTHER";

type PaymentMethod = "CASH" | "TRANSFER" | "CREDIT_CARD" | "PROMPTPAY" | "CHEQUE";

interface ExpenseItem {
  id: string;
  expenseNo: string;
  title: string;
  category: ExpenseCategory;
  branchId: string;
  amount: number;
  date: string; // YYYY-MM-DD (Bangkok)
  paymentMethod: PaymentMethod;
  payee: string | null;
  payeeTaxId: string | null;
  taxInvoiceNo: string | null;
  isVatEligible: boolean;
  vatRate: number;
  vatAmount: number;
  whtRate: number;
  whtAmount: number;
  whtType: "PND3" | "PND53" | null;
  netPayment: number;
  notes: string | null;
  receiptUrl: string | null;
  createdAt: string;
  updatedAt: string;
  branch: { id: string; name: string; code: string } | null;
  createdBy: { id: string; name: string } | null;
}

interface ExpenseTaxSummary {
  totalInputVat: number;
  eligibleExpenseAmount: number;
  eligibleCount: number;
  totalWht: number;
  whtPnd3: number;
  whtPnd53: number;
  whtCount: number;
  totalNetPayment: number;
}

interface ExpenseTotals {
  total: number;
  count: number;
  byCategory: Record<string, { amount: number; count: number }>;
  byPaymentMethod: Record<string, { amount: number; count: number }>;
  taxSummary: ExpenseTaxSummary;
}

interface ExpenseAnalytics {
  salesRevenue: number;
  grossSales: number;
  salesVatOutput: number;
  totalOpex: number;
  operatingProfit: number;
  opexRatio: number;
  monthlyTrend: Array<{ month: string; amount: number; count: number }>;
}

const bangkokDay = (d: Date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(d);

/** Fetch JSON and throw the server's Thai error message unless both res.ok and json.success. */
async function fetchJson<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new Error(json?.error || `ไม่สามารถทำรายการได้ (${res.status})`);
  }
  return json as T;
}

const CATEGORY_MAP: Record<
  ExpenseCategory,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string; border: string }
> = {
  RENT: { label: "ค่าเช่าพื้นที่", icon: Home, color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200" },
  UTILITIES: { label: "ค่าน้ำ-ไฟ-เน็ต", icon: Zap, color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  SUPPLIES: { label: "วัสดุ & อุปกรณ์สำนักงาน", icon: Layers, color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  SALARIES: { label: "เงินเดือน & ค่าจ้าง", icon: Users, color: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-200" },
  MAINTENANCE: { label: "ซ่อมบำรุงร้าน & อุปกรณ์", icon: Wrench, color: "text-teal-700", bg: "bg-teal-50", border: "border-teal-200" },
  MARKETING: { label: "การตลาด & โฆษณา", icon: Megaphone, color: "text-pink-700", bg: "bg-pink-50", border: "border-pink-200" },
  CONSUMABLES: { label: "อะไหล่สิ้นเปลือง & เคมีภัณฑ์", icon: Layers, color: "text-cyan-700", bg: "bg-cyan-50", border: "border-cyan-200" },
  WELFARE: { label: "สวัสดิการ & พนักงาน", icon: Coffee, color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  OTHER: { label: "ค่าใช้จ่ายเบ็ดเตล็ด", icon: Tag, color: "text-slate-700", bg: "bg-slate-100", border: "border-slate-200" },
};

const PAYMENT_METHOD_MAP: Record<PaymentMethod, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  CASH: { label: "เงินสด", icon: Banknote },
  TRANSFER: { label: "โอนเงินผ่านธนาคาร", icon: ArrowUpRight },
  CREDIT_CARD: { label: "บัตรเครดิต", icon: CreditCard },
  PROMPTPAY: { label: "พร้อมเพย์", icon: Zap },
  CHEQUE: { label: "เช็คธนาคาร", icon: FileText },
};

const EMPTY_TAX_SUMMARY: ExpenseTaxSummary = {
  totalInputVat: 0,
  eligibleExpenseAmount: 0,
  eligibleCount: 0,
  totalWht: 0,
  whtPnd3: 0,
  whtPnd53: 0,
  whtCount: 0,
  totalNetPayment: 0,
};

const EMPTY_TOTALS: ExpenseTotals = {
  total: 0,
  count: 0,
  byCategory: {},
  byPaymentMethod: {},
  taxSummary: EMPTY_TAX_SUMMARY,
};

const EMPTY_ANALYTICS: ExpenseAnalytics = {
  salesRevenue: 0,
  grossSales: 0,
  salesVatOutput: 0,
  totalOpex: 0,
  operatingProfit: 0,
  opexRatio: 0,
  monthlyTrend: [],
};

export default function ExpensesPage() {
  const { currentBranch, currentUser, branches } = useApp();
  const isAdmin = currentUser.role === "ADMIN";
  const isManagerOrAdmin = ["ADMIN", "MANAGER"].includes(currentUser.role);

  const [activeTab, setActiveTab] = useState<"list" | "analytics">("list");
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [totals, setTotals] = useState<ExpenseTotals>(EMPTY_TOTALS);
  const [analytics, setAnalytics] = useState<ExpenseAnalytics>(EMPTY_ANALYTICS);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState(() => bangkokDay().slice(0, 7));
  const [selectedBranch, setSelectedBranch] = useState("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("ALL");
  const [selectedVatFilter, setSelectedVatFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Create / Edit Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Action
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Receipt Preview Dialog
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState<ExpenseCategory>("SUPPLIES");
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(() => bangkokDay());
  const [formBranchId, setFormBranchId] = useState("");
  const [formPaymentMethod, setFormPaymentMethod] = useState<PaymentMethod>("TRANSFER");
  const [formPayee, setFormPayee] = useState("");
  const [formPayeeTaxId, setFormPayeeTaxId] = useState("");
  const [formTaxInvoiceNo, setFormTaxInvoiceNo] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formReceiptUrl, setFormReceiptUrl] = useState("");

  // Tax Integration Form State
  const [formIsVatEligible, setFormIsVatEligible] = useState(false);
  const [formVatRate, setFormVatRate] = useState("7");
  const [formCustomVatAmount, setFormCustomVatAmount] = useState("");
  const [formApplyWht, setFormApplyWht] = useState(false);
  const [formWhtRate, setFormWhtRate] = useState("3");
  const [formWhtType, setFormWhtType] = useState<"PND3" | "PND53">("PND53");
  const [formCustomWhtAmount, setFormCustomWhtAmount] = useState("");

  // Receipt File Upload State
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live Tax Calculations for Form
  const liveCalculations = useMemo(() => {
    const rawAmount = parseFloat(formAmount) || 0;
    const vatRateNum = parseFloat(formVatRate) || 0;
    const whtRateNum = parseFloat(formWhtRate) || 0;

    let baseAmount = rawAmount;
    let vatAmount = 0;

    if (formIsVatEligible) {
      if (formCustomVatAmount !== "") {
        vatAmount = parseFloat(formCustomVatAmount) || 0;
        baseAmount = Math.max(0, rawAmount - vatAmount);
      } else {
        baseAmount = Math.round((rawAmount / (1 + vatRateNum / 100)) * 100) / 100;
        vatAmount = Math.round((rawAmount - baseAmount) * 100) / 100;
      }
    }

    let whtAmount = 0;
    if (formApplyWht && whtRateNum > 0) {
      if (formCustomWhtAmount !== "") {
        whtAmount = parseFloat(formCustomWhtAmount) || 0;
      } else {
        // Withholding tax is computed from the pre-VAT base amount
        whtAmount = Math.round((baseAmount * (whtRateNum / 100)) * 100) / 100;
      }
    }

    const netPayment = Math.round((rawAmount - whtAmount) * 100) / 100;

    return {
      rawAmount,
      baseAmount,
      vatAmount,
      whtAmount,
      netPayment,
    };
  }, [
    formAmount,
    formIsVatEligible,
    formVatRate,
    formCustomVatAmount,
    formApplyWht,
    formWhtRate,
    formCustomWhtAmount,
  ]);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const qs = new URLSearchParams({ month: selectedMonth, take: "500" });
      if (selectedBranch !== "ALL") qs.set("branch", selectedBranch);
      if (selectedCategory !== "ALL") qs.set("category", selectedCategory);
      if (selectedPaymentMethod !== "ALL") qs.set("paymentMethod", selectedPaymentMethod);
      if (selectedVatFilter !== "ALL") qs.set("isVatEligible", selectedVatFilter);
      if (searchQuery.trim()) qs.set("search", searchQuery.trim());

      const json = await fetchJson<{
        data: ExpenseItem[];
        totals: ExpenseTotals;
        analytics: ExpenseAnalytics;
        truncated: boolean;
      }>(`/api/expenses?${qs}`);

      setExpenses(json.data || []);
      setTotals(json.totals ?? EMPTY_TOTALS);
      setAnalytics(json.analytics ?? EMPTY_ANALYTICS);
      setTruncated(Boolean(json.truncated));
    } catch (e) {
      setExpenses([]);
      setTotals(EMPTY_TOTALS);
      setAnalytics(EMPTY_ANALYTICS);
      setLoadError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedBranch, selectedCategory, selectedPaymentMethod, selectedVatFilter, searchQuery]);

  useEffect(() => {
    void loadExpenses();
  }, [loadExpenses]);

  const openCreateModal = () => {
    setEditingExpenseId(null);
    setFormTitle("");
    setFormCategory("SUPPLIES");
    setFormAmount("");
    setFormDate(bangkokDay());
    setFormBranchId(currentBranch.id || branches[0]?.id || "");
    setFormPaymentMethod("TRANSFER");
    setFormPayee("");
    setFormPayeeTaxId("");
    setFormTaxInvoiceNo("");
    setFormNotes("");
    setFormReceiptUrl("");
    setFormIsVatEligible(false);
    setFormVatRate("7");
    setFormCustomVatAmount("");
    setFormApplyWht(false);
    setFormWhtRate("3");
    setFormWhtType("PND53");
    setFormCustomWhtAmount("");
    setFormError(null);
    setCreateModalOpen(true);
  };

  const openEditModal = (exp: ExpenseItem) => {
    setEditingExpenseId(exp.id);
    setFormTitle(exp.title);
    setFormCategory(exp.category);
    setFormAmount(String(exp.amount));
    setFormDate(exp.date);
    setFormBranchId(exp.branchId);
    setFormPaymentMethod(exp.paymentMethod || "CASH");
    setFormPayee(exp.payee || "");
    setFormPayeeTaxId(exp.payeeTaxId || "");
    setFormTaxInvoiceNo(exp.taxInvoiceNo || "");
    setFormNotes(exp.notes || "");
    setFormReceiptUrl(exp.receiptUrl || "");
    setFormIsVatEligible(exp.isVatEligible);
    setFormVatRate(String(exp.vatRate || 7));
    setFormCustomVatAmount(exp.vatAmount ? String(exp.vatAmount) : "");
    setFormApplyWht(Boolean(exp.whtRate && exp.whtRate > 0));
    setFormWhtRate(String(exp.whtRate || 3));
    setFormWhtType(exp.whtType || "PND53");
    setFormCustomWhtAmount(exp.whtAmount ? String(exp.whtAmount) : "");
    setFormError(null);
    setCreateModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setFormError("ขนาดไฟล์ต้องไม่เกิน 10 MB");
      return;
    }

    setUploadingReceipt(true);
    setUploadProgress("กำลังอัปโหลดไปยัง Cloudflare R2...");
    setFormError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/expenses/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || "อัปโหลดใบเสร็จไม่สำเร็จ");
      }

      setFormReceiptUrl(json.url);
      setUploadProgress("อัปโหลดสำเร็จ!");
      setTimeout(() => setUploadProgress(null), 2000);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "อัปโหลดไฟล์ล้มเหลว");
      setUploadProgress(null);
    } finally {
      setUploadingReceipt(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveExpense = async () => {
    const amount = Number(formAmount);
    if (!formTitle.trim()) {
      setFormError("กรุณากรอกชื่อรายการค่าใช้จ่าย");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("กรุณากรอกจำนวนเงินให้ถูกต้อง (ต้องมากกว่า 0)");
      return;
    }
    if (!formBranchId) {
      setFormError("กรุณาเลือกสาขาที่จ่าย");
      return;
    }
    if (formDate > bangkokDay()) {
      setFormError("วันที่ทำรายการไม่สามารถเป็นวันในอนาคตได้");
      return;
    }

    if (formPayeeTaxId.trim()) {
      const cleaned = formPayeeTaxId.replace(/[^0-9]/g, "");
      const taxCheck = validateThaiTaxId(cleaned);
      if (!taxCheck.valid) {
        setFormError(taxCheck.message || "เลขประจำตัวผู้เสียภาษี 13 หลักไม่ถูกต้อง");
        return;
      }
    }

    setSaving(true);
    setFormError(null);

    const payload: Record<string, unknown> = {
      title: formTitle.trim(),
      category: formCategory,
      amount,
      date: formDate,
      branchId: formBranchId,
      paymentMethod: formPaymentMethod,
      payee: formPayee.trim() || undefined,
      payeeTaxId: formPayeeTaxId.replace(/[^0-9]/g, "") || undefined,
      taxInvoiceNo: formTaxInvoiceNo.trim() || undefined,
      notes: formNotes.trim() || undefined,
      receiptUrl: formReceiptUrl.trim() || undefined,
      isVatEligible: formIsVatEligible,
      vatRate: formIsVatEligible ? parseFloat(formVatRate) || 7.0 : 0,
      vatAmount: formIsVatEligible ? liveCalculations.vatAmount : 0,
      whtRate: formApplyWht ? parseFloat(formWhtRate) || 0 : 0,
      whtType: formApplyWht ? formWhtType : undefined,
      whtAmount: formApplyWht ? liveCalculations.whtAmount : 0,
    };

    try {
      if (editingExpenseId) {
        payload.id = editingExpenseId;
        await fetchJson("/api/expenses", {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await fetchJson("/api/expenses", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setCreateModalOpen(false);
      await loadExpenses();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async (exp: ExpenseItem) => {
    if (!confirm(`คุณแน่ใจว่าต้องการลบรายการ ${exp.expenseNo} (${exp.title}) หรือไม่?`)) return;
    setDeletingId(exp.id);
    setActionError(null);
    try {
      await fetchJson(`/api/expenses?id=${encodeURIComponent(exp.id)}`, { method: "DELETE" });
      await loadExpenses();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "ลบรายการไม่สำเร็จ");
    } finally {
      setDeletingId(null);
    }
  };

  const exportCSV = () => {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const headers = [
      "เลขที่เอกสาร",
      "วันที่",
      "หมวดหมู่",
      "ชื่อรายการ",
      "สาขา",
      "วิธีชำระเงิน",
      "ผู้รับเงิน/คู่ค้า",
      "เลขประจำตัวผู้เสียภาษี",
      "เลขที่ใบกำกับภาษี",
      "ยอดเงินรวม (บาท)",
      "ขอคืนภาษีซื้อได้ (ภ.พ.30)",
      "ภาษีซื้อ (บาท)",
      "อัตราหัก ณ ที่จ่าย (%)",
      "แบบภาษีหัก ณ ที่จ่าย",
      "ภาษีหัก ณ ที่จ่าย (บาท)",
      "ยอดจ่ายสุทธิ (บาท)",
      "ลิงก์ใบเสร็จ",
      "ผู้บันทึก",
    ].join(",");

    const rows = expenses.map((e) =>
      [
        esc(e.expenseNo),
        esc(e.date),
        esc(CATEGORY_MAP[e.category]?.label || e.category),
        esc(e.title),
        esc(e.branch?.name ?? ""),
        esc(PAYMENT_METHOD_MAP[e.paymentMethod]?.label || e.paymentMethod),
        esc(e.payee ?? ""),
        esc(e.payeeTaxId ?? ""),
        esc(e.taxInvoiceNo ?? ""),
        e.amount.toFixed(2),
        esc(e.isVatEligible ? "ใช่ (Eligible)" : "ไม่ใช่"),
        e.vatAmount.toFixed(2),
        e.whtRate ? `${e.whtRate}%` : "0%",
        esc(e.whtType ?? "-"),
        e.whtAmount.toFixed(2),
        e.netPayment.toFixed(2),
        esc(e.receiptUrl ?? ""),
        esc(e.createdBy?.name ?? ""),
      ].join(",")
    );

    const csvContent = "\uFEFF" + [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `operating_expenses_${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-sm">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                บันทึกค่าใช้จ่ายดำเนินงาน (Store Operating Expenses)
              </h1>
              <Badge variant="outline" className="text-[11px] font-mono border-blue-200 text-blue-700 bg-blue-50/50">
                OPEX & Thai Tax
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              ควบคุม OPEX, ค่าเช่า, ค่าน้ำ-ไฟ, ค่าจ้าง, ภาษีซื้อ ภ.พ.30, ภาษีหัก ณ ที่จ่าย (WHT), แนบใบเสร็จ Cloudflare R2
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-100/70">
            <button
              onClick={() => setActiveTab("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === "list"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              รายการค่าใช้จ่าย
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === "analytics"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              วิเคราะห์ & P&L
            </button>
          </div>

          <Button
            variant="outline"
            onClick={() => void loadExpenses()}
            disabled={loading}
            className="gap-1.5 text-xs h-9 border-slate-300 hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            รีเฟรช
          </Button>

          <Button
            variant="outline"
            onClick={exportCSV}
            disabled={loading || expenses.length === 0}
            className="gap-1.5 text-xs h-9 border-slate-300 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            ส่งออก CSV
          </Button>

          {isManagerOrAdmin && (
            <Button
              onClick={openCreateModal}
              className="gap-1.5 text-xs h-9 bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              บันทึกค่าใช้จ่ายใหม่
            </Button>
          )}
        </div>
      </div>

      {(loadError || actionError) && (
        <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 shadow-2xs">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">ข้อผิดพลาด: </span>
            {loadError || actionError}
          </div>
        </div>
      )}

      {/* KPI Cards: Top Financial & Tax Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <Card className="border-slate-200 bg-white shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>รวมค่าใช้จ่ายดำเนินงาน</span>
              <Wallet className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">
              {formatTHB(totals.total)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
              <span>{totals.count} รายการ</span>
              {analytics.salesRevenue > 0 && (
                <span className="font-medium text-blue-600">
                  {analytics.opexRatio}% ของยอดขาย
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/40 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-emerald-700 mb-1">
              <span className="font-medium">ภาษีซื้อขอคืนได้ (ภ.พ.30)</span>
              <FileCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-900 tabular-nums">
              {formatTHB(totals.taxSummary.totalInputVat)}
            </div>
            <p className="text-[11px] text-emerald-700 mt-1">
              จากใบกำกับ {totals.taxSummary.eligibleCount} ใบ ({formatTHB(totals.taxSummary.eligibleExpenseAmount)})
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/40 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-purple-700 mb-1">
              <span className="font-medium">ภาษีหัก ณ ที่จ่าย (WHT)</span>
              <Percent className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-900 tabular-nums">
              {formatTHB(totals.taxSummary.totalWht)}
            </div>
            <p className="text-[11px] text-purple-700 mt-1">
              ภ.ง.ด.3: {formatTHB(totals.taxSummary.whtPnd3)} | ภ.ง.ด.53: {formatTHB(totals.taxSummary.whtPnd53)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/40 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-amber-700 mb-1">
              <span className="font-medium">ค่าเช่า & สาธารณูปโภค</span>
              <Home className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-amber-900 tabular-nums">
              {formatTHB((totals.byCategory.RENT?.amount || 0) + (totals.byCategory.UTILITIES?.amount || 0))}
            </div>
            <p className="text-[11px] text-amber-700 mt-1">
              เช่า: {formatTHB(totals.byCategory.RENT?.amount || 0)} | ไฟ/เน็ต: {formatTHB(totals.byCategory.UTILITIES?.amount || 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-indigo-200 bg-indigo-50/40 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-indigo-700 mb-1">
              <span className="font-medium">เงินเดือน & ค่าจ้าง & สด</span>
              <Users className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-bold text-indigo-900 tabular-nums">
              {formatTHB(totals.byCategory.SALARIES?.amount || 0)}
            </div>
            <p className="text-[11px] text-indigo-700 mt-1">
              จ่ายสุทธิทุกหมวด: {formatTHB(totals.taxSummary.totalNetPayment)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-xs text-slate-700">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-medium">งวดเดือน:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-xs text-slate-700">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-medium">สาขา:</span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-800 outline-none cursor-pointer"
            >
              <option value="ALL">ทุกสาขา ({branches.length})</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-xs text-slate-700">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-medium">หมวดหมู่:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-800 outline-none cursor-pointer"
            >
              <option value="ALL">ทุกหมวดหมู่</option>
              {Object.entries(CATEGORY_MAP).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-xs text-slate-700">
            <CreditCard className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-medium">วิธีจ่าย:</span>
            <select
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-800 outline-none cursor-pointer"
            >
              <option value="ALL">ทุกวิธีชำระ</option>
              {Object.entries(PAYMENT_METHOD_MAP).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-xs text-slate-700">
            <FileCheck className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-medium">ภาษี:</span>
            <select
              value={selectedVatFilter}
              onChange={(e) => setSelectedVatFilter(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-800 outline-none cursor-pointer"
            >
              <option value="ALL">ภาษีทั้งหมด</option>
              <option value="true">เฉพาะขอคืนภาษีซื้อได้ (ภ.พ.30)</option>
              <option value="false">ไม่มีภาษีซื้อ</option>
            </select>
          </div>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="ค้นหาชื่อรายการ, ผู้รับเงิน, เลขที่..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-9 bg-slate-50/50"
          />
        </div>
      </div>

      {truncated && (
        <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
          แสดง {expenses.length} รายการล่าสุดจากทั้งหมด {totals.count} รายการ (ยอดสรุปคำนวณจากทุกรายการในงวดนี้)
        </p>
      )}

      {/* VIEW 1: Expenses List Table */}
      {activeTab === "list" && (
        <Card className="border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/75 border-b border-slate-200">
                <TableRow>
                  <TableHead className="text-xs font-semibold text-slate-600">รหัส / วันที่</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">หมวดหมู่</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">รายการ & ผู้รับเงิน</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">สาขา & ชำระเงิน</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600">ภาษี & WHT</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 text-right">ยอดรวม & จ่ายสุทธิ</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 text-center">ใบเสร็จ (R2)</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 text-center">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-48 text-center">
                      <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        <span>กำลังโหลดข้อมูลค่าใช้จ่าย...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
                        <Wallet className="h-9 w-9 text-slate-300" />
                        <p className="text-sm font-medium text-slate-600">
                          {loadError ? "โหลดข้อมูลไม่สำเร็จ" : "ยังไม่มีรายการค่าใช้จ่ายในงวดนี้"}
                        </p>
                        {isManagerOrAdmin && !loadError && (
                          <Button size="sm" onClick={openCreateModal} className="text-xs gap-1.5 bg-blue-600 text-white mt-1">
                            <Plus className="h-3.5 w-3.5" /> บันทึกค่าใช้จ่ายแรก
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((exp) => {
                    const cat = CATEGORY_MAP[exp.category] ?? CATEGORY_MAP.OTHER;
                    const Icon = cat.icon;
                    const pm = PAYMENT_METHOD_MAP[exp.paymentMethod] ?? PAYMENT_METHOD_MAP.CASH;
                    const PmIcon = pm.icon;

                    return (
                      <TableRow key={exp.id} className="hover:bg-slate-50/60 transition-colors">
                        <TableCell className="py-3">
                          <div className="font-mono text-xs font-semibold text-slate-900">{exp.expenseNo}</div>
                          <div className="text-[11px] text-slate-400">{exp.date}</div>
                        </TableCell>

                        <TableCell className="py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${cat.bg} ${cat.color} ${cat.border}`}
                          >
                            <Icon className="h-3 w-3" />
                            <span>{cat.label}</span>
                          </span>
                        </TableCell>

                        <TableCell className="py-3 max-w-xs">
                          <div className="font-semibold text-xs text-slate-900 truncate" title={exp.title}>
                            {exp.title}
                          </div>
                          {(exp.payee || exp.taxInvoiceNo) && (
                            <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-1">
                              {exp.payee && <span>ผู้รับเงิน: {exp.payee}</span>}
                              {exp.taxInvoiceNo && (
                                <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200 font-mono text-[10px]">
                                  INV: {exp.taxInvoiceNo}
                                </span>
                              )}
                            </div>
                          )}
                          {exp.createdBy && (
                            <div className="text-[10px] text-slate-400">บันทึกโดย {exp.createdBy.name}</div>
                          )}
                        </TableCell>

                        <TableCell className="py-3">
                          <div className="text-xs font-medium text-slate-800">{exp.branch?.name ?? "-"}</div>
                          <div className="inline-flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                            <PmIcon className="h-3 w-3 text-slate-400" />
                            <span>{pm.label}</span>
                          </div>
                        </TableCell>

                        <TableCell className="py-3">
                          <div className="flex flex-col gap-1 items-start">
                            {exp.isVatEligible ? (
                              <Badge variant="success" className="text-[10px] gap-1 px-1.5 py-0">
                                <span>ภาษีซื้อ 7%</span>
                                <span className="font-mono">฿{exp.vatAmount.toFixed(2)}</span>
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-slate-400">ไม่มีภาษีซื้อ</span>
                            )}

                            {exp.whtRate > 0 && (
                              <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0 border-purple-200 text-purple-700 bg-purple-50">
                                <span>หัก {exp.whtRate}% {exp.whtType ?? ""}</span>
                                <span className="font-mono">฿{exp.whtAmount.toFixed(2)}</span>
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="py-3 text-right">
                          <div className="font-mono text-xs font-bold text-slate-900">
                            {formatTHB(exp.amount)}
                          </div>
                          {exp.whtAmount > 0 && (
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                              จ่ายสุทธิ {formatTHB(exp.netPayment)}
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="py-3 text-center">
                          {exp.receiptUrl ? (
                            <button
                              onClick={() => setPreviewReceiptUrl(exp.receiptUrl)}
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 transition-colors"
                              title="คลิกเพื่อดูเอกสารใบเสร็จ"
                            >
                              <Paperclip className="h-3 w-3" />
                              <span>ดูใบเสร็จ</span>
                            </button>
                          ) : (
                            <span className="text-slate-300 text-xs">-</span>
                          )}
                        </TableCell>

                        <TableCell className="py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {isManagerOrAdmin && (
                              <button
                                onClick={() => openEditModal(exp)}
                                className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                title="แก้ไขรายการ"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => void handleDeleteExpense(exp)}
                                disabled={deletingId !== null}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40"
                                title="ลบรายการ"
                              >
                                {deletingId === exp.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* VIEW 2: OPEX & P&L Analytics View */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {/* P&L Comparison Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-slate-200 bg-white shadow-2xs">
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>รายได้จากการขาย (Sales Revenue)</span>
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900 tabular-nums">
                  {formatTHB(analytics.salesRevenue)}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  ยอดรวมก่อนภาษี (ภาษีขาย ฿{analytics.salesVatOutput.toFixed(2)})
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-2xs">
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>ค่าใช้จ่ายดำเนินงานทั้งหมด (Total OPEX)</span>
                  <Wallet className="h-4 w-4 text-rose-600" />
                </div>
                <div className="text-2xl font-bold text-rose-700 tabular-nums">
                  {formatTHB(totals.total)}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  คิดเป็น {analytics.opexRatio}% ของรายได้จากการขาย
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-2xs">
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>กำไรจากการดำเนินงาน (Operating Profit)</span>
                  <DollarSign className="h-4 w-4 text-blue-600" />
                </div>
                <div
                  className={`text-2xl font-bold tabular-nums ${
                    analytics.operatingProfit >= 0 ? "text-emerald-700" : "text-rose-600"
                  }`}
                >
                  {formatTHB(analytics.operatingProfit)}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  รายได้หลังหักค่าใช้จ่ายประจำสาขา
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 6-Month Historical Trend & Category Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 6-Month Trend */}
            <Card className="border-slate-200 bg-white shadow-2xs">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      แนวโน้มค่าใช้จ่ายย้อนหลัง 6 เดือน (OPEX Trend)
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">เปรียบเทียบรายเดือน</span>
                </div>

                <div className="space-y-3 pt-2">
                  {analytics.monthlyTrend.map((m) => {
                    const maxAmount = Math.max(...analytics.monthlyTrend.map((t) => t.amount), 1);
                    const pct = Math.round((m.amount / maxAmount) * 100);
                    const isCurrent = m.month === selectedMonth;

                    return (
                      <div key={m.month} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className={`font-mono ${isCurrent ? "font-bold text-blue-700" : "text-slate-600"}`}>
                            {m.month} {isCurrent && "(งวดปัจจุบัน)"}
                          </span>
                          <span className="font-mono font-semibold text-slate-900">
                            {formatTHB(m.amount)} ({m.count} รายการ)
                          </span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isCurrent ? "bg-blue-600" : "bg-slate-300"
                            }`}
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <Card className="border-slate-200 bg-white shadow-2xs">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <PieChartIcon className="h-4 w-4 text-purple-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      สัดส่วนตามหมวดหมู่ (Category Breakdown)
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">งวด {selectedMonth}</span>
                </div>

                <div className="space-y-3 pt-2">
                  {Object.entries(CATEGORY_MAP).map(([key, val]) => {
                    const stat = totals.byCategory[key] || { amount: 0, count: 0 };
                    if (stat.amount <= 0 && stat.count <= 0) return null;
                    const pct = totals.total > 0 ? Math.round((stat.amount / totals.total) * 100) : 0;
                    const Icon = val.icon;

                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <Icon className={`h-3.5 w-3.5 ${val.color}`} />
                            <span className="font-medium text-slate-800">{val.label}</span>
                            <span className="text-[10px] text-slate-400">({stat.count} รายการ)</span>
                          </div>
                          <span className="font-mono font-bold text-slate-900">
                            {formatTHB(stat.amount)} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"
                            style={{ width: `${Math.max(pct, 1)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {totals.count === 0 && (
                    <div className="py-8 text-center text-xs text-slate-400">
                      ยังไม่มีข้อมูลค่าใช้จ่ายในงวดนี้
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Method & Thai Tax Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Method Breakdown */}
            <Card className="border-slate-200 bg-white shadow-2xs">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    ช่องทางการชำระเงิน (Payment Methods)
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(PAYMENT_METHOD_MAP).map(([key, val]) => {
                    const stat = totals.byPaymentMethod[key] || { amount: 0, count: 0 };
                    const Icon = val.icon;
                    return (
                      <div key={key} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-1">
                          <Icon className="h-3.5 w-3.5 text-slate-500" />
                          <span>{val.label}</span>
                        </div>
                        <div className="text-base font-bold text-slate-900 font-mono">
                          {formatTHB(stat.amount)}
                        </div>
                        <div className="text-[10px] text-slate-400">{stat.count} ธุรกรรม</div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Tax Reconciliation */}
            <Card className="border-slate-200 bg-white shadow-2xs">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <FileCheck className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    สรุปการกระทบยอดภาษี (Thai Tax Working Sheet)
                  </h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100">
                    <div>
                      <div className="font-semibold text-emerald-900">ภาษีซื้อที่ขอคืนได้ตาม ภ.พ.30</div>
                      <div className="text-[10px] text-emerald-700">จากใบกำกับภาษีเต็มรูป {totals.taxSummary.eligibleCount} ใบ</div>
                    </div>
                    <div className="font-mono text-base font-bold text-emerald-900">
                      {formatTHB(totals.taxSummary.totalInputVat)}
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-2.5 rounded-lg bg-purple-50/50 border border-purple-100">
                    <div>
                      <div className="font-semibold text-purple-900">ภาษีหัก ณ ที่จ่าย ภ.ง.ด.3 (บุคคลธรรมดา)</div>
                      <div className="text-[10px] text-purple-700">ค่าจ้างทำของ / ค่าเช่าบุคคลธรรมดา</div>
                    </div>
                    <div className="font-mono text-base font-bold text-purple-900">
                      {formatTHB(totals.taxSummary.whtPnd3)}
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-2.5 rounded-lg bg-purple-50/50 border border-purple-100">
                    <div>
                      <div className="font-semibold text-purple-900">ภาษีหัก ณ ที่จ่าย ภ.ง.ด.53 (นิติบุคคล)</div>
                      <div className="text-[10px] text-purple-700">ค่าบริการ / ค่าเช่า / ค่าโฆษณานิติบุคคล</div>
                    </div>
                    <div className="font-mono text-base font-bold text-purple-900">
                      {formatTHB(totals.taxSummary.whtPnd53)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* MODAL: Create / Edit Expense */}
      <Dialog
        open={createModalOpen}
        onOpenChange={(o) => !saving && setCreateModalOpen(o)}
        preventClose={saving}
      >
        <DialogHeader>
          <DialogTitle onClose={() => !saving && setCreateModalOpen(false)}>
            {editingExpenseId ? "แก้ไขรายการค่าใช้จ่ายดำเนินงาน" : "บันทึกรายการค่าใช้จ่ายดำเนินงาน"}
          </DialogTitle>
        </DialogHeader>

        <DialogContent className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          {formError && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Section 1: Basic Info */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">
                ชื่อรายการค่าใช้จ่าย *
              </label>
              <Input
                placeholder="เช่น ค่าเช่าร้าน, ค่าไฟ กฟน., อุปกรณ์สำนักงาน, น้ำยาล้างบอร์ด..."
                value={formTitle}
                maxLength={300}
                onChange={(e) => setFormTitle(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">หมวดหมู่ *</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 bg-white"
                >
                  {Object.entries(CATEGORY_MAP).map(([key, val]) => (
                    <option key={key} value={key}>
                      {val.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">สาขาที่จ่าย *</label>
                <select
                  value={formBranchId}
                  onChange={(e) => setFormBranchId(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 bg-white"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">
                  จำนวนเงินรวม (บาท) *
                </label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="text-xs h-9 font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">วันที่ทำรายการ *</label>
                <Input
                  type="date"
                  value={formDate}
                  max={bangkokDay()}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">
                  วิธีการชำระเงิน *
                </label>
                <select
                  value={formPaymentMethod}
                  onChange={(e) => setFormPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 bg-white"
                >
                  {Object.entries(PAYMENT_METHOD_MAP).map(([key, val]) => (
                    <option key={key} value={key}>
                      {val.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">
                  ผู้รับเงิน / ผู้ขาย / เจ้าหนี้
                </label>
                <Input
                  placeholder="เช่น บจก. พลังงานไฟ, เจ้าของอาคาร..."
                  value={formPayee}
                  maxLength={200}
                  onChange={(e) => setFormPayee(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">
                  เลขประจำตัวผู้เสียภาษี 13 หลัก
                </label>
                <Input
                  placeholder="13 หลัก (สำหรับ WHT / ใบกำกับ)"
                  value={formPayeeTaxId}
                  maxLength={17}
                  onChange={(e) => setFormPayeeTaxId(e.target.value)}
                  className="text-xs h-9 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">
                  เลขที่ใบกำกับภาษี / ใบเสร็จ
                </label>
                <Input
                  placeholder="เช่น INV-2026-9901"
                  value={formTaxInvoiceNo}
                  maxLength={100}
                  onChange={(e) => setFormTaxInvoiceNo(e.target.value)}
                  className="text-xs h-9 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Thai Tax Integration */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <FileCheck className="h-4 w-4 text-emerald-600" />
              <span>การคำนวณภาษี (VAT ภ.พ.30 & WHT ภ.ง.ด.3/53)</span>
            </div>

            {/* VAT Toggle */}
            <div className="flex items-center justify-between pt-1">
              <label className="text-xs text-slate-700 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsVatEligible}
                  onChange={(e) => setFormIsVatEligible(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                />
                <span className="font-semibold">มีใบกำกับภาษีเต็มรูป (ขอคืนภาษีซื้อ ภ.พ.30 ได้)</span>
              </label>

              {formIsVatEligible && (
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-slate-500">อัตรา:</span>
                  <select
                    value={formVatRate}
                    onChange={(e) => setFormVatRate(e.target.value)}
                    className="text-xs border rounded p-1 bg-white"
                  >
                    <option value="7">7% (มาตรฐาน)</option>
                    <option value="0">0%</option>
                  </select>
                </div>
              )}
            </div>

            {/* WHT Toggle */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/80">
              <label className="text-xs text-slate-700 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formApplyWht}
                  onChange={(e) => setFormApplyWht(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4 cursor-pointer"
                />
                <span className="font-semibold">หักภาษี ณ ที่จ่าย (Withholding Tax - WHT)</span>
              </label>

              {formApplyWht && (
                <div className="flex items-center gap-1.5 text-xs">
                  <select
                    value={formWhtRate}
                    onChange={(e) => setFormWhtRate(e.target.value)}
                    className="text-xs border rounded p-1 bg-white"
                  >
                    <option value="1">1% (ขนส่ง)</option>
                    <option value="2">2% (โฆษณา)</option>
                    <option value="3">3% (บริการ/จ้างทำของ)</option>
                    <option value="5">5% (ค่าเช่า)</option>
                  </select>

                  <select
                    value={formWhtType}
                    onChange={(e) => setFormWhtType(e.target.value as "PND3" | "PND53")}
                    className="text-xs border rounded p-1 bg-white font-medium"
                  >
                    <option value="PND53">ภ.ง.ด.53 (นิติบุคคล)</option>
                    <option value="PND3">ภ.ง.ด.3 (บุคคลธรรมดา)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Live Tax Summary */}
            <div className="mt-2 p-2.5 rounded-lg bg-white border border-slate-200 text-xs space-y-1 font-mono">
              <div className="flex justify-between text-slate-600">
                <span>มูลค่าก่อนภาษี (Base Amount):</span>
                <span>{formatTHB(liveCalculations.baseAmount)}</span>
              </div>
              {formIsVatEligible && (
                <div className="flex justify-between text-emerald-700">
                  <span>ภาษีมูลค่าเพิ่ม (Input VAT 7%):</span>
                  <span>+{formatTHB(liveCalculations.vatAmount)}</span>
                </div>
              )}
              {formApplyWht && (
                <div className="flex justify-between text-purple-700">
                  <span>หักภาษี ณ ที่จ่าย ({formWhtRate}%):</span>
                  <span>-{formatTHB(liveCalculations.whtAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-900 font-bold pt-1 border-t border-slate-100">
                <span>ยอดเงินจ่ายจริงสุทธิ (Net Cash Payment):</span>
                <span>{formatTHB(liveCalculations.netPayment)}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Receipt Upload (Cloudflare R2) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 block">
              แนบไฟล์ใบเสร็จ / ใบกำกับภาษี (Cloudflare R2)
            </label>

            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => void handleFileUpload(e)}
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
              />

              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingReceipt}
                className="text-xs h-9 gap-1.5 border-dashed border-slate-300 hover:bg-slate-50"
              >
                {uploadingReceipt ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UploadCloud className="h-3.5 w-3.5 text-blue-600" />
                )}
                {uploadingReceipt ? "กำลังอัปโหลด..." : "เลือกไฟล์แนบ (JPG, PNG, PDF)"}
              </Button>

              {formReceiptUrl && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span className="truncate max-w-[180px]">แนบไฟล์แล้ว</span>
                  <button
                    type="button"
                    onClick={() => setFormReceiptUrl("")}
                    className="text-slate-400 hover:text-rose-600 ml-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>

            {uploadProgress && (
              <p className="text-[11px] text-blue-600 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> {uploadProgress}
              </p>
            )}

            <Input
              placeholder="หรือวางลิงก์ภายนอก https://..."
              value={formReceiptUrl}
              onChange={(e) => setFormReceiptUrl(e.target.value)}
              className="text-xs h-8 text-slate-600 font-mono"
            />
          </div>

          {/* Section 4: Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">หมายเหตุเพิ่มเติม</label>
            <Input
              placeholder="บันทึกข้อความเพิ่มเติมเกี่ยวกับรายการนี้..."
              value={formNotes}
              maxLength={1000}
              onChange={(e) => setFormNotes(e.target.value)}
              className="text-xs h-9"
            />
          </div>
        </DialogContent>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setCreateModalOpen(false)}
            disabled={saving}
            className="text-xs"
          >
            ยกเลิก
          </Button>
          <Button
            onClick={() => void handleSaveExpense()}
            disabled={saving || uploadingReceipt}
            className="text-xs bg-blue-600 text-white hover:bg-blue-700 gap-1.5"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {saving ? "กำลังบันทึก..." : editingExpenseId ? "บันทึกการแก้ไข" : "บันทึกรายการ"}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* DIALOG: Receipt Preview */}
      <Dialog open={Boolean(previewReceiptUrl)} onOpenChange={(o) => !o && setPreviewReceiptUrl(null)}>
        <DialogHeader>
          <DialogTitle onClose={() => setPreviewReceiptUrl(null)}>
            เอกสารแนบ / ใบเสร็จรับเงิน
          </DialogTitle>
        </DialogHeader>
        <DialogContent className="max-w-2xl max-h-[85vh] p-4 flex flex-col items-center justify-center">
          {previewReceiptUrl && (
            <div className="w-full flex flex-col items-center gap-3">
              {previewReceiptUrl.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={previewReceiptUrl}
                  className="w-full h-[500px] rounded-lg border border-slate-200"
                  title="Receipt PDF Preview"
                />
              ) : (
                <img
                  src={previewReceiptUrl}
                  alt="Receipt Preview"
                  className="max-h-[500px] w-auto max-w-full rounded-lg object-contain shadow-xs border border-slate-200"
                />
              )}

              <div className="flex items-center gap-2">
                <a
                  href={previewReceiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  เปิดในแท็บใหม่ / ดาวน์โหลด
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
