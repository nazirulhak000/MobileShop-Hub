"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Truck,
  PlusCircle,
  Search,
  Phone,
  MessageSquare,
  Building2,
  Edit2,
  Trash2,
  FileText,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";

interface SupplierItem {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  lineId: string;
  address: string;
  taxId?: string;
  creditTerms: string;
  categories: string[];
  totalOrders: number;
}

export default function SuppliersManagementPage() {
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierItem | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [lineId, setLineId] = useState("");
  const [address, setAddress] = useState("");
  const [taxId, setTaxId] = useState("");
  const [credit, setCredit] = useState("เครดิต 30 วัน");
  const [categoryText, setCategoryText] = useState("หน้าจอ, แบตเตอรี่");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/suppliers${search ? `?search=${encodeURIComponent(search)}` : ""}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setSuppliers(data.suppliers || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [search]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const openAddModal = () => {
    setEditingSupplier(null);
    setName("");
    setContact("");
    setPhone("");
    setLineId("");
    setAddress("");
    setTaxId("");
    setCredit("เครดิต 30 วัน");
    setCategoryText("หน้าจอ, แบตเตอรี่");
    setFormError("");
    setShowAddModal(true);
  };

  const openEditModal = (sup: SupplierItem) => {
    setEditingSupplier(sup);
    setName(sup.name);
    setContact(sup.contactPerson === "-" ? "" : sup.contactPerson);
    setPhone(sup.phone);
    setLineId(sup.lineId === "-" ? "" : sup.lineId);
    setAddress(sup.address);
    setTaxId(sup.taxId || "");
    setCredit(sup.creditTerms || "เครดิต 30 วัน");
    setCategoryText(sup.categories.join(", "));
    setFormError("");
    setShowAddModal(true);
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

    setSubmitting(true);
    try {
      const payload = {
        id: editingSupplier?.id,
        name: name.trim(),
        contactPerson: contact.trim(),
        phone: phone.trim(),
        lineId: lineId.trim(),
        address: address.trim(),
        taxId: taxId.trim(),
        creditTerms: credit,
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
    if (!confirm(`คุณต้องการลบซัพพลายเออร์ "${sup.name}" หรือไม่?`)) return;

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

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-700 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs font-medium animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Truck className="w-6 h-6 text-blue-600" />
            <span>ซัพพลายเออร์ & ผู้จำหน่ายอะไหล่ (Suppliers Management)</span>
          </h1>
          <p className="text-sm text-slate-500">
            สมุดรายชื่อตัวแทนจำหน่ายอะไหล่ ฟิล์ม อุปกรณ์เสริม เครดิตเทอม และช่องทางสั่งซื้อด่วน
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/purchase">
            <Button variant="outline" size="sm" className="text-xs gap-1.5 font-semibold text-slate-700">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
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

      {/* Search Bar */}
      <Card className="border-slate-200">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="ค้นหาชื่อซัพพลายเออร์, ผู้ติดต่อ, เบอร์โทรศัพท์, หรือหมวดหมู่อะไหล่..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9 bg-slate-50 border-slate-200"
            />
          </div>
          <Button variant="ghost" size="sm" onClick={fetchSuppliers} className="h-9 px-3 text-xs gap-1 text-slate-600">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>รีเฟรช</span>
          </Button>
        </CardContent>
      </Card>

      {/* Suppliers Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-xs">กำลังโหลดรายชื่อซัพพลายเออร์...</div>
      ) : suppliers.length === 0 ? (
        <Card className="border-slate-200 text-center py-12">
          <Truck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <div className="text-sm font-semibold text-slate-700">ยังไม่มีข้อมูลซัพพลายเออร์</div>
          <p className="text-xs text-slate-400 mt-1">กดปุ่ม &quot;เพิ่มซัพพลายเออร์ใหม่&quot; ด้านบนเพื่อบันทึกข้อมูลคู่ค้า</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suppliers.map((sup) => (
            <Card key={sup.id} className="border-slate-200 hover:border-blue-300 transition-colors flex flex-col justify-between">
              <div>
                <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900">{sup.name}</CardTitle>
                    <CardDescription className="text-xs text-slate-500 mt-0.5">
                      ผู้ติดต่อ: {sup.contactPerson}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {sup.creditTerms}
                    </span>
                    <button
                      onClick={() => openEditModal(sup)}
                      className="p-1 text-slate-400 hover:text-blue-600 rounded"
                      title="แก้ไขข้อมูล"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteSupplier(sup)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      title="ลบซัพพลายเออร์"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="pt-3 space-y-3 text-xs">
                  {sup.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {sup.categories.map((cat, idx) => (
                        <span
                          key={idx}
                          className="bg-slate-100 text-slate-700 text-[10.5px] px-2 py-0.5 rounded border border-slate-200"
                        >
                          • {cat}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="space-y-1 text-slate-600 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>โทร: {sup.phone}</span>
                    </div>
                    {sup.lineId && sup.lineId !== "-" && (
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        <span>LINE: {sup.lineId}</span>
                      </div>
                    )}
                    {sup.address && (
                      <div className="flex items-center gap-1.5 text-slate-500 truncate">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{sup.address}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </div>

              <div className="px-5 pb-4 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400">ใบสั่งซื้อ: {sup.totalOrders} ครั้ง</span>
                <div className="flex items-center gap-2">
                  <a href={`tel:${sup.phone}`}>
                    <Button size="sm" variant="outline" className="h-7 text-xs text-blue-600 gap-1">
                      <Phone className="w-3 h-3" />
                      <span>โทร</span>
                    </Button>
                  </a>
                  <Link href={`/purchase?supplierId=${sup.id}&supplierName=${encodeURIComponent(sup.name)}`}>
                    <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1 font-semibold">
                      <FileText className="w-3 h-3" />
                      <span>ออก PO</span>
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showAddModal && (
        <Dialog open={showAddModal} onOpenChange={() => setShowAddModal(false)}>
          <DialogContent className="max-w-md p-0">
            <DialogHeader className="p-4 border-b border-slate-100">
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                <span>{editingSupplier ? "แก้ไขข้อมูลซัพพลายเออร์" : "เพิ่มข้อมูลซัพพลายเออร์ใหม่"}</span>
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSaveSupplier} className="p-4 space-y-3">
              {formError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อร้าน / บริษัทซัพพลายเออร์ *
                </label>
                <Input
                  required
                  placeholder="เช่น บจก. เสือป่า เทรดดิ้ง หรือ ซีคอน พาร์ท"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อผู้ติดต่อ</label>
                  <Input
                    placeholder="เช่น เฮียชัย, คุณกิตติศักดิ์"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์ *</label>
                  <Input
                    required
                    placeholder="08X-XXX-XXXX หรือ 02-XXX-XXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">LINE ID</label>
                  <Input
                    placeholder="@supplier_line"
                    value={lineId}
                    onChange={(e) => setLineId(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">เครดิตเทอม</label>
                  <select
                    value={credit}
                    onChange={(e) => setCredit(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                  >
                    <option value="เงินสด / โอนก่อนส่ง">เงินสด / โอนก่อนส่ง</option>
                    <option value="เครดิต 7 วัน">เครดิต 7 วัน</option>
                    <option value="เครดิต 15 วัน">เครดิต 15 วัน</option>
                    <option value="เครดิต 30 วัน">เครดิต 30 วัน</option>
                    <option value="เครดิต 60 วัน">เครดิต 60 วัน</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หมวดหมู่อะไหล่ที่ส่ง (คั่นด้วยเครื่องหมายจุลภาค ,)
                </label>
                <Input
                  placeholder="เช่น หน้าจอแท้, แบตเตอรี่ มอก., บอดี้, ฟิล์ม"
                  value={categoryText}
                  onChange={(e) => setCategoryText(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ที่อยู่ติดต่อ / ที่ตั้งร้าน</label>
                <Input
                  placeholder="เช่น ชั้น 3 อาคารซีคอนสแควร์ ถนนศรีนครินทร์ กรุงเทพฯ"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
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
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
