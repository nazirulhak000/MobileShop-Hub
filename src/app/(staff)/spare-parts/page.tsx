"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import {
  Package,
  Wrench,
  Search,
  PlusCircle,
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Filter,
  RefreshCw,
  Cpu,
  Layers,
  ArrowUpDown,
  Tag,
  DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { formatTHB } from "@/lib/utils";
import { useApp } from "@/context/AppContext";

interface SparePartItem {
  id: string;
  code: string;
  name: string;
  brand: string;
  model: string;
  compatibleModels?: string | null;
  costPrice: number;
  sellPrice: number;
  stock: number;
}

export default function SparePartsPage() {
  const { currentBranch, branches } = useApp();
  const [parts, setParts] = useState<SparePartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("ALL");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Quick Adjust Modal
  const [selectedPart, setSelectedPart] = useState<SparePartItem | null>(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState<number>(1);
  const [adjustReason, setAdjustReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  const fetchParts = async () => {
    setLoading(true);
    try {
      if (!currentBranch.id) return;
      const url = `/api/inventory/parts?branchId=${encodeURIComponent(currentBranch.id)}&search=${encodeURIComponent(search)}`;
      const res = await fetch(url);
      const json = await res.json();
      // API returns the list under `data`.
      if (res.ok && json.success && Array.isArray(json.data)) {
        setParts(json.data);
      }
    } catch (err) {
      console.error("Fetch parts error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParts();
  }, [currentBranch.id, search]);

  const brands = Array.from(new Set(parts.map((p) => p.brand).filter(Boolean)));

  const filteredParts = parts.filter((p) => {
    if (selectedBrand !== "ALL" && p.brand !== selectedBrand) return false;
    if (lowStockOnly && p.stock > 5) return false;
    return true;
  });

  const handleOpenAdjust = (p: SparePartItem) => {
    if ((p.stock || 0) <= 0) {
      alert("อะไหล่รายการนี้หมดสต็อกในสาขา ไม่สามารถเบิกได้");
      return;
    }
    setSelectedPart(p);
    setAdjustAmount(1);
    setAdjustReason("เบิกใช้อะไหล่ซ่อมด่วนหน้าร้าน");
    setAdjustError(null);
    setShowAdjustModal(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPart || saving) return;

    if ((selectedPart.stock || 0) <= 0) {
      setAdjustError("อะไหล่หมดสต็อก ไม่สามารถเบิกได้");
      return;
    }

    const qty = Number(adjustAmount);
    if (!Number.isInteger(qty) || qty < 1) {
      setAdjustError("กรุณาระบุจำนวนเป็นจำนวนเต็มตั้งแต่ 1");
      return;
    }
    if (qty > selectedPart.stock) {
      setAdjustError(`สต็อกคงเหลือ ${selectedPart.stock} ชิ้น ไม่เพียงพอสำหรับเบิก ${qty} ชิ้น`);
      return;
    }
    const reason = adjustReason.trim();
    if (!reason) {
      setAdjustError("กรุณาระบุเหตุผลหรือรหัสใบรับซ่อม");
      return;
    }

    setSaving(true);
    setAdjustError(null);
    try {
      // Withdrawal is a delta (DEDUCT); the server rejects it if live stock is insufficient.
      const res = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedPart.id,
          branchCode: currentBranch.code,
          type: "DEDUCT",
          quantity: qty,
          reason,
        }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        confetti({ particleCount: 30, spread: 60, origin: { y: 0.8 } });
        setShowAdjustModal(false);
        await fetchParts();
      } else {
        setAdjustError(json?.error || `ตัดสต็อกไม่สำเร็จ (HTTP ${res.status})`);
      }
    } catch (err) {
      console.error(err);
      setAdjustError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Cpu className="h-6 w-6 text-indigo-600" />
            <span>เบิกอะไหล่ซ่อมมือถือ & จัดการสต็อกช่าง (Spare Parts)</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            คลังอะไหล่ หน้าจอ แบตเตอรี่ เมนบอร์ด กล้อง สายแพร์ สาขา {currentBranch.name}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button onClick={fetchParts} variant="outline" size="sm" className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            <span>รีเฟรช</span>
          </Button>
          <Link href="/technician-repairs">
            <Button variant="outline" size="sm" className="gap-1.5 text-indigo-700 border-indigo-200">
              <Wrench className="h-3.5 w-3.5" />
              <span>ไปยังโต๊ะงานช่าง</span>
            </Button>
          </Link>
          <Link href="/inventory">
            <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-sm gap-2">
              <PlusCircle className="h-4 w-4" />
              <span>เพิ่มรายการอะไหล่</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">อะไหล่ทั้งหมดในระบบ</p>
              <p className="text-2xl font-bold tracking-tight text-slate-900 mt-1 tabular-nums">
                {parts.length} <span className="text-sm font-normal text-slate-500">SKU</span>
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Package className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">คงเหลือในสาขาปัจจุบัน</p>
              <p className="text-2xl font-bold tracking-tight text-emerald-600 mt-1 tabular-nums">
                {parts.reduce((sum, p) => sum + (p.stock || 0), 0)}{" "}
                <span className="text-sm font-normal text-slate-500">ชิ้น</span>
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">อะไหล่ใกล้หมด (ต่ำกว่า 5)</p>
              <p className="text-2xl font-bold tracking-tight text-amber-600 mt-1 tabular-nums">
                {parts.filter((p) => (p.stock || 0) <= 5).length}{" "}
                <span className="text-sm font-normal text-slate-500">รายการ</span>
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-slate-200/80 shadow-2xs">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาอะไหล่ (รหัส, ชื่อ, รุ่น, ยี่ห้อ)..."
              className="pl-9 h-9 text-xs bg-slate-50"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="ALL">ทุกแบรนด์ ({brands.length})</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            <button
              onClick={() => setLowStockOnly(!lowStockOnly)}
              className={`h-9 px-3 rounded-lg border text-xs font-medium transition-colors ${
                lowStockOnly
                  ? "bg-amber-50 border-amber-300 text-amber-800"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              เฉพาะของใกล้หมด
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Spare Parts Grid / Table */}
      <Card className="border-slate-200/80 shadow-2xs overflow-hidden">
        <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-sm font-semibold text-slate-900">
            รายการอะไหล่ซ่อม ({filteredParts.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-sm text-slate-500 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-indigo-600" />
              <span>กำลังโหลดรายการอะไหล่...</span>
            </div>
          ) : filteredParts.length === 0 ? (
            <div className="p-12 text-center">
              <Cpu className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">ไม่พบรายการอะไหล่ที่ค้นหา</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">รหัสอะไหล่</th>
                    <th className="px-4 py-3">ชื่ออะไหล่ & รุ่นที่รองรับ</th>
                    <th className="px-4 py-3">แบรนด์</th>
                    <th className="px-4 py-3 text-right">ราคาทุน</th>
                    <th className="px-4 py-3 text-right">ราคาขาย/ค่าอะไหล่</th>
                    <th className="px-4 py-3 text-center">สต็อกสาขานี้</th>
                    <th className="px-4 py-3 text-right">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredParts.map((p) => {
                    const isLow = (p.stock || 0) <= 5;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3.5 font-mono font-medium text-slate-800">
                          {p.code}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-900">{p.name}</div>
                          {p.compatibleModels && (
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              รองรับ: {p.compatibleModels}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-medium text-slate-700">{p.brand}</td>
                        <td className="px-4 py-3.5 text-right font-mono text-slate-600 tabular-nums">
                          {formatTHB(p.costPrice)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-semibold text-slate-900 tabular-nums">
                          {formatTHB(p.sellPrice)}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold tabular-nums ${
                              isLow
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {p.stock || 0} ชิ้น
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Button
                            onClick={() => handleOpenAdjust(p)}
                            variant="outline"
                            size="sm"
                            disabled={(p.stock || 0) <= 0}
                            className={`h-7 text-xs gap-1 ${(p.stock || 0) <= 0 ? "opacity-50 cursor-not-allowed border-slate-200 text-slate-400" : "border-indigo-200 text-indigo-700 hover:bg-indigo-50"}`}
                          >
                            <Wrench className="h-3 w-3" />
                            <span>{(p.stock || 0) <= 0 ? "ของหมด" : "เบิกใช้งาน"}</span>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Quick Withdraw */}
      <Dialog open={showAdjustModal} onOpenChange={(open) => !saving && setShowAdjustModal(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Wrench className="h-5 w-5 text-indigo-600" />
              <span>เบิกใช้อะไหล่ซ่อมด่วน</span>
            </DialogTitle>
          </DialogHeader>

          {selectedPart && (
            <form onSubmit={handleAdjustSubmit} className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div className="font-semibold text-slate-900">{selectedPart.name}</div>
                <div className="text-slate-500">รหัส: {selectedPart.code} | สต็อกปัจจุบัน: {selectedPart.stock} ชิ้น</div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  จำนวนที่ต้องการเบิก (ชิ้น)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={Math.max(1, selectedPart.stock || 1)}
                  step={1}
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(parseInt(e.target.value, 10) || 0)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  เหตุผล / รหัสใบรับซ่อม (Ticket No.)
                </label>
                <Input
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="เช่น REP-2026-001 หรือ ซ่อมด่วนหน้าร้าน"
                  maxLength={200}
                  required
                />
              </div>

              {adjustAmount > (selectedPart.stock || 0) && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  จำนวนที่ต้องการเบิก ({adjustAmount} ชิ้น) เกินกว่าสต็อกคงเหลือ ({selectedPart.stock} ชิ้น)
                </div>
              )}

              {adjustError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {adjustError}
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAdjustModal(false)}
                  disabled={saving}
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 gap-1.5"
                  disabled={saving || (selectedPart.stock || 0) <= 0 || adjustAmount > (selectedPart.stock || 0)}
                >
                  {saving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>ยืนยันการตัดสต็อกเบิก</span>
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
