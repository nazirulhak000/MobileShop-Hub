"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
export interface BranchInfo { id: string; name: string; code: string }
export interface UserInfo { id: string; name: string; role: "ADMIN" | "MANAGER" | "TECHNICIAN" | "CASHIER"; username: string; branchCode: string }
interface AppContextType {
  currentBranch: BranchInfo; setCurrentBranch: (branch: BranchInfo) => void;
  currentUser: UserInfo; branches: BranchInfo[]; users: UserInfo[];
  loading: boolean; logout: () => Promise<void>;
}
const AppContext = createContext<AppContextType | undefined>(undefined);
const emptyBranch: BranchInfo = { id: "", name: "", code: "" };
const emptyUser: UserInfo = { id: "", name: "", username: "", role: "CASHIER", branchCode: "" };
export function AppProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Match whole segments only: startsWith("/customer") would also match /customers and /customer-access.
  const publicPage = pathname === "/" || pathname === "/login" || pathname === "/register" || ["/store", "/landing", "/track", "/customer", "/s"].some(p => pathname === p || pathname.startsWith(p + "/"));
  const [currentBranch, setBranch] = useState(emptyBranch);
  const [currentUser, setUser] = useState(emptyUser);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (publicPage) { setUser(emptyUser); setBranch(emptyBranch); setBranches([]); setUsers([]); setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true);
    fetch("/api/auth/me", { cache: "no-store", signal: controller.signal }).then(async response => {
      if (!response.ok) { window.location.assign("/login"); return; }
      const data = await response.json();
      setUser(data.user); setBranches(data.branches); setUsers(data.users);
      setBranch(previous => data.branches.find((b: BranchInfo) => b.id === previous.id) ?? data.branches.find((b: BranchInfo) => b.id === data.user.branchId) ?? emptyBranch);
      setLoading(false);
    }).catch(error => { if (error.name !== "AbortError") window.location.assign("/login"); });
    return () => controller.abort();
  }, [publicPage]);
  async function logout() {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok) throw new Error("ออกจากระบบไม่สำเร็จ กรุณาลองใหม่");
    localStorage.removeItem("mobileshop_user"); localStorage.removeItem("mobileshop_branch_code");
    window.location.assign("/login");
  }
  return <AppContext.Provider value={{ currentBranch, currentUser, branches, users, loading, logout, setCurrentBranch: branch => { const allowed = branches.find(b => b.id === branch.id); if (allowed) setBranch(allowed); } }}>{children}</AppContext.Provider>;
}
export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used within AppProvider");
  return value;
}
