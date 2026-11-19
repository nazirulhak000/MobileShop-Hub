"use client";

import React, { useState, useMemo } from "react";
import {
  Clock,
  Banknote,
  DollarSign,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  AlertCircle,
  Printer,
  Building2,
  User,
  History,
  Lock,
  Unlock,
} from "lucide-react";
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
}

export default function ShiftManagementPage() {
  const { currentBranch, currentUser } = useApp();

  const [isShiftOpen, setIsShiftOpen] = useState(true);
  const [openingTime] = useState("09:00 น.");
  const [openingFloat, setOpeningFloat] = useState(3000); // 3,000 THB initial drawer float

  // Cash sales from POS
  const [posCashSales] = useState(14850);
  const [posPromptPaySales] = useState(28500);
  const [posCardSales] = useState(19900);

  // Cash In / Out during shift
  const [movements, setMovements] = useState<CashMovement[]>([
    { id: "1", time: "11:30 น.", type: "CASH_OUT", amount: 350, reason: "ซื้อน้ำดื่มและกาแฟรับรองลูกค้า" },
    { id: "2", time: "14:15 น.", type: "CASH_OUT", amount: 500, reason: "จ่ายค่าส่งพัสดุอะไหล่ด่วน (Grab)" },
  ]);

  // Cash count denominations for closing shift
  const [denom1000, setDenom1000] = useState(15);
  const [denom500, setDenom500] = useState(2);
  const [denom100, setDenom100] = useState(9);
  const [denom50, setDenom50] = useState(1);
  const [denom20, setDenom20] = useState(2);
  const [denomCoins, setDenomCoins] = useState(10);

  // Modals
  const [cashActionModalOpen, setCashActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<"CASH_IN" | "CASH_OUT">("CASH_OUT");
  const [actionAmount, setActionAmount] = useState("");
  const [actionReason, setActionReason] = useState("");

  const [closeShiftModalOpen, setCloseShiftModalOpen] = useState(false);
  const [shiftReportModalOpen, setShiftReportModalOpen] = useState(false);

  // Total cash movements
  const totalCashIn = useMemo(
    () => movements.filter((m) => m.type === "CASH_IN").reduce((sum, m) => sum + m.amount, 0),
    [movements]
  );
  const totalCashOut = useMemo(
    () => movements.filter((m) => m.type === "CASH_OUT").reduce((sum, m) => sum + m.amount, 0),
    [movements]
  );

  // Expected cash in drawer
  const expectedCashInDrawer = openingFloat + posCashSales + totalCashIn - totalCashOut;

  // Actual counted cash
  const countedCash = useMemo(() => {
    return (
      denom1000 * 1000 +
      denom500 * 500 +
      denom100 * 100 +
      denom50 * 50 +
      denom20 * 20 +
      denomCoins * 1
    );
  }, [denom1000, denom500, denom100, denom50, denom20, denomCoins]);

  const discrepancy = countedCash - expectedCashInDrawer;

  const handleAddMovement = () => {
    if (!actionAmount || !actionReason) return;
    const item: CashMovement = {
      id: Date.now().toString(),
      time: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น.",
      type: actionType,
      amount: parseFloat(actionAmount) || 0,
      reason: actionReason,
    };
    setMovements([...movements, item]);
    setCashActionModalOpen(false);
    setActionAmount("");
    setActionReason("");
  };

  const handleConfirmCloseShift = () => {
    setIsShiftOpen(false);
    setCloseShiftModalOpen(false);
    setShiftReportModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
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
                  ปิดกะเรียบร้อย
                </Badge>
              )}
            </h1>
          </div>
          <p className="text-sm text-slate-500">
            นับเงินทอนตั้งต้น (Opening Float), บันทึกเงินเข้า-ออกระหว่างกะ, และตรวจสอบผลต่างเงินสดตอนปิดกะ
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isShiftOpen && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActionType("CASH_OUT");
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
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs gap-1.5 shadow-sm"
              >
                <Lock className="h-4 w-4" />
                <span>นับเงิน & ปิดกะประจำวัน</span>
              </Button>
            </>
          )}

          {!isShiftOpen && (
            <Button
              size="sm"
              onClick={() => setIsShiftOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
            >
              <Unlock className="h-4 w-4" />
              <span>เปิดกะใหม่</span>
            </Button>
          )}
        </div>
      </div>

      {/* 4 Stat Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 space-y-1">
          <span className="text-xs font-semibold text-slate-500">เงินทอนตั้งต้น (Opening Float)</span>
          <div className="text-2xl font-bold font-mono text-slate-900">{formatTHB(openingFloat)}</div>
          <div className="text-[11px] text-slate-400">เปิดกะเวลา {openingTime}</div>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-xs font-semibold text-emerald-700">ยอดขายเงินสดหน้าร้าน (Cash Sales)</span>
          <div className="text-2xl font-bold font-mono text-emerald-700">{formatTHB(posCashSales)}</div>
          <div className="text-[11px] text-slate-400">จากระบบ POS ทั้งหมด</div>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-xs font-semibold text-blue-700">ยอดขาย PromptPay & บัตร</span>
          <div className="text-2xl font-bold font-mono text-blue-700">
            {formatTHB(posPromptPaySales + posCardSales)}
          </div>
          <div className="text-[11px] text-slate-400">
            โอน: {formatTHB(posPromptPaySales)} | บัตร: {formatTHB(posCardSales)}
          </div>
        </Card>

        <Card className="p-4 space-y-1 border-indigo-200 bg-indigo-50/40">
          <span className="text-xs font-semibold text-indigo-700">เงินสดที่ควรมีในลิ้นชัก (Expected)</span>
          <div className="text-2xl font-bold font-mono text-indigo-950">
            {formatTHB(expectedCashInDrawer)}
          </div>
          <div className="text-[11px] text-indigo-800">
            (เงินตั้งต้น + ขายสด + เข้า - เบิกจ่าย)
          </div>
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
                <CardDescription>บันทึกเงินสดย่อย ค่าพัสดุ หรือค่าใช้จ่ายเบ็ดเตล็ด</CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setActionType("CASH_IN");
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
                  {movements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="p-2.5 text-slate-500">{m.time}</td>
                      <td className="p-2.5 text-center font-sans">
                        {m.type === "CASH_IN" ? (
                          <span className="rounded bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                            เงินเข้า
                          </span>
                        ) : (
                          <span className="rounded bg-rose-100 text-rose-800 px-2 py-0.5 text-[10px] font-bold">
                            เบิกออก
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 font-sans text-slate-800">{m.reason}</td>
                      <td
                        className={`p-2.5 text-right font-bold ${
                          m.type === "CASH_IN" ? "text-emerald-700" : "text-rose-600"
                        }`}
                      >
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
              <CardTitle className="text-sm">จำลองการนับธนบัตรในลิ้นชัก (Cash Count)</CardTitle>
              <CardDescription>ใส่จำนวนใบธนบัตรเพื่อคำนวณยอดเงินจริง</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 text-xs">
              {[
                { label: "ธนบัตร 1,000 บาท", count: denom1000, set: setDenom1000, mult: 1000 },
                { label: "ธนบัตร 500 บาท", count: denom500, set: setDenom500, mult: 500 },
                { label: "ธนบัตร 100 บาท", count: denom100, set: setDenom100, mult: 100 },
                { label: "ธนบัตร 50 บาท", count: denom50, set: setDenom50, mult: 50 },
                { label: "ธนบัตร 20 บาท", count: denom20, set: setDenom20, mult: 20 },
                { label: "เหรียญกษาปณ์รวม", count: denomCoins, set: setDenomCoins, mult: 1 },
              ].map((row, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <span className="text-slate-600 w-36">{row.label}</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      value={row.count}
                      onChange={(e) => row.set(parseInt(e.target.value) || 0)}
                      className="w-16 h-7 text-right font-mono text-xs"
                    />
                    <span className="text-slate-400 font-mono w-4">x</span>
                    <span className="w-24 text-right font-mono font-semibold">
                      {formatTHB(row.count * row.mult)}
                    </span>
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
                    Math.abs(discrepancy) < 1
                      ? "text-emerald-700"
                      : discrepancy > 0
                      ? "text-blue-700"
                      : "text-rose-600"
                  }`}
                >
                  <span>ผลต่าง (Discrepancy):</span>
                  <span>
                    {discrepancy === 0
                      ? "พอดีเป๊ะ (0.00)"
                      : discrepancy > 0
                      ? `เงินเกิน +${formatTHB(discrepancy)}`
                      : `เงินขาด ${formatTHB(discrepancy)}`}
                  </span>
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
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setCashActionModalOpen(false)}>
            ยกเลิก
          </Button>
          <Button size="sm" onClick={handleAddMovement} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
            บันทึกรายการ
          </Button>
        </DialogFooter>
      </Dialog>

      {/* CLOSE SHIFT CONFIRM MODAL */}
      <Dialog open={closeShiftModalOpen} onOpenChange={setCloseShiftModalOpen}>
        <DialogHeader>
          <DialogTitle onClose={() => setCloseShiftModalOpen(false)}>ยืนยันการปิดกะแคชเชียร์</DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-3 text-xs">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 font-mono">
            <div className="flex justify-between">
              <span>ยอดขายเงินสด:</span>
              <span>{formatTHB(posCashSales)}</span>
            </div>
            <div className="flex justify-between">
              <span>เงินสดนับได้จริง:</span>
              <span className="font-bold">{formatTHB(countedCash)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-sm">
              <span>ผลต่างเงินสด:</span>
              <span className={discrepancy < 0 ? "text-rose-600" : "text-emerald-700"}>
                {formatTHB(discrepancy)}
              </span>
            </div>
          </div>
          <p className="text-slate-500">เมื่อปิดกะแล้ว ลิ้นชักจะถูกล็อกและสร้างใบสรุปรายงานส่งต่อผู้จัดการ</p>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setCloseShiftModalOpen(false)}>
            ยกเลิก
          </Button>
          <Button size="sm" onClick={handleConfirmCloseShift} className="bg-rose-600 hover:bg-rose-700 text-white font-bold">
            ยืนยันปิดกะ & ออกรายงาน
          </Button>
        </DialogFooter>
      </Dialog>

      {/* SHIFT SUMMARY REPORT MODAL */}
      <Dialog open={shiftReportModalOpen} onOpenChange={setShiftReportModalOpen}>
        <div className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle onClose={() => setShiftReportModalOpen(false)}>
              ใบสรุปรายงานปิดกะ (Shift Z-Report 80mm)
            </DialogTitle>
          </DialogHeader>
          <DialogContent className="p-4 bg-slate-100 flex justify-center">
            <div className="thermal-80mm bg-white border border-slate-300 p-4 text-xs font-mono space-y-2 rounded shadow-sm text-slate-900">
              <div className="text-center border-b border-dashed border-slate-400 pb-2">
                <div className="font-extrabold text-sm">MOBILESHOP HUB</div>
                <div className="text-[10px]">{currentBranch.name}</div>
                <div className="text-[10px] font-bold mt-1">ใบสรุปยอดปิดกะแคชเชียร์ (Z-REPORT)</div>
              </div>
              <div className="text-[10px] space-y-0.5 border-b border-dashed border-slate-400 pb-2">
                <div>แคชเชียร์: {currentUser.name}</div>
                <div>เวลาเปิด: {openingTime} • ปิด: {new Date().toLocaleTimeString("th-TH")}</div>
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
                <div className="flex justify-between font-bold pt-1 border-t border-slate-200">
                  <span>ยอดขายรวมทุกช่องทาง:</span>
                  <span>{formatTHB(posCashSales + posPromptPaySales + posCardSales)}</span>
                </div>
              </div>
              <div className="space-y-1 text-[10px] border-b border-dashed border-slate-400 pb-2">
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
                  <span>{formatTHB(discrepancy)}</span>
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
