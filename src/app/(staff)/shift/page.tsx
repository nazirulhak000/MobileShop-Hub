"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { ArrowDownCircle, ArrowUpCircle, Printer, Lock, Unlock, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { formatTHB } from "@/lib/utils";

interface CashMovement {
  id: string;
  time: string;
  type: "CASH_IN" | "CASH_OUT";
  amount: number;
  reason: string;
  createdBy?: string;
}

interface SummaryData {
  byPaymentMethod: Array<{ paymentMethod: string; count: number; netAmount: number }>;
  cashSales: number;
  cashRefundsOfEarlierSales: number;
}

// Notes and coins with their face value (THB).
const DENOMINATIONS = [
  { key: "b1000", label: "ธนบัตร 1,000 บาท", value: 1000 },
  { key: "b500", label: "ธนบัตร 500 บาท", value: 500 },
  { key: "b100", label: "ธนบัตร 100 บาท", value: 100 },
  { key: "b50", label: "ธนบัตร 50 บาท", value: 50 },
  { key: "b20", label: "ธนบัตร 20 บาท", value: 20 },
  { key: "c10", label: "เหรียญ 10 บาท", value: 10 },
  { key: "c5", label: "เหรียญ 5 บาท", value: 5 },
  { key: "c2", label: "เหรียญ 2 บาท", value: 2 },
  { key: "c1", label: "เหรียญ 1 บาท", value: 1 },
  { key: "c050", label: "เหรียญ 50 สตางค์", value: 0.5 },
  { key: "c025", label: "เหรียญ 25 สตางค์", value: 0.25 },
] as const;
type DenomKey = (typeof DENOMINATIONS)[number]["key"];

const round2 = (n: number) => Math.round(n * 100) / 100;
const bangkokToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
const bangkokTime = () =>
  new Date().toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" }) + " น.";

export default function ShiftManagementPage() {
  const { currentBranch, currentUser } = useApp();

  const [shiftId, setShiftId] = useState<string>(() => `SHIFT-${Date.now()}`);
  const [isShiftOpen, setIsShiftOpen] = useState(true);
  const [openingTime, setOpeningTime] = useState(() => bangkokTime());
  const [openingFloat, setOpeningFloat] = useState(0);

  // Today's POS sales from the database
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Cash In / Out during shift
  const [movements, setMovements] = useState<CashMovement[]>([]);

  // Cash count per denomination
  const [counts, setCounts] = useState<Record<DenomKey, number>>(
    () => Object.fromEntries(DENOMINATIONS.map((d) => [d.key, 0])) as Record<DenomKey, number>
  );

  // Modals
  const [cashActionModalOpen, setCashActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<"CASH_IN" | "CASH_OUT">("CASH_OUT");
  const [actionAmount, setActionAmount] = useState("");
  const [actionReason, setActionReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [savingAction, setSavingAction] = useState(false);

  const [openShiftModalOpen, setOpenShiftModalOpen] = useState(false);
  const [newFloatInput, setNewFloatInput] = useState("0");

  const [closeShiftModalOpen, setCloseShiftModalOpen] = useState(false);
  const [closeNote, setCloseNote] = useState("");
  const [shiftReportModalOpen, setShiftReportModalOpen] = useState(false);
  const [slipWidth, setSlipWidth] = useState<"80mm" | "58mm">("80mm");
  const [closedAt, setClosedAt] = useState("");
  const [closedBy, setClosedBy] = useState("");

  // Load active shift from API
  const loadShift = useCallback(async () => {
    if (!currentBranch.code) return;
    try {
      const params = new URLSearchParams({ branch: currentBranch.code, day: bangkokToday() });
      const res = await fetch(`/api/shifts?${params.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json?.data?.shift) {
        const s = json.data.shift;
        setShiftId(s.shiftId);
        setIsShiftOpen(s.isOpen);
        setOpeningFloat(s.openingFloat ?? 0);
        setOpeningTime(new Date(s.openedAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น.");
        setMovements(s.movements ?? []);
        if (!s.isOpen && s.closedAt) {
          setClosedAt(new Date(s.closedAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น.");
          setClosedBy(s.closedBy ?? "");
          if (s.denominations) {
            setCounts((prev) => ({ ...prev, ...s.denominations }));
          }
        }
      }
    } catch {
      // Keep default open shift state if fetch fails
    }
  }, [currentBranch.code]);

  const loadSummary = useCallback(async () => {
    if (!currentBranch.code) return;
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({ day: bangkokToday(), branch: currentBranch.code });
      const res = await fetch(`/api/sales/summary?${params.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.error || "โหลดยอดขายวันนี้ไม่สำเร็จ");
      setSummary(json.data as SummaryData);
    } catch (err: any) {
      setSummary(null);
      setLoadError(err?.message || "โหลดยอดขายวันนี้ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [currentBranch.code]);

  useEffect(() => {
    loadSummary();
    loadShift();
  }, [loadSummary, loadShift]);

  const methodTotal = (m: string) => summary?.byPaymentMethod.find((r) => r.paymentMethod === m)?.netAmount ?? 0;
  const posCashSales = summary?.cashSales ?? 0;
  const posPromptPaySales = methodTotal("PROMPTPAY");
  const posCardSales = methodTotal("CARD");
  const posSplitSales = methodTotal("SPLIT");
  const cashRefunds = summary?.cashRefundsOfEarlierSales ?? 0;

  const totalCashIn = useMemo(() => movements.filter((m) => m.type === "CASH_IN").reduce((sum, m) => sum + m.amount, 0), [movements]);
  const totalCashOut = useMemo(() => movements.filter((m) => m.type === "CASH_OUT").reduce((sum, m) => sum + m.amount, 0), [movements]);

  // Expected cash in drawer: float + cashSales - cashRefunds + cashIn - cashOut
  const expectedCashInDrawer = round2(openingFloat + posCashSales - cashRefunds + totalCashIn - totalCashOut);

  // Actual counted cash: count x face value of each denomination
  const countedCash = useMemo(() => round2(DENOMINATIONS.reduce((sum, d) => sum + counts[d.key] * d.value, 0)), [counts]);

  const discrepancy = round2(countedCash - expectedCashInDrawer);
  const discrepancyText =
    discrepancy === 0 ? "พอดี (0.00)" : discrepancy > 0 ? `เงินเกิน +${formatTHB(discrepancy)}` : `เงินขาด ${formatTHB(discrepancy)}`;

  const handleOpenShift = async () => {
    const floatNum = Math.max(0, parseFloat(newFloatInput) || 0);
    try {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "OPEN",
          branchCode: currentBranch.code,
          openingFloat: floatNum,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.error || "เปิดกะไม่สำเร็จ");

      setShiftId(json.data.shiftId);
      setIsShiftOpen(true);
      setOpeningFloat(floatNum);
      setOpeningTime(bangkokTime());
      setMovements([]);
      setCounts(Object.fromEntries(DENOMINATIONS.map((d) => [d.key, 0])) as Record<DenomKey, number>);
      setClosedAt("");
      setOpenShiftModalOpen(false);
      setNotice("เปิดกะทำงานเรียบร้อย บันทึกเงินทอนตั้งต้นลงระบบแล้ว");
      await loadSummary();
    } catch (err: any) {
      alert(err?.message || "เปิดกะไม่สำเร็จ");
    }
  };

  const handleAddMovement = async () => {
    const amount = Number(actionAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setActionError("กรุณาระบุจำนวนเงินมากกว่า 0");
      return;
    }
    if (actionReason.trim().length < 3) {
      setActionError("กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร");
      return;
    }

    setSavingAction(true);
    setActionError(null);
    try {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "MOVEMENT",
          branchCode: currentBranch.code,
          shiftId,
          type: actionType,
          amount: round2(amount),
          reason: actionReason.trim(),
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.error || "บันทึกรายการไม่สำเร็จ");

      const item: CashMovement = {
        id: json.data?.id || `${Date.now()}`,
        time: json.data?.time || bangkokTime(),
        type: actionType,
        amount: round2(amount),
        reason: actionReason.trim(),
        createdBy: currentUser.name,
      };
      setMovements([...movements, item]);
      setCashActionModalOpen(false);
      setActionAmount("");
      setActionReason("");
      setNotice(`บันทึก${actionType === "CASH_IN" ? "เงินเข้า" : "เบิกเงินสด"} ${formatTHB(amount)} ลงระบบเรียบร้อย`);
    } catch (err: any) {
      setActionError(err?.message || "บันทึกรายการไม่สำเร็จ");
    } finally {
      setSavingAction(false);
    }
  };

  const handleConfirmCloseShift = async () => {
    try {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CLOSE",
          branchCode: currentBranch.code,
          shiftId,
          openingFloat,
          countedCash,
          expectedCash: expectedCashInDrawer,
          discrepancy,
          denominations: counts,
          note: closeNote.trim(),
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.error || "ปิดกะไม่สำเร็จ");

      setClosedAt(bangkokTime());
      setClosedBy(currentUser.name);
      setIsShiftOpen(false);
      setCloseShiftModalOpen(false);
      setShiftReportModalOpen(true);
      setNotice(`ปิดกะประจำวันเรียบร้อย บันทึกผลต่างตรวจนับ (${discrepancyText}) ลงระบบแล้ว`);
    } catch (err: any) {
      alert(err?.message || "ปิดกะไม่สำเร็จ");
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {notice && (
        <div role="status" className="flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {notice}
          </span>
          <button type="button" onClick={() => setNotice(null)} className="text-xs font-semibold hover:underline">
            ปิด
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <span>ระบบเปิด-ปิดกะแคชเชียร์ (Cash Drawer & Shift)</span>
              {isShiftOpen ? (
                <Badge variant="success" className="text-xs">
                  <Unlock className="h-3 w-3 mr-1 inline" />
                  กะกำลังเปิดอยู่
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs bg-slate-800 text-white">
                  <Lock className="h-3 w-3 mr-1 inline" />
                  ตรวจนับปิดกะแล้ว (Shift Locked)
                </Badge>
              )}
            </h1>
          </div>
          <p className="text-sm text-slate-500">
            นับเงินทอนตั้งต้น (Opening Float), จดเงินเข้า-ออกระหว่างกะ, และตรวจสอบผลต่างเงินสดเทียบยอดขายเงินสดจริง บันทึกลงระบบตรวจสอบได้
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { loadSummary(); loadShift(); }} disabled={loading} className="text-xs gap-1.5">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>รีเฟรช</span>
          </Button>

          {isShiftOpen ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActionType("CASH_OUT");
                  setActionError(null);
                  setCashActionModalOpen(true);
                }}
                className="text-xs gap-1.5"
              >
                <ArrowDownCircle className="h-4 w-4 text-rose-600" />
                <span>เบิกเงินสดย่อย (Cash Out)</span>
              </Button>

              <Button
                size="sm"
                onClick={() => setCloseShiftModalOpen(true)}
                disabled={loading || !!loadError}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs gap-1.5 shadow-sm font-bold"
              >
                <Lock className="h-4 w-4" />
                <span>นับเงิน & ปิดกะประจำวัน</span>
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShiftReportModalOpen(true)}
                className="text-xs gap-1.5"
              >
                <Printer className="h-4 w-4" />
                <span>พิมพ์ใบสรุปปิดกะ</span>
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  setNewFloatInput(String(openingFloat));
                  setOpenShiftModalOpen(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 font-bold shadow-sm"
              >
                <Unlock className="h-4 w-4" />
                <span>เปิดกะใหม่</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {loadError && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {loadError}{" "}
          <button type="button" onClick={loadSummary} className="font-semibold underline">
            ลองใหม่
          </button>
        </div>
      )}

      {/* 4 Stat Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 space-y-1">
          <span className="text-xs font-semibold text-slate-500">เงินทอนตั้งต้น (Opening Float)</span>
          <Input
            type="number"
            min="0"
            step="0.25"
            value={openingFloat}
            disabled={!isShiftOpen}
            onChange={(e) => setOpeningFloat(Math.max(0, Number(e.target.value) || 0))}
            className="h-9 text-xl font-bold font-mono text-slate-900"
            aria-label="เงินทอนตั้งต้น"
          />
          <div className="text-[11px] text-slate-400">เปิดกะเวลา {openingTime}</div>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-xs font-semibold text-emerald-700">ยอดขายเงินสดวันนี้ (Cash Sales)</span>
          <div className="text-2xl font-bold font-mono text-emerald-700">{loading ? "..." : formatTHB(posCashSales)}</div>
          <div className="text-[11px] text-slate-400">
            จากบิล POS ที่สมบูรณ์
            {cashRefunds > 0 && ` • คืนเงินสดบิลวันก่อน -${formatTHB(cashRefunds)}`}
          </div>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-xs font-semibold text-blue-700">ยอดขาย PromptPay & บัตร</span>
          <div className="text-2xl font-bold font-mono text-blue-700">{loading ? "..." : formatTHB(posPromptPaySales + posCardSales)}</div>
          <div className="text-[11px] text-slate-400">
            โอน: {formatTHB(posPromptPaySales)} | บัตร: {formatTHB(posCardSales)}
            {posSplitSales > 0 && ` | แยกชำระ: ${formatTHB(posSplitSales)}`}
          </div>
        </Card>

        <Card className="p-4 space-y-1 border-indigo-200 bg-indigo-50/40">
          <span className="text-xs font-semibold text-indigo-700">เงินสดที่ควรมีในลิ้นชัก (Expected)</span>
          <div className="text-2xl font-bold font-mono text-indigo-950">{formatTHB(expectedCashInDrawer)}</div>
          <div className="text-[11px] text-indigo-800">(เงินตั้งต้น + ขายสด - คืนเงินสด + เข้า - เบิกจ่าย)</div>
        </Card>
      </div>

      {/* Grid: Cash Movements & Cash Count Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Movements (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card>
            <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm">รายการเบิกจ่ายเงินสดระหว่างกะ (Cash In / Out)</CardTitle>
                <CardDescription>บันทึกเงินเข้า/ออกลิ้นชัก พร้อมบันทึกลงระบบอย่างปลอดภัย</CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={!isShiftOpen}
                onClick={() => {
                  setActionType("CASH_IN");
                  setActionError(null);
                  setCashActionModalOpen(true);
                }}
                className="text-xs gap-1"
              >
                <ArrowUpCircle className="h-3.5 w-3.5 text-emerald-600" />
                <span>+ เงินเข้า</span>
              </Button>
            </CardHeader>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="p-2.5 text-left">เวลา</th>
                    <th className="p-2.5 text-center">ประเภท</th>
                    <th className="p-2.5 text-left">เหตุผล / รายละเอียด</th>
                    <th className="p-2.5 text-right">จำนวนเงิน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {movements.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-4 text-center font-sans text-slate-400">
                        ยังไม่มีรายการเงินเข้า-ออกระหว่างกะ
                      </td>
                    </tr>
                  )}
                  {movements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="p-2.5 text-slate-500">{m.time}</td>
                      <td className="p-2.5 text-center font-sans">
                        {m.type === "CASH_IN" ? (
                          <span className="rounded bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">เงินเข้า</span>
                        ) : (
                          <span className="rounded bg-rose-100 text-rose-800 px-2 py-0.5 text-[10px] font-bold">เบิกออก</span>
                        )}
                      </td>
                      <td className="p-2.5 font-sans text-slate-800">{m.reason}</td>
                      <td className={`p-2.5 text-right font-bold ${m.type === "CASH_IN" ? "text-emerald-700" : "text-rose-600"}`}>
                        {m.type === "CASH_IN" ? "+" : "-"}
                        {formatTHB(m.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Closing Shift Cash Count (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <CardHeader className="p-4 border-b border-slate-100">
              <CardTitle className="text-sm">นับเงินในลิ้นชัก (Cash Count Calculator)</CardTitle>
              <CardDescription>ใส่จำนวนธนบัตร/เหรียญแต่ละชนิดเพื่อคำนวณยอดเงินจริง</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 text-xs">
              {DENOMINATIONS.map((row) => (
                <div key={row.key} className="flex items-center justify-between gap-3">
                  <span className="text-slate-600 w-36">{row.label}</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={counts[row.key]}
                      disabled={!isShiftOpen}
                      onChange={(e) => {
                        const n = Math.max(0, Math.floor(Number(e.target.value) || 0));
                        setCounts((prev) => ({ ...prev, [row.key]: n }));
                      }}
                      className="w-16 h-7 text-right font-mono text-xs"
                      aria-label={row.label}
                    />
                    <span className="text-slate-400 font-mono w-4">x</span>
                    <span className="w-24 text-right font-mono font-semibold">{formatTHB(round2(counts[row.key] * row.value))}</span>
                  </div>
                </div>
              ))}

              {/* Total Counted vs Expected */}
              <div className="pt-3 border-t border-slate-200 space-y-1.5 font-mono text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>ยอดนับได้จริง (Counted):</span>
                  <span className="font-bold text-slate-900">{formatTHB(countedCash)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>ยอดที่ควรมี (Expected):</span>
                  <span>{formatTHB(expectedCashInDrawer)}</span>
                </div>
                <div
                  className={`flex justify-between font-bold text-sm pt-1.5 border-t border-slate-200 ${
                    discrepancy === 0 ? "text-emerald-700" : discrepancy > 0 ? "text-blue-700" : "text-rose-600"
                  }`}
                >
                  <span>ผลต่าง (Discrepancy):</span>
                  <span>{discrepancyText}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* OPEN NEW SHIFT MODAL */}
      <Dialog open={openShiftModalOpen} onOpenChange={setOpenShiftModalOpen}>
        <DialogHeader>
          <DialogTitle onClose={() => setOpenShiftModalOpen(false)}>เปิดกะทำงานใหม่ (Open Shift)</DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">เงินทอนตั้งต้น (Opening Float) *</label>
            <Input
              type="number"
              min="0"
              step="0.25"
              value={newFloatInput}
              onChange={(e) => setNewFloatInput(e.target.value)}
              className="font-mono text-lg font-bold"
            />
          </div>
          <p className="text-xs text-slate-500">
            ระบบจะเริ่มรอบกะการขายใหม่ และบันทึกข้อมูลกะปัจจุบันเข้าสู่ระบบตรวจสอบ
          </p>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setOpenShiftModalOpen(false)}>
            ยกเลิก
          </Button>
          <Button size="sm" onClick={handleOpenShift} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
            ยืนยันเปิดกะ
          </Button>
        </DialogFooter>
      </Dialog>

      {/* CASH IN/OUT MODAL */}
      <Dialog open={cashActionModalOpen} onOpenChange={setCashActionModalOpen}>
        <DialogHeader>
          <DialogTitle onClose={() => setCashActionModalOpen(false)}>
            {actionType === "CASH_OUT" ? "เบิกเงินสดออกจากลิ้นชัก (Cash Out)" : "นำเงินสดเข้าลิ้นชัก (Cash In)"}
          </DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">จำนวนเงิน (บาท) *</label>
            <Input
              type="number"
              min="0"
              placeholder="0"
              value={actionAmount}
              onChange={(e) => setActionAmount(e.target.value)}
              className="font-mono text-base font-bold"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">เหตุผล / วัตถุประสงค์ *</label>
            <Input
              placeholder="เช่น ซื้ออุปกรณ์สำนักงาน, ค่าอาหารพนักงาน"
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              className="text-xs"
            />
          </div>
          {actionError && (
            <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {actionError}
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setCashActionModalOpen(false)}>
            ยกเลิก
          </Button>
          <Button size="sm" onClick={handleAddMovement} disabled={savingAction} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
            {savingAction ? "กำลังบันทึก..." : "เพิ่มรายการ"}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* CLOSE SHIFT CONFIRM MODAL */}
      <Dialog open={closeShiftModalOpen} onOpenChange={setCloseShiftModalOpen}>
        <DialogHeader>
          <DialogTitle onClose={() => setCloseShiftModalOpen(false)}>สรุปการตรวจนับปิดกะ</DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-3 text-xs">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 font-mono">
            <div className="flex justify-between">
              <span>ยอดขายเงินสด:</span>
              <span>{formatTHB(posCashSales)}</span>
            </div>
            <div className="flex justify-between">
              <span>เงินสดที่ควรมี:</span>
              <span>{formatTHB(expectedCashInDrawer)}</span>
            </div>
            <div className="flex justify-between">
              <span>เงินสดนับได้จริง:</span>
              <span className="font-bold">{formatTHB(countedCash)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-sm">
              <span>ผลต่างเงินสด:</span>
              <span className={discrepancy < 0 ? "text-rose-600" : "text-emerald-700"}>{discrepancyText}</span>
            </div>
          </div>
          <div>
            <label className="font-semibold text-slate-700 mb-1 block">หมายเหตุการปิดกะ (ถ้ามี)</label>
            <Input
              placeholder="เช่น เงินสดใส่ซองส่งมอบเรียบร้อย"
              value={closeNote}
              onChange={(e) => setCloseNote(e.target.value)}
              className="text-xs"
            />
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setCloseShiftModalOpen(false)}>
            ยกเลิก
          </Button>
          <Button size="sm" onClick={handleConfirmCloseShift} className="bg-rose-600 hover:bg-rose-700 text-white font-bold">
            ปิดกะ & ออกใบสรุป
          </Button>
        </DialogFooter>
      </Dialog>

      {/* SHIFT SUMMARY REPORT MODAL */}
      <Dialog open={shiftReportModalOpen} onOpenChange={setShiftReportModalOpen}>
        <div className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle onClose={() => setShiftReportModalOpen(false)}>ใบสรุปรายงานปิดกะ (Shift Z-Report)</DialogTitle>
          </DialogHeader>
          <DialogContent className="p-4 bg-slate-100 flex flex-col items-center">
            {/* Format toggle */}
            <div className="flex items-center gap-2 mb-3 bg-white p-1 rounded-xl border border-slate-300 text-xs no-print">
              <button
                type="button"
                onClick={() => setSlipWidth("80mm")}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  slipWidth === "80mm" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                สลิป 80 มม.
              </button>
              <button
                type="button"
                onClick={() => setSlipWidth("58mm")}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  slipWidth === "58mm" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                สลิป 58 มม.
              </button>
            </div>

            <div className={`${slipWidth === "58mm" ? "thermal-58mm" : "thermal-80mm"} bg-white border border-slate-300 p-4 text-xs font-mono space-y-2 rounded shadow-sm text-slate-900`}>
              <div className="text-center border-b border-dashed border-slate-400 pb-2">
                <div className="font-extrabold text-sm">MOBILESHOP HUB</div>
                <div className="text-[10px]">{currentBranch.name}</div>
                <div className="text-[10px] font-bold mt-1">ใบสรุปยอดปิดกะแคชเชียร์ (Z-REPORT)</div>
                <div className="text-[9px] text-slate-500">วันที่ {bangkokToday()}</div>
              </div>
              <div className="text-[10px] space-y-0.5 border-b border-dashed border-slate-400 pb-2">
                <div>แคชเชียร์: {closedBy || currentUser.name}</div>
                <div>
                  เวลาเปิด: {openingTime} • ปิด: {closedAt || bangkokTime()}
                </div>
              </div>
              <div className="space-y-1 text-[10px] border-b border-dashed border-slate-400 pb-2">
                <div className="flex justify-between">
                  <span>เงินทอนตั้งต้น:</span>
                  <span>{formatTHB(openingFloat)}</span>
                </div>
                <div className="flex justify-between">
                  <span>ยอดขายเงินสด:</span>
                  <span>{formatTHB(posCashSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span>ยอดขาย PromptPay:</span>
                  <span>{formatTHB(posPromptPaySales)}</span>
                </div>
                <div className="flex justify-between">
                  <span>ยอดขายบัตรเครดิต:</span>
                  <span>{formatTHB(posCardSales)}</span>
                </div>
                {posSplitSales > 0 && (
                  <div className="flex justify-between">
                    <span>ยอดขายแยกชำระ:</span>
                    <span>{formatTHB(posSplitSales)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold pt-1 border-t border-slate-200">
                  <span>ยอดขายรวมทุกช่องทาง:</span>
                  <span>{formatTHB(posCashSales + posPromptPaySales + posCardSales + posSplitSales)}</span>
                </div>
              </div>
              <div className="space-y-1 text-[10px] border-b border-dashed border-slate-400 pb-2">
                <div className="flex justify-between">
                  <span>เงินเข้า / เบิกออก:</span>
                  <span>
                    +{formatTHB(totalCashIn)} / -{formatTHB(totalCashOut)}
                  </span>
                </div>
                {cashRefunds > 0 && (
                  <div className="flex justify-between">
                    <span>คืนเงินสดบิลวันก่อน:</span>
                    <span>-{formatTHB(cashRefunds)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>เงินสดที่ควรมี:</span>
                  <span>{formatTHB(expectedCashInDrawer)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>เงินสดนับได้จริง:</span>
                  <span>{formatTHB(countedCash)}</span>
                </div>
                <div className="flex justify-between font-bold text-rose-600">
                  <span>ผลต่าง (Discrepancy):</span>
                  <span>{discrepancyText}</span>
                </div>
              </div>
              <div className="pt-4 text-center text-[10px] space-y-4">
                <div>ลงชื่อ แคชเชียร์: ............................</div>
                <div>ลงชื่อ ผู้จัดการ: ............................</div>
              </div>
            </div>
          </DialogContent>
          <DialogFooter className="flex justify-between">
            <Button variant="outline" size="sm" onClick={() => setShiftReportModalOpen(false)}>
              ปิด
            </Button>
            <Button size="sm" onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 font-bold">
              <Printer className="h-4 w-4" />
              <span>พิมพ์สลิป ({slipWidth})</span>
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  );
}
