"use client";

import React, { useState, useMemo } from "react";
import {
  DollarSign,
  Printer,
  Download,
  Calendar,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  UserCheck,
  ShieldCheck,
  Percent,
  X,
  CreditCard,
  Building,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { formatTHB } from "@/lib/utils";

interface PayrollEmployee {
  id: string;
  name: string;
  role: "ADMIN" | "MANAGER" | "TECHNICIAN" | "CASHIER";
  branchId: string;
  branchName: string;
  branchCode: string;
  bankName: string;
  bankAccount: string;
  baseSalary: number;
  repairCommission: number;
  salesCommission: number;
  allowance: number; // เบี้ยขยัน
  overtimePay: number;
  ssoDeduction: number; // ประกันสังคม (5% สูงสุด 750)
  taxDeduction: number; // หัก ณ ที่จ่าย
  otherDeductions: number; // ขาด/สาย
  status: "PENDING" | "APPROVED" | "PAID";
  paidDate?: string;
}

const INITIAL_PAYROLL: PayrollEmployee[] = [
  {
    id: "cmwnc36pk0003z3fxhcmjra89",
    name: "สมชาย ผู้จัดการใหญ่",
    role: "ADMIN",
    branchId: "cmwnc36pa0000z3fxx6o3d40a",
    branchName: "MobileShop HQ (สำนักงานใหญ่ สุขุมวิท)",
    branchCode: "HQ",
    bankName: "ธนาคารกสิกรไทย",
    bankAccount: "118-2-45892-0",
    baseSalary: 45000,
    repairCommission: 0,
    salesCommission: 4500,
    allowance: 2000,
    overtimePay: 0,
    ssoDeduction: 750,
    taxDeduction: 1200,
    otherDeductions: 0,
    status: "PAID",
    paidDate: "2026-11-28",
  },
  {
    id: "cmwnc36pm0005z3fxfs0n6kmq",
    name: "วิภาดา สาขาเก้า",
    role: "MANAGER",
    branchId: "cmwnc36ph0001z3fxk19vxzom",
    branchName: "MobileShop สาขา 2 (เซ็นทรัลพระราม 9)",
    branchCode: "BR-02",
    bankName: "ธนาคารไทยพาณิชย์",
    bankAccount: "408-9-11234-9",
    baseSalary: 32000,
    repairCommission: 1200,
    salesCommission: 3800,
    allowance: 1500,
    overtimePay: 1200,
    ssoDeduction: 750,
    taxDeduction: 650,
    otherDeductions: 0,
    status: "APPROVED",
  },
  {
    id: "cmwnc36pp0007z3fxempw03xb",
    name: "ช่างเอก มือทอง",
    role: "TECHNICIAN",
    branchId: "cmwnc36pa0000z3fxx6o3d40a",
    branchName: "MobileShop HQ (สำนักงานใหญ่ สุขุมวิท)",
    branchCode: "HQ",
    bankName: "ธนาคารกรุงเทพ",
    bankAccount: "238-0-78219-5",
    baseSalary: 22000,
    repairCommission: 11450, // ค่าคอมงานซ่อม 15% จาก 12 งานซ่อม
    salesCommission: 950,
    allowance: 1500,
    overtimePay: 2400,
    ssoDeduction: 750,
    taxDeduction: 520,
    otherDeductions: 0,
    status: "APPROVED",
  },
  {
    id: "cmwnc36pr0009z3fxgwves47p",
    name: "ช่างนนท์ สายไว",
    role: "TECHNICIAN",
    branchId: "cmwnc36ph0001z3fxk19vxzom",
    branchName: "MobileShop สาขา 2 (เซ็นทรัลพระราม 9)",
    branchCode: "BR-02",
    bankName: "ธนาคารกสิกรไทย",
    bankAccount: "095-8-33120-1",
    baseSalary: 20000,
    repairCommission: 8800,
    salesCommission: 650,
    allowance: 1500,
    overtimePay: 1800,
    ssoDeduction: 750,
    taxDeduction: 410,
    otherDeductions: 300, // มาสาย 2 ครั้ง
    status: "PENDING",
  },
  {
    id: "cmwnc36pu000bz3fxukzq50yd",
    name: "น้องแพรว แคชเชียร์",
    role: "CASHIER",
    branchId: "cmwnc36pa0000z3fxx6o3d40a",
    branchName: "MobileShop HQ (สำนักงานใหญ่ สุขุมวิท)",
    branchCode: "HQ",
    bankName: "ธนาคารกรุงไทย",
    bankAccount: "982-1-00234-8",
    baseSalary: 16500,
    repairCommission: 0,
    salesCommission: 5800, // ค่าคอมยอดขายหน้าร้าน 1.5%
    allowance: 1500,
    overtimePay: 1500,
    ssoDeduction: 750,
    taxDeduction: 200,
    otherDeductions: 150,
    status: "APPROVED",
  },
  {
    id: "cmwnc36px000dz3fxfegn9stf",
    name: "น้องก้อย แคชเชียร์",
    role: "CASHIER",
    branchId: "cmwnc36ph0001z3fxk19vxzom",
    branchName: "MobileShop สาขา 2 (เซ็นทรัลพระราม 9)",
    branchCode: "BR-02",
    bankName: "ธนาคารไทยพาณิชย์",
    bankAccount: "412-3-88765-2",
    baseSalary: 16500,
    repairCommission: 0,
    salesCommission: 4600,
    allowance: 1000,
    overtimePay: 900,
    ssoDeduction: 750,
    taxDeduction: 180,
    otherDeductions: 0,
    status: "PENDING",
  },
];

export default function PayrollPage() {
  const { currentBranch, branches } = useApp();
  const [payrollList, setPayrollList] = useState<PayrollEmployee[]>(INITIAL_PAYROLL);
  const [selectedMonth, setSelectedMonth] = useState("2026-11");
  const [selectedBranch, setSelectedBranch] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // Pay Slip Modal
  const [slipModalOpen, setSlipModalOpen] = useState(false);
  const [activeSlipEmployee, setActiveSlipEmployee] = useState<PayrollEmployee | null>(null);

  // Filtered Payroll
  const filteredPayroll = useMemo(() => {
    return payrollList.filter((p) => {
      const matchBranch = selectedBranch === "ALL" || p.branchCode === selectedBranch;
      const matchRole = roleFilter === "ALL" || p.role === roleFilter;
      return matchBranch && matchRole;
    });
  }, [payrollList, selectedBranch, roleFilter]);

  // Aggregate Metrics
  const summary = useMemo(() => {
    let totalBase = 0;
    let totalRepairComm = 0;
    let totalSalesComm = 0;
    let totalSSO = 0;
    let totalTax = 0;
    let totalGrossIncome = 0;
    let totalNetPayout = 0;

    filteredPayroll.forEach((p) => {
      const gross = p.baseSalary + p.repairCommission + p.salesCommission + p.allowance + p.overtimePay;
      const deductions = p.ssoDeduction + p.taxDeduction + p.otherDeductions;
      const net = gross - deductions;

      totalBase += p.baseSalary;
      totalRepairComm += p.repairCommission;
      totalSalesComm += p.salesCommission;
      totalSSO += p.ssoDeduction;
      totalTax += p.taxDeduction;
      totalGrossIncome += gross;
      totalNetPayout += net;
    });

    return {
      totalBase,
      totalCommissions: totalRepairComm + totalSalesComm,
      totalRepairComm,
      totalSalesComm,
      totalSSO,
      totalTax,
      totalGrossIncome,
      totalNetPayout,
      count: filteredPayroll.length,
    };
  }, [filteredPayroll]);

  // Print Slip
  const handleOpenSlip = (emp: PayrollEmployee) => {
    setActiveSlipEmployee(emp);
    setSlipModalOpen(true);
  };

  const handlePrintSlip = () => {
    window.print();
  };

  const handleMarkAsPaid = (empId: string) => {
    setPayrollList((prev) =>
      prev.map((p) =>
        p.id === empId
          ? {
              ...p,
              status: "PAID",
              paidDate: new Date().toISOString().split("T")[0],
            }
          : p
      )
    );
  };

  const exportBankTransfer = () => {
    const headers = ["ลำดับ,รหัสพนักงาน,ชื่อพนักงาน,ธนาคาร,เลขที่บัญชี,ยอดเงินโอนสุทธิ,สาขา"];
    const rows = filteredPayroll.map((p, idx) => {
      const gross = p.baseSalary + p.repairCommission + p.salesCommission + p.allowance + p.overtimePay;
      const deductions = p.ssoDeduction + p.taxDeduction + p.otherDeductions;
      const net = gross - deductions;
      return [
        idx + 1,
        p.id,
        `"${p.name}"`,
        `"${p.bankName}"`,
        `"${p.bankAccount}"`,
        net.toFixed(2),
        `"${p.branchName}"`,
      ].join(",");
    });
    const csvContent = "\uFEFF" + [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bank_transfer_payroll_${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              เงินเดือน & ค่าคอมมิชชั่น (Payroll & Commission)
            </h1>
            <p className="text-xs text-slate-500">
              คำนวณฐานเงินเดือน ค่าคอมงานซ่อม ค่าคอมยอดขาย ประกันสังคม (5% สูงสุด 750 บ.) และออกสลิปเงินเดือน
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={exportBankTransfer}
            className="gap-2 text-xs h-9 border-slate-300 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            ส่งออกไฟล์โอนธนาคาร
          </Button>

          <Button
            onClick={() => {
              if (activeSlipEmployee || filteredPayroll[0]) {
                handleOpenSlip(activeSlipEmployee || filteredPayroll[0]);
              }
            }}
            className="gap-2 text-xs h-9 bg-slate-900 text-white hover:bg-slate-800"
          >
            <Printer className="h-3.5 w-3.5" />
            พิมพ์สลิปเงินเดือน
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <Card className="border-blue-200 bg-blue-50/40 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-blue-700 mb-1">
              <span>ยอดจ่ายสุทธิรวม (Net Payout)</span>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-900 tabular-nums">
              {formatTHB(summary.totalNetPayout)}
            </div>
            <p className="text-[11px] text-blue-600 mt-0.5">พนักงานทั้งหมด {summary.count} คน</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>ฐานเงินเดือนรวม (Base Pay)</span>
              <Building className="h-4 w-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">
              {formatTHB(summary.totalBase)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">เงินเดือนประจำทุกตำแหน่ง</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/40 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-emerald-700 mb-1">
              <span>คอมมิชชั่นรวม (Commissions)</span>
              <Percent className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-800 tabular-nums">
              {formatTHB(summary.totalCommissions)}
            </div>
            <p className="text-[11px] text-emerald-600 mt-0.5">
              ซ่อม: {formatTHB(summary.totalRepairComm)} | ขาย: {formatTHB(summary.totalSalesComm)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/40 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-amber-700 mb-1">
              <span>หักประกันสังคม (SSO 5%)</span>
              <ShieldCheck className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-amber-800 tabular-nums">
              {formatTHB(summary.totalSSO)}
            </div>
            <p className="text-[11px] text-amber-600 mt-0.5">ส่งเงินสมทบ ปกส. สูงสุด 750 บ./คน</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>หักภาษี ณ ที่จ่าย (WHT)</span>
              <FileText className="h-4 w-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">
              {formatTHB(summary.totalTax)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">ภ.ง.ด.1 นำส่งสรรพากร</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-xs text-slate-700">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-medium">งวดเดือน:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-800 outline-none cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-xs text-slate-700">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-medium">สาขา:</span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-800 outline-none cursor-pointer"
            >
              <option value="ALL">ทุกสาขา ({branches.length})</option>
              {branches.map((b) => (
                <option key={b.id} value={b.code}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-1 bg-slate-50 text-xs">
            {["ALL", "TECHNICIAN", "CASHIER", "MANAGER", "ADMIN"].map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  roleFilter === r
                    ? "bg-white text-slate-900 shadow-2xs border border-slate-200/80 font-semibold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {r === "ALL" && "ทุกตำแหน่ง"}
                {r === "TECHNICIAN" && "ช่างซ่อม"}
                {r === "CASHIER" && "แคชเชียร์"}
                {r === "MANAGER" && "ผู้จัดการ"}
                {r === "ADMIN" && "แอดมิน"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Payroll Table */}
      <Card className="border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/75 border-b border-slate-200">
              <TableRow>
                <TableHead className="text-xs font-semibold text-slate-600">พนักงาน / บัญชี</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-right">ฐานเงินเดือน</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-right">คอมมิชชั่นซ่อม</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-right">คอมมิชชั่นขาย</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-right">เบี้ยขยัน/OT</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-right">หัก ปกส./ภาษี</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-right">เงินได้สุทธิ</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">สถานะ</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">การกระทำ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayroll.map((emp) => {
                const totalGross = emp.baseSalary + emp.repairCommission + emp.salesCommission + emp.allowance + emp.overtimePay;
                const totalDeductions = emp.ssoDeduction + emp.taxDeduction + emp.otherDeductions;
                const netPay = totalGross - totalDeductions;

                return (
                  <TableRow key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                    <TableCell className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 font-semibold text-xs text-slate-700 border border-slate-200">
                          {emp.name.slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-slate-900">{emp.name}</div>
                          <div className="text-[11px] text-slate-400">
                            {emp.role} • {emp.branchCode} • {emp.bankName} ({emp.bankAccount.slice(-5)})
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="py-3 text-right font-mono text-xs text-slate-800">
                      {formatTHB(emp.baseSalary)}
                    </TableCell>

                    <TableCell className="py-3 text-right font-mono text-xs text-emerald-700 font-medium">
                      {emp.repairCommission > 0 ? `+${formatTHB(emp.repairCommission)}` : "-"}
                    </TableCell>

                    <TableCell className="py-3 text-right font-mono text-xs text-blue-700 font-medium">
                      {emp.salesCommission > 0 ? `+${formatTHB(emp.salesCommission)}` : "-"}
                    </TableCell>

                    <TableCell className="py-3 text-right font-mono text-xs text-slate-600">
                      +{formatTHB(emp.allowance + emp.overtimePay)}
                    </TableCell>

                    <TableCell className="py-3 text-right font-mono text-xs text-rose-600">
                      -{formatTHB(totalDeductions)}
                    </TableCell>

                    <TableCell className="py-3 text-right font-mono text-xs font-bold text-slate-900">
                      {formatTHB(netPay)}
                    </TableCell>

                    <TableCell className="py-3 text-center">
                      {emp.status === "PAID" && (
                        <Badge variant="success" className="text-[10px]">
                          จ่ายแล้ว
                        </Badge>
                      )}
                      {emp.status === "APPROVED" && (
                        <Badge variant="default" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                          อนุมัติแล้ว
                        </Badge>
                      )}
                      {emp.status === "PENDING" && (
                        <Badge variant="warning" className="text-[10px]">
                          รอตรวจสอบ
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenSlip(emp)}
                          className="h-7 text-[11px] px-2 gap-1 border-slate-300"
                        >
                          <FileText className="h-3 w-3" />
                          สลิป
                        </Button>

                        {emp.status !== "PAID" && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleMarkAsPaid(emp.id)}
                            className="h-7 text-[11px] px-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                          >
                            จ่าย
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Pay Slip Modal */}
      <Dialog open={slipModalOpen} onOpenChange={setSlipModalOpen}>
        <div className="p-1">
          {activeSlipEmployee && (
            <div id="payslip-printable" className="bg-white p-6 rounded-xl text-slate-900">
              {/* Slip Header */}
              <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold tracking-tight text-slate-900">MobileShop Hub Co., Ltd.</span>
                    <span className="rounded bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.5">PAYSLIP</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">บริษัท โมบายช็อป ฮับ จำกัด (สำนักงานใหญ่)</p>
                  <p className="text-[11px] text-slate-500">เลขประจำตัวผู้เสียภาษีอากร: 0105567012345</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-900">ใบแจ้งเงินเดือน / PAY SLIP</div>
                  <div className="text-xs text-slate-600 font-mono mt-0.5">งวดประจำเดือน: {selectedMonth}</div>
                  <div className="text-[11px] text-slate-500">วันที่จ่าย: 28/11/2026</div>
                </div>
              </div>

              {/* Employee Info Box */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs mb-4">
                <div>
                  <div><span className="text-slate-500">รหัสพนักงาน:</span> <span className="font-mono font-medium">{activeSlipEmployee.id.slice(-8).toUpperCase()}</span></div>
                  <div><span className="text-slate-500">ชื่อ-นามสกุล:</span> <span className="font-semibold">{activeSlipEmployee.name}</span></div>
                  <div><span className="text-slate-500">ตำแหน่ง:</span> <span className="font-medium">{activeSlipEmployee.role}</span></div>
                </div>
                <div>
                  <div><span className="text-slate-500">สังกัดสาขา:</span> <span className="font-medium">{activeSlipEmployee.branchName}</span></div>
                  <div><span className="text-slate-500">ธนาคาร:</span> <span className="font-medium">{activeSlipEmployee.bankName}</span></div>
                  <div><span className="text-slate-500">เลขที่บัญชี:</span> <span className="font-mono font-medium">{activeSlipEmployee.bankAccount}</span></div>
                </div>
              </div>

              {/* Earnings & Deductions Breakdown */}
              <div className="grid grid-cols-2 gap-4 border border-slate-200 rounded-lg overflow-hidden mb-4">
                {/* Earnings */}
                <div className="border-r border-slate-200">
                  <div className="bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 border-b border-slate-200 flex justify-between">
                    <span>รายการได้ (Earnings)</span>
                    <span>จำนวนเงิน (บาท)</span>
                  </div>
                  <div className="p-3 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-600">เงินเดือนพื้นฐาน (Base Salary)</span>
                      <span className="font-mono">{activeSlipEmployee.baseSalary.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</span>
                    </div>
                    {activeSlipEmployee.repairCommission > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">ค่าคอมมิชชั่นงานซ่อม (Repair Comm)</span>
                        <span className="font-mono text-emerald-700">{activeSlipEmployee.repairCommission.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {activeSlipEmployee.salesCommission > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">ค่าคอมมิชชั่นยอดขาย (Sales Comm)</span>
                        <span className="font-mono text-blue-700">{activeSlipEmployee.salesCommission.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {activeSlipEmployee.allowance > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">เบี้ยขยัน (Attendance Allowance)</span>
                        <span className="font-mono">{activeSlipEmployee.allowance.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {activeSlipEmployee.overtimePay > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">ค่าล่วงเวลา (Overtime / OT)</span>
                        <span className="font-mono">{activeSlipEmployee.overtimePay.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Deductions */}
                <div>
                  <div className="bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 border-b border-slate-200 flex justify-between">
                    <span>รายการหัก (Deductions)</span>
                    <span>จำนวนเงิน (บาท)</span>
                  </div>
                  <div className="p-3 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-600">ประกันสังคม (SSO 5%)</span>
                      <span className="font-mono text-rose-600">{activeSlipEmployee.ssoDeduction.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</span>
                    </div>
                    {activeSlipEmployee.taxDeduction > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">ภาษีหัก ณ ที่จ่าย (Withholding Tax)</span>
                        <span className="font-mono text-rose-600">{activeSlipEmployee.taxDeduction.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {activeSlipEmployee.otherDeductions > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">หักมาสาย / ขาดงาน</span>
                        <span className="font-mono text-rose-600">{activeSlipEmployee.otherDeductions.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Net Total Box */}
              {(() => {
                const totalGross =
                  activeSlipEmployee.baseSalary +
                  activeSlipEmployee.repairCommission +
                  activeSlipEmployee.salesCommission +
                  activeSlipEmployee.allowance +
                  activeSlipEmployee.overtimePay;
                const totalDed =
                  activeSlipEmployee.ssoDeduction +
                  activeSlipEmployee.taxDeduction +
                  activeSlipEmployee.otherDeductions;
                const net = totalGross - totalDed;

                return (
                  <div className="bg-slate-900 text-white p-3.5 rounded-lg flex items-center justify-between mb-6">
                    <div>
                      <div className="text-xs text-slate-300">เงินได้สุทธิ (Net Payable)</div>
                      <div className="text-[11px] text-slate-400">โอนเข้าบัญชีอัตโนมัติ</div>
                    </div>
                    <div className="text-2xl font-bold font-mono text-emerald-400">
                      {formatTHB(net)}
                    </div>
                  </div>
                );
              })()}

              {/* Signature Lines */}
              <div className="grid grid-cols-2 gap-8 text-center text-xs text-slate-600 pt-6 border-t border-slate-200">
                <div>
                  <div className="h-10 border-b border-dashed border-slate-300 w-3/4 mx-auto mb-1"></div>
                  <p className="font-medium">ผู้จัดการฝ่ายทรัพยากรบุคคล / ผู้จ่ายเงิน</p>
                  <p className="text-[10px] text-slate-400">ลงวันที่ 28 พ.ย. 2569</p>
                </div>
                <div>
                  <div className="h-10 border-b border-dashed border-slate-300 w-3/4 mx-auto mb-1"></div>
                  <p className="font-medium">({activeSlipEmployee.name}) พนักงานผู้รับเงิน</p>
                  <p className="text-[10px] text-slate-400">ลงชื่อรับรองความถูกต้อง</p>
                </div>
              </div>

              {/* Print buttons */}
              <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-100 print:hidden">
                <Button variant="outline" size="sm" onClick={() => setSlipModalOpen(false)}>
                  ปิดหน้าต่าง
                </Button>
                <Button size="sm" onClick={handlePrintSlip} className="bg-blue-600 text-white hover:bg-blue-700 gap-1.5">
                  <Printer className="h-3.5 w-3.5" />
                  พิมพ์สลิปเอกสาร
                </Button>
              </div>
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
}
