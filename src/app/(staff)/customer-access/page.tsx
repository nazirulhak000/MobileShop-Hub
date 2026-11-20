"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  UserCheck,
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserX,
  Phone,
  RefreshCw,
  Sparkles,
  Link2,
  Unlink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface Data {
  accounts: { id: string; phone: string; displayName: string; createdAt: string }[];
  links: { accountId: string; customerId: string; verifiedMethod: string; evidence: string }[];
  customers: { id: string; name: string; phone: string }[];
}

export default function CustomerAccessPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  async function load() {
    setBusy(true);
    try {
      const response = await fetch("/api/customer-access", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลบัญชีลูกค้าไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function mutate(body: unknown, method: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/customer-access", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await load();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "ทำรายการไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  const filteredAccounts = (data?.accounts || []).filter((account) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      account.displayName.toLowerCase().includes(q) ||
      account.phone.includes(q)
    );
  });

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Page Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
              <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
              การจัดการสิทธิ์เข้าถึงข้อมูลประวัติ (KYC & Account Linking)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-2">
            เชื่อมบัญชีลูกค้ากับประวัติ CRM เดิม
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
            ตรวจหลักฐานความเป็นเจ้าของ เช่น ใบรับซ่อมฉบับจริง หรือตรวจเครื่องต่อหน้าลูกค้า ก่อนเปิดสิทธิ์ดูประวัติย้อนหลังให้กับบัญชีที่ยืนยันเบอร์โทรแล้ว (ระบบไม่เปิดประวัติให้อัตโนมัติเพียงเพราะเบอร์ตรงกัน เพื่อความปลอดภัย)
          </p>
        </div>

        <Button
          onClick={load}
          disabled={busy}
          variant="outline"
          className="h-11 px-4 gap-2 border-slate-200 hover:bg-slate-50 text-slate-800 font-semibold rounded-xl cursor-pointer"
        >
          <RefreshCw className={cn("h-4 w-4 text-slate-500", busy && "animate-spin")} />
          <span>รีเฟรชข้อมูล</span>
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Search & Stats */}
      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
        <div className="relative w-80 max-w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อลูกค้า หรือ เบอร์โทร..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2 pl-9 pr-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
          />
        </div>
        <div className="text-xs font-semibold text-slate-500">
          บัญชีทั้งหมด: {data?.accounts.length || 0} บัญชี (เชื่อมโยงแล้ว {data?.links.length || 0})
        </div>
      </div>

      {/* 3. Account List */}
      <div className="space-y-4">
        {filteredAccounts.map((account) => {
          const link = data?.links.find((l) => l.accountId === account.id);
          const customer = link ? data?.customers.find((c) => c.id === link.customerId) : null;

          return (
            <Card
              key={account.id}
              className="border-slate-200/90 shadow-2xs hover:shadow-xs transition-all bg-white"
            >
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base text-slate-900">
                          {account.displayName}
                        </span>
                        <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                          {account.phone}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        สร้างบัญชีเมื่อ: {new Date(account.createdAt || Date.now()).toLocaleDateString("th-TH")}
                      </div>
                    </div>
                  </div>

                  {link ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>เชื่อมต่อประวัติ CRM เรียบร้อย</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>ยังไม่เชื่อมต่อประวัติเดิม</span>
                    </span>
                  )}
                </div>

                {link ? (
                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/40 border border-emerald-100 p-4 rounded-xl">
                    <div className="space-y-1">
                      <div className="text-xs text-slate-500 font-medium">ผูกกับข้อมูลลูกค้าในระบบ:</div>
                      <div className="font-bold text-sm text-slate-900">
                        {customer?.name || "ข้อมูลลูกค้าเดิม"} ({customer?.phone || account.phone})
                      </div>
                      {link.evidence && (
                        <div className="text-xs text-slate-600">
                          หลักฐานการตรวจ: <span className="italic">{link.evidence}</span>
                        </div>
                      )}
                    </div>

                    <Button
                      disabled={busy}
                      variant="outline"
                      onClick={() => {
                        if (
                          confirm(
                            `ถอนการเชื่อมสิทธิ์ของ ${account.displayName}? (ระบบจะเพิกถอน Session การล็อกอินของลูกค้ารายนี้ทันทีเพื่อความปลอดภัย)`
                          )
                        ) {
                          void mutate({ accountId: account.id }, "DELETE");
                        }
                      }}
                      className="text-xs font-bold text-rose-700 hover:bg-rose-50 border-rose-200 h-9 px-3.5 rounded-xl gap-1.5 cursor-pointer shrink-0"
                    >
                      <Unlink className="h-3.5 w-3.5" />
                      <span>ถอนสิทธิ์การเชื่อมโยง</span>
                    </Button>
                  </div>
                ) : (
                  <form
                    className="mt-4 grid gap-3 sm:grid-cols-12 items-end bg-slate-50/70 p-4 rounded-xl border border-slate-200/80"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const form = new FormData(event.currentTarget);
                      if (
                        confirm(
                          `ยืนยันว่าได้ตรวจสอบหลักฐานของ ${account.displayName} เรียบร้อยแล้ว และอนุญาตให้เข้าถึงประวัติงานซ่อมและใบเสร็จเดิม?`
                        )
                      ) {
                        void mutate(
                          {
                            accountId: account.id,
                            customerId: form.get("customerId"),
                            evidence: form.get("evidence"),
                          },
                          "POST"
                        );
                      }
                    }}
                  >
                    <div className="sm:col-span-5">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        เลือกลูกค้าใน CRM ที่ตรงกับหลักฐาน
                      </label>
                      <select
                        required
                        name="customerId"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
                      >
                        <option value="">-- ค้นพบและเลือกลูกค้า --</option>
                        {data?.customers
                          .filter((c) => !data.links.some((l) => l.customerId === c.id))
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.phone})
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="sm:col-span-5">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        บันทึกหลักฐานที่ตรวจสอบต่อหน้า (อย่างน้อย 10 ตัวอักษร)
                      </label>
                      <input
                        required
                        minLength={10}
                        maxLength={500}
                        name="evidence"
                        placeholder="เช่น ตรวจใบรับซ่อมฉบับจริง หรือตรวจสอบบัตรประชาชนคู่กับเครื่อง"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <Button
                        disabled={busy}
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold h-10 px-3 rounded-xl text-xs gap-1 cursor-pointer"
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        <span>อนุมัติเชื่อมโยง</span>
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          );
        })}

        {!busy && !filteredAccounts.length && (
          <Card className="border-slate-200 bg-white p-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mx-auto mb-4">
              <UserCheck className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">ไม่พบบัญชีลูกค้าที่ตรงกับเงื่อนไข</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              เมื่อลูกค้าเข้าสู่ระบบผ่านหน้าร้านออนไลน์ บัญชีจะปรากฏที่นี่เพื่อให้พนักงานตรวจสอบและเปิดประวัติ
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
