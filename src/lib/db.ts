// Unscoped client: authentication and offline maintenance only.
import { PrismaClient } from "@prisma/client";
const shared = globalThis as unknown as { mobileShopDb?: PrismaClient };
const url = process.env.DATABASE_URL || "file:./dev.db";
const clientOptions: any = url.startsWith("prisma://")
  ? { datasourceUrl: url }
  : { datasources: { db: { url } } };
export const db = shared.mobileShopDb ?? new PrismaClient(clientOptions);
shared.mobileShopDb = db;
