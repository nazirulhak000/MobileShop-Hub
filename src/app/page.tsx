import React from "react";
import Link from "next/link";
import {
  Wrench,
  DollarSign,
  AlertTriangle,
  FileQuestion,
  PlusCircle,
  ShoppingCart,
  HandCoins,
  Package,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getDashboardData } from "@/lib/dashboard";
import { formatTHB, formatDateThai } from "@/lib/utils";
import { RepairStatusMap, RepairStatusType } from "@/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { stats, recentRepairs, recentSales, lowStockItems } =
    await getDashboardData();

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            ระบบบริหารศูนย์บริการและร้านค้า (Dashboard)
          </h1>
          <p className="text-sm text-slate-500">
            ภาพรวมงานซ่อม ยอดขายหน้าร้าน และสินค้าคงคลังแบบ Real-time
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/repairs/new">
            <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm gap-2">
              <PlusCircle className="h-4 w-4" />
              <span>เปิดใบรับซ่อม</span>
            </Button>
          </Link>
          <Link href="/pos">
            <Button variant="outline" className="gap-2">
              <ShoppingCart className="h-4 w-4 text-emerald-600" />
              <span>แคชเชียร์ POS</span>
            </Button>
          </Link>
          <Link href="/trade-in">
            <Button variant="outline" className="gap-2">
              <HandCoins className="h-4 w-4 text-purple-600" />
              <span>รับซื้อ/จำนำ</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Core Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Active Repairs */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              งานซ่อมที่กำลังดำเนินการ
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Wrench className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {stats.activeRepairsCount} <span className="text-sm font-normal text-slate-500">เครื่อง</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
              <span className="rounded bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700">
                รอรับ {stats.pendingCount}
              </span>
              <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-medium text-indigo-700">
                กำลังซ่อม {stats.repairingCount}
              </span>
              <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-700">
                พร้อมรับ {stats.readyCount}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Today Revenue */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              ยอดรับเงินรวม (Revenue)
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatTHB(stats.todayRevenue)}
            </div>
            <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              <span>POS: {formatTHB(stats.posRevenue)} | ซ่อม: {formatTHB(stats.repairRevenue)}</span>
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Low Stock Alert */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              เตือนสินค้าใกล้หมด
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {stats.lowStockCount} <span className="text-sm font-normal text-slate-500">รายการ</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              สต็อกต่ำกว่าเกณฑ์ขั้นต่ำ ต้องสั่งซื้อเพิ่ม
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Pending Repairs & Quotes */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              รอตรวจเช็ค / เสนอราคา
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
              <FileQuestion className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {stats.pendingCount + stats.diagnosingCount} <span className="text-sm font-normal text-slate-500">ใบ</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              รอช่างประเมินอาการและยืนยันราคา
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Recent Repair Tickets & Low Stock / POS Overview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Recent Repair Tickets (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>รายการส่งซ่อมล่าสุด (Recent Repairs)</CardTitle>
                <CardDescription>
                  รายการแจ้งซ่อมของลูกค้าและสถานะการดำเนินการปัจจุบัน
                </CardDescription>
              </div>
              <Link href="/repairs">
                <Button variant="ghost" size="sm" className="gap-1 text-blue-600 text-xs">
                  <span>ดูทั้งหมด</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-slate-100">
                {recentRepairs.map((job) => {
                  const statusInfo =
                    RepairStatusMap[job.status as RepairStatusType] || {
                      label: job.status,
                      color: "text-slate-700",
                      bg: "bg-slate-50",
                      border: "border-slate-200",
                    };

                  return (
                    <div
                      key={job.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-2 hover:bg-slate-50/70 rounded-lg px-2 -mx-2 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                            {job.trackingCode}
                          </span>
                          <span className="font-semibold text-sm text-slate-900">
                            {job.deviceBrand} {job.deviceModel}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-1">
                          {job.issueDescription}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400">
                          <span>ลูกค้า: {job.customer.name}</span>
                          <span>•</span>
                          <span>ช่าง: {job.technician?.name || "ยังไม่ได้ระบุ"}</span>
                          <span>•</span>
                          <span>{formatDateThai(job.createdAt)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusInfo.bg} ${statusInfo.color} ${statusInfo.border}`}
                        >
                          {statusInfo.label}
                        </span>
                        <Link href={`/repairs/${job.id}`}>
                          <Button variant="secondary" size="sm" className="text-xs h-8">
                            จัดการ
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* POS Quick Summary */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>รายการขายหน้าร้านล่าสุด (POS Sales)</CardTitle>
                <CardDescription>
                  ใบเสร็จรับเงินและการชำระเงินของลูกค้า
                </CardDescription>
              </div>
              <Link href="/pos">
                <Button variant="ghost" size="sm" className="gap-1 text-blue-600 text-xs">
                  <span>ไปที่ POS</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-slate-100">
                {recentSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between py-2.5"
                  >
                    <div>
                      <div className="font-mono text-xs font-semibold text-slate-800">
                        {sale.invoiceNo}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {sale.customer?.name || "ลูกค้าทั่วไป"} • แคชเชียร์: {sale.cashier?.name}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm text-slate-900">
                        {formatTHB(sale.netAmount)}
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {sale.paymentMethod}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Low Stock Items & Quick Links (1 col) */}
        <div className="space-y-6">
          {/* Low Stock Widget */}
          <Card className="border-amber-200/80 bg-amber-50/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <CardTitle className="text-base text-amber-900">
                  แจ้งเตือนสต็อกต่ำ (Low Stock)
                </CardTitle>
              </div>
              <CardDescription>
                สินค้าและอะไหล่ที่ต้องสั่งซื้อเข้าสาขา
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-amber-200/60 bg-white p-3 shadow-2xs space-y-1.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-xs text-slate-900 line-clamp-1">
                        {item.product.name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {item.product.code} • {item.branch.code}
                      </div>
                    </div>
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                      คงเหลือ {item.quantity}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                    <span>เกณฑ์ขั้นต่ำ: {item.product.minStock} ชิ้น</span>
                    <Link href="/inventory" className="text-blue-600 hover:underline font-medium">
                      สั่งเพิ่ม &rarr;
                    </Link>
                  </div>
                </div>
              ))}
              <Link href="/inventory" className="block pt-1">
                <Button variant="outline" className="w-full text-xs">
                  ดูสต็อกสินค้าทั้งหมด
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Customer Self-Tracking Quick Test Box */}
          <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                หน้าติดตามสถานะลูกค้า
              </CardTitle>
              <CardDescription className="text-blue-100">
                ระบบหน้าเว็บ Mobile-First ให้ลูกค้าเช็คงานซ่อมด้วย QR Code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-blue-100 leading-relaxed">
                ลูกค้าสามารถดูขั้นตอนการซ่อม ดูรูปถ่ายอะไหล่ และกดอนุมัติราคาซ่อมได้ทันทีโดยไม่ต้องล็อกอิน
              </p>
              <Link href="/track/REP-202611-0001" target="_blank">
                <Button className="w-full bg-white text-blue-700 hover:bg-blue-50 text-xs font-semibold gap-2">
                  <span>ทดสอบเปิดหน้าลูกค้า (REP-202611-0001)</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
