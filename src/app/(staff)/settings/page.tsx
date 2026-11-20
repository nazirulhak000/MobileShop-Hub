"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sliders,
  Building2,
  Printer,
  Receipt,
  Database,
  Save,
  CheckCircle2,
  Copy,
  Check,
  Download,
  Smartphone,
  Eye,
  EyeOff,
  Palette,
  Sparkles,
  ArrowRight,
  Globe,
  Coins,
  QrCode,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { formatTHB } from "@/lib/utils";
import { generatePromptPayPayload, validatePromptPayTarget } from "@/lib/promptpay";
import { GeneralStoreSettings, DEFAULT_STORE_SETTINGS } from "@/types/settings";
import QRCode from "qrcode";

export default function SettingsPage() {
  const { currentBranch } = useApp();
  const [activeTab, setActiveTab] = useState<"store" | "receipt" | "financial" | "line" | "backup">("store");
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Settings State
  const [settings, setSettings] = useState<GeneralStoreSettings>(DEFAULT_STORE_SETTINGS);

  // Password Visibility
  const [showChannelSecret, setShowChannelSecret] = useState(false);
  const [showAccessToken, setShowAccessToken] = useState(false);

  // Live PromptPay QR Preview
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string>("");
  const [testQrAmount, setTestQrAmount] = useState<number>(150);

  const webhookUrl = "https://api.mobileshop.co.th/api/webhook/line";

  // Fetch Settings on mount
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/settings");
      const json = await res.json().catch(() => null);
      if (res.ok && json?.data) {
        setSettings(json.data);
      }
    } catch (err: any) {
      console.error("Fetch settings error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Update Live PromptPay QR Preview when promptPayId or testQrAmount changes
  useEffect(() => {
    const target = settings.promptPayId || settings.taxId || "0105567012345";
    const payload = generatePromptPayPayload(target, testQrAmount > 0 ? testQrAmount : undefined);

    QRCode.toDataURL(payload, {
      width: 180,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then(setQrPreviewUrl)
      .catch((err) => console.error("PromptPay QR generation error:", err));
  }, [settings.promptPayId, settings.taxId, testQrAmount]);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 3500);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Validate required fields
      if (!settings.shopName.trim()) {
        alert("กรุณาระบุชื่อร้านค้าหรือชื่อนิติบุคคล");
        return;
      }

      if (settings.showPromptPayQR && settings.promptPayId) {
        const ppCheck = validatePromptPayTarget(settings.promptPayId);
        if (!ppCheck.valid) {
          alert(ppCheck.message || "หมายเลข PromptPay ไม่ถูกต้อง (ต้องเป็นเบอร์มือถือ หรือ Tax ID 13 หลัก)");
          return;
        }
      }

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setSettings(json.data);
        showToast("บันทึกการตั้งค่าระบบทั่วไปสำเร็จ");
      } else {
        alert(json?.error || "ไม่สามารถบันทึกการตั้งค่าได้");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const updateField = <K extends keyof GeneralStoreSettings>(key: K, value: GeneralStoreSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {statusMsg && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg transition-all ${
            statusMsg.type === "success"
              ? "bg-emerald-900 text-emerald-100 border border-emerald-700"
              : "bg-rose-900 text-rose-100 border border-rose-700"
          }`}
        >
          {statusMsg.type === "success" ? <Check className="h-4 w-4 text-emerald-400" /> : <AlertCircle className="h-4 w-4 text-rose-400" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              ตั้งค่าระบบทั่วไป (General System Settings)
            </h1>
            <p className="text-xs text-slate-500">
              จัดการข้อมูลนิติบุคคล หัวใบเสร็จ PromptPay QR สกุลเงิน เขตเวลา ภาษีมูลค่าเพิ่ม LINE OA และฐานข้อมูล
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchSettings}
            disabled={loading || saving}
            className="gap-1.5 text-xs h-9 text-slate-700"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>รีเฟรช</span>
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2 text-xs h-9 bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}</span>
          </Button>
        </div>
      </div>

      {/* High-Visibility Card: Storefront Customizer & Theme Editor */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-emerald-950 p-6 text-white border border-emerald-500/30 shadow-md">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/40">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              <span>WordPress & Shopify Style • No-Code Storefront Editor</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Palette className="h-5 w-5 text-emerald-400" />
              <span>ปรับแต่งหน้าร้านออนไลน์ (Storefront Customizer)</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              เครื่องมือปรับแต่งหน้าร้านระดับมืออาชีพ เลือกธีมสีพรีเมียม 6 เฉดสี, ปรับแต่งข้อความ Hero & Badge, ตั้งค่าแถบประกาศ (Announcement Bar), จัดการเปิด-ปิดเซกชัน พร้อมดู Live Preview แบบตอบสนองทันที
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/settings/storefront"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold shadow-sm transition-all active:scale-95 min-h-[44px]"
            >
              <Palette className="h-4 w-4" />
              <span>เข้าสู่เครื่องมือปรับแต่งหน้าร้าน</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2">
        {[
          { id: "store", label: "ข้อมูลร้านค้า & นิติบุคคล", icon: Building2 },
          { id: "receipt", label: "ใบเสร็จ & PromptPay QR", icon: Printer },
          { id: "financial", label: "การเงิน ภาษี & เวลา", icon: Receipt },
          { id: "line", label: "การเชื่อมต่อ LINE OA", icon: Smartphone },
          { id: "backup", label: "ฐานข้อมูล & แบ็คอัป", icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100/70 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="space-y-6">
        {/* ================= TAB 1: STORE PROFILE ================= */}
        {activeTab === "store" && (
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900">
                ข้อมูลนิติบุคคลและร้านค้า (Company & Store Profile)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                ข้อมูลนี้จะปรากฏในใบเสร็จรับเงิน ใบกำกับภาษีเต็มรูป เอกสารส่งซ่อม และระบบใบแจ้งหนี้
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">ชื่อนิติบุคคล / ชื่อร้านค้า *</label>
                <Input
                  value={settings.shopName}
                  onChange={(e) => updateField("shopName", e.target.value)}
                  placeholder="เช่น บริษัท โมบายช็อป ฮับ จำกัด"
                  className="text-xs h-9"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">สโลแกน / คำอธิบายร้าน</label>
                <Input
                  value={settings.shopSlogan}
                  onChange={(e) => updateField("shopSlogan", e.target.value)}
                  placeholder="เช่น ศูนย์บริการซ่อมมือถือด่วนและจำหน่ายอุปกรณ์แท้ครบวงจร"
                  className="text-xs h-9"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">เลขประจำตัวผู้เสียภาษี (13 หลัก) *</label>
                  <Input
                    value={settings.taxId}
                    onChange={(e) => updateField("taxId", e.target.value)}
                    placeholder="เช่น 0105567012345"
                    className="text-xs h-9 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">รหัสสาขาหลัก (5 หลัก) *</label>
                  <Input
                    value={settings.branchCode}
                    onChange={(e) => updateField("branchCode", e.target.value)}
                    placeholder="00000"
                    maxLength={5}
                    className="text-xs h-9 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">ชื่อสาขาหลัก</label>
                  <Input
                    value={settings.branchName}
                    onChange={(e) => updateField("branchName", e.target.value)}
                    placeholder="สำนักงานใหญ่ (HQ)"
                    className="text-xs h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">เบอร์โทรศัพท์ติดต่อ</label>
                  <Input
                    value={settings.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="เช่น 02-123-4567, 081-234-5678"
                    className="text-xs h-9"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">อีเมลติดต่อ</label>
                  <Input
                    value={settings.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="contact@mobileshop.co.th"
                    className="text-xs h-9"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">ที่อยู่จดทะเบียนสำนักงานใหญ่</label>
                <textarea
                  rows={2}
                  value={settings.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  placeholder="เลขที่ ถนน แขวง เขต จังหวัด รหัสไปรษณีย์"
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="gap-2 text-xs h-9 bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{saving ? "กำลังบันทึก..." : "บันทึกข้อมูลร้านค้า"}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ================= TAB 2: RECEIPT & PROMPTPAY QR ================= */}
        {activeTab === "receipt" && (
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900">
                ตั้งค่าใบเสร็จรับเงิน & PromptPay QR (Receipt & Cashier QR Options)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                กำหนดหัว-ท้ายสลิปกระดาษความร้อน และหมายเลข PromptPay EMVCo สำหรับการชำระเงินด่วนที่แคชเชียร์
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Form (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">ขนาดกระดาษความร้อน Thermal Slip</label>
                    <div className="grid grid-cols-2 gap-3 max-w-sm">
                      {[
                        { id: "80mm", label: "80 mm (มาตรฐานร้านค้า)" },
                        { id: "58mm", label: "58 mm (พกพา / ประหยัด)" },
                      ].map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => updateField("paperWidth", p.id as any)}
                          className={`p-2.5 rounded-lg border text-xs font-bold transition-all ${
                            settings.paperWidth === p.id
                              ? "border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-500"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">ข้อความหัวสลิป (Receipt Header)</label>
                    <Input
                      value={settings.receiptHeader}
                      onChange={(e) => updateField("receiptHeader", e.target.value)}
                      placeholder="เช่น FIXME MOBILE SERVICE & ACCESSORIES"
                      className="text-xs h-9 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">ข้อความท้ายสลิปและเงื่อนไขรับประกัน (Slip Footer)</label>
                    <textarea
                      rows={2}
                      value={settings.receiptFooter}
                      onChange={(e) => updateField("receiptFooter", e.target.value)}
                      placeholder="เช่น ขอบคุณที่ใช้บริการ งานซ่อมรับประกัน 90 วัน กรุณาเก็บใบเสร็จเพื่อการรับประกัน"
                      className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800"
                    />
                  </div>

                  <div className="border border-slate-200 p-4 rounded-xl bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-900">แสดง PromptPay QR Code ท้ายสลิป & จุดแคชเชียร์</div>
                        <div className="text-[11px] text-slate-500">สร้าง QR ตามมาตรฐาน EMVCo รองรับการสแกนผ่านแอปธนาคารทุกแห่ง</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.showPromptPayQR}
                        onChange={(e) => updateField("showPromptPayQR", e.target.checked)}
                        className="h-4 w-4 rounded text-blue-600 cursor-pointer"
                      />
                    </div>

                    {settings.showPromptPayQR && (
                      <div className="pt-2 border-t border-slate-200 space-y-2">
                        <label className="text-xs font-semibold text-slate-700 block">
                          หมายเลขบัญชี PromptPay ผู้รับเงิน (PromptPay Recipient ID) *
                        </label>
                        <Input
                          value={settings.promptPayId}
                          onChange={(e) => updateField("promptPayId", e.target.value)}
                          placeholder="เบอร์มือถือ (08X-XXX-XXXX) หรือ Tax ID 13 หลัก"
                          className="text-xs h-9 font-mono max-w-sm"
                        />
                        <p className="text-[11px] text-slate-500">
                          สามารถใช้เบอร์มือถือร้านค้า (10 หลัก) หรือเลขประจำตัวผู้เสียภาษี 13 หลักของนิติบุคคล
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right PromptPay QR Live Preview (5 cols) */}
                <div className="lg:col-span-5 bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col items-center text-center space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-900/60 border border-blue-700 text-blue-300 text-[11px] font-semibold">
                    <QrCode className="h-3.5 w-3.5 text-blue-400" />
                    <span>EMVCo Thai QR Live Preview</span>
                  </div>

                  <div className="h-44 w-44 bg-white rounded-xl p-2 flex items-center justify-center border border-slate-200 shadow-sm relative overflow-hidden">
                    {qrPreviewUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={qrPreviewUrl} alt="Thai QR PromptPay" className="h-40 w-40 object-contain" />
                    ) : (
                      <div className="text-slate-400 text-xs">กำลังสร้าง QR...</div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="font-bold text-sm text-white font-mono">
                      พร้อมเพย์: {settings.promptPayId || settings.taxId || "0105567012345"}
                    </div>
                    <div className="text-xs text-emerald-400 font-mono font-bold">
                      ยอดทดสอบ: {formatTHB(testQrAmount)} (Satang Precision)
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs w-full max-w-xs pt-1">
                    <span className="text-[11px] text-slate-400 shrink-0">ทดสอบยอด:</span>
                    <Input
                      type="number"
                      value={testQrAmount}
                      onChange={(e) => setTestQrAmount(Number(e.target.value))}
                      className="text-xs h-7 bg-slate-800 text-white border-slate-700 text-right font-mono"
                    />
                    <span className="text-[11px] text-slate-400">บาท</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="gap-2 text-xs h-9 bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่าใบเสร็จ"}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ================= TAB 3: FINANCIAL, TAX & LOCALIZATION ================= */}
        {activeTab === "financial" && (
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900">
                การเงิน สกุลเงิน เขตเวลา & ภาษีมูลค่าเพิ่ม (Financial & VAT Settings)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                กำหนดสกุลเงิน สัญลักษณ์ สกุลเงินท้องถิ่น เขตเวลาของร้าน และการคำนวณภาษี VAT 7% ตามแบบ ภ.พ.30
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              {/* Currency & Timezone */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-slate-100 pb-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Coins className="h-3.5 w-3.5 text-blue-600" />
                    <span>รหัสสกุลเงิน (Currency Code) *</span>
                  </label>
                  <Input
                    value={settings.currency}
                    onChange={(e) => updateField("currency", e.target.value.toUpperCase())}
                    placeholder="THB"
                    className="text-xs h-9 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">สัญลักษณ์สกุลเงิน (Symbol) *</label>
                  <Input
                    value={settings.currencySymbol}
                    onChange={(e) => updateField("currencySymbol", e.target.value)}
                    placeholder="฿"
                    className="text-xs h-9 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-emerald-600" />
                    <span>เขตเวลาของร้าน (Timezone) *</span>
                  </label>
                  <select
                    value={settings.timezone}
                    onChange={(e) => updateField("timezone", e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 bg-white h-9"
                  >
                    <option value="Asia/Bangkok">Asia/Bangkok (GMT+7: ประเทศไทย)</option>
                    <option value="Asia/Singapore">Asia/Singapore (GMT+8: สิงคโปร์)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (GMT+9: ญี่ปุ่น)</option>
                    <option value="UTC">UTC (Universal Time Coordinated)</option>
                  </select>
                </div>
              </div>

              {/* VAT Controls */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-900">เปิดใช้งานระบบภาษีมูลค่าเพิ่ม (VAT System)</div>
                    <div className="text-[11px] text-slate-500">จดทะเบียนภาษีมูลค่าเพิ่ม ภ.พ.20 และคำนวณแยกภาษีซื้อ-ภาษีขายอย่างถูกต้อง</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.vatEnabled}
                    onChange={(e) => updateField("vatEnabled", e.target.checked)}
                    className="h-4 w-4 rounded text-blue-600 cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">อัตราภาษีมูลค่าเพิ่ม (%)</label>
                    <Input
                      type="number"
                      value={settings.vatRate}
                      onChange={(e) => updateField("vatRate", Number(e.target.value))}
                      className="text-xs h-9 font-mono max-w-[120px]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">รูปแบบราคาหน้าร้าน</label>
                    <select
                      value={settings.vatPriceMode}
                      onChange={(e) => updateField("vatPriceMode", e.target.value as any)}
                      className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 bg-white h-9"
                    >
                      <option value="INCLUDED">ราคารวมภาษีแล้ว (VAT Included)</option>
                      <option value="EXCLUDED">ราคาไม่รวมภาษี (VAT Excluded)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="gap-2 text-xs h-9 bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่าการเงิน & ภาษี"}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ================= TAB 4: LINE OA INTEGRATION ================= */}
        {activeTab === "line" && (
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900">
                เชื่อมต่อ LINE Official Account (LINE Messaging API)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                ตั้งค่าคีย์เชื่อมต่อ LINE สำหรับส่งข้อความแจ้งสถานะงานซ่อม และการแจ้งเตือนสต็อกอะไหล่
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Channel ID</label>
                  <Input
                    value={settings.lineChannelId || ""}
                    onChange={(e) => updateField("lineChannelId", e.target.value)}
                    placeholder="เช่น 1234567890"
                    className="text-xs h-9 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Channel Secret</label>
                  <div className="relative">
                    <Input
                      type={showChannelSecret ? "text" : "password"}
                      value={settings.lineChannelSecret || ""}
                      onChange={(e) => updateField("lineChannelSecret", e.target.value)}
                      placeholder="Channel Secret จาก LINE Developers"
                      className="text-xs h-9 font-mono pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowChannelSecret((v) => !v)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 transition-colors"
                      title={showChannelSecret ? "ซ่อน" : "แสดง"}
                    >
                      {showChannelSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Channel Access Token</label>
                <div className="relative">
                  <Input
                    type={showAccessToken ? "text" : "password"}
                    value={settings.lineChannelAccessToken || ""}
                    onChange={(e) => updateField("lineChannelAccessToken", e.target.value)}
                    placeholder="Long-lived Access Token จาก LINE Developers Console"
                    className="text-xs h-9 font-mono pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAccessToken((v) => !v)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 transition-colors"
                    title={showAccessToken ? "ซ่อน" : "แสดง"}
                  >
                    {showAccessToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Webhook URL สำหรับ LINE Developers</label>
                <div className="flex items-center gap-2">
                  <Input
                    value={webhookUrl}
                    readOnly
                    className="text-xs h-9 font-mono bg-slate-50"
                  />
                  <Button
                    variant="outline"
                    onClick={copyWebhook}
                    className="text-xs h-9 shrink-0 gap-1"
                  >
                    {copiedWebhook ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedWebhook ? "คัดลอกแล้ว" : "คัดลอก"}</span>
                  </Button>
                </div>
              </div>

              <div className="border border-slate-200 p-3 rounded-lg bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-700">ส่งแจ้งเตือนลูกค้าอัตโนมัติเมื่อเปิดใบรับซ่อมหรือซ่อมเสร็จ</span>
                  <input
                    type="checkbox"
                    checked={settings.lineNotifyRepairs !== false}
                    onChange={(e) => updateField("lineNotifyRepairs", e.target.checked)}
                    className="rounded text-blue-600 cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-700">แจ้งเตือนแอดมินเมื่อสินค้าอะไหล่ใกล้หมดสต็อก</span>
                  <input
                    type="checkbox"
                    checked={settings.lineNotifyLowStock !== false}
                    onChange={(e) => updateField("lineNotifyLowStock", e.target.checked)}
                    className="rounded text-blue-600 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="gap-2 text-xs h-9 bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า LINE OA"}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ================= TAB 5: DATABASE & BACKUP ================= */}
        {activeTab === "backup" && (
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900">
                สถานะฐานข้อมูลและการสำรองข้อมูล (Database & Cloud Backup)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="text-[11px] text-slate-500">ฐานข้อมูล (Engine)</div>
                  <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">SQLite 3 (dev.db)</div>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="text-[11px] text-slate-500">สถานะการเชื่อมต่อ</div>
                  <div className="text-sm font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>เชื่อมต่อสมบูรณ์ (Healthy)</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="text-[11px] text-slate-500">ความปลอดภัยของระบบ</div>
                  <div className="text-sm font-bold text-blue-600 flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Multi-Tenant Isolated</span>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 p-4 rounded-xl flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Download className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">ดาวน์โหลดไฟล์สำรองฐานข้อมูล (.db Backup)</h4>
                    <p className="text-[11px] text-slate-500">สำรองข้อมูลงานซ่อม สต็อก และยอดขายทั้งหมดเก็บไว้ในเครื่อง</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  title="ติดต่อผู้ดูแลระบบ"
                  className="text-xs h-8 gap-1.5 border-slate-300 cursor-not-allowed"
                >
                  <Download className="h-3.5 w-3.5" />
                  ดาวน์โหลด .db
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
