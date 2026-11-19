"use client";

import React, { useState } from "react";
import { DemoBanner } from "@/components/ui/DemoBanner";
import {
  Truck,
  PlusCircle,
  Search,
  Phone,
  MessageSquare,
  Building2,
  Calendar,
  CreditCard,
  Edit2,
  Trash2,
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
  creditTerms: string;
  categories: string[];
  totalOrders: number;
}

const INITIAL_SUPPLIERS: SupplierItem[] = [
  {
    id: "sup-1",
    name: "ซีคอน พาร์ท โฮลเซลล์ (Seacon Parts Wholesale)",
    contactPerson: "คุณกิตติศักดิ์",
    phone: "02-721-8899",
    lineId: "@seaconparts",
    address: "ชั้น 3 อาคารซีคอนสแควร์ ถนนศรีนครินทร์ กรุงเทพฯ",
    creditTerms: "เครดิต 30 วัน",
    categories: ["หน้าจอแท้", "แบตเตอรี่ มอก.", "แผงชาร์จ"],
    totalOrders: 42,
  },
  {
    id: "sup-2",
    name: "เสือป่า อะไหล่แท้ เซ็นเตอร์",
    contactPerson: "เฮียชัย เสือป่า",
    phone: "081-998-7766",
    lineId: "@suapa_center",
    address: "ถนนเสือป่า ป้อมปราบฯ กรุงเทพฯ 10100",
    creditTerms: "เงินสด / โอนก่อนส่ง",
    categories: ["หน้าจอเทียบแท้", "บอดี้/ฝาหลัง", "กล้อง"],
    totalOrders: 78,
  },
  {
    id: "sup-3",
    name: "โฟกัส ฟิล์ม ดิสทริบิวเตอร์ (Focus Official)",
    contactPerson: "คุณพรทิพย์",
    phone: "02-934-5500",
    lineId: "@focus_distro",
    address: "ลาดพร้าว 101 วังทองหลาง กรุงเทพฯ",
    creditTerms: "เครดิต 15 วัน",
    categories: ["กระจกกันรอย", "ฟิล์มไฮโดรเจล", "เลนส์กันรอย"],
    totalOrders: 25,
  },
  {
    id: "sup-4",
    name: "รีแม็กซ์ ไทยแลนด์ อุปกรณ์ไอที (Remax Official)",
    contactPerson: "คุณวรวิทย์",
    phone: "02-456-7890",
    lineId: "@remax_th",
    address: "พระราม 2 ซอย 33 บางมด จอมทอง กรุงเทพฯ",
    creditTerms: "เครดิต 30 วัน",
    categories: ["สายชาร์จ", "หัวชาร์จเร็ว PD", "พาวเวอร์แบงค์"],
    totalOrders: 36,
  },
];

const NOT_SAVED_MSG = "ยังไม่รองรับการบันทึก — หน้านี้เป็นโหมดตัวอย่าง ข้อมูลจะไม่ถูกเก็บในระบบ";

export default function SuppliersManagementPage() {
  const [suppliers, setSuppliers] = useState<SupplierItem[]>(INITIAL_SUPPLIERS);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // New Supplier Form
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [lineId, setLineId] = useState("");
  const [address, setAddress] = useState("");
  const [credit, setCredit] = useState("เครดิต 30 วัน");
  const [categoryText, setCategoryText] = useState("หน้าจอ, แบตเตอรี่");

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    // No Supplier model/API yet — do not pretend the record was saved.
    alert(NOT_SAVED_MSG);
    setShowAddModal(false);
  };

  const filtered = suppliers.filter((s) => {
    const q = search.toLowerCase();
    return (
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.contactPerson.toLowerCase().includes(q) ||
      s.phone.includes(q) ||
      s.categories.some((c) => c.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <DemoBanner message="ยังไม่มีฐานข้อมูลซัพพลายเออร์ รายชื่อในหน้านี้เป็นตัวอย่าง การเพิ่มรายการจะไม่ถูกบันทึก" />
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
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2 text-xs shadow-sm font-semibold"
        >
          <PlusCircle className="w-4 h-4" />
          <span>เพิ่มซัพพลายเออร์ใหม่</span>
        </Button>
      </div>

      {/* Search Bar */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="ค้นหาชื่อซัพพลายเออร์, ผู้ติดต่อ, เบอร์โทรศัพท์, หรือหมวดหมู่อะไหล่..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9 bg-slate-50 border-slate-200"
            />
          </div>
        </CardContent>
      </Card>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((sup) => (
          <Card key={sup.id} className="border-slate-200 hover:border-blue-300 transition-colors">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">{sup.name}</CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  ผู้ติดต่อ: {sup.contactPerson}
                </CardDescription>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {sup.creditTerms}
              </span>
            </CardHeader>
            <CardContent className="pt-3 space-y-3 text-xs">
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

              <div className="space-y-1 text-slate-600 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>โทร: {sup.phone}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>LINE: {sup.lineId}</span>
                </div>
                {sup.address && (
                  <div className="flex items-center gap-1.5 text-slate-500 truncate">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{sup.address}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-[11px] text-slate-400">ประวัติสั่งซื้อ: {sup.totalOrders} ครั้ง</span>
                <a href={`tel:${sup.phone}`}>
                  <Button size="sm" variant="outline" className="h-7 text-xs text-blue-600 gap-1">
                    <Phone className="w-3 h-3" />
                    <span>โทรสั่งของ</span>
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <Dialog open={showAddModal} onOpenChange={() => setShowAddModal(false)}>
          <DialogContent className="max-w-md p-0">
            <DialogHeader className="p-4 border-b border-slate-100">
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                <span>เพิ่มข้อมูลซัพพลายเออร์ใหม่</span>
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleAddSupplier} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อร้าน / บริษัทซัพพลายเออร์ *</label>
                <Input
                  required
                  placeholder="เช่น บจก. เสือป่า เทรดดิ้ง"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อผู้ติดต่อ</label>
                  <Input
                    placeholder="เช่น เฮียชัย"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์ *</label>
                  <Input
                    required
                    placeholder="02-XXX-XXXX"
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
                    <option value="เครดิต 15 วัน">เครดิต 15 วัน</option>
                    <option value="เครดิต 30 วัน">เครดิต 30 วัน</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">หมวดหมู่อะไหล่ที่ส่ง (คั่นด้วย ,)</label>
                <Input
                  placeholder="เช่น หน้าจอ, แบตเตอรี่, บอดี้"
                  value={categoryText}
                  onChange={(e) => setCategoryText(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ที่อยู่ติดต่อ</label>
                <Input
                  placeholder="ที่อยู่ร้าน / อาคาร..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)} className="text-xs">
                  ยกเลิก
                </Button>
                <Button type="submit" className="text-xs bg-blue-600 text-white">
                  บันทึกซัพพลายเออร์
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
