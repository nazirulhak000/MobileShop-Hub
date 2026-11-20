"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Wrench,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Phone,
  Smartphone,
  Store,
  ArrowRight,
  Search,
  Camera,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Copy,
  Check,
  FileText,
} from "lucide-react";
import { extractTrackingToken, TRACKING_INPUT_ERROR } from "@/components/landing/trackingToken";

const STATUS_LABELS: Record<string, { label: string; desc: string; color: string; step: number }> = {
  PENDING: {
    label: "รับเครื่องเข้าระบบแล้ว",
    desc: "เจ้าหน้าที่ลงทะเบียนรับเครื่องและจัดคิวส่งมอบให้ช่างผู้เชี่ยวชาญ",
    color: "bg-blue-50 text-blue-800 border-blue-200",
    step: 1,
  },
  DIAGNOSING: {
    label: "กำลังตรวจเช็กอาการ",
    desc: "ช่างกำลังทดสอบฮาร์ดแวร์ วิเคราะห์สาเหตุ และประเมินราคาซ่อม",
    color: "bg-amber-50 text-amber-800 border-amber-200",
    step: 2,
  },
  WAITING_PARTS: {
    label: "รออะไหล่เพื่อซ่อม",
    desc: "กำลังเบิกหรือจัดส่งอะไหล่แท้ตรงรุ่นเพื่อดำเนินการซ่อมแซม",
    color: "bg-amber-50 text-amber-800 border-amber-200",
    step: 3,
  },
  REPAIRING: {
    label: "กำลังดำเนินการซ่อมแซม",
    desc: "ช่างกำลังเปลี่ยนอะไหล่และประกอบเครื่องตามมาตรฐานความปลอดภัย",
    color: "bg-teal-50 text-teal-800 border-teal-200",
    step: 3,
  },
  QC_PASSED: {
    label: "ผ่านการทดสอบคุณภาพ (QC)",
    desc: "ทดสอบการทำงานของเครื่องทุกฟังก์ชันครบถ้วน พร้อมส่งมอบ",
    color: "bg-emerald-50 text-emerald-800 border-emerald-200",
    step: 4,
  },
  READY: {
    label: "พร้อมส่งมอบ / รอรับเครื่อง",
    desc: "เครื่องซ่อมเสร็จสมบูรณ์ สามารถมารับได้ที่สาขาตามเวลาทำการ",
    color: "bg-emerald-50 text-emerald-900 border-emerald-300",
    step: 5,
  },
  COMPLETED: {
    label: "ส่งมอบเครื่องเรียบร้อยแล้ว",
    desc: "ลูกค้าได้รับเครื่องคืนแล้ว และเริ่มระยะเวลารับประกันงานซ่อม",
    color: "bg-slate-100 text-slate-800 border-slate-300",
    step: 5,
  },
  CANCELLED: {
    label: "ยกเลิกงานซ่อม",
    desc: "งานซ่อมนี้ถูกยกเลิก กรุณาติดต่อสาขาเพื่อสอบถามข้อมูลเพิ่มเติม",
    color: "bg-rose-50 text-rose-800 border-rose-200",
    step: 0,
  },
};

const STEPS = [
  { step: 1, title: "รับเครื่อง" },
  { step: 2, title: "ตรวจเช็ก" },
  { step: 3, title: "กำลังซ่อม" },
  { step: 4, title: "ตรวจ QC" },
  { step: 5, title: "พร้อมรับ" },
];

interface TrackingJob {
  id?: string;
  trackingCode: string;
  deviceBrand: string;
  deviceModel: string;
  status: string;
  updatedAt: string;
  estimatedFinish: string | null;
  photos?: string[];
  branch: { name: string; phone: string | null };
  tenant?: { name: string; slug: string } | null;
}

export default function PublicTrackingPage() {
  const params = useParams<{ trackingCode: string }>();
  const router = useRouter();

  const [job, setJob] = useState<TrackingJob | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Inline search retry form state
  const [retryInput, setRetryInput] = useState("");
  const [retryError, setRetryError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const raw = params?.trackingCode ? decodeURIComponent(params.trackingCode) : "";
    if (!raw) {
      setLoading(false);
      setError("กรุณาระบุรหัสติดตามงานซ่อม");
      return;
    }

    const abort = new AbortController();
    setLoading(true);
    setError("");

    fetch(`/api/track/${encodeURIComponent(raw)}`, {
      cache: "no-store",
      signal: abort.signal,
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "ไม่พบข้อมูลงานซ่อม");
        setJob(result.data);
      })
      .catch((failure) => {
        if (failure.name !== "AbortError") {
          setError(failure.message || "เชื่อมต่อกับระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
        }
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });

    return () => abort.abort();
  }, [params?.trackingCode, attempt]);

  const handleCopyCode = useCallback(() => {
    if (!job?.trackingCode) return;
    navigator.clipboard.writeText(job.trackingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [job?.trackingCode]);

  const handleRetrySearch = (e: React.FormEvent) => {
    e.preventDefault();
    const token = extractTrackingToken(retryInput);
    if (!token) {
      setRetryError(TRACKING_INPUT_ERROR);
      return;
    }
    setRetryError("");
    router.push(`/track/${token}`);
  };

  const currentStep = useMemo(() => {
    if (!job?.status) return 1;
    return STATUS_LABELS[job.status]?.step ?? 1;
  }, [job?.status]);

  const statusMeta = useMemo(() => {
    if (!job?.status) return null;
    return (
      STATUS_LABELS[job.status] || {
        label: job.status,
        desc: "กรุณาติดต่อสาขาเพื่อสอบถามข้อมูลล่าสุด",
        color: "bg-slate-100 text-slate-800 border-slate-200",
        step: 1,
      }
    );
  }, [job?.status]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12 text-slate-900 font-sans selection:bg-teal-100 selection:text-teal-900">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/track"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 hover:text-teal-950 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>ค้นหางานซ่อมอื่น</span>
          </Link>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white border border-slate-200 text-slate-600 shadow-2xs">
            <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
            <span>Fixme Verified Tracking</span>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-10 text-center shadow-sm space-y-4">
            <RefreshCw className="h-8 w-8 text-teal-600 animate-spin mx-auto" />
            <div>
              <p className="font-bold text-slate-900 text-base">กำลังตรวจสอบสถานะงานซ่อม…</p>
              <p className="text-xs text-slate-500 mt-1">กำลังดึงข้อมูลความคืบหน้าและประวัติการซ่อมแบบ Real-time</p>
            </div>
          </div>
        )}

        {/* Error / Not Found State with Inline Search Form */}
        {!loading && error && (
          <div className="bg-white rounded-2xl border border-rose-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h1 className="text-lg font-bold text-slate-900">ค้นหาไม่พบข้อมูลงานซ่อม</h1>
                <p className="text-xs text-rose-700 leading-relaxed">{error}</p>
              </div>
            </div>

            {/* Inline search bar */}
            <form onSubmit={handleRetrySearch} className="space-y-3 pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700">
                ลองตรวจสอบรหัสติดตามงานซ่อมอีกครั้ง
              </label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="เช่น REP-202611-0001 หรือวางลิงก์จากใบรับเครื่อง"
                  value={retryInput}
                  onChange={(e) => {
                    setRetryInput(e.target.value);
                    setRetryError("");
                  }}
                  className="w-full pl-10 pr-4 h-11 text-xs sm:text-sm font-mono font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              {retryError && <p className="text-xs text-rose-600 font-medium">{retryError}</p>}

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 h-10 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>ค้นหาสถานะ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAttempt((n) => n + 1)}
                  className="h-10 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>ลองใหม่</span>
                </button>
              </div>
            </form>

            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/80 text-xs text-slate-600 space-y-1.5 leading-relaxed">
              <p className="font-semibold text-slate-800">💡 คำแนะนำในการตรวจสอบ:</p>
              <ul className="list-disc pl-4 space-y-1 text-slate-500">
                <li>ตรวจเช็กเลขที่ใบรับซ่อม (เช่น REP-YYYYMM-XXXX) ที่ระบุบนเอกสารรับเครื่อง</li>
                <li>หากได้รับ SMS หรือ LINE จากทางร้าน สามารถกดเปิดลิงก์ติดตามได้โดยตรง</li>
                <li>หากเพิ่งส่งเครื่องเข้าร้าน อาจใช้เวลา 1-3 นาที ก่อนที่ข้อมูลจะซิงค์ขึ้นระบบส่วนกลาง</li>
              </ul>
            </div>
          </div>
        )}

        {/* Job Found & Active */}
        {!loading && !error && job && (
          <div className="space-y-6 animate-fade-in">
            {/* Header Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-100 shadow-2xs">
                    <Smartphone className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                      <span>{job.branch.name}</span>
                      {job.tenant?.name && (
                        <>
                          <span>·</span>
                          <span className="text-teal-800 font-bold">{job.tenant.name}</span>
                        </>
                      )}
                    </div>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5 tracking-tight">
                      {job.deviceBrand} {job.deviceModel}
                    </h1>
                  </div>
                </div>

                {/* Tracking Code Chip with Copy */}
                <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Tracking ID
                    </div>
                    <div className="font-mono text-xs font-bold text-slate-800">
                      {job.trackingCode}
                    </div>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    title="คัดลอกรหัสงานซ่อม"
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Status Stepper (5 stages) */}
              {job.status !== "CANCELLED" && (
                <div className="py-2">
                  <div className="flex items-center justify-between relative">
                    <div className="absolute top-1/2 left-4 right-4 h-0.5 -translate-y-1/2 bg-slate-200 -z-0" />
                    <div
                      className="absolute top-1/2 left-4 h-0.5 -translate-y-1/2 bg-teal-600 transition-all duration-500 -z-0"
                      style={{
                        width: `${Math.min(100, Math.max(0, ((currentStep - 1) / 4) * 100))}%`,
                      }}
                    />

                    {STEPS.map((s) => {
                      const isCompleted = currentStep > s.step;
                      const isCurrent = currentStep === s.step;

                      return (
                        <div key={s.step} className="flex flex-col items-center relative z-10">
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                              isCompleted
                                ? "bg-teal-600 text-white"
                                : isCurrent
                                ? "bg-teal-700 text-white ring-4 ring-teal-100"
                                : "bg-white border-2 border-slate-200 text-slate-400"
                            }`}
                          >
                            {isCompleted ? <Check className="h-4 w-4" /> : s.step}
                          </div>
                          <span
                            className={`text-[11px] mt-1.5 font-medium whitespace-nowrap ${
                              isCurrent
                                ? "font-bold text-teal-900"
                                : isCompleted
                                ? "text-slate-700"
                                : "text-slate-400"
                            }`}
                          >
                            {s.title}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Current Status Banner */}
              {statusMeta && (
                <div className={`p-4 sm:p-5 rounded-2xl border ${statusMeta.color} space-y-1.5`}>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <span className="font-extrabold text-base tracking-tight">
                      {statusMeta.label}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed opacity-90 pl-7">{statusMeta.desc}</p>
                </div>
              )}

              {/* Telemetry & Dates Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/70 space-y-1">
                  <div className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>อัปเดตสถานะล่าสุด</span>
                  </div>
                  <div className="font-semibold text-slate-800">
                    {new Date(job.updatedAt).toLocaleString("th-TH", {
                      timeZone: "Asia/Bangkok",
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </div>
                </div>

                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/70 space-y-1">
                  <div className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>กำหนดส่งมอบโดยประมาณ</span>
                  </div>
                  <div className="font-semibold text-slate-800">
                    {job.estimatedFinish
                      ? new Date(job.estimatedFinish).toLocaleString("th-TH", {
                          timeZone: "Asia/Bangkok",
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "รอประเมินหลังตรวจเช็ก"}
                  </div>
                </div>
              </div>

              {/* Branch Contact Quick Bar */}
              {job.branch.phone && (
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                  <span className="text-slate-600 font-medium">มีข้อสงสัยเกี่ยวกับงานซ่อม?</span>
                  <a
                    href={`tel:${job.branch.phone}`}
                    className="inline-flex items-center gap-1.5 font-bold text-teal-800 hover:text-teal-950 underline cursor-pointer"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    <span>โทรติดต่อสาขา ({job.branch.phone})</span>
                  </a>
                </div>
              )}
            </div>

            {/* Photos Gallery & Lightbox */}
            {job.photos && job.photos.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4 text-teal-700" />
                    <h2 className="text-sm font-bold text-slate-900">
                      ภาพถ่ายการตรวจสอบและสภาพเครื่อง ({job.photos.length} รูป)
                    </h2>
                  </div>
                  <span className="text-[11px] text-slate-400">กดที่ภาพเพื่อดูรูปขนาดใหญ่</span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {job.photos.map((src, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setLightboxIndex(idx)}
                      className="group relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-1 cursor-pointer transition-all hover:opacity-90 active:scale-98"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={`ภาพงานซ่อมที่ ${idx + 1}`}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = "none";
                        }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors" />
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-mono font-medium">
                        {idx + 1}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Customer Portal Promotion Banner */}
            {job.tenant?.slug && (
              <div className="rounded-2xl border border-teal-200 bg-linear-to-br from-teal-50/90 to-emerald-50/50 p-6 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 text-teal-950 font-bold text-sm">
                  <FileText className="h-4 w-4 text-teal-700" />
                  <span>ต้องการอนุมัติราคา หรือดูใบเสร็จรับเงินออนไลน์?</span>
                </div>
                <p className="text-xs text-teal-900/80 leading-relaxed max-w-xl">
                  เข้าสู่ระบบบัญชีลูกค้าเพื่อยืนยันหรือปฏิเสธใบเสนอราคา ตรวจสอบระยะเวลารับประกัน
                  และดาวน์โหลดใบเสร็จรับเงินฉบับเต็มได้ทุกที่
                </p>
                <div className="flex flex-wrap gap-2.5 pt-1">
                  <Link
                    href={`/s/${job.tenant.slug}`}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-teal-800 shadow-2xs transition-all active:scale-98"
                  >
                    <span>เข้าสู่บัญชีลูกค้า {job.tenant.name}</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Link>
                  <Link
                    href={`/store/${job.tenant.slug}`}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-teal-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-teal-900 hover:bg-teal-50 transition-colors"
                  >
                    <Store className="h-3.5 w-3.5 mr-1.5" />
                    <span>เยี่ยมชมหน้าร้าน</span>
                  </Link>
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                disabled={loading}
                onClick={() => setAttempt((n) => n + 1)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>รีเฟรชสถานะ</span>
              </button>
              <Link
                href="/track"
                className="text-xs font-semibold text-teal-800 hover:text-teal-950 underline"
              >
                วิธีใช้งานระบบติดตาม
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Photo Lightbox Modal */}
      {lightboxIndex !== null && job?.photos && job.photos[lightboxIndex] && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setLightboxIndex(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setLightboxIndex(null);
            if (e.key === "ArrowLeft" && lightboxIndex > 0) setLightboxIndex(lightboxIndex - 1);
            if (e.key === "ArrowRight" && lightboxIndex < (job.photos?.length || 0) - 1)
              setLightboxIndex(lightboxIndex + 1);
          }}
          tabIndex={0}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar */}
            <div className="w-full flex items-center justify-between text-white pb-3 px-1">
              <span className="text-xs font-mono font-medium">
                รูปที่ {lightboxIndex + 1} จาก {job.photos.length}
              </span>
              <button
                onClick={() => setLightboxIndex(null)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                aria-label="ปิดรูปภาพ"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Main Image */}
            <div className="relative overflow-hidden rounded-2xl bg-black max-h-[75vh] flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={job.photos[lightboxIndex]}
                alt={`ภาพงานซ่อมขยาย ${lightboxIndex + 1}`}
                className="max-h-[75vh] max-w-full object-contain select-none"
              />

              {/* Prev Button */}
              {lightboxIndex > 0 && (
                <button
                  onClick={() => setLightboxIndex(lightboxIndex - 1)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all cursor-pointer"
                  aria-label="รูปก่อนหน้า"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}

              {/* Next Button */}
              {lightboxIndex < job.photos.length - 1 && (
                <button
                  onClick={() => setLightboxIndex(lightboxIndex + 1)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all cursor-pointer"
                  aria-label="รูปถัดไป"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
