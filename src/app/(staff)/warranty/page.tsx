"use client";

import React, { useState, useEffect } from "react";
import { DemoBanner } from "@/components/ui/DemoBanner";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { formatTHB, formatDateThai } from "@/lib/utils";

const MOCK_WARRANTIES = [
  {
    id: "war-1",
    imei: "354928110293847",
    productName: "iPhone 13 128GB Midnight (มือสอง สภาพสวย Grade A)",
    brand: "Apple",
    customerName: "คุณธนกร รัตนสิทธิ",
    customerPhone: "081-234-5678",
    invoiceNo: "INV-202611-0001",
    purchaseDate: "2026-10-15",
    warrantyMonths: 3,
    expiryDate: "2027-01-15",
    status: "ACTIVE",
    provider: "MobileShop Shop Warranty (ประกันร้าน 90 วัน)",
    claims: [],
  },
  {
    id: "war-2",
    imei: "359182736451029",
    productName: "Samsung Galaxy S23 5G 128GB Phantom Black (เครื่องใหม่ศูนย์)",
    brand: "Samsung",
    customerName: "คุณพิมพ์ชนก สิริพร",
    customerPhone: "089-876-5432",
    invoiceNo: "INV-202610-0045",
    purchaseDate: "2026-05-10",
    warrantyMonths: 12,
    expiryDate: "2027-05-10",
    status: "ACTIVE",
    provider: "Samsung Official 1 Year + ประกันร้านดูแลฟรี",
    claims: [
      {
        claimNo: "CLM-202609-01",
        date: "2026-09-12",
        symptom: "พอร์ตชาร์จมีฝุ่นอุดตัน ชาร์จช้า",
        resolution: "ทำความสะอาดพอร์ตและทดสอบกระแสไฟ 25W ผ่าน 100%",
        status: "RESOLVED",
      },
    ],
  },
  {
    id: "war-3",
    imei: "358765098123456",
    productName: "iPhone 14 Pro 256GB Deep Purple (มือสอง Grade A)",
    brand: "Apple",
    customerName: "คุณอนันต์ พัฒนเดช",
    customerPhone: "095-555-1234",
    invoiceNo: "INV-202606-0012",
    purchaseDate: "2026-06-01",
    warrantyMonths: 3,
    expiryDate: "2026-09-01",
    status: "EXPIRED",
    provider: "ประกันร้าน 90 วัน",
    claims: [],
  },
];

const NOT_SAVED_MSG = "ยังไม่รองรับการบันทึก — หน้านี้เป็นโหมดตัวอย่าง ข้อมูลจะไม่ถูกเก็บในระบบ";

export default function ProductWarrantyLookupPage() {
  const [warranties, setWarranties] = useState<any[]>(MOCK_WARRANTIES);
  const [search, setSearch] = useState("");
  const [claimTarget, setClaimTarget] = useState<any | null>(null);
  const [claimSymptom, setClaimSymptom] = useState("");

  const handleOpenClaim = (item: any) => {
    setClaimTarget(item);
    setClaimSymptom("");
  };

  const handleSubmitClaim = (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimTarget || !claimSymptom) return;
    // No warranty-claim model/API yet — do not pretend the claim was filed.
    alert(NOT_SAVED_MSG);
    setClaimTarget(null);
  };

  const filtered = warranties.filter((w) => {
    const s = search.toLowerCase();
    return (
      !s ||
      w.imei.includes(s) ||
      w.productName.toLowerCase().includes(s) ||
      w.customerName.toLowerCase().includes(s) ||
      w.customerPhone.includes(s) ||
      w.invoiceNo.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <DemoBanner message="ยังไม่มีฐานข้อมูลการรับประกัน/เคลม ข้อมูลในหน้านี้เป็นตัวอย่าง การเปิดเคลมจะไม่ถูกบันทึก" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
            <span>ตรวจสอบประกันสินค้า & ตัวเครื่อง (Product Warranty & Claims)</span>
          </h1>
          <p className="text-sm text-slate-500">
            ค้นหาข้อมูลประกันเครื่องศูนย์และประกันร้านด้วย IMEI และส่งเรื่องเปิดเคลมเปลี่ยนสินค้า
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="ค้นหาด้วย IMEI (15 หลัก), เลขที่ใบเสร็จ (INV-...), ชื่อลูกค้า หรือเบอร์โทร..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9 bg-slate-50 border-slate-200"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
              <tr>
                <th className="py-3 px-4">IMEI / อุปกรณ์</th>
                <th className="py-3 px-4">ลูกค้า & ใบเสร็จ</th>
                <th className="py-3 px-4">วันที่ซื้อ & ประเภทประกัน</th>
                <th className="py-3 px-4">วันหมดอายุ</th>
                <th className="py-3 px-4">สถานะประกัน</th>
                <th className="py-3 px-4 text-center">ประวัติเคลม</th>
                <th className="py-3 px-4 text-center">การกระทำ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => {
                const isExpired = new Date(item.expiryDate) < new Date();

                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-blue-700">IMEI: {item.imei}</div>
                      <div className="font-semibold text-slate-900 text-xs mt-0.5">{item.productName}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{item.customerName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{item.customerPhone}</div>
                      <div className="text-[10px] text-slate-400 font-mono">บิล: {item.invoiceNo}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-slate-800 font-mono">{item.purchaseDate}</div>
                      <div className="text-[11px] text-slate-500">{item.provider}</div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className={`font-mono text-xs font-semibold ${isExpired ? "text-rose-600" : "text-emerald-700"}`}>
                        {item.expiryDate}
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
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
                      <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {item.claims.length} ครั้ง
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <Button
                        size="sm"
                        disabled={isExpired}
                        onClick={() => handleOpenClaim(item)}
                        className={`h-7 text-xs px-2.5 gap-1 ${
                          !isExpired ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        <PlusCircle className="w-3 h-3" />
                        <span>เปิดเคลม</span>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Submit Claim Modal */}
      {claimTarget && (
        <Dialog open={!!claimTarget} onOpenChange={() => setClaimTarget(null)}>
          <DialogContent className="max-w-md p-0">
            <DialogHeader className="p-4 border-b border-slate-100">
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>เปิดคำขอเคลมประกันสินค้า (Warranty Claim)</span>
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                {claimTarget.productName} • IMEI: {claimTarget.imei}
              </p>
            </DialogHeader>

            <form onSubmit={handleSubmitClaim} className="p-4 space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1 border border-slate-200">
                <div>ลูกค้า: <span className="font-semibold">{claimTarget.customerName}</span> ({claimTarget.customerPhone})</div>
                <div>ใบเสร็จซื้อ: <span className="font-mono">{claimTarget.invoiceNo}</span></div>
                <div>ความคุ้มครอง: <span className="font-semibold text-emerald-700">{claimTarget.provider}</span></div>
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
                  placeholder="ระบุอาการผิดปกติ เช่น ไมค์ดับ ลำโพงไม่ดัง เครื่องรีสตาร์ทเอง..."
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setClaimTarget(null)} className="text-xs">
                  ยกเลิก
                </Button>
                <Button type="submit" className="text-xs bg-blue-600 hover:bg-blue-700 text-white">
                  ยืนยันเปิดใบเคลม
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
