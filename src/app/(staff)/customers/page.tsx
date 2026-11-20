"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import {
  Users,
  Search,
  PlusCircle,
  Phone,
  Mail,
  MessageSquare,
  Wrench,
  ShoppingCart,
  HandCoins,
  CreditCard,
  Building2,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Edit2,
  Trash2,
  RefreshCw,
  Crown,
  ShieldCheck,
  ShieldAlert,
  ArrowUpRight,
  Save,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { formatDateThai, formatTHB } from "@/lib/utils";
import { formatPhoneDisplay, normalizePhone, CustomerTag } from "@/lib/customer-utils";

interface CustomerItem {
  id: string;
  name: string;
  phone: string;
  email?: string;
  lineId?: string | null;
  nationalId?: string | null;
  taxId?: string | null;
  address?: string | null;
  tag?: CustomerTag;
  notes?: string;
  createdAt: string;
  totalSpend: number;
  totalSalesSpend?: number;
  totalRepairSpend?: number;
  totalOrders?: number;
  activeDebts: number;
  hasOverdueDebt?: boolean;
  tier: CustomerTag;
  _count?: {
    repairJobs: number;
    sales: number;
    tradeInContracts: number;
    installmentContracts?: number;
  };
}

interface WarrantyRecord {
  id: string;
  type: "REPAIR" | "SALE";
  trackingCode: string;
  device: string;
  serialIMEI: string;
  warrantyDays: number;
  startDate: string;
  expiryDate: string;
  daysRemaining: number;
  status: "ACTIVE" | "EXPIRED";
}

interface CustomerDetailData extends CustomerItem {
  repairJobs: Array<{
    id: string;
    trackingCode: string;
    deviceBrand: string;
    deviceModel: string;
    deviceColor?: string | null;
    serialIMEI?: string | null;
    status: string;
    totalCost: number;
    estimatedCost: number;
    laborFee?: number;
    warrantyDays?: number;
    createdAt: string;
    completedAt?: string | null;
    issueDescription: string;
    technician?: { id: string; name: string } | null;
  }>;
  sales: Array<{
    id: string;
    invoiceNo: string;
    netAmount: number;
    status: string;
    paymentMethod: string;
    createdAt: string;
    items: Array<{
      id: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
      product: { name: string; code: string };
      deviceImei?: { imei: string } | null;
    }>;
  }>;
  installmentContracts: Array<{
    id: string;
    contractNo: string;
    deviceModel: string;
    imei?: string | null;
    totalPrice: number;
    downPayment: number;
    financedAmount: number;
    monthlyPayment: number;
    paidMonths: number;
    termMonths: number;
    status: string;
    isOverdue: boolean;
    overdueDays: number;
    nextDueDate?: string | null;
  }>;
  tradeInContracts: Array<{
    id: string;
    contractNo: string;
    type: string;
    deviceBrand: string;
    deviceModel: string;
    imei?: string | null;
    agreedPrice: number;
    interestRateMonthly?: number;
    durationMonths?: number;
    dueDate?: string | null;
    status: string;
    createdAt: string;
  }>;
  warranties?: WarrantyRecord[];
}

interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

const repairStatusMap: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: "รอดำเนินการ", color: "text-amber-800", bg: "bg-amber-50" },
  DIAGNOSING: { label: "กำลังตรวจเช็ก", color: "text-blue-800", bg: "bg-blue-50" },
  WAITING_PARTS: { label: "รออะไหล่", color: "text-purple-800", bg: "bg-purple-50" },
  REPAIRING: { label: "กำลังซ่อม", color: "text-indigo-800", bg: "bg-indigo-50" },
  QC_PASSED: { label: "QC ผ่านแล้ว", color: "text-cyan-800", bg: "bg-cyan-50" },
  READY: { label: "พร้อมรับเครื่อง", color: "text-emerald-800", bg: "bg-emerald-50" },
  COMPLETED: { label: "ส่งมอบแล้ว", color: "text-slate-700", bg: "bg-slate-100" },
  CANCELLED: { label: "ยกเลิกแล้ว", color: "text-rose-800", bg: "bg-rose-50" },
};

export default function CustomersCRMPage() {
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("latest");
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Detail Drawer State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<CustomerDetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailTab, setDetailTab] = useState<"repairs" | "sales" | "installments" | "tradeIns" | "warranties">("repairs");

  // Inline notes in drawer
  const [editingNotes, setEditingNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSuccess, setNotesSuccess] = useState(false);

  // Modal State for New/Edit Customer
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    lineId: "",
    nationalId: "",
    address: "",
    tag: "REGULAR" as CustomerTag,
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<CustomerItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async (q: string = "", tag: string = "ALL", sort: string = "latest", page: number = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("search", q.trim());
      if (tag && tag !== "ALL") params.set("tag", tag);
      if (sort) params.set("sort", sort);
      params.set("page", String(page));
      params.set("limit", "20");

      const res = await fetch(`/api/customers?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.customers) {
        setCustomers(json.customers);
        if (json.pagination) {
          setPagination(json.pagination);
        }
      }
    } catch (err) {
      console.error("Fetch customers error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCustomerDetail = async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/customers/${id}`);
      const json = await res.json();
      if (json.success && json.customer) {
        setDetailData(json.customer);
        setEditingNotes(json.customer.notes || "");
      }
    } catch (err) {
      console.error("Fetch customer detail error:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers(search, tierFilter, sortBy, pagination.page);
    }, 200);
    return () => clearTimeout(timer);
  }, [search, tierFilter, sortBy, pagination.page, fetchCustomers]);

  useEffect(() => {
    if (selectedCustomerId) {
      fetchCustomerDetail(selectedCustomerId);
    } else {
      setDetailData(null);
    }
  }, [selectedCustomerId]);

  const handleOpenCreate = () => {
    setModalMode("create");
    setEditingCustomerId(null);
    setFormData({
      name: "",
      phone: "",
      email: "",
      lineId: "",
      nationalId: "",
      address: "",
      tag: "REGULAR",
      notes: "",
    });
    setErrorMsg(null);
    setShowModal(true);
  };

  const handleOpenEdit = (c: CustomerItem) => {
    setModalMode("edit");
    setEditingCustomerId(c.id);
    setFormData({
      name: c.name,
      phone: c.phone,
      email: c.email || "",
      lineId: c.lineId || "",
      nationalId: c.nationalId || c.taxId || "",
      address: c.address || "",
      tag: c.tag || "REGULAR",
      notes: c.notes || "",
    });
    setErrorMsg(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      setErrorMsg("กรุณากรอกชื่อและเบอร์โทรศัพท์ลูกค้า");
      return;
    }

    const clean = normalizePhone(formData.phone);
    if (!clean || clean.length < 9) {
      setErrorMsg("เบอร์โทรศัพท์ไม่ถูกต้อง (ต้องมีอย่างน้อย 9-10 หลัก)");
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      const endpoint = modalMode === "create" ? "/api/customers" : `/api/customers/${editingCustomerId}`;
      const method = modalMode === "create" ? "POST" : "PATCH";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          phone: clean,
          taxId: formData.nationalId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        confetti({ particleCount: 30, spread: 60, origin: { y: 0.8 } });
        setShowModal(false);
        fetchCustomers(search, tierFilter, sortBy, pagination.page);
        if (selectedCustomerId && (selectedCustomerId === editingCustomerId || selectedCustomerId === json.customer?.id)) {
          fetchCustomerDetail(selectedCustomerId);
        }
      } else {
        setErrorMsg(json.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์";
      setErrorMsg(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!detailData) return;
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/customers/${detailData.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: editingNotes }),
      });
      const json = await res.json();
      if (json.success) {
        setDetailData({ ...detailData, notes: editingNotes });
        setNotesSuccess(true);
        setTimeout(() => setNotesSuccess(false), 2500);
        fetchCustomers(search, tierFilter, sortBy, pagination.page);
      }
    } catch (err) {
      console.error("Save notes error:", err);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleOpenDelete = (c: CustomerItem) => {
    setCustomerToDelete(c);
    setDeleteError(null);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!customerToDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/customers/${customerToDelete.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setShowDeleteModal(false);
        setCustomerToDelete(null);
        if (selectedCustomerId === customerToDelete.id) {
          setSelectedCustomerId(null);
        }
        fetchCustomers(search, tierFilter, sortBy, pagination.page);
      } else {
        setDeleteError(json.error || "ไม่สามารถลบข้อมูลลูกค้าได้");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการลบข้อมูล";
      setDeleteError(message);
    } finally {
      setDeleting(false);
    }
  };

  // Calculate CRM overview stats from currently loaded batch
  const totalSpendAll = customers.reduce((sum, c) => sum + (c.totalSpend ?? 0), 0);
  const totalRepairsAll = customers.reduce((sum, c) => sum + (c._count?.repairJobs ?? 0), 0);
  const totalDebtsAll = customers.reduce((sum, c) => sum + (c.activeDebts ?? 0), 0);
  const vipCount = customers.filter((c) => c.tier === "VIP" || c.tag === "VIP").length;
  const blacklistCount = customers.filter((c) => c.tag === "BLACKLIST").length;

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* 1. Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
              <Users className="h-3.5 w-3.5 text-teal-600" />
              ศูนย์รวมข้อมูลลูกค้าและประวัติการใช้บริการ (Customer CRM)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-2">
            ทะเบียนลูกค้า & ประวัติความสัมพันธ์ (CRM)
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            ดูประวัติงานซ่อม บิลซื้อสินค้า POS สัญญาผ่อนชำระ สัญญาจำนำ และสิทธิการรับประกัน (Warranty) แบบครบวงจร
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => fetchCustomers(search, tierFilter, sortBy, pagination.page)}
            variant="outline"
            size="sm"
            className="h-10 px-4 gap-1.5 rounded-xl border-slate-200 font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            <span>รีเฟรช</span>
          </Button>
          <Button
            onClick={handleOpenCreate}
            className="h-10 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-xs gap-2 cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            <span>เพิ่มลูกค้าใหม่</span>
          </Button>
        </div>
      </div>

      {/* 2. Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200/90 shadow-2xs bg-white rounded-2xl hover:shadow-xs transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">จำนวนลูกค้าในระบบ</p>
              <p className="text-2xl font-bold tracking-tight text-slate-900 mt-1 tabular-nums">
                {pagination.totalCount.toLocaleString()} <span className="text-xs font-normal text-slate-500">ราย</span>
              </p>
              <p className="text-[11px] text-teal-700 mt-0.5">
                {vipCount} ราย VIP {blacklistCount > 0 && `• ${blacklistCount} ราย Blacklist`}
              </p>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/90 shadow-2xs bg-white rounded-2xl hover:shadow-xs transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">งานซ่อมสะสมทั้งหมด</p>
              <p className="text-2xl font-bold tracking-tight text-blue-700 mt-1 tabular-nums">
                {totalRepairsAll.toLocaleString()} <span className="text-xs font-normal text-slate-500">เครื่อง</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">จากลูกค้าทั้งหมดในร้าน</p>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Wrench className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/90 shadow-2xs bg-white rounded-2xl hover:shadow-xs transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">ยอดการใช้จ่ายสะสม (LTV)</p>
              <p className="text-2xl font-bold tracking-tight text-emerald-700 mt-1 tabular-nums">
                {formatTHB(totalSpendAll)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">ยอดบิลขาย + งานซ่อมสำเร็จ</p>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <ShoppingCart className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/90 shadow-2xs bg-white rounded-2xl hover:shadow-xs transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">ยอดหนี้ผ่อนค้างชำระ</p>
              <p className="text-2xl font-bold tracking-tight text-amber-700 mt-1 tabular-nums">
                {formatTHB(totalDebtsAll)}
              </p>
              <p className="text-[11px] text-amber-600 mt-0.5">
                {customers.filter((c) => c.hasOverdueDebt).length} ราย ค้างชำระเกินกำหนด
              </p>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <CreditCard className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Search Bar, Tier Filter Pills, and Sort Dropdown */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            placeholder="ค้นหาชื่อ, เบอร์โทร (เช่น 081...), อีเมล, เลข ปชช./ผู้เสียภาษี..."
            className="pl-10 h-10 text-sm bg-slate-50 border-slate-200 focus:bg-white rounded-xl"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: "ALL", label: "ทั้งหมด" },
            { id: "VIP", label: "👑 VIP" },
            { id: "WHOLESALE", label: "🏢 ขายส่ง" },
            { id: "REGULAR", label: "ทั่วไป" },
            { id: "NEW", label: "✨ ลูกค้าใหม่" },
            { id: "BLACKLIST", label: "🚫 Blacklist" },
            { id: "DEBT", label: "⚠️ มีหนี้ค้างชำระ" },
            { id: "REPAIR", label: "🔧 มีประวัติซ่อม" },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => {
                setTierFilter(pill.id);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                tierFilter === pill.id
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Sort Selector */}
        <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
          <span className="text-xs text-slate-500 font-medium">เรียงตาม:</span>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="h-9 px-3 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
          >
            <option value="latest">ล่าสุด (Latest)</option>
            <option value="oldest">เก่าสุด (Oldest)</option>
            <option value="spend_desc">ยอดใช้จ่ายสูงสุด (Top Spend)</option>
            <option value="spend_asc">ยอดใช้จ่ายน้อยสุด (Lowest Spend)</option>
            <option value="name_asc">ชื่อ ก-ฮ (Name A-Z)</option>
            <option value="name_desc">ชื่อ ฮ-ก (Name Z-A)</option>
          </select>
        </div>
      </div>

      {/* 4. Customer List Table/Cards */}
      <Card className="border-slate-200/90 shadow-2xs overflow-hidden rounded-2xl bg-white">
        <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/60">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
            <span>รายชื่อลูกค้า ({pagination.totalCount} ราย)</span>
            <span className="text-xs font-normal text-slate-500">คลิกแถวเพื่อเปิดประวัติ 5 หมวดและจัดการข้อมูล</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-sm text-slate-500 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-teal-600" />
              <span>กำลังโหลดข้อมูลลูกค้า...</span>
            </div>
          ) : customers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">ไม่พบข้อมูลลูกค้าตามเงื่อนไข</p>
              <p className="text-xs text-slate-400 mt-1">ลองเปลี่ยนคำค้นหา หรือกดปุ่ม &quot;เพิ่มลูกค้าใหม่&quot;</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {customers.map((c) => {
                const isVip = c.tier === "VIP" || c.tag === "VIP";
                const isWholesale = c.tag === "WHOLESALE";
                const isBlacklist = c.tag === "BLACKLIST";
                const isRegular = c.tier === "REGULAR" || c.tag === "REGULAR";

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCustomerId(c.id)}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors cursor-pointer group ${
                      isBlacklist
                        ? "bg-rose-50/40 hover:bg-rose-50/70"
                        : "hover:bg-slate-50/80"
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`h-11 w-11 rounded-2xl flex items-center justify-center font-extrabold text-sm shrink-0 border ${
                          isBlacklist
                            ? "bg-rose-100 text-rose-800 border-rose-300 shadow-2xs"
                            : isVip
                            ? "bg-amber-100 text-amber-800 border-amber-300 shadow-2xs"
                            : isWholesale
                            ? "bg-purple-100 text-purple-800 border-purple-300 shadow-2xs"
                            : isRegular
                            ? "bg-teal-50 text-teal-800 border-teal-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {isBlacklist ? "🚫" : isVip ? "👑" : isWholesale ? "🏢" : c.name.slice(0, 1)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm group-hover:text-teal-700 transition-colors">
                            {c.name}
                          </span>

                          {/* Customer Tag Badges */}
                          {isBlacklist && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-rose-600 text-white shadow-2xs">
                              <ShieldAlert className="h-3 w-3" />
                              <span>BLACKLIST</span>
                            </span>
                          )}
                          {isVip && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <Crown className="h-3 w-3 text-amber-600" />
                              <span>VIP</span>
                            </span>
                          )}
                          {isWholesale && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                              <Building2 className="h-3 w-3 text-purple-600" />
                              <span>ลูกค้าขายส่ง</span>
                            </span>
                          )}
                          {isRegular && !isVip && !isWholesale && !isBlacklist && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                              <span>ทั่วไป</span>
                            </span>
                          )}
                          {c.tier === "NEW" && !isWholesale && !isBlacklist && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              <span>ใหม่</span>
                            </span>
                          )}
                          {c.email && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              <Mail className="h-2.5 w-2.5" />
                              <span>{c.email}</span>
                            </span>
                          )}
                          {c.lineId && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              LINE: @{c.lineId}
                            </span>
                          )}
                          {c.hasOverdueDebt && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertCircle className="h-3 w-3" />
                              <span>ค้างชำระค่างวด</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 flex-wrap">
                          <a
                            href={`tel:${c.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 font-mono font-semibold text-teal-700 hover:underline"
                          >
                            <Phone className="h-3 w-3" />
                            {formatPhoneDisplay(c.phone)}
                          </a>
                          {c.nationalId && (
                            <span className="font-mono text-slate-400">
                              เลข ปชช./ผู้เสียภาษี: {c.nationalId}
                            </span>
                          )}
                          {c.address && (
                            <span className="text-slate-400 truncate max-w-xs">{c.address}</span>
                          )}
                          <span className="text-slate-400">
                            สมัครเมื่อ: {formatDateThai(c.createdAt)}
                          </span>
                        </div>

                        {/* Internal notes preview */}
                        {c.notes && (
                          <p className="text-[11px] text-amber-700 bg-amber-50/70 border border-amber-200/50 rounded-md px-2 py-0.5 mt-1.5 max-w-lg truncate">
                            📝 {c.notes}
                          </p>
                        )}

                        {/* Transaction Badges */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                            <Wrench className="h-3 w-3" />
                            <span>ซ่อม {c._count?.repairJobs ?? 0} ครั้ง</span>
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            <ShoppingCart className="h-3 w-3" />
                            <span>ซื้อ {c._count?.sales ?? 0} บิล</span>
                          </span>
                          {(c._count?.installmentContracts ?? 0) > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/60">
                              <CreditCard className="h-3 w-3" />
                              <span>ผ่อน {c._count?.installmentContracts} สัญญา</span>
                            </span>
                          )}
                          {(c._count?.tradeInContracts ?? 0) > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                              <HandCoins className="h-3 w-3" />
                              <span>เทิร์น/จำนำ {c._count?.tradeInContracts} สัญญา</span>
                            </span>
                          )}
                          {c.totalSpend !== undefined && c.totalSpend > 0 && (
                            <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 font-mono">
                              ยอดรวม: {formatTHB(c.totalSpend)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div
                      className="flex items-center gap-1.5 self-end sm:self-center shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link href={`/repair-intake?customerId=${c.id}&phone=${encodeURIComponent(c.phone)}&name=${encodeURIComponent(c.name)}`}>
                        <Button variant="outline" size="sm" className="h-8 text-xs font-bold gap-1 text-blue-700 border-blue-200 hover:bg-blue-50 rounded-xl cursor-pointer">
                          <Wrench className="h-3 w-3" />
                          <span>เปิดใบซ่อม</span>
                        </Button>
                      </Link>
                      <Link href={`/pos?customerId=${c.id}&phone=${encodeURIComponent(c.phone)}&name=${encodeURIComponent(c.name)}`}>
                        <Button variant="outline" size="sm" className="h-8 text-xs font-bold gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50 rounded-xl cursor-pointer">
                          <ShoppingCart className="h-3 w-3" />
                          <span>ขาย POS</span>
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(c)}
                        title="แก้ไขข้อมูลลูกค้า"
                        className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 rounded-xl cursor-pointer"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDelete(c)}
                        title="ลบข้อมูลลูกค้า"
                        className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 rounded-xl cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedCustomerId(c.id)}
                        className="h-8 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl gap-1 cursor-pointer"
                      >
                        <span>ประวัติ</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-xs text-slate-500">
                หน้า {pagination.page} จาก {pagination.totalPages} (ทั้งหมด {pagination.totalCount} รายการ)
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasPrevPage}
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  className="h-8 text-xs rounded-lg gap-1 border-slate-200 cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>ก่อนหน้า</span>
                </Button>
                <span className="text-xs font-bold px-2.5 py-1 rounded bg-slate-200 text-slate-800">
                  {pagination.page}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasNextPage}
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  className="h-8 text-xs rounded-lg gap-1 border-slate-200 cursor-pointer"
                >
                  <span>ถัดไป</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. Customer Detail Drawer (Slide-Over Modal) with 5 Comprehensive History Tabs */}
      <Dialog open={!!selectedCustomerId} onOpenChange={(open) => !open && setSelectedCustomerId(null)}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl border border-slate-200 shadow-xl bg-slate-50">
          {loadingDetail || !detailData ? (
            <div className="p-16 text-center text-sm text-slate-500 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="h-6 w-6 animate-spin text-teal-600" />
              <span>กำลังดึงข้อมูลประวัติลูกค้าแบบเรียลไทม์...</span>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {/* Drawer Top Header Banner */}
              <div className="p-6 bg-white rounded-t-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={`h-14 w-14 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 border ${
                        detailData.tag === "BLACKLIST"
                          ? "bg-rose-100 text-rose-800 border-rose-300 shadow-xs"
                          : detailData.tier === "VIP" || detailData.tag === "VIP"
                          ? "bg-amber-100 text-amber-800 border-amber-300 shadow-xs"
                          : detailData.tag === "WHOLESALE"
                          ? "bg-purple-100 text-purple-800 border-purple-300 shadow-xs"
                          : "bg-teal-50 text-teal-800 border-teal-200"
                      }`}
                    >
                      {detailData.tag === "BLACKLIST"
                        ? "🚫"
                        : detailData.tier === "VIP" || detailData.tag === "VIP"
                        ? "👑"
                        : detailData.tag === "WHOLESALE"
                        ? "🏢"
                        : detailData.name.slice(0, 1)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">
                          {detailData.name}
                        </h2>

                        {detailData.tag === "BLACKLIST" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-600 text-white">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            <span>ติดบัญชีดำ (Blacklist)</span>
                          </span>
                        )}
                        {(detailData.tier === "VIP" || detailData.tag === "VIP") && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <Crown className="h-3.5 w-3.5 text-amber-600" />
                            <span>สมาชิกระดับ VIP</span>
                          </span>
                        )}
                        {detailData.tag === "WHOLESALE" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
                            <Building2 className="h-3.5 w-3.5 text-purple-600" />
                            <span>ลูกค้าขายส่ง (Wholesale)</span>
                          </span>
                        )}
                        {detailData.tier === "REGULAR" && detailData.tag !== "WHOLESALE" && detailData.tag !== "BLACKLIST" && detailData.tag !== "VIP" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                            <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
                            <span>ลูกค้าทั่วไป</span>
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1.5 font-medium">
                        <a
                          href={`tel:${detailData.phone}`}
                          className="flex items-center gap-1 text-teal-700 hover:underline font-mono font-bold"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          <span>{formatPhoneDisplay(detailData.phone)}</span>
                        </a>
                        {detailData.email && (
                          <a
                            href={`mailto:${detailData.email}`}
                            className="flex items-center gap-1 text-slate-600 hover:underline"
                          >
                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                            <span>{detailData.email}</span>
                          </a>
                        )}
                        {detailData.lineId && (
                          <span className="flex items-center gap-1 text-emerald-700">
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>LINE: @{detailData.lineId}</span>
                          </span>
                        )}
                        {(detailData.nationalId || detailData.taxId) && (
                          <span className="font-mono text-slate-500">
                            เลข ปชช./ผู้เสียภาษี: {detailData.nationalId || detailData.taxId}
                          </span>
                        )}
                      </div>

                      {detailData.address && (
                        <p className="text-xs text-slate-500 mt-1">ที่อยู่: {detailData.address}</p>
                      )}
                    </div>
                  </div>

                  {/* Top Action CTAs */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(detailData)}
                      className="h-9 px-3 rounded-xl text-xs font-bold gap-1 border-slate-200 cursor-pointer"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-slate-600" />
                      <span>แก้ไข</span>
                    </Button>
                    <Link
                      href={`/repair-intake?customerId=${detailData.id}&phone=${encodeURIComponent(
                        detailData.phone
                      )}&name=${encodeURIComponent(detailData.name)}`}
                    >
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 px-3.5 rounded-xl text-xs gap-1.5 shadow-2xs cursor-pointer">
                        <Wrench className="h-3.5 w-3.5" />
                        <span>เปิดใบซ่อม</span>
                      </Button>
                    </Link>
                    <Link
                      href={`/pos?customerId=${detailData.id}&phone=${encodeURIComponent(
                        detailData.phone
                      )}&name=${encodeURIComponent(detailData.name)}`}
                    >
                      <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 px-3.5 rounded-xl text-xs gap-1.5 shadow-2xs cursor-pointer">
                        <ShoppingCart className="h-3.5 w-3.5" />
                        <span>เปิดบิล POS</span>
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Quick Stats Grid inside Drawer */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-[11px] font-medium text-slate-500">ยอดใช้จ่ายสะสม (LTV)</p>
                    <p className="text-base font-extrabold text-slate-900 font-mono mt-0.5">
                      {formatTHB(detailData.totalSpend ?? 0)}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      ซ่อม {formatTHB(detailData.totalRepairSpend ?? 0)} + ซื้อ {formatTHB(detailData.totalSalesSpend ?? 0)}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100">
                    <p className="text-[11px] font-medium text-blue-700">ส่งซ่อมทั้งหมด</p>
                    <p className="text-base font-extrabold text-blue-900 font-mono mt-0.5">
                      {detailData.repairJobs.length} เครื่อง
                    </p>
                    <p className="text-[10px] text-blue-600 mt-0.5">
                      เสร็จสิ้น {detailData.repairJobs.filter((j) => j.status === "COMPLETED").length} เครื่อง
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                    <p className="text-[11px] font-medium text-emerald-700">ซื้อสินค้า POS</p>
                    <p className="text-base font-extrabold text-emerald-900 font-mono mt-0.5">
                      {detailData.sales.length} บิล
                    </p>
                    <p className="text-[10px] text-emerald-600 mt-0.5">
                      สำเร็จ {detailData.sales.filter((s) => s.status === "COMPLETED").length} บิล
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100">
                    <p className="text-[11px] font-medium text-amber-700">หนี้ผ่อนค้างชำระ</p>
                    <p className="text-base font-extrabold text-amber-900 font-mono mt-0.5">
                      {formatTHB(detailData.activeDebts ?? 0)}
                    </p>
                    <p className="text-[10px] text-amber-600 mt-0.5">
                      {detailData.installmentContracts.length} สัญญาผ่อน
                    </p>
                  </div>
                </div>

                {/* Staff Internal Notes Box */}
                <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <span>📝 หมายเหตุภายในร้าน (Internal Staff Notes)</span>
                      {notesSuccess && (
                        <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> บันทึกสำเร็จ
                        </span>
                      )}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleSaveNotes}
                      disabled={savingNotes}
                      className="h-7 text-xs font-bold text-amber-800 hover:bg-amber-100 gap-1 rounded-lg cursor-pointer"
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>{savingNotes ? "กำลังบันทึก..." : "บันทึกโน้ต"}</span>
                    </Button>
                  </div>
                  <textarea
                    value={editingNotes}
                    onChange={(e) => setEditingNotes(e.target.value)}
                    placeholder="บันทึกข้อความเฉพาะช่างและพนักงาน เช่น ช่างประจำ, อาการที่เคยพบ, พฤติกรรมลูกค้า..."
                    rows={2}
                    className="w-full text-xs p-2 rounded-lg border border-amber-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Segmented Tab Selector (5 History Tabs) */}
              <div className="px-6 py-3 bg-white flex items-center gap-2 overflow-x-auto border-b border-slate-200">
                {[
                  { id: "repairs", label: `งานซ่อม (${detailData.repairJobs.length})`, icon: Wrench },
                  { id: "sales", label: `บิลซื้อสินค้า (${detailData.sales.length})`, icon: ShoppingCart },
                  { id: "installments", label: `สัญญาผ่อน (${detailData.installmentContracts.length})`, icon: CreditCard },
                  { id: "tradeIns", label: `เทิร์น/จำนำ (${detailData.tradeInContracts.length})`, icon: HandCoins },
                  { id: "warranties", label: `ประกัน & เคลม (${detailData.warranties?.length ?? 0})`, icon: ShieldCheck },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = detailTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setDetailTab(tab.id as typeof detailTab)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        isActive
                          ? "bg-slate-900 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab Contents */}
              <div className="p-6 space-y-3">
                {/* 1. REPAIRS TAB */}
                {detailTab === "repairs" && (
                  <div className="space-y-3">
                    {detailData.repairJobs.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
                        ยังไม่มีประวัติส่งซ่อมกับทางร้าน
                      </div>
                    ) : (
                      detailData.repairJobs.map((job) => {
                        const statusBadge = repairStatusMap[job.status] || {
                          label: job.status,
                          color: "text-slate-700",
                          bg: "bg-slate-100",
                        };
                        return (
                          <div
                            key={job.id}
                            className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                  {job.trackingCode}
                                </span>
                                <span className="font-bold text-slate-900 text-sm">
                                  {job.deviceBrand} {job.deviceModel}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${statusBadge.bg} ${statusBadge.color}`}>
                                  {statusBadge.label}
                                </span>
                                {job.serialIMEI && (
                                  <span className="font-mono text-[10px] text-slate-400">
                                    IMEI: {job.serialIMEI}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-600">อาการ: {job.issueDescription}</p>
                              <p className="text-[11px] text-slate-400">
                                วันที่รับ: {formatDateThai(job.createdAt)} {job.completedAt && `• เสร็จเมื่อ: ${formatDateThai(job.completedAt)}`}
                                {job.technician && ` • ช่าง: ${job.technician.name}`}
                              </p>
                            </div>

                            <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                              <span className="font-mono font-bold text-sm text-slate-900">
                                {formatTHB(job.totalCost || job.estimatedCost)}
                              </span>
                              <Link href={`/repairs/${job.id}`}>
                                <Button variant="outline" size="sm" className="h-8 text-xs font-semibold rounded-lg gap-1 cursor-pointer">
                                  <span>ดูใบงาน</span>
                                  <ArrowUpRight className="h-3 w-3" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* 2. SALES TAB */}
                {detailTab === "sales" && (
                  <div className="space-y-3">
                    {detailData.sales.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
                        ยังไม่มีประวัติการซื้อสินค้าหน้าร้าน
                      </div>
                    ) : (
                      detailData.sales.map((sale) => (
                        <div
                          key={sale.id}
                          className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {sale.invoiceNo}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                                sale.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                              }`}>
                                {sale.status === "COMPLETED" ? "ชำระเงินสำเร็จ" : "ยกเลิก/คืนเงิน"}
                              </span>
                              <span className="text-xs text-slate-500 font-medium">({sale.paymentMethod})</span>
                            </div>
                            <div className="text-xs text-slate-600">
                              สินค้า: {sale.items.map((i) => `${i.product.name} (x${i.quantity})`).join(", ")}
                            </div>
                            <p className="text-[11px] text-slate-400">
                              วันที่ซื้อ: {formatDateThai(sale.createdAt)}
                            </p>
                          </div>

                          <div className="font-mono font-bold text-base text-slate-900 shrink-0 self-end sm:self-center">
                            {formatTHB(sale.netAmount)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* 3. INSTALLMENTS TAB */}
                {detailTab === "installments" && (
                  <div className="space-y-3">
                    {detailData.installmentContracts.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
                        ยังไม่มีสัญญาผ่อนชำระ
                      </div>
                    ) : (
                      detailData.installmentContracts.map((ins) => (
                        <div
                          key={ins.id}
                          className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                {ins.contractNo}
                              </span>
                              <span className="font-bold text-slate-900 text-sm">
                                {ins.deviceModel}
                              </span>
                              {ins.imei && (
                                <span className="font-mono text-xs text-slate-400">
                                  IMEI: {ins.imei}
                                </span>
                              )}
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                              ins.status === "COMPLETED"
                                ? "bg-emerald-50 text-emerald-700"
                                : ins.isOverdue
                                ? "bg-rose-50 text-rose-700 font-black"
                                : "bg-blue-50 text-blue-700"
                            }`}>
                              {ins.status === "COMPLETED" ? "ผ่อนครบแล้ว" : ins.isOverdue ? `ค้างชำระ (${ins.overdueDays} วัน)` : "กำลังผ่อนชำระ"}
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div>
                            <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                              <span>งวดที่ชำระ: {ins.paidMonths} / {ins.termMonths} งวด</span>
                              <span>ค่างวด: {formatTHB(ins.monthlyPayment)}/ด. (ยอดรวม: {formatTHB(ins.totalPrice)})</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-teal-600 h-2 rounded-full transition-all"
                                style={{ width: `${Math.min(100, Math.round((ins.paidMonths / ins.termMonths) * 100))}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* 4. TRADE-IN & PAWN TAB */}
                {detailTab === "tradeIns" && (
                  <div className="space-y-3">
                    {detailData.tradeInContracts.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
                        ยังไม่มีประวัติเทิร์นหรือจำนำเครื่อง
                      </div>
                    ) : (
                      detailData.tradeInContracts.map((tc) => (
                        <div
                          key={tc.id}
                          className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                                {tc.contractNo}
                              </span>
                              <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                {tc.type === "PAWN" ? "ฝากจำนำ" : "รับซื้อ/เทิร์น"}
                              </span>
                              <span className="text-sm font-bold text-slate-900">
                                {tc.deviceBrand} {tc.deviceModel}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1">
                              วันที่ทำสัญญา: {formatDateThai(tc.createdAt)} • สถานะ: {tc.status}
                              {tc.dueDate && ` • กำหนดชำระ: ${formatDateThai(tc.dueDate)}`}
                            </p>
                          </div>
                          <div className="font-mono font-bold text-sm text-slate-900">
                            {formatTHB(tc.agreedPrice)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* 5. WARRANTY CLAIMS TAB */}
                {detailTab === "warranties" && (
                  <div className="space-y-3">
                    {!detailData.warranties || detailData.warranties.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
                        ยังไม่มีประวัติการรับประกันสินค้าหรืองานซ่อม
                      </div>
                    ) : (
                      detailData.warranties.map((w) => {
                        const isActive = w.status === "ACTIVE";
                        return (
                          <div
                            key={w.id}
                            className={`p-4 rounded-xl bg-white border shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              isActive ? "border-emerald-200" : "border-slate-200"
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                                  {w.trackingCode}
                                </span>
                                <span className="text-sm font-bold text-slate-900">{w.device}</span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                                    isActive
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : "bg-slate-100 text-slate-600 border border-slate-200"
                                  }`}
                                >
                                  {isActive ? `🟢 เหลือประกัน ${w.daysRemaining} วัน` : "⚪ หมดระยะเวลารับประกัน"}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 font-mono">
                                IMEI: {w.serialIMEI} • ระยะเวลารับประกัน: {w.warrantyDays} วัน
                              </p>
                              <p className="text-[11px] text-slate-400">
                                เริ่ม: {formatDateThai(w.startDate)} • หมดอายุ: {formatDateThai(w.expiryDate)}
                              </p>
                            </div>

                            <div className="shrink-0 self-end sm:self-center">
                              {isActive && (
                                <Link href={`/repair-intake?customerId=${detailData.id}&phone=${encodeURIComponent(detailData.phone)}&name=${encodeURIComponent(detailData.name)}&issue=${encodeURIComponent(`เคลมประกันจากงานซ่อม ${w.trackingCode}`)}`}>
                                  <Button size="sm" className="h-8 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg gap-1 cursor-pointer">
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    <span>เปิดเคลมประกัน</span>
                                  </Button>
                                </Link>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 6. Modal Add / Edit Customer */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Users className="h-5 w-5 text-teal-600" />
              <span>{modalMode === "create" ? "เพิ่มข้อมูลลูกค้าใหม่" : "แก้ไขข้อมูลลูกค้า"}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-2 border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  ชื่อ-นามสกุล <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="เช่น คุณสมชาย มั่งคั่ง"
                  required
                  className="rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  เบอร์โทรศัพท์ <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="เช่น 0812345678"
                  required
                  className="rounded-xl font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  อีเมล (สำหรับส่งใบเสร็จ/แจ้งเตือน)
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="customer@email.com"
                  className="rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  ระดับลูกค้า / แท็ก (Customer Tag)
                </label>
                <select
                  value={formData.tag}
                  onChange={(e) => setFormData({ ...formData, tag: e.target.value as CustomerTag })}
                  className="w-full h-10 px-3 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="REGULAR">ทั่วไป (Regular)</option>
                  <option value="VIP">👑 VIP</option>
                  <option value="WHOLESALE">🏢 ลูกค้าขายส่ง (Wholesale)</option>
                  <option value="BLACKLIST">🚫 ติดบัญชีดำ (Blacklist)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  LINE ID
                </label>
                <Input
                  value={formData.lineId}
                  onChange={(e) => setFormData({ ...formData, lineId: e.target.value })}
                  placeholder="เช่น somchai_repair"
                  className="rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  เลข ปชช. / เลขประจำตัวผู้เสียภาษี
                </label>
                <Input
                  value={formData.nationalId}
                  onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                  placeholder="13 หลัก เช่น 1100200300400"
                  maxLength={13}
                  className="rounded-xl font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">ที่อยู่ (Address)</label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="บ้านเลขที่ ตำบล อำเภอ จังหวัด รหัสไปรษณีย์"
                className="rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">หมายเหตุภายในร้าน (Internal Notes)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="บันทึกข้อความเฉพาะช่างและพนักงาน..."
                rows={2}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="rounded-xl cursor-pointer"
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl gap-1.5 cursor-pointer"
                disabled={saving}
              >
                {saving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                <span>{modalMode === "create" ? "บันทึกลูกค้าใหม่" : "บันทึกการแก้ไข"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 7. Modal Confirm Delete */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
              <span>ยืนยันการลบข้อมูลลูกค้า</span>
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 space-y-3">
            {deleteError && (
              <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-2 border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}
            <p className="text-sm text-slate-600">
              คุณต้องการลบข้อมูลลูกค้า <span className="font-bold text-slate-900">{customerToDelete?.name}</span> ({customerToDelete?.phone}) หรือไม่?
            </p>
            <p className="text-xs text-slate-400">
              หมายเหตุ: ระบบจะไม่อนุญาตให้ลบลูกค้าที่มีประวัติงานซ่อม บิลซื้อสินค้า หรือสัญญาผ่อนชำระค้างอยู่ เพื่อรักษาความถูกต้องของข้อมูลทางการเงิน
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              disabled={deleting}
              className="rounded-xl cursor-pointer"
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl gap-1.5 cursor-pointer"
            >
              {deleting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              <span>ยืนยันลบลูกค้า</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
