"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Store, Loader2, Sparkles, KeyRound } from "lucide-react";

export default function StaffLoginPage() {
  const router = useRouter();
  const [shopSlug, setShopSlug] = useState("mobileshop");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const fillDemo = (slug: string, user: string, pass: string) => {
    setShopSlug(slug);
    setUsername(user);
    setPassword(pass);
    setError("");
  };

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-16 flex items-center justify-center font-sans">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-slate-200/90 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-xs">
            <Store className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">เข้าสู่ระบบร้าน</h1>
            <p className="text-xs text-slate-500 font-medium">FixMe Staff Portal</p>
          </div>
        </div>

        {/* Quick Demo Fill Helper */}
        <div className="mb-6 rounded-xl border border-teal-200/80 bg-teal-50/70 p-3.5 text-xs text-teal-900">
          <div className="flex items-center justify-between font-bold text-teal-950 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-teal-600" />
              <span>บัญชีทดสอบด่วน</span>
            </span>
            <span className="text-[11px] text-teal-700 bg-teal-100/80 px-2 py-0.5 rounded-full font-mono">
              Ready
            </span>
          </div>
          <div className="text-slate-600 space-y-0.5 font-mono text-[11px]">
            <div>ร้าน: <span className="font-semibold text-slate-900">fixme-service</span> • ผู้ใช้: <span className="font-semibold text-slate-900">fixme_admin</span></div>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fillDemo("fixme-service", "fixme_admin", "P@ssw0rd123!")}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-900 bg-white border border-teal-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>เติมร้าน fixme-service</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemo("mobileshop", "admin", "password123")}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              <span>เติม dev seed</span>
            </button>
          </div>
        </div>

        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError("");
            try {
              const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ shopSlug, username, password }),
              });
              const result = await response.json();
              if (!response.ok) throw new Error(result.error);
              router.push("/dashboard");
              router.refresh();
            } catch (failure) {
              setError(failure instanceof Error ? failure.message : "เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่");
            } finally {
              setBusy(false);
            }
          }}
        >
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1.5">
              รหัสร้าน (Shop slug)
            </label>
            <input
              name="shopSlug"
              value={shopSlug}
              onChange={(e) => setShopSlug(e.target.value)}
              autoComplete="organization"
              required
              maxLength={100}
              placeholder="เช่น mobileshop"
              className="block w-full rounded-xl border border-slate-300 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1.5">
              ชื่อผู้ใช้ (Username)
            </label>
            <input
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              maxLength={100}
              placeholder="admin"
              className="block w-full rounded-xl border border-slate-300 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1.5">
              รหัสผ่าน (Password)
            </label>
            <input
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              maxLength={256}
              className="block w-full rounded-xl border border-slate-300 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition-all"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-medium text-rose-800 animate-fade-in">
              {error}
            </p>
          )}

          <button
            disabled={busy}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 font-bold text-white hover:bg-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:opacity-60 transition-all shadow-xs cursor-pointer"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบร้าน"}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs">
          <Link href="/landing" className="font-semibold text-teal-700 hover:text-teal-900 hover:underline">
            ← หน้าหลักสาธารณะ
          </Link>
          <Link href="/register" className="font-semibold text-slate-600 hover:text-slate-900 hover:underline">
            เปิดร้านใหม่ (SaaS Register)
          </Link>
        </div>
      </div>
    </main>
  );
}
