"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  DollarSign,
  Printer,
  Download,
  Calendar,
  Building2,
  FileText,
  ShieldCheck,
  Percent,
  Building,
  AlertCircle,
  Loader2,
  Pencil,
  RefreshCw,
  Wand2,
  CheckCircle2,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { formatTHB } from "@/lib/utils";

type SlipStatus = "PENDING" | "APPROVED" | "PAID";
const MONEY_FIELDS = ["baseSalary", "repairCommission", "salesCommission", "allowance", "overtimePay", "taxDeduction", "otherDeductions"] as const;
type MoneyField = (typeof MONEY_FIELDS)[number];

interface PayrollSlip {
  id: string;
  userId: string;
  branchId: string;
  month: string;
  baseSalary: number;
  repairCommission: number;
  salesCommission: number;
  allowance: number;
  overtimePay: number;
  ssoDeduction: number;
  taxDeduction: number;
  otherDeductions: number;
  netPayout: number;
  gross: number;
  employerSso: number;
  status: SlipStatus;
  paidDate: string | null;
  user: { id: string; name: string; role: string; isActive: boolean } | null;
  branch: { id: string; name: string; code: string } | null;
}
interface Policy {
  ssoRate: number;
  ssoWageMin: number;
  ssoWageMax: number;
  ssoMax: number;
}
interface Summary {
  count: number;
  baseSalary: number;
  repairCommission: number;
  salesCommission: number;
  gross: number;
  sso: number;
  employerSso: number;
  tax: number;
  net: number;
}

const FIELD_LABELS: Record<MoneyField, string> = {
  baseSalary: "เงินเดือนพื้นฐาน",
  repairCommission: "ค่าคอมงานซ่อม",
  salesCommission: "ค่าคอมยอดขาย",
  allowance: "เบี้ยขยัน / เบี้ยเลี้ยง",
  overtimePay: "ค่าล่วงเวลา (OT)",
  taxDeduction: "ภาษีหัก ณ ที่จ่าย (กรอกเอง)",
  otherDeductions: "หักอื่นๆ (ขาด/สาย/เบิกล่วงหน้า)",
};

const bangkokDay = (d: Date = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(d);
const money = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Fetch JSON and throw the server's Thai error message unless both res.ok and json.success. */
async function fetchJson<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.error || `ไม่สามารถทำรายการได้ (${res.status})`);
  return json as T;
}

export default function PayrollPage() {
  const { branches, currentUser } = useApp();
  const isAdmin = currentUser.role === "ADMIN";

  const [slips, setSlips] = useState<PayrollSlip[]>([]);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [usersWithoutSlip, setUsersWithoutSlip] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(() => bangkokDay().slice(0, 7));
  const [selectedBranch, setSelectedBranch] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // Slip / edit modals
  const [slipModalOpen, setSlipModalOpen] = useState(false);
  const [activeSlip, setActiveSlip] = useState<PayrollSlip | null>(null);
  const [editSlip, setEditSlip] = useState<PayrollSlip | null>(null);
  const [editValues, setEditValues] = useState<Record<MoneyField, string>>({} as Record<MoneyField, string>);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadPayroll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const json = await fetchJson<{ data: PayrollSlip[]; policy: Policy; usersWithoutSlip: { id: string; name: string }[] }>(
        `/api/payroll?month=${encodeURIComponent(selectedMonth)}`
      );
      setSlips(json.data);
      setPolicy(json.policy);
      setUsersWithoutSlip(json.usersWithoutSlip ?? []);
    } catch (e) {
      setSlips([]);
      setUsersWithoutSlip([]);
      setLoadError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    void loadPayroll();
  }, [loadPayroll]);

  const filteredPayroll = useMemo(
    () => slips.filter((p) => (selectedBranch === "ALL" || p.branchId === selectedBranch) && (roleFilter === "ALL" || p.user?.role === roleFilter)),
    [slips, selectedBranch, roleFilter]
  );

  const summary: Summary = useMemo(
    () =>
      filteredPayroll.reduce(
        (a, p) => ({
          count: a.count + 1,
          baseSalary: a.baseSalary + p.baseSalary,
          repairCommission: a.repairCommission + p.repairCommission,
          salesCommission: a.salesCommission + p.salesCommission,
          gross: a.gross + p.gross,
          sso: a.sso + p.ssoDeduction,
          employerSso: a.employerSso + p.employerSso,
          tax: a.tax + p.taxDeduction,
          net: a.net + p.netPayout,
        }),
        { count: 0, baseSalary: 0, repairCommission: 0, salesCommission: 0, gross: 0, sso: 0, employerSso: 0, tax: 0, net: 0 }
      ),
    [filteredPayroll]
  );

  const handleGenerate = async () => {
    setGenerating(true);
    setActionError(null);
    setNotice(null);
    try {
      const json = await fetchJson<{ data: { created: number; updated: number; skipped: number } }>("/api/payroll", {
        method: "POST",
        body: JSON.stringify({ month: selectedMonth }),
      });
      setNotice(`สร้างสลิปใหม่ ${json.data.created} รายการ (มีอยู่แล้ว ${json.data.skipped} รายการ) — กรุณาตรวจสอบ/กรอกฐานเงินเดือนในสลิปที่ยังเป็น 0`);
      await loadPayroll();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "สร้างเงินเดือนไม่สำเร็จ");
    } finally {
      setGenerating(false);
    }
  };

  const runAction = async (slip: PayrollSlip, action: "APPROVE" | "REOPEN" | "PAY") => {
    if (action === "PAY" && !confirm(`ยืนยันบันทึกการจ่ายเงินเดือน ${slip.user?.name ?? ""} จำนวน ${formatTHB(slip.netPayout)}? หลังจ่ายแล้วจะแก้ไขไม่ได้`)) return;
    setBusyId(slip.id);
    setActionError(null);
    setNotice(null);
    try {
      await fetchJson("/api/payroll", { method: "PATCH", body: JSON.stringify({ id: slip.id, action }) });
      await loadPayroll();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "ทำรายการไม่สำเร็จ");
    } finally {
      setBusyId(null);
    }
  };

  const openEdit = (slip: PayrollSlip) => {
    setEditSlip(slip);
    setEditValues(Object.fromEntries(MONEY_FIELDS.map((f) => [f, String(slip[f])])) as Record<MoneyField, string>);
    setFormError(null);
  };

  // Live preview of SSO and net using the server's policy constants.
  // SSO: employee contributes ssoRate% of their gross wage, capped at ssoWageMax.
  // If gross < ssoWageMin the contribution base is still gross (no floor inflation).
  const editPreview = useMemo(() => {
    if (!editSlip || !policy) return null;
    const v = (f: MoneyField) => Number(editValues[f]) || 0;
    const gross = v("baseSalary") + v("repairCommission") + v("salesCommission") + v("allowance") + v("overtimePay");
    const ssoBase = Math.min(gross, policy.ssoWageMax); // cap at max; no artificial floor
    const sso = gross <= 0 ? 0 : Math.round(ssoBase * policy.ssoRate);
    return { gross, sso, net: gross - sso - v("taxDeduction") - v("otherDeductions") };
  }, [editSlip, editValues, policy]);

  const handleSaveEdit = async () => {
    if (!editSlip) return;
    for (const f of MONEY_FIELDS) {
      const n = Number(editValues[f]);
      if (editValues[f] === "" || !Number.isFinite(n) || n < 0) {
        setFormError(`กรุณากรอก${FIELD_LABELS[f]}ให้ถูกต้อง`);
        return;
      }
    }
    setSaving(true);
    setFormError(null);
    try {
      const body: Record<string, unknown> = { id: editSlip.id, action: "UPDATE" };
      for (const f of MONEY_FIELDS) body[f] = Number(editValues[f]);
      await fetchJson("/api/payroll", { method: "PATCH", body: JSON.stringify(body) });
      setEditSlip(null);
      await loadPayroll();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const exportCSV = () => {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const headers = ["ลำดับ,ชื่อพนักงาน,ตำแหน่ง,สาขา,ฐานเงินเดือน,คอมซ่อม,คอมขาย,เบี้ยขยัน,OT,รายได้รวม,ประกันสังคม,ภาษีหัก ณ ที่จ่าย,หักอื่นๆ,เงินได้สุทธิ,สถานะ,วันที่จ่าย"];
    const rows = filteredPayroll.map((p, idx) =>
      [
        idx + 1,
        esc(p.user?.name ?? p.userId),
        p.user?.role ?? "",
        esc(p.branch?.name ?? ""),
        p.baseSalary.toFixed(2),
        p.repairCommission.toFixed(2),
        p.salesCommission.toFixed(2),
        p.allowance.toFixed(2),
        p.overtimePay.toFixed(2),
        p.gross.toFixed(2),
        p.ssoDeduction.toFixed(2),
        p.taxDeduction.toFixed(2),
        p.otherDeductions.toFixed(2),
        p.netPayout.toFixed(2),
        p.status,
        p.paidDate ?? "",
      ].join(",")
    );
    const csvContent = "﻿" + [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payroll_${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">เงินเดือน & ค่าคอมมิชชั่น (Payroll & Commission)</h1>
            <p className="text-xs text-slate-500">
              คำนวณฐานเงินเดือน ค่าคอม ประกันสังคม
              {policy ? ` (${policy.ssoRate * 100}% ฐาน ${policy.ssoWageMin.toLocaleString()}-${policy.ssoWageMax.toLocaleString()} บ. สูงสุด ${policy.ssoMax} บ.)` : ""} และออกสลิปเงินเดือน
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => void loadPayroll()} disabled={loading} className="gap-2 text-xs h-9 border-slate-300 hover:bg-slate-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            รีเฟรช
          </Button>
          <Button variant="outline" onClick={exportCSV} disabled={loading || filteredPayroll.length === 0} className="gap-2 text-xs h-9 border-slate-300 hover:bg-slate-50">
            <Download className="h-3.5 w-3.5" />
            ส่งออก CSV
          </Button>
          <Button onClick={() => void handleGenerate()} disabled={generating || loading} className="gap-2 text-xs h-9 bg-blue-600 text-white hover:bg-blue-700">
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
            สร้างสลิปงวด {selectedMonth}
          </Button>
        </div>
      </div>

      {(loadError || actionError) && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{loadError || actionError}</span>
        </div>
      )}
      {notice && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}
      {!loading && usersWithoutSlip.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          พนักงานที่ยังไม่มีสลิปงวดนี้ {usersWithoutSlip.length} คน: {usersWithoutSlip.slice(0, 8).map((u) => u.name).join(", ")}
          {usersWithoutSlip.length > 8 ? " ..." : ""} — กด "สร้างสลิป" เพื่อสร้าง
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <Card className="border-blue-200 bg-blue-50/40 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-blue-700 mb-1">
              <span>ยอดจ่ายสุทธิรวม (Net Payout)</span>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-900 tabular-nums">{formatTHB(summary.net)}</div>
            <p className="text-[11px] text-blue-600 mt-0.5">พนักงานทั้งหมด {summary.count} คน</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-white shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>ฐานเงินเดือนรวม (Base Pay)</span>
              <Building className="h-4 w-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">{formatTHB(summary.baseSalary)}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">รายได้รวม {formatTHB(summary.gross)}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/40 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-emerald-700 mb-1">
              <span>คอมมิชชั่นรวม (Commissions)</span>
              <Percent className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-800 tabular-nums">{formatTHB(summary.repairCommission + summary.salesCommission)}</div>
            <p className="text-[11px] text-emerald-600 mt-0.5">
              ซ่อม: {formatTHB(summary.repairCommission)} | ขาย: {formatTHB(summary.salesCommission)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/40 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-amber-700 mb-1">
              <span>ประกันสังคม (ลูกจ้าง)</span>
              <ShieldCheck className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-amber-800 tabular-nums">{formatTHB(summary.sso)}</div>
            <p className="text-[11px] text-amber-600 mt-0.5">นายจ้างสมทบ {formatTHB(summary.employerSso)} · รวมนำส่ง {formatTHB(summary.sso + summary.employerSso)}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-white shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>หักภาษี ณ ที่จ่าย (WHT)</span>
              <FileText className="h-4 w-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">{formatTHB(summary.tax)}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">ภ.ง.ด.1 นำส่งสรรพากร</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-xs text-slate-700">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-medium">งวดเดือน:</span>
            <input type="month" value={selectedMonth} onChange={(e) => e.target.value && setSelectedMonth(e.target.value)} className="bg-transparent text-xs font-medium text-slate-800 outline-none cursor-pointer" />
          </div>
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
          <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-1 bg-slate-50 text-xs">
            {["ALL", "TECHNICIAN", "CASHIER", "MANAGER", "ADMIN"].map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  roleFilter === r ? "bg-white text-slate-900 shadow-2xs border border-slate-200/80 font-semibold" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {r === "ALL" && "ทุกตำแหน่ง"}
                {r === "TECHNICIAN" && "ช่างซ่อม"}
                {r === "CASHIER" && "แคชเชียร์"}
                {r === "MANAGER" && "ผู้จัดการ"}
                {r === "ADMIN" && "แอดมิน"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Payroll Table */}
      <Card className="border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/75 border-b border-slate-200">
              <TableRow>
                <TableHead className="text-xs font-semibold text-slate-600">พนักงาน</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-right">ฐานเงินเดือน</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-right">คอมมิชชั่นซ่อม</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-right">คอมมิชชั่นขาย</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-right">เบี้ยขยัน/OT</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-right">หัก ปกส./ภาษี/อื่นๆ</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-right">เงินได้สุทธิ</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">สถานะ</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">การกระทำ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-40 text-center">
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลดข้อมูล...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredPayroll.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-40 text-center text-sm text-slate-500">
                    {loadError ? "โหลดข้อมูลไม่สำเร็จ" : `ยังไม่มีสลิปเงินเดือนงวด ${selectedMonth} — กด "สร้างสลิป" เพื่อเริ่ม`}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayroll.map((emp) => {
                  const name = emp.user?.name ?? emp.userId;
                  const busy = busyId === emp.id;
                  const own = emp.userId === currentUser.id && !isAdmin;
                  return (
                    <TableRow key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 font-semibold text-xs text-slate-700 border border-slate-200">{name.slice(0, 2)}</div>
                          <div>
                            <div className="font-semibold text-xs text-slate-900">{name}</div>
                            <div className="text-[11px] text-slate-400">
                              {emp.user?.role ?? "-"} • {emp.branch?.code ?? "-"}
                              {emp.user && !emp.user.isActive ? " • ปิดใช้งาน" : ""}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 text-right font-mono text-xs text-slate-800">{formatTHB(emp.baseSalary)}</TableCell>
                      <TableCell className="py-3 text-right font-mono text-xs text-emerald-700 font-medium">{emp.repairCommission > 0 ? `+${formatTHB(emp.repairCommission)}` : "-"}</TableCell>
                      <TableCell className="py-3 text-right font-mono text-xs text-blue-700 font-medium">{emp.salesCommission > 0 ? `+${formatTHB(emp.salesCommission)}` : "-"}</TableCell>
                      <TableCell className="py-3 text-right font-mono text-xs text-slate-600">+{formatTHB(emp.allowance + emp.overtimePay)}</TableCell>
                      <TableCell className="py-3 text-right font-mono text-xs text-rose-600">-{formatTHB(emp.ssoDeduction + emp.taxDeduction + emp.otherDeductions)}</TableCell>
                      <TableCell className="py-3 text-right font-mono text-xs font-bold text-slate-900">{formatTHB(emp.netPayout)}</TableCell>
                      <TableCell className="py-3 text-center">
                        {emp.status === "PAID" && <Badge variant="success" className="text-[10px]">จ่ายแล้ว {emp.paidDate ?? ""}</Badge>}
                        {emp.status === "APPROVED" && <Badge variant="default" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">อนุมัติแล้ว</Badge>}
                        {emp.status === "PENDING" && <Badge variant="warning" className="text-[10px]">รอตรวจสอบ</Badge>}
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <Button variant="outline" size="sm" onClick={() => { setActiveSlip(emp); setSlipModalOpen(true); }} className="h-7 text-[11px] px-2 gap-1 border-slate-300">
                            <FileText className="h-3 w-3" />
                            สลิป
                          </Button>
                          {emp.status === "PENDING" && !own && (
                            <>
                              <Button variant="outline" size="sm" disabled={busy} onClick={() => openEdit(emp)} className="h-7 text-[11px] px-2 gap-1 border-slate-300">
                                <Pencil className="h-3 w-3" />
                                แก้ไข
                              </Button>
                              <Button variant="secondary" size="sm" disabled={busy} onClick={() => void runAction(emp, "APPROVE")} className="h-7 text-[11px] px-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200">
                                {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "อนุมัติ"}
                              </Button>
                            </>
                          )}
                          {emp.status === "APPROVED" && !own && (
                            <Button variant="outline" size="sm" disabled={busy} onClick={() => void runAction(emp, "REOPEN")} className="h-7 text-[11px] px-2 border-slate-300">
                              ย้อนกลับแก้ไข
                            </Button>
                          )}
                          {emp.status === "APPROVED" && isAdmin && (
                            <Button variant="secondary" size="sm" disabled={busy} onClick={() => void runAction(emp, "PAY")} className="h-7 text-[11px] px-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200">
                              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "บันทึกจ่าย"}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Edit draft slip */}
      <Dialog open={editSlip !== null} onOpenChange={(o) => !o && !saving && setEditSlip(null)} preventClose={saving}>
        <DialogHeader>
          <DialogTitle onClose={() => !saving && setEditSlip(null)}>
            แก้ไขสลิป {editSlip?.user?.name ?? ""} งวด {editSlip?.month ?? ""}
          </DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-3">
          {formError && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {MONEY_FIELDS.map((f) => (
              <div key={f}>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">{FIELD_LABELS[f]}</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editValues[f] ?? ""}
                  onChange={(e) => setEditValues((prev) => ({ ...prev, [f]: e.target.value }))}
                  className="text-xs h-9 font-mono"
                />
              </div>
            ))}
          </div>
          {editPreview && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs space-y-1">
              <div className="flex justify-between"><span>รายได้รวม</span><span className="font-mono">{money(editPreview.gross)}</span></div>
              <div className="flex justify-between"><span>ประกันสังคม (คำนวณอัตโนมัติ)</span><span className="font-mono text-rose-600">-{money(editPreview.sso)}</span></div>
              <div className={`flex justify-between font-bold ${editPreview.net < 0 ? "text-rose-600" : ""}`}><span>เงินได้สุทธิ (โดยประมาณ)</span><span className="font-mono">{money(editPreview.net)}</span></div>
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditSlip(null)} disabled={saving} className="text-xs">ยกเลิก</Button>
          <Button onClick={() => void handleSaveEdit()} disabled={saving} className="text-xs bg-blue-600 text-white hover:bg-blue-700 gap-1.5">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Pay Slip Modal */}
      <Dialog open={slipModalOpen} onOpenChange={setSlipModalOpen} maxWidth="max-w-4xl">
        <DialogHeader>
          <DialogTitle onClose={() => setSlipModalOpen(false)}>
            ใบแจ้งเงินเดือน / Pay Slip
          </DialogTitle>
        </DialogHeader>
        <DialogContent className="p-0">
          {activeSlip && (
            <div id="payslip-printable" className="bg-white pt-4 rounded-xl text-slate-900">
              <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold tracking-tight text-slate-900">{activeSlip.branch?.name ?? ""}</span>
                    <span className="rounded bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.5">PAYSLIP</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-900">ใบแจ้งเงินเดือน / PAY SLIP</div>
                  <div className="text-xs text-slate-600 font-mono mt-0.5">งวดประจำเดือน: {activeSlip.month}</div>
                  <div className="text-[11px] text-slate-500">
                    {activeSlip.status === "PAID" ? `วันที่จ่าย: ${activeSlip.paidDate ?? "-"}` : "ยังไม่จ่าย (ฉบับร่าง)"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs mb-4">
                <div>
                  <div><span className="text-slate-500">รหัสพนักงาน:</span> <span className="font-mono font-medium">{activeSlip.userId.slice(-8).toUpperCase()}</span></div>
                  <div><span className="text-slate-500">ชื่อ-นามสกุล:</span> <span className="font-semibold">{activeSlip.user?.name ?? "-"}</span></div>
                </div>
                <div>
                  <div><span className="text-slate-500">ตำแหน่ง:</span> <span className="font-medium">{activeSlip.user?.role ?? "-"}</span></div>
                  <div><span className="text-slate-500">สังกัดสาขา:</span> <span className="font-medium">{activeSlip.branch?.name ?? "-"}</span></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border border-slate-200 rounded-lg overflow-hidden mb-4">
                <div className="border-r border-slate-200">
                  <div className="bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 border-b border-slate-200 flex justify-between">
                    <span>รายการได้ (Earnings)</span>
                    <span>บาท</span>
                  </div>
                  <div className="p-3 space-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-slate-600">เงินเดือนพื้นฐาน</span><span className="font-mono">{money(activeSlip.baseSalary)}</span></div>
                    {activeSlip.repairCommission > 0 && <div className="flex justify-between"><span className="text-slate-600">ค่าคอมมิชชั่นงานซ่อม</span><span className="font-mono text-emerald-700">{money(activeSlip.repairCommission)}</span></div>}
                    {activeSlip.salesCommission > 0 && <div className="flex justify-between"><span className="text-slate-600">ค่าคอมมิชชั่นยอดขาย</span><span className="font-mono text-blue-700">{money(activeSlip.salesCommission)}</span></div>}
                    {activeSlip.allowance > 0 && <div className="flex justify-between"><span className="text-slate-600">เบี้ยขยัน / เบี้ยเลี้ยง</span><span className="font-mono">{money(activeSlip.allowance)}</span></div>}
                    {activeSlip.overtimePay > 0 && <div className="flex justify-between"><span className="text-slate-600">ค่าล่วงเวลา (OT)</span><span className="font-mono">{money(activeSlip.overtimePay)}</span></div>}
                    <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold"><span>รวมรายได้</span><span className="font-mono">{money(activeSlip.gross)}</span></div>
                  </div>
                </div>
                <div>
                  <div className="bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 border-b border-slate-200 flex justify-between">
                    <span>รายการหัก (Deductions)</span>
                    <span>บาท</span>
                  </div>
                  <div className="p-3 space-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-slate-600">ประกันสังคม</span><span className="font-mono text-rose-600">{money(activeSlip.ssoDeduction)}</span></div>
                    {activeSlip.taxDeduction > 0 && <div className="flex justify-between"><span className="text-slate-600">ภาษีหัก ณ ที่จ่าย</span><span className="font-mono text-rose-600">{money(activeSlip.taxDeduction)}</span></div>}
                    {activeSlip.otherDeductions > 0 && <div className="flex justify-between"><span className="text-slate-600">หักอื่นๆ</span><span className="font-mono text-rose-600">{money(activeSlip.otherDeductions)}</span></div>}
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 text-white p-3.5 rounded-lg flex items-center justify-between mb-6">
                <div className="text-xs text-slate-300">เงินได้สุทธิ (Net Payable)</div>
                <div className="text-2xl font-bold font-mono text-emerald-400">{formatTHB(activeSlip.netPayout)}</div>
              </div>

              <div className="grid grid-cols-2 gap-8 text-center text-xs text-slate-600 pt-6 border-t border-slate-200">
                <div>
                  <div className="h-10 border-b border-dashed border-slate-300 w-3/4 mx-auto mb-1"></div>
                  <p className="font-medium">ผู้จ่ายเงิน</p>
                </div>
                <div>
                  <div className="h-10 border-b border-dashed border-slate-300 w-3/4 mx-auto mb-1"></div>
                  <p className="font-medium">({activeSlip.user?.name ?? ""}) พนักงานผู้รับเงิน</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-100 print:hidden">
                <Button size="sm" onClick={() => window.print()} className="bg-blue-600 text-white hover:bg-blue-700 gap-1.5">
                  <Printer className="h-3.5 w-3.5" />
                  พิมพ์สลิปเอกสาร
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
