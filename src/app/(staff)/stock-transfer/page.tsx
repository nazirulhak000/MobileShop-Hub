"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  XCircle,
  RefreshCw,
  Send,
  Boxes,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { formatDateThai } from "@/lib/utils";
import { useApp } from "@/context/AppContext";

export interface TransferRecord {
  id: string;
  transferNo: string;
  sourceBranchId: string;
  sourceBranchCode: string;
  sourceBranchName: string;
  destBranchId: string;
  destBranchCode: string;
  destBranchName: string;
  items: Array<{
    productId: string;
    productName?: string;
    productCode?: string;
    quantity: number;
    imeiIds?: string[];
    imeis?: string[];
  }>;
  status: "PENDING" | "IN_TRANSIT" | "RECEIVED" | "REJECTED" | "CANCELLED";
  requestedBy: string;
  dispatchedBy?: string;
  receivedBy?: string;
  cancelledBy?: string;
  trackingNote?: string;
  createdAt: string;
  updatedAt: string;
  dispatchedAt?: string;
  receivedAt?: string;
  cancelledAt?: string;
  history?: Array<{
    status: string;
    action: string;
    actor: string;
    time: string;
    note?: string;
  }>;
}

export default function StockTransferPage() {
  const { currentBranch, branches, currentUser } = useApp();
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("ALL");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [printTransfer, setPrintTransfer] = useState<TransferRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [fromBranchId, setFromBranchId] = useState("");
  const [toBranchId, setToBranchId] = useState("");
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [itemQty, setItemQty] = useState(1);
  const [selectedImeis, setSelectedImeis] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [initialStatus, setInitialStatus] = useState<"PENDING" | "IN_TRANSIT">("PENDING");

  // Load Transfers
  const loadTransfers = useCallback(async () => {
    try {
      setLoading(true);
      setActionError(null);
      const res = await fetch("/api/stock-transfers");
      const json = await res.json();
      if (res.ok && json.success) {
        setTransfers(json.transfers || []);
      } else {
        setActionError(json.error || "ไม่สามารถโหลดข้อมูลการโอนสินค้าได้");
      }
    } catch {
      setActionError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Products for Source Branch
  const loadBranchProducts = useCallback(async (branchId: string) => {
    if (!branchId) return;
    try {
      const b = branches.find((item) => item.id === branchId);
      const bIdent = b?.code || branchId;
      const res = await fetch(`/api/inventory?branch=${encodeURIComponent(bIdent)}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setAvailableProducts(json.products || []);
      }
    } catch (err) {
      console.error(err);
    }
  }, [branches]);

  useEffect(() => {
    loadTransfers();
  }, [loadTransfers]);

  // Set default branches when branches load
  useEffect(() => {
    if (branches.length > 0) {
      const defaultSrc = currentBranch.id || branches[0].id;
      setFromBranchId(defaultSrc);
      const destCandidate = branches.find((b) => b.id !== defaultSrc) || branches[0];
      setToBranchId(destCandidate.id);
      loadBranchProducts(defaultSrc);
    }
  }, [branches, currentBranch.id, loadBranchProducts]);

  // When source branch changes, reload products
  const handleFromBranchChange = (newSrcId: string) => {
    setFromBranchId(newSrcId);
    setSelectedProductId("");
    setSelectedImeis([]);
    loadBranchProducts(newSrcId);
    if (toBranchId === newSrcId) {
      const other = branches.find((b) => b.id !== newSrcId);
      if (other) setToBranchId(other.id);
    }
  };

  const selectedProduct = availableProducts.find((p) => p.id === selectedProductId);
  const availableStock = selectedProduct ? selectedProduct.currentStock : 0;
  const inStockImeis = (selectedProduct?.imeis || []).filter(
    (i: any) => i.status === "IN_STOCK"
  );

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromBranchId || !toBranchId) {
      alert("กรุณาเลือกสาขาต้นทางและปลายทาง");
      return;
    }
    if (fromBranchId === toBranchId) {
      alert("สาขาต้นทางและปลายทางต้องไม่เป็นสาขาเดียวกัน");
      return;
    }
    if (!selectedProductId) {
      alert("กรุณาเลือกสินค้าที่ต้องการโอนย้าย");
      return;
    }
    const qty = Math.max(1, itemQty || 1);
    if (initialStatus === "IN_TRANSIT" && qty > availableStock) {
      alert(`สต็อกสาขาต้นทางมีเพียง ${availableStock} ชิ้น ไม่พอสำหรับจัดส่ง ${qty} ชิ้น`);
      return;
    }
    if (inStockImeis.length > 0 && selectedImeis.length !== qty) {
      alert(`สินค้านี้มี IMEI ประจำเครื่อง กรุณาเลือก IMEI ให้ครบตามจำนวน (${qty} เครื่อง, เลือกแล้ว ${selectedImeis.length})`);
      return;
    }

    setSubmitting(true);
    setActionError(null);
    try {
      const res = await fetch("/api/stock-transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE",
          sourceBranchId: fromBranchId,
          destBranchId: toBranchId,
          status: initialStatus,
          items: [
            {
              productId: selectedProductId,
              quantity: qty,
              imeiIds: selectedImeis.length > 0 ? selectedImeis : undefined,
            },
          ],
          trackingNote: note.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.error || "เกิดข้อผิดพลาดในการสร้างใบโอน");
        return;
      }

      setActionSuccess(`สร้างใบโอนสินค้า ${json.transfer.transferNo} สำเร็จ`);
      setShowNewModal(false);
      setSelectedProductId("");
      setSelectedImeis([]);
      setItemQty(1);
      setNote("");
      await loadTransfers();
      loadBranchProducts(fromBranchId);
    } catch {
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อสร้างใบโอนได้");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (
    transferId: string,
    action: "DISPATCH" | "RECEIVE" | "REJECT" | "CANCEL",
    confirmMsg: string
  ) => {
    let customNote = "";
    if (action === "REJECT" || action === "CANCEL") {
      const promptRes = prompt(`${confirmMsg} (ระบุเหตุผล):`);
      if (promptRes === null) return;
      customNote = promptRes.trim();
    } else {
      if (!confirm(confirmMsg)) return;
    }

    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetch("/api/stock-transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          transferId,
          note: customNote || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setActionError(json.error || "ไม่สามารถอัปเดตสถานะได้");
        return;
      }

      setActionSuccess(json.message || "อัปเดตสถานะการโอนสินค้าเรียบร้อยแล้ว");
      await loadTransfers();
      if (fromBranchId) loadBranchProducts(fromBranchId);
    } catch {
      setActionError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    }
  };

  const filtered = transfers.filter((t) => {
    const s = search.toLowerCase();
    const matchSearch =
      !s ||
      t.transferNo.toLowerCase().includes(s) ||
      t.sourceBranchName.toLowerCase().includes(s) ||
      t.destBranchName.toLowerCase().includes(s) ||
      t.items.some(
        (i) =>
          (i.productName || "").toLowerCase().includes(s) ||
          (i.productCode || "").toLowerCase().includes(s)
      );

    const matchStatus = statusFilter === "ALL" || t.status === statusFilter;
    const matchBranch =
      selectedBranchId === "ALL" ||
      t.sourceBranchId === selectedBranchId ||
      t.destBranchId === selectedBranchId;

    return matchSearch && matchStatus && matchBranch;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-blue-600" />
            <span>ใบโอนย้ายสินค้าระหว่างสาขา (Inter-Branch Transfers)</span>
          </h1>
          <p className="text-sm text-slate-500">
            ขอเบิกและโอนย้ายอะไหล่/ตัวเครื่องข้ามสาขา ควบคุมสถานะจัดส่ง และตรวจรับเข้าคลังพร้อมตัดสต็อกจริง
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadTransfers}
            disabled={loading}
            className="text-xs h-9 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>รีเฟรช</span>
          </Button>
          <Button
            onClick={() => setShowNewModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 text-xs h-9 shadow-sm font-semibold"
          >
            <PlusCircle className="w-4 h-4" />
            <span>สร้างใบโอนสินค้าใหม่</span>
          </Button>
        </div>
      </div>

      {actionError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-6 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="ค้นหาเลขที่ใบโอน (TRF-...), สาขา, หรือชื่อสินค้า/อะไหล่..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs h-9 bg-white border-slate-200"
          />
        </div>

        <div className="md:col-span-3">
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="w-full text-xs h-9 rounded-lg border border-slate-200 bg-white px-2.5 font-medium text-slate-700"
          >
            <option value="ALL">ทุกสาขาที่เกี่ยวข้อง</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full text-xs h-9 rounded-lg border border-slate-200 bg-white px-2.5 font-medium text-slate-700"
          >
            <option value="ALL">สถานะทั้งหมด</option>
            <option value="PENDING">รอจัดส่ง (Pending)</option>
            <option value="IN_TRANSIT">กำลังจัดส่ง (In Transit)</option>
            <option value="RECEIVED">ตรวจรับเรียบร้อย (Received)</option>
            <option value="REJECTED">ส่งคืน/ปฏิเสธ (Rejected)</option>
            <option value="CANCELLED">ยกเลิก (Cancelled)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <Card className="border-slate-200 overflow-hidden shadow-xs">
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
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    กำลังโหลดข้อมูลการโอนย้ายสต็อก...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    ไม่พบรายการโอนย้ายสินค้าที่ตรงกับเงื่อนไข
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-blue-700">{item.transferNo}</div>
                      <div className="text-[11px] text-slate-400">{formatDateThai(item.createdAt)}</div>
                      {item.trackingNote && (
                        <div className="text-[10px] text-slate-500 italic mt-0.5 max-w-[180px] truncate" title={item.trackingNote}>
                          หมายเหตุ: {item.trackingNote}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-slate-900 font-semibold">{item.sourceBranchName}</div>
                      <div className="text-slate-500 text-[11px] flex items-center gap-1 font-medium">
                        <span>&rarr;</span> {item.destBranchName}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        {item.items.map((it, idx) => (
                          <div key={idx} className="font-medium text-slate-800">
                            <span>• {it.productName || it.productCode || it.productId}</span>{" "}
                            <span className="text-blue-700 font-bold">x{it.quantity}</span>
                            {it.imeis && it.imeis.length > 0 && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                IMEI: {it.imeis.join(", ")}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                      <div className="font-medium">{item.requestedBy}</div>
                      {item.dispatchedBy && (
                        <div className="text-[10px] text-slate-400">ส่งโดย: {item.dispatchedBy}</div>
                      )}
                      {item.receivedBy && (
                        <div className="text-[10px] text-emerald-600">รับโดย: {item.receivedBy}</div>
                      )}
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
                        {item.status === "PENDING" && <Clock className="w-3 h-3" />}
                        {item.status === "IN_TRANSIT" && <Truck className="w-3 h-3" />}
                        {item.status === "RECEIVED" && <CheckCircle2 className="w-3 h-3" />}
                        {item.status === "PENDING"
                          ? "รอจัดส่ง"
                          : item.status === "IN_TRANSIT"
                          ? "กำลังจัดส่ง"
                          : item.status === "RECEIVED"
                          ? "ตรวจรับเรียบร้อย"
                          : item.status === "REJECTED"
                          ? "ปฏิเสธ/ส่งคืน"
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
                              onClick={() =>
                                handleUpdateStatus(
                                  item.id,
                                  "DISPATCH",
                                  `ยืนยันตัดสต็อกสาขาต้นทาง (${item.sourceBranchName}) เพื่อจัดส่งสินค้า?`
                                )
                              }
                              className="h-7 text-xs px-2 bg-blue-600 text-white hover:bg-blue-700"
                            >
                              จัดส่งของ
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleUpdateStatus(
                                  item.id,
                                  "CANCEL",
                                  "ต้องการยกเลิกคำขอโอนสินค้านี้หรือไม่?"
                                )
                              }
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
                              onClick={() =>
                                handleUpdateStatus(
                                  item.id,
                                  "RECEIVE",
                                  `ยืนยันตรวจรับสินค้าเข้าคลังสาขาปลายทาง (${item.destBranchName})?`
                                )
                              }
                              className="h-7 text-xs px-2 bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                              ตรวจรับเข้าคลัง
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleUpdateStatus(
                                  item.id,
                                  "REJECT",
                                  "ต้องการปฏิเสธ/ส่งคืนสินค้ากลับต้นทางหรือไม่?"
                                )
                              }
                              className="h-7 text-xs px-2 text-rose-600 border-rose-200 hover:bg-rose-50"
                            >
                              ส่งคืน
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* New Transfer Modal */}
      {showNewModal && (
        <Dialog open={showNewModal} onOpenChange={() => setShowNewModal(false)}>
          <DialogContent className="max-w-lg p-0">
            <DialogHeader className="p-4 border-b border-slate-100">
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-blue-600" />
                <span>สร้างใบโอนย้ายสินค้าระหว่างสาขา</span>
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreateTransfer} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">สาขาต้นทาง *</label>
                  <select
                    value={fromBranchId}
                    onChange={(e) => handleFromBranchChange(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">สาขาปลายทาง *</label>
                  <select
                    value={toBranchId}
                    onChange={(e) => setToBranchId(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                  >
                    {branches
                      .filter((b) => b.id !== fromBranchId)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เลือกสินค้า / อะไหล่ในคลังต้นทาง *
                </label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    setSelectedImeis([]);
                  }}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                >
                  <option value="">-- เลือกสินค้า --</option>
                  {availableProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.code}] {p.name} (คงเหลือ: {p.currentStock} ชิ้น)
                    </option>
                  ))}
                </select>
              </div>

              {selectedProduct && (
                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 text-xs space-y-1">
                  <div className="flex justify-between text-slate-700">
                    <span>สต็อกพร้อมส่งที่สาขาต้นทาง:</span>
                    <span className="font-bold font-mono text-blue-700">{availableStock} ชิ้น</span>
                  </div>
                  {inStockImeis.length > 0 && (
                    <div className="pt-2 border-t border-blue-100">
                      <div className="font-semibold text-slate-800 mb-1">
                        เลือกหมายเลข IMEI ประจำเครื่อง ({selectedImeis.length}/{itemQty}):
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 max-h-28 overflow-y-auto">
                        {inStockImeis.map((im: any) => (
                          <label
                            key={im.id}
                            className={`flex items-center gap-1.5 p-1 rounded border text-[11px] font-mono cursor-pointer ${
                              selectedImeis.includes(im.id)
                                ? "bg-blue-100 border-blue-400 text-blue-900 font-bold"
                                : "bg-white border-slate-200 text-slate-700"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedImeis.includes(im.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  if (selectedImeis.length < itemQty) {
                                    setSelectedImeis([...selectedImeis, im.id]);
                                  } else {
                                    alert(`เลือกได้สูงสุด ${itemQty} เครื่องตามจำนวนที่ระบุ`);
                                  }
                                } else {
                                  setSelectedImeis(selectedImeis.filter((id) => id !== im.id));
                                }
                              }}
                              className="rounded text-blue-600"
                            />
                            <span>{im.imei}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">จำนวนที่โอน *</label>
                  <Input
                    type="number"
                    min="1"
                    max={initialStatus === "IN_TRANSIT" && availableStock > 0 ? availableStock : 1000}
                    value={itemQty}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setItemQty(val);
                      if (selectedImeis.length > val) {
                        setSelectedImeis(selectedImeis.slice(0, val));
                      }
                    }}
                    className="text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">โหมดการสร้าง</label>
                  <select
                    value={initialStatus}
                    onChange={(e) => setInitialStatus(e.target.value as any)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                  >
                    <option value="PENDING">ขอเบิกสินค้า (รอจัดส่ง)</option>
                    <option value="IN_TRANSIT">ตัดสต็อกจัดส่งทันที</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">หมายเหตุ / วิธีจัดส่ง</label>
                <Input
                  placeholder="เช่น ส่งผ่าน Grab Express (Tracking: GRB-8921) หรือพนักงานนำส่ง..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewModal(false)}
                  disabled={submitting}
                  className="text-xs"
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !selectedProductId}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  {submitting ? "กำลังบันทึก..." : "ยืนยันสร้างใบโอนสินค้า"}
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
              <Button
                size="sm"
                onClick={() => window.print()}
                className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>พิมพ์เอกสาร</span>
              </Button>
            </DialogHeader>

            <div className="p-6 bg-slate-100 flex justify-center">
              <div
                id="transfer-print"
                className="w-[320px] bg-white text-black p-4 rounded border border-slate-300 font-mono text-xs leading-snug shadow-xs space-y-2"
              >
                <div className="text-center pb-2 border-b border-dashed border-black">
                  <div className="font-bold text-sm">MobileShop Hub</div>
                  <div className="font-bold uppercase text-xs">ใบโอนย้ายสินค้าระหว่างสาขา</div>
                  <div className="text-[10px] text-gray-600 mt-1">{printTransfer.transferNo}</div>
                </div>

                <div className="py-1 text-[11px] space-y-1">
                  <div>
                    ต้นทาง: <span className="font-bold">{printTransfer.sourceBranchName}</span>
                  </div>
                  <div>
                    ปลายทาง: <span className="font-bold">{printTransfer.destBranchName}</span>
                  </div>
                  <div>วันที่: {formatDateThai(printTransfer.createdAt)}</div>
                  {printTransfer.trackingNote && (
                    <div className="text-[10px] text-gray-600">การจัดส่ง: {printTransfer.trackingNote}</div>
                  )}
                </div>

                <div className="py-2 border-t border-b border-dashed border-black">
                  <div className="font-bold mb-1">รายการสินค้า:</div>
                  {printTransfer.items.map((it, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between">
                        <span className="truncate max-w-[200px]">{it.productName || it.productCode}</span>
                        <span className="font-bold">x{it.quantity}</span>
                      </div>
                      {it.imeis && it.imeis.length > 0 && (
                        <div className="text-[9px] text-gray-600 pl-2">
                          IMEI: {it.imeis.join(", ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="pt-4 grid grid-cols-2 gap-4 text-center text-[10px]">
                  <div>
                    <div className="h-8 border-b border-black"></div>
                    <div className="mt-1 font-semibold">ผู้ส่งสินค้า ({printTransfer.dispatchedBy || printTransfer.requestedBy})</div>
                  </div>
                  <div>
                    <div className="h-8 border-b border-black"></div>
                    <div className="mt-1 font-semibold">ผู้ตรวจรับ ({printTransfer.receivedBy || "......................."})</div>
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
