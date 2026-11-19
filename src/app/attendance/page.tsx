"use client";

import React, { useState, useMemo } from "react";
import {
  CalendarCheck,
  Clock,
  UserCheck,
  AlertTriangle,
  UserX,
  Search,
  Filter,
  Download,
  Plus,
  LogIn,
  LogOut,
  Calendar,
  Building2,
  CheckCircle2,
  FileSpreadsheet,
  X,
  Info,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";

interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  userRole: "ADMIN" | "MANAGER" | "TECHNICIAN" | "CASHIER";
  branchId: string;
  branchName: string;
  branchCode: string;
  date: string; // YYYY-MM-DD
  clockIn: string; // HH:mm:ss
  clockOut: string | null; // HH:mm:ss
  totalHours: number | null;
  status: "ON_TIME" | "LATE" | "ABSENT" | "LEAVE";
  notes?: string;
  verifiedBy?: string;
}

const INITIAL_RECORDS: AttendanceRecord[] = [
  {
    id: "att-1",
    userId: "cmwnc36pk0003z3fxhcmjra89",
    userName: "สมชาย ผู้จัดการใหญ่",
    userRole: "ADMIN",
    branchId: "cmwnc36pa0000z3fxx6o3d40a",
    branchName: "MobileShop HQ (สำนักงานใหญ่ สุขุมวิท)",
    branchCode: "HQ",
    date: "2026-11-19",
    clockIn: "08:45:10",
    clockOut: "18:05:00",
    totalHours: 9.3,
    status: "ON_TIME",
    notes: "เปิดร้าน ตรวจสอบเงินสดในกะเช้า",
  },
  {
    id: "att-2",
    userId: "cmwnc36pp0007z3fxempw03xb",
    userName: "ช่างเอก มือทอง",
    userRole: "TECHNICIAN",
    branchId: "cmwnc36pa0000z3fxx6o3d40a",
    branchName: "MobileShop HQ (สำนักงานใหญ่ สุขุมวิท)",
    branchCode: "HQ",
    date: "2026-11-19",
    clockIn: "08:55:22",
    clockOut: null,
    totalHours: null,
    status: "ON_TIME",
    notes: "มีคิวซ่อมหน้าจอ iPhone 15 Pro",
  },
  {
    id: "att-3",
    userId: "cmwnc36pu000bz3fxukzq50yd",
    userName: "น้องแพรว แคชเชียร์",
    userRole: "CASHIER",
    branchId: "cmwnc36pa0000z3fxx6o3d40a",
    branchName: "MobileShop HQ (สำนักงานใหญ่ สุขุมวิท)",
    branchCode: "HQ",
    date: "2026-11-19",
    clockIn: "09:22:40",
    clockOut: null,
    totalHours: null,
    status: "LATE",
    notes: "รถไฟฟ้า BTS สายสีเขียวขัดข้อง แจ้งล่วงหน้าแล้ว",
  },
  {
    id: "att-4",
    userId: "cmwnc36pm0005z3fxfs0n6kmq",
    userName: "วิภาดา สาขาเก้า",
    userRole: "MANAGER",
    branchId: "cmwnc36ph0001z3fxk19vxzom",
    branchName: "MobileShop สาขา 2 (เซ็นทรัลพระราม 9)",
    branchCode: "BR-02",
    date: "2026-11-19",
    clockIn: "08:50:00",
    clockOut: null,
    totalHours: null,
    status: "ON_TIME",
    notes: "ตรวจรับสต็อกสินค้าใหม่จาก HQ",
  },
  {
    id: "att-5",
    userId: "cmwnc36pr0009z3fxgwves47p",
    userName: "ช่างนนท์ สายไว",
    userRole: "TECHNICIAN",
    branchId: "cmwnc36ph0001z3fxk19vxzom",
    branchName: "MobileShop สาขา 2 (เซ็นทรัลพระราม 9)",
    branchCode: "BR-02",
    date: "2026-11-19",
    clockIn: "09:35:10",
    clockOut: null,
    totalHours: null,
    status: "LATE",
    notes: "ติดฝนตกหนักช่วงเช้า",
  },
  {
    id: "att-6",
    userId: "cmwnc36px000dz3fxfegn9stf",
    userName: "น้องก้อย แคชเชียร์",
    userRole: "CASHIER",
    branchId: "cmwnc36ph0001z3fxk19vxzom",
    branchName: "MobileShop สาขา 2 (เซ็นทรัลพระราม 9)",
    branchCode: "BR-02",
    date: "2026-11-19",
    clockIn: "-",
    clockOut: null,
    totalHours: null,
    status: "LEAVE",
    notes: "ลากิจส่วนตัว (อนุมัติผ่านใบลา #LV-256911)",
  },
];

export default function AttendancePage() {
  const { currentBranch, currentUser, branches, users } = useApp();
  const [records, setRecords] = useState<AttendanceRecord[]>(INITIAL_RECORDS);
  const [selectedDate, setSelectedDate] = useState("2026-11-19");
  const [selectedBranch, setSelectedBranch] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(currentUser.id || "cmwnc36pk0003z3fxhcmjra89");
  const [clockInTime, setClockInTime] = useState("08:50");
  const [clockOutTime, setClockOutTime] = useState("18:00");
  const [formStatus, setFormStatus] = useState<"ON_TIME" | "LATE" | "ABSENT" | "LEAVE">("ON_TIME");
  const [formNotes, setFormNotes] = useState("");
  const [formBranchId, setFormBranchId] = useState(currentBranch.id);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchDate = r.date === selectedDate;
      const matchBranch = selectedBranch === "ALL" || r.branchCode === selectedBranch || r.branchId === selectedBranch;
      const matchStatus = statusFilter === "ALL" || r.status === statusFilter;
      const matchSearch =
        r.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.branchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.notes && r.notes.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchDate && matchBranch && matchStatus && matchSearch;
    });
  }, [records, selectedDate, selectedBranch, statusFilter, searchQuery]);

  // Metrics
  const stats = useMemo(() => {
    const forDay = records.filter((r) => r.date === selectedDate);
    const onTime = forDay.filter((r) => r.status === "ON_TIME").length;
    const late = forDay.filter((r) => r.status === "LATE").length;
    const leave = forDay.filter((r) => r.status === "LEAVE").length;
    const absent = forDay.filter((r) => r.status === "ABSENT").length;
    const total = forDay.length;
    return { total, onTime, late, leave, absent };
  }, [records, selectedDate]);

  // Handle Quick Clock In for current user
  const handleQuickClockIn = () => {
    const now = new Date();
    const timeStr = now.toTimeString().split(" ")[0];
    const isLate = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 15);

    const existingIdx = records.findIndex(
      (r) => r.userId === currentUser.id && r.date === selectedDate
    );

    if (existingIdx >= 0) {
      // Update check out
      setRecords((prev) =>
        prev.map((r, i) =>
          i === existingIdx
            ? {
                ...r,
                clockOut: timeStr,
                totalHours: 8.5,
                notes: r.notes ? `${r.notes} | บันทึกออกงาน ${timeStr}` : `บันทึกออกงาน ${timeStr}`,
              }
            : r
        )
      );
      alert(`บันทึกเวลาออกงานสำหรับ ${currentUser.name} สำเร็จ (${timeStr})`);
    } else {
      // New clock in
      const newRec: AttendanceRecord = {
        id: `att-${Date.now()}`,
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        branchId: currentBranch.id,
        branchName: currentBranch.name,
        branchCode: currentBranch.code,
        date: selectedDate,
        clockIn: timeStr,
        clockOut: null,
        totalHours: null,
        status: isLate ? "LATE" : "ON_TIME",
        notes: `ลงเวลาด่วนโดยผู้ใช้หน้าร้าน (${currentUser.role})`,
      };
      setRecords((prev) => [newRec, ...prev]);
      alert(`บันทึกเวลาเข้างานสำหรับ ${currentUser.name} สำเร็จ (${timeStr})`);
    }
  };

  const handleSaveModal = () => {
    const user = users.find((u) => u.id === selectedUserId) || {
      id: selectedUserId,
      name: "พนักงานประจำ",
      role: "CASHIER",
    };
    const branch = branches.find((b) => b.id === formBranchId) || currentBranch;

    const newRec: AttendanceRecord = {
      id: `att-${Date.now()}`,
      userId: user.id,
      userName: user.name,
      userRole: user.role as any,
      branchId: branch.id,
      branchName: branch.name,
      branchCode: branch.code,
      date: selectedDate,
      clockIn: clockInTime,
      clockOut: clockOutTime || null,
      totalHours: clockOutTime ? 8.5 : null,
      status: formStatus,
      notes: formNotes,
    };

    setRecords((prev) => [newRec, ...prev]);
    setModalOpen(false);
    setFormNotes("");
  };

  const exportCSV = () => {
    const headers = ["ID,พนักงาน,ตำแหน่ง,สาขา,วันที่,เวลาเข้า,เวลาออก,ชั่วโมงรวม,สถานะ,หมายเหตุ"];
    const rows = filteredRecords.map((r) =>
      [
        r.id,
        `"${r.userName}"`,
        r.userRole,
        `"${r.branchName}"`,
        r.date,
        r.clockIn,
        r.clockOut || "-",
        r.totalHours || "-",
        r.status,
        `"${r.notes || ""}"`,
      ].join(",")
    );
    const csvContent = "\uFEFF" + [headers, ...rows].join("\n");
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
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                ระบบบันทึกเวลาเข้า-ออกงาน (Attendance)
              </h1>
              <p className="text-xs text-slate-500">
                เช็คชื่อพนักงานรายวัน ตรวจสอบสถานะมาสาย ขาด ลา และคำนวณชั่วโมงปฏิบัติงาน
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={exportCSV}
            className="gap-2 text-xs h-9 border-slate-300 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            ส่งออก CSV
          </Button>

          <Button
            variant="secondary"
            onClick={handleQuickClockIn}
            className="gap-2 text-xs h-9 bg-slate-900 text-white hover:bg-slate-800"
          >
            <Clock className="h-3.5 w-3.5 text-emerald-400" />
            ลงเวลาฉัน ({currentUser.name.split(" ")[0]})
          </Button>

          <Button
            onClick={() => setModalOpen(true)}
            className="gap-2 text-xs h-9 bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            เพิ่มบันทึกเวลา
          </Button>
        </div>
      </div>

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
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-800 outline-none cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-xs text-slate-700">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-medium">สาขา:</span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-800 outline-none cursor-pointer"
            >
              <option value="ALL">ทุกสาขา ({branches.length})</option>
              {branches.map((b) => (
                <option key={b.id} value={b.code}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-1 bg-slate-50 text-xs">
            {["ALL", "ON_TIME", "LATE", "LEAVE", "ABSENT"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  statusFilter === st
                    ? "bg-white text-slate-900 shadow-2xs border border-slate-200/80 font-semibold"
                    : "text-slate-500 hover:text-slate-900"
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
          <Input
            placeholder="ค้นหาชื่อพนักงาน หรือสาขา..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-9 bg-slate-50/50"
          />
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
                      <CalendarCheck className="h-8 w-8 text-slate-300" />
                      <p className="text-sm font-medium text-slate-600">ไม่พบข้อมูลการลงเวลาสำหรับเงื่อนไขนี้</p>
                      <p className="text-xs text-slate-400">ลองเปลี่ยนวันที่ หรือเลือกสาขาอื่น</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((r) => {
                  const roleBadgeColors: Record<string, string> = {
                    ADMIN: "bg-purple-50 text-purple-700 border-purple-200",
                    MANAGER: "bg-blue-50 text-blue-700 border-blue-200",
                    TECHNICIAN: "bg-emerald-50 text-emerald-700 border-emerald-200",
                    CASHIER: "bg-amber-50 text-amber-700 border-amber-200",
                  };

                  return (
                    <TableRow key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 font-semibold text-xs text-slate-700 border border-slate-200">
                            {r.userName.slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-semibold text-xs text-slate-900">{r.userName}</div>
                            <div className="text-[11px] text-slate-400">ID: {r.id}</div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-3">
                        <div className="space-y-1">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                              roleBadgeColors[r.userRole] || "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {r.userRole}
                          </span>
                          <div className="text-xs text-slate-600 font-medium">{r.branchName}</div>
                        </div>
                      </TableCell>

                      <TableCell className="py-3">
                        <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-800">
                          <LogIn className="h-3.5 w-3.5 text-emerald-600" />
                          <span>{r.clockIn}</span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3">
                        <div className="flex items-center gap-1.5 font-mono text-xs text-slate-600">
                          <LogOut className="h-3.5 w-3.5 text-slate-400" />
                          <span>{r.clockOut || "ยังไม่ออกงาน"}</span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3">
                        <span className="font-mono text-xs text-slate-700">
                          {r.totalHours ? `${r.totalHours} ชม.` : "-"}
                        </span>
                      </TableCell>

                      <TableCell className="py-3">
                        {r.status === "ON_TIME" && (
                          <Badge variant="success" className="text-[11px] font-semibold">
                            ตรงเวลา
                          </Badge>
                        )}
                        {r.status === "LATE" && (
                          <Badge variant="warning" className="text-[11px] font-semibold">
                            มาสาย
                          </Badge>
                        )}
                        {r.status === "LEAVE" && (
                          <Badge variant="default" className="text-[11px] font-semibold bg-blue-50 text-blue-700 border-blue-200">
                            ลางาน
                          </Badge>
                        )}
                        {r.status === "ABSENT" && (
                          <Badge variant="danger" className="text-[11px] font-semibold">
                            ขาดงาน
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="py-3 max-w-xs">
                        <p className="text-xs text-slate-500 truncate" title={r.notes}>
                          {r.notes || "-"}
                        </p>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Add / Edit Attendance Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogHeader>
          <DialogTitle onClose={() => setModalOpen(false)}>บันทึกการเข้า-ออกงานพนักงาน</DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">เลือกพนักงาน</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 bg-white"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role} - สาขา {u.branchCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">สาขาที่เข้าปฏิบัติงาน</label>
            <select
              value={formBranchId}
              onChange={(e) => setFormBranchId(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 bg-white"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">เวลาเข้างาน</label>
              <Input
                type="time"
                value={clockInTime}
                onChange={(e) => {
                  setClockInTime(e.target.value);
                  if (e.target.value > "09:15") {
                    setFormStatus("LATE");
                  } else {
                    setFormStatus("ON_TIME");
                  }
                }}
                className="text-xs h-9"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">เวลาออกงาน</label>
              <Input
                type="time"
                value={clockOutTime}
                onChange={(e) => setClockOutTime(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">สถานะการเข้างาน</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: "ON_TIME", label: "ตรงเวลา", color: "emerald" },
                { id: "LATE", label: "มาสาย", color: "amber" },
                { id: "LEAVE", label: "ลางาน", color: "blue" },
                { id: "ABSENT", label: "ขาดงาน", color: "rose" },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setFormStatus(st.id as any)}
                  className={`p-2 rounded-lg text-xs font-semibold border transition-all text-center ${
                    formStatus === st.id
                      ? "border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-500"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">หมายเหตุ / เหตุผล</label>
            <textarea
              rows={2}
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="ระบุเหตุผล เช่น รถติด, มีงานด่วน, นัดตรวจสภาพเครื่อง..."
              className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setModalOpen(false)} className="text-xs">
            ยกเลิก
          </Button>
          <Button onClick={handleSaveModal} className="text-xs bg-blue-600 text-white hover:bg-blue-700">
            บันทึกข้อมูล
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
