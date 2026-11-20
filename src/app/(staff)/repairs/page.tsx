"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Wrench,
  PlusCircle,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  ExternalLink,
  Printer,
  ChevronRight,
  RefreshCw,
  User,
  Building2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { RepairStatusMap, RepairStatusType } from "@/types";
import { formatTHB, formatDateThai } from "@/lib/utils";
import { useApp } from "@/context/AppContext";
import { ThermalSlipModal } from "@/components/repairs/ThermalSlipModal";

export default function RepairsListPage() {
  const { currentBranch, branches, users } = useApp();
  const [repairs, setRepairs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("ALL");
  const [selectedTechId, setSelectedTechId] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Print Slip Modal
  const [slipModalJob, setSlipModalJob] = useState<any | null>(null);

  const fetchRepairs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedStatus !== "ALL") params.set("status", selectedStatus);
      if (selectedBranchId !== "ALL") params.set("branchId", selectedBranchId);
      if (selectedTechId !== "ALL") params.set("technicianId", selectedTechId);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/repairs?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setRepairs(json.data);
      }
    } catch (err) {
      console.error("Error fetching repairs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepairs();
  }, [selectedStatus, selectedBranchId, selectedTechId]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRepairs();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Stats
  const activeCount = repairs.filter(
    (r) => !["COMPLETED", "CANCELLED"].includes(r.status)
  ).length;
  const readyCount = repairs.filter((r) => r.status === "READY").length;
  const pendingCount = repairs.filter((r) => r.status === "PENDING").length;
  const inRepairCount = repairs.filter((r) =>
    ["DIAGNOSING", "WAITING_PARTS", "REPAIRING"].includes(r.status)
  ).length;

  const STATUS_TABS = [
    { key: "ALL", label: "ทั้งหมด" },
    { key: "PENDING", label: "รอตรวจรับ" },
    { key: "DIAGNOSING", label: "กำลังตรวจเช็ค" },
    { key: "WAITING_PARTS", label: "รออะไหล่" },
    { key: "REPAIRING", label: "กำลังซ่อม" },
    { key: "QC_PASSED", label: "ผ่าน QC" },
    { key: "READY", label: "พร้อมรับเครื่อง" },
    { key: "COMPLETED", label: "ส่งมอบแล้ว" },
    { key: "CANCELLED", label: "ยกเลิกแล้ว" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Wrench className="h-6 w-6 text-blue-600" />
            <span>ศูนย์บริการงานซ่อม (Repair Service)</span>
          </h1>
          <p className="text-sm text-slate-500">
            ระบบจัดการใบรับซ่อม ตรวจสอบสถานะ และควบคุมขั้นตอนการซ่อมทุกขั้นตอน
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRepairs}
            className="gap-1.5 text-xs text-slate-600"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>รีเฟรช</span>
          </Button>
          <Link href="/repairs/new">
            <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm gap-2">
              <PlusCircle className="h-4 w-4" />
              <span>เปิดใบรับซ่อมใหม่</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">งานซ่อมค้างทั้งหมด</div>
              <div className="text-2xl font-bold text-slate-900 mt-0.5">{activeCount}</div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">รอรับเครื่อง/ประเมิน</div>
              <div className="text-2xl font-bold text-amber-600 mt-0.5">{pendingCount}</div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">อยู่ระหว่างซ่อม/รออะไหล่</div>
              <div className="text-2xl font-bold text-indigo-600 mt-0.5">{inRepairCount}</div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">พร้อมส่งมอบลูกค้า</div>
              <div className="text-2xl font-bold text-emerald-600 mt-0.5">{readyCount}</div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-slate-200">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="ค้นหาด้วยรหัสติดตาม (REP-...), ชื่อลูกค้า, เบอร์โทร, หรือ IMEI..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9 bg-slate-50 border-slate-200 focus:bg-white"
              />
            </div>

            {/* Select Dropdowns */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Branch Filter */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="ALL">ทุกสาขา</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Technician Filter */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedTechId}
                  onChange={(e) => setSelectedTechId(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="ALL">ช่างทุกคน</option>
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
          </div>

          {/* Status Tabs Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-t border-slate-100 pt-3">
            {STATUS_TABS.map((tab) => {
              const active = selectedStatus === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedStatus(tab.key)}
                  className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                    active
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Repair Tickets Table */}
      <Card className="border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">รหัสติดตาม / วันที่</th>
                <th className="py-3 px-4">ลูกค้า & เบอร์ติดต่อ</th>
                <th className="py-3 px-4">อุปกรณ์ / อาการเสีย</th>
                <th className="py-3 px-4">ช่างผู้ดูแล / สาขา</th>
                <th className="py-3 px-4">สถานะงานซ่อม</th>
                <th className="py-3 px-4 text-right">ยอดรวม (บาท)</th>
                <th className="py-3 px-4 text-center">การกระทำ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    กำลังโหลดรายการแจ้งซ่อม...
                  </td>
                </tr>
              ) : repairs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Wrench className="w-8 h-8 text-slate-300" />
                      <div className="font-semibold text-slate-600 text-sm">ไม่พบรายการใบรับซ่อมที่ตรงกับเงื่อนไข</div>
                      <p className="text-xs text-slate-400">ลองปรับเปลี่ยนตัวกรอง หรือค้นหาด้วยคำอื่น</p>
                      {(selectedStatus !== "ALL" || selectedBranchId !== "ALL" || selectedTechId !== "ALL" || searchQuery) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedStatus("ALL");
                            setSelectedBranchId("ALL");
                            setSelectedTechId("ALL");
                            setSearchQuery("");
                          }}
                          className="mt-2 text-xs"
                        >
                          ล้างตัวกรองทั้งหมด
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                repairs.map((job) => {
                  const statusInfo =
                    RepairStatusMap[job.status as RepairStatusType] || {
                      label: job.status,
                      color: "text-slate-700",
                      bg: "bg-slate-50",
                      border: "border-slate-200",
                    };

                  return (
                    <tr
                      key={job.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Tracking & Date */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Link
                          href={`/repairs/${job.id}`}
                          className="font-mono text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline block"
                        >
                          {job.trackingCode}
                        </Link>
                        <span className="text-[11px] text-slate-400">
                          {formatDateThai(job.createdAt)}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {job.customer?.name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {job.customer?.phone}
                        </div>
                      </td>

                      {/* Device & Issue */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900 truncate">
                          {job.deviceBrand} {job.deviceModel}
                          {job.deviceColor ? ` (${job.deviceColor})` : ""}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {job.issueDescription}
                        </div>
                        {job.serialIMEI && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            IMEI: {job.serialIMEI}
                          </div>
                        )}
                      </td>

                      {/* Technician & Branch */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-800">
                          {job.technician?.name || "ยังไม่ได้มอบหมาย"}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {job.branch?.name}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusInfo.bg} ${statusInfo.color} ${statusInfo.border}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="font-bold text-slate-900 text-sm">
                          {formatTHB(job.totalCost || job.estimatedCost || 0)}
                        </div>
                        {job.depositAmount > 0 ? (
                          <div className="text-[10px] text-emerald-600 font-medium">
                            มัดจำ {formatTHB(job.depositAmount)} / คงเหลือ {formatTHB(Math.max(0, (job.totalCost || job.estimatedCost || 0) - job.depositAmount))}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400">
                            {job.status === "COMPLETED" ? "ชำระแล้ว" : "ยอดสุทธิ"}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <Link href={`/repairs/${job.id}`}>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-8 text-xs px-2.5"
                            >
                              จัดการ
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSlipModalJob(job)}
                            title="พิมพ์สลิป 80mm"
                            className="h-8 w-8 text-slate-600 hover:text-blue-600"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Link
                            href={`/track/${job.trackingCode}`}
                            target="_blank"
                            title="เปิดหน้าเว็บลูกค้า"
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-600 hover:text-blue-600"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Slip Modal */}
      {slipModalJob && (
        <ThermalSlipModal
          isOpen={!!slipModalJob}
          onClose={() => setSlipModalJob(null)}
          job={slipModalJob}
        />
      )}
    </div>
  );
}
