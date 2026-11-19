"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useApp } from "@/context/AppContext";
import { PatternLockCanvas } from "@/components/repairs/PatternLockCanvas";
import { SignaturePad } from "@/components/repairs/SignaturePad";
import { PreCheckMatrix, PRE_CHECK_DEFINITIONS } from "@/components/repairs/PreCheckMatrix";
import { ThermalSlipModal } from "@/components/repairs/ThermalSlipModal";

export default function ReceptionIntakePage() {
  const router = useRouter();
  const { currentBranch, branches, users } = useApp();

  const [branchId, setBranchId] = useState(currentBranch.id);
  const [technicianId, setTechnicianId] = useState("");

  // Customer
  const [customerSearch, setCustomerSearch] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSug, setShowSug] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerLineId, setCustomerLineId] = useState("");

  // Device
  const [deviceBrand, setDeviceBrand] = useState("Apple");
  const [deviceModel, setDeviceModel] = useState("iPhone 14 Pro Max");
  const [deviceColor, setDeviceColor] = useState("Space Black");
  const [serialIMEI, setSerialIMEI] = useState("");
  const [lockType, setLockType] = useState<"passcode" | "pattern" | "none">("passcode");
  const [passcode, setPasscode] = useState("");
  const [patternLock, setPatternLock] = useState("");

  // QC Checklist
  const [preCheckData, setPreCheckData] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    PRE_CHECK_DEFINITIONS.forEach((d) => {
      initial[d.key] = d.defaultOptions[0].value;
    });
    return initial;
  });

  // Issue & Estimate
  const [issueDescription, setIssueDescription] = useState("");
  const [laborFee, setLaborFee] = useState<number>(500);
  const [estimatedCost, setEstimatedCost] = useState<number>(2500);
  const [estimatedFinish, setEstimatedFinish] = useState("");

  // Signature
  const [customerSignature, setCustomerSignature] = useState<string | null>(null);

  // States
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdJob, setCreatedJob] = useState<any | null>(null);
  const [showSlipModal, setShowSlipModal] = useState(false);

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
    setCustomerName(c.name);
    setCustomerPhone(c.phone);
    setCustomerLineId(c.lineId || "");
    setShowSug(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !deviceModel || !issueDescription) {
      setError("กรุณากรอกข้อมูลสำคัญ (ชื่อ, เบอร์โทร, รุ่น, อาการเสีย) ให้ครบถ้วน");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        customerId: selectedCustomerId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerLineId: customerLineId.trim() || null,
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
        estimatedCost: Number(estimatedCost) || 0,
        estimatedFinish: estimatedFinish || null,
      };

      const res = await fetch("/api/repairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to create repair ticket");
      }

      confetti({ particleCount: 110, spread: 70, origin: { y: 0.6 } });
      setCreatedJob(json.data);
      setShowSlipModal(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Wrench className="w-6 h-6 text-blue-600" />
            <span>เคาน์เตอร์ตรวจรับเครื่องด่วน (Reception Repair Intake)</span>
          </h1>
          <p className="text-sm text-slate-500">
            โหมดรับเครื่องหน้าร้าน บันทึกอาการ ตรวจสอบ 11 จุด เซ็นชื่อ และพิมพ์สลิปทันที
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">สาขา:</span>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="text-xs font-semibold rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-slate-800"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Box */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              <span>ข้อมูลลูกค้า (Customer Info)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="relative">
              <Input
                placeholder="ค้นหาลูกค้าเดิม (ชื่อ หรือ เบอร์โทร 081...)"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="text-xs h-9 bg-slate-50"
              />
              {showSug && suggestions.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-slate-200 divide-y max-h-48 overflow-y-auto">
                  {suggestions.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => handleSelectCustomer(c)}
                      className="p-2.5 hover:bg-blue-50 cursor-pointer text-xs flex justify-between"
                    >
                      <div>
                        <div className="font-semibold text-slate-900">{c.name}</div>
                        <div className="text-[11px] text-slate-500">{c.phone}</div>
                      </div>
                      <span className="text-blue-600 font-medium">เลือก &rarr;</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อลูกค้า *</label>
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
                  placeholder="081-234-5678"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">LINE ID</label>
                <Input
                  placeholder="@line_id"
                  value={customerLineId}
                  onChange={(e) => setCustomerLineId(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Device & Security */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-600" />
              <span>ข้อมูลเครื่อง & ระบบความปลอดภัย (Device & Lock)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ยี่ห้อ</label>
                <select
                  value={deviceBrand}
                  onChange={(e) => setDeviceBrand(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                >
                  <option value="Apple">Apple</option>
                  <option value="Samsung">Samsung</option>
                  <option value="Xiaomi">Xiaomi</option>
                  <option value="Oppo">Oppo</option>
                  <option value="Vivo">Vivo</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">รุ่นตัวเครื่อง *</label>
                <Input
                  required
                  value={deviceModel}
                  onChange={(e) => setDeviceModel(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">สีตัวเครื่อง</label>
                <Input
                  value={deviceColor}
                  onChange={(e) => setDeviceColor(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">IMEI / Serial No</label>
                <Input
                  placeholder="3589..."
                  value={serialIMEI}
                  onChange={(e) => setSerialIMEI(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-700">รหัสปลดล็อคหน้าจอ</label>
                  <div className="flex gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setLockType("passcode")}
                      className={`px-2 py-0.5 rounded ${lockType === "passcode" ? "bg-blue-600 text-white font-bold" : "bg-slate-100"}`}
                    >
                      PIN
                    </button>
                    <button
                      type="button"
                      onClick={() => setLockType("pattern")}
                      className={`px-2 py-0.5 rounded ${lockType === "pattern" ? "bg-blue-600 text-white font-bold" : "bg-slate-100"}`}
                    >
                      Pattern 3x3
                    </button>
                    <button
                      type="button"
                      onClick={() => setLockType("none")}
                      className={`px-2 py-0.5 rounded ${lockType === "none" ? "bg-blue-600 text-white font-bold" : "bg-slate-100"}`}
                    >
                      ไม่มีรหัส
                    </button>
                  </div>
                </div>

                {lockType === "passcode" && (
                  <Input
                    placeholder="รหัสผ่านตัวเลขหน้าจอ เช่น 147258"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    className="text-xs font-mono"
                  />
                )}
                {lockType === "pattern" && (
                  <PatternLockCanvas value={patternLock} onChange={setPatternLock} />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 11-point Pre-check Matrix */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>การตรวจสภาพเครื่องเบื้องต้น (11-Point Matrix)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <PreCheckMatrix value={preCheckData} onChange={setPreCheckData} />
          </CardContent>
        </Card>

        {/* Issue Description & Financial */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900">
              อาการเสียที่แจ้ง & ราคาประเมิน (Issue & Quote)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                อาการเสียที่ลูกค้าแจ้ง *
              </label>
              <textarea
                required
                rows={2}
                placeholder="ระบุอาการเสียอย่างละเอียด..."
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ค่าบริการประเมิน (บาท)</label>
                <Input
                  type="number"
                  value={laborFee}
                  onChange={(e) => setLaborFee(Number(e.target.value))}
                  className="text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ราคาประเมินรวม (บาท)</label>
                <Input
                  type="number"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(Number(e.target.value))}
                  className="text-xs font-mono font-bold text-blue-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">กำหนดเสร็จประมาณ</label>
                <Input
                  type="datetime-local"
                  value={estimatedFinish}
                  onChange={(e) => setEstimatedFinish(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Signature */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900">
              ลายเซ็นลูกค้ายินยอมเงื่อนไข (Customer Signature)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <SignaturePad value={customerSignature} onChange={setCustomerSignature} />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-between items-center pt-2">
          <Link href="/repairs">
            <Button type="button" variant="outline" className="text-xs">
              กลับหน้ารายการ
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={submitting}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-8 h-10 font-bold gap-2 shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>{submitting ? "กำลังเปิดงานซ่อม..." : "บันทึกและพิมพ์สลิป 80mm"}</span>
          </Button>
        </div>
      </form>

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
