"use client";

import React, { useState, useMemo } from "react";
import {
  Wallet,
  Plus,
  Receipt,
  Download,
  Calendar,
  Building2,
  Search,
  Filter,
  DollarSign,
  Tag,
  Paperclip,
  Eye,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Home,
  Zap,
  Coffee,
  Wrench,
  Megaphone,
  Layers,
  Image as ImageIcon,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { formatTHB } from "@/lib/utils";

type ExpenseCategory =
  | "RENT"
  | "UTILITIES"
  | "CONSUMABLES"
  | "MARKETING"
  | "MAINTENANCE"
  | "WELFARE"
  | "OTHER";

interface ExpenseItem {
  id: string;
  expenseNo: string;
  title: string;
  category: ExpenseCategory;
  branchId: string;
  branchName: string;
  branchCode: string;
  amount: number;
  date: string; // YYYY-MM-DD
  paymentMethod: "CASH" | "TRANSFER" | "CARD";
  recordedBy: string;
  receiptUrl?: string;
  notes?: string;
}

const CATEGORY_MAP: Record<
  ExpenseCategory,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string; border: string }
> = {
  RENT: {
    label: "ค่าเช่าพื้นที่",
    icon: Home,
    color: "text-purple-700",
    bg: "bg-purple-50",
    border: "border-purple-200",
  },
  UTILITIES: {
    label: "ค่าน้ำ-ไฟ-เน็ต",
    icon: Zap,
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  CONSUMABLES: {
    label: "วัสดุสิ้นเปลือง & อะไหล่สิ้นเปลือง",
    icon: Layers,
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  MARKETING: {
    label: "การตลาด & โฆษณา",
    icon: Megaphone,
    color: "text-pink-700",
    bg: "bg-pink-50",
    border: "border-pink-200",
  },
  MAINTENANCE: {
    label: "ซ่อมบำรุงร้าน & เครื่องมือ",
    icon: Wrench,
    color: "text-teal-700",
    bg: "bg-teal-50",
    border: "border-teal-200",
  },
  WELFARE: {
    label: "สวัสดิการ & อาหารพนักงาน",
    icon: Coffee,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  OTHER: {
    label: "ค่าใช้จ่ายเบ็ดเตล็ด",
    icon: Tag,
    color: "text-slate-700",
    bg: "bg-slate-100",
    border: "border-slate-200",
  },
};

const INITIAL_EXPENSES: ExpenseItem[] = [
  {
    id: "exp-1",
    expenseNo: "EXP-202611-001",
    title: "ค่าเช่าพื้นที่ร้าน ประจำเดือน พ.ย. 2569",
    category: "RENT",
    branchId: "cmwnc36pa0000z3fxx6o3d40a",
    branchName: "MobileShop HQ (สำนักงานใหญ่ สุขุมวิท)",
    branchCode: "HQ",
    amount: 35000,
    date: "2026-11-01",
    paymentMethod: "TRANSFER",
    recordedBy: "สมชาย ผู้จัดการใหญ่",
    receiptUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80",
    notes: "โอนผ่านบัญชี บจก. พรอพเพอร์ตี้ สุขุมวิท",
  },
  {
    id: "exp-2",
    expenseNo: "EXP-202611-002",
    title: "ค่าเช่าพื้นที่ห้างเซ็นทรัลพระราม 9 ประจำเดือน พ.ย. 2569",
    category: "RENT",
    branchId: "cmwnc36ph0001z3fxk19vxzom",
    branchName: "MobileShop สาขา 2 (เซ็นทรัลพระราม 9)",
    branchCode: "BR-02",
    amount: 42000,
    date: "2026-11-02",
    paymentMethod: "TRANSFER",
    recordedBy: "วิภาดา สาขาเก้า",
    receiptUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80",
    notes: "ใบเสร็จเลขที่ CPN-98214",
  },
  {
    id: "exp-3",
    expenseNo: "EXP-202611-003",
    title: "ค่าไฟฟ้านครหลวง (MEA) ประจำงวด",
    category: "UTILITIES",
    branchId: "cmwnc36pa0000z3fxx6o3d40a",
    branchName: "MobileShop HQ (สำนักงานใหญ่ สุขุมวิท)",
    branchCode: "HQ",
    amount: 8450,
    date: "2026-11-08",
    paymentMethod: "TRANSFER",
    recordedBy: "สมชาย ผู้จัดการใหญ่",
    receiptUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80",
    notes: "หัก ณ ที่จ่าย ภ.ง.ด.53 1%",
  },
  {
    id: "exp-4",
    expenseNo: "EXP-202611-004",
    title: "ซื้อน้ำยาทำความสะอาดบอร์ด ฟลักซ์บัดกรี และกาวติดหน้าจอ B-7000",
    category: "CONSUMABLES",
    branchId: "cmwnc36pa0000z3fxx6o3d40a",
    branchName: "MobileShop HQ (สำนักงานใหญ่ สุขุมวิท)",
    branchCode: "HQ",
    amount: 3200,
    date: "2026-11-12",
    paymentMethod: "CASH",
    recordedBy: "ช่างเอก มือทอง",
    receiptUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80",
    notes: "ซื้อร้าน อมร อีเล็คโทรนิคส์ มีบิลเงินสด",
  },
  {
    id: "exp-5",
    expenseNo: "EXP-202611-005",
    title: "ยิงแอด Facebook & TikTok โปรโมชั่นเปลี่ยนแบตไอโฟนแท้",
    category: "MARKETING",
    branchId: "cmwnc36pa0000z3fxx6o3d40a",
    branchName: "MobileShop HQ (สำนักงานใหญ่ สุขุมวิท)",
    branchCode: "HQ",
    amount: 6500,
    date: "2026-11-15",
    paymentMethod: "CARD",
    recordedBy: "สมชาย ผู้จัดการใหญ่",
    receiptUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80",
    notes: "ตัดบัตรเครดิตบริษัท K-Corporate",
  },
  {
    id: "exp-6",
    expenseNo: "EXP-202611-006",
    title: "เครื่องเป่าลมร้อนสถานีบัดกรี Quick 861DW ส่งซ่อมฮีตเตอร์",
    category: "MAINTENANCE",
    branchId: "cmwnc36ph0001z3fxk19vxzom",
    branchName: "MobileShop สาขา 2 (เซ็นทรัลพระราม 9)",
    branchCode: "BR-02",
    amount: 1800,
    date: "2026-11-16",
    paymentMethod: "CASH",
    recordedBy: "ช่างนนท์ สายไว",
    receiptUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80",
    notes: "เปลี่ยนไส้ความร้อนและหัวเป่าลม",
  },
  {
    id: "exp-7",
    expenseNo: "EXP-202611-007",
    title: "กาแฟ แคปซูลเนสเปรสโซ่ น้ำดื่ม และของว่างสำหรับรับรองลูกค้า",
    category: "WELFARE",
    branchId: "cmwnc36pa0000z3fxx6o3d40a",
    branchName: "MobileShop HQ (สำนักงานใหญ่ สุขุมวิท)",
    branchCode: "HQ",
    amount: 2450,
    date: "2026-11-17",
    paymentMethod: "CASH",
    recordedBy: "น้องแพรว แคชเชียร์",
    receiptUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80",
    notes: "บิล Big C ซูเปอร์เซ็นเตอร์",
  },
];

export default function ExpensesPage() {
  const { currentBranch, currentUser, branches } = useApp();
  const [expenses, setExpenses] = useState<ExpenseItem[]>(INITIAL_EXPENSES);
  const [selectedMonth, setSelectedMonth] = useState("2026-11");
  const [selectedBranch, setSelectedBranch] = useState("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewReceiptModalOpen, setViewReceiptModalOpen] = useState(false);
  const [activeReceiptUrl, setActiveReceiptUrl] = useState<string | null>(null);

  // New Expense Form State
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState<ExpenseCategory>("CONSUMABLES");
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formDate, setFormDate] = useState("2026-11-19");
  const [formPaymentMethod, setFormPaymentMethod] = useState<"CASH" | "TRANSFER" | "CARD">("TRANSFER");
  const [formBranchId, setFormBranchId] = useState(currentBranch.id);
  const [formNotes, setFormNotes] = useState("");
  const [formReceiptMock, setFormReceiptMock] = useState(true);

  // Filtered List
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchMonth = e.date.startsWith(selectedMonth);
      const matchBranch = selectedBranch === "ALL" || e.branchCode === selectedBranch || e.branchId === selectedBranch;
      const matchCategory = selectedCategory === "ALL" || e.category === selectedCategory;
      const matchSearch =
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.expenseNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.recordedBy.toLowerCase().includes(searchQuery.toLowerCase());
      return matchMonth && matchBranch && matchCategory && matchSearch;
    });
  }, [expenses, selectedMonth, selectedBranch, selectedCategory, searchQuery]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let total = 0;
    let rent = 0;
    let utilities = 0;
    let consumables = 0;
    let marketing = 0;
    let welfareAndOther = 0;

    filteredExpenses.forEach((e) => {
      total += e.amount;
      if (e.category === "RENT") rent += e.amount;
      else if (e.category === "UTILITIES") utilities += e.amount;
      else if (e.category === "CONSUMABLES") consumables += e.amount;
      else if (e.category === "MARKETING") marketing += e.amount;
      else welfareAndOther += e.amount;
    });

    return { total, rent, utilities, consumables, marketing, welfareAndOther, count: filteredExpenses.length };
  }, [filteredExpenses]);

  // Handle Save Expense
  const handleSaveExpense = () => {
    if (!formTitle || formAmount <= 0) {
      alert("กรุณากรอกชื่อรายการและจำนวนเงินให้ถูกต้อง");
      return;
    }

    const branch = branches.find((b) => b.id === formBranchId) || currentBranch;
    const newExp: ExpenseItem = {
      id: `exp-${Date.now()}`,
      expenseNo: `EXP-202611-${String(expenses.length + 1).padStart(3, "0")}`,
      title: formTitle,
      category: formCategory,
      branchId: branch.id,
      branchName: branch.name,
      branchCode: branch.code,
      amount: Number(formAmount),
      date: formDate,
      paymentMethod: formPaymentMethod,
      recordedBy: currentUser.name,
      receiptUrl: formReceiptMock
        ? "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80"
        : undefined,
      notes: formNotes,
    };

    setExpenses((prev) => [newExp, ...prev]);
    setCreateModalOpen(false);
    setFormTitle("");
    setFormAmount(0);
    setFormNotes("");
  };

  const handleDeleteExpense = (id: string) => {
    if (confirm("คุณแน่ใจว่าต้องการลบรายการค่าใช้จ่ายนี้?")) {
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    }
  };

  const exportCSV = () => {
    const headers = ["รหัสเอกสาร,วันที่,หมวดหมู่,ชื่อรายการ,สาขา,จำนวนเงิน,วิธีชำระ,ผู้บันทึก,หมายเหตุ"];
    const rows = filteredExpenses.map((e) =>
      [
        e.expenseNo,
        e.date,
        CATEGORY_MAP[e.category]?.label || e.category,
        `"${e.title}"`,
        `"${e.branchName}"`,
        e.amount.toFixed(2),
        e.paymentMethod,
        `"${e.recordedBy}"`,
        `"${e.notes || ""}"`,
      ].join(",")
    );
    const csvContent = "\uFEFF" + [headers, ...rows].join("\n");
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
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              บันทึกค่าใช้จ่ายร้านค้า (Store Operational Expenses)
            </h1>
            <p className="text-xs text-slate-500">
              ควบคุมค่าใช้จ่ายดำเนินงาน ค่าเช่า ค่าน้ำ-ไฟ วัสดุสิ้นเปลือง อุปกรณ์ช่าง พร้อมแนบหลักฐานใบเสร็จ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={exportCSV}
            className="gap-2 text-xs h-9 border-slate-300 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            ส่งออก CSV
          </Button>

          <Button
            onClick={() => setCreateModalOpen(true)}
            className="gap-2 text-xs h-9 bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            บันทึกค่าใช้จ่ายใหม่
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <Card className="border-slate-200 bg-white shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>รวมค่าใช้จ่ายเดือนนี้</span>
              <Wallet className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">
              {formatTHB(metrics.total)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">{metrics.count} รายการที่บันทึก</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/40 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-purple-700 mb-1">
              <span>ค่าเช่าพื้นที่ (Rent)</span>
              <Home className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-900 tabular-nums">
              {formatTHB(metrics.rent)}
            </div>
            <p className="text-[11px] text-purple-600 mt-0.5">ทุกสาขาที่เปิดทำการ</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/40 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-amber-700 mb-1">
              <span>ค่าน้ำ-ไฟ-เน็ต (Utilities)</span>
              <Zap className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-amber-900 tabular-nums">
              {formatTHB(metrics.utilities)}
            </div>
            <p className="text-[11px] text-amber-600 mt-0.5">สาธารณูปโภคประจำเดือน</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/40 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-blue-700 mb-1">
              <span>วัสดุสิ้นเปลือง (Tools & Parts)</span>
              <Layers className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-900 tabular-nums">
              {formatTHB(metrics.consumables)}
            </div>
            <p className="text-[11px] text-blue-600 mt-0.5">น้ำยา กาว เครื่องมือซ่อม</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/40 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-emerald-700 mb-1">
              <span>การตลาด & สวัสดิการ</span>
              <Coffee className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-900 tabular-nums">
              {formatTHB(metrics.marketing + metrics.welfareAndOther)}
            </div>
            <p className="text-[11px] text-emerald-600 mt-0.5">แอดโฆษณา & เครื่องดื่ม</p>
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
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-800 outline-none cursor-pointer"
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
                <option key={b.id} value={b.code}>
                  {b.name}
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
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="ค้นหาชื่อรายการ, ผู้เบิก..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-9 bg-slate-50/50"
          />
        </div>
      </div>

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
                <TableHead className="text-xs font-semibold text-slate-600 text-center">ชำระโดย</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">ใบเสร็จ</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
                      <Wallet className="h-8 w-8 text-slate-300" />
                      <p className="text-sm font-medium text-slate-600">ยังไม่มีรายการค่าใช้จ่ายในงวดนี้</p>
                      <p className="text-xs text-slate-400">กดปุ่ม "บันทึกค่าใช้จ่ายใหม่" ด้านบนเพื่อเริ่มบันทึก</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((exp) => {
                  const cat = CATEGORY_MAP[exp.category];
                  const Icon = cat.icon;

                  return (
                    <TableRow key={exp.id} className="hover:bg-slate-50/60 transition-colors">
                      <TableCell className="py-3">
                        <div className="font-mono text-xs font-semibold text-slate-900">{exp.expenseNo}</div>
                        <div className="text-[11px] text-slate-400">{exp.date}</div>
                      </TableCell>

                      <TableCell className="py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${cat.bg} ${cat.color} ${cat.border}`}
                        >
                          <Icon className="h-3 w-3" />
                          <span>{cat.label}</span>
                        </span>
                      </TableCell>

                      <TableCell className="py-3">
                        <div className="font-semibold text-xs text-slate-900">{exp.title}</div>
                        {exp.notes && <div className="text-[11px] text-slate-400">{exp.notes}</div>}
                      </TableCell>

                      <TableCell className="py-3">
                        <span className="text-xs font-medium text-slate-700">{exp.branchName}</span>
                      </TableCell>

                      <TableCell className="py-3 text-right font-mono text-xs font-bold text-slate-900">
                        {formatTHB(exp.amount)}
                      </TableCell>

                      <TableCell className="py-3 text-center">
                        <span className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-medium">
                          {exp.paymentMethod === "CASH" && "เงินสด"}
                          {exp.paymentMethod === "TRANSFER" && "โอนเงิน"}
                          {exp.paymentMethod === "CARD" && "บัตรเครดิต"}
                        </span>
                      </TableCell>

                      <TableCell className="py-3 text-center">
                        {exp.receiptUrl ? (
                          <button
                            onClick={() => {
                              setActiveReceiptUrl(exp.receiptUrl!);
                              setViewReceiptModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 transition-colors"
                          >
                            <Paperclip className="h-3 w-3" />
                            ดูใบเสร็จ
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </TableCell>

                      <TableCell className="py-3 text-center">
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="ลบรายการ"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogHeader>
          <DialogTitle onClose={() => setCreateModalOpen(false)}>บันทึกรายการค่าใช้จ่ายดำเนินงาน</DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">ชื่อรายการค่าใช้จ่าย *</label>
            <Input
              placeholder="เช่น ค่าเช่าร้าน, ค่าไฟ, น้ำยาล้างบอร์ด, ค่าอุปกรณ์สำนักงาน..."
              value={formTitle}
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
              <label className="text-xs font-semibold text-slate-700 mb-1 block">จำนวนเงิน (บาท) *</label>
              <Input
                type="number"
                placeholder="0.00"
                value={formAmount || ""}
                onChange={(e) => setFormAmount(Number(e.target.value))}
                className="text-xs h-9 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">วันที่ทำรายการ</label>
              <Input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">ช่องทางชำระเงิน</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "CASH", label: "เงินสดหน้าร้าน" },
                { id: "TRANSFER", label: "โอนเงินธนาคาร" },
                { id: "CARD", label: "บัตรเครดิตบริษัท" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setFormPaymentMethod(m.id as any)}
                  className={`p-2 rounded-lg text-xs font-semibold border transition-all text-center ${
                    formPaymentMethod === m.id
                      ? "border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-500"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border border-dashed border-slate-300 p-3 rounded-lg bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-slate-400" />
                <div>
                  <div className="text-xs font-semibold text-slate-700">แนบรูปถ่ายใบเสร็จ / สลิป</div>
                  <div className="text-[11px] text-slate-400">รองรับไฟล์ JPG, PNG, PDF ขนาดไม่เกิน 5MB</div>
                </div>
              </div>
              <label className="flex items-center gap-1 text-xs cursor-pointer bg-white px-2.5 py-1 rounded border border-slate-200 shadow-2xs font-medium text-slate-700 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={formReceiptMock}
                  onChange={(e) => setFormReceiptMock(e.target.checked)}
                  className="rounded text-blue-600"
                />
                แนบหลักฐาน
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">หมายเหตุเพิ่มเติม</label>
            <textarea
              rows={2}
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="ระบุเลขที่บิล ชื่อร้านค้า หรือรายละเอียดประกอบ..."
              className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setCreateModalOpen(false)} className="text-xs">
            ยกเลิก
          </Button>
          <Button onClick={handleSaveExpense} className="text-xs bg-blue-600 text-white hover:bg-blue-700">
            บันทึกรายการ
          </Button>
        </DialogFooter>
      </Dialog>

      {/* View Receipt Modal */}
      <Dialog open={viewReceiptModalOpen} onOpenChange={setViewReceiptModalOpen}>
        <DialogHeader>
          <DialogTitle onClose={() => setViewReceiptModalOpen(false)}>หลักฐานใบเสร็จรับเงิน / สลิปโอนเงิน</DialogTitle>
        </DialogHeader>
        <DialogContent className="p-0">
          {activeReceiptUrl && (
            <div className="flex flex-col items-center p-4">
              <img
                src={activeReceiptUrl}
                alt="Receipt Mock"
                className="max-h-[420px] w-auto rounded-lg shadow-md border border-slate-200 object-cover"
              />
              <p className="text-xs text-slate-400 mt-3 text-center">
                รูปถ่ายใบเสร็จรับเงิน/สลิปโอนเงินแนบโดยเจ้าหน้าที่สาขา
              </p>
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          <Button size="sm" onClick={() => setViewReceiptModalOpen(false)} className="text-xs">
            ปิดหน้าต่าง
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
