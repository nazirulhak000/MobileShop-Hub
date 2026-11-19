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
  _count?: {
    repairJobs: number;
    sales: number;
    tradeInContracts: number;
  };
}

export default function CustomersCRMPage() {
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);

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

  useEffect(() => {
    fetchCustomers(search);
  }, [search]);

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
    setSelectedCustomer(c);
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
      } else {
        setErrorMsg(json.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Users className="h-6 w-6 text-teal-600" />
            <span>ทะเบียนลูกค้า & ประวัติความสัมพันธ์ (CRM)</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            ศูนย์รวมฐานข้อมูลลูกค้า ประวัติการส่งซ่อม บิลซื้อสินค้า และยอดค้ำประกัน
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => fetchCustomers(search)}
            variant="outline"
            size="sm"
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            <span>รีเฟรช</span>
          </Button>
          <Button onClick={handleOpenCreate} className="bg-teal-600 hover:bg-teal-700 shadow-sm gap-2">
            <PlusCircle className="h-4 w-4" />
            <span>เพิ่มลูกค้าใหม่</span>
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">จำนวนลูกค้าในระบบ</p>
              <p className="text-2xl font-bold tracking-tight text-slate-900 mt-1 tabular-nums">
                {customers.length} <span className="text-sm font-normal text-slate-500">ราย</span>
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">ผูก LINE OA แล้ว</p>
              <p className="text-2xl font-bold tracking-tight text-emerald-600 mt-1 tabular-nums">
                {customers.filter((c) => c.lineId).length} <span className="text-sm font-normal text-slate-500">ราย</span>
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <MessageSquare className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">มีเลขประจำตัว ปชช.</p>
              <p className="text-2xl font-bold tracking-tight text-sky-600 mt-1 tabular-nums">
                {customers.filter((c) => c.nationalId).length} <span className="text-sm font-normal text-slate-500">ราย</span>
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <CreditCard className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <Card className="border-slate-200/80 shadow-2xs">
        <CardContent className="p-3 sm:p-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาลูกค้าด้วย ชื่อ, เบอร์โทรศัพท์ (เช่น 081...), เลขบัตร ปชช., หรือ LINE ID..."
              className="pl-10 h-10 text-sm bg-slate-50 focus:bg-white"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customer List */}
      <Card className="border-slate-200/80 shadow-2xs overflow-hidden">
        <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-sm font-semibold text-slate-900 flex items-center justify-between">
            <span>รายชื่อลูกค้าทั้งหมด ({customers.length})</span>
            <span className="text-xs font-normal text-slate-500">คลิกที่ลูกค้าเพื่อดูรายละเอียด</span>
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
              <p className="text-sm font-medium text-slate-700">ไม่พบข้อมูลลูกค้า</p>
              <p className="text-xs text-slate-400 mt-1">ลองเปลี่ยนคำค้นหา หรือกดปุ่ม &quot;เพิ่มลูกค้าใหม่&quot;</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {customers.map((c) => (
                <div
                  key={c.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="h-10 w-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm shrink-0 border border-slate-200/70">
                      {c.name.slice(0, 1)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900 text-sm">{c.name}</span>
                        {c.lineId && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            LINE: @{c.lineId}
                          </span>
                        )}
                        {c.nationalId && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200/60 font-mono">
                            ID: {c.nationalId}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 font-mono text-slate-700">
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

                      {c._count && (
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/50">
                            <Wrench className="h-3 w-3" />
                            <span>ซ่อม {c._count.repairJobs} ครั้ง</span>
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                            <ShoppingCart className="h-3 w-3" />
                            <span>ซื้อ {c._count.sales} บิล</span>
                          </span>
                          {c._count.tradeInContracts > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/50">
                              <HandCoins className="h-3 w-3" />
                              <span>สัญญา {c._count.tradeInContracts} รายการ</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Link href={`/repair-intake?phone=${encodeURIComponent(c.phone)}`}>
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 text-blue-700 border-blue-200 hover:bg-blue-50">
                        <Wrench className="h-3 w-3" />
                        <span>เปิดใบซ่อม</span>
                      </Button>
                    </Link>
                    <Link href={`/pos?phone=${encodeURIComponent(c.phone)}`}>
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                        <ShoppingCart className="h-3 w-3" />
                        <span>ขาย POS</span>
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(c)}
                      className="h-8 text-xs text-slate-600 hover:text-slate-900"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Add / Edit Customer */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Users className="h-5 w-5 text-teal-600" />
              <span>{modalMode === "create" ? "เพิ่มข้อมูลลูกค้าใหม่" : "แก้ไขข้อมูลลูกค้า"}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs flex items-center gap-2 border border-red-200">
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
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">ที่อยู่</label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="บ้านเลขที่ ตำบล อำเภอ จังหวัด"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                disabled={saving}
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                className="bg-teal-600 hover:bg-teal-700 gap-1.5"
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
