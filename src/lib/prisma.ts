import { AsyncLocalStorage } from "node:async_hooks";
import { Prisma, PrismaClient } from "@prisma/client";
import { db } from "./db";
import { AccessError, StaffPrincipal, staffStorage } from "./staff-context";
import { requireStaffSession } from "./staff-auth";

// Fail-closed business client. Unscoped access lives separately in db.ts.
const models = new Map(Prisma.dmmf.datamodel.models.map(model => [model.name, model]));
const delegateName = (name: string) => name[0].toLowerCase() + name.slice(1);
const transactionContext = new AsyncLocalStorage<Prisma.TransactionClient>();
type Args = Record<string, any>;
function scope(model: string, actor: StaffPrincipal): Args {
  if (model === "Tenant") return { id: actor.tenantId };
  if (!models.get(model)?.fields.some(f => f.name === "tenantId")) throw new AccessError(403, "ไม่สามารถเข้าถึงข้อมูลนี้ผ่านระบบร้าน");
  const where: Args = { tenantId: actor.tenantId };
  if (actor.role !== "ADMIN") {
    if (model === "Branch") where.id = { in: actor.branchIds };
    else if (models.get(model)?.fields.some(f => f.name === "branchId")) where.branchId = { in: actor.branchIds };
    else if (model === "SaleItem") where.sale = { branchId: { in: actor.branchIds } };
    else if (model === "RepairPartUsage") where.repairJob = { branchId: { in: actor.branchIds } };
    else if (model === "InstallmentPayment") where.contract = { branchId: { in: actor.branchIds } };
  }
  if (actor.role === "TECHNICIAN") {
    if (model === "RepairJob") where.technicianId = actor.id;
    if (model === "RepairPartUsage") where.repairJob = { ...where.repairJob, technicianId: actor.id };
  }
  return where;
}
function scopedWhere(model: string, where: Args = {}, actor: StaffPrincipal): Args {
  return { ...where, AND: [where.AND ?? {}, scope(model, actor)] };
}
function selections(model: string, args: Args, actor: StaffPrincipal) {
  for (const mode of ["select", "include"]) {
    if (!args[mode]) continue;
    for (const field of models.get(model)?.fields ?? []) {
      if (field.kind !== "object" || !args[mode][field.name]) continue;
      const nested = args[mode][field.name] === true ? {} : { ...args[mode][field.name] };
      if (field.isList) nested.where = scopedWhere(field.type, nested.where, actor);
      selections(field.type, nested, actor);
      args[mode][field.name] = nested;
    }
    if (args[mode]._count) {
      const count = args[mode]._count === true ? { select: Object.fromEntries((models.get(model)?.fields ?? []).filter(f => f.kind === "object" && f.isList).map(f => [f.name, true])) } : args[mode]._count;
      for (const [name, setting] of Object.entries(count.select ?? {})) {
        const field = models.get(model)?.fields.find(f => f.name === name);
        if (field && setting) count.select[name] = { where: scopedWhere(field.type, typeof setting === "object" ? (setting as Args).where : {}, actor) };
      }
      args[mode]._count = count;
    }
  }
}
async function validateData(model: string, data: Args, actor: StaffPrincipal, creating: boolean) {
  if (["Tenant", "StaffSession", "AuthThrottle", "StaffBranchAccess", "Subscription", "BillingInvoice"].includes(model)) throw new AccessError(403, "ไม่มีสิทธิ์แก้ไขข้อมูลนี้");
  if (data.tenantId !== undefined && data.tenantId !== actor.tenantId) throw new AccessError(404, "ไม่พบข้อมูลในร้านนี้");
  if (creating) data.tenantId = actor.tenantId;
  else delete data.tenantId;
  for (const field of models.get(model)!.fields) {
    if (field.kind !== "object") continue;
    const nested = data[field.name];
    if (nested !== undefined) {
      const isAllowedNested = (model === "InstallmentContract" && field.name === "payments") || (model === "PurchaseOrder" && field.name === "items");
      if (!isAllowedNested || !nested.create || Object.keys(nested).some(k => k !== "create")) throw new AccessError(400, "ไม่รองรับการแก้ไขความสัมพันธ์รูปแบบนี้");
      for (const row of Array.isArray(nested.create) ? nested.create : [nested.create]) await validateData(field.type, row, actor, true);
    }
    for (const fk of field.relationFromFields ?? []) {
      if (fk === "tenantId" || data[fk] === undefined || data[fk] === null) continue;
      if (typeof data[fk] !== "string") throw new AccessError(400, "ข้อมูลอ้างอิงไม่ถูกต้อง");
      const client = transactionContext.getStore() ?? db;
      const related = await (client as any)[delegateName(field.type)].findFirst({ where: { id: data[fk], ...scope(field.type, actor) }, select: { id: true } });
      if (!related) throw new AccessError(404, "ไม่พบข้อมูลอ้างอิงในร้านหรือสาขาที่มีสิทธิ์");
    }
  }
  if (data.branchId && !actor.branchIds.includes(data.branchId)) throw new AccessError(404, "ไม่พบสาขาที่มีสิทธิ์");
  if (model === "User" && data.role && !["ADMIN", "MANAGER", "CASHIER", "TECHNICIAN"].includes(data.role)) throw new AccessError(400, "สิทธิ์ผู้ใช้งานไม่ถูกต้อง");
  if (model === "InstallmentContract" && creating && !data.branchId) data.branchId = actor.branchId;
  if (creating && models.get(model)!.fields.some(f => f.name === "branchId" && f.isRequired) && !data.branchId) throw new AccessError(400, "กรุณาระบุสาขาที่มีสิทธิ์");
}
const extended = db.$extends({ query: { $allModels: { async $allOperations({ model, operation, args, query }) {
  const actor = staffStorage.getStore() ?? await requireStaffSession();
  const input = args as Args;
  if (["findMany", "findFirst", "findFirstOrThrow", "findUnique", "findUniqueOrThrow", "count", "aggregate", "groupBy", "update", "updateMany", "delete", "deleteMany", "upsert"].includes(operation)) input.where = scopedWhere(model, input.where, actor);
  selections(model, input, actor);
  if (operation === "create" || operation === "createMany") {
    for (const row of Array.isArray(input.data) ? input.data : [input.data]) await validateData(model, row, actor, true);
  } else if (operation === "update" || operation === "updateMany") await validateData(model, input.data, actor, false);
  else if (operation === "upsert") {
    await validateData(model, input.create, actor, true);
    await validateData(model, input.update, actor, false);
  }
  if (model === "SequenceCounter") {
    if (typeof input.where?.id === "string") input.where.id = `${actor.tenantId}:${input.where.id}`;
    if (input.create?.id) input.create.id = `${actor.tenantId}:${input.create.id}`;
    if (input.data?.id) input.data.id = `${actor.tenantId}:${input.data.id}`;
  }
  return query(args);
} } } });
export const prisma = new Proxy(extended, { get(target, property, receiver) {
  if (property === "$transaction") return (operation: any, options?: any) => typeof operation === "function"
    ? target.$transaction((tx) => transactionContext.run(tx as unknown as Prisma.TransactionClient, () => operation(tx)), options)
    : target.$transaction(operation, options);
  if (typeof property === "string" && property.startsWith("$") && !["$disconnect", "$connect"].includes(property)) throw new AccessError(403, "ไม่อนุญาตคำสั่งฐานข้อมูลโดยตรง");
  return Reflect.get(target, property, receiver);
} }) as unknown as PrismaClient;
export default prisma;
