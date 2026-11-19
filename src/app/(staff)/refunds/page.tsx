"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  RotateCcw,
  Search,
  Printer,
  Building2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  ArrowRight,
  PackageCheck,
  ChevronRight,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { formatTHB } from "@/lib/utils";

interface RefundRecord {
  id: string;
  originalInvoiceNo: string;
  saleDate: string;
  date: string;
  customerName: string;
  items: string;
  amount: number;
  reason: string;
  approvedBy: string;
  imeiCount: number;
}

interface SaleLookup {
  id: string;
  invoiceNo: string;
  createdAt: string;
  customerName: string;
  items: string;
  netAmount: number;
  paymentMethod: string;
}

const VOID_REASONS = [
  "สินค้ามีปัญหา / ลูกค้าขอเปลี่ยนคืน",
  "แคชเชียร์สแกนสินค้าผิด / ผิดราคา",
  "ลูกค้าเปลี่ยนใจก่อนรับสินค้า",
  "ระบบรับชำระเงินขัดข้อง",
];

const formatBkk = (d: string) => new Date(d).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" });
const itemsText = (items: any[]) =>
  (items ?? []).map((it) => `${it.product?.name ?? "-"} (${it.quantity} ชิ้น)${it.imei ? ` IMEI ${it.imei}` : ""}`).join(", ");

// Map a VOID sale from /api/sales (with voidInfo from the audit log) to a refund row.
function toRefund(s: any): RefundRecord {
  return {
    id: s.id,
    originalInvoiceNo: s.invoiceNo,
    saleDate: s.createdAt,
    date: s.voidInfo?.voidedAt ?? s.updatedAt,
    customerName: s.customer?.name ?? "ลูกค้าทั่วไป (Walk-in)",
    items: itemsText(s.items),
    amount: s.netAmount,
    reason: s.voidInfo?.reason || "-",
    approvedBy: s.voidInfo?.voidedBy?.name ?? "-",
    imeiCount: (s.items ?? []).filter((it: any) => it.imei).length,
  };
}

export default function RefundsPage() {
  const { currentBranch, currentUser } = useApp();
  const canVoid = currentUser.role === "ADMIN" || currentUser.role === "MANAGER";

  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedRefund, setSelectedRefund] = useState<RefundRecord | null>(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);

  // Create refund (full void) by invoice number
  const [createOpen, setCreateOpen] = useState(false);
  const [lookupNo, setLookupNo] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupResult, setLookupResult] = useState<SaleLookup | null>(null);
  const [reason, setReason] = useState(VOID_REASONS[0]);
  const [reasonNote, setReasonNote] = useState("");
  const [voidBusy, setVoidBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadRefunds = useCallback(async () => {
    if (!currentBranch.code) return;
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({ branch: currentBranch.code, status: "VOID", take: "300" });
      const res = await fetch(`/api/sales?${params.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.error || "โหลดรายการคืนเงินไม่สำเร็จ");
      setRefunds((json.data as any[]).map(toRefund));
    } catch (err: any) {
      setLoadError(err?.message || "โหลดรายการคืนเงินไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [currentBranch.code]);

  useEffect(() => {
    loadRefunds();
  }, [loadRefunds]);

  const totalRefundAmount = refunds.reduce((sum, r) => sum + r.amount, 0);

  const openCreate = () => {
    setLookupNo("");
    setLookupResult(null);
    setReason(VOID_REASONS[0]);
    setReasonNote("");
    setFormError(null);
    setCreateOpen(true);
  };

  const handleLookup = async () => {
    const no = lookupNo.trim();
    if (!no || lookupBusy) return;
    setLookupBusy(true);
    setFormError(null);
    setLookupResult(null);
    try {
      const params = new URLSearchParams({ branch: currentBranch.code, search: no, take: "20" });
      const res = await fetch(`/api/sales?${params.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.error || "ค้นหาบิลไม่สำเร็จ");
      const sale = (json.data as any[]).find((s) => s.invoiceNo.toLowerCase() === no.toLowerCase());
      if (!sale) throw new Error("ไม่พบบิลเลขที่นี้ในสาขาปัจจุบัน");
      if (sale.status !== "COMPLETED") throw new Error("บิลนี้ถูกยกเลิก/คืนเงินไปแล้ว");
      setLookupResult({
        id: sale.id,
        invoiceNo: sale.invoiceNo,
        createdAt: sale.createdAt,
        customerName: sale.customer?.name ?? "ลูกค้าทั่วไป (Walk-in)",
        items: itemsText(sale.items),
        netAmount: sale.netAmount,
        paymentMethod: sale.paymentMethod,
      });
    } catch (err: any) {
      setFormError(err?.message || "ค้นหาบิลไม่สำเร็จ");
    } finally {
      setLookupBusy(false);
    }
  };

  const handleVoid = async () => {
    if (!lookupResult || voidBusy) return;
    const finalReason = reasonNote.trim() ? `${reason} - ${reasonNote.trim()}` : reason;
    setVoidBusy(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/sales/${encodeURIComponent(lookupResult.id)}/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: finalReason }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.error || "คืนเงินไม่สำเร็จ");
      setNotice(`คืนเงินบิล ${lookupResult.invoiceNo} (${formatTHB(lookupResult.netAmount)}) และคืนสินค้าเข้าสต็อกเรียบร้อย`);
      setCreateOpen(false);
      await loadRefunds();
    } catch (err: any) {
      setFormError(err?.message || "คืนเงินไม่สำเร็จ");
    } finally {
      setVoidBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/sales-history" className="hover:text-blue-600 transition-colors">
          ประวัติการขาย
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-semibold text-slate-800">
          รายการคืนเงิน & ยกเลิกบิลขาย (Refunds & Voids)
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <span>ศูนย์จัดการคืนเงิน & ยกเลิกบิล (Refunds & Returns)</span>
              <span className="rounded bg-rose-100 text-rose-700 font-mono text-xs px-2 py-0.5 font-bold">
                AUDIT LOG
              </span>
            </h1>
          </div>
          <p className="text-sm text-slate-500">
            บันทึกรายการคืนเงินลูกค้า ตรวจสอบการนำสินค้าคืนคลัง (Inventory Restock) และพิมพ์ใบลดหนี้/ใบรับคืนสินค้า
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/sales-history">
            <Button variant="outline" size="sm" className="text-xs gap-1.5">
              <Receipt className="h-4 w-4" />
              <span>กลับไปประวัติการขาย</span>
            </Button>
          </Link>
          {canVoid && (
            <Button size="sm" onClick={openCreate} className="bg-rose-600 hover:bg-rose-700 text-white text-xs gap-1.5">
              <RotateCcw className="h-4 w-4" />
              <span>คืนเงิน / ยกเลิกบิล</span>
            </Button>
          )}
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

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 space-y-1">
          <span className="text-xs font-semibold text-slate-500">ยอดเงินคืนรวม (Total Refunded)</span>
          <div className="text-2xl font-bold font-mono text-rose-700">{formatTHB(totalRefundAmount)}</div>
          <div className="text-[11px] text-slate-400">จากทั้งหมด {refunds.length} บิลที่ยกเลิก</div>
        </Card>

        <Card className="p-4 space-y-1 border-emerald-200 bg-emerald-50/40">
          <span className="text-xs font-semibold text-emerald-800">คืนสินค้าเข้าคลังแล้ว (Restocked)</span>
          <div className="text-2xl font-bold font-mono text-emerald-700">
            {refunds.length} บิล
          </div>
          <div className="text-[11px] text-emerald-800">ยกเลิกทั้งบิล คืนสินค้าเข้าสต็อกอัตโนมัติทุกรายการ</div>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-xs font-semibold text-slate-500">เครื่อง IMEI คืนเข้าสต็อก</span>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {refunds.reduce((sum, r) => sum + r.imeiCount, 0)} เครื่อง
          </div>
          <div className="text-[11px] text-slate-400">ตัดของเสีย / คืนบางรายการ: ยังไม่รองรับ</div>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="p-4 border-b border-slate-100">
          <CardTitle className="text-sm">สมุดบันทึกการคืนเงิน (Refund Ledger)</CardTitle>
          <CardDescription>ประวัติการคืนเงินทุกล็อตพร้อมผู้อนุมัติ</CardDescription>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="p-3 text-left">วันที่คืนเงิน</th>
                <th className="p-3 text-left">อ้างอิงบิลเดิม</th>
                <th className="p-3 text-left">ลูกค้า</th>
                <th className="p-3 text-left">สินค้าที่คืน</th>
                <th className="p-3 text-right">ยอดเงินคืน</th>
                <th className="p-3 text-left">เหตุผล</th>
                <th className="p-3 text-center">คืนสต็อก?</th>
                <th className="p-3 text-right">สลิปคืนเงิน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {loading && (
                <tr>
                  <td colSpan={8} className="p-6 text-center font-sans text-slate-400">กำลังโหลดรายการคืนเงิน...</td>
                </tr>
              )}
              {!loading && loadError && (
                <tr>
                  <td colSpan={8} className="p-6 text-center font-sans text-rose-600">
                    {loadError}{" "}
                    <button type="button" onClick={loadRefunds} className="font-semibold underline">
                      ลองใหม่
                    </button>
                  </td>
                </tr>
              )}
              {!loading && !loadError && refunds.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center font-sans text-slate-400">ยังไม่มีรายการคืนเงิน / ยกเลิกบิล</td>
                </tr>
              )}
              {!loading && !loadError && refunds.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-900">
                    {formatBkk(r.date)}
                    <div className="text-[10px] text-slate-400 font-normal font-sans">โดย {r.approvedBy}</div>
                  </td>
                  <td className="p-3 text-blue-700 font-semibold">
                    {r.originalInvoiceNo}
                    <div className="text-[10px] text-slate-400 font-normal">ขายเมื่อ {formatBkk(r.saleDate)}</div>
                  </td>
                  <td className="p-3 font-sans text-slate-800">{r.customerName}</td>
                  <td className="p-3 font-sans text-slate-600 truncate max-w-xs">{r.items}</td>
                  <td className="p-3 text-right font-bold text-rose-700">{formatTHB(r.amount)}</td>
                  <td className="p-3 font-sans text-slate-500 text-[11px]">{r.reason}</td>
                  <td className="p-3 text-center font-sans">
                    <Badge variant="success" className="text-[10px]">คืนคลังแล้ว</Badge>
                  </td>
                  <td className="p-3 text-right font-sans">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedRefund(r);
                        setPrintModalOpen(true);
                      }}
                      className="text-xs h-7 px-2 gap-1"
                    >
                      <Printer className="h-3 w-3" />
                      <span>พิมพ์สลิป</span>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* REFUND SLIP 80MM MODAL */}
      <Dialog open={printModalOpen} onOpenChange={setPrintModalOpen}>
        <div className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle onClose={() => setPrintModalOpen(false)}>
              ใบคืนเงิน / ใบลดหนี้ (Credit Note Slip 80mm)
            </DialogTitle>
          </DialogHeader>
          <DialogContent className="p-4 bg-slate-100 flex justify-center">
            {selectedRefund && (
              <div className="thermal-80mm bg-white border border-slate-300 p-4 text-xs font-mono space-y-2 rounded shadow-sm text-slate-900">
                <div className="text-center border-b border-dashed border-slate-400 pb-2">
                  <div className="font-extrabold text-sm">MOBILESHOP HUB</div>
                  <div className="text-[10px]">{currentBranch.name}</div>
                  <div className="text-[10px] font-bold mt-1 text-rose-600">ใบลดหนี้ / ใบรับคืนสินค้า (CREDIT NOTE)</div>
                </div>
                <div className="text-[10px] space-y-0.5 border-b border-dashed border-slate-400 pb-2">
                  <div>อ้างอิงใบเสร็จเดิม: {selectedRefund.originalInvoiceNo}</div>
                  <div>วันที่คืนเงิน: {formatBkk(selectedRefund.date)}</div>
                  <div>ลูกค้า: {selectedRefund.customerName}</div>
                </div>
                <div className="space-y-1 text-[10px] border-b border-dashed border-slate-400 pb-2">
                  <div className="font-bold">รายการสินค้าที่รับคืน:</div>
                  <div>{selectedRefund.items}</div>
                  <div className="text-slate-500">เหตุผล: {selectedRefund.reason}</div>
                </div>
                <div className="flex justify-between font-bold text-sm text-rose-700 border-b border-dashed border-slate-400 pb-2">
                  <span>ยอดเงินคืนสุทธิ:</span>
                  <span>{formatTHB(selectedRefund.amount)}</span>
                </div>
                <div className="pt-3 text-[10px] text-center space-y-2 text-slate-500">
                  <div>อนุมัติโดย: {selectedRefund.approvedBy}</div>
                  <div>ลงชื่อลูกค้า: .......................................</div>
                </div>
              </div>
            )}
          </DialogContent>
          <DialogFooter className="flex justify-between">
            <Button variant="outline" size="sm" onClick={() => setPrintModalOpen(false)}>
              ปิด
            </Button>
            <Button size="sm" onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
              <Printer className="h-4 w-4" />
              <span>พิมพ์สลิป 80mm</span>
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* CREATE REFUND (FULL VOID) MODAL */}
      <Dialog open={createOpen} onOpenChange={(o) => !voidBusy && setCreateOpen(o)} preventClose={voidBusy}>
        <DialogHeader>
          <DialogTitle onClose={() => !voidBusy && setCreateOpen(false)}>คืนเงิน / ยกเลิกบิลขาย (ทั้งบิล)</DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-slate-700 mb-1 block">เลขที่ใบเสร็จ *</label>
            <div className="flex gap-2">
              <Input
                placeholder="INV-202611-0001"
                value={lookupNo}
                onChange={(e) => setLookupNo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleLookup();
                }}
                className="font-mono text-xs"
              />
              <Button variant="outline" size="sm" onClick={handleLookup} disabled={lookupBusy || !lookupNo.trim()} className="gap-1 text-xs">
                <Search className="h-3.5 w-3.5" />
                <span>{lookupBusy ? "กำลังค้นหา..." : "ค้นหา"}</span>
              </Button>
            </div>
          </div>

          {lookupResult && (
            <>
              <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 space-y-1 font-mono">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>เลขที่บิล: {lookupResult.invoiceNo}</span>
                  <span className="text-rose-700">{formatTHB(lookupResult.netAmount)}</span>
                </div>
                <div className="text-slate-500 font-sans">
                  {formatBkk(lookupResult.createdAt)} • ลูกค้า: {lookupResult.customerName} • {lookupResult.paymentMethod}
                </div>
                <div className="text-slate-600 font-sans">{lookupResult.items}</div>
              </div>
              <div>
                <label className="font-semibold text-slate-700 mb-1 block">เหตุผลการคืนเงิน *</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
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
                <Input value={reasonNote} maxLength={300} onChange={(e) => setReasonNote(e.target.value)} className="text-xs" />
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-slate-600">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>คืนเงินเต็มจำนวนทั้งบิล และคืนสินค้า/เครื่อง IMEI ทุกรายการเข้าสต็อก (ยังไม่รองรับคืนบางรายการ)</span>
              </div>
            </>
          )}

          {formError && (
            <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
              {formError}
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" size="sm" disabled={voidBusy} onClick={() => setCreateOpen(false)}>
            ยกเลิก
          </Button>
          <Button
            size="sm"
            onClick={handleVoid}
            disabled={!lookupResult || voidBusy}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
          >
            {voidBusy ? "กำลังดำเนินการ..." : "ยืนยันคืนเงิน & ยกเลิกบิล"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
