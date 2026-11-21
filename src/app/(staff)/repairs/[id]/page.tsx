"use client";
import { CustomerQuotePanel } from "@/components/repairs/CustomerQuotePanel";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import confetti from "canvas-confetti";
import {
  Wrench,
  ArrowLeft,
  Smartphone,
  User,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Printer,
  ShieldCheck,
  Plus,
  Trash2,
  ExternalLink,
  Lock,
  DollarSign,
  TrendingUp,
  FileCheck2,
  RotateCcw,
  Sparkles,
  Camera,
  Eye,
} from "lucide-react";
import { CameraCaptureModal } from "@/components/common/CameraCaptureModal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { RepairStatusMap, RepairStatusType } from "@/types";
import { formatTHB, formatDateThai } from "@/lib/utils";
import { useApp } from "@/context/AppContext";
import { PatternLockCanvas } from "@/components/repairs/PatternLockCanvas";
import { ThermalSlipModal } from "@/components/repairs/ThermalSlipModal";
import { WarrantyDeliveryPrint } from "@/components/repairs/WarrantyDeliveryPrint";
import { PartsPickerModal } from "@/components/repairs/PartsPickerModal";

const STATE_FLOW: {
  status: RepairStatusType;
  label: string;
  nextAllowed: RepairStatusType[];
}[] = [
  { status: "PENDING", label: "รอตรวจรับ", nextAllowed: ["DIAGNOSING", "WAITING_PARTS", "REPAIRING", "CANCELLED"] },
  { status: "DIAGNOSING", label: "กำลังตรวจเช็ค", nextAllowed: ["WAITING_PARTS", "REPAIRING", "CANCELLED"] },
  { status: "WAITING_PARTS", label: "รออะไหล่", nextAllowed: ["REPAIRING", "CANCELLED"] },
  { status: "REPAIRING", label: "กำลังซ่อม", nextAllowed: ["QC_PASSED", "READY", "WAITING_PARTS", "CANCELLED"] },
  { status: "QC_PASSED", label: "ผ่าน QC แล้ว", nextAllowed: ["READY", "REPAIRING", "CANCELLED"] },
  { status: "READY", label: "พร้อมส่งมอบ", nextAllowed: ["COMPLETED", "REPAIRING", "CANCELLED"] },
  { status: "COMPLETED", label: "ส่งมอบเสร็จสิ้น", nextAllowed: [] },
  { status: "CANCELLED", label: "ยกเลิกงานซ่อม", nextAllowed: [] },
];

const POST_QC_ITEMS = [
  { key: "screen", label: "หน้าจอแสดงผล ไม่มีเดดพิกเซล / เส้นพาด" },
  { key: "touch", label: "ระบบสัมผัสลื่นไหล ตอบสนองทุกจุด 100%" },
  { key: "camera", label: "กล้องหน้าและหลัง โฟกัสชัด OIS นิ่ง" },
  { key: "audio", label: "ลำโพงสนทนา ลำโพงล่าง ไมโครโฟนชัดเจน" },
  { key: "charging", label: "ระบบชาร์จไฟ กระแสปกติ ชาร์จด่วนเข้า" },
  { key: "biometrics", label: "สแกนใบหน้า / สแกนลายนิ้วมือ ใช้งานได้" },
  { key: "wifi", label: "Wi-Fi & Bluetooth สัญญาณแรง เชื่อมต่อปกติ" },
  { key: "buttons", label: "ปุ่มเปิดปิด ปรับระดับเสียง สวิตช์ปิดเสียงแน่น" },
  { key: "sensors", label: "เซนเซอร์แนบหู (Proximity) และหมุนจออัตโนมัติ" },
  { key: "cleanliness", label: "ทำความสะอาดตัวเครื่อง ติดกาว/ซีลสนิทเรียบร้อย" },
];

export default function TechnicianWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const { users, currentUser } = useApp();
  const id = params.id as string;
  const isTechnician = currentUser.role === "TECHNICIAN";

  const [job, setJob] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Modals
  const [showThermalSlip, setShowThermalSlip] = useState(false);
  const [showWarrantyPrint, setShowWarrantyPrint] = useState(false);
  const [showPartsPicker, setShowPartsPicker] = useState(false);

  // Editable local state
  const [technicianNotes, setTechnicianNotes] = useState("");
  const [laborFeeInput, setLaborFeeInput] = useState<number>(0);
  const [discountInput, setDiscountInput] = useState<number>(0);
  const [depositInput, setDepositInput] = useState<number>(0);
  const [taxRateInput, setTaxRateInput] = useState<number>(0);
  const [warrantyDaysInput, setWarrantyDaysInput] = useState<number>(90);
  const [postQcState, setPostQcState] = useState<Record<string, boolean>>({});

  const fetchJob = async () => {
    try {
      const res = await fetch(`/api/repairs/${id}`);
      const json = await res.json();
      if (json.success) {
        setJob(json.data);
        setTechnicianNotes(json.data.notes || "");
        setLaborFeeInput(json.data.laborFee || 0);
        setDiscountInput(json.data.discount || 0);
        setDepositInput(json.data.depositAmount || 0);
        setTaxRateInput(json.data.taxRate || 0);
        setWarrantyDaysInput(json.data.warrantyDays || 90);

        if (json.data.postCheckData) {
          try {
            const parsed = typeof json.data.postCheckData === "string"
              ? JSON.parse(json.data.postCheckData)
              : json.data.postCheckData;
            setPostQcState(parsed);
          } catch (e) {
            console.error(e);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJob();
  }, [id]);

  // Repair Photos State & Handlers
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  const repairPhotos: string[] = job?.photos
    ? Array.isArray(job.photos)
      ? job.photos
      : typeof job.photos === "string"
      ? (() => {
          try {
            const parsed = JSON.parse(job.photos);
            return Array.isArray(parsed) ? parsed : [job.photos];
          } catch {
            return [job.photos];
          }
        })()
      : []
    : [];

  const handleAddRepairPhoto = async (newUrl: string) => {
    if (!job) return;
    const updated = [...repairPhotos, newUrl];
    try {
      await fetch(`/api/repairs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos: updated }),
      });
      setJob((prev: any) => ({ ...prev, photos: updated }));
    } catch (e) {
      console.error("Save repair photo error:", e);
    }
  };

  const handleRemoveRepairPhoto = async (indexToRemove: number) => {
    if (!job) return;
    const updated = repairPhotos.filter((_, i) => i !== indexToRemove);
    try {
      await fetch(`/api/repairs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos: updated }),
      });
      setJob((prev: any) => ({ ...prev, photos: updated }));
    } catch (e) {
      console.error("Delete repair photo error:", e);
    }
  };

  // Transition state
  const handleTransitionState = async (newStatus: RepairStatusType) => {
    if (!job) return;
    const APPROVAL_REQUIRED: RepairStatusType[] = ["REPAIRING", "QC_PASSED", "READY", "COMPLETED"];
    if (APPROVAL_REQUIRED.includes(newStatus) && !job.customerApproved) {
      alert("กรุณารอการอนุมัติใบเสนอราคาจากลูกค้าก่อนดำเนินการขั้นตอนนี้ (หรือยืนยันใบเสนอราคาในส่วนด้านบน)");
      return;
    }
    setUpdating(true);
    try {
      const res = await fetch(`/api/repairs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setJob(json.data);
        if (newStatus === "COMPLETED" || newStatus === "QC_PASSED") {
          confetti({ particleCount: 80, spread: 60 });
        }
      } else {
        alert(json.error || "Failed to update status");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdating(false);
    }
  };

  // Save technician updates
  const handleSaveWorkspace = async () => {
    if (!job) return;
    setUpdating(true);
    try {
      const payload: any = {
        notes: technicianNotes,
        postCheckData: postQcState,
      };
      if (!isTechnician) {
        payload.laborFee = Number(laborFeeInput) || 0;
        payload.discount = Number(discountInput) || 0;
        payload.depositAmount = Number(depositInput) || 0;
        payload.taxRate = Number(taxRateInput) || 0;
        payload.warrantyDays = Number(warrantyDaysInput) || 90;
      }

      const res = await fetch(`/api/repairs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setJob(json.data);
        alert("บันทึกการปรับปรุงข้อมูลเรียบร้อยแล้ว");
      } else {
        alert(json.error || "Failed to save workspace");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdating(false);
    }
  };

  // Assign Technician
  const handleAssignTech = async (techId: string) => {
    if (!job) return;
    try {
      const res = await fetch(`/api/repairs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ technicianId: techId || null }),
      });
      const json = await res.json();
      if (json.success) {
        setJob(json.data);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Remove Part Usage
  const handleRemovePart = async (usageId: string) => {
    if (!confirm("ต้องการยกเลิกการเบิกอะไหล่รายการนี้และคืนเข้าสต็อกหรือไม่?")) return;
    try {
      const res = await fetch(`/api/repairs/${job.id}/parts?usageId=${usageId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setJob(json.data);
      } else {
        alert(json.error);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Toggle Post QC Check
  const handleToggleQcItem = (key: string) => {
    setPostQcState((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handlePassAllPostQc = () => {
    const allPass: Record<string, boolean> = {};
    POST_QC_ITEMS.forEach((item) => {
      allPass[item.key] = true;
    });
    setPostQcState(allPass);
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 text-xs">
        กำลังโหลดข้อมูลโต๊ะงานช่างเทคนิค...
      </div>
    );
  }

  if (!job) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="text-sm font-semibold text-slate-800">ไม่พบข้อมูลใบงานซ่อมนี้</div>
        <Link href="/repairs">
          <Button variant="outline" size="sm">
            กลับหน้ารายการ
          </Button>
        </Link>
      </div>
    );
  }

  const statusInfo =
    RepairStatusMap[job.status as RepairStatusType] || {
      label: job.status,
      color: "text-slate-700",
      bg: "bg-slate-50",
      border: "border-slate-200",
    };

  const currentStatusConfig = STATE_FLOW.find((s) => s.status === job.status);

  // Financial calculations live
  const partsSellTotal =
    job.partUsages?.reduce(
      (sum: number, p: any) => sum + p.sellPrice * p.quantity,
      0
    ) || 0;
  const partsCostTotal =
    job.partUsages?.reduce(
      (sum: number, p: any) => sum + p.costPrice * p.quantity,
      0
    ) || 0;
  const currentLaborFee = Math.max(0, Number(laborFeeInput) || 0);
  const currentDiscount = Math.max(0, Number(discountInput) || 0);
  const currentDeposit = Math.max(0, Number(depositInput) || 0);
  const currentTaxRate = Math.max(0, Number(taxRateInput) || 0);

  const subtotal = Math.max(0, currentLaborFee + partsSellTotal);
  const discountedSubtotal = Math.max(0, subtotal - currentDiscount);
  const vatAmount = currentTaxRate > 0 ? Math.round(discountedSubtotal * (currentTaxRate / 100) * 100) / 100 : 0;
  const totalCustomerCost = Math.round((discountedSubtotal + vatAmount) * 100) / 100;
  const remainingBalance = Math.max(0, totalCustomerCost - currentDeposit);

  const grossProfit = Math.max(0, totalCustomerCost - partsCostTotal);
  const partsGrossProfit = Math.max(0, partsSellTotal - partsCostTotal);
  // Technician Commission: 30% on labor fee + 10% on spare parts GP
  const techCommission = currentLaborFee * 0.30 + partsGrossProfit * 0.10;

  let preCheckParsed: Record<string, string> = {};
  if (job.preCheckData) {
    if (typeof job.preCheckData === "string") {
      try {
        preCheckParsed = JSON.parse(job.preCheckData);
      } catch {
        preCheckParsed = {};
      }
    } else {
      preCheckParsed = job.preCheckData;
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <CustomerQuotePanel jobId={job.id} />
      {/* Top Navigation & Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <Link href="/repairs">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-black text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded">
                {job.trackingCode}
              </span>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusInfo.bg} ${statusInfo.color} ${statusInfo.border}`}
              >
                {statusInfo.label}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">
              {job.deviceBrand} {job.deviceModel}
              {job.deviceColor ? ` • ${job.deviceColor}` : ""}
            </h1>
          </div>
        </div>

        {/* Action Buttons Header */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowThermalSlip(true)}
            className="text-xs gap-1.5"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>สลิป 80mm</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowWarrantyPrint(true)}
            className="text-xs gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>ใบรับประกัน & ส่งมอบ</span>
          </Button>

          <Link href={`/track/${job.trackingCode}`} target="_blank">
            <Button variant="secondary" size="sm" className="text-xs gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" />
              <span>หน้าลูกค้า</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* State Machine Transition Bar */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50/50 to-indigo-50/30">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                สถานะปัจจุบัน (Current State)
              </span>
              <div className="text-base font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>{statusInfo.label}</span>
              </div>
            </div>

            {/* Allowed Next Transitions */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">เปลี่ยนขั้นตอนต่อไป:</span>
              {currentStatusConfig?.nextAllowed.map((nextStatus) => {
                const nextInfo = RepairStatusMap[nextStatus];
                const isComplete = nextStatus === "COMPLETED";
                const isCancel = nextStatus === "CANCELLED";
                const requiresApproval =
                  ["REPAIRING", "QC_PASSED", "READY", "COMPLETED"].includes(nextStatus) &&
                  !job.customerApproved;

                return (
                  <Button
                    key={nextStatus}
                    size="sm"
                    disabled={updating || requiresApproval}
                    onClick={() => handleTransitionState(nextStatus)}
                    title={requiresApproval ? "ต้องรอการอนุมัติใบเสนอราคาจากลูกค้าก่อนดำเนินการ" : undefined}
                    className={`h-8 text-xs font-semibold gap-1.5 shadow-xs ${
                      requiresApproval
                        ? "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed"
                        : isComplete
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : isCancel
                        ? "bg-rose-600 hover:bg-rose-700 text-white"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>&rarr; {nextInfo?.label || nextStatus}</span>
                    {requiresApproval && <span className="text-[10px] font-normal">(รออนุมัติราคา)</span>}
                  </Button>
                );
              })}
              {currentUser.role === "ADMIN" && (job.status === "COMPLETED" || job.status === "CANCELLED") && (
                <Button
                  size="sm"
                  disabled={updating}
                  onClick={() => handleTransitionState("PENDING")}
                  className="h-8 text-xs font-semibold gap-1.5 shadow-xs bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>&rarr; เปิดงานซ่อมใหม่ (Reopen)</span>
                </Button>
              )}
            </div>
          </div>

          {/* Stepper Dots Timeline */}
          <div className="grid grid-cols-2 sm:grid-cols-7 gap-1.5 pt-2 border-t border-blue-100">
            {STATE_FLOW.filter((s) => s.status !== "CANCELLED").map((step, idx) => {
              const isCurrent = job.status === step.status;
              const stepIdx = STATE_FLOW.findIndex((s) => s.status === step.status);
              const currentIdx = STATE_FLOW.findIndex((s) => s.status === job.status);
              const isPast = currentIdx > stepIdx;

              return (
                <div
                  key={step.status}
                  className={`p-2 rounded-lg text-center text-[11px] font-medium transition-all ${
                    isCurrent
                      ? "bg-blue-600 text-white shadow-xs font-bold"
                      : isPast
                      ? "bg-blue-100 text-blue-800"
                      : "bg-white/80 text-slate-400 border border-slate-200"
                  }`}
                >
                  <div className="truncate">
                    {idx + 1}. {step.label}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Spare Parts, Post QC, Notes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Spare Parts Picker & Live Financial Calculator */}
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <CardTitle className="text-base text-slate-900 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-blue-600" />
                  <span>อะไหล่ที่เบิกใช้ & คำนวณกำไรสด (Spare Parts & Profit)</span>
                </CardTitle>
                <CardDescription>
                  เบิกอะไหล่จากคลัง ตัดสต็อกสาขาอัตโนมัติ และคำนวณกำไรขั้นต้น Real-time
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setShowPartsPicker(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 h-8"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เบิกอะไหล่เพิ่ม</span>
              </Button>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Parts Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-semibold">
                    <tr>
                      <th className="p-2.5">รายการอะไหล่</th>
                      <th className="p-2.5 text-center">จำนวน</th>
                      <th className="p-2.5 text-right">ต้นทุน/ชิ้น</th>
                      <th className="p-2.5 text-right">ราคาขาย/ชิ้น</th>
                      <th className="p-2.5 text-right">รวมเงิน</th>
                      <th className="p-2.5 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {job.partUsages?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-slate-400">
                          ยังไม่มีการเบิกใช้อะไหล่ในใบงานนี้ (กดปุ่ม เบิกอะไหล่เพิ่ม ด้านบน)
                        </td>
                      </tr>
                    ) : (
                      job.partUsages.map((usage: any) => (
                        <tr key={usage.id} className="hover:bg-slate-50">
                          <td className="p-2.5">
                            <div className="font-semibold text-slate-900">
                              {usage.product?.name}
                            </div>
                            <div className="font-mono text-[10px] text-slate-400">
                              {usage.product?.code}
                            </div>
                          </td>
                          <td className="p-2.5 text-center font-bold">
                            {usage.quantity}
                          </td>
                          <td className="p-2.5 text-right text-slate-500 font-mono">
                            {formatTHB(usage.costPrice)}
                          </td>
                          <td className="p-2.5 text-right font-semibold text-slate-900 font-mono">
                            {formatTHB(usage.sellPrice)}
                          </td>
                          <td className="p-2.5 text-right font-bold text-blue-700 font-mono">
                            {formatTHB(usage.sellPrice * usage.quantity)}
                          </td>
                          <td className="p-2.5 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemovePart(usage.id)}
                              className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                              title="คืนสต็อก"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Financial Calculation Inputs & Live Summary */}
              <div className="space-y-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                {/* Inputs Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">
                      ค่าแรงช่าง (บาท) {isTechnician && <span className="text-amber-600 text-[10px]">(อ่านอย่างเดียว)</span>}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      disabled={isTechnician}
                      value={laborFeeInput}
                      onChange={(e) => setLaborFeeInput(Number(e.target.value))}
                      className="text-xs font-bold h-8 font-mono bg-white disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">
                      ส่วนลด (บาท) {isTechnician && <span className="text-amber-600 text-[10px]">(อ่านอย่างเดียว)</span>}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      disabled={isTechnician}
                      value={discountInput}
                      onChange={(e) => setDiscountInput(Number(e.target.value))}
                      placeholder="0"
                      className="text-xs font-bold h-8 font-mono bg-white disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">
                      ภาษี VAT {isTechnician && <span className="text-amber-600 text-[10px]">(อ่านอย่างเดียว)</span>}
                    </label>
                    <select
                      disabled={isTechnician}
                      value={taxRateInput}
                      onChange={(e) => setTaxRateInput(Number(e.target.value))}
                      className="w-full text-xs font-bold h-8 font-mono rounded-lg border border-slate-300 bg-white px-2 disabled:bg-slate-100 disabled:text-slate-500"
                    >
                      <option value={0}>ไม่มี VAT (0%)</option>
                      <option value={7}>VAT 7%</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">
                      เงินมัดจำล่วงหน้า (บาท) {isTechnician && <span className="text-amber-600 text-[10px]">(อ่านอย่างเดียว)</span>}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      disabled={isTechnician}
                      value={depositInput}
                      onChange={(e) => setDepositInput(Number(e.target.value))}
                      placeholder="0"
                      className="text-xs font-bold h-8 font-mono bg-white disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>
                </div>

                {/* Calculation Breakdown Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 pt-2 border-t border-slate-200">
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <div className="text-[10px] text-slate-500">รวมค่าแรง + อะไหล่</div>
                    <div className="text-xs font-bold text-slate-800 mt-1 font-mono">
                      {formatTHB(subtotal)}
                    </div>
                  </div>

                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <div className="text-[10px] text-slate-500">หักส่วนลด</div>
                    <div className="text-xs font-bold text-rose-600 mt-1 font-mono">
                      - {formatTHB(currentDiscount)}
                    </div>
                  </div>

                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <div className="text-[10px] text-slate-500">VAT {currentTaxRate > 0 ? "7%" : "(0%)"}</div>
                    <div className="text-xs font-bold text-slate-700 mt-1 font-mono">
                      + {formatTHB(vatAmount)}
                    </div>
                  </div>

                  <div className="bg-blue-50/70 p-2 rounded-lg border border-blue-200">
                    <div className="text-[10px] font-bold text-blue-900">ยอดสุทธิรวมทั้งสิ้น</div>
                    <div className="text-sm font-black text-blue-700 mt-0.5 font-mono">
                      {formatTHB(totalCustomerCost)}
                    </div>
                  </div>

                  <div className="bg-emerald-50/70 p-2 rounded-lg border border-emerald-200">
                    <div className="text-[10px] font-bold text-emerald-900">มัดจำชำระแล้ว</div>
                    <div className="text-xs font-bold text-emerald-700 mt-1 font-mono">
                      {formatTHB(currentDeposit)}
                    </div>
                  </div>

                  <div className="bg-amber-50 p-2 rounded-lg border border-amber-300">
                    <div className="text-[10px] font-bold text-amber-900">คงเหลือชำระวันรับ</div>
                    <div className="text-sm font-black text-amber-800 mt-0.5 font-mono">
                      {formatTHB(remainingBalance)}
                    </div>
                  </div>
                </div>

                {/* Profit & Commission Indicators */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div className="bg-emerald-50/50 p-2 rounded-lg border border-emerald-200 flex items-center justify-between">
                    <div className="text-[10px] font-bold text-emerald-800 uppercase flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-emerald-600" />
                      กำไรขั้นต้นร้าน (GP)
                    </div>
                    <div className="text-xs font-black text-emerald-700 font-mono">
                      {formatTHB(grossProfit)}
                    </div>
                  </div>

                  <div className="bg-indigo-50/50 p-2 rounded-lg border border-indigo-200 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-indigo-800 uppercase flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-indigo-600" />
                        คอมมิชชั่นช่าง
                      </div>
                      <div className="text-[9px] text-indigo-600">30% ค่าแรง + 10% GP อะไหล่</div>
                    </div>
                    <div className="text-xs font-black text-indigo-700 font-mono">
                      {formatTHB(techCommission)}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Post-repair QC Checklist */}
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <CardTitle className="text-base text-slate-900 flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-emerald-600" />
                  <span>รายการตรวจสอบคุณภาพหลังซ่อม (Post-Repair QC - 10 Checks)</span>
                </CardTitle>
                <CardDescription>
                  ตรวจเช็ค 10 รายการก่อนส่งมอบเครื่องให้ลูกค้า เพื่อรับประกันคุณภาพ
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePassAllPostQc}
                className="text-xs text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>ผ่านทั้งหมด</span>
              </Button>
            </CardHeader>
            <CardContent className="pt-4 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {POST_QC_ITEMS.map((item) => {
                  const isChecked = !!postQcState[item.key];
                  return (
                    <label
                      key={item.key}
                      onClick={() => handleToggleQcItem(item.key)}
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                        isChecked
                          ? "bg-emerald-50/70 border-emerald-300 text-emerald-900 font-semibold"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                      />
                      <span>{item.label}</span>
                    </label>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Repair Photos & Camera Evidence */}
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <CardTitle className="text-base text-slate-900 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-blue-600" />
                  <span>ภาพถ่ายงานซ่อม & หลักฐานตัวเครื่อง (Repair Photos & Camera)</span>
                </CardTitle>
                <CardDescription>
                  ถ่ายภาพขั้นตอนซ่อม อะไหล่ที่เปลี่ยน หรือสภาพเครื่องก่อน/หลังซ่อม
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPhotoModalOpen(true)}
                className="text-xs text-blue-700 border-blue-300 bg-blue-50 hover:bg-blue-100 gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>ถ่ายภาพ / เพิ่มรูป</span>
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              {repairPhotos.length === 0 ? (
                <div className="text-center py-8 px-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <Camera className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-600">ยังไม่มีภาพถ่ายในงานซ่อมนี้</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    กดปุ่ม &quot;ถ่ายภาพ / เพิ่มรูป&quot; เพื่อเปิดกล้องถ่ายภาพอะไหล่หรือสภาพเครื่อง
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {repairPhotos.map((url, idx) => (
                    <div
                      key={idx}
                      className="group relative h-28 rounded-xl border border-slate-200 overflow-hidden bg-slate-900 shadow-xs"
                    >
                      <img src={url} alt={`Repair photo ${idx + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPreviewPhotoUrl(url)}
                          className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-800"
                          title="ดูรูปขนาดใหญ่"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveRepairPhoto(idx)}
                          className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white"
                          title="ลบรูปภาพ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Camera Capture Modal for Repairs */}
          <CameraCaptureModal
            isOpen={isPhotoModalOpen}
            onClose={() => setIsPhotoModalOpen(false)}
            onCapture={handleAddRepairPhoto}
            title="ถ่ายภาพงานซ่อม / อะไหล่"
            guideType="device"
          />

          {/* Fullscreen Photo Lightbox */}
          {previewPhotoUrl && (
            <div
              onClick={() => setPreviewPhotoUrl(null)}
              className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
            >
              <div className="relative max-w-3xl max-h-[85vh]">
                <img
                  src={previewPhotoUrl}
                  alt="Full Preview"
                  className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
                />
                <p className="text-center text-xs text-white/70 mt-2">แตะหรือคลิกเพื่อปิด</p>
              </div>
            </div>
          )}

          {/* Technician Notes & Warranty Days */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base text-slate-900">
                บันทึกการทำงานของช่าง & ระยะรับประกัน (Technician Log)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  บันทึกอาการซ่อมจริง / การตรวจวัดทางอิเล็กทรอนิกส์
                </label>
                <textarea
                  rows={3}
                  value={technicianNotes}
                  onChange={(e) => setTechnicianNotes(e.target.value)}
                  placeholder="เช่น เปลี่ยนชิป IC ชาร์จ, เปลี่ยนกาวหน้าจอแท้, วัดกระแสไฟ 2.4A ผ่าน..."
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ระยะเวลารับประกันงานซ่อม (วัน) {isTechnician && <span className="text-amber-600 font-normal">(เฉพาะ Admin/Manager กำหนด)</span>}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    disabled={isTechnician}
                    value={warrantyDaysInput}
                    onChange={(e) => setWarrantyDaysInput(Number(e.target.value))}
                    className="text-xs font-mono disabled:bg-slate-100 disabled:text-slate-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    ค่ามาตรฐาน 90 วัน สำหรับอะไหล่แท้และเกรด A
                  </p>
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={handleSaveWorkspace}
                    disabled={updating}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs h-9"
                  >
                    {updating ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลงทั้งหมด"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1 Col): Device, Customer, Pattern Canvas, Pre-check */}
        <div className="space-y-6">
          {/* Customer & Technician Card */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                <span>ข้อมูลลูกค้า & ผู้ดูแล</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3 space-y-3 text-xs">
              <div>
                <div className="text-slate-400 text-[11px]">ชื่อลูกค้า</div>
                <div className="font-bold text-slate-900 text-sm">
                  {job.customer?.name}
                </div>
                <div className="font-mono text-slate-600">{job.customer?.phone}</div>
                {job.customer?.lineId && (
                  <div className="text-slate-500">LINE: {job.customer.lineId}</div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="block text-slate-400 text-[11px] mb-1">
                  มอบหมายช่างผู้รับผิดชอบ
                </label>
                <select
                  value={job.technicianId || ""}
                  onChange={(e) => handleAssignTech(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-1.5 bg-white font-medium text-slate-800"
                >
                  <option value="">-- ยังไม่มอบหมาย --</option>
                  {users
                    .filter((u) => u.role === "TECHNICIAN")
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.branchCode})
                      </option>
                    ))}
                </select>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                <div>สาขา: <span className="font-semibold text-slate-700">{job.branch?.name}</span></div>
                <div>วันที่รับเครื่อง: {formatDateThai(job.createdAt)}</div>
                {job.completedAt && (
                  <div>วันที่ส่งมอบ: {formatDateThai(job.completedAt)}</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Passcode & 3x3 Pattern Lock Replay Canvas */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-600" />
                <span>รหัสปลดล็อคหน้าจอเครื่อง</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3 space-y-3">
              {job.passcode && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                  <div className="text-[11px] text-blue-600 font-semibold">
                    PIN / Password:
                  </div>
                  <div className="font-mono text-xl font-black text-blue-900 tracking-wider mt-0.5">
                    {job.passcode}
                  </div>
                </div>
              )}

              {job.patternLock ? (
                <PatternLockCanvas value={job.patternLock} readonly={true} />
              ) : !job.passcode && (job.hasPasscode || job.hasPatternLock) ? (
                // API hides the secret unless ADMIN/MANAGER or the assigned technician.
                <div className="text-xs text-slate-500 text-center py-4">
                  มีรหัสล็อกเครื่อง (ดูได้เฉพาะผู้จัดการหรือช่างที่รับผิดชอบ)
                </div>
              ) : !job.passcode ? (
                <div className="text-xs text-slate-400 italic text-center py-4">
                  ไม่มีการบันทึกรหัสผ่านหน้าจอ
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Pre-check QC Inspection Summary */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-800">
                สภาพเครื่องตอนรับเข้า (Pre-check)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3 space-y-2 text-xs">
              <div className="p-2 bg-slate-50 rounded border border-slate-200 text-slate-700">
                <span className="font-semibold">อาการเสียที่แจ้ง: </span>
                {job.issueDescription}
              </div>

              <div className="divide-y divide-slate-100 text-[11px]">
                {Object.entries(preCheckParsed).map(([key, val]) => (
                  <div key={key} className="py-1.5 flex justify-between items-center">
                    <span className="text-slate-500 font-medium">{key}</span>
                    <span
                      className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                        val === "PASS" || val === "NORMAL" || val === "PRISTINE"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {val}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Repair Timeline & Status Audit Trail Card */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>ประวัติสถานะ & บันทึกติดตาม (Timeline)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              {job.statusEvents && job.statusEvents.length > 0 ? (
                <div className="relative pl-4 border-l-2 border-blue-200 space-y-3.5 my-1">
                  {job.statusEvents.map((evt: any) => {
                    const evtInfo =
                      RepairStatusMap[evt.status as RepairStatusType] || {
                        label: evt.status,
                        bg: "bg-slate-50",
                        color: "text-slate-700",
                        border: "border-slate-200",
                      };
                    return (
                      <div key={evt.id} className="relative text-xs">
                        <span className="absolute -left-[23px] top-1.5 h-2.5 w-2.5 rounded-full bg-blue-600 border-2 border-white ring-2 ring-blue-100" />
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${evtInfo.bg} ${evtInfo.color} ${evtInfo.border}`}
                          >
                            {evtInfo.label}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {formatDateThai(evt.occurredAt)}
                          </span>
                        </div>
                        <div className="text-slate-700 font-medium text-[11px] mt-1">
                          {evt.customerMessage}
                        </div>
                        {evt.actor && (
                          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>โดย: {evt.actor.name} ({evt.actor.role})</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic text-center py-4">
                  ยังไม่มีประวัติสถานะบันทึกไว้
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      {showThermalSlip && (
        <ThermalSlipModal
          isOpen={showThermalSlip}
          onClose={() => setShowThermalSlip(false)}
          job={job}
        />
      )}

      {showWarrantyPrint && (
        <WarrantyDeliveryPrint
          isOpen={showWarrantyPrint}
          onClose={() => setShowWarrantyPrint(false)}
          job={job}
        />
      )}

      {showPartsPicker && (
        <PartsPickerModal
          isOpen={showPartsPicker}
          onClose={() => setShowPartsPicker(false)}
          repairJobId={job.id}
          branchId={job.branchId}
          onPartAdded={(updated) => setJob(updated)}
        />
      )}
    </div>
  );
}
