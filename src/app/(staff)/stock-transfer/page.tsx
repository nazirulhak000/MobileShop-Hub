"use client";

import React, { useState, useEffect } from "react";
import { DemoBanner } from "@/components/ui/DemoBanner";
import {
  ArrowLeftRight,
  PlusCircle,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  Building2,
  Printer,
  Calendar,
  AlertCircle,
  Package,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { formatDateThai } from "@/lib/utils";
import { useApp } from "@/context/AppContext";

interface TransferItem {
  id: string;
  transferNo: string;
  sourceBranch: string;
  destBranch: string;
  items: { productName: string; quantity: number }[];
  requestedBy: string;
  createdAt: string;
  status: "PENDING" | "IN_TRANSIT" | "RECEIVED" | "REJECTED";
  trackingNote?: string;
}

// Transfer numbers follow the current Bangkok month (TRF-YYYYMM-NNN).
function bangkokMonthCode(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit" }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value ?? "0000";
  const m = parts.find((p) => p.type === "month")?.value ?? "00";
  return `${y}${m}`;
}
const TRF_PREFIX = `TRF-${bangkokMonthCode()}`;

const INITIAL_TRANSFERS: TransferItem[] = [
  {
    id: "tr-001",
    transferNo: `${TRF_PREFIX}-001`,
    sourceBranch: "HQ (สำนักงานใหญ่ สุขุมวิท)",
    destBranch: "สาขา 2 (เซ็นทรัลพระราม 9)",
    items: [
      { productName: "หน้าจอแท้ iPhone 14 Pro Max", quantity: 2 },
      { productName: "หัวชาร์จเร็ว Anker 30W Nano II", quantity: 5 },
    ],
    requestedBy: "ช่างนนท์ สายไว",
    createdAt: "2026-11-19T09:00:00",
    status: "IN_TRANSIT",
    trackingNote: "จัดส่งผ่าน Grab Express (Tracking: GRB-8921)",
  },
  {
    id: "tr-002",
    transferNo: `${TRF_PREFIX}-002`,
    sourceBranch: "สาขา 2 (เซ็นทรัลพระราม 9)",
    destBranch: "HQ (สำนักงานใหญ่ สุขุมวิท)",
    items: [
      { productName: "แบตเตอรี่แท้ Samsung S23 Ultra", quantity: 3 },
    ],
    requestedBy: "ช่างเอก มือทอง",
    createdAt: "2026-11-18T14:30:00",
    status: "RECEIVED",
    trackingNote: "รับสินค้าเข้าคลังสาขาเรียบร้อยแล้ว",
  },
];

const NOT_SAVED_MSG = "ยังไม่รองรับการบันทึก — หน้านี้เป็นโหมดตัวอย่าง ข้อมูลจะไม่ถูกเก็บในระบบ";

export default function StockTransferPage() {
  const { branches, users } = useApp();
  const [transfers, setTransfers] = useState<TransferItem[]>(INITIAL_TRANSFERS);
  const [search, setSearch] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [printTransfer, setPrintTransfer] = useState<TransferItem | null>(null);

  // Form State
  const defaultFrom = branches[0]?.name || "HQ (สำนักงานใหญ่ สุขุมวิท)";
  const defaultTo = branches[1]?.name || branches[0]?.name || "สาขา 2 (เซ็นทรัลพระราม 9)";
  const [fromBranch, setFromBranch] = useState(defaultFrom);
  const [toBranch, setToBranch] = useState(defaultTo);
  const [itemName, setItemName] = useState("หน้าจอเทียบแท้เกรด A iPhone 13");
  const [itemQty, setItemQty] = useState(2);
  const [note, setNote] = useState("");

  const handleCreateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (fromBranch === toBranch) {
      alert("สาขาต้นทางและปลายทางต้องไม่เป็นสาขาเดียวกัน");
      return;
    }
    const cleanItem = itemName.trim();
    if (!cleanItem) {
      alert("กรุณากรอกชื่อสินค้าหรืออะไหล่");
      return;
    }
    const qty = Math.max(1, itemQty || 1);
    const newSeq = String(transfers.length + 1).padStart(3, "0");
    const newTransfer: TransferItem = {
      id: `tr-${Date.now()}`,
      transferNo: `${TRF_PREFIX}-${newSeq}`,
      sourceBranch: fromBranch,
      destBranch: toBranch,
      items: [{ productName: cleanItem, quantity: qty }],
      requestedBy: users[0]?.name || "เจ้าหน้าที่สาขา",
      createdAt: new Date().toISOString(),
      status: "PENDING",
      trackingNote: note.trim() || undefined,
    };
    setTransfers([newTransfer, ...transfers]);
    setShowNewModal(false);
    setItemName("");
    setItemQty(1);
    setNote("");
  };

  const handleUpdateStatus = (id: string, newStatus: TransferItem["status"]) => {
    setTransfers((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        let trackingNote = t.trackingNote;
        if (newStatus === "IN_TRANSIT" && !trackingNote) {
          trackingNote = "อยู่ระหว่างการจัดส่งไปยังสาขาปลายทาง";
        } else if (newStatus === "RECEIVED") {
          trackingNote = "สาขาปลายทางตรวจรับสินค้าเข้าคลังเรียบร้อยแล้ว";
        } else if (newStatus === "REJECTED") {
          trackingNote = "ยกเลิกคำขอโอนย้ายสินค้า";
        }
        return { ...t, status: newStatus, trackingNote };
      })
    );
  };

  const filtered = transfers.filter((t) => {
    const s = search.toLowerCase();
    return (
      !s ||
      t.transferNo.toLowerCase().includes(s) ||
      t.sourceBranch.toLowerCase().includes(s) ||
      t.destBranch.toLowerCase().includes(s) ||
      t.items.some((i) => i.productName.toLowerCase().includes(s))
    );
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <DemoBanner message="การโอนสต็อกยังไม่ตัด/เพิ่มสต็อกจริง ใช้ปรับยอดผ่านหน้าสต็อกแทน รายการโอนในหน้านี้เป็นตัวอย่าง" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-blue-600" />
            <span>ใบโอนย้ายสินค้าระหว่างสาขา (Inter-Branch Transfers)</span>
          </h1>
          <p className="text-sm text-slate-500">
            ขอเบิกและโอนย้ายอะไหล่/ตัวเครื่องข้ามสาขา ควบคุมสถานะจัดส่ง และตรวจรับเข้าคลัง
          </p>
        </div>
        <Button
          onClick={() => setShowNewModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2 text-xs shadow-sm font-semibold"
        >
          <PlusCircle className="w-4 h-4" />
          <span>สร้างใบโอนสินค้าใหม่</span>
        </Button>
      </div>

      {/* Search Bar */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="ค้นหาเลขที่ใบโอน (TRF-...), สาขา, หรือชื่อสินค้าอะไหล่..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9 bg-slate-50 border-slate-200"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
              <tr>
                <th className="py-3 px-4">เลขที่ใบโอน / วันที่</th>
                <th className="py-3 px-4">สาขาต้นทาง &rarr; ปลายทาง</th>
                <th className="py-3 px-4">รายการสินค้าที่โอน</th>
                <th className="py-3 px-4">ผู้ทำรายการ</th>
                <th className="py-3 px-4">สถานะการโอน</th>
                <th className="py-3 px-4 text-center">การกระทำ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="font-mono font-bold text-blue-700">{item.transferNo}</div>
                    <div className="text-[11px] text-slate-400">{formatDateThai(item.createdAt)}</div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="text-slate-900 font-semibold">{item.sourceBranch}</div>
                    <div className="text-slate-500 text-[11px] flex items-center gap-1">
                      <span>&rarr;</span> {item.destBranch}
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="space-y-0.5">
                      {item.items.map((it, idx) => (
                        <div key={idx} className="font-medium text-slate-800">
                          • {it.productName} <span className="text-blue-700 font-bold">x{it.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                    {item.requestedBy}
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        item.status === "PENDING"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : item.status === "IN_TRANSIT"
                          ? "bg-blue-50 text-blue-700 border border-blue-200 animate-pulse"
                          : item.status === "RECEIVED"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {item.status === "PENDING"
                        ? "รอจัดส่ง"
                        : item.status === "IN_TRANSIT"
                        ? "กำลังจัดส่ง"
                        : item.status === "RECEIVED"
                        ? "ตรวจรับเรียบร้อย"
                        : "ยกเลิก"}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPrintTransfer(item)}
                        className="h-7 text-xs px-2 gap-1 text-slate-700"
                        title="พิมพ์ใบโอน"
                      >
                        <Printer className="w-3.5 h-3.5 text-blue-600" />
                        <span>พิมพ์</span>
                      </Button>

                      {item.status === "PENDING" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleUpdateStatus(item.id, "IN_TRANSIT")}
                            className="h-7 text-xs px-2 bg-blue-600 text-white hover:bg-blue-700"
                          >
                            จัดส่งของ
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateStatus(item.id, "REJECTED")}
                            className="h-7 text-xs px-2 text-rose-600 border-rose-200 hover:bg-rose-50"
                          >
                            ยกเลิก
                          </Button>
                        </>
                      )}

                      {item.status === "IN_TRANSIT" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleUpdateStatus(item.id, "RECEIVED")}
                            className="h-7 text-xs px-2 bg-emerald-600 text-white hover:bg-emerald-700"
                          >
                            ตรวจรับเข้าคลัง
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateStatus(item.id, "REJECTED")}
                            className="h-7 text-xs px-2 text-rose-600 border-rose-200 hover:bg-rose-50"
                          >
                            ยกเลิก
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* New Transfer Modal */}
      {showNewModal && (
        <Dialog open={showNewModal} onOpenChange={() => setShowNewModal(false)}>
          <DialogContent className="max-w-md p-0">
            <DialogHeader className="p-4 border-b border-slate-100">
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-blue-600" />
                <span>สร้างใบโอนย้ายสินค้าระหว่างสาขา</span>
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreateTransfer} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">สาขาต้นทาง</label>
                <select
                  value={fromBranch}
                  onChange={(e) => setFromBranch(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                >
                  {branches.length > 0 ? (
                    branches.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="HQ (สำนักงานใหญ่ สุขุมวิท)">HQ (สำนักงานใหญ่ สุขุมวิท)</option>
                      <option value="สาขา 2 (เซ็นทรัลพระราม 9)">สาขา 2 (เซ็นทรัลพระราม 9)</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">สาขาปลายทาง</label>
                <select
                  value={toBranch}
                  onChange={(e) => setToBranch(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                >
                  {branches.length > 0 ? (
                    branches.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="สาขา 2 (เซ็นทรัลพระราม 9)">สาขา 2 (เซ็นทรัลพระราม 9)</option>
                      <option value="HQ (สำนักงานใหญ่ สุขุมวิท)">HQ (สำนักงานใหญ่ สุขุมวิท)</option>
                    </>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อสินค้า/อะไหล่ *</label>
                  <Input
                    required
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">จำนวน *</label>
                  <Input
                    type="number"
                    min="1"
                    value={itemQty}
                    onChange={(e) => setItemQty(Number(e.target.value))}
                    className="text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">หมายเหตุ / วิธีจัดส่ง</label>
                <Input
                  placeholder="เช่น ส่งผ่าน Lalamove หรือเจ้าหน้าที่นำส่ง..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setShowNewModal(false)} className="text-xs">
                  ยกเลิก
                </Button>
                <Button type="submit" className="text-xs bg-blue-600 text-white">
                  สร้างใบโอนสินค้า
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Print Slip Modal */}
      {printTransfer && (
        <Dialog open={!!printTransfer} onOpenChange={() => setPrintTransfer(null)}>
          <DialogContent className="max-w-md p-0">
            <DialogHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <DialogTitle className="text-sm font-bold text-slate-900">
                ใบโอนย้ายสินค้า: {printTransfer.transferNo}
              </DialogTitle>
              <Button size="sm" onClick={() => window.print()} className="h-7 text-xs bg-blue-600 text-white">
                พิมพ์
              </Button>
            </DialogHeader>

            <div className="p-6 bg-slate-100 flex justify-center">
              <div
                id="transfer-print"
                className="w-[320px] bg-white text-black p-4 rounded border border-slate-300 font-mono text-xs leading-snug shadow-xs space-y-2"
              >
                <div className="text-center pb-2 border-b border-dashed border-black">
                  <div className="font-bold text-sm">MobileShop-Hub</div>
                  <div className="font-bold uppercase text-xs">ใบโอนย้ายสินค้าระหว่างสาขา</div>
                  <div className="text-[10px] text-gray-600 mt-1">{printTransfer.transferNo}</div>
                </div>

                <div className="py-1 text-[11px] space-y-1">
                  <div>ต้นทาง: <span className="font-bold">{printTransfer.sourceBranch}</span></div>
                  <div>ปลายทาง: <span className="font-bold">{printTransfer.destBranch}</span></div>
                  <div>วันที่: {formatDateThai(printTransfer.createdAt)}</div>
                </div>

                <div className="py-2 border-t border-b border-dashed border-black">
                  <div className="font-bold mb-1">รายการสินค้า:</div>
                  {printTransfer.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span className="truncate max-w-[200px]">{it.productName}</span>
                      <span className="font-bold">x{it.quantity}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-4 grid grid-cols-2 gap-4 text-center text-[10px]">
                  <div>
                    <div className="h-8 border-b border-black"></div>
                    <div className="mt-1">ผู้ส่งสินค้า</div>
                  </div>
                  <div>
                    <div className="h-8 border-b border-black"></div>
                    <div className="mt-1">ผู้รับสินค้าปลายทาง</div>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
