"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Search,
  Printer,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Calendar,
  Send,
  Download,
  DollarSign,
  ChevronRight,
  Eye,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { formatTHB, formatDateThai } from "@/lib/utils";

interface B2BInvoice {
  id: string;
  invoiceNo: string;
  companyName: string;
  taxId: string;
  address: string;
  poNumber: string;
  issueDate: string;
  dueDate: string;
  status: "DRAFT" | "SENT" | "PAID" | "OVERDUE";
  items: Array<{ name: string; qty: number; unitPrice: number; total: number }>;
  subtotal: number;
  vatAmount: number;
  grandTotal: number;
}

export default function InvoicesPage() {
  const { currentBranch } = useApp();
  const [invoices, setInvoices] = useState<B2BInvoice[]>([
    {
      id: "INV-B2B-202611-001",
      invoiceNo: "B2B-202611-0001",
      companyName: "บริษัท สยามเทคโนโลยี ซิสเต็มส์ จำกัด",
      taxId: "0105559012345",
      address: "159 อาคารเสริมมิตรทาวเวอร์ ชั้น 18 ถนนสุขุมวิท 21 คลองเตยเหนือ วัฒนา กทม. 10110",
      poNumber: "PO-STS-2026-902",
      issueDate: "2026-11-01",
      dueDate: "2026-11-30",
      status: "SENT",
      items: [
        { name: "iPhone 14 Pro 256GB (เครื่องล็อตองค์กร พร้อมประกัน)", qty: 5, unitPrice: 23900, total: 119500 },
        { name: "หัวชาร์จเร็ว Anker 30W Nano II PD Fast Charger", qty: 5, unitPrice: 690, total: 3450 },
      ],
      subtotal: 122950,
      vatAmount: 8606.5,
      grandTotal: 131556.5,
    },
    {
      id: "INV-B2B-202610-002",
      invoiceNo: "B2B-202610-0042",
      companyName: "บริษัท นิวเจนเนอเรชั่น มีเดีย จำกัด",
      taxId: "0105561098765",
      address: "88 ถนนรัชดาภิเษก ห้วยขวาง กทม. 10310",
      poNumber: "PO-NGM-441",
      issueDate: "2026-10-15",
      dueDate: "2026-10-31",
      status: "PAID",
      items: [
        { name: "เปลี่ยนหน้าจอแท้ iPhone 14 Pro Max 3 เครื่อง (งานเคลมองค์กร)", qty: 3, unitPrice: 7900, total: 23700 },
        { name: "เปลี่ยนแบตเตอรี่แท้ iPhone 13 4 เครื่อง", qty: 4, unitPrice: 1500, total: 6000 },
      ],
      subtotal: 29700,
      vatAmount: 2079,
      grandTotal: 31779,
    },
    {
      id: "INV-B2B-202610-003",
      invoiceNo: "B2B-202610-0038",
      companyName: "บริษัท โลจิสติกส์ พลัส จำกัด (มหาชน)",
      taxId: "0107560001234",
      address: "123 อาคารซีดับเบิ้ลยู ทาวเวอร์ ห้วยขวาง กทม.",
      poNumber: "PO-LP-8890",
      issueDate: "2026-10-01",
      dueDate: "2026-10-25",
      status: "OVERDUE",
      items: [
        { name: "Samsung Galaxy A54 5G สำหรับพนักงานขนส่ง", qty: 10, unitPrice: 8500, total: 85000 },
      ],
      subtotal: 85000,
      vatAmount: 5950,
      grandTotal: 90950,
    },
  ]);

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState<B2BInvoice | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [newModalOpen, setNewModalOpen] = useState(false);

  // New Invoice Form
  const [newCompany, setNewCompany] = useState("");
  const [newTaxId, setNewTaxId] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newPo, setNewPo] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemPrice, setNewItemPrice] = useState(0);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (statusFilter !== "ALL" && inv.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          inv.invoiceNo.toLowerCase().includes(q) ||
          inv.companyName.toLowerCase().includes(q) ||
          inv.taxId.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [invoices, statusFilter, searchQuery]);

  const handleCreateInvoice = () => {
    if (!newCompany || !newItemName || !newItemPrice) return;
    const sub = newItemQty * newItemPrice;
    const vat = sub * 0.07;
    const grand = sub + vat;
    const count = invoices.length + 1;

    const newInv: B2BInvoice = {
      id: `INV-B2B-202611-00${count}`,
      invoiceNo: `B2B-202611-000${count}`,
      companyName: newCompany,
      taxId: newTaxId || "0105500000000",
      address: newAddress || "กรุงเทพมหานคร",
      poNumber: newPo || `PO-${Date.now().toString().slice(-4)}`,
      issueDate: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: "SENT",
      items: [{ name: newItemName, qty: newItemQty, unitPrice: newItemPrice, total: sub }],
      subtotal: sub,
      vatAmount: vat,
      grandTotal: grand,
    };

    setInvoices([newInv, ...invoices]);
    setNewModalOpen(false);
    setNewCompany("");
    setNewItemName("");
    setNewItemPrice(0);
  };

  const markAsPaid = (id: string) => {
    setInvoices(invoices.map((inv) => (inv.id === id ? { ...inv, status: "PAID" } : inv)));
    if (selectedInvoice && selectedInvoice.id === id) {
      setSelectedInvoice({ ...selectedInvoice, status: "PAID" });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              ใบกำกับภาษี & ใบแจ้งหนี้ลูกค้าองค์กร (B2B Invoices)
            </h1>
            <Badge variant="outline" className="border-blue-300 bg-blue-50/50 text-blue-700 font-medium">
              <Building2 className="mr-1 h-3 w-3 inline" />
              {currentBranch.name}
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            ออกใบแจ้งหนี้/ใบกำกับภาษีเต็มรูปสำหรับลูกค้าบริษัท เครดิตเทอม 30 วัน พร้อมติดตามสถานะการชำระเงิน
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setNewModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>สร้างใบแจ้งหนี้ B2B ใหม่</span>
        </Button>
      </div>

      {/* 4 Stat Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 space-y-1">
          <span className="text-xs font-semibold text-slate-500">ใบแจ้งหนี้ทั้งหมด</span>
          <div className="text-2xl font-bold font-mono text-slate-900">{invoices.length} ฉบับ</div>
          <div className="text-[11px] text-slate-400">มูลค่ารวม {formatTHB(invoices.reduce((a, b) => a + b.grandTotal, 0))}</div>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-xs font-semibold text-blue-700">รอรับชำระ (Pending)</span>
          <div className="text-2xl font-bold font-mono text-blue-700">
            {formatTHB(invoices.filter((i) => i.status === "SENT").reduce((a, b) => a + b.grandTotal, 0))}
          </div>
          <div className="text-[11px] text-slate-400">{invoices.filter((i) => i.status === "SENT").length} รายการอยู่ในเครดิตเทอม</div>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-xs font-semibold text-emerald-700">ชำระแล้ว (Paid)</span>
          <div className="text-2xl font-bold font-mono text-emerald-700">
            {formatTHB(invoices.filter((i) => i.status === "PAID").reduce((a, b) => a + b.grandTotal, 0))}
          </div>
          <div className="text-[11px] text-slate-400">{invoices.filter((i) => i.status === "PAID").length} รายการรับเงินเรียบร้อย</div>
        </Card>

        <Card className="p-4 space-y-1 border-rose-200 bg-rose-50/40">
          <span className="text-xs font-semibold text-rose-700">เกินกำหนดชำระ (Overdue)</span>
          <div className="text-2xl font-bold font-mono text-rose-700">
            {formatTHB(invoices.filter((i) => i.status === "OVERDUE").reduce((a, b) => a + b.grandTotal, 0))}
          </div>
          <div className="text-[11px] text-rose-600">{invoices.filter((i) => i.status === "OVERDUE").length} รายการเลยกำหนดนัดจ่าย</div>
        </Card>
      </div>

      {/* Invoices List Table */}
      <Card>
        <div className="border-b border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
              {["ALL", "SENT", "PAID", "OVERDUE"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`rounded px-2.5 py-1 ${statusFilter === st ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"}`}
                >
                  {st === "ALL" ? "ทั้งหมด" : st === "SENT" ? "รอชำระ" : st === "PAID" ? "ชำระแล้ว" : "เกินกำหนด"}
                </button>
              ))}
            </div>

            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อบริษัท, เลขที่บิล..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-3 text-left">เลขที่ใบแจ้งหนี้</th>
                <th className="py-2.5 px-3 text-left">บริษัทลูกค้า / เลขนิติบุคคล</th>
                <th className="py-2.5 px-3 text-left">PO ลูกค้า</th>
                <th className="py-2.5 px-3 text-center">วันครบกำหนด</th>
                <th className="py-2.5 px-3 text-right">ยอดรวมสุทธิ (VAT 7%)</th>
                <th className="py-2.5 px-3 text-center">สถานะ</th>
                <th className="py-2.5 px-3 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-bold text-slate-900">{inv.invoiceNo}</td>
                  <td className="py-2.5 px-3 font-sans">
                    <div className="font-semibold text-slate-800">{inv.companyName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">Tax ID: {inv.taxId}</div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{inv.poNumber}</td>
                  <td className="py-2.5 px-3 text-center text-slate-700">{inv.dueDate}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900 text-xs">
                    {formatTHB(inv.grandTotal)}
                  </td>
                  <td className="py-2.5 px-3 text-center font-sans">
                    {inv.status === "PAID" ? (
                      <Badge variant="success" className="text-[10px]">ชำระแล้ว</Badge>
                    ) : inv.status === "OVERDUE" ? (
                      <Badge variant="danger" className="text-[10px]">เกินกำหนด</Badge>
                    ) : (
                      <Badge variant="warning" className="text-[10px]">รอรับเงิน</Badge>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right font-sans">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setSelectedInvoice(inv);
                          setPreviewModalOpen(true);
                        }}
                        className="text-xs h-7 px-2 gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        <span>ดูบิล A4</span>
                      </Button>
                      {inv.status !== "PAID" && (
                        <Button
                          size="sm"
                          onClick={() => markAsPaid(inv.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-2"
                        >
                          รับชำระ
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* FULL A4 INVOICE PREVIEW MODAL */}
      <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
        <div className="max-w-2xl w-full">
          <DialogHeader>
            <DialogTitle onClose={() => setPreviewModalOpen(false)}>
              ใบแจ้งหนี้ / ใบกำกับภาษี (Invoice / Tax Invoice)
            </DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <DialogContent className="max-h-[75vh] overflow-y-auto p-6 bg-slate-50 flex justify-center">
              <div className="invoice-a4 bg-white border border-slate-300 shadow-md p-6 text-slate-900 text-xs space-y-4 rounded w-full">
                {/* Header */}
                <div className="flex justify-between items-start border-b border-slate-300 pb-4">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900">บริษัท โมบายช็อป ฮับ จำกัด</h3>
                    <p className="text-slate-500 text-xs">{currentBranch.name}</p>
                    <p className="text-slate-400 text-[10px]">เลขประจำตัวผู้เสียภาษี: 0105561234567</p>
                  </div>
                  <div className="text-right">
                    <h2 className="font-extrabold text-lg text-blue-700">ใบแจ้งหนี้ / ใบกำกับภาษี</h2>
                    <p className="text-[10px] text-slate-500 font-mono">เลขที่: {selectedInvoice.invoiceNo}</p>
                    <p className="text-[10px] text-slate-500 font-mono">วันที่ออก: {selectedInvoice.issueDate}</p>
                    <p className="text-[10px] text-rose-600 font-mono font-bold">ครบกำหนด: {selectedInvoice.dueDate}</p>
                  </div>
                </div>

                {/* Customer Box */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">ลูกค้า (Customer):</span>
                  <div className="font-bold text-sm text-slate-900">{selectedInvoice.companyName}</div>
                  <div className="font-mono text-slate-600 text-xs">เลขประจำตัวผู้เสียภาษี: {selectedInvoice.taxId}</div>
                  <div className="text-slate-500 text-xs">{selectedInvoice.address}</div>
                  <div className="text-slate-600 text-xs font-mono mt-1">PO อ้างอิง: {selectedInvoice.poNumber}</div>
                </div>

                {/* Items */}
                <table className="w-full text-xs border border-slate-200">
                  <thead className="bg-slate-100 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2 text-center w-12">#</th>
                      <th className="p-2 text-left">รายการสินค้า / บริการ</th>
                      <th className="p-2 text-center w-16">จำนวน</th>
                      <th className="p-2 text-right w-24">ราคา/หน่วย</th>
                      <th className="p-2 text-right w-28">รวมเงิน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {selectedInvoice.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-2 text-center text-slate-400">{idx + 1}</td>
                        <td className="p-2 font-sans font-semibold">{it.name}</td>
                        <td className="p-2 text-center">{it.qty}</td>
                        <td className="p-2 text-right">{formatTHB(it.unitPrice)}</td>
                        <td className="p-2 text-right font-bold">{formatTHB(it.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals */}
                <div className="flex justify-end pt-2">
                  <div className="w-64 space-y-1 font-mono text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>ยอดก่อนภาษี:</span>
                      <span>{formatTHB(selectedInvoice.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>ภาษีมูลค่าเพิ่ม 7%:</span>
                      <span>{formatTHB(selectedInvoice.vatAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-blue-700 pt-1 border-t border-slate-200">
                      <span>ยอดรวมทั้งสิ้น:</span>
                      <span>{formatTHB(selectedInvoice.grandTotal)}</span>
                    </div>
                  </div>
                </div>

                {/* Signatures */}
                <div className="pt-6 grid grid-cols-2 gap-4 text-center text-xs text-slate-500 border-t border-slate-200 mt-4">
                  <div>
                    <div className="border-b border-slate-300 w-36 mx-auto mb-1 pb-4" />
                    <div>ผู้มีอำนาจลงนาม / ผู้ออกบิล</div>
                  </div>
                  <div>
                    <div className="border-b border-slate-300 w-36 mx-auto mb-1 pb-4" />
                    <div>ผู้รับสินค้า / บริการ</div>
                  </div>
                </div>
              </div>
            </DialogContent>
          )}

          <DialogFooter className="flex justify-between">
            <Button variant="outline" size="sm" onClick={() => setPreviewModalOpen(false)}>
              ปิดหน้าต่าง
            </Button>
            <Button size="sm" onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
              <Printer className="h-4 w-4" />
              <span>พิมพ์ใบแจ้งหนี้ A4</span>
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* CREATE NEW B2B MODAL */}
      <Dialog open={newModalOpen} onOpenChange={setNewModalOpen}>
        <DialogHeader>
          <DialogTitle onClose={() => setNewModalOpen(false)}>สร้างใบแจ้งหนี้องค์กร (B2B)</DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">ชื่อบริษัท / องค์กร *</label>
            <Input placeholder="เช่น บริษัท เอสซีบี ดิจิทัล จำกัด" value={newCompany} onChange={(e) => setNewCompany(e.target.value)} className="text-xs" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">เลขประจำตัวผู้เสียภาษี (13 หลัก)</label>
              <Input placeholder="0105562000000" value={newTaxId} onChange={(e) => setNewTaxId(e.target.value)} className="font-mono text-xs" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">เลขที่ PO ลูกค้า</label>
              <Input placeholder="PO-2026-001" value={newPo} onChange={(e) => setNewPo(e.target.value)} className="font-mono text-xs" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">ที่อยู่ตามใบกำกับภาษี</label>
            <Input placeholder="เลขที่ ถนน แขวง เขต จังหวัด" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} className="text-xs" />
          </div>
          <div className="pt-2 border-t border-slate-200">
            <label className="text-xs font-semibold text-slate-700 mb-1 block">รายการสินค้า / อะไหล่ *</label>
            <Input placeholder="เช่น iPhone 15 128GB เครื่องล็อตพนักงาน" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className="text-xs" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">จำนวน</label>
              <Input type="number" min="1" value={newItemQty} onChange={(e) => setNewItemQty(parseInt(e.target.value) || 1)} className="font-mono text-xs" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">ราคา/หน่วย (ก่อน VAT)</label>
              <Input type="number" value={newItemPrice} onChange={(e) => setNewItemPrice(parseFloat(e.target.value) || 0)} className="font-mono text-xs font-bold" />
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setNewModalOpen(false)}>ยกเลิก</Button>
          <Button size="sm" onClick={handleCreateInvoice} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">ออกใบแจ้งหนี้</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
