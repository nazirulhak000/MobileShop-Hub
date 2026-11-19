"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarCheck,
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
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface Appointment {
  id: string;
  bookingRef: string;
  branchId: string;
  deviceModel: string;
  service: string;
  status: string;
  repairJobId: string | null;
  slot?: { startsAt: string; endsAt: string };
  account?: { displayName: string; phone: string };
  createdAt?: string;
}

interface Policy {
  branchId: string;
  opensMinute: number;
  closesMinute: number;
  capacity: number;
  closedWeekdays: string;
  closedDates: string;
  active: boolean;
}

const statusMap: Record<string, { label: string; color: string; bg: string; border: string }> = {
  CONFIRMED: { label: "ยืนยันนัดหมาย", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  CHECKED_IN: { label: "รับเครื่องแล้ว", color: "text-teal-800", bg: "bg-teal-50", border: "border-teal-200" },
  COMPLETED: { label: "เสร็จสิ้น", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  CANCELLED: { label: "ยกเลิกแล้ว", color: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200" },
  NO_SHOW: { label: "ไม่มาตามนัด", color: "text-slate-600", bg: "bg-slate-100", border: "border-slate-200" },
};

export default function AppointmentsPage() {
  const { currentUser, branches, currentBranch } = useApp();
  const [rows, setRows] = useState<Appointment[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [branchId, setBranch] = useState(currentBranch.id);
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(true);
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  async function load() {
    setBusy(true);
    try {
      const response = await fetch("/api/appointments", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setRows(result.appointments || []);
      setPolicies(result.policies || []);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "โหลดข้อมูลนัดหมายไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function act(body: unknown) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setMessage(result.message ?? "บันทึกเรียบร้อยแล้ว");
      await load();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "ทำรายการไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  const policy = policies.find((p) => p.branchId === branchId);

  const filteredRows = rows.filter(
    (row) =>
      (!branchId || row.branchId === branchId) &&
      (!date ||
        (row.slot &&
          new Date(new Date(row.slot.startsAt).getTime() + 7 * 3_600_000).toISOString().slice(0, 10) === date))
  );

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Header & Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
              <CalendarCheck className="h-3.5 w-3.5 text-teal-600" />
              ระบบนัดหมายออนไลน์ (Customer Bookings)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-2">
            นัดหมายลูกค้านำเครื่องเข้าตรวจ
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            ตรวจสอบคิวจองล่วงหน้า กดรับเครื่องสร้างใบงานซ่อม และจัดการตารางเวลารับเครื่องประจำสาขา
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
              <span>{showPolicyModal ? "ซ่อนตั้งค่าเวลา" : "ตั้งค่าเวลารับจอง"}</span>
            </Button>
          )}

          <Button
            onClick={load}
            disabled={busy}
            variant="outline"
            className="h-11 px-4 gap-2 border-slate-200 hover:bg-slate-50 text-slate-800 font-semibold rounded-xl cursor-pointer"
          >
            <RefreshCw className={cn("h-4 w-4 text-slate-500", busy && "animate-spin")} />
            <span>รีเฟรชข้อมูล</span>
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* 2. Booking Policy Settings Card (Collapsible) */}
      {showPolicyModal && ["ADMIN", "MANAGER"].includes(currentUser.role) && (
        <Card className="border-teal-200 bg-teal-50/30 shadow-sm animate-fade-in">
          <CardHeader className="border-b border-teal-100 bg-teal-50/60 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-teal-950 flex items-center gap-2">
                <Settings className="h-4 w-4 text-teal-700" />
                <span>กำหนดเวลารับจองคิวออนไลน์ — {branches.find((b) => b.id === branchId)?.name || "สาขาที่เลือก"}</span>
              </CardTitle>
              <span className="text-xs text-teal-700 font-semibold">
                ช่วงเวลาละ 30 นาที
              </span>
            </div>
            <CardDescription className="text-xs text-slate-600 mt-1">
              กำหนดเวลาทำการ ความจุต่อช่วง และวันหยุดประจำสัปดาห์ (การเปลี่ยนเวลาจะไม่กระทบนัดหมายที่ยืนยันแล้ว)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form
              key={branchId + JSON.stringify(policy)}
              className="space-y-5 max-w-2xl"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const minutes = (v: FormDataEntryValue | null) => {
                  const [hour, minute] = String(v).split(":").map(Number);
                  return hour * 60 + minute;
                };
                void act({
                  action: "policy",
                  branchId,
                  opensMinute: minutes(form.get("opens")),
                  closesMinute: minutes(form.get("closes")),
                  capacity: Number(form.get("capacity")),
                  active: form.has("active"),
                  closedWeekdays: form.getAll("weekday").map(Number),
                  closedDates: String(form.get("closedDates") ?? "")
                    .split(",")
                    .map((v) => v.trim())
                    .filter(Boolean),
                });
              }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                    เวลาเริ่มรับคิว (เปิด)
                  </label>
                  <input
                    name="opens"
                    type="time"
                    step={1800}
                    defaultValue={`${String(Math.floor((policy?.opensMinute ?? 540) / 60)).padStart(2, "0")}:${String(
                      (policy?.opensMinute ?? 540) % 60
                    ).padStart(2, "0")}`}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                    เวลาสิ้นสุดรับคิว (ปิด)
                  </label>
                  <input
                    name="closes"
                    type="time"
                    step={1800}
                    defaultValue={`${String(Math.floor((policy?.closesMinute ?? 1200) / 60)).padStart(2, "0")}:${String(
                      (policy?.closesMinute ?? 1200) % 60
                    ).padStart(2, "0")}`}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  ความจุสูงสุดต่อช่วงเวลา (เครื่องต่อ 30 นาที)
                </label>
                <input
                  name="capacity"
                  type="number"
                  min={1}
                  max={20}
                  defaultValue={policy?.capacity ?? 1}
                  required
                  className="w-32 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  วันหยุดประจำสัปดาห์ที่ไม่เปิดรับจอง
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"].map((day, i) => (
                    <label
                      key={day}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer shadow-2xs"
                    >
                      <input
                        type="checkbox"
                        name="weekday"
                        value={i}
                        defaultChecked={JSON.parse(policy?.closedWeekdays ?? "[]").includes(i)}
                        className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
                      />
                      <span>{day}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  วันหยุดพิเศษ (YYYY-MM-DD คั่นด้วยจุลภาค)
                </label>
                <input
                  name="closedDates"
                  defaultValue={JSON.parse(policy?.closedDates ?? "[]").join(", ")}
                  placeholder="เช่น 2026-12-31, 2027-01-01"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm focus:ring-2 focus:ring-teal-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <label className="inline-flex items-center gap-2 text-sm font-bold text-slate-900 cursor-pointer">
                  <input
                    name="active"
                    type="checkbox"
                    defaultChecked={policy?.active ?? true}
                    className="rounded text-teal-600 focus:ring-teal-500 h-4.5 w-4.5"
                  />
                  <span>เปิดระบบรับจองคิวออนไลน์สำหรับสาขานี้</span>
                </label>
              </div>

              <div className="pt-2">
                <Button
                  disabled={busy}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-2.5 rounded-xl cursor-pointer"
                >
                  บันทึกการตั้งค่าเวลารับจอง
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 3. Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
          <Filter className="h-4 w-4 text-slate-400" />
          <span>ตัวกรอง:</span>
        </div>

        <select
          value={branchId}
          onChange={(e) => setBranch(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
        >
          <option value="">ทุกสาขาที่คุณมีสิทธิ์</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.code})
            </option>
          ))}
        </select>

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2 text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
        />

        {date && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDate("")}
            className="text-xs text-slate-500 hover:text-slate-800"
          >
            ล้างวันที่
          </Button>
        )}

        <div className="ml-auto text-xs font-semibold text-slate-500">
          พบนัดหมาย {filteredRows.length} รายการ
        </div>
      </div>

      {/* 4. Appointments List */}
      <div className="space-y-3">
        {filteredRows.map((row) => {
          const status = statusMap[row.status] || {
            label: row.status,
            color: "text-slate-700",
            bg: "bg-slate-100",
            border: "border-slate-200",
          };

          return (
            <Card
              key={row.id}
              className="border-slate-200/90 shadow-2xs hover:shadow-xs transition-all bg-white"
            >
              <CardContent className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left: Booking Details */}
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-sm font-extrabold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200/70">
                      {row.bookingRef}
                    </span>
                    <span className="text-base font-bold text-slate-900">
                      {row.account?.displayName || "ลูกค้าออนไลน์"}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${status.bg} ${status.color} ${status.border}`}
                    >
                      {status.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>
                        {row.slot
                          ? new Date(row.slot.startsAt).toLocaleString("th-TH", {
                              timeZone: "Asia/Bangkok",
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "ไม่พบข้อมูลเวลา"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Smartphone className="h-3.5 w-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-800">{row.deviceModel}</span>
                    </div>

                    {row.account?.phone && (
                      <div className="flex items-center gap-1.5 font-mono">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span>{row.account.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 self-start lg:self-center">
                  {row.status === "CONFIRMED" && (
                    <>
                      <Button
                        disabled={busy}
                        onClick={() => {
                          if (confirm(`ยืนยันรับเครื่องของคุณ ${row.account?.displayName} และสร้างใบงานซ่อม?`)) {
                            void act({ id: row.id, action: "CHECKED_IN" });
                          }
                        }}
                        className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-9 px-4 rounded-xl shadow-2xs gap-1.5 text-xs cursor-pointer"
                      >
                        <Wrench className="h-3.5 w-3.5" />
                        <span>รับเครื่องเข้าศูนย์</span>
                      </Button>

                      <Button
                        disabled={busy}
                        variant="outline"
                        onClick={() => {
                          if (confirm("ยืนยันว่าลูกค้าไม่ได้มาตามนัดหมาย?")) {
                            void act({ id: row.id, action: "NO_SHOW" });
                          }
                        }}
                        className="h-9 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                      >
                        ไม่มาตามนัด
                      </Button>

                      <Button
                        disabled={busy}
                        variant="outline"
                        onClick={() => {
                          const reason = prompt("ระบุเหตุผลที่ทางร้านขอยกเลิกนัด (อย่างน้อย 10 ตัวอักษร):");
                          if (reason && reason.trim().length >= 10) {
                            void act({ id: row.id, action: "CANCELLED", reason: reason.trim() });
                          }
                        }}
                        className="h-9 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 border-rose-200 rounded-xl cursor-pointer"
                      >
                        ยกเลิกนัด
                      </Button>
                    </>
                  )}

                  {row.status === "CHECKED_IN" && (
                    <Button
                      disabled={busy}
                      variant="outline"
                      onClick={() => void act({ id: row.id, action: "COMPLETED" })}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200 font-bold h-9 px-4 rounded-xl text-xs cursor-pointer"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>ปิดนัดหมาย (Completed)</span>
                    </Button>
                  )}

                  {row.repairJobId && (
                    <Link href={`/repairs/${row.repairJobId}`}>
                      <Button
                        variant="outline"
                        className="h-9 px-4 text-xs font-bold text-teal-800 border-teal-200 hover:bg-teal-50 rounded-xl gap-1.5 cursor-pointer"
                      >
                        <span>เปิดดูใบงานซ่อม</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {!busy && !filteredRows.length && (
          <Card className="border-slate-200 bg-white p-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mx-auto mb-4">
              <CalendarCheck className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">ยังไม่มีนัดหมายในเงื่อนไขที่เลือก</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              เมื่อลูกค้าจองเวลานำเครื่องเข้ารับบริการผ่านหน้าร้านออนไลน์ รายการจะปรากฏที่นี่แบบ Real-time
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
