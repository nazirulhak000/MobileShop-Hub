"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import {
  Wrench,
  Smartphone,
  User,
  CheckCircle2,
  AlertCircle,
  Printer,
  Sparkles,
  Lock,
  ArrowRight,
  ShieldCheck,
  Building2,
  Calendar,
  Loader2,
  UserCheck,
  RotateCcw,
  Tag,
  Coins,
  Clock,
  Phone,
  FileText,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useApp } from "@/context/AppContext";
import { PatternLockCanvas } from "@/components/repairs/PatternLockCanvas";
import { SignaturePad } from "@/components/repairs/SignaturePad";
import { PreCheckMatrix, PRE_CHECK_DEFINITIONS } from "@/components/repairs/PreCheckMatrix";
import { PhysicalDamageInspector } from "@/components/repairs/PhysicalDamageInspector";
import { ThermalSlipModal } from "@/components/repairs/ThermalSlipModal";

const POPULAR_BRANDS = [
  "Apple",
  "Samsung",
  "Xiaomi",
  "Oppo",
  "Vivo",
  "Realme",
  "OnePlus",
  "Huawei",
  "Honor",
  "Google",
  "iPad/Tablet",
  "อื่นๆ (Other)",
];

const QUICK_PRICE_PRESETS = [
  { label: "ตรวจเช็คฟรี", labor: 0, total: 0 },
  { label: "ล้างเครื่อง / ลงโปรแกรม", labor: 300, total: 300 },
  { label: "เปลี่ยนแบตเตอรี่", labor: 400, total: 1200 },
  { label: "เปลี่ยนหน้าจอ", labor: 500, total: 2500 },
  { label: "ซ่อมเมนบอร์ด", labor: 1000, total: 3500 },
];

export default function ReceptionIntakePage() {
  const router = useRouter();
  const { currentBranch, branches, users } = useApp();

  const [branchId, setBranchId] = useState(currentBranch.id);
  const [technicianId, setTechnicianId] = useState("");

  useEffect(() => {
    if (currentBranch.id && (!branchId || branchId === "")) {
      setBranchId(currentBranch.id);
    }
  }, [currentBranch.id, branchId]);

  // Customer State
  const [customerSearch, setCustomerSearch] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSug, setShowSug] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerLineId, setCustomerLineId] = useState("");

  // Device State
  const [deviceBrand, setDeviceBrand] = useState("Apple");
  const [customBrand, setCustomBrand] = useState("");
  const [deviceModel, setDeviceModel] = useState("iPhone 14 Pro Max");
  const [deviceColor, setDeviceColor] = useState("Space Black");
  const [serialIMEI, setSerialIMEI] = useState("");
  const [lockType, setLockType] = useState<"passcode" | "pattern" | "none">("passcode");
  const [passcode, setPasscode] = useState("");
  const [patternLock, setPatternLock] = useState("");

  // 11-point Pre-check Matrix
  const [preCheckData, setPreCheckData] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    PRE_CHECK_DEFINITIONS.forEach((d) => {
      initial[d.key] = d.defaultOptions[0].value;
    });
    return initial;
  });

  // Physical Damage Mapping & Notes
  const [damageLocations, setDamageLocations] = useState<string[]>([]);
  const [damageNotes, setDamageNotes] = useState("");

  // Issue & Estimate
  const [issueDescription, setIssueDescription] = useState("");
  const [laborFee, setLaborFee] = useState<number>(0);
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  const [estimatedFinish, setEstimatedFinish] = useState("");
  const [intakeNotes, setIntakeNotes] = useState("");

  // Signature
  const [customerSignature, setCustomerSignature] = useState<string | null>(null);

  // Flow State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdJob, setCreatedJob] = useState<any | null>(null);
  const [showSlipModal, setShowSlipModal] = useState(false);
  const errorRef = useRef<HTMLDivElement | null>(null);

  // Customer autocomplete search
  useEffect(() => {
    if (customerSearch.trim().length > 1) {
      const timer = setTimeout(async () => {
        try {
          const res = await fetch(`/api/customers?q=${encodeURIComponent(customerSearch.trim())}`);
          const json = await res.json();
          if (json.success) {
            setSuggestions(json.data || json.customers || []);
            setShowSug(true);
          }
        } catch (e) {
          console.error(e);
        }
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setShowSug(false);
    }
  }, [customerSearch]);

  const handleSelectCustomer = (c: any) => {
    setSelectedCustomerId(c.id);
    setCustomerName(c.name || "");
    setCustomerPhone(c.phone || "");
    setCustomerLineId(c.lineId || "");
    setCustomerSearch("");
    setShowSug(false);
  };

  const handleClearCustomer = () => {
    setSelectedCustomerId(null);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerLineId("");
    setCustomerSearch("");
  };

  // Technicians available for assignment
  const eligibleStaff = users.filter(
    (u) => u.role === "TECHNICIAN" || u.role === "ADMIN" || u.role === "MANAGER"
  );
  const staffList = eligibleStaff.length > 0 ? eligibleStaff : users;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = customerName.trim();
    const trimmedPhone = customerPhone.trim();
    const trimmedModel = deviceModel.trim();
    const trimmedIssue = issueDescription.trim();
    const finalBrand = deviceBrand === "อื่นๆ (Other)" ? customBrand.trim() || "Other" : deviceBrand;

    if (!trimmedName || !trimmedPhone || !trimmedModel || !trimmedIssue) {
      setError("กรุณากรอกข้อมูลสำคัญ (ชื่อลูกค้า, เบอร์โทร, รุ่นตัวเครื่อง, อาการเสีย) ให้ครบถ้วน");
      if (errorRef.current) {
        errorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    if (!branchId) {
      setError("กรุณาเลือกสาขารับเครื่อง");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Combine 11-point QC with physical damage mapping
      const combinedPreCheck = {
        ...preCheckData,
        damageLocations,
        damageNotes: damageNotes.trim() || undefined,
      };

      const payload = {
        customerId: selectedCustomerId,
        customerName: trimmedName,
        customerPhone: trimmedPhone,
        customerLineId: customerLineId.trim() || null,
        branchId,
        technicianId: technicianId || null,
        deviceBrand: finalBrand,
        deviceModel: trimmedModel,
        deviceColor: deviceColor.trim() || null,
        serialIMEI: serialIMEI.trim() || null,
        passcode: lockType === "passcode" ? passcode.trim() : null,
        patternLock: lockType === "pattern" ? patternLock : null,
        preCheckData: combinedPreCheck,
        issueDescription: trimmedIssue,
        customerSignature: customerSignature || null,
        laborFee: Math.max(0, Number(laborFee) || 0),
        estimatedCost: Math.max(0, Number(estimatedCost) || Number(laborFee) || 0),
        estimatedFinish: estimatedFinish || null,
        notes: intakeNotes.trim() || null,
      };

      const res = await fetch("/api/repairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "เกิดข้อผิดพลาดในการเปิดใบรับซ่อม");
      }

      confetti({ particleCount: 110, spread: 70, origin: { y: 0.6 } });
      setCreatedJob(json.data);
      setShowSlipModal(true);
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาดในการส่งข้อมูล");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header & Branch Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Wrench className="w-6 h-6 text-blue-600" />
            <span>เคาน์เตอร์ตรวจรับเครื่องด่วน (Reception Repair Intake)</span>
          </h1>
          <p className="text-sm text-slate-500">
            โหมดรับเครื่องหน้าร้าน บันทึกอาการ ตรวจสอบ 11 จุด แผนที่รอยตำหนิ มอบหมายช่าง เซ็นชื่อ และพิมพ์สลิป 80mm ทันที
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
          <Building2 className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-medium text-slate-600">สาขา:</span>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            disabled={submitting}
            className="text-xs font-semibold rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          ref={errorRef}
          className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-rose-500 hover:text-rose-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Box */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              <span>ข้อมูลลูกค้า (Customer Information)</span>
            </CardTitle>
            {selectedCustomerId && (
              <span className="text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                เลือกลูกค้าเดิมในระบบ
              </span>
            )}
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {/* Search Box */}
            <div className="relative">
              <Input
                placeholder="ค้นหาลูกค้าเดิม (พิมพ์ชื่อ หรือ เบอร์โทร เช่น 081...)"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                disabled={submitting}
                className="text-xs h-9 bg-slate-50"
              />
              {showSug && suggestions.length > 0 && (
                <div className="absolute z-30 left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-slate-200 divide-y max-h-52 overflow-y-auto">
                  {suggestions.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => handleSelectCustomer(c)}
                      className="p-2.5 hover:bg-blue-50 cursor-pointer text-xs flex justify-between items-center transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-slate-900">{c.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2">
                          <span>{c.phone}</span>
                          {c.lineId && <span className="text-emerald-600">LINE: {c.lineId}</span>}
                        </div>
                      </div>
                      <span className="text-blue-600 font-semibold text-xs">เลือกลูกค้านี้ &rarr;</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Customer Indicator */}
            {selectedCustomerId && (
              <div className="flex items-center justify-between p-2.5 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900">
                <span className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  เลือกลูกค้าเดิม: <strong className="font-bold">{customerName}</strong> ({customerPhone})
                </span>
                <button
                  type="button"
                  onClick={handleClearCustomer}
                  className="text-xs text-rose-600 hover:text-rose-800 font-semibold underline ml-2"
                >
                  ล้าง / กรอกเป็นลูกค้าใหม่
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อ-นามสกุล ลูกค้า <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  placeholder="เช่น คุณกฤษดา สมบูรณ์"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    if (selectedCustomerId) setSelectedCustomerId(null);
                  }}
                  disabled={submitting}
                  className="text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เบอร์โทรศัพท์ <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  placeholder="081-234-5678"
                  value={customerPhone}
                  onChange={(e) => {
                    setCustomerPhone(e.target.value);
                    if (selectedCustomerId) setSelectedCustomerId(null);
                  }}
                  disabled={submitting}
                  className="text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">LINE ID</label>
                <Input
                  placeholder="@line_id หรือ user_id"
                  value={customerLineId}
                  onChange={(e) => setCustomerLineId(e.target.value)}
                  disabled={submitting}
                  className="text-xs"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Device & Security & Technician Assignment */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-600" />
              <span>ข้อมูลอุปกรณ์ & การมอบหมายงาน (Device & Assignment)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ยี่ห้อ (Brand)</label>
                <select
                  value={deviceBrand}
                  onChange={(e) => setDeviceBrand(e.target.value)}
                  disabled={submitting}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {POPULAR_BRANDS.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
              </div>

              {deviceBrand === "อื่นๆ (Other)" ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ระบุยี่ห้อ *</label>
                  <Input
                    required
                    placeholder="เช่น Asus, Sony..."
                    value={customBrand}
                    onChange={(e) => setCustomBrand(e.target.value)}
                    disabled={submitting}
                    className="text-xs"
                  />
                </div>
              ) : null}

              <div className={deviceBrand === "อื่นๆ (Other)" ? "sm:col-span-1" : "sm:col-span-2"}>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รุ่นตัวเครื่อง (Model) <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  placeholder="เช่น iPhone 15 Pro Max, Galaxy S24 Ultra..."
                  value={deviceModel}
                  onChange={(e) => setDeviceModel(e.target.value)}
                  disabled={submitting}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">สีตัวเครื่อง (Color)</label>
                <Input
                  placeholder="เช่น Space Black, ขาว..."
                  value={deviceColor}
                  onChange={(e) => setDeviceColor(e.target.value)}
                  disabled={submitting}
                  className="text-xs"
                />
              </div>
            </div>

            {/* IMEI / Serial & Technician Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  IMEI / Serial Number (15 หลัก หรือ S/N)
                </label>
                <Input
                  placeholder="3589... หรือ S/N"
                  value={serialIMEI}
                  onChange={(e) => setSerialIMEI(e.target.value)}
                  disabled={submitting}
                  className="text-xs font-mono uppercase"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  กด *#06# ที่ตัวเครื่องเพื่อดูเลข IMEI
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>ช่างผู้รับผิดชอบงานซ่อม (Assigned Technician)</span>
                </label>
                <select
                  value={technicianId}
                  onChange={(e) => setTechnicianId(e.target.value)}
                  disabled={submitting}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">— ยังไม่ระบุช่าง (จ่ายงานภายหลัง) —</option>
                  {staffList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role === "TECHNICIAN" ? "ช่างเทคนิค" : u.role})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  หากยังไม่ทราบ สามารถเว้นว่างไว้เพื่อจ่ายงานในกระดานช่างภายหลังได้
                </span>
              </div>
            </div>

            {/* Lock Security Options */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-600" />
                  <span>รหัสปลดล็อคหน้าจอ (Lock Screen Passcode)</span>
                </label>
                <div className="flex gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setLockType("passcode")}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                      lockType === "passcode"
                        ? "bg-blue-600 text-white border-blue-600 font-bold shadow-2xs"
                        : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                    }`}
                  >
                    PIN / รหัสตัวเลข
                  </button>
                  <button
                    type="button"
                    onClick={() => setLockType("pattern")}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                      lockType === "pattern"
                        ? "bg-blue-600 text-white border-blue-600 font-bold shadow-2xs"
                        : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                    }`}
                  >
                    Pattern 3x3
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLockType("none");
                      setPasscode("");
                      setPatternLock("");
                    }}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                      lockType === "none"
                        ? "bg-blue-600 text-white border-blue-600 font-bold shadow-2xs"
                        : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                    }`}
                  >
                    ไม่มีรหัสผ่าน
                  </button>
                </div>
              </div>

              {lockType === "passcode" && (
                <Input
                  placeholder="กรอกรหัสผ่านตัวเลขหน้าจอ เช่น 147258 หรือ 000000"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  disabled={submitting}
                  className="text-xs font-mono max-w-md"
                />
              )}
              {lockType === "pattern" && (
                <div className="max-w-md">
                  <PatternLockCanvas value={patternLock} onChange={setPatternLock} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 11-point Pre-check Matrix & Physical Damage Mapping */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>การตรวจสภาพเครื่องเบื้องต้น & จุดตำหนิ (QC Pre-Check & Damage)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-5">
            {/* 11-Point Functional Matrix */}
            <PreCheckMatrix value={preCheckData} onChange={setPreCheckData} />

            {/* Interactive Physical Damage Mapping */}
            <PhysicalDamageInspector
              selectedDamages={damageLocations}
              onChangeDamages={setDamageLocations}
              damageNotes={damageNotes}
              onChangeNotes={setDamageNotes}
            />
          </CardContent>
        </Card>

        {/* Issue Description & Financial Estimate */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Tag className="w-4 h-4 text-blue-600" />
              <span>อาการเสียที่แจ้ง & ราคาประเมิน (Issue Description & Estimate)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                อาการเสียที่ลูกค้าแจ้ง <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={2}
                placeholder="ระบุอาการเสียอย่างละเอียด เช่น เปิดไม่ติดหลังตกน้ำ, ชาร์จไม่เข้า แบตบวมดันจอ..."
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                disabled={submitting}
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Quick Price Presets */}
            <div>
              <span className="text-[11px] font-semibold text-slate-600 mb-1.5 block">
                เลือกราคาประเมินด่วน (Quick Presets):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PRICE_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setLaborFee(p.labor);
                      setEstimatedCost(p.total);
                    }}
                    className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 rounded-lg transition-all"
                  >
                    {p.label} ({p.total.toLocaleString()}฿)
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-slate-500" />
                  <span>ค่าบริการประเมิน / ค่าแรง (บาท)</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  value={laborFee}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 0;
                    setLaborFee(val);
                    if (estimatedCost < val) setEstimatedCost(val);
                  }}
                  disabled={submitting}
                  className="text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-blue-600" />
                  <span>ราคาประเมินรวม (บาท)</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(Number(e.target.value) || 0)}
                  disabled={submitting}
                  className="text-xs font-mono font-bold text-blue-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>กำหนดเสร็จประมาณ (Estimated Finish)</span>
                </label>
                <Input
                  type="datetime-local"
                  value={estimatedFinish}
                  onChange={(e) => setEstimatedFinish(e.target.value)}
                  disabled={submitting}
                  className="text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                หมายเหตุภายใน (Internal Notes - เฉพาะเจ้าหน้าที่)
              </label>
              <Input
                placeholder="เช่น ลูกค้าขอเครื่องก่อนบ่ายสอง, มีอุปกรณ์แถมมาด้วย (หัวชาร์จแท้)..."
                value={intakeNotes}
                onChange={(e) => setIntakeNotes(e.target.value)}
                disabled={submitting}
                className="text-xs"
              />
            </div>
          </CardContent>
        </Card>

        {/* Customer Signature Pad */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900">
              ลายเซ็นลูกค้ายินยอมเงื่อนไข (Customer Signature)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <SignaturePad value={customerSignature} onChange={setCustomerSignature} />
          </CardContent>
        </Card>

        {/* Submit Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
          <Link href="/repairs" className="w-full sm:w-auto">
            <Button type="button" variant="outline" className="text-xs w-full sm:w-auto">
              กลับหน้ารายการงานซ่อม
            </Button>
          </Link>

          <Button
            type="submit"
            disabled={submitting}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-8 h-11 font-bold gap-2 shadow-sm w-full sm:w-auto min-w-[220px]"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังเปิดงานซ่อม...</span>
              </>
            ) : (
              <>
                <Printer className="w-4 h-4" />
                <span>บันทึกและพิมพ์สลิป 80mm</span>
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Thermal Slip Modal */}
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
