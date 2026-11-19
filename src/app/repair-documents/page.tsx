"use client";

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import {
  FileText,
  Printer,
  Search,
  ShieldCheck,
  Tag,
  CheckCircle2,
  ExternalLink,
  Smartphone,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { ThermalSlipModal } from "@/components/repairs/ThermalSlipModal";
import { WarrantyDeliveryPrint } from "@/components/repairs/WarrantyDeliveryPrint";
import { formatTHB, formatDateThai } from "@/lib/utils";

export default function RepairDocumentsHubPage() {
  const [repairs, setRepairs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modals
  const [slipJob, setSlipJob] = useState<any | null>(null);
  const [warrantyJob, setWarrantyJob] = useState<any | null>(null);
  const [stickerJob, setStickerJob] = useState<any | null>(null);
  const [barcodeDataUrl, setBarcodeDataUrl] = useState<string>("");

  const fetchRepairs = async () => {
    try {
      const res = await fetch("/api/repairs");
      const json = await res.json();
      if (json.success) {
        setRepairs(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepairs();
  }, []);

  const handleOpenSticker = (job: any) => {
    setStickerJob(job);
    QRCode.toDataURL(job.trackingCode, { width: 120, margin: 1 })
      .then(setBarcodeDataUrl)
      .catch(console.error);
  };

  const filtered = repairs.filter((r) => {
    const s = search.toLowerCase();
    return (
      !s ||
      r.trackingCode.toLowerCase().includes(s) ||
      r.customer?.name.toLowerCase().includes(s) ||
      r.customer?.phone.includes(s) ||
      r.serialIMEI?.includes(s) ||
      r.deviceModel.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            <span>ศูนย์พิมพ์เอกสารงานซ่อม (Repair Document Hub)</span>
          </h1>
          <p className="text-sm text-slate-500">
            พิมพ์ซ้ำใบรับเครื่อง สลิปความร้อน 80mm ใบส่งมอบ ใบรับประกัน และฉลากสติ๊กเกอร์ติดเครื่อง
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="ค้นหาด้วยรหัสติดตาม (REP-...), ชื่อลูกค้า, เบอร์โทรศัพท์ หรือ IMEI..."
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
                <th className="py-3 px-4">รหัสติดตาม / วันที่</th>
                <th className="py-3 px-4">ลูกค้า & เบอร์ติดต่อ</th>
                <th className="py-3 px-4">อุปกรณ์ / อาการ</th>
                <th className="py-3 px-4">สถานะ</th>
                <th className="py-3 px-4 text-center">เอกสารที่สามารถพิมพ์ได้</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    กำลังโหลดรายการงานซ่อม...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    ไม่พบรายการงานซ่อม
                  </td>
                </tr>
              ) : (
                filtered.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-blue-700">{job.trackingCode}</div>
                      <div className="text-[11px] text-slate-400">{formatDateThai(job.createdAt)}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{job.customer?.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{job.customer?.phone}</div>
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-slate-900 truncate">
                        {job.deviceBrand} {job.deviceModel}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">{job.issueDescription}</div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-semibold px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-700">
                        {job.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSlipJob(job)}
                          className="text-xs h-7 px-2 gap-1 text-slate-700"
                          title="พิมพ์สลิปใบรับเครื่อง 80mm"
                        >
                          <Printer className="w-3.5 h-3.5 text-blue-600" />
                          <span>สลิป 80mm</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setWarrantyJob(job)}
                          className="text-xs h-7 px-2 gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                          title="พิมพ์ใบรับประกันและใบส่งมอบ A4"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>ใบรับประกัน A4</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenSticker(job)}
                          className="text-xs h-7 px-2 gap-1 text-purple-700 border-purple-200 hover:bg-purple-50"
                          title="พิมพ์สติ๊กเกอร์บาร์โค้ดติดเครื่อง"
                        >
                          <Tag className="w-3.5 h-3.5 text-purple-600" />
                          <span>สติ๊กเกอร์ติดเครื่อง</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Slip Modal */}
      {slipJob && (
        <ThermalSlipModal isOpen={!!slipJob} onClose={() => setSlipJob(null)} job={slipJob} />
      )}

      {/* Warranty Modal */}
      {warrantyJob && (
        <WarrantyDeliveryPrint isOpen={!!warrantyJob} onClose={() => setWarrantyJob(null)} job={warrantyJob} />
      )}

      {/* Device Sticker Modal */}
      {stickerJob && (
        <Dialog open={!!stickerJob} onOpenChange={() => setStickerJob(null)}>
          <DialogContent className="max-w-sm p-0">
            <DialogHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Tag className="w-4 h-4 text-purple-600" />
                <span>ตัวอย่างสติ๊กเกอร์ติดเครื่อง (80mm)</span>
              </DialogTitle>
              <Button size="sm" onClick={() => window.print()} className="h-7 text-xs bg-purple-600 text-white">
                พิมพ์
              </Button>
            </DialogHeader>

            <div className="p-6 bg-slate-100 flex justify-center">
              <div
                id="sticker-print"
                className="w-[240px] bg-white text-black p-3 rounded border border-slate-300 font-mono text-center shadow-xs space-y-1.5 text-xs"
              >
                <div className="font-black text-sm">{stickerJob.trackingCode}</div>
                <div className="text-[11px] font-bold">
                  {stickerJob.deviceBrand} {stickerJob.deviceModel}
                </div>
                <div className="text-[10px] text-gray-700 truncate">
                  ลูกค้า: {stickerJob.customer?.name} ({stickerJob.customer?.phone})
                </div>
                <div className="text-[10px] text-gray-700">
                  รหัสปลดล็อค: {stickerJob.passcode || stickerJob.patternLock || "ไม่มี"}
                </div>
                {barcodeDataUrl && (
                  <div className="flex justify-center pt-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={barcodeDataUrl} alt="QR" className="w-20 h-20" />
                  </div>
                )}
                <div className="text-[9px] text-gray-500 pt-1">MobileShop-Hub Service</div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
