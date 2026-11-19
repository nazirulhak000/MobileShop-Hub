"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Wrench, RefreshCw } from "lucide-react";
const labels: Record<string, string> = { PENDING: "รับเครื่องแล้ว", DIAGNOSING: "กำลังตรวจอาการ", WAITING_PARTS: "รออะไหล่", REPAIRING: "กำลังซ่อม", QC_PASSED: "ผ่านการตรวจคุณภาพ", READY: "พร้อมรับเครื่อง", COMPLETED: "ส่งมอบแล้ว", CANCELLED: "ยกเลิกงาน" };
interface Tracking { trackingCode: string; deviceBrand: string; deviceModel: string; status: string; updatedAt: string; estimatedFinish: string | null; branch: { name: string; phone: string | null } }
export default function PublicTracking() {
  const params = useParams<{ trackingCode: string }>();
  const [job, setJob] = useState<Tracking | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const abort = new AbortController(); setLoading(true); setError("");
    fetch(`/api/track/${encodeURIComponent(params.trackingCode)}`, { cache: "no-store", signal: abort.signal }).then(async response => {
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      setJob(result.data);
    }).catch(failure => { if (failure.name !== "AbortError") setError(failure.message || "เชื่อมต่อไม่สำเร็จ"); }).finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [params.trackingCode, attempt]);
  return <main className="min-h-screen px-5 py-12 bg-slate-50"><div className="max-w-lg mx-auto">
    <Wrench className="h-8 w-8 text-teal-700 mb-5" aria-hidden="true" /><h1 className="text-2xl font-bold text-slate-900">ติดตามงานซ่อม</h1>
    {loading ? <p role="status" className="mt-6">กำลังโหลดสถานะ…</p> : error ? <p role="alert" className="mt-6 rounded-xl bg-rose-50 p-4 text-rose-800">{error}</p> : job && <section className="mt-8 space-y-5">
      <div><p className="text-sm text-slate-600">{job.branch.name} · {job.trackingCode}</p><h2 className="mt-2 text-xl font-semibold">{job.deviceBrand} {job.deviceModel}</h2></div>
      <p className="rounded-xl bg-teal-50 p-5 text-lg font-semibold text-teal-900">{labels[job.status] ?? "กรุณาติดต่อร้านเพื่อสอบถามสถานะ"}</p>
      <p className="text-sm text-slate-600">อัปเดตล่าสุด {new Date(job.updatedAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}</p>
      {job.estimatedFinish && <p className="text-sm">คาดว่าจะเสร็จ {new Date(job.estimatedFinish).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })} · เวลาอาจเปลี่ยนตามการตรวจซ่อม</p>}
      {job.branch.phone && <a className="inline-flex min-h-11 items-center text-teal-800 underline" href={`tel:${job.branch.phone}`}>โทรสอบถามร้าน {job.branch.phone}</a>}
    </section>}
    <button disabled={loading} onClick={() => setAttempt(n => n + 1)} className="mt-6 flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-white disabled:opacity-50"><RefreshCw className="h-4 w-4" aria-hidden="true" />ตรวจสถานะอีกครั้ง</button>
    <Link href="/track" className="mt-8 inline-flex min-h-11 items-center text-sm text-teal-800 underline">วิธีตรวจสอบสถานะ</Link>
  </div></main>;
}
