// Unscoped client: authentication and offline maintenance only.
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const shared = globalThis as unknown as { mobileShopDb?: PrismaClient };

function resolveDbUrl(): string {
  const envUrl = process.env.DATABASE_URL;
  if (!envUrl || envUrl.startsWith("file:.")) {
    const filename = envUrl
      ? envUrl.replace(/^file:\.\/?/, "").replace(/^prisma\//, "")
      : "dev.db";
    const prismaPath = path.resolve(process.cwd(), "prisma", filename).replace(/\\/g, "/");
    const rootPath = path.resolve(process.cwd(), filename).replace(/\\/g, "/");
    if (fs.existsSync(prismaPath)) {
      return `file:${prismaPath}`;
    }
    return `file:${rootPath}`;
  }
  return envUrl;
}

const url = resolveDbUrl();
const clientOptions: any = url.startsWith("prisma://")
  ? { datasourceUrl: url }
  : { datasources: { db: { url } } };
export const db = shared.mobileShopDb ?? new PrismaClient(clientOptions);
shared.mobileShopDb = db;
