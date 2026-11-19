"use client";

import React, { useState, useMemo } from "react";
import {
  Database,
  Smartphone,
  HardDrive,
  Palette,
  Wrench,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  Layers,
  Sparkles,
  Tag,
  DollarSign,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { formatTHB } from "@/lib/utils";

// --- Types ---
interface BrandItem {
  id: string;
  name: string;
  country: string;
  deviceCount: number;
  popular: boolean;
}

interface ModelItem {
  id: string;
  brandName: string;
  modelName: string;
  series: string;
  year: number;
  screenSize: string;
}

interface StorageItem {
  id: string;
  capacity: string;
  unit: string;
  description: string;
  isActive: boolean;
}

interface ColorItem {
  id: string;
  nameTh: string;
  nameEn: string;
  hexCode: string;
}

interface RepairCategoryItem {
  id: string;
  categoryName: string;
  description: string;
  standardLaborFee: number;
  estimatedHours: number;
  priority: "HIGH" | "MEDIUM" | "NORMAL";
}

// --- Initial Master Data ---
const INITIAL_BRANDS: BrandItem[] = [
  { id: "b-1", name: "Apple", country: "สหรัฐอเมริกา", deviceCount: 42, popular: true },
  { id: "b-2", name: "Samsung", country: "เกาหลีใต้", deviceCount: 38, popular: true },
  { id: "b-3", name: "Xiaomi", country: "จีน", deviceCount: 26, popular: true },
  { id: "b-4", name: "OPPO", country: "จีน", deviceCount: 20, popular: true },
  { id: "b-5", name: "Vivo", country: "จีน", deviceCount: 18, popular: true },
  { id: "b-6", name: "Realme", country: "จีน", deviceCount: 14, popular: false },
  { id: "b-7", name: "Google Pixel", country: "สหรัฐอเมริกา", deviceCount: 8, popular: false },
  { id: "b-8", name: "Huawei", country: "จีน", deviceCount: 12, popular: false },
  { id: "b-9", name: "OnePlus", country: "จีน", deviceCount: 9, popular: false },
];

const INITIAL_MODELS: ModelItem[] = [
  { id: "m-1", brandName: "Apple", modelName: "iPhone 15 Pro Max", series: "iPhone 15 Series", year: 2023, screenSize: '6.7"' },
  { id: "m-2", brandName: "Apple", modelName: "iPhone 15 Pro", series: "iPhone 15 Series", year: 2023, screenSize: '6.1"' },
  { id: "m-3", brandName: "Apple", modelName: "iPhone 15", series: "iPhone 15 Series", year: 2023, screenSize: '6.1"' },
  { id: "m-4", brandName: "Apple", modelName: "iPhone 14 Pro Max", series: "iPhone 14 Series", year: 2022, screenSize: '6.7"' },
  { id: "m-5", brandName: "Apple", modelName: "iPhone 13", series: "iPhone 13 Series", year: 2021, screenSize: '6.1"' },
  { id: "m-6", brandName: "Samsung", modelName: "Galaxy S24 Ultra", series: "Galaxy S24", year: 2024, screenSize: '6.8"' },
  { id: "m-7", brandName: "Samsung", modelName: "Galaxy S23 Ultra", series: "Galaxy S23", year: 2023, screenSize: '6.8"' },
  { id: "m-8", brandName: "Xiaomi", modelName: "Xiaomi 14 Ultra", series: "Xiaomi 14", year: 2024, screenSize: '6.73"' },
  { id: "m-9", brandName: "OPPO", modelName: "Find X7 Ultra", series: "Find Series", year: 2024, screenSize: '6.82"' },
];

const INITIAL_CAPACITIES: StorageItem[] = [
  { id: "c-1", capacity: "64", unit: "GB", description: "รุ่นเริ่มต้น สำหรับผู้ใช้งานทั่วไป", isActive: true },
  { id: "c-2", capacity: "128", unit: "GB", description: "ความจุมาตรฐาน ยอดนิยมที่สุด", isActive: true },
  { id: "c-3", capacity: "256", unit: "GB", description: "ความจุยอดนิยมสำหรับสายถ่ายภาพ/วิดีโอ", isActive: true },
  { id: "c-4", capacity: "512", unit: "GB", description: "สำหรับโปรและคอนเทนต์ครีเอเตอร์", isActive: true },
  { id: "c-5", capacity: "1", unit: "TB", description: "ความจุสูงสุด ไม่ต้องลบไฟล์", isActive: true },
  { id: "c-6", capacity: "2", unit: "TB", description: "สำหรับรุ่นแฟลกชิป iPad Pro", isActive: false },
];

const INITIAL_COLORS: ColorItem[] = [
  { id: "col-1", nameTh: "ไทเทเนียมธรรมชาติ", nameEn: "Natural Titanium", hexCode: "#8B857E" },
  { id: "col-2", nameTh: "ไทเทเนียมดำ", nameEn: "Black Titanium", hexCode: "#2B2A2C" },
  { id: "col-3", nameTh: "ไทเทเนียมขาว", nameEn: "White Titanium", hexCode: "#EBEBEA" },
  { id: "col-4", nameTh: "ไทเทเนียมน้ำเงิน", nameEn: "Blue Titanium", hexCode: "#2E3642" },
  { id: "col-5", nameTh: "ม่วงเข้ม", nameEn: "Deep Purple", hexCode: "#4B3B4E" },
  { id: "col-6", nameTh: "เขียวอัลไพน์", nameEn: "Alpine Green", hexCode: "#536555" },
  { id: "col-7", nameTh: "ทองหรู", nameEn: "Gold", hexCode: "#F5E4C4" },
  { id: "col-8", nameTh: "เงินแฟนทอม", nameEn: "Phantom Silver", hexCode: "#DCDFE4" },
  { id: "col-9", nameTh: "ครีมมินิมอล", nameEn: "Cream", hexCode: "#FDF8E4" },
];

const INITIAL_REPAIR_CATEGORIES: RepairCategoryItem[] = [
  {
    id: "rep-cat-1",
    categoryName: "หน้าจอแตก / จอดับ / ทัชเพี้ยน",
    description: "เปลี่ยนชุดหน้าจอแท้ / จอเทียบเกรด AAA พร้อมซีลกันน้ำ",
    standardLaborFee: 1200,
    estimatedHours: 1.5,
    priority: "HIGH",
  },
  {
    id: "rep-cat-2",
    categoryName: "แบตเตอรี่เสื่อม / แบตบวม / ชาร์จไม่เข้า",
    description: "เปลี่ยนแบตเตอรี่แท้ มอก. รีเซ็ตสุขภาพแบตเตอรี่ 100%",
    standardLaborFee: 500,
    estimatedHours: 0.8,
    priority: "HIGH",
  },
  {
    id: "rep-cat-3",
    categoryName: "เมนบอร์ดช็อต / เครื่องดับสนิท / ซ่อม IC",
    description: "ยกชิปไอซี เปลี่ยนไอซีชาร์จ U2 ซ่อมชุดเพาเวอร์ภาคจ่ายไฟ",
    standardLaborFee: 2500,
    estimatedHours: 4.0,
    priority: "HIGH",
  },
  {
    id: "rep-cat-4",
    categoryName: "กล้องหน้า / กล้องหลังสั่น / กระจกเลนส์แตก",
    description: "เปลี่ยนแพร์โมดูลกล้อง OIS และเปลี่ยนกระจกครอบเลนส์กล้อง",
    standardLaborFee: 800,
    estimatedHours: 1.2,
    priority: "MEDIUM",
  },
  {
    id: "rep-cat-5",
    categoryName: "พอร์ตชาร์จหลวม / ไมค์สนทนา / ลำโพงล่าง",
    description: "เปลี่ยนชุดแพร์ชาร์จ Type-C / Lightning และทำความสะอาดฟิลเตอร์",
    standardLaborFee: 600,
    estimatedHours: 1.0,
    priority: "NORMAL",
  },
  {
    id: "rep-cat-6",
    categoryName: "ตกน้ำ / มีคราบความชื้นสะสม",
    description: "แกะล้างบอร์ดด้วยเครื่อง Ultrasonic คลีนสนิมและอบแห้ง 100%",
    standardLaborFee: 1500,
    estimatedHours: 3.0,
    priority: "HIGH",
  },
  {
    id: "rep-cat-7",
    categoryName: "ฝาหลังแตก / เปลี่ยนโครงบอดี้ตัวเครื่อง",
    description: "ยิงเลเซอร์ลอกกาวฝาหลัง หรือเปลี่ยนชุดบอดี้ทั้งชิ้น",
    standardLaborFee: 1000,
    estimatedHours: 2.0,
    priority: "NORMAL",
  },
];

export default function MastersPage() {
  const [activeTab, setActiveTab] = useState<"brands" | "models" | "capacities" | "colors" | "repair_categories">("brands");
  const [searchQuery, setSearchQuery] = useState("");

  // States for lists
  const [brands, setBrands] = useState<BrandItem[]>(INITIAL_BRANDS);
  const [models, setModels] = useState<ModelItem[]>(INITIAL_MODELS);
  const [capacities, setCapacities] = useState<StorageItem[]>(INITIAL_CAPACITIES);
  const [colors, setColors] = useState<ColorItem[]>(INITIAL_COLORS);
  const [repairCategories, setRepairCategories] = useState<RepairCategoryItem[]>(INITIAL_REPAIR_CATEGORIES);

  // Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Form states
  const [brandName, setBrandName] = useState("");
  const [brandCountry, setBrandCountry] = useState("จีน");

  const [modelBrand, setModelBrand] = useState("Apple");
  const [modelName, setModelName] = useState("");
  const [modelYear, setModelYear] = useState(2024);
  const [modelScreen, setModelScreen] = useState('6.1"');

  const [capVal, setCapVal] = useState("128");
  const [capUnit, setCapUnit] = useState("GB");
  const [capDesc, setCapDesc] = useState("");

  const [colorTh, setColorTh] = useState("");
  const [colorEn, setColorEn] = useState("");
  const [colorHex, setColorHex] = useState("#000000");

  const [repName, setRepName] = useState("");
  const [repDesc, setRepDesc] = useState("");
  const [repLabor, setRepLabor] = useState(800);
  const [repHours, setRepHours] = useState(1.5);
  const [repPriority, setRepPriority] = useState<"HIGH" | "MEDIUM" | "NORMAL">("HIGH");

  const handleOpenAddModal = () => {
    setBrandName("");
    setModelName("");
    setColorTh("");
    setColorEn("");
    setRepName("");
    setRepDesc("");
    setAddModalOpen(true);
  };

  const handleSaveAdd = () => {
    if (activeTab === "brands") {
      if (!brandName) return alert("กรุณากรอกชื่อแบรนด์");
      setBrands((prev) => [
        ...prev,
        { id: `b-${Date.now()}`, name: brandName, country: brandCountry, deviceCount: 0, popular: false },
      ]);
    } else if (activeTab === "models") {
      if (!modelName) return alert("กรุณากรอกชื่อรุ่น");
      setModels((prev) => [
        ...prev,
        { id: `m-${Date.now()}`, brandName: modelBrand, modelName, series: modelBrand, year: modelYear, screenSize: modelScreen },
      ]);
    } else if (activeTab === "capacities") {
      setCapacities((prev) => [
        ...prev,
        { id: `c-${Date.now()}`, capacity: capVal, unit: capUnit, description: capDesc, isActive: true },
      ]);
    } else if (activeTab === "colors") {
      if (!colorTh || !colorEn) return alert("กรุณากรอกชื่อสี");
      setColors((prev) => [
        ...prev,
        { id: `col-${Date.now()}`, nameTh: colorTh, nameEn: colorEn, hexCode: colorHex },
      ]);
    } else if (activeTab === "repair_categories") {
      if (!repName) return alert("กรุณากรอกชื่อหมวดหมู่อาการเสีย");
      setRepairCategories((prev) => [
        ...prev,
        {
          id: `rep-${Date.now()}`,
          categoryName: repName,
          description: repDesc,
          standardLaborFee: repLabor,
          estimatedHours: repHours,
          priority: repPriority,
        },
      ]);
    }
    setAddModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("ยืนยันการลบรายการนี้?")) {
      if (activeTab === "brands") setBrands((p) => p.filter((x) => x.id !== id));
      if (activeTab === "models") setModels((p) => p.filter((x) => x.id !== id));
      if (activeTab === "capacities") setCapacities((p) => p.filter((x) => x.id !== id));
      if (activeTab === "colors") setColors((p) => p.filter((x) => x.id !== id));
      if (activeTab === "repair_categories") setRepairCategories((p) => p.filter((x) => x.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              ฐานข้อมูลหลัก (Master Data Management)
            </h1>
            <p className="text-xs text-slate-500">
              กำหนดแบรนด์ รุ่นสมาร์ทโฟน ความจุ สี และหมวดหมู่อาการเสียสำหรับอ้างอิงทั้งระบบ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleOpenAddModal}
            className="gap-2 text-xs h-9 bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            เพิ่มข้อมูลในแท็บนี้
          </Button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2">
        {[
          { id: "brands", label: "ยี่ห้อ (Brands)", icon: Smartphone, count: brands.length },
          { id: "models", label: "รุ่นโทรศัพท์ (Models)", icon: Layers, count: models.length },
          { id: "capacities", label: "ความจุ (Capacities)", icon: HardDrive, count: capacities.length },
          { id: "colors", label: "สีตัวเครื่อง (Colors)", icon: Palette, count: colors.length },
          { id: "repair_categories", label: "หมวดหมู่อาการเสีย (Repairs)", icon: Wrench, count: repairCategories.length },
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
              <span
                className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="ค้นหาข้อมูลในตาราง..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-9 bg-slate-50/50"
          />
        </div>
      </div>

      {/* Content depending on Active Tab */}
      <Card className="border-slate-200 shadow-2xs overflow-hidden">
        {activeTab === "brands" && (
          <Table>
            <TableHeader className="bg-slate-50/75 border-b border-slate-200">
              <TableRow>
                <TableHead className="text-xs font-semibold text-slate-600">ยี่ห้อ (Brand)</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">ประเทศผู้ผลิต</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-right">จำนวนรุ่นในระบบ</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">สถานะความนิยม</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brands
                .filter((b) => b.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((b) => (
                  <TableRow key={b.id} className="hover:bg-slate-50/60">
                    <TableCell className="py-3">
                      <div className="font-bold text-xs text-slate-900">{b.name}</div>
                    </TableCell>
                    <TableCell className="py-3 text-xs text-slate-600">{b.country}</TableCell>
                    <TableCell className="py-3 text-right font-mono text-xs text-slate-700">
                      {b.deviceCount} รุ่น
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      {b.popular ? (
                        <Badge variant="success" className="text-[10px]">ยอดนิยม (Top)</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">ทั่วไป</Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      <button
                        onClick={() => handleDelete(b.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        )}

        {activeTab === "models" && (
          <Table>
            <TableHeader className="bg-slate-50/75 border-b border-slate-200">
              <TableRow>
                <TableHead className="text-xs font-semibold text-slate-600">ยี่ห้อ & รุ่น (Brand / Model)</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">ซีรีส์ (Series)</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">ปีที่เปิดตัว</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">ขนาดหน้าจอ</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {models
                .filter(
                  (m) =>
                    m.modelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    m.brandName.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((m) => (
                  <TableRow key={m.id} className="hover:bg-slate-50/60">
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {m.brandName}
                        </span>
                        <span className="font-bold text-xs text-slate-900">{m.modelName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-xs text-slate-600">{m.series}</TableCell>
                    <TableCell className="py-3 text-center font-mono text-xs text-slate-700">{m.year}</TableCell>
                    <TableCell className="py-3 text-center font-mono text-xs text-slate-700">{m.screenSize}</TableCell>
                    <TableCell className="py-3 text-center">
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        )}

        {activeTab === "capacities" && (
          <Table>
            <TableHeader className="bg-slate-50/75 border-b border-slate-200">
              <TableRow>
                <TableHead className="text-xs font-semibold text-slate-600">ความจุ (Capacity)</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">คำอธิบายการใช้งาน</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">สถานะใช้งาน</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {capacities.map((c) => (
                <TableRow key={c.id} className="hover:bg-slate-50/60">
                  <TableCell className="py-3">
                    <span className="font-bold font-mono text-sm text-slate-900 bg-slate-100 px-3 py-1 rounded-md border border-slate-200">
                      {c.capacity} {c.unit}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 text-xs text-slate-600">{c.description}</TableCell>
                  <TableCell className="py-3 text-center">
                    {c.isActive ? (
                      <Badge variant="success" className="text-[10px]">เปิดใช้งาน</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">ปิด</Badge>
                    )}
                  </TableCell>
                  <TableCell className="py-3 text-center">
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {activeTab === "colors" && (
          <Table>
            <TableHeader className="bg-slate-50/75 border-b border-slate-200">
              <TableRow>
                <TableHead className="text-xs font-semibold text-slate-600">ตัวอย่างสี (Swatch)</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">ชื่อภาษาไทย</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">ชื่อภาษาอังกฤษ (Official)</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">รหัสสี Hex</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {colors.map((col) => (
                <TableRow key={col.id} className="hover:bg-slate-50/60">
                  <TableCell className="py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="h-6 w-6 rounded-full border border-slate-300 shadow-2xs"
                        style={{ backgroundColor: col.hexCode }}
                      />
                      <span className="font-mono text-xs text-slate-500">{col.hexCode}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 font-semibold text-xs text-slate-900">{col.nameTh}</TableCell>
                  <TableCell className="py-3 text-xs text-slate-600">{col.nameEn}</TableCell>
                  <TableCell className="py-3 text-center font-mono text-xs text-slate-600">{col.hexCode}</TableCell>
                  <TableCell className="py-3 text-center">
                    <button
                      onClick={() => handleDelete(col.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {activeTab === "repair_categories" && (
          <Table>
            <TableHeader className="bg-slate-50/75 border-b border-slate-200">
              <TableRow>
                <TableHead className="text-xs font-semibold text-slate-600">หมวดหมู่อาการเสีย</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">รายละเอียดขอบเขตงานซ่อม</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-right">ค่าแรงมาตรฐาน</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">เวลาประเมิน</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">ความสำคัญ</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {repairCategories.map((rc) => (
                <TableRow key={rc.id} className="hover:bg-slate-50/60">
                  <TableCell className="py-3">
                    <div className="font-bold text-xs text-slate-900">{rc.categoryName}</div>
                  </TableCell>
                  <TableCell className="py-3 text-xs text-slate-600 max-w-sm">{rc.description}</TableCell>
                  <TableCell className="py-3 text-right font-mono text-xs font-bold text-emerald-700">
                    {formatTHB(rc.standardLaborFee)}
                  </TableCell>
                  <TableCell className="py-3 text-center font-mono text-xs text-slate-700">
                    {rc.estimatedHours} ชม.
                  </TableCell>
                  <TableCell className="py-3 text-center">
                    {rc.priority === "HIGH" && <Badge variant="danger" className="text-[10px]">ด่วน / สูง</Badge>}
                    {rc.priority === "MEDIUM" && <Badge variant="warning" className="text-[10px]">ปานกลาง</Badge>}
                    {rc.priority === "NORMAL" && <Badge variant="default" className="text-[10px]">ทั่วไป</Badge>}
                  </TableCell>
                  <TableCell className="py-3 text-center">
                    <button
                      onClick={() => handleDelete(rc.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Add Master Item Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogHeader>
          <DialogTitle onClose={() => setAddModalOpen(false)}>
            {activeTab === "brands" && "เพิ่มยี่ห้อสมาร์ทโฟนใหม่"}
            {activeTab === "models" && "เพิ่มรุ่นสมาร์ทโฟนใหม่"}
            {activeTab === "capacities" && "เพิ่มขนาดความจุใหม่"}
            {activeTab === "colors" && "เพิ่มสีตัวเครื่องใหม่"}
            {activeTab === "repair_categories" && "เพิ่มหมวดหมู่อาการเสียใหม่"}
          </DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-4">
          {activeTab === "brands" && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">ชื่อยี่ห้อ (Brand Name) *</label>
                <Input
                  placeholder="เช่น Sony, Nothing Phone, Asus ROG..."
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">ประเทศต้นกำเนิด</label>
                <Input
                  placeholder="เช่น ญี่ปุ่น, สหราชอาณาจักร..."
                  value={brandCountry}
                  onChange={(e) => setBrandCountry(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>
          )}

          {activeTab === "models" && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">เลือกยี่ห้อ *</label>
                <select
                  value={modelBrand}
                  onChange={(e) => setModelBrand(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 bg-white"
                >
                  {brands.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">ชื่อรุ่นสมาร์ทโฟน *</label>
                <Input
                  placeholder="เช่น iPhone 16 Pro Max, Galaxy Z Flip 6..."
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">ปีที่เปิดตัว</label>
                  <Input
                    type="number"
                    value={modelYear}
                    onChange={(e) => setModelYear(Number(e.target.value))}
                    className="text-xs h-9 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">ขนาดหน้าจอ</label>
                  <Input
                    placeholder='เช่น 6.7"'
                    value={modelScreen}
                    onChange={(e) => setModelScreen(e.target.value)}
                    className="text-xs h-9 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "capacities" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">ตัวเลขความจุ *</label>
                  <Input
                    placeholder="เช่น 128"
                    value={capVal}
                    onChange={(e) => setCapVal(e.target.value)}
                    className="text-xs h-9 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">หน่วย *</label>
                  <select
                    value={capUnit}
                    onChange={(e) => setCapUnit(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 bg-white"
                  >
                    <option value="GB">GB</option>
                    <option value="TB">TB</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">คำอธิบาย</label>
                <Input
                  placeholder="เช่น ความจุสำหรับเครื่องแฟลกชิป..."
                  value={capDesc}
                  onChange={(e) => setCapDesc(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>
          )}

          {activeTab === "colors" && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">ชื่อสีภาษาไทย *</label>
                <Input
                  placeholder="เช่น เขียวมิดไนท์กรีน"
                  value={colorTh}
                  onChange={(e) => setColorTh(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">ชื่อสีภาษาอังกฤษ *</label>
                <Input
                  placeholder="เช่น Midnight Green"
                  value={colorEn}
                  onChange={(e) => setColorEn(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">รหัสสี Hex (#RRGGBB)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={colorHex}
                    onChange={(e) => setColorHex(e.target.value)}
                    className="h-9 w-12 rounded cursor-pointer border border-slate-300 p-0.5"
                  />
                  <Input
                    value={colorHex}
                    onChange={(e) => setColorHex(e.target.value)}
                    className="text-xs h-9 font-mono uppercase"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "repair_categories" && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">ชื่อหมวดหมู่อาการเสีย *</label>
                <Input
                  placeholder="เช่น แบตเตอรี่เสื่อมสภาพ, หน้าจอลาย..."
                  value={repName}
                  onChange={(e) => setRepName(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">รายละเอียดขอบเขตงานซ่อม</label>
                <textarea
                  rows={2}
                  placeholder="เช่น เปลี่ยนเฉพาะก้อนแบตเตอรี่แท้ พร้อมซีลขอบจอ..."
                  value={repDesc}
                  onChange={(e) => setRepDesc(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">ค่าแรงมาตรฐาน (บาท)</label>
                  <Input
                    type="number"
                    value={repLabor}
                    onChange={(e) => setRepLabor(Number(e.target.value))}
                    className="text-xs h-9 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">เวลาโดยเฉลี่ย (ชม.)</label>
                  <Input
                    type="number"
                    step="0.5"
                    value={repHours}
                    onChange={(e) => setRepHours(Number(e.target.value))}
                    className="text-xs h-9 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">ระดับความสำคัญ</label>
                  <select
                    value={repPriority}
                    onChange={(e) => setRepPriority(e.target.value as any)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 bg-white"
                  >
                    <option value="HIGH">ด่วน / สูง</option>
                    <option value="MEDIUM">ปานกลาง</option>
                    <option value="NORMAL">ปกติ</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAddModalOpen(false)} className="text-xs">
            ยกเลิก
          </Button>
          <Button onClick={handleSaveAdd} className="text-xs bg-blue-600 text-white hover:bg-blue-700">
            บันทึกข้อมูล
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
