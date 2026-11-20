import { NextRequest } from "next/server";
import { db } from "./db";

export interface CreateAuditLogParams {
  tenantId: string;
  userId?: string | null;
  module: string;
  action: string;
  targetId?: string | null;
  details: string;
  beforeJson?: any;
  afterJson?: any;
  severity?: "INFO" | "WARNING" | "DANGER";
  req?: NextRequest | Request;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Utility function to write structured, multi-tenant scoped AuditLog entries
 * capturing IP Address, User-Agent, beforeJson, and afterJson.
 */
export async function createAuditLog(params: CreateAuditLogParams) {
  try {
    let clientIp = params.ipAddress || null;
    let userAgent = params.userAgent || null;

    if (params.req) {
      const headers = params.req.headers;
      if (!clientIp) {
        clientIp =
          headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          headers.get("x-real-ip") ||
          null;
      }
      if (!userAgent) {
        userAgent = headers.get("user-agent") || null;
      }
    }

    let formattedDetails = params.details;
    if (userAgent && !formattedDetails.includes("[UA:")) {
      formattedDetails += ` [UA: ${userAgent.slice(0, 150)}]`;
    }

    const beforeString =
      params.beforeJson !== undefined
        ? typeof params.beforeJson === "string"
          ? params.beforeJson
          : JSON.stringify(params.beforeJson)
        : null;

    const afterString =
      params.afterJson !== undefined
        ? typeof params.afterJson === "string"
          ? params.afterJson
          : JSON.stringify(params.afterJson)
        : null;

    return await db.auditLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId || null,
        module: params.module,
        action: params.action,
        targetId: params.targetId || null,
        details: formattedDetails,
        beforeJson: beforeString,
        afterJson: afterString,
        severity: params.severity || "INFO",
        ipAddress: clientIp,
      },
    });
  } catch (err) {
    console.warn("[createAuditLog] Error writing audit log:", err);
    return null;
  }
}
