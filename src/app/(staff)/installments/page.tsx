"use client";

import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import {
  CreditCard,
  PlusCircle,
  Search,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Eye,
  DollarSign,
  ChevronRight,
  Smartphone,
  User,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { formatTHB, formatDateThai } from "@/lib/utils";

export default function InstallmentsPage() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Selected for View / Payment
  const [selectedContract, setSelectedContract] = useState<any | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  // New Contract Form State
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustId, setNewCustId] = useState("");
  const [newDeviceModel, setNewDeviceModel] = useState("iPhone 15 128GB");
  const [newIMEI, setNewIMEI] = useState("358912345678901");
  const [newTotalPrice, setNewTotalPrice] = useState(26900);
  const [newDownPayment, setNewDownPayment] = useState(6900);
  const [newTerm, setNewTerm] = useState(6);
  const [newInterestRate, setNewInterestRate] = useState(1.5);

  const fetchContracts = async () => {
    try {
      const res = await fetch("/api/installments");
      const json = await res.json();
      if (json.success) {
        setContracts(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  // Busy flag blocks double submits while a request is in flight; error shows the server message.
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [formError, setFormError] = useState("");

  const handleCollectPayment = async (contractId: string, month: number, amount: number) => {
    if (busy) return;
    if (!window.confirm(`ยืนยันรับชำระงวดที่ ${month} จำนวน ${formatTHB(amount)} ?`)) return;
    setBusy(true);
    setActionError("");
    try {
      const res = await fetch("/api/installments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractId, month, amount }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setActionError(json.error || "รับชำระไม่สำเร็จ กรุณาลองใหม่");
        // Refresh so the table reflects the real state (e.g. paid by another cashier).
        fetchContracts();
        return;
      }
      confetti({ particleCount: 70, spread: 60 });
      setSelectedContract(json.data);
      fetchContracts();
    } catch (err) {
      console.error(err);
      setActionError("เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setFormError("");
    // Client-side validation mirrors the server rules.
    if (!Number.isFinite(newTotalPrice) || newTotalPrice <= 0) return setFormError("ราคาสินค้าต้องมากกว่า 0");
    if (!Number.isFinite(newDownPayment) || newDownPayment < 0) return setFormError("เงินดาวน์ต้องไม่ติดลบ");
    if (newDownPayment >= newTotalPrice) return setFormError("เงินดาวน์ต้องน้อยกว่าราคาสินค้า");
    if (!Number.isInteger(newTerm) || newTerm < 1 || newTerm > 36) return setFormError("จำนวนงวดต้องอยู่ระหว่าง 1-36 เดือน");
    if (!Number.isFinite(newInterestRate) || newInterestRate < 0 || newInterestRate > 5) return setFormError("อัตราดอกเบี้ยต้องอยู่ระหว่าง 0-5% ต่อเดือน");
    setBusy(true);
    try {
      const res = await fetch("/api/installments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: newCustName,
          customerPhone: newCustPhone,
          nationalId: newCustId,
          deviceModel: newDeviceModel,
          imei: newIMEI,
          totalPrice: newTotalPrice,
          downPayment: newDownPayment,
          termMonths: newTerm,
          monthlyInterestRate: newInterestRate,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setFormError(json.error || "สร้างสัญญาไม่สำเร็จ กรุณาลองใหม่");
        return;
      }
      setShowNewModal(false);
      fetchContracts();
      confetti({ particleCount: 90, spread: 60 });
    } catch (err) {
      console.error(err);
      setFormError("เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  // Calculations for new contract modal preview
  const financed = newTotalPrice - newDownPayment;
  const interestVal = financed * (newInterestRate / 100) * newTerm;
  const monthlyCalc = newTerm > 0 ? Math.floor(((financed + interestVal) * 100) / newTerm) / 100 : 0;

  const filtered = contracts.filter((c) => {
    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
    const s = search.toLowerCase();
    const matchesSearch =
      !s ||
      c.customerName.toLowerCase().includes(s) ||
      c.customerPhone.includes(s) ||
      c.contractNo.toLowerCase().includes(s) ||
      c.imei?.includes(s) ||
      c.deviceModel.toLowerCase().includes(s);
    return matchesStatus && matchesSearch;
  });

  const activeCount = contracts.filter((c) => c.status === "ACTIVE").length;
  const overdueCount = contracts.filter((c) => c.status === "OVERDUE").length;
  const totalFinanced = contracts.reduce((sum, c) => sum + (c.financedAmount || 0), 0);
  const totalMonthlyTarget = contracts
    .filter((c) => c.status === "ACTIVE" || c.status === "OVERDUE")
    .reduce((sum, c) => sum + (c.monthlyPayment || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-blue-600" />
            <span>ระบบผ่อนชำระเครื่องหน้าร้าน (Store Installments)</span>
          </h1>
          <p className="text-sm text-slate-500">
            บริหารจัดการสัญญาผ่อน ตารางค่างวด (Amortization) ติดตามยอดค้างชำระ และออกใบเสร็จ
          </p>
        </div>
        <Button
          onClick={() => {
            setFormError("");
            setShowNewModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2 text-xs shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>ทำสัญญาผ่อนใหม่</span>
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">สัญญาผ่อนทั้งหมดที่กำลังผ่อน</div>
              <div className="text-2xl font-bold text-slate-900 mt-0.5">{activeCount}</div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">ยอดค้างชำระ / เกินกำหนด</div>
              <div className="text-2xl font-bold text-rose-600 mt-0.5">{overdueCount}</div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">เป้าเก็บเงินงวดเดือนนี้</div>
              <div className="text-2xl font-bold text-emerald-600 mt-0.5">
                {formatTHB(totalMonthlyTarget)}
              </div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">มูลค่าสินเชื่อคงค้างรวม</div>
              <div className="text-2xl font-bold text-slate-900 mt-0.5">
                {formatTHB(totalFinanced)}
              </div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-slate-200">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="ค้นหาชื่อลูกค้า, เบอร์โทร, เลขที่สัญญา (INS-...), รุ่น หรือ IMEI..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs h-9 bg-slate-50 border-slate-200"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {["ALL", "ACTIVE", "OVERDUE", "COMPLETED"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === st
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {st === "ALL"
                    ? "ทั้งหมด"
                    : st === "ACTIVE"
                    ? "กำลังผ่อน"
                    : st === "OVERDUE"
                    ? "เกินกำหนด"
                    : "ผ่อนครบแล้ว"}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
              <tr>
                <th className="py-3 px-4">เลขที่สัญญา / วันที่</th>
                <th className="py-3 px-4">ลูกค้า & เบอร์ติดต่อ</th>
                <th className="py-3 px-4">อุปกรณ์ / IMEI</th>
                <th className="py-3 px-4 text-right">ยอดกู้ / ค่างวด</th>
                <th className="py-3 px-4 text-center">ความคืบหน้างวด</th>
                <th className="py-3 px-4">งวดถัดไป</th>
                <th className="py-3 px-4">สถานะ</th>
                <th className="py-3 px-4 text-center">ดูตารางผ่อน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    กำลังโหลดข้อมูลสัญญาผ่อน...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    ไม่พบรายการสัญญาผ่อนชำระ
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-blue-700">{item.contractNo}</div>
                      <div className="text-[11px] text-slate-400">{item.startDate}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{item.customerName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{item.customerPhone}</div>
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-slate-900 truncate">{item.deviceModel}</div>
                      <div className="text-[10px] text-slate-400 font-mono">IMEI: {item.imei}</div>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="font-bold text-slate-900">{formatTHB(item.monthlyPayment)}/ด.</div>
                      <div className="text-[10px] text-slate-400">
                        ยอดจัด: {formatTHB(item.financedAmount)}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <span className="font-bold text-slate-800">
                          {item.paidMonths}/{item.termMonths}
                        </span>
                        <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden inline-block">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${(item.paidMonths / item.termMonths) * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {item.nextDueDate ? (
                        <div className="text-[11px] text-slate-700 font-mono">{item.nextDueDate}</div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">-</span>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          item.status === "ACTIVE"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : item.status === "OVERDUE"
                            ? "bg-rose-50 text-rose-700 border border-rose-200 animate-pulse"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {item.status === "ACTIVE"
                          ? "ปกติ"
                          : item.status === "OVERDUE"
                          ? `ค้างชำระ (${item.overdueDays || 30} วัน)`
                          : "ผ่อนครบแล้ว"}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setActionError("");
                          setSelectedContract(item);
                        }}
                        className="text-xs h-8 px-2.5 gap-1 text-slate-700"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>เปิดดู</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Contract Detail & Amortization Schedule Modal */}
      {selectedContract && (
        <Dialog open={!!selectedContract} onOpenChange={() => setSelectedContract(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
            <DialogHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span>ตารางผ่อนชำระค่างวด: {selectedContract.contractNo}</span>
                </DialogTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  ลูกค้า: {selectedContract.customerName} ({selectedContract.customerPhone}) • {selectedContract.deviceModel}
                </p>
              </div>
            </DialogHeader>

            <div className="p-6 space-y-4">
              {/* Top Financial Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500">ราคาสินค้า</span>
                  <div className="font-bold text-slate-900 text-sm">{formatTHB(selectedContract.totalPrice)}</div>
                </div>
                <div>
                  <span className="text-slate-500">เงินดาวน์</span>
                  <div className="font-bold text-slate-900 text-sm">{formatTHB(selectedContract.downPayment)}</div>
                </div>
                <div>
                  <span className="text-slate-500">ยอดจัดสินเชื่อ</span>
                  <div className="font-bold text-blue-700 text-sm">{formatTHB(selectedContract.financedAmount)}</div>
                </div>
                <div>
                  <span className="text-slate-500">ค่างวดต่อเดือน ({selectedContract.termMonths} งวด)</span>
                  <div className="font-black text-emerald-700 text-base">{formatTHB(selectedContract.monthlyPayment)}</div>
                </div>
              </div>

              {/* Amortization Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 mb-2">ตารางการผ่อนชำระรายงวด (Schedule)</h4>
                {actionError && (
                  <div className="mb-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{actionError}</div>
                )}
                <div className="border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 text-[11px] font-semibold">
                      <tr>
                        <th className="p-2.5 text-center">งวดที่</th>
                        <th className="p-2.5">วันครบกำหนด</th>
                        <th className="p-2.5 text-right">จำนวนเงิน</th>
                        <th className="p-2.5">วันที่ชำระ</th>
                        <th className="p-2.5">สถานะ</th>
                        <th className="p-2.5 text-center">การกระทำ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedContract.payments?.map((p: any, idx: number) => (
                        <tr key={idx} className={p.status === "PAID" ? "bg-emerald-50/20" : ""}>
                          <td className="p-2.5 text-center font-bold text-slate-800">{p.month}</td>
                          <td className="p-2.5 font-mono">{p.dueDate}</td>
                          <td className="p-2.5 text-right font-bold text-slate-900 font-mono">
                            {formatTHB(p.amount)}
                          </td>
                          <td className="p-2.5 text-slate-600 font-mono text-[11px]">
                            {p.paidDate ? `${p.paidDate} (${p.ref})` : "-"}
                          </td>
                          <td className="p-2.5">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                p.status === "PAID"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : p.status === "OVERDUE"
                                  ? "bg-rose-100 text-rose-800 font-bold"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {p.status === "PAID"
                                ? "ชำระแล้ว"
                                : p.status === "OVERDUE"
                                ? "ค้างชำระ"
                                : "รอชำระ"}
                            </span>
                          </td>
                          <td className="p-2.5 text-center">
                            {p.status !== "PAID" ? (
                              <Button
                                size="sm"
                                disabled={busy}
                                onClick={() => handleCollectPayment(selectedContract.id, p.month, p.amount)}
                                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2.5"
                              >
                                รับชำระ
                              </Button>
                            ) : (
                              <span className="text-[11px] text-emerald-600 font-medium">✓ เสร็จสิ้น</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* New Installment Contract Modal */}
      {showNewModal && (
        <Dialog open={showNewModal} onOpenChange={() => setShowNewModal(false)}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0">
            <DialogHeader className="p-4 border-b border-slate-100">
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span>สร้างสัญญาผ่อนชำระเครื่องใหม่</span>
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreateContract} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อลูกค้า *</label>
                  <Input
                    required
                    placeholder="เช่น คุณกฤษดา เจริญผล"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์ *</label>
                  <Input
                    required
                    placeholder="08X-XXX-XXXX"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">รุ่นอุปกรณ์ *</label>
                  <Input
                    required
                    value={newDeviceModel}
                    onChange={(e) => setNewDeviceModel(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">IMEI *</label>
                  <Input
                    required
                    value={newIMEI}
                    onChange={(e) => setNewIMEI(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ราคาสินค้า (บาท)</label>
                  <Input
                    type="number"
                    value={newTotalPrice}
                    onChange={(e) => setNewTotalPrice(Number(e.target.value))}
                    className="text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">เงินดาวน์ (บาท)</label>
                  <Input
                    type="number"
                    value={newDownPayment}
                    onChange={(e) => setNewDownPayment(Number(e.target.value))}
                    className="text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">จำนวนงวด (เดือน)</label>
                  <select
                    value={newTerm}
                    onChange={(e) => setNewTerm(Number(e.target.value))}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                  >
                    <option value={3}>3 เดือน</option>
                    <option value={6}>6 เดือน</option>
                    <option value={10}>10 เดือน</option>
                    <option value={12}>12 เดือน</option>
                  </select>
                </div>
              </div>

              {/* Live Calculator preview */}
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs flex justify-between items-center">
                <div>
                  <span className="text-slate-500">ยอดจัด: {formatTHB(financed)}</span>
                  <div className="text-[11px] text-slate-500">ดอกเบี้ย {newInterestRate}%/เดือน</div>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 text-[11px]">ค่างวดเฉลี่ยต่อเดือน</span>
                  <div className="text-base font-black text-blue-700 font-mono">{formatTHB(monthlyCalc)}/เดือน</div>
                </div>
              </div>

              {formError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{formError}</div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowNewModal(false)} className="text-xs">
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={busy} className="text-xs bg-blue-600 hover:bg-blue-700 text-white">
                  {busy ? "กำลังบันทึก..." : "อนุมัติและสร้างสัญญา"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
