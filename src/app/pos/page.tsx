"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import confetti from "canvas-confetti";
import {
  ShoppingCart,
  Scan,
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  QrCode,
  Banknote,
  Split,
  Printer,
  FileText,
  CheckCircle2,
  User,
  Building2,
  Smartphone,
  Package,
  Wrench,
  Percent,
  X,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { formatTHB, formatDateThai } from "@/lib/utils";

interface CartItem {
  productId: string;
  code: string;
  name: string;
  category: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  deviceImeiId?: string;
  imeiNumber?: string;
  conditionGrade?: string;
}

interface ProductItem {
  id: string;
  code: string;
  name: string;
  category: "ACCESSORY" | "SPARE_PART" | "DEVICE";
  brand: string;
  model: string;
  costPrice: number;
  sellPrice: number;
  currentStock: number;
  imeis: Array<{
    id: string;
    imei: string;
    conditionGrade: string;
    status: string;
    sellPrice: number;
    costPrice: number;
  }>;
}

export default function PosPage() {
  const { currentBranch, currentUser } = useApp();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | "ACCESSORY" | "SPARE_PART" | "DEVICE">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [discountMode, setDiscountMode] = useState<"BAHT" | "PERCENT">("BAHT");

  // Customer Info for Tax Invoice
  const [customerName, setCustomerName] = useState("ลูกค้าทั่วไป (Walk-in)");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerTaxId, setCustomerTaxId] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  // Device IMEI Selection Modal
  const [selectedDeviceForImei, setSelectedDeviceForImei] = useState<ProductItem | null>(null);
  const [deviceImeiModalOpen, setDeviceImeiModalOpen] = useState(false);

  // Payment Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "PROMPTPAY" | "CARD" | "SPLIT">("CASH");
  const [cashReceived, setCashReceived] = useState<string>("");
  const [selectedBank, setSelectedBank] = useState("กสิกรไทย (KBank)");
  const [cardApprovalCode, setCardApprovalCode] = useState("");
  const [cardLastDigits, setCardLastDigits] = useState("");

  // Split payment state
  const [splitCash, setSplitCash] = useState<string>("");
  const [splitSecondaryMethod, setSplitSecondaryMethod] = useState<"PROMPTPAY" | "CARD">("PROMPTPAY");
  const [splitSecondaryAmount, setSplitSecondaryAmount] = useState<string>("");

  // Receipt & Print Modal State
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [printFormat, setPrintFormat] = useState<"80MM" | "A4">("80MM");
  const [lastSaleResult, setLastSaleResult] = useState<any>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Barcode input ref
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Fetch product catalog
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/inventory?branch=${currentBranch.code}`);
      const data = await res.json();
      if (data.success) {
        setProducts(data.products);
      }
    } catch (err) {
      console.error("Failed to load products for POS:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [currentBranch.code]);

  // Filtered Catalog
  const filteredCatalog = useMemo(() => {
    return products.filter((p) => {
      if (categoryFilter !== "ALL" && p.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesCode = p.code.toLowerCase().includes(q);
        const matchesBrand = p.brand?.toLowerCase().includes(q);
        const matchesModel = p.model?.toLowerCase().includes(q);
        const matchesImei = p.imeis?.some((i) => i.imei.toLowerCase().includes(q));
        return matchesName || matchesCode || matchesBrand || matchesModel || matchesImei;
      }
      return true;
    });
  }, [products, categoryFilter, searchQuery]);

  // Cart Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  }, [cart]);

  const effectiveDiscount = useMemo(() => {
    if (discountMode === "PERCENT") {
      return (subtotal * (discountPercent || 0)) / 100;
    }
    return discountAmount || 0;
  }, [subtotal, discountMode, discountPercent, discountAmount]);

  const grandTotal = Math.max(0, subtotal - effectiveDiscount);

  // ภ.พ.30 VAT 7% Inclusive Calculation
  const netBeforeVat = +(grandTotal / 1.07).toFixed(2);
  const vatAmount = +(grandTotal - netBeforeVat).toFixed(2);

  // Add standard product to cart
  const addToCart = (product: ProductItem, specificImei?: any) => {
    // If it is a DEVICE and no specific IMEI selected yet
    if (product.category === "DEVICE" && !specificImei) {
      const inStockImeis = product.imeis.filter((i) => i.status === "IN_STOCK");
      if (inStockImeis.length === 0) {
        alert("ขออภัย สินค้ารุ่นนี้ไม่มีเครื่องพร้อมขายในสต็อก");
        return;
      }
      setSelectedDeviceForImei(product);
      setDeviceImeiModalOpen(true);
      return;
    }

    if (specificImei) {
      // Check if this specific IMEI is already in cart
      const exists = cart.some((it) => it.deviceImeiId === specificImei.id);
      if (exists) {
        alert(`เครื่อง IMEI: ${specificImei.imei} อยู่ในตะกร้าแล้ว`);
        return;
      }

      setCart((prev) => [
        ...prev,
        {
          productId: product.id,
          code: product.code,
          name: `${product.name} (เกรด ${specificImei.conditionGrade})`,
          category: product.category,
          unitPrice: specificImei.sellPrice || product.sellPrice,
          costPrice: specificImei.costPrice || product.costPrice,
          quantity: 1,
          deviceImeiId: specificImei.id,
          imeiNumber: specificImei.imei,
          conditionGrade: specificImei.conditionGrade,
        },
      ]);
      setDeviceImeiModalOpen(false);
      return;
    }

    // Standard product (Accessory or Spare Part)
    setCart((prev) => {
      const existingIndex = prev.findIndex((it) => it.productId === product.id && !it.deviceImeiId);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += 1;
        return updated;
      } else {
        return [
          ...prev,
          {
            productId: product.id,
            code: product.code,
            name: product.name,
            category: product.category,
            unitPrice: product.sellPrice,
            costPrice: product.costPrice,
            quantity: 1,
          },
        ];
      }
    });
  };

  // Update item quantity in cart
  const updateQuantity = (index: number, delta: number) => {
    setCart((prev) => {
      const updated = [...prev];
      const item = updated[index];
      // Devices with IMEI cannot have quantity > 1
      if (item.deviceImeiId) {
        if (delta < 0) {
          return updated.filter((_, i) => i !== index);
        }
        return updated;
      }
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        return updated.filter((_, i) => i !== index);
      }
      item.quantity = newQty;
      return updated;
    });
  };

  // Remove single item
  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  // Barcode / Fast scanner handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    const code = barcodeInput.trim();

    // 1. Check if it matches an IMEI
    for (const prod of products) {
      const foundImei = prod.imeis?.find((im) => im.imei === code);
      if (foundImei) {
        if (foundImei.status !== "IN_STOCK") {
          alert(`IMEI ${code} สถานะไม่ใช่พร้อมขาย (${foundImei.status})`);
          setBarcodeInput("");
          return;
        }
        addToCart(prod, foundImei);
        setBarcodeInput("");
        return;
      }
    }

    // 2. Check if it matches exact product SKU code
    const foundProd = products.find(
      (p) => p.code.toLowerCase() === code.toLowerCase()
    );
    if (foundProd) {
      addToCart(foundProd);
      setBarcodeInput("");
      return;
    }

    alert(`ไม่พบสินค้าหรือ IMEI ที่ตรงกับรหัส "${code}"`);
    setBarcodeInput("");
  };

  // Payment Confirmation & API Call
  const handleConfirmPayment = async () => {
    if (cart.length === 0) return;

    // Validate Cash Amount if Cash method
    const cashNum = parseFloat(cashReceived);
    if (paymentMethod === "CASH" && (isNaN(cashNum) || cashNum < grandTotal)) {
      alert("ยอดเงินสดที่รับมาต้องไม่น้อยกว่ายอดรวมที่ต้องชำระ");
      return;
    }

    // Validate Split Payment if Split method
    if (paymentMethod === "SPLIT") {
      const sCash = parseFloat(splitCash) || 0;
      const sSec = parseFloat(splitSecondaryAmount) || 0;
      if (Math.abs(sCash + sSec - grandTotal) > 0.05) {
        alert(
          `ยอดเงินสด (${sCash}) รวมกับยอด ${splitSecondaryMethod} (${sSec}) ไม่ตรงกับยอดชำระ (${grandTotal})`
        );
        return;
      }
    }

    try {
      setProcessingPayment(true);
      const paymentDetails =
        paymentMethod === "CASH"
          ? {
              received: cashNum,
              change: +(cashNum - grandTotal).toFixed(2),
            }
          : paymentMethod === "PROMPTPAY"
          ? {
              promptpayRef: `PP-${Date.now().toString().slice(-6)}`,
            }
          : paymentMethod === "CARD"
          ? {
              bank: selectedBank,
              lastDigits: cardLastDigits || "8888",
              approvalCode: cardApprovalCode || "APP-998811",
            }
          : {
              cashPart: parseFloat(splitCash) || 0,
              secondaryMethod: splitSecondaryMethod,
              secondaryPart: parseFloat(splitSecondaryAmount) || 0,
            };

      const payload = {
        branchCode: currentBranch.code,
        cashierUsername: currentUser.username,
        customerData: {
          name: customerName,
          phone: customerPhone || "080-000-0000",
          nationalId: customerTaxId || null,
          address: customerAddress || null,
        },
        items: cart.map((it) => ({
          productId: it.productId,
          deviceImeiId: it.deviceImeiId || null,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          costPrice: it.costPrice,
        })),
        discount: effectiveDiscount,
        paymentMethod,
        paymentDetails,
      };

      const res = await fetch("/api/pos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        // Fire celebration confetti!
        try {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.6 },
          });
        } catch (_) {}

        setLastSaleResult(data);
        setPaymentModalOpen(false);
        setReceiptModalOpen(true);
        // Clear cart
        setCart([]);
        setDiscountAmount(0);
        setDiscountPercent(0);
        setCashReceived("");
        fetchProducts(); // Refresh stocks
      } else {
        alert(data.error || "ไม่สามารถทำรายการได้");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setProcessingPayment(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <span>จุดขายหน้าร้าน & แคชเชียร์ (POS Checkout)</span>
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                LIVE
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              รองรับสแกนบาร์โค้ด, ชำระเงินหลายช่องทาง (PromptPay QR, บัตร, แยกชำระ), และพิมพ์ใบเสร็จ 80mm / ภ.พ.30
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 flex items-center gap-1.5 shadow-2xs">
            <Building2 className="h-3.5 w-3.5 text-blue-600" />
            <span>สาขา: <strong>{currentBranch.name}</strong></span>
          </span>
          <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 flex items-center gap-1.5 shadow-2xs">
            <User className="h-3.5 w-3.5 text-emerald-600" />
            <span>แคชเชียร์: <strong>{currentUser.name}</strong></span>
          </span>
        </div>
      </div>

      {/* Main Grid: Left Catalog (60%) & Right Cart (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ================= LEFT SIDE: CATALOG & SEARCH ================= */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* Barcode & Search Controls */}
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Barcode scanner form */}
            <form onSubmit={handleBarcodeSubmit} className="relative flex-1">
              <Scan className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="ยิงบาร์โค้ด หรือพิมพ์ IMEI / รหัสสินค้า แล้วกด Enter..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="w-full rounded-xl border-2 border-emerald-500/40 bg-white py-2 pl-9 pr-3 text-xs font-mono placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200 shadow-xs"
              />
            </form>

            {/* Keyword search input */}
            <div className="relative sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อ, รุ่น, แบรนด์..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-3 text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setCategoryFilter("ALL")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                categoryFilter === "ALL"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              ทั้งหมด ({products.length})
            </button>
            <button
              onClick={() => setCategoryFilter("ACCESSORY")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                categoryFilter === "ACCESSORY"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Package className="h-3.5 w-3.5" />
              <span>อุปกรณ์เสริม</span>
            </button>
            <button
              onClick={() => setCategoryFilter("SPARE_PART")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                categoryFilter === "SPARE_PART"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Wrench className="h-3.5 w-3.5" />
              <span>อะไหล่ซ่อม</span>
            </button>
            <button
              onClick={() => setCategoryFilter("DEVICE")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                categoryFilter === "DEVICE"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>โทรศัพท์ & IMEI</span>
            </button>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {loading ? (
              <div className="col-span-full py-12 text-center text-slate-400">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
                กำลังโหลดรายการสินค้า...
              </div>
            ) : filteredCatalog.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400">
                ไม่พบสินค้าในหมวดหมู่นี้
              </div>
            ) : (
              filteredCatalog.map((product) => {
                const inCartQty = cart
                  .filter((it) => it.productId === product.id)
                  .reduce((acc, it) => acc + it.quantity, 0);

                const inStockImeisCount = product.imeis?.filter((i) => i.status === "IN_STOCK").length || 0;

                return (
                  <div
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-2xs hover:border-blue-400 hover:shadow-md transition-all cursor-pointer select-none"
                  >
                    {/* Badge In Cart */}
                    {inCartQty > 0 && (
                      <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white shadow-sm ring-2 ring-white">
                        {inCartQty}
                      </span>
                    )}

                    <div>
                      {/* Top Category / Brand */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span className="font-mono">{product.code}</span>
                        <span className="font-semibold text-slate-500">{product.brand}</span>
                      </div>

                      {/* Product Name */}
                      <h4 className="font-semibold text-xs text-slate-900 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                        {product.name}
                      </h4>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                      {/* Price */}
                      <div className="font-bold text-sm text-slate-900 font-mono">
                        {formatTHB(product.sellPrice)}
                      </div>

                      {/* Stock indicator */}
                      {product.category === "DEVICE" ? (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium font-mono ${
                            inStockImeisCount > 0
                              ? "bg-indigo-50 text-indigo-700"
                              : "bg-rose-50 text-rose-600"
                          }`}
                        >
                          {inStockImeisCount} เครื่อง
                        </span>
                      ) : (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium font-mono ${
                            product.currentStock > 0
                              ? "bg-slate-100 text-slate-600"
                              : "bg-rose-50 text-rose-600"
                          }`}
                        >
                          สต็อก {product.currentStock}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ================= RIGHT SIDE: CART & CHECKOUT ================= */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-3">
          <Card className="border-slate-300 shadow-md flex flex-col h-[calc(100vh-140px)]">
            {/* Cart Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-slate-700" />
                  <span className="font-bold text-sm text-slate-900">
                    ตะกร้าสินค้า ({cart.reduce((a, b) => a + b.quantity, 0)} ชิ้น)
                  </span>
                </div>
                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    className="text-xs text-rose-600 hover:underline flex items-center gap-1 font-medium"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>ล้างตะกร้า</span>
                  </button>
                )}
              </div>

              {/* Customer Selector / Tax Info */}
              <div className="mt-2.5 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs">
                <div className="flex items-center gap-1.5 text-slate-700 truncate max-w-[200px]">
                  <User className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <span className="font-semibold truncate">{customerName}</span>
                </div>
                <button
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="text-[11px] text-blue-600 hover:underline font-medium shrink-0"
                >
                  {customerTaxId ? "แก้ไขใบกำกับ" : "+ ข้อมูลใบกำกับภาษี"}
                </button>
              </div>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-3 divide-y divide-slate-100">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12">
                  <ShoppingCart className="h-10 w-10 text-slate-300 mb-2 stroke-[1.5]" />
                  <p className="text-sm font-medium text-slate-500">ยังไม่มีสินค้าในตะกร้า</p>
                  <p className="text-xs text-slate-400 mt-1">
                    คลิกสินค้าทางซ้าย หรือยิงบาร์โค้ดเพื่อเพิ่มรายการ
                  </p>
                </div>
              ) : (
                cart.map((item, index) => (
                  <div key={`${item.productId}-${item.deviceImeiId || index}`} className="py-2.5 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h5 className="font-semibold text-xs text-slate-900 leading-snug">
                          {item.name}
                        </h5>
                        {item.imeiNumber && (
                          <div className="font-mono text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded inline-block mt-0.5">
                            IMEI: {item.imeiNumber} ({item.conditionGrade})
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => removeFromCart(index)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-0.5"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      {/* Quantity Controls */}
                      {item.deviceImeiId ? (
                        <span className="text-[11px] font-mono text-slate-500 font-semibold">
                          จำนวน: 1 เครื่อง
                        </span>
                      ) : (
                        <div className="flex items-center border border-slate-200 rounded-md bg-white">
                          <button
                            onClick={() => updateQuantity(index, -1)}
                            className="p-1 text-slate-500 hover:bg-slate-100 rounded-l"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="px-2 font-mono text-xs font-bold text-slate-800">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(index, 1)}
                            className="p-1 text-slate-500 hover:bg-slate-100 rounded-r"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      )}

                      {/* Line Subtotal */}
                      <div className="text-right">
                        <span className="font-bold font-mono text-xs text-slate-900">
                          {formatTHB(item.unitPrice * item.quantity)}
                        </span>
                        {item.quantity > 1 && (
                          <div className="text-[10px] text-slate-400">
                            @{formatTHB(item.unitPrice)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Calculations & Discount Panel */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2 rounded-b-xl">
              {/* Subtotal */}
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>ราคารวมสินค้า (Subtotal)</span>
                <span className="font-mono font-semibold">{formatTHB(subtotal)}</span>
              </div>

              {/* Discount Input Row */}
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1 text-slate-600">
                  <Percent className="h-3.5 w-3.5 text-blue-600" />
                  <span>ส่วนลด (Discount)</span>
                </div>
                <div className="flex items-center gap-1 w-36">
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={discountMode === "BAHT" ? discountAmount || "" : discountPercent || ""}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      if (discountMode === "BAHT") setDiscountAmount(val);
                      else setDiscountPercent(val);
                    }}
                    className="h-7 text-xs text-right font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setDiscountMode(discountMode === "BAHT" ? "PERCENT" : "BAHT")}
                    className="rounded bg-slate-200 px-1.5 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-300"
                  >
                    {discountMode === "BAHT" ? "฿" : "%"}
                  </button>
                </div>
              </div>

              {/* VAT ภ.พ.30 Breakdown (7% inclusive) */}
              <div className="pt-2 border-t border-slate-200 space-y-1 text-[11px] text-slate-500">
                <div className="flex justify-between">
                  <span>มูลค่าสินค้าก่อนภาษี (Net before VAT):</span>
                  <span className="font-mono">{formatTHB(netBeforeVat)}</span>
                </div>
                <div className="flex justify-between">
                  <span>ภาษีมูลค่าเพิ่ม 7% (VAT ภ.พ.30):</span>
                  <span className="font-mono">{formatTHB(vatAmount)}</span>
                </div>
              </div>

              {/* Grand Total */}
              <div className="pt-2 border-t border-slate-200 flex items-baseline justify-between">
                <span className="font-bold text-sm text-slate-900">ยอดชำระสุทธิ (Net Total)</span>
                <span className="font-mono text-xl font-extrabold text-blue-700">
                  {formatTHB(grandTotal)}
                </span>
              </div>

              {/* Checkout Button */}
              <Button
                disabled={cart.length === 0}
                onClick={() => {
                  setCashReceived(grandTotal.toString());
                  setSplitCash((grandTotal / 2).toFixed(0));
                  setSplitSecondaryAmount((grandTotal - Number((grandTotal / 2).toFixed(0))).toFixed(0));
                  setPaymentModalOpen(true);
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 text-sm shadow-md gap-2"
              >
                <span>ชำระเงิน (Checkout)</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* ================= MODAL 1: Device IMEI Selection ================= */}
      <Dialog open={deviceImeiModalOpen} onOpenChange={setDeviceImeiModalOpen}>
        <DialogHeader>
          <DialogTitle onClose={() => setDeviceImeiModalOpen(false)}>
            เลือกรหัสเครื่อง IMEI สำหรับจำหน่าย
          </DialogTitle>
        </DialogHeader>

        {selectedDeviceForImei && (
          <DialogContent className="space-y-3">
            <p className="text-xs text-slate-600">
              กรุณาเลือกหมายเลข IMEI ของเครื่องที่จะขายให้กับลูกค้า:
            </p>
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 max-h-60 overflow-y-auto">
              {selectedDeviceForImei.imeis
                .filter((im) => im.status === "IN_STOCK")
                .map((im) => (
                  <div
                    key={im.id}
                    onClick={() => addToCart(selectedDeviceForImei, im)}
                    className="flex items-center justify-between p-3 hover:bg-blue-50/60 cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="font-mono font-bold text-xs text-slate-900">{im.imei}</div>
                      <div className="text-[10px] text-slate-400">
                        เกรด: <strong className="text-blue-600">Grade {im.conditionGrade}</strong>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-xs font-mono text-slate-900">
                        {formatTHB(im.sellPrice || selectedDeviceForImei.sellPrice)}
                      </div>
                      <Badge variant="success" className="text-[9px]">
                        พร้อมขาย
                      </Badge>
                    </div>
                  </div>
                ))}
            </div>
          </DialogContent>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setDeviceImeiModalOpen(false)}>
            ยกเลิก
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ================= MODAL 2: Customer Details for Tax Invoice ================= */}
      <Dialog open={isCustomerModalOpen} onOpenChange={setIsCustomerModalOpen}>
        <DialogHeader>
          <DialogTitle onClose={() => setIsCustomerModalOpen(false)}>
            ข้อมูลลูกค้าสำหรับออกใบกำกับภาษี (Tax Invoice Info)
          </DialogTitle>
        </DialogHeader>

        <DialogContent className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">
              ชื่อลูกค้า / ชื่อบริษัท *
            </label>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="text-xs"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">
              เบอร์โทรศัพท์
            </label>
            <Input
              placeholder="081-234-5678"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="text-xs"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">
              เลขประจำตัวผู้เสียภาษี / บัตรประชาชน (13 หลัก)
            </label>
            <Input
              placeholder="1100400123451"
              value={customerTaxId}
              onChange={(e) => setCustomerTaxId(e.target.value)}
              className="font-mono text-xs"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">
              ที่อยู่เปิดใบกำกับภาษี
            </label>
            <Input
              placeholder="เลขที่ หมู่บ้าน ถนน แขวง เขต จังหวัด รหัสไปรษณีย์"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              className="text-xs"
            />
          </div>
        </DialogContent>

        <DialogFooter>
          <Button
            size="sm"
            onClick={() => setIsCustomerModalOpen(false)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            บันทึกข้อมูลลูกค้า
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ================= MODAL 3: Payment Options Modal ================= */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <div className="max-w-xl w-full">
          <DialogHeader>
            <DialogTitle onClose={() => setPaymentModalOpen(false)}>
              ชำระเงินหน้าร้าน (Payment Processing)
            </DialogTitle>
          </DialogHeader>

          <DialogContent className="space-y-4">
            {/* Grand Total Callout */}
            <div className="rounded-xl bg-slate-900 p-4 text-white flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400">ยอดที่ต้องชำระทั้งหมด</span>
                <div className="text-2xl font-black font-mono text-emerald-400">
                  {formatTHB(grandTotal)}
                </div>
              </div>
              <div className="text-right text-[11px] text-slate-400">
                <div>รวมภาษีมูลค่าเพิ่ม 7% แล้ว</div>
                <div>(VAT: {formatTHB(vatAmount)})</div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => setPaymentMethod("CASH")}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  paymentMethod === "CASH"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-200"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Banknote className="h-5 w-5 mb-1" />
                <span>เงินสด</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("PROMPTPAY")}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  paymentMethod === "PROMPTPAY"
                    ? "border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-200"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <QrCode className="h-5 w-5 mb-1" />
                <span>พร้อมเพย์ QR</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("CARD")}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  paymentMethod === "CARD"
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <CreditCard className="h-5 w-5 mb-1" />
                <span>บัตรเครดิต</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("SPLIT")}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  paymentMethod === "SPLIT"
                    ? "border-purple-600 bg-purple-50 text-purple-700 ring-2 ring-purple-200"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Split className="h-5 w-5 mb-1" />
                <span>แยกชำระ</span>
              </button>
            </div>

            {/* TAB 1: CASH */}
            {paymentMethod === "CASH" && (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">
                    จำนวนเงินสดที่รับมา (บาท)
                  </label>
                  <Input
                    type="number"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    className="font-mono text-lg font-bold"
                  />
                </div>

                {/* Quick denomination pills */}
                <div className="flex flex-wrap gap-1.5">
                  {[grandTotal, 100, 500, 1000, 2000, 5000].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setCashReceived(amount.toString())}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-mono font-medium hover:bg-slate-100"
                    >
                      {amount === grandTotal ? "พอดีเป๊ะ" : formatTHB(amount)}
                    </button>
                  ))}
                </div>

                {/* Live Change Calculator */}
                {parseFloat(cashReceived) >= grandTotal ? (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 flex items-center justify-between text-emerald-800">
                    <span className="font-semibold text-xs">เงินทอน (Change):</span>
                    <span className="font-mono font-extrabold text-lg text-emerald-900">
                      {formatTHB(parseFloat(cashReceived) - grandTotal)}
                    </span>
                  </div>
                ) : (
                  <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 font-medium text-center">
                    จำนวนเงินยังขาดอีก: {formatTHB(grandTotal - (parseFloat(cashReceived) || 0))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: PROMPTPAY QR */}
            {paymentMethod === "PROMPTPAY" && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 flex flex-col items-center space-y-3">
                <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center">
                  <div className="text-blue-900 font-bold text-xs tracking-wider mb-2 flex items-center gap-1.5">
                    <span className="rounded bg-blue-900 text-white px-1.5 py-0.5 text-[10px]">
                      Thai QR
                    </span>
                    <span>PROMPTPAY PAYMENT</span>
                  </div>
                  {/* Generated QR Mock Card */}
                  <div className="h-44 w-44 bg-slate-900 rounded-lg p-2 flex items-center justify-center text-white font-mono text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:8px_8px] opacity-90" />
                    <div className="relative z-10 bg-white p-2 rounded text-slate-900 flex flex-col items-center">
                      <QrCode className="h-28 w-28 text-slate-900" />
                      <span className="text-[10px] font-bold mt-1">MobileShop Hub</span>
                    </div>
                  </div>
                  <div className="mt-2 text-center">
                    <div className="font-bold text-base text-slate-900 font-mono">
                      {formatTHB(grandTotal)}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Tax ID: {currentBranch.code === "HQ" ? "0105561234567" : "0105561234567-0002"}
                    </div>
                  </div>
                </div>
                <Badge variant="success" className="text-xs">
                  ระบบจำลองสแกนพร้อมเพย์พร้อมบันทึกทันที
                </Badge>
              </div>
            )}

            {/* TAB 3: CARD */}
            {paymentMethod === "CARD" && (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">
                    เลือกธนาคารเจ้าของบัตร / เครื่องรูด
                  </label>
                  <select
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                  >
                    <option value="กสิกรไทย (KBank)">ธนาคารกสิกรไทย (KBank)</option>
                    <option value="ไทยพาณิชย์ (SCB)">ธนาคารไทยพาณิชย์ (SCB)</option>
                    <option value="กรุงเทพ (BBL)">ธนาคารกรุงเทพ (BBL)</option>
                    <option value="กรุงไทย (KTB)">ธนาคารกรุงไทย (KTB)</option>
                    <option value="บัตรกรุงศรี (KTC/UOB)">KTC / UOB / Krungsri</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">
                      เลข 4 ตัวท้ายบนหน้าบัตร
                    </label>
                    <Input
                      placeholder="เช่น 4589"
                      maxLength={4}
                      value={cardLastDigits}
                      onChange={(e) => setCardLastDigits(e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">
                      Approval Code / Slip No.
                    </label>
                    <Input
                      placeholder="เช่น 987123"
                      value={cardApprovalCode}
                      onChange={(e) => setCardApprovalCode(e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: SPLIT PAYMENT */}
            {paymentMethod === "SPLIT" && (
              <div className="space-y-3 rounded-xl border border-purple-200 bg-purple-50/30 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">
                      ยอดชำระด้วยเงินสด (บาท)
                    </label>
                    <Input
                      type="number"
                      value={splitCash}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSplitCash(val);
                        const remainder = Math.max(0, grandTotal - (parseFloat(val) || 0));
                        setSplitSecondaryAmount(remainder.toFixed(0));
                      }}
                      className="font-mono text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">
                      ยอดชำระส่วนที่สอง ({splitSecondaryMethod})
                    </label>
                    <Input
                      type="number"
                      value={splitSecondaryAmount}
                      onChange={(e) => setSplitSecondaryAmount(e.target.value)}
                      className="font-mono text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="font-semibold text-slate-600">ช่องทางส่วนที่สอง:</span>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="splitSec"
                      checked={splitSecondaryMethod === "PROMPTPAY"}
                      onChange={() => setSplitSecondaryMethod("PROMPTPAY")}
                    />
                    <span>พร้อมเพย์ QR</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="splitSec"
                      checked={splitSecondaryMethod === "CARD"}
                      onChange={() => setSplitSecondaryMethod("CARD")}
                    />
                    <span>บัตรเครดิต</span>
                  </label>
                </div>

                <div className="rounded-lg bg-white p-2.5 text-xs text-slate-700 flex justify-between font-mono border border-slate-200">
                  <span>ยอดรวมแยกชำระ:</span>
                  <span
                    className={
                      Math.abs(
                        (parseFloat(splitCash) || 0) + (parseFloat(splitSecondaryAmount) || 0) - grandTotal
                      ) < 0.05
                        ? "text-emerald-700 font-bold"
                        : "text-rose-600 font-bold"
                    }
                  >
                    {formatTHB((parseFloat(splitCash) || 0) + (parseFloat(splitSecondaryAmount) || 0))} /{" "}
                    {formatTHB(grandTotal)}
                  </span>
                </div>
              </div>
            )}
          </DialogContent>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPaymentModalOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              size="sm"
              disabled={processingPayment}
              onClick={handleConfirmPayment}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{processingPayment ? "กำลังบันทึก..." : "ยืนยันรับชำระเงิน"}</span>
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* ================= MODAL 4: RECEIPT & TAX INVOICE PRINT ================= */}
      <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
        <div className="max-w-2xl w-full">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle onClose={() => setReceiptModalOpen(false)}>
                ใบเสร็จรับเงิน / ใบกำกับภาษี (Receipt & Tax Invoice)
              </DialogTitle>
              {/* Toggle 80mm vs A4 format */}
              <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold mr-8">
                <button
                  type="button"
                  onClick={() => setPrintFormat("80MM")}
                  className={`rounded-md px-2.5 py-1 transition-all ${
                    printFormat === "80MM" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"
                  }`}
                >
                  สลิปความร้อน 80mm
                </button>
                <button
                  type="button"
                  onClick={() => setPrintFormat("A4")}
                  className={`rounded-md px-2.5 py-1 transition-all ${
                    printFormat === "A4" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"
                  }`}
                >
                  เต็มรูป A4 (ภ.พ.30)
                </button>
              </div>
            </div>
          </DialogHeader>

          <DialogContent className="max-h-[75vh] overflow-y-auto p-4 bg-slate-100 flex justify-center">
            {lastSaleResult && lastSaleResult.sale && (
              <div className="w-full flex justify-center">
                {/* 1. 80MM Thermal Slip */}
                {printFormat === "80MM" ? (
                  <div className="thermal-80mm bg-white border border-slate-300 shadow-sm p-4 text-slate-900 text-xs font-mono space-y-2 rounded">
                    {/* Header */}
                    <div className="text-center space-y-0.5 border-b border-dashed border-slate-400 pb-2">
                      <div className="font-extrabold text-sm">MOBILESHOP HUB</div>
                      <div className="text-[10px]">{lastSaleResult.sale.branch?.name}</div>
                      <div className="text-[10px]">{lastSaleResult.sale.branch?.address}</div>
                      <div className="text-[10px]">
                        โทร: {lastSaleResult.sale.branch?.phone} • Tax ID: {lastSaleResult.sale.branch?.taxId}
                      </div>
                      <div className="text-[10px] font-bold mt-1">
                        ใบเสร็จรับเงินอย่างย่อ / ใบกำกับภาษีอย่างย่อ
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="text-[10px] space-y-0.5 border-b border-dashed border-slate-400 pb-2">
                      <div className="flex justify-between">
                        <span>เลขที่: {lastSaleResult.sale.invoiceNo}</span>
                        <span>{formatDateThai(lastSaleResult.sale.createdAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>แคชเชียร์: {lastSaleResult.sale.cashier?.name || "Cashier"}</span>
                        <span>ลูกค้า: {lastSaleResult.sale.customer?.name || "ลูกค้าทั่วไป"}</span>
                      </div>
                    </div>

                    {/* Items Table */}
                    <div className="border-b border-dashed border-slate-400 pb-2">
                      <div className="flex justify-between font-bold text-[10px] mb-1">
                        <span>รายการ</span>
                        <span>รวม (บาท)</span>
                      </div>
                      {lastSaleResult.sale.items.map((item: any, idx: number) => (
                        <div key={idx} className="space-y-0.5 my-1">
                          <div className="flex justify-between">
                            <span className="truncate max-w-[180px] font-semibold">
                              {item.product?.name}
                            </span>
                            <span>{formatTHB(item.subtotal)}</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-500">
                            <span>
                              {item.quantity} x {formatTHB(item.unitPrice)}
                            </span>
                            {item.deviceImei && (
                              <span>IMEI: ...{item.deviceImei.imei.slice(-4)}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Calculations */}
                    <div className="text-[10px] space-y-1 border-b border-dashed border-slate-400 pb-2">
                      <div className="flex justify-between">
                        <span>ราคารวมสินค้า:</span>
                        <span>{formatTHB(lastSaleResult.sale.totalAmount)}</span>
                      </div>
                      {lastSaleResult.sale.discount > 0 && (
                        <div className="flex justify-between text-rose-600">
                          <span>ส่วนลด:</span>
                          <span>-{formatTHB(lastSaleResult.sale.discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-200">
                        <span>ยอดรวมสุทธิ:</span>
                        <span>{formatTHB(lastSaleResult.sale.netAmount)}</span>
                      </div>
                      <div className="flex justify-between text-slate-500 text-[9px]">
                        <span>(มูลค่าก่อน VAT: {formatTHB(lastSaleResult.taxCalculation?.netBeforeVat)})</span>
                        <span>(VAT 7%: {formatTHB(lastSaleResult.sale.vatAmount)})</span>
                      </div>
                    </div>

                    {/* Payment Info */}
                    <div className="text-[10px] space-y-0.5 border-b border-dashed border-slate-400 pb-2">
                      <div className="flex justify-between">
                        <span>วิธีชำระ:</span>
                        <span className="font-bold">{lastSaleResult.sale.paymentMethod}</span>
                      </div>
                    </div>

                    {/* Footer Warranty */}
                    <div className="text-center text-[9px] text-slate-500 pt-1 space-y-0.5">
                      <div>*** ขอบคุณที่ใช้บริการ ***</div>
                      <div>รับประกันเปลี่ยนตัวใหม่ภายใน 7 วัน</div>
                      <div>อะไหล่เปลี่ยนรับประกัน 90 วันตามเงื่อนไข</div>
                    </div>
                  </div>
                ) : (
                  /* 2. Full A4 Tax Invoice (ภ.พ.30) */
                  <div className="invoice-a4 bg-white border border-slate-300 shadow-md p-6 text-slate-900 text-xs space-y-4 rounded w-full">
                    {/* Header */}
                    <div className="flex justify-between items-start border-b border-slate-300 pb-4">
                      <div>
                        <div className="font-bold text-base text-slate-900">
                          บริษัท โมบายช็อป ฮับ จำกัด
                        </div>
                        <div className="text-slate-600 text-xs">
                          {lastSaleResult.sale.branch?.name} ({lastSaleResult.sale.branch?.code})
                        </div>
                        <div className="text-slate-500 text-[11px] max-w-sm">
                          {lastSaleResult.sale.branch?.address}
                        </div>
                        <div className="text-slate-600 text-[11px]">
                          เลขประจำตัวผู้เสียภาษีอากร: <strong>{lastSaleResult.sale.branch?.taxId}</strong>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-extrabold text-lg text-blue-700">
                          ใบเสร็จรับเงิน / ใบกำกับภาษี
                        </div>
                        <div className="text-xs font-semibold text-slate-600">
                          TAX INVOICE / RECEIPT (แบบ ภ.พ.30)
                        </div>
                        <div className="mt-2 text-xs font-mono">
                          <div>
                            เลขที่ใบเสร็จ: <strong>{lastSaleResult.sale.invoiceNo}</strong>
                          </div>
                          <div>วันที่: {formatDateThai(lastSaleResult.sale.createdAt)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Customer Info Box */}
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-500 block text-[10px]">ชื่อลูกค้า / ผู้ซื้อ:</span>
                        <span className="font-bold text-slate-900">
                          {lastSaleResult.sale.customer?.name || "ลูกค้าทั่วไป (Walk-in)"}
                        </span>
                        <div className="text-slate-500 text-[11px]">
                          โทร: {lastSaleResult.sale.customer?.phone || "-"}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">
                          เลขประจำตัวผู้เสียภาษี / บัตรประชาชน:
                        </span>
                        <span className="font-mono font-semibold text-slate-900">
                          {lastSaleResult.sale.customer?.nationalId || "-"}
                        </span>
                        <div className="text-slate-500 text-[11px] truncate">
                          ที่อยู่: {lastSaleResult.sale.customer?.address || "-"}
                        </div>
                      </div>
                    </div>

                    {/* Items Table */}
                    <table className="w-full text-xs border border-slate-200">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3 text-center w-12">ลำดับ</th>
                          <th className="py-2 px-3 text-left">รหัส / รายละเอียดสินค้า</th>
                          <th className="py-2 px-3 text-center w-16">จำนวน</th>
                          <th className="py-2 px-3 text-right w-24">ราคา/หน่วย</th>
                          <th className="py-2 px-3 text-right w-28">จำนวนเงิน</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {lastSaleResult.sale.items.map((it: any, idx: number) => (
                          <tr key={idx}>
                            <td className="py-2 px-3 text-center text-slate-500">{idx + 1}</td>
                            <td className="py-2 px-3">
                              <div className="font-semibold">{it.product?.name}</div>
                              <div className="font-mono text-[10px] text-slate-400">
                                SKU: {it.product?.code}
                                {it.deviceImei && ` • IMEI: ${it.deviceImei.imei}`}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-center font-mono">{it.quantity}</td>
                            <td className="py-2 px-3 text-right font-mono">{formatTHB(it.unitPrice)}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold">
                              {formatTHB(it.subtotal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Tax Breakdown Summary */}
                    <div className="flex justify-end pt-2">
                      <div className="w-72 space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-600">
                          <span>ราคารวมสินค้า:</span>
                          <span className="font-mono">{formatTHB(lastSaleResult.sale.totalAmount)}</span>
                        </div>
                        {lastSaleResult.sale.discount > 0 && (
                          <div className="flex justify-between text-rose-600">
                            <span>ส่วนลดพิเศษ:</span>
                            <span className="font-mono">-{formatTHB(lastSaleResult.sale.discount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-slate-600">
                          <span>มูลค่าที่เสียภาษี (7%):</span>
                          <span className="font-mono">
                            {formatTHB(lastSaleResult.taxCalculation?.netBeforeVat)}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>ภาษีมูลค่าเพิ่ม 7% (VAT):</span>
                          <span className="font-mono">{formatTHB(lastSaleResult.sale.vatAmount)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-sm text-slate-900 pt-1.5 border-t border-slate-300">
                          <span>ยอดเงินรวมทั้งสิ้น:</span>
                          <span className="font-mono text-blue-700">
                            {formatTHB(lastSaleResult.sale.netAmount)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Signature lines */}
                    <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs text-slate-500 border-t border-slate-200 mt-6">
                      <div>
                        <div className="border-b border-slate-300 w-48 mx-auto mb-2 pb-6" />
                        <div>ผู้รับเงิน / แคชเชียร์</div>
                        <div className="text-[10px] text-slate-400">
                          ({lastSaleResult.sale.cashier?.name || "สมชาย ผู้จัดการใหญ่"})
                        </div>
                      </div>
                      <div>
                        <div className="border-b border-slate-300 w-48 mx-auto mb-2 pb-6" />
                        <div>ผู้รับสินค้า / ลูกค้า</div>
                        <div className="text-[10px] text-slate-400">
                          ({lastSaleResult.sale.customer?.name || "ลูกค้าทั่วไป"})
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>

          <DialogFooter className="flex justify-between items-center sm:justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReceiptModalOpen(false)}
            >
              ปิดหน้าต่าง
            </Button>

            <Button
              size="sm"
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2 font-bold"
            >
              <Printer className="h-4 w-4" />
              <span>พิมพ์ใบเสร็จ ({printFormat === "80MM" ? "สลิป 80mm" : "เต็มรูป A4"})</span>
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  );
}
