"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  UserCheck,
  Users,
  Shield,
  ShieldAlert,
  Wrench,
  ShoppingCart,
  Plus,
  Search,
  Building2,
  Percent,
  DollarSign,
  Edit2,
  Trash2,
  Key,
  CheckCircle2,
  XCircle,
  Mail,
  UserPlus,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { formatTHB } from "@/lib/utils";

export type RoleType = "SUPER_ADMIN" | "BRANCH_MANAGER" | "TECHNICIAN" | "CASHIER";

interface UserProfile {
  id: string;
  name: string;
  username: string;
  email?: string | null;
  role: string;
  branchId: string;
  branch?: {
    id: string;
    name: string;
    code: string;
  };
  repairCommissionRate?: number; // %
  salesCommissionRate?: number; // %
  baseSalary?: number;
  isActive?: boolean;
}

const DEFAULT_USERS_DATA: UserProfile[] = [
  {
    id: "cmwnc36pk0003z3fxhcmjra89",
    name: "สมชาย ผู้จัดการใหญ่",
    username: "admin",
    email: "somchai@mobileshop.co.th",
    role: "SUPER_ADMIN",
    branchId: "cmwnc36pa0000z3fxx6o3d40a",
    branch: { id: "cmwnc36pa0000z3fxx6o3d40a", name: "MobileShop HQ (สุขุมวิท)", code: "HQ" },
    repairCommissionRate: 0,
    salesCommissionRate: 2.0,
    baseSalary: 45000,
    isActive: true,
  },
  {
    id: "cmwnc36pm0005z3fxfs0n6kmq",
    name: "วิภาดา สาขาเก้า",
    username: "manager2",
    email: "vipada@mobileshop.co.th",
    role: "BRANCH_MANAGER",
    branchId: "cmwnc36ph0001z3fxk19vxzom",
    branch: { id: "cmwnc36ph0001z3fxk19vxzom", name: "MobileShop สาขา 2 (เซ็นทรัลพระราม 9)", code: "BR-02" },
    repairCommissionRate: 5.0,
    salesCommissionRate: 1.5,
    baseSalary: 32000,
    isActive: true,
  },
  {
    id: "cmwnc36pp0007z3fxempw03xb",
    name: "ช่างเอก มือทอง",
    username: "tech_ek",
    email: "ek@mobileshop.co.th",
    role: "TECHNICIAN",
    branchId: "cmwnc36pa0000z3fxx6o3d40a",
    branch: { id: "cmwnc36pa0000z3fxx6o3d40a", name: "MobileShop HQ (สุขุมวิท)", code: "HQ" },
    repairCommissionRate: 15.0, // 15% ของค่าแรงซ่อม
    salesCommissionRate: 1.0,
    baseSalary: 22000,
    isActive: true,
  },
  {
    id: "cmwnc36pr0009z3fxgwves47p",
    name: "ช่างนนท์ สายไว",
    username: "tech_non",
    email: "non@mobileshop.co.th",
    role: "TECHNICIAN",
    branchId: "cmwnc36ph0001z3fxk19vxzom",
    branch: { id: "cmwnc36ph0001z3fxk19vxzom", name: "MobileShop สาขา 2 (เซ็นทรัลพระราม 9)", code: "BR-02" },
    repairCommissionRate: 15.0,
    salesCommissionRate: 1.0,
    baseSalary: 20000,
    isActive: true,
  },
  {
    id: "cmwnc36pu000bz3fxukzq50yd",
    name: "น้องแพรว แคชเชียร์",
    username: "cashier1",
    email: "praew@mobileshop.co.th",
    role: "CASHIER",
    branchId: "cmwnc36pa0000z3fxx6o3d40a",
    branch: { id: "cmwnc36pa0000z3fxx6o3d40a", name: "MobileShop HQ (สุขุมวิท)", code: "HQ" },
    repairCommissionRate: 0,
    salesCommissionRate: 1.5, // 1.5% ของยอดขายหน้าร้าน
    baseSalary: 16500,
    isActive: true,
  },
  {
    id: "cmwnc36px000dz3fxfegn9stf",
    name: "น้องก้อย แคชเชียร์",
    username: "cashier2",
    email: "koi@mobileshop.co.th",
    role: "CASHIER",
    branchId: "cmwnc36ph0001z3fxk19vxzom",
    branch: { id: "cmwnc36ph0001z3fxk19vxzom", name: "MobileShop สาขา 2 (เซ็นทรัลพระราม 9)", code: "BR-02" },
    repairCommissionRate: 0,
    salesCommissionRate: 1.5,
    baseSalary: 16500,
    isActive: true,
  },
];

const ROLE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; icon: React.ComponentType<{ className?: string }> }
> = {
  SUPER_ADMIN: {
    label: "ผู้ดูแลระบบสูงสุด",
    color: "text-purple-700",
    bg: "bg-purple-50",
    border: "border-purple-200",
    icon: Shield,
  },
  ADMIN: {
    label: "ผู้ดูแลระบบ",
    color: "text-purple-700",
    bg: "bg-purple-50",
    border: "border-purple-200",
    icon: Shield,
  },
  BRANCH_MANAGER: {
    label: "ผู้จัดการสาขา",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: Building2,
  },
  MANAGER: {
    label: "ผู้จัดการสาขา",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: Building2,
  },
  TECHNICIAN: {
    label: "ช่างเทคนิคซ่อม",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: Wrench,
  },
  CASHIER: {
    label: "แคชเชียร์หน้าร้าน",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: ShoppingCart,
  },
};

export default function UsersPage() {
  const { currentBranch, branches } = useApp();
  const [users, setUsers] = useState<UserProfile[]>(DEFAULT_USERS_DATA);
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState<string>("TECHNICIAN");
  const [formBranchId, setFormBranchId] = useState(currentBranch.id);
  const [formRepairRate, setFormRepairRate] = useState<number>(15.0);
  const [formSalesRate, setFormSalesRate] = useState<number>(1.5);
  const [formSalary, setFormSalary] = useState<number>(20000);

  // Fetch users from API
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          // Merge with commission settings if not in DB
          setUsers(
            data.map((u: any) => ({
              ...u,
              role: u.role === "ADMIN" ? "SUPER_ADMIN" : u.role === "MANAGER" ? "BRANCH_MANAGER" : u.role,
              repairCommissionRate: u.role === "TECHNICIAN" ? 15.0 : 0,
              salesCommissionRate: u.role === "CASHIER" ? 1.5 : 1.0,
              baseSalary: u.role === "ADMIN" ? 45000 : u.role === "MANAGER" ? 32000 : u.role === "TECHNICIAN" ? 22000 : 16500,
              isActive: true,
            }))
          );
        }
      }
    } catch (err) {
      console.warn("Using default users fallback:", err);
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormName("");
    setFormUsername("");
    setFormPassword("123456");
    setFormEmail("");
    setFormRole("TECHNICIAN");
    setFormBranchId(currentBranch.id);
    setFormRepairRate(15.0);
    setFormSalesRate(1.0);
    setFormSalary(22000);
    setModalOpen(true);
  };

  const openEditModal = (u: UserProfile) => {
    setEditingUser(u);
    setFormName(u.name);
    setFormUsername(u.username);
    setFormPassword("");
    setFormEmail(u.email || "");
    setFormRole(u.role);
    setFormBranchId(u.branchId);
    setFormRepairRate(u.repairCommissionRate ?? 15.0);
    setFormSalesRate(u.salesCommissionRate ?? 1.5);
    setFormSalary(u.baseSalary ?? 20000);
    setModalOpen(true);
  };

  const handleSaveUser = async () => {
    if (!formName || !formUsername) {
      alert("กรุณากรอกชื่อและชื่อผู้ใช้งาน (Username)");
      return;
    }

    const branch = branches.find((b) => b.id === formBranchId) || currentBranch;
    // Normalized role for prisma
    const prismaRole =
      formRole === "SUPER_ADMIN"
        ? "ADMIN"
        : formRole === "BRANCH_MANAGER"
        ? "MANAGER"
        : formRole;

    try {
      if (editingUser) {
        const payload: any = {
          id: editingUser.id,
          name: formName,
          username: formUsername,
          email: formEmail,
          role: prismaRole,
          branchId: formBranchId,
        };
        if (formPassword) payload.password = formPassword;

        await fetch("/api/users", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        setUsers((prev) =>
          prev.map((u) =>
            u.id === editingUser.id
              ? {
                  ...u,
                  name: formName,
                  username: formUsername,
                  email: formEmail,
                  role: formRole,
                  branchId: formBranchId,
                  branch: { id: branch.id, name: branch.name, code: branch.code },
                  repairCommissionRate: formRepairRate,
                  salesCommissionRate: formSalesRate,
                  baseSalary: formSalary,
                }
              : u
          )
        );
      } else {
        const payload = {
          name: formName,
          username: formUsername,
          password: formPassword || "123456",
          email: formEmail,
          role: prismaRole,
          branchId: formBranchId,
        };

        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        let newId = `u-${Date.now()}`;
        if (res.ok) {
          const created = await res.json();
          newId = created.id;
        }

        const newUser: UserProfile = {
          id: newId,
          name: formName,
          username: formUsername,
          email: formEmail,
          role: formRole,
          branchId: formBranchId,
          branch: { id: branch.id, name: branch.name, code: branch.code },
          repairCommissionRate: formRepairRate,
          salesCommissionRate: formSalesRate,
          baseSalary: formSalary,
          isActive: true,
        };
        setUsers((prev) => [...prev, newUser]);
      }

      setModalOpen(false);
    } catch (err) {
      console.error("Save error:", err);
      setModalOpen(false);
    }
  };

  const handleToggleActive = (id: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, isActive: !u.isActive } : u))
    );
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (confirm(`คุณแน่ใจว่าต้องการลบพนักงาน "${name}" หรือไม่?`)) {
      try {
        await fetch(`/api/users?id=${id}`, { method: "DELETE" });
      } catch (e) {}
      setUsers((prev) => prev.filter((u) => u.id !== id));
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchRole =
        roleFilter === "ALL" ||
        u.role === roleFilter ||
        (roleFilter === "SUPER_ADMIN" && u.role === "ADMIN") ||
        (roleFilter === "BRANCH_MANAGER" && u.role === "MANAGER");
      const matchBranch = branchFilter === "ALL" || u.branch?.code === branchFilter || u.branchId === branchFilter;
      const matchSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchRole && matchBranch && matchSearch;
    });
  }, [users, roleFilter, branchFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              พนักงาน & สิทธิ์การใช้งาน (Staff & Permissions)
            </h1>
            <p className="text-xs text-slate-500">
              จัดการบทบาทหน้าที่ (Super Admin, Branch Manager, Technician, Cashier) สังกัดสาขา และอัตราคอมมิชชั่น
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={openCreateModal}
            className="gap-2 text-xs h-9 bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
          >
            <UserPlus className="h-3.5 w-3.5" />
            เพิ่มพนักงานใหม่
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="border-slate-200 bg-white shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>พนักงานทั้งหมด</span>
              <Users className="h-4 w-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">
              {users.length} <span className="text-xs font-normal text-slate-400">คน</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/40 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-purple-700 mb-1">
              <span>ผู้ดูแลระบบ & ผู้จัดการ</span>
              <Shield className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-900 tabular-nums">
              {users.filter((u) => u.role.includes("ADMIN") || u.role.includes("MANAGER")).length}{" "}
              <span className="text-xs font-normal text-purple-600">คน</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/40 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-emerald-700 mb-1">
              <span>ช่างเทคนิคประจำร้าน</span>
              <Wrench className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-800 tabular-nums">
              {users.filter((u) => u.role === "TECHNICIAN").length}{" "}
              <span className="text-xs font-normal text-emerald-600">คน</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/40 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-amber-700 mb-1">
              <span>แคชเชียร์หน้าร้าน</span>
              <ShoppingCart className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-amber-800 tabular-nums">
              {users.filter((u) => u.role === "CASHIER").length}{" "}
              <span className="text-xs font-normal text-amber-600">คน</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-xs text-slate-700">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-medium">สาขา:</span>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-800 outline-none cursor-pointer"
            >
              <option value="ALL">ทุกสาขา</option>
              {branches.map((b) => (
                <option key={b.id} value={b.code}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-1 bg-slate-50 text-xs">
            {["ALL", "SUPER_ADMIN", "BRANCH_MANAGER", "TECHNICIAN", "CASHIER"].map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  roleFilter === r
                    ? "bg-white text-slate-900 shadow-2xs border border-slate-200/80 font-semibold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {r === "ALL" && "ทั้งหมด"}
                {r === "SUPER_ADMIN" && "Admin"}
                {r === "BRANCH_MANAGER" && "ผู้จัดการ"}
                {r === "TECHNICIAN" && "ช่าง"}
                {r === "CASHIER" && "แคชเชียร์"}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="ค้นหาชื่อ, username, อีเมล..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-9 bg-slate-50/50"
          />
        </div>
      </div>

      {/* Users Table */}
      <Card className="border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/75 border-b border-slate-200">
              <TableRow>
                <TableHead className="text-xs font-semibold text-slate-600">พนักงาน / ข้อมูลติดต่อ</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">ตำแหน่ง & สิทธิ์</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">สาขาประจำการ</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">คอมมิชชั่นซ่อม</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">คอมมิชชั่นขาย</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-right">ฐานเงินเดือน</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">สถานะ</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((u) => {
                const conf = ROLE_CONFIG[u.role] || ROLE_CONFIG.CASHIER;
                const RoleIcon = conf.icon;

                return (
                  <TableRow key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <TableCell className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 font-bold text-xs text-slate-700 border border-slate-200">
                          {u.name.slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-slate-900">{u.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            @{u.username} • {u.email || "ไม่มีอีเมล"}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${conf.bg} ${conf.color} ${conf.border}`}
                      >
                        <RoleIcon className="h-3 w-3" />
                        <span>{conf.label}</span>
                      </span>
                    </TableCell>

                    <TableCell className="py-3">
                      <span className="text-xs font-medium text-slate-700">
                        {u.branch?.name || u.branchId}
                      </span>
                    </TableCell>

                    <TableCell className="py-3 text-center font-mono text-xs text-emerald-700 font-semibold">
                      {u.repairCommissionRate && u.repairCommissionRate > 0
                        ? `${u.repairCommissionRate}%`
                        : "-"}
                    </TableCell>

                    <TableCell className="py-3 text-center font-mono text-xs text-blue-700 font-semibold">
                      {u.salesCommissionRate && u.salesCommissionRate > 0
                        ? `${u.salesCommissionRate}%`
                        : "-"}
                    </TableCell>

                    <TableCell className="py-3 text-right font-mono text-xs text-slate-900 font-semibold">
                      {u.baseSalary ? formatTHB(u.baseSalary) : "-"}
                    </TableCell>

                    <TableCell className="py-3 text-center">
                      <button
                        onClick={() => handleToggleActive(u.id)}
                        className="cursor-pointer"
                        title="คลิกเพื่อสลับสถานะ"
                      >
                        {u.isActive ? (
                          <Badge variant="success" className="text-[10px]">
                            เปิดใช้งาน
                          </Badge>
                        ) : (
                          <Badge variant="danger" className="text-[10px]">
                            ระงับการเข้าใช้
                          </Badge>
                        )}
                      </button>
                    </TableCell>

                    <TableCell className="py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          title="แก้ไขข้อมูลพนักงาน"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="ลบพนักงาน"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Add / Edit User Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogHeader>
          <DialogTitle onClose={() => setModalOpen(false)}>
            {editingUser ? `แก้ไขข้อมูลพนักงาน (${editingUser.name})` : "เพิ่มพนักงานใหม่"}
          </DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">ชื่อ-นามสกุล *</label>
              <Input
                placeholder="เช่น นายช่างเก่ง นามสกุลดี"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="text-xs h-9"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">ชื่อผู้ใช้ (Username) *</label>
              <Input
                placeholder="เช่น tech_keng"
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
                className="text-xs h-9 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">
                {editingUser ? "รหัสผ่านใหม่ (เว้นว่างหากไม่เปลี่ยน)" : "รหัสผ่านเริ่มต้น *"}
              </label>
              <Input
                type="password"
                placeholder={editingUser ? "••••••••" : "ระบุรหัสผ่าน"}
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                className="text-xs h-9 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">อีเมลพนักงาน</label>
              <Input
                type="email"
                placeholder="staff@mobileshop.co.th"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">ตำแหน่ง & สิทธิ์ *</label>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 bg-white"
              >
                <option value="SUPER_ADMIN">ผู้ดูแลระบบสูงสุด (SUPER_ADMIN)</option>
                <option value="BRANCH_MANAGER">ผู้จัดการสาขา (BRANCH_MANAGER)</option>
                <option value="TECHNICIAN">ช่างเทคนิคซ่อม (TECHNICIAN)</option>
                <option value="CASHIER">แคชเชียร์หน้าร้าน (CASHIER)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">สังกัดสาขา *</label>
              <select
                value={formBranchId}
                onChange={(e) => setFormBranchId(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 bg-white"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">ค่าคอมงานซ่อม (%)</label>
              <Input
                type="number"
                step="0.5"
                placeholder="15.0"
                value={formRepairRate}
                onChange={(e) => setFormRepairRate(Number(e.target.value))}
                className="text-xs h-9 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">ค่าคอมยอดขาย (%)</label>
              <Input
                type="number"
                step="0.5"
                placeholder="1.5"
                value={formSalesRate}
                onChange={(e) => setFormSalesRate(Number(e.target.value))}
                className="text-xs h-9 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">ฐานเงินเดือน (บาท)</label>
              <Input
                type="number"
                placeholder="20000"
                value={formSalary}
                onChange={(e) => setFormSalary(Number(e.target.value))}
                className="text-xs h-9 font-mono"
              />
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setModalOpen(false)} className="text-xs">
            ยกเลิก
          </Button>
          <Button onClick={handleSaveUser} className="text-xs bg-blue-600 text-white hover:bg-blue-700">
            {editingUser ? "บันทึกการแก้ไข" : "เพิ่มพนักงาน"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
