"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import {
  History,
  Search,
  Printer,
  Smartphone,
  Eye,
  HandCoins,
  ShieldCheck,
  PlusCircle,
  Truck,
  CheckCircle2,
  PackageCheck,
  AlertCircle,
  Clock,
  XCircle,
  Building2,
  DollarSign,
  Filter,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { formatTHB, formatDateThai } from "@/lib/utils";
import { useApp } from "@/context/AppContext";

export default function PurchaseHistoryLedgerPage() {
  const { currentBranch } = useApp();
  const [activeTab, setActiveTab] = useState<"PO" | "BUYBACK">("PO");

  // ==========================================
  // TAB 1: PURCHASE ORDERS (SUPPLIER PO)
  // ==========================================
  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loadingPo, setLoadingPo] = useState(true);

  // Filters
  const [poSearch, setPoSearch] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterPayment, setFilterPayment] = useState("ALL");
  const [filterDate, setFilterDate] = useState("ALL");

  // Modals
  const [printPo, setPrintPo] = useState<any | null>(null);
  const [receiveModalPo, setReceiveModalPo] = useState<any | null>(null);
  const [deviceImeisInput, setDeviceImeisInput] = useState<Record<string, string>>({});
  const [receivingSubmitting, setReceivingSubmitting] = useState(false);
  const [receiveError, setReceiveError] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const fetchPurchases = async () => {
    try {
      setLoadingPo(true);
      const params = new URLSearchParams();
      if (poSearch) params.set("search", poSearch);
      if (filterSupplier !== "ALL") params.set("supplierId", filterSupplier);
      if (filterStatus !== "ALL") params.set("status", filterStatus);
      if (filterPayment !== "ALL") params.set("paymentStatus", filterPayment);

      const res = await fetch(`/api/purchases?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setPurchases(data.purchases || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPo(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetch("/api/suppliers");
      const data = await res.json();
      if (res.ok && data.success) {
        setSuppliers(data.suppliers || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPurchases();
    fetchSuppliers();
  }, [poSearch, filterSupplier, filterStatus, filterPayment]);

  // Open Receive Shipment Modal
  const handleOpenReceiveModal = (po: any) => {
    setReceiveModalPo(po);
    setReceiveError("");
    // Init IMEI inputs for DEVICE items
    const initImeis: Record<string, string> = {};
    po.items?.forEach((it: any) => {
      if (it.category === "DEVICE") {
        initImeis[it.id] = "";
      }
    });
    setDeviceImeisInput(initImeis);
  };

  // Submit Receive Shipment (Atomic stock credit & IMEI registration)
  const handleConfirmReceiveShipment = async () => {
    if (!receiveModalPo || receivingSubmitting) return;
    setReceiveError("");

    // Prepare item IMEIs map
    const itemImeis: Record<string, string[]> = {};
    for (const it of receiveModalPo.items || []) {
      if (it.category === "DEVICE") {
        const rawText = deviceImeisInput[it.id] || "";
        const imeis = rawText
          .split(/[\n,]/)
          .map((s) => s.trim())
          .filter(Boolean);

        if (imeis.length < it.quantity) {
          setReceiveError(
            `กรุณาระบุเลข IMEI ให้ครบตามจำนวนสินค้า (${it.productName}: ต้องการ ${it.quantity} เครื่อง, ระบุแล้ว ${imeis.length} เครื่อง)`
          );
          return;
        }
        itemImeis[it.id] = imeis.slice(0, it.quantity);
      }
    }

    setReceivingSubmitting(true);
    try {
      const res = await fetch("/api/purchases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: receiveModalPo.id,
          action: "RECEIVE",
          itemImeis,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setReceiveError(data.error || "ตรวจรับสินค้าไม่สำเร็จ");
        return;
      }

      confetti({ particleCount: 110, spread: 70 });
      setReceiveModalPo(null);
      showToast(`ตรวจรับสินค้าเข้าสต็อกเรียบร้อย (PO: ${receiveModalPo.poNumber})`);
      fetchPurchases();
    } catch (err) {
      console.error(err);
      setReceiveError("เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ");
    } finally {
      setReceivingSubmitting(false);
    }
  };

  // Quick Action: Send Order to Supplier
  const handleSendOrder = async (po: any) => {
    try {
      const res = await fetch("/api/purchases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: po.id, action: "ORDER" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`ส่งใบสั่งซื้อ ${po.poNumber} ถึงซัพพลายเออร์แล้ว`);
        fetchPurchases();
      } else {
        alert(data.error || "ทำรายการไม่สำเร็จ");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Quick Action: Mark Paid
  const handleTogglePayment = async (po: any) => {
    const nextStatus = po.paymentStatus === "PAID" ? "PENDING" : "PAID";
    try {
      const res = await fetch("/api/purchases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: po.id, action: "PAYMENT", paymentStatus: nextStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`อัปเดตสถานะชำระเงินเป็น ${nextStatus}`);
        fetchPurchases();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Quick Action: Cancel PO
  const handleCancelPo = async (po: any) => {
    if (!confirm(`คุณต้องการยกเลิกใบสั่งซื้อ ${po.poNumber} หรือไม่?`)) return;
    try {
      const res = await fetch("/api/purchases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: po.id, action: "CANCEL" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`ยกเลิกใบสั่งซื้อ ${po.poNumber} สำเร็จ`);
        fetchPurchases();
      } else {
        alert(data.error || "ยกเลิกไม่สำเร็จ");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================
  // TAB 2: BUYBACK CONTRACTS (CUSTOMER)
  // ==========================================
  const [contracts, setContracts] = useState<any[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(true);
  const [buybackSearch, setBuybackSearch] = useState("");
  const [printContract, setPrintContract] = useState<any | null>(null);

  const fetchBuybacks = async () => {
    try {
      setLoadingContracts(true);
      const res = await fetch("/api/trade-in?type=BUYBACK");
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setContracts(json.contracts || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingContracts(false);
    }
  };

  useEffect(() => {
    if (activeTab === "BUYBACK") {
      fetchBuybacks();
    }
  }, [activeTab]);

  const filteredContracts = contracts.filter((c) => {
    const s = buybackSearch.toLowerCase();
    return (
      !s ||
      c.contractNo.toLowerCase().includes(s) ||
      c.customer?.name.toLowerCase().includes(s) ||
      c.customer?.phone.includes(s) ||
      c.imei.includes(s) ||
      c.deviceModel.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-700 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs font-medium animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <History className="w-6 h-6 text-blue-600" />
            <span>ประวัติการจัดซื้อ & ทะเบียนรับเข้า (Purchasing & Buyback History)</span>
          </h1>
          <p className="text-sm text-slate-500">
            ตรวจสอบสถานะใบสั่งซื้อสินค้า (PO) ตรวจรับของเข้าสต็อก และสมุดทะเบียนสัญญาซื้อเครื่องมือสอง
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/purchase">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 text-xs shadow-sm font-semibold">
              <PlusCircle className="w-4 h-4" />
              <span>สร้างใบสั่งซื้อ PO ใหม่</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Top Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("PO")}
          className={`py-2.5 px-5 font-bold text-xs border-b-2 flex items-center gap-2 transition-all ${
            activeTab === "PO"
              ? "border-blue-600 text-blue-600 bg-blue-50/50"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>1. ใบสั่งซื้อสินค้าจากซัพพลายเออร์ ({purchases.length} รายการ)</span>
        </button>
        <button
          onClick={() => setActiveTab("BUYBACK")}
          className={`py-2.5 px-5 font-bold text-xs border-b-2 flex items-center gap-2 transition-all ${
            activeTab === "BUYBACK"
              ? "border-purple-600 text-purple-600 bg-purple-50/50"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>2. สมุดทะเบียนรับซื้อเครื่องมือสอง ({contracts.length} สัญญา)</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: PURCHASE ORDERS (SUPPLIER PO) */}
      {/* ======================================================== */}
      {activeTab === "PO" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <Card className="border-slate-200">
            <CardContent className="p-3.5 flex flex-wrap items-center gap-2.5 text-xs">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="ค้นหาเลขที่ PO, ชื่อซัพพลายเออร์, รหัสสินค้า..."
                  value={poSearch}
                  onChange={(e) => setPoSearch(e.target.value)}
                  className="pl-8 text-xs h-8 bg-slate-50 border-slate-200"
                />
              </div>

              {/* Supplier Filter */}
              <select
                value={filterSupplier}
                onChange={(e) => setFilterSupplier(e.target.value)}
                className="h-8 text-xs rounded border border-slate-200 bg-white px-2.5 font-medium"
              >
                <option value="ALL">ซัพพลายเออร์ทั้งหมด</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-8 text-xs rounded border border-slate-200 bg-white px-2.5 font-medium"
              >
                <option value="ALL">สถานะจัดซื้อทั้งหมด</option>
                <option value="DRAFT">ร่าง (DRAFT)</option>
                <option value="ORDERED">สั่งซื้อแล้ว (ORDERED)</option>
                <option value="RECEIVED">รับสินค้าแล้ว (RECEIVED)</option>
                <option value="CANCELLED">ยกเลิก (CANCELLED)</option>
              </select>

              {/* Payment Status Filter */}
              <select
                value={filterPayment}
                onChange={(e) => setFilterPayment(e.target.value)}
                className="h-8 text-xs rounded border border-slate-200 bg-white px-2.5 font-medium"
              >
                <option value="ALL">สถานะชำระเงินทั้งหมด</option>
                <option value="PENDING">รอชำระ (PENDING)</option>
                <option value="PAID">ชำระแล้ว (PAID)</option>
              </select>

              <Button variant="ghost" size="sm" onClick={fetchPurchases} className="h-8 px-2.5 text-xs gap-1 text-slate-600">
                <RefreshCw className={`w-3.5 h-3.5 ${loadingPo ? "animate-spin" : ""}`} />
                <span>รีเฟรช</span>
              </Button>
            </CardContent>
          </Card>

          {/* PO Table */}
          <Card className="border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                  <tr>
                    <th className="py-3 px-4">เลขที่ PO / วันที่</th>
                    <th className="py-3 px-4">ซัพพลายเออร์ & สาขา</th>
                    <th className="py-3 px-4">รายการสินค้า</th>
                    <th className="py-3 px-4 text-center">สถานะสั่งซื้อ</th>
                    <th className="py-3 px-4 text-center">การชำระเงิน</th>
                    <th className="py-3 px-4 text-right">ยอดเงินรวม</th>
                    <th className="py-3 px-4 text-center">การกระทำ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingPo ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        กำลังโหลดข้อมูลใบสั่งซื้อ...
                      </td>
                    </tr>
                  ) : purchases.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        ไม่พบรายการใบสั่งซื้อสินค้าตามเงื่อนไข
                      </td>
                    </tr>
                  ) : (
                    purchases.map((po) => {
                      const isDraft = po.status === "DRAFT";
                      const isOrdered = po.status === "ORDERED";
                      const isReceived = po.status === "RECEIVED";
                      const isCancelled = po.status === "CANCELLED";

                      return (
                        <tr key={po.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-mono font-bold text-blue-700">{po.poNumber}</div>
                            <div className="text-[11px] text-slate-400">
                              {formatDateThai(po.orderedAt || po.createdAt)}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{po.supplierName}</div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              <span>{po.branch?.name}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4 max-w-xs">
                            <div className="font-medium text-slate-800 truncate">
                              {po.items?.map((it: any) => `${it.productName} (x${it.quantity})`).join(", ")}
                            </div>
                            <div className="text-[10px] text-slate-400">รวม {po.items?.length || 0} รายการ</div>
                          </td>

                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {isReceived ? (
                              <span className="font-bold text-[10.5px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                ตรวจรับสินค้าแล้ว
                              </span>
                            ) : isOrdered ? (
                              <span className="font-bold text-[10.5px] px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                สั่งซื้อแล้ว
                              </span>
                            ) : isDraft ? (
                              <span className="font-bold text-[10.5px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                แบบร่าง (DRAFT)
                              </span>
                            ) : (
                              <span className="font-bold text-[10.5px] px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                                ยกเลิกแล้ว
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <button
                              onClick={() => handleTogglePayment(po)}
                              className={`text-[10.5px] font-bold px-2 py-0.5 rounded cursor-pointer transition-colors ${
                                po.paymentStatus === "PAID"
                                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                  : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                              }`}
                              title="คลิกเพื่อสลับสถานะชำระเงิน"
                            >
                              {po.paymentStatus === "PAID" ? "ชำระเงินแล้ว" : "รอชำระเงิน"}
                            </button>
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-slate-900 font-mono text-sm">
                            {formatTHB(po.totalAmount)}
                          </td>

                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Print PO */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setPrintPo(po)}
                                className="h-7 text-xs px-2 text-slate-700 gap-1"
                                title="พิมพ์ใบสั่งซื้อ A4"
                              >
                                <Printer className="w-3.5 h-3.5 text-blue-600" />
                                <span>พิมพ์ PO</span>
                              </Button>

                              {/* Receive Shipment Action */}
                              {(isOrdered || isDraft) && (
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenReceiveModal(po)}
                                  className="h-7 text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white gap-1 font-semibold"
                                  title="ตรวจรับของเข้าสต็อก"
                                >
                                  <PackageCheck className="w-3.5 h-3.5" />
                                  <span>รับสินค้า</span>
                                </Button>
                              )}

                              {/* Send Order */}
                              {isDraft && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleSendOrder(po)}
                                  className="h-7 text-xs px-1.5 text-blue-600 hover:bg-blue-50"
                                  title="เปลี่ยนสถานะเป็นสั่งซื้อแล้ว"
                                >
                                  สั่งซื้อ
                                </Button>
                              )}

                              {/* Cancel */}
                              {!isReceived && !isCancelled && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleCancelPo(po)}
                                  className="h-7 text-xs px-1.5 text-rose-500 hover:bg-rose-50"
                                  title="ยกเลิกใบสั่งซื้อ"
                                >
                                  ยกเลิก
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: SECONDHAND BUYBACK CONTRACTS */}
      {/* ======================================================== */}
      {activeTab === "BUYBACK" && (
        <div className="space-y-4">
          <Card className="border-slate-200">
            <CardContent className="p-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="ค้นหาเลขที่สัญญา (TC- / PW-...), ชื่อผู้ขาย, เบอร์โทร, หรือ IMEI..."
                  value={buybackSearch}
                  onChange={(e) => setBuybackSearch(e.target.value)}
                  className="pl-9 text-xs h-9 bg-slate-50 border-slate-200"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                  <tr>
                    <th className="py-3 px-4">เลขที่สัญญา / วันที่</th>
                    <th className="py-3 px-4">ผู้ขาย & เลขบัตร ปชช.</th>
                    <th className="py-3 px-4">อุปกรณ์ & IMEI</th>
                    <th className="py-3 px-4 text-center">เกรดสภาพ</th>
                    <th className="py-3 px-4 text-right">ราคารับซื้อ (THB)</th>
                    <th className="py-3 px-4 text-center">การกระทำ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingContracts ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400">
                        กำลังโหลดทะเบียนสัญญา...
                      </td>
                    </tr>
                  ) : filteredContracts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400">
                        ไม่พบรายการสัญญาซื้อเข้า
                      </td>
                    </tr>
                  ) : (
                    filteredContracts.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-mono font-bold text-purple-700">{item.contractNo}</div>
                          <div className="text-[11px] text-slate-400">
                            {formatDateThai(item.startDate || item.createdAt)}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{item.customer?.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">โทร: {item.customer?.phone}</div>
                          <div className="text-[10px] text-slate-400 font-mono">ปชช: {item.nationalId}</div>
                        </td>

                        <td className="py-3 px-4 max-w-xs">
                          <div className="font-semibold text-slate-900 truncate">
                            {item.deviceBrand} {item.deviceModel}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">IMEI: {item.imei}</div>
                        </td>

                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className="font-bold text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                            Grade {item.conditionGrade || "A"}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-slate-900 font-mono text-sm">
                          {formatTHB(item.agreedPrice)}
                        </td>

                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPrintContract(item)}
                            className="h-7 text-xs px-2.5 gap-1 text-slate-700"
                            title="พิมพ์สัญญาซื้อขาย A4"
                          >
                            <Printer className="w-3.5 h-3.5 text-purple-600" />
                            <span>พิมพ์สัญญา A4</span>
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: RECEIVE SHIPMENT MODAL */}
      {/* ======================================================== */}
      {receiveModalPo && (
        <Dialog open={!!receiveModalPo} onOpenChange={() => setReceiveModalPo(null)}>
          <DialogContent className="max-w-xl p-0">
            <DialogHeader className="p-4 border-b border-slate-100">
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-emerald-600" />
                <span>ตรวจรับสินค้าเข้าสต็อก (Receive Shipment)</span>
              </DialogTitle>
            </DialogHeader>

            <div className="p-4 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex justify-between">
                <div>
                  <div className="font-bold text-slate-900">PO: {receiveModalPo.poNumber}</div>
                  <div className="text-slate-500">ซัพพลายเออร์: {receiveModalPo.supplierName}</div>
                </div>
                <div className="text-right">
                  <div className="text-slate-500">สาขารับของ:</div>
                  <div className="font-bold text-slate-800">{receiveModalPo.branch?.name}</div>
                </div>
              </div>

              {receiveError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{receiveError}</span>
                </div>
              )}

              <div className="space-y-3">
                <div className="font-semibold text-slate-800">รายการสินค้าที่จะเพิ่มเข้าสต็อก:</div>
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-60 overflow-y-auto">
                  {receiveModalPo.items?.map((it: any) => (
                    <div key={it.id} className="p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-bold text-slate-900">{it.productName}</div>
                          <div className="text-[11px] text-slate-500">
                            รหัส: {it.productCode} • หมวดหมู่: {it.category} • ต้นทุน: {formatTHB(it.unitCost)}
                          </div>
                        </div>
                        <div className="text-right font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded">
                          +{it.quantity} ชิ้น
                        </div>
                      </div>

                      {/* Device IMEI batch registration input */}
                      {it.category === "DEVICE" && (
                        <div className="pt-2 border-t border-slate-100 space-y-1">
                          <label className="block text-[11px] font-semibold text-purple-700">
                            ระบุเลข IMEI ตัวเครื่อง ({it.quantity} รายการ คั่นด้วยบรรทัดใหม่หรือจุลภาค) *
                          </label>
                          <textarea
                            rows={3}
                            placeholder="358912345098711&#10;358912345098712"
                            value={deviceImeisInput[it.id] || ""}
                            onChange={(e) =>
                              setDeviceImeisInput((prev) => ({ ...prev, [it.id]: e.target.value }))
                            }
                            className="w-full text-xs font-mono rounded border border-purple-200 p-2 bg-purple-50/30"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11.5px] leading-relaxed">
                <strong>หมายเหตุระบบ:</strong> เมื่อกดยืนยัน ระบบจะปรับเพิ่มจำนวนสินค้าในคลังสาขา{" "}
                <strong>{receiveModalPo.branch?.name}</strong> โดยอัตโนมัติ อัปเดตราคาต้นทุน และบันทึก IMEI
                เครื่องใหม่เข้าสู่ระบบ พร้อมออก Audit Log ทันที
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReceiveModalPo(null)}
                  disabled={receivingSubmitting}
                >
                  ยกเลิก
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmReceiveShipment}
                  disabled={receivingSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>{receivingSubmitting ? "กำลังบันทึกสต็อก..." : "ยืนยันตรวจรับสินค้าเข้าสต็อก"}</span>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: PRINT PO SLIP (A4) */}
      {/* ======================================================== */}
      {printPo && (
        <Dialog open={!!printPo} onOpenChange={() => setPrintPo(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
            <DialogHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <DialogTitle className="text-sm font-bold text-slate-900">
                ใบสั่งซื้อสินค้า / Purchase Order (A4)
              </DialogTitle>
              <Button size="sm" onClick={() => window.print()} className="h-7 text-xs bg-blue-600 text-white">
                พิมพ์เอกสาร (Print)
              </Button>
            </DialogHeader>

            <div className="p-6 bg-slate-100 flex justify-center">
              <div
                id="po-slip-document"
                className="w-[680px] bg-white text-slate-900 p-8 font-sans text-xs leading-relaxed border border-slate-300 shadow-md space-y-4"
              >
                {/* Header */}
                <div className="flex justify-between items-start pb-4 border-b-2 border-slate-800">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">FixMe Service</h2>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      สาขา: {printPo.branch?.name} ({printPo.branch?.code})
                    </div>
                    {printPo.branch?.address && (
                      <div className="text-[10px] text-slate-500">{printPo.branch?.address}</div>
                    )}
                    {printPo.branch?.taxId && (
                      <div className="text-[10px] text-slate-500 font-mono">เลขประจำตัวผู้เสียภาษี: {printPo.branch?.taxId}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-xs uppercase bg-slate-900 text-white px-2.5 py-1 rounded inline-block">
                      PURCHASE ORDER
                    </div>
                    <div className="font-mono text-sm font-black text-blue-700 mt-1">{printPo.poNumber}</div>
                    <div className="text-[11px] text-slate-500">{formatDateThai(printPo.orderedAt || printPo.createdAt)}</div>
                  </div>
                </div>

                {/* Supplier Info */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="text-slate-400 font-medium text-[10px] uppercase">ผู้จำหน่าย / ซัพพลายเออร์:</div>
                    <div className="font-bold text-slate-900 text-sm">{printPo.supplierName}</div>
                    {printPo.supplier?.phone && <div className="text-slate-600">โทร: {printPo.supplier?.phone}</div>}
                    {printPo.supplier?.address && <div className="text-slate-500">{printPo.supplier?.address}</div>}
                  </div>
                  <div className="text-right space-y-0.5">
                    <div className="text-slate-400 font-medium text-[10px] uppercase">เงื่อนไขการสั่งซื้อ:</div>
                    <div>เครดิต: <strong>{printPo.supplier?.creditTerms || "เครดิต 30 วัน"}</strong></div>
                    <div>สถานะการชำระ: <strong>{printPo.paymentStatus === "PAID" ? "ชำระเงินแล้ว" : "รอชำระเงิน"}</strong></div>
                  </div>
                </div>

                {/* Items Table */}
                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-100 text-[10.5px] uppercase font-bold text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="p-2 text-center w-10">ลำดับ</th>
                      <th className="p-2 w-28">รหัสสินค้า</th>
                      <th className="p-2">รายการสินค้า / สเปก</th>
                      <th className="p-2 text-center w-16">จำนวน</th>
                      <th className="p-2 text-right w-24">ราคา/หน่วย</th>
                      <th className="p-2 text-right w-28">รวมเงิน (THB)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {printPo.items?.map((it: any, idx: number) => (
                      <tr key={it.id || idx}>
                        <td className="p-2 text-center text-slate-500">{idx + 1}</td>
                        <td className="p-2 font-mono text-[11px]">{it.productCode}</td>
                        <td className="p-2 font-medium">{it.productName}</td>
                        <td className="p-2 text-center font-bold">{it.quantity}</td>
                        <td className="p-2 text-right font-mono">{formatTHB(it.unitCost)}</td>
                        <td className="p-2 text-right font-mono font-bold">{formatTHB(it.totalCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-300">
                      <td colSpan={4} rowSpan={3} className="p-3 align-top text-slate-500 text-[11px]">
                        {printPo.notes && <div><strong>หมายเหตุ:</strong> {printPo.notes}</div>}
                      </td>
                      <td className="p-2 text-right font-medium text-slate-600">ยอดรวมสินค้า:</td>
                      <td className="p-2 text-right font-mono font-semibold">{formatTHB(printPo.subtotal)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-right font-medium text-slate-600">ภาษีมูลค่าเพิ่ม 7%:</td>
                      <td className="p-2 text-right font-mono font-semibold">{formatTHB(printPo.vatAmount)}</td>
                    </tr>
                    <tr className="bg-slate-50 font-bold border-t border-slate-300">
                      <td className="p-2 text-right text-slate-900">ยอดรวมทั้งสิ้น:</td>
                      <td className="p-2 text-right text-blue-700 font-mono text-sm">{formatTHB(printPo.totalAmount)}</td>
                    </tr>
                  </tfoot>
                </table>

                {/* Signature Blocks */}
                <div className="pt-10 grid grid-cols-2 gap-12 text-center text-xs">
                  <div>
                    <div className="h-12 border-b border-slate-400"></div>
                    <div className="mt-1 font-semibold text-slate-700">ผู้สั่งซื้อ / เจ้าหน้าที่จัดซื้อ</div>
                    <div className="text-[10px] text-slate-400">วันที่: ..... / ..... / .........</div>
                  </div>
                  <div>
                    <div className="h-12 border-b border-slate-400"></div>
                    <div className="mt-1 font-semibold text-slate-700">ผู้รับคำสั่งซื้อ / ซัพพลายเออร์</div>
                    <div className="text-[10px] text-slate-400">วันที่: ..... / ..... / .........</div>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: PRINT BUYBACK CONTRACT A4 */}
      {/* ======================================================== */}
      {printContract && (
        <Dialog open={!!printContract} onOpenChange={() => setPrintContract(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
            <DialogHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <DialogTitle className="text-sm font-bold text-slate-900">
                หนังสือสัญญาซื้อขายโทรศัพท์มือสอง (A4)
              </DialogTitle>
              <Button size="sm" onClick={() => window.print()} className="h-7 text-xs bg-purple-600 text-white">
                พิมพ์สัญญา
              </Button>
            </DialogHeader>

            <div className="p-6 bg-slate-100 flex justify-center">
              <div
                id="buyback-contract"
                className="w-[680px] bg-white text-slate-900 p-8 font-sans text-xs leading-relaxed border border-slate-300 shadow-md space-y-4"
              >
                <div className="text-center pb-2 border-b-2 border-slate-800">
                  <h2 className="text-base font-bold">หนังสือสัญญาซื้อขายทรัพย์สินและปลอดโจรกรรม</h2>
                  <div className="font-mono text-xs text-slate-600">เลขที่สัญญา: {printContract.contractNo}</div>
                </div>

                <div className="text-right text-[11px] text-slate-600">
                  ทำขึ้น ณ {printContract.branch?.name || "FixMe"} วันที่ {formatDateThai(printContract.startDate)}
                </div>

                <div className="space-y-2 text-justify">
                  <p>
                    สัญญาฉบับนี้ทำขึ้นระหว่าง <strong>{printContract.customer?.name}</strong> เลขประจำตัวประชาชน{" "}
                    <strong>{printContract.nationalId}</strong> เบอร์โทรศัพท์ <strong>{printContract.customer?.phone}</strong> (ซึ่งต่อไปในสัญญานี้เรียกว่า &ldquo;ผู้ขาย&rdquo;) ฝ่ายหนึ่ง กับ{" "}
                    <strong>{printContract.branch?.name || "FixMe"}</strong> (ซึ่งต่อไปในสัญญานี้เรียกว่า &ldquo;ผู้ซื้อ&rdquo;) อีกฝ่ายหนึ่ง
                  </p>
                  <p>
                    ผู้ขายตกลงขาย และผู้ซื้อตกลงซื้อโทรศัพท์เคลื่อนที่ ยี่ห้อ <strong>{printContract.deviceBrand}</strong> รุ่น{" "}
                    <strong>{printContract.deviceModel}</strong> หมายเลขเครื่อง/IMEI <strong>{printContract.imei}</strong> สภาพเกรด{" "}
                    <strong>{printContract.conditionGrade}</strong> ในราคาตกลงซื้อขายรวมทั้งสิ้น{" "}
                    <strong className="text-purple-900">{formatTHB(printContract.agreedPrice)}</strong>
                  </p>
                  <div className="p-3 bg-slate-50 border border-slate-300 rounded font-semibold text-[11px]">
                    คำรับรองของผู้ขาย: ผู้ขายขอยืนยันว่าโทรศัพท์เครื่องนี้เป็นกรรมสิทธิ์อันแท้จริงของผู้ขาย และไม่ได้เป็นทรัพย์ที่ได้มาโดยผิดกฎหมายหรือการโจรกรรม หากปรากฏในภายหลังว่าเป็นทรัพย์ที่ผิดกฎหมาย ผู้ขายยินยอมชดใช้ค่าเสียหายและรับผิดชอบทางกฎหมายแต่เพียงผู้เดียว
                  </div>
                </div>

                <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
                  <div>
                    <div className="h-12 border-b border-slate-500"></div>
                    <div className="mt-1 font-semibold">ลงชื่อ ({printContract.customer?.name}) ผู้ขาย</div>
                  </div>
                  <div>
                    <div className="h-12 border-b border-slate-500"></div>
                    <div className="mt-1 font-semibold">ลงชื่อ ผู้ซื้อ / เจ้าหน้าที่ผู้รับซื้อ</div>
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
