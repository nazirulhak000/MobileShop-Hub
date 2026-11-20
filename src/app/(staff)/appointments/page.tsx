"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  Calendar,
  Clock,
  User,
  Smartphone,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Settings,
  Building2,
  Filter,
  RefreshCw,
  PlusCircle,
  Wrench,
  Check,
  X,
  Sliders,
  ChevronRight,
  ShieldCheck,
  ArrowUpRight,
  Search,
  FileText,
  Phone,
  Sparkles,
  CalendarDays,
  Layers,
  History,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { cn } from "@/lib/utils";

interface Appointment {
  id: string;
  bookingRef: string;
  branchId: string;
  deviceModel: string;
  service: string;
  status: string;
  repairJobId: string | null;
  isLinked?: boolean;
  issueDescription?: string;
  slot?: { startsAt: string; endsAt: string };
  account?: { displayName: string; phone: string };
  createdAt?: string;
}

interface Policy {
  id?: string;
  branchId: string;
  opensMinute: number;
  closesMinute: number;
  capacity: number;
  closedWeekdays: string;
  closedDates: string;
  active: boolean;
}

interface Branch {
  id: string;
  name: string;
  code?: string;
}

const statusMap: Record<string, { label: string; color: string; bg: string; border: string }> = {
  CONFIRMED: { label: "รอลูกค้าส่งเครื่อง", color: "text-blue-800", bg: "bg-blue-50", border: "border-blue-200" },
  CHECKED_IN: { label: "รับเครื่องเข้าศูนย์แล้ว", color: "text-teal-800", bg: "bg-teal-50", border: "border-teal-200" },
  COMPLETED: { label: "เสร็จสิ้น", color: "text-emerald-800", bg: "bg-emerald-50", border: "border-emerald-200" },
  CANCELLED: { label: "ยกเลิกแล้ว", color: "text-rose-800", bg: "bg-rose-50", border: "border-rose-200" },
  NO_SHOW: { label: "ไม่มาตามนัด", color: "text-slate-700", bg: "bg-slate-100", border: "border-slate-200" },
};

const BRAND_SUGGESTIONS = ["Apple", "Samsung", "Xiaomi", "Oppo", "Vivo", "Huawei", "รอตรวจรับ"];

function formatTimeMinute(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function parseTimeToMinute(timeStr: string) {
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function toBangkokDateString(dateObj: Date | string) {
  const d = typeof dateObj === "string" ? new Date(dateObj) : dateObj;
  return new Date(d.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);
}

export default function AppointmentsPage() {
  const { currentUser, branches: userBranches, currentBranch } = useApp();
  const [rows, setRows] = useState<Appointment[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(true);

  // Policy Settings Modal & Editing State
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyBranchId, setPolicyBranchId] = useState("");
  const [policyOpens, setPolicyOpens] = useState(540); // 09:00
  const [policyCloses, setPolicyCloses] = useState(1200); // 20:00
  const [policyCapacity, setPolicyCapacity] = useState(2);
  const [policyClosedWeekdays, setPolicyClosedWeekdays] = useState<number[]>([]);
  const [policyClosedDates, setPolicyClosedDates] = useState<string[]>([]);
  const [policyActive, setPolicyActive] = useState(true);
  const [newClosedDateInput, setNewClosedDateInput] = useState("");

  // 1-Click Check-in Modal
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [selectedCheckIn, setSelectedCheckIn] = useState<Appointment | null>(null);
  const [checkInBrand, setCheckInBrand] = useState("รอตรวจรับ");
  const [checkInEvidence, setCheckInEvidence] = useState("");
  const [checkInSuccessInfo, setCheckInSuccessInfo] = useState<{ id: string; repairJobId: string; trackingCode: string } | null>(null);

  // Cancellation Modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedCancel, setSelectedCancel] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  async function loadData() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/appointments", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "โหลดข้อมูลไม่สำเร็จ");
      setRows(result.appointments || []);
      setPolicies(result.policies || []);
      if (result.branches && result.branches.length > 0) {
        setBranches(result.branches);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดข้อมูลนัดหมายไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Sync policy editing state when branch or policies change
  useEffect(() => {
    const branchToUse = policyBranchId || selectedBranchId || currentBranch?.id || branches[0]?.id || "";
    if (branchToUse && branchToUse !== policyBranchId) {
      setPolicyBranchId(branchToUse);
    }
    const currentPol = policies.find((p) => p.branchId === branchToUse);
    if (currentPol) {
      setPolicyOpens(currentPol.opensMinute ?? 540);
      setPolicyCloses(currentPol.closesMinute ?? 1200);
      setPolicyCapacity(currentPol.capacity ?? 2);
      setPolicyActive(currentPol.active ?? true);
      try {
        setPolicyClosedWeekdays(JSON.parse(currentPol.closedWeekdays || "[]"));
      } catch {
        setPolicyClosedWeekdays([]);
      }
      try {
        setPolicyClosedDates(JSON.parse(currentPol.closedDates || "[]"));
      } catch {
        setPolicyClosedDates([]);
      }
    } else {
      setPolicyOpens(540);
      setPolicyCloses(1200);
      setPolicyCapacity(2);
      setPolicyClosedWeekdays([]);
      setPolicyClosedDates([]);
      setPolicyActive(true);
    }
  }, [policyBranchId, selectedBranchId, policies, currentBranch, branches]);

  // Execute API actions
  async function performAction(payload: Record<string, unknown>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "เกิดข้อผิดพลาดในการทำรายการ");
      setMessage(result.message || "บันทึกข้อมูลเรียบร้อยแล้ว");
      await loadData();
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "ทำรายการไม่สำเร็จ";
      setError(msg);
      throw err;
    } finally {
      setBusy(false);
    }
  }

  // Handle Check-in Trigger
  function openCheckInModal(appointment: Appointment) {
    setSelectedCheckIn(appointment);
    setCheckInBrand("รอตรวจรับ");
    setCheckInEvidence(`ลูกค้านำเครื่องเข้าตรวจรับที่สาขาตามนัดหมายรหัส ${appointment.bookingRef}`);
    setCheckInSuccessInfo(null);
    setCheckInModalOpen(true);
  }

  async function submitCheckIn() {
    if (!selectedCheckIn) return;
    try {
      const res = await performAction({
        id: selectedCheckIn.id,
        action: "CHECKED_IN",
        deviceBrand: checkInBrand.trim() || "รอตรวจรับ",
        evidence: checkInEvidence.trim(),
      });
      setCheckInSuccessInfo({
        id: selectedCheckIn.id,
        repairJobId: res.repairJobId,
        trackingCode: `REP-${selectedCheckIn.bookingRef}`,
      });
    } catch {
      // error is handled inside performAction
    }
  }

  // Handle Cancel Trigger
  function openCancelModal(appointment: Appointment) {
    setSelectedCancel(appointment);
    setCancelReason("");
    setCancelModalOpen(true);
  }

  async function submitCancel() {
    if (!selectedCancel) return;
    if (cancelReason.trim().length < 10) {
      setError("กรุณาระบุเหตุผลการยกเลิกอย่างน้อย 10 ตัวอักษร");
      return;
    }
    try {
      await performAction({
        id: selectedCancel.id,
        action: "CANCELLED",
        reason: cancelReason.trim(),
      });
      setCancelModalOpen(false);
      setSelectedCancel(null);
    } catch {
      // error handled in performAction
    }
  }

  // Save Booking Policy
  async function submitPolicy() {
    try {
      await performAction({
        action: "policy",
        branchId: policyBranchId,
        opensMinute: policyOpens,
        closesMinute: policyCloses,
        capacity: policyCapacity,
        active: policyActive,
        closedWeekdays: policyClosedWeekdays,
        closedDates: policyClosedDates,
      });
      setShowPolicyModal(false);
    } catch {
      // error handled in performAction
    }
  }

  // Dates & Quick Filter Helpers
  const todayBangkok = useMemo(() => toBangkokDateString(new Date()), []);
  const tomorrowBangkok = useMemo(() => toBangkokDateString(new Date(Date.now() + 86_400_000)), []);

  // Filtered Rows Calculation
  const filteredAppointments = useMemo(() => {
    return rows.filter((row) => {
      // Branch filter
      if (selectedBranchId && row.branchId !== selectedBranchId) {
        return false;
      }
      // Status filter
      if (statusFilter !== "ALL") {
        if (statusFilter === "CANCELLED") {
          if (row.status !== "CANCELLED" && row.status !== "NO_SHOW") return false;
        } else if (row.status !== statusFilter) {
          return false;
        }
      }
      // Date filter
      if (dateFilter) {
        if (!row.slot) return false;
        const rowDate = toBangkokDateString(row.slot.startsAt);
        if (rowDate !== dateFilter) return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const refMatch = row.bookingRef.toLowerCase().includes(q);
        const nameMatch = (row.account?.displayName || "").toLowerCase().includes(q);
        const phoneMatch = (row.account?.phone || "").includes(q);
        const modelMatch = (row.deviceModel || "").toLowerCase().includes(q);
        const serviceMatch = (row.service || "").toLowerCase().includes(q);
        if (!refMatch && !nameMatch && !phoneMatch && !modelMatch && !serviceMatch) {
          return false;
        }
      }
      return true;
    });
  }, [rows, selectedBranchId, statusFilter, dateFilter, searchQuery]);

  // KPI Metrics Calculation
  const metrics = useMemo(() => {
    const branchRows = selectedBranchId ? rows.filter((r) => r.branchId === selectedBranchId) : rows;
    const total = branchRows.length;
    const confirmed = branchRows.filter((r) => r.status === "CONFIRMED").length;
    const checkedIn = branchRows.filter((r) => r.status === "CHECKED_IN").length;
    const completed = branchRows.filter((r) => r.status === "COMPLETED").length;
    const cancelled = branchRows.filter((r) => r.status === "CANCELLED" || r.status === "NO_SHOW").length;
    const todayCount = branchRows.filter((r) => r.slot && toBangkokDateString(r.slot.startsAt) === todayBangkok).length;

    return { total, confirmed, checkedIn, completed, cancelled, todayCount };
  }, [rows, selectedBranchId, todayBangkok]);

  // Live Capacity Preview Calculations
  const livePreviewSlots = useMemo(() => {
    if (policyOpens >= policyCloses) return [];
    const slots: { start: string; end: string; startMin: number }[] = [];
    for (let m = policyOpens; m < policyCloses; m += 30) {
      slots.push({
        start: formatTimeMinute(m),
        end: formatTimeMinute(m + 30),
        startMin: m,
      });
    }
    return slots;
  }, [policyOpens, policyCloses]);

  const totalDailySlots = livePreviewSlots.length;
  const totalDailyCapacity = totalDailySlots * policyCapacity;
  const totalOperatingHours = ((policyCloses - policyOpens) / 60).toFixed(1);

  const activeBranchesList = branches.length > 0 ? branches : userBranches;

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* 1. Top Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
              <CalendarCheck className="h-3.5 w-3.5 text-teal-600" />
              ระบบนัดหมายออนไลน์ & จัดการคิวตรวจรับเครื่อง (Customer Bookings)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-2">
            นัดหมายลูกค้านำเครื่องเข้าตรวจ
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            รับเครื่องเข้าศูนย์ได้ใน 1 คลิก เชื่อมต่อประวัติและออกใบรับซ่อมทันที พร้อมตั้งค่าตารางความจุรายสาขา
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {["ADMIN", "MANAGER"].includes(currentUser.role) && (
            <Button
              variant="outline"
              onClick={() => setShowPolicyModal(!showPolicyModal)}
              className="h-11 px-4 gap-2 border-slate-200 hover:bg-slate-50 text-slate-800 font-semibold rounded-xl cursor-pointer"
            >
              <Sliders className="h-4 w-4 text-teal-600" />
              <span>{showPolicyModal ? "ซ่อนตั้งค่าเวลา" : "ตั้งค่าเวลา & ความจุปกติ"}</span>
            </Button>
          )}

          <Button
            onClick={loadData}
            disabled={busy}
            variant="outline"
            className="h-11 px-4 gap-2 border-slate-200 hover:bg-slate-50 text-slate-800 font-semibold rounded-xl cursor-pointer"
          >
            <RefreshCw className={cn("h-4 w-4 text-slate-500", busy && "animate-spin")} />
            <span>รีเฟรช</span>
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex items-center gap-2 shadow-2xs">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}
      {message && (
        <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900 flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
          <span className="font-medium">{message}</span>
        </div>
      )}

      {/* 2. Overview Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <Card className="border-slate-200/90 shadow-2xs bg-white hover:border-slate-300 transition-all">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">นัดหมายวันนี้</span>
              <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
                <CalendarDays className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-black text-slate-900">{metrics.todayCount}</div>
            <p className="text-xs text-slate-500 mt-1">คิวจองที่ตรงกับวันปัจจุบัน</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/90 shadow-2xs bg-white hover:border-blue-200 transition-all">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">รอลูกค้าส่งเครื่อง</span>
              <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-black text-blue-900">{metrics.confirmed}</div>
            <p className="text-xs text-slate-500 mt-1">ยืนยันแล้ว รอรับเครื่อง</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/90 shadow-2xs bg-white hover:border-teal-200 transition-all">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">รับเครื่องเข้าศูนย์แล้ว</span>
              <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
                <Wrench className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-black text-teal-900">{metrics.checkedIn}</div>
            <p className="text-xs text-slate-500 mt-1">สร้างใบงานซ่อมแล้ว</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/90 shadow-2xs bg-white hover:border-emerald-200 transition-all">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">เสร็จสิ้น (Completed)</span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-black text-emerald-900">{metrics.completed}</div>
            <p className="text-xs text-slate-500 mt-1">ดำเนินการปิดนัดหมายแล้ว</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/90 shadow-2xs bg-white hover:border-rose-200 transition-all col-span-2 lg:col-span-1">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">ยกเลิก / ขาดนัด</span>
              <div className="p-2 rounded-xl bg-rose-50 text-rose-700">
                <XCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-black text-rose-900">{metrics.cancelled}</div>
            <p className="text-xs text-slate-500 mt-1">นัดที่ถูกยกเลิกหรือลูกค้าไม่มา</p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Booking Policy Editor & Live Capacity Preview (Collapsible) */}
      {showPolicyModal && ["ADMIN", "MANAGER"].includes(currentUser.role) && (
        <Card className="border-teal-200/90 bg-white shadow-sm overflow-hidden animate-fade-in">
          <CardHeader className="border-b border-teal-100 bg-teal-50/70 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg font-bold text-teal-950 flex items-center gap-2">
                  <Settings className="h-5 w-5 text-teal-700" />
                  <span>ตั้งค่าตารางเวลารับจอง & ตรวจสอบความจุสด (Live Capacity Preview)</span>
                </CardTitle>
                <CardDescription className="text-xs text-slate-600 mt-1">
                  กำหนดเวลาเปิด-ปิด ความจุต่อสล็อต 30 นาที และวันหยุด — ระบบจะคำนวณและแสดงผลช่วงเวลาให้บริการทันที
                </CardDescription>
              </div>

              {/* Branch Selector for Policy */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">สาขาที่ตั้งค่า:</span>
                <select
                  value={policyBranchId}
                  onChange={(e) => setPolicyBranchId(e.target.value)}
                  className="rounded-xl border border-teal-300 bg-white px-3 py-1.5 text-xs font-bold text-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
                >
                  {activeBranchesList.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.code ? `(${b.code})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form Controls (Left side) */}
              <div className="lg:col-span-6 space-y-5">
                {/* Active Switch */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
                  <div>
                    <div className="text-sm font-bold text-slate-900">เปิดระบบรับจองคิวออนไลน์</div>
                    <div className="text-xs text-slate-500">อนุญาตให้ลูกค้าทั่วไปจองคิวตรวจเครื่องผ่านเว็บหน้าร้าน</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={policyActive}
                      onChange={(e) => setPolicyActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                  </label>
                </div>

                {/* Operating Hours */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      เวลาเปิดรับคิว (เริ่ม)
                    </label>
                    <input
                      type="time"
                      step={1800}
                      value={formatTimeMinute(policyOpens)}
                      onChange={(e) => setPolicyOpens(parseTimeToMinute(e.target.value))}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-teal-600 focus:outline-none shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      เวลาปิดรับคิว (สิ้นสุด)
                    </label>
                    <input
                      type="time"
                      step={1800}
                      value={formatTimeMinute(policyCloses)}
                      onChange={(e) => setPolicyCloses(parseTimeToMinute(e.target.value))}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-teal-600 focus:outline-none shadow-2xs"
                    />
                  </div>
                </div>

                {/* Slot Capacity */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      ความจุสูงสุดต่อช่วงเวลา (เครื่องต่อ 30 นาที)
                    </label>
                    <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200">
                      {policyCapacity} เครื่อง / สล็อต
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={policyCapacity}
                    onChange={(e) => setPolicyCapacity(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-mono">
                    <span>1 เครื่อง</span>
                    <span>5 เครื่อง</span>
                    <span>10 เครื่อง</span>
                  </div>
                </div>

                {/* Closed Weekdays */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    วันหยุดประจำสัปดาห์ (คลิกเพื่อสลับเปิด/ปิด)
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสฯ", "ศุกร์", "เสาร์"].map((dayName, idx) => {
                      const isClosed = policyClosedWeekdays.includes(idx);
                      return (
                        <button
                          key={dayName}
                          type="button"
                          onClick={() => {
                            if (isClosed) {
                              setPolicyClosedWeekdays(policyClosedWeekdays.filter((d) => d !== idx));
                            } else {
                              setPolicyClosedWeekdays([...policyClosedWeekdays, idx]);
                            }
                          }}
                          className={cn(
                            "py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-2xs",
                            isClosed
                              ? "bg-rose-50 text-rose-700 border-rose-200 line-through"
                              : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                          )}
                        >
                          {dayName}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Closed Dates */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    วันหยุดพิเศษประจำสาขา (เช่น วันหยุดนักขัตฤกษ์)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={newClosedDateInput}
                      onChange={(e) => setNewClosedDateInput(e.target.value)}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (newClosedDateInput && !policyClosedDates.includes(newClosedDateInput)) {
                          setPolicyClosedDates([...policyClosedDates, newClosedDateInput]);
                          setNewClosedDateInput("");
                        }
                      }}
                      className="text-xs font-bold gap-1 rounded-xl cursor-pointer"
                    >
                      <PlusCircle className="h-3.5 w-3.5 text-teal-600" />
                      <span>เพิ่มวันหยุด</span>
                    </Button>
                  </div>

                  {policyClosedDates.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {policyClosedDates.map((dateStr) => (
                        <span
                          key={dateStr}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200"
                        >
                          <span>{dateStr}</span>
                          <button
                            type="button"
                            onClick={() => setPolicyClosedDates(policyClosedDates.filter((d) => d !== dateStr))}
                            className="hover:text-rose-950 p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <Button
                    disabled={busy}
                    onClick={submitPolicy}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-2.5 rounded-xl cursor-pointer shadow-2xs"
                  >
                    บันทึกการตั้งค่า
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPolicyModal(false)}
                    className="rounded-xl px-4 py-2.5 text-slate-600"
                  >
                    ยกเลิก
                  </Button>
                </div>
              </div>

              {/* Live Capacity Preview (Right side) */}
              <div className="lg:col-span-6 border border-slate-200 rounded-2xl bg-slate-50/70 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-teal-600" />
                      <span className="text-sm font-bold text-slate-900">
                        ตัวอย่างความจุรายวันสด (Live Capacity Grid)
                      </span>
                    </div>
                    <Badge variant={policyActive ? "default" : "secondary"} className="text-xs">
                      {policyActive ? "สถานะ: เปิดรับจอง" : "สถานะ: ปิดรับจอง"}
                    </Badge>
                  </div>

                  {/* Summary Metric Strip */}
                  <div className="grid grid-cols-3 gap-2.5 my-4">
                    <div className="bg-white p-3 rounded-xl border border-slate-200/90 text-center shadow-2xs">
                      <div className="text-[11px] font-semibold text-slate-500">เวลาทำการ</div>
                      <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                        {totalOperatingHours} ชม./วัน
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200/90 text-center shadow-2xs">
                      <div className="text-[11px] font-semibold text-slate-500">จำนวนสล็อต</div>
                      <div className="text-sm font-extrabold text-teal-700 mt-0.5">
                        {totalDailySlots} ช่วงเวลา
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200/90 text-center shadow-2xs">
                      <div className="text-[11px] font-semibold text-slate-500">ความจุสูงสุด</div>
                      <div className="text-sm font-extrabold text-emerald-700 mt-0.5">
                        {totalDailyCapacity} เครื่อง/วัน
                      </div>
                    </div>
                  </div>

                  {/* Timeline Slots Scroll Area */}
                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                    {livePreviewSlots.map((slot, index) => (
                      <div
                        key={slot.startMin}
                        className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium hover:border-teal-300 transition-all shadow-2xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 text-center font-mono text-[10px] text-slate-400">
                            #{index + 1}
                          </span>
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-bold text-slate-800">
                            {slot.start} - {slot.end}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-500">ความจุ:</span>
                          <span className="font-extrabold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/80">
                            {policyCapacity} คิว
                          </span>
                        </div>
                      </div>
                    ))}

                    {livePreviewSlots.length === 0 && (
                      <div className="p-8 text-center text-xs text-rose-600 bg-rose-50 rounded-xl border border-rose-200">
                        เวลาเปิดและปิดไม่ถูกต้อง กรุณาเลือกเวลาเปิดที่น้อยกว่าเวลาปิด
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 text-[11px] text-slate-500 mt-4">
                  💡 หมายเหตุ: การแก้ไขเวลารับจองจะไม่มีผลกระทบต่อรายการที่ลูกค้ากดยืนยันแล้วในอดีต
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. Filter & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหารหัสนัดหมาย (BK-...), ชื่อลูกค้า, เบอร์โทร, หรือรุ่นเครื่อง..."
            className="pl-9 h-10.5 rounded-xl border-slate-200 bg-slate-50/70 text-sm focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Branch & Date Pickers */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Branch Switcher */}
          <div className="flex items-center gap-1.5">
            <Building2 className="h-4 w-4 text-slate-400" />
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="h-10.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              <option value="">ทุกสาขาที่คุณมีสิทธิ์</option>
              {activeBranchesList.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.code ? `(${b.code})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-10.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          {/* Quick Date Filters */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => setDateFilter(todayBangkok)}
              className={cn(
                "px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer",
                dateFilter === todayBangkok
                  ? "bg-white text-teal-800 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              วันนี้
            </button>
            <button
              onClick={() => setDateFilter(tomorrowBangkok)}
              className={cn(
                "px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer",
                dateFilter === tomorrowBangkok
                  ? "bg-white text-teal-800 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              พรุ่งนี้
            </button>
            {dateFilter && (
              <button
                onClick={() => setDateFilter("")}
                className="px-2 py-1 text-xs font-semibold text-rose-600 hover:text-rose-700"
                title="ล้างตัวกรองวันที่"
              >
                ✕ ล้าง
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 5. Status Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: "ALL", label: "ทั้งหมด", count: metrics.total },
          { key: "CONFIRMED", label: "รอลูกค้าส่งเครื่อง", count: metrics.confirmed },
          { key: "CHECKED_IN", label: "รับเครื่องแล้ว", count: metrics.checkedIn },
          { key: "COMPLETED", label: "เสร็จสิ้น", count: metrics.completed },
          { key: "CANCELLED", label: "ยกเลิก / ขาดนัด", count: metrics.cancelled },
        ].map((tab) => {
          const active = statusFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer whitespace-nowrap shadow-2xs",
                active
                  ? "bg-teal-600 text-white border-teal-600"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-extrabold",
                  active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 6. Appointments List */}
      <div className="space-y-3.5">
        {filteredAppointments.map((row) => {
          const status = statusMap[row.status] || {
            label: row.status,
            color: "text-slate-700",
            bg: "bg-slate-100",
            border: "border-slate-200",
          };

          const branchName =
            branches.find((b) => b.id === row.branchId)?.name ||
            userBranches.find((b) => b.id === row.branchId)?.name ||
            "สาขาหลัก";

          const rowDateStr = row.slot ? toBangkokDateString(row.slot.startsAt) : "";
          const isToday = rowDateStr === todayBangkok;
          const isTomorrow = rowDateStr === tomorrowBangkok;

          return (
            <Card
              key={row.id}
              className="border-slate-200/90 shadow-2xs hover:shadow-xs transition-all bg-white overflow-hidden group"
            >
              <CardContent className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left Side: Booking & Customer Details */}
                <div className="space-y-2.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Booking Reference Pill */}
                    <span className="font-mono text-xs font-black tracking-wider text-teal-900 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                      {row.bookingRef}
                    </span>

                    {/* Customer Display Name */}
                    <span className="text-base font-extrabold text-slate-900">
                      {row.account?.displayName || "ลูกค้าออนไลน์"}
                    </span>

                    {/* Status Badge */}
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-extrabold",
                        status.bg,
                        status.color,
                        status.border
                      )}
                    >
                      {status.label}
                    </span>

                    {/* Customer KYC Account Link Indicator */}
                    {row.isLinked ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <ShieldCheck className="h-3 w-3 text-emerald-600" />
                        <span>เชื่อมประวัติ CRM แล้ว</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        <Sparkles className="h-3 w-3 text-amber-600" />
                        <span>จะผูกประวัติอัตโนมัติเมื่อรับเครื่อง</span>
                      </span>
                    )}

                    {/* Branch Badge */}
                    <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80">
                      {branchName}
                    </span>
                  </div>

                  {/* Second Line: Metadata (Time, Device, Phone, Service) */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                    {/* Date & Time */}
                    <div className="flex items-center gap-1.5 font-medium">
                      <Clock className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                      <span className="font-bold text-slate-900">
                        {row.slot
                          ? new Date(row.slot.startsAt).toLocaleString("th-TH", {
                              timeZone: "Asia/Bangkok",
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "ไม่พบข้อมูลเวลา"}
                      </span>
                      {isToday && (
                        <span className="bg-rose-100 text-rose-800 font-extrabold text-[10px] px-1.5 py-0.5 rounded">
                          วันนี้
                        </span>
                      )}
                      {isTomorrow && (
                        <span className="bg-blue-100 text-blue-800 font-extrabold text-[10px] px-1.5 py-0.5 rounded">
                          พรุ่งนี้
                        </span>
                      )}
                    </div>

                    {/* Device Model */}
                    <div className="flex items-center gap-1.5">
                      <Smartphone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-800">{row.deviceModel}</span>
                    </div>

                    {/* Service */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">บริการ:</span>
                      <span className="font-medium text-slate-700">{row.service}</span>
                    </div>

                    {/* Phone Number */}
                    {row.account?.phone && (
                      <div className="flex items-center gap-1.5 font-mono">
                        <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="text-slate-700 font-semibold">{row.account.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Third Line: Issue Description */}
                  {row.issueDescription && (
                    <div className="text-xs text-slate-500 bg-slate-50/80 p-2 rounded-lg border border-slate-200/60 max-w-2xl">
                      <span className="font-bold text-slate-700">อาการที่แจ้ง: </span>
                      <span>{row.issueDescription}</span>
                    </div>
                  )}
                </div>

                {/* Right Side: Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 self-start lg:self-center">
                  {row.status === "CONFIRMED" && (
                    <>
                      {/* 1-Click Check-In Action Button */}
                      <Button
                        disabled={busy}
                        onClick={() => openCheckInModal(row)}
                        className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-10 px-4 rounded-xl shadow-2xs gap-1.5 text-xs cursor-pointer"
                      >
                        <Wrench className="h-4 w-4" />
                        <span>รับเครื่องเข้าศูนย์ (Check-in)</span>
                      </Button>

                      <Button
                        disabled={busy}
                        variant="outline"
                        onClick={() => {
                          if (confirm(`ยืนยันว่าคุณ ${row.account?.displayName || "ลูกค้า"} ไม่ได้มาตามนัดหมาย?`)) {
                            void performAction({ id: row.id, action: "NO_SHOW" });
                          }
                        }}
                        className="h-10 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                      >
                        ไม่มาตามนัด
                      </Button>

                      <Button
                        disabled={busy}
                        variant="outline"
                        onClick={() => openCancelModal(row)}
                        className="h-10 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 border-rose-200 rounded-xl cursor-pointer"
                      >
                        ยกเลิกนัด
                      </Button>
                    </>
                  )}

                  {row.status === "CHECKED_IN" && (
                    <>
                      <Button
                        disabled={busy}
                        variant="outline"
                        onClick={() => void performAction({ id: row.id, action: "COMPLETED" })}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200 font-bold h-10 px-4 rounded-xl text-xs cursor-pointer shadow-2xs gap-1.5"
                      >
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>ปิดงานนัดหมาย (Completed)</span>
                      </Button>

                      {row.repairJobId && (
                        <Link href={`/repairs/${row.repairJobId}`}>
                          <Button
                            variant="outline"
                            className="h-10 px-4 text-xs font-bold text-teal-800 border-teal-200 hover:bg-teal-50 rounded-xl gap-1.5 cursor-pointer"
                          >
                            <span>เปิดดูใบงานซ่อม</span>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                    </>
                  )}

                  {row.status === "COMPLETED" && row.repairJobId && (
                    <Link href={`/repairs/${row.repairJobId}`}>
                      <Button
                        variant="outline"
                        className="h-10 px-4 text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-50 rounded-xl gap-1.5 cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5 text-slate-500" />
                        <span>ดูใบงานซ่อม ({`REP-${row.bookingRef}`})</span>
                        <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Empty State */}
        {!busy && filteredAppointments.length === 0 && (
          <Card className="border-slate-200 bg-white p-12 text-center rounded-2xl shadow-2xs">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mx-auto mb-4">
              <CalendarCheck className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">ไม่พบนัดหมายในเงื่อนไขที่เลือก</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery || dateFilter || statusFilter !== "ALL" || selectedBranchId
                ? "ลองล้างตัวกรองหรือเปลี่ยนคำค้นหาเพื่อดูรายการนัดหมายอื่นๆ"
                : "เมื่อลูกค้าทำการจองคิวนำเครื่องเข้าตรวจซ่อมผ่านหน้าร้านออนไลน์ รายการจะปรากฏขึ้นที่นี่ทันที"}
            </p>
            {(searchQuery || dateFilter || statusFilter !== "ALL" || selectedBranchId) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setDateFilter("");
                  setStatusFilter("ALL");
                  setSelectedBranchId("");
                }}
                className="mt-4 text-xs font-bold rounded-xl"
              >
                ล้างตัวกรองทั้งหมด
              </Button>
            )}
          </Card>
        )}
      </div>

      {/* 7. Modal: 1-Click Check-in Modal */}
      <Dialog open={checkInModalOpen} onOpenChange={setCheckInModalOpen} maxWidth="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-teal-950 font-bold">
            <Wrench className="h-5 w-5 text-teal-600" />
            <span>รับเครื่องเข้าศูนย์ & สร้างใบงานซ่อม (1-Click Check-in)</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            ระบบจะแปลงนัดหมายเป็นใบรับงานซ่อมจริง พร้อมผูกประวัติลูกค้าให้อัตโนมัติในคลิกเดียว
          </DialogDescription>
        </DialogHeader>

        <DialogContent className="space-y-4 pt-2">
          {checkInSuccessInfo ? (
            <div className="space-y-4 py-2">
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 text-center">
                <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                  <Check className="h-6 w-6 stroke-[3]" />
                </div>
                <h4 className="text-base font-extrabold text-emerald-900">รับเครื่องเข้าศูนย์เรียบร้อยแล้ว!</h4>
                <p className="text-xs text-emerald-700 mt-1">
                  สร้างใบรับงานซ่อมรหัส{" "}
                  <span className="font-mono font-bold">{checkInSuccessInfo.trackingCode}</span> แล้ว
                </p>
              </div>

              <div className="flex gap-2.5">
                <Link href={`/repairs/${checkInSuccessInfo.repairJobId}`} className="flex-1">
                  <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold h-11 rounded-xl gap-2 cursor-pointer">
                    <span>เปิดดูใบงานซ่อมทันที</span>
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCheckInModalOpen(false);
                    setCheckInSuccessInfo(null);
                  }}
                  className="rounded-xl px-5 h-11 font-semibold"
                >
                  ปิดหน้าต่าง
                </Button>
              </div>
            </div>
          ) : (
            selectedCheckIn && (
              <div className="space-y-4">
                {/* Appointment Information Card */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">รหัสนัดหมาย:</span>
                    <span className="font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      {selectedCheckIn.bookingRef}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">ลูกค้า:</span>
                    <span className="font-bold text-slate-800">
                      {selectedCheckIn.account?.displayName || "ลูกค้าออนไลน์"}{" "}
                      {selectedCheckIn.account?.phone && `(${selectedCheckIn.account.phone})`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">รุ่นเครื่อง & บริการ:</span>
                    <span className="font-bold text-slate-800">
                      {selectedCheckIn.deviceModel} — {selectedCheckIn.service}
                    </span>
                  </div>
                  {selectedCheckIn.issueDescription && (
                    <div className="text-xs border-t border-slate-200 pt-1.5 mt-1.5">
                      <span className="text-slate-500">อาการที่แจ้ง: </span>
                      <span className="text-slate-700">{selectedCheckIn.issueDescription}</span>
                    </div>
                  )}
                </div>

                {/* KYC Auto-Link Status Note */}
                <div className="p-3 rounded-xl border text-xs flex items-center gap-2.5 bg-teal-50/70 border-teal-200 text-teal-900">
                  <ShieldCheck className="h-4 w-4 text-teal-700 shrink-0" />
                  <div>
                    {selectedCheckIn.isLinked ? (
                      <span>
                        <strong>บัญชีเชื่อมโยงกับ CRM แล้ว:</strong> ระบบจะผูกงานซ่อมเข้ากับประวัติลูกค้ารายนี้ทันที
                      </span>
                    ) : (
                      <span>
                        <strong>เชื่อมประวัติให้อัตโนมัติ:</strong> ระบบจะสร้าง/ผูกข้อมูลลูกค้า CRM
                        โดยใช้ข้อมูลและเบอร์โทรจากการจอง พร้อมบันทึกหลักฐานการตรวจรับเครื่องหน้าร้าน
                      </span>
                    )}
                  </div>
                </div>

                {/* Device Brand Quick Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ยี่ห้อของเครื่อง (Device Brand)
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {BRAND_SUGGESTIONS.map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setCheckInBrand(b)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer",
                          checkInBrand === b
                            ? "bg-teal-600 text-white border-teal-600"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                  <Input
                    value={checkInBrand}
                    onChange={(e) => setCheckInBrand(e.target.value)}
                    placeholder="พิมพ์ยี่ห้อเครื่อง เช่น Apple, Samsung, Oppo..."
                    className="h-9.5 text-xs rounded-xl"
                  />
                </div>

                {/* Evidence Note */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    บันทึกหลักฐานการตรวจรับ (Evidence Note สำหรับ Audit Log)
                  </label>
                  <Input
                    value={checkInEvidence}
                    onChange={(e) => setCheckInEvidence(e.target.value)}
                    placeholder="อย่างน้อย 10 ตัวอักษร เช่น ลูกค้านำเครื่องเข้าตรวจรับที่สาขาตามนัดหมาย"
                    className="h-9.5 text-xs rounded-xl"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    * ไม่ระบุข้อมูลส่วนบุคคล เช่น เลขบัตรประชาชน หรือรหัสผ่านของลูกค้า
                  </p>
                </div>
              </div>
            )
          )}
        </DialogContent>

        {!checkInSuccessInfo && (
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setCheckInModalOpen(false)}
              className="rounded-xl px-4 text-xs font-semibold"
            >
              ยกเลิก
            </Button>
            <Button
              disabled={busy}
              onClick={submitCheckIn}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl px-5 text-xs cursor-pointer shadow-2xs gap-1.5"
            >
              {busy ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5 stroke-[3]" />
              )}
              <span>ยืนยันรับเครื่อง & สร้างใบงาน</span>
            </Button>
          </DialogFooter>
        )}
      </Dialog>

      {/* 8. Modal: Cancellation Reason */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen} maxWidth="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-950 font-bold">
            <XCircle className="h-5 w-5 text-rose-600" />
            <span>ระบุเหตุผลการยกเลิกนัดหมาย</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            ระบบจะส่งการแจ้งเตือนไปยังบัญชีของลูกค้าและคืนความจุ (Slot Capacity) กลับสู่ระบบ
          </DialogDescription>
        </DialogHeader>

        <DialogContent className="space-y-4 pt-2">
          {selectedCancel && (
            <div className="space-y-3">
              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                ยกเลิกนัดหมายรหัส <strong className="font-mono text-slate-900">{selectedCancel.bookingRef}</strong>{" "}
                ของลูกค้า <strong>{selectedCancel.account?.displayName || "ลูกค้าออนไลน์"}</strong>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  เลือกข้อความเหตุผลสำเร็จรูป
                </label>
                <div className="space-y-1.5">
                  {[
                    "ลูกค้าโทรแจ้งขอเลื่อนนัดหมายออกไป",
                    "ทางร้านติดต่อลูกค้าไม่ได้ตามเวลาที่นัดหมาย",
                    "อะไหล่หรือช่างผู้ชำนาญการไม่พร้อมให้บริการในวันดังกล่าว",
                    "ลูกค้าขอยกเลิกนัดเนื่องจากติดธุระด่วน",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCancelReason(preset)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-xl text-xs border transition-all cursor-pointer",
                        cancelReason === preset
                          ? "bg-rose-50 text-rose-800 border-rose-300 font-bold"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ข้อความเหตุผลเพิ่มเติม (อย่างน้อย 10 ตัวอักษร)
                </label>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="ระบุเหตุผลอย่างละเอียด..."
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
            </div>
          )}
        </DialogContent>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setCancelModalOpen(false)}
            className="rounded-xl px-4 text-xs font-semibold"
          >
            ปิด
          </Button>
          <Button
            disabled={busy || cancelReason.trim().length < 10}
            onClick={submitCancel}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl px-5 text-xs cursor-pointer shadow-2xs"
          >
            ยืนยันการยกเลิกนัด
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
