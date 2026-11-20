"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import QRCode from "qrcode";
import confetti from "canvas-confetti";
import {
  Package,
  Search,
  AlertTriangle,
  Tag,
  CheckCircle2,
  DollarSign,
  ScanBarcode,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { formatTHB } from "@/lib/utils";
import { useApp } from "@/context/AppContext";

interface AccessoryProduct {
  id: string;
  code: string;
  name: string;
  category: string;
  brand: string | null;
  model: string | null;
  costPrice: number;
  sellPrice: number;
  minStock: number;
  currentStock: number;
  totalStock: number;
  isLowStock: boolean;
}

export default function AccessoriesInventoryPage() {
  const { currentBranch } = useApp();
  const [accessories, setAccessories] = useState<AccessoryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [barcodeScanInput, setBarcodeScanInput] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState("ALL");
  const [scannedHighlightedId, setScannedHighlightedId] = useState<string | null>(null);

  // Label Print Modal
  const [labelProduct, setLabelProduct] = useState<AccessoryProduct | null>(null);
  const [labelQrUrl, setLabelQrUrl] = useState<string>("");

  // Stock Adjust Modal
  const [adjustProduct, setAdjustProduct] = useState<AccessoryProduct | null>(null);
  const [adjustQty, setAdjustQty] = useState<number>(10);
  const [adjustType, setAdjustType] = useState<"ADD" | "DEDUCT" | "SET">("ADD");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustPending, setAdjustPending] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchAccessories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/accessories?branch=${currentBranch.code}`);
      const json = await res.json();
      if (json.success) {
        setAccessories(json.accessories || []);
      }
    } catch (err) {
      console.error("Failed to load accessories:", err);
    } finally {
      setLoading(false);
    }
  }, [currentBranch.code]);

  useEffect(() => {
    fetchAccessories();
  }, [fetchAccessories]);

  // Handle barcode scanning enter key
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const scanned = barcodeScanInput.trim();
    if (!scanned) return;

    const matched = accessories.find(
      (a) => a.code.toLowerCase() === scanned.toLowerCase() || a.name.toLowerCase().includes(scanned.toLowerCase())
    );

    if (matched) {
      setScannedHighlightedId(matched.id);
      showToast(`พบบาร์โค้ด: ${matched.name} (สต็อก ${matched.currentStock} ชิ้น)`);
      setTimeout(() => setScannedHighlightedId(null), 5000);
    } else {
      showToast(`ไม่พบสินค้าตรงกับบาร์โค้ด "${scanned}"`);
    }
    setBarcodeScanInput("");
  };

  const handleOpenLabel = (product: AccessoryProduct) => {
    setLabelProduct(product);
    QRCode.toDataURL(product.code, { width: 140, margin: 1 })
      .then(setLabelQrUrl)
      .catch(console.error);
  };

  // Quick Restock handler (+5, +10)
  const handleQuickRestock = async (product: AccessoryProduct, addQty: number) => {
    try {
      const res = await fetch("/api/accessories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "QUICK_RESTOCK",
          productId: product.id,
          branchCode: currentBranch.code,
          quantity: addQty,
          reason: `เติมสต็อกด่วนหน้าร้าน (+${addQty} ชิ้น)`,
        }),
      });
      const json = await res.json();
      if (json.success) {
        confetti({ particleCount: 50, spread: 50 });
        showToast(`เติมสต็อก ${product.name} +${addQty} ชิ้น สำเร็จ!`);
        fetchAccessories();
      } else {
        alert(json.error || "เกิดข้อผิดพลาดในการเติมสต็อก");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustProduct || adjustPending) return;

    const qty = Number(adjustQty);
    const minQty = adjustType === "SET" ? 0 : 1;
    if (!Number.isInteger(qty) || qty < minQty) {
      setAdjustError(adjustType === "SET" ? "กรุณาระบุยอดคงเหลือเป็นจำนวนเต็มตั้งแต่ 0" : "กรุณาระบุจำนวนเป็นจำนวนเต็มตั้งแต่ 1");
      return;
    }
    const defaultReason =
      adjustType === "ADD"
        ? "เติมสต็อกหน้าร้าน อุปกรณ์เสริม"
        : adjustType === "DEDUCT"
        ? "ตัดสต็อกหน้าร้าน อุปกรณ์เสริม"
        : "ปรับยอดคงเหลือตามตรวจนับ อุปกรณ์เสริม";
    const reason = adjustReason.trim() || defaultReason;

    setAdjustPending(true);
    setAdjustError(null);
    try {
      const res = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: adjustProduct.id,
          branchCode: currentBranch.code,
          type: adjustType,
          quantity: qty,
          reason,
        }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        confetti({ particleCount: 70, spread: 60 });
        setAdjustProduct(null);
        await fetchAccessories();
      } else {
        setAdjustError(json?.error || `ปรับสต็อกไม่สำเร็จ (HTTP ${res.status})`);
      }
    } catch (err) {
      console.error(err);
      setAdjustError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่");
    } finally {
      setAdjustPending(false);
    }
  };

  // Distinct brands for filter tabs
  const brands = useMemo(() => {
    const set = new Set<string>();
    accessories.forEach((a) => {
      if (a.brand) set.add(a.brand);
    });
    return Array.from(set).sort();
  }, [accessories]);

  const filtered = accessories.filter((p) => {
    const s = search.toLowerCase();
    const matchSearch =
      !s ||
      p.name.toLowerCase().includes(s) ||
      p.code.toLowerCase().includes(s) ||
      p.brand?.toLowerCase().includes(s);
    const matchLow = !lowStockOnly || p.isLowStock;
    const matchBrand = selectedBrand === "ALL" || p.brand === selectedBrand;
    return matchSearch && matchLow && matchBrand;
  });

  const lowStockCount = accessories.filter((p) => p.isLowStock).length;
  const totalStockCount = accessories.reduce((sum, p) => sum + (p.currentStock || 0), 0);
  const totalStockValue = accessories.reduce((sum, p) => sum + (p.sellPrice * (p.currentStock || 0)), 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-2xl animate-fade-in border border-slate-700">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            <span>คลังอุปกรณ์เสริม & ฉลากบาร์โค้ด (Accessory Inventory & Labels)</span>
          </h1>
          <p className="text-sm text-slate-500">
            หัวชาร์จ สายชาร์จ เคส ฟิล์มกระจก ระบบสแกนบาร์โค้ดค้นหา เติมสต็อกด่วน และพิมพ์สติ๊กเกอร์ราคา
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAccessories}
            disabled={loading}
            className="gap-1.5 text-xs text-slate-700"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>รีเฟรช</span>
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">จำนวนรายการอุปกรณ์เสริม</div>
              <div className="text-2xl font-bold text-slate-900 mt-0.5">{accessories.length}</div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => setLowStockOnly(!lowStockOnly)}
          className={`cursor-pointer transition-all ${
            lowStockOnly ? "ring-2 ring-rose-500 bg-rose-50/40" : "bg-white border-slate-200"
          }`}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">สินค้าใกล้หมด (Low Stock)</div>
              <div className="text-2xl font-bold text-rose-600 mt-0.5">{lowStockCount}</div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">สต็อกคงเหลือรวม</div>
              <div className="text-2xl font-bold text-slate-900 mt-0.5">
                {totalStockCount} <span className="text-xs font-normal text-slate-500">ชิ้น</span>
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
              <div className="text-xs font-medium text-slate-500">มูลค่าสต็อกอุปกรณ์เสริม</div>
              <div className="text-2xl font-bold text-blue-700 mt-0.5">{formatTHB(totalStockValue)}</div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barcode Quick Scanner Box & Filter Bar */}
      <Card className="border-slate-200">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            {/* Live Barcode Scanner Input */}
            <form onSubmit={handleBarcodeSubmit} className="relative flex-1 w-full flex gap-2">
              <div className="relative flex-1">
                <ScanBarcode className="absolute left-3 top-2.5 h-4 w-4 text-blue-600" />
                <Input
                  placeholder="สแกนบาร์โค้ด / ปืนสแกน (ยิงบาร์โค้ดแล้วกด Enter ทันที)..."
                  value={barcodeScanInput}
                  onChange={(e) => setBarcodeScanInput(e.target.value)}
                  className="pl-9 text-xs h-9 bg-blue-50/50 border-blue-200 font-mono focus:bg-white"
                />
              </div>
              <Button type="submit" size="sm" className="h-9 text-xs bg-blue-600 text-white gap-1">
                <ScanBarcode className="w-3.5 h-3.5" />
                <span>สแกน</span>
              </Button>
            </form>

            {/* Keyword Search */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="ค้นหาชื่ออุปกรณ์เสริม, รหัสสินค้า หรือแบรนด์..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs h-9 bg-slate-50 border-slate-200"
              />
            </div>
          </div>

          {/* Brand Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 mr-1">แบรนด์:</span>
            <button
              type="button"
              onClick={() => setSelectedBrand("ALL")}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all ${
                selectedBrand === "ALL"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              ทั้งหมด
            </button>
            {brands.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setSelectedBrand(b)}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all ${
                  selectedBrand === b
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {b}
              </button>
            ))}
            {lowStockOnly && (
              <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                <AlertTriangle className="h-3 w-3" />
                แสดงเฉพาะสินค้าใกล้หมด ({lowStockCount})
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
              <tr>
                <th className="py-3 px-4">รหัสสินค้า & แบรนด์</th>
                <th className="py-3 px-4">ชื่อสินค้าอุปกรณ์เสริม</th>
                <th className="py-3 px-4 text-right">ต้นทุน (THB)</th>
                <th className="py-3 px-4 text-right">ราคาขายหน้าร้าน</th>
                <th className="py-3 px-4 text-center">มาร์จิ้น (%)</th>
                <th className="py-3 px-4 text-center">คงเหลือ (สาขาปัจจุบัน)</th>
                <th className="py-3 px-4 text-center">เติมสต็อกด่วน</th>
                <th className="py-3 px-4 text-center">การกระทำ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-500" />
                    กำลังโหลดข้อมูลอุปกรณ์เสริม...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    ไม่พบรายการอุปกรณ์เสริม
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const marginPct =
                    item.sellPrice > 0
                      ? Math.round(((item.sellPrice - item.costPrice) / item.sellPrice) * 100)
                      : 0;
                  const isHighlighted = scannedHighlightedId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isHighlighted
                          ? "bg-amber-100/80 ring-2 ring-amber-400"
                          : "hover:bg-slate-50/80"
                      }`}
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-blue-700">{item.code}</div>
                        <div className="text-[11px] text-slate-400">{item.brand || "ทั่วไป"}</div>
                      </td>

                      <td className="py-3 px-4 max-w-sm">
                        <div className="font-semibold text-slate-900">{item.name}</div>
                        {item.model && <div className="text-[10px] text-slate-400">รุ่น: {item.model}</div>}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono text-slate-500">
                        {formatTHB(item.costPrice)}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-slate-900 font-mono">
                        {formatTHB(item.sellPrice)}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                          +{marginPct}%
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            item.isLowStock
                              ? "bg-rose-100 text-rose-800 animate-pulse"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {item.currentStock} ชิ้น
                        </span>
                        <div className="text-[10px] text-slate-400">ขั้นต่ำ: {item.minStock}</div>
                      </td>

                      {/* Quick Restock Buttons */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleQuickRestock(item, 5)}
                            className="text-[10px] font-bold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                            title="เติมสต็อกทันที +5 ชิ้น"
                          >
                            +5
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickRestock(item, 10)}
                            className="text-[10px] font-bold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                            title="เติมสต็อกทันที +10 ชิ้น"
                          >
                            +10
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenLabel(item)}
                            className="text-xs h-7 px-2 gap-1 text-slate-700"
                            title="พิมพ์บาร์โค้ดติดสินค้า"
                          >
                            <Tag className="w-3.5 h-3.5 text-blue-600" />
                            <span>ฉลากราคา</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setAdjustProduct(item);
                              setAdjustQty(10);
                              setAdjustType("ADD");
                              setAdjustReason("");
                              setAdjustError(null);
                            }}
                            className="text-xs h-7 px-2 text-slate-700"
                            title="ปรับสต็อก"
                          >
                            ปรับสต็อก
                          </Button>
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

      {/* Label Print Modal */}
      {labelProduct && (
        <Dialog open={!!labelProduct} onOpenChange={() => setLabelProduct(null)}>
          <DialogContent className="max-w-sm p-0">
            <DialogHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Tag className="w-4 h-4 text-blue-600" />
                <span>พิมพ์ฉลากราคาสินค้า 80mm</span>
              </DialogTitle>
              <Button size="sm" onClick={() => window.print()} className="h-7 text-xs bg-blue-600 text-white">
                พิมพ์
              </Button>
            </DialogHeader>

            <div className="p-6 bg-slate-100 flex justify-center">
              <div
                id="label-print"
                className="w-[240px] bg-white text-black p-4 rounded border border-slate-300 font-mono text-center shadow-xs space-y-2 text-xs"
              >
                <div className="font-bold text-xs uppercase tracking-tight">FixMe Mobile</div>
                <div className="font-semibold text-xs leading-snug line-clamp-2">{labelProduct.name}</div>
                <div className="text-[10px] text-gray-500 font-mono">{labelProduct.code}</div>
                {labelQrUrl && (
                  <div className="flex justify-center my-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={labelQrUrl} alt="Barcode" className="w-24 h-24" />
                  </div>
                )}
                <div className="text-base font-black tracking-tight">{formatTHB(labelProduct.sellPrice)}</div>
                <div className="text-[9px] text-gray-400">ราคารวมภาษีมูลค่าเพิ่มแล้ว</div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Stock Adjust Modal */}
      {adjustProduct && (
        <Dialog open={!!adjustProduct} onOpenChange={() => !adjustPending && setAdjustProduct(null)}>
          <DialogContent className="max-w-md p-0">
            <DialogHeader className="p-4 border-b border-slate-100">
              <DialogTitle className="text-base font-bold text-slate-900">
                ปรับสต็อกสินค้า: {adjustProduct.name}
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                สาขาปัจจุบัน: {currentBranch.name} • สต็อกคงเหลือปัจจุบัน: {adjustProduct.currentStock} ชิ้น
              </p>
            </DialogHeader>

            <form onSubmit={handleAdjustStock} className="p-4 space-y-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustType("ADD")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border ${
                    adjustType === "ADD" ? "bg-blue-600 text-white border-blue-600" : "bg-slate-50"
                  }`}
                >
                  + เติมสต็อกเพิ่ม
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType("DEDUCT")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border ${
                    adjustType === "DEDUCT" ? "bg-blue-600 text-white border-blue-600" : "bg-slate-50"
                  }`}
                >
                  - ตัดสต็อกออก
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType("SET")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border ${
                    adjustType === "SET" ? "bg-blue-600 text-white border-blue-600" : "bg-slate-50"
                  }`}
                >
                  = ปรับยอดคงเหลือจริง
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {adjustType === "ADD"
                    ? "จำนวนที่นำเข้าเพิ่ม (ชิ้น)"
                    : adjustType === "DEDUCT"
                    ? "จำนวนที่ตัดออก (ชิ้น)"
                    : "ยอดคงเหลือจริงที่ตรวจนับได้ (ชิ้น)"}
                </label>
                <Input
                  type="number"
                  min={adjustType === "SET" ? "0" : "1"}
                  step="1"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                  className="text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">เหตุผล (ไม่บังคับ)</label>
                <Input
                  type="text"
                  maxLength={200}
                  placeholder="เช่น รับสินค้าเข้า, สินค้าชำรุด, ตรวจนับประจำเดือน"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="text-xs"
                />
              </div>

              {adjustError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {adjustError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAdjustProduct(null)}
                  disabled={adjustPending}
                  className="text-xs"
                >
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={adjustPending} className="text-xs bg-blue-600 text-white">
                  {adjustPending ? "กำลังบันทึก..." : "ยืนยันปรับสต็อก"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
