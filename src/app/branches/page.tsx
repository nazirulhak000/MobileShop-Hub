"use client";

import React, { useState, useEffect } from "react";
import {
  GitBranch,
  Building2,
  Plus,
  Search,
  MapPin,
  Phone,
  FileText,
  Users,
  Wrench,
  Package,
  Edit2,
  Trash2,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Building,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";

interface BranchItem {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  phone?: string | null;
  taxId?: string | null;
  _count?: {
    users: number;
    repairJobs: number;
    stockItems: number;
    sales: number;
  };
}

const DEFAULT_BRANCH_DATA: BranchItem[] = [
  {
    id: "cmwnc36pa0000z3fxx6o3d40a",
    name: "MobileShop HQ (สำนักงานใหญ่ สุขุมวิท)",
    code: "HQ",
    address: "เลขที่ 888 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110",
    phone: "02-123-4567",
    taxId: "0105567012345",
    _count: {
      users: 4,
      repairJobs: 5,
      stockItems: 32,
      sales: 12,
    },
  },
  {
    id: "cmwnc36ph0001z3fxk19vxzom",
    name: "MobileShop สาขา 2 (เซ็นทรัลพระราม 9)",
    code: "BR-02",
    address: "ห้อง 421 ชั้น 4 ศูนย์การค้าเซ็นทรัลพลาซา แกรนด์ พระราม 9 ถ.รัชดาภิเษก ห้วยขวาง กทม. 10310",
    phone: "02-987-6543",
    taxId: "0105567012345",
    _count: {
      users: 2,
      repairJobs: 2,
      stockItems: 18,
      sales: 8,
    },
  },
];

export default function BranchesPage() {
  const { currentBranch, setCurrentBranch } = useApp();
  const [branches, setBranches] = useState<BranchItem[]>(DEFAULT_BRANCH_DATA);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchItem | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formTaxId, setFormTaxId] = useState("0105567012345");

  // Load from API
  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/branches");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setBranches(data);
        }
      }
    } catch (err) {
      console.warn("Could not fetch branches from API, using default data", err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingBranch(null);
    setFormName("");
    setFormCode(`BR-0${branches.length + 1}`);
    setFormAddress("");
    setFormPhone("02-xxx-xxxx");
    setFormTaxId("0105567012345");
    setModalOpen(true);
  };

  const openEditModal = (b: BranchItem) => {
    setEditingBranch(b);
    setFormName(b.name);
    setFormCode(b.code);
    setFormAddress(b.address || "");
    setFormPhone(b.phone || "");
    setFormTaxId(b.taxId || "0105567012345");
    setModalOpen(true);
  };

  const handleSaveBranch = async () => {
    if (!formName || !formCode) {
      alert("กรุณาระบุชื่อสาขาและรหัสสาขา");
      return;
    }

    try {
      if (editingBranch) {
        // Update
        const payload = {
          id: editingBranch.id,
          name: formName,
          code: formCode,
          address: formAddress,
          phone: formPhone,
          taxId: formTaxId,
        };

        const res = await fetch("/api/branches", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const updated = await res.json();
          setBranches((prev) =>
            prev.map((b) => (b.id === editingBranch.id ? { ...b, ...updated } : b))
          );
        } else {
          // fallback local update
          setBranches((prev) =>
            prev.map((b) =>
              b.id === editingBranch.id
                ? { ...b, name: formName, code: formCode, address: formAddress, phone: formPhone, taxId: formTaxId }
                : b
            )
          );
        }
      } else {
        // Create
        const payload = {
          name: formName,
          code: formCode,
          address: formAddress,
          phone: formPhone,
          taxId: formTaxId,
        };

        const res = await fetch("/api/branches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const created = await res.json();
          setBranches((prev) => [...prev, created]);
        } else {
          // fallback local create
          const newB: BranchItem = {
            id: `br-${Date.now()}`,
            name: formName,
            code: formCode,
            address: formAddress,
            phone: formPhone,
            taxId: formTaxId,
            _count: { users: 0, repairJobs: 0, stockItems: 0, sales: 0 },
          };
          setBranches((prev) => [...prev, newB]);
        }
      }

      setModalOpen(false);
    } catch (err) {
      console.error("Save error:", err);
      setModalOpen(false);
    }
  };

  const handleDeleteBranch = async (id: string, code: string) => {
    if (code === "HQ") {
      alert("ไม่สามารถลบสำนักงานใหญ่ (HQ) ได้");
      return;
    }
    if (confirm(`คุณแน่ใจว่าต้องการลบสาขา ${code} หรือไม่?`)) {
      try {
        await fetch(`/api/branches?id=${id}`, { method: "DELETE" });
        setBranches((prev) => prev.filter((b) => b.id !== id));
      } catch (err) {
        setBranches((prev) => prev.filter((b) => b.id !== id));
      }
    }
  };

  const filteredBranches = branches.filter(
    (b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.address && b.address.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <GitBranch className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              จัดการข้อมูลสาขา (Branch Management)
            </h1>
            <p className="text-xs text-slate-500">
              จัดการข้อมูลที่ตั้ง เลขประจำตัวผู้เสียภาษี เบอร์ติดต่อ และโอนย้ายสลับสาขาทำงาน
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={openCreateModal}
            className="gap-2 text-xs h-9 bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            เพิ่มสาขาใหม่
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="border-slate-200 bg-white shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>สาขาทั้งหมด</span>
              <Building2 className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">
              {branches.length} <span className="text-xs font-normal text-slate-400">แห่ง</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/40 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-emerald-700 mb-1">
              <span>สาขาที่ใช้งานปัจจุบัน</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-lg font-bold text-emerald-800 truncate">
              {currentBranch.code} ({currentBranch.name.split(" ")[1] || "HQ"})
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/40 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-blue-700 mb-1">
              <span>พนักงานประจำรวม</span>
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-900 tabular-nums">
              {branches.reduce((acc, b) => acc + (b._count?.users || 2), 0)}{" "}
              <span className="text-xs font-normal text-blue-600">คน</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/40 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-purple-700 mb-1">
              <span>งานซ่อมรวมทุกสาขา</span>
              <Wrench className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-900 tabular-nums">
              {branches.reduce((acc, b) => acc + (b._count?.repairJobs || 3), 0)}{" "}
              <span className="text-xs font-normal text-purple-600">เคส</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="ค้นหาชื่อสาขา, รหัสสาขา, หรือที่อยู่..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-9 bg-slate-50/50"
          />
        </div>
      </div>

      {/* Branch Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredBranches.map((b) => {
          const isCurrent = currentBranch.code === b.code || currentBranch.id === b.id;

          return (
            <Card
              key={b.id}
              className={`border transition-all duration-200 shadow-2xs relative ${
                isCurrent
                  ? "border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/15"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-sm ${
                        b.code === "HQ"
                          ? "bg-purple-100 text-purple-700 border border-purple-200"
                          : "bg-blue-100 text-blue-700 border border-blue-200"
                      }`}
                    >
                      {b.code}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-slate-900">{b.name}</h3>
                        {isCurrent && (
                          <Badge variant="default" className="text-[10px] bg-blue-600 text-white font-semibold">
                            กำลังใช้งาน
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">Tax ID: {b.taxId || "0105567012345"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(b)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      title="แก้ไขข้อมูลสาขา"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    {b.code !== "HQ" && (
                      <button
                        onClick={() => handleDeleteBranch(b.id, b.code)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="ลบสาขา"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-600 bg-slate-50/60 p-3 rounded-lg border border-slate-100 mb-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{b.address || "ยังไม่ได้ระบุที่อยู่สาขา"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono">{b.phone || "ยังไม่ได้ระบุเบอร์โทรศัพท์"}</span>
                  </div>
                </div>

                {/* Branch stats bar */}
                <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center mb-4">
                  <div>
                    <div className="text-[11px] text-slate-400">พนักงาน</div>
                    <div className="font-bold text-xs text-slate-800">{b._count?.users ?? 2} คน</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">งานซ่อม</div>
                    <div className="font-bold text-xs text-slate-800">{b._count?.repairJobs ?? 3} เคส</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">รายการสต็อก</div>
                    <div className="font-bold text-xs text-slate-800">{b._count?.stockItems ?? 25} ชนิด</div>
                  </div>
                </div>

                {/* Switch Button */}
                {!isCurrent ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCurrentBranch({ id: b.id, name: b.name, code: b.code });
                      alert(`สลับการทำงานเป็นสาขา "${b.name}" สำเร็จ`);
                    }}
                    className="w-full text-xs h-8 border-slate-300 hover:border-blue-600 hover:text-blue-600 transition-colors gap-1.5"
                  >
                    <span>สลับเป็นสาขาทำงานปัจจุบัน</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-100/60 py-1.5 rounded-lg">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>สาขาที่ระบบกำลังบันทึกข้อมูลขณะนี้</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Branch Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogHeader>
          <DialogTitle onClose={() => setModalOpen(false)}>
            {editingBranch ? `แก้ไขข้อมูลสาขา (${editingBranch.code})` : "เพิ่มสาขาใหม่"}
          </DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">รหัสสาขา *</label>
              <Input
                placeholder="เช่น BR-03"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                className="text-xs h-9 font-mono"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-700 mb-1 block">ชื่อสาขา *</label>
              <Input
                placeholder="เช่น MobileShop สาขา 3 (ฟิวเจอร์พาร์ครังสิต)"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">เลขประจำตัวผู้เสียภาษี (13 หลัก)</label>
              <Input
                placeholder="0105567012345"
                value={formTaxId}
                onChange={(e) => setFormTaxId(e.target.value)}
                className="text-xs h-9 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">เบอร์โทรศัพท์สาขา</label>
              <Input
                placeholder="02-123-4567 หรือ 081-xxx-xxxx"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">ที่อยู่สาขาอย่างละเอียด</label>
            <textarea
              rows={3}
              placeholder="เลขที่ ห้อง ชั้น อาคาร ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
              value={formAddress}
              onChange={(e) => setFormAddress(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setModalOpen(false)} className="text-xs">
            ยกเลิก
          </Button>
          <Button onClick={handleSaveBranch} className="text-xs bg-blue-600 text-white hover:bg-blue-700">
            {editingBranch ? "บันทึกการแก้ไข" : "บันทึกสาขาใหม่"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
