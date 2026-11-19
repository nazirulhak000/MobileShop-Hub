"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import confetti from "canvas-confetti";
import {
  ArrowLeft,
  Smartphone,
  User,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Printer,
  Sparkles,
  Lock,
  ChevronDown,
  Building2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useApp } from "@/context/AppContext";
import { PatternLockCanvas } from "@/components/repairs/PatternLockCanvas";
import { SignaturePad } from "@/components/repairs/SignaturePad";
import { PreCheckMatrix, PRE_CHECK_DEFINITIONS } from "@/components/repairs/PreCheckMatrix";
import { ThermalSlipModal } from "@/components/repairs/ThermalSlipModal";

export default function NewRepairIntakePage() {
  const router = useRouter();
  const { currentBranch, branches, users } = useApp();

  // Branch & Technician
  const [branchId, setBranchId] = useState(currentBranch.id);
  const [technicianId, setTechnicianId] = useState("");

  // Customer State
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerLineId, setCustomerLineId] = useState("");
  const [customerNationalId, setCustomerNationalId] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  // Device State
  const [deviceBrand, setDeviceBrand] = useState("Apple");
  const [deviceModel, setDeviceModel] = useState("");
  const [deviceColor, setDeviceColor] = useState("");
  const [serialIMEI, setSerialIMEI] = useState("");
  const [lockType, setLockType] = useState<"passcode" | "pattern" | "none">("passcode");
  const [passcode, setPasscode] = useState("");
  const [patternLock, setPatternLock] = useState("");

  // QC Pre-check Data
  const [preCheckData, setPreCheckData] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    PRE_CHECK_DEFINITIONS.forEach((d) => {
      initial[d.key] = d.defaultOptions[0].value;
    });
    return initial;
  });

  // Repair Issue & Estimates
  const [issueDescription, setIssueDescription] = useState("");
  const [laborFee, setLaborFee] = useState<number>(500);
  const [estimatedCost, setEstimatedCost] = useState<number>(500);
  const [estimatedFinish, setEstimatedFinish] = useState("");
  const [notes, setNotes] = useState("");

  // Signature
  const [customerSignature, setCustomerSignature] = useState<string | null>(null);

  // Submission State & Modal
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdJob, setCreatedJob] = useState<any | null>(null);
  const [showSlipModal, setShowSlipModal] = useState(false);

  // Preset Device Brands
  const COMMON_BRANDS = ["Apple", "Samsung", "Xiaomi", "Oppo", "Vivo", "Realme", "Huawei", "OnePlus"];

  // Customer Autocomplete search
  useEffect(() => {
    if (customerSearch.trim().length > 1) {
      const timer = setTimeout(async () => {
        try {
          const res = await fetch(`/api/customers?q=${encodeURIComponent(customerSearch.trim())}`);
          const json = await res.json();
          if (json.success) {
            setCustomerSuggestions(json.data);
            setShowSuggestions(true);
          }
        } catch (err) {
          console.error(err);
        }
      }, 250);
      return () => clearTimeout(timer);
    } else {
      setCustomerSuggestions([]);
      setShowSuggestions(false);
    }
  }, [customerSearch]);

  const handleSelectCustomer = (c: any) => {
    setSelectedCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerPhone(c.phone);
    setCustomerLineId(c.lineId || "");
    setCustomerNationalId(c.nationalId || "");
    setCustomerAddress(c.address || "");
    setShowSuggestions(false);
  };

  const handleClearCustomerSelection = () => {
    setSelectedCustomerId(null);
    setCustomerSearch("");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerLineId("");
    setCustomerNationalId("");
    setCustomerAddress("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerName.trim() || !customerPhone.trim()) {
      setError("กรุณากรอกชื่อและเบอร์โทรศัพท์ลูกค้าให้ครบถ้วน");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (!deviceBrand || !deviceModel.trim()) {
      setError("กรุณาระบุยี่ห้อและรุ่นของอุปกรณ์");
      window.scrollTo({ top: 200, behavior: "smooth" });
      return;
    }

    if (!issueDescription.trim()) {
      setError("กรุณาระบุรายละเอียดอาการเสียที่ลูกค้าแจ้ง");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customerId: selectedCustomerId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerLineId: customerLineId.trim() || null,
        customerNationalId: customerNationalId.trim() || null,
        customerAddress: customerAddress.trim() || null,
        branchId,
        technicianId: technicianId || null,
        deviceBrand,
        deviceModel: deviceModel.trim(),
        deviceColor: deviceColor.trim() || null,
        serialIMEI: serialIMEI.trim() || null,
        passcode: lockType === "passcode" ? passcode.trim() : null,
        patternLock: lockType === "pattern" ? patternLock : null,
        preCheckData,
        issueDescription: issueDescription.trim(),
        customerSignature,
        laborFee: Number(laborFee) || 0,
        estimatedCost: Number(estimatedCost) || Number(laborFee) || 0,
        estimatedFinish: estimatedFinish || null,
        notes: notes.trim() || null,
      };

      const res = await fetch("/api/repairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      }

      // Celebrate
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
      });

      setCreatedJob(json.data);
      setShowSlipModal(true);
    } catch (err: any) {
      setError(err.message || "Failed to create repair ticket");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/repairs"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับหน้ารายการงานซ่อม</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">สาขาที่เปิดรับ:</span>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="text-xs font-semibold rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-slate-800 focus:outline-none focus:border-blue-500"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="border-b border-slate-200 pb-3">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Smartphone className="w-6 h-6 text-blue-600" />
          <span>เปิดใบรับซ่อมอุปกรณ์ใหม่ (New Repair Intake)</span>
        </h1>
        <p className="text-sm text-slate-500">
          บันทึกประวัติลูกค้า ข้อมูลอุปกรณ์ ตรวจเช็คสภาพเครื่องก่อนซ่อม และพิมพ์สลิปให้ลูกค้า
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2.5 shadow-xs">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Customer Info */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              <span>1. ข้อมูลลูกค้า (Customer Information)</span>
            </CardTitle>
            <CardDescription>
              ค้นหาลูกค้าเก่าเพื่อดึงข้อมูลอัตโนมัติ หรือพิมพ์ข้อมูลเพื่อสร้างลูกค้าใหม่
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {/* Autocomplete Search Bar */}
            <div className="relative">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                ค้นหาลูกค้าเดิม (พิมพ์ชื่อ หรือ เบอร์โทร)
              </label>
              <div className="relative">
                <Input
                  placeholder="พิมพ์เพื่อค้นหา เช่น 081..., คุณธนกร..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="text-xs h-9"
                />
                {selectedCustomerId && (
                  <button
                    type="button"
                    onClick={handleClearCustomerSelection}
                    className="absolute right-3 top-2 text-[11px] text-blue-600 hover:underline"
                  >
                    ล้างการเลือก (สร้างใหม่)
                  </button>
                )}
              </div>

              {/* Suggestions Dropdown */}
              {showSuggestions && customerSuggestions.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-slate-200 divide-y divide-slate-100 max-h-56 overflow-y-auto">
                  {customerSuggestions.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => handleSelectCustomer(c)}
                      className="p-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-900">{c.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          โทร: {c.phone} {c.lineId ? `• LINE: ${c.lineId}` : ""}
                        </div>
                      </div>
                      <span className="text-[11px] text-blue-600 font-medium">
                        เลือก &rarr;
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Customer Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อ-นามสกุลลูกค้า <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  placeholder="เช่น คุณสมศรี มีสุข"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เบอร์โทรศัพท์มือถือ <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  placeholder="เช่น 081-234-5678"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  LINE ID (สำหรับส่งลิงก์ติดตาม)
                </label>
                <Input
                  placeholder="เช่น @somsri"
                  value={customerLineId}
                  onChange={(e) => setCustomerLineId(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เลขบัตรประจำตัวประชาชน
                </label>
                <Input
                  placeholder="เลข 13 หลัก (ถ้ามี)"
                  value={customerNationalId}
                  onChange={(e) => setCustomerNationalId(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ที่อยู่ติดต่อ
                </label>
                <Input
                  placeholder="บ้านเลขที่ ถนน แขวง/ตำบล..."
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Device Details */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base text-slate-900 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-600" />
              <span>2. ข้อมูลเครื่อง & รหัสล็อคหน้าจอ (Device Details & Screen Lock)</span>
            </CardTitle>
            <CardDescription>
              บันทึกสเปกตัวเครื่อง IMEI และรหัสปลดล็อคสำหรับการทดสอบระบบ
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {/* Quick Brand Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ยี่ห้อ (Brand) <span className="text-rose-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {COMMON_BRANDS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setDeviceBrand(b)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      deviceBrand === b
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รุ่นตัวเครื่อง (Model) <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  placeholder="เช่น iPhone 14 Pro Max, Galaxy S23"
                  value={deviceModel}
                  onChange={(e) => setDeviceModel(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  สีตัวเครื่อง (Color)
                </label>
                <Input
                  placeholder="เช่น Space Black, Deep Purple"
                  value={deviceColor}
                  onChange={(e) => setDeviceColor(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Serial No / IMEI (15 หลัก)
                </label>
                <Input
                  placeholder="เช่น 354928110998877"
                  value={serialIMEI}
                  onChange={(e) => setSerialIMEI(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>
            </div>

            {/* Lock Security Options */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-600" />
                  รหัสปลดล็อคหน้าจอ (Screen Lock Security)
                </label>
                <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-xs">
                  <button
                    type="button"
                    onClick={() => setLockType("passcode")}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      lockType === "passcode"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600"
                    }`}
                  >
                    รหัสตัวเลข (PIN / Password)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLockType("pattern")}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      lockType === "pattern"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600"
                    }`}
                  >
                    ลากเส้น 3x3 (Pattern Lock)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLockType("none")}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      lockType === "none"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600"
                    }`}
                  >
                    ไม่มีรหัส
                  </button>
                </div>
              </div>

              {lockType === "passcode" && (
                <div className="max-w-xs">
                  <Input
                    placeholder="ใส่รหัสผ่านหน้าจอ เช่น 147258 หรือ abc123"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    className="text-xs font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    จำเป็นสำหรับช่างใช้ตรวจเช็คหลังซ่อม
                  </p>
                </div>
              )}

              {lockType === "pattern" && (
                <div className="max-w-md">
                  <PatternLockCanvas
                    value={patternLock}
                    onChange={(pat) => setPatternLock(pat)}
                  />
                </div>
              )}

              {lockType === "none" && (
                <p className="text-xs text-slate-400 italic">
                  เครื่องไม่มีการตั้งรหัสผ่าน หรือลูกค้าปลดล็อคมาให้แล้ว
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Pre-check QC Matrix */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>3. ตรวจสอบสภาพเครื่องก่อนซ่อม (Pre-check QC Matrix - 11 Checks)</span>
            </CardTitle>
            <CardDescription>
              บันทึกจุดบกพร่องเดิมของเครื่องก่อนรับมอบ เพื่อความโปร่งใสและหลักฐานทางกฎหมาย
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <PreCheckMatrix
              value={preCheckData}
              onChange={(data) => setPreCheckData(data)}
            />
          </CardContent>
        </Card>

        {/* Section 4: Issue Description & Financial Estimates */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>4. อาการเสียที่แจ้ง & ราคาประเมิน (Issue & Quotation)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                อาการเสียที่ลูกค้าแจ้ง <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="ระบุอาการเสียอย่างละเอียด เช่น ตกน้ำ จอดับ สัมผัสทัชเพี้ยน ชาร์จไม่เข้า..."
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ค่าบริการ / ค่าแรงประเมิน (บาท)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={laborFee}
                  onChange={(e) => setLaborFee(Number(e.target.value))}
                  className="text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ราคาประเมินรวมเบื้องต้น (บาท)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(Number(e.target.value))}
                  className="text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  กำหนดซ่อมเสร็จประมาณ
                </label>
                <Input
                  type="datetime-local"
                  value={estimatedFinish}
                  onChange={(e) => setEstimatedFinish(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ช่างผู้รับผิดชอบงานซ่อม
                </label>
                <select
                  value={technicianId}
                  onChange={(e) => setTechnicianId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">-- ยังไม่ระบุ (เข้าคิวรอมอบหมาย) --</option>
                  {users
                    .filter((u) => u.role === "TECHNICIAN")
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.branchCode})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หมายเหตุเพิ่มเติม / ข้อตกลงพิเศษ
                </label>
                <Input
                  placeholder="เช่น ลูกค้าขอเครื่องก่อนเที่ยง, ฝากเคสไว้..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Digital Signature Pad */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <span>5. ลายเซ็นลูกค้ายินยอมเงื่อนไข (Customer Signature Pad)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <SignaturePad
              value={customerSignature}
              onChange={(sig) => setCustomerSignature(sig)}
            />
          </CardContent>
        </Card>

        {/* Bottom Submit Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
          <Link href="/repairs">
            <Button type="button" variant="outline" className="text-xs">
              ยกเลิกและย้อนกลับ
            </Button>
          </Link>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-8 py-2.5 shadow-md gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>{submitting ? "กำลังเปิดใบงานซ่อม..." : "บันทึกและพิมพ์สลิปใบรับซ่อม 80mm"}</span>
          </Button>
        </div>
      </form>

      {/* Slip Print Modal after creation */}
      {createdJob && (
        <ThermalSlipModal
          isOpen={showSlipModal}
          onClose={() => {
            setShowSlipModal(false);
            router.push(`/repairs/${createdJob.id}`);
          }}
          job={createdJob}
        />
      )}
    </div>
  );
}
