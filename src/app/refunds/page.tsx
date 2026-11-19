"use client";

import React, { useState } from "react";
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
import { formatTHB, formatDateThai } from "@/lib/utils";

interface RefundRecord {
  id: string;
  refundNo: string;
  originalInvoiceNo: string;
  date: string;
  customerName: string;
  items: string;
  amount: number;
  reason: string;
  approvedBy: string;
  restocked: boolean;
}

export default function RefundsPage() {
  const { currentBranch } = useApp();

  const [refunds, setRefunds] = useState<RefundRecord[]>([
    {
      id: "ref-1",
      refundNo: "REF-202611-0001",
      originalInvoiceNo: "INV-202611-0004",
      date: "2026-11-18 11:45",
      customerName: "คุณอนันต์ พัฒนเดช",
      items: "เคสกันกระแทก UAG Monarch Kevlar iPhone 14 Pro Max (1 ชิ้น)",
      amount: 1890,
      reason: "ลูกค้าซื้อผิดรุ่น ต้องการเปลี่ยนเป็น 15 Pro",
      approvedBy: "สมชาย ผู้จัดการใหญ่",
      restocked: true,
    },
    {
      id: "ref-2",
      refundNo: "REF-202610-0012",
      originalInvoiceNo: "INV-202610-0095",
      date: "2026-10-30 16:20",
      customerName: "คุณวรวิทย์ พัฒนากุล",
      items: "สายชาร์จถัก Remax Type-C to Lightning (1 ชิ้น)",
      amount: 250,
      reason: "หัวต่อหลวม ไฟไม่เข้า ชำรุดตั้งแต่เปิดกล่อง (เคลมตัวใหม่)",
      approvedBy: "น้องแพรว แคชเชียร์",
      restocked: false, // Defect not restocked
    },
  ]);

  const [selectedRefund, setSelectedRefund] = useState<RefundRecord | null>(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);

  const totalRefundAmount = refunds.reduce((sum, r) => sum + r.amount, 0);

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

        <Link href="/sales-history">
          <Button variant="outline" size="sm" className="text-xs gap-1.5">
            <Receipt className="h-4 w-4" />
            <span>กลับไปประวัติการขาย</span>
          </Button>
        </Link>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 space-y-1">
          <span className="text-xs font-semibold text-slate-500">ยอดเงินคืนรวม (Total Refunded)</span>
          <div className="text-2xl font-bold font-mono text-rose-700">{formatTHB(totalRefundAmount)}</div>
          <div className="text-[11px] text-slate-400">จากทั้งหมด {refunds.length} รายการ</div>
        </Card>

        <Card className="p-4 space-y-1 border-emerald-200 bg-emerald-50/40">
          <span className="text-xs font-semibold text-emerald-800">คืนสินค้าเข้าคลังแล้ว (Restocked)</span>
          <div className="text-2xl font-bold font-mono text-emerald-700">
            {refunds.filter((r) => r.restocked).length} รายการ
          </div>
          <div className="text-[11px] text-emerald-800">เพิ่มจำนวนกลับเข้าสต็อกอัตโนมัติ</div>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-xs font-semibold text-slate-500">ของชำรุดตัดทิ้ง (Defect Write-off)</span>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {refunds.filter((r) => !r.restocked).length} รายการ
          </div>
          <div className="text-[11px] text-slate-400">ส่งเคลมผู้ผลิต / ตัดขาดทุน</div>
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
                <th className="p-3 text-left">เลขที่ใบคืนเงิน</th>
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
              {refunds.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-900">
                    {r.refundNo}
                    <div className="text-[10px] text-slate-400 font-normal">{r.date}</div>
                  </td>
                  <td className="p-3 text-blue-700 font-semibold">{r.originalInvoiceNo}</td>
                  <td className="p-3 font-sans text-slate-800">{r.customerName}</td>
                  <td className="p-3 font-sans text-slate-600 truncate max-w-xs">{r.items}</td>
                  <td className="p-3 text-right font-bold text-rose-700">{formatTHB(r.amount)}</td>
                  <td className="p-3 font-sans text-slate-500 text-[11px]">{r.reason}</td>
                  <td className="p-3 text-center font-sans">
                    {r.restocked ? (
                      <Badge variant="success" className="text-[10px]">คืนคลังแล้ว</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-slate-400">ของเสีย</Badge>
                    )}
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
                  <div>เลขที่ใบคืน: {selectedRefund.refundNo}</div>
                  <div>อ้างอิงใบเสร็จเดิม: {selectedRefund.originalInvoiceNo}</div>
                  <div>วันที่: {selectedRefund.date}</div>
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
    </div>
  );
}
