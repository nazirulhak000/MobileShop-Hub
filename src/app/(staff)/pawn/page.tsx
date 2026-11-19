"use client";

import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import {
  HandCoins,
  PlusCircle,
  Search,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Printer,
  Smartphone,
  RotateCcw,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { formatTHB, formatDateThai } from "@/lib/utils";
import { useApp } from "@/context/AppContext";

export default function PawnContractsPage() {
  const { currentBranch } = useApp();
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any | null>(null);

  // New Pawn Form
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [brand, setBrand] = useState("Apple");
  const [model, setModel] = useState("iPhone 14 Pro 128GB");
  const [imei, setImei] = useState("358912345098712");
  const [loanAmount, setLoanAmount] = useState(12000);
  const [interestRate, setInterestRate] = useState(2.5);
  const [durationMonths, setDurationMonths] = useState(1);

  const fetchContracts = async () => {
    try {
      const res = await fetch("/api/pawn");
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

  // Busy flag disables every action/create button while a request is in flight.
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [formError, setFormError] = useState("");

  const handleAction = async (id: string, action: "pay_interest" | "redeem" | "forfeit") => {
    if (busy) return;
    const confirmText =
      action === "pay_interest"
        ? "ยืนยันการรับชำระดอกเบี้ยและขยายเวลาสัญญา 1 เดือน?"
        : action === "redeem"
        ? "ยืนยันการไถ่ถอนเครื่อง (รับเงินต้นคืนและคืนเครื่องให้ลูกค้า)?"
        : "ยืนยันตัดเครื่องหลุดจำนำเข้าสต็อกมือสองของร้าน? (เฉพาะผู้จัดการ/ผู้ดูแล)";

    if (!confirm(confirmText)) return;

    setBusy(true);
    setActionError("");
    try {
      const res = await fetch("/api/pawn", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setActionError(json.error || "ทำรายการไม่สำเร็จ กรุณาลองใหม่");
        fetchContracts();
        return;
      }
      confetti({ particleCount: 70, spread: 60 });
      fetchContracts();
    } catch (err) {
      console.error(err);
      setActionError("เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setFormError("");
    if (!custName.trim() || !custPhone.trim()) return setFormError("กรุณากรอกชื่อและเบอร์โทรศัพท์ลูกค้า");
    if (!/^\d{13}$/.test(nationalId.replace(/[\s-]/g, ""))) return setFormError("กรุณากรอกเลขบัตรประชาชน 13 หลักให้ถูกต้อง");
    if (!imei.trim()) return setFormError("กรุณากรอกหมายเลข IMEI");
    if (!Number.isFinite(loanAmount) || loanAmount <= 0) return setFormError("วงเงินจำนำต้องมากกว่า 0");
    if (!Number.isFinite(interestRate) || interestRate < 0 || interestRate > 5) return setFormError("อัตราดอกเบี้ยต้องอยู่ระหว่าง 0-5% ต่อเดือน");
    if (!Number.isInteger(durationMonths) || durationMonths < 1 || durationMonths > 12) return setFormError("ระยะเวลาสัญญาต้องอยู่ระหว่าง 1-12 เดือน");

    setBusy(true);
    try {
      // Created through /api/trade-in so the device IMEI is registered as PAWNED;
      // that is what lets a later forfeit move it into sellable stock.
      const res = await fetch("/api/trade-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "PAWN",
          branchCode: currentBranch.id || currentBranch.code,
          customerName: custName,
          customerPhone: custPhone,
          nationalId,
          deviceBrand: brand,
          deviceModel: model,
          imei,
          agreedPrice: loanAmount,
          interestRateMonthly: interestRate,
          durationMonths,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setFormError(json.error || "บันทึกสัญญาไม่สำเร็จ กรุณาลองใหม่");
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

  const activeContracts = contracts.filter((c) => c.status === "ACTIVE");
  const totalLoanActive = activeContracts.reduce((sum, c) => sum + c.agreedPrice, 0);
  const monthlyInterestIncome = activeContracts.reduce(
    (sum, c) => sum + (c.agreedPrice * (c.interestRateMonthly ?? 2.5)) / 100,
    0
  );

  const filtered = contracts.filter((c) => {
    const matchStatus = statusFilter === "ALL" || c.status === statusFilter;
    const s = search.toLowerCase();
    const matchSearch =
      !s ||
      c.contractNo.toLowerCase().includes(s) ||
      c.customer?.name.toLowerCase().includes(s) ||
      c.customer?.phone.includes(s) ||
      c.imei.includes(s) ||
      c.deviceModel.toLowerCase().includes(s);
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <HandCoins className="w-6 h-6 text-purple-600" />
            <span>ระบบรับจำนำ & ฝากขายมือถือ (Mobile Pawn & Consignment)</span>
          </h1>
          <p className="text-sm text-slate-500">
            สัญญาขายฝาก คิดดอกเบี้ยรายเดือน แจ้งเตือนวันครบกำหนด และตัดหลุดจำนำเข้าคลังมือสอง
          </p>
        </div>
        <Button
          onClick={() => {
            setFormError("");
            setShowNewModal(true);
          }}
          className="bg-purple-600 hover:bg-purple-700 text-white gap-2 text-xs shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>เปิดสัญญาจำนำใหม่</span>
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">สัญญาจำนำที่ใช้งานอยู่</div>
              <div className="text-2xl font-bold text-slate-900 mt-0.5">{activeContracts.length}</div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <HandCoins className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">เงินต้นหมุนเวียนจำนำ</div>
              <div className="text-2xl font-bold text-purple-700 mt-0.5">
                {formatTHB(totalLoanActive)}
              </div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">รายได้ดอกเบี้ยคาดหมาย/ด.</div>
              <div className="text-2xl font-bold text-emerald-600 mt-0.5">
                {formatTHB(monthlyInterestIncome)}
              </div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">อัตราดอกเบี้ยเฉลี่ย</div>
              <div className="text-2xl font-bold text-slate-900 mt-0.5">2.5% <span className="text-xs font-normal text-slate-500">/เดือน</span></div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {actionError && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card className="border-slate-200">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="ค้นหาเลขที่สัญญา (PW-...), ชื่อลูกค้า, เบอร์โทร หรือ IMEI..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs h-9 bg-slate-50 border-slate-200"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {["ALL", "ACTIVE", "REDEEMED", "FORFEITED"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === st
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {st === "ALL"
                    ? "ทั้งหมด"
                    : st === "ACTIVE"
                    ? "จำนำอยู่"
                    : st === "REDEEMED"
                    ? "ไถ่ถอนแล้ว"
                    : "หลุดจำนำ"}
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
                <th className="py-3 px-4">เครื่องที่จำนำ / IMEI</th>
                <th className="py-3 px-4 text-right">ยอดเงินต้น</th>
                <th className="py-3 px-4 text-right">ดอกเบี้ย/เดือน</th>
                <th className="py-3 px-4">วันครบกำหนด</th>
                <th className="py-3 px-4">สถานะ</th>
                <th className="py-3 px-4 text-center">การกระทำ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    กำลังโหลดข้อมูลสัญญาจำนำ...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    ไม่พบรายการสัญญาจำนำ
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const monthlyInterest = (item.agreedPrice * (item.interestRateMonthly ?? 2.5)) / 100;
                  const isOverdue = item.status === "ACTIVE" && new Date(item.dueDate) < new Date();

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-purple-700">{item.contractNo}</div>
                        <div className="text-[11px] text-slate-400">{formatDateThai(item.startDate)}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{item.customer?.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{item.customer?.phone}</div>
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900 truncate">
                          {item.deviceBrand} {item.deviceModel}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">IMEI: {item.imei}</div>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-slate-900 font-mono">
                        {formatTHB(item.agreedPrice)}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap font-semibold text-emerald-700 font-mono">
                        {formatTHB(monthlyInterest)} <span className="text-[10px] text-slate-400 font-normal">({item.interestRateMonthly}%)</span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className={`font-mono text-[11px] ${isOverdue ? "text-rose-600 font-bold" : "text-slate-700"}`}>
                          {item.dueDate ? formatDateThai(item.dueDate) : "-"}
                        </div>
                        {isOverdue && (
                          <span className="text-[10px] text-rose-500 font-bold">เลยกำหนดไถ่ถอน!</span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            item.status === "ACTIVE"
                              ? isOverdue
                                ? "bg-rose-50 text-rose-700 border border-rose-200 animate-pulse"
                                : "bg-purple-50 text-purple-700 border border-purple-200"
                              : item.status === "REDEEMED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-700 border border-slate-300"
                          }`}
                        >
                          {item.status === "ACTIVE"
                            ? isOverdue
                              ? "เลยกำหนด"
                              : "จำนำอยู่"
                            : item.status === "REDEEMED"
                            ? "ไถ่ถอนแล้ว"
                            : "หลุดจำนำ"}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {item.status === "ACTIVE" ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() => handleAction(item.id, "pay_interest")}
                              className="text-xs h-7 px-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                              title="รับชำระดอกเบี้ย ต่อสัญญา 1 เดือน"
                            >
                              ต่อดอก
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() => handleAction(item.id, "redeem")}
                              className="text-xs h-7 px-2 text-blue-700 border-blue-200 hover:bg-blue-50"
                              title="ไถ่ถอนเครื่อง"
                            >
                              ไถ่ถอน
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() => handleAction(item.id, "forfeit")}
                              className="text-xs h-7 px-2 text-rose-700 border-rose-200 hover:bg-rose-50"
                              title="ตัดหลุดจำนำเข้าคลังมือสอง"
                            >
                              หลุดจำนำ
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">ปิดสัญญาแล้ว</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* New Pawn Contract Modal */}
      {showNewModal && (
        <Dialog open={showNewModal} onOpenChange={() => setShowNewModal(false)}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0">
            <DialogHeader className="p-4 border-b border-slate-100">
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <HandCoins className="w-4 h-4 text-purple-600" />
                <span>เปิดสัญญาขายฝาก / จำนำมือถือ</span>
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อลูกค้า *</label>
                  <Input
                    required
                    placeholder="เช่น คุณกฤษดา"
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์ *</label>
                  <Input
                    required
                    placeholder="08X-XXX-XXXX"
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">เลขบัตรประชาชน 13 หลัก</label>
                <Input
                  placeholder="X-XXXX-XXXXX-XX-X"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ยี่ห้อ</label>
                  <select
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                  >
                    <option value="Apple">Apple</option>
                    <option value="Samsung">Samsung</option>
                    <option value="Xiaomi">Xiaomi</option>
                    <option value="Oppo">Oppo</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">รุ่นอุปกรณ์ *</label>
                  <Input
                    required
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">IMEI *</label>
                <Input
                  required
                  value={imei}
                  onChange={(e) => setImei(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">เงินต้นกู้ยืม (บาท) *</label>
                  <Input
                    type="number"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(Number(e.target.value))}
                    className="text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ดอกเบี้ย (%/เดือน)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={interestRate}
                    onChange={(e) => setInterestRate(Number(e.target.value))}
                    className="text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ระยะสัญญา (เดือน)</label>
                  <select
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(Number(e.target.value))}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                  >
                    <option value={1}>1 เดือน</option>
                    <option value={2}>2 เดือน</option>
                    <option value={3}>3 เดือน</option>
                  </select>
                </div>
              </div>

              {/* Calculator Summary */}
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs flex justify-between items-center">
                <div>
                  <span className="text-slate-500">เงินต้น: {formatTHB(loanAmount)}</span>
                  <div className="text-[11px] text-slate-500">อัตราดอกเบี้ย {interestRate}% ต่อเดือน</div>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 text-[11px]">ดอกเบี้ยที่ต้องชำระต่องวด</span>
                  <div className="text-base font-black text-purple-800 font-mono">
                    {formatTHB((loanAmount * interestRate) / 100)}/เดือน
                  </div>
                </div>
              </div>

              {formError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{formError}</div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowNewModal(false)} className="text-xs">
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={busy} className="text-xs bg-purple-600 hover:bg-purple-700 text-white">
                  {busy ? "กำลังบันทึก..." : "บันทึกสัญญาจำนำ"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
