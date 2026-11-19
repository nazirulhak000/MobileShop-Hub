"use client";

import React, { useState, useMemo } from "react";
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
import { formatTHB, formatDateThai } from "@/lib/utils";

interface SaleLedgerItem {
  id: string;
  invoiceNo: string;
  createdAt: string;
  branchCode: string;
  customerName: string;
  customerPhone?: string;
  cashierName: string;
  paymentMethod: "CASH" | "PROMPTPAY" | "CARD" | "SPLIT";
  totalAmount: number;
  discount: number;
  netAmount: number;
  status: "COMPLETED" | "VOID" | "PARTIAL_REFUND";
  items: Array<{ name: string; qty: number; unitPrice: number; subtotal: number; imei?: string }>;
}

export default function SalesHistoryPage() {
  const { currentBranch } = useApp();
  const [sales, setSales] = useState<SaleLedgerItem[]>([
    {
      id: "s1",
      invoiceNo: "INV-202611-0001",
      createdAt: "2026-11-19T14:30:00Z",
      branchCode: "HQ",
      customerName: "คุณธนกร รัตนสิทธิ",
      customerPhone: "081-234-5678",
      cashierName: "น้องแพรว แคชเชียร์",
      paymentMethod: "PROMPTPAY",
      totalAmount: 14900,
      discount: 0,
      netAmount: 14900,
      status: "COMPLETED",
      items: [
        { name: "iPhone 13 128GB Midnight (เกรด A)", qty: 1, unitPrice: 14900, subtotal: 14900, imei: "354928110293847" },
      ],
    },
    {
      id: "s2",
      invoiceNo: "INV-202611-0002",
      createdAt: "2026-11-19T15:10:00Z",
      branchCode: "HQ",
      customerName: "ลูกค้าทั่วไป (Walk-in)",
      cashierName: "น้องแพรว แคชเชียร์",
      paymentMethod: "CASH",
      totalAmount: 940,
      discount: 50,
      netAmount: 890,
      status: "COMPLETED",
      items: [
        { name: "หัวชาร์จเร็ว Anker 30W Nano II PD Fast Charger", qty: 1, unitPrice: 690, subtotal: 690 },
        { name: "สายชาร์จถัก Remax Type-C to Lightning 1.2m", qty: 1, unitPrice: 250, subtotal: 250 },
      ],
    },
    {
      id: "s3",
      invoiceNo: "INV-202611-0003",
      createdAt: "2026-11-19T15:45:00Z",
      branchCode: "HQ",
      customerName: "คุณพิมพ์ชนก สิริพร",
      customerPhone: "089-876-5432",
      cashierName: "สมชาย ผู้จัดการใหญ่",
      paymentMethod: "CARD",
      totalAmount: 23900,
      discount: 500,
      netAmount: 23400,
      status: "COMPLETED",
      items: [
        { name: "iPhone 14 Pro 256GB Deep Purple (เกรด A)", qty: 1, unitPrice: 23900, subtotal: 23900, imei: "358765098123456" },
      ],
    },
    {
      id: "s4",
      invoiceNo: "INV-202611-0004",
      createdAt: "2026-11-18T11:20:00Z",
      branchCode: "BR-02",
      customerName: "คุณอนันต์ พัฒนเดช",
      cashierName: "น้องก้อย แคชเชียร์",
      paymentMethod: "CASH",
      totalAmount: 1890,
      discount: 0,
      netAmount: 1890,
      status: "VOID", // Voided/Refunded
      items: [
        { name: "เคสกันกระแทก UAG Monarch Kevlar iPhone 14 Pro Max", qty: 1, unitPrice: 1890, subtotal: 1890 },
      ],
    },
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Selected Sale for 80mm Reprint
  const [selectedSale, setSelectedSale] = useState<SaleLedgerItem | null>(null);
  const [reprintModalOpen, setReprintModalOpen] = useState(false);

  // Refund Modal
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [saleToRefund, setSaleToRefund] = useState<SaleLedgerItem | null>(null);
  const [refundReason, setRefundReason] = useState("สินค้ามีปัญหา / ลูกค้าขอเปลี่ยนคืน");
  const [restockInventory, setRestockInventory] = useState(true);

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      if (methodFilter !== "ALL" && s.paymentMethod !== methodFilter) return false;
      if (statusFilter !== "ALL" && s.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.invoiceNo.toLowerCase().includes(q) ||
          s.customerName.toLowerCase().includes(q) ||
          s.cashierName.toLowerCase().includes(q) ||
          s.items.some((i) => i.name.toLowerCase().includes(q) || i.imei?.includes(q))
        );
      }
      return true;
    });
  }, [sales, methodFilter, statusFilter, searchQuery]);

  const handleProcessRefund = () => {
    if (!saleToRefund) return;
    setSales((prev) =>
      prev.map((s) => (s.id === saleToRefund.id ? { ...s, status: "VOID" } : s))
    );
    alert(
      `ดำเนินการยกเลิก/คืนเงินบิล ${saleToRefund.invoiceNo} เรียบร้อยแล้ว (ยอดเงินคืน: ${formatTHB(
        saleToRefund.netAmount
      )})${restockInventory ? " และคืนสินค้าเข้าสต็อกแล้ว" : ""}`
    );
    setRefundModalOpen(false);
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
                placeholder="ค้นหาเลขที่ใบเสร็จ, ลูกค้า, สินค้า..."
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
              {filteredSales.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="p-3">
                    <div className="font-bold text-slate-900">{s.invoiceNo}</div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      {formatDateThai(s.createdAt)}
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

                      {s.status === "COMPLETED" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSaleToRefund(s);
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

      {/* REPRINT 80MM SLIP MODAL */}
      <Dialog open={reprintModalOpen} onOpenChange={setReprintModalOpen}>
        <div className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle onClose={() => setReprintModalOpen(false)}>
              พิมพ์ใบเสร็จซ้ำ (Reprint 80mm Slip)
            </DialogTitle>
          </DialogHeader>
          <DialogContent className="p-4 bg-slate-100 flex justify-center">
            {selectedSale && (
              <div className="thermal-80mm bg-white border border-slate-300 p-4 text-xs font-mono space-y-2 rounded shadow-sm text-slate-900">
                <div className="text-center border-b border-dashed border-slate-400 pb-2">
                  <div className="font-extrabold text-sm">MOBILESHOP HUB</div>
                  <div className="text-[10px]">{currentBranch.name}</div>
                  <div className="text-[10px] font-bold mt-1 text-rose-600">[ ใบพิมพ์ซ้ำ / REPRINT ]</div>
                </div>
                <div className="text-[10px] space-y-0.5 border-b border-dashed border-slate-400 pb-2">
                  <div className="flex justify-between">
                    <span>เลขที่: {selectedSale.invoiceNo}</span>
                    <span>{formatDateThai(selectedSale.createdAt)}</span>
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
            <Button size="sm" onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
              <Printer className="h-4 w-4" />
              <span>พิมพ์สลิป</span>
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* VOID / REFUND CONFIRMATION MODAL */}
      <Dialog open={refundModalOpen} onOpenChange={setRefundModalOpen}>
        <DialogHeader>
          <DialogTitle onClose={() => setRefundModalOpen(false)}>
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
                <option value="สินค้ามีปัญหา / ลูกค้าขอเปลี่ยนคืน">สินค้ามีปัญหา / ลูกค้าขอเปลี่ยนคืน</option>
                <option value="แคชเชียร์สแกนสินค้าผิด / ผิดราคา">แคชเชียร์สแกนสินค้าผิด / ผิดราคา</option>
                <option value="ลูกค้าเปลี่ยนใจก่อนรับสินค้า">ลูกค้าเปลี่ยนใจก่อนรับสินค้า</option>
                <option value="ระบบรับชำระเงินขัดข้อง">ระบบรับชำระเงินขัดข้อง</option>
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-lg border border-slate-200 bg-slate-50">
              <input
                type="checkbox"
                checked={restockInventory}
                onChange={(e) => setRestockInventory(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="font-semibold text-slate-800">
                นำสินค้าและเครื่อง IMEI กลับเข้าสต็อกร้านอัตโนมัติ (Restock)
              </span>
            </label>
          </DialogContent>
        )}
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setRefundModalOpen(false)}>
            ยกเลิก
          </Button>
          <Button size="sm" onClick={handleProcessRefund} className="bg-rose-600 hover:bg-rose-700 text-white font-bold">
            ยืนยันคืนเงิน & ยกเลิกบิล
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
