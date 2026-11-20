"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  Calendar,
  Clock,
  PlusCircle,
  FileText,
  User,
  RefreshCw,
  Tag,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/Dialog";
import { Badge } from "@/components/ui/Badge";
import { formatTHB } from "@/lib/utils";
import { useApp } from "@/context/AppContext";

interface WarrantyItem {
  id: string;
  sourceType: "SALE" | "REPAIR";
  imei: string;
  productName: string;
  brand: string;
  model: string;
  customerName: string;
  customerPhone: string;
  invoiceNo: string;
  branchName: string;
  branchCode: string;
  purchaseDate: string;
  warrantyDays: number;
  expiryDate: string;
  daysRemaining: number;
  status: "ACTIVE" | "EXPIRED";
  provider: string;
  claims: Array<{
    claimNo: string;
    date: string;
    symptom: string;
    resolution: string;
    status: string;
  }>;
}

export default function ProductWarrantyLookupPage() {
  const { currentBranch } = useApp();
  const [warranties, setWarranties] = useState<WarrantyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "EXPIRED">("ALL");

  // Claim Dialog States
  const [claimTarget, setClaimTarget] = useState<WarrantyItem | null>(null);
  const [claimSymptom, setClaimSymptom] = useState("");
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  // Claim History Detail Dialog
  const [viewHistoryTarget, setViewHistoryTarget] = useState<WarrantyItem | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchWarranties = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (currentBranch?.code) params.set("branch", currentBranch.code);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/warranty?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setWarranties(json.warranties || []);
      }
    } catch (err) {
      console.error("Failed to fetch warranties:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarranties();
  }, [currentBranch?.code, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchWarranties();
  };

  const handleOpenClaim = (item: WarrantyItem) => {
    setClaimTarget(item);
    setClaimSymptom("");
    setClaimError(null);
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimTarget || !claimSymptom.trim()) return;

    try {
      setSubmittingClaim(true);
      setClaimError(null);

      const res = await fetch("/api/warranty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CLAIM",
          targetId: claimTarget.imei !== "-" ? claimTarget.imei : claimTarget.invoiceNo,
          imei: claimTarget.imei !== "-" ? claimTarget.imei : undefined,
          invoiceNo: claimTarget.invoiceNo,
          symptom: claimSymptom.trim(),
          customerName: claimTarget.customerName,
          customerPhone: claimTarget.customerPhone,
          branchCode: currentBranch.code,
        }),
      });

      const json = await res.json();
      if (json.success) {
        showToast(json.message || "เปิดเคลมสำเร็จ");
        setClaimTarget(null);
        fetchWarranties();
      } else {
        setClaimError(json.error || "เกิดข้อผิดพลาดในการเปิดเคลม");
      }
    } catch (err: any) {
      setClaimError("เชื่อมต่อระบบไม่สำเร็จ: " + err.message);
    } finally {
      setSubmittingClaim(false);
    }
  };

  // Metrics
  const activeCount = warranties.filter((w) => w.status === "ACTIVE").length;
  const expiredCount = warranties.filter((w) => w.status === "EXPIRED").length;
  const totalClaimsCount = warranties.reduce((acc, w) => acc + w.claims.length, 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-2xl animate-fade-in border border-slate-700">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
            <span>ตรวจสอบประกันสินค้า & ตัวเครื่อง (Warranty & Claims)</span>
          </h1>
          <p className="text-sm text-slate-500">
            ค้นหาข้อมูลการรับประกันสินค้า ตัวเครื่อง IMEI และงานซ่อม พร้อมระบบบันทึกเคลมประกันออนไลน์
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchWarranties}
            disabled={loading}
            className="gap-1.5 text-xs text-slate-700"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>รีเฟรช</span>
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">รายการคุ้มครองทั้งหมด</div>
              <div className="text-2xl font-bold text-slate-900 mt-0.5">{warranties.length}</div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">อยู่ในระยะรับประกัน</div>
              <div className="text-2xl font-bold text-emerald-600 mt-0.5">{activeCount}</div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">หมดระยะประกันแล้ว</div>
              <div className="text-2xl font-bold text-slate-500 mt-0.5">{expiredCount}</div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">ประวัติเปิดเคลม</div>
              <div className="text-2xl font-bold text-amber-600 mt-0.5">{totalClaimsCount}</div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <Card className="border-slate-200">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="ค้นหาด้วย IMEI (15 หลัก), เลขที่ใบเสร็จ (INV-...), เลขงานซ่อม, ชื่อลูกค้า หรือเบอร์โทร..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs h-9 bg-slate-50 border-slate-200"
              />
            </div>
            <Button type="submit" size="sm" className="h-9 text-xs bg-blue-600 text-white">
              ค้นหา
            </Button>
          </form>

          {/* Status Tabs */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1 text-xs font-semibold rounded transition-all ${
                statusFilter === "ALL" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ทั้งหมด
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("ACTIVE")}
              className={`px-3 py-1 text-xs font-semibold rounded transition-all ${
                statusFilter === "ACTIVE" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              อยู่ในประกัน ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("EXPIRED")}
              className={`px-3 py-1 text-xs font-semibold rounded transition-all ${
                statusFilter === "EXPIRED" ? "bg-white text-slate-800 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              หมดประกัน ({expiredCount})
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Warranty Table */}
      <Card className="border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
              <tr>
                <th className="py-3 px-4">IMEI / อุปกรณ์</th>
                <th className="py-3 px-4">ลูกค้า & ใบเสร็จ</th>
                <th className="py-3 px-4">วันที่ซื้อ & ประเภทความคุ้มครอง</th>
                <th className="py-3 px-4">วันหมดอายุ & เวลาคงเหลือ</th>
                <th className="py-3 px-4 text-center">สถานะประกัน</th>
                <th className="py-3 px-4 text-center">ประวัติเคลม</th>
                <th className="py-3 px-4 text-center">การกระทำ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-500" />
                    กำลังค้นหาข้อมูลการรับประกัน...
                  </td>
                </tr>
              ) : warranties.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    ไม่พบรายการรับประกันที่ตรงกับเงื่อนไขการค้นหา
                  </td>
                </tr>
              ) : (
                warranties.map((item) => {
                  const isExpired = item.status === "EXPIRED";
                  const formattedPurchase = item.purchaseDate ? item.purchaseDate.slice(0, 10) : "-";
                  const formattedExpiry = item.expiryDate ? item.expiryDate.slice(0, 10) : "-";

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        {item.imei !== "-" ? (
                          <div className="font-mono font-bold text-blue-700">IMEI: {item.imei}</div>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-slate-500 font-mono">
                            ไม่มี IMEI (อุปกรณ์เสริม)
                          </Badge>
                        )}
                        <div className="font-semibold text-slate-900 text-xs mt-0.5">{item.productName}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{item.customerName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{item.customerPhone}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {item.sourceType === "SALE" ? "บิล: " : "ใบซ่อม: "}
                          {item.invoiceNo}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-slate-800 font-mono">{formattedPurchase}</div>
                        <div className="text-[11px] text-slate-500">{item.provider}</div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className={`font-mono text-xs font-semibold ${isExpired ? "text-rose-600" : "text-emerald-700"}`}>
                          {formattedExpiry}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {!isExpired ? `เหลืออีก ${item.daysRemaining} วัน` : "หมดอายุแล้ว"}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            !isExpired
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {!isExpired ? "อยู่ในประกัน" : "หมดประกันแล้ว"}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        {item.claims.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setViewHistoryTarget(item)}
                            className="font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded text-[11px] cursor-pointer"
                            title="คลิกเพื่อดูประวัติเคลม"
                          >
                            {item.claims.length} ครั้ง (ดู)
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <Button
                          size="sm"
                          disabled={isExpired}
                          onClick={() => handleOpenClaim(item)}
                          className={`h-7 text-xs px-2.5 gap-1 ${
                            !isExpired ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          <PlusCircle className="w-3 h-3" />
                          <span>เปิดเคลม</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal 1: Submit Claim Modal */}
      {claimTarget && (
        <Dialog open={!!claimTarget} onOpenChange={() => !submittingClaim && setClaimTarget(null)}>
          <DialogContent className="max-w-md p-0">
            <DialogHeader className="p-4 border-b border-slate-100">
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>เปิดคำขอเคลมประกันสินค้า (Warranty Claim)</span>
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                {claimTarget.productName} {claimTarget.imei !== "-" ? `• IMEI: ${claimTarget.imei}` : ""}
              </p>
            </DialogHeader>

            <form onSubmit={handleSubmitClaim} className="p-4 space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1 border border-slate-200">
                <div>ลูกค้า: <span className="font-semibold">{claimTarget.customerName}</span> ({claimTarget.customerPhone})</div>
                <div>เลขอ้างอิง: <span className="font-mono">{claimTarget.invoiceNo}</span></div>
                <div>ความคุ้มครอง: <span className="font-semibold text-emerald-700">{claimTarget.provider}</span></div>
                <div>หมดอายุ: <span className="font-mono font-semibold">{claimTarget.expiryDate.slice(0, 10)}</span></div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  อาการผิดปกติที่ส่งเคลม *
                </label>
                <textarea
                  required
                  rows={3}
                  value={claimSymptom}
                  onChange={(e) => setClaimSymptom(e.target.value)}
                  placeholder="ระบุอาการผิดปกติ เช่น ไมค์ดับ ลำโพงไม่ดัง เครื่องรีสตาร์ทเอง อะแดปเตอร์ไฟไม่เข้า..."
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {claimError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {claimError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setClaimTarget(null)}
                  disabled={submittingClaim}
                  className="text-xs"
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  disabled={submittingClaim || !claimSymptom.trim()}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {submittingClaim ? "กำลังบันทึก..." : "ยืนยันเปิดใบเคลม"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal 2: View Claim History Detail Modal */}
      {viewHistoryTarget && (
        <Dialog open={!!viewHistoryTarget} onOpenChange={() => setViewHistoryTarget(null)}>
          <DialogContent className="max-w-md p-0">
            <DialogHeader className="p-4 border-b border-slate-100">
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>ประวัติการเคลมประกัน ({viewHistoryTarget.claims.length} รายการ)</span>
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                {viewHistoryTarget.productName} {viewHistoryTarget.imei !== "-" ? `• IMEI: ${viewHistoryTarget.imei}` : ""}
              </p>
            </DialogHeader>

            <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {viewHistoryTarget.claims.map((cl, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between font-mono font-bold text-slate-800">
                    <span>{cl.claimNo}</span>
                    <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-200">
                      {cl.status}
                    </Badge>
                  </div>
                  <div className="text-slate-500 text-[11px]">วันที่ส่งเคลม: {cl.date}</div>
                  <div className="text-slate-800 pt-1">
                    <strong className="text-slate-900">อาการ: </strong>
                    {cl.symptom}
                  </div>
                  <div className="text-emerald-700 text-[11px] pt-0.5">
                    <strong>ผลการตรวจสอบ: </strong>
                    {cl.resolution}
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter className="p-3 border-t border-slate-100">
              <Button size="sm" variant="outline" onClick={() => setViewHistoryTarget(null)} className="text-xs">
                ปิด
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
