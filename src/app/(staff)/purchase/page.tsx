"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import confetti from "canvas-confetti";
import {
  HandCoins,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  User,
  History,
  Sparkles,
  Calculator,
  FileText,
  PlusCircle,
  Trash2,
  Building2,
  Truck,
  DollarSign,
  Search,
  Printer,
  PackagePlus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatTHB } from "@/lib/utils";
import { useApp } from "@/context/AppContext";
import { PhotoCaptureField } from "@/components/common/PhotoCaptureField";

export default function PurchasingAndBuybackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentBranch } = useApp();

  // Active Tab: PO or BUYBACK
  const [activeTab, setActiveTab] = useState<"PO" | "BUYBACK">("PO");

  // ==========================================
  // TAB 1: PURCHASE ORDER CREATION WORKFLOW
  // ==========================================
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [includeVat, setIncludeVat] = useState(true);
  const [notes, setNotes] = useState("");

  interface PoItem {
    id: string;
    productId: string | null;
    productCode: string;
    productName: string;
    category: "DEVICE" | "ACCESSORY" | "SPARE_PART";
    quantity: number;
    unitCost: number;
  }

  const [poItems, setPoItems] = useState<PoItem[]>([
    {
      id: "item-1",
      productId: null,
      productCode: "SCR-IP14P",
      productName: "หน้าจอแท้ iPhone 14 Pro Original OEM",
      category: "SPARE_PART",
      quantity: 5,
      unitCost: 3200,
    },
  ]);

  const [poSubmitting, setPoSubmitting] = useState(false);
  const [poError, setPoError] = useState("");
  const [createdPo, setCreatedPo] = useState<any | null>(null);

  // Load suppliers and inventory for PO
  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const res = await fetch("/api/suppliers");
        const data = await res.json();
        if (res.ok && data.success) {
          setSuppliers(data.suppliers || []);
          // Pre-select if from query
          const qSupId = searchParams.get("supplierId");
          const qSupName = searchParams.get("supplierName");
          if (qSupId) {
            setSelectedSupplierId(qSupId);
            const sup = data.suppliers?.find((s: any) => s.id === qSupId);
            if (sup) {
              setSupplierName(sup.name);
              setSupplierPhone(sup.phone);
            } else if (qSupName) {
              setSupplierName(qSupName);
            }
          } else if (data.suppliers?.length > 0) {
            setSelectedSupplierId(data.suppliers[0].id);
            setSupplierName(data.suppliers[0].name);
            setSupplierPhone(data.suppliers[0].phone);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    const loadProducts = async () => {
      try {
        const res = await fetch(`/api/inventory?take=100`);
        const data = await res.json();
        if (res.ok && data.success) {
          setAvailableProducts(data.products || []);
        }
      } catch (err) {
        console.error(err);
      }
    };

    loadSuppliers();
    loadProducts();
  }, [searchParams]);

  const handleSupplierSelect = (id: string) => {
    setSelectedSupplierId(id);
    const sup = suppliers.find((s) => s.id === id);
    if (sup) {
      setSupplierName(sup.name);
      setSupplierPhone(sup.phone);
    }
  };

  const handleAddPoItem = () => {
    setPoItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        productId: null,
        productCode: "",
        productName: "",
        category: "SPARE_PART",
        quantity: 1,
        unitCost: 0,
      },
    ]);
  };

  const handleSelectProductForItem = (itemIdx: number, prod: any) => {
    setPoItems((prev) => {
      const copy = [...prev];
      copy[itemIdx] = {
        ...copy[itemIdx],
        productId: prod.id,
        productCode: prod.code,
        productName: prod.name,
        category: prod.category || "SPARE_PART",
        unitCost: prod.costPrice || 0,
      };
      return copy;
    });
    setShowProductDropdown(false);
  };

  const handleRemovePoItem = (idx: number) => {
    if (poItems.length <= 1) return;
    setPoItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updatePoItemField = (idx: number, field: keyof PoItem, value: any) => {
    setPoItems((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  // PO Totals calculation with satang accuracy
  const poSubtotal = poItems.reduce((sum, it) => sum + (it.quantity || 0) * (it.unitCost || 0), 0);
  const poVat = includeVat ? Math.round(poSubtotal * 0.07 * 100) / 100 : 0;
  const poGrandTotal = Math.round((poSubtotal + poVat) * 100) / 100;

  const handleSubmitPo = async (status: "DRAFT" | "ORDERED") => {
    if (poSubmitting) return;
    setPoError("");

    if (!supplierName.trim()) {
      setPoError("กรุณาระบุชื่อซัพพลายเออร์");
      return;
    }

    for (const it of poItems) {
      if (!it.productName.trim()) {
        setPoError("กรุณาระบุชื่อรายการสินค้าให้ครบถ้วน");
        return;
      }
      if (it.quantity <= 0) {
        setPoError(`จำนวนสินค้าต้องมากกว่า 0 (${it.productName})`);
        return;
      }
      if (it.unitCost < 0) {
        setPoError(`ต้นทุนสินค้าไม่ถูกต้อง (${it.productName})`);
        return;
      }
    }

    setPoSubmitting(true);
    try {
      const payload = {
        branchId: currentBranch.id || currentBranch.code,
        supplierId: selectedSupplierId || null,
        supplierName,
        supplierPhone,
        status,
        includeVat,
        taxRate: 7,
        notes,
        items: poItems.map((it) => ({
          productId: it.productId,
          productCode: it.productCode || "ITEM",
          productName: it.productName,
          category: it.category,
          quantity: it.quantity,
          unitCost: it.unitCost,
        })),
      };

      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setPoError(data.error || "บันทึกใบสั่งซื้อไม่สำเร็จ");
        return;
      }

      confetti({ particleCount: 120, spread: 80 });
      setCreatedPo(data.purchase);
    } catch (err) {
      console.error(err);
      setPoError("เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ");
    } finally {
      setPoSubmitting(false);
    }
  };

  // ==========================================
  // TAB 2: SECONDHAND BUYBACK APPRAISAL STATE
  // ==========================================
  const [brand, setBrand] = useState("Apple");
  const [model, setModel] = useState("iPhone 14 Pro 128GB");
  const [capacity, setCapacity] = useState("128GB");
  const [imei, setImei] = useState("358912345098711");
  const [conditionGrade, setConditionGrade] = useState<"A" | "B" | "C">("A");

  const [batteryHealth, setBatteryHealth] = useState(88);
  const [screenOriginal, setScreenOriginal] = useState(true);
  const [faceIdOk, setFaceIdOk] = useState(true);
  const [housingOk, setHousingOk] = useState(true);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [customerPhoto, setCustomerPhoto] = useState<string | null>(null);
  const [declarationAgreed, setDeclarationAgreed] = useState(true);

  const BASE_PRICES: Record<string, number> = {
    "iPhone 14 Pro 128GB": 21000,
    "iPhone 14 Pro Max 256GB": 25000,
    "iPhone 13 128GB": 13500,
    "Samsung Galaxy S23 Ultra": 19000,
  };

  const base = BASE_PRICES[model] || 15000;
  const CAPACITY_RE = /\s*\b\d+\s?(GB|TB)\b/i;
  const deviceModelName = `${model.replace(CAPACITY_RE, "").trim()} ${capacity}`;
  let multiplier = conditionGrade === "A" ? 1.0 : conditionGrade === "B" ? 0.88 : 0.75;
  if (batteryHealth < 80) multiplier -= 0.05;
  if (!screenOriginal) multiplier -= 0.12;
  if (!faceIdOk) multiplier -= 0.1;

  const estimatedBuybackPrice = Math.round((base * multiplier) / 100) * 100;
  const [finalPrice, setFinalPrice] = useState<number>(estimatedBuybackPrice);

  const [submittingBuyback, setSubmittingBuyback] = useState(false);
  const [buybackError, setBuybackError] = useState("");

  const handleSubmitBuyback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingBuyback) return;
    setBuybackError("");

    if (!customerName.trim() || !customerPhone.trim() || !nationalId.trim() || !imei.trim()) {
      setBuybackError("กรุณากรอกข้อมูลลูกค้าและเลข IMEI ให้ครบถ้วน");
      return;
    }
    if (!/^\d{13}$/.test(nationalId.replace(/[\s-]/g, ""))) {
      setBuybackError("กรุณากรอกเลขบัตรประชาชน 13 หลักให้ถูกต้อง");
      return;
    }
    if (!declarationAgreed) {
      setBuybackError("ลูกค้าต้องยินยอมในหนังสือรับรองกรรมสิทธิ์ว่าไม่ใช่เครื่องโจรกรรม");
      return;
    }
    const price = finalPrice || estimatedBuybackPrice;
    if (!Number.isFinite(price) || price <= 0) {
      setBuybackError("ราคารับซื้อต้องมากกว่า 0");
      return;
    }

    setSubmittingBuyback(true);
    try {
      const payload = {
        type: "BUYBACK",
        branchCode: currentBranch.id || currentBranch.code,
        customerName,
        customerPhone,
        nationalId,
        deviceBrand: brand,
        deviceModel: deviceModelName,
        imei,
        conditionGrade,
        declarationAgreed,
        customerPhoto,
        inspectionData: { batteryHealth, screenOriginal, faceIdOk, housingOk, estimatedBuybackPrice },
        agreedPrice: price,
      };

      const res = await fetch("/api/trade-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setBuybackError(json.error || "บันทึกการรับซื้อไม่สำเร็จ กรุณาลองใหม่");
        return;
      }
      confetti({ particleCount: 110, spread: 70 });
      router.push("/purchase-history");
    } catch (err) {
      console.error(err);
      setBuybackError("เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ");
    } finally {
      setSubmittingBuyback(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            <span>ระบบจัดซื้อ & รับซื้อสินค้า (Purchasing & Procurement)</span>
          </h1>
          <p className="text-sm text-slate-500">
            ออกใบสั่งซื้อสินค้า (PO) ส่งซัพพลายเออร์ และระบบประเมินราคารับซื้อมือถือมือสอง
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/purchase-history">
            <Button variant="outline" size="sm" className="text-xs gap-1.5 font-semibold text-slate-700">
              <History className="w-3.5 h-3.5 text-slate-600" />
              <span>ประวัติการสั่งซื้อ & สัญญา</span>
            </Button>
          </Link>
          <Link href="/suppliers">
            <Button variant="outline" size="sm" className="text-xs gap-1.5 font-semibold text-slate-700">
              <Truck className="w-3.5 h-3.5 text-blue-600" />
              <span>ทะเบียนซัพพลายเออร์</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("PO")}
          className={`py-2.5 px-5 font-bold text-xs border-b-2 flex items-center gap-2 transition-all ${
            activeTab === "PO"
              ? "border-blue-600 text-blue-600 bg-blue-50/50"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <PackagePlus className="w-4 h-4" />
          <span>1. สร้างใบสั่งซื้อสินค้า PO (Supplier Purchase Order)</span>
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
          <span>2. รับซื้อเครื่องมือสองจากลูกค้า (Device Buyback Appraisal)</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: PURCHASE ORDER CREATION WORKFLOW */}
      {/* ======================================================== */}
      {activeTab === "PO" && (
        <div className="space-y-6">
          {/* PO Success Banner */}
          {createdPo && (
            <Card className="border-emerald-300 bg-emerald-50">
              <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <div className="text-sm font-bold text-emerald-900">
                      สร้างใบสั่งซื้อสำเร็จ! เลขที่ PO: <span className="font-mono">{createdPo.poNumber}</span>
                    </div>
                    <div className="text-xs text-emerald-700 mt-0.5">
                      ซัพพลายเออร์: {createdPo.supplierName} • สาขา: {createdPo.branch?.name} • ยอดรวม:{" "}
                      {formatTHB(createdPo.totalAmount)}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href="/purchase-history">
                    <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                      ดูในประวัติจัดซื้อ
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setCreatedPo(null);
                      setPoItems([
                        {
                          id: `item-${Date.now()}`,
                          productId: null,
                          productCode: "",
                          productName: "",
                          category: "SPARE_PART",
                          quantity: 1,
                          unitCost: 0,
                        },
                      ]);
                    }}
                    className="h-8 text-xs text-emerald-800"
                  >
                    สร้าง PO ใหม่
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Supplier & Branch Selection Card */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                <span>1. ข้อมูลสาขา & ซัพพลายเออร์ผู้จำหน่าย</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">สาขารับสินค้า</label>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 font-bold text-slate-800 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span>{currentBranch.name || "สำนักงานใหญ่"}</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-semibold text-slate-700">เลือกซัพพลายเออร์ในระบบ</label>
                  <Link href="/suppliers" className="text-[11px] text-blue-600 hover:underline">
                    + เพิ่มรายชื่อ
                  </Link>
                </div>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => handleSupplierSelect(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white font-medium"
                >
                  <option value="">-- กำหนดเอง / ซัพพลายเออร์ทั่วไป --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.creditTerms})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ชื่อซัพพลายเออร์ที่แสดงบน PO *</label>
                <Input
                  required
                  placeholder="เช่น บจก. เสือป่า อะไหล่"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </CardContent>
          </Card>

          {/* Items Order Table Card */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>2. รายการสินค้าและอะไหล่ที่ต้องการสั่งซื้อ</span>
              </CardTitle>
              <Button size="sm" onClick={handleAddPoItem} className="h-7 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 gap-1 font-semibold">
                <PlusCircle className="w-3.5 h-3.5" />
                <span>เพิ่มรายการ</span>
              </Button>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 w-10 text-center">#</th>
                      <th className="p-2.5 w-32">หมวดหมู่</th>
                      <th className="p-2.5 w-36">รหัสสินค้า/บาร์โค้ด</th>
                      <th className="p-2.5">ชื่อสินค้า & สเปกอะไหล่ *</th>
                      <th className="p-2.5 w-24 text-center">จำนวน *</th>
                      <th className="p-2.5 w-32 text-right">ต้นทุน/หน่วย (THB) *</th>
                      <th className="p-2.5 w-28 text-right">รวมเงิน (THB)</th>
                      <th className="p-2.5 w-12 text-center">ลบ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {poItems.map((item, idx) => {
                      const lineTotal = (item.quantity || 0) * (item.unitCost || 0);

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70">
                          <td className="p-2 text-center text-slate-400 font-mono">{idx + 1}</td>

                          <td className="p-2">
                            <select
                              value={item.category}
                              onChange={(e) => updatePoItemField(idx, "category", e.target.value as any)}
                              className="w-full text-[11px] rounded border border-slate-300 p-1 bg-white font-medium"
                            >
                              <option value="SPARE_PART">อะไหล่ (SPARE_PART)</option>
                              <option value="ACCESSORY">อุปกรณ์เสริม (ACCESSORY)</option>
                              <option value="DEVICE">เครื่องโทรศัพท์ (DEVICE)</option>
                            </select>
                          </td>

                          <td className="p-2">
                            <Input
                              placeholder="เช่น SCR-001"
                              value={item.productCode}
                              onChange={(e) => updatePoItemField(idx, "productCode", e.target.value)}
                              className="h-7 text-xs font-mono"
                            />
                          </td>

                          <td className="p-2 relative">
                            <Input
                              required
                              placeholder="พิมพ์ชื่อสินค้าหรืออะไหล่..."
                              value={item.productName}
                              onChange={(e) => updatePoItemField(idx, "productName", e.target.value)}
                              className="h-7 text-xs font-semibold"
                            />
                            {/* Fast pick quick suggestion */}
                            {availableProducts.length > 0 && !item.productId && (
                              <div className="text-[10px] text-slate-400 mt-1 flex flex-wrap gap-1">
                                <span className="text-slate-500">เลือกจากคลัง:</span>
                                {availableProducts.slice(0, 3).map((p) => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => handleSelectProductForItem(idx, p)}
                                    className="bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-700 px-1.5 py-0.5 rounded"
                                  >
                                    {p.name.slice(0, 20)}...
                                  </button>
                                ))}
                              </div>
                            )}
                          </td>

                          <td className="p-2 text-center">
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updatePoItemField(idx, "quantity", parseInt(e.target.value, 10) || 1)}
                              className="h-7 text-xs text-center font-bold font-mono"
                            />
                          </td>

                          <td className="p-2 text-right">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitCost}
                              onChange={(e) => updatePoItemField(idx, "unitCost", parseFloat(e.target.value) || 0)}
                              className="h-7 text-xs text-right font-mono"
                            />
                          </td>

                          <td className="p-2 text-right font-mono font-bold text-slate-900">
                            {formatTHB(lineTotal)}
                          </td>

                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemovePoItem(idx)}
                              disabled={poItems.length <= 1}
                              className="text-slate-400 hover:text-rose-600 disabled:opacity-30 p-1"
                              title="ลบแถวนี้"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Financial Calculation Summary */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-3 border-t border-slate-100">
                <div className="w-full sm:w-1/2 space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">หมายเหตุ / เงื่อนไขจัดส่ง</label>
                  <textarea
                    rows={3}
                    placeholder="เช่น จัดส่งก่อนเที่ยงวันพุธ, เครดิต 30 วัน, ตรวจสอบบอดี้ก่อนส่งมอบ"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2"
                  />
                </div>

                <div className="w-full sm:w-72 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>ยอดรวมสินค้า (Subtotal):</span>
                    <span className="font-mono font-semibold">{formatTHB(poSubtotal)}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-600">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeVat}
                        onChange={(e) => setIncludeVat(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span>ภาษีมูลค่าเพิ่ม (VAT 7%):</span>
                    </label>
                    <span className="font-mono font-semibold">{formatTHB(poVat)}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-bold text-slate-900">
                    <span>ยอดเงินสุทธิ (Total):</span>
                    <span className="text-base text-blue-700 font-mono font-black">{formatTHB(poGrandTotal)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {poError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{poError}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={poSubmitting}
              onClick={() => handleSubmitPo("DRAFT")}
              className="text-xs h-10 px-5 font-semibold text-slate-700"
            >
              <span>บันทึกเป็นแบบร่าง (Save Draft)</span>
            </Button>
            <Button
              type="button"
              disabled={poSubmitting}
              onClick={() => handleSubmitPo("ORDERED")}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 px-7 shadow-sm gap-2"
            >
              <PackagePlus className="w-4 h-4" />
              <span>{poSubmitting ? "กำลังบันทึก..." : "ยืนยันและออกใบสั่งซื้อ (Submit PO)"}</span>
            </Button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: SECONDHAND BUYBACK APPRAISAL WORKFLOW */}
      {/* ======================================================== */}
      {activeTab === "BUYBACK" && (
        <form onSubmit={handleSubmitBuyback} className="space-y-6">
          <Card className="border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-purple-600" />
                <span>1. สเปกตัวเครื่องและการประเมินสภาพ (Condition Grading)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ยี่ห้อ</label>
                  <select
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                  >
                    <option value="Apple">Apple</option>
                    <option value="Samsung">Samsung</option>
                    <option value="Xiaomi">Xiaomi</option>
                    <option value="Oppo">Oppo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">รุ่นอุปกรณ์</label>
                  <select
                    value={model}
                    onChange={(e) => {
                      setModel(e.target.value);
                      const cap = e.target.value.match(/\b(\d+\s?(?:GB|TB))\b/i)?.[1];
                      if (cap) setCapacity(cap.replace(/\s/g, "").toUpperCase());
                    }}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                  >
                    <option value="iPhone 14 Pro 128GB">iPhone 14 Pro 128GB</option>
                    <option value="iPhone 14 Pro Max 256GB">iPhone 14 Pro Max 256GB</option>
                    <option value="iPhone 13 128GB">iPhone 13 128GB</option>
                    <option value="Samsung Galaxy S23 Ultra">Samsung Galaxy S23 Ultra</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ความจุ</label>
                  <select
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                  >
                    <option value="64GB">64GB</option>
                    <option value="128GB">128GB</option>
                    <option value="256GB">256GB</option>
                    <option value="512GB">512GB</option>
                    <option value="1TB">1TB</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">IMEI ตัวเครื่อง (15 หลัก) *</label>
                <Input
                  required
                  value={imei}
                  onChange={(e) => setImei(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>

              {/* Condition Grade Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  เกรดสภาพตัวเครื่องภายนอก (Physical Grade)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { grade: "A", title: "Grade A (95-99%)", desc: "สวยกริบ ไร้รอย หรือรอยขนแมวน้อยมาก" },
                    { grade: "B", title: "Grade B (85-94%)", desc: "มีรอยเคสกัด ขอบมีรอยเล็กน้อย จอไม่แตก" },
                    { grade: "C", title: "Grade C (< 85%)", desc: "มีรอยกระแทก บอดี้บิ่น หรือเปลี่ยนจอเทียบ" },
                  ].map((g) => (
                    <div
                      key={g.grade}
                      onClick={() => setConditionGrade(g.grade as any)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        conditionGrade === g.grade
                          ? "bg-purple-50 border-purple-400 text-purple-900 shadow-xs font-semibold"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="font-bold text-xs">{g.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{g.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Checklist factors */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
                <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border">
                  <input
                    type="checkbox"
                    checked={screenOriginal}
                    onChange={(e) => setScreenOriginal(e.target.checked)}
                    className="rounded text-purple-600"
                  />
                  <span>จอแท้เดิมศูนย์</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border">
                  <input
                    type="checkbox"
                    checked={faceIdOk}
                    onChange={(e) => setFaceIdOk(e.target.checked)}
                    className="rounded text-purple-600"
                  />
                  <span>FaceID / สแกนผ่าน</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border">
                  <input
                    type="checkbox"
                    checked={housingOk}
                    onChange={(e) => setHousingOk(e.target.checked)}
                    className="rounded text-purple-600"
                  />
                  <span>บอดี้ไม่งอ/ไม่ร้าว</span>
                </label>

                <div className="p-2 rounded-lg bg-slate-50 border flex items-center justify-between">
                  <span>สุขภาพแบต:</span>
                  <span className="font-bold font-mono">{batteryHealth}%</span>
                </div>
              </div>

              {/* Price Appraisal Result Banner */}
              <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1">
                    <Calculator className="w-3.5 h-3.5" />
                    ราคารับซื้อประเมินกลางตามเกรด
                  </span>
                  <div className="text-2xl font-black text-purple-900 mt-0.5">
                    {formatTHB(estimatedBuybackPrice)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 font-semibold">ราคาตกลงจริง (THB):</span>
                  <Input
                    type="number"
                    value={finalPrice || estimatedBuybackPrice}
                    onChange={(e) => setFinalPrice(Number(e.target.value))}
                    className="w-32 font-bold text-sm font-mono h-9 bg-white border-purple-300"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer & Anti-Theft Declaration Box */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-purple-600" />
                <span>2. ข้อมูลผู้ขาย & หนังสือยืนยันปลอดโจรกรรม (Anti-Theft Declaration)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อ-นามสกุลผู้ขาย *</label>
                  <Input
                    required
                    placeholder="เช่น คุณกฤษดา"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์ *</label>
                  <Input
                    required
                    placeholder="08X-XXX-XXXX"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">เลขบัตรประจำตัวประชาชน 13 หลัก *</label>
                  <Input
                    required
                    placeholder="X-XXXX-XXXXX-XX-X"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              {/* Customer ID / Face Photo */}
              <div className="pt-2">
                <PhotoCaptureField
                  label="ภาพถ่ายบัตรประชาชน / ใบหน้าผู้ขาย"
                  value={customerPhoto}
                  onChange={(url) => setCustomerPhoto(url)}
                  guideType="id-card"
                  placeholderText="ถ่ายภาพบัตร / แนบรูป"
                  helperText="ถ่ายบัตรประชาชน หรือภาพถ่ายผู้ขายคู่กับตัวเครื่องเพื่อป้องกันคดีรับของโจร"
                />
              </div>

              {/* Anti-Theft Legal Notice */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-900">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>หนังสือรับรองความบริสุทธิ์ของทรัพย์สิน (ตาม ป.อ. มาตรา 357 รับของโจร)</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-700">
                  ข้าพเจ้าขอยืนยันว่าโทรศัพท์มือถือเครื่องดังกล่าวเป็นกรรมสิทธิ์อันชอบธรรมของข้าพเจ้าแต่เพียงผู้เดียว มิได้มาจากการลักทรัพย์ วิ่งราวทรัพย์ ปล้นทรัพย์ หรือกระทำความผิดทางกฎหมายใดๆ ทั้งสิ้น และยินยอมให้ทางร้านเก็บหลักฐานสำเนาบัตรประชาชนเพื่อการตรวจสอบ
                </p>
                <label className="flex items-center gap-2 pt-1 font-semibold text-xs text-slate-900 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={declarationAgreed}
                    onChange={(e) => setDeclarationAgreed(e.target.checked)}
                    className="rounded text-purple-600 h-4 w-4"
                  />
                  <span>ผู้ขายได้อ่านและยินยอมตามข้อความในหนังสือรับรองข้างต้นทุกประการ</span>
                </label>
              </div>
            </CardContent>
          </Card>

          {buybackError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{buybackError}</span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={submittingBuyback}
              className="text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold px-8 h-10 shadow-sm gap-2"
            >
              <HandCoins className="w-4 h-4" />
              <span>{submittingBuyback ? "กำลังบันทึก..." : "อนุมัติรับซื้อและออกสัญญาซื้อขาย"}</span>
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
