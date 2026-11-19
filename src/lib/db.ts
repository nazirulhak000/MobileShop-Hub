// Unscoped client: authentication and offline maintenance only.
import { PrismaClient } from "@prisma/client";
const shared = globalThis as unknown as { mobileShopDb?: PrismaClient };
export const db = shared.mobileShopDb ?? new PrismaClient({ datasourceUrl: process.env.DATABASE_URL || "file:./dev.db" });
if (process.env.NODE_ENV !== "production") shared.mobileShopDb = db;
