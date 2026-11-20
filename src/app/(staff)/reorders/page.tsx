"use client";

import React, { useState, useEffect, useMemo } from "react";
import { DemoBanner } from "@/components/ui/DemoBanner";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { formatTHB, formatDateThai } from "@/lib/utils";
import { useApp } from "@/context/AppContext";

export default function AutomaticReordersPage() {
  const { currentBranch } = useApp();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [orderQtys, setOrderQtys] = useState<Record<string, number>>({});
  const [generatedPo, setGeneratedPo] = useState<any | null>(null);

  const fetchInventory = async () => {
    try {
      const res = await fetch(`/api/inventory?branch=${currentBranch.code}`);
      const json = await res.json();
      if (json.success) {
        setProducts(json.products || []);
        // Initialize reorder quantities to (minStock * 2 - currentStock)
        const initQtys: Record<string, number> = {};
        (json.products || []).forEach((p: any) => {
          const suggested = Math.max(1, p.minStock * 2 - p.currentStock);
          initQtys[p.id] = suggested;
        });
        setOrderQtys(initQtys);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [currentBranch.code]);

  const lowStockItems = useMemo(() => {
    return products.filter((p: any) => {
      if (!p.isLowStock) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          (p.brand || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, search]);

  const handleGeneratePo = (selectedSupplier: string) => {
    const itemsToOrder = lowStockItems.map((p: any) => ({
      name: p.name,
      code: p.code,
      quantity: orderQtys[p.id] || 5,
      unitCost: p.costPrice,
      total: (orderQtys[p.id] || 5) * p.costPrice,
    }));

    const poTotal = itemsToOrder.reduce((sum: number, i: any) => sum + i.total, 0);

    const po = {
      poNumber: `DRAFT-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString(),
      branchName: currentBranch.name,
      supplierName: selectedSupplier,
      items: itemsToOrder,
      totalAmount: poTotal,
    };

    setGeneratedPo(po);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <DemoBanner message="รายการแนะนำสั่งซื้อคำนวณจากสต็อกจริง แต่ใบสั่งซื้อ (PO) ยังไม่ถูกบันทึกในระบบ ใช้พิมพ์เป็นร่างเท่านั้น" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-blue-600" />
            <span>สั่งซื้ออะไหล่ & สินค้าอัตโนมัติ (Automated Reorders)</span>
          </h1>
          <p className="text-sm text-slate-500">
            ระบบคำนวณยอดสั่งซื้ออัตโนมัติจากจุดเตือนสต็อกต่ำ (Min Stock) เพื่อออกใบสั่งซื้อ (PO) ส่งซัพพลายเออร์
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => handleGeneratePo("ซีคอน พาร์ท โฮลเซลล์")}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 text-xs shadow-sm font-semibold"
          >
            <Printer className="w-4 h-4" />
            <span>ออกใบสั่งซื้อ PO ({lowStockItems.length} รายการ)</span>
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">รายการที่ต้องสั่งซื้อด่วน</div>
              <div className="text-2xl font-bold text-rose-600 mt-0.5">{lowStockItems.length}</div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">สาขาปัจจุบัน</div>
              <div className="text-sm font-bold text-slate-900 mt-1 truncate max-w-[140px]">
                {currentBranch.name}
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
                {formatTHB(
                  lowStockItems.reduce(
                    (sum: number, p: any) => sum + (orderQtys[p.id] || 5) * p.costPrice,
                    0
                  )
                )}
              </div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">ซัพพลายเออร์หลัก</div>
              <div className="text-sm font-bold text-slate-900 mt-1">ซีคอน & เสือป่า</div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Filter Bar */}
      <Card className="border-slate-200">
        <CardContent className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="ค้นหาสินค้าที่ใกล้หมด (รหัส, ชื่อสินค้า, แบรนด์)..."
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
                <th className="py-3 px-4">รหัส / หมวดหมู่</th>
                <th className="py-3 px-4">ชื่อสินค้า & อะไหล่</th>
                <th className="py-3 px-4 text-center">คงเหลือปัจจุบัน</th>
                <th className="py-3 px-4 text-center">เกณฑ์ขั้นต่ำ (Min)</th>
                <th className="py-3 px-4 text-center">จำนวนที่แนะนำสั่งซื้อ</th>
                <th className="py-3 px-4 text-right">ต้นทุนต่อหน่วย</th>
                <th className="py-3 px-4 text-right">ยอดเงินสั่งซื้อรวม</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    กำลังตรวจสอบสต็อกสินค้า...
                  </td>
                </tr>
              ) : lowStockItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    สต็อกสินค้าทุกรายการอยู่ในเกณฑ์ปกติ ไม่มียอดที่ต้องสั่งซื้อด่วน
                  </td>
                </tr>
              ) : (
                lowStockItems.map((item: any) => {
                  const qty = orderQtys[item.id] || 5;
                  const totalEst = qty * item.costPrice;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-blue-700">{item.code}</div>
                        <div className="text-[10px] text-slate-400">{item.category}</div>
                      </td>

                      <td className="py-3 px-4 max-w-sm">
                        <div className="font-semibold text-slate-900">{item.name}</div>
                        {item.brand && <div className="text-[10px] text-slate-400">แบรนด์: {item.brand}</div>}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-xs">
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
                          className="w-16 text-center font-bold text-xs p-1 rounded border border-blue-300 font-mono bg-white"
                        />
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono text-slate-600">
                        {formatTHB(item.costPrice)}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-bold text-blue-700">
                        {formatTHB(totalEst)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* PO Preview Modal */}
      {generatedPo && (
        <Dialog open={!!generatedPo} onOpenChange={() => setGeneratedPo(null)}>
          <DialogContent className="max-w-2xl p-0">
            <DialogHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Printer className="w-4 h-4 text-blue-600" />
                <span>ร่างใบสั่งซื้อ (ยังไม่บันทึกในระบบ)</span>
              </DialogTitle>
              <Button size="sm" onClick={() => window.print()} className="h-7 text-xs bg-blue-600 text-white">
                พิมพ์ PO (A4)
              </Button>
            </DialogHeader>

            <div className="p-6 bg-slate-100 flex justify-center">
              <div
                id="po-document"
                className="w-[580px] bg-white text-slate-900 p-6 rounded border border-slate-300 shadow-sm font-sans text-xs space-y-4"
              >
                <div className="flex justify-between items-start pb-3 border-b-2 border-slate-800">
                  <div>
                    <h2 className="text-sm font-bold">MobileShop-Hub Service</h2>
                    <div className="text-[11px] text-slate-600">สาขา: {generatedPo.branchName}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-xs uppercase bg-slate-900 text-white px-2 py-0.5 rounded">
                      PURCHASE ORDER
                    </div>
                    <div className="font-mono text-xs font-bold mt-1">{generatedPo.poNumber}</div>
                    <div className="text-[10px] text-slate-500">{formatDateThai(generatedPo.date)}</div>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded border text-xs">
                  <div>สั่งซื้อถึง: <span className="font-semibold">{generatedPo.supplierName}</span></div>
                  <div>เงื่อนไขชำระเงิน: เครดิต 30 วัน / วางบิลปลายเดือน</div>
                </div>

                <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-700">
                    <tr>
                      <th className="p-2">รายการ</th>
                      <th className="p-2 text-center w-16">จำนวน</th>
                      <th className="p-2 text-right w-24">ราคา/หน่วย</th>
                      <th className="p-2 text-right w-24">รวมเงิน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {generatedPo.items.map((it: any, idx: number) => (
                      <tr key={idx}>
                        <td className="p-2 font-medium">{it.name}</td>
                        <td className="p-2 text-center font-bold">{it.quantity}</td>
                        <td className="p-2 text-right font-mono">{formatTHB(it.unitCost)}</td>
                        <td className="p-2 text-right font-mono font-bold">{formatTHB(it.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-bold">
                      <td colSpan={3} className="p-2 text-right">ยอดรวมทั้งสิ้น:</td>
                      <td className="p-2 text-right text-blue-700 font-mono text-sm">
                        {formatTHB(generatedPo.totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
                </div>

                <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs">
                  <div>
                    <div className="h-10 border-b border-slate-400"></div>
                    <div className="mt-1">ผู้สั่งซื้อ (Authorized By)</div>
                  </div>
                  <div>
                    <div className="h-10 border-b border-slate-400"></div>
                    <div className="mt-1">ผู้รับคำสั่งซื้อ (Supplier Sign)</div>
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
