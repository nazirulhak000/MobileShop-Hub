"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  UserCheck,
  Users,
  Shield,
  ShieldAlert,
  Wrench,
  ShoppingCart,
  Search,
  Building2,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  UserPlus,
  Lock,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";

export type RoleType = "ADMIN" | "MANAGER" | "TECHNICIAN" | "CASHIER";

interface UserProfile {
  id: string;
  name: string;
  username: string;
  email?: string | null;
  role: RoleType | string;
  branchId: string;
  branch?: {
    id: string;
    name: string;
    code: string;
  };
  isActive?: boolean;
}

/** Normalize role strings from API or legacy format */
const normalizeRole = (role: string): RoleType => {
  if (role === "SUPER_ADMIN") return "ADMIN";
  if (role === "BRANCH_MANAGER") return "MANAGER";
  if (role === "ADMIN" || role === "MANAGER" || role === "TECHNICIAN" || role === "CASHIER") return role;
  return "CASHIER";
};

/** Reads the JSON error message from a failed API response. */
async function apiError(res: Response, fallback: string): Promise<string> {
  try {
    const json = await res.json();
    if (json && typeof json.error === "string" && json.error) return json.error;
  } catch {
    // Non-JSON body; use fallback
  }
  return fallback;
}

const ROLE_CONFIG: Record<
  RoleType,
  { label: string; color: string; bg: string; border: string; icon: React.ComponentType<{ className?: string }> }
> = {
  ADMIN: {
    label: "ผู้ดูแลระบบ (Admin)",
    color: "text-purple-700",
    bg: "bg-purple-50",
    border: "border-purple-200",
    icon: Shield,
  },
  MANAGER: {
    label: "ผู้จัดการสาขา (Manager)",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: Building2,
  },
  TECHNICIAN: {
    label: "ช่างเทคนิคซ่อม (Technician)",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: Wrench,
  },
  CASHIER: {
    label: "แคชเชียร์หน้าร้าน (Cashier)",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: ShoppingCart,
  },
};

export default function UsersPage() {
  const { currentBranch, branches, currentUser } = useApp();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState<RoleType>("TECHNICIAN");
  const [formBranchId, setFormBranchId] = useState(currentBranch.id || "");

  // Fetch users from API
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (!res.ok) {
        setLoadError(await apiError(res, "ไม่สามารถโหลดรายชื่อพนักงานได้"));
        return;
      }
      const data = await res.json();
      if (!Array.isArray(data)) {
        setLoadError("ไม่สามารถโหลดรายชื่อพนักงานได้");
        return;
      }
      setLoadError(null);
      setUsers(
        data.map((u: UserProfile) => ({
          ...u,
          role: normalizeRole(u.role),
          isActive: u.isActive !== false,
        }))
      );
    } catch {
      setLoadError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormName("");
    setFormUsername("");
    setFormPassword("");
    setShowPassword(false);
    setFormEmail("");
    setFormRole("TECHNICIAN");
    setFormBranchId(currentBranch.id || (branches[0]?.id ?? ""));
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (u: UserProfile) => {
    setEditingUser(u);
    setFormName(u.name);
    setFormUsername(u.username);
    setFormPassword("");
    setShowPassword(false);
    setFormEmail(u.email || "");
    setFormRole(normalizeRole(u.role));
    setFormBranchId(u.branchId);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSaveUser = async () => {
    if (saving) return;
    if (!formName.trim() || !formUsername.trim()) {
      setFormError("กรุณากรอกชื่อและชื่อผู้ใช้งาน (Username)");
      return;
    }

    if (!formBranchId) {
      setFormError("กรุณาเลือกสาขาที่พนักงานสังกัด");
      return;
    }

    // Password validation: required on create, optional on edit
    if (!editingUser || formPassword) {
      if (formPassword.length < 12 || formPassword.length > 72) {
        setFormError("รหัสผ่านต้องยาว 12-72 ตัวอักษร");
        return;
      }
    }

    // Self demotion check in UI
    const isSelf = editingUser && editingUser.id === currentUser?.id;
    if (isSelf && formRole !== "ADMIN") {
      setFormError("ไม่สามารถลดสิทธิ์บัญชีของตัวเองได้ (ต้องคงสถานะผู้ดูแลระบบ ADMIN)");
      return;
    }

    const payload: Record<string, unknown> = {
      name: formName.trim(),
      username: formUsername.trim(),
      email: formEmail.trim() || null,
      role: formRole,
      branchId: formBranchId,
    };
    if (formPassword) payload.password = formPassword;
    if (editingUser) payload.id = editingUser.id;

    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch("/api/users", {
        method: editingUser ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setFormError(await apiError(res, "บันทึกข้อมูลพนักงานไม่สำเร็จ"));
        return;
      }
      setModalOpen(false);
      setFormPassword("");
      await fetchUsers();
    } catch {
      setFormError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (u: UserProfile) => {
    if (busyUserId) return;
    if (u.id === currentUser?.id) {
      alert("ไม่สามารถระงับบัญชีของตัวเองได้");
      return;
    }

    const next = !u.isActive;
    if (!next && !confirm(`ระงับการเข้าใช้งานของ "${u.name}" ใช่หรือไม่? ผู้ใช้จะถูกออกจากระบบทันที`)) {
      return;
    }
    setBusyUserId(u.id);
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: u.id, isActive: next }),
      });
      if (!res.ok) {
        alert(await apiError(res, "เปลี่ยนสถานะผู้ใช้ไม่สำเร็จ"));
        return;
      }
      await fetchUsers();
    } catch {
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setBusyUserId(null);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (busyUserId) return;
    if (id === currentUser?.id) {
      alert("ไม่สามารถลบบัญชีของตัวเองได้");
      return;
    }

    if (
      !confirm(
        `ต้องการปิดการใช้งานพนักงาน "${name}" หรือไม่?\n(ข้อมูลประวัติการทำงาน การซ่อม และการขายจะยังคงอยู่ และเปิดใช้งานใหม่ได้เสมอ)`
      )
    ) {
      return;
    }
    setBusyUserId(id);
    try {
      const res = await fetch(`/api/users?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        alert(await apiError(res, "ลบพนักงานไม่สำเร็จ"));
        return;
      }
      await fetchUsers();
    } catch {
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setBusyUserId(null);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchRole = roleFilter === "ALL" || u.role === roleFilter;
      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && u.isActive) ||
        (statusFilter === "INACTIVE" && !u.isActive);
      const matchBranch = branchFilter === "ALL" || u.branch?.code === branchFilter || u.branchId === branchFilter;
      const matchSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchRole && matchStatus && matchBranch && matchSearch;
    });
  }, [users, roleFilter, statusFilter, branchFilter, searchQuery]);

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
              พนักงาน & สิทธิ์การใช้งาน (Staff & RBAC)
            </h1>
            <p className="text-xs text-slate-500">
              กำหนดบทบาท (Admin, Manager, Technician, Cashier) สาขาที่สังกัด ความปลอดภัยรหัสผ่าน และสถานะการทำงาน
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
              {users.filter((u) => u.role === "ADMIN" || u.role === "MANAGER").length}{" "}
              <span className="text-xs font-normal text-purple-600">คน</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/40 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-emerald-700 mb-1">
              <span>ช่างเทคนิคซ่อม</span>
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
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-1 bg-slate-50 text-xs">
            {(["ALL", "ADMIN", "MANAGER", "TECHNICIAN", "CASHIER"] as const).map((r) => (
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
                {r === "ADMIN" && "Admin"}
                {r === "MANAGER" && "ผู้จัดการ"}
                {r === "TECHNICIAN" && "ช่างซ่อม"}
                {r === "CASHIER" && "แคชเชียร์"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-1 bg-slate-50 text-xs">
            {(["ALL", "ACTIVE", "INACTIVE"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  statusFilter === st
                    ? "bg-white text-slate-900 shadow-2xs border border-slate-200/80 font-semibold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {st === "ALL" && "ทุกสถานะ"}
                {st === "ACTIVE" && "ใช้งานอยู่"}
                {st === "INACTIVE" && "ถูกระงับ"}
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
                <TableHead className="text-xs font-semibold text-slate-600">ตำแหน่ง & สิทธิ์ (Role)</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">สังกัดสาขา</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">สถานะการใช้งาน</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-center">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(loading || loadError || filteredUsers.length === 0) && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className={`py-8 text-center text-xs ${loadError ? "text-rose-600" : "text-slate-400"}`}
                  >
                    {loading ? "กำลังโหลดข้อมูล..." : loadError ? loadError : "ไม่พบพนักงานที่ค้นหา"}
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                filteredUsers.map((u) => {
                  const roleKey = normalizeRole(u.role);
                  const conf = ROLE_CONFIG[roleKey] || ROLE_CONFIG.CASHIER;
                  const RoleIcon = conf.icon;
                  const isSelf = u.id === currentUser?.id;

                  return (
                    <TableRow key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 font-bold text-xs text-slate-700 border border-slate-200">
                            {u.name.slice(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-slate-900">{u.name}</span>
                              {isSelf && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                                  บัญชีของคุณ
                                </span>
                              )}
                            </div>
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
                        <div className="text-xs font-medium text-slate-700">
                          {u.branch?.name || "ไม่ระบุสาขา"}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          รหัสสาขา: {u.branch?.code || "-"}
                        </span>
                      </TableCell>

                      <TableCell className="py-3 text-center">
                        <button
                          onClick={() => handleToggleActive(u)}
                          disabled={busyUserId !== null || isSelf}
                          className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 transition-opacity"
                          title={
                            isSelf
                              ? "ไม่สามารถระงับบัญชีของตัวเองได้"
                              : u.isActive
                              ? "คลิกเพื่อระงับการเข้าใช้"
                              : "คลิกเพื่อเปิดใช้งาน"
                          }
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
                            disabled={busyUserId !== null || !u.isActive || isSelf}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title={isSelf ? "ไม่สามารถลบบัญชีของตัวเองได้" : "ปิดการใช้งานพนักงาน (Soft Delete)"}
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
          {editingUser?.id === currentUser?.id && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>คุณกำลังแก้ไขบัญชีของตัวเอง:</strong> ต้องคงสถานะผู้ดูแลระบบ (ADMIN) และเปิดใช้งานอยู่เสมอ
                เพื่อป้องกันการสูญเสียสิทธิ์การบริหารระบบ
              </span>
            </div>
          )}

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
                {editingUser ? "รหัสผ่านใหม่ (เว้นว่างหากไม่ต้องการเปลี่ยน)" : "รหัสผ่านเริ่มต้น * (12-72 ตัวอักษร)"}
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder={editingUser ? "••••••••••••" : "อย่างน้อย 12 ตัวอักษร"}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="text-xs h-9 font-mono pr-8"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                ความยาว 12 - 72 ตัวอักษร (เข้ารหัสด้วย Bcrypt 12 rounds)
              </span>
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
              <label className="text-xs font-semibold text-slate-700 mb-1 block">ตำแหน่ง & สิทธิ์ (Role) *</label>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as RoleType)}
                disabled={editingUser?.id === currentUser?.id}
                className="w-full text-xs rounded-lg border border-slate-300 p-2 text-slate-800 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                <option value="ADMIN">ผู้ดูแลระบบ (ADMIN)</option>
                <option value="MANAGER">ผู้จัดการสาขา (MANAGER)</option>
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

          <div className="border-t border-slate-100 pt-3 flex items-center gap-2 text-[11px] text-slate-500">
            <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span>
              การเปลี่ยนรหัสผ่าน สิทธิ์ หรือสาขา จะเพิกถอน Session เดิมที่เข้าใช้งานอยู่ทันทีเพื่อความปลอดภัย
            </span>
          </div>

          {formError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700" role="alert">
              {formError}
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving} className="text-xs">
            ยกเลิก
          </Button>
          <Button onClick={handleSaveUser} disabled={saving} className="text-xs bg-blue-600 text-white hover:bg-blue-700">
            {saving ? "กำลังบันทึก..." : editingUser ? "บันทึกการแก้ไข" : "เพิ่มพนักงาน"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
