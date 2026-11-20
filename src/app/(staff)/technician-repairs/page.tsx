"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  DollarSign,
  TrendingUp,
  ExternalLink,
  Printer,
  Sparkles,
  ChevronRight,
  User,
  Smartphone,
  X,
  FileCheck2,
  KeyRound,
  Grid,
  Check,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { formatTHB, formatDateThai } from "@/lib/utils";
import { useApp } from "@/context/AppContext";
import { PartsPickerModal } from "@/components/repairs/PartsPickerModal";

const KANBAN_COLUMNS = [
  { id: "PENDING", label: "รับเครื่องใหม่ / รอดำเนินการ", color: "border-amber-300 bg-amber-50/50 text-amber-900" },
  { id: "DIAGNOSING", label: "กำลังตรวจเช็ค", color: "border-blue-300 bg-blue-50/40 text-blue-800" },
  { id: "WAITING_PARTS", label: "รออะไหล่", color: "border-purple-300 bg-purple-50/40 text-purple-800" },
  { id: "REPAIRING", label: "กำลังซ่อม", color: "border-indigo-300 bg-indigo-50/40 text-indigo-800" },
  { id: "READY", label: "ผ่าน QC / พร้อมส่งมอบ", color: "border-emerald-300 bg-emerald-50/40 text-emerald-800" },
];

const STANDARD_QC_ITEMS = [
  "หน้าจอแสดงผล (Display)",
  "ระบบสัมผัส (Touchscreen)",
  "การชาร์จแบตเตอรี่ (Charging)",
  "กล้องหน้า/หลัง (Cameras)",
  "ไมโครโฟนและลำโพง (Audio)",
  "Wi-Fi และสัญญาณมือถือ (Network)",
  "ปุ่มกดและเซ็นเซอร์ (Buttons/Sensors)",
];

export default function TechnicianRepairsKanbanPage() {
  const { users, currentUser } = useApp();
  const isTechnician = currentUser.role === "TECHNICIAN";
  const [repairs, setRepairs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTech, setSelectedTech] = useState<string>("ALL");

  // Selected repair for quick modal workbench
  const [activeJob, setActiveJob] = useState<any | null>(null);
  const [showPartsPicker, setShowPartsPicker] = useState(false);
  const [techNotes, setTechNotes] = useState("");
  const [laborFeeInput, setLaborFeeInput] = useState<number>(0);
  const [estimatedFinishInput, setEstimatedFinishInput] = useState<string>("");
  const [postCheckMap, setPostCheckMap] = useState<Record<string, string>>({});
  const [updating, setUpdating] = useState(false);
  const [passcodeCopied, setPasscodeCopied] = useState(false);

  // Set default filter: if user is technician, default to their own tasks
  useEffect(() => {
    if (isTechnician && currentUser?.id) {
      setSelectedTech(currentUser.id);
    }
  }, [isTechnician, currentUser?.id]);

  const fetchRepairs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/repairs");
      const json = await res.json();
      if (json.success) {
        setRepairs(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepairs();
  }, []);

  const handleOpenJob = (job: any) => {
    setActiveJob(job);
    setTechNotes(job.notes || "");
    setLaborFeeInput(job.laborFee || 0);

    if (job.estimatedFinish) {
      try {
        const d = new Date(job.estimatedFinish);
        const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setEstimatedFinishInput(iso);
      } catch {
        setEstimatedFinishInput("");
      }
    } else {
      setEstimatedFinishInput("");
    }

    if (job.postCheckData) {
      try {
        const parsed =
          typeof job.postCheckData === "string"
            ? JSON.parse(job.postCheckData)
            : job.postCheckData;
        setPostCheckMap(parsed || {});
      } catch {
        setPostCheckMap({});
      }
    } else {
      setPostCheckMap({});
    }
  };

  const handleStatusChange = async (jobId: string, newStatus: string) => {
    const repair = repairs.find((r) => r.id === jobId);
    const APPROVAL_REQUIRED = ["REPAIRING", "QC_PASSED", "READY", "COMPLETED"];
    if (APPROVAL_REQUIRED.includes(newStatus) && !repair?.customerApproved) {
      alert("กรุณารอการอนุมัติใบเสนอราคาจากลูกค้าก่อนดำเนินการขั้นตอนนี้");
      return;
    }

    const current = repair?.status;
    const steps =
      newStatus === "READY" && current === "REPAIRING"
        ? ["QC_PASSED", "READY"]
        : newStatus === "COMPLETED" && current === "QC_PASSED"
        ? ["READY", "COMPLETED"]
        : [newStatus];

    try {
      for (const step of steps) {
        const res = await fetch(`/api/repairs/${jobId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: step }),
        });
        const json = await res.json();
        if (!json.success) {
          alert(json.error || "เปลี่ยนสถานะไม่สำเร็จ");
          break;
        }
        if (step === newStatus && (newStatus === "READY" || newStatus === "COMPLETED")) {
          confetti({ particleCount: 80, spread: 60 });
        }
        if (activeJob && activeJob.id === jobId) {
          setActiveJob(json.data);
        }
      }
      fetchRepairs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleQuickSetFinishHours = (hours: number) => {
    const target = new Date(Date.now() + hours * 3600 * 1000);
    const iso = new Date(target.getTime() - target.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setEstimatedFinishInput(iso);
  };

  const handleQuickSetFinishTomorrow = (hour: number) => {
    const target = new Date();
    target.setDate(target.getDate() + 1);
    target.setHours(hour, 0, 0, 0);
    const iso = new Date(target.getTime() - target.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setEstimatedFinishInput(iso);
  };

  const handleClaimTicket = async () => {
    if (!activeJob || !currentUser?.id) return;
    try {
      const res = await fetch(`/api/repairs/${activeJob.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ technicianId: currentUser.id }),
      });
      const json = await res.json();
      if (json.success) {
        setActiveJob(json.data);
        fetchRepairs();
        alert("รับงานนี้เรียบร้อยแล้ว");
      } else {
        alert(json.error || "ไม่สามารถรับงานได้");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleQCItem = (item: string) => {
    const current = postCheckMap[item];
    const next = current === "PASS" ? "FAIL" : current === "FAIL" ? "" : "PASS";
    const updated = { ...postCheckMap };
    if (!next) {
      delete updated[item];
    } else {
      updated[item] = next;
    }
    setPostCheckMap(updated);
  };

  const handleAllPassQC = () => {
    const full: Record<string, string> = {};
    STANDARD_QC_ITEMS.forEach((item) => {
      full[item] = "PASS";
    });
    setPostCheckMap(full);
  };

  const handleSaveModal = async () => {
    if (!activeJob) return;
    setUpdating(true);
    try {
      const payload: any = {
        notes: techNotes,
      };

      if (!isTechnician && Number(laborFeeInput) !== Number(activeJob.laborFee || 0)) {
        payload.laborFee = Number(laborFeeInput);
      }

      if (estimatedFinishInput) {
        payload.estimatedFinish = new Date(estimatedFinishInput).toISOString();
      }

      if (Object.keys(postCheckMap).length > 0) {
        payload.postCheckData = JSON.stringify(postCheckMap);
      }

      const res = await fetch(`/api/repairs/${activeJob.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setActiveJob(json.data);
        fetchRepairs();
        alert("บันทึกการปรับปรุงงานซ่อมเรียบร้อย");
      } else {
        alert(json.error || "บันทึกไม่สำเร็จ");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const handleRemovePart = async (usageId: string) => {
    if (!activeJob) return;
    if (!confirm("ต้องการคืนอะไหล่ชิ้นนี้เข้าสต็อกสาขาหรือไม่?")) return;
    try {
      const res = await fetch(`/api/repairs/${activeJob.id}/parts?usageId=${usageId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setActiveJob(json.data);
        fetchRepairs();
      } else {
        alert(json.error || "ไม่สามารถคืนอะไหล่ได้");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredRepairs = repairs.filter((r) => {
    if (selectedTech === "ALL") return true;
    return r.technicianId === selectedTech;
  });

  // Financial live in active job
  const partsSell =
    activeJob?.partUsages?.reduce(
      (sum: number, p: any) => sum + (p.sellPrice || 0) * (p.quantity || 1),
      0
    ) || 0;
  const partsCost =
    activeJob?.partUsages?.reduce(
      (sum: number, p: any) => sum + (p.costPrice || 0) * (p.quantity || 1),
      0
    ) || 0;
  const currentLaborFee = Number(laborFeeInput || activeJob?.laborFee || 0);
  const totalCost = currentLaborFee + partsSell;
  const grossProfit = totalCost - partsCost;
  const partsGrossProfit = Math.max(0, partsSell - partsCost);
  const techCommission = currentLaborFee * 0.3 + partsGrossProfit * 0.1;

  // Pre-check parsed
  let parsedPreCheck: Record<string, string> = {};
  if (activeJob?.preCheckData) {
    try {
      parsedPreCheck =
        typeof activeJob.preCheckData === "string"
          ? JSON.parse(activeJob.preCheckData)
          : activeJob.preCheckData;
    } catch {
      parsedPreCheck = {};
    }
  }

  return (
    <div className="space-y-6 w-full pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Wrench className="w-6 h-6 text-blue-600" />
            <span>โต๊ะทำงานช่างเทคนิค (Technician Kanban Workbench)</span>
          </h1>
          <p className="text-sm text-slate-500">
            กระดานคัมบังติดตามงานซ่อม เบิกอะไหล่ บันทึกเวลาซ่อม ดูรหัสเครื่อง และตรวจเช็ค QC
          </p>
        </div>

        {/* Technician Filter & Refresh */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button onClick={fetchRepairs} variant="outline" size="sm" className="gap-1.5 text-xs">
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
            <span>รีเฟรช</span>
          </Button>

          {isTechnician && currentUser?.id && (
            <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setSelectedTech(currentUser.id)}
                className={`px-2.5 py-1 rounded font-medium transition-all ${
                  selectedTech === currentUser.id
                    ? "bg-white text-blue-700 font-bold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                งานของฉัน ({repairs.filter((r) => r.technicianId === currentUser.id).length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedTech("ALL")}
                className={`px-2.5 py-1 rounded font-medium transition-all ${
                  selectedTech === "ALL"
                    ? "bg-white text-blue-700 font-bold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                งานทั้งหมด ({repairs.length})
              </button>
            </div>
          )}

          {!isTechnician && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">ช่าง:</span>
              <select
                value={selectedTech}
                onChange={(e) => setSelectedTech(e.target.value)}
                className="text-xs font-semibold rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-800"
              >
                <option value="ALL">ช่างทุกคน (All Technicians)</option>
                {users
                  .filter((u) => u.role === "TECHNICIAN")
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 5-Column Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5 items-start">
        {KANBAN_COLUMNS.map((col) => {
          const colJobs = filteredRepairs.filter((r) => {
            if (col.id === "READY") {
              return r.status === "QC_PASSED" || r.status === "READY";
            }
            return r.status === col.id;
          });

          return (
            <div
              key={col.id}
              className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 flex flex-col min-h-[520px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-800 truncate" title={col.label}>
                  {col.label}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                  {colJobs.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="space-y-2.5 flex-1 overflow-y-auto">
                {colJobs.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-400">
                    ไม่มีงานในขั้นตอนนี้
                  </div>
                ) : (
                  colJobs.map((job) => (
                    <div
                      key={job.id}
                      onClick={() => handleOpenJob(job)}
                      className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-blue-400 hover:shadow-xs cursor-pointer transition-all space-y-2 group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          {job.trackingCode}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatDateThai(job.createdAt).split(" ")[0]}
                        </span>
                      </div>

                      <div>
                        <div className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors">
                          {job.deviceBrand} {job.deviceModel}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                          {job.issueDescription}
                        </div>
                      </div>

                      {/* Device Lock Indication */}
                      {(job.hasPasscode || job.hasPatternLock || job.passcode || job.patternLock) && (
                        <div className="flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 w-fit">
                          <KeyRound className="w-3 h-3 text-amber-600" />
                          <span>มีรหัสปลดล็อกเครื่อง</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10.5px]">
                        <span className="text-slate-500 truncate max-w-[110px]">
                          ช่าง: {job.technician?.name || "ยังไม่ระบุ"}
                        </span>
                        <span className="font-bold text-slate-900">
                          {formatTHB(job.totalCost || job.estimatedCost || 0)}
                        </span>
                      </div>

                      {/* Quick Move Buttons */}
                      <div
                        className="pt-1 flex items-center justify-between gap-1 text-[10px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {col.id === "PENDING" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(job.id, "DIAGNOSING")}
                              className="w-1/2 px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium text-center"
                            >
                              &rarr; ตรวจเช็ค
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(job.id, "REPAIRING")}
                              className="w-1/2 px-2 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium text-center"
                            >
                              &rarr; ซ่อมเลย
                            </button>
                          </>
                        )}
                        {col.id === "DIAGNOSING" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(job.id, "WAITING_PARTS")}
                              className="px-2 py-1 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 font-medium"
                            >
                              &rarr; รออะไหล่
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(job.id, "REPAIRING")}
                              className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium"
                            >
                              &rarr; ซ่อมเลย
                            </button>
                          </>
                        )}
                        {col.id === "WAITING_PARTS" && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(job.id, "REPAIRING")}
                            className="w-full px-2 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium text-center"
                          >
                            &rarr; อะไหล่มาแล้ว เริ่มซ่อม
                          </button>
                        )}
                        {col.id === "REPAIRING" && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(job.id, "READY")}
                            className="w-full px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-center"
                          >
                            &rarr; ผ่าน QC พร้อมส่งมอบ
                          </button>
                        )}
                        {col.id === "READY" && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(job.id, "COMPLETED")}
                            className="w-full px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-center"
                          >
                            ✓ ส่งมอบลูกค้าแล้ว
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Technician Modal Workbench */}
      {activeJob && (
        <Dialog open={!!activeJob} onOpenChange={() => setActiveJob(null)}>
          <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0">
            <DialogHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-blue-600" />
                  <span>โต๊ะงานช่าง: {activeJob.trackingCode}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    สถานะ: {activeJob.status}
                  </span>
                </DialogTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeJob.deviceBrand} {activeJob.deviceModel} ({activeJob.deviceColor || "-"}) • ลูกค้า: {activeJob.customer?.name} ({activeJob.customer?.phone})
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!activeJob.technicianId && currentUser?.id && (
                  <Button
                    size="sm"
                    onClick={handleClaimTicket}
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>รับงานนี้</span>
                  </Button>
                )}
                <Link href={`/repairs/${activeJob.id}`}>
                  <Button size="sm" variant="outline" className="text-xs gap-1">
                    <span>เปิดหน้ารายละเอียดเต็ม</span>
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </DialogHeader>

            <div className="p-6 space-y-5">
              {/* Device Unlock & Intake Info Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Device Unlock Card */}
                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 space-y-2 text-xs">
                  <div className="font-bold text-amber-900 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-amber-600" />
                    <span>รหัสปลดล็อกเครื่อง (Device Passcode / Pattern)</span>
                  </div>
                  {activeJob.passcode ? (
                    <div className="flex items-center justify-between bg-white p-2 rounded border border-amber-200">
                      <div>
                        <span className="text-[11px] text-slate-500">รหัส PIN / Passcode:</span>
                        <div className="font-mono text-sm font-black text-slate-900 tracking-wider">
                          {activeJob.passcode}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(activeJob.passcode);
                          setPasscodeCopied(true);
                          setTimeout(() => setPasscodeCopied(false), 2000);
                        }}
                        className="h-7 text-xs"
                      >
                        {passcodeCopied ? "คัดลอกแล้ว" : "คัดลอก"}
                      </Button>
                    </div>
                  ) : null}

                  {activeJob.patternLock ? (
                    <div className="bg-white p-2 rounded border border-amber-200">
                      <span className="text-[11px] text-slate-500">รูปแบบวาด (Pattern Sequence):</span>
                      <div className="font-mono text-xs font-bold text-slate-900 mt-0.5">
                        {activeJob.patternLock} (ลำดับจุด 0-8)
                      </div>
                    </div>
                  ) : null}

                  {!activeJob.passcode && !activeJob.patternLock && (
                    <div className="text-slate-500 italic">
                      {activeJob.hasPasscode || activeJob.hasPatternLock
                        ? "มีรหัสล็อกเครื่อง (ต้องมีสิทธิ์ช่างผู้รับผิดชอบหรือผู้จัดการในการดูรหัส)"
                        : "ไม่มีรหัสล็อกเครื่อง"}
                    </div>
                  )}

                  {activeJob.serialIMEI && (
                    <div className="text-[11px] text-slate-600">
                      IMEI / Serial: <span className="font-mono font-semibold">{activeJob.serialIMEI}</span>
                    </div>
                  )}
                </div>

                {/* Pre-check Summary */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    <span>อาการที่แจ้ง & การตรวจเช็คก่อนซ่อม</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200 font-medium text-slate-900">
                    {activeJob.issueDescription}
                  </div>
                  {Object.keys(parsedPreCheck).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {Object.entries(parsedPreCheck).map(([k, v]) => (
                        <span
                          key={k}
                          className="px-2 py-0.5 rounded text-[10px] bg-slate-100 border border-slate-200 text-slate-700"
                        >
                          {k}: <strong>{String(v)}</strong>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Repair Time & Estimated Finish Logging */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <span>บันทึกเวลานัดรับ / กำหนดเสร็จโดยประมาณ (Repair Time)</span>
                  </div>
                  {activeJob.completedAt && (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      ซ่อมเสร็จเมื่อ: {formatDateThai(activeJob.completedAt)}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  <div className="sm:col-span-2 flex items-center gap-2">
                    <Input
                      type="datetime-local"
                      value={estimatedFinishInput}
                      onChange={(e) => setEstimatedFinishInput(e.target.value)}
                      className="text-xs h-8 bg-white"
                    />
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleQuickSetFinishHours(1)}
                        className="h-8 px-2 text-[10.5px]"
                      >
                        +1 ชม.
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleQuickSetFinishHours(2)}
                        className="h-8 px-2 text-[10.5px]"
                      >
                        +2 ชม.
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleQuickSetFinishTomorrow(12)}
                        className="h-8 px-2 text-[10.5px]"
                      >
                        พรุ่งนี้เที่ยง
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleQuickSetFinishTomorrow(18)}
                        className="h-8 px-2 text-[10.5px]"
                      >
                        พรุ่งนี้เย็น
                      </Button>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {estimatedFinishInput ? (
                      <span>นัดเสร็จ: {formatDateThai(new Date(estimatedFinishInput))}</span>
                    ) : (
                      <span>ยังไม่ได้ระบุเวลานัดรับ</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Spare Parts Picker & Live Margin */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    อะไหล่ที่เบิกใช้ในใบงานนี้ ({activeJob.partUsages?.length || 0} รายการ)
                  </span>
                  <Button
                    size="sm"
                    onClick={() => setShowPartsPicker(true)}
                    className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>เบิกอะไหล่จากสต็อก</span>
                  </Button>
                </div>

                <div className="border border-slate-200 rounded-lg bg-white overflow-x-auto text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-[10px] uppercase text-slate-600">
                      <tr>
                        <th className="p-2">อะไหล่</th>
                        <th className="p-2 text-center">จำนวน</th>
                        <th className="p-2 text-right">ทุน</th>
                        <th className="p-2 text-right">ขาย</th>
                        <th className="p-2 text-center">คืนสต็อก</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeJob.partUsages?.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-slate-400">
                            ยังไม่มีการเบิกอะไหล่ในใบงานนี้
                          </td>
                        </tr>
                      ) : (
                        activeJob.partUsages.map((p: any) => (
                          <tr key={p.id}>
                            <td className="p-2 font-medium">
                              <div>{p.product?.name}</div>
                              <div className="font-mono text-[10px] text-slate-400">{p.product?.code}</div>
                            </td>
                            <td className="p-2 text-center font-bold">{p.quantity}</td>
                            <td className="p-2 text-right font-mono text-slate-500">
                              {formatTHB(p.costPrice || 0)}
                            </td>
                            <td className="p-2 text-right font-mono font-bold text-blue-700">
                              {formatTHB(p.sellPrice || 0)}
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemovePart(p.id)}
                                className="text-rose-500 hover:text-rose-700 p-1"
                                title="คืนอะไหล่เข้าสต็อกสาขา"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Live Profit & Commission Box */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px]">
                      ค่าแรงช่าง {isTechnician && <span className="text-amber-600">(อ่านอย่างเดียว)</span>}
                    </span>
                    <Input
                      type="number"
                      disabled={isTechnician}
                      value={laborFeeInput}
                      onChange={(e) => setLaborFeeInput(Number(e.target.value))}
                      className="text-xs h-7 font-bold font-mono disabled:bg-slate-100 disabled:text-slate-500 mt-1"
                    />
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px]">รวมค่าอะไหล่</span>
                    <div className="font-bold text-slate-800 mt-1">{formatTHB(partsSell)}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px]">ยอดรวมลูกค้า</span>
                    <div className="font-black text-blue-700 mt-1">{formatTHB(totalCost)}</div>
                  </div>
                  <div className="bg-emerald-100/70 p-1.5 rounded-lg text-emerald-900">
                    <span className="text-[10px] font-bold">กำไรสุทธิ (GP)</span>
                    <div className="font-black text-emerald-700 text-sm">{formatTHB(grossProfit)}</div>
                  </div>
                  <div className="bg-indigo-100/70 p-1.5 rounded-lg text-indigo-900">
                    <span className="text-[10px] font-bold">คอมมิชชั่นช่าง</span>
                    <div className="font-black text-indigo-700 text-sm">{formatTHB(techCommission)}</div>
                    <div className="text-[8px] text-indigo-600">30% ค่าแรง + 10% GP อะไหล่</div>
                  </div>
                </div>
              </div>

              {/* QC Checklist Table (Pre/Post Quality Control) */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>บันทึกการตรวจสอบคุณภาพหลังซ่อม (Post-Repair QC Checklist)</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAllPassQC}
                    className="h-6 text-[10.5px] text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                  >
                    ผ่านทุกรายการ (Pass All)
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {STANDARD_QC_ITEMS.map((item) => {
                    const status = postCheckMap[item];
                    return (
                      <div
                        key={item}
                        onClick={() => handleToggleQCItem(item)}
                        className={`p-2 rounded-lg border cursor-pointer select-none transition-colors flex items-center justify-between ${
                          status === "PASS"
                            ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                            : status === "FAIL"
                            ? "bg-rose-50 border-rose-300 text-rose-900"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <span className="text-[11px] font-medium truncate mr-1">{item}</span>
                        <span
                          className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            status === "PASS"
                              ? "bg-emerald-600 text-white"
                              : status === "FAIL"
                              ? "bg-rose-600 text-white"
                              : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          {status || "รอตรวจ"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Technician Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  บันทึกการซ่อมของช่าง (Diagnostic Notes & Findings)
                </label>
                <textarea
                  rows={2}
                  value={techNotes}
                  onChange={(e) => setTechNotes(e.target.value)}
                  placeholder="รายละเอียดการซ่อม จุดบัดกรี อุณหภูมิ ข้อสังเกตเพิ่มเติม..."
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-slate-500">เปลี่ยนสถานะ:</span>
                  {activeJob.status === "PENDING" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(activeJob.id, "DIAGNOSING")}
                      className="text-xs h-7 text-blue-700 border-blue-200"
                    >
                      &rarr; กำลังตรวจเช็ค
                    </Button>
                  )}
                  {(activeJob.status === "PENDING" || activeJob.status === "DIAGNOSING") && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(activeJob.id, "WAITING_PARTS")}
                      className="text-xs h-7 text-purple-700 border-purple-200"
                    >
                      &rarr; รออะไหล่
                    </Button>
                  )}
                  {activeJob.status !== "REPAIRING" && activeJob.status !== "READY" && activeJob.status !== "COMPLETED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(activeJob.id, "REPAIRING")}
                      className="text-xs h-7 text-indigo-700 border-indigo-200"
                    >
                      &rarr; กำลังซ่อม
                    </Button>
                  )}
                  {activeJob.status === "REPAIRING" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(activeJob.id, "READY")}
                      className="text-xs h-7 text-emerald-700 border-emerald-200 font-bold"
                    >
                      &rarr; ผ่าน QC พร้อมส่งมอบ
                    </Button>
                  )}
                  {activeJob.status === "READY" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(activeJob.id, "COMPLETED")}
                      className="text-xs h-7 text-slate-800 border-slate-300 font-bold"
                    >
                      ✓ ส่งมอบเรียบร้อย
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={() => setActiveJob(null)} className="text-xs">
                    ปิด
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveModal}
                    disabled={updating}
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {updating ? "กำลังบันทึก..." : "บันทึกการปรับปรุง"}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Parts Picker Modal */}
      {showPartsPicker && activeJob && (
        <PartsPickerModal
          isOpen={showPartsPicker}
          onClose={() => setShowPartsPicker(false)}
          repairJobId={activeJob.id}
          branchId={activeJob.branchId}
          onPartAdded={(updated) => {
            setActiveJob(updated);
            fetchRepairs();
          }}
        />
      )}
    </div>
  );
}