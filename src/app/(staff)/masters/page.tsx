"use client";

import React, { useState, useMemo } from "react";
import { DemoBanner } from "@/components/ui/DemoBanner";
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

interface ExpenseCategoryItem {
  id: string;
  code: string;
  name: string;
  description: string;
  budgetLimit: number;
  isActive: boolean;
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

const INITIAL_EXPENSE_CATEGORIES: ExpenseCategoryItem[] = [
  { id: "exp-1", code: "RENT", name: "ค่าเช่าพื้นที่", description: "ค่าเช่าล็อก ค่าเช่าร้านประจำเดือน", budgetLimit: 50000, isActive: true },
  { id: "exp-2", code: "UTILITIES", name: "ค่าน้ำ-ไฟ-เน็ต", description: "บิลค่าน้ำ ค่าไฟฟ้า ค่าอินเทอร์เน็ตความเร็วสูง", budgetLimit: 15000, isActive: true },
  { id: "exp-3", code: "CONSUMABLES", name: "วัสดุสิ้นเปลือง & อะไหล่สิ้นเปลือง", description: "เทปกาว ซีลกันน้ำ กาวติดจอ ฟิล์มเทส", budgetLimit: 10000, isActive: true },
  { id: "exp-4", code: "MARKETING", name: "การตลาด & โฆษณา", description: "ค่าบูสต์โพสต์ Facebook, ป้ายหน้าร้าน, โบรชัวร์", budgetLimit: 20000, isActive: true },
  { id: "exp-5", code: "MAINTENANCE", name: "ซ่อมบำรุงร้าน & เครื่องมือ", description: "เครื่องเชื่อม ลมร้อน หัวแร้ง เครื่องมือช่าง", budgetLimit: 8000, isActive: true },
  { id: "exp-6", code: "WELFARE", name: "สวัสดิการ & อาหารพนักงาน", description: "อาหารว่าง กาแฟ ข้าวกลางวันเลี้ยงทีม", budgetLimit: 5000, isActive: true },
  { id: "exp-7", code: "OTHER", name: "ค่าใช้จ่ายเบ็ดเตล็ด", description: "ค่าธรรมเนียมธนาคาร ค่าใช้จ่ายอื่นๆ", budgetLimit: 5000, isActive: true },
];

export default function MastersPage() {
  const [activeTab, setActiveTab] = useState<"brands" | "models" | "capacities" | "colors" | "repair_categories" | "expense_categories">("brands");
  const [searchQuery, setSearchQuery] = useState("");

  // States for lists
  const [brands, setBrands] = useState<BrandItem[]>(INITIAL_BRANDS);
  const [models, setModels] = useState<ModelItem[]>(INITIAL_MODELS);
  const [capacities, setCapacities] = useState<StorageItem[]>(INITIAL_CAPACITIES);
  const [colors, setColors] = useState<ColorItem[]>(INITIAL_COLORS);
  const [repairCategories, setRepairCategories] = useState<RepairCategoryItem[]>(INITIAL_REPAIR_CATEGORIES);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategoryItem[]>(INITIAL_EXPENSE_CATEGORIES);

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

  const [expCode, setExpCode] = useState("");
  const [expName, setExpName] = useState("");
  const [expDesc, setExpDesc] = useState("");
  const [expBudget, setExpBudget] = useState(10000);

  const handleOpenAddModal = () => {
    setBrandName("");
    setModelName("");
    setColorTh("");
    setColorEn("");
    setRepName("");
    setRepDesc("");
    setExpCode("");
    setExpName("");
    setExpDesc("");
    setExpBudget(10000);
    setAddModalOpen(true);
  };

  const handleSaveAdd = () => {
    // Validate required fields per active tab, and prevent duplicates
    if (activeTab === "brands") {
      if (!brandName.trim()) {
        alert("กรุณากรอกชื่อยี่ห้อ (ห้ามว่าง)");
        return;
      }
      const dup = brands.find((b) => b.name.trim().toLowerCase() === brandName.trim().toLowerCase());
      if (dup) {
        alert(`ยี่ห้อ "${brandName.trim()}" มีอยู่ในระบบแล้ว`);
        return;
      }
      const newBrand: BrandItem = {
        id: `b-${Date.now()}`,
        name: brandName.trim(),
        country: brandCountry.trim() || "ไม่ระบุ",
        deviceCount: 0,
        popular: false,
      };
      setBrands((prev) => [newBrand, ...prev]);
    } else if (activeTab === "models") {
      if (!modelName.trim()) {
        alert("กรุณากรอกชื่อรุ่นสมาร์ทโฟน (ห้ามว่าง)");
        return;
      }
      const dup = models.find(
        (m) =>
          m.brandName === modelBrand &&
          m.modelName.trim().toLowerCase() === modelName.trim().toLowerCase()
      );
      if (dup) {
        alert(`รุ่น "${modelName.trim()}" ของยี่ห้อ ${modelBrand} มีอยู่ในระบบแล้ว`);
        return;
      }
      const newModel: ModelItem = {
        id: `m-${Date.now()}`,
        brandName: modelBrand,
        modelName: modelName.trim(),
        series: `${modelBrand} Series`,
        year: modelYear || new Date().getFullYear(),
        screenSize: modelScreen.trim() || '6.1"',
      };
      setModels((prev) => [newModel, ...prev]);
    } else if (activeTab === "capacities") {
      if (!capVal.trim()) {
        alert("กรุณากรอกตัวเลขความจุ (ห้ามว่าง)");
        return;
      }
      const dup = capacities.find(
        (c) => c.capacity === capVal.trim() && c.unit === capUnit
      );
      if (dup) {
        alert(`ความจุ ${capVal.trim()} ${capUnit} มีอยู่ในระบบแล้ว`);
        return;
      }
      const newCap: StorageItem = {
        id: `c-${Date.now()}`,
        capacity: capVal.trim(),
        unit: capUnit,
        description: capDesc.trim() || "ความจุมาตรฐาน",
        isActive: true,
      };
      setCapacities((prev) => [...prev, newCap]);
    } else if (activeTab === "colors") {
      if (!colorTh.trim() || !colorEn.trim()) {
        alert("กรุณากรอกชื่อสีทั้งภาษาไทยและภาษาอังกฤษ (ห้ามว่าง)");
        return;
      }
      const dup = colors.find(
        (c) => c.nameTh.trim().toLowerCase() === colorTh.trim().toLowerCase() ||
               c.nameEn.trim().toLowerCase() === colorEn.trim().toLowerCase()
      );
      if (dup) {
        alert(`ชื่อสีนี้มีอยู่ในระบบแล้ว`);
        return;
      }
      const newCol: ColorItem = {
        id: `col-${Date.now()}`,
        nameTh: colorTh.trim(),
        nameEn: colorEn.trim(),
        hexCode: colorHex,
      };
      setColors((prev) => [...prev, newCol]);
    } else if (activeTab === "repair_categories") {
      if (!repName.trim()) {
        alert("กรุณากรอกชื่อหมวดหมู่อาการเสีย (ห้ามว่าง)");
        return;
      }
      if (repLabor <= 0) {
        alert("ค่าแรงมาตรฐานต้องมากกว่า 0");
        return;
      }
      const dup = repairCategories.find(
        (rc) => rc.categoryName.trim().toLowerCase() === repName.trim().toLowerCase()
      );
      if (dup) {
        alert(`หมวดหมู่ "${repName.trim()}" มีอยู่ในระบบแล้ว`);
        return;
      }
      const newRep: RepairCategoryItem = {
        id: `rep-cat-${Date.now()}`,
        categoryName: repName.trim(),
        description: repDesc.trim() || "งานซ่อมทั่วไป",
        standardLaborFee: repLabor,
        estimatedHours: repHours,
        priority: repPriority,
      };
      setRepairCategories((prev) => [...prev, newRep]);
    } else if (activeTab === "expense_categories") {
      if (!expCode.trim()) {
        alert("กรุณากรอกรหัสหมวดหมู่ค่าใช้จ่าย (ห้ามว่าง)");
        return;
      }
      if (!expName.trim()) {
        alert("กรุณากรอกชื่อหมวดหมู่ค่าใช้จ่าย (ห้ามว่าง)");
        return;
      }
      const dup = expenseCategories.find(
        (ec) =>
          ec.code.trim().toUpperCase() === expCode.trim().toUpperCase() ||
          ec.name.trim().toLowerCase() === expName.trim().toLowerCase()
      );
      if (dup) {
        alert(`รหัสหรือชื่อหมวดหมู่ค่าใช้จ่าย "${expCode.trim()}" มีอยู่ในระบบแล้ว`);
        return;
      }
      const newExp: ExpenseCategoryItem = {
        id: `exp-${Date.now()}`,
        code: expCode.trim().toUpperCase(),
        name: expName.trim(),
        description: expDesc.trim() || "-",
        budgetLimit: expBudget > 0 ? expBudget : 0,
        isActive: true,
      };
      setExpenseCategories((prev) => [...prev, newExp]);
    }

    setAddModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (activeTab === "brands") setBrands((prev) => prev.filter((b) => b.id !== id));
    else if (activeTab === "models") setModels((prev) => prev.filter((m) => m.id !== id));
    else if (activeTab === "capacities") setCapacities((prev) => prev.filter((c) => c.id !== id));
    else if (activeTab === "colors") setColors((prev) => prev.filter((c) => c.id !== id));
    else if (activeTab === "repair_categories") setRepairCategories((prev) => prev.filter((rc) => rc.id !== id));
    else if (activeTab === "expense_categories") setExpenseCategories((prev) => prev.filter((ec) => ec.id !== id));
  };

  return (
    <div className="space-y-6">
      <DemoBanner message="ข้อมูลหลัก (แบรนด์ รุ่น ความจุ สี หมวดหมู่อาการ หมวดหมู่ค่าใช้จ่าย) รองรับการจัดการข้อมูล ทดสอบเพิ่มและลบรายการได้ทันที" />
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
          { id: "expense_categories", label: "หมวดหมู่ค่าใช้จ่าย (Expenses)", icon: DollarSign, count: expenseCategories.length },
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

        {activeTab === "expense_categories" && (
          <Table>
            <TableHeader className="bg-slate-50/75 border-b border-slate-200">
              <TableRow>
                <TableHead className="text-xs font-semibold text-slate-600">รหัสหมวดหมู่ (Code)</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">ชื่อหมวดหมู่ค่าใช้จ่าย</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">รายละเอียดคำอธิบาย</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-right">วงเงินงบประมาณ</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">สถานะใช้งาน</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenseCategories
                .filter(
                  (ec) =>
                    ec.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    ec.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    ec.description.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((ec) => (
                  <TableRow key={ec.id} className="hover:bg-slate-50/60">
                    <TableCell className="py-3">
                      <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {ec.code}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 font-bold text-xs text-slate-900">
                      {ec.name}
                    </TableCell>
                    <TableCell className="py-3 text-xs text-slate-600 max-w-sm">
                      {ec.description}
                    </TableCell>
                    <TableCell className="py-3 text-right font-mono text-xs font-bold text-slate-700">
                      {formatTHB(ec.budgetLimit)}
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      {ec.isActive ? (
                        <Badge variant="success" className="text-[10px]">เปิดใช้งาน</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">ปิด</Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      <button
                        onClick={() => handleDelete(ec.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                        title="ลบหมวดหมู่"
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
            {activeTab === "expense_categories" && "เพิ่มหมวดหมู่ค่าใช้จ่ายใหม่"}
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

          {activeTab === "expense_categories" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">รหัสหมวดหมู่ (Code) *</label>
                  <Input
                    placeholder="เช่น RENT, UTILITIES, MARKETING..."
                    value={expCode}
                    onChange={(e) => setExpCode(e.target.value)}
                    className="text-xs h-9 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">ชื่อหมวดหมู่ค่าใช้จ่าย *</label>
                  <Input
                    placeholder="เช่น ค่าเช่าพื้นที่, ค่าไฟฟ้า..."
                    value={expName}
                    onChange={(e) => setExpName(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">รายละเอียดคำอธิบาย</label>
                <textarea
                  rows={2}
                  placeholder="เช่น ค่าเช่ารายเดือน ค่าส่วนกลางอาคารพาณิชย์..."
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">วงเงินงบประมาณต่อเดือน (บาท)</label>
                <Input
                  type="number"
                  value={expBudget}
                  onChange={(e) => setExpBudget(Number(e.target.value))}
                  className="text-xs h-9 font-mono"
                />
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
