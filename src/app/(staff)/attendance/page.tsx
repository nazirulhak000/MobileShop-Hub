"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  Clock,
  UserCheck,
  AlertTriangle,
  UserX,
  Search,
  Download,
  Plus,
  LogIn,
  LogOut,
  Calendar,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Pencil,
  RefreshCw,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";

type AttendanceStatus = "ON_TIME" | "LATE" | "ABSENT" | "LEAVE";

interface AttendanceRecord {
  id: string;
  userId: string;
  branchId: string;
  day: string; // YYYY-MM-DD (Bangkok)
  clockIn: string | null; // ISO instant
  clockOut: string | null; // ISO instant
  totalHours: number | null;
  status: AttendanceStatus;
  notes: string | null;
  verifiedBy: string | null;
  user: { id: string; name: string; role: string } | null;
  branch: { id: string; name: string; code: string } | null;
}

const bangkokDay = (d: Date = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(d);
const bangkokTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) : null;
/** "HH:mm" in Bangkok for <input type="time">. */
const bangkokHHmm = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso)) : "";

/** Fetch JSON and throw the server's Thai error message unless both res.ok and json.success. */
async function fetchJson<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.error || `ไม่สามารถทำรายการได้ (${res.status})`);
  return json as T;
}

const ROLE_BADGE: Record<string, string> = {
  ADMIN: "bg-purple-50 text-purple-700 border-purple-200",
  MANAGER: "bg-blue-50 text-blue-700 border-blue-200",
  TECHNICIAN: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CASHIER: "bg-amber-50 text-amber-700 border-amber-200",
};

export default function AttendancePage() {
  const { currentUser, branches, users } = useApp();
  const isManager = currentUser.role === "ADMIN" || currentUser.role === "MANAGER";

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [me, setMe] = useState<AttendanceRecord | null>(null);
  const [policy, setPolicy] = useState<{ shiftStart: string; lateGraceMinutes: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [clockBusy, setClockBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const [selectedDate, setSelectedDate] = useState(() => bangkokDay());
  const [selectedBranch, setSelectedBranch] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Correction modal (managers)
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AttendanceRecord | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [clockInTime, setClockInTime] = useState("");
  const [clockOutTime, setClockOutTime] = useState("");
  const [formStatus, setFormStatus] = useState<AttendanceStatus | "AUTO">("AUTO");
  const [formReason, setFormReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const qs = new URLSearchParams({ day: selectedDate });
      if (isManager && selectedBranch !== "ALL") qs.set("branch", selectedBranch);
      const json = await fetchJson<{ data: AttendanceRecord[]; me: AttendanceRecord | null; policy: { shiftStart: string; lateGraceMinutes: number } }>(
        `/api/attendance?${qs}`
      );
      setRecords(json.data);
      setMe(json.me);
      setPolicy(json.policy ?? null);
    } catch (e) {
      setRecords([]);
      setLoadError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedBranch, isManager]);

  useEffect(() => {
    if (currentUser.id) void loadRecords();
  }, [loadRecords, currentUser.id]);

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return records.filter((r) => {
      const matchStatus = statusFilter === "ALL" || r.status === statusFilter;
      const matchSearch =
        !q ||
        (r.user?.name ?? "").toLowerCase().includes(q) ||
        (r.branch?.name ?? "").toLowerCase().includes(q) ||
        (r.notes ?? "").toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [records, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const count = (s: AttendanceStatus) => records.filter((r) => r.status === s).length;
    return { total: records.length, onTime: count("ON_TIME"), late: count("LATE"), leave: count("LEAVE"), absent: count("ABSENT") };
  }, [records]);

  // Clock state for the current user, today (Bangkok).
  const canClockIn = !me;
  const canClockOut = Boolean(me?.clockIn && !me?.clockOut);

  const handleClock = async (action: "CLOCK_IN" | "CLOCK_OUT") => {
    setClockBusy(true);
    setNotice(null);
    try {
      const json = await fetchJson<{ data: AttendanceRecord | null }>("/api/attendance", { method: "POST", body: JSON.stringify({ action }) });
      const t = bangkokTime(action === "CLOCK_IN" ? json.data?.clockIn ?? null : json.data?.clockOut ?? null);
      setNotice({ kind: "ok", text: `${action === "CLOCK_IN" ? "บันทึกเวลาเข้างาน" : "บันทึกเวลาออกงาน"}สำเร็จ${t ? ` (${t})` : ""}` });
      await loadRecords();
    } catch (e) {
      setNotice({ kind: "error", text: e instanceof Error ? e.message : "ลงเวลาไม่สำเร็จ" });
    } finally {
      setClockBusy(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setSelectedUserId(users.find((u) => u.id !== currentUser.id)?.id ?? users[0]?.id ?? "");
    setClockInTime("");
    setClockOutTime("");
    setFormStatus("AUTO");
    setFormReason("");
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (r: AttendanceRecord) => {
    setEditing(r);
    setSelectedUserId(r.userId);
    setClockInTime(bangkokHHmm(r.clockIn));
    setClockOutTime(bangkokHHmm(r.clockOut));
    setFormStatus(r.status);
    setFormReason("");
    setFormError(null);
    setModalOpen(true);
  };

  const handleSaveModal = async () => {
    if (formReason.trim().length < 3) {
      setFormError("กรุณาระบุเหตุผลการแก้ไขอย่างน้อย 3 ตัวอักษร");
      return;
    }
    // Validate that clockOut is after clockIn when both are provided.
    if (clockInTime && clockOutTime && clockOutTime <= clockInTime) {
      setFormError("เวลาออกงานต้องมากกว่าเวลาเข้างาน");
      return;
    }
    // When creating a new record, a user must be selected.
    if (!editing && !selectedUserId) {
      setFormError("กรุณาเลือกพนักงาน");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload: Record<string, unknown> = {
        clockIn: clockInTime || null,
        clockOut: clockOutTime || null,
        reason: formReason.trim(),
      };
      if (formStatus !== "AUTO") payload.status = formStatus;
      if (editing) payload.id = editing.id;
      else {
        payload.userId = selectedUserId;
        payload.day = selectedDate;
      }
      await fetchJson("/api/attendance", { method: "PATCH", body: JSON.stringify(payload) });
      setModalOpen(false);
      await loadRecords();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const exportCSV = () => {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const headers = ["พนักงาน,ตำแหน่ง,สาขา,วันที่,เวลาเข้า,เวลาออก,ชั่วโมงรวม,สถานะ,หมายเหตุ"];
    const rows = filteredRecords.map((r) =>
      [
        esc(r.user?.name ?? r.userId),
        r.user?.role ?? "",
        esc(r.branch?.name ?? ""),
        r.day,
        bangkokTime(r.clockIn) ?? "-",
        bangkokTime(r.clockOut) ?? "-",
        r.totalHours ?? "-",
        r.status,
        esc(r.notes ?? ""),
      ].join(",")
    );
    const csvContent = "﻿" + [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance_${selectedDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <CalendarCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">ระบบบันทึกเวลาเข้า-ออกงาน (Attendance)</h1>
            <p className="text-xs text-slate-500">
              เช็คชื่อพนักงานรายวัน ตรวจสอบสถานะมาสาย ขาด ลา และคำนวณชั่วโมงปฏิบัติงาน
              {policy && ` · เข้างาน ${policy.shiftStart} น. (สายหลัง ${policy.lateGraceMinutes} นาที)`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => void loadRecords()} disabled={loading} className="gap-2 text-xs h-9 border-slate-300 hover:bg-slate-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            รีเฟรช
          </Button>
          <Button variant="outline" onClick={exportCSV} disabled={loading || filteredRecords.length === 0} className="gap-2 text-xs h-9 border-slate-300 hover:bg-slate-50">
            <Download className="h-3.5 w-3.5" />
            ส่งออก CSV
          </Button>
          {isManager && (
            <Button onClick={openCreate} className="gap-2 text-xs h-9 bg-blue-600 text-white hover:bg-blue-700 shadow-xs">
              <Plus className="h-3.5 w-3.5" />
              เพิ่ม/แก้ไขบันทึกเวลา
            </Button>
          )}
        </div>
      </div>

      {/* My clock card */}
      <Card className="border-slate-200 bg-slate-900 text-white shadow-2xs">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Clock className="h-6 w-6 text-emerald-400" />
            <div>
              <div className="text-sm font-semibold">ลงเวลาของฉัน ({currentUser.name || "-"})</div>
              <div className="text-xs text-slate-300">
                {me
                  ? `เข้างาน ${bangkokTime(me.clockIn) ?? "-"} · ออกงาน ${bangkokTime(me.clockOut) ?? "ยังไม่ออกงาน"}${me.totalHours != null ? ` · ${me.totalHours} ชม.` : ""}`
                  : "วันนี้ยังไม่ได้ลงเวลาเข้างาน"}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => void handleClock("CLOCK_IN")} disabled={clockBusy || loading || !canClockIn} className="gap-2 text-xs h-9 bg-emerald-600 text-white hover:bg-emerald-700">
              {clockBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogIn className="h-3.5 w-3.5" />}
              ลงเวลาเข้างาน
            </Button>
            <Button onClick={() => void handleClock("CLOCK_OUT")} disabled={clockBusy || loading || !canClockOut} className="gap-2 text-xs h-9 bg-white text-slate-900 hover:bg-slate-100">
              {clockBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
              ลงเวลาออกงาน
            </Button>
          </div>
        </CardContent>
      </Card>

      {notice && (
        <div className={`flex items-start gap-2 rounded-lg border p-3 text-xs ${notice.kind === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {notice.kind === "ok" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          <span>{notice.text}</span>
        </div>
      )}
      {loadError && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <Card className="border-slate-200 bg-white shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>พนักงานลงเวลา</span>
              <UserCheck className="h-4 w-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">
              {stats.total} <span className="text-xs font-normal text-slate-400">คน</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/40 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-emerald-700 mb-1">
              <span>ตรงเวลา (On Time)</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-700 tabular-nums">
              {stats.onTime} <span className="text-xs font-normal text-emerald-600">คน</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/40 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-amber-700 mb-1">
              <span>มาสาย (Late)</span>
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-amber-700 tabular-nums">
              {stats.late} <span className="text-xs font-normal text-amber-600">คน</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/40 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-blue-700 mb-1">
              <span>ลากิจ / ลาป่วย</span>
              <Calendar className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-700 tabular-nums">
              {stats.leave} <span className="text-xs font-normal text-blue-600">คน</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-rose-200 bg-rose-50/40 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-rose-700 mb-1">
              <span>ขาดงาน (Absent)</span>
              <UserX className="h-4 w-4 text-rose-600" />
            </div>
            <div className="text-2xl font-bold text-rose-700 tabular-nums">
              {stats.absent} <span className="text-xs font-normal text-rose-600">คน</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-xs text-slate-700">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-medium">วันที่:</span>
            <input
              type="date"
              value={selectedDate}
              max={bangkokDay()}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-800 outline-none cursor-pointer"
            />
          </div>

          {isManager && (
            <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-xs text-slate-700">
              <Building2 className="h-3.5 w-3.5 text-slate-400" />
              <span className="font-medium">สาขา:</span>
              <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} className="bg-transparent text-xs font-medium text-slate-800 outline-none cursor-pointer">
                <option value="ALL">ทุกสาขา ({branches.length})</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-1 bg-slate-50 text-xs">
            {["ALL", "ON_TIME", "LATE", "LEAVE", "ABSENT"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  statusFilter === st ? "bg-white text-slate-900 shadow-2xs border border-slate-200/80 font-semibold" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {st === "ALL" && "ทั้งหมด"}
                {st === "ON_TIME" && "ตรงเวลา"}
                {st === "LATE" && "มาสาย"}
                {st === "LEAVE" && "ลางาน"}
                {st === "ABSENT" && "ขาด"}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input placeholder="ค้นหาชื่อพนักงาน หรือสาขา..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 text-xs h-9 bg-slate-50/50" />
        </div>
      </div>

      {/* Attendance Table */}
      <Card className="border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/75 border-b border-slate-200">
              <TableRow>
                <TableHead className="text-xs font-semibold text-slate-600">พนักงาน</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">ตำแหน่ง & สาขา</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">เวลาเข้างาน</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">เวลาออกงาน</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">ชั่วโมงทำงาน</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">สถานะ</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">หมายเหตุ / บันทึก</TableHead>
                {isManager && <TableHead className="text-xs font-semibold text-slate-600 text-center">แก้ไข</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={isManager ? 8 : 7} className="h-48 text-center">
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลดข้อมูล...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isManager ? 8 : 7} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
                      <CalendarCheck className="h-8 w-8 text-slate-300" />
                      <p className="text-sm font-medium text-slate-600">ไม่พบข้อมูลการลงเวลาสำหรับเงื่อนไขนี้</p>
                      <p className="text-xs text-slate-400">ลองเปลี่ยนวันที่ หรือเลือกสาขาอื่น</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((r) => {
                  const name = r.user?.name ?? "-";
                  return (
                    <TableRow key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 font-semibold text-xs text-slate-700 border border-slate-200">{name.slice(0, 2)}</div>
                          <div className="font-semibold text-xs text-slate-900">{name}</div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="space-y-1">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${ROLE_BADGE[r.user?.role ?? ""] || "bg-slate-100 text-slate-700"}`}>{r.user?.role ?? "-"}</span>
                          <div className="text-xs text-slate-600 font-medium">{r.branch?.name ?? "-"}</div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-800">
                          <LogIn className="h-3.5 w-3.5 text-emerald-600" />
                          <span>{bangkokTime(r.clockIn) ?? "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-1.5 font-mono text-xs text-slate-600">
                          <LogOut className="h-3.5 w-3.5 text-slate-400" />
                          <span>{bangkokTime(r.clockOut) ?? (r.clockIn ? "ยังไม่ออกงาน" : "-")}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="font-mono text-xs text-slate-700">{r.totalHours != null ? `${r.totalHours} ชม.` : "-"}</span>
                      </TableCell>
                      <TableCell className="py-3">
                        {r.status === "ON_TIME" && <Badge variant="success" className="text-[11px] font-semibold">ตรงเวลา</Badge>}
                        {r.status === "LATE" && <Badge variant="warning" className="text-[11px] font-semibold">มาสาย</Badge>}
                        {r.status === "LEAVE" && <Badge variant="default" className="text-[11px] font-semibold bg-blue-50 text-blue-700 border-blue-200">ลางาน</Badge>}
                        {r.status === "ABSENT" && <Badge variant="danger" className="text-[11px] font-semibold">ขาดงาน</Badge>}
                      </TableCell>
                      <TableCell className="py-3 max-w-xs">
                        <p className="text-xs text-slate-500 truncate" title={r.notes ?? undefined}>
                          {r.notes || "-"}
                        </p>
                        {r.verifiedBy && <p className="text-[10px] text-slate-400">แก้ไขโดยผู้จัดการ</p>}
                      </TableCell>
                      {isManager && (
                        <TableCell className="py-3 text-center">
                          {r.userId === currentUser.id && currentUser.role !== "ADMIN" ? (
                            <span className="text-slate-300 text-xs">-</span>
                          ) : (
                            <button onClick={() => openEdit(r)} className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="แก้ไขเวลา">
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Manager correction modal */}
      {isManager && (
        <Dialog open={modalOpen} onOpenChange={(o) => !saving && setModalOpen(o)} preventClose={saving}>
          <DialogHeader>
            <DialogTitle onClose={() => !saving && setModalOpen(false)}>
              {editing ? `แก้ไขเวลาของ ${editing.user?.name ?? ""} (${editing.day})` : `บันทึกเวลาพนักงาน วันที่ ${selectedDate}`}
            </DialogTitle>
          </DialogHeader>
          <DialogContent className="space-y-4">
            {formError && (
              <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}
            {!editing && (
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">เลือกพนักงาน</label>
                <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 bg-white">
                  {users
                    .filter((u) => currentUser.role === "ADMIN" || u.id !== currentUser.id)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role} - สาขา {u.branchCode})
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">หากพนักงานมีบันทึกในวันนี้อยู่แล้ว ระบบจะแก้ไขบันทึกเดิม</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">เวลาเข้างาน</label>
                <Input type="time" value={clockInTime} onChange={(e) => setClockInTime(e.target.value)} className="text-xs h-9" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">เวลาออกงาน</label>
                <Input type="time" value={clockOutTime} onChange={(e) => setClockOutTime(e.target.value)} className="text-xs h-9" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">สถานะการเข้างาน</label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { id: "AUTO", label: "คำนวณอัตโนมัติ" },
                  { id: "ON_TIME", label: "ตรงเวลา" },
                  { id: "LATE", label: "มาสาย" },
                  { id: "LEAVE", label: "ลางาน" },
                  { id: "ABSENT", label: "ขาดงาน" },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setFormStatus(st.id as AttendanceStatus | "AUTO")}
                    className={`p-2 rounded-lg text-xs font-semibold border transition-all text-center ${
                      formStatus === st.id ? "border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-500" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">เหตุผลการแก้ไข *</label>
              <textarea
                rows={2}
                value={formReason}
                maxLength={500}
                onChange={(e) => setFormReason(e.target.value)}
                placeholder="เช่น ลืมลงเวลา, ลากิจตามใบลา, ระบบขัดข้อง..."
                className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">การแก้ไขทุกครั้งจะถูกบันทึกใน Audit Log</p>
            </div>
          </DialogContent>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving} className="text-xs">
              ยกเลิก
            </Button>
            <Button onClick={() => void handleSaveModal()} disabled={saving || (!editing && !selectedUserId)} className="text-xs bg-blue-600 text-white hover:bg-blue-700 gap-1.5">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}
