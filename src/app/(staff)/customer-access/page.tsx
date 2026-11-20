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
  Check,
  Clock,
  ShieldAlert,
  ArrowRight,
  UserCheck2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { cn, formatDateThai } from "@/lib/utils";

interface Account {
  id: string;
  phone: string;
  displayName: string;
  status?: string;
  createdAt: string;
}

interface LinkRecord {
  id?: string;
  accountId: string;
  customerId: string;
  evidence: string;
  approvedBy?: string;
  createdAt?: string;
}

interface CustomerRecord {
  id: string;
  name: string;
  phone: string;
  nationalId?: string | null;
}

interface Data {
  accounts: Account[];
  links: LinkRecord[];
  customers: CustomerRecord[];
}

const PRESET_EVIDENCES = [
  "ตรวจบัตรประชาชนตัวจริงพร้อมยืนยัน OTP ต่อหน้าพนักงาน",
  "ตรวจใบรับซ่อมฉบับจริงพร้อมเครื่องและเลข IMEI ตรงกัน",
  "ลูกค้ามาแสดงตนนำเครื่องและกล่องสินค้ามาติดต่อหน้าร้าน",
  "ยืนยันผ่านเบอร์โทรศัพท์เจ้าของเครื่องเดิมพร้อมข้อมูลงานซ่อม",
];

export default function CustomerAccessPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"PENDING" | "LINKED" | "ALL">("PENDING");

  // Approval Modal State
  const [approvalModalAccount, setApprovalModalAccount] = useState<Account | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [evidenceNote, setEvidenceNote] = useState<string>("");

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
      setApprovalModalAccount(null);
      setSelectedCustomerId("");
      setEvidenceNote("");
      await load();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "ทำรายการไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  // Handle open approval modal with smart matching
  const handleOpenApprovalModal = (account: Account) => {
    setApprovalModalAccount(account);
    setError("");

    // Smart Match: look for CRM customer with exact phone
    const cleanAccountPhone = account.phone.replace(/[\s-]/g, "");
    const matchedCustomer = data?.customers.find(
      (c) => c.phone.replace(/[\s-]/g, "") === cleanAccountPhone
    );

    if (matchedCustomer && !data?.links.some((l) => l.customerId === matchedCustomer.id)) {
      setSelectedCustomerId(matchedCustomer.id);
    } else {
      setSelectedCustomerId("");
    }

    setEvidenceNote(PRESET_EVIDENCES[0]);
  };

  const handleConfirmApproval = (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvalModalAccount || !selectedCustomerId) {
      setError("กรุณาเลือกลูกค้าในระบบ CRM ที่ต้องการเชื่อมต่อ");
      return;
    }
    if (evidenceNote.trim().length < 10) {
      setError("กรุณากรอกบันทึกหลักฐานอย่างน้อย 10 ตัวอักษร");
      return;
    }

    void mutate(
      {
        accountId: approvalModalAccount.id,
        customerId: selectedCustomerId,
        evidence: evidenceNote.trim(),
      },
      "POST"
    );
  };

  const accounts = data?.accounts || [];
  const links = data?.links || [];
  const customers = data?.customers || [];

  const pendingAccounts = accounts.filter((a) => !links.some((l) => l.accountId === a.id));
  const linkedAccounts = accounts.filter((a) => links.some((l) => l.accountId === a.id));

  const filteredAccounts = (filterTab === "PENDING" ? pendingAccounts : filterTab === "LINKED" ? linkedAccounts : accounts).filter((account) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return account.displayName.toLowerCase().includes(q) || account.phone.includes(q);
  });

  return (
    <div className="space-y-6 font-sans animate-fade-in">
      {/* 1. Header */}
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
            ระบบตรวจสอบสิทธิ์ความเป็นเจ้าของก่อนอนุญาตให้เข้าดูประวัติงานซ่อมและใบเสร็จย้อนหลัง ป้องกันข้อมูลรั่วไหลเมื่อมีการเปลี่ยนมือเจ้าของเบอร์โทรศัพท์
          </p>
        </div>

        <Button
          onClick={load}
          disabled={busy}
          variant="outline"
          className="h-10 px-4 gap-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl cursor-pointer"
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

      {/* 2. Overview Stats & Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card
          onClick={() => setFilterTab("PENDING")}
          className={`cursor-pointer transition-all border rounded-2xl ${
            filterTab === "PENDING"
              ? "border-amber-400 bg-amber-50/40 shadow-xs"
              : "border-slate-200/90 bg-white hover:border-slate-300"
          }`}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-700">รอดำเนินการตรวจสอบ (Pending)</p>
              <p className="text-2xl font-black text-amber-900 mt-1 font-mono">
                {pendingAccounts.length} <span className="text-xs font-normal text-slate-500">บัญชี</span>
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => setFilterTab("LINKED")}
          className={`cursor-pointer transition-all border rounded-2xl ${
            filterTab === "LINKED"
              ? "border-emerald-400 bg-emerald-50/40 shadow-xs"
              : "border-slate-200/90 bg-white hover:border-slate-300"
          }`}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-700">เชื่อมต่อสำเร็จแล้ว (Active)</p>
              <p className="text-2xl font-black text-emerald-900 mt-1 font-mono">
                {linkedAccounts.length} <span className="text-xs font-normal text-slate-500">บัญชี</span>
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => setFilterTab("ALL")}
          className={`cursor-pointer transition-all border rounded-2xl ${
            filterTab === "ALL"
              ? "border-slate-900 bg-slate-50 shadow-xs"
              : "border-slate-200/90 bg-white hover:border-slate-300"
          }`}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">บัญชีออนไลน์ทั้งหมด</p>
              <p className="text-2xl font-black text-slate-900 mt-1 font-mono">
                {accounts.length} <span className="text-xs font-normal text-slate-500">บัญชี</span>
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <Phone className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อลูกค้า หรือ เบอร์โทรศัพท์..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2 pl-9 pr-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
          />
        </div>

        <div className="flex items-center gap-2">
          {["PENDING", "LINKED", "ALL"].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterTab === tab
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab === "PENDING"
                ? `รอดำเนินการ (${pendingAccounts.length})`
                : tab === "LINKED"
                ? `เชื่อมต่อแล้ว (${linkedAccounts.length})`
                : `ทั้งหมด (${accounts.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Accounts Queue List */}
      <div className="space-y-4">
        {filteredAccounts.map((account) => {
          const link = links.find((l) => l.accountId === account.id);
          const customer = link ? customers.find((c) => c.id === link.customerId) : null;

          // Auto Match suggestion for pending accounts
          const cleanPhone = account.phone.replace(/[\s-]/g, "");
          const suggestedCustomer = !link
            ? customers.find((c) => c.phone.replace(/[\s-]/g, "") === cleanPhone)
            : null;

          return (
            <Card
              key={account.id}
              className={`border transition-all bg-white rounded-2xl shadow-2xs hover:shadow-xs ${
                link ? "border-slate-200/90" : "border-amber-200/80"
              }`}
            >
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`h-11 w-11 rounded-2xl flex items-center justify-center font-bold text-base shrink-0 border ${
                        link
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {link ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-base text-slate-900">
                          {account.displayName}
                        </span>
                        <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-lg">
                          {account.phone}
                        </span>
                        <span className="text-xs text-slate-400">
                          ID: {account.id.slice(-6)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        ลงทะเบียนออนไลน์เมื่อ: {formatDateThai(account.createdAt)}
                      </div>
                    </div>
                  </div>

                  {link ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 self-start md:self-center">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>สถานะ: ACTIVE (เชื่อมต่อแล้ว)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 self-start md:self-center">
                      <Clock className="h-3.5 w-3.5 text-amber-600" />
                      <span>สถานะ: PENDING (รออนุมัติ)</span>
                    </span>
                  )}
                </div>

                {/* Body Content */}
                {link ? (
                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl">
                    <div className="space-y-1">
                      <div className="text-xs text-slate-500 font-semibold">ข้อมูลลูกค้า CRM ที่เชื่อมโยง:</div>
                      <div className="font-bold text-sm text-slate-900">
                        {customer?.name || "ลูกค้าในระบบ"} ({customer?.phone || account.phone})
                      </div>
                      {link.evidence && (
                        <div className="text-xs text-slate-600 flex items-center gap-1.5">
                          <FileText className="h-3 w-3 text-emerald-600 shrink-0" />
                          <span>หลักฐานการตรวจ: {link.evidence}</span>
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
                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/40 border border-amber-100 p-4 rounded-xl">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                        <span>ตรวจพบข้อมูลที่ตรงกันในระบบ CRM</span>
                      </div>
                      {suggestedCustomer ? (
                        <p className="text-xs text-slate-700 font-medium">
                          พบลูกค้าชื่อ <span className="font-bold text-slate-900">{suggestedCustomer.name}</span> (เบอร์โทร {suggestedCustomer.phone}) ในฐานข้อมูล CRM
                        </p>
                      ) : (
                        <p className="text-xs text-slate-500">
                          ยังไม่มีประวัติชื่อหรือเบอร์ที่ตรงกัน พนักงานสามารถเลือกเชื่อมกับประวัติลูกค้าที่ถูกต้องได้
                        </p>
                      )}
                    </div>

                    <Button
                      onClick={() => handleOpenApprovalModal(account)}
                      className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-9 px-4 rounded-xl text-xs gap-1.5 shadow-2xs cursor-pointer shrink-0"
                    >
                      <UserCheck2 className="h-4 w-4" />
                      <span>ตรวจสอบ & อนุมัติการเชื่อมต่อ</span>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {!busy && !filteredAccounts.length && (
          <Card className="border-slate-200 bg-white p-12 text-center rounded-2xl">
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

      {/* 5. Approval Modal */}
      <Dialog open={!!approvalModalAccount} onOpenChange={(open) => !open && setApprovalModalAccount(null)}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 text-lg">
              <ShieldCheck className="h-5 w-5 text-teal-600" />
              <span>อนุมัติการเชื่อมต่อประวัติ CRM</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              บัญชีออนไลน์: {approvalModalAccount?.displayName} ({approvalModalAccount?.phone})
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmApproval} className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                เลือกลูกค้าในระบบ CRM ที่ตรงกับหลักฐาน <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                <option value="">-- ค้นพบและเลือกลูกค้า --</option>
                {customers
                  .filter((c) => !links.some((l) => l.customerId === c.id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone}) {c.nationalId ? `• ID: ${c.nationalId}` : ""}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                บันทึกหลักฐานการตรวจสอบต่อหน้า (Audit Evidence) <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                minLength={10}
                maxLength={500}
                rows={3}
                value={evidenceNote}
                onChange={(e) => setEvidenceNote(e.target.value)}
                placeholder="ระบุหลักฐานที่ตรวจ เช่น ตรวจใบรับซ่อมฉบับจริง หรือตรวจสอบบัตรประชาชนคู่กับเครื่อง..."
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600 resize-none"
              />

              {/* Quick preset chips */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {PRESET_EVIDENCES.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setEvidenceNote(preset)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 transition-colors text-left cursor-pointer"
                  >
                    + {preset.slice(0, 30)}...
                  </button>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setApprovalModalAccount(null)}
                disabled={busy}
                className="rounded-xl"
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                disabled={busy}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl gap-1.5"
              >
                {busy && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                <span>ยืนยันอนุมัติการเชื่อมต่อ</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
