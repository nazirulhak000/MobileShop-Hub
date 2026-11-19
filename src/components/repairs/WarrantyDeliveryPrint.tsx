"use client";

import React, { useRef, useState, useEffect } from "react";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Printer, ShieldCheck, FileText } from "lucide-react";
import { formatTHB, formatDateThai } from "@/lib/utils";

interface WarrantyDeliveryPrintProps {
  isOpen: boolean;
  onClose: () => void;
  job: any;
}

export function WarrantyDeliveryPrint({
  isOpen,
  onClose,
  job,
}: WarrantyDeliveryPrintProps) {
  const [printFormat, setPrintFormat] = useState<"A4" | "80mm">("A4");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  useEffect(() => {
    if (job?.trackingCode) {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      QRCode.toDataURL(`${origin}/track/${job.trackingCode}`, {
        width: 140,
        margin: 1,
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch(console.error);
    }
  }, [job?.trackingCode]);

  if (!job) return null;

  const handlePrint = () => {
    window.print();
  };

  const partsTotal =
    job.partUsages?.reduce(
      (sum: number, p: any) => sum + p.sellPrice * p.quantity,
      0
    ) || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            พิมพ์ใบส่งมอบเครื่อง & ใบรับประกันงานซ่อม (Delivery Slip & Warranty)
          </DialogTitle>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setPrintFormat("A4")}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  printFormat === "A4"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                ขนาด A4 (แบบมาตรฐาน)
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat("80mm")}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  printFormat === "80mm"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                ขนาด 80mm (สลิปความร้อน)
              </button>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handlePrint}
              className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์เอกสาร</span>
            </Button>
          </div>
        </DialogHeader>

        <div className="p-6 bg-slate-100 flex justify-center">
          {printFormat === "A4" ? (
            /* A4 Formal Delivery Slip & Warranty Certificate */
            <div
              id="print-document"
              className="w-[794px] min-h-[1050px] bg-white text-slate-900 p-10 font-sans text-xs leading-relaxed shadow-lg border border-slate-300 space-y-6"
            >
              {/* Header */}
              <div className="flex justify-between items-start pb-4 border-b-2 border-slate-900">
                <div>
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                    {job.branch?.name || "MobileShop-Hub Service Center"}
                  </h1>
                  <p className="text-slate-600 mt-1 max-w-md">
                    {job.branch?.address}
                  </p>
                  <p className="text-slate-600">
                    โทร: {job.branch?.phone || "-"} • เลขประจำตัวผู้เสียภาษี:{" "}
                    {job.branch?.taxId || "0105561234567"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 font-bold rounded text-sm uppercase mb-1">
                    ใบส่งมอบเครื่อง & ใบรับประกัน
                  </span>
                  <div className="font-mono text-sm font-black text-slate-800">
                    เลขที่: {job.trackingCode}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    วันที่ส่งมอบ: {formatDateThai(job.completedAt || new Date())}
                  </div>
                </div>
              </div>

              {/* Customer & Device Information Box */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
                <div className="space-y-1">
                  <div className="font-bold text-slate-800 text-sm">ข้อมูลลูกค้า</div>
                  <div>ชื่อ-นามสกุล: <span className="font-semibold">{job.customer?.name}</span></div>
                  <div>เบอร์โทรศัพท์: <span className="font-semibold">{job.customer?.phone}</span></div>
                  {job.customer?.address && <div>ที่อยู่: {job.customer.address}</div>}
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-slate-800 text-sm">ข้อมูลอุปกรณ์</div>
                  <div>
                    ยี่ห้อ/รุ่น:{" "}
                    <span className="font-semibold">
                      {job.deviceBrand} {job.deviceModel}
                    </span>{" "}
                    ({job.deviceColor || "-"})
                  </div>
                  <div>
                    IMEI / Serial No:{" "}
                    <span className="font-mono font-semibold">{job.serialIMEI || "-"}</span>
                  </div>
                  <div>
                    ช่างผู้รับผิดชอบ:{" "}
                    <span className="font-semibold">{job.technician?.name || "ช่างประจำสาขา"}</span>
                  </div>
                </div>
              </div>

              {/* Repair & Spare Parts Table */}
              <div>
                <h3 className="font-bold text-sm text-slate-900 mb-2">
                  รายละเอียดการซ่อมและการเปลี่ยนอะไหล่
                </h3>
                <table className="w-full text-left border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="p-2 border border-slate-200 w-12 text-center">ลำดับ</th>
                      <th className="p-2 border border-slate-200">รายการ / อะไหล่ที่เปลี่ยน</th>
                      <th className="p-2 border border-slate-200 w-20 text-center">จำนวน</th>
                      <th className="p-2 border border-slate-200 w-28 text-right">ราคาต่อหน่วย</th>
                      <th className="p-2 border border-slate-200 w-28 text-right">จำนวนเงิน</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 border border-slate-200 text-center">1</td>
                      <td className="p-2 border border-slate-200">
                        <div className="font-semibold">ค่าบริการตรวจเช็คและค่าแรงช่าง</div>
                        <div className="text-[11px] text-slate-500">
                          อาการซ่อม: {job.issueDescription}
                        </div>
                      </td>
                      <td className="p-2 border border-slate-200 text-center">1</td>
                      <td className="p-2 border border-slate-200 text-right">
                        {formatTHB(job.laborFee)}
                      </td>
                      <td className="p-2 border border-slate-200 text-right">
                        {formatTHB(job.laborFee)}
                      </td>
                    </tr>
                    {job.partUsages?.map((part: any, index: number) => (
                      <tr key={part.id}>
                        <td className="p-2 border border-slate-200 text-center">
                          {index + 2}
                        </td>
                        <td className="p-2 border border-slate-200">
                          <div className="font-semibold">{part.product?.name || "อะไหล่"}</div>
                          <div className="font-mono text-[10px] text-slate-400">
                            รหัส: {part.product?.code}
                          </div>
                        </td>
                        <td className="p-2 border border-slate-200 text-center">
                          {part.quantity}
                        </td>
                        <td className="p-2 border border-slate-200 text-right">
                          {formatTHB(part.sellPrice)}
                        </td>
                        <td className="p-2 border border-slate-200 text-right">
                          {formatTHB(part.sellPrice * part.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-bold">
                      <td colSpan={4} className="p-2 border border-slate-200 text-right">
                        ยอดรวมทั้งสิ้น (Total Net Amount):
                      </td>
                      <td className="p-2 border border-slate-200 text-right text-sm text-blue-700">
                        {formatTHB(job.totalCost || job.laborFee + partsTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Warranty Certificate Terms Box */}
              <div className="p-4 rounded-lg border-2 border-emerald-500/40 bg-emerald-50/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-emerald-900 text-sm flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    เงื่อนไขการรับประกันงานซ่อม ({job.warrantyDays || 90} วัน)
                  </div>
                  <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                    ระยะเวลารับประกัน {job.warrantyDays || 90} วัน นับจากวันที่ส่งมอบ
                  </span>
                </div>
                <ul className="list-disc pl-5 text-[11px] text-slate-700 space-y-1">
                  <li>รับประกันเฉพาะชิ้นส่วนอะไหล่ที่เปลี่ยนและอาการเสียเดิมตามที่ระบุในเอกสารนี้เท่านั้น</li>
                  <li>
                    <strong>สิ้นสุดการรับประกันทันทีหาก:</strong> มีรอยตกกระแทก, โดนน้ำหรือความชื้น, สติ๊กเกอร์วอยด์รับประกันฉีกขาด, หรือมีการแกะซ่อมจากที่อื่น
                  </li>
                  <li>ในการเคลมประกัน ลูกค้าจะต้องนำใบรับประกันนี้พร้อมตัวเครื่องมาแสดงที่ร้านทุกครั้ง</li>
                </ul>
              </div>

              {/* Signatures & QR Section */}
              <div className="grid grid-cols-3 gap-6 pt-6 items-end">
                <div className="flex flex-col items-center text-center">
                  {qrCodeDataUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={qrCodeDataUrl}
                      alt="Verify QR"
                      className="w-24 h-24 border p-1"
                    />
                  )}
                  <span className="text-[10px] text-slate-400 mt-1">
                    สแกนตรวจสอบประวัติงานซ่อม
                  </span>
                </div>

                <div className="flex flex-col items-center text-center">
                  <div className="h-16 flex items-end">
                    <span className="font-semibold text-slate-700">
                      {job.technician?.name || "ช่างเทคนิคผู้ตรวจรับ"}
                    </span>
                  </div>
                  <div className="w-full border-t border-slate-400 mt-1 pt-1 text-[11px] text-slate-600">
                    ผู้ส่งมอบ / ช่างเทคนิค
                  </div>
                </div>

                <div className="flex flex-col items-center text-center">
                  <div className="h-16 flex items-end">
                    {job.customerSignature ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={job.customerSignature}
                        alt="Customer Signature"
                        className="h-14"
                      />
                    ) : (
                      <span className="text-slate-400 text-xs italic">
                        (เซ็นรับเครื่องแล้ว)
                      </span>
                    )}
                  </div>
                  <div className="w-full border-t border-slate-400 mt-1 pt-1 text-[11px] text-slate-600">
                    ผู้รับเครื่อง / ลูกค้า
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* 80mm Thermal Delivery Slip */
            <div
              id="print-document"
              className="w-[300px] bg-white text-black p-4 font-mono text-[11px] leading-tight shadow-md border border-slate-300 rounded-sm"
            >
              <div className="text-center pb-2 border-b border-dashed border-black">
                <h2 className="text-sm font-bold">
                  {job.branch?.name || "MobileShop-Hub Service"}
                </h2>
                <div className="mt-1 font-bold text-xs uppercase bg-black text-white py-0.5 px-2 inline-block rounded-xs">
                  ใบส่งมอบเครื่อง & ใบรับประกัน
                </div>
              </div>

              <div className="text-center py-2 border-b border-dashed border-black">
                <div className="text-base font-black">{job.trackingCode}</div>
                <div className="text-[10px]">
                  ส่งมอบ: {formatDateThai(job.completedAt || new Date())}
                </div>
                <div className="text-xs font-bold text-emerald-700 mt-1">
                  ★ รับประกัน {job.warrantyDays || 90} วัน ★
                </div>
              </div>

              <div className="py-2 border-b border-dashed border-black space-y-0.5 text-[10.5px]">
                <div>ลูกค้า: {job.customer?.name} ({job.customer?.phone})</div>
                <div>เครื่อง: {job.deviceBrand} {job.deviceModel}</div>
                <div>IMEI: {job.serialIMEI || "-"}</div>
                <div>ช่างซ่อม: {job.technician?.name || "-"}</div>
              </div>

              <div className="py-2 border-b border-dashed border-black space-y-1">
                <div className="font-semibold text-xs">รายการชำระ:</div>
                <div className="flex justify-between">
                  <span>ค่าแรงบริการ</span>
                  <span>{formatTHB(job.laborFee)}</span>
                </div>
                {job.partUsages?.map((part: any) => (
                  <div key={part.id} className="flex justify-between text-[10px]">
                    <span className="truncate max-w-[190px]">
                      {part.product?.name} x{part.quantity}
                    </span>
                    <span>{formatTHB(part.sellPrice * part.quantity)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-300">
                  <span>ยอดชำระสุทธิ</span>
                  <span>{formatTHB(job.totalCost || job.laborFee + partsTotal)}</span>
                </div>
              </div>

              <div className="pt-2 text-[9px] text-gray-600 text-center space-y-1">
                <p>
                  * ประกัน {job.warrantyDays || 90} วันเฉพาะจุดที่ซ่อม
                  <br />
                  * สิ้นสุดประกันหากตกน้ำ ตกกระแทก หรือแกะเครื่อง
                </p>
                {qrCodeDataUrl && (
                  <div className="flex justify-center pt-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrCodeDataUrl} alt="QR" className="w-20 h-20" />
                  </div>
                )}
                <div className="text-[8px] text-gray-400 pt-1">
                  MobileShop-Hub • ขอบคุณที่วางใจใช้บริการ
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-document,
          #print-document * {
            visibility: visible;
          }
          #print-document {
            position: absolute;
            left: 0;
            top: 0;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </Dialog>
  );
}
