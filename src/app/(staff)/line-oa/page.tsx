"use client";

import React, { useState } from "react";
import { DemoBanner } from "@/components/ui/DemoBanner";
import {
  MessageSquare,
  Send,
  Smartphone,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Tag,
  Wrench,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Building2,
  FileText,
  Key,
  Eye,
  EyeOff,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { formatTHB } from "@/lib/utils";

type TemplateType = "REPAIR_DONE" | "QUOTATION" | "IN_PROGRESS" | "PROMOTION";

export default function LineOAPage() {
  const [activeTemplate, setActiveTemplate] = useState<TemplateType>("REPAIR_DONE");
  const [copied, setCopied] = useState(false);
  const [sentToast, setSentToast] = useState(false);

  // LINE Channel Configuration
  const [channelId, setChannelId] = useState("");
  const [channelSecret, setChannelSecret] = useState("");
  const [channelAccessToken, setChannelAccessToken] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configErrors, setConfigErrors] = useState<{ channelId?: string; channelSecret?: string; channelAccessToken?: string }>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveConfig = () => {
    const errs: typeof configErrors = {};
    if (!channelId.trim()) {
      errs.channelId = "กรุณาระบุ Channel ID (ห้ามว่างหรือมีเฉพาะช่องว่าง)";
    }
    if (!channelSecret.trim()) {
      errs.channelSecret = "กรุณาระบุ Channel Secret (ห้ามว่างหรือมีเฉพาะช่องว่าง)";
    }
    if (!channelAccessToken.trim()) {
      errs.channelAccessToken = "กรุณาระบุ Channel Access Token (ห้ามว่างหรือมีเฉพาะช่องว่าง)";
    }

    if (Object.keys(errs).length > 0) {
      setConfigErrors(errs);
      return;
    }

    setConfigErrors({});
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setConfigModalOpen(false);
    }, 1200);
  };

  // Template Parameters
  const [customerName, setCustomerName] = useState("คุณกิตติศักดิ์ มหาชัย");
  const [deviceModel, setDeviceModel] = useState("iPhone 15 Pro Max (Natural Titanium)");
  const [trackingCode, setTrackingCode] = useState("REP-202611-0001");
  const [repairItem, setRepairItem] = useState("เปลี่ยนชุดหน้าจอแท้ OLED + ซีลกันน้ำ");
  const [totalCost, setTotalCost] = useState(4200);
  const [warrantyDays, setWarrantyDays] = useState(90);

  // JSON Flex Payload Generator
  const generateFlexJson = () => {
    if (activeTemplate === "REPAIR_DONE") {
      return {
        type: "flex",
        altText: `แจ้งเครื่องซ่อมเสร็จ: ${deviceModel} (${trackingCode})`,
        contents: {
          type: "bubble",
          header: {
            type: "box",
            layout: "vertical",
            backgroundColor: "#06C755",
            contents: [
              { type: "text", text: "MobileShop Hub Service", color: "#FFFFFF", size: "xs", weight: "bold" },
              { type: "text", text: "เครื่องซ่อมเสร็จพร้อมรับแล้ว", color: "#FFFFFF", size: "lg", weight: "bold" },
            ],
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: `เรียน ${customerName}`, size: "sm", weight: "bold", color: "#111111" },
              { type: "text", text: "เครื่องของท่านผ่านการทดสอบ QC 10 จุดเรียบร้อยแล้ว", size: "xs", color: "#666666", margin: "xs" },
              { type: "separator", margin: "md" },
              {
                type: "box",
                layout: "vertical",
                margin: "md",
                spacing: "sm",
                contents: [
                  { type: "box", layout: "horizontal", contents: [{ type: "text", text: "รุ่นอุปกรณ์", size: "xs", color: "#888888" }, { type: "text", text: deviceModel, size: "xs", color: "#111111", align: "end", weight: "bold" }] },
                  { type: "box", layout: "horizontal", contents: [{ type: "text", text: "เลขที่ใบรับ", size: "xs", color: "#888888" }, { type: "text", text: trackingCode, size: "xs", color: "#0066FF", align: "end", weight: "bold" }] },
                  { type: "box", layout: "horizontal", contents: [{ type: "text", text: "รายการซ่อม", size: "xs", color: "#888888" }, { type: "text", text: repairItem, size: "xs", color: "#111111", align: "end" }] },
                  { type: "box", layout: "horizontal", contents: [{ type: "text", text: "การรับประกัน", size: "xs", color: "#888888" }, { type: "text", text: `${warrantyDays} วันเต็ม`, size: "xs", color: "#06C755", align: "end", weight: "bold" }] },
                  { type: "box", layout: "horizontal", contents: [{ type: "text", text: "ยอดชำระสุทธิ", size: "sm", color: "#111111", weight: "bold" }, { type: "text", text: `${totalCost.toLocaleString()} บาท`, size: "md", color: "#E11D48", align: "end", weight: "bold" }] },
                ],
              },
            ],
          },
          footer: {
            type: "box",
            layout: "vertical",
            spacing: "sm",
            contents: [
              { type: "button", style: "primary", color: "#06C755", height: "sm", action: { type: "uri", label: "ดูใบรับประกันและสลิปดิจิทัล", uri: `https://mobileshop.co.th/track/${trackingCode}` } },
              { type: "button", style: "secondary", height: "sm", action: { type: "uri", label: "เปิดแผนที่สาขาสุขุมวิท", uri: "https://maps.google.com" } },
            ],
          },
        },
      };
    } else if (activeTemplate === "QUOTATION") {
      return {
        type: "flex",
        altText: `ใบเสนอราคาค่าซ่อม: ${deviceModel}`,
        contents: {
          type: "bubble",
          header: {
            type: "box",
            layout: "vertical",
            backgroundColor: "#F59E0B",
            contents: [
              { type: "text", text: "ใบเสนอราคาค่าซ่อม (Price Quotation)", color: "#FFFFFF", size: "sm", weight: "bold" },
            ],
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: `เรียน ${customerName}`, size: "sm", weight: "bold" },
              { type: "text", text: "ช่างตรวจสอบพบอาการและเสนอราคาอะไหล่ดังนี้", size: "xs", color: "#666666" },
              { type: "separator", margin: "md" },
              {
                type: "box",
                layout: "vertical",
                margin: "md",
                contents: [
                  { type: "text", text: deviceModel, size: "sm", weight: "bold" },
                  { type: "text", text: `อาการ: ${repairItem}`, size: "xs", color: "#444444", margin: "xs" },
                  { type: "text", text: `ราคาประเมินรวม: ${totalCost.toLocaleString()} บาท`, size: "md", color: "#0284C7", weight: "bold", margin: "md" },
                ],
              },
            ],
          },
          footer: {
            type: "box",
            layout: "horizontal",
            spacing: "md",
            contents: [
              { type: "button", style: "primary", color: "#06C755", height: "sm", action: { type: "message", label: "อนุมัติซ่อมทันที", text: `อนุมัติซ่อมใบรับ ${trackingCode}` } },
              { type: "button", style: "secondary", height: "sm", action: { type: "message", label: "ขอปรึกษาช่าง", text: `ขอข้อมูลเพิ่มเติมใบรับ ${trackingCode}` } },
            ],
          },
        },
      };
    } else if (activeTemplate === "IN_PROGRESS") {
      return {
        type: "flex",
        altText: `อัปเดตสถานะการซ่อม: ${trackingCode}`,
        contents: {
          type: "bubble",
          header: {
            type: "box",
            layout: "vertical",
            backgroundColor: "#2563EB",
            contents: [
              { type: "text", text: "อัปเดตสถานะงานซ่อม (In-Progress)", color: "#FFFFFF", size: "sm", weight: "bold" },
            ],
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: deviceModel, size: "sm", weight: "bold" },
              { type: "text", text: `ใบรับงาน: ${trackingCode}`, size: "xs", color: "#0066FF" },
              { type: "text", text: "สถานะ: กำลังเปลี่ยนอะไหล่และทดสอบ QC (75%)", size: "xs", color: "#16A34A", weight: "bold", margin: "md" },
              { type: "text", text: "คาดว่าจะแล้วเสร็จ: วันนี้ เวลา 17:30 น.", size: "xs", color: "#666666" },
            ],
          },
        },
      };
    } else {
      return {
        type: "flex",
        altText: "คูปองพิเศษสำหรับสมาชิก MobileShop VIP",
        contents: {
          type: "bubble",
          header: {
            type: "box",
            layout: "vertical",
            backgroundColor: "#7C3AED",
            contents: [
              { type: "text", text: "MobileShop VIP Privileges", color: "#FFFFFF", size: "sm", weight: "bold" },
              { type: "text", text: "รับส่วนลด 15% งานซ่อมและอุปกรณ์", color: "#FFFFFF", size: "md", weight: "bold" },
            ],
          },
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: "ขอบคุณที่ไว้วางใจใช้บริการกับเรา", size: "xs", color: "#666666" },
              { type: "text", text: "รหัสคูปอง: VIPCARE2569", size: "sm", weight: "bold", color: "#7C3AED", margin: "sm" },
              { type: "text", text: "ใช้ได้ถึง 31 ธ.ค. 2569 ที่ทุกสาขา", size: "xs", color: "#888888" },
            ],
          },
        },
      };
    }
  };

  const flexJsonString = JSON.stringify(generateFlexJson(), null, 2);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(flexJsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendSimulation = () => {
    setSentToast(true);
    setTimeout(() => setSentToast(false), 3000);
  };

  return (
    <div className="space-y-6">
      <DemoBanner message="ยังไม่ได้เชื่อมต่อ LINE OA ตัวสร้าง Flex Message ใช้ดูตัวอย่างและคัดลอก JSON ได้ แต่จะไม่ส่งข้อความจริง" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#06C755] text-white shadow-sm">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              LINE Official Account & Flex Message Simulator
            </h1>
            <p className="text-xs text-slate-500">
              จำลองส่งข้อความอัตโนมัติ การแจ้งเตือนซ่อมเสร็จ ใบเสนอราคา และบัตรรับประกันผ่าน LINE Messaging API
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfigModalOpen(true)}
            className="text-xs h-8 gap-1.5 border-slate-300"
          >
            <Key className="h-3.5 w-3.5 text-slate-600" />
            <span>ตั้งค่า Channel API</span>
          </Button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>LINE Webhook Connected (@MobileShopHub_TH)</span>
          </div>
        </div>
      </div>

      {/* Template Selector Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { id: "REPAIR_DONE", title: "1. เครื่องซ่อมเสร็จพร้อมรับ", subtitle: "แจ้งเตือนรับเครื่อง + ใบเสร็จดิจิทัล", color: "emerald" },
          { id: "QUOTATION", title: "2. ใบเสนอราคาค่าซ่อม", subtitle: "ส่งให้ลูกค้าอนุมัติผ่านปุ่ม", color: "amber" },
          { id: "IN_PROGRESS", title: "3. กำลังดำเนินการซ่อม", subtitle: "แจ้งความคืบหน้า 75%", color: "blue" },
          { id: "PROMOTION", title: "4. สิทธิพิเศษ & บัตรสมาชิก", subtitle: "คูปองส่วนลด 15% VIP", color: "purple" },
        ].map((t) => {
          const isSelected = activeTemplate === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTemplate(t.id as any)}
              className={`p-3 rounded-xl border text-left transition-all ${
                isSelected
                  ? "border-[#06C755] bg-emerald-50/40 ring-1 ring-[#06C755]"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="font-bold text-xs text-slate-900 mb-0.5">{t.title}</div>
              <div className="text-[11px] text-slate-500">{t.subtitle}</div>
            </button>
          );
        })}
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Configuration & JSON Inspector (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Form Controls */}
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900">
                พารามิเตอร์ข้อความ (Template Data Parameters)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">ชื่อลูกค้า</label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">เลขที่ใบรับซ่อม</label>
                  <Input
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value)}
                    className="text-xs h-9 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">รุ่นอุปกรณ์</label>
                  <Input
                    value={deviceModel}
                    onChange={(e) => setDeviceModel(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">ยอดค่าใช้จ่าย (บาท)</label>
                  <Input
                    type="number"
                    value={totalCost}
                    onChange={(e) => setTotalCost(Number(e.target.value))}
                    className="text-xs h-9 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">รายการซ่อม / อาการ</label>
                <Input
                  value={repairItem}
                  onChange={(e) => setRepairItem(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  onClick={handleSendSimulation}
                  className="bg-[#06C755] hover:bg-[#05b34c] text-white text-xs h-9 gap-2 shadow-xs"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>ทดสอบส่ง (ยังไม่เชื่อมต่อ LINE)</span>
                </Button>

                {sentToast && (
                  <span role="status" className="text-xs text-amber-700 font-semibold flex items-center gap-1 animate-fade-in">
                    ยังไม่ได้เชื่อมต่อ LINE OA — ข้อความไม่ได้ถูกส่งจริง
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* JSON Inspector */}
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  LINE Flex Message Payload (JSON)
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  โครงสร้าง Payload มาตรฐานของ LINE Messaging API
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyJson}
                className="gap-1.5 text-xs h-8 border-slate-300"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? "คัดลอกแล้ว" : "คัดลอก JSON"}</span>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <pre className="p-4 bg-slate-950 text-slate-300 text-xs font-mono overflow-x-auto max-h-72 rounded-b-xl">
                {flexJsonString}
              </pre>
            </CardContent>
          </Card>
        </div>

        {/* Right: Smartphone Frame Mockup (5 cols) */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-[340px] rounded-[36px] border-4 border-slate-800 bg-[#849EB5] p-3 shadow-2xl overflow-hidden relative">
            {/* Phone Speaker & Camera Island */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 h-4 w-24 bg-slate-900 rounded-full z-20 flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-slate-800 mr-2" />
              <div className="h-1.5 w-8 rounded-full bg-slate-800" />
            </div>

            {/* LINE App Header */}
            <div className="bg-[#202930] text-white pt-6 pb-2.5 px-3 rounded-t-[26px] flex items-center justify-between mb-3 text-xs shadow-xs">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-[#06C755] flex items-center justify-center font-bold text-white text-[10px]">
                  MS
                </div>
                <div>
                  <div className="font-bold text-[12px] leading-tight">MobileShop Hub</div>
                  <div className="text-[9px] text-slate-400">LINE Official Account (Verified)</div>
                </div>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">14:32</div>
            </div>

            {/* LINE Chat Content Canvas */}
            <div className="min-h-[460px] pb-4 space-y-3">
              {/* Flex Message Bubble Container */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200/60 max-w-[290px] mx-auto animate-fade-in">
                {/* Header based on template */}
                {activeTemplate === "REPAIR_DONE" && (
                  <div className="bg-[#06C755] p-3.5 text-white">
                    <div className="text-[10px] font-semibold tracking-wider uppercase opacity-90">MobileShop Hub Service</div>
                    <div className="text-sm font-extrabold mt-0.5">เครื่องซ่อมเสร็จพร้อมรับแล้ว</div>
                  </div>
                )}
                {activeTemplate === "QUOTATION" && (
                  <div className="bg-[#F59E0B] p-3.5 text-white">
                    <div className="text-[10px] font-semibold tracking-wider uppercase opacity-90">Price Quotation</div>
                    <div className="text-sm font-extrabold mt-0.5">ใบเสนอราคาค่าบริการงานซ่อม</div>
                  </div>
                )}
                {activeTemplate === "IN_PROGRESS" && (
                  <div className="bg-[#2563EB] p-3.5 text-white">
                    <div className="text-[10px] font-semibold tracking-wider uppercase opacity-90">Repair Update</div>
                    <div className="text-sm font-extrabold mt-0.5">รายงานสถานะงานซ่อม (75%)</div>
                  </div>
                )}
                {activeTemplate === "PROMOTION" && (
                  <div className="bg-[#7C3AED] p-3.5 text-white">
                    <div className="text-[10px] font-semibold tracking-wider uppercase opacity-90">VIP Privileges</div>
                    <div className="text-sm font-extrabold mt-0.5">ส่วนลดพิเศษสำหรับสมาชิก</div>
                  </div>
                )}

                {/* Body Content */}
                <div className="p-3.5 text-xs space-y-2 text-slate-800">
                  <div className="font-bold text-slate-900">เรียน {customerName}</div>
                  <p className="text-[11px] text-slate-500">
                    {activeTemplate === "REPAIR_DONE" && "ช่างได้ทำการเปลี่ยนอะไหล่และตรวจสอบระบบ QC 10 จุดเรียบร้อย พร้อมส่งมอบ"}
                    {activeTemplate === "QUOTATION" && "ช่างผู้ชำนาญการได้ทำการตรวจเช็คเครื่องแล้ว มีรายการเสนอราคาดังนี้"}
                    {activeTemplate === "IN_PROGRESS" && "เครื่องกำลังอยู่ขั้นตอนประกอบและเทส QC ก่อนส่งมอบ"}
                    {activeTemplate === "PROMOTION" && "มอบสิทธิพิเศษส่วนลดค่าแรงและค่าอะไหล่สำหรับคุณ"}
                  </p>

                  <div className="border-t border-slate-100 pt-2 space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">รุ่นเครื่อง:</span>
                      <span className="font-semibold text-slate-800 text-right max-w-[170px] truncate">{deviceModel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">เลขที่ใบรับ:</span>
                      <span className="font-mono font-bold text-blue-600">{trackingCode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">รายการ:</span>
                      <span className="text-slate-700 text-right max-w-[170px] truncate">{repairItem}</span>
                    </div>
                    {activeTemplate === "REPAIR_DONE" && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">ประกันงานซ่อม:</span>
                        <span className="font-bold text-[#06C755]">{warrantyDays} วัน</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                      <span className="font-bold text-slate-700">ยอดชำระสุทธิ:</span>
                      <span className="font-bold text-sm text-rose-600 font-mono">{formatTHB(totalCost)}</span>
                    </div>
                  </div>
                </div>

                {/* Action CTA Buttons */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 space-y-1.5">
                  {activeTemplate === "REPAIR_DONE" && (
                    <>
                      <button className="w-full py-2 bg-[#06C755] hover:bg-[#05b34c] text-white font-bold rounded-lg text-xs shadow-2xs">
                        ดูใบรับประกันและสลิปดิจิทัล
                      </button>
                      <button className="w-full py-1.5 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg text-[11px] hover:bg-slate-100">
                        เปิดแผนที่สาขาสุขุมวิท (Google Maps)
                      </button>
                    </>
                  )}
                  {activeTemplate === "QUOTATION" && (
                    <div className="grid grid-cols-2 gap-1.5">
                      <button className="py-2 bg-[#06C755] text-white font-bold rounded-lg text-xs">
                        อนุมัติซ่อม
                      </button>
                      <button className="py-2 bg-slate-200 text-slate-700 font-medium rounded-lg text-xs">
                        ปรึกษาช่าง
                      </button>
                    </div>
                  )}
                  {activeTemplate === "IN_PROGRESS" && (
                    <button className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg text-xs">
                      ติดตามสถานะเรียลไทม์
                    </button>
                  )}
                  {activeTemplate === "PROMOTION" && (
                    <button className="w-full py-2 bg-purple-600 text-white font-bold rounded-lg text-xs">
                      กดรับสิทธิ์คูปอง 15%
                    </button>
                  )}
                </div>
              </div>

              {/* Timestamp & Read Mark */}
              <div className="text-[10px] text-right pr-4 text-slate-600 font-mono">
                อ่านแล้ว 14:32
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LINE Messaging API Channel Settings Dialog */}
      <Dialog open={configModalOpen} onOpenChange={setConfigModalOpen}>
        <DialogHeader>
          <DialogTitle onClose={() => setConfigModalOpen(false)}>
            ตั้งค่า LINE Messaging API Credentials
          </DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-4">
          <p className="text-xs text-slate-500">
            กำหนดค่าการเชื่อมต่อ LINE Messaging API สำหรับส่งข้อความและ Flex Message ผ่าน LINE Official Account
          </p>

          {saveSuccess && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>บันทึกการตั้งค่า LINE Messaging API สำเร็จ</span>
            </div>
          )}

          {/* Channel ID */}
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">Channel ID *</label>
            <Input
              value={channelId}
              onChange={(e) => {
                setChannelId(e.target.value);
                setConfigErrors((prev) => ({ ...prev, channelId: undefined }));
              }}
              placeholder="เช่น 2001234567"
              className={`text-xs h-9 font-mono ${configErrors.channelId ? "border-rose-400 focus:ring-rose-400" : ""}`}
            />
            {configErrors.channelId && (
              <p className="text-[11px] text-rose-600 mt-1">{configErrors.channelId}</p>
            )}
          </div>

          {/* Channel Secret */}
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">Channel Secret *</label>
            <div className="relative">
              <Input
                type={showSecret ? "text" : "password"}
                value={channelSecret}
                onChange={(e) => {
                  setChannelSecret(e.target.value);
                  setConfigErrors((prev) => ({ ...prev, channelSecret: undefined }));
                }}
                placeholder="Channel Secret จาก LINE Developers"
                className={`text-xs h-9 font-mono pr-9 ${configErrors.channelSecret ? "border-rose-400 focus:ring-rose-400" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowSecret((v) => !v)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 transition-colors"
                title={showSecret ? "ซ่อน Channel Secret" : "แสดง Channel Secret"}
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {configErrors.channelSecret && (
              <p className="text-[11px] text-rose-600 mt-1">{configErrors.channelSecret}</p>
            )}
          </div>

          {/* Channel Access Token */}
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">Channel Access Token (Long-lived) *</label>
            <div className="relative">
              <Input
                type={showToken ? "text" : "password"}
                value={channelAccessToken}
                onChange={(e) => {
                  setChannelAccessToken(e.target.value);
                  setConfigErrors((prev) => ({ ...prev, channelAccessToken: undefined }));
                }}
                placeholder="Channel Access Token (v2.1)"
                className={`text-xs h-9 font-mono pr-9 ${configErrors.channelAccessToken ? "border-rose-400 focus:ring-rose-400" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 transition-colors"
                title={showToken ? "ซ่อน Access Token" : "แสดง Access Token"}
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {configErrors.channelAccessToken && (
              <p className="text-[11px] text-rose-600 mt-1">{configErrors.channelAccessToken}</p>
            )}
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfigModalOpen(false)} className="text-xs">
            ยกเลิก
          </Button>
          <Button
            onClick={handleSaveConfig}
            className="text-xs bg-[#06C755] hover:bg-[#05b34c] text-white gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            <span>บันทึกข้อมูล</span>
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
