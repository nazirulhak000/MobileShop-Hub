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
  Copy,
  Check,
  Globe,
  Monitor,
  Smartphone,
  Eye,
  Filter,
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
  userAgent?: string | null;
  createdAt: string;
  user: { id: string; name: string; role: string } | null;
}

// Modules written by the API routes
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
  { id: "TAX_WHT", label: "ภาษีหัก ณ ที่จ่าย" },
  { id: "TAX_SETTINGS", label: "ตั้งค่าภาษี" },
  { id: "WARRANTY", label: "รับประกันสินค้า" },
  { id: "SETTINGS", label: "ตั้งค่าระบบ & หน้าร้าน" },
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
  { id: "STOREFRONT_CONFIG_UPDATE", label: "แก้ไขหน้าร้าน (STOREFRONT_UPDATE)" },
  { id: "STOREFRONT_CONFIG_ROLLBACK", label: "กู้คืนหน้าร้าน (STOREFRONT_ROLLBACK)" },
];

const bangkokDay = (d: Date = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(d);
const bangkokDateTime = (iso: string) => new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", hour12: false });

function extractUserAgentFromDetails(details: string): string | null {
  const match = details.match(/\[UA:\s*([^\]]+)\]/);
  return match ? match[1] : null;
}

function parseBrowserDevice(uaString: string | null | undefined): { label: string; isMobile: boolean } {
  if (!uaString) return { label: "Unknown", isMobile: false };
  const ua = uaString.toLowerCase();
  const isMobile = ua.includes("mobile") || ua.includes("android") || ua.includes("iphone") || ua.includes("ipad");
  let browser = "Browser";
  if (ua.includes("edg/")) browser = "Edge";
  else if (ua.includes("chrome/") || ua.includes("crios/")) browser = "Chrome";
  else if (ua.includes("safari/") && !ua.includes("chrome")) browser = "Safari";
  else if (ua.includes("firefox/")) browser = "Firefox";

  let os = "";
  if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("macintosh") || ua.includes("mac os")) os = "macOS";
  else if (ua.includes("android")) os = "Android";
  else if (ua.includes("iphone") || ua.includes("ipad")) os = "iOS";
  else if (ua.includes("linux")) os = "Linux";

  const label = [browser, os].filter(Boolean).join(" on ") || "Web Client";
  return { label, isMobile };
}

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

interface DiffItem {
  key: string;
  status: "added" | "removed" | "modified" | "unchanged";
  oldValue: any;
  newValue: any;
}

function computeJsonDiff(beforeStr: string | null, afterStr: string | null): { items: DiffItem[]; hasDiff: boolean; summary: string } {
  if (!beforeStr && !afterStr) return { items: [], hasDiff: false, summary: "ไม่มีข้อมูลเปรียบเทียบ" };

  let beforeObj: Record<string, any> = {};
  let afterObj: Record<string, any> = {};
  let beforeParsed = false;
  let afterParsed = false;

  try {
    if (beforeStr) {
      beforeObj = JSON.parse(beforeStr);
      beforeParsed = true;
    }
  } catch {}

  try {
    if (afterStr) {
      afterObj = JSON.parse(afterStr);
      afterParsed = true;
    }
  } catch {}

  if (!beforeParsed && !afterParsed) {
    return {
      items: [
        {
          key: "content",
          status: beforeStr !== afterStr ? "modified" : "unchanged",
          oldValue: beforeStr,
          newValue: afterStr,
        },
      ],
      hasDiff: beforeStr !== afterStr,
      summary: beforeStr !== afterStr ? "ข้อความมีการเปลี่ยนแปลง" : "ไม่มีการเปลี่ยนแปลง",
    };
  }

  const allKeys = Array.from(new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)])).sort();
  const items: DiffItem[] = [];
  let added = 0;
  let removed = 0;
  let modified = 0;

  for (const k of allKeys) {
    const hasOld = Object.prototype.hasOwnProperty.call(beforeObj, k);
    const hasNew = Object.prototype.hasOwnProperty.call(afterObj, k);
    const oldVal = beforeObj[k];
    const newVal = afterObj[k];

    if (!hasOld && hasNew) {
      items.push({ key: k, status: "added", oldValue: undefined, newValue: newVal });
      added++;
    } else if (hasOld && !hasNew) {
      items.push({ key: k, status: "removed", oldValue: oldVal, newValue: undefined });
      removed++;
    } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      items.push({ key: k, status: "modified", oldValue: oldVal, newValue: newVal });
      modified++;
    } else {
      items.push({ key: k, status: "unchanged", oldValue: oldVal, newValue: newVal });
    }
  }

  const parts: string[] = [];
  if (added > 0) parts.push(`+${added} เพิ่ม`);
  if (modified > 0) parts.push(`~${modified} แก้ไข`);
  if (removed > 0) parts.push(`-${removed} ลบ`);

  const summary = parts.length > 0 ? parts.join(", ") : "ไม่มีการเปลี่ยนแปลงค่า";
  return { items, hasDiff: added > 0 || removed > 0 || modified > 0, summary };
}

function JsonDiffViewer({ beforeJson, afterJson }: { beforeJson: string | null; afterJson: string | null }) {
  const [viewMode, setViewMode] = useState<"diff" | "side-by-side" | "raw">("diff");
  const [onlyChanges, setOnlyChanges] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const diff = useMemo(() => computeJsonDiff(beforeJson, afterJson), [beforeJson, afterJson]);
  const displayedItems = useMemo(() => {
    if (!onlyChanges) return diff.items;
    return diff.items.filter((item) => item.status !== "unchanged");
  }, [diff.items, onlyChanges]);

  const handleCopy = (text: string | null, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const renderValue = (val: any) => {
    if (val === undefined) return <span className="text-slate-400 italic">undefined</span>;
    if (val === null) return <span className="text-slate-400 italic">null</span>;
    if (typeof val === "boolean") return <span className="text-purple-600 font-bold">{String(val)}</span>;
    if (typeof val === "number") return <span className="text-blue-600 font-mono font-bold">{val}</span>;
    if (typeof val === "string") return <span className="text-emerald-700 font-mono">"{val}"</span>;
    return <span className="text-slate-700 font-mono">{JSON.stringify(val)}</span>;
  };

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs text-slate-800">เปรียบเทียบข้อมูล (JSON Diff):</span>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              diff.hasDiff ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-slate-100 text-slate-600"
            }`}
          >
            {diff.summary}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px]">
            <button
              type="button"
              onClick={() => setViewMode("diff")}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                viewMode === "diff" ? "bg-white text-slate-900 shadow-2xs font-semibold" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Diff View
            </button>
            <button
              type="button"
              onClick={() => setViewMode("side-by-side")}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                viewMode === "side-by-side" ? "bg-white text-slate-900 shadow-2xs font-semibold" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Side-by-Side
            </button>
            <button
              type="button"
              onClick={() => setViewMode("raw")}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                viewMode === "raw" ? "bg-white text-slate-900 shadow-2xs font-semibold" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Raw
            </button>
          </div>

          {viewMode === "diff" && diff.items.some((i) => i.status === "unchanged") && (
            <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyChanges}
                onChange={(e) => setOnlyChanges(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
              />
              <span>เฉพาะฟิลด์ที่เปลี่ยน</span>
            </label>
          )}
        </div>
      </div>

      {/* Main Diff Presentation */}
      {viewMode === "diff" && (
        <div className="space-y-1 max-h-72 overflow-y-auto font-mono text-[11px] border border-slate-100 rounded-lg p-2 bg-slate-50/50">
          {displayedItems.length === 0 ? (
            <div className="text-center py-4 text-xs text-slate-400">ไม่มีฟิลด์ที่เปลี่ยนแปลง</div>
          ) : (
            displayedItems.map((item) => (
              <div
                key={item.key}
                className={`p-1.5 rounded flex flex-col sm:flex-row sm:items-start justify-between gap-2 border text-[11px] leading-tight ${
                  item.status === "added"
                    ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                    : item.status === "removed"
                    ? "bg-rose-50/80 border-rose-200 text-rose-900"
                    : item.status === "modified"
                    ? "bg-amber-50/80 border-amber-200 text-amber-950"
                    : "bg-white border-slate-200 text-slate-600"
                }`}
              >
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`h-4 w-4 rounded text-[10px] font-bold flex items-center justify-center shrink-0 ${
                      item.status === "added"
                        ? "bg-emerald-200 text-emerald-800"
                        : item.status === "removed"
                        ? "bg-rose-200 text-rose-800"
                        : item.status === "modified"
                        ? "bg-amber-200 text-amber-800"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {item.status === "added" ? "+" : item.status === "removed" ? "-" : item.status === "modified" ? "~" : "•"}
                  </span>
                  <span className="font-bold">{item.key}:</span>
                </div>

                <div className="flex-1 flex flex-wrap items-center gap-1 text-[11px] break-all">
                  {item.status === "modified" ? (
                    <>
                      <div className="line-through opacity-70 bg-rose-100/70 px-1 rounded">{renderValue(item.oldValue)}</div>
                      <span className="text-slate-400 font-bold">➔</span>
                      <div className="bg-emerald-100/70 px-1 rounded font-semibold">{renderValue(item.newValue)}</div>
                    </>
                  ) : item.status === "added" ? (
                    <div className="bg-emerald-100/70 px-1 rounded">{renderValue(item.newValue)}</div>
                  ) : item.status === "removed" ? (
                    <div className="line-through bg-rose-100/70 px-1 rounded">{renderValue(item.oldValue)}</div>
                  ) : (
                    <div>{renderValue(item.newValue)}</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {viewMode === "side-by-side" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
          <div className="space-y-1">
            <div className="flex items-center justify-between font-semibold text-slate-600 text-xs">
              <span>ก่อนเปลี่ยนแปลง (Before)</span>
              {beforeJson && (
                <button
                  type="button"
                  onClick={() => handleCopy(beforeJson, "before")}
                  className="inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-900"
                >
                  {copied === "before" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  <span>{copied === "before" ? "คัดลอกแล้ว" : "คัดลอก"}</span>
                </button>
              )}
            </div>
            <pre className="whitespace-pre-wrap break-all rounded-lg border border-slate-200 bg-slate-50 p-2.5 max-h-64 overflow-auto font-mono text-[11px]">
              {prettyJson(beforeJson) || <span className="text-slate-400">- ไม่มีข้อมูล -</span>}
            </pre>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between font-semibold text-slate-600 text-xs">
              <span>หลังเปลี่ยนแปลง (After)</span>
              {afterJson && (
                <button
                  type="button"
                  onClick={() => handleCopy(afterJson, "after")}
                  className="inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-900"
                >
                  {copied === "after" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  <span>{copied === "after" ? "คัดลอกแล้ว" : "คัดลอก"}</span>
                </button>
              )}
            </div>
            <pre className="whitespace-pre-wrap break-all rounded-lg border border-slate-200 bg-slate-50 p-2.5 max-h-64 overflow-auto font-mono text-[11px]">
              {prettyJson(afterJson) || <span className="text-slate-400">- ไม่มีข้อมูล -</span>}
            </pre>
          </div>
        </div>
      )}

      {viewMode === "raw" && (
        <div className="space-y-2 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-xs text-slate-700">ข้อมูล JSON ดิบ (Raw JSON)</span>
            <button
              type="button"
              onClick={() => handleCopy(afterJson || beforeJson, "raw")}
              className="inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-900"
            >
              {copied === "raw" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
              <span>{copied === "raw" ? "คัดลอกแล้ว" : "คัดลอก"}</span>
            </button>
          </div>
          <pre className="whitespace-pre-wrap break-all rounded-lg border border-slate-900 bg-slate-900 text-emerald-400 p-3 max-h-64 overflow-auto font-mono text-[11px]">
            {prettyJson(afterJson || beforeJson) || "-"}
          </pre>
        </div>
      )}
    </div>
  );
}

const PAGE_SIZE = 100;

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [tenantUsers, setTenantUsers] = useState<Array<{ id: string; name: string; role: string }>>([]);
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

  // Load tenant users for the user filter dropdown
  useEffect(() => {
    let isMounted = true;
    fetchJson<{ users: Array<{ id: string; name: string; role: string }> }>("/api/users?take=200")
      .then((res) => {
        if (isMounted && res.users) {
          setTenantUsers(res.users);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

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

  // Unique users list merging loaded logs with tenant users
  const userOptions = useMemo(() => {
    const map = new Map<string, string>();
    tenantUsers.forEach((u) => {
      map.set(u.id, `${u.name} (${u.role})`);
    });
    logs.forEach((l) => {
      if (l.user && !map.has(l.user.id)) {
        map.set(l.user.id, `${l.user.name} (${l.user.role})`);
      }
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [tenantUsers, logs]);

  // Client-side text search over loaded rows
  const filteredLogs = useMemo(() => {
    const result = logs;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return result;
    return result.filter(
      (l) =>
        l.details.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        (l.targetId ?? "").toLowerCase().includes(q) ||
        (l.user?.name ?? "").toLowerCase().includes(q) ||
        (l.ipAddress ?? "").toLowerCase().includes(q) ||
        (l.userAgent ?? "").toLowerCase().includes(q)
    );
  }, [logs, searchQuery]);

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
    const headers = [
      "เวลา (Asia/Bangkok),ผู้ใช้งาน,ตำแหน่ง,โมดูล,การกระทำ,รหัสอ้างอิง,รายละเอียด,ระดับความเสี่ยง,IP Address,User-Agent,ก่อนเปลี่ยนแปลง,หลังเปลี่ยนแปลง",
    ];
    const rows = filteredLogs.map((l) => {
      const ua = l.userAgent || extractUserAgentFromDetails(l.details) || "";
      return [
        esc(bangkokDateTime(l.createdAt)),
        esc(l.user?.name || "ระบบ / ลูกค้า"),
        esc(l.user?.role || ""),
        esc(l.module),
        esc(l.action),
        esc(l.targetId),
        esc(l.details),
        esc(l.severity),
        esc(l.ipAddress),
        esc(ua),
        esc(l.beforeJson),
        esc(l.afterJson),
      ].join(",");
    });
    // Prepend UTF-8 BOM so Microsoft Excel renders Thai characters cleanly
    const csvContent = "\uFEFF" + [headers, ...rows].join("\n");
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
            <Shield className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              บันทึกความปลอดภัย & ประวัติการกระทำ (Security & Audit Trail)
            </h1>
            <p className="text-xs text-slate-500">
              ตรวจสอบการตั้งค่าหน้าร้าน ยกเลิกบิล ปรับสต็อก งานซ่อม ผ่อนชำระ ค่าใช้จ่าย เงินเดือน และ IP/User-Agent
            </p>
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

      {/* KPI Cards */}
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
            <input
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-800 outline-none cursor-pointer"
            />
            <span>ถึง</span>
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-800 outline-none cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-xs text-slate-700">
            <Layers className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-medium">โมดูล:</span>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-800 outline-none cursor-pointer"
            >
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
                className="bg-transparent text-xs font-medium text-slate-800 outline-none cursor-pointer max-w-[150px] truncate"
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
          <Input
            placeholder="ค้นหารายละเอียด ผู้ใช้ IP หรือ Agent..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-9 bg-slate-50/50"
          />
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
                <TableHead className="text-xs font-semibold text-slate-600">รายละเอียด & ข้อมูลเปรียบเทียบ</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 font-mono">IP & เครื่องลูกข่าย</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">ระดับ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-40 text-center">
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลดข้อมูล Audit Trail...
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
                  const ua = l.userAgent || extractUserAgentFromDetails(l.details);
                  const clientInfo = parseBrowserDevice(ua);
                  const hasJsonDiff = Boolean(l.beforeJson || l.afterJson);

                  return (
                    <Fragment key={l.id}>
                      <TableRow
                        className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                        onClick={() => toggle(l.id)}
                      >
                        <TableCell className="py-3 text-slate-400">
                          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </TableCell>
                        <TableCell className="py-3 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                          {bangkokDateTime(l.createdAt)}
                        </TableCell>
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
                          <div className="flex items-center gap-2 mt-0.5">
                            {l.targetId && <span className="text-[10px] font-mono text-slate-400">อ้างอิง: {l.targetId}</span>}
                            {hasJsonDiff && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                JSON Diff มีข้อมูล
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            {l.ipAddress ? (
                              <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[10px] inline-block w-fit">
                                {l.ipAddress}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">-</span>
                            )}
                            {ua && (
                              <div className="flex items-center gap-1 text-[10px] text-slate-400" title={ua}>
                                {clientInfo.isMobile ? <Smartphone className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
                                <span>{clientInfo.label}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-center">
                          {l.severity === "DANGER" && <Badge variant="danger" className="text-[10px]">DANGER</Badge>}
                          {l.severity === "WARNING" && <Badge variant="warning" className="text-[10px]">WARNING</Badge>}
                          {l.severity !== "DANGER" && l.severity !== "WARNING" && <Badge variant="default" className="text-[10px]">{l.severity}</Badge>}
                        </TableCell>
                      </TableRow>
                      {open && (
                        <TableRow className="bg-slate-50/70">
                          <TableCell colSpan={7} className="py-4 px-6">
                            <div className="space-y-4">
                              {/* Metadata Strip */}
                              <div className="flex flex-wrap items-center gap-4 text-xs bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                                <div>
                                  <span className="text-slate-400 font-medium">รหัสรายการ:</span>{" "}
                                  <span className="font-mono text-slate-800">{l.id}</span>
                                </div>
                                {l.targetId && (
                                  <div>
                                    <span className="text-slate-400 font-medium">รหัสอ้างอิงเป้าหมาย:</span>{" "}
                                    <span className="font-mono font-semibold text-slate-900">{l.targetId}</span>
                                  </div>
                                )}
                                <div>
                                  <span className="text-slate-400 font-medium">IP Address:</span>{" "}
                                  <span className="font-mono text-slate-800">{l.ipAddress || "ไม่ระบุ"}</span>
                                </div>
                                {ua && (
                                  <div className="flex-1 truncate" title={ua}>
                                    <span className="text-slate-400 font-medium">User-Agent:</span>{" "}
                                    <span className="font-mono text-[11px] text-slate-600">{ua}</span>
                                  </div>
                                )}
                              </div>

                              {/* Details text block */}
                              <div>
                                <div className="font-semibold text-slate-700 text-xs mb-1">รายละเอียดการกระทำ:</div>
                                <div className="text-xs text-slate-800 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed">
                                  {l.details}
                                </div>
                              </div>

                              {/* Interactive JSON Diff Viewer */}
                              {(l.beforeJson || l.afterJson) && (
                                <JsonDiffViewer beforeJson={l.beforeJson} afterJson={l.afterJson} />
                              )}
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
