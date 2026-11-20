"use client";

import React, { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Printer, FileText, CheckCircle2, ShieldAlert } from "lucide-react";
import { formatTHB, formatDateThai } from "@/lib/utils";

interface ThermalSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: {
    id?: string;
    trackingCode: string;
    createdAt?: Date | string;
    branch?: {
      name: string;
      phone?: string | null;
      address?: string | null;
      taxId?: string | null;
    } | null;
    customer?: {
      name: string;
      phone: string;
      address?: string | null;
      lineId?: string | null;
    } | null;
    deviceBrand: string;
    deviceModel: string;
    deviceColor?: string | null;
    serialIMEI?: string | null;
    passcode?: string | null;
    patternLock?: string | null;
    hasPasscode?: boolean;
    hasPatternLock?: boolean;
    issueDescription: string;
    preCheckData?: string | null;
    laborFee?: number;
    estimatedCost?: number;
    estimatedFinish?: Date | string | null;
    customerSignature?: string | null;
  } | null;
}

export function ThermalSlipModal({
  isOpen,
  onClose,
  job,
}: ThermalSlipModalProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [printFormat, setPrintFormat] = useState<"A4" | "80mm" | "58mm">("80mm");
  const printRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setQrCodeDataUrl("");
    if (isOpen && job?.id) {
      let cancelled = false;
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      fetch(`/api/repairs/${encodeURIComponent(job.id)}/tracking-token`, { method: "POST" })
        .then(async (response) => {
          if (!response.ok) throw new Error("ไม่สามารถสร้าง QR ติดตามได้");
          const { token } = await response.json();
          return QRCode.toDataURL(`${origin}/track/${token}`, {
            width: 160,
            margin: 1,
            color: {
              dark: "#000000",
              light: "#ffffff",
            },
          });
        })
        .then((url) => {
          if (!cancelled) setQrCodeDataUrl(url);
        })
        .catch((err) => {
          console.error("Error generating QR code:", err);
          // Fallback to direct tracking code QR
          if (!cancelled && job.trackingCode) {
            QRCode.toDataURL(`${origin}/track/${job.trackingCode}`, { width: 160, margin: 1 })
              .then((fallbackUrl) => {
                if (!cancelled) setQrCodeDataUrl(fallbackUrl);
              })
              .catch(console.error);
          }
        });
      return () => {
        cancelled = true;
      };
    }
  }, [job?.id, isOpen, job?.trackingCode]);

  if (!job) return null;

  const handlePrint = () => {
    document.body.classList.add("printing-slip");
    window.print();
    setTimeout(() => document.body.classList.remove("printing-slip"), 1000);
  };

  let preCheckParsed: Record<string, string> = {};
  if (job.preCheckData) {
    if (typeof job.preCheckData === "string") {
      try {
        preCheckParsed = JSON.parse(job.preCheckData);
      } catch {
        preCheckParsed = {};
      }
    } else {
      preCheckParsed = job.preCheckData;
    }
  }

  const hasDeviceLock =
    job.passcode || job.patternLock || job.hasPasscode || job.hasPatternLock;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`w-full max-h-[92vh] overflow-y-auto p-0 ${
          printFormat === "A4" ? "max-w-5xl" : "max-w-md"
        }`}
      >
        <DialogHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Printer className="w-4 h-4 text-blue-600" />
            <span>พิมพ์ใบรับซ่อมเครื่อง (Repair Intake Slip)</span>
          </DialogTitle>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-xs no-print">
              <button
                type="button"
                onClick={() => setPrintFormat("A4")}
                className={`px-2.5 py-1 rounded font-medium transition-all ${
                  printFormat === "A4"
                    ? "bg-white text-slate-900 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                A4 มาตรฐาน
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat("80mm")}
                className={`px-2.5 py-1 rounded font-medium transition-all ${
                  printFormat === "80mm"
                    ? "bg-white text-slate-900 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                สลิป 80mm
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat("58mm")}
                className={`px-2.5 py-1 rounded font-medium transition-all ${
                  printFormat === "58mm"
                    ? "bg-white text-slate-900 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                สลิป 58mm
              </button>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handlePrint}
              className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์เอกสาร ({printFormat})</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Content Box */}
        <div className="p-4 sm:p-6 bg-slate-100 flex justify-center">
          {printFormat === "A4" ? (
            /* ==================================================== */
            /* A4 FORMAL REPAIR INTAKE SLIP                        */
            /* ==================================================== */
            <div
              ref={printRef}
              id="printable-receipt"
              className="w-[794px] min-h-[1050px] bg-white text-slate-900 p-10 font-sans text-xs leading-relaxed shadow-lg border border-slate-300 space-y-5"
              style={{
                fontFamily: "'Sarabun', 'Noto Sans Thai', 'Segoe UI', Tahoma, sans-serif",
              }}
            >
              {/* Header */}
              <div className="flex justify-between items-start pb-4 border-b-2 border-slate-900">
                <div>
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                    {job.branch?.name || "FixMe Service Center"}
                  </h1>
                  {job.branch?.address && (
                    <p className="text-slate-600 mt-1 max-w-md">
                      {job.branch.address}
                    </p>
                  )}
                  <p className="text-slate-600">
                    โทร: {job.branch?.phone || "-"} • เลขประจำตัวผู้เสียภาษี:{" "}
                    {job.branch?.taxId || "-"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-900 font-bold rounded text-sm uppercase mb-1">
                    ใบรับซ่อมอุปกรณ์ / Repair Ticket
                  </span>
                  <div className="font-mono text-sm font-black text-slate-900">
                    เลขที่: {job.trackingCode}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    วันที่รับเครื่อง: {formatDateThai(job.createdAt || new Date())}
                  </div>
                </div>
              </div>

              {/* Customer & Device Information */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
                <div className="space-y-1.5">
                  <div className="font-bold text-slate-900 text-sm border-b border-slate-200 pb-1">
                    ข้อมูลลูกค้า (Customer Information)
                  </div>
                  <div>
                    ชื่อ-นามสกุล: <span className="font-semibold text-slate-900">{job.customer?.name}</span>
                  </div>
                  <div>
                    เบอร์โทรศัพท์: <span className="font-semibold font-mono text-slate-900">{job.customer?.phone}</span>
                  </div>
                  {job.customer?.lineId && (
                    <div>LINE ID: <span className="font-semibold">{job.customer.lineId}</span></div>
                  )}
                  {job.customer?.address && (
                    <div className="text-slate-600">ที่อยู่: {job.customer.address}</div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="font-bold text-slate-900 text-sm border-b border-slate-200 pb-1">
                    ข้อมูลอุปกรณ์ (Device Information)
                  </div>
                  <div>
                    ยี่ห้อ/รุ่น:{" "}
                    <span className="font-semibold text-slate-900">
                      {job.deviceBrand} {job.deviceModel}
                    </span>{" "}
                    {job.deviceColor && <span>({job.deviceColor})</span>}
                  </div>
                  <div>
                    IMEI / Serial No:{" "}
                    <span className="font-mono font-semibold text-slate-900">
                      {job.serialIMEI || "ไม่ได้ระบุ"}
                    </span>
                  </div>
                  <div>
                    รหัสผ่านปลดล็อก:{" "}
                    <span className="font-semibold">
                      {hasDeviceLock ? "มีรหัสล็อกเครื่อง (แจ้งพนักงานแล้ว)" : "ไม่มีรหัส"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Reported Issue & Pre-check Matrix */}
              <div className="space-y-3">
                <div className="p-3.5 rounded-lg border border-slate-200 bg-white">
                  <div className="font-bold text-slate-800 text-xs mb-1">
                    อาการเสียที่แจ้งซ่อม (Reported Symptoms):
                  </div>
                  <p className="text-slate-900 bg-slate-50 p-2.5 rounded border border-slate-200 font-medium">
                    {job.issueDescription}
                  </p>
                </div>

                {Object.keys(preCheckParsed).length > 0 && (
                  <div className="p-3.5 rounded-lg border border-slate-200 bg-white">
                    <div className="font-bold text-slate-800 text-xs mb-2">
                      ผลการตรวจเช็คสภาพเครื่องก่อนซ่อม (Pre-check Inspection Matrix):
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-[11px]">
                      {Object.entries(preCheckParsed).map(([item, result]) => {
                        const isPass =
                          String(result).toLowerCase().includes("pass") ||
                          String(result).toLowerCase().includes("ปกติ") ||
                          String(result).toLowerCase().includes("ดี");
                        const isFail =
                          String(result).toLowerCase().includes("fail") ||
                          String(result).toLowerCase().includes("เสีย") ||
                          String(result).toLowerCase().includes("แตก");
                        return (
                          <div
                            key={item}
                            className={`p-1.5 rounded border flex items-center justify-between ${
                              isPass
                                ? "bg-emerald-50/60 border-emerald-200 text-emerald-900"
                                : isFail
                                ? "bg-rose-50/60 border-rose-200 text-rose-900"
                                : "bg-slate-50 border-slate-200 text-slate-800"
                            }`}
                          >
                            <span className="font-medium truncate mr-1">{item}</span>
                            <span className="font-bold font-mono text-[10px] uppercase">
                              {String(result)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Cost & Estimates */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-blue-50/40 border border-blue-200">
                <div>
                  <div className="text-[11px] text-slate-600">ราคาประเมินเบื้องต้น:</div>
                  <div className="text-xl font-black text-blue-700 mt-0.5">
                    {formatTHB(job.estimatedCost || job.laborFee || 0)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    * ราคาอาจมีการเปลี่ยนแปลงหากพบอาการเสียเพิ่มเติม โดยช่างจะแจ้งให้ลูกค้าอนุมัติก่อนดำเนินการ
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-slate-600">กำหนดเสร็จโดยประมาณ:</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {job.estimatedFinish ? formatDateThai(job.estimatedFinish) : "เจ้าหน้าที่จะแจ้งให้ทราบ"}
                  </div>
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 text-[10.5px] text-slate-600 space-y-1 leading-snug">
                <div className="font-bold text-slate-800 mb-1">ข้อตกลงและเงื่อนไขการรับซ่อม:</div>
                <p>1. โปรดนำใบรับซ่อมฉบับนี้ หรือแสดงรหัสติดตามงานซ่อมเมื่อมาติดต่อรับเครื่อง</p>
                <p>2. ทางร้านขอสงวนสิทธิ์ไม่รับผิดชอบต่อการสูญหายของข้อมูลทุกกรณี ลูกค้าควรสำรองข้อมูลก่อนส่งซ่อม</p>
                <p>3. เครื่องซ่อมเสร็จกรุณามารับเครื่องภายใน 90 วัน หากเกินกำหนดทางร้านขอสงวนสิทธิ์ในการจัดการตามดุลยพินิจเพื่อชดเชยค่าบริการ</p>
              </div>

              {/* Signatures & Tracking QR */}
              <div className="grid grid-cols-3 gap-6 pt-4 items-end border-t border-slate-200">
                <div className="flex flex-col items-center text-center">
                  {qrCodeDataUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={qrCodeDataUrl}
                      alt="Tracking QR"
                      className="w-24 h-24 border border-slate-300 p-1 bg-white"
                    />
                  ) : (
                    <div className="w-24 h-24 border border-slate-300 flex items-center justify-center font-mono text-[10px] text-slate-400">
                      QR CODE
                    </div>
                  )}
                  <span className="text-[9.5px] text-slate-500 mt-1">
                    สแกน QR เพื่อติดตามสถานะซ่อม
                  </span>
                </div>

                <div className="flex flex-col items-center text-center">
                  <div className="h-14 flex items-end">
                    <span className="text-slate-400 text-xs italic">(เจ้าหน้าที่รับเครื่อง)</span>
                  </div>
                  <div className="w-full border-t border-slate-400 mt-1 pt-1 text-[11px] text-slate-700 font-medium">
                    ผู้รับเครื่อง / พนักงาน
                  </div>
                </div>

                <div className="flex flex-col items-center text-center">
                  <div className="h-14 flex items-end">
                    {job.customerSignature ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={job.customerSignature}
                        alt="Customer Signature"
                        className="h-12 max-w-full"
                      />
                    ) : (
                      <span className="text-slate-400 text-xs italic">(ลงชื่อเมื่อส่งเครื่อง)</span>
                    )}
                  </div>
                  <div className="w-full border-t border-slate-400 mt-1 pt-1 text-[11px] text-slate-700 font-medium">
                    ลูกค้าผู้ส่งซ่อม
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ==================================================== */
            /* 80mm & 58mm THERMAL RECEIPT SLIP                    */
            /* ==================================================== */
            <div
              ref={printRef}
              id="printable-receipt"
              className={`${
                printFormat === "58mm" ? "w-[230px] text-[10px]" : "w-[300px] text-[11px]"
              } bg-white text-black p-3.5 shadow-md border border-slate-300 rounded-sm leading-normal`}
              style={{
                fontFamily: "'Sarabun', 'Noto Sans Thai', 'Segoe UI', Tahoma, sans-serif",
              }}
            >
              {/* Store Header */}
              <div className="text-center pb-2 border-b border-dashed border-black">
                <h2 className={`font-bold tracking-tight ${printFormat === "58mm" ? "text-xs" : "text-sm"}`}>
                  {job.branch?.name || "FixMe Service Center"}
                </h2>
                {job.branch?.address && (
                  <p className="text-[9.5px] text-gray-700 mt-0.5">
                    {job.branch.address}
                  </p>
                )}
                {job.branch?.phone && (
                  <p className="text-[9.5px] text-gray-700">
                    โทร: {job.branch.phone}
                  </p>
                )}
                {job.branch?.taxId && (
                  <p className="text-[8.5px] text-gray-600">
                    เลขประจำตัวผู้เสียภาษี: {job.branch.taxId}
                  </p>
                )}
                <div className="mt-1 font-bold text-[11px] uppercase bg-black text-white py-0.5 px-2 inline-block rounded-xs">
                  ใบรับซ่อมอุปกรณ์ / REPAIR TICKET
                </div>
              </div>

              {/* Tracking Code & QR Code */}
              <div className="text-center py-2 border-b border-dashed border-black">
                <div className="text-[9.5px] text-gray-600">หมายเลขติดตามงานซ่อม</div>
                <div className={`font-mono font-black tracking-wider my-0.5 ${printFormat === "58mm" ? "text-sm" : "text-base"}`}>
                  {job.trackingCode}
                </div>
                {qrCodeDataUrl && (
                  <div className="flex flex-col items-center justify-center my-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrCodeDataUrl}
                      alt="Tracking QR Code"
                      className={`${printFormat === "58mm" ? "w-20 h-20" : "w-28 h-28"} border border-gray-300 p-0.5 bg-white`}
                    />
                    <span className="text-[8.5px] text-gray-600 mt-0.5 font-medium">
                      สแกน QR เพื่อติดตามสถานะซ่อม
                    </span>
                  </div>
                )}
                <div className="text-[9.5px] text-gray-600">
                  วันที่รับ: {formatDateThai(job.createdAt || new Date())}
                </div>
              </div>

              {/* Customer Details */}
              <div className="py-2 border-b border-dashed border-black space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-gray-600">ลูกค้า:</span>
                  <span className="font-bold truncate max-w-[170px]">{job.customer?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">เบอร์โทร:</span>
                  <span className="font-bold font-mono">{job.customer?.phone}</span>
                </div>
              </div>

              {/* Device Details */}
              <div className="py-2 border-b border-dashed border-black space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-gray-600">อุปกรณ์:</span>
                  <span className="font-bold truncate max-w-[170px]">
                    {job.deviceBrand} {job.deviceModel}
                  </span>
                </div>
                {job.deviceColor && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">สีเครื่อง:</span>
                    <span>{job.deviceColor}</span>
                  </div>
                )}
                {job.serialIMEI && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">IMEI/SN:</span>
                    <span className="font-mono text-[9.5px]">{job.serialIMEI}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">รหัสปลดล็อก:</span>
                  <span className="font-medium">
                    {hasDeviceLock ? "มีรหัส (แจ้งพนักงานแล้ว)" : "ไม่มีรหัส"}
                  </span>
                </div>
              </div>

              {/* Problem & Precheck */}
              <div className="py-2 border-b border-dashed border-black space-y-1">
                <div className="text-gray-600 text-[9.5px]">อาการเสียที่แจ้ง:</div>
                <div className="font-semibold bg-gray-50 p-1.5 rounded border border-gray-200">
                  {job.issueDescription}
                </div>

                {Object.keys(preCheckParsed).length > 0 && (
                  <div className="pt-1">
                    <div className="text-[9px] text-gray-600 font-bold mb-0.5">
                      ตรวจเช็คเบื้องต้น:
                    </div>
                    <div className="text-[8.5px] text-gray-700 grid grid-cols-2 gap-x-1 gap-y-0.5">
                      {Object.entries(preCheckParsed).slice(0, 8).map(([k, v]) => (
                        <div key={k} className="truncate">
                          • {k}: <span className="font-semibold">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Cost & Estimates */}
              <div className="py-2 border-b border-dashed border-black space-y-0.5">
                <div className="flex justify-between font-bold">
                  <span>ราคาประเมินเบื้องต้น:</span>
                  <span className="text-blue-900 font-black">
                    {formatTHB(job.estimatedCost || job.laborFee || 0)}
                  </span>
                </div>
                {job.estimatedFinish && (
                  <div className="flex justify-between text-[9px] text-gray-600">
                    <span>นัดรับประมาณ:</span>
                    <span>{formatDateThai(job.estimatedFinish)}</span>
                  </div>
                )}
              </div>

              {/* Terms & Signature */}
              <div className="pt-2 text-[8.5px] text-gray-600 text-center space-y-1.5">
                <p className="leading-tight">
                  * โปรดนำสลิปนี้มาแสดงเมื่อมารับเครื่อง
                  <br />
                  * ทางร้านไม่รับผิดชอบต่อข้อมูลในเครื่องทุกกรณี
                  <br />
                  * เกิน 90 วันขอสงวนสิทธิ์จัดการตามดุลยพินิจ
                </p>

                {job.customerSignature && (
                  <div className="flex flex-col items-center pt-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={job.customerSignature}
                      alt="Customer Signature"
                      className="h-9 border-b border-gray-400"
                    />
                    <span className="text-[8px] text-gray-500 mt-0.5">
                      (ลายมือชื่อลูกค้า)
                    </span>
                  </div>
                )}

                <div className="pt-1 text-[8px] text-gray-400 font-mono">
                  FixMe OS • ขอบคุณที่ใช้บริการ
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>

      <style jsx global>{`
        @media print {
          @page {
            size: ${printFormat === "A4" ? "A4 portrait" : printFormat === "58mm" ? "58mm auto" : "80mm auto"};
            margin: ${printFormat === "A4" ? "8mm" : "0"};
          }
          body * {
            visibility: hidden !important;
          }
          #printable-receipt,
          #printable-receipt * {
            visibility: visible !important;
          }
          #printable-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${printFormat === "A4" ? "100%" : printFormat === "58mm" ? "58mm" : "80mm"} !important;
            max-width: ${printFormat === "A4" ? "210mm" : printFormat === "58mm" ? "58mm" : "80mm"} !important;
            padding: ${printFormat === "A4" ? "0" : printFormat === "58mm" ? "2.5mm" : "4mm"} !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>
    </Dialog>
  );
}