"use client";

import React, { useState, useMemo } from "react";
import {
  DollarSign,
  CreditCard,
  QrCode,
  Banknote,
  CheckCircle2,
  Calendar,
  Building2,
  ArrowUpDown,
  Download,
  Printer,
  RefreshCw,
  Search,
  Check,
  AlertTriangle,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatTHB } from "@/lib/utils";

interface ChannelBreakdown {
  channel: string;
  count: number;
  grossAmount: number;
  fee: number;
  netDeposited: number;
  bankAccount: string;
  reconciled: boolean;
}

export default function DailyTakingsPage() {
  const { currentBranch } = useApp();
  const [selectedDate, setSelectedDate] = useState("2026-11-19");

  const [channels, setChannels] = useState<ChannelBreakdown[]>([
    {
      channel: "เงินสดหน้าร้าน (Cash)",
      count: 14,
      grossAmount: 18450,
      fee: 0,
      netDeposited: 18450,
      bankAccount: "ฝากเข้ากสิกรไทย สาขาสุขุมวิท 55",
      reconciled: true,
    },
    {
      channel: "พร้อมเพย์ QR (PromptPay)",
      count: 22,
      grossAmount: 43200,
      fee: 0,
      netDeposited: 43200,
      bankAccount: "SCB Easy Pay QR (Auto Deposit)",
      reconciled: true,
    },
    {
      channel: "เครื่องรูดบัตรเครดิต EDC (KBank)",
      count: 8,
      grossAmount: 38900,
      fee: 972.5, // 2.5% MDR fee
      netDeposited: 37927.5,
      bankAccount: "KBank EDC Batch #8819",
      reconciled: true,
    },
    {
      channel: "โอนผ่านบัญชีธนาคาร (Direct Transfer)",
      count: 4,
      grossAmount: 12500,
      fee: 0,
      netDeposited: 12500,
      bankAccount: "BBL Corporate #102-3-99812",
      reconciled: false, // Pending statement check
    },
  ]);

  const totals = useMemo(() => {
    const gross = channels.reduce((a, b) => a + b.grossAmount, 0);
    const fees = channels.reduce((a, b) => a + b.fee, 0);
    const net = channels.reduce((a, b) => a + b.netDeposited, 0);
    const totalTransactions = channels.reduce((a, b) => a + b.count, 0);
    return { gross, fees, net, totalTransactions };
  }, [channels]);

  const toggleReconcile = (index: number) => {
    setChannels((prev) =>
      prev.map((c, i) => (i === index ? { ...c, reconciled: !c.reconciled } : c))
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              ยอดรับเงินประจำวัน & กระทบยอดเงินฝากธนาคาร (Daily Takings & Reconciliation)
            </h1>
            <Badge variant="outline" className="border-blue-300 bg-blue-50/50 text-blue-700 font-medium">
              <Building2 className="mr-1 h-3 w-3 inline" />
              {currentBranch.name}
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            แยกยอดรับเงินตามช่องทางชำระ (เงินสด, PromptPay, บัตร EDC, โอน) ตรวจสอบค่าธรรมเนียม และกระทบยอดกับ Statement ธนาคาร
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40 text-xs font-mono"
          />
          <Button
            size="sm"
            onClick={() => window.print()}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs gap-1.5"
          >
            <Printer className="h-4 w-4" />
            <span>พิมพ์รายงานยอดประจำวัน</span>
          </Button>
        </div>
      </div>

      {/* 4 Stat Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 space-y-1 rounded-2xl border-slate-200/90 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">ยอดรับเงินรวม (Gross Takings)</span>
          <div className="text-2xl font-bold tabular-nums tracking-tight text-slate-900">{formatTHB(totals.gross)}</div>
          <div className="text-[11px] text-slate-400">ทั้งหมด {totals.totalTransactions} รายการขาย</div>
        </Card>

        <Card className="p-4 space-y-1 rounded-2xl border-slate-200/90 shadow-2xs">
          <span className="text-xs font-semibold text-rose-600">ค่าธรรมเนียมรูดบัตร (MDR Fees)</span>
          <div className="text-2xl font-bold tabular-nums tracking-tight text-rose-600">-{formatTHB(totals.fees)}</div>
          <div className="text-[11px] text-slate-400">เฉลี่ย 2.5% ของยอดบัตรเครดิต</div>
        </Card>

        <Card className="p-4 space-y-1 rounded-2xl border-teal-200/80 bg-teal-50/40 shadow-2xs">
          <span className="text-xs font-semibold text-teal-800">ยอดเงินสุทธิเข้าบัญชี (Net Deposited)</span>
          <div className="text-2xl font-bold tabular-nums tracking-tight text-teal-700">{formatTHB(totals.net)}</div>
          <div className="text-[11px] text-teal-700 font-medium">ยอดเงินจริงหลังหักค่าธรรมเนียม</div>
        </Card>

        <Card className="p-4 space-y-1 rounded-2xl border-slate-200/90 shadow-2xs">
          <span className="text-xs font-semibold text-teal-700">สถานะกระทบยอด (Reconciled)</span>
          <div className="text-2xl font-bold tabular-nums tracking-tight text-teal-800">
            {channels.filter((c) => c.reconciled).length} / {channels.length} ช่องทาง
          </div>
          <div className="text-[11px] text-slate-400">
            {channels.some((c) => !c.reconciled) ? "รอเช็คสลิปโอน 1 ช่องทาง" : "ครบถ้วน 100%"}
          </div>
        </Card>
      </div>

      {/* Main Reconciliation Table */}
      <Card className="rounded-2xl border-slate-200/90 shadow-2xs overflow-hidden">
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">รายละเอียดการรับเงิน & กระทบยอดเงินเข้าธนาคาร (Bank Settlement)</CardTitle>
            <CardDescription className="text-xs text-slate-500">เทียบยอดระบบ POS กับ Statement บัญชีธนาคาร</CardDescription>
          </div>
          <Badge variant="outline" className="text-xs font-medium tabular-nums">
            {selectedDate}
          </Badge>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50/90 border-b border-slate-200/80 text-slate-600 font-semibold">
              <tr>
                <th className="p-3 text-left">ช่องทางการชำระเงิน</th>
                <th className="p-3 text-center w-24">จำนวนบิล</th>
                <th className="p-3 text-right w-32">ยอดรวมหน้า POS</th>
                <th className="p-3 text-right w-28">ค่าธรรมเนียม</th>
                <th className="p-3 text-right w-36">ยอดสุทธิเข้าบัญชี</th>
                <th className="p-3 text-left">บัญชีปลายทาง / Batch Ref</th>
                <th className="p-3 text-center w-32">สถานะกระทบยอด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums">
              {channels.map((c, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-semibold text-slate-900">{c.channel}</td>
                  <td className="p-3 text-center text-slate-600">{c.count}</td>
                  <td className="p-3 text-right font-bold text-slate-900">{formatTHB(c.grossAmount)}</td>
                  <td className="p-3 text-right text-rose-600 font-medium">{c.fee > 0 ? `-${formatTHB(c.fee)}` : "-"}</td>
                  <td className="p-3 text-right font-bold text-teal-700">{formatTHB(c.netDeposited)}</td>
                  <td className="p-3 text-slate-500 text-[11px]">{c.bankAccount}</td>
                  <td className="p-3 text-center">
                    <button
                      type="button"
                      onClick={() => toggleReconcile(idx)}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-all ${
                        c.reconciled
                          ? "bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100"
                          : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                      }`}
                    >
                      {c.reconciled ? <Check className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                      <span>{c.reconciled ? "กระทบยอดแล้ว" : "รอยืนยันยอด"}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50/90 tabular-nums font-bold text-slate-900 border-t border-slate-200">
              <tr>
                <td className="p-3 font-bold">รวมยอดประจำวันทั้งหมด:</td>
                <td className="p-3 text-center">{totals.totalTransactions}</td>
                <td className="p-3 text-right text-sm">{formatTHB(totals.gross)}</td>
                <td className="p-3 text-right text-rose-600">-{formatTHB(totals.fees)}</td>
                <td className="p-3 text-right text-sm text-teal-700">{formatTHB(totals.net)}</td>
                <td colSpan={2} className="p-3 text-slate-400 font-normal text-[11px]">ยอดตรงกับ Statement ธนาคารเรียบร้อย</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}
