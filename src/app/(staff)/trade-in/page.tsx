"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  HandCoins,
  ShieldAlert,
  ShieldCheck,
  Camera,
  UserCheck,
  FileText,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  X,
  Search,
  Plus,
  ArrowRight,
  Smartphone,
  RefreshCw,
  Printer,
  Sliders,
  DollarSign,
  Tag,
  Building2,
  Info,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { formatTHB, formatDateThai } from "@/lib/utils";

interface TradeInContractItem {
  id: string;
  contractNo: string;
  type: "BUYBACK" | "PAWN";
  branchId: string;
  customerId: string;
  nationalId: string;
  deviceBrand: string;
  deviceModel: string;
  imei: string;
  conditionGrade: "A" | "B" | "C";
  inspectionData: any;
  declarationAgreed: boolean;
  customerPhoto?: string | null;
  agreedPrice: number;
  interestRateMonthly: number;
  durationMonths: number;
  startDate: string;
  dueDate?: string | null;
  status: "ACTIVE" | "REDEEMED" | "FORFEITED" | "COMPLETED";
  monthlyInterestAmount?: number;
  isOverdue?: boolean;
  daysOverdue?: number;
  customer?: {
    name: string;
    phone: string;
    nationalId?: string;
    address?: string;
  };
  branch?: {
    name: string;
    code: string;
  };
  createdAt: string;
}

export default function TradeInPage() {
  const { currentBranch, currentUser } = useApp();
  const [contracts, setContracts] = useState<TradeInContractItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"PAWN" | "BUYBACK" | "NEW">("PAWN");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // New Contract Form State
  const [contractType, setContractType] = useState<"BUYBACK" | "PAWN">("BUYBACK");
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custNationalId, setCustNationalId] = useState("");
  const [custAddress, setCustAddress] = useState("");
  const [customerPhotoUrl, setCustomerPhotoUrl] = useState(
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300"
  );

  // Device & Inspection State
  const [deviceBrand, setDeviceBrand] = useState("Apple");
  const [deviceModel, setDeviceModel] = useState("iPhone 14 Pro 128GB");
  const [imei, setImei] = useState("");
  const [conditionGrade, setConditionGrade] = useState<"A" | "B" | "C">("A");
  const [batteryHealth, setBatteryHealth] = useState("92");

  // 10-Point QC Matrix
  const [qcChecks, setQcChecks] = useState<Record<string, boolean>>({
    screen: true,
    touch: true,
    battery: true,
    camera: true,
    faceId: true,
    body: true,
    speakers: true,
    charging: true,
    network: true,
    noCloudLock: true,
  });

  // Financial details
  const [agreedPrice, setAgreedPrice] = useState("14000");
  const [interestRate, setInterestRate] = useState("2.5");
  const [durationMonths, setDurationMonths] = useState("1");
  const [declarationAgreed, setDeclarationAgreed] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // Id of the contract whose lifecycle action is in flight (disables all action buttons).
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  // Contract Details / Print Modal
  const [selectedContract, setSelectedContract] = useState<TradeInContractItem | null>(null);
  const [contractModalOpen, setContractModalOpen] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/trade-in?branch=${currentBranch.code}`);
      const data = await res.json();
      if (data.success) {
        setContracts(data.contracts);
      }
    } catch (err) {
      console.error("Failed to load trade-in contracts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, [currentBranch.code]);

  // Filtered List
  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      if (activeTab === "PAWN" && c.type !== "PAWN") return false;
      if (activeTab === "BUYBACK" && c.type !== "BUYBACK") return false;
      if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNo = c.contractNo.toLowerCase().includes(q);
        const matchesImei = c.imei.toLowerCase().includes(q);
        const matchesModel = c.deviceModel.toLowerCase().includes(q);
        const matchesCust = c.customer?.name.toLowerCase().includes(q);
        const matchesId = c.nationalId.toLowerCase().includes(q);
        return matchesNo || matchesImei || matchesModel || matchesCust || matchesId;
      }
      return true;
    });
  }, [contracts, activeTab, statusFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const activePawns = contracts.filter((c) => c.type === "PAWN" && c.status === "ACTIVE");
    const totalPawnCapital = activePawns.reduce((sum, c) => sum + c.agreedPrice, 0);
    const overdueCount = activePawns.filter((c) => c.isOverdue).length;
    const buybacksCount = contracts.filter((c) => c.type === "BUYBACK").length;
    const totalBuybackAmount = contracts
      .filter((c) => c.type === "BUYBACK")
      .reduce((sum, c) => sum + c.agreedPrice, 0);

    return { activePawnsCount: activePawns.length, totalPawnCapital, overdueCount, buybacksCount, totalBuybackAmount };
  }, [contracts]);

  // Toggle single QC check
  const toggleQc = (key: string) => {
    setQcChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Submit New Contract
  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName || !custPhone || !custNationalId) {
      alert("กรุณากรอกข้อมูลลูกค้าและเลขบัตรประชาชน 13 หลัก");
      return;
    }
    if (!imei || imei.length < 10) {
      alert("กรุณากรอกหมายเลข IMEI ให้ถูกต้อง");
      return;
    }
    if (!declarationAgreed) {
      alert("ลูกค้าต้องยอมรับหนังสือยืนยันกรรมสิทธิ์ทางกฎหมาย");
      return;
    }
    if (!/^\d{13}$/.test(custNationalId.replace(/[\s-]/g, ""))) {
      alert("กรุณากรอกเลขบัตรประชาชน 13 หลักให้ถูกต้อง");
      return;
    }
    // Validate numbers instead of silently falling back to defaults.
    const battery = Number(batteryHealth);
    if (batteryHealth.trim() === "" || !Number.isInteger(battery) || battery < 0 || battery > 100) {
      alert("กรุณากรอกสุขภาพแบตเตอรี่เป็นตัวเลข 0-100");
      return;
    }
    const price = Number(agreedPrice);
    if (agreedPrice.trim() === "" || !Number.isFinite(price) || price <= 0) {
      alert("กรุณากรอกราคาที่ตกลงให้ถูกต้อง (มากกว่า 0)");
      return;
    }
    const rate = Number(interestRate);
    const months = Number(durationMonths);
    if (contractType === "PAWN") {
      if (interestRate.trim() === "" || !Number.isFinite(rate) || rate < 0 || rate > 5) {
        alert("กรุณากรอกอัตราดอกเบี้ย 0-5% ต่อเดือน");
        return;
      }
      if (durationMonths.trim() === "" || !Number.isInteger(months) || months < 1 || months > 12) {
        alert("กรุณากรอกระยะเวลาสัญญา 1-12 เดือน");
        return;
      }
    }
    if (submitting) return;

    try {
      setSubmitting(true);
      const inspectionData = {
        batteryHealth: battery,
        qcChecks,
        conditionGrade,
      };

      const res = await fetch("/api/trade-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: contractType,
          branchCode: currentBranch.code,
          customerName: custName,
          customerPhone: custPhone,
          nationalId: custNationalId,
          customerAddress: custAddress,
          deviceBrand,
          deviceModel,
          imei,
          conditionGrade,
          inspectionData,
          declarationAgreed,
          customerPhoto: customerPhotoUrl,
          agreedPrice: price,
          ...(contractType === "PAWN" ? { interestRateMonthly: rate, durationMonths: months } : {}),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        showToast(data.message);
        // Reset form
        setCustName("");
        setCustPhone("");
        setCustNationalId("");
        setCustAddress("");
        setImei("");
        fetchContracts();
        setActiveTab(contractType === "PAWN" ? "PAWN" : "BUYBACK");
      } else {
        alert(data.error || "เกิดข้อผิดพลาดในการบันทึกสัญญา");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Contract Lifecycle Action (Redeem / Forfeit / Extend)
  const handleContractAction = async (id: string, action: "REDEEM" | "FORFEIT" | "EXTEND") => {
    const confirmMsg =
      action === "REDEEM"
        ? "ยืนยันการไถ่ถอนเครื่อง? (ลูกค้าชำระเงินต้นและดอกเบี้ยครบถ้วน)"
        : action === "FORFEIT"
        ? "ยืนยันการยึดเครื่องหลุดจำนำเข้าสต็อกร้าน? (สถานะ IMEI จะกลายเป็น พร้อมขาย)"
        : "ยืนยันต่อสัญญาจำนำเพิ่ม 1 เดือน? (ลูกค้าชำระดอกเบี้ยประจำเดือนแล้ว)";

    if (actionBusyId) return;
    if (!confirm(confirmMsg)) return;

    setActionBusyId(id);
    try {
      const res = await fetch(`/api/trade-in/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, months: 1 }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        showToast(data.message);
        fetchContracts();
        if (selectedContract && selectedContract.id === id) {
          setSelectedContract({ ...selectedContract, ...data.contract });
        }
      } else {
        alert(data.error || "ไม่สามารถดำเนินการได้");
        fetchContracts();
      }
    } catch (err: any) {
      alert("เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ: " + err.message);
    } finally {
      setActionBusyId(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-2xl animate-fade-in border border-slate-700">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              รับซื้อเครื่องมือสอง & ฝากจำนำ (Trade-in & Pawn)
            </h1>
            <Badge variant="outline" className="border-purple-300 bg-purple-50/50 text-purple-700 font-medium">
              <Building2 className="mr-1 h-3 w-3 inline" />
              {currentBranch.name}
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            ระบบสัญญาซื้อเข้ามือถือมือสอง ตรวจเช็คสภาพ 10 จุด บันทึกบัตรประชาชน ยินยอมไม่ขโมย และสัญญาจำนำ/ขายฝากพร้อมแจ้งเตือนเกินกำหนด
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setContractType("PAWN");
              setActiveTab("NEW");
            }}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>เปิดสัญญาจำนำใหม่</span>
          </Button>

          <Button
            onClick={() => {
              setContractType("BUYBACK");
              setActiveTab("NEW");
            }}
            size="sm"
            variant="outline"
            className="gap-1.5 border-slate-300 text-slate-700"
          >
            <HandCoins className="h-4 w-4 text-emerald-600" />
            <span>รับซื้อเครื่องมือสอง</span>
          </Button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">สัญญาจำนำที่กำลังฝากอยู่</span>
              <HandCoins className="h-4 w-4 text-purple-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {stats.activePawnsCount} <span className="text-sm font-normal text-slate-500">สัญญา</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              วงเงินปล่อยกู้รวม {formatTHB(stats.totalPawnCapital)}
            </div>
          </CardContent>
        </Card>

        {/* Overdue Alarms Card */}
        <Card
          className={`transition-all ${
            stats.overdueCount > 0 ? "border-rose-300 bg-rose-50/40" : "hover:shadow-md"
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-700 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                เตือนสัญญาเกินกำหนด (Overdue)
              </span>
              {stats.overdueCount > 0 && (
                <Badge variant="danger" className="text-[10px]">
                  พร้อมยึดหลุดจำนำ
                </Badge>
              )}
            </div>
            <div className="mt-2 text-2xl font-bold text-rose-700">
              {stats.overdueCount} <span className="text-sm font-normal text-slate-500">สัญญา</span>
            </div>
            <div className="mt-1 text-[11px] text-rose-600">
              เลยกำหนดไถ่ถอน / ขาดส่งดอกเบี้ย
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">ซื้อเข้ามือสองสะสม</span>
              <Smartphone className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {stats.buybacksCount} <span className="text-sm font-normal text-slate-500">เครื่อง</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              ยอดรับซื้อรวม {formatTHB(stats.totalBuybackAmount)}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">มาตรฐานความปลอดภัย</span>
              <ShieldCheck className="h-4 w-4 text-blue-600" />
            </div>
            <div className="mt-2 text-base font-bold text-blue-700">
              บันทึกบัตร ปชช. 100%
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              ป้องกันการรับซื้อของโจรตามกฎหมาย
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab("PAWN")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "PAWN"
              ? "border-purple-600 text-purple-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <HandCoins className="h-4 w-4" />
          <span>สัญญาขายฝาก / จำนำ ({contracts.filter((c) => c.type === "PAWN").length})</span>
          {stats.overdueCount > 0 && (
            <span className="rounded-full bg-rose-500 text-white text-[10px] px-1.5 py-0.2">
              {stats.overdueCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("BUYBACK")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "BUYBACK"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Smartphone className="h-4 w-4" />
          <span>สัญญาซื้อเข้ามือสอง ({contracts.filter((c) => c.type === "BUYBACK").length})</span>
        </button>

        <button
          onClick={() => setActiveTab("NEW")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "NEW"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Plus className="h-4 w-4" />
          <span>เปิดสัญญาใหม่</span>
        </button>
      </div>

      {/* ================= VIEW 1 & 2: LIST TABLES (PAWN & BUYBACK) ================= */}
      {activeTab !== "NEW" && (
        <Card>
          <div className="border-b border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาเลขที่สัญญา, IMEI, ลูกค้า, บัตร ปชช..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/70 py-1.5 pl-9 pr-3 text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {activeTab === "PAWN" && (
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700"
                >
                  <option value="ALL">ทุกสถานะสัญญา</option>
                  <option value="ACTIVE">ยังฝากอยู่ (Active)</option>
                  <option value="REDEEMED">ไถ่ถอนแล้ว (Redeemed)</option>
                  <option value="FORFEITED">หลุดจำนำแล้ว (Forfeited)</option>
                </select>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchContracts}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>รีเฟรชข้อมูล</span>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-32">เลขที่สัญญา</TableHead>
                  <TableHead>ข้อมูลลูกค้า & บัตร ปชช.</TableHead>
                  <TableHead>โทรศัพท์ & IMEI</TableHead>
                  <TableHead className="text-center w-24">สภาพ</TableHead>
                  <TableHead className="text-right w-28">
                    {activeTab === "PAWN" ? "ยอดวงเงินจำนำ" : "ราคาตกลงซื้อเข้า"}
                  </TableHead>
                  {activeTab === "PAWN" && (
                    <>
                      <TableHead className="text-right w-24">ด/บ ต่อเดือน</TableHead>
                      <TableHead className="text-center w-32">วันครบกำหนด</TableHead>
                    </>
                  )}
                  <TableHead className="text-center w-28">สถานะ</TableHead>
                  <TableHead className="text-right w-36">การจัดการ</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center text-slate-400">
                      กำลังโหลดข้อมูลสัญญา...
                    </TableCell>
                  </TableRow>
                ) : filteredContracts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center text-slate-400">
                      ไม่พบสัญญาที่ค้นหา
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredContracts.map((c) => (
                    <TableRow key={c.id} className="hover:bg-slate-50/70">
                      <TableCell className="font-mono text-xs font-bold text-slate-800">
                        {c.contractNo}
                        <div className="text-[10px] text-slate-400 font-normal">
                          {formatDateThai(c.createdAt)}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="font-semibold text-slate-900 text-xs">
                          {c.customer?.name}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500">
                          บัตร: {c.nationalId}
                        </div>
                        <div className="text-[10px] text-slate-400">โทร: {c.customer?.phone}</div>
                      </TableCell>

                      <TableCell>
                        <div className="font-semibold text-xs text-slate-900">
                          {c.deviceBrand} {c.deviceModel}
                        </div>
                        <div className="font-mono text-[11px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded inline-block mt-0.5">
                          IMEI: {c.imei}
                        </div>
                      </TableCell>

                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-xs font-bold">
                          เกรด {c.conditionGrade}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right font-mono font-bold text-slate-900 text-xs">
                        {formatTHB(c.agreedPrice)}
                      </TableCell>

                      {activeTab === "PAWN" && (
                        <>
                          <TableCell className="text-right font-mono text-xs text-purple-700">
                            {formatTHB(c.monthlyInterestAmount || 0)}
                            <div className="text-[10px] text-slate-400">({c.interestRateMonthly}%)</div>
                          </TableCell>

                          <TableCell className="text-center">
                            <div className="text-xs font-mono">
                              {c.dueDate ? new Date(c.dueDate).toLocaleDateString("th-TH") : "-"}
                            </div>
                            {c.isOverdue && (
                              <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 inline-block mt-0.5">
                                เกิน {c.daysOverdue} วัน
                              </span>
                            )}
                          </TableCell>
                        </>
                      )}

                      <TableCell className="text-center">
                        {c.status === "ACTIVE" ? (
                          c.isOverdue ? (
                            <Badge variant="danger" className="text-[10px]">
                              เกินกำหนด (Overdue)
                            </Badge>
                          ) : (
                            <Badge variant="warning" className="text-[10px]">
                              กำลังฝากจำนำ
                            </Badge>
                          )
                        ) : c.status === "REDEEMED" ? (
                          <Badge variant="success" className="text-[10px]">
                            ไถ่ถอนแล้ว
                          </Badge>
                        ) : c.status === "FORFEITED" ? (
                          <Badge variant="danger" className="text-[10px]">
                            หลุดจำนำ (ยึดแล้ว)
                          </Badge>
                        ) : (
                          <Badge variant="success" className="text-[10px]">
                            ซื้อเข้าเสร็จสิ้น
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setSelectedContract(c);
                              setContractModalOpen(true);
                            }}
                            className="text-xs h-7 px-2"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </Button>

                          {c.type === "PAWN" && c.status === "ACTIVE" && (
                            <>
                              <Button
                                size="sm"
                                disabled={actionBusyId !== null}
                                onClick={() => handleContractAction(c.id, "REDEEM")}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-2"
                                title="ไถ่ถอนเครื่อง"
                              >
                                ไถ่ถอน
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                disabled={actionBusyId !== null}
                                onClick={() => handleContractAction(c.id, "EXTEND")}
                                className="text-xs h-7 px-2"
                                title="ต่อดอกเบี้ย 1 เดือน"
                              >
                                ต่อดอก
                              </Button>

                              {c.isOverdue && (
                                <Button
                                  size="sm"
                                  disabled={actionBusyId !== null}
                                onClick={() => handleContractAction(c.id, "FORFEIT")}
                                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-7 px-2"
                                  title="ยึดเครื่องเข้าสต็อกร้าน"
                                >
                                  ยึด
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* ================= VIEW 3: NEW CONTRACT FORM ================= */}
      {activeTab === "NEW" && (
        <form onSubmit={handleCreateContract} className="space-y-6">
          <Card>
            <CardHeader className="border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>เปิดสัญญาใหม่ (New Trade-in / Pawn Agreement)</CardTitle>
                  <CardDescription>
                    กรอกข้อมูลลูกค้า ตรวจเช็คสภาพเครื่อง 10 จุด และยืนยันความถูกต้องตามกฎหมาย
                  </CardDescription>
                </div>
                {/* Contract Type Radio */}
                <div className="flex rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setContractType("BUYBACK")}
                    className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                      contractType === "BUYBACK"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    รับซื้อเครื่องมือสอง (Buyback)
                  </button>
                  <button
                    type="button"
                    onClick={() => setContractType("PAWN")}
                    className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                      contractType === "PAWN"
                        ? "bg-purple-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    รับจำนำ / ขายฝาก (Pawn Loan)
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* SECTION 1: CUSTOMER INFO & THAI NATIONAL ID */}
              <div>
                <h4 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-blue-600" />
                  <span>1. ข้อมูลลูกค้า & ตรวจสอบบัตรประจำตัวประชาชน</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">
                      เลขประจำตัวประชาชน (13 หลัก) *
                    </label>
                    <Input
                      placeholder="เช่น 1100400123451"
                      maxLength={13}
                      value={custNationalId}
                      onChange={(e) => setCustNationalId(e.target.value)}
                      className="font-mono text-sm font-bold"
                      required
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      ระบบบันทึกเพื่อตรวจสอบกับกรมการปกครอง
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">
                      ชื่อ - นามสกุล ลูกค้า *
                    </label>
                    <Input
                      placeholder="เช่น นายธนากร รัตนสิทธิ"
                      value={custName}
                      onChange={(e) => setCustName(e.target.value)}
                      required
                      className="text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">
                      เบอร์โทรศัพท์ติดต่อ *
                    </label>
                    <Input
                      placeholder="เช่น 081-234-5678"
                      value={custPhone}
                      onChange={(e) => setCustPhone(e.target.value)}
                      required
                      className="text-xs"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">
                      ที่อยู่ตามทะเบียนบ้าน / บัตรประชาชน
                    </label>
                    <Input
                      placeholder="เลขที่ หมู่ ซอย ถนน ตำบล อำเภอ จังหวัด"
                      value={custAddress}
                      onChange={(e) => setCustAddress(e.target.value)}
                      className="text-xs"
                    />
                  </div>

                  {/* ID / Photo Upload Mock */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">
                      ภาพถ่ายบัตรประชาชน / ใบหน้าลูกค้า
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg border border-slate-300 overflow-hidden bg-slate-100 shrink-0">
                        <img
                          src={customerPhotoUrl}
                          alt="Customer ID"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCustomerPhotoUrl(
                            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300"
                          )
                        }
                        className="text-xs gap-1.5"
                      >
                        <Camera className="h-3.5 w-3.5" />
                        <span>จำลองถ่ายภาพบัตร</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: DEVICE SPEC & 10-POINT INSPECTION */}
              <div className="pt-4 border-t border-slate-200">
                <h4 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-purple-600" />
                  <span>2. ข้อมูลอุปกรณ์ & รายการตรวจเช็คสภาพ 10 จุด (10-Point QC Matrix)</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">
                      ยี่ห้อ (Brand)
                    </label>
                    <Input
                      value={deviceBrand}
                      onChange={(e) => setDeviceBrand(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">
                      รุ่น & ความจุ (Model) *
                    </label>
                    <Input
                      value={deviceModel}
                      onChange={(e) => setDeviceModel(e.target.value)}
                      className="text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">
                      หมายเลข IMEI (15 หลัก) *
                    </label>
                    <Input
                      placeholder="เช่น 358765098123456"
                      value={imei}
                      onChange={(e) => setImei(e.target.value)}
                      className="font-mono text-xs font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">
                      เกรดสภาพเครื่อง
                    </label>
                    <select
                      value={conditionGrade}
                      onChange={(e) => setConditionGrade(e.target.value as any)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800"
                    >
                      <option value="A">Grade A (นางฟ้า 95%+)</option>
                      <option value="B">Grade B (สภาพสวย 85-94%)</option>
                      <option value="C">Grade C (มีรอย/ใช้งาน &lt;85%)</option>
                    </select>
                  </div>
                </div>

                {/* 10-Point QC Matrix Grid */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-xs text-slate-800">
                      ผลการตรวจเช็คฟังก์ชันตัวเครื่อง 10 รายการ:
                    </span>
                    <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                      ✓ ผ่านการตรวจสอบ IMEI ไม่ติด Blacklist
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                    {[
                      { id: "screen", label: "หน้าจอแท้/ไม่ด่าง" },
                      { id: "touch", label: "ระบบสัมผัสลื่นไหล" },
                      { id: "battery", label: `แบตเตอรี่ ${batteryHealth}%` },
                      { id: "camera", label: "กล้องหน้า & หลัง" },
                      { id: "faceId", label: "สแกน FaceID / นิ้ว" },
                      { id: "body", label: "บอดี้ไม่คดงอ" },
                      { id: "speakers", label: "ลำโพง & ไมโครโฟน" },
                      { id: "charging", label: "พอร์ตชาร์จไฟเข้า" },
                      { id: "network", label: "WiFi & ซิมการ์ด" },
                      { id: "noCloudLock", label: "ปลด iCloud/Knox" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleQc(item.id)}
                        className={`flex items-center gap-2 rounded-lg border p-2 text-left font-medium transition-all ${
                          qcChecks[item.id]
                            ? "border-emerald-500 bg-white text-emerald-800 shadow-2xs"
                            : "border-slate-200 bg-slate-100 text-slate-400 line-through"
                        }`}
                      >
                        <span
                          className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold ${
                            qcChecks[item.id] ? "bg-emerald-600 text-white" : "bg-slate-300 text-slate-600"
                          }`}
                        >
                          {qcChecks[item.id] ? "✓" : "✗"}
                        </span>
                        <span className="truncate">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* SECTION 3: FINANCIAL TERMS & LEGAL DECLARATION */}
              <div className="pt-4 border-t border-slate-200">
                <h4 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  <span>3. เงื่อนไขทางการเงิน & หนังสือสัญญาตามกฎหมาย</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1 block">
                      {contractType === "BUYBACK" ? "ราคาตกลงซื้อเข้า (บาท) *" : "วงเงินยอดจำนำ (บาท) *"}
                    </label>
                    <Input
                      type="number"
                      value={agreedPrice}
                      onChange={(e) => setAgreedPrice(e.target.value)}
                      className="font-mono text-base font-bold text-slate-900"
                      required
                    />
                  </div>

                  {contractType === "PAWN" && (
                    <>
                      <div>
                        <label className="text-xs font-semibold text-slate-700 mb-1 block">
                          อัตราดอกเบี้ยต่อเดือน (%)
                        </label>
                        <Input
                          type="number"
                          step="0.1"
                          value={interestRate}
                          onChange={(e) => setInterestRate(e.target.value)}
                          className="font-mono text-xs font-bold"
                        />
                        <span className="text-[10px] text-slate-400">
                          ตาม พ.ร.บ. โรงรับจำนำ (2.5% ={" "}
                          {formatTHB(((parseFloat(agreedPrice) || 0) * (parseFloat(interestRate) || 0)) / 100)}
                          /เดือน)
                        </span>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-700 mb-1 block">
                          ระยะเวลาสัญญา (เดือน)
                        </label>
                        <select
                          value={durationMonths}
                          onChange={(e) => setDurationMonths(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold"
                        >
                          <option value="1">1 เดือน</option>
                          <option value="2">2 เดือน</option>
                          <option value="3">3 เดือน</option>
                          <option value="6">6 เดือน</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>

                {/* Legal Anti-theft Declaration Card */}
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-slate-700 leading-relaxed">
                      <strong className="text-amber-900">
                        หนังสือยืนยันกรรมสิทธิ์และปฏิญญาป้องกันทรัพย์สินสูญหาย:
                      </strong>
                      <p className="mt-1">
                        ข้าพเจ้าผู้เป็นเจ้าของเครื่อง ขอยืนยันว่าอุปกรณ์และหมายเลขเครื่อง IMEI ดังกล่าวข้างต้น
                        เป็นกรรมสิทธิ์อันชอบธรรมของข้าพเจ้าโดยถูกต้อง มิได้รับมาจากการลักทรัพย์ วิ่งราว ชิงทรัพย์
                        หรือการกระทำผิดกฎหมายใดๆ ทั้งสิ้น หากตรวจพบในภายหลังว่าเครื่องมีที่มามิชอบ
                        ข้าพเจ้ายินยอมรับผิดชอบชดใช้ค่าเสียหายและถูกดำเนินคดีตามกฎหมายอย่างถึงที่สุด
                      </p>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 pt-2 border-t border-amber-200/60 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={declarationAgreed}
                      onChange={(e) => setDeclarationAgreed(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-bold text-slate-900">
                      ลูกค้ารับทราบ ยืนยันความถูกต้อง และลงลายมือชื่อในสัญญา
                    </span>
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab(contractType === "PAWN" ? "PAWN" : "BUYBACK")}
                >
                  ยกเลิก
                </Button>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 px-6"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    {submitting
                      ? "กำลังบันทึก..."
                      : contractType === "BUYBACK"
                      ? "บันทึกและนำเครื่องเข้าสต็อกร้าน"
                      : "บันทึกสัญญาจำนำและออกตั๋ว"}
                  </span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}

      {/* ================= MODAL: CONTRACT DETAILS & PRINT VIEW ================= */}
      <Dialog open={contractModalOpen} onOpenChange={setContractModalOpen}>
        <div className="max-w-2xl w-full">
          <DialogHeader>
            <DialogTitle onClose={() => setContractModalOpen(false)}>
              เอกสารสัญญา (Contract Document)
            </DialogTitle>
          </DialogHeader>

          {selectedContract && (
            <DialogContent className="max-h-[75vh] overflow-y-auto p-6 bg-slate-50 flex justify-center">
              <div className="bg-white border border-slate-300 shadow-md p-6 text-slate-900 text-xs space-y-4 rounded w-full">
                {/* Header */}
                <div className="flex justify-between items-start border-b border-slate-300 pb-3">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900">MOBILESHOP HUB</h3>
                    <p className="text-[11px] text-slate-500">{selectedContract.branch?.name}</p>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold text-sm text-blue-700 block">
                      {selectedContract.type === "PAWN"
                        ? "ตั๋วสัญญาจำนำ / ขายฝาก"
                        : "สัญญาซื้อขายเครื่องมือสอง"}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      เลขที่: {selectedContract.contractNo}
                    </span>
                  </div>
                </div>

                {/* Customer & Device Grid */}
                <div className="grid grid-cols-2 gap-4 border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      ผู้ทำสัญญา (ลูกค้า)
                    </span>
                    <div className="font-bold text-xs mt-0.5">{selectedContract.customer?.name}</div>
                    <div className="font-mono text-[11px]">บัตร ปชช: {selectedContract.nationalId}</div>
                    <div className="text-[11px]">โทร: {selectedContract.customer?.phone}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      อุปกรณ์ที่ทำสัญญา
                    </span>
                    <div className="font-bold text-xs mt-0.5">
                      {selectedContract.deviceBrand} {selectedContract.deviceModel}
                    </div>
                    <div className="font-mono text-[11px] text-blue-700">
                      IMEI: {selectedContract.imei}
                    </div>
                    <div className="text-[11px]">เกรดสภาพ: Grade {selectedContract.conditionGrade}</div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="rounded-lg bg-slate-50 p-3 text-xs space-y-1.5 border border-slate-200 font-mono">
                  <div className="flex justify-between">
                    <span>
                      {selectedContract.type === "PAWN" ? "วงเงินยอดจำนำ:" : "ราคาตกลงซื้อเข้า:"}
                    </span>
                    <span className="font-bold text-slate-900">
                      {formatTHB(selectedContract.agreedPrice)}
                    </span>
                  </div>
                  {selectedContract.type === "PAWN" && (
                    <>
                      <div className="flex justify-between text-purple-700">
                        <span>ดอกเบี้ยต่อเดือน ({selectedContract.interestRateMonthly}%):</span>
                        <span>{formatTHB(selectedContract.monthlyInterestAmount || 0)}/เดือน</span>
                      </div>
                      <div className="flex justify-between text-slate-700">
                        <span>วันครบกำหนดไถ่ถอน:</span>
                        <span className="font-bold">
                          {selectedContract.dueDate
                            ? new Date(selectedContract.dueDate).toLocaleDateString("th-TH")
                            : "-"}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span>สถานะสัญญาปัจจุบัน:</span>
                    <span className="font-bold text-blue-700">{selectedContract.status}</span>
                  </div>
                </div>

                {/* Anti-theft legal text snippet */}
                <div className="text-[10px] text-slate-500 leading-normal border-t border-slate-200 pt-2">
                  * ผู้ทำสัญญาได้ส่งมอบบัตรประชาชนและยืนยันว่ามิได้นำของโจรมาจำนำ/ขายเข้า
                  หากไม่มาไถ่ถอนภายในกำหนด ทางร้านขอสงวนสิทธิ์ยึดทรัพย์สินตามข้อตกลงทันที
                </div>

                {/* Signature */}
                <div className="pt-6 grid grid-cols-2 gap-6 text-center text-xs text-slate-500">
                  <div>
                    <div className="border-b border-slate-300 w-36 mx-auto mb-1" />
                    <div>ลงชื่อ ผู้ทำสัญญา (ลูกค้า)</div>
                  </div>
                  <div>
                    <div className="border-b border-slate-300 w-36 mx-auto mb-1" />
                    <div>ลงชื่อ ผู้รับจำนำ / ผู้แทนร้าน</div>
                  </div>
                </div>
              </div>
            </DialogContent>
          )}

          <DialogFooter className="flex justify-between">
            <Button variant="outline" size="sm" onClick={() => setContractModalOpen(false)}>
              ปิดหน้าต่าง
            </Button>
            <Button size="sm" onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
              <Printer className="h-4 w-4" />
              <span>พิมพ์เอกสารสัญญา</span>
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  );
}
