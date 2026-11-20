"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  History,
  Printer,
  FileSpreadsheet,
  Check,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { formatTHB, formatDateThai } from "@/lib/utils";
import { useApp } from "@/context/AppContext";

export default function StockCountSessionPage() {
  const { currentBranch, branches } = useApp();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [barcodeInput, setBarcodeInput] = useState("");
  const [applied, setApplied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [category, setCategory] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "DIFF_ONLY" | "SURPLUS" | "DEFICIT">("ALL");

  // History Drawer State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historySessions, setHistorySessions] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [viewSessionDetail, setViewSessionDetail] = useState<any | null>(null);

  const loadProducts = useCallback(async (): Promise<boolean> => {
    if (!currentBranch.code && !currentBranch.id) return false;
    const bIdent = currentBranch.code || currentBranch.id;
    const res = await fetch(`/api/inventory?branch=${encodeURIComponent(bIdent)}`);
    const json = await res.json();
    if (res.ok && json.success) {
      setProducts(json.products || []);
      return true;
    }
    return false;
  }, [currentBranch.code, currentBranch.id]);

  const fetchStock = useCallback(async () => {
    if (!currentBranch.code && !currentBranch.id) return;
    try {
      if (await loadProducts()) setCounts({});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentBranch.code, currentBranch.id, loadProducts]);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  const loadHistorySessions = async () => {
    setHistoryLoading(true);
    try {
      const bIdent = currentBranch.code || currentBranch.id;
      const res = await fetch(`/api/stock-count?branch=${encodeURIComponent(bIdent)}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setHistorySessions(json.sessions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOpenHistory = () => {
    setShowHistoryModal(true);
    loadHistorySessions();
  };

  const handleScanBarcode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const trimmed = barcodeInput.trim();
    const found = products.find(
      (p) =>
        p.code?.toLowerCase() === trimmed.toLowerCase() ||
        p.imeis?.some((i: any) => i.imei === trimmed)
    );

    if (found) {
      setApplied(false);
      setSessionCode(null);
      setCounts((prev) => ({
        ...prev,
        [found.id]: (prev[found.id] || 0) + 1,
      }));
      setBarcodeInput("");
    } else {
      alert(`ไม่พบสินค้าที่มีรหัสหรือบาร์โค้ด: ${trimmed}`);
    }
  };

  const handleResetSession = () => {
    if (Object.keys(counts).length === 0) return;
    if (confirm("ต้องการล้างผลการตรวจนับทั้งหมดในรอบนี้หรือไม่?")) {
      setCounts({});
      setApplied(false);
      setApplyError(null);
      setSessionCode(null);
    }
  };

  const handleApplyReconciliation = async () => {
    if (submitting) return;

    const countedItems = products.filter((p) => counts[p.id] !== undefined);
    const discrepantItems = countedItems.filter((p) => counts[p.id] !== p.currentStock);

    if (discrepantItems.length === 0) {
      alert("ยอดที่ตรวจนับตรงกับระบบทุกรายการ ไม่มีความจำเป็นต้องปรับปรุงสต็อก");
      return;
    }

    if (
      !confirm(
        `ยืนยันการปรับปรุงยอดสต็อกตามผลตรวจนับจริง จำนวน ${discrepantItems.length} รายการ ที่พบผลต่าง?`
      )
    ) {
      return;
    }

    const branchIdent = currentBranch.code || currentBranch.id;
    const reason = `ปรับยอดตรวจนับจริง ประจำสาขา ${currentBranch.name || branchIdent}`;

    setSubmitting(true);
    setApplyError(null);

    try {
      const res = await fetch("/api/stock-count", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchCode: branchIdent,
          counts: countedItems.map((p) => ({
            productId: p.id,
            countedQty: counts[p.id],
            expectedQty: p.currentStock,
          })),
          note: reason,
          autoAdjust: true,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setApplyError(json.error || "เกิดข้อผิดพลาดในการบันทึกผลตรวจนับ");
        return;
      }

      confetti({ particleCount: 100, spread: 70 });
      setApplied(true);
      setSessionCode(json.session?.sessionCode || null);
      await fetchStock();
    } catch {
      setApplyError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อบันทึกผลการตรวจนับได้");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = products.filter((p) => {
    if (category !== "ALL" && p.category !== category) return false;

    if (statusFilter !== "ALL") {
      const isCounted = counts[p.id] !== undefined;
      const counted = isCounted ? counts[p.id] : 0;
      const diff = isCounted ? counted - p.currentStock : 0;

      if (statusFilter === "DIFF_ONLY" && diff === 0) return false;
      if (statusFilter === "SURPLUS" && diff <= 0) return false;
      if (statusFilter === "DEFICIT" && diff >= 0) return false;
    }

    return true;
  });

  // Variance calculations
  let totalVarianceQty = 0;
  let totalCostImpact = 0;
  let discrepantCount = 0;
  let surplusCount = 0;
  let deficitCount = 0;

  // Only products that were actually counted contribute to variance.
  products.forEach((p) => {
    if (counts[p.id] === undefined) return;
    const diff = counts[p.id] - p.currentStock;
    if (diff !== 0) {
      discrepantCount++;
      if (diff > 0) surplusCount++;
      if (diff < 0) deficitCount++;
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
            สแกนบาร์โค้ดนับสินค้าจริง เทียบกับยอดในระบบ และปรับปรุงผลต่างยอดคงคลังอัตโนมัติพร้อมบันทึก Audit Log
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenHistory}
            className="text-xs h-9 gap-1.5 border-slate-300 text-slate-700"
          >
            <History className="w-3.5 h-3.5 text-blue-600" />
            <span>ประวัติการตรวจนับ</span>
          </Button>
          <Button
            onClick={handleApplyReconciliation}
            disabled={discrepantCount === 0 || applied || submitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-xs h-9 shadow-sm font-semibold"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {submitting
                ? "กำลังบันทึก..."
                : `บันทึกปรับยอดตามจริง (${discrepantCount} รายการ)`}
            </span>
          </Button>
        </div>
      </div>

      {applyError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{applyError}</span>
        </div>
      )}

      {applied && !applyError && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              ปรับยอดสต็อกตามผลตรวจนับเรียบร้อยแล้ว {sessionCode && `(รหัสรอบนับ: ${sessionCode})`}
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.print()}
            className="h-7 text-xs bg-white text-emerald-800 border-emerald-300 gap-1"
          >
            <Printer className="w-3 h-3" />
            <span>พิมพ์รายงานสรุป</span>
          </Button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">จำนวนที่นับแล้ว</div>
              <div className="text-2xl font-bold text-slate-900 mt-0.5">
                {Object.keys(counts).length} / {products.length}
              </div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">ยอดไม่ตรง (Diff)</div>
              <div className="text-2xl font-bold text-amber-600 mt-0.5 flex items-center gap-2">
                <span>{discrepantCount}</span>
                {discrepantCount > 0 && (
                  <span className="text-[11px] font-normal text-slate-400">
                    (+{surplusCount} / -{deficitCount})
                  </span>
                )}
              </div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">ผลต่างจำนวนรวม (Net Qty)</div>
              <div
                className={`text-2xl font-bold mt-0.5 ${
                  totalVarianceQty < 0
                    ? "text-rose-600"
                    : totalVarianceQty > 0
                    ? "text-emerald-700"
                    : "text-slate-700"
                }`}
              >
                {totalVarianceQty > 0 ? `+${totalVarianceQty}` : totalVarianceQty}
              </div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">ผลกระทบมูลค่าต้นทุน</div>
              <div
                className={`text-2xl font-bold mt-0.5 font-mono ${
                  totalCostImpact < 0
                    ? "text-rose-600"
                    : totalCostImpact > 0
                    ? "text-emerald-700"
                    : "text-slate-700"
                }`}
              >
                {formatTHB(totalCostImpact)}
              </div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              {totalCostImpact < 0 ? (
                <TrendingDown className="w-5 h-5" />
              ) : (
                <TrendingUp className="w-5 h-5" />
              )}
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
                placeholder="สแกนบาร์โค้ดสินค้า หรือพิมพ์รหัสสินค้า/IMEI แล้วกด Enter เพื่อนับ +1..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="pl-9 text-xs h-9 bg-white border-blue-200 font-mono"
              />
            </div>
            <Button type="submit" className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1">
              <span>นับ +1</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Filter and Reset Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
            {[
              { id: "ALL", label: "ทุกหมวด" },
              { id: "ACCESSORY", label: "อุปกรณ์เสริม" },
              { id: "SPARE_PART", label: "อะไหล่ซ่อม" },
              { id: "DEVICE", label: "ตัวเครื่องมือถือ" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  category === cat.id
                    ? "bg-white text-blue-700 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Variance Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
            {[
              { id: "ALL", label: "รายการทั้งหมด" },
              { id: "DIFF_ONLY", label: "เฉพาะที่ยอดไม่ตรง" },
              { id: "SURPLUS", label: "ส่วนเกิน (+)" },
              { id: "DEFICIT", label: "ขาดหาย (-)" },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id as any)}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  statusFilter === st.id
                    ? "bg-white text-amber-700 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleResetSession}
          disabled={Object.keys(counts).length === 0 || submitting}
          className="text-xs gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          <span>ล้างผลการตรวจนับ</span>
        </Button>
      </div>

      {/* Table */}
      <Card className="border-slate-200 overflow-hidden shadow-xs">
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
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    ไม่พบรายการสินค้าที่ตรงกับเงื่อนไขการกรอง
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
                            setSessionCode(null);
                            setCounts((prev) => {
                              const next = { ...prev };
                              const n = Number(raw);
                              if (raw === "" || !Number.isFinite(n)) delete next[item.id];
                              else next[item.id] = Math.max(0, Math.floor(n));
                              return next;
                            });
                          }}
                          className="w-20 text-center font-bold text-xs p-1 rounded border border-slate-300 font-mono bg-white focus:border-blue-500 focus:outline-hidden"
                        />
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap font-mono font-bold">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] ${
                            !isCounted
                              ? "bg-slate-50 text-slate-400"
                              : diff === 0
                              ? "bg-slate-100 text-slate-600"
                              : diff < 0
                              ? "bg-rose-100 text-rose-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {!isCounted ? "-" : diff > 0 ? `+${diff} (เกิน)` : diff < 0 ? `${diff} (ขาด)` : "ตรง (0)"}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono text-slate-500">
                        {item.costPrice !== undefined ? formatTHB(item.costPrice) : "-"}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-bold">
                        <span
                          className={
                            !isCounted
                              ? "text-slate-300"
                              : impact < 0
                              ? "text-rose-600"
                              : impact > 0
                              ? "text-emerald-700"
                              : "text-slate-400"
                          }
                        >
                          {isCounted ? formatTHB(impact) : "-"}
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

      {/* History Modal */}
      {showHistoryModal && (
        <Dialog open={showHistoryModal} onOpenChange={() => setShowHistoryModal(false)}>
          <DialogContent className="max-w-2xl p-0">
            <DialogHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                <span>ประวัติรอบการตรวจนับสต็อกจริง (Stock Count Sessions)</span>
              </DialogTitle>
            </DialogHeader>

            <div className="p-4 max-h-[460px] overflow-y-auto space-y-3">
              {historyLoading ? (
                <div className="py-8 text-center text-xs text-slate-400">กำลังโหลดประวัติ...</div>
              ) : historySessions.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">ยังไม่มีบันทึกรอบการตรวจนับสต็อก</div>
              ) : (
                historySessions.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2 hover:bg-slate-100/70 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-mono font-bold text-blue-700 text-sm">{s.sessionCode}</div>
                      <div className="text-[11px] text-slate-400">{formatDateThai(s.createdAt)}</div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <div>
                        สาขา: <span className="font-semibold text-slate-800">{s.branchName}</span>
                      </div>
                      <div>
                        ผู้นับ: <span className="font-semibold text-slate-800">{s.countedBy}</span>
                      </div>
                      <div>
                        รายการที่นับ: <span className="font-semibold text-slate-800">{s.itemsCounted} ชิ้น</span>
                      </div>
                      <div>
                        รายการที่ยอดต่าง:{" "}
                        <span className="font-bold text-amber-600">{s.discrepancyCount}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                      <div className="flex items-center gap-3">
                        <span className="text-emerald-700 font-semibold">เกิน: +{s.totalSurplusQty}</span>
                        <span className="text-rose-600 font-semibold">ขาด: -{s.totalDeficitQty}</span>
                      </div>
                      <div className="font-mono font-bold">
                        ผลกระทบมูลค่า:{" "}
                        <span className={s.totalCostImpact < 0 ? "text-rose-600" : "text-emerald-700"}>
                          {formatTHB(s.totalCostImpact)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
