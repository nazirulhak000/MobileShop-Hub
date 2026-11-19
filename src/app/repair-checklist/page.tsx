"use client";

import React, { useState } from "react";
import {
  CheckSquare,
  PlusCircle,
  Smartphone,
  ShieldCheck,
  Edit2,
  Trash2,
  Sparkles,
  Eye,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";

interface ChecklistItem {
  id: string;
  nameThai: string;
  nameEng: string;
  category: "Display" | "Camera" | "Audio" | "Power" | "Sensors" | "Body";
  phase: "PRE_CHECK" | "POST_CHECK" | "BOTH";
  isRequired: boolean;
  options: string[];
}

const INITIAL_CHECKLIST: ChecklistItem[] = [
  { id: "chk-1", nameThai: "หน้าจอแสดงผล (LCD/OLED)", nameEng: "Display Screen", category: "Display", phase: "BOTH", isRequired: true, options: ["ปกติ", "จอแตก", "เส้นพาด", "จอมืด"] },
  { id: "chk-2", nameThai: "ระบบสัมผัส (Touch Screen)", nameEng: "Touch Responsiveness", category: "Display", phase: "BOTH", isRequired: true, options: ["ทัชลื่น", "ทัชเพี้ยน", "ทัชไม่ติด"] },
  { id: "chk-3", nameThai: "กล้องหน้า (Front Camera)", nameEng: "Front Camera", category: "Camera", phase: "BOTH", isRequired: false, options: ["ปกติ", "ภาพมัว", "เปิดไม่ติด"] },
  { id: "chk-4", nameThai: "กล้องหลัง & ระบบกันสั่น (Rear Camera)", nameEng: "Rear Camera & OIS", category: "Camera", phase: "BOTH", isRequired: false, options: ["ปกติ", "กล้องสั่น", "มืด"] },
  { id: "chk-5", nameThai: "ระบบชาร์จไฟ (Charging Port)", nameEng: "Charging Port", category: "Power", phase: "BOTH", isRequired: true, options: ["ชาร์จเร็วปกติ", "พอร์ตหลวม", "ไม่เข้า (0A)"] },
  { id: "chk-6", nameThai: "ไมโครโฟนรับเสียง (Microphone)", nameEng: "Microphone", category: "Audio", phase: "BOTH", isRequired: false, options: ["เสียงชัด", "เสียงเบา/ซ่า", "ไม่มีเสียง"] },
  { id: "chk-7", nameThai: "ลำโพงสนทนา & ลำโพงล่าง (Speakers)", nameEng: "Speakers", category: "Audio", phase: "BOTH", isRequired: false, options: ["ดังชัด", "เสียงแตก", "เงียบ"] },
  { id: "chk-8", nameThai: "ระบบสแกนใบหน้า / ลายนิ้วมือ", nameEng: "FaceID / Biometrics", category: "Sensors", phase: "BOTH", isRequired: false, options: ["ผ่านปกติ", "ไม่พร้อมใช้", "เสีย"] },
  { id: "chk-9", nameThai: "สัญญาณ Wi-Fi & Bluetooth", nameEng: "Wi-Fi & Bluetooth", category: "Sensors", phase: "BOTH", isRequired: false, options: ["สัญญาณแรง", "สัญญาณอ่อน", "เปิดไม่ได้"] },
  { id: "chk-10", nameThai: "แถบวัดความชื้น LDI (Moisture)", nameEng: "Liquid Contact Indicator", category: "Body", phase: "PRE_CHECK", isRequired: true, options: ["ปกติ (ขาว)", "สงสัยความชื้น", "โดนน้ำ (แดง)"] },
  { id: "chk-11", nameThai: "สภาพบอดี้และรอยตกกระแทก (Body)", nameEng: "Physical Casing", category: "Body", phase: "PRE_CHECK", isRequired: true, options: ["สวยไร้รอย", "รอยขนแมว", "มุมบิ่น", "ตกยับ"] },
  { id: "chk-12", nameThai: "การติดกาวซีลกันน้ำและทำความสะอาด", nameEng: "Waterproof Seal & Clean", category: "Body", phase: "POST_CHECK", isRequired: true, options: ["ซีลสนิทเรียบร้อย", "มีช่องว่าง"] },
];

export default function RepairChecklistManagerPage() {
  const [items, setItems] = useState<ChecklistItem[]>(INITIAL_CHECKLIST);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [showAddModal, setShowAddModal] = useState(false);

  // New item form
  const [newNameThai, setNewNameThai] = useState("");
  const [newNameEng, setNewNameEng] = useState("");
  const [newCategory, setNewCategory] = useState<ChecklistItem["category"]>("Display");
  const [newPhase, setNewPhase] = useState<ChecklistItem["phase"]>("BOTH");
  const [newRequired, setNewRequired] = useState(true);
  const [newOptionsText, setNewOptionsText] = useState("ปกติ, ผิดปกติ, ไม่สามารถเช็คได้");

  const handleToggleRequired = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isRequired: !item.isRequired } : item
      )
    );
  };

  const handleDeleteItem = (id: string) => {
    if (!confirm("ต้องการลบหัวข้อตรวจเช็คนี้หรือไม่?")) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const opts = newOptionsText.split(",").map((s) => s.trim()).filter(Boolean);
    const newItem: ChecklistItem = {
      id: `chk-${Date.now()}`,
      nameThai: newNameThai,
      nameEng: newNameEng,
      category: newCategory,
      phase: newPhase,
      isRequired: newRequired,
      options: opts.length > 0 ? opts : ["ปกติ", "ผิดปกติ"],
    };
    setItems((prev) => [...prev, newItem]);
    setShowAddModal(false);
    setNewNameThai("");
    setNewNameEng("");
  };

  const filteredItems = items.filter((i) => {
    if (activeCategory === "ALL") return true;
    return i.category === activeCategory;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-blue-600" />
            <span>ตั้งค่ารายการตรวจสภาพเครื่อง (Inspection Checklist Config)</span>
          </h1>
          <p className="text-sm text-slate-500">
            กำหนดหัวข้อตรวจสภาพก่อนรับเครื่อง (Pre-check) และตรวจคุณภาพหลังซ่อม (Post-check QC)
          </p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2 text-xs shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>เพิ่มหัวข้อตรวจใหม่</span>
        </Button>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {["ALL", "Display", "Camera", "Audio", "Power", "Sensors", "Body"].map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeCategory === cat
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {cat === "ALL" ? "ทุกหมวดหมู่" : cat}
          </button>
        ))}
      </div>

      {/* Checklist Table */}
      <Card className="border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
              <tr>
                <th className="py-3 px-4">หัวข้อตรวจเช็ค (ไทย / อังกฤษ)</th>
                <th className="py-3 px-4">หมวดหมู่</th>
                <th className="py-3 px-4">ใช้ในขั้นตอน</th>
                <th className="py-3 px-4">ตัวเลือกผลตรวจ</th>
                <th className="py-3 px-4 text-center">จำเป็นต้องตรวจ</th>
                <th className="py-3 px-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{item.nameThai}</div>
                    <div className="text-[11px] text-slate-400">{item.nameEng}</div>
                  </td>

                  <td className="py-3 px-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                      {item.category}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        item.phase === "BOTH"
                          ? "bg-blue-50 text-blue-700"
                          : item.phase === "PRE_CHECK"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {item.phase === "BOTH"
                        ? "ก่อนรับ & หลังซ่อม"
                        : item.phase === "PRE_CHECK"
                        ? "ก่อนรับซ่อม"
                        : "หลังซ่อม QC"}
                    </span>
                  </td>

                  <td className="py-3 px-4 max-w-xs">
                    <div className="flex flex-wrap gap-1">
                      {item.options.map((opt, idx) => (
                        <span
                          key={idx}
                          className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded border border-slate-200"
                        >
                          {opt}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleRequired(item.id)}
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full transition-all ${
                        item.isRequired
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {item.isRequired ? "บังคับตรวจ" : "ตัวเลือกเสริม"}
                    </button>
                  </td>

                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Modal */}
      {showAddModal && (
        <Dialog open={showAddModal} onOpenChange={() => setShowAddModal(false)}>
          <DialogContent className="max-w-md p-0">
            <DialogHeader className="p-4 border-b border-slate-100">
              <DialogTitle className="text-base font-bold text-slate-900">
                เพิ่มหัวข้อตรวจสภาพเครื่องใหม่
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleAddItem} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อภาษาไทย *</label>
                <Input
                  required
                  placeholder="เช่น ตรวจสอบความชื้น"
                  value={newNameThai}
                  onChange={(e) => setNewNameThai(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อภาษาอังกฤษ</label>
                <Input
                  placeholder="e.g. Moisture Inspection"
                  value={newNameEng}
                  onChange={(e) => setNewNameEng(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">หมวดหมู่</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                  >
                    <option value="Display">Display</option>
                    <option value="Camera">Camera</option>
                    <option value="Audio">Audio</option>
                    <option value="Power">Power</option>
                    <option value="Sensors">Sensors</option>
                    <option value="Body">Body</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ขั้นตอน</label>
                  <select
                    value={newPhase}
                    onChange={(e) => setNewPhase(e.target.value as any)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                  >
                    <option value="BOTH">ทั้งสองขั้นตอน</option>
                    <option value="PRE_CHECK">ก่อนรับซ่อม (Pre)</option>
                    <option value="POST_CHECK">หลังซ่อม (Post QC)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ตัวเลือกผลตรวจ (คั่นด้วยจุลภาค ,)
                </label>
                <Input
                  value={newOptionsText}
                  onChange={(e) => setNewOptionsText(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="req-chk"
                  checked={newRequired}
                  onChange={(e) => setNewRequired(e.target.checked)}
                  className="rounded text-blue-600 h-4 w-4"
                />
                <label htmlFor="req-chk" className="text-xs text-slate-700">
                  บังคับต้องตรวจก่อนบันทึกงาน
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)} className="text-xs">
                  ยกเลิก
                </Button>
                <Button type="submit" className="text-xs bg-blue-600 text-white">
                  บันทึกหัวข้อ
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
