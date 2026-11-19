"use client";

import React, { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  Shield,
  ShieldAlert,
  Search,
  Download,
  AlertTriangle,
  Calendar,
  Layers,
  Clock,
  Info,
  AlertCircle,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  User,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";

type SeverityType = "INFO" | "WARNING" | "DANGER";

interface AuditLogEntry {
  id: string;
  module: string;
  action: string;
  targetId: string | null;
  details: string;
  beforeJson: string | null;
  afterJson: string | null;
  severity: SeverityType | string;
  ipAddress: string | null;
  createdAt: string;
  user: { id: string; name: string; role: string } | null;
}

// Modules currently written by the API routes (free-text in the schema, so unknown values still display).
const MODULES: { id: string; label: string }[] = [
  { id: "POS", label: "ขายหน้าร้าน (POS)" },
  { id: "REPAIRS", label: "งานซ่อม" },
  { id: "INVENTORY", label: "สต็อกสินค้า" },
  { id: "INSTALLMENTS", label: "ผ่อนชำระ" },
  { id: "PAWN", label: "ขายฝาก/จำนำ" },
  { id: "TRADE_IN", label: "รับซื้อเครื่อง" },
  { id: "CUSTOMERS", label: "ลูกค้า" },
  { id: "USERS", label: "ผู้ใช้งาน" },
  { id: "EXPENSES", label: "ค่าใช้จ่าย" },
  { id: "ATTENDANCE", label: "ลงเวลา" },
  { id: "PAYROLL", label: "เงินเดือน" },
  { id: "SETTINGS", label: "ตั้งค่า" },
];
const MODULE_LABEL = Object.fromEntries(MODULES.map((m) => [m.id, m.label]));

const ACTIONS: { id: string; label: string }[] = [
  { id: "ALL", label: "ทุกการกระทำ" },
  { id: "CREATE", label: "สร้างใหม่ (CREATE)" },
  { id: "UPDATE", label: "แก้ไข (UPDATE)" },
  { id: "DELETE", label: "ลบข้อมูล (DELETE)" },
  { id: "VOID", label: "ยกเลิกบิล (VOID)" },
  { id: "CANCEL", label: "ยกเลิก (CANCEL)" },
  { id: "LOGIN", label: "เข้าสู่ระบบ (LOGIN)" },
  { id: "LOGOUT", label: "ออกจากระบบ (LOGOUT)" },
  { id: "STATUS_CHANGE", label: "เปลี่ยนสถานะ (STATUS_CHANGE)" },
  { id: "ADJUST_STOCK", label: "ปรับสต็อก (ADJUST_STOCK)" },
];

const bangkokDay = (d: Date = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(d);
const bangkokDateTime = (iso: string) => new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", hour12: false });

/** Fetch JSON and throw the server's Thai error message unless both res.ok and json.success. */
async function fetchJson<T = any>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.error || `ไม่สามารถโหลดข้อมูลได้ (${res.status})`);
  return json as T;
}

/** Pretty-print a JSON string; fall back to the raw text when it is not JSON. */
function prettyJson(value: string | null): string | null {
  if (!value) return null;
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

const PAGE_SIZE = 100;

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [moduleFilter, setModuleFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [userFilter, setUserFilter] = useState("ALL");
  const [fromDate, setFromDate] = useState(() => bangkokDay(new Date(Date.now() - 7 * 86_400_000)));
  const [toDate, setToDate] = useState(() => bangkokDay());
  const [searchQuery, setSearchQuery] = useState("");

  const buildQuery = useCallback(
    (cursor?: string) => {
      const qs = new URLSearchParams({ take: String(PAGE_SIZE) });
      if (moduleFilter !== "ALL") qs.set("module", moduleFilter);
      if (severityFilter !== "ALL") qs.set("severity", severityFilter);
      if (actionFilter !== "ALL") qs.set("action", actionFilter);
      if (userFilter !== "ALL") qs.set("userId", userFilter);
      if (fromDate) qs.set("from", fromDate);
      if (toDate) qs.set("to", toDate);
      if (cursor) qs.set("cursor", cursor);
      return `/api/audit-logs?${qs}`;
    },
    [moduleFilter, severityFilter, actionFilter, userFilter, fromDate, toDate]
  );

  const loadFirst = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await fetchJson<{ data: AuditLogEntry[]; nextCursor: string | null }>(buildQuery());
      setLogs(json.data);
      setNextCursor(json.nextCursor);
      setExpanded(new Set());
    } catch (e) {
      setLogs([]);
      setNextCursor(null);
      setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    void loadFirst();
  }, [loadFirst]);

  const loadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    setError(null);
    try {
      const json = await fetchJson<{ data: AuditLogEntry[]; nextCursor: string | null }>(buildQuery(nextCursor));
      setLogs((prev) => [...prev, ...json.data]);
      setNextCursor(json.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลเพิ่มไม่สำเร็จ");
    } finally {
      setLoadingMore(false);
    }
  };

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // List of unique users available from the logs
  const userOptions = useMemo(() => {
    const map = new Map<string, string>();
    logs.forEach((l) => {
      if (l.user) map.set(l.user.id, `${l.user.name} (${l.user.role})`);
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [logs]);

  // Client-side text search over the loaded rows.
  const filteredLogs = useMemo(() => {
    let result = logs;
    if (actionFilter !== "ALL") {
      result = result.filter((l) => l.action.toUpperCase().includes(actionFilter.toUpperCase()));
    }
    if (userFilter !== "ALL") {
      result = result.filter((l) => l.user?.id === userFilter);
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return result;
    return result.filter(
      (l) =>
        l.details.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        (l.targetId ?? "").toLowerCase().includes(q) ||
        (l.user?.name ?? "").toLowerCase().includes(q) ||
        (l.ipAddress ?? "").toLowerCase().includes(q)
    );
  }, [logs, actionFilter, userFilter, searchQuery]);

  const metrics = useMemo(
    () => ({
      total: filteredLogs.length,
      dangers: filteredLogs.filter((l) => l.severity === "DANGER").length,
      warnings: filteredLogs.filter((l) => l.severity === "WARNING").length,
      infos: filteredLogs.filter((l) => l.severity === "INFO").length,
    }),
    [filteredLogs]
  );

  const exportCSV = () => {
    const esc = (v: string | null | undefined) => `"${(v ?? "").replace(/"/g, '""')}"`;
    const headers = ["เวลา (Asia/Bangkok),ผู้ใช้,ตำแหน่ง,โมดูล,การกระทำ,รหัสอ้างอิง,รายละเอียด,ก่อน,หลัง,ระดับ,IP"];
    const rows = filteredLogs.map((l) =>
      [esc(bangkokDateTime(l.createdAt)), esc(l.user?.name), l.user?.role ?? "", l.module, l.action, esc(l.targetId), esc(l.details), esc(l.beforeJson), esc(l.afterJson), l.severity, esc(l.ipAddress)].join(",")
    );
    const csvContent = "﻿" + [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit_logs_${bangkokDay()}.csv`;
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
            <h1 className="text-xl font-bold tracking-tight text-slate-900">บันทึกความปลอดภัย & ประวัติการกระทำ (Security & Audit Trail)</h1>
            <p className="text-xs text-slate-500">ตรวจสอบการยกเลิกบิล ปรับสต็อก งานซ่อม ผ่อนชำระ ค่าใช้จ่าย เงินเดือน และการเปลี่ยนสิทธิ์พนักงาน</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void loadFirst()} disabled={loading} className="gap-2 text-xs h-9 border-slate-300 hover:bg-slate-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            รีเฟรช
          </Button>
          <Button variant="outline" onClick={exportCSV} disabled={loading || filteredLogs.length === 0} className="gap-2 text-xs h-9 border-slate-300 hover:bg-slate-50">
            <Download className="h-3.5 w-3.5" />
            ส่งออก Audit Log (CSV)
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards (loaded rows) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="border-slate-200 bg-white shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>กิจกรรมที่แสดง</span>
              <Clock className="h-4 w-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">{metrics.total} รายการ</div>
            <p className="text-[11px] text-slate-400 mt-0.5">{nextCursor ? "ยังมีรายการเพิ่มเติม" : "ครบตามเงื่อนไข"}</p>
          </CardContent>
        </Card>
        <Card className="border-rose-200 bg-rose-50/40 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-rose-700 mb-1">
              <span>ความเสี่ยงสูง (Danger)</span>
              <ShieldAlert className="h-4 w-4 text-rose-600" />
            </div>
            <div className="text-2xl font-bold text-rose-700 tabular-nums">{metrics.dangers} รายการ</div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/40 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-amber-700 mb-1">
              <span>เฝ้าระวัง (Warning)</span>
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-amber-700 tabular-nums">{metrics.warnings} รายการ</div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/40 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-blue-700 mb-1">
              <span>ทั่วไป (Info)</span>
              <Info className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-700 tabular-nums">{metrics.infos} รายการ</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-xs text-slate-700">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <input type="date" value={fromDate} max={toDate || undefined} onChange={(e) => setFromDate(e.target.value)} className="bg-transparent text-xs font-medium text-slate-800 outline-none cursor-pointer" />
            <span>ถึง</span>
            <input type="date" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} className="bg-transparent text-xs font-medium text-slate-800 outline-none cursor-pointer" />
          </div>
          <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-xs text-slate-700">
            <Layers className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-medium">โมดูล:</span>
            <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} className="bg-transparent text-xs font-medium text-slate-800 outline-none cursor-pointer">
              <option value="ALL">ทุกโมดูล</option>
              {MODULES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-xs text-slate-700">
            <Activity className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-medium">การกระทำ:</span>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-800 outline-none cursor-pointer"
            >
              {ACTIONS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          {userOptions.length > 0 && (
            <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-xs text-slate-700">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <span className="font-medium">ผู้ใช้:</span>
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="bg-transparent text-xs font-medium text-slate-800 outline-none cursor-pointer max-w-[140px] truncate"
              >
                <option value="ALL">ทุกคน</option>
                {userOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-1 bg-slate-50 text-xs">
            {["ALL", "DANGER", "WARNING", "INFO"].map((s) => (
              <button
                key={s}
                onClick={() => setSeverityFilter(s)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  severityFilter === s ? "bg-white text-slate-900 shadow-2xs border border-slate-200/80 font-semibold" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {s === "ALL" ? "ทุกระดับ" : s}
              </button>
            ))}
          </div>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input placeholder="ค้นหารายละเอียด ผู้ใช้ รหัสอ้างอิง..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 text-xs h-9 bg-slate-50/50" />
        </div>
      </div>

      {/* Logs Table */}
      <Card className="border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/75 border-b border-slate-200">
              <TableRow>
                <TableHead className="w-8" />
                <TableHead className="text-xs font-semibold text-slate-600">เวลา</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">ผู้ใช้</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">โมดูล / การกระทำ</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">รายละเอียด</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 font-mono">IP Address</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">ระดับ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-40 text-center">
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลดข้อมูล...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-40 text-center text-sm text-slate-500">
                    {error ? "โหลดข้อมูลไม่สำเร็จ" : "ไม่พบประวัติการกระทำตามเงื่อนไข"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((l) => {
                  const open = expanded.has(l.id);
                  const before = open ? prettyJson(l.beforeJson) : null;
                  const after = open ? prettyJson(l.afterJson) : null;
                  const details = open ? prettyJson(l.details) : null;
                  return (
                    <Fragment key={l.id}>
                      <TableRow className="hover:bg-slate-50/60 transition-colors cursor-pointer" onClick={() => toggle(l.id)}>
                        <TableCell className="py-3 text-slate-400">{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
                        <TableCell className="py-3 font-mono text-[11px] text-slate-700 whitespace-nowrap">{bangkokDateTime(l.createdAt)}</TableCell>
                        <TableCell className="py-3">
                          <div className="text-xs font-semibold text-slate-900">{l.user?.name ?? "ระบบ / ลูกค้า"}</div>
                          {l.user?.role && <div className="text-[10px] text-slate-400">{l.user.role}</div>}
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="text-xs font-medium text-slate-800">{MODULE_LABEL[l.module] ?? l.module}</div>
                          <div className="text-[10px] font-mono text-slate-500">{l.action}</div>
                        </TableCell>
                        <TableCell className="py-3 max-w-md">
                          <p className="text-xs text-slate-600 truncate" title={l.details}>
                            {l.details}
                          </p>
                          {l.targetId && <p className="text-[10px] font-mono text-slate-400">อ้างอิง: {l.targetId}</p>}
                        </TableCell>
                        <TableCell className="py-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {l.ipAddress ? (
                            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[10px]">
                              {l.ipAddress}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">-</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3 text-center">
                          {l.severity === "DANGER" && <Badge variant="danger" className="text-[10px]">DANGER</Badge>}
                          {l.severity === "WARNING" && <Badge variant="warning" className="text-[10px]">WARNING</Badge>}
                          {l.severity !== "DANGER" && l.severity !== "WARNING" && <Badge variant="default" className="text-[10px]">{l.severity}</Badge>}
                        </TableCell>
                      </TableRow>
                      {open && (
                        <TableRow className="bg-slate-50/70">
                          <TableCell colSpan={7} className="py-3">
                            <div className="grid gap-3 md:grid-cols-3 text-[11px]">
                              <div>
                                <div className="font-semibold text-slate-600 mb-1">รายละเอียด</div>
                                <pre className="whitespace-pre-wrap break-all rounded border border-slate-200 bg-white p-2 max-h-64 overflow-auto">{details}</pre>
                                {l.ipAddress && <div className="mt-1 text-slate-400">IP: {l.ipAddress}</div>}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-600 mb-1">ก่อนเปลี่ยนแปลง</div>
                                <pre className="whitespace-pre-wrap break-all rounded border border-slate-200 bg-white p-2 max-h-64 overflow-auto">{before ?? "-"}</pre>
                              </div>
                              <div>
                                <div className="font-semibold text-slate-600 mb-1">หลังเปลี่ยนแปลง</div>
                                <pre className="whitespace-pre-wrap break-all rounded border border-slate-200 bg-white p-2 max-h-64 overflow-auto">{after ?? "-"}</pre>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {nextCursor && !loading && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => void loadMore()} disabled={loadingMore} className="gap-2 text-xs h-9 border-slate-300">
            {loadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            โหลดเพิ่มเติม
          </Button>
        </div>
      )}
    </div>
  );
}
