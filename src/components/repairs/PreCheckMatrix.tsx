"use client";

import React from "react";
import { CheckCircle2, XCircle, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface PreCheckItem {
  key: string;
  label: string;
  category: string;
  defaultOptions: { value: string; label: string; status: "pass" | "fail" | "warn" }[];
}

export const PRE_CHECK_DEFINITIONS: PreCheckItem[] = [
  {
    key: "screen",
    label: "หน้าจอแสดงผล (LCD/OLED)",
    category: "Display",
    defaultOptions: [
      { value: "PASS", label: "ปกติ / คมชัด", status: "pass" },
      { value: "BROKEN", label: "จอแตก / รอยร้าว", status: "fail" },
      { value: "LINE", label: "มีเส้นพาด / จุดด่าง", status: "warn" },
      { value: "NO_DISPLAY", label: "จอมืด / ไม่ติด", status: "fail" },
    ],
  },
  {
    key: "touch",
    label: "ระบบสัมผัส (Touch Screen)",
    category: "Display",
    defaultOptions: [
      { value: "PASS", label: "ทัชลื่นทุกจุด", status: "pass" },
      { value: "GLITCH", label: "ทัชเพี้ยน / จุดบอด", status: "warn" },
      { value: "FAIL", label: "ทัชไม่ติดทั้งจอ", status: "fail" },
    ],
  },
  {
    key: "cameraFront",
    label: "กล้องหน้า (Front Camera)",
    category: "Camera",
    defaultOptions: [
      { value: "PASS", label: "ปกติ / โฟกัสชัด", status: "pass" },
      { value: "BLURRY", label: "ภาพมัว / เลนส์มัว", status: "warn" },
      { value: "FAIL", label: "เปิดไม่ติด / จอดำ", status: "fail" },
    ],
  },
  {
    key: "cameraBack",
    label: "กล้องหลัง (Rear Camera / OIS)",
    category: "Camera",
    defaultOptions: [
      { value: "PASS", label: "ปกติ ซูมครบระยะ", status: "pass" },
      { value: "SHAKE", label: "กล้องสั่น / มีเสียงจี่", status: "fail" },
      { value: "FAIL", label: "เปิดไม่ติด / มืด", status: "fail" },
    ],
  },
  {
    key: "faceId",
    label: "สแกนใบหน้า / นิ้วมือ (FaceID/Biometrics)",
    category: "Sensors",
    defaultOptions: [
      { value: "PASS", label: "สแกนผ่านปกติ", status: "pass" },
      { value: "UNAVAILABLE", label: "แจ้งเตือนไม่พร้อมใช้", status: "warn" },
      { value: "FAIL", label: "เสีย / ใช้งานไม่ได้", status: "fail" },
    ],
  },
  {
    key: "charging",
    label: "ระบบชาร์จไฟ (Charging Port)",
    category: "Power",
    defaultOptions: [
      { value: "PASS", label: "ชาร์จเร็ว กระแสปกติ", status: "pass" },
      { value: "LOOSE", label: "พอร์ตหลวม / ติดๆ ดับๆ", status: "warn" },
      { value: "NO_DRAW", label: "ไม่เข้า / 0.00A", status: "fail" },
    ],
  },
  {
    key: "mic",
    label: "ไมโครโฟนรับเสียง (Microphone)",
    category: "Audio",
    defaultOptions: [
      { value: "PASS", label: "บันทึกเสียงชัดเจน", status: "pass" },
      { value: "NOISE", label: "เสียงเบา / ซ่า", status: "warn" },
      { value: "FAIL", label: "ไม่ได้ยินเสียงเลย", status: "fail" },
    ],
  },
  {
    key: "speaker",
    label: "ลำโพงสนทนา / กระดิ่ง (Speakers)",
    category: "Audio",
    defaultOptions: [
      { value: "PASS", label: "ดังชัดเจนทั้ง 2 ตัว", status: "pass" },
      { value: "MUFFLED", label: "เสียงแตก / เบาแหบ", status: "warn" },
      { value: "FAIL", label: "ไม่มีเสียง", status: "fail" },
    ],
  },
  {
    key: "wifi",
    label: "สัญญาณ Wi-Fi & Bluetooth",
    category: "Connectivity",
    defaultOptions: [
      { value: "PASS", label: "จับสัญญาณแรงปกติ", status: "pass" },
      { value: "WEAK", label: "สัญญาณอ่อน / ค้นหายาก", status: "warn" },
      { value: "FAIL", label: "เปิดไม่ได้ / เทา", status: "fail" },
    ],
  },
  {
    key: "moisture",
    label: "ตรวจความชื้นแถบ LDI (Moisture)",
    category: "Inspection",
    defaultOptions: [
      { value: "NORMAL", label: "ปกติ (แถบขาว/เงิน)", status: "pass" },
      { value: "SUSPECTED", label: "สงสัยความชื้น", status: "warn" },
      { value: "WATER_INGRESS", label: "โดนน้ำ (แถบแดง)", status: "fail" },
    ],
  },
  {
    key: "drops",
    label: "สภาพตัวเครื่อง & รอยตกกระแทก (Body)",
    category: "Inspection",
    defaultOptions: [
      { value: "PRISTINE", label: "สวย ไร้รอย", status: "pass" },
      { value: "SCRATCHES", label: "มีรอยเคสกัด / ขนแมว", status: "warn" },
      { value: "DENTED", label: "มุมบิ่น / บอดี้งอ", status: "warn" },
      { value: "HEAVY_DROP", label: "ตกกระแทกแรง / ยับ", status: "fail" },
    ],
  },
];

interface PreCheckMatrixProps {
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
  readonly?: boolean;
}

export function PreCheckMatrix({
  value,
  onChange,
  readonly = false,
}: PreCheckMatrixProps) {
  const handleSelect = (key: string, optionValue: string) => {
    if (readonly) return;
    onChange({
      ...value,
      [key]: optionValue,
    });
  };

  const handlePassAll = () => {
    const allPass: Record<string, string> = {};
    PRE_CHECK_DEFINITIONS.forEach((item) => {
      allPass[item.key] = item.defaultOptions[0].value;
    });
    onChange(allPass);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
        <div>
          <span className="text-sm font-semibold text-slate-900">
            รายการตรวจสภาพเครื่องเบื้องต้นก่อนรับซ่อม (Pre-check QC Matrix)
          </span>
          <p className="text-xs text-slate-500">
            ตรวจเช็ค 11 จุดมาตรฐาน เพื่อบันทึกเป็นหลักฐานป้องกันข้อพิพาท
          </p>
        </div>
        {!readonly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePassAll}
            className="text-xs text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 gap-1.5 self-start sm:self-auto"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>ผ่านทั้งหมด (Pass All)</span>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {PRE_CHECK_DEFINITIONS.map((item) => {
          const selectedVal = value[item.key] || item.defaultOptions[0].value;

          return (
            <div
              key={item.key}
              className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">
                  {item.label}
                </span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                  {item.category}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {item.defaultOptions.map((opt) => {
                  const isSelected = selectedVal === opt.value;

                  let activeClass = "";
                  if (isSelected) {
                    if (opt.status === "pass") {
                      activeClass = "bg-emerald-600 text-white border-emerald-600 shadow-xs";
                    } else if (opt.status === "fail") {
                      activeClass = "bg-rose-600 text-white border-rose-600 shadow-xs";
                    } else {
                      activeClass = "bg-amber-500 text-white border-amber-500 shadow-xs";
                    }
                  } else {
                    activeClass = "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100";
                  }

                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={readonly}
                      onClick={() => handleSelect(item.key, opt.value)}
                      className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all ${activeClass} ${
                        readonly ? "cursor-default" : "cursor-pointer"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
