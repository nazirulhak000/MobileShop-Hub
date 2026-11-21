"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  Upload,
  X,
  RefreshCw,
  Check,
  SwitchCamera,
  AlertCircle,
  Loader2,
  Maximize2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (photoUrl: string) => void;
  title?: string;
  guideType?: "id-card" | "device" | "general";
}

export function CameraCaptureModal({
  isOpen,
  onClose,
  onCapture,
  title = "ถ่ายภาพ / อัปโหลดรูปภาพ",
  guideType = "id-card",
}: CameraCaptureModalProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Start Camera Stream
  const startCamera = async (mode: "environment" | "user") => {
    setCameraError(null);
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("เบราว์เซอร์นี้ไม่รองรับการเปิดกล้องโดยตรง กรุณาใช้ปุ่มเลือกไฟล์รูปภาพ");
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err: any) {
      console.warn("Camera access error:", err);
      setCameraError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "ไม่ได้รับอนุญาตให้เข้าถึงกล้อง กรุณากดอนุญาตในแถบที่อยู่เบราว์เซอร์ หรือเลือกอัปโหลดไฟล์รูปภาพแทน"
          : "ไม่สามารถเปิดกล้องได้ หรือไม่มีอุปกรณ์กล้องเชื่อมต่อ กรุณาใช้ปุ่มเลือกไฟล์แทน"
      );
    }
  };

  // Stop camera when closing
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCapturedDataUrl(null);
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const handleToggleFacingMode = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Capture Snapshot from video
  const handleSnap = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Flip horizontally if user camera
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedDataUrl(dataUrl);
    stopCamera();
  };

  // Upload captured photo or selected file to API
  const handleConfirmUpload = async (dataUrlOrFile: string | File) => {
    setIsUploading(true);
    try {
      let finalUrl = "";
      if (typeof dataUrlOrFile === "string") {
        const res = await fetch("/api/upload/photo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl: dataUrlOrFile }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "อัปโหลดรูปภาพไม่สำเร็จ");
        finalUrl = json.url;
      } else {
        const fd = new FormData();
        fd.append("file", dataUrlOrFile);
        const res = await fetch("/api/upload/photo", {
          method: "POST",
          body: fd,
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "อัปโหลดรูปภาพไม่สำเร็จ");
        finalUrl = json.url;
      }

      onCapture(finalUrl);
      onClose();
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาดในการบันทึกรูปภาพ");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Local File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleConfirmUpload(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 font-sans animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">{title}</h3>
              <p className="text-[11px] text-slate-500">
                ถ่ายภาพจากกล้องอุปกรณ์ หรือเลือกไฟล์ภาพจากเครื่อง
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Viewfinder Body */}
        <div className="p-4 flex-1 flex flex-col items-center justify-center bg-slate-900 relative min-h-[300px]">
          {capturedDataUrl ? (
            /* Review captured photo */
            <div className="relative w-full h-[320px] rounded-2xl overflow-hidden bg-black flex items-center justify-center">
              <img
                src={capturedDataUrl}
                alt="Captured Preview"
                className="w-full h-full object-contain"
              />
              <div className="absolute top-3 right-3 bg-black/60 text-white text-[10px] px-2.5 py-1 rounded-full font-medium">
                ตัวอย่างภาพถ่าย
              </div>
            </div>
          ) : cameraError ? (
            /* Camera error / fallback prompt */
            <div className="text-center p-6 space-y-4 max-w-sm">
              <div className="h-12 w-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <AlertCircle className="h-6 w-6" />
              </div>
              <p className="text-xs text-rose-200 leading-relaxed font-medium">
                {cameraError}
              </p>
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-10 gap-2"
              >
                <Upload className="h-4 w-4" />
                <span>เลือกไฟล์รูปภาพจากอุปกรณ์</span>
              </Button>
            </div>
          ) : (
            /* Live Camera Feed with overlay guide */
            <div className="relative w-full h-[320px] rounded-2xl overflow-hidden bg-black flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${
                  facingMode === "user" ? "-scale-x-100" : ""
                }`}
              />

              {/* Guide Overlay */}
              {guideType === "id-card" && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-[85%] h-[65%] border-2 border-dashed border-cyan-400 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] flex flex-col justify-between p-3">
                    <span className="text-[10px] bg-cyan-500/90 text-white px-2 py-0.5 rounded font-bold w-fit">
                      กรอบบัตรประชาชน / ใบขับขี่
                    </span>
                    <span className="text-[10px] text-white/80 self-center">
                      วางบัตรให้พอดีกับกรอบ
                    </span>
                  </div>
                </div>
              )}

              {/* Switch camera button */}
              <button
                type="button"
                onClick={handleToggleFacingMode}
                className="absolute top-3 right-3 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all shadow-md active:scale-95"
                title="สลับกล้องหน้า/หลัง"
              >
                <SwitchCamera className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          {capturedDataUrl ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setCapturedDataUrl(null);
                  startCamera(facingMode);
                }}
                disabled={isUploading}
                className="text-xs gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>ถ่ายใหม่</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => handleConfirmUpload(capturedDataUrl)}
                disabled={isUploading}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 px-6 shadow-sm"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>ใช้ภาพนี้</span>
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              {/* File upload hidden input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="text-xs gap-1.5"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>เลือกไฟล์ภาพ</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleSnap}
                disabled={isUploading || Boolean(cameraError)}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 px-6 shadow-md shadow-blue-500/20 active:scale-95"
              >
                <Camera className="h-4 w-4" />
                <span>กดถ่ายภาพ</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
