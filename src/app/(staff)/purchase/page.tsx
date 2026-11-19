"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatTHB } from "@/lib/utils";
import { useApp } from "@/context/AppContext";

export default function SecondhandBuybackAppraisalPage() {
  const router = useRouter();
  const { currentBranch } = useApp();

  // Device specs
  const [brand, setBrand] = useState("Apple");
  const [model, setModel] = useState("iPhone 14 Pro 128GB");
  const [capacity, setCapacity] = useState("128GB");
  const [imei, setImei] = useState("358912345098711");
  const [conditionGrade, setConditionGrade] = useState<"A" | "B" | "C">("A");

  // Inspection check factors
  const [batteryHealth, setBatteryHealth] = useState(88);
  const [screenOriginal, setScreenOriginal] = useState(true);
  const [faceIdOk, setFaceIdOk] = useState(true);
  const [housingOk, setHousingOk] = useState(true);

  // Customer info
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [declarationAgreed, setDeclarationAgreed] = useState(true);

  // Calculated Price
  const BASE_PRICES: Record<string, number> = {
    "iPhone 14 Pro 128GB": 21000,
    "iPhone 14 Pro Max 256GB": 25000,
    "iPhone 13 128GB": 13500,
    "Samsung Galaxy S23 Ultra": 19000,
  };

  const base = BASE_PRICES[model] || 15000;

  // Model options may already include a capacity ("iPhone 14 Pro 128GB"); strip it and use the
  // selected capacity so the saved name is never "… 128GB 128GB".
  const CAPACITY_RE = /\s*\b\d+\s?(GB|TB)\b/i;
  const deviceModelName = `${model.replace(CAPACITY_RE, "").trim()} ${capacity}`;
  let multiplier = conditionGrade === "A" ? 1.0 : conditionGrade === "B" ? 0.88 : 0.75;
  if (batteryHealth < 80) multiplier -= 0.05;
  if (!screenOriginal) multiplier -= 0.12;
  if (!faceIdOk) multiplier -= 0.10;

  const estimatedBuybackPrice = Math.round((base * multiplier) / 100) * 100;
  const [finalPrice, setFinalPrice] = useState<number>(estimatedBuybackPrice);

  // Submitting
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleSubmitBuyback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitError("");
    if (!customerName.trim() || !customerPhone.trim() || !nationalId.trim() || !imei.trim()) {
      setSubmitError("กรุณากรอกข้อมูลลูกค้าและเลข IMEI ให้ครบถ้วน");
      return;
    }
    if (!/^\d{13}$/.test(nationalId.replace(/[\s-]/g, ""))) {
      setSubmitError("กรุณากรอกเลขบัตรประชาชน 13 หลักให้ถูกต้อง");
      return;
    }
    if (!declarationAgreed) {
      setSubmitError("ลูกค้าต้องยินยอมในหนังสือรับรองกรรมสิทธิ์ว่าไม่ใช่เครื่องโจรกรรม");
      return;
    }
    const price = finalPrice || estimatedBuybackPrice;
    if (!Number.isFinite(price) || price <= 0) {
      setSubmitError("ราคารับซื้อต้องมากกว่า 0");
      return;
    }

    setSubmitting(true);
    try {
      // Buyback goes through /api/trade-in, which registers the IMEI and adds it to stock.
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
        setSubmitError(json.error || "บันทึกการรับซื้อไม่สำเร็จ กรุณาลองใหม่");
        return;
      }
      confetti({ particleCount: 110, spread: 70 });
      router.push("/purchase-history");
    } catch (err) {
      console.error(err);
      setSubmitError("เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <HandCoins className="w-6 h-6 text-purple-600" />
            <span>ระบบรับซื้อมือถือมือสอง (Secondhand Buyback Appraisal)</span>
          </h1>
          <p className="text-sm text-slate-500">
            ประเมินราคารับซื้อตามสภาพ บันทึกเลขบัตรประชาชน และทำสัญญาปลอดโจรกรรม
          </p>
        </div>
        <Link href="/purchase-history">
          <Button variant="outline" size="sm" className="text-xs gap-1.5">
            <History className="w-3.5 h-3.5 text-slate-600" />
            <span>ประวัติสัญญาซื้อเข้า</span>
          </Button>
        </Link>
      </div>

      <form onSubmit={handleSubmitBuyback} className="space-y-6">
        {/* Device & Appraisal Box */}
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

        {submitError && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={submitting}
            className="text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold px-8 h-10 shadow-sm gap-2"
          >
            <HandCoins className="w-4 h-4" />
            <span>{submitting ? "กำลังบันทึก..." : "อนุมัติรับซื้อและออกสัญญาซื้อขาย"}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
