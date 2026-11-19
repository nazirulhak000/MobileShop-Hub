"use client";

import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import {
  ShieldCheck,
  Search,
  AlertCircle,
  Clock,
  CheckCircle2,
  Calendar,
  Smartphone,
  RotateCcw,
  PlusCircle,
  FileCheck2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { formatTHB, formatDateThai } from "@/lib/utils";

export default function RepairWarrantyPage() {
  const [repairs, setRepairs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [claimJob, setClaimJob] = useState<any | null>(null);
  const [claimReason, setClaimReason] = useState("");
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);

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

  const handleOpenClaim = (job: any) => {
    setClaimJob(job);
    setClaimReason("");
    setClaimSuccess(false);
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimJob || !claimReason.trim()) return;

    setSubmittingClaim(true);
    try {
      // Create a warranty RMA repair job
      const payload = {
        customerId: claimJob.customerId,
        customerName: claimJob.customer.name,
        customerPhone: claimJob.customer.phone,
        branchId: claimJob.branchId,
        deviceBrand: claimJob.deviceBrand,
        deviceModel: claimJob.deviceModel,
        deviceColor: claimJob.deviceColor,
        serialIMEI: claimJob.serialIMEI,
        // Device lock is copied server-side from the original job (not exposed by the list API).
        lockFromJobId: claimJob.id,
        issueDescription: `[เคลมประกันจาก ${claimJob.trackingCode}] ${claimReason.trim()}`,
        laborFee: 0,
        estimatedCost: 0,
        notes: `RMA Claim for ${claimJob.trackingCode}. Replaced parts warranty review.`,
      };

      const res = await fetch("/api/repairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        confetti({ particleCount: 90, spread: 60 });
        setClaimSuccess(true);
        fetchRepairs();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingClaim(false);
    }
  };

  const filtered = repairs.filter((r) => {
    const s = search.toLowerCase();
    return (
      !s ||
      r.trackingCode.toLowerCase().includes(s) ||
      r.serialIMEI?.includes(s) ||
      r.customer?.phone.includes(s) ||
      r.customer?.name.toLowerCase().includes(s) ||
      r.deviceModel.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            <span>ตรวจสอบและเคลมประกันงานซ่อม (Repair Warranty & RMA)</span>
          </h1>
          <p className="text-sm text-slate-500">
            ค้นหาประวัติการรับประกันด้วยเลขที่ใบงานซ่อม หรือ IMEI และเปิดใบเคลมซ่อมฟรีภายใต้เงื่อนไข
          </p>
        </div>
      </div>

      {/* Search Input */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="ค้นหาด้วย IMEI, หมายเลขใบซ่อม (REP-...), หรือเบอร์โทรลูกค้า..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9 bg-slate-50 border-slate-200"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
              <tr>
                <th className="py-3 px-4">ใบงานเดิม / วันที่</th>
                <th className="py-3 px-4">ลูกค้า & เบอร์ติดต่อ</th>
                <th className="py-3 px-4">เครื่อง & IMEI</th>
                <th className="py-3 px-4">อะไหล่ที่เปลี่ยน</th>
                <th className="py-3 px-4 text-center">ระยะเวลารับประกัน</th>
                <th className="py-3 px-4">สถานะประกัน</th>
                <th className="py-3 px-4 text-center">การกระทำ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    กำลังโหลดข้อมูลการรับประกัน...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    ไม่พบข้อมูลการรับประกันงานซ่อม
                  </td>
                </tr>
              ) : (
                filtered.map((job) => {
                  const warrantyDays = job.warrantyDays || 90;
                  const created = new Date(job.createdAt);
                  const expiryDate = new Date(created);
                  expiryDate.setDate(expiryDate.getDate() + warrantyDays);
                  const diffDays = Math.ceil(
                    (expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                  );
                  const isActive = diffDays > 0;

                  return (
                    <tr key={job.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-blue-700">{job.trackingCode}</div>
                        <div className="text-[11px] text-slate-400">{formatDateThai(job.createdAt)}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{job.customer?.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{job.customer?.phone}</div>
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900 truncate">
                          {job.deviceBrand} {job.deviceModel}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">IMEI: {job.serialIMEI || "-"}</div>
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        {job.partUsages?.length > 0 ? (
                          <div className="space-y-0.5">
                            {job.partUsages.map((p: any) => (
                              <div key={p.id} className="text-[11px] text-slate-700 truncate">
                                • {p.product?.name}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">งานซ่อมบอร์ด/ไม่มีเปลี่ยนอะไหล่</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="font-bold text-slate-800">{warrantyDays} วัน</span>
                        <div className="text-[10px] text-slate-400">
                          หมด: {expiryDate.toISOString().split("T")[0]}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {isActive ? `เหลืออีก ${diffDays} วัน` : "หมดประกันแล้ว"}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <Button
                          size="sm"
                          variant={isActive ? "primary" : "secondary"}
                          onClick={() => handleOpenClaim(job)}
                          className={`h-7 text-xs px-2.5 gap-1 ${
                            isActive ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "text-slate-600"
                          }`}
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>เปิดเคลม RMA</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Claim Modal */}
      {claimJob && (
        <Dialog open={!!claimJob} onOpenChange={() => setClaimJob(null)}>
          <DialogContent className="max-w-md p-0">
            <DialogHeader className="p-4 border-b border-slate-100">
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>เปิดใบเคลมงานซ่อม (RMA Warranty Claim)</span>
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                อ้างอิงใบงาน: {claimJob.trackingCode} ({claimJob.deviceBrand} {claimJob.deviceModel})
              </p>
            </DialogHeader>

            {claimSuccess ? (
              <div className="p-6 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h3 className="font-bold text-slate-900 text-sm">เปิดใบเคลมประกันสำเร็จ</h3>
                <p className="text-xs text-slate-500">
                  ระบบได้สร้างใบงานซ่อมเคลมฟรีสำหรับลูกค้ารายนี้เรียบร้อยแล้ว
                </p>
                <Button size="sm" onClick={() => setClaimJob(null)} className="text-xs bg-blue-600 text-white">
                  ปิดหน้าต่าง
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmitClaim} className="p-4 space-y-3">
                <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1 border border-slate-200">
                  <div>ลูกค้า: <span className="font-semibold">{claimJob.customer?.name}</span> ({claimJob.customer?.phone})</div>
                  <div>อุปกรณ์: <span className="font-semibold">{claimJob.deviceBrand} {claimJob.deviceModel}</span></div>
                  <div>IMEI: <span className="font-mono">{claimJob.serialIMEI || "-"}</span></div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ระบุอาการเสียที่กลับมาเป็นซ้ำ หรือปัญหาที่พบ *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="เช่น จอสัมผัสเพี้ยนเดิม แบตเตอรี่ชาร์จไม่เข้า..."
                    value={claimReason}
                    onChange={(e) => setClaimReason(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="text-[11px] text-slate-500 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                  * ตรวจสอบว่าไม่มีรอยตกกระแทกใหม่ หรือรอยโดนน้ำ เพื่อรับสิทธิ์เคลมฟรี 100%
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button type="button" variant="outline" onClick={() => setClaimJob(null)} className="text-xs">
                    ยกเลิก
                  </Button>
                  <Button
                    type="submit"
                    disabled={submittingClaim}
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {submittingClaim ? "กำลังสร้างใบเคลม..." : "ยืนยันเปิดใบเคลมฟรี"}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
