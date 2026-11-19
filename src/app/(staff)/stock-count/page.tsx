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
  // Physical counts entered this session. A product is "counted" only once it has
  // an entry here (scanned or typed); uncounted products are never adjusted.
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [barcodeInput, setBarcodeInput] = useState("");
  const [applied, setApplied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [category, setCategory] = useState("ALL");

  const loadProducts = async (): Promise<boolean> => {
    if (!currentBranch.code) return false;
    const res = await fetch(`/api/inventory?branch=${encodeURIComponent(currentBranch.code)}`);
    const json = await res.json();
    if (res.ok && json.success) {
      setProducts(json.products || []);
      return true;
    }
    return false;
  };

  const fetchStock = async () => {
    if (!currentBranch.code) return;
    try {
      // Counting starts from zero; system stock is shown separately for comparison.
      if (await loadProducts()) setCounts({});
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
      setApplied(false);
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
    if (submitting) return;
    if (!confirm("ยืนยันการปรับยอดสต็อกของรายการที่ตรวจนับแล้วให้ตรงตามผลการตรวจนับจริง?")) return;

    const toApply = products.filter(
      (p) => counts[p.id] !== undefined && counts[p.id] !== p.currentStock
    );
    const reason = `ปรับยอดตรวจนับจริง (รอบ ${new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" })})`;
    const failures: { name: string; error: string }[] = [];

    setSubmitting(true);
    setApplyError(null);
    try {
      for (const p of toApply) {
        try {
          const res = await fetch("/api/inventory/adjust", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productId: p.id,
              branchCode: currentBranch.code,
              type: "SET",
              quantity: counts[p.id],
              reason,
            }),
          });
          const json = await res.json().catch(() => null);
          if (!res.ok || !json?.success) {
            failures.push({ name: p.name, error: json?.error || `HTTP ${res.status}` });
          }
        } catch {
          failures.push({ name: p.name, error: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้" });
        }
      }

      if (failures.length === 0) {
        confetti({ particleCount: 100, spread: 70 });
        setApplied(true);
        await fetchStock();
      } else {
        const ok = toApply.length - failures.length;
        setApplyError(
          `ปรับยอดสำเร็จ ${ok} รายการ, ล้มเหลว ${failures.length} รายการ: ` +
            failures.map((f) => `${f.name} (${f.error})`).join(", ")
        );
        // Refresh system stock so successful rows no longer show a variance,
        // but keep the entered counts so failed rows can be retried.
        try {
          await loadProducts();
        } catch {
          /* keep previous list */
        }
      }
    } finally {
      setSubmitting(false);
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

  // Only products that were actually counted contribute to variance.
  filtered.forEach((p) => {
    if (counts[p.id] === undefined) return;
    const diff = counts[p.id] - p.currentStock;
    if (diff !== 0) {
      discrepantCount++;
      totalVarianceQty += diff;
      totalCostImpact += diff * (p.costPrice ?? 0);
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
          disabled={discrepantCount === 0 || applied || submitting}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-xs shadow-sm font-semibold"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>
            {submitting ? "กำลังบันทึก..." : `บันทึกปรับยอดสต็อกตามจริง (${discrepantCount} รายการ)`}
          </span>
        </Button>
      </div>

      {applyError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{applyError}</span>
        </div>
      )}
      {applied && !applyError && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>ปรับยอดสต็อกตามผลตรวจนับเรียบร้อยแล้ว</span>
        </div>
      )}

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
                  const isCounted = counts[item.id] !== undefined;
                  const counted = isCounted ? counts[item.id] : 0;
                  const diff = isCounted ? counted - item.currentStock : 0;
                  const impact = diff * (item.costPrice ?? 0);

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
                          step="1"
                          placeholder="ยังไม่นับ"
                          value={isCounted ? counted : ""}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setApplied(false);
                            setCounts((prev) => {
                              const next = { ...prev };
                              const n = Number(raw);
                              // Empty input = not counted; otherwise clamp to a non-negative integer.
                              if (raw === "" || !Number.isFinite(n)) delete next[item.id];
                              else next[item.id] = Math.max(0, Math.floor(n));
                              return next;
                            });
                          }}
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
                          {isCounted ? (diff > 0 ? `+${diff}` : diff) : "-"}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono text-slate-500">
                        {item.costPrice !== undefined ? formatTHB(item.costPrice) : "-"}
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
