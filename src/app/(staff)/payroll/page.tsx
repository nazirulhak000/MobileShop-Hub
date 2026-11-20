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
  Receipt,
  Clock,
  Sparkles,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { formatTHB, bahtText } from "@/lib/utils";

type SlipStatus = "PENDING" | "APPROVED" | "PAID";

const MONEY_FIELDS = [
  "baseSalary",
  "repairCommission",
  "salesCommission",
  "allowance",
  "bonus",
  "ot15Hours",
  "ot20Hours",
  "ot30Hours",
  "overtimePay",
  "taxDeduction",
  "lateDeduction",
  "unpaidDeduction",
  "otherDeductions",
] as const;

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
  bonus: number;
  overtimePay: number;
  ot15Hours: number;
  ot20Hours: number;
  ot30Hours: number;
  ssoDeduction: number;
  taxDeduction: number;
  lateDeduction: number;
  unpaidDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  netPayout: number;
  gross: number;
  employerSso: number;
  netBahtText?: string;
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
  allowance: number;
  bonus: number;
  overtimePay: number;
  gross: number;
  sso: number;
  employerSso: number;
  tax: number;
  late: number;
  unpaid: number;
  otherDeductions: number;
  totalDeductions: number;
  net: number;
}

const FIELD_LABELS: Record<MoneyField, string> = {
  baseSalary: "เงินเดือนพื้นฐาน (Base Salary)",
  repairCommission: "ค่าคอมมิชชั่นงานซ่อม (Repair Comm)",
  salesCommission: "ค่าคอมมิชชั่นยอดขาย (Sales Comm)",
  allowance: "เบี้ยขยัน / เบี้ยเลี้ยง (Allowance)",
  bonus: "เงินโบนัส / พิเศษ (Bonus)",
  ot15Hours: "ชม. OT 1.5x (วันทำงานปกติ)",
  ot20Hours: "ชม. OT 2.0x (วันหยุดประจำสัปดาห์)",
  ot30Hours: "ชม. OT 3.0x (OT นอกเวลาวันหยุด)",
  overtimePay: "ค่าล่วงเวลา (OT Pay)",
  taxDeduction: "ภาษีหัก ณ ที่จ่าย ภ.ง.ด.1 (WHT)",
  lateDeduction: "หักมาสาย (Late Deduction)",
  unpaidDeduction: "หักขาดงาน / ลาไม่รับค่าจ้าง (Unpaid)",
  otherDeductions: "หักอื่นๆ (เบิกล่วงหน้า/ความเสียหาย)",
};

const bangkokDay = (d: Date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(d);

const money = (n: number) =>
  Number(n || 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const toSatang = (n: number) => Math.round(Number(n || 0) * 100);
const fromSatang = (s: number) => Math.round(s) / 100;

/** Fetch JSON and throw the server's Thai error message unless both res.ok and json.success. */
async function fetchJson<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new Error(json?.error || `ไม่สามารถทำรายการได้ (${res.status})`);
  }
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
  const [syncAttendanceOption, setSyncAttendanceOption] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState(() => bangkokDay().slice(0, 7));
  const [selectedBranch, setSelectedBranch] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // Slip print modal
  const [slipModalOpen, setSlipModalOpen] = useState(false);
  const [activeSlip, setActiveSlip] = useState<PayrollSlip | null>(null);
  const [printFormat, setPrintFormat] = useState<"A4" | "THERMAL">("A4");

  // Edit draft slip
  const [editSlip, setEditSlip] = useState<PayrollSlip | null>(null);
  const [editValues, setEditValues] = useState<Record<MoneyField, string>>({} as Record<MoneyField, string>);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadPayroll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const json = await fetchJson<{
        data: PayrollSlip[];
        policy: Policy;
        usersWithoutSlip: { id: string; name: string }[];
      }>(`/api/payroll?month=${encodeURIComponent(selectedMonth)}`);
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
    () =>
      slips.filter(
        (p) =>
          (selectedBranch === "ALL" || p.branchId === selectedBranch) &&
          (roleFilter === "ALL" || p.user?.role === roleFilter)
      ),
    [slips, selectedBranch, roleFilter]
  );

  const summary: Summary = useMemo(() => {
    const satangSum = filteredPayroll.reduce(
      (a, p) => ({
        count: a.count + 1,
        baseSalary: a.baseSalary + toSatang(p.baseSalary),
        repairCommission: a.repairCommission + toSatang(p.repairCommission),
        salesCommission: a.salesCommission + toSatang(p.salesCommission),
        allowance: a.allowance + toSatang(p.allowance),
        bonus: a.bonus + toSatang(p.bonus),
        overtimePay: a.overtimePay + toSatang(p.overtimePay),
        gross: a.gross + toSatang(p.gross),
        sso: a.sso + toSatang(p.ssoDeduction),
        employerSso: a.employerSso + toSatang(p.employerSso),
        tax: a.tax + toSatang(p.taxDeduction),
        late: a.late + toSatang(p.lateDeduction),
        unpaid: a.unpaid + toSatang(p.unpaidDeduction),
        otherDeductions: a.otherDeductions + toSatang(p.otherDeductions),
        totalDeductions: a.totalDeductions + toSatang(p.totalDeductions),
        net: a.net + toSatang(p.netPayout),
      }),
      {
        count: 0,
        baseSalary: 0,
        repairCommission: 0,
        salesCommission: 0,
        allowance: 0,
        bonus: 0,
        overtimePay: 0,
        gross: 0,
        sso: 0,
        employerSso: 0,
        tax: 0,
        late: 0,
        unpaid: 0,
        otherDeductions: 0,
        totalDeductions: 0,
        net: 0,
      }
    );
    return {
      count: satangSum.count,
      baseSalary: fromSatang(satangSum.baseSalary),
      repairCommission: fromSatang(satangSum.repairCommission),
      salesCommission: fromSatang(satangSum.salesCommission),
      allowance: fromSatang(satangSum.allowance),
      bonus: fromSatang(satangSum.bonus),
      overtimePay: fromSatang(satangSum.overtimePay),
      gross: fromSatang(satangSum.gross),
      sso: fromSatang(satangSum.sso),
      employerSso: fromSatang(satangSum.employerSso),
      tax: fromSatang(satangSum.tax),
      late: fromSatang(satangSum.late),
      unpaid: fromSatang(satangSum.unpaid),
      otherDeductions: fromSatang(satangSum.otherDeductions),
      totalDeductions: fromSatang(satangSum.totalDeductions),
      net: fromSatang(satangSum.net),
    };
  }, [filteredPayroll]);

  const handleGenerate = async () => {
    setGenerating(true);
    setActionError(null);
    setNotice(null);
    try {
      const json = await fetchJson<{ data: { created: number; updated: number; skipped: number } }>("/api/payroll", {
        method: "POST",
        body: JSON.stringify({
          month: selectedMonth,
          syncAttendance: syncAttendanceOption,
        }),
      });
      setNotice(
        `สร้างสลิปใหม่ ${json.data.created} รายการ (ปรับปรุง ${json.data.updated}, ข้าม ${json.data.skipped}) ${
          syncAttendanceOption ? "พร้อมดึงข้อมูล OT และการลาจากระบบบันทึกเวลา" : ""
        }`
      );
      await loadPayroll();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "สร้างเงินเดือนไม่สำเร็จ");
    } finally {
      setGenerating(false);
    }
  };

  const runAction = async (slip: PayrollSlip, action: "APPROVE" | "REOPEN" | "PAY") => {
    if (
      action === "PAY" &&
      !confirm(
        `ยืนยันบันทึกการจ่ายเงินเดือน ${slip.user?.name ?? ""} จำนวน ${formatTHB(
          slip.netPayout
        )}? หลังจ่ายแล้วจะแก้ไขไม่ได้`
      )
    )
      return;
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
    setEditValues(
      Object.fromEntries(MONEY_FIELDS.map((f) => [f, String(slip[f] ?? 0)])) as Record<MoneyField, string>
    );
    setFormError(null);
  };

  // Live preview with Satang Precision and Thai SSF (capped at 750 THB)
  const editPreview = useMemo(() => {
    if (!editSlip || !policy) return null;
    const v = (f: MoneyField) => Number(editValues[f]) || 0;
    const base = v("baseSalary");
    const ot15 = v("ot15Hours");
    const ot20 = v("ot20Hours");
    const ot30 = v("ot30Hours");

    // Auto-calculate OT if hours given and overtimePay is 0 or user wants calculation
    let otPay = v("overtimePay");
    if ((ot15 > 0 || ot20 > 0 || ot30 > 0) && otPay === 0 && base > 0) {
      const hourlyBaseSatang = (base / 30 / 8) * 100;
      otPay = fromSatang(
        Math.round(ot15 * 1.5 * hourlyBaseSatang) +
          Math.round(ot20 * 2.0 * hourlyBaseSatang) +
          Math.round(ot30 * 3.0 * hourlyBaseSatang)
      );
    }

    const grossSatang =
      toSatang(base) +
      toSatang(v("repairCommission")) +
      toSatang(v("salesCommission")) +
      toSatang(v("allowance")) +
      toSatang(v("bonus")) +
      toSatang(otPay);
    const gross = fromSatang(grossSatang);

    // SSF 5% capped at 750 THB
    const ssoBase = Math.min(Math.max(gross, policy.ssoWageMin), policy.ssoWageMax);
    const ssoBaht = gross <= 0 ? 0 : Math.min(Math.round(ssoBase * policy.ssoRate), policy.ssoMax);
    const ssoSatang = toSatang(ssoBaht);

    const deductionsSatang =
      ssoSatang +
      toSatang(v("taxDeduction")) +
      toSatang(v("lateDeduction")) +
      toSatang(v("unpaidDeduction")) +
      toSatang(v("otherDeductions"));
    const totalDeductions = fromSatang(deductionsSatang);

    const netSatang = grossSatang - deductionsSatang;
    const net = fromSatang(netSatang);

    return { gross, sso: ssoBaht, totalDeductions, net, calculatedOtPay: otPay };
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
      // If user left overtimePay 0 but filled OT hours, apply calculated OT pay
      if (Number(editValues.overtimePay) === 0 && editPreview?.calculatedOtPay) {
        body.overtimePay = editPreview.calculatedOtPay;
      }
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
    const headers = [
      "ลำดับ,ชื่อพนักงาน,ตำแหน่ง,สาขา,ฐานเงินเดือน,คอมซ่อม,คอมขาย,เบี้ยขยัน,โบนัส,OT1.5x(ชม),OT2.0x(ชม),OT3.0x(ชม),ค่าOT,รายได้รวม,ประกันสังคม,ภาษีWHT,หักสาย,หักขาด,หักอื่นๆ,รวมรายการหัก,เงินได้สุทธิ,สถานะ,วันที่จ่าย",
    ];
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
        (p.bonus ?? 0).toFixed(2),
        (p.ot15Hours ?? 0).toFixed(1),
        (p.ot20Hours ?? 0).toFixed(1),
        (p.ot30Hours ?? 0).toFixed(1),
        p.overtimePay.toFixed(2),
        p.gross.toFixed(2),
        p.ssoDeduction.toFixed(2),
        p.taxDeduction.toFixed(2),
        (p.lateDeduction ?? 0).toFixed(2),
        (p.unpaidDeduction ?? 0).toFixed(2),
        p.otherDeductions.toFixed(2),
        p.totalDeductions.toFixed(2),
        p.netPayout.toFixed(2),
        p.status,
        p.paidDate ?? "",
      ].join(",")
    );
    const csvContent = "\uFEFF" + [headers, ...rows].join("\n");
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
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              เงินเดือน & ค่าคอมมิชชั่น (Payroll & Commission)
            </h1>
            <p className="text-xs text-slate-500">
              คำนวณฐานเงินเดือน ค่าคอมงานซ่อม/ขาย OT (1.5x, 2x, 3x) ประกันสังคม (SSF 5% สูงสุด 750 บ.) ภาษีหัก ณ ที่จ่าย
              และพิมพ์สลิป A4 / สลิปความร้อน 80mm
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => void loadPayroll()}
            disabled={loading}
            className="gap-2 text-xs h-9 border-slate-300 hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            รีเฟรช
          </Button>
          <Button
            variant="outline"
            onClick={exportCSV}
            disabled={loading || filteredPayroll.length === 0}
            className="gap-2 text-xs h-9 border-slate-300 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            ส่งออก CSV
          </Button>
          <div className="flex items-center gap-1.5 bg-blue-50/70 border border-blue-200 px-2 py-1 rounded-lg">
            <input
              type="checkbox"
              id="syncAtt"
              checked={syncAttendanceOption}
              onChange={(e) => setSyncAttendanceOption(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 h-3.5 w-3.5 cursor-pointer"
            />
            <label htmlFor="syncAtt" className="text-[11px] text-blue-800 font-medium cursor-pointer flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-blue-600" /> ดึง OT & วันลาจากระบบ
            </label>
          </div>
          <Button
            onClick={() => void handleGenerate()}
            disabled={generating || loading}
            className="gap-2 text-xs h-9 bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
          >
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
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-center justify-between">
          <div>
            พนักงานที่ยังไม่มีสลิปงวดนี้ {usersWithoutSlip.length} คน:{" "}
            <span className="font-semibold">{usersWithoutSlip.slice(0, 5).map((u) => u.name).join(", ")}</span>
            {usersWithoutSlip.length > 5 ? " ..." : ""}
          </div>
          <Button size="sm" onClick={() => void handleGenerate()} className="h-7 text-xs bg-amber-600 text-white hover:bg-amber-700">
            กดสร้างสลิปให้ทันที
          </Button>
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
              <span>คอมมิชชั่น & OT</span>
              <Percent className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-800 tabular-nums">
              {formatTHB(summary.repairCommission + summary.salesCommission + summary.overtimePay)}
            </div>
            <p className="text-[11px] text-emerald-600 mt-0.5">
              ซ่อม: {formatTHB(summary.repairCommission)} | ขาย: {formatTHB(summary.salesCommission)} | OT: {formatTHB(summary.overtimePay)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/40 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-amber-700 mb-1">
              <span>ประกันสังคม (ลูกจ้าง 5%)</span>
              <ShieldCheck className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-amber-800 tabular-nums">{formatTHB(summary.sso)}</div>
            <p className="text-[11px] text-amber-600 mt-0.5">
              นายจ้างสมทบ {formatTHB(summary.employerSso)} · รวมส่ง {formatTHB(summary.sso + summary.employerSso)} (สูงสุด 750 บ./คน)
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-white shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>หักภาษี WHT & อื่นๆ</span>
              <FileText className="h-4 w-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">
              {formatTHB(summary.tax + summary.late + summary.unpaid + summary.otherDeductions)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              WHT: {formatTHB(summary.tax)} | สาย/ขาด: {formatTHB(summary.late + summary.unpaid)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-xs text-slate-700">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-medium">งวดเดือน:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
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
                  roleFilter === r
                    ? "bg-white text-slate-900 shadow-2xs border border-slate-200/80 font-semibold"
                    : "text-slate-500 hover:text-slate-900"
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
                <TableHead className="text-xs font-semibold text-slate-600 text-right">เบี้ยขยัน/โบนัส</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-right">OT (ค่าล่วงเวลา)</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-right">รวมหัก (ปกส./ภาษี/สาย)</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-right">เงินได้สุทธิ</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">สถานะ</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">การกระทำ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-40 text-center">
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลดข้อมูล...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredPayroll.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-40 text-center text-sm text-slate-500">
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
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 font-semibold text-xs text-slate-700 border border-slate-200">
                            {name.slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-semibold text-xs text-slate-900">{name}</div>
                            <div className="text-[11px] text-slate-400">
                              {emp.user?.role ?? "-"} • {emp.branch?.code ?? "-"}
                              {emp.user && !emp.user.isActive ? " • ปิดใช้งาน" : ""}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 text-right font-mono text-xs text-slate-800">
                        {formatTHB(emp.baseSalary)}
                      </TableCell>
                      <TableCell className="py-3 text-right font-mono text-xs text-emerald-700 font-medium">
                        {emp.repairCommission > 0 ? `+${formatTHB(emp.repairCommission)}` : "-"}
                      </TableCell>
                      <TableCell className="py-3 text-right font-mono text-xs text-blue-700 font-medium">
                        {emp.salesCommission > 0 ? `+${formatTHB(emp.salesCommission)}` : "-"}
                      </TableCell>
                      <TableCell className="py-3 text-right font-mono text-xs text-slate-600">
                        +{formatTHB(emp.allowance + (emp.bonus || 0))}
                      </TableCell>
                      <TableCell className="py-3 text-right font-mono text-xs text-purple-700 font-medium">
                        {emp.overtimePay > 0 ? `+${formatTHB(emp.overtimePay)}` : "-"}
                      </TableCell>
                      <TableCell className="py-3 text-right font-mono text-xs text-rose-600">
                        -{formatTHB(emp.totalDeductions)}
                      </TableCell>
                      <TableCell className="py-3 text-right font-mono text-xs font-bold text-slate-900">
                        {formatTHB(emp.netPayout)}
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        {emp.status === "PAID" && (
                          <Badge variant="success" className="text-[10px]">
                            จ่ายแล้ว {emp.paidDate ?? ""}
                          </Badge>
                        )}
                        {emp.status === "APPROVED" && (
                          <Badge variant="default" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                            อนุมัติแล้ว
                          </Badge>
                        )}
                        {emp.status === "PENDING" && <Badge variant="warning" className="text-[10px]">รอตรวจสอบ</Badge>}
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setActiveSlip(emp);
                              setSlipModalOpen(true);
                            }}
                            className="h-7 text-[11px] px-2 gap-1 border-slate-300"
                          >
                            <FileText className="h-3 w-3" />
                            สลิป
                          </Button>
                          {emp.status === "PENDING" && !own && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={busy}
                                onClick={() => openEdit(emp)}
                                className="h-7 text-[11px] px-2 gap-1 border-slate-300"
                              >
                                <Pencil className="h-3 w-3" />
                                แก้ไข
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled={busy}
                                onClick={() => void runAction(emp, "APPROVE")}
                                className="h-7 text-[11px] px-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                              >
                                {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "อนุมัติ"}
                              </Button>
                            </>
                          )}
                          {emp.status === "APPROVED" && !own && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={busy}
                              onClick={() => void runAction(emp, "REOPEN")}
                              className="h-7 text-[11px] px-2 border-slate-300"
                            >
                              ย้อนกลับ
                            </Button>
                          )}
                          {emp.status === "APPROVED" && isAdmin && (
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={busy}
                              onClick={() => void runAction(emp, "PAY")}
                              className="h-7 text-[11px] px-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                            >
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

      {/* Edit draft slip Dialog */}
      <Dialog open={editSlip !== null} onOpenChange={(o) => !o && !saving && setEditSlip(null)} preventClose={saving} maxWidth="max-w-2xl">
        <DialogHeader>
          <DialogTitle onClose={() => !saving && setEditSlip(null)}>
            แก้ไขรายละเอียดเงินเดือน {editSlip?.user?.name ?? ""} งวด {editSlip?.month ?? ""}
          </DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-4">
          {formError && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Earnings Column */}
            <div className="space-y-2.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="text-xs font-bold text-slate-800 pb-1 border-b border-slate-200 flex items-center justify-between">
                <span>รายการได้ (Earnings)</span>
                <span className="text-[10px] text-emerald-700">บวก (+)</span>
              </div>
              {(["baseSalary", "repairCommission", "salesCommission", "allowance", "bonus"] as MoneyField[]).map((f) => (
                <div key={f}>
                  <label className="text-[11px] font-semibold text-slate-700 mb-0.5 block">{FIELD_LABELS[f]}</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editValues[f] ?? ""}
                    onChange={(e) => setEditValues((prev) => ({ ...prev, [f]: e.target.value }))}
                    className="text-xs h-8 font-mono bg-white"
                  />
                </div>
              ))}
              <div className="pt-2 border-t border-slate-200 space-y-1">
                <label className="text-[11px] font-semibold text-purple-800 block">ชั่วโมง OT (1.5x / 2.0x / 3.0x)</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <div>
                    <span className="text-[9px] text-slate-500">1.5x (ปกติ)</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={editValues.ot15Hours ?? ""}
                      placeholder="ชม."
                      onChange={(e) => setEditValues((prev) => ({ ...prev, ot15Hours: e.target.value }))}
                      className="text-xs h-7 font-mono bg-white"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500">2.0x (วันหยุด)</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={editValues.ot20Hours ?? ""}
                      placeholder="ชม."
                      onChange={(e) => setEditValues((prev) => ({ ...prev, ot20Hours: e.target.value }))}
                      className="text-xs h-7 font-mono bg-white"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500">3.0x (OTหยุด)</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={editValues.ot30Hours ?? ""}
                      placeholder="ชม."
                      onChange={(e) => setEditValues((prev) => ({ ...prev, ot30Hours: e.target.value }))}
                      className="text-xs h-7 font-mono bg-white"
                    />
                  </div>
                </div>
                <div className="mt-1">
                  <span className="text-[10px] text-slate-600 block">ค่าล่วงเวลาสรุป (คำนวณอัตโนมัติหากใส่ 0):</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editValues.overtimePay ?? ""}
                    placeholder={editPreview?.calculatedOtPay ? `${editPreview.calculatedOtPay} (คำนวณ)` : "0.00"}
                    onChange={(e) => setEditValues((prev) => ({ ...prev, overtimePay: e.target.value }))}
                    className="text-xs h-8 font-mono bg-white text-purple-700 font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Deductions Column */}
            <div className="space-y-2.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="text-xs font-bold text-slate-800 pb-1 border-b border-slate-200 flex items-center justify-between">
                <span>รายการหัก (Deductions)</span>
                <span className="text-[10px] text-rose-700">ลบ (-)</span>
              </div>
              <div className="rounded border border-amber-200 bg-amber-50/50 p-2 text-xs">
                <div className="flex justify-between text-amber-900 font-semibold">
                  <span>ประกันสังคม (SSF 5%)</span>
                  <span className="font-mono text-rose-700">-{money(editPreview?.sso ?? 0)} บาท</span>
                </div>
                <p className="text-[10px] text-amber-700 mt-0.5">คำนวณอัตโนมัติฐาน 1,650 - 15,000 บ. (สูงสุด 750 บ./เดือน)</p>
              </div>
              {(["taxDeduction", "lateDeduction", "unpaidDeduction", "otherDeductions"] as MoneyField[]).map((f) => (
                <div key={f}>
                  <label className="text-[11px] font-semibold text-slate-700 mb-0.5 block">{FIELD_LABELS[f]}</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editValues[f] ?? ""}
                    onChange={(e) => setEditValues((prev) => ({ ...prev, [f]: e.target.value }))}
                    className="text-xs h-8 font-mono bg-white text-rose-700"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Live Preview Bar */}
          {editPreview && (
            <div className="rounded-lg bg-slate-900 text-white p-3 text-xs space-y-1.5 shadow-2xs">
              <div className="flex justify-between text-slate-300">
                <span>รายได้รวม (Gross)</span>
                <span className="font-mono">{money(editPreview.gross)} บาท</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>รวมรายการหัก (Total Deductions)</span>
                <span className="font-mono text-rose-400">-{money(editPreview.totalDeductions)} บาท</span>
              </div>
              <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-800">
                <span>เงินได้สุทธิ (Net Payout)</span>
                <span className="font-mono text-emerald-400 text-base">{money(editPreview.net)} บาท</span>
              </div>
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditSlip(null)} disabled={saving} className="text-xs">
            ยกเลิก
          </Button>
          <Button
            onClick={() => void handleSaveEdit()}
            disabled={saving}
            className="text-xs bg-blue-600 text-white hover:bg-blue-700 gap-1.5"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {saving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Pay Slip Modal (Dual mode: A4 & Thermal 80mm) */}
      <Dialog open={slipModalOpen} onOpenChange={setSlipModalOpen} maxWidth={printFormat === "A4" ? "max-w-4xl" : "max-w-md"}>
        <DialogHeader>
          <div className="flex items-center justify-between w-full pr-6">
            <DialogTitle onClose={() => setSlipModalOpen(false)}>
              ใบแจ้งเงินเดือน / Pay Slip ({activeSlip?.month})
            </DialogTitle>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs print:hidden">
              <button
                onClick={() => setPrintFormat("A4")}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  printFormat === "A4" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                ขนาด A4 มาตรฐาน
              </button>
              <button
                onClick={() => setPrintFormat("THERMAL")}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  printFormat === "THERMAL" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                สลิปความร้อน 80mm
              </button>
            </div>
          </div>
        </DialogHeader>
        <DialogContent className="p-0 max-h-[80vh] overflow-y-auto">
          {activeSlip && printFormat === "A4" && (
            <div id="payslip-a4" className="bg-white p-6 rounded-xl text-slate-900 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                <div>
                  <div className="text-lg font-black tracking-tight text-slate-900">{activeSlip.branch?.name ?? "FIXME SERVICE"}</div>
                  <div className="text-xs text-slate-600">สาขา {activeSlip.branch?.code ?? "-"} · เอกสารทางการ</div>
                </div>
                <div className="text-right">
                  <div className="text-base font-extrabold text-slate-900">ใบแจ้งเงินเดือน / PAY SLIP</div>
                  <div className="text-xs text-slate-600 font-mono mt-0.5">งวดประจำเดือน: {activeSlip.month}</div>
                  <div className="text-[11px] text-slate-500">
                    {activeSlip.status === "PAID" ? `วันที่จ่าย: ${activeSlip.paidDate ?? "-"}` : "สถานะ: รอจ่าย (ฉบับร่าง)"}
                  </div>
                </div>
              </div>

              {/* Employee info */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
                <div className="space-y-1">
                  <div>
                    <span className="text-slate-500">รหัสพนักงาน:</span>{" "}
                    <span className="font-mono font-medium">{activeSlip.userId.slice(-8).toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">ชื่อ-นามสกุล:</span>{" "}
                    <span className="font-bold text-slate-900">{activeSlip.user?.name ?? "-"}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div>
                    <span className="text-slate-500">ตำแหน่งงาน:</span>{" "}
                    <span className="font-medium text-slate-800">{activeSlip.user?.role ?? "-"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">สังกัดสาขา:</span>{" "}
                    <span className="font-medium text-slate-800">{activeSlip.branch?.name ?? "-"}</span>
                  </div>
                </div>
              </div>

              {/* Earnings & Deductions Tables */}
              <div className="grid grid-cols-2 gap-4 border border-slate-200 rounded-lg overflow-hidden">
                {/* Earnings */}
                <div className="border-r border-slate-200">
                  <div className="bg-slate-100 px-3 py-2 text-xs font-bold text-slate-800 border-b border-slate-200 flex justify-between">
                    <span>รายการได้ (Earnings)</span>
                    <span>จำนวนเงิน (บาท)</span>
                  </div>
                  <div className="p-3 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-600">เงินเดือนพื้นฐาน</span>
                      <span className="font-mono">{money(activeSlip.baseSalary)}</span>
                    </div>
                    {activeSlip.repairCommission > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">ค่าคอมมิชชั่นงานซ่อม</span>
                        <span className="font-mono text-emerald-700">{money(activeSlip.repairCommission)}</span>
                      </div>
                    )}
                    {activeSlip.salesCommission > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">ค่าคอมมิชชั่นยอดขาย</span>
                        <span className="font-mono text-blue-700">{money(activeSlip.salesCommission)}</span>
                      </div>
                    )}
                    {activeSlip.allowance > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">เบี้ยขยัน / เบี้ยเลี้ยง</span>
                        <span className="font-mono">{money(activeSlip.allowance)}</span>
                      </div>
                    )}
                    {activeSlip.bonus > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">เงินโบนัส / เงินพิเศษ</span>
                        <span className="font-mono">{money(activeSlip.bonus)}</span>
                      </div>
                    )}
                    {activeSlip.overtimePay > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">
                          ค่าล่วงเวลา (OT
                          {activeSlip.ot15Hours ? ` 1.5x:${activeSlip.ot15Hours}ชม.` : ""}
                          {activeSlip.ot20Hours ? ` 2.0x:${activeSlip.ot20Hours}ชม.` : ""}
                          {activeSlip.ot30Hours ? ` 3.0x:${activeSlip.ot30Hours}ชม.` : ""})
                        </span>
                        <span className="font-mono text-purple-700">{money(activeSlip.overtimePay)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold text-slate-900">
                      <span>รวมรายได้ทั้งสิ้น</span>
                      <span className="font-mono">{money(activeSlip.gross)}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div>
                  <div className="bg-slate-100 px-3 py-2 text-xs font-bold text-slate-800 border-b border-slate-200 flex justify-between">
                    <span>รายการหัก (Deductions)</span>
                    <span>จำนวนเงิน (บาท)</span>
                  </div>
                  <div className="p-3 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-600">ประกันสังคม (SSF 5% สูงสุด 750 บ.)</span>
                      <span className="font-mono text-rose-600">{money(activeSlip.ssoDeduction)}</span>
                    </div>
                    {activeSlip.taxDeduction > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">ภาษีหัก ณ ที่จ่าย (WHT)</span>
                        <span className="font-mono text-rose-600">{money(activeSlip.taxDeduction)}</span>
                      </div>
                    )}
                    {activeSlip.lateDeduction > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">หักมาสาย</span>
                        <span className="font-mono text-rose-600">{money(activeSlip.lateDeduction)}</span>
                      </div>
                    )}
                    {activeSlip.unpaidDeduction > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">หักขาดงาน / ลาไม่รับค่าจ้าง</span>
                        <span className="font-mono text-rose-600">{money(activeSlip.unpaidDeduction)}</span>
                      </div>
                    )}
                    {activeSlip.otherDeductions > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">หักอื่นๆ (เบิกล่วงหน้า/ความเสียหาย)</span>
                        <span className="font-mono text-rose-600">{money(activeSlip.otherDeductions)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold text-slate-900">
                      <span>รวมรายการหักทั้งสิ้น</span>
                      <span className="font-mono text-rose-700">{money(activeSlip.totalDeductions)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Payout Banner */}
              <div className="bg-slate-900 text-white p-4 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-300 font-medium">เงินได้สุทธิ (Net Payable Amount)</div>
                  <div className="text-xs text-emerald-300 mt-0.5">({bahtText(activeSlip.netPayout)})</div>
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-400">{formatTHB(activeSlip.netPayout)}</div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 text-center text-xs text-slate-600 pt-6 border-t border-slate-200">
                <div>
                  <div className="h-10 border-b border-dashed border-slate-300 w-3/4 mx-auto mb-1"></div>
                  <p className="font-semibold text-slate-800">ผู้มีอำนาจสั่งจ่าย</p>
                  <p className="text-[10px] text-slate-400">วันที่: ..... / ..... / .........</p>
                </div>
                <div>
                  <div className="h-10 border-b border-dashed border-slate-300 w-3/4 mx-auto mb-1"></div>
                  <p className="font-semibold text-slate-800">({activeSlip.user?.name ?? ""}) พนักงานผู้รับเงิน</p>
                  <p className="text-[10px] text-slate-400">วันที่: ..... / ..... / .........</p>
                </div>
              </div>

              {/* Print CTA */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 print:hidden">
                <Button size="sm" onClick={() => window.print()} className="bg-blue-600 text-white hover:bg-blue-700 gap-1.5 text-xs">
                  <Printer className="h-3.5 w-3.5" />
                  สั่งพิมพ์เอกสาร A4
                </Button>
              </div>
            </div>
          )}

          {/* 80mm Thermal Slip View */}
          {activeSlip && printFormat === "THERMAL" && (
            <div id="payslip-thermal" className="p-4 bg-slate-50 flex flex-col items-center">
              <div className="w-[300px] bg-white p-4 border border-slate-300 shadow-md font-mono text-xs text-slate-900 space-y-2">
                <div className="text-center space-y-0.5">
                  <p className="font-bold text-sm">================================</p>
                  <p className="font-black text-sm uppercase">{activeSlip.branch?.name ?? "FIXME SERVICE"}</p>
                  <p className="text-[11px]">สาขา {activeSlip.branch?.code ?? "HQ"}</p>
                  <p className="font-bold text-sm">================================</p>
                  <p className="font-extrabold text-xs">ใบแจ้งเงินเดือน / PAY SLIP</p>
                  <p className="text-[11px]">งวดเดือน: {activeSlip.month}</p>
                  <p className="text-[10px] text-slate-500">พิมพ์: {new Date().toLocaleString("th-TH")}</p>
                </div>

                <div className="border-t border-dashed border-slate-400 pt-1.5 space-y-0.5 text-[11px]">
                  <div>พนักงาน: {activeSlip.user?.name ?? "-"}</div>
                  <div>ตำแหน่ง: {activeSlip.user?.role ?? "-"}</div>
                  <div>รหัส: {activeSlip.userId.slice(-6).toUpperCase()}</div>
                </div>

                <div className="border-t border-dashed border-slate-400 pt-1.5 space-y-1">
                  <div className="font-bold text-[11px]">รายได้ (EARNINGS)</div>
                  <div className="flex justify-between">
                    <span>เงินเดือน</span>
                    <span>{money(activeSlip.baseSalary)}</span>
                  </div>
                  {activeSlip.repairCommission > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>คอมมิชชั่นซ่อม</span>
                      <span>+{money(activeSlip.repairCommission)}</span>
                    </div>
                  )}
                  {activeSlip.salesCommission > 0 && (
                    <div className="flex justify-between text-blue-700">
                      <span>คอมมิชชั่นขาย</span>
                      <span>+{money(activeSlip.salesCommission)}</span>
                    </div>
                  )}
                  {activeSlip.allowance > 0 && (
                    <div className="flex justify-between">
                      <span>เบี้ยขยัน</span>
                      <span>+{money(activeSlip.allowance)}</span>
                    </div>
                  )}
                  {activeSlip.bonus > 0 && (
                    <div className="flex justify-between">
                      <span>โบนัส</span>
                      <span>+{money(activeSlip.bonus)}</span>
                    </div>
                  )}
                  {activeSlip.overtimePay > 0 && (
                    <div className="flex justify-between text-purple-700">
                      <span>ค่าล่วงเวลา (OT)</span>
                      <span>+{money(activeSlip.overtimePay)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold border-t border-slate-200 pt-0.5">
                    <span>รวมรายได้</span>
                    <span>{money(activeSlip.gross)}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-400 pt-1.5 space-y-1">
                  <div className="font-bold text-[11px]">รายการหัก (DEDUCTIONS)</div>
                  <div className="flex justify-between text-rose-600">
                    <span>ประกันสังคม 5%</span>
                    <span>-{money(activeSlip.ssoDeduction)}</span>
                  </div>
                  {activeSlip.taxDeduction > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>ภาษีหัก WHT</span>
                      <span>-{money(activeSlip.taxDeduction)}</span>
                    </div>
                  )}
                  {activeSlip.lateDeduction > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>หักมาสาย</span>
                      <span>-{money(activeSlip.lateDeduction)}</span>
                    </div>
                  )}
                  {activeSlip.unpaidDeduction > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>หักขาด/ลาไม่รับจ้าง</span>
                      <span>-{money(activeSlip.unpaidDeduction)}</span>
                    </div>
                  )}
                  {activeSlip.otherDeductions > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>หักอื่นๆ</span>
                      <span>-{money(activeSlip.otherDeductions)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold border-t border-slate-200 pt-0.5 text-rose-700">
                    <span>รวมหัก</span>
                    <span>-{money(activeSlip.totalDeductions)}</span>
                  </div>
                </div>

                <div className="border-t-2 border-slate-900 pt-2 text-center space-y-0.5">
                  <div className="text-[11px] font-bold">เงินได้สุทธิ (NET PAY)</div>
                  <div className="text-lg font-black">{formatTHB(activeSlip.netPayout)}</div>
                  <div className="text-[10px] text-slate-600">({bahtText(activeSlip.netPayout)})</div>
                </div>

                <div className="border-t border-dashed border-slate-400 pt-3 text-center space-y-3">
                  <div className="text-[10px] text-slate-500">สถานะ: {activeSlip.status}</div>
                  <div className="pt-4 border-b border-dashed border-slate-400 w-4/5 mx-auto"></div>
                  <p className="text-[10px]">ลายมือชื่อผู้รับเงิน</p>
                  <p className="text-[9px] text-slate-400">================================</p>
                </div>
              </div>

              <div className="mt-4 flex gap-2 print:hidden">
                <Button size="sm" onClick={() => window.print()} className="bg-slate-900 text-white hover:bg-slate-800 gap-1.5 text-xs">
                  <Printer className="h-3.5 w-3.5" />
                  พิมพ์สลิป 80mm
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
