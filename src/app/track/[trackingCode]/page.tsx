"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import confetti from "canvas-confetti";
import {
  Smartphone,
  CheckCircle2,
  Clock,
  Wrench,
  AlertCircle,
  Phone,
  MessageSquare,
  ShieldCheck,
  Calendar,
  Sparkles,
  Camera,
  ChevronRight,
  ThumbsUp,
  FileText,
  MapPin,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatTHB, formatDateThai } from "@/lib/utils";

const CUSTOMER_STEPS = [
  {
    step: 1,
    key: "RECEIVED",
    title: "1. ตรวจรับเครื่อง",
    desc: "เปิดใบรับซ่อมและบันทึกอาการเบื้องต้น",
    statuses: ["PENDING"],
  },
  {
    step: 2,
    key: "DIAGNOSING",
    title: "2. ช่างตรวจเช็คอาการ",
    desc: "วัดกระแสไฟและทดสอบจุดบกพร่อง",
    statuses: ["DIAGNOSING"],
  },
  {
    step: 3,
    key: "REPAIRING",
    title: "3. กำลังดำเนินการซ่อม",
    desc: "เบิกอะไหล่และซ่อมแซมตามมาตรฐาน",
    statuses: ["WAITING_PARTS", "REPAIRING"],
  },
  {
    step: 4,
    key: "READY",
    title: "4. พร้อมส่งมอบเครื่อง",
    desc: "ผ่านการทดสอบ QC ครบทุกฟังก์ชัน",
    statuses: ["QC_PASSED", "READY"],
  },
  {
    step: 5,
    key: "COMPLETED",
    title: "5. ส่งมอบเรียบร้อย",
    desc: "ลูกค้าตรวจรับและออกใบรับประกัน",
    statuses: ["COMPLETED"],
  },
];

export default function PublicTrackingPage() {
  const params = useParams();
  const code = params.trackingCode as string;

  const [job, setJob] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState<string | null>(null);

  const fetchTrackingData = async () => {
    try {
      const res = await fetch(`/api/track/${code}`);
      const json = await res.json();
      if (json.success) {
        setJob(json.data);
      } else {
        setError(json.error || "ไม่พบข้อมูลหมายเลขติดตามงานซ่อม");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load tracking data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackingData();
  }, [code]);

  const handleApproveQuote = async () => {
    setApproving(true);
    try {
      const res = await fetch(`/api/track/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const json = await res.json();
      if (json.success) {
        confetti({ particleCount: 100, spread: 70 });
        setApprovalMessage(json.message);
        fetchTrackingData();
      } else {
        alert(json.error || "เกิดข้อผิดพลาดในการอนุมัติ");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-medium text-slate-500">กำลังค้นหาข้อมูลงานซ่อมของคุณ...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-6 bg-white shadow-md border-slate-200">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900 mb-1">
            ไม่พบหมายเลขติดตามงานซ่อม
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            รหัส &ldquo;{code}&rdquo; อาจไม่ถูกต้อง หรือถูกยกเลิกไปแล้ว โปรดติดต่อศูนย์บริการ
          </p>
          <a href="tel:021234567">
            <Button className="w-full text-xs bg-blue-600 text-white gap-2">
              <Phone className="w-4 h-4" />
              <span>โทรติดต่อศูนย์บริการ</span>
            </Button>
          </a>
        </Card>
      </div>
    );
  }

  // Determine current active step
  const currentStepIndex = CUSTOMER_STEPS.findIndex((s) =>
    s.statuses.includes(job.status)
  );
  const activeStep = currentStepIndex >= 0 ? currentStepIndex + 1 : 1;

  // Mock Photo Gallery
  const defaultPhotos = [
    {
      title: "สภาพหน้าจอตอนรับเครื่อง",
      url: "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=500&auto=format&fit=crop&q=60",
    },
    {
      title: "อะไหล่แท้พร้อมทำการเปลี่ยน",
      url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop&q=60",
    },
  ];
  const photos = job.photos && job.photos.length > 0 ? job.photos : defaultPhotos;

  return (
    <div className="min-h-screen bg-slate-100/80 pb-16">
      {/* Top Customer Hero Banner (Mobile-First) */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 text-white px-4 pt-6 pb-8 shadow-md">
        <div className="max-w-xl mx-auto space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-blue-200 uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-blue-300" />
              ระบบติดตามสถานะงานซ่อมลูกค้า
            </span>
            <span className="font-mono text-xs font-bold bg-white/20 backdrop-blur-xs px-2.5 py-0.5 rounded-full border border-white/20">
              {job.trackingCode}
            </span>
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              {job.deviceBrand} {job.deviceModel}
            </h1>
            <p className="text-xs text-blue-100 mt-0.5">
              เจ้าของเครื่อง: คุณ {job.customerName} {job.deviceColor ? `• สี ${job.deviceColor}` : ""}
            </p>
          </div>

          {/* Quick Status Pill */}
          <div className="pt-2 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-3 py-1 rounded-full text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>
                {job.status === "COMPLETED"
                  ? "ส่งมอบเรียบร้อยแล้ว"
                  : job.status === "READY"
                  ? "พร้อมส่งมอบเครื่องแล้ว"
                  : "กำลังดำเนินการซ่อม"}
              </span>
            </div>

            {job.warrantyDays && (
              <span className="text-[11px] text-blue-200 bg-white/10 px-2.5 py-1 rounded-full">
                รับประกัน {job.warrantyDays} วัน
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 -mt-4 space-y-4">
        {/* Estimated Completion Countdown Card */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-slate-500 font-medium">
                  กำหนดการแล้วเสร็จโดยประมาณ
                </div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {job.estimatedFinish ? formatDateThai(job.estimatedFinish) : "ภายใน 1-2 วันทำการ"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 5-Step Progress Stepper */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>ลำดับขั้นตอนการซ่อม (Repair Progress)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {CUSTOMER_STEPS.map((s) => {
                const isPassed = activeStep > s.step;
                const isCurrent = activeStep === s.step;

                return (
                  <div key={s.step} className="relative group">
                    {/* Circle Indicator */}
                    <div
                      className={`absolute -left-6 top-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ring-4 ring-white transition-all ${
                        isPassed
                          ? "bg-emerald-600 text-white"
                          : isCurrent
                          ? "bg-blue-600 text-white ring-blue-100 animate-pulse"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {isPassed ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.step}
                    </div>

                    <div className="pl-2">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold ${
                            isCurrent
                              ? "text-blue-700"
                              : isPassed
                              ? "text-slate-900"
                              : "text-slate-400"
                          }`}
                        >
                          {s.title}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            กำลังทำขั้นตอนนี้
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Quotation & Online Approval Section */}
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/80 pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>ใบเสนอราคาค่าซ่อม (Quotation)</span>
              </CardTitle>
              {job.customerApproved ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>อนุมัติการซ่อมแล้ว</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                  <Clock className="w-3 h-3" />
                  <span>รอคุณยืนยันราคา</span>
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">ค่าบริการตรวจเช็คและค่าแรงช่าง</span>
                <span className="font-semibold text-slate-800">{formatTHB(job.laborFee)}</span>
              </div>

              {job.partUsages?.map((p: any) => (
                <div key={p.id} className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">
                    {p.name} (x{p.quantity})
                  </span>
                  <span className="font-semibold text-slate-800">
                    {formatTHB(p.sellPrice * p.quantity)}
                  </span>
                </div>
              ))}

              <div className="flex justify-between pt-2 text-sm font-bold">
                <span className="text-slate-900">ยอดรวมค่าซ่อมทั้งสิ้น:</span>
                <span className="text-blue-700 text-base font-black">
                  {formatTHB(job.totalCost || job.estimatedCost || 0)}
                </span>
              </div>
            </div>

            {/* Approval Button */}
            {!job.customerApproved && (
              <div className="pt-2">
                <Button
                  onClick={handleApproveQuote}
                  disabled={approving}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 shadow-sm gap-2"
                >
                  <ThumbsUp className="w-4 h-4" />
                  <span>{approving ? "กำลังยืนยัน..." : "กดอนุมัติราคาซ่อมนี้ (Approve)"}</span>
                </Button>
                <p className="text-[10px] text-slate-400 text-center mt-1.5">
                  เมื่อกดอนุมัติ ช่างจะเริ่มดำเนินการซ่อมเครื่องให้ทันที
                </p>
              </div>
            )}

            {approvalMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{approvalMessage}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Technician Notes & Issue Info */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-blue-600" />
              <span>อาการที่แจ้ง & ข้อมูลจากช่างเทคนิค</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3 space-y-3 text-xs">
            <div>
              <div className="text-slate-400 text-[11px]">อาการเสียตอนส่งซ่อม:</div>
              <div className="font-medium text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200 mt-1">
                {job.issueDescription}
              </div>
            </div>

            {job.notes && (
              <div>
                <div className="text-slate-400 text-[11px]">บันทึกจากช่างเทคนิค:</div>
                <div className="font-medium text-blue-900 bg-blue-50/80 p-2.5 rounded-lg border border-blue-200 mt-1">
                  {job.notes}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Photo Gallery Card */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Camera className="w-4 h-4 text-blue-600" />
              <span>ภาพถ่ายประกอบงานซ่อม (Repair Gallery)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              {photos.map((photo: any, index: number) => (
                <div
                  key={index}
                  className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.title || "Repair photo"}
                    className="w-full h-28 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="p-1.5 text-[10px] font-medium text-slate-700 truncate text-center">
                    {photo.title || `รูปถ่ายจุดซ่อม ${index + 1}`}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Branch Contact Card */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-slate-900">{job.branch?.name}</div>
                <div className="text-slate-500 mt-0.5">{job.branch?.address}</div>
                <div className="text-slate-600 font-semibold mt-1">
                  โทร: {job.branch?.phone || "02-123-4567"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <a href={`tel:${job.branch?.phone || "021234567"}`} className="block">
                <Button variant="outline" className="w-full text-xs gap-1.5 h-9">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>โทรหาช่าง</span>
                </Button>
              </a>

              <a
                href="https://line.me"
                target="_blank"
                rel="noreferrer"
                className="block"
              >
                <Button variant="outline" className="w-full text-xs gap-1.5 h-9">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>แชทผ่าน LINE</span>
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Footer info */}
        <div className="text-center text-[10px] text-slate-400 pt-2 pb-6">
          MobileShop-Hub Service Cloud • ข้อมูลมีการอัปเดตแบบ Real-time
        </div>
      </div>
    </div>
  );
}
