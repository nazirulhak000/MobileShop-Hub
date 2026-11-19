"use client";

import React, { useState } from "react";
import {
  Sliders,
  Building2,
  Printer,
  Receipt,
  Shield,
  Database,
  Save,
  CheckCircle2,
  Copy,
  Check,
  Download,
  Bell,
  Smartphone,
  HardDrive,
  FileText,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";

export default function SettingsPage() {
  const { currentBranch } = useApp();
  const [activeTab, setActiveTab] = useState<"store" | "receipt" | "tax" | "line" | "backup">("store");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Store Profile
  const [storeName, setStoreName] = useState("บริษัท โมบายช็อป ฮับ จำกัด (MobileShop Hub Co., Ltd.)");
  const [storeSlogan, setStoreSlogan] = useState("ศูนย์บริการซ่อมมือถือด่วนและจำหน่ายอุปกรณ์แท้ครบวงจร");
  const [taxId, setTaxId] = useState("0105567012345");
  const [phone, setPhone] = useState("02-123-4567");
  const [email, setEmail] = useState("contact@mobileshop.co.th");
  const [address, setAddress] = useState("เลขที่ 888 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110");

  // Receipt Settings
  const [paperWidth, setPaperWidth] = useState<"80mm" | "58mm">("80mm");
  const [slipFooter, setSlipFooter] = useState("ขอบคุณที่ใช้บริการ งานซ่อมรับประกัน 90 วัน กรุณาเก็บใบเสร็จเพื่อการรับประกัน");
  const [showPromptPayQR, setShowPromptPayQR] = useState(true);
  const [promptPayId, setPromptPayId] = useState("0105567012345");

  // Tax Settings
  const [vatEnabled, setVatEnabled] = useState(true);
  const [vatRate, setVatRate] = useState(7);
  const [vatPriceMode, setVatPriceMode] = useState<"INCLUDED" | "EXCLUDED">("INCLUDED");

  // LINE Settings
  const [lineChannelId, setLineChannelId] = useState("2001928491");
  const [lineChannelSecret, setLineChannelSecret] = useState("89af412c9b1029e84d72019c84e1b829");
  const [lineNotifyRepairs, setLineNotifyRepairs] = useState(true);
  const [lineNotifyLowStock, setLineNotifyLowStock] = useState(true);

  const webhookUrl = "https://api.mobileshop.co.th/api/webhook/line";

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  return (
    <div className="space-y-6">
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
              จัดการข้อมูลนิติบุคคล หัวใบเสร็จ ภาษีมูลค่าเพิ่ม LINE OA Webhook และสำรองฐานข้อมูล
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {savedSuccess && (
            <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1 animate-fade-in mr-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              บันทึกการตั้งค่าสำเร็จ!
            </span>
          )}

          <Button
            onClick={handleSave}
            className="gap-2 text-xs h-9 bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
          >
            <Save className="h-3.5 w-3.5" />
            บันทึกการตั้งค่า
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2">
        {[
          { id: "store", label: "ข้อมูลร้านค้า & นิติบุคคล", icon: Building2 },
          { id: "receipt", label: "ใบเสร็จ & การพิมพ์", icon: Printer },
          { id: "tax", label: "ภาษี & ภ.พ.30", icon: Receipt },
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
        {/* Store Profile Tab */}
        {activeTab === "store" && (
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900">
                ข้อมูลนิติบุคคลและร้านค้า (Company & Store Profile)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                ข้อมูลนี้จะปรากฏในใบเสร็จรับเงิน ใบกำกับภาษีเต็มรูป และเอกสารส่งซ่อม
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">ชื่อนิติบุคคล / ชื่อร้านค้า *</label>
                <Input
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">สโลแกน / คำอธิบายร้าน</label>
                <Input
                  value={storeSlogan}
                  onChange={(e) => setStoreSlogan(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">เลขประจำตัวผู้เสียภาษี (13 หลัก) *</label>
                  <Input
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    className="text-xs h-9 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">เบอร์โทรศัพท์ติดต่อ</label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">อีเมลติดต่อ</label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">ที่อยู่จดทะเบียนสำนักงานใหญ่</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Receipt Tab */}
        {activeTab === "receipt" && (
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900">
                ตั้งค่าใบเสร็จรับเงินและการพิมพ์ (Receipt & Slip Options)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">ขนาดกระดาษความร้อน Thermal Slip</label>
                <div className="grid grid-cols-2 gap-3 max-w-sm">
                  {[
                    { id: "80mm", label: "80 mm (มาตรฐานร้านค้า)" },
                    { id: "58mm", label: "58 mm (พกพา/ประหยัด)" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPaperWidth(p.id as any)}
                      className={`p-2.5 rounded-lg border text-xs font-bold transition-all ${
                        paperWidth === p.id
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
                <label className="text-xs font-semibold text-slate-700 mb-1 block">ข้อความท้ายสลิปใบเสร็จ (Footer Message)</label>
                <textarea
                  rows={2}
                  value={slipFooter}
                  onChange={(e) => setSlipFooter(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800"
                />
              </div>

              <div className="border border-slate-200 p-3 rounded-lg bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-900">แสดง PromptPay QR Code ท้ายสลิป</div>
                    <div className="text-[11px] text-slate-500">พิมพ์ QR พร้อมเพย์ให้ลูกค้าสแกนจ่ายเงินได้ทันที</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={showPromptPayQR}
                    onChange={(e) => setShowPromptPayQR(e.target.checked)}
                    className="h-4 w-4 rounded text-blue-600"
                  />
                </div>

                {showPromptPayQR && (
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">หมายเลข PromptPay ID</label>
                    <Input
                      value={promptPayId}
                      onChange={(e) => setPromptPayId(e.target.value)}
                      className="text-xs h-9 font-mono max-w-xs"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tax Tab */}
        {activeTab === "tax" && (
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900">
                ตั้งค่าภาษีมูลค่าเพิ่ม (VAT 7% & ภ.พ.30)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="text-xs font-semibold text-slate-900">เปิดใช้งานระบบภาษีมูลค่าเพิ่ม (VAT)</div>
                  <div className="text-[11px] text-slate-500">จดทะเบียนภาษีมูลค่าเพิ่ม ภ.พ.20 และคำนวณแยกภาษีซื้อ-ภาษีขาย</div>
                </div>
                <input
                  type="checkbox"
                  checked={vatEnabled}
                  onChange={(e) => setVatEnabled(e.target.checked)}
                  className="h-4 w-4 rounded text-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">อัตราภาษีมูลค่าเพิ่ม (%)</label>
                  <Input
                    type="number"
                    value={vatRate}
                    onChange={(e) => setVatRate(Number(e.target.value))}
                    className="text-xs h-9 font-mono max-w-[120px]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">รูปแบบราคาหน้าร้าน</label>
                  <select
                    value={vatPriceMode}
                    onChange={(e) => setVatPriceMode(e.target.value as any)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 bg-white"
                  >
                    <option value="INCLUDED">ราคารวมภาษีแล้ว (VAT Included)</option>
                    <option value="EXCLUDED">ราคาไม่รวมภาษี (VAT Excluded)</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* LINE Tab */}
        {activeTab === "line" && (
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900">
                เชื่อมต่อ LINE Official Account (LINE Messaging API)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Channel ID</label>
                  <Input
                    value={lineChannelId}
                    onChange={(e) => setLineChannelId(e.target.value)}
                    className="text-xs h-9 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Channel Secret</label>
                  <Input
                    type="password"
                    value={lineChannelSecret}
                    onChange={(e) => setLineChannelSecret(e.target.value)}
                    className="text-xs h-9 font-mono"
                  />
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
                  <span className="text-xs text-slate-700">ส่งแจ้งเตือนลูกค้าอัตโนมัติเมื่อเปิดใบรับซ่อม</span>
                  <input
                    type="checkbox"
                    checked={lineNotifyRepairs}
                    onChange={(e) => setLineNotifyRepairs(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-700">แจ้งเตือนแอดมินเมื่อสินค้าอะไหล่ใกล้หมดสต็อก</span>
                  <input
                    type="checkbox"
                    checked={lineNotifyLowStock}
                    onChange={(e) => setLineNotifyLowStock(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Database & Backup Tab */}
        {activeTab === "backup" && (
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900">
                สถานะฐานข้อมูลและการสำรองข้อมูล (Database & Cloud Backup)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
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
                  <div className="text-[11px] text-slate-500">ขนาดไฟล์ข้อมูล</div>
                  <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">~1.24 MB</div>
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
                  onClick={() => alert("ดาวน์โหลดไฟล์สำรอง dev.db สำเร็จ")}
                  className="text-xs h-8 gap-1.5 border-slate-300"
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
