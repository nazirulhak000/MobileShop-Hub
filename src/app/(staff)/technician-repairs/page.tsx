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
  { id: "DIAGNOSING", label: "กำลังตรวจเช็ค", color: "border-blue-300 bg-blue-50/40 text-blue-800" },
  { id: "WAITING_PARTS", label: "รออะไหล่", color: "border-purple-300 bg-purple-50/40 text-purple-800" },
  { id: "REPAIRING", label: "กำลังซ่อม", color: "border-indigo-300 bg-indigo-50/40 text-indigo-800" },
  { id: "READY", label: "ผ่าน QC / พร้อมส่งมอบ", color: "border-emerald-300 bg-emerald-50/40 text-emerald-800" },
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
  const [updating, setUpdating] = useState(false);

  const fetchRepairs = async () => {
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
  };

  const handleStatusChange = async (jobId: string, newStatus: string) => {
    const repair = repairs.find((r) => r.id === jobId);
    const APPROVAL_REQUIRED = ["REPAIRING", "QC_PASSED", "READY", "COMPLETED"];
    if (APPROVAL_REQUIRED.includes(newStatus) && !repair?.customerApproved) {
      alert("กรุณารอการอนุมัติใบเสนอราคาจากลูกค้าก่อนดำเนินการขั้นตอนนี้");
      return;
    }

    // The API only allows one step at a time (REPAIRING -> QC_PASSED -> READY -> COMPLETED),
    // while the kanban merges QC_PASSED and READY into one column; walk the intermediate steps.
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

      const res = await fetch(`/api/repairs/${activeJob.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setActiveJob(json.data);
        fetchRepairs();
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
    try {
      const res = await fetch(`/api/repairs/${activeJob.id}/parts?usageId=${usageId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setActiveJob(json.data);
        fetchRepairs();
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
  const partsSell = activeJob?.partUsages?.reduce((sum: number, p: any) => sum + p.sellPrice * p.quantity, 0) || 0;
  const partsCost = activeJob?.partUsages?.reduce((sum: number, p: any) => sum + p.costPrice * p.quantity, 0) || 0;
  const totalCost = Number(laborFeeInput) + partsSell;
  const grossProfit = totalCost - partsCost;
  const partsGrossProfit = Math.max(0, partsSell - partsCost);
  const techCommission = Number(laborFeeInput) * 0.30 + partsGrossProfit * 0.10;

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
            กระดานคัมบังติดตามงานซ่อม เบิกอะไหล่ คำนวณกำไร Real-time และตรวจเช็ค QC
          </p>
        </div>

        {/* Technician Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">กรองช่าง:</span>
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
      </div>

      {/* 4-Column Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
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
              className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 flex flex-col min-h-[500px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-800">{col.label}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                  {colJobs.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="space-y-2.5 flex-1 overflow-y-auto">
                {colJobs.map((job) => (
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
                      {col.id === "DIAGNOSING" && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(job.id, "WAITING_PARTS")}
                            className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 font-medium"
                          >
                            &rarr; รออะไหล่
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(job.id, "REPAIRING")}
                            className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium"
                          >
                            &rarr; ซ่อมเลย
                          </button>
                        </>
                      )}
                      {col.id === "WAITING_PARTS" && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(job.id, "REPAIRING")}
                          className="w-full px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium text-center"
                        >
                          &rarr; อะไหล่มาแล้ว เริ่มซ่อม
                        </button>
                      )}
                      {col.id === "REPAIRING" && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(job.id, "READY")}
                          className="w-full px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-center"
                        >
                          &rarr; ผ่าน QC พร้อมส่งมอบ
                        </button>
                      )}
                      {col.id === "READY" && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(job.id, "COMPLETED")}
                          className="w-full px-2 py-0.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-center"
                        >
                          ✓ ส่งมอบลูกค้าแล้ว
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Technician Modal Workbench */}
      {activeJob && (
        <Dialog open={!!activeJob} onOpenChange={() => setActiveJob(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
            <DialogHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-blue-600" />
                  <span>โต๊ะงานช่าง: {activeJob.trackingCode}</span>
                </DialogTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeJob.deviceBrand} {activeJob.deviceModel} • ลูกค้า: {activeJob.customer?.name} ({activeJob.customer?.phone})
                </p>
              </div>
              <Link href={`/repairs/${activeJob.id}`}>
                <Button size="sm" variant="outline" className="text-xs gap-1">
                  <span>เปิดเต็มจอ</span>
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </Link>
            </DialogHeader>

            <div className="p-6 space-y-4">
              {/* Spare Parts Picker & Live Margin */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    อะไหล่ที่เบิกใช้ในใบงานนี้
                  </span>
                  <Button
                    size="sm"
                    onClick={() => setShowPartsPicker(true)}
                    className="h-7 text-xs bg-blue-600 text-white gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>เบิกอะไหล่</span>
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
                        <th className="p-2 text-center">ลบ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeJob.partUsages?.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-slate-400">
                            ยังไม่มีการเบิกอะไหล่
                          </td>
                        </tr>
                      ) : (
                        activeJob.partUsages.map((p: any) => (
                          <tr key={p.id}>
                            <td className="p-2 font-medium">{p.product?.name}</td>
                            <td className="p-2 text-center">{p.quantity}</td>
                            <td className="p-2 text-right font-mono text-slate-500">{formatTHB(p.costPrice)}</td>
                            <td className="p-2 text-right font-mono font-bold text-blue-700">{formatTHB(p.sellPrice)}</td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemovePart(p.id)}
                                className="text-rose-500 hover:text-rose-700"
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

                {/* Live Profit Box */}
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
                      className="text-xs h-7 font-bold font-mono disabled:bg-slate-100 disabled:text-slate-500"
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

              {/* Technician Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  บันทึกการซ่อมของช่าง
                </label>
                <textarea
                  rows={2}
                  value={techNotes}
                  onChange={(e) => setTechNotes(e.target.value)}
                  placeholder="รายละเอียดงานซ่อม อุณหภูมิ ลายวงจร..."
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
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
          </DialogContent>
        </Dialog>
      )}

      {/* Parts Picker */}
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
