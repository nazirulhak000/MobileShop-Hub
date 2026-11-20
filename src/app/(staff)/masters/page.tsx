"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Database,
  Smartphone,
  HardDrive,
  Palette,
  Wrench,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  Layers,
  Sparkles,
  Tag,
  DollarSign,
  Clock,
  ShieldAlert,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Check,
  AlertCircle,
  Sliders,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { formatTHB } from "@/lib/utils";
import {
  MasterCategory,
  MasterBrand,
  MasterModel,
  MasterCommonSymptom,
  MasterService,
  MasterStorageCapacity,
  MasterColor,
  MasterDataStore,
  DEFAULT_MASTER_DATA,
} from "@/types/masters";

export default function MastersPage() {
  const [activeTab, setActiveTab] = useState<
    "categories" | "brands" | "models" | "symptoms" | "services" | "capacities" | "colors"
  >("symptoms");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Master Data collections
  const [masterData, setMasterData] = useState<MasterDataStore>(DEFAULT_MASTER_DATA);

  // Modal State for Add / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [formCategory, setFormCategory] = useState<Partial<MasterCategory>>({});
  const [formBrand, setFormBrand] = useState<Partial<MasterBrand>>({});
  const [formModel, setFormModel] = useState<Partial<MasterModel>>({});
  const [formSymptom, setFormSymptom] = useState<Partial<MasterCommonSymptom>>({});
  const [formService, setFormService] = useState<Partial<MasterService>>({});
  const [formCapacity, setFormCapacity] = useState<Partial<MasterStorageCapacity>>({});
  const [formColor, setFormColor] = useState<Partial<MasterColor>>({});

  // Fetch Master Data from API on mount
  const fetchMasters = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/masters");
      const json = await res.json().catch(() => null);
      if (res.ok && json?.data) {
        setMasterData(json.data);
      }
    } catch (err: any) {
      console.error("Fetch masters error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasters();
  }, []);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 3500);
  };

  // Open Modal for Add
  const handleOpenAdd = () => {
    setEditingId(null);
    if (activeTab === "categories") {
      setFormCategory({
        code: "CUSTOM",
        name: "",
        description: "",
        badge: "ใหม่",
        displayOrder: masterData.categories.length + 1,
        isActive: true,
      });
    } else if (activeTab === "brands") {
      setFormBrand({
        name: "",
        country: "จีน",
        deviceCount: 0,
        popular: false,
        badge: "ทั่วไป",
        displayOrder: masterData.brands.length + 1,
      });
    } else if (activeTab === "models") {
      const firstBrand = masterData.brands[0]?.name || "Apple";
      setFormModel({
        brandName: firstBrand,
        modelName: "",
        series: `${firstBrand} Series`,
        year: new Date().getFullYear(),
        screenSize: '6.1"',
        popular: false,
        badge: "รุ่นใหม่",
        displayOrder: masterData.models.length + 1,
      });
    } else if (activeTab === "symptoms") {
      setFormSymptom({
        name: "",
        description: "",
        baseLaborFee: 800,
        estimatedHours: 1.0,
        priority: "HIGH",
        badge: "ด่วน",
        displayOrder: masterData.symptoms.length + 1,
        isActive: true,
      });
    } else if (activeTab === "services") {
      setFormService({
        code: `SRV-${Date.now().toString().slice(-4)}`,
        name: "",
        description: "",
        standardPrice: 500,
        estimatedMinutes: 30,
        badge: "มาตรฐาน",
        displayOrder: masterData.services.length + 1,
        isActive: true,
      });
    } else if (activeTab === "capacities") {
      setFormCapacity({
        capacity: "128",
        unit: "GB",
        description: "ความจุมาตรฐาน",
        displayOrder: masterData.capacities.length + 1,
        isActive: true,
      });
    } else if (activeTab === "colors") {
      setFormColor({
        nameTh: "",
        nameEn: "",
        hexCode: "#000000",
        displayOrder: masterData.colors.length + 1,
      });
    }
    setModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (item: any) => {
    setEditingId(item.id);
    if (activeTab === "categories") setFormCategory({ ...item });
    else if (activeTab === "brands") setFormBrand({ ...item });
    else if (activeTab === "models") setFormModel({ ...item });
    else if (activeTab === "symptoms") setFormSymptom({ ...item });
    else if (activeTab === "services") setFormService({ ...item });
    else if (activeTab === "capacities") setFormCapacity({ ...item });
    else if (activeTab === "colors") setFormColor({ ...item });
    setModalOpen(true);
  };

  // Save Add or Edit via API
  const handleSaveModal = async () => {
    try {
      setSaving(true);
      let payloadItem: any = null;

      if (activeTab === "categories") {
        if (!formCategory.name?.trim()) {
          alert("กรุณาระบุชื่อหมวดหมู่");
          return;
        }
        payloadItem = { ...formCategory };
      } else if (activeTab === "brands") {
        if (!formBrand.name?.trim()) {
          alert("กรุณาระบุชื่อยี่ห้อ");
          return;
        }
        payloadItem = { ...formBrand };
      } else if (activeTab === "models") {
        if (!formModel.modelName?.trim()) {
          alert("กรุณาระบุชื่อรุ่นสมาร์ทโฟน");
          return;
        }
        payloadItem = { ...formModel };
      } else if (activeTab === "symptoms") {
        if (!formSymptom.name?.trim()) {
          alert("กรุณาระบุชื่ออาการเสีย");
          return;
        }
        payloadItem = { ...formSymptom };
      } else if (activeTab === "services") {
        if (!formService.name?.trim()) {
          alert("กรุณาระบุชื่อบริการ");
          return;
        }
        payloadItem = { ...formService };
      } else if (activeTab === "capacities") {
        if (!formCapacity.capacity?.trim()) {
          alert("กรุณาระบุตัวเลขความจุ");
          return;
        }
        payloadItem = { ...formCapacity };
      } else if (activeTab === "colors") {
        if (!formColor.nameTh?.trim() || !formColor.nameEn?.trim()) {
          alert("กรุณาระบุชื่อสีทั้งภาษาไทยและอังกฤษ");
          return;
        }
        payloadItem = { ...formColor };
      }

      if (editingId) {
        // PUT edit
        const res = await fetch("/api/masters", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: activeTab,
            id: editingId,
            patch: payloadItem,
          }),
        });
        const json = await res.json();
        if (res.ok && json.success) {
          setMasterData(json.data);
          setModalOpen(false);
          showToast("แก้ไขข้อมูลสำเร็จ");
        } else {
          alert(json.error || "ไม่สามารถแก้ไขข้อมูลได้");
        }
      } else {
        // POST add
        const res = await fetch("/api/masters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: activeTab,
            item: payloadItem,
          }),
        });
        const json = await res.json();
        if (res.ok && json.success) {
          setMasterData(json.data);
          setModalOpen(false);
          showToast("เพิ่มข้อมูลใหม่สำเร็จ");
        } else {
          alert(json.error || "ไม่สามารถเพิ่มข้อมูลได้");
        }
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Delete Item via API
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`คุณต้องการลบ "${name}" ใช่หรือไม่?`)) return;

    try {
      const res = await fetch(`/api/masters?type=${activeTab}&id=${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setMasterData(json.data);
        showToast(`ลบรายการ "${name}" สำเร็จ`);
      } else {
        alert(json.error || "ไม่สามารถลบรายการได้");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  // Move Display Order Up or Down
  const handleMoveOrder = async (index: number, direction: "UP" | "DOWN") => {
    const list = [...(masterData[activeTab] as any[])];
    const targetIndex = direction === "UP" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const orderedIds = list.map((item) => item.id);

    try {
      const res = await fetch("/api/masters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reorder",
          type: activeTab,
          orderedIds,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setMasterData(json.data);
        showToast("ปรับลำดับการแสดงผลสำเร็จ");
      }
    } catch (err: any) {
      console.error("Reorder error:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {statusMsg && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg transition-all ${
            statusMsg.type === "success"
              ? "bg-emerald-900 text-emerald-100 border border-emerald-700"
              : "bg-rose-900 text-rose-100 border border-rose-700"
          }`}
        >
          {statusMsg.type === "success" ? <Check className="h-4 w-4 text-emerald-400" /> : <AlertCircle className="h-4 w-4 text-rose-400" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              ฐานข้อมูลหลัก (Master Data Management)
            </h1>
            <p className="text-xs text-slate-500">
              จัดการหมวดหมู่ ยี่ห้อ รุ่นอุปกรณ์ อาการเสียยอดนิยม (จอแตก, แบตเสื่อม, เปิดไม่ติด) และงานบริการมาตรฐาน พร้อมกำหนด Badges และลำดับการแสดงผล
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchMasters}
            disabled={loading}
            className="gap-1.5 text-xs h-9 text-slate-700"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>รีเฟรช</span>
          </Button>
          <Button
            onClick={handleOpenAdd}
            className="gap-2 text-xs h-9 bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            เพิ่มข้อมูลในแท็บนี้
          </Button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2">
        {[
          { id: "symptoms", label: "อาการเสียยอดนิยม (Symptoms)", icon: Wrench, count: masterData.symptoms.length },
          { id: "services", label: "งานบริการ & ตรวจเช็ค (Services)", icon: Sparkles, count: masterData.services.length },
          { id: "categories", label: "หมวดหมู่สินค้า (Categories)", icon: Tag, count: masterData.categories.length },
          { id: "brands", label: "ยี่ห้อ (Brands)", icon: Smartphone, count: masterData.brands.length },
          { id: "models", label: "รุ่นอุปกรณ์ (Device Models)", icon: Layers, count: masterData.models.length },
          { id: "capacities", label: "ความจุ (Capacities)", icon: HardDrive, count: masterData.capacities.length },
          { id: "colors", label: "สีตัวเครื่อง (Colors)", icon: Palette, count: masterData.colors.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100/70 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              <span
                className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Bar & Order Info */}
      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-2xs gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="ค้นหาข้อมูลในตาราง..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-9 bg-slate-50/50"
          />
        </div>
        <div className="text-[11px] text-slate-500 hidden sm:flex items-center gap-1 font-medium">
          <Sliders className="h-3.5 w-3.5 text-blue-600" />
          <span>ใช้ปุ่มลูกศรขึ้น-ลงเพื่อจัดลำดับการแสดงผล (Display Order) ทันที</span>
        </div>
      </div>

      {/* Main Table Content */}
      <Card className="border-slate-200 shadow-2xs overflow-hidden">
        {/* ================= TAB 1: COMMON SYMPTOMS ================= */}
        {activeTab === "symptoms" && (
          <Table>
            <TableHeader className="bg-slate-50/75 border-b border-slate-200">
              <TableRow>
                <TableHead className="text-xs font-semibold text-slate-600 w-16 text-center">ลำดับ</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">อาการเสีย (Common Symptoms)</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">คำอธิบายงานซ่อม</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-right">ค่าแรงมาตรฐาน</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">เวลาประเมิน</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">ความสำคัญ</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">ป้ายกำกับ (Badge)</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">สถานะ</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {masterData.symptoms
                .filter(
                  (s) =>
                    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    s.description.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((s, idx) => (
                  <TableRow key={s.id} className="hover:bg-slate-50/60">
                    <TableCell className="py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-mono text-xs font-semibold text-slate-500 w-5">{s.displayOrder || idx + 1}</span>
                        <div className="flex flex-col">
                          <button
                            type="button"
                            onClick={() => handleMoveOrder(idx, "UP")}
                            disabled={idx === 0}
                            className="p-0.5 text-slate-400 hover:text-blue-600 disabled:opacity-30"
                            title="เลื่อนขึ้น"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveOrder(idx, "DOWN")}
                            disabled={idx === masterData.symptoms.length - 1}
                            className="p-0.5 text-slate-400 hover:text-blue-600 disabled:opacity-30"
                            title="เลื่อนลง"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="font-bold text-xs text-slate-900">{s.name}</div>
                    </TableCell>
                    <TableCell className="py-3 text-xs text-slate-600 max-w-sm">{s.description}</TableCell>
                    <TableCell className="py-3 text-right font-mono text-xs font-bold text-emerald-700">
                      {formatTHB(s.baseLaborFee)}
                    </TableCell>
                    <TableCell className="py-3 text-center font-mono text-xs text-slate-700">
                      {s.estimatedHours} ชม.
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      {s.priority === "HIGH" && <Badge variant="danger" className="text-[10px]">ด่วน / สูง</Badge>}
                      {s.priority === "MEDIUM" && <Badge variant="warning" className="text-[10px]">ปานกลาง</Badge>}
                      {s.priority === "NORMAL" && <Badge variant="default" className="text-[10px]">ปกติ</Badge>}
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      {s.badge ? (
                        <span className="rounded bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 font-mono">
                          {s.badge}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      {s.isActive ? (
                        <Badge variant="success" className="text-[10px]">เปิดใช้งาน</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">ปิด</Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                          title="แก้ไข"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(s.id, s.name)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          title="ลบ"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        )}

        {/* ================= TAB 2: SERVICES ================= */}
        {activeTab === "services" && (
          <Table>
            <TableHeader className="bg-slate-50/75 border-b border-slate-200">
              <TableRow>
                <TableHead className="text-xs font-semibold text-slate-600 w-16 text-center">ลำดับ</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">รหัสบริการ (Code)</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">ชื่องานบริการ (Service Name)</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">รายละเอียดขอบเขตงาน</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-right">ราคามาตรฐาน</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">เวลาโดยประมาณ</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">ป้ายกำกับ (Badge)</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">สถานะ</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {masterData.services
                .filter(
                  (srv) =>
                    srv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    srv.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    srv.description.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((srv, idx) => (
                  <TableRow key={srv.id} className="hover:bg-slate-50/60">
                    <TableCell className="py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-mono text-xs font-semibold text-slate-500 w-5">{srv.displayOrder || idx + 1}</span>
                        <div className="flex flex-col">
                          <button
                            type="button"
                            onClick={() => handleMoveOrder(idx, "UP")}
                            disabled={idx === 0}
                            className="p-0.5 text-slate-400 hover:text-blue-600 disabled:opacity-30"
                            title="เลื่อนขึ้น"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveOrder(idx, "DOWN")}
                            disabled={idx === masterData.services.length - 1}
                            className="p-0.5 text-slate-400 hover:text-blue-600 disabled:opacity-30"
                            title="เลื่อนลง"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {srv.code}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="font-bold text-xs text-slate-900">{srv.name}</div>
                    </TableCell>
                    <TableCell className="py-3 text-xs text-slate-600 max-w-sm">{srv.description}</TableCell>
                    <TableCell className="py-3 text-right font-mono text-xs font-bold text-emerald-700">
                      {srv.standardPrice === 0 ? "ฟรี 0 บาท" : formatTHB(srv.standardPrice)}
                    </TableCell>
                    <TableCell className="py-3 text-center font-mono text-xs text-slate-700">
                      {srv.estimatedMinutes} นาที
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      {srv.badge ? (
                        <span className="rounded bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-700 font-mono">
                          {srv.badge}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      {srv.isActive ? (
                        <Badge variant="success" className="text-[10px]">เปิดบริการ</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">ปิด</Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(srv)}
                          className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                          title="แก้ไข"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(srv.id, srv.name)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          title="ลบ"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        )}

        {/* ================= TAB 3: CATEGORIES ================= */}
        {activeTab === "categories" && (
          <Table>
            <TableHeader className="bg-slate-50/75 border-b border-slate-200">
              <TableRow>
                <TableHead className="text-xs font-semibold text-slate-600 w-16 text-center">ลำดับ</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">รหัสหมวดหมู่ (Code)</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">ชื่อหมวดหมู่สินค้า</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">คำอธิบาย</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">ป้ายกำกับ (Badge)</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">สถานะ</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {masterData.categories
                .filter(
                  (c) =>
                    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    c.code.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((c, idx) => (
                  <TableRow key={c.id} className="hover:bg-slate-50/60">
                    <TableCell className="py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-mono text-xs font-semibold text-slate-500 w-5">{c.displayOrder || idx + 1}</span>
                        <div className="flex flex-col">
                          <button
                            type="button"
                            onClick={() => handleMoveOrder(idx, "UP")}
                            disabled={idx === 0}
                            className="p-0.5 text-slate-400 hover:text-blue-600 disabled:opacity-30"
                            title="เลื่อนขึ้น"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveOrder(idx, "DOWN")}
                            disabled={idx === masterData.categories.length - 1}
                            className="p-0.5 text-slate-400 hover:text-blue-600 disabled:opacity-30"
                            title="เลื่อนลง"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                        {c.code}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="font-bold text-xs text-slate-900">{c.name}</div>
                    </TableCell>
                    <TableCell className="py-3 text-xs text-slate-600">{c.description}</TableCell>
                    <TableCell className="py-3 text-center">
                      {c.badge ? (
                        <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 font-mono">
                          {c.badge}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      {c.isActive ? (
                        <Badge variant="success" className="text-[10px]">เปิดใช้งาน</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">ปิด</Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                          title="แก้ไข"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.name)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          title="ลบ"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        )}

        {/* ================= TAB 4: BRANDS ================= */}
        {activeTab === "brands" && (
          <Table>
            <TableHeader className="bg-slate-50/75 border-b border-slate-200">
              <TableRow>
                <TableHead className="text-xs font-semibold text-slate-600 w-16 text-center">ลำดับ</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">ยี่ห้อ (Brand)</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">ประเทศผู้ผลิต</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-right">จำนวนรุ่นในระบบ</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">สถานะความนิยม</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">ป้ายกำกับ (Badge)</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {masterData.brands
                .filter((b) => b.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((b, idx) => (
                  <TableRow key={b.id} className="hover:bg-slate-50/60">
                    <TableCell className="py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-mono text-xs font-semibold text-slate-500 w-5">{b.displayOrder || idx + 1}</span>
                        <div className="flex flex-col">
                          <button
                            type="button"
                            onClick={() => handleMoveOrder(idx, "UP")}
                            disabled={idx === 0}
                            className="p-0.5 text-slate-400 hover:text-blue-600 disabled:opacity-30"
                            title="เลื่อนขึ้น"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveOrder(idx, "DOWN")}
                            disabled={idx === masterData.brands.length - 1}
                            className="p-0.5 text-slate-400 hover:text-blue-600 disabled:opacity-30"
                            title="เลื่อนลง"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="font-bold text-xs text-slate-900">{b.name}</div>
                    </TableCell>
                    <TableCell className="py-3 text-xs text-slate-600">{b.country}</TableCell>
                    <TableCell className="py-3 text-right font-mono text-xs text-slate-700">
                      {b.deviceCount} รุ่น
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      {b.popular ? (
                        <Badge variant="success" className="text-[10px]">ยอดนิยม (Top)</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">ทั่วไป</Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      {b.badge ? (
                        <span className="rounded bg-sky-50 border border-sky-200 px-2 py-0.5 text-[10px] font-semibold text-sky-700 font-mono">
                          {b.badge}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(b)}
                          className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                          title="แก้ไข"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(b.id, b.name)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          title="ลบ"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        )}

        {/* ================= TAB 5: DEVICE MODELS ================= */}
        {activeTab === "models" && (
          <Table>
            <TableHeader className="bg-slate-50/75 border-b border-slate-200">
              <TableRow>
                <TableHead className="text-xs font-semibold text-slate-600 w-16 text-center">ลำดับ</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">ยี่ห้อ & รุ่น (Brand / Model)</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">ซีรีส์ (Series)</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">ปีที่เปิดตัว</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">ขนาดหน้าจอ</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">ป้ายกำกับ (Badge)</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {masterData.models
                .filter(
                  (m) =>
                    m.modelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    m.brandName.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((m, idx) => (
                  <TableRow key={m.id} className="hover:bg-slate-50/60">
                    <TableCell className="py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-mono text-xs font-semibold text-slate-500 w-5">{m.displayOrder || idx + 1}</span>
                        <div className="flex flex-col">
                          <button
                            type="button"
                            onClick={() => handleMoveOrder(idx, "UP")}
                            disabled={idx === 0}
                            className="p-0.5 text-slate-400 hover:text-blue-600 disabled:opacity-30"
                            title="เลื่อนขึ้น"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveOrder(idx, "DOWN")}
                            disabled={idx === masterData.models.length - 1}
                            className="p-0.5 text-slate-400 hover:text-blue-600 disabled:opacity-30"
                            title="เลื่อนลง"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {m.brandName}
                        </span>
                        <span className="font-bold text-xs text-slate-900">{m.modelName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-xs text-slate-600">{m.series}</TableCell>
                    <TableCell className="py-3 text-center font-mono text-xs text-slate-700">{m.year}</TableCell>
                    <TableCell className="py-3 text-center font-mono text-xs text-slate-700">{m.screenSize}</TableCell>
                    <TableCell className="py-3 text-center">
                      {m.badge ? (
                        <span className="rounded bg-purple-50 border border-purple-200 px-2 py-0.5 text-[10px] font-semibold text-purple-700 font-mono">
                          {m.badge}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(m)}
                          className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                          title="แก้ไข"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(m.id, m.modelName)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          title="ลบ"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        )}

        {/* ================= TAB 6: CAPACITIES ================= */}
        {activeTab === "capacities" && (
          <Table>
            <TableHeader className="bg-slate-50/75 border-b border-slate-200">
              <TableRow>
                <TableHead className="text-xs font-semibold text-slate-600 w-16 text-center">ลำดับ</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">ความจุ (Capacity)</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">คำอธิบายการใช้งาน</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">สถานะใช้งาน</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {masterData.capacities.map((c, idx) => (
                <TableRow key={c.id} className="hover:bg-slate-50/60">
                  <TableCell className="py-3 text-center">
                    <span className="font-mono text-xs font-semibold text-slate-500">{c.displayOrder || idx + 1}</span>
                  </TableCell>
                  <TableCell className="py-3">
                    <span className="font-bold font-mono text-sm text-slate-900 bg-slate-100 px-3 py-1 rounded-md border border-slate-200">
                      {c.capacity} {c.unit}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 text-xs text-slate-600">{c.description}</TableCell>
                  <TableCell className="py-3 text-center">
                    {c.isActive ? (
                      <Badge variant="success" className="text-[10px]">เปิดใช้งาน</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">ปิด</Badge>
                    )}
                  </TableCell>
                  <TableCell className="py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                        title="แก้ไข"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id, `${c.capacity} ${c.unit}`)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                        title="ลบ"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* ================= TAB 7: COLORS ================= */}
        {activeTab === "colors" && (
          <Table>
            <TableHeader className="bg-slate-50/75 border-b border-slate-200">
              <TableRow>
                <TableHead className="text-xs font-semibold text-slate-600 w-16 text-center">ลำดับ</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">ตัวอย่างสี (Swatch)</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">ชื่อภาษาไทย</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">ชื่อภาษาอังกฤษ (Official)</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">รหัสสี Hex</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {masterData.colors.map((col, idx) => (
                <TableRow key={col.id} className="hover:bg-slate-50/60">
                  <TableCell className="py-3 text-center">
                    <span className="font-mono text-xs font-semibold text-slate-500">{col.displayOrder || idx + 1}</span>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="h-6 w-6 rounded-full border border-slate-300 shadow-2xs"
                        style={{ backgroundColor: col.hexCode }}
                      />
                      <span className="font-mono text-xs text-slate-500">{col.hexCode}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 font-semibold text-xs text-slate-900">{col.nameTh}</TableCell>
                  <TableCell className="py-3 text-xs text-slate-600">{col.nameEn}</TableCell>
                  <TableCell className="py-3 text-center font-mono text-xs text-slate-600">{col.hexCode}</TableCell>
                  <TableCell className="py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(col)}
                        className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                        title="แก้ไข"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(col.id, col.nameTh)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                        title="ลบ"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Add / Edit Master Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogHeader>
          <DialogTitle onClose={() => setModalOpen(false)}>
            {editingId ? "แก้ไขข้อมูลหลัก" : "เพิ่มข้อมูลหลักใหม่"}: {activeTab.toUpperCase()}
          </DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-4">
          {/* SYMPTOMS FORM */}
          {activeTab === "symptoms" && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">ชื่ออาการเสีย *</label>
                <Input
                  placeholder="เช่น หน้าจอแตก, แบตเตอรี่เสื่อมสภาพ, เครื่องเปิดไม่ติด..."
                  value={formSymptom.name || ""}
                  onChange={(e) => setFormSymptom({ ...formSymptom, name: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">รายละเอียดขอบเขตงานซ่อม</label>
                <textarea
                  rows={2}
                  placeholder="เช่น เปลี่ยนเฉพาะก้อนแบตเตอรี่แท้ มอก. พร้อมซีลขอบจอ..."
                  value={formSymptom.description || ""}
                  onChange={(e) => setFormSymptom({ ...formSymptom, description: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">ค่าแรงมาตรฐาน (บาท) *</label>
                  <Input
                    type="number"
                    value={formSymptom.baseLaborFee ?? 800}
                    onChange={(e) => setFormSymptom({ ...formSymptom, baseLaborFee: Number(e.target.value) })}
                    className="text-xs h-9 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">เวลาโดยเฉลี่ย (ชม.)</label>
                  <Input
                    type="number"
                    step="0.5"
                    value={formSymptom.estimatedHours ?? 1.0}
                    onChange={(e) => setFormSymptom({ ...formSymptom, estimatedHours: Number(e.target.value) })}
                    className="text-xs h-9 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">ระดับความสำคัญ</label>
                  <select
                    value={formSymptom.priority || "HIGH"}
                    onChange={(e) => setFormSymptom({ ...formSymptom, priority: e.target.value as any })}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 bg-white"
                  >
                    <option value="HIGH">ด่วน / สูง</option>
                    <option value="MEDIUM">ปานกลาง</option>
                    <option value="NORMAL">ปกติ</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">ป้ายกำกับ (Badge)</label>
                  <Input
                    placeholder="เช่น ด่วน / บ่อยสุด, ประกัน 1 ปี..."
                    value={formSymptom.badge || ""}
                    onChange={(e) => setFormSymptom({ ...formSymptom, badge: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">ลำดับแสดงผล (Order)</label>
                  <Input
                    type="number"
                    value={formSymptom.displayOrder ?? 1}
                    onChange={(e) => setFormSymptom({ ...formSymptom, displayOrder: Number(e.target.value) })}
                    className="text-xs h-9 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SERVICES FORM */}
          {activeTab === "services" && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">รหัสบริการ (Code) *</label>
                  <Input
                    placeholder="เช่น EXPRESS_REP"
                    value={formService.code || ""}
                    onChange={(e) => setFormService({ ...formService, code: e.target.value.toUpperCase() })}
                    className="text-xs h-9 font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">ชื่องานบริการ *</label>
                  <Input
                    placeholder="เช่น บริการซ่อมด่วนรอรับเครื่องได้..."
                    value={formService.name || ""}
                    onChange={(e) => setFormService({ ...formService, name: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">รายละเอียดขอบเขตงาน</label>
                <textarea
                  rows={2}
                  placeholder="เช่น ซ่อมด่วนภายใน 30-60 นาทีพร้อมห้องพักรับรอง..."
                  value={formService.description || ""}
                  onChange={(e) => setFormService({ ...formService, description: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">ราคามาตรฐาน (บาท) *</label>
                  <Input
                    type="number"
                    value={formService.standardPrice ?? 300}
                    onChange={(e) => setFormService({ ...formService, standardPrice: Number(e.target.value) })}
                    className="text-xs h-9 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">เวลาประเมิน (นาที)</label>
                  <Input
                    type="number"
                    value={formService.estimatedMinutes ?? 30}
                    onChange={(e) => setFormService({ ...formService, estimatedMinutes: Number(e.target.value) })}
                    className="text-xs h-9 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">ป้ายกำกับ (Badge)</label>
                  <Input
                    placeholder="เช่น ยอดนิยม, ฟรี 100%..."
                    value={formService.badge || ""}
                    onChange={(e) => setFormService({ ...formService, badge: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>
              </div>
            </div>
          )}

          {/* CATEGORIES FORM */}
          {activeTab === "categories" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">รหัสหมวดหมู่ (Code) *</label>
                  <Input
                    placeholder="เช่น DEVICE, ACCESSORY, SPARE_PART..."
                    value={formCategory.code || ""}
                    onChange={(e) => setFormCategory({ ...formCategory, code: e.target.value.toUpperCase() })}
                    className="text-xs h-9 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">ชื่อหมวดหมู่สินค้า *</label>
                  <Input
                    placeholder="เช่น สมาร์ทโฟน & แท็บเล็ต..."
                    value={formCategory.name || ""}
                    onChange={(e) => setFormCategory({ ...formCategory, name: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">รายละเอียดคำอธิบาย</label>
                <textarea
                  rows={2}
                  placeholder="เช่น อุปกรณ์เสริม เคส ฟิล์มกระจก หูฟัง..."
                  value={formCategory.description || ""}
                  onChange={(e) => setFormCategory({ ...formCategory, description: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">ป้ายกำกับ (Badge)</label>
                  <Input
                    placeholder="เช่น ขายดี, ยอดนิยม..."
                    value={formCategory.badge || ""}
                    onChange={(e) => setFormCategory({ ...formCategory, badge: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">ลำดับแสดงผล</label>
                  <Input
                    type="number"
                    value={formCategory.displayOrder ?? 1}
                    onChange={(e) => setFormCategory({ ...formCategory, displayOrder: Number(e.target.value) })}
                    className="text-xs h-9 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* BRANDS FORM */}
          {activeTab === "brands" && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">ชื่อยี่ห้อ (Brand Name) *</label>
                <Input
                  placeholder="เช่น Sony, Nothing Phone, Asus ROG..."
                  value={formBrand.name || ""}
                  onChange={(e) => setFormBrand({ ...formBrand, name: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">ประเทศต้นกำเนิด</label>
                  <Input
                    placeholder="เช่น สหรัฐอเมริกา, ญี่ปุ่น, เกาหลีใต้..."
                    value={formBrand.country || ""}
                    onChange={(e) => setFormBrand({ ...formBrand, country: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">ป้ายกำกับ (Badge)</label>
                  <Input
                    placeholder="เช่น Flagship, Top Brand..."
                    value={formBrand.badge || ""}
                    onChange={(e) => setFormBrand({ ...formBrand, badge: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="brandPopularCheck"
                  checked={Boolean(formBrand.popular)}
                  onChange={(e) => setFormBrand({ ...formBrand, popular: e.target.checked })}
                  className="rounded text-blue-600 h-4 w-4"
                />
                <label htmlFor="brandPopularCheck" className="text-xs font-medium text-slate-700 cursor-pointer">
                  ติดแท็กยี่ห้อยอดนิยม (Popular Brand)
                </label>
              </div>
            </div>
          )}

          {/* MODELS FORM */}
          {activeTab === "models" && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">เลือกยี่ห้อ (Brand) *</label>
                <select
                  value={formModel.brandName || masterData.brands[0]?.name || "Apple"}
                  onChange={(e) => setFormModel({ ...formModel, brandName: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 bg-white"
                >
                  {masterData.brands.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">ชื่อรุ่นสมาร์ทโฟน *</label>
                <Input
                  placeholder="เช่น iPhone 16 Pro Max, Galaxy Z Flip 6..."
                  value={formModel.modelName || ""}
                  onChange={(e) => setFormModel({ ...formModel, modelName: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">ซีรีส์ (Series)</label>
                  <Input
                    placeholder="เช่น iPhone 16 Series..."
                    value={formModel.series || ""}
                    onChange={(e) => setFormModel({ ...formModel, series: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">ป้ายกำกับ (Badge)</label>
                  <Input
                    placeholder="เช่น เรือธง, Galaxy AI, Leica..."
                    value={formModel.badge || ""}
                    onChange={(e) => setFormModel({ ...formModel, badge: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">ปีที่เปิดตัว</label>
                  <Input
                    type="number"
                    value={formModel.year ?? 2024}
                    onChange={(e) => setFormModel({ ...formModel, year: Number(e.target.value) })}
                    className="text-xs h-9 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">ขนาดหน้าจอ</label>
                  <Input
                    placeholder='เช่น 6.7"'
                    value={formModel.screenSize || ""}
                    onChange={(e) => setFormModel({ ...formModel, screenSize: e.target.value })}
                    className="text-xs h-9 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* CAPACITIES FORM */}
          {activeTab === "capacities" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">ตัวเลขความจุ *</label>
                  <Input
                    placeholder="เช่น 128"
                    value={formCapacity.capacity || ""}
                    onChange={(e) => setFormCapacity({ ...formCapacity, capacity: e.target.value })}
                    className="text-xs h-9 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">หน่วย *</label>
                  <select
                    value={formCapacity.unit || "GB"}
                    onChange={(e) => setFormCapacity({ ...formCapacity, unit: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 bg-white"
                  >
                    <option value="GB">GB</option>
                    <option value="TB">TB</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">คำอธิบายการใช้งาน</label>
                <Input
                  placeholder="เช่น ความจุมาตรฐาน ยอดนิยมที่สุด..."
                  value={formCapacity.description || ""}
                  onChange={(e) => setFormCapacity({ ...formCapacity, description: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
            </div>
          )}

          {/* COLORS FORM */}
          {activeTab === "colors" && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">ชื่อสีภาษาไทย *</label>
                <Input
                  placeholder="เช่น ไทเทเนียมธรรมชาติ"
                  value={formColor.nameTh || ""}
                  onChange={(e) => setFormColor({ ...formColor, nameTh: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">ชื่อสีภาษาอังกฤษ *</label>
                <Input
                  placeholder="เช่น Natural Titanium"
                  value={formColor.nameEn || ""}
                  onChange={(e) => setFormColor({ ...formColor, nameEn: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">รหัสสี Hex (#RRGGBB)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formColor.hexCode || "#000000"}
                    onChange={(e) => setFormColor({ ...formColor, hexCode: e.target.value })}
                    className="h-9 w-12 rounded cursor-pointer border border-slate-300 p-0.5"
                  />
                  <Input
                    value={formColor.hexCode || "#000000"}
                    onChange={(e) => setFormColor({ ...formColor, hexCode: e.target.value })}
                    className="text-xs h-9 font-mono uppercase"
                  />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setModalOpen(false)} className="text-xs">
            ยกเลิก
          </Button>
          <Button
            onClick={handleSaveModal}
            disabled={saving}
            className="text-xs bg-blue-600 text-white hover:bg-blue-700"
          >
            {saving ? "กำลังบันทึก..." : editingId ? "บันทึกการแก้ไข" : "บันทึกข้อมูล"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
