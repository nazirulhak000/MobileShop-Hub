"use client";

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import confetti from "canvas-confetti";
import {
  Package,
  PlusCircle,
  Search,
  Printer,
  AlertTriangle,
  Tag,
  CheckCircle2,
  SlidersHorizontal,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { formatTHB } from "@/lib/utils";
import { useApp } from "@/context/AppContext";

export default function AccessoriesInventoryPage() {
  const { currentBranch } = useApp();
  const [accessories, setAccessories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Label Print Modal
  const [labelProduct, setLabelProduct] = useState<any | null>(null);
  const [labelQrUrl, setLabelQrUrl] = useState<string>("");

  // Stock Adjust Modal
  const [adjustProduct, setAdjustProduct] = useState<any | null>(null);
  const [adjustQty, setAdjustQty] = useState<number>(10);
  const [adjustType, setAdjustType] = useState<"ADD" | "DEDUCT" | "SET">("ADD");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustPending, setAdjustPending] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  const fetchAccessories = async () => {
    try {
      const res = await fetch(`/api/inventory?category=ACCESSORY&branch=${currentBranch.code}`);
      const json = await res.json();
      if (json.success) {
        setAccessories(json.products || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccessories();
  }, [currentBranch.code]);

  const handleOpenLabel = (product: any) => {
    setLabelProduct(product);
    QRCode.toDataURL(product.code, { width: 140, margin: 1 })
      .then(setLabelQrUrl)
      .catch(console.error);
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
      // Send a delta (ADD/DEDUCT) so the server applies it to the live stock,
      // instead of an absolute value computed from possibly stale local data.
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

  const filtered = accessories.filter((p) => {
    const s = search.toLowerCase();
    const matchSearch =
      !s ||
      p.name.toLowerCase().includes(s) ||
      p.code.toLowerCase().includes(s) ||
      p.brand?.toLowerCase().includes(s);
    const matchLow = !lowStockOnly || p.isLowStock;
    return matchSearch && matchLow;
  });

  const lowStockCount = accessories.filter((p) => p.isLowStock).length;
  const totalStockCount = accessories.reduce((sum, p) => sum + (p.currentStock || 0), 0);
  const totalStockValue = accessories.reduce((sum, p) => sum + (p.sellPrice * (p.currentStock || 0)), 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            <span>คลังอุปกรณ์เสริม & ฉลากบาร์โค้ด (Accessory Inventory & Labels)</span>
          </h1>
          <p className="text-sm text-slate-500">
            หัวชาร์จ สายชาร์จ เคส ฟิล์มกระจก ตรวจสอบสต็อกขั้นต่ำ และพิมพ์สติ๊กเกอร์ราคา 80mm
          </p>
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

        <Card className="bg-white border-slate-200">
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
              <div className="text-2xl font-bold text-slate-900 mt-0.5">{totalStockCount} <span className="text-xs font-normal text-slate-500">ชิ้น</span></div>
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

      {/* Filter and Search Bar */}
      <Card className="border-slate-200">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="ค้นหาชื่ออุปกรณ์เสริม, รหัสสินค้า หรือแบรนด์ (Anker, Remax, Focus, UAG)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9 bg-slate-50 border-slate-200"
            />
          </div>
          <button
            type="button"
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
              lowStockOnly
                ? "bg-rose-50 text-rose-700 border-rose-300 shadow-xs"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            เตือนสต็อกต่ำเท่านั้น ({lowStockCount})
          </button>
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
                <th className="py-3 px-4 text-center">การกระทำ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    กำลังโหลดข้อมูลอุปกรณ์เสริม...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    ไม่พบรายการอุปกรณ์เสริม
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const marginPct = item.sellPrice > 0
                    ? Math.round(((item.sellPrice - item.costPrice) / item.sellPrice) * 100)
                    : 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
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
                <div className="font-bold text-xs uppercase tracking-tight">MobileShop-Hub</div>
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
