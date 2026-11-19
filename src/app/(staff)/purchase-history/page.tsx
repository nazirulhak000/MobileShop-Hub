"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  History,
  Search,
  Printer,
  Smartphone,
  Eye,
  HandCoins,
  ShieldCheck,
  PlusCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { formatTHB, formatDateThai } from "@/lib/utils";

export default function PurchaseHistoryLedgerPage() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [printContract, setPrintContract] = useState<any | null>(null);

  const fetchHistory = async () => {
    try {
      // Buybacks (used-phone purchases) are stored as BUYBACK trade-in contracts
      const res = await fetch("/api/trade-in?type=BUYBACK");
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setContracts(json.contracts || []);
      } else {
        alert(json?.error || `โหลดประวัติรับซื้อไม่สำเร็จ (HTTP ${res.status})`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filtered = contracts.filter((c) => {
    const s = search.toLowerCase();
    return (
      !s ||
      c.contractNo.toLowerCase().includes(s) ||
      c.customer?.name.toLowerCase().includes(s) ||
      c.customer?.phone.includes(s) ||
      c.imei.includes(s) ||
      c.deviceModel.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <History className="w-6 h-6 text-purple-600" />
            <span>สมุดทะเบียนรับซื้อเครื่องมือสอง (Buyback Ledger)</span>
          </h1>
          <p className="text-sm text-slate-500">
            ประวัติสัญญาซื้อขายเครื่องมือสอง บันทึกเลขบัตรประชาชน และพิมพ์หนังสือสัญญาซื้อขาย
          </p>
        </div>
        <Link href="/purchase">
          <Button className="bg-purple-600 hover:bg-purple-700 text-white gap-2 text-xs shadow-sm font-semibold">
            <PlusCircle className="w-4 h-4" />
            <span>ประเมินรับซื้อเครื่องใหม่</span>
          </Button>
        </Link>
      </div>

      {/* Search Bar */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="ค้นหาเลขที่สัญญา (TC- / PW-...), ชื่อผู้ขาย, เบอร์โทร, หรือ IMEI..."
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
                <th className="py-3 px-4">เลขที่สัญญา / วันที่</th>
                <th className="py-3 px-4">ผู้ขาย & เลขบัตร ปชช.</th>
                <th className="py-3 px-4">อุปกรณ์ & IMEI</th>
                <th className="py-3 px-4 text-center">เกรดสภาพ</th>
                <th className="py-3 px-4 text-right">ราคารับซื้อ (THB)</th>
                <th className="py-3 px-4 text-center">การกระทำ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    กำลังโหลดทะเบียนสัญญา...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    ไม่พบรายการสัญญาซื้อเข้า
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-purple-700">{item.contractNo}</div>
                      <div className="text-[11px] text-slate-400">{formatDateThai(item.startDate || item.createdAt)}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{item.customer?.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">โทร: {item.customer?.phone}</div>
                      <div className="text-[10px] text-slate-400 font-mono">ปชช: {item.nationalId}</div>
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-slate-900 truncate">
                        {item.deviceBrand} {item.deviceModel}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">IMEI: {item.imei}</div>
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className="font-bold text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                        Grade {item.conditionGrade || "A"}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-slate-900 font-mono text-sm">
                      {formatTHB(item.agreedPrice)}
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPrintContract(item)}
                        className="h-7 text-xs px-2.5 gap-1 text-slate-700"
                        title="พิมพ์สัญญาซื้อขาย A4"
                      >
                        <Printer className="w-3.5 h-3.5 text-blue-600" />
                        <span>พิมพ์สัญญา A4</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Print Contract A4 Modal */}
      {printContract && (
        <Dialog open={!!printContract} onOpenChange={() => setPrintContract(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
            <DialogHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <DialogTitle className="text-sm font-bold text-slate-900">
                หนังสือสัญญาซื้อขายโทรศัพท์มือสอง (A4)
              </DialogTitle>
              <Button size="sm" onClick={() => window.print()} className="h-7 text-xs bg-purple-600 text-white">
                พิมพ์สัญญา
              </Button>
            </DialogHeader>

            <div className="p-6 bg-slate-100 flex justify-center">
              <div
                id="buyback-contract"
                className="w-[680px] bg-white text-slate-900 p-8 font-sans text-xs leading-relaxed border border-slate-300 shadow-md space-y-4"
              >
                <div className="text-center pb-2 border-b-2 border-slate-800">
                  <h2 className="text-base font-bold">หนังสือสัญญาซื้อขายทรัพย์สินและปลอดโจรกรรม</h2>
                  <div className="font-mono text-xs text-slate-600">เลขที่สัญญา: {printContract.contractNo}</div>
                </div>

                <div className="text-right text-[11px] text-slate-600">
                  ทำขึ้น ณ {printContract.branch?.name || "MobileShop-Hub"} วันที่ {formatDateThai(printContract.startDate)}
                </div>

                <div className="space-y-2 text-justify">
                  <p>
                    สัญญาฉบับนี้ทำขึ้นระหว่าง <strong>{printContract.customer?.name}</strong> เลขประจำตัวประชาชน{" "}
                    <strong>{printContract.nationalId}</strong> เบอร์โทรศัพท์ <strong>{printContract.customer?.phone}</strong> (ซึ่งต่อไปในสัญญานี้เรียกว่า &ldquo;ผู้ขาย&rdquo;) ฝ่ายหนึ่ง กับ{" "}
                    <strong>{printContract.branch?.name || "MobileShop-Hub"}</strong> (ซึ่งต่อไปในสัญญานี้เรียกว่า &ldquo;ผู้ซื้อ&rdquo;) อีกฝ่ายหนึ่ง
                  </p>
                  <p>
                    ผู้ขายตกลงขาย และผู้ซื้อตกลงซื้อโทรศัพท์เคลื่อนที่ ยี่ห้อ <strong>{printContract.deviceBrand}</strong> รุ่น{" "}
                    <strong>{printContract.deviceModel}</strong> หมายเลขเครื่อง/IMEI <strong>{printContract.imei}</strong> สภาพเกรด{" "}
                    <strong>{printContract.conditionGrade}</strong> ในราคาตกลงซื้อขายรวมทั้งสิ้น{" "}
                    <strong className="text-purple-900">{formatTHB(printContract.agreedPrice)}</strong>
                  </p>
                  <div className="p-3 bg-slate-50 border border-slate-300 rounded font-semibold text-[11px]">
                    คำรับรองของผู้ขาย: ผู้ขายขอยืนยันว่าโทรศัพท์เครื่องนี้เป็นกรรมสิทธิ์อันแท้จริงของผู้ขาย และไม่ได้เป็นทรัพย์ที่ได้มาโดยผิดกฎหมายหรือการโจรกรรม หากปรากฏในภายหลังว่าเป็นทรัพย์ที่ผิดกฎหมาย ผู้ขายยินยอมชดใช้ค่าเสียหายและรับผิดชอบทางกฎหมายแต่เพียงผู้เดียว
                  </div>
                </div>

                <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
                  <div>
                    <div className="h-12 border-b border-slate-500"></div>
                    <div className="mt-1 font-semibold">ลงชื่อ ({printContract.customer?.name}) ผู้ขาย</div>
                  </div>
                  <div>
                    <div className="h-12 border-b border-slate-500"></div>
                    <div className="mt-1 font-semibold">ลงชื่อ ผู้ซื้อ / เจ้าหน้าที่ผู้รับซื้อ</div>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
