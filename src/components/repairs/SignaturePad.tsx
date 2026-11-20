"use client";

import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { RotateCcw, Check, PenTool } from "lucide-react";

interface SignaturePadProps {
  value?: string | null;
  onChange?: (dataUrl: string) => void;
  readonly?: boolean;
}

export function SignaturePad({
  value,
  onChange,
  readonly = false,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setHasDrawn(true);
      };
      img.src = value;
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasDrawn(false);
    }
  }, [value]);

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readonly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture fails
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";

    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readonly || !isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (readonly || !isDrawing) return;
    if (e) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
    }
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onChange?.(dataUrl);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    setHasDrawn(false);
    onChange?.("");
  };

  return (
    <div className="w-full flex flex-col rounded-xl border border-slate-200 bg-slate-50/70 p-3 select-none">
      <div className="flex items-center justify-between pb-2 mb-1 border-b border-slate-200/80">
        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <PenTool className="w-3.5 h-3.5 text-blue-600" />
          ลายมือชื่อลูกค้ายินยอมเงื่อนไข (Customer Signature)
        </span>
        {!readonly && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-7 text-xs text-rose-600 hover:text-rose-700 gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>เซ็นใหม่</span>
          </Button>
        )}
      </div>

      <div className="relative w-full overflow-hidden rounded-lg border border-dashed border-slate-300 bg-white">
        <canvas
          ref={canvasRef}
          width={480}
          height={160}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerLeave={stopDrawing}
          className={`w-full h-36 touch-none ${
            readonly ? "cursor-default" : "cursor-crosshair"
          }`}
        />
        {!hasDrawn && !readonly && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-slate-400">
            แตะหรือใช้เมาส์เซ็นชื่อที่นี่ (Sign here)
          </div>
        )}
      </div>

      <div className="mt-2 text-[11px] text-slate-500">
        ข้าพเจ้าขอยืนยันว่าได้ตรวจสอบสภาพเครื่องเบื้องต้นร่วมกับพนักงาน และยินยอมตามเงื่อนไขการให้บริการตรวจเช็คและรับซ่อมของทางร้าน
      </div>
    </div>
  );
}
