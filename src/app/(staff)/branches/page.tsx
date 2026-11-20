"use client";

import React, { useState, useEffect } from "react";
import {
  GitBranch,
  Building2,
  Plus,
  Search,
  MapPin,
  Phone,
  Users,
  Wrench,
  Edit2,
  Trash2,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Star,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { validateThaiTaxId } from "@/lib/utils";

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
    deviceImeis?: number;
    expenses?: number;
  };
}

/** Extract the Thai error message from a failed API response. */
async function readApiError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (data && typeof data.error === "string") return data.error;
  } catch {
    // non-JSON response
  }
  return `ทำรายการไม่สำเร็จ (HTTP ${res.status})`;
}

export default function BranchesPage() {
  const { currentBranch, setCurrentBranch } = useApp();
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchItem | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formIsMain, setFormIsMain] = useState(false);
  const [formAddress, setFormAddress] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formTaxId, setFormTaxId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
        if (Array.isArray(data)) {
          setBranches(data);
        }
      } else {
        alert(await readApiError(res));
      }
    } catch (err) {
      console.warn("Could not fetch branches from API", err);
    } finally {
      setLoading(false);
    }
  };

  const getSuggestedNextCode = () => {
    const hasHq = branches.some((b) => b.code === "00000" || b.code === "HQ");
    if (!hasHq) return "00000";

    const used = new Set(branches.map((b) => b.code));
    for (let i = 1; i <= 99999; i++) {
      const candidate = String(i).padStart(5, "0");
      if (!used.has(candidate)) return candidate;
    }
    return `0000${branches.length + 1}`.slice(-5);
  };

  const openCreateModal = () => {
    setEditingBranch(null);
    const hasHq = branches.some((b) => b.code === "00000" || b.code === "HQ");
    const nextCode = getSuggestedNextCode();
    setFormName("");
    setFormCode(nextCode);
    setFormIsMain(!hasHq);
    setFormAddress("");
    setFormPhone("");
    setFormTaxId("0105567012345");
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (b: BranchItem) => {
    const isHq = b.code === "00000" || b.code === "HQ";
    setEditingBranch(b);
    setFormName(b.name);
    setFormCode(b.code);
    setFormIsMain(isHq);
    setFormAddress(b.address || "");
    setFormPhone(b.phone || "");
    setFormTaxId(b.taxId || "0105567012345");
    setFormError(null);
    setModalOpen(true);
  };

  const handleToggleIsMain = (checked: boolean) => {
    setFormIsMain(checked);
    if (checked) {
      setFormCode("00000");
    } else {
      if (formCode === "00000" || formCode === "HQ") {
        setFormCode(getSuggestedNextCode());
      }
    }
  };

  const handleSaveBranch = async () => {
    if (!formName.trim()) {
      setFormError("กรุณาระบุชื่อสาขา");
      return;
    }
    const cleanCode = formCode.trim().toUpperCase();
    if (!cleanCode) {
      setFormError("กรุณาระบุรหัสสาขา (5 หลัก เช่น 00000)");
      return;
    }

    if (formTaxId.trim() && formTaxId.trim() !== "0105567012345") {
      const taxValidation = validateThaiTaxId(formTaxId.trim());
      if (!taxValidation.valid) {
        setFormError(taxValidation.message || "เลขประจำตัวผู้เสียภาษี 13 หลักไม่ถูกต้อง");
        return;
      }
    }

    setSaving(true);
    setFormError(null);
    try {
      const payload: Record<string, any> = {
        name: formName.trim(),
        code: cleanCode,
        isMain: formIsMain,
        address: formAddress.trim() || null,
        phone: formPhone.trim() || null,
        taxId: formTaxId.trim() || null,
      };

      if (editingBranch) {
        payload.id = editingBranch.id;
        const res = await fetch("/api/branches", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          setFormError(await readApiError(res));
          return;
        }
      } else {
        const res = await fetch("/api/branches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          setFormError(await readApiError(res));
          return;
        }
      }

      await fetchBranches();
      setModalOpen(false);
    } catch {
      setFormError("บันทึกไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่");
    } finally {
      setSaving(false);
    }
  };

  const handleSetMainBranch = async (b: BranchItem) => {
    if (!confirm(`คุณต้องการตั้งสาขา "${b.name}" ให้เป็นสำนักงานใหญ่ (HQ - 00000) ใช่หรือไม่?\n(ระบบจะสลับรหัสสาขาสำนักงานใหญ่เดิมให้อัตโนมัติ)`)) {
      return;
    }
    try {
      setLoading(true);
      const res = await fetch("/api/branches", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: b.id, isMain: true }),
      });
      if (!res.ok) {
        alert(await readApiError(res));
        return;
      }
      await fetchBranches();
    } catch {
      alert("ไม่สามารถเปลี่ยนสำนักงานใหญ่ได้ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBranch = async (b: BranchItem) => {
    const isHq = b.code === "00000" || b.code === "HQ";
    if (isHq) {
      alert("ไม่สามารถลบสาขาสำนักงานใหญ่ (HQ - 00000) ได้");
      return;
    }

    const totalActive =
      (b._count?.users ?? 0) +
      (b._count?.repairJobs ?? 0) +
      (b._count?.stockItems ?? 0) +
      (b._count?.sales ?? 0);

    if (totalActive > 0) {
      alert(
        `ไม่สามารถลบสาขา ${b.code} ได้ เนื่องจากยังมีข้อมูลผูกอยู่:\n` +
          `- พนักงาน: ${b._count?.users ?? 0} คน\n` +
          `- งานซ่อม: ${b._count?.repairJobs ?? 0} รายการ\n` +
          `- สต็อกสินค้า: ${b._count?.stockItems ?? 0} รายการ\n` +
          `- ยอดขาย: ${b._count?.sales ?? 0} รายการ\n\n` +
          `กรุณาย้ายหรือเคลียร์ข้อมูลดังกล่าวก่อนทำการลบสาขา`
      );
      return;
    }

    if (confirm(`คุณแน่ใจว่าต้องการลบสาขา "${b.name}" (${b.code}) หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
      try {
        const res = await fetch(`/api/branches?id=${encodeURIComponent(b.id)}`, { method: "DELETE" });
        if (!res.ok) {
          alert(await readApiError(res));
          return;
        }
        setBranches((prev) => prev.filter((item) => item.id !== b.id));
      } catch {
        alert("ลบสาขาไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่");
      }
    }
  };

  const filteredBranches = branches.filter(
    (b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.address && b.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (b.taxId && b.taxId.includes(searchQuery))
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
              จัดการสำนักงานใหญ่ (HQ - 00000) สาขาย่อย เลขประจำตัวผู้เสียภาษี และสลับสาขาทำงาน
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
              <span>สาขาที่เปิดใช้งานขณะนี้</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-lg font-bold text-emerald-800 truncate">
              {currentBranch.code || "00000"} : {currentBranch.name || "สำนักงานใหญ่"}
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
              {branches.reduce((acc, b) => acc + (b._count?.users ?? 0), 0)}{" "}
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
              {branches.reduce((acc, b) => acc + (b._count?.repairJobs ?? 0), 0)}{" "}
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
            placeholder="ค้นหาชื่อสาขา, รหัสสาขา (00000), หรือที่อยู่..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-9 bg-slate-50/50"
          />
        </div>
      </div>

      {/* Branch Cards Grid */}
      {loading && branches.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400">กำลังโหลดข้อมูลสาขา...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredBranches.map((b) => {
          const isCurrent = currentBranch.code === b.code || currentBranch.id === b.id;
          const isHq = b.code === "00000" || b.code === "HQ";
          const hasDependencies =
            (b._count?.users ?? 0) > 0 ||
            (b._count?.repairJobs ?? 0) > 0 ||
            (b._count?.stockItems ?? 0) > 0 ||
            (b._count?.sales ?? 0) > 0;

          return (
            <Card
              key={b.id}
              className={`border transition-all duration-200 shadow-2xs relative ${
                isCurrent
                  ? "border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/15"
                  : isHq
                  ? "border-purple-300/80 bg-purple-50/10 hover:border-purple-400"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl font-mono font-bold text-xs ${
                        isHq
                          ? "bg-purple-100 text-purple-700 border border-purple-200"
                          : "bg-blue-100 text-blue-700 border border-blue-200"
                      }`}
                      title={isHq ? "สำนักงานใหญ่ (HQ - 00000)" : `รหัสสาขา: ${b.code}`}
                    >
                      {b.code}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-slate-900">{b.name}</h3>
                        {isHq && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                            <ShieldCheck className="h-3 w-3" />
                            สำนักงานใหญ่ (HQ)
                          </span>
                        )}
                        {isCurrent && (
                          <Badge variant="default" className="text-[10px] bg-blue-600 text-white font-semibold">
                            กำลังใช้งาน
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Tax ID: {b.taxId || "ยังไม่ระบุเลขประจำตัวผู้เสียภาษี"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {!isHq && (
                      <button
                        onClick={() => handleSetMainBranch(b)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-purple-700 hover:bg-purple-50 transition-colors"
                        title="ตั้งสาขานี้เป็นสำนักงานใหญ่ (HQ - 00000)"
                      >
                        <Star className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => openEditModal(b)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      title="แก้ไขข้อมูลสาขา"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    {!isHq && (
                      <button
                        onClick={() => handleDeleteBranch(b)}
                        disabled={hasDependencies}
                        className={`p-1.5 rounded-lg transition-colors ${
                          hasDependencies
                            ? "text-slate-300 cursor-not-allowed"
                            : "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        }`}
                        title={
                          hasDependencies
                            ? "ไม่สามารถลบสาขาได้เนื่องจากมีข้อมูลผูกอยู่ (พนักงาน/งานซ่อม/สต็อก/การขาย)"
                            : "ลบสาขา"
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50/60 p-3 rounded-lg border border-slate-100 mb-4">
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
                <div className="grid grid-cols-4 gap-2 border-t border-slate-100 pt-3 text-center mb-4">
                  <div>
                    <div className="text-[11px] text-slate-400">พนักงาน</div>
                    <div className="font-bold text-xs text-slate-800">{b._count?.users ?? 0} คน</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">งานซ่อม</div>
                    <div className="font-bold text-xs text-slate-800">{b._count?.repairJobs ?? 0} เคส</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">สต็อกสินค้า</div>
                    <div className="font-bold text-xs text-slate-800">{b._count?.stockItems ?? 0} รายการ</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">ยอดขาย</div>
                    <div className="font-bold text-xs text-slate-800">{b._count?.sales ?? 0} บิล</div>
                  </div>
                </div>

                {/* Switch Button */}
                {!isCurrent ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCurrentBranch({ id: b.id, name: b.name, code: b.code });
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
      )}

      {/* Branch Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogHeader>
          <DialogTitle onClose={() => setModalOpen(false)}>
            {editingBranch ? `แก้ไขข้อมูลสาขา (${editingBranch.code})` : "เพิ่มสาขาใหม่"}
          </DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-4">
          {/* Main Branch Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-purple-50/70 border border-purple-200">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600 text-white">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-purple-900">กำหนดเป็นสำนักงานใหญ่ (HQ - 00000)</div>
                <div className="text-[11px] text-purple-700">
                  รหัสสาขา 00000 ตามมาตรฐานสรรพากร (ภ.พ.30 / ใบกำกับภาษีเต็มรูป)
                </div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formIsMain}
                onChange={(e) => handleToggleIsMain(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">รหัสสาขา 5 หลัก *</label>
              <Input
                placeholder="เช่น 00000 หรือ 00001"
                value={formCode}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setFormCode(val);
                  if (val === "00000" || val === "HQ") {
                    setFormIsMain(true);
                  } else {
                    setFormIsMain(false);
                  }
                }}
                className="text-xs h-9 font-mono font-semibold"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">00000 = สนญ.</span>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-700 mb-1 block">ชื่อสาขา *</label>
              <Input
                placeholder="เช่น MobileShop สำนักงานใหญ่ (สุขุมวิท)"
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

          {formError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700" role="alert">
              {formError}
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving} className="text-xs">
            ยกเลิก
          </Button>
          <Button
            onClick={handleSaveBranch}
            disabled={saving}
            className="text-xs bg-blue-600 text-white hover:bg-blue-700"
          >
            {saving ? "กำลังบันทึก..." : editingBranch ? "บันทึกการแก้ไข" : "บันทึกสาขาใหม่"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
