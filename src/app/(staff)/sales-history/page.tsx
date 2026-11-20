"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Receipt,
  Search,
  Printer,
  RotateCcw,
  Building2,
  Calendar,
  CheckCircle2,
  CreditCard,
  QrCode,
  Banknote,
  Split,
  Eye,
  Filter,
  ArrowRight,
  User,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { formatTHB } from "@/lib/utils";

interface SaleLedgerItem {
  id: string;
  invoiceNo: string;
  createdAt: string;
  branchCode: string;
  customerName: string;
  customerPhone?: string;
  cashierName: string;
  paymentMethod: string;
  totalAmount: number;
  discount: number;
  netAmount: number;
  status: string;
  items: Array<{ name: string; qty: number; unitPrice: number; subtotal: number; imei?: string }>;
}

const VOID_REASONS = [
  "สินค้ามีปัญหา / ลูกค้าขอเปลี่ยนคืน",
  "แคชเชียร์สแกนสินค้าผิด / ผิดราคา",
  "ลูกค้าเปลี่ยนใจก่อนรับสินค้า",
  "ระบบรับชำระเงินขัดข้อง",
];

// Map an /api/sales row to the ledger shape used by this page.
function toLedger(s: any): SaleLedgerItem {
  return {
    id: s.id,
    invoiceNo: s.invoiceNo,
    createdAt: s.createdAt,
    branchCode: s.branch?.code ?? "",
    customerName: s.customer?.name ?? "ลูกค้าทั่วไป (Walk-in)",
    customerPhone: s.customer?.phone ?? undefined,
    cashierName: s.cashier?.name ?? "-",
    paymentMethod: s.paymentMethod,
    totalAmount: s.totalAmount,
    discount: s.discount,
    netAmount: s.netAmount,
    status: s.status,
    items: (s.items ?? []).map((it: any) => ({
      name: it.product?.name ?? "-",
      qty: it.quantity,
      unitPrice: it.unitPrice,
      subtotal: it.subtotal,
      imei: it.imei ?? undefined,
    })),
  };
}

const formatBkk = (d: string) => new Date(d).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" });

export default function SalesHistoryPage() {
  const { currentBranch, currentUser } = useApp();
  const canVoid = currentUser.role === "ADMIN" || currentUser.role === "MANAGER";
  const [sales, setSales] = useState<SaleLedgerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Selected Sale for Reprint
  const [selectedSale, setSelectedSale] = useState<SaleLedgerItem | null>(null);
  const [reprintModalOpen, setReprintModalOpen] = useState(false);
  const [reprintSlipWidth, setReprintSlipWidth] = useState<"80mm" | "58mm">("80mm");

  // Refund Modal
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [saleToRefund, setSaleToRefund] = useState<SaleLedgerItem | null>(null);
  const [refundReason, setRefundReason] = useState(VOID_REASONS[0]);
  const [refundNote, setRefundNote] = useState("");
  const [refundBusy, setRefundBusy] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const loadSales = useCallback(async () => {
    if (!currentBranch.code) return;
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({ branch: currentBranch.code, take: "300" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/sales?${params.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.error || "โหลดประวัติการขายไม่สำเร็จ");
      setSales((json.data as any[]).map(toLedger));
    } catch (err: any) {
      setLoadError(err?.message || "โหลดประวัติการขายไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [currentBranch.code, debouncedSearch]);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  // Payment method / status are filtered client-side so the stat cards always reflect all loaded bills.
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      if (methodFilter !== "ALL" && s.paymentMethod !== methodFilter) return false;
      if (statusFilter !== "ALL" && s.status !== statusFilter) return false;
      return true;
    });
  }, [sales, methodFilter, statusFilter]);

  const finalReason = refundNote.trim() ? `${refundReason} - ${refundNote.trim()}` : refundReason;

  const handleProcessRefund = async () => {
    if (!saleToRefund || refundBusy) return;
    if (finalReason.trim().length < 3) {
      setRefundError("กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร");
      return;
    }
    setRefundBusy(true);
    setRefundError(null);
    try {
      const res = await fetch(`/api/sales/${encodeURIComponent(saleToRefund.id)}/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: finalReason }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.error || "ยกเลิกบิลไม่สำเร็จ");
      setNotice(
        `ยกเลิก/คืนเงินบิล ${saleToRefund.invoiceNo} เรียบร้อย (ยอดเงินคืน: ${formatTHB(saleToRefund.netAmount)}) และคืนสินค้าเข้าสต็อกแล้ว`
      );
      setRefundModalOpen(false);
      setRefundNote("");
      await loadSales();
    } catch (err: any) {
      setRefundError(err?.message || "ยกเลิกบิลไม่สำเร็จ");
    } finally {
      setRefundBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              ประวัติการขายหน้าร้าน (Sales History & Invoice Ledger)
            </h1>
            <Badge variant="outline" className="border-blue-300 bg-blue-50/50 text-blue-700 font-medium">
              <Building2 className="mr-1 h-3 w-3 inline" />
              {currentBranch.name}
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            สมุดบันทึกรายการขายหน้าร้าน พิมพ์สลิปความร้อน 80mm ซ้ำ และทำรายการคืนเงิน/ยกเลิกบิลขาย
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/refunds">
            <Button variant="outline" size="sm" className="text-xs gap-1.5 border-rose-300 text-rose-700 hover:bg-rose-50">
              <RotateCcw className="h-4 w-4" />
              <span>ดูประวัติการคืนเงิน & ยกเลิกบิล</span>
            </Button>
          </Link>
          <Link href="/pos">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 shadow-sm">
              <Receipt className="h-4 w-4" />
              <span>เปิดหน้าจอขาย POS</span>
            </Button>
          </Link>
        </div>
      </div>

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

      {/* 4 Stat Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 space-y-1">
          <span className="text-xs font-semibold text-slate-500">ยอดขายรวมสุทธิ</span>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {formatTHB(sales.filter((s) => s.status === "COMPLETED").reduce((a, b) => a + b.netAmount, 0))}
          </div>
          <div className="text-[11px] text-slate-400">จาก {sales.filter((s) => s.status === "COMPLETED").length} บิลที่สมบูรณ์</div>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-xs font-semibold text-emerald-700">ชำระด้วยพร้อมเพย์</span>
          <div className="text-2xl font-bold font-mono text-emerald-700">
            {formatTHB(sales.filter((s) => s.paymentMethod === "PROMPTPAY" && s.status === "COMPLETED").reduce((a, b) => a + b.netAmount, 0))}
          </div>
          <div className="text-[11px] text-slate-400">QR Code เงินเข้าบัญชีทันที</div>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-xs font-semibold text-blue-700">ชำระด้วยบัตรเครดิต</span>
          <div className="text-2xl font-bold font-mono text-blue-700">
            {formatTHB(sales.filter((s) => s.paymentMethod === "CARD" && s.status === "COMPLETED").reduce((a, b) => a + b.netAmount, 0))}
          </div>
          <div className="text-[11px] text-slate-400">ผ่านเครื่องรูด EDC</div>
        </Card>

        <Card className="p-4 space-y-1 border-rose-200 bg-rose-50/40">
          <span className="text-xs font-semibold text-rose-700">บิลที่ยกเลิก / คืนเงิน (Void)</span>
          <div className="text-2xl font-bold font-mono text-rose-700">
            {formatTHB(sales.filter((s) => s.status === "VOID").reduce((a, b) => a + b.netAmount, 0))}
          </div>
          <div className="text-[11px] text-rose-600">{sales.filter((s) => s.status === "VOID").length} รายการถูกยกเลิก</div>
        </Card>
      </div>

      {/* Sales Ledger Table */}
      <Card>
        <div className="border-b border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาเลขที่ใบเสร็จ, ชื่อหรือเบอร์ลูกค้า..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs"
              />
            </div>

            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 font-semibold"
            >
              <option value="ALL">ทุกวิธีชำระ</option>
              <option value="CASH">เงินสด (Cash)</option>
              <option value="PROMPTPAY">พร้อมเพย์ QR</option>
              <option value="CARD">บัตรเครดิต</option>
              <option value="SPLIT">แยกชำระ</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 font-semibold"
            >
              <option value="ALL">ทุกสถานะ</option>
              <option value="COMPLETED">สมบูรณ์ (Completed)</option>
              <option value="VOID">ยกเลิก/คืนเงิน (Void)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="p-3 text-left">เลขที่ใบเสร็จ / วันที่</th>
                <th className="p-3 text-left">ลูกค้า / แคชเชียร์</th>
                <th className="p-3 text-left">รายการสินค้า</th>
                <th className="p-3 text-center">วิธีชำระ</th>
                <th className="p-3 text-right">ยอดสุทธิ (Net)</th>
                <th className="p-3 text-center">สถานะ</th>
                <th className="p-3 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {loading && (
                <tr>
                  <td colSpan={7} className="p-6 text-center font-sans text-slate-400">กำลังโหลดประวัติการขาย...</td>
                </tr>
              )}
              {!loading && loadError && (
                <tr>
                  <td colSpan={7} className="p-6 text-center font-sans text-rose-600">
                    {loadError}{" "}
                    <button type="button" onClick={loadSales} className="font-semibold underline">
                      ลองใหม่
                    </button>
                  </td>
                </tr>
              )}
              {!loading && !loadError && filteredSales.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center font-sans text-slate-400">ไม่พบรายการขาย</td>
                </tr>
              )}
              {!loading && !loadError && filteredSales.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="p-3">
                    <div className="font-bold text-slate-900">{s.invoiceNo}</div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      {formatBkk(s.createdAt)}
                    </div>
                  </td>
                  <td className="p-3 font-sans">
                    <div className="font-semibold text-slate-800">{s.customerName}</div>
                    <div className="text-[10px] text-slate-400">แคชเชียร์: {s.cashierName}</div>
                  </td>
                  <td className="p-3 font-sans">
                    <div className="space-y-0.5">
                      {s.items.map((it, idx) => (
                        <div key={idx} className="text-slate-700 truncate max-w-xs">
                          {it.qty}x {it.name}
                          {it.imei && <span className="text-blue-600 font-mono text-[10px]"> ({it.imei.slice(-4)})</span>}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 text-center font-sans">
                    <Badge variant="outline" className="text-[10px]">
                      {s.paymentMethod}
                    </Badge>
                  </td>
                  <td className="p-3 text-right font-bold text-slate-900 text-xs">
                    {formatTHB(s.netAmount)}
                  </td>
                  <td className="p-3 text-center font-sans">
                    {s.status === "COMPLETED" ? (
                      <Badge variant="success" className="text-[10px]">
                        สำเร็จ
                      </Badge>
                    ) : (
                      <Badge variant="danger" className="text-[10px]">
                        ยกเลิก (Void)
                      </Badge>
                    )}
                  </td>
                  <td className="p-3 text-right font-sans">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setSelectedSale(s);
                          setReprintModalOpen(true);
                        }}
                        className="text-xs h-7 px-2 gap-1"
                        title="พิมพ์ใบเสร็จซ้ำ"
                      >
                        <Printer className="h-3 w-3" />
                        <span>พิมพ์ซ้ำ</span>
                      </Button>

                      {s.status === "COMPLETED" && canVoid && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSaleToRefund(s);
                            setRefundReason(VOID_REASONS[0]);
                            setRefundNote("");
                            setRefundError(null);
                            setRefundModalOpen(true);
                          }}
                          className="text-xs h-7 px-2 text-rose-600 border-rose-200 hover:bg-rose-50"
                        >
                          ยกเลิกบิล
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* REPRINT SLIP MODAL (80mm & 58mm) */}
      <Dialog open={reprintModalOpen} onOpenChange={setReprintModalOpen}>
        <div className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle onClose={() => setReprintModalOpen(false)}>
              พิมพ์ใบเสร็จซ้ำ (Reprint Thermal Slip)
            </DialogTitle>
          </DialogHeader>
          <DialogContent className="p-4 bg-slate-100 flex flex-col items-center">
            {/* Format toggle */}
            <div className="flex items-center gap-2 mb-3 bg-white p-1 rounded-xl border border-slate-300 text-xs no-print">
              <button
                type="button"
                onClick={() => setReprintSlipWidth("80mm")}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  reprintSlipWidth === "80mm" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                สลิป 80 มม.
              </button>
              <button
                type="button"
                onClick={() => setReprintSlipWidth("58mm")}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  reprintSlipWidth === "58mm" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                สลิป 58 มม.
              </button>
            </div>

            {selectedSale && (
              <div
                className={`${
                  reprintSlipWidth === "58mm" ? "thermal-58mm" : "thermal-80mm"
                } bg-white border border-slate-300 p-4 text-xs font-mono space-y-2 rounded shadow-sm text-slate-900`}
              >
                <div className="text-center border-b border-dashed border-slate-400 pb-2">
                  <div className="font-extrabold text-sm">MOBILESHOP HUB</div>
                  <div className="text-[10px]">{currentBranch.name}</div>
                  <div className="text-[10px] font-bold mt-1 text-rose-600">[ ใบพิมพ์ซ้ำ / REPRINT ]</div>
                </div>
                <div className="text-[10px] space-y-0.5 border-b border-dashed border-slate-400 pb-2">
                  <div className="flex justify-between">
                    <span>เลขที่: {selectedSale.invoiceNo}</span>
                    <span>{formatBkk(selectedSale.createdAt)}</span>
                  </div>
                  <div>ลูกค้า: {selectedSale.customerName}</div>
                  <div>แคชเชียร์: {selectedSale.cashierName}</div>
                </div>
                <div className="space-y-1 text-[10px] border-b border-dashed border-slate-400 pb-2">
                  {selectedSale.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{it.qty}x {it.name}</span>
                      <span>{formatTHB(it.subtotal)}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-1 text-[10px] border-b border-dashed border-slate-400 pb-2">
                  <div className="flex justify-between">
                    <span>ยอดรวม:</span>
                    <span>{formatTHB(selectedSale.totalAmount)}</span>
                  </div>
                  {selectedSale.discount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>ส่วนลด:</span>
                      <span>-{formatTHB(selectedSale.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-200">
                    <span>ยอดสุทธิ:</span>
                    <span>{formatTHB(selectedSale.netAmount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[9px]">
                    <span>วิธีชำระ: {selectedSale.paymentMethod}</span>
                  </div>
                </div>
                <div className="text-center text-[9px] text-slate-400 pt-1">
                  *** เอกสารพิมพ์ซ้ำเพื่อเป็นหลักฐาน ***
                </div>
              </div>
            )}
          </DialogContent>
          <DialogFooter className="flex justify-between">
            <Button variant="outline" size="sm" onClick={() => setReprintModalOpen(false)}>
              ปิด
            </Button>
            <Button
              size="sm"
              onClick={() => {
                document.body.classList.add("printing-slip");
                window.print();
                setTimeout(() => document.body.classList.remove("printing-slip"), 1000);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
            >
              <Printer className="h-4 w-4" />
              <span>พิมพ์สลิป ({reprintSlipWidth})</span>
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* VOID / REFUND CONFIRMATION MODAL */}
      <Dialog open={refundModalOpen} onOpenChange={(o) => !refundBusy && setRefundModalOpen(o)} preventClose={refundBusy}>
        <DialogHeader>
          <DialogTitle onClose={() => !refundBusy && setRefundModalOpen(false)}>
            ยกเลิกบิลขาย & คืนเงิน (Void / Refund Sale)
          </DialogTitle>
        </DialogHeader>
        {saleToRefund && (
          <DialogContent className="space-y-4 text-xs">
            <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 space-y-1 font-mono">
              <div className="flex justify-between font-bold text-slate-900">
                <span>เลขที่บิล: {saleToRefund.invoiceNo}</span>
                <span className="text-rose-700">{formatTHB(saleToRefund.netAmount)}</span>
              </div>
              <div className="text-slate-500 font-sans">ลูกค้า: {saleToRefund.customerName}</div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 mb-1 block">เหตุผลการคืนเงิน / ยกเลิกบิล *</label>
              <select
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
              >
                {VOID_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 mb-1 block">รายละเอียดเพิ่มเติม (ถ้ามี)</label>
              <input
                type="text"
                value={refundNote}
                maxLength={300}
                onChange={(e) => setRefundNote(e.target.value)}
                placeholder="เช่น เครื่องมีรอยตั้งแต่แกะกล่อง"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
              />
            </div>

            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 space-y-1">
              <div className="font-semibold text-slate-800">
                ยกเลิกทั้งบิล: สินค้าทุกรายการและเครื่อง IMEI จะถูกคืนเข้าสต็อกสาขาอัตโนมัติ
              </div>
              <div className="text-[11px] text-slate-500">ยังไม่รองรับคืนบางรายการ</div>
            </div>

            {refundError && (
              <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
                {refundError}
              </div>
            )}
          </DialogContent>
        )}
        <DialogFooter>
          <Button variant="outline" size="sm" disabled={refundBusy} onClick={() => setRefundModalOpen(false)}>
            ยกเลิก
          </Button>
          <Button
            size="sm"
            onClick={handleProcessRefund}
            disabled={refundBusy}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
          >
            {refundBusy ? "กำลังดำเนินการ..." : "ยืนยันคืนเงิน & ยกเลิกบิล"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
