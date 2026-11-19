"use client";

import React, { useState, useMemo } from "react";
import {
  Shield,
  ShieldAlert,
  Search,
  Filter,
  Download,
  AlertTriangle,
  RotateCcw,
  SlidersHorizontal,
  Lock,
  UserCheck,
  Building2,
  Calendar,
  Layers,
  Clock,
  ArrowRight,
  Eye,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";

type SeverityType = "INFO" | "WARNING" | "DANGER";
type AuditModule = "POS" | "REPAIRS" | "INVENTORY" | "USERS" | "EXPENSES" | "SETTINGS";

interface AuditLogEntry {
  id: string;
  timestamp: string; // YYYY-MM-DD HH:mm:ss
  userName: string;
  userRole: string;
  ipAddress: string;
  branchCode: string;
  module: AuditModule;
  action: string;
  targetId: string;
  details: string;
  beforeValue?: string;
  afterValue?: string;
  severity: SeverityType;
}

const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: "log-1",
    timestamp: "2026-11-19 14:15:22",
    userName: "สมชาย ผู้จัดการใหญ่",
    userRole: "SUPER_ADMIN",
    ipAddress: "192.168.1.10",
    branchCode: "HQ",
    module: "POS",
    action: "VOID_SALE",
    targetId: "INV-202611-0012",
    details: "ขอยกเลิกบิลขาย ลูกค้าเปลี่ยนใจซื้อผิดรุ่น คืนเงินสด 1,450 บาท",
    beforeValue: "สถานะ: COMPLETED",
    afterValue: "สถานะ: VOIDED (คืนสต็อก 1 ชิ้น)",
    severity: "DANGER",
  },
  {
    id: "log-2",
    timestamp: "2026-11-19 13:42:05",
    userName: "วิภาดา สาขาเก้า",
    userRole: "BRANCH_MANAGER",
    ipAddress: "192.168.2.15",
    branchCode: "BR-02",
    module: "POS",
    action: "PRICE_OVERRIDE",
    targetId: "PROD-ACC-004",
    details: "อนุมัติส่วนลดพิเศษหน้าร้าน เคสกันกระแทก ซื้อคู่ฟิล์มกระจกลดเพิ่ม",
    beforeValue: "ราคา: 890 บาท",
    afterValue: "ราคา: 690 บาท (ลด 200 บ.)",
    severity: "WARNING",
  },
  {
    id: "log-3",
    timestamp: "2026-11-19 11:20:44",
    userName: "ช่างเอก มือทอง",
    userRole: "TECHNICIAN",
    ipAddress: "192.168.1.25",
    branchCode: "HQ",
    module: "INVENTORY",
    action: "STOCK_ADJUST",
    targetId: "PART-SCR-IP15P",
    details: "ปรับลดยอดสต็อกเนื่องจากอะไหล่หน้าจอมีรอยขีดข่วนจากโรงงาน ส่งเคลมซัพพลายเออร์",
    beforeValue: "จำนวน: 8 ชิ้น",
    afterValue: "จำนวน: 7 ชิ้น (-1 เคลม)",
    severity: "WARNING",
  },
  {
    id: "log-4",
    timestamp: "2026-11-19 10:05:12",
    userName: "สมชาย ผู้จัดการใหญ่",
    userRole: "SUPER_ADMIN",
    ipAddress: "192.168.1.10",
    branchCode: "HQ",
    module: "USERS",
    action: "USER_PERMISSION_CHANGE",
    targetId: "USER: tech_non",
    details: "ปรับเพิ่มอัตราค่าคอมมิชชั่นงานซ่อมฝีมือดีจาก 12% เป็น 15%",
    beforeValue: "Repair Comm: 12%",
    afterValue: "Repair Comm: 15%",
    severity: "INFO",
  },
  {
    id: "log-5",
    timestamp: "2026-11-19 09:12:30",
    userName: "ช่างนนท์ สายไว",
    userRole: "TECHNICIAN",
    ipAddress: "192.168.2.22",
    branchCode: "BR-02",
    module: "REPAIRS",
    action: "REPAIR_STATUS_CHANGE",
    targetId: "REP-202611-0002",
    details: "เปลี่ยนสถานะใบรับซ่อม เปลี่ยนตูดชาร์จ S24 Ultra ผ่านการทดสอบ QC",
    beforeValue: "สถานะ: REPAIRING",
    afterValue: "สถานะ: QC_PASSED",
    severity: "INFO",
  },
  {
    id: "log-6",
    timestamp: "2026-11-19 08:50:00",
    userName: "น้องแพรว แคชเชียร์",
    userRole: "CASHIER",
    ipAddress: "192.168.1.30",
    branchCode: "HQ",
    module: "POS",
    action: "OPEN_SHIFT_FLOAT",
    targetId: "SHIFT-20261119-01",
    details: "เปิดกะขายหน้าร้านรอบเช้า บันทึกเงินทอนเริ่มต้นในลิ้นชัก",
    beforeValue: "เงินสด: 0 บาท",
    afterValue: "เงินสด: 3,000 บาท",
    severity: "INFO",
  },
  {
    id: "log-7",
    timestamp: "2026-11-18 17:35:10",
    userName: "สมชาย ผู้จัดการใหญ่",
    userRole: "SUPER_ADMIN",
    ipAddress: "192.168.1.10",
    branchCode: "HQ",
    module: "EXPENSES",
    action: "EXPENSE_DELETE",
    targetId: "EXP-202611-0099",
    details: "ลบรายการบันทึกค่าใช้จ่ายซ้ำซ้อน บิลค่าน้ำดื่ม 250 บาท",
    beforeValue: "ยอดเงิน: 250 บาท",
    afterValue: "ลบออกจากระบบ",
    severity: "WARNING",
  },
];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [moduleFilter, setModuleFilter] = useState<string>("ALL");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [branchFilter, setBranchFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const matchModule = moduleFilter === "ALL" || l.module === moduleFilter;
      const matchSeverity = severityFilter === "ALL" || l.severity === severityFilter;
      const matchBranch = branchFilter === "ALL" || l.branchCode === branchFilter;
      const matchSearch =
        l.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.targetId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.ipAddress.includes(searchQuery);
      return matchModule && matchSeverity && matchBranch && matchSearch;
    });
  }, [logs, moduleFilter, severityFilter, branchFilter, searchQuery]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const total = logs.length;
    const dangers = logs.filter((l) => l.severity === "DANGER").length;
    const warnings = logs.filter((l) => l.severity === "WARNING").length;
    const voids = logs.filter((l) => l.action.includes("VOID")).length;
    const priceOverrides = logs.filter((l) => l.action.includes("PRICE")).length;
    return { total, dangers, warnings, voids, priceOverrides };
  }, [logs]);

  const exportCSV = () => {
    const headers = ["ลำดับ,วัน-เวลา,ผู้ใช้,ตำแหน่ง,IP Address,สาขา,โมดูล,การกระทำ,เป้าหมาย,รายละเอียด,ก่อนหน้า,หลังทำ,ระดับความเสี่ยง"];
    const rows = filteredLogs.map((l, i) =>
      [
        i + 1,
        l.timestamp,
        `"${l.userName}"`,
        l.userRole,
        l.ipAddress,
        l.branchCode,
        l.module,
        l.action,
        `"${l.targetId}"`,
        `"${l.details}"`,
        `"${l.beforeValue || ""}"`,
        `"${l.afterValue || ""}"`,
        l.severity,
      ].join(",")
    );
    const csvContent = "\uFEFF" + [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit_logs_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              บันทึกความปลอดภัย & ประวัติการกระทำ (Security & Audit Trail)
            </h1>
            <p className="text-xs text-slate-500">
              ตรวจสอบการเข้าถึง ยกเลิกบิลขาย ปรับราคาสินค้า ปรับยอดสต็อก และการเปลี่ยนสิทธิ์พนักงาน
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={exportCSV}
            className="gap-2 text-xs h-9 border-slate-300 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            ส่งออก Audit Log (CSV)
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <Card className="border-slate-200 bg-white shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>กิจกรรมที่บันทึก</span>
              <Clock className="h-4 w-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">{metrics.total} รายการ</div>
            <p className="text-[11px] text-slate-400 mt-0.5">ในระบบความปลอดภัย</p>
          </CardContent>
        </Card>

        <Card className="border-rose-200 bg-rose-50/40 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-rose-700 mb-1">
              <span>ความเสี่ยงสูง (Danger)</span>
              <ShieldAlert className="h-4 w-4 text-rose-600" />
            </div>
            <div className="text-2xl font-bold text-rose-700 tabular-nums">{metrics.dangers} รายการ</div>
            <p className="text-[11px] text-rose-600 mt-0.5">ยกเลิกบิล / ลบข้อมูล</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/40 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-amber-700 mb-1">
              <span>แก้ไขราคา / ปรับสต็อก</span>
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-amber-700 tabular-nums">{metrics.warnings} รายการ</div>
            <p className="text-[11px] text-amber-600 mt-0.5">ลดราคา / ปรับของเสีย</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/40 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-purple-700 mb-1">
              <span>การยกเลิกบิล (Voided)</span>
              <RotateCcw className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-700 tabular-nums">{metrics.voids} ครั้ง</div>
            <p className="text-[11px] text-purple-600 mt-0.5">ตรวจสอบทุกยอดเงิน</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/40 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-blue-700 mb-1">
              <span>ปรับลดราคาหน้าร้าน</span>
              <SlidersHorizontal className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-700 tabular-nums">{metrics.priceOverrides} ครั้ง</div>
            <p className="text-[11px] text-blue-600 mt-0.5">สิทธิ์ผู้จัดการสาขา</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-xs text-slate-700">
            <Layers className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-medium">โมดูล:</span>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-800 outline-none cursor-pointer"
            >
              <option value="ALL">ทุกโมดูล</option>
              <option value="POS">POS (ขายหน้าร้าน)</option>
              <option value="REPAIRS">REPAIRS (งานซ่อม)</option>
              <option value="INVENTORY">INVENTORY (คลังสินค้า)</option>
              <option value="USERS">USERS (พนักงาน)</option>
              <option value="EXPENSES">EXPENSES (ค่าใช้จ่าย)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-xs text-slate-700">
            <ShieldAlert className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-medium">ระดับ:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-800 outline-none cursor-pointer"
            >
              <option value="ALL">ทุกระดับ</option>
              <option value="DANGER">DANGER (วิกฤต/ยกเลิก)</option>
              <option value="WARNING">WARNING (เตือน/เปลี่ยนราคา)</option>
              <option value="INFO">INFO (ข้อมูลทั่วไป)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-xs text-slate-700">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-medium">สาขา:</span>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-800 outline-none cursor-pointer"
            >
              <option value="ALL">ทุกสาขา</option>
              <option value="HQ">สาขา HQ</option>
              <option value="BR-02">สาขา BR-02</option>
            </select>
          </div>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="ค้นหาชื่อผู้ใช้, เลขที่เอกสาร, IP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-9 bg-slate-50/50"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <Card className="border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/75 border-b border-slate-200">
              <TableRow>
                <TableHead className="text-xs font-semibold text-slate-600">วัน-เวลา / IP</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">ผู้กระทำ & สาขา</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">การกระทำ (Action)</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">เป้าหมาย (Target)</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">รายละเอียด & ค่าที่เปลี่ยนแปลง</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">ระดับ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => {
                const actionBadgeColors: Record<string, string> = {
                  VOID_SALE: "bg-rose-50 text-rose-700 border-rose-200",
                  PRICE_OVERRIDE: "bg-amber-50 text-amber-700 border-amber-200",
                  STOCK_ADJUST: "bg-purple-50 text-purple-700 border-purple-200",
                  USER_PERMISSION_CHANGE: "bg-blue-50 text-blue-700 border-blue-200",
                  REPAIR_STATUS_CHANGE: "bg-emerald-50 text-emerald-700 border-emerald-200",
                  OPEN_SHIFT_FLOAT: "bg-slate-100 text-slate-700 border-slate-200",
                  EXPENSE_DELETE: "bg-rose-50 text-rose-700 border-rose-200",
                };

                return (
                  <TableRow key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <TableCell className="py-3">
                      <div className="font-mono text-xs font-semibold text-slate-900">{log.timestamp}</div>
                      <div className="text-[11px] text-slate-400 font-mono">IP: {log.ipAddress}</div>
                    </TableCell>

                    <TableCell className="py-3">
                      <div className="font-semibold text-xs text-slate-900">{log.userName}</div>
                      <div className="text-[11px] text-slate-500">
                        {log.userRole} • <span className="font-semibold text-blue-700">{log.branchCode}</span>
                      </div>
                    </TableCell>

                    <TableCell className="py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${
                          actionBadgeColors[log.action] || "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {log.action}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5">{log.module}</div>
                    </TableCell>

                    <TableCell className="py-3">
                      <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {log.targetId}
                      </span>
                    </TableCell>

                    <TableCell className="py-3 max-w-md">
                      <p className="text-xs text-slate-800 font-medium">{log.details}</p>
                      {(log.beforeValue || log.afterValue) && (
                        <div className="flex items-center gap-2 mt-1 text-[11px] font-mono bg-slate-50 p-1.5 rounded border border-slate-200/80">
                          <span className="text-slate-400">{log.beforeValue}</span>
                          <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="text-slate-900 font-bold">{log.afterValue}</span>
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="py-3 text-center">
                      {log.severity === "DANGER" && (
                        <Badge variant="danger" className="text-[10px] font-bold">
                          DANGER
                        </Badge>
                      )}
                      {log.severity === "WARNING" && (
                        <Badge variant="warning" className="text-[10px] font-bold">
                          WARNING
                        </Badge>
                      )}
                      {log.severity === "INFO" && (
                        <Badge variant="outline" className="text-[10px]">
                          INFO
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
