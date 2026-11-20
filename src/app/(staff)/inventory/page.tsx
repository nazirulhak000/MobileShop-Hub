"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Package,
  Wrench,
  Smartphone,
  Headphones,
  Search,
  Plus,
  AlertTriangle,
  ArrowUpDown,
  History,
  CheckCircle2,
  X,
  SlidersHorizontal,
  RefreshCw,
  Building2,
  Tag,
  ShieldCheck,
  ChevronRight,
  Info,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { formatTHB } from "@/lib/utils";

interface StockPerBranch {
  branchId: string;
  branchName: string;
  branchCode: string;
  quantity: number;
}

interface DeviceIMEIItem {
  id: string;
  productId: string;
  branchId: string;
  imei: string;
  serialNo?: string | null;
  conditionGrade: "A" | "B" | "C";
  status: "IN_STOCK" | "SOLD" | "IN_REPAIR" | "PAWNED" | "RETURNED";
  costPrice: number;
  sellPrice: number;
  branch?: { name: string; code: string };
  createdAt: string;
}

interface ProductItem {
  id: string;
  code: string;
  name: string;
  category: "ACCESSORY" | "SPARE_PART" | "DEVICE";
  brand: string;
  model: string;
  compatibleModels: string[];
  costPrice: number;
  sellPrice: number;
  minStock: number;
  currentStock: number;
  totalStock: number;
  isLowStock: boolean;
  imeis: DeviceIMEIItem[];
  stockPerBranch: StockPerBranch[];
}

export default function InventoryPage() {
  const { currentBranch } = useApp();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ALL" | "ACCESSORY" | "SPARE_PART" | "DEVICE">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // Modal States
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState<ProductItem | null>(null);
  const [adjustType, setAdjustType] = useState<"ADD" | "DEDUCT" | "SET">("ADD");
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustReason, setAdjustReason] = useState("สั่งซื้อสินค้าเข้าสต็อกใหม่");
  const [adjustLoading, setAdjustLoading] = useState(false);

  // IMEI Modal States
  const [imeiModalOpen, setImeiModalOpen] = useState(false);
  const [selectedProductForImei, setSelectedProductForImei] = useState<ProductItem | null>(null);
  const [newImeiNum, setNewImeiNum] = useState("");
  const [newImeiSerial, setNewImeiSerial] = useState("");
  const [newImeiGrade, setNewImeiGrade] = useState<"A" | "B" | "C">("A");
  const [newImeiCost, setNewImeiCost] = useState("");
  const [newImeiSell, setNewImeiSell] = useState("");
  const [addingImei, setAddingImei] = useState(false);

  // New Product Modal
  const [newProductModalOpen, setNewProductModalOpen] = useState(false);
  const [npCode, setNpCode] = useState("");
  const [npName, setNpName] = useState("");
  const [npCategory, setNpCategory] = useState<"ACCESSORY" | "SPARE_PART" | "DEVICE">("ACCESSORY");
  const [npBrand, setNpBrand] = useState("");
  const [npModel, setNpModel] = useState("");
  const [npCompatibles, setNpCompatibles] = useState("");
  const [npCost, setNpCost] = useState("");
  const [npSell, setNpSell] = useState("");
  const [npMinStock, setNpMinStock] = useState("5");
  const [npInitialStock, setNpInitialStock] = useState("10");
  const [creatingProduct, setCreatingProduct] = useState(false);

  // Toast feedback message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/inventory?branch=${currentBranch.code}`);
      const data = await res.json();
      if (data.success) {
        setProducts(data.products);
      }
    } catch (err) {
      console.error("Failed to load inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [currentBranch.code]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (activeTab !== "ALL" && p.category !== activeTab) return false;
      if (onlyLowStock && !p.isLowStock) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesCode = p.code.toLowerCase().includes(q);
        const matchesBrand = p.brand.toLowerCase().includes(q);
        const matchesModel = p.model.toLowerCase().includes(q);
        const matchesCompatibles = p.compatibleModels.some((m) => m.toLowerCase().includes(q));
        const matchesImei = p.imeis.some((i) => i.imei.toLowerCase().includes(q));
        return matchesName || matchesCode || matchesBrand || matchesModel || matchesCompatibles || matchesImei;
      }
      return true;
    });
  }, [products, activeTab, onlyLowStock, searchQuery]);

  // Statistics Summary
  const stats = useMemo(() => {
    const totalSKUs = products.length;
    const accessoryCount = products.filter((p) => p.category === "ACCESSORY").length;
    const sparePartsCount = products.filter((p) => p.category === "SPARE_PART").length;
    const deviceCount = products.filter((p) => p.category === "DEVICE").length;
    const lowStockTotal = products.filter((p) => p.isLowStock).length;
    const inStockIMEIs = products
      .filter((p) => p.category === "DEVICE")
      .reduce((acc, p) => acc + p.imeis.filter((i) => i.status === "IN_STOCK").length, 0);
    const totalInventoryValue = products.reduce((acc, p) => acc + p.currentStock * p.sellPrice, 0);

    return { totalSKUs, accessoryCount, sparePartsCount, deviceCount, lowStockTotal, inStockIMEIs, totalInventoryValue };
  }, [products]);

  // Handle Stock Adjustment
  const handleAdjustStock = async () => {
    if (!selectedProductForAdjust) return;
    if (adjustType === "DEDUCT" && adjustQty > selectedProductForAdjust.currentStock) {
      alert(`สต็อกมีเพียง ${selectedProductForAdjust.currentStock} ชิ้น ไม่สามารถลดจำนวน ${adjustQty} ชิ้นได้`);
      return;
    }
    try {
      setAdjustLoading(true);
      const res = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProductForAdjust.id,
          branchCode: currentBranch.code,
          type: adjustType,
          quantity: adjustQty,
          reason: adjustReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || "ปรับสต็อกสำเร็จ");
        setAdjustModalOpen(false);
        fetchProducts();
      } else {
        alert(data.error || "เกิดข้อผิดพลาดในการปรับสต็อก");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setAdjustLoading(false);
    }
  };

  // Handle Add New IMEI
  const handleAddNewImei = async () => {
    if (!selectedProductForImei || !newImeiNum.trim()) return;
    const cleanImei = newImeiNum.trim().replace(/\s+/g, "");
    if (cleanImei.length < 8) {
      alert("กรุณากรอกหมายเลข IMEI ให้ถูกต้อง (อย่างน้อย 8 ตัวอักษร)");
      return;
    }
    if (selectedProductForImei.imeis.some((i) => i.imei.toLowerCase() === cleanImei.toLowerCase())) {
      alert(`หมายเลข IMEI ${cleanImei} มีอยู่ในรายการของสินค้านี้แล้ว`);
      return;
    }
    try {
      setAddingImei(true);
      const res = await fetch("/api/inventory/imei", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProductForImei.id,
          branchCode: currentBranch.code,
          imei: cleanImei,
          serialNo: newImeiSerial.trim() || undefined,
          conditionGrade: newImeiGrade,
          costPrice: Number(newImeiCost) || selectedProductForImei.costPrice,
          sellPrice: Number(newImeiSell) || selectedProductForImei.sellPrice,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`บันทึก IMEI ${cleanImei} เรียบร้อยแล้ว`);
        setNewImeiNum("");
        setNewImeiSerial("");
        fetchProducts();
        // Update local modal data
        setSelectedProductForImei((prev) =>
          prev ? { ...prev, imeis: [data.imei, ...prev.imeis], currentStock: prev.currentStock + 1 } : null
        );
      } else {
        alert(data.error || "ไม่สามารถเพิ่ม IMEI ได้");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setAddingImei(false);
    }
  };

  // Handle Update IMEI Status or Grade
  const handleUpdateImei = async (imeiId: string, status: string, grade: string) => {
    try {
      const res = await fetch("/api/inventory/imei", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: imeiId, status, conditionGrade: grade }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("อัปเดตข้อมูลเครื่อง IMEI สำเร็จ");
        fetchProducts();
        if (selectedProductForImei) {
          setSelectedProductForImei({
            ...selectedProductForImei,
            imeis: selectedProductForImei.imeis.map((i) => (i.id === imeiId ? { ...i, ...data.imei } : i)),
          });
        }
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  // Handle Create Product
  const handleCreateProduct = async () => {
    if (!npCode || !npName) {
      alert("กรุณากรอกรหัสและชื่อสินค้า");
      return;
    }
    try {
      setCreatingProduct(true);
      const compatList = npCompatibles
        ? npCompatibles.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: npCode.trim(),
          name: npName.trim(),
          category: npCategory,
          brand: npBrand.trim(),
          model: npModel.trim(),
          compatibleModels: compatList,
          costPrice: Number(npCost) || 0,
          sellPrice: Number(npSell) || 0,
          minStock: Number(npMinStock) || 5,
          branchId: currentBranch.code,
          initialStock: Number(npInitialStock) || 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`เพิ่มสินค้า ${npName} เรียบร้อยแล้ว`);
        setNewProductModalOpen(false);
        // Reset form
        setNpCode("");
        setNpName("");
        setNpBrand("");
        setNpModel("");
        setNpCompatibles("");
        setNpCost("");
        setNpSell("");
        fetchProducts();
      } else {
        alert(data.error || "เกิดข้อผิดพลาด");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setCreatingProduct(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-2xl animate-fade-in border border-slate-700">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              คลังสินค้า & สต็อกอะไหล่ (Inventory)
            </h1>
            <Badge variant="outline" className="border-blue-300 bg-blue-50/50 text-blue-700 font-medium">
              <Building2 className="mr-1 h-3 w-3 inline" />
              {currentBranch.name}
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            บริหารจัดการสินค้า อะไหล่เปลี่ยน รุ่นโทรศัพท์ที่รองรับ และติดตามหมายเลขเครื่อง (IMEI) ทุกสาขา
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProducts}
            disabled={loading}
            className="gap-1.5 text-slate-700"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>รีเฟรช</span>
          </Button>

          <Button
            onClick={() => setNewProductModalOpen(true)}
            size="sm"
            className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>เพิ่มสินค้า / อะไหล่ใหม่</span>
          </Button>
        </div>
      </div>

      {/* 4 Stat Overview Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">สินค้าทั้งหมด (SKUs)</span>
              <Package className="h-4 w-4 text-blue-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{stats.totalSKUs}</div>
            <div className="mt-1 flex gap-2 text-[11px] text-slate-400">
              <span>อุปกรณ์ {stats.accessoryCount}</span>
              <span>•</span>
              <span>อะไหล่ {stats.sparePartsCount}</span>
              <span>•</span>
              <span>เครื่อง {stats.deviceCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">มูลค่าสต็อกสาขานี้</span>
              <Tag className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-700">
              {formatTHB(stats.totalInventoryValue)}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              คำนวณจากราคาขายปลีกปัจจุบัน
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">มือถือในคลัง (พร้อมขาย)</span>
              <Smartphone className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {stats.inStockIMEIs} <span className="text-sm font-normal text-slate-500">เครื่อง</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              มี IMEI แยกแทร็กเกรด A/B/C ทุกเครื่อง
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => setOnlyLowStock(!onlyLowStock)}
          className={`cursor-pointer transition-all ${
            onlyLowStock ? "ring-2 ring-amber-500 bg-amber-50/50" : "hover:shadow-md"
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                สต็อกต่ำกว่าเกณฑ์ (Low Stock)
              </span>
              <Badge variant="warning" className="text-[10px] px-1.5">
                {onlyLowStock ? "กำลังกรองอยู่" : "คลิกเพื่อกรอง"}
              </Badge>
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-600">
              {stats.lowStockTotal} <span className="text-sm font-normal text-slate-500">รายการ</span>
            </div>
            <div className="mt-1 text-[11px] text-amber-700/80">
              {onlyLowStock ? "แสดงเฉพาะรายการที่ต้องสั่งเพิ่ม" : "ต่ำกว่า Min Stock ที่ตั้งไว้"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tab Controls & Search Bar */}
      <Card>
        <div className="border-b border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Custom Tabs */}
          <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("ALL")}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
                activeTab === "ALL"
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <Package className="h-3.5 w-3.5" />
              <span>ทั้งหมด ({products.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("ACCESSORY")}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
                activeTab === "ACCESSORY"
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <Headphones className="h-3.5 w-3.5" />
              <span>อุปกรณ์เสริม ({stats.accessoryCount})</span>
            </button>
            <button
              onClick={() => setActiveTab("SPARE_PART")}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
                activeTab === "SPARE_PART"
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <Wrench className="h-3.5 w-3.5" />
              <span>อะไหล่ซ่อมมือถือ ({stats.sparePartsCount})</span>
            </button>
            <button
              onClick={() => setActiveTab("DEVICE")}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
                activeTab === "DEVICE"
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>เครื่องมือหนึ่ง / มือสอง & IMEI ({stats.deviceCount})</span>
            </button>
          </div>

          {/* Search Input & Filter Tags */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหารหัส, ชื่อ, แบรนด์, รุ่นที่รองรับ, IMEI..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/70 py-1.5 pl-9 pr-3 text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {onlyLowStock && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setOnlyLowStock(false)}
                className="text-xs gap-1 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
              >
                <span>ล้างกรองสต็อกต่ำ</span>
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Product Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80">
                <TableHead className="w-28">รหัสสินค้า</TableHead>
                <TableHead>ชื่อสินค้า / ชิ้นส่วนอะไหล่</TableHead>
                <TableHead className="w-36">หมวดหมู่ & แบรนด์</TableHead>
                {activeTab === "SPARE_PART" || activeTab === "ALL" ? (
                  <TableHead>รุ่นที่รองรับ (Compatible Models)</TableHead>
                ) : null}
                <TableHead className="text-right w-24">ราคาทุน</TableHead>
                <TableHead className="text-right w-28">ราคาจำหน่าย</TableHead>
                <TableHead className="text-center w-36">
                  คงเหลือสาขา {currentBranch.code}
                </TableHead>
                <TableHead className="text-center w-28">สถานะ</TableHead>
                <TableHead className="text-right w-36">การจัดการ</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
                    กำลังโหลดข้อมูลคลังสินค้า...
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-slate-400">
                    <Package className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    ไม่พบรายการสินค้าที่ตรงกับเงื่อนไขการค้นหา
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => {
                  const marginPercent =
                    product.sellPrice > 0
                      ? Math.round(((product.sellPrice - product.costPrice) / product.sellPrice) * 100)
                      : 0;

                  return (
                    <TableRow key={product.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Code */}
                      <TableCell className="font-mono text-xs font-bold text-slate-700">
                        {product.code}
                      </TableCell>

                      {/* Name & Details */}
                      <TableCell>
                        <div className="font-semibold text-slate-900 text-sm">
                          {product.name}
                        </div>
                        {product.model && (
                          <div className="text-xs text-slate-400">รุ่น: {product.model}</div>
                        )}
                        {/* Device Condition Summary Badges if device */}
                        {product.category === "DEVICE" && product.imeis.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {product.imeis
                              .filter((i) => i.status === "IN_STOCK")
                              .slice(0, 3)
                              .map((im) => (
                                <span
                                  key={im.id}
                                  className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-700"
                                >
                                  <span>IMEI: ...{im.imei.slice(-4)}</span>
                                  <span className="font-bold text-blue-600">({im.conditionGrade})</span>
                                </span>
                              ))}
                            {product.imeis.filter((i) => i.status === "IN_STOCK").length > 3 && (
                              <span className="text-[10px] text-slate-400">
                                +{product.imeis.filter((i) => i.status === "IN_STOCK").length - 3} เครื่อง
                              </span>
                            )}
                          </div>
                        )}
                      </TableCell>

                      {/* Category & Brand */}
                      <TableCell>
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              product.category === "SPARE_PART"
                                ? "bg-purple-100 text-purple-700"
                                : product.category === "DEVICE"
                                ? "bg-indigo-100 text-indigo-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {product.category === "SPARE_PART"
                              ? "อะไหล่ซ่อม"
                              : product.category === "DEVICE"
                              ? "เครื่องโทรศัพท์"
                              : "อุปกรณ์เสริม"}
                          </span>
                          {product.brand && (
                            <span className="text-xs text-slate-600 font-medium">{product.brand}</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Compatible Models for Spare Parts */}
                      {activeTab === "SPARE_PART" || activeTab === "ALL" ? (
                        <TableCell>
                          {product.compatibleModels && product.compatibleModels.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {product.compatibleModels.map((m, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700 border border-purple-200"
                                >
                                  {m}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-300">-</span>
                          )}
                        </TableCell>
                      ) : null}

                      {/* Cost Price */}
                      <TableCell className="text-right font-mono text-xs text-slate-500">
                        {formatTHB(product.costPrice)}
                      </TableCell>

                      {/* Sell Price & Margin */}
                      <TableCell className="text-right">
                        <div className="font-semibold text-slate-900 text-sm font-mono">
                          {formatTHB(product.sellPrice)}
                        </div>
                        <div className="text-[10px] text-emerald-600 font-medium">
                          กำไร ~{marginPercent}%
                        </div>
                      </TableCell>

                      {/* Stock in Branch */}
                      <TableCell className="text-center">
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`font-bold text-sm ${
                              product.isLowStock
                                ? "text-rose-600 font-mono"
                                : "text-slate-900 font-mono"
                            }`}
                          >
                            {product.currentStock} ชิ้น
                          </span>
                          <span className="text-[10px] text-slate-400">
                            (รวมทุกสาขา: {product.totalStock})
                          </span>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="text-center">
                        {product.currentStock <= 0 ? (
                          <Badge variant="danger" className="text-[10px]">
                            สินค้าหมด
                          </Badge>
                        ) : product.isLowStock ? (
                          <Badge variant="warning" className="text-[10px] gap-1">
                            <AlertTriangle className="h-3 w-3 inline" />
                            สต็อกต่ำ (Min {product.minStock})
                          </Badge>
                        ) : (
                          <Badge variant="success" className="text-[10px]">
                            ปกติ
                          </Badge>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {product.category === "DEVICE" ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setSelectedProductForImei(product);
                                setImeiModalOpen(true);
                              }}
                              className="text-xs gap-1 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                            >
                              <Smartphone className="h-3.5 w-3.5" />
                              <span>จัดการ IMEI ({product.imeis.length})</span>
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedProductForAdjust(product);
                                setAdjustType("ADD");
                                setAdjustQty(5);
                                setAdjustModalOpen(true);
                              }}
                              className="text-xs gap-1"
                            >
                              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
                              <span>ปรับสต็อก</span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ================= MODAL 1: Stock Adjustment ================= */}
      <Dialog open={adjustModalOpen} onOpenChange={setAdjustModalOpen}>
        <DialogHeader>
          <DialogTitle onClose={() => setAdjustModalOpen(false)}>
            ปรับปรุงยอดสต็อกสินค้า (Stock Adjustment)
          </DialogTitle>
        </DialogHeader>

        {selectedProductForAdjust && (
          <DialogContent className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900">
                  {selectedProductForAdjust.name}
                </span>
                <span className="font-mono text-xs bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600">
                  {selectedProductForAdjust.code}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>สาขาที่ปฏิบัติการ: <strong className="text-slate-800">{currentBranch.name}</strong></span>
                <span>สต็อกปัจจุบัน: <strong className="text-blue-600 font-mono text-sm">{selectedProductForAdjust.currentStock} ชิ้น</strong></span>
              </div>
            </div>

            {/* Adjust Type Selector */}
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                รูปแบบการปรับปรุงสต็อก
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustType("ADD")}
                  className={`rounded-lg border p-2 text-xs font-semibold transition-all ${
                    adjustType === "ADD"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-200"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  + เพิ่มสต็อก (รับเข้า)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType("DEDUCT")}
                  className={`rounded-lg border p-2 text-xs font-semibold transition-all ${
                    adjustType === "DEDUCT"
                      ? "border-rose-600 bg-rose-50 text-rose-700 ring-2 ring-rose-200"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  - ตัดยอด (ลดสต็อก)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType("SET")}
                  className={`rounded-lg border p-2 text-xs font-semibold transition-all ${
                    adjustType === "SET"
                      ? "border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-200"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  = ตั้งค่ายอดใหม่
                </button>
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">
                จำนวนชิ้นที่ต้องการ{adjustType === "ADD" ? "เพิ่ม" : adjustType === "DEDUCT" ? "หักออก" : "ตั้งค่า"}
              </label>
              <Input
                type="number"
                min={adjustType === "SET" ? 0 : 1}
                value={adjustQty}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  const minVal = adjustType === "SET" ? 0 : 1;
                  setAdjustQty(isNaN(val) ? minVal : Math.max(minVal, val));
                }}
                className="font-mono text-base font-bold"
              />
            </div>

            {/* Reason */}
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">
                เหตุผลการปรับปรุง
              </label>
              <select
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="สั่งซื้อสินค้าเข้าสต็อกใหม่">สั่งซื้อสินค้าเข้าสต็อกใหม่ (Restock PO)</option>
                <option value="ตรวจนับสต็อกประจำเดือน (Cycle Count)">ตรวจนับสต็อกประจำเดือน (Cycle Count)</option>
                <option value="สินค้าชำรุด / แตกหัก / เสียหาย">สินค้าชำรุด / แตกหัก / เสียหาย (Defect)</option>
                <option value="ลูกค้านำมาเคลมเปลี่ยนตัวใหม่">ลูกค้านำมาเคลมเปลี่ยนตัวใหม่ (Warranty Return)</option>
                <option value="โอนย้ายสต็อกระหว่างสาขา">โอนย้ายสต็อกระหว่างสาขา (Inter-branch Transfer)</option>
              </select>
            </div>

            {/* Insufficient stock warning for DEDUCT */}
            {adjustType === "DEDUCT" && adjustQty > selectedProductForAdjust.currentStock && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>จำนวนที่ต้องการลด ({adjustQty} ชิ้น) มากกว่าสต็อกคงเหลือ ({selectedProductForAdjust.currentStock} ชิ้น)</span>
              </div>
            )}

            {/* Summary preview */}
            <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-800 flex items-center justify-between">
              <span>ยอดสต็อกหลังปรับปรุง:</span>
              <span className="font-bold font-mono text-sm text-blue-900">
                {adjustType === "ADD"
                  ? selectedProductForAdjust.currentStock + adjustQty
                  : adjustType === "DEDUCT"
                  ? Math.max(0, selectedProductForAdjust.currentStock - adjustQty)
                  : adjustQty}{" "}
                ชิ้น
              </span>
            </div>
          </DialogContent>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setAdjustModalOpen(false)}>
            ยกเลิก
          </Button>
          <Button
            size="sm"
            onClick={handleAdjustStock}
            disabled={
              adjustLoading ||
              (selectedProductForAdjust !== null &&
                adjustType === "DEDUCT" &&
                adjustQty > selectedProductForAdjust.currentStock)
            }
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {adjustLoading ? "กำลังบันทึก..." : "ยืนยันการปรับสต็อก"}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ================= MODAL 2: IMEI Tracking & History ================= */}
      <Dialog open={imeiModalOpen} onOpenChange={setImeiModalOpen}>
        <div className="max-w-3xl w-full">
          <DialogHeader>
            <DialogTitle onClose={() => setImeiModalOpen(false)}>
              ติดตามและบริหารหมายเลขเครื่อง IMEI (Device Serial & Condition)
            </DialogTitle>
          </DialogHeader>

          {selectedProductForImei && (
            <DialogContent className="space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-base">
                      {selectedProductForImei.name}
                    </h4>
                    <p className="text-xs text-slate-500 font-mono">
                      {selectedProductForImei.code} • แบรนด์: {selectedProductForImei.brand}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500">ราคาขายแนะนำ</span>
                    <div className="text-base font-bold font-mono text-slate-900">
                      {formatTHB(selectedProductForImei.sellPrice)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Form to Add New IMEI */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                  <Plus className="h-4 w-4 text-blue-600" />
                  <span>รับเครื่องใหม่เข้าสต็อก (Add IMEI)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                      หมายเลข IMEI (15 หลัก) *
                    </label>
                    <Input
                      placeholder="เช่น 358765098123456"
                      value={newImeiNum}
                      onChange={(e) => setNewImeiNum(e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                      Serial Number
                    </label>
                    <Input
                      placeholder="เช่น F2LX7102PL8K"
                      value={newImeiSerial}
                      onChange={(e) => setNewImeiSerial(e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                      เกรดสภาพเครื่อง
                    </label>
                    <select
                      value={newImeiGrade}
                      onChange={(e) => setNewImeiGrade(e.target.value as any)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold"
                    >
                      <option value="A">Grade A (นางฟ้า 95%+)</option>
                      <option value="B">Grade B (สภาพสวย 85-94%)</option>
                      <option value="C">Grade C (มีรอย/ใช้งาน &lt;85%)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    onClick={handleAddNewImei}
                    disabled={addingImei || !newImeiNum.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{addingImei ? "กำลังบันทึก..." : "เพิ่มเข้าระบบ"}</span>
                  </Button>
                </div>
              </div>

              {/* IMEI List Table */}
              <div>
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>รายการเครื่องในระบบ ({selectedProductForImei.imeis.length} เครื่อง)</span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    สาขา {currentBranch.code}
                  </span>
                </h5>

                <div className="rounded-xl border border-slate-200 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="py-2.5 px-3 text-left">IMEI / Serial</th>
                        <th className="py-2.5 px-3 text-center">เกรดสภาพ</th>
                        <th className="py-2.5 px-3 text-center">สถานะ</th>
                        <th className="py-2.5 px-3 text-right">ราคาทุน/ขาย</th>
                        <th className="py-2.5 px-3 text-right">ปรับสถานะ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedProductForImei.imeis.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400">
                            ยังไม่มีหมายเลข IMEI สำหรับรุ่นนี้
                          </td>
                        </tr>
                      ) : (
                        selectedProductForImei.imeis.map((im) => {
                          const statusColor =
                            im.status === "IN_STOCK"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : im.status === "SOLD"
                              ? "bg-slate-100 text-slate-600 border-slate-200"
                              : im.status === "PAWNED"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-purple-50 text-purple-700 border-purple-200";

                          return (
                            <tr key={im.id} className="hover:bg-slate-50/70">
                              <td className="py-2.5 px-3">
                                <div className="font-mono font-bold text-slate-900">{im.imei}</div>
                                {im.serialNo && (
                                  <div className="font-mono text-[10px] text-slate-400">
                                    SN: {im.serialNo}
                                  </div>
                                )}
                              </td>

                              <td className="py-2.5 px-3 text-center">
                                <select
                                  value={im.conditionGrade}
                                  onChange={(e) => handleUpdateImei(im.id, im.status, e.target.value)}
                                  className="rounded border border-slate-200 bg-white px-2 py-0.5 text-xs font-bold text-blue-700 focus:outline-none"
                                >
                                  <option value="A">Grade A</option>
                                  <option value="B">Grade B</option>
                                  <option value="C">Grade C</option>
                                </select>
                              </td>

                              <td className="py-2.5 px-3 text-center">
                                <span
                                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusColor}`}
                                >
                                  {im.status === "IN_STOCK"
                                    ? "พร้อมขาย"
                                    : im.status === "SOLD"
                                    ? "ขายแล้ว"
                                    : im.status === "PAWNED"
                                    ? "อยู่ระหว่างจำนำ"
                                    : im.status === "IN_REPAIR"
                                    ? "กำลังซ่อม"
                                    : "ส่งคืนแล้ว"}
                                </span>
                              </td>

                              <td className="py-2.5 px-3 text-right font-mono">
                                <div className="font-semibold text-slate-900">
                                  {formatTHB(im.sellPrice)}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  ทุน {formatTHB(im.costPrice)}
                                </div>
                              </td>

                              <td className="py-2.5 px-3 text-right">
                                <select
                                  value={im.status}
                                  onChange={(e) => handleUpdateImei(im.id, e.target.value, im.conditionGrade)}
                                  className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 focus:outline-none"
                                >
                                  <option value="IN_STOCK">พร้อมขาย</option>
                                  <option value="SOLD">ขายแล้ว</option>
                                  <option value="IN_REPAIR">ส่งซ่อม</option>
                                  <option value="PAWNED">จำนำ</option>
                                  <option value="RETURNED">ส่งคืน</option>
                                </select>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </DialogContent>
          )}

          <DialogFooter>
            <Button size="sm" onClick={() => setImeiModalOpen(false)}>
              ปิดหน้าต่าง
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* ================= MODAL 3: Create New Product ================= */}
      <Dialog open={newProductModalOpen} onOpenChange={setNewProductModalOpen}>
        <DialogHeader>
          <DialogTitle onClose={() => setNewProductModalOpen(false)}>
            เพิ่มสินค้าหรืออะไหล่ใหม่ (Add Product / Part)
          </DialogTitle>
        </DialogHeader>

        <DialogContent className="space-y-3 max-h-[80vh] overflow-y-auto">
          {/* Category */}
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">
              หมวดหมู่สินค้า *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setNpCategory("ACCESSORY")}
                className={`p-2 rounded-lg border text-xs font-semibold transition-all ${
                  npCategory === "ACCESSORY"
                    ? "border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-200"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                อุปกรณ์เสริม
              </button>
              <button
                type="button"
                onClick={() => setNpCategory("SPARE_PART")}
                className={`p-2 rounded-lg border text-xs font-semibold transition-all ${
                  npCategory === "SPARE_PART"
                    ? "border-purple-600 bg-purple-50 text-purple-700 ring-2 ring-purple-200"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                อะไหล่ซ่อมมือถือ
              </button>
              <button
                type="button"
                onClick={() => setNpCategory("DEVICE")}
                className={`p-2 rounded-lg border text-xs font-semibold transition-all ${
                  npCategory === "DEVICE"
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                โทรศัพท์มือถือ
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">
                รหัสสินค้า (SKU Code) *
              </label>
              <Input
                placeholder="เช่น ACC-ANK-65W"
                value={npCode}
                onChange={(e) => setNpCode(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">
                แบรนด์ (Brand)
              </label>
              <Input
                placeholder="เช่น Apple, Samsung, Anker"
                value={npBrand}
                onChange={(e) => setNpBrand(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">
              ชื่อสินค้า / ชิ้นส่วนอะไหล่ *
            </label>
            <Input
              placeholder="เช่น หัวชาร์จ Anker Nano II 65W หรือ หน้าจอเทียบแท้ iPhone 15"
              value={npName}
              onChange={(e) => setNpName(e.target.value)}
              className="text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">
              รุ่นหลัก (Model)
            </label>
            <Input
              placeholder="เช่น iPhone 15, Galaxy S24"
              value={npModel}
              onChange={(e) => setNpModel(e.target.value)}
              className="text-xs"
            />
          </div>

          {/* Compatible models for Spare Parts */}
          {npCategory === "SPARE_PART" && (
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">
                รุ่นโทรศัพท์ที่ใส่ด้วยกันได้ (Compatible Models คั่นด้วยจุลภาค)
              </label>
              <Input
                placeholder="เช่น iPhone 13, iPhone 13 Pro, iPhone 14"
                value={npCompatibles}
                onChange={(e) => setNpCompatibles(e.target.value)}
                className="text-xs"
              />
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-700 mb-1 block">
                ราคาทุน (บาท)
              </label>
              <Input
                type="number"
                placeholder="0"
                value={npCost}
                onChange={(e) => setNpCost(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-700 mb-1 block">
                ราคาขาย (บาท)
              </label>
              <Input
                type="number"
                placeholder="0"
                value={npSell}
                onChange={(e) => setNpSell(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-700 mb-1 block">
                เกณฑ์แจ้งเตือน (Min)
              </label>
              <Input
                type="number"
                value={npMinStock}
                onChange={(e) => setNpMinStock(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-700 mb-1 block">
                สต็อกเริ่มต้น ({currentBranch.code})
              </label>
              <Input
                type="number"
                value={npInitialStock}
                onChange={(e) => setNpInitialStock(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
          </div>
        </DialogContent>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setNewProductModalOpen(false)}>
            ยกเลิก
          </Button>
          <Button
            size="sm"
            onClick={handleCreateProduct}
            disabled={creatingProduct}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {creatingProduct ? "กำลังบันทึก..." : "เพิ่มสินค้าใหม่"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
