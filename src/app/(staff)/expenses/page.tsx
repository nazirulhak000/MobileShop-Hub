"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { formatTHB } from "@/lib/utils";

type ExpenseCategory = "RENT" | "UTILITIES" | "CONSUMABLES" | "MARKETING" | "MAINTENANCE" | "WELFARE" | "OTHER";

interface ExpenseItem {
  id: string;
  expenseNo: string;
  title: string;
  category: ExpenseCategory;
  branchId: string;
  amount: number;
  date: string; // YYYY-MM-DD (Bangkok)
  receiptUrl: string | null;
  createdAt: string;
  branch: { id: string; name: string; code: string } | null;
  createdBy: { id: string; name: string } | null;
}

interface ExpenseTotals {
  total: number;
  count: number;
  byCategory: Record<string, { amount: number; count: number }>;
}

const bangkokDay = (d: Date = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(d);

/** Fetch JSON and throw the server's Thai error message unless both res.ok and json.success. */
async function fetchJson<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.error || `ไม่สามารถทำรายการได้ (${res.status})`);
  return json as T;
}

const CATEGORY_MAP: Record<
  ExpenseCategory,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string; border: string }
> = {
  RENT: { label: "ค่าเช่าพื้นที่", icon: Home, color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200" },
  UTILITIES: { label: "ค่าน้ำ-ไฟ-เน็ต", icon: Zap, color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  CONSUMABLES: { label: "วัสดุสิ้นเปลือง & อะไหล่สิ้นเปลือง", icon: Layers, color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  MARKETING: { label: "การตลาด & โฆษณา", icon: Megaphone, color: "text-pink-700", bg: "bg-pink-50", border: "border-pink-200" },
  MAINTENANCE: { label: "ซ่อมบำรุงร้าน & เครื่องมือ", icon: Wrench, color: "text-teal-700", bg: "bg-teal-50", border: "border-teal-200" },
  WELFARE: { label: "สวัสดิการ & อาหารพนักงาน", icon: Coffee, color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  OTHER: { label: "ค่าใช้จ่ายเบ็ดเตล็ด", icon: Tag, color: "text-slate-700", bg: "bg-slate-100", border: "border-slate-200" },
};

const EMPTY_TOTALS: ExpenseTotals = { total: 0, count: 0, byCategory: {} };

export default function ExpensesPage() {
  const { currentBranch, currentUser, branches } = useApp();
  const isAdmin = currentUser.role === "ADMIN";

  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [totals, setTotals] = useState<ExpenseTotals>(EMPTY_TOTALS);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedMonth, setSelectedMonth] = useState(() => bangkokDay().slice(0, 7));
  const [selectedBranch, setSelectedBranch] = useState("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // New Expense Form State
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState<ExpenseCategory>("CONSUMABLES");
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(() => bangkokDay());
  const [formBranchId, setFormBranchId] = useState("");
  const [formReceiptUrl, setFormReceiptUrl] = useState("");

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const qs = new URLSearchParams({ month: selectedMonth, take: "500" });
      if (selectedBranch !== "ALL") qs.set("branch", selectedBranch);
      if (selectedCategory !== "ALL") qs.set("category", selectedCategory);
      const json = await fetchJson<{ data: ExpenseItem[]; totals: ExpenseTotals; truncated: boolean }>(`/api/expenses?${qs}`);
      setExpenses(json.data);
      setTotals(json.totals ?? EMPTY_TOTALS);
      setTruncated(Boolean(json.truncated));
    } catch (e) {
      setExpenses([]);
      setTotals(EMPTY_TOTALS);
      setLoadError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedBranch, selectedCategory]);

  useEffect(() => {
    void loadExpenses();
  }, [loadExpenses]);

  // Client-side text search over the loaded page.
  const filteredExpenses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return expenses;
    return expenses.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.expenseNo.toLowerCase().includes(q) ||
        (e.createdBy?.name ?? "").toLowerCase().includes(q)
    );
  }, [expenses, searchQuery]);

  // KPI cards use server totals (whole month/filter, not only the loaded rows).
  const metrics = useMemo(() => {
    const sum = (c: ExpenseCategory) => totals.byCategory[c]?.amount ?? 0;
    return {
      total: totals.total,
      count: totals.count,
      rent: sum("RENT"),
      utilities: sum("UTILITIES"),
      consumables: sum("CONSUMABLES"),
      marketingWelfareOther: sum("MARKETING") + sum("WELFARE") + sum("OTHER") + sum("MAINTENANCE"),
    };
  }, [totals]);

  const openCreate = () => {
    setFormTitle("");
    setFormCategory("CONSUMABLES");
    setFormAmount("");
    setFormDate(bangkokDay());
    setFormBranchId(currentBranch.id || branches[0]?.id || "");
    setFormReceiptUrl("");
    setFormError(null);
    setCreateModalOpen(true);
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
    const receiptTrimmed = formReceiptUrl.trim();
    if (receiptTrimmed && !/^https?:\/\/.+/.test(receiptTrimmed)) {
      setFormError("ลิงก์ใบเสร็จต้องเริ่มต้นด้วย http:// หรือ https://");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await fetchJson("/api/expenses", {
        method: "POST",
        body: JSON.stringify({
          title: formTitle.trim(),
          category: formCategory,
          amount,
          date: formDate,
          branchId: formBranchId || undefined,
          receiptUrl: formReceiptUrl.trim() || undefined,
        }),
      });
      setCreateModalOpen(false);
      await loadExpenses();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async (exp: ExpenseItem) => {
    if (!confirm(`คุณแน่ใจว่าต้องการลบรายการ ${exp.expenseNo}?`)) return;
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
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const headers = ["รหัสเอกสาร,วันที่,หมวดหมู่,ชื่อรายการ,สาขา,จำนวนเงิน,ผู้บันทึก"];
    const rows = filteredExpenses.map((e) =>
      [
        e.expenseNo,
        e.date,
        CATEGORY_MAP[e.category]?.label || e.category,
        esc(e.title),
        esc(e.branch?.name ?? ""),
        e.amount.toFixed(2),
        esc(e.createdBy?.name ?? ""),
      ].join(",")
    );
    const csvContent = "﻿" + [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `expenses_${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">บันทึกค่าใช้จ่ายร้านค้า (Store Operational Expenses)</h1>
            <p className="text-xs text-slate-500">ควบคุมค่าใช้จ่ายดำเนินงาน ค่าเช่า ค่าน้ำ-ไฟ วัสดุสิ้นเปลือง อุปกรณ์ช่าง</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void loadExpenses()} disabled={loading} className="gap-2 text-xs h-9 border-slate-300 hover:bg-slate-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            รีเฟรช
          </Button>
          <Button variant="outline" onClick={exportCSV} disabled={loading || filteredExpenses.length === 0} className="gap-2 text-xs h-9 border-slate-300 hover:bg-slate-50">
            <Download className="h-3.5 w-3.5" />
            ส่งออก CSV
          </Button>
          <Button onClick={openCreate} className="gap-2 text-xs h-9 bg-blue-600 text-white hover:bg-blue-700 shadow-xs">
            <Plus className="h-3.5 w-3.5" />
            บันทึกค่าใช้จ่ายใหม่
          </Button>
        </div>
      </div>

      {(loadError || actionError) && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{loadError || actionError}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <Card className="border-slate-200 bg-white shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>รวมค่าใช้จ่ายเดือนนี้</span>
              <Wallet className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">{formatTHB(metrics.total)}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">{metrics.count} รายการที่บันทึก</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/40 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-purple-700 mb-1">
              <span>ค่าเช่าพื้นที่ (Rent)</span>
              <Home className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-900 tabular-nums">{formatTHB(metrics.rent)}</div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/40 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-amber-700 mb-1">
              <span>ค่าน้ำ-ไฟ-เน็ต (Utilities)</span>
              <Zap className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-amber-900 tabular-nums">{formatTHB(metrics.utilities)}</div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/40 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-blue-700 mb-1">
              <span>วัสดุสิ้นเปลือง (Tools & Parts)</span>
              <Layers className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-900 tabular-nums">{formatTHB(metrics.consumables)}</div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/40 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-emerald-700 mb-1">
              <span>การตลาด ซ่อมบำรุง สวัสดิการ & อื่นๆ</span>
              <Coffee className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-900 tabular-nums">{formatTHB(metrics.marketingWelfareOther)}</div>
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
              className="bg-transparent text-xs font-medium text-slate-800 outline-none cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-xs text-slate-700">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-medium">สาขา:</span>
            <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} className="bg-transparent text-xs font-medium text-slate-800 outline-none cursor-pointer">
              <option value="ALL">ทุกสาขา ({branches.length})</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-xs text-slate-700">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-medium">หมวดหมู่:</span>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="bg-transparent text-xs font-medium text-slate-800 outline-none cursor-pointer">
              <option value="ALL">ทุกหมวดหมู่</option>
              {Object.entries(CATEGORY_MAP).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input placeholder="ค้นหาชื่อรายการ, เลขที่, ผู้บันทึก..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 text-xs h-9 bg-slate-50/50" />
        </div>
      </div>

      {truncated && <p className="text-[11px] text-amber-700">แสดง {expenses.length} รายการล่าสุดจากทั้งหมด {totals.count} รายการ (ยอดรวมด้านบนคำนวณจากทุกรายการ)</p>}

      {/* Expenses Table */}
      <Card className="border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/75 border-b border-slate-200">
              <TableRow>
                <TableHead className="text-xs font-semibold text-slate-600">รหัส / วันที่</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">หมวดหมู่</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">ชื่อรายการค่าใช้จ่าย</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">สาขา</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-right">จำนวนเงิน</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">ใบเสร็จ</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center">
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลดข้อมูล...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
                      <Wallet className="h-8 w-8 text-slate-300" />
                      <p className="text-sm font-medium text-slate-600">{loadError ? "โหลดข้อมูลไม่สำเร็จ" : "ยังไม่มีรายการค่าใช้จ่ายในงวดนี้"}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((exp) => {
                  const cat = CATEGORY_MAP[exp.category] ?? CATEGORY_MAP.OTHER;
                  const Icon = cat.icon;
                  return (
                    <TableRow key={exp.id} className="hover:bg-slate-50/60 transition-colors">
                      <TableCell className="py-3">
                        <div className="font-mono text-xs font-semibold text-slate-900">{exp.expenseNo}</div>
                        <div className="text-[11px] text-slate-400">{exp.date}</div>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${cat.bg} ${cat.color} ${cat.border}`}>
                          <Icon className="h-3 w-3" />
                          <span>{cat.label}</span>
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="font-semibold text-xs text-slate-900">{exp.title}</div>
                        {exp.createdBy && <div className="text-[11px] text-slate-400">บันทึกโดย {exp.createdBy.name}</div>}
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="text-xs font-medium text-slate-700">{exp.branch?.name ?? "-"}</span>
                      </TableCell>
                      <TableCell className="py-3 text-right font-mono text-xs font-bold text-slate-900">{formatTHB(exp.amount)}</TableCell>
                      <TableCell className="py-3 text-center">
                        {exp.receiptUrl ? (
                          <a
                            href={exp.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 transition-colors"
                          >
                            <Paperclip className="h-3 w-3" />
                            ดูใบเสร็จ
                          </a>
                        ) : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        {isAdmin ? (
                          <button
                            onClick={() => void handleDeleteExpense(exp)}
                            disabled={deletingId !== null}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40"
                            title="ลบรายการ"
                          >
                            {deletingId === exp.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* New Expense Modal */}
      <Dialog open={createModalOpen} onOpenChange={(o) => !saving && setCreateModalOpen(o)} preventClose={saving}>
        <DialogHeader>
          <DialogTitle onClose={() => !saving && setCreateModalOpen(false)}>บันทึกรายการค่าใช้จ่ายดำเนินงาน</DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-4">
          {formError && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">ชื่อรายการค่าใช้จ่าย *</label>
            <Input
              placeholder="เช่น ค่าเช่าร้าน, ค่าไฟ, น้ำยาล้างบอร์ด, ค่าอุปกรณ์สำนักงาน..."
              value={formTitle}
              maxLength={300}
              onChange={(e) => setFormTitle(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">หมวดหมู่ *</label>
              <select value={formCategory} onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)} className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 bg-white">
                {Object.entries(CATEGORY_MAP).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">สาขาที่จ่าย *</label>
              <select value={formBranchId} onChange={(e) => setFormBranchId(e.target.value)} className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 bg-white">
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
              <label className="text-xs font-semibold text-slate-700 mb-1 block">จำนวนเงิน (บาท) *</label>
              <Input type="number" min="0.01" step="0.01" placeholder="0.00" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} className="text-xs h-9 font-mono" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">วันที่ทำรายการ *</label>
              <Input type="date" value={formDate} max={bangkokDay()} onChange={(e) => setFormDate(e.target.value)} className="text-xs h-9" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">ลิงก์รูปใบเสร็จ / สลิป (ถ้ามี)</label>
            <Input placeholder="https://..." value={formReceiptUrl} onChange={(e) => setFormReceiptUrl(e.target.value)} className="text-xs h-9" />
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setCreateModalOpen(false)} disabled={saving} className="text-xs">
            ยกเลิก
          </Button>
          <Button onClick={() => void handleSaveExpense()} disabled={saving} className="text-xs bg-blue-600 text-white hover:bg-blue-700 gap-1.5">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {saving ? "กำลังบันทึก..." : "บันทึกรายการ"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
