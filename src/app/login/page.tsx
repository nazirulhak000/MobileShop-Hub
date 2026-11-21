"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { FixMePhoneIcon } from "@/components/landing/FixMeLogo";

export default function StaffLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-16 flex items-center justify-center font-sans">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-slate-200/90 shadow-sm">
        {/* Platform Brand Header */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/20">
            <FixMePhoneIcon size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              เข้าสู่ระบบร้านค้า
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Staff Portal • ระบบบริหารงานซ่อมร้านมือถือ
            </p>
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
                body: JSON.stringify({
                  username: username.trim(),
                  password,
                }),
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
          {/* Username Field */}
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
              placeholder="กรอกชื่อผู้ใช้ของคุณ เช่น admin"
              className="block w-full rounded-xl border border-slate-300 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all"
            />
          </div>

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-semibold text-slate-800">
                รหัสผ่าน (Password)
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                ลืมรหัสผ่าน?
              </Link>
            </div>
            <input
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              maxLength={256}
              placeholder="••••••••••••"
              className="block w-full rounded-xl border border-slate-300 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-medium text-rose-800 animate-fade-in">
              {error}
            </p>
          )}

          {/* Action Button */}
          <button
            disabled={busy}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60 transition-all shadow-md shadow-blue-500/20 cursor-pointer"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs">
          <Link href="/" className="font-semibold text-slate-500 hover:text-slate-800 hover:underline">
            ← หน้าหลัก
          </Link>
          <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-800 hover:underline">
            เปิดร้านใหม่ (SaaS Register)
          </Link>
        </div>
      </div>
    </main>
  );
}
