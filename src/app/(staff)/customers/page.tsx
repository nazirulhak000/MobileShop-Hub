"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import {
  Users,
  Search,
  PlusCircle,
  Phone,
  MessageSquare,
  Wrench,
  ShoppingCart,
  HandCoins,
  CreditCard,
  Building2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  Edit2,
  RefreshCw,
  Sparkles,
  Crown,
  ShieldCheck,
  FileText,
  BadgeAlert,
  ArrowUpRight,
  Clock,
  X,
  Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { formatDateThai, formatTHB } from "@/lib/utils";

interface CustomerItem {
  id: string;
  name: string;
  phone: string;
  lineId?: string | null;
  nationalId?: string | null;
  address?: string | null;
  createdAt: string;
  totalSpend?: number;
  activeDebts?: number;
  hasOverdueDebt?: boolean;
  tier?: "VIP" | "REGULAR" | "NEW";
  _count?: {
    repairJobs: number;
    sales: number;
    tradeInContracts: number;
    installmentContracts?: number;
  };
}

interface CustomerDetailData extends CustomerItem {
  repairJobs: Array<{
    id: string;
    trackingCode: string;
    deviceBrand: string;
    deviceModel: string;
    deviceColor?: string | null;
    status: string;
    totalCost: number;
    estimatedCost: number;
    createdAt: string;
    completedAt?: string | null;
    issueDescription: string;
  }>;
  sales: Array<{
    id: string;
    invoiceNo: string;
    netAmount: number;
    status: string;
    paymentMethod: string;
    createdAt: string;
    items: Array<{
      quantity: number;
      unitPrice: number;
      subtotal: number;
      product: { name: string; code: string };
    }>;
  }>;
  installmentContracts: Array<{
    id: string;
    contractNo: string;
    deviceModel: string;
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
    agreedPrice: number;
    status: string;
    createdAt: string;
  }>;
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

  // Detail Drawer State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<CustomerDetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailTab, setDetailTab] = useState<"repairs" | "sales" | "installments" | "tradeIns">("repairs");

  // Modal State for New/Edit Customer
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    lineId: "",
    nationalId: "",
    address: "",
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchCustomers = async (q: string = "") => {
    setLoading(true);
    try {
      const url = q.trim() ? `/api/customers?search=${encodeURIComponent(q.trim())}` : "/api/customers";
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && json.customers) {
        setCustomers(json.customers);
      }
    } catch (err) {
      console.error("Fetch customers error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerDetail = async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/customers?id=${id}`);
      const json = await res.json();
      if (json.success && json.customer) {
        setDetailData(json.customer);
      }
    } catch (err) {
      console.error("Fetch customer detail error:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchCustomers(search);
  }, [search]);

  useEffect(() => {
    if (selectedCustomerId) {
      fetchCustomerDetail(selectedCustomerId);
    } else {
      setDetailData(null);
    }
  }, [selectedCustomerId]);

  const handleOpenCreate = () => {
    setModalMode("create");
    setFormData({ name: "", phone: "", lineId: "", nationalId: "", address: "" });
    setErrorMsg(null);
    setShowModal(true);
  };

  const handleOpenEdit = (c: CustomerItem) => {
    setModalMode("edit");
    setFormData({
      name: c.name,
      phone: c.phone,
      lineId: c.lineId || "",
      nationalId: c.nationalId || "",
      address: c.address || "",
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

    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.success) {
        confetti({ particleCount: 30, spread: 60, origin: { y: 0.8 } });
        setShowModal(false);
        fetchCustomers(search);
        if (selectedCustomerId && json.customer?.id === selectedCustomerId) {
          fetchCustomerDetail(selectedCustomerId);
        }
      } else {
        setErrorMsg(json.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setSaving(false);
    }
  };

  // Filter customers by tier / filter tab
  const filteredCustomers = customers.filter((c) => {
    if (tierFilter === "ALL") return true;
    if (tierFilter === "VIP") return c.tier === "VIP";
    if (tierFilter === "REGULAR") return c.tier === "REGULAR";
    if (tierFilter === "NEW") return c.tier === "NEW";
    if (tierFilter === "DEBT") return (c.activeDebts ?? 0) > 0;
    if (tierFilter === "REPAIR") return (c._count?.repairJobs ?? 0) > 0;
    return true;
  });

  // Calculate CRM overview stats
  const totalSpendAll = customers.reduce((sum, c) => sum + (c.totalSpend ?? 0), 0);
  const totalRepairsAll = customers.reduce((sum, c) => sum + (c._count?.repairJobs ?? 0), 0);
  const totalDebtsAll = customers.reduce((sum, c) => sum + (c.activeDebts ?? 0), 0);

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
            ดูประวัติงานซ่อม บิลซื้อสินค้า POS สัญญาผ่อนชำระ และระดับสมาชิกลูกค้า (Loyalty Tier) แบบครบวงจร
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => fetchCustomers(search)}
            variant="outline"
            size="sm"
            className="h-10 px-4 gap-1.5 rounded-xl border-slate-200 font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            <span>รีเฟรช</span>
          </Button>
          <Button onClick={handleOpenCreate} className="h-10 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-xs gap-2">
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
                {customers.length.toLocaleString()} <span className="text-xs font-normal text-slate-500">ราย</span>
              </p>
              <p className="text-[11px] text-teal-700 mt-0.5">
                {customers.filter((c) => c.tier === "VIP").length} ราย ระดับ VIP
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

      {/* 3. Search Bar & Tier Filter Pills */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อลูกค้า, เบอร์โทร (เช่น 081...), เลข ปชช., LINE ID..."
            className="pl-10 h-10 text-sm bg-slate-50 border-slate-200 focus:bg-white rounded-xl"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "ALL", label: "ทั้งหมด" },
            { id: "VIP", label: "👑 VIP" },
            { id: "REGULAR", label: "ทั่วไป" },
            { id: "NEW", label: "✨ ลูกค้าใหม่" },
            { id: "DEBT", label: "มียอดค้างชำระ" },
            { id: "REPAIR", label: "มีประวัติซ่อม" },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setTierFilter(pill.id)}
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
      </div>

      {/* 4. Customer List Table/Cards */}
      <Card className="border-slate-200/90 shadow-2xs overflow-hidden rounded-2xl bg-white">
        <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/60">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
            <span>รายชื่อลูกค้า ({filteredCustomers.length} ราย)</span>
            <span className="text-xs font-normal text-slate-500">คลิกแถวเพื่อเปิดลิ้นชักประวัติและจัดการ</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-sm text-slate-500 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-teal-600" />
              <span>กำลังโหลดข้อมูลลูกค้า...</span>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">ไม่พบข้อมูลลูกค้าตามเงื่อนไข</p>
              <p className="text-xs text-slate-400 mt-1">ลองเปลี่ยนคำค้นหา หรือกดปุ่ม &quot;เพิ่มลูกค้าใหม่&quot;</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredCustomers.map((c) => {
                const isVip = c.tier === "VIP";
                const isRegular = c.tier === "REGULAR";

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCustomerId(c.id)}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`h-11 w-11 rounded-2xl flex items-center justify-center font-extrabold text-sm shrink-0 border ${
                          isVip
                            ? "bg-amber-100 text-amber-800 border-amber-300 shadow-2xs"
                            : isRegular
                            ? "bg-teal-50 text-teal-800 border-teal-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {isVip ? "👑" : c.name.slice(0, 1)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm group-hover:text-teal-700 transition-colors">
                            {c.name}
                          </span>
                          {/* Loyalty Tier Badge */}
                          {isVip && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <Crown className="h-3 w-3 text-amber-600" />
                              <span>VIP</span>
                            </span>
                          )}
                          {isRegular && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                              <span>ทั่วไป</span>
                            </span>
                          )}
                          {c.tier === "NEW" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              <span>ใหม่</span>
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
                          <span className="flex items-center gap-1 font-mono font-semibold text-slate-700">
                            <Phone className="h-3 w-3 text-teal-600" />
                            {c.phone}
                          </span>
                          {c.address && (
                            <span className="text-slate-400 truncate max-w-xs">{c.address}</span>
                          )}
                          <span className="text-slate-400">
                            สมัครเมื่อ: {formatDateThai(c.createdAt)}
                          </span>
                        </div>

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
                      className="flex items-center gap-2 self-end sm:self-center shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link href={`/repair-intake?customerId=${c.id}&phone=${encodeURIComponent(c.phone)}&name=${encodeURIComponent(c.name)}`}>
                        <Button variant="outline" size="sm" className="h-8 text-xs font-bold gap-1 text-blue-700 border-blue-200 hover:bg-blue-50 rounded-xl">
                          <Wrench className="h-3 w-3" />
                          <span>เปิดใบซ่อม</span>
                        </Button>
                      </Link>
                      <Link href={`/pos?customerId=${c.id}&phone=${encodeURIComponent(c.phone)}&name=${encodeURIComponent(c.name)}`}>
                        <Button variant="outline" size="sm" className="h-8 text-xs font-bold gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50 rounded-xl">
                          <ShoppingCart className="h-3 w-3" />
                          <span>ขาย POS</span>
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(c)}
                        className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 rounded-xl"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedCustomerId(c.id)}
                        className="h-8 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl gap-1"
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
        </CardContent>
      </Card>

      {/* 5. Customer Detail Drawer (Slide-Over Modal) */}
      <Dialog open={!!selectedCustomerId} onOpenChange={(open) => !open && setSelectedCustomerId(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl border border-slate-200 shadow-xl bg-slate-50">
          {loadingDetail || !detailData ? (
            <div className="p-16 text-center text-sm text-slate-500 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="h-6 w-6 animate-spin text-teal-600" />
              <span>กำลังดึงข้อมูลประวัติลูกค้า...</span>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {/* Drawer Top Header Banner */}
              <div className="p-6 bg-white rounded-t-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={`h-14 w-14 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 border ${
                        detailData.tier === "VIP"
                          ? "bg-amber-100 text-amber-800 border-amber-300 shadow-xs"
                          : "bg-teal-50 text-teal-800 border-teal-200"
                      }`}
                    >
                      {detailData.tier === "VIP" ? "👑" : detailData.name.slice(0, 1)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">
                          {detailData.name}
                        </h2>
                        {detailData.tier === "VIP" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <Crown className="h-3.5 w-3.5 text-amber-600" />
                            <span>สมาชิกระดับ VIP</span>
                          </span>
                        )}
                        {detailData.tier === "REGULAR" && (
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
                          <span>{detailData.phone}</span>
                        </a>
                        {detailData.lineId && (
                          <span className="flex items-center gap-1 text-emerald-700">
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>LINE: @{detailData.lineId}</span>
                          </span>
                        )}
                        {detailData.nationalId && (
                          <span className="font-mono text-slate-500">
                            ปชช: {detailData.nationalId}
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
                    <p className="text-[11px] font-medium text-slate-500">ยอดใช้จ่ายสะสม</p>
                    <p className="text-base font-extrabold text-slate-900 font-mono mt-0.5">
                      {formatTHB(detailData.totalSpend ?? 0)}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100">
                    <p className="text-[11px] font-medium text-blue-700">ส่งซ่อมทั้งหมด</p>
                    <p className="text-base font-extrabold text-blue-900 font-mono mt-0.5">
                      {detailData.repairJobs.length} เครื่อง
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                    <p className="text-[11px] font-medium text-emerald-700">ซื้อสินค้า POS</p>
                    <p className="text-base font-extrabold text-emerald-900 font-mono mt-0.5">
                      {detailData.sales.length} บิล
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100">
                    <p className="text-[11px] font-medium text-amber-700">หนี้ผ่อนค้างชำระ</p>
                    <p className="text-base font-extrabold text-amber-900 font-mono mt-0.5">
                      {formatTHB(detailData.activeDebts ?? 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Segmented Tab Selector */}
              <div className="px-6 py-3 bg-white flex items-center gap-2 overflow-x-auto border-b border-slate-200">
                {[
                  { id: "repairs", label: `งานซ่อม (${detailData.repairJobs.length})`, icon: Wrench },
                  { id: "sales", label: `บิลซื้อสินค้า (${detailData.sales.length})`, icon: ShoppingCart },
                  { id: "installments", label: `สัญญาผ่อน (${detailData.installmentContracts.length})`, icon: CreditCard },
                  { id: "tradeIns", label: `เทิร์น/จำนำ (${detailData.tradeInContracts.length})`, icon: HandCoins },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = detailTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setDetailTab(tab.id as any)}
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
                              </div>
                              <p className="text-xs text-slate-600">อาการ: {job.issueDescription}</p>
                              <p className="text-[11px] text-slate-400">
                                วันที่รับ: {formatDateThai(job.createdAt)} {job.completedAt && `• เสร็จเมื่อ: ${formatDateThai(job.completedAt)}`}
                              </p>
                            </div>

                            <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                              <span className="font-mono font-bold text-sm text-slate-900">
                                {formatTHB(job.totalCost || job.estimatedCost)}
                              </span>
                              <Link href={`/repairs/${job.id}`}>
                                <Button variant="outline" size="sm" className="h-8 text-xs font-semibold rounded-lg gap-1">
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
                            <div className="flex items-center gap-2">
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
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                              ins.status === "COMPLETED"
                                ? "bg-emerald-50 text-emerald-700"
                                : ins.isOverdue
                                ? "bg-rose-50 text-rose-700"
                                : "bg-blue-50 text-blue-700"
                            }`}>
                              {ins.status === "COMPLETED" ? "ผ่อนครบแล้ว" : ins.isOverdue ? `ค้างชำระ (${ins.overdueDays} วัน)` : "กำลังผ่อนชำระ"}
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div>
                            <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                              <span>งวดที่ชำระ: {ins.paidMonths} / {ins.termMonths} งวด</span>
                              <span>ค่างวด: {formatTHB(ins.monthlyPayment)}/ด.</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-teal-600 h-2 rounded-full transition-all"
                                style={{ width: `${Math.round((ins.paidMonths / ins.termMonths) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* 4. TRADE-IN TAB */}
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
                                {tc.type === "PAWN" ? "จำนำ" : "รับซื้อ/เทิร์น"}
                              </span>
                              <span className="text-sm font-bold text-slate-900">
                                {tc.deviceBrand} {tc.deviceModel}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1">
                              วันที่ทำสัญญา: {formatDateThai(tc.createdAt)} • สถานะ: {tc.status}
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
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 6. Modal Add / Edit Customer */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md rounded-2xl">
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

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                LINE ID (สำหรับรับการแจ้งเตือนงานซ่อม)
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
                เลขประจำตัวประชาชน (สำหรับสัญญาผ่อน/จำนำ)
              </label>
              <Input
                value={formData.nationalId}
                onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                placeholder="13 หลัก เช่น 1100200300400"
                maxLength={13}
                className="rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">ที่อยู่</label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="บ้านเลขที่ ตำบล อำเภอ จังหวัด"
                className="rounded-xl"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="rounded-xl"
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl gap-1.5"
                disabled={saving}
              >
                {saving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                <span>{modalMode === "create" ? "บันทึกลูกค้าใหม่" : "บันทึกการแก้ไข"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
