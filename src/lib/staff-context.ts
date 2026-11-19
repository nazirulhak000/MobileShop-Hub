import { AsyncLocalStorage } from "node:async_hooks";
export type StaffRole = "ADMIN" | "MANAGER" | "TECHNICIAN" | "CASHIER";
export interface StaffPrincipal {
  id: string; tenantId: string; name: string; username: string;
  role: StaffRole; branchId: string; branchIds: string[];
}
export class AccessError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const staffStorage = new AsyncLocalStorage<StaffPrincipal>();
export function staffContext() {
  const actor = staffStorage.getStore();
  if (!actor) throw new AccessError(401, "กรุณาเข้าสู่ระบบของร้านก่อน");
  return actor;
}
export function staffTenantId() { return staffContext().tenantId; }
