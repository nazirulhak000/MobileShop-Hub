"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface BranchInfo {
  id: string;
  name: string;
  code: string;
}

export interface UserInfo {
  id: string;
  name: string;
  role: "ADMIN" | "MANAGER" | "TECHNICIAN" | "CASHIER";
  username: string;
  branchCode: string;
}

const DEFAULT_BRANCHES: BranchInfo[] = [
  { id: "hq", name: "HQ (สำนักงานใหญ่ สุขุมวิท)", code: "HQ" },
  { id: "br2", name: "สาขา 2 (เซ็นทรัลพระราม 9)", code: "BR-02" },
];

const DEFAULT_USERS: UserInfo[] = [
  { id: "u-admin", name: "สมชาย ผู้จัดการใหญ่", role: "ADMIN", username: "admin", branchCode: "HQ" },
  { id: "u-manager", name: "วิภาดา สาขาเก้า", role: "MANAGER", username: "manager2", branchCode: "BR-02" },
  { id: "u-tech1", name: "ช่างเอก มือทอง", role: "TECHNICIAN", username: "tech_ek", branchCode: "HQ" },
  { id: "u-tech2", name: "ช่างนนท์ สายไว", role: "TECHNICIAN", username: "tech_non", branchCode: "BR-02" },
  { id: "u-cashier1", name: "น้องแพรว แคชเชียร์", role: "CASHIER", username: "cashier1", branchCode: "HQ" },
  { id: "u-cashier2", name: "น้องก้อย แคชเชียร์", role: "CASHIER", username: "cashier2", branchCode: "BR-02" },
];

interface AppContextType {
  currentBranch: BranchInfo;
  setCurrentBranch: (branch: BranchInfo) => void;
  currentUser: UserInfo;
  setCurrentUser: (user: UserInfo) => void;
  branches: BranchInfo[];
  users: UserInfo[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentBranch, setCurrentBranch] = useState<BranchInfo>(DEFAULT_BRANCHES[0]);
  const [currentUser, setCurrentUser] = useState<UserInfo>(DEFAULT_USERS[0]);

  // Persist in localStorage if browser
  useEffect(() => {
    const savedBranchCode = localStorage.getItem("mobileshop_branch_code");
    if (savedBranchCode) {
      const found = DEFAULT_BRANCHES.find((b) => b.code === savedBranchCode);
      if (found) setCurrentBranch(found);
    }
    const savedUsername = localStorage.getItem("mobileshop_user");
    if (savedUsername) {
      const foundUser = DEFAULT_USERS.find((u) => u.username === savedUsername);
      if (foundUser) setCurrentUser(foundUser);
    }
  }, []);

  const handleSetBranch = (b: BranchInfo) => {
    setCurrentBranch(b);
    localStorage.setItem("mobileshop_branch_code", b.code);
  };

  const handleSetUser = (u: UserInfo) => {
    setCurrentUser(u);
    localStorage.setItem("mobileshop_user", u.username);
  };

  return (
    <AppContext.Provider
      value={{
        currentBranch,
        setCurrentBranch: handleSetBranch,
        currentUser,
        setCurrentUser: handleSetUser,
        branches: DEFAULT_BRANCHES,
        users: DEFAULT_USERS,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
