"use client";

import React, { useState } from "react";
import { Camera, Upload, Trash2, Eye, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CameraCaptureModal } from "./CameraCaptureModal";

interface PhotoCaptureFieldProps {
  label?: string;
  value?: string | null;
  onChange: (url: string | null) => void;
  required?: boolean;
  guideType?: "id-card" | "device" | "general";
  helperText?: string;
  placeholderText?: string;
}

export function PhotoCaptureField({
  label = "ภาพถ่ายบัตรประชาชน / ใบหน้าลูกค้า",
  value,
  onChange,
  required = false,
  guideType = "id-card",
  helperText,
  placeholderText = "ถ่ายภาพบัตร / อัปโหลด",
}: PhotoCaptureFieldProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  return (
    <div>
      {label && (
        <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
          <span>
            {label} {required && <span className="text-rose-500">*</span>}
          </span>
          {value && (
            <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              แนบรูปแล้ว
            </span>
          )}
        </label>
      )}

      <div className="flex items-center gap-3">
        {value ? (
          /* Thumbnail with actions */
          <div className="relative group h-14 w-20 rounded-xl border-2 border-emerald-500/40 overflow-hidden bg-slate-900 shrink-0 shadow-xs">
            <img
              src={value}
              alt="Photo preview"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                className="p-1 rounded-md bg-white/80 hover:bg-white text-slate-800"
                title="ดูรูปขนาดเต็ม"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onChange(null)}
                className="p-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white"
                title="ลบรูปภาพ"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* Empty placeholder icon */
          <div className="h-14 w-20 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
            <Camera className="h-5 w-5 opacity-60" />
          </div>
        )}

        {/* Action Button */}
        <div className="space-y-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="text-xs gap-1.5 h-9 font-medium border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 hover:text-blue-700 transition-colors"
          >
            <Camera className="h-3.5 w-3.5 text-blue-600" />
            <span>{value ? "ถ่ายใหม่ / เปลี่ยนรูป" : placeholderText}</span>
          </Button>
          {helperText && (
            <p className="text-[10px] text-slate-500">{helperText}</p>
          )}
        </div>
      </div>

      {/* Camera & Upload Modal */}
      <CameraCaptureModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCapture={(url) => onChange(url)}
        title={label}
        guideType={guideType}
      />

      {/* Fullscreen Image Preview Lightbox */}
      {isPreviewOpen && value && (
        <div
          onClick={() => setIsPreviewOpen(false)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer animate-fade-in"
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-transparent">
            <img
              src={value}
              alt="Full Preview"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            />
            <p className="text-center text-xs text-white/70 mt-2">
              แตะหรือคลิกเพื่อปิด
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
