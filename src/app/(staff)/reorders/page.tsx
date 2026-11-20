"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import {
  ShoppingCart,
  AlertTriangle,
  PlusCircle,
  Search,
  Printer,
  CheckCircle2,
  PackageCheck,
  Building2,
  DollarSign,
  Truck,
  RefreshCw,
  FileText,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatTHB } from "@/lib/utils";
import { useApp } from "@/context/AppContext";

export default function AutomaticReordersPage() {
  const { currentBranch } = useApp();
  const [items, setItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [orderQtys, setOrderQtys] = useState<Record<string, number>>({});
  const [converting, setConverting] = useState(false);
  const [successPo, setSuccessPo] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchReorderData = async () => {
    try {
      setLoading(true);
      setErrorMsg("");

      // 1. Fetch low-stock reorder suggestions
      const branchCode = currentBranch.code || currentBranch.id;
      const res = await fetch(`/api/reorders?branch=${encodeURIComponent(branchCode)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setItems(data.items || []);
        const initQtys: Record<string, number> = {};
        (data.items || []).forEach((item: any) => {
          initQtys[item.id] = item.suggestedQuantity;
        });
        setOrderQtys(initQtys);
      } else {
        setErrorMsg(data.error || "โหลดข้อมูลรายการสั่งซื้อไม่สำเร็จ");
      }

      // 2. Fetch suppliers
      const supRes = await fetch("/api/suppliers");
      const supData = await supRes.json();
      if (supRes.ok && supData.success) {
        setSuppliers(supData.suppliers || []);
        if (supData.suppliers?.length > 0 && !selectedSupplierId) {
          setSelectedSupplierId(supData.suppliers[0].id);
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReorderData();
  }, [currentBranch.code, currentBranch.id]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        (item.brand || "").toLowerCase().includes(q) ||
        (item.model || "").toLowerCase().includes(q)
    );
  }, [items, search]);

  const totalReorderEstimate = useMemo(() => {
    return filteredItems.reduce((sum, item) => {
      const q = orderQtys[item.id] ?? item.suggestedQuantity ?? 1;
      return sum + q * item.costPrice;
    }, 0);
  }, [filteredItems, orderQtys]);

  // 1-Click convert low-stock suggestions into real PO draft
  const handleConvertToPoDraft = async () => {
    if (converting) return;
    if (filteredItems.length === 0) {
      alert("ไม่มีรายการสินค้าที่ต้องสั่งซื้อ");
      return;
    }

    setConverting(true);
    setErrorMsg("");
    setSuccessPo(null);

    try {
      const selectedSup = suppliers.find((s) => s.id === selectedSupplierId);

      const itemsPayload = filteredItems.map((item) => ({
        productId: item.productId || item.id,
        quantity: orderQtys[item.id] ?? item.suggestedQuantity ?? 1,
        unitCost: item.costPrice,
        code: item.code,
        name: item.name,
        category: item.category,
      }));

      const payload = {
        branchId: currentBranch.id || currentBranch.code,
        supplierId: selectedSupplierId || null,
        supplierName: selectedSup?.name || "ซัพพลายเออร์ทั่วไป",
        includeVat: true,
        taxRate: 7,
        items: itemsPayload,
      };

      const res = await fetch("/api/reorders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "สร้างร่างใบสั่งซื้อไม่สำเร็จ");
        return;
      }

      confetti({ particleCount: 100, spread: 70 });
      setSuccessPo(data.purchaseOrder);
      // Refresh items after conversion
      fetchReorderData();
    } catch (err) {
      console.error(err);
      setErrorMsg("ไม่สามารถเชื่อมต่อเพื่อบันทึกใบสั่งซื้อได้");
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-blue-600" />
            <span>แจ้งเตือนสั่งซื้อซ้ำอัตโนมัติ (Automated Reorder Alerts)</span>
          </h1>
          <p className="text-sm text-slate-500">
            ระบบคำนวณยอดสั่งซื้ออัตโนมัติจากจุดเตือนสต็อกต่ำ (Min Stock) พร้อมแปลงเป็นร่างใบสั่งซื้อ (PO) ภายใน 1 คลิก
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/purchase-history">
            <Button variant="outline" size="sm" className="text-xs gap-1.5 font-semibold text-slate-700">
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              <span>ประวัติใบสั่งซื้อ</span>
            </Button>
          </Link>
          <Button
            onClick={handleConvertToPoDraft}
            disabled={converting || filteredItems.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 text-xs shadow-sm font-semibold h-9"
          >
            <PackageCheck className="w-4 h-4" />
            <span>
              {converting ? "กำลังสร้างใบสั่งซื้อ..." : `1-Click สร้าง PO Draft (${filteredItems.length} รายการ)`}
            </span>
          </Button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successPo && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold">สร้างร่างใบสั่งซื้อสำเร็จ!</span> เลขที่ PO:{" "}
              <strong className="font-mono text-emerald-800">{successPo.poNumber}</strong> (
              {successPo.items?.length || filteredItems.length} รายการ, มูลค่า {formatTHB(successPo.totalAmount)})
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/purchase-history">
              <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 font-semibold">
                <span>ดูในประวัติการสั่งซื้อ</span>
                <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">รายการที่ต้องสั่งซื้อด่วน</div>
              <div className="text-2xl font-bold text-rose-600 mt-0.5">{filteredItems.length}</div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">สาขาเป้าหมาย</div>
              <div className="text-sm font-bold text-slate-900 mt-1 truncate max-w-[140px]">
                {currentBranch.name || "สำนักงานใหญ่"}
              </div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">มูลค่าสั่งซื้อประเมิน</div>
              <div className="text-2xl font-bold text-blue-700 mt-0.5 font-mono">
                {formatTHB(totalReorderEstimate)}
              </div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="p-3 space-y-1">
            <div className="text-xs font-medium text-slate-500">เลือกซัพพลายเออร์</div>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="w-full text-xs rounded border border-slate-300 p-1.5 bg-white font-semibold truncate"
            >
              {suppliers.length === 0 ? (
                <option value="">ซัพพลายเออร์ทั่วไป</option>
              ) : (
                suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))
              )}
            </select>
          </CardContent>
        </Card>
      </div>

      {/* Search Filter Bar */}
      <Card className="border-slate-200">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="ค้นหาสินค้าที่ใกล้หมด (รหัส, ชื่อสินค้า, แบรนด์, รุ่น)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9 bg-slate-50 border-slate-200"
            />
          </div>
          <Button variant="ghost" size="sm" onClick={fetchReorderData} className="h-9 px-3 text-xs gap-1 text-slate-600">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>รีเฟรช</span>
          </Button>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
              <tr>
                <th className="py-3 px-4">รหัส / หมวดหมู่</th>
                <th className="py-3 px-4">ชื่อสินค้า & อะไหล่</th>
                <th className="py-3 px-4 text-center">คงเหลือปัจจุบัน</th>
                <th className="py-3 px-4 text-center">เกณฑ์ขั้นต่ำ (Min)</th>
                <th className="py-3 px-4 text-center">จำนวนสั่งซื้อ (ปรับได้)</th>
                <th className="py-3 px-4 text-right">ต้นทุนต่อหน่วย</th>
                <th className="py-3 px-4 text-right">ยอดสั่งซื้อรวม</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    กำลังตรวจสอบสต็อกสินค้า...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    สต็อกสินค้าทุกรายการอยู่ในเกณฑ์ปกติ ไม่มียอดที่ต้องสั่งซื้อด่วน
                  </td>
                </tr>
              ) : (
                filteredItems.map((item: any) => {
                  const qty = orderQtys[item.id] ?? item.suggestedQuantity ?? 1;
                  const lineTotal = qty * item.costPrice;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-blue-700">{item.code}</div>
                        <div className="text-[10px] text-slate-400">{item.category}</div>
                      </td>

                      <td className="py-3 px-4 max-w-sm">
                        <div className="font-semibold text-slate-900">{item.name}</div>
                        {item.brand && item.brand !== "-" && (
                          <div className="text-[10px] text-slate-400">แบรนด์: {item.brand}</div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full text-xs">
                          {item.currentStock} ชิ้น
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap text-slate-600 font-bold">
                        {item.minStock} ชิ้น
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <input
                          type="number"
                          min="1"
                          value={qty}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setOrderQtys((prev) => ({
                              ...prev,
                              [item.id]: isNaN(val) ? 1 : Math.max(1, val),
                            }));
                          }}
                          className="w-18 text-center font-bold text-xs p-1.5 rounded border border-blue-300 font-mono bg-white shadow-xs focus:ring-1 focus:ring-blue-500"
                        />
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono text-slate-600">
                        {formatTHB(item.costPrice)}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-bold text-blue-700">
                        {formatTHB(lineTotal)}
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
