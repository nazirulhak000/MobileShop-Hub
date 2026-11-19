"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { ArrowDownCircle, ArrowUpCircle, Printer, Lock, Unlock, RefreshCw } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { formatTHB } from "@/lib/utils";

interface CashMovement {
  id: string;
  time: string;
  type: "CASH_IN" | "CASH_OUT";
  amount: number;
  reason: string;
}

interface SummaryData {
  byPaymentMethod: Array<{ paymentMethod: string; count: number; netAmount: number }>;
  cashSales: number;
  cashRefundsOfEarlierSales: number;
}

// Notes and coins with their face value (THB). Coins are counted per denomination.
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
// Client-safe "YYYY-MM-DD" in Bangkok time.
const bangkokToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
const bangkokTime = () => new Date().toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" }) + " น.";

export default function ShiftManagementPage() {
  const { currentBranch, currentUser } = useApp();

  const [isShiftOpen, setIsShiftOpen] = useState(true);
  const [openingTime, setOpeningTime] = useState(() => bangkokTime());
  const [openingFloat, setOpeningFloat] = useState(0);

  // Today's POS sales from the database
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Cash In / Out during shift (local only - no model to persist them)
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

  const [closeShiftModalOpen, setCloseShiftModalOpen] = useState(false);
  const [shiftReportModalOpen, setShiftReportModalOpen] = useState(false);
  const [closedAt, setClosedAt] = useState("");

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
  }, [loadSummary]);

  const methodTotal = (m: string) => summary?.byPaymentMethod.find((r) => r.paymentMethod === m)?.netAmount ?? 0;
  const posCashSales = summary?.cashSales ?? 0;
  const posPromptPaySales = methodTotal("PROMPTPAY");
  const posCardSales = methodTotal("CARD");
  const posSplitSales = methodTotal("SPLIT");
  // Cash refunded today for bills sold on earlier days leaves the drawer today.
  const cashRefunds = summary?.cashRefundsOfEarlierSales ?? 0;

  const totalCashIn = useMemo(() => movements.filter((m) => m.type === "CASH_IN").reduce((sum, m) => sum + m.amount, 0), [movements]);
  const totalCashOut = useMemo(() => movements.filter((m) => m.type === "CASH_OUT").reduce((sum, m) => sum + m.amount, 0), [movements]);

  // Expected cash in drawer
  const expectedCashInDrawer = round2(openingFloat + posCashSales - cashRefunds + totalCashIn - totalCashOut);

  // Actual counted cash: count x face value of each denomination
  const countedCash = useMemo(() => round2(DENOMINATIONS.reduce((sum, d) => sum + counts[d.key] * d.value, 0)), [counts]);

  const discrepancy = round2(countedCash - expectedCashInDrawer);
  const discrepancyText =
    discrepancy === 0 ? "พอดี (0.00)" : discrepancy > 0 ? `เงินเกิน +${formatTHB(discrepancy)}` : `เงินขาด ${formatTHB(discrepancy)}`;

  const handleAddMovement = () => {
    const amount = Number(actionAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setActionError("กรุณาระบุจำนวนเงินมากกว่า 0");
      return;
    }
    if (actionReason.trim().length < 3) {
      setActionError("กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร");
      return;
    }
    const item: CashMovement = {
      id: `${Date.now()}`,
      time: bangkokTime(),
      type: actionType,
      amount: round2(amount),
      reason: actionReason.trim(),
    };
    setMovements([...movements, item]);
    setCashActionModalOpen(false);
    setActionAmount("");
    setActionReason("");
    setActionError(null);
  };

  const handleConfirmCloseShift = () => {
    // Nothing is persisted (no shift model): only lock the local view and show the printable summary.
    setClosedAt(bangkokTime());
    setIsShiftOpen(false);
    setCloseShiftModalOpen(false);
    setShiftReportModalOpen(true);
  };

  const handleOpenNewShift = () => {
    setIsShiftOpen(true);
    setOpeningTime(bangkokTime());
    setMovements([]);
    setCounts(Object.fromEntries(DENOMINATIONS.map((d) => [d.key, 0])) as Record<DenomKey, number>);
    setClosedAt("");
    loadSummary();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <DemoBanner message="การปิดกะยังไม่ถูกบันทึกลงฐานข้อมูล ใช้เพื่อตรวจนับเงินสดเท่านั้น" />

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
                <Badge variant="secondary" className="text-xs">
                  <Lock className="h-3 w-3 mr-1 inline" />
                  ตรวจนับปิดกะแล้ว
                </Badge>
              )}
            </h1>
          </div>
          <p className="text-sm text-slate-500">
            นับเงินทอนตั้งต้น (Opening Float), จดเงินเข้า-ออกระหว่างกะ, และตรวจสอบผลต่างเงินสดเทียบยอดขายเงินสดจริงของวันนี้
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadSummary} disabled={loading} className="text-xs gap-1.5">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>รีเฟรชยอดขาย</span>
          </Button>
          {isShiftOpen && (
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
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs gap-1.5 shadow-sm"
              >
                <Lock className="h-4 w-4" />
                <span>นับเงิน & ปิดกะประจำวัน</span>
              </Button>
            </>
          )}

          {!isShiftOpen && (
            <Button size="sm" onClick={handleOpenNewShift} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5">
              <Unlock className="h-4 w-4" />
              <span>เปิดกะใหม่</span>
            </Button>
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
            จากบิล POS ที่สมบูรณ์ของวันนี้
            {cashRefunds > 0 && ` • คืนเงินสดบิลวันก่อน -${formatTHB(cashRefunds)}`}
          </div>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-xs font-semibold text-blue-700">ยอดขาย PromptPay & บัตร</span>
          <div className="text-2xl font-bold font-mono text-blue-700">{loading ? "..." : formatTHB(posPromptPaySales + posCardSales)}</div>
          <div className="text-[11px] text-slate-400">
            โอน: {formatTHB(posPromptPaySales)} | บัตร: {formatTHB(posCardSales)}
            {posSplitSales > 0 && ` | แยกชำระ: ${formatTHB(posSplitSales)} (ไม่นับเป็นเงินสด)`}
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
                <CardDescription>จดไว้ในหน้านี้เพื่อคำนวณยอดที่ควรมี (ไม่ถูกบันทึกลงฐานข้อมูล)</CardDescription>
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
              <CardTitle className="text-sm">นับเงินในลิ้นชัก (Cash Count)</CardTitle>
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
          <p className="text-[11px] text-slate-500">รายการนี้ใช้คำนวณในหน้านี้เท่านั้น ไม่ถูกบันทึกเป็นค่าใช้จ่ายในระบบ</p>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setCashActionModalOpen(false)}>
            ยกเลิก
          </Button>
          <Button size="sm" onClick={handleAddMovement} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
            เพิ่มรายการ
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
          <p className="text-amber-700">
            ระบบยังไม่บันทึกการปิดกะลงฐานข้อมูล กรุณาพิมพ์ใบสรุปและให้ผู้จัดการลงชื่อเก็บไว้เป็นหลักฐาน
          </p>
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
            <DialogTitle onClose={() => setShiftReportModalOpen(false)}>ใบสรุปรายงานปิดกะ (Shift Z-Report 80mm)</DialogTitle>
          </DialogHeader>
          <DialogContent className="p-4 bg-slate-100 flex justify-center">
            <div className="thermal-80mm bg-white border border-slate-300 p-4 text-xs font-mono space-y-2 rounded shadow-sm text-slate-900">
              <div className="text-center border-b border-dashed border-slate-400 pb-2">
                <div className="font-extrabold text-sm">MOBILESHOP HUB</div>
                <div className="text-[10px]">{currentBranch.name}</div>
                <div className="text-[10px] font-bold mt-1">ใบสรุปยอดปิดกะแคชเชียร์ (Z-REPORT)</div>
                <div className="text-[9px] text-slate-500">วันที่ {bangkokToday()}</div>
              </div>
              <div className="text-[10px] space-y-0.5 border-b border-dashed border-slate-400 pb-2">
                <div>แคชเชียร์: {currentUser.name}</div>
                <div>
                  เวลาเปิด: {openingTime} • ปิด: {closedAt || "-"}
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
              <div className="text-center text-[9px] text-slate-500">* เอกสารนี้ไม่ได้ถูกบันทึกในระบบ *</div>
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
            <Button size="sm" onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
              <Printer className="h-4 w-4" />
              <span>พิมพ์สลิป 80mm</span>
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  );
}
