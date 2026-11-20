"use client";

import React, { useState } from "react";
import { AlertTriangle, Check, ShieldAlert, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface DamagePoint {
  id: string;
  nameThai: string;
  category: "front" | "back" | "frame" | "port";
}

const COMMON_DAMAGE_POINTS: DamagePoint[] = [
  { id: "screen_crack", nameThai: "หน้าจอแตกร้าว / มีรอยร้าว", category: "front" },
  { id: "screen_scratch", nameThai: "หน้าจอมีรอยขูดขีด / ขนแมว", category: "front" },
  { id: "corner_tl", nameThai: "มุมบนซ้าย บิ่น / ถลอก", category: "frame" },
  { id: "corner_tr", nameThai: "มุมบนขวา บิ่น / ถลอก", category: "frame" },
  { id: "corner_bl", nameThai: "มุมล่างซ้าย บิ่น / ถลอก", category: "frame" },
  { id: "corner_br", nameThai: "มุมล่างขวา บิ่น / ถลอก", category: "frame" },
  { id: "back_crack", nameThai: "ฝาหลังแตกร้าว", category: "back" },
  { id: "back_scratch", nameThai: "ฝาหลังมีรอยเคสกัด / ถลอก", category: "back" },
  { id: "camera_lens", nameThai: "กระจกเลนส์กล้องหลังร้าว / เป็นรอย", category: "back" },
  { id: "frame_bent", nameThai: "บอดี้ / ตัวเครื่องโก่งงอ", category: "frame" },
  { id: "port_damaged", nameThai: "ช่องชาร์จ / พอร์ตมีรอยงัดเบี้ยว", category: "port" },
  { id: "buttons_stuck", nameThai: "ปุ่มเปิดปิด / ปุ่มเสียง ยุบจม", category: "frame" },
];

interface PhysicalDamageInspectorProps {
  selectedDamages: string[];
  onChangeDamages: (damages: string[]) => void;
  damageNotes: string;
  onChangeNotes: (notes: string) => void;
  readonly?: boolean;
}

export function PhysicalDamageInspector({
  selectedDamages = [],
  onChangeDamages,
  damageNotes = "",
  onChangeNotes,
  readonly = false,
}: PhysicalDamageInspectorProps) {
  const toggleDamage = (name: string) => {
    if (readonly) return;
    if (selectedDamages.includes(name)) {
      onChangeDamages(selectedDamages.filter((d) => d !== name));
    } else {
      onChangeDamages([...selectedDamages, name]);
    }
  };

  const clearAll = () => {
    if (readonly) return;
    onChangeDamages([]);
  };

  return (
    <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          <div>
            <span className="text-xs font-bold text-slate-800">
              แผนที่จุดตำหนิ & บันทึกสภาพตัวเครื่อง (Physical Damage Mapping)
            </span>
            <p className="text-[11px] text-slate-500">
              บันทึกจุดที่มีรอยแตก บิ่น หรือถลอกล่วงหน้า เพื่อป้องกันข้อพิพาทเมื่อส่งมอบ
            </p>
          </div>
        </div>
        {!readonly && selectedDamages.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-7 text-xs text-rose-600 hover:text-rose-700 self-start sm:self-auto"
          >
            ล้างจุดตำหนิทั้งหมด ({selectedDamages.length})
          </Button>
        )}
      </div>

      {/* Visual Hotspot Quick Buttons */}
      <div>
        <div className="text-[11px] font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
          <span>แตะเลือกจุดที่พบรอยตำหนิ / ชำรุด:</span>
          {selectedDamages.length === 0 ? (
            <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
              <Check className="w-3 h-3" /> ตัวเครื่องสภาพปกติ ไร้รอยตำหนิเด่นชัด
            </span>
          ) : (
            <span className="text-[10px] text-rose-600 font-bold">
              ระบุ {selectedDamages.length} จุดตำหนิ
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {COMMON_DAMAGE_POINTS.map((item) => {
            const isSelected = selectedDamages.includes(item.nameThai);
            return (
              <button
                key={item.id}
                type="button"
                disabled={readonly}
                onClick={() => toggleDamage(item.nameThai)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-rose-50 text-rose-700 border-rose-300 font-semibold shadow-2xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                } ${readonly ? "cursor-default" : "cursor-pointer"}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isSelected ? "bg-rose-600" : "bg-slate-300"
                  }`}
                />
                <span>{item.nameThai}</span>
                {isSelected && !readonly && (
                  <X className="w-3 h-3 text-rose-500 hover:text-rose-800 ml-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Damage Notes */}
      <div>
        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
          หมายเหตุสภาพบอดี้ / รอยตำหนิเพิ่มเติม
        </label>
        <input
          type="text"
          disabled={readonly}
          placeholder="เช่น ติดฟิล์มกระจกแตกแต่จอในปกติ, ฝาหลังมีรอยเคสกัดประปราย, ขอบข้างเครื่องมีรอยขูด..."
          value={damageNotes}
          onChange={(e) => onChangeNotes(e.target.value)}
          className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
        />
      </div>
    </div>
  );
}
