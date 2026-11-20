"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Truck,
  PlusCircle,
  Search,
  Phone,
  Mail,
  MessageSquare,
  Building2,
  Edit2,
  Trash2,
  FileText,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  CreditCard,
  Receipt,
  Package,
  LayoutGrid,
  List,
  ExternalLink,
  Copy,
  ChevronRight,
  Landmark,
  Coins,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Badge } from "@/components/ui/Badge";

interface SupplierItem {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  lineId: string;
  address: string;
  taxId: string;
  creditTerms: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  categories: string[];
  totalOrders: number;
  totalSpend: number;
  suppliedProducts: string[];
  createdAt: string;
  updatedAt: string;
}

interface SuppliedProductDetail {
  productName: string;
  category: string;
  totalQuantity: number;
  lastUnitCost: number;
  lastOrderedAt: string | null;
}

interface LinkedPurchaseOrder {
  id: string;
  poNumber: string;
  status: string;
  paymentStatus: string;
  branchName: string;
  totalAmount: number;
  itemCount: number;
  orderedAt: string | null;
  receivedAt: string | null;
  createdAt: string;
}

interface SupplierDetailResponse extends SupplierItem {
  suppliedProducts: any[];
  purchaseOrders: LinkedPurchaseOrder[];
}

const THAI_BANKS = [
  "ธนาคารกสิกรไทย (KBANK)",
  "ธนาคารไทยพาณิชย์ (SCB)",
  "ธนาคารกรุงเทพ (BBL)",
  "ธนาคารกรุงไทย (KTB)",
  "ธนาคารกรุงศรีอยุธยา (BAY)",
  "ธนาคารทหารไทยธนชาต (TTB)",
  "ธนาคารออมสิน (GSB)",
  "ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (ธ.ก.ส.)",
  "ธนาคารยูโอบี (UOB)",
  "อื่นๆ (Other)",
];

export default function SuppliersManagementPage() {
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [creditFilter, setCreditFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Add / Edit Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierItem | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [lineId, setLineId] = useState("");
  const [address, setAddress] = useState("");
  const [taxId, setTaxId] = useState("");
  const [credit, setCredit] = useState("เครดิต 30 วัน");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [categoryText, setCategoryText] = useState("หน้าจอ, แบตเตอรี่");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  // Detail Modal State (Linked POs & Supplied Products)
  const [selectedSupplierDetail, setSelectedSupplierDetail] = useState<SupplierDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<"pos" | "products" | "bank">("pos");

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (creditFilter && creditFilter !== "ALL") params.set("creditTerms", creditFilter);

      const res = await fetch(`/api/suppliers?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setSuppliers(data.suppliers || []);
      }
    } catch (err) {
      console.error("Failed to fetch suppliers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [search, creditFilter]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const totalCount = suppliers.length;
    const totalSpend = suppliers.reduce((sum, s) => sum + (s.totalSpend || 0), 0);
    const totalOrders = suppliers.reduce((sum, s) => sum + (s.totalOrders || 0), 0);
    const creditCount = suppliers.filter(
      (s) => s.creditTerms && !s.creditTerms.includes("เงินสด")
    ).length;
    return { totalCount, totalSpend, totalOrders, creditCount };
  }, [suppliers]);

  const openAddModal = () => {
    setEditingSupplier(null);
    setName("");
    setContact("");
    setPhone("");
    setEmail("");
    setLineId("");
    setAddress("");
    setTaxId("");
    setCredit("เครดิต 30 วัน");
    setBankName("");
    setBankAccountNumber("");
    setBankAccountName("");
    setCategoryText("หน้าจอ, แบตเตอรี่");
    setFormError("");
    setShowAddModal(true);
  };

  const openEditModal = (sup: SupplierItem) => {
    setEditingSupplier(sup);
    setName(sup.name);
    setContact(sup.contactPerson === "-" ? "" : sup.contactPerson);
    setPhone(sup.phone);
    setEmail(sup.email || "");
    setLineId(sup.lineId === "-" ? "" : sup.lineId);
    setAddress(sup.address || "");
    setTaxId(sup.taxId || "");
    setCredit(sup.creditTerms || "เครดิต 30 วัน");
    setBankName(sup.bankName || "");
    setBankAccountNumber(sup.bankAccountNumber || "");
    setBankAccountName(sup.bankAccountName || "");
    setCategoryText(sup.categories.join(", "));
    setFormError("");
    setShowAddModal(true);
  };

  const openDetailModal = async (supplierId: string) => {
    try {
      setDetailLoading(true);
      setSelectedSupplierDetail(null);
      setDetailTab("pos");
      const res = await fetch(`/api/suppliers/${supplierId}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedSupplierDetail(data.supplier);
      } else {
        alert(data.error || "ไม่สามารถดึงข้อมูลรายละเอียดซัพพลายเออร์ได้");
      }
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการโหลดข้อมูลซัพพลายเออร์");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setFormError("");

    if (!name.trim()) {
      setFormError("กรุณาระบุชื่อร้านหรือบริษัทซัพพลายเออร์");
      return;
    }
    if (!phone.trim()) {
      setFormError("กรุณาระบุเบอร์โทรศัพท์ติดต่อ");
      return;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError("รูปแบบอีเมลไม่ถูกต้อง");
      return;
    }

    if (taxId.trim()) {
      const cleanTax = taxId.replace(/[\s-]/g, "");
      if (!/^\d{13}$/.test(cleanTax)) {
        setFormError("เลขประจำตัวผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก");
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        id: editingSupplier?.id,
        name: name.trim(),
        contactPerson: contact.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        lineId: lineId.trim(),
        address: address.trim(),
        taxId: taxId.trim() || undefined,
        creditTerms: credit,
        bankName: bankName.trim(),
        bankAccountNumber: bankAccountNumber.trim(),
        bankAccountName: bankAccountName.trim(),
        categories: categoryText.split(",").map((c) => c.trim()).filter(Boolean),
      };

      const res = await fetch("/api/suppliers", {
        method: editingSupplier ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error || "บันทึกข้อมูลไม่สำเร็จ");
        return;
      }

      setShowAddModal(false);
      showToast(editingSupplier ? "แก้ไขข้อมูลซัพพลายเออร์เรียบร้อย" : "เพิ่มซัพพลายเออร์ใหม่สำเร็จ");
      fetchSuppliers();
    } catch (err) {
      console.error(err);
      setFormError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSupplier = async (sup: SupplierItem) => {
    if (!confirm(`คุณต้องการลบซัพพลายเออร์ "${sup.name}" หรือไม่?\n(ประวัติใบสั่งซื้อเดิมจะยังคงอยู่ในระบบ)`)) return;

    try {
      const res = await fetch(`/api/suppliers?id=${sup.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`ลบซัพพลายเออร์ "${sup.name}" สำเร็จ`);
        fetchSuppliers();
      } else {
        alert(data.error || "ลบไม่สำเร็จ");
      }
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการลบซัพพลายเออร์");
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showToast(`คัดลอก ${label} เรียบร้อย: ${text}`);
  };

  const getCreditBadge = (term: string) => {
    if (!term || term.includes("เงินสด")) {
      return <Badge variant="success">เงินสด</Badge>;
    }
    if (term.includes("60")) {
      return <Badge className="bg-purple-50 text-purple-700 border-purple-200">เครดิต 60 วัน</Badge>;
    }
    if (term.includes("30")) {
      return <Badge variant="default">เครดิต 30 วัน</Badge>;
    }
    if (term.includes("15")) {
      return <Badge className="bg-amber-50 text-amber-700 border-amber-200">เครดิต 15 วัน</Badge>;
    }
    return <Badge variant="secondary">{term}</Badge>;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 px-4 sm:px-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-700 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs font-medium animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Truck className="w-6 h-6 text-blue-600" />
            <span>ซัพพลายเออร์ & ผู้จำหน่ายอะไหล่ (Suppliers Management)</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            สมุดรายชื่อตัวแทนจำหน่ายอะไหล่ บัญชีธนาคาร ภาษี เครดิตเทอม ยอดจัดซื้อสะสม และประวัติใบสั่งซื้อ
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link href="/purchase">
            <Button variant="outline" size="sm" className="text-xs gap-1.5 font-semibold text-slate-700 hover:bg-slate-50">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>สร้างใบสั่งซื้อ PO</span>
            </Button>
          </Link>
          <Button
            onClick={openAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 text-xs shadow-sm font-semibold"
          >
            <PlusCircle className="w-4 h-4" />
            <span>เพิ่มซัพพลายเออร์ใหม่</span>
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">ซัพพลายเออร์ทั้งหมด</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{stats.totalCount}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">คู่ค้าที่ใช้งานอยู่ในระบบ</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">ยอดจัดซื้อสะสมรวม</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-0.5">
                ฿{stats.totalSpend.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">ไม่รวมใบสั่งซื้อที่ยกเลิก</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Coins className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">จำนวนใบสั่งซื้อรวม</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{stats.totalOrders}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">ใบสั่งซื้อ PO ทั้งหมด</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">มีเครดิตเทอม</p>
              <h3 className="text-2xl font-bold text-purple-600 mt-0.5">{stats.creditCount}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Net 15 / 30 / 60 วัน</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search, Filter & View Controls */}
      <Card className="border-slate-200 shadow-xs">
        <CardContent className="p-3.5 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-2.5 w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="ค้นหาชื่อซัพพลายเออร์, ผู้ติดต่อ, เบอร์โทร, อีเมล, เลขภาษี, ธนาคาร, หรืออะไหล่..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs h-9 bg-slate-50 border-slate-200 focus:bg-white"
              />
            </div>
            <select
              value={creditFilter}
              onChange={(e) => setCreditFilter(e.target.value)}
              className="text-xs rounded-lg border border-slate-200 px-3 py-2 bg-slate-50 hover:bg-white h-9 text-slate-700"
            >
              <option value="ALL">เครดิตเทอมทั้งหมด</option>
              <option value="เงินสด / โอนก่อนส่ง">เงินสด / โอนก่อนส่ง</option>
              <option value="เครดิต 15 วัน">เครดิต 15 วัน</option>
              <option value="เครดิต 30 วัน">เครดิต 30 วัน</option>
              <option value="เครดิต 60 วัน">เครดิต 60 วัน</option>
            </select>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            {/* View Mode Toggle */}
            <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-100">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-md text-xs flex items-center gap-1 font-medium transition-colors ${
                  viewMode === "grid" ? "bg-white text-blue-600 shadow-xs" : "text-slate-500 hover:text-slate-700"
                }`}
                title="มุมมองการ์ด"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">การ์ด</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-md text-xs flex items-center gap-1 font-medium transition-colors ${
                  viewMode === "table" ? "bg-white text-blue-600 shadow-xs" : "text-slate-500 hover:text-slate-700"
                }`}
                title="มุมมองตาราง"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ตาราง</span>
              </button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={fetchSuppliers}
              className="h-9 px-3 text-xs gap-1 text-slate-600 hover:bg-slate-100"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">รีเฟรช</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
          <span>กำลังโหลดข้อมูลซัพพลายเออร์...</span>
        </div>
      ) : suppliers.length === 0 ? (
        <Card className="border-slate-200 text-center py-16 shadow-xs">
          <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <div className="text-base font-semibold text-slate-700">ไม่พบข้อมูลซัพพลายเออร์</div>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {search || creditFilter !== "ALL"
              ? "ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา ลองเปลี่ยนคำค้นหาหรือตัวกรอง"
              : 'กดปุ่ม "เพิ่มซัพพลายเออร์ใหม่" เพื่อเริ่มบันทึกข้อมูลคู่ค้าในระบบ'}
          </p>
        </Card>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((sup) => (
            <Card
              key={sup.id}
              className="border-slate-200 hover:border-blue-300 transition-all shadow-xs hover:shadow-md flex flex-col justify-between overflow-hidden"
            >
              <div>
                {/* Card Header */}
                <CardHeader className="p-4 pb-3 border-b border-slate-100 bg-slate-50/50 flex flex-row items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {sup.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-sm font-bold text-slate-900 truncate" title={sup.name}>
                          {sup.name}
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500 truncate mt-0.5">
                          ผู้ติดต่อ: <span className="text-slate-700 font-medium">{sup.contactPerson}</span>
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {getCreditBadge(sup.creditTerms)}
                    <button
                      onClick={() => openEditModal(sup)}
                      className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                      title="แก้ไขข้อมูล"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteSupplier(sup)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      title="ลบซัพพลายเออร์"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </CardHeader>

                {/* Card Body */}
                <CardContent className="p-4 space-y-3 text-xs">
                  {/* Contact Info Links */}
                  <div className="space-y-1.5 text-slate-600">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono text-slate-800">{sup.phone}</span>
                      </div>
                      <a
                        href={`tel:${sup.phone}`}
                        className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5 font-medium"
                      >
                        โทรออก
                      </a>
                    </div>

                    {sup.email && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate text-slate-700" title={sup.email}>
                            {sup.email}
                          </span>
                        </div>
                        <a
                          href={`mailto:${sup.email}`}
                          className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5 font-medium shrink-0 ml-2"
                        >
                          ส่งอีเมล
                        </a>
                      </div>
                    )}

                    {sup.lineId && sup.lineId !== "-" && (
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="text-slate-700 font-mono">LINE: {sup.lineId}</span>
                      </div>
                    )}

                    {sup.taxId && (
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                        <div className="flex items-center gap-1.5">
                          <Receipt className="w-3.5 h-3.5 text-slate-400" />
                          <span>เลขภาษี: <span className="font-mono text-slate-700">{sup.taxId}</span></span>
                        </div>
                        <button
                          onClick={() => copyToClipboard(sup.taxId, "เลขภาษี")}
                          className="text-slate-400 hover:text-slate-700 p-0.5"
                          title="คัดลอกเลขประจำตัวผู้เสียภาษี"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Bank Details Snippet */}
                  {sup.bankAccountNumber && (
                    <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 text-[11px] space-y-1">
                      <div className="flex items-center justify-between font-medium text-slate-700">
                        <div className="flex items-center gap-1 text-slate-600">
                          <Landmark className="w-3.5 h-3.5 text-slate-500" />
                          <span>{sup.bankName || "บัญชีธนาคาร"}</span>
                        </div>
                        <button
                          onClick={() => copyToClipboard(sup.bankAccountNumber, "เลขบัญชี")}
                          className="text-blue-600 hover:underline flex items-center gap-0.5 text-[10px]"
                        >
                          <Copy className="w-2.5 h-2.5" /> คัดลอก
                        </button>
                      </div>
                      <div className="font-mono text-slate-900 font-semibold">{sup.bankAccountNumber}</div>
                      {sup.bankAccountName && (
                        <div className="text-slate-500 text-[10.5px] truncate">ชื่อ: {sup.bankAccountName}</div>
                      )}
                    </div>
                  )}

                  {/* Categories */}
                  {sup.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {sup.categories.slice(0, 3).map((cat, idx) => (
                        <span
                          key={idx}
                          className="bg-slate-100 text-slate-600 text-[10.5px] px-2 py-0.5 rounded border border-slate-200 truncate max-w-[150px]"
                        >
                          • {cat}
                        </span>
                      ))}
                      {sup.categories.length > 3 && (
                        <span className="text-[10.5px] text-slate-400 px-1 py-0.5">
                          +{sup.categories.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>
              </div>

              {/* Purchase Linkage & Action Bar */}
              <div className="border-t border-slate-100 bg-slate-50/40 p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    ยอดซื้อสะสม:{" "}
                    <span className="font-bold text-slate-900 font-mono">
                      ฿{sup.totalSpend.toLocaleString("th-TH", { minimumFractionDigits: 0 })}
                    </span>
                  </span>
                  <button
                    onClick={() => openDetailModal(sup.id)}
                    className="text-blue-600 hover:underline text-[11px] font-semibold flex items-center gap-0.5"
                  >
                    <span>{sup.totalOrders} ใบสั่งซื้อ</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openDetailModal(sup.id)}
                    className="flex-1 text-xs h-8 text-slate-700 font-medium"
                  >
                    ดูประวัติ & สินค้า
                  </Button>
                  <Link
                    href={`/purchase?supplierId=${sup.id}&supplierName=${encodeURIComponent(sup.name)}`}
                    className="flex-1"
                  >
                    <Button size="sm" className="w-full text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      <span>สร้าง PO</span>
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* TABLE VIEW */
        <Card className="border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                <tr>
                  <th className="py-3 px-4">ซัพพลายเออร์ / ผู้ติดต่อ</th>
                  <th className="py-3 px-4">ช่องทางติดต่อ</th>
                  <th className="py-3 px-4">เลขภาษี & เครดิต</th>
                  <th className="py-3 px-4">ข้อมูลบัญชีธนาคาร</th>
                  <th className="py-3 px-4 text-right">ยอดซื้อสะสม / PO</th>
                  <th className="py-3 px-4 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suppliers.map((sup) => (
                  <tr key={sup.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Name & Contact */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 text-sm">{sup.name}</div>
                      <div className="text-slate-500 text-[11px]">ผู้ติดต่อ: {sup.contactPerson}</div>
                      {sup.categories.length > 0 && (
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-xs">
                          {sup.categories.join(", ")}
                        </div>
                      )}
                    </td>

                    {/* Phone & Email */}
                    <td className="py-3 px-4 space-y-0.5">
                      <div className="flex items-center gap-1.5 font-mono text-slate-900">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <a href={`tel:${sup.phone}`} className="hover:text-blue-600 hover:underline">
                          {sup.phone}
                        </a>
                      </div>
                      {sup.email && (
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <a href={`mailto:${sup.email}`} className="hover:text-blue-600 hover:underline">
                            {sup.email}
                          </a>
                        </div>
                      )}
                      {sup.lineId && sup.lineId !== "-" && (
                        <div className="flex items-center gap-1.5 text-emerald-600 text-[11px]">
                          <MessageSquare className="w-3 h-3" />
                          <span>LINE: {sup.lineId}</span>
                        </div>
                      )}
                    </td>

                    {/* Tax ID & Credit */}
                    <td className="py-3 px-4 space-y-1">
                      <div>{getCreditBadge(sup.creditTerms)}</div>
                      {sup.taxId ? (
                        <div className="flex items-center gap-1 text-[11px] font-mono text-slate-600">
                          <span>{sup.taxId}</span>
                          <button
                            onClick={() => copyToClipboard(sup.taxId, "เลขภาษี")}
                            className="text-slate-400 hover:text-slate-700"
                            title="คัดลอกเลขภาษี"
                          >
                            <Copy className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">-</span>
                      )}
                    </td>

                    {/* Bank Info */}
                    <td className="py-3 px-4">
                      {sup.bankAccountNumber ? (
                        <div className="text-[11px] space-y-0.5">
                          <div className="font-semibold text-slate-800">{sup.bankName}</div>
                          <div className="font-mono text-blue-700 font-medium flex items-center gap-1">
                            <span>{sup.bankAccountNumber}</span>
                            <button
                              onClick={() => copyToClipboard(sup.bankAccountNumber, "เลขบัญชี")}
                              className="text-slate-400 hover:text-blue-600"
                              title="คัดลอกเลขบัญชี"
                            >
                              <Copy className="w-2.5 h-2.5" />
                            </button>
                          </div>
                          {sup.bankAccountName && (
                            <div className="text-slate-500 text-[10.5px] truncate max-w-[160px]">
                              {sup.bankAccountName}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">-</span>
                      )}
                    </td>

                    {/* Spend & PO Count */}
                    <td className="py-3 px-4 text-right">
                      <div className="font-bold text-slate-900 font-mono text-sm">
                        ฿{sup.totalSpend.toLocaleString("th-TH", { minimumFractionDigits: 0 })}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {sup.totalOrders} ใบสั่งซื้อ
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openDetailModal(sup.id)}
                          className="h-7 text-xs px-2 text-slate-700 hover:text-blue-600"
                          title="ดูประวัติและสินค้า"
                        >
                          ดูประวัติ
                        </Button>
                        <Link
                          href={`/purchase?supplierId=${sup.id}&supplierName=${encodeURIComponent(sup.name)}`}
                        >
                          <Button size="sm" className="h-7 text-xs px-2.5 bg-blue-600 hover:bg-blue-700 text-white gap-1 font-semibold">
                            <FileText className="w-3 h-3" />
                            <span>ออก PO</span>
                          </Button>
                        </Link>
                        <button
                          onClick={() => openEditModal(sup)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded transition-colors"
                          title="แก้ไขข้อมูล"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSupplier(sup)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                          title="ลบซัพพลายเออร์"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Supplier Detail Dialog (Purchase Linkage & Supplied Products) */}
      {selectedSupplierDetail && (
        <Dialog
          open={!!selectedSupplierDetail}
          onOpenChange={(open) => !open && setSelectedSupplierDetail(null)}
          maxWidth="max-w-3xl"
        >
          <DialogHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <span>ข้อมูลซัพพลายเออร์: {selectedSupplierDetail.name}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="p-5 space-y-5">
            {/* Summary Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
              <div>
                <p className="text-[11px] text-slate-500 font-medium">ยอดสั่งซื้อสะสม</p>
                <p className="text-lg font-bold text-emerald-600 font-mono mt-0.5">
                  ฿{selectedSupplierDetail.totalSpend.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 font-medium">จำนวนใบสั่งซื้อ</p>
                <p className="text-lg font-bold text-slate-900 font-mono mt-0.5">
                  {selectedSupplierDetail.totalOrders} ใบ
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 font-medium">เครดิตเทอม</p>
                <div className="mt-1">{getCreditBadge(selectedSupplierDetail.creditTerms)}</div>
              </div>
            </div>

            {/* Profile Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white border border-slate-100 rounded-xl p-3 shadow-2xs">
              <div className="space-y-1 text-slate-600">
                <div><span className="font-semibold text-slate-800">ผู้ติดต่อ:</span> {selectedSupplierDetail.contactPerson}</div>
                <div><span className="font-semibold text-slate-800">โทร:</span> <a href={`tel:${selectedSupplierDetail.phone}`} className="text-blue-600 font-mono">{selectedSupplierDetail.phone}</a></div>
                {selectedSupplierDetail.email && (
                  <div><span className="font-semibold text-slate-800">อีเมล:</span> <a href={`mailto:${selectedSupplierDetail.email}`} className="text-blue-600">{selectedSupplierDetail.email}</a></div>
                )}
                {selectedSupplierDetail.lineId && selectedSupplierDetail.lineId !== "-" && (
                  <div><span className="font-semibold text-slate-800">LINE ID:</span> {selectedSupplierDetail.lineId}</div>
                )}
              </div>
              <div className="space-y-1 text-slate-600">
                <div><span className="font-semibold text-slate-800">เลขภาษี 13 หลัก:</span> <span className="font-mono text-slate-900">{selectedSupplierDetail.taxId || "-"}</span></div>
                <div><span className="font-semibold text-slate-800">บัญชีธนาคาร:</span> {selectedSupplierDetail.bankName ? `${selectedSupplierDetail.bankName} (${selectedSupplierDetail.bankAccountNumber})` : "-"}</div>
                {selectedSupplierDetail.address && (
                  <div className="truncate"><span className="font-semibold text-slate-800">ที่อยู่:</span> {selectedSupplierDetail.address}</div>
                )}
              </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                type="button"
                onClick={() => setDetailTab("pos")}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                  detailTab === "pos"
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>ประวัติใบสั่งซื้อ ({selectedSupplierDetail.purchaseOrders.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setDetailTab("products")}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                  detailTab === "products"
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>สินค้าที่เคยจัดส่ง ({selectedSupplierDetail.suppliedProducts.length})</span>
              </button>
            </div>

            {/* Tab: Purchase Orders */}
            {detailTab === "pos" && (
              <div className="space-y-2">
                {selectedSupplierDetail.purchaseOrders.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    ยังไม่มีประวัติการสั่งซื้อกับซัพพลายเออร์นี้
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">เลขที่ PO</th>
                          <th className="py-2.5 px-3">วันที่สั่งซื้อ</th>
                          <th className="py-2.5 px-3">สาขา</th>
                          <th className="py-2.5 px-3 text-center">สถานะ</th>
                          <th className="py-2.5 px-3 text-right">ยอดรวม</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedSupplierDetail.purchaseOrders.map((po) => (
                          <tr key={po.id} className="hover:bg-slate-50/80">
                            <td className="py-2.5 px-3 font-mono font-semibold text-blue-600">
                              {po.poNumber}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                              {new Date(po.createdAt).toLocaleDateString("th-TH")}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700">{po.branchName}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                  po.status === "RECEIVED"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : po.status === "ORDERED"
                                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                                    : po.status === "CANCELLED"
                                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                                    : "bg-slate-100 text-slate-700 border border-slate-200"
                                }`}
                              >
                                {po.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                              ฿{po.totalAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Supplied Products */}
            {detailTab === "products" && (
              <div className="space-y-2">
                {selectedSupplierDetail.suppliedProducts.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    ยังไม่มีข้อมูลสินค้าที่จัดส่ง
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">ชื่อสินค้า / อะไหล่</th>
                          <th className="py-2.5 px-3">หมวดหมู่</th>
                          <th className="py-2.5 px-3 text-center">จำนวนสั่งรวม</th>
                          <th className="py-2.5 px-3 text-right">ราคาทุนล่าสุด</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedSupplierDetail.suppliedProducts.map((prod: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/80">
                            <td className="py-2.5 px-3 font-medium text-slate-900">
                              {prod.productName || prod}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                              {prod.category || "SPARE_PART"}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-700">
                              {prod.totalQuantity || "-"}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-900 font-semibold">
                              {prod.lastUnitCost ? `฿${prod.lastUnitCost.toLocaleString("th-TH")}` : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Footer with fast PO trigger */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedSupplierDetail(null)}
                className="text-xs"
              >
                ปิดหน้าต่าง
              </Button>
              <Link
                href={`/purchase?supplierId=${selectedSupplierDetail.id}&supplierName=${encodeURIComponent(
                  selectedSupplierDetail.name
                )}`}
              >
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>สร้างใบสั่งซื้อใหม่กับคู่ค้านี้</span>
                </Button>
              </Link>
            </div>
          </div>
        </Dialog>
      )}

      {/* Add / Edit Modal */}
      {showAddModal && (
        <Dialog open={showAddModal} onOpenChange={() => setShowAddModal(false)} maxWidth="max-w-xl">
          <DialogHeader className="p-4 border-b border-slate-100">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-600" />
              <span>{editingSupplier ? "แก้ไขข้อมูลซัพพลายเออร์" : "เพิ่มซัพพลายเออร์ใหม่"}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveSupplier} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Company Profile Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-blue-700">
                <Building2 className="w-3.5 h-3.5" />
                <span>1. ข้อมูลบริษัท & ผู้ติดต่อ</span>
              </h4>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อร้าน / บริษัทซัพพลายเออร์ <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  placeholder="เช่น บจก. เสือป่า เทรดดิ้ง หรือ ซีคอน พาร์ท เซ็นเตอร์"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อผู้ติดต่อ</label>
                  <Input
                    placeholder="เช่น คุณกิตติศักดิ์, เฮียชัย"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    เบอร์โทรศัพท์ <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="08X-XXX-XXXX หรือ 02-XXX-XXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">อีเมลติดต่อ</label>
                  <Input
                    type="email"
                    placeholder="contact@supplier.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">LINE ID</label>
                  <Input
                    placeholder="@supplier_official"
                    value={lineId}
                    onChange={(e) => setLineId(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Financial, Tax & Credit Terms */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-blue-700">
                <Receipt className="w-3.5 h-3.5" />
                <span>2. ข้อมูลภาษี & เครดิตเทอม</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    เลขประจำตัวผู้เสียภาษี (13 หลัก)
                  </label>
                  <Input
                    placeholder="01055XXXXXXXX"
                    maxLength={13}
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value.replace(/\D/g, ""))}
                    className="text-xs font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">ระบุตัวเลข 13 หลักสำหรับออกใบกำกับภาษี</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">เครดิตเทอม</label>
                  <select
                    value={credit}
                    onChange={(e) => setCredit(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white font-medium text-slate-800"
                  >
                    <option value="เงินสด / โอนก่อนส่ง">เงินสด / โอนก่อนส่ง (Cash)</option>
                    <option value="เครดิต 15 วัน">เครดิต 15 วัน (Net 15)</option>
                    <option value="เครดิต 30 วัน">เครดิต 30 วัน (Net 30)</option>
                    <option value="เครดิต 60 วัน">เครดิต 60 วัน (Net 60)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Bank Details Section */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-blue-700">
                <Landmark className="w-3.5 h-3.5" />
                <span>3. ข้อมูลบัญชีธนาคาร (สำหรับชำระเงินค่าอะไหล่)</span>
              </h4>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อธนาคาร</label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white font-medium text-slate-800"
                >
                  <option value="">-- เลือกธนาคาร --</option>
                  {THAI_BANKS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">เลขที่บัญชี</label>
                  <Input
                    placeholder="เช่น 123-4-56789-0"
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อบัญชี</label>
                  <Input
                    placeholder="เช่น บจก. เสือป่า เทรดดิ้ง"
                    value={bankAccountName}
                    onChange={(e) => setBankAccountName(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Categories and Address Section */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-blue-700">
                <Package className="w-3.5 h-3.5" />
                <span>4. สินค้าที่จำหน่าย & ที่อยู่สำนักงาน</span>
              </h4>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หมวดหมู่อะไหล่ / สินค้าที่ส่ง (คั่นด้วยเครื่องหมายจุลภาค ,)
                </label>
                <Input
                  placeholder="เช่น หน้าจอแท้, แบตเตอรี่ มอก., บอดี้, ฟิล์มกระจก"
                  value={categoryText}
                  onChange={(e) => setCategoryText(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ที่อยู่ติดต่อ / ที่ตั้งร้าน</label>
                <Input
                  placeholder="เช่น ชั้น 3 อาคารซีคอนสแควร์ ถนนศรีนครินทร์ กรุงเทพมหานคร 10250"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            {/* Form Action Buttons */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddModal(false)}
                className="text-xs"
                disabled={submitting}
              >
                ยกเลิก
              </Button>
              <Button type="submit" disabled={submitting} className="text-xs bg-blue-600 text-white font-semibold">
                {submitting ? "กำลังบันทึก..." : editingSupplier ? "บันทึกการแก้ไข" : "บันทึกซัพพลายเออร์"}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
