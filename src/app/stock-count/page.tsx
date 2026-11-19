"use client";

import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import {
  ClipboardCheck,
  Search,
  Barcode,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatTHB } from "@/lib/utils";
import { useApp } from "@/context/AppContext";

export default function StockCountSessionPage() {
  const { currentBranch } = useApp();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [barcodeInput, setBarcodeInput] = useState("");
  const [applied, setApplied] = useState(false);
  const [category, setCategory] = useState("ALL");

  const fetchStock = async () => {
    try {
      const res = await fetch(`/api/inventory?branch=${currentBranch.code}`);
      const json = await res.json();
      if (json.success) {
        setProducts(json.products || []);
        const initCounts: Record<string, number> = {};
        (json.products || []).forEach((p: any) => {
          initCounts[p.id] = p.currentStock; // Initial equal to system stock
        });
        setCounts(initCounts);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
  }, [currentBranch.code]);

  const handleScanBarcode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const trimmed = barcodeInput.trim();
    const found = products.find(
      (p) =>
        p.code.toLowerCase() === trimmed.toLowerCase() ||
        p.imeis?.some((i: any) => i.imei === trimmed)
    );

    if (found) {
      setCounts((prev) => ({
        ...prev,
        [found.id]: (prev[found.id] || 0) + 1,
      }));
      setBarcodeInput("");
    } else {
      alert(`ไม่พบสินค้าที่มีรหัสหรือบาร์โค้ด: ${trimmed}`);
    }
  };

  const handleApplyReconciliation = async () => {
    if (!confirm("ยืนยันการปรับยอดสต็อกทั้งหมดให้ตรงตามผลการตรวจนับจริง?")) return;

    try {
      for (const p of products) {
        const counted = counts[p.id];
        if (counted !== undefined && counted !== p.currentStock) {
          await fetch("/api/inventory/adjust", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productId: p.id,
              branchId: currentBranch.id,
              quantity: counted,
              reason: `ปรับยอดตรวจนับจริง (รอบ ${new Date().toISOString().split("T")[0]})`,
            }),
          });
        }
      }
      confetti({ particleCount: 100, spread: 70 });
      setApplied(true);
      fetchStock();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = products.filter((p) => {
    if (category === "ALL") return true;
    return p.category === category;
  });

  // Variance calculations
  let totalVarianceQty = 0;
  let totalCostImpact = 0;
  let discrepantCount = 0;

  filtered.forEach((p) => {
    const counted = counts[p.id] !== undefined ? counts[p.id] : p.currentStock;
    const diff = counted - p.currentStock;
    if (diff !== 0) {
      discrepantCount++;
      totalVarianceQty += diff;
      totalCostImpact += diff * p.costPrice;
    }
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-blue-600" />
            <span>ตรวจนับสต็อกจริง & รายงานผลต่าง (Physical Stock Count)</span>
          </h1>
          <p className="text-sm text-slate-500">
            สแกนบาร์โค้ดนับสินค้าจริง เทียบกับยอดในระบบ และปรับปรุงผลต่างยอดคงคลังอัตโนมัติ
          </p>
        </div>
        <Button
          onClick={handleApplyReconciliation}
          disabled={discrepantCount === 0 || applied}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-xs shadow-sm font-semibold"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>บันทึกปรับยอดสต็อกตามจริง ({discrepantCount} รายการ)</span>
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">จำนวนสินค้าที่ตรวจนับ</div>
              <div className="text-2xl font-bold text-slate-900 mt-0.5">{filtered.length}</div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">รายการที่ยอดไม่ตรง (Diff)</div>
              <div className="text-2xl font-bold text-amber-600 mt-0.5">{discrepantCount}</div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">ผลต่างจำนวนรวม (Net Qty)</div>
              <div className={`text-2xl font-bold mt-0.5 ${totalVarianceQty < 0 ? "text-rose-600" : "text-emerald-700"}`}>
                {totalVarianceQty > 0 ? `+${totalVarianceQty}` : totalVarianceQty}
              </div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">ผลกระทบมูลค่าต้นทุน</div>
              <div className={`text-2xl font-bold mt-0.5 font-mono ${totalCostImpact < 0 ? "text-rose-600" : "text-emerald-700"}`}>
                {formatTHB(totalCostImpact)}
              </div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barcode Scanner Bar */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardContent className="p-4">
          <form onSubmit={handleScanBarcode} className="flex gap-2">
            <div className="relative flex-1">
              <Barcode className="absolute left-3 top-2.5 h-4 w-4 text-blue-600" />
              <Input
                placeholder="สแกนบาร์โค้ดสินค้า หรือพิมพ์รหัสสินค้า/IMEI แล้วกด Enter..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="pl-9 text-xs h-9 bg-white border-blue-200 font-mono"
              />
            </div>
            <Button type="submit" className="text-xs bg-blue-600 text-white font-semibold gap-1">
              <span>นับ +1</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
              <tr>
                <th className="py-3 px-4">รหัสสินค้า / หมวด</th>
                <th className="py-3 px-4">ชื่อสินค้า</th>
                <th className="py-3 px-4 text-center">สต็อกในระบบ</th>
                <th className="py-3 px-4 text-center">นับได้จริง</th>
                <th className="py-3 px-4 text-center">ผลต่าง (Variance)</th>
                <th className="py-3 px-4 text-right">ต้นทุน/ชิ้น</th>
                <th className="py-3 px-4 text-right">ผลกระทบมูลค่า</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    กำลังโหลดสินค้า...
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const counted = counts[item.id] !== undefined ? counts[item.id] : item.currentStock;
                  const diff = counted - item.currentStock;
                  const impact = diff * item.costPrice;

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        diff !== 0 ? "bg-amber-50/40 hover:bg-amber-50" : "hover:bg-slate-50/80"
                      }`}
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-blue-700">{item.code}</div>
                        <div className="text-[10px] text-slate-400">{item.category}</div>
                      </td>

                      <td className="py-3 px-4 max-w-sm">
                        <div className="font-semibold text-slate-900">{item.name}</div>
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap font-bold text-slate-700">
                        {item.currentStock} ชิ้น
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <input
                          type="number"
                          min="0"
                          value={counted}
                          onChange={(e) =>
                            setCounts((prev) => ({
                              ...prev,
                              [item.id]: Number(e.target.value),
                            }))
                          }
                          className="w-20 text-center font-bold text-xs p-1 rounded border border-slate-300 font-mono bg-white"
                        />
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap font-mono font-bold">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] ${
                            diff === 0
                              ? "bg-slate-100 text-slate-500"
                              : diff < 0
                              ? "bg-rose-100 text-rose-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {diff > 0 ? `+${diff}` : diff}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono text-slate-500">
                        {formatTHB(item.costPrice)}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-bold">
                        <span className={impact < 0 ? "text-rose-600" : impact > 0 ? "text-emerald-700" : "text-slate-400"}>
                          {formatTHB(impact)}
                        </span>
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
  );
}
