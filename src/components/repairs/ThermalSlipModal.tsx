"use client";

import React, { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Printer, X, ExternalLink } from "lucide-react";
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
    totalCost?: number;
    depositAmount?: number;
    discount?: number;
    vatAmount?: number;
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
  const [slipWidth, setSlipWidth] = useState<"80mm" | "58mm">("80mm");
  const printRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setQrCodeDataUrl("");
    if (isOpen && job?.id) {
      let cancelled = false;
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      fetch(`/api/repairs/${encodeURIComponent(job.id)}/tracking-token`, { method: "POST" }).then(async response => {
        if (!response.ok) throw new Error("ไม่สามารถสร้าง QR ติดตามได้");
        const { token } = await response.json();
        return QRCode.toDataURL(`${origin}/track/${token}`, {
        width: 160,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      }); })
        .then((url) => { if (!cancelled) setQrCodeDataUrl(url); })
        .catch((err) => console.error("Error generating QR code:", err));
      return () => { cancelled = true; };
    }
  }, [job?.id, isOpen]);

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Printer className="w-4 h-4 text-blue-600" />
            ตัวอย่างพิมพ์ใบรับซ่อม (Thermal Slip)
          </DialogTitle>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-xs no-print">
              <button
                type="button"
                onClick={() => setSlipWidth("80mm")}
                className={`px-2 py-0.5 rounded font-medium transition-all ${
                  slipWidth === "80mm" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                80 มม.
              </button>
              <button
                type="button"
                onClick={() => setSlipWidth("58mm")}
                className={`px-2 py-0.5 rounded font-medium transition-all ${
                  slipWidth === "58mm" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                58 มม.
              </button>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handlePrint}
              className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์สลิป ({slipWidth})</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Thermal Slip Content */}
        <div className="p-4 bg-slate-100 flex justify-center">
          <div
            ref={printRef}
            id="thermal-receipt"
            className={`${
              slipWidth === "58mm" ? "thermal-58mm" : "thermal-80mm"
            } w-[300px] bg-white text-black p-4 font-mono text-[11px] leading-tight shadow-md border border-slate-300 rounded-sm`}
          >
            {/* Store Header */}
            <div className="text-center pb-2 border-b border-dashed border-black">
              <h2 className="text-sm font-bold tracking-tight">
                {job.branch?.name || "FixMe Service Center"}
              </h2>
              {job.branch?.address && (
                <p className="text-[10px] text-gray-700 mt-0.5">
                  {job.branch.address}
                </p>
              )}
              {job.branch?.phone && (
                <p className="text-[10px] text-gray-700">
                  โทร: {job.branch.phone}
                </p>
              )}
              {job.branch?.taxId && (
                <p className="text-[9px] text-gray-500">
                  เลขประจำตัวผู้เสียภาษี: {job.branch.taxId}
                </p>
              )}
              <div className="mt-1 font-bold text-xs uppercase bg-black text-white py-0.5 px-2 inline-block rounded-xs">
                ใบรับซ่อมอุปกรณ์ / Repair Ticket
              </div>
            </div>

            {/* Tracking Code & QR Code */}
            <div className="text-center py-2 border-b border-dashed border-black">
              <div className="text-[10px] text-gray-600">หมายเลขติดตามงานซ่อม</div>
              <div className="text-base font-black tracking-wider my-0.5">
                {job.trackingCode}
              </div>
              {qrCodeDataUrl && (
                <div className="flex flex-col items-center justify-center my-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrCodeDataUrl}
                    alt="Tracking QR Code"
                    className="w-28 h-28 border border-gray-300 p-1"
                  />
                  <span className="text-[9px] text-gray-500 mt-0.5">
                    สแกน QR เพื่อติดตามสถานะซ่อมออนไลน์
                  </span>
                </div>
              )}
              <div className="text-[10px] text-gray-600">
                วันที่รับ: {formatDateThai(job.createdAt || new Date())}
              </div>
            </div>

            {/* Customer Details */}
            <div className="py-2 border-b border-dashed border-black space-y-0.5 text-[10.5px]">
              <div className="flex justify-between">
                <span className="text-gray-600">ลูกค้า:</span>
                <span className="font-bold">{job.customer?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">เบอร์โทร:</span>
                <span className="font-bold">{job.customer?.phone}</span>
              </div>
            </div>

            {/* Device Details */}
            <div className="py-2 border-b border-dashed border-black space-y-0.5 text-[10.5px]">
              <div className="flex justify-between">
                <span className="text-gray-600">อุปกรณ์:</span>
                <span className="font-bold">
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
                  <span className="font-mono text-[10px]">{job.serialIMEI}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">รหัสปลดล็อก:</span>
                <span>
                  {/* Customer copy: never print the actual PIN/pattern. */}
                  {job.passcode || job.patternLock || job.hasPasscode || job.hasPatternLock ? "มีรหัสล็อกเครื่อง: แจ้งพนักงานแล้ว" : "ไม่มีรหัส"}
                </span>
              </div>
            </div>

            {/* Problem & Precheck */}
            <div className="py-2 border-b border-dashed border-black space-y-1">
              <div className="text-gray-600 text-[10px]">อาการเสียที่แจ้ง:</div>
              <div className="font-semibold text-[10.5px] bg-gray-50 p-1 rounded border border-gray-200">
                {job.issueDescription}
              </div>

              {Object.keys(preCheckParsed).filter((k) => k !== "damageLocations" && k !== "damageNotes").length > 0 && (
                <div className="pt-1">
                  <div className="text-[9.5px] text-gray-500 font-bold mb-0.5">
                    สภาพเครื่องเบื้องต้น (Pre-check):
                  </div>
                  <div className="text-[9px] text-gray-700 grid grid-cols-2 gap-x-1">
                    {Object.entries(preCheckParsed)
                      .filter(([k]) => k !== "damageLocations" && k !== "damageNotes")
                      .slice(0, 8)
                      .map(([k, v]) => (
                        <div key={k} className="truncate">
                          • {k}: <span className="font-semibold">{Array.isArray(v) ? v.join(", ") : String(v)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Physical Damage & Notes */}
              {((preCheckParsed.damageLocations && (Array.isArray(preCheckParsed.damageLocations) ? preCheckParsed.damageLocations.length > 0 : Boolean(preCheckParsed.damageLocations))) || preCheckParsed.damageNotes) && (
                <div className="pt-1 text-[9.5px] border-t border-dotted border-gray-300 space-y-0.5">
                  <div className="text-gray-600 font-bold">จุดตำหนิ / สภาพบอดี้ภายนอก:</div>
                  {preCheckParsed.damageLocations && (
                    <div className="text-[9px] text-red-600 font-medium">
                      • {Array.isArray(preCheckParsed.damageLocations) ? preCheckParsed.damageLocations.join(", ") : String(preCheckParsed.damageLocations)}
                    </div>
                  )}
                  {preCheckParsed.damageNotes && (
                    <div className="text-[9px] text-gray-700 italic">
                      หมายเหตุ: {String(preCheckParsed.damageNotes)}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Cost & Estimates */}
            <div className="py-2 border-b border-dashed border-black space-y-1">
              <div className="flex justify-between text-xs">
                <span>ยอดรวมทั้งสิ้น:</span>
                <span className="font-bold">
                  {formatTHB(job.totalCost || job.estimatedCost || job.laborFee || 0)}
                </span>
              </div>
              {Number(job.depositAmount) > 0 && (
                <div className="flex justify-between text-[11px] text-gray-700 font-medium">
                  <span>หักเงินมัดจำล่วงหน้า:</span>
                  <span>- {formatTHB(Number(job.depositAmount))}</span>
                </div>
              )}
              {Number(job.depositAmount) > 0 && (
                <div className="flex justify-between text-xs font-bold text-black border-t border-dotted border-gray-400 pt-0.5">
                  <span>คงเหลือชำระวันรับเครื่อง:</span>
                  <span>{formatTHB(Math.max(0, (job.totalCost || job.estimatedCost || 0) - Number(job.depositAmount)))}</span>
                </div>
              )}
              {job.estimatedFinish && (
                <div className="flex justify-between text-[10px] text-gray-600">
                  <span>กำหนดเสร็จประมาณ:</span>
                  <span>{formatDateThai(job.estimatedFinish)}</span>
                </div>
              )}
            </div>

            {/* Terms & Signature */}
            <div className="pt-2 text-[9px] text-gray-600 text-center space-y-1.5">
              <p className="leading-snug">
                * โปรดนำใบรับซ่อมนี้มาแสดงเมื่อติดต่อรับเครื่อง
                <br />
                * ข้อมูลในเครื่องอาจสูญหาย ทางร้านไม่รับผิดชอบข้อมูลใดๆ ทั้งสิ้น
                <br />
                * หากไม่มารับเครื่องภายใน 90 วัน ทางร้านขอสงวนสิทธิ์จัดการตามดุลยพินิจ
              </p>

              {job.customerSignature && (
                <div className="flex flex-col items-center pt-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={job.customerSignature}
                    alt="Customer Signature"
                    className="h-10 border-b border-gray-400"
                  />
                  <span className="text-[8.5px] text-gray-500 mt-0.5">
                    (ลายมือชื่อลูกค้า)
                  </span>
                </div>
              )}

              <div className="pt-1 text-[8px] text-gray-400">
                FixMe OS • ขอบคุณที่ใช้บริการ
              </div>
            </div>
          </div>
        </div>
      </DialogContent>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #thermal-receipt,
          #thermal-receipt * {
            visibility: visible;
          }
          #thermal-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm !important;
            padding: 4mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>
    </Dialog>
  );
}
