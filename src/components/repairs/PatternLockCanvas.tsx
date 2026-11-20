"use client";

import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { RotateCcw, Check, Lock } from "lucide-react";

interface PatternLockCanvasProps {
  value?: string | null; // e.g. "0-1-2-4-6"
  onChange?: (pattern: string) => void;
  readonly?: boolean;
}

export function PatternLockCanvas({
  value = "",
  onChange,
  readonly = false,
}: PatternLockCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedDots, setSelectedDots] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  // Initialize dots if value is passed
  useEffect(() => {
    if (value) {
      const parsed = value
        .split("-")
        .map(Number)
        .filter((n) => !isNaN(n) && n >= 0 && n <= 8);
      setSelectedDots(parsed);
    } else {
      setSelectedDots([]);
    }
  }, [value]);

  const DOT_COORDS = [
    { x: 50, y: 50 },  // 0
    { x: 130, y: 50 }, // 1
    { x: 210, y: 50 }, // 2
    { x: 50, y: 130 }, // 3
    { x: 130, y: 130 },// 4
    { x: 210, y: 130 },// 5
    { x: 50, y: 210 }, // 6
    { x: 130, y: 210 },// 7
    { x: 210, y: 210 },// 8
  ];

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw lines between selected dots
    if (selectedDots.length > 1) {
      ctx.beginPath();
      ctx.lineWidth = 4;
      ctx.strokeStyle = readonly ? "#6366f1" : "#2563eb";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      selectedDots.forEach((dotIndex, idx) => {
        const dot = DOT_COORDS[dotIndex];
        if (idx === 0) {
          ctx.moveTo(dot.x, dot.y);
        } else {
          ctx.lineTo(dot.x, dot.y);
        }
      });
      ctx.stroke();
    }

    // Draw the 9 dots
    DOT_COORDS.forEach((dot, index) => {
      const isSelected = selectedDots.includes(index);
      const order = selectedDots.indexOf(index);

      // Outer ring
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, 20, 0, Math.PI * 2);
      ctx.fillStyle = isSelected
        ? readonly
          ? "rgba(99, 102, 241, 0.15)"
          : "rgba(37, 99, 235, 0.15)"
        : "#f8fafc";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = isSelected
        ? readonly
          ? "#6366f1"
          : "#2563eb"
        : "#cbd5e1";
      ctx.stroke();

      // Center dot
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = isSelected
        ? readonly
          ? "#6366f1"
          : "#2563eb"
        : "#94a3b8";
      ctx.fill();

      // Order badge if selected
      if (isSelected) {
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(order + 1), dot.x, dot.y);
      }
    });
  }, [selectedDots, readonly]);

  const getDotFromPoint = (x: number, y: number): number | null => {
    for (let i = 0; i < DOT_COORDS.length; i++) {
      const dot = DOT_COORDS[i];
      const dist = Math.hypot(dot.x - x, dot.y - y);
      if (dist <= 28) {
        return i;
      }
    }
    return null;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readonly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const dot = getDotFromPoint(x, y);
    if (dot !== null) {
      setIsDrawing(true);
      const newDots = [dot];
      setSelectedDots(newDots);
      onChange?.(newDots.join("-"));
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readonly || !isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const dot = getDotFromPoint(x, y);
    if (dot !== null && !selectedDots.includes(dot)) {
      const newDots = [...selectedDots, dot];
      setSelectedDots(newDots);
      onChange?.(newDots.join("-"));
    }
  };

  const handlePointerUp = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (readonly) return;
    if (e) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
    setIsDrawing(false);
  };

  const handleClear = () => {
    setSelectedDots([]);
    onChange?.("");
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="flex flex-col items-center p-3 bg-slate-50 border border-slate-200 rounded-xl select-none">
      <div className="flex items-center justify-between w-full mb-2">
        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-blue-600" />
          {readonly ? "รูปแบบปลดล็อกหน้าจอ (3x3 Pattern Lock)" : "วาดรหัสรูปแบบ 3x3 (Pattern Lock)"}
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
            <span>ล้าง</span>
          </Button>
        )}
      </div>

      <div className="relative rounded-lg bg-white p-2 shadow-xs border border-slate-200">
        <canvas
          ref={canvasRef}
          width={260}
          height={260}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`touch-none ${readonly ? "cursor-default" : "cursor-crosshair"}`}
        />
      </div>

      <div className="mt-2 text-center">
        {selectedDots.length > 0 ? (
          <p className="text-[11px] text-slate-500 font-mono">
            ลำดับการลาก:{" "}
            <span className="font-semibold text-blue-600">
              {selectedDots.map((d) => d + 1).join(" → ")}
            </span>
          </p>
        ) : (
          <p className="text-[11px] text-slate-400">
            {readonly ? "ไม่มีการตั้งรหัสแบบลากเส้น" : "ใช้นิ้วหรือเมาส์ลากเชื่อมจุดเพื่อบันทึกรหัส"}
          </p>
        )}
      </div>
    </div>
  );
}
