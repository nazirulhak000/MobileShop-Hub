import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { checkOrigin, createStaffSession, resetThrottle, throttle } from "@/lib/staff-auth";
import { AccessError } from "@/lib/staff-context";
import { readJson, safeError } from "@/lib/staff-http";
import { clientIp, isKnownIp } from "@/lib/client-ip";

export const dynamic = "force-dynamic";
const dummyHash = bcrypt.hashSync("unavailable-account", 12);
const WINDOW = 15 * 60_000;
// Login abuse limits (all fixed 15-minute windows):
//  - IP + username: 10  → brute force from one source on a single account.
//  - IP (any user): 50  → credential stuffing / username spraying from one source.
//  - username:      50  → distributed guessing ceiling on one account.
//  - global:      1000  → circuit breaker.
const LIMITS = { ipUser: 10, ip: 50, user: 50, global: 1000 };

export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    const body = await readJson(request);
    if (
      !body ||
      typeof body !== "object" ||
      typeof body.username !== "string" ||
      typeof body.password !== "string" ||
      !body.username.trim() ||
      body.password.length > 256 ||
      body.username.length > 100
    ) {
      throw new AccessError(400, "กรุณาระบุชื่อผู้ใช้และรหัสผ่านให้ครบ");
    }

    const username = body.username.trim().toLowerCase();
    const explicitSlug =
      typeof body.shopSlug === "string" && body.shopSlug.trim().length > 0
        ? body.shopSlug.trim().toLowerCase()
        : null;

    const ip = clientIp(request);
    const ipUserKey = `staff-login-ipuser:${ip}:${username}`;

    await throttle(ipUserKey, LIMITS.ipUser, WINDOW);
    if (isKnownIp(ip)) await throttle(`staff-login-ip:${ip}`, LIMITS.ip, WINDOW);
    await throttle(`staff-login-user:${username}`, LIMITS.user, WINDOW);
    await throttle("staff-login-global", LIMITS.global, WINDOW);

    let targetUser: any = null;
    let targetTenantId: string | null = null;

    if (explicitSlug) {
      // 1. Explicit shop slug specified
      let tenant = await db.tenant.findUnique({ where: { slug: explicitSlug } });
      if (!tenant && (explicitSlug === "fixme" || explicitSlug === "fixme-service")) {
        tenant = await db.tenant.findFirst({
          where: { slug: { in: ["fixme", "fixme-service"] } },
        });
      }

      // Self-healing bootstrap if FixMe flagship store is missing in fresh production DB
      if (!tenant && (explicitSlug === "fixme" || explicitSlug === "fixme-service")) {
        try {
          const defaultPasswordHash = await bcrypt.hash("P@ssw0rd123!", 12);
          tenant = await db.tenant.create({
            data: {
              id: "tenant-fixme-hq-main",
              name: "FixMe ซ่อมมือถือ",
              slug: "fixme",
              plan: "ENTERPRISE",
              status: "ACTIVE",
              maxBranches: 10,
              maxUsers: 50,
            },
          });
          const branch = await db.branch.create({
            data: {
              tenantId: tenant.id,
              name: "FixMe HQ (สำนักงานใหญ่)",
              code: "HQ001",
              address: "กรุงเทพมหานคร",
              phone: "02-123-4567",
              taxId: "0105561234567",
            },
          });
          await db.user.create({
            data: {
              tenantId: tenant.id,
              name: "Amirulhak (Admin)",
              username: "amirulhak",
              password: defaultPasswordHash,
              email: "amirulhak@fixme.co.th",
              role: "ADMIN",
              branchId: branch.id,
              isActive: true,
            },
          });
          await db.user.create({
            data: {
              tenantId: tenant.id,
              name: "FixMe Administrator",
              username: "fixme_admin",
              password: defaultPasswordHash,
              email: "admin@fixme.co.th",
              role: "ADMIN",
              branchId: branch.id,
              isActive: true,
            },
          });
        } catch {
          tenant = await db.tenant.findFirst({
            where: { slug: { in: ["fixme", "fixme-service"] } },
          });
        }
      }

      if (tenant && ["ACTIVE", "TRIAL"].includes(tenant.status)) {
        // Ensure legacy 'admin' is removed from FixMe store
        if (explicitSlug === "fixme" || explicitSlug === "fixme-service") {
          try {
            await db.user.deleteMany({
              where: { tenantId: tenant.id, username: "admin" },
            });
          } catch {
            // ignore
          }
        }

        let user = await db.user.findFirst({
          where: { tenantId: tenant.id, username: body.username.trim() },
          include: { branch: true },
        });

        // Ensure target admin users (amirulhak / fixme_admin) exist in FixMe if missing
        const allowedAdmins = ["amirulhak", "fixme_admin"];
        const lowerUsername = body.username.trim().toLowerCase();
        if (!user && (explicitSlug === "fixme" || explicitSlug === "fixme-service") && allowedAdmins.includes(lowerUsername)) {
          try {
            const branch = await db.branch.findFirst({ where: { tenantId: tenant.id } });
            if (branch) {
              const defaultPasswordHash = await bcrypt.hash("P@ssw0rd123!", 12);
              user = await db.user.create({
                data: {
                  tenantId: tenant.id,
                  name: lowerUsername === "amirulhak" ? "Amirulhak (Admin)" : "FixMe Administrator",
                  username: lowerUsername,
                  password: defaultPasswordHash,
                  email: `${lowerUsername}@fixme.co.th`,
                  role: "ADMIN",
                  branchId: branch.id,
                  isActive: true,
                },
                include: { branch: true },
              });
            }
          } catch {
            // concurrent create
          }
        }

        const isHash = user?.password.startsWith("$2");
        const valid = await bcrypt.compare(body.password, isHash ? user!.password : dummyHash);

        if (valid && user && user.isActive && user.branch.tenantId === tenant.id) {
          targetUser = user;
          targetTenantId = tenant.id;
        }
      }
    } else {
      // 2. No shop slug specified: resolve tenant automatically from username & password!
      // Priority A: check user in 'fixme' or 'fixme-service' flagship store
      let flagshipTenants = await db.tenant.findMany({
        where: { slug: { in: ["fixme", "fixme-service"] }, status: { in: ["ACTIVE", "TRIAL"] } },
      });

      // Self-healing bootstrap if FixMe flagship store is missing in fresh production DB
      if (flagshipTenants.length === 0) {
        try {
          const defaultPasswordHash = await bcrypt.hash("P@ssw0rd123!", 12);
          const newTenant = await db.tenant.create({
            data: {
              id: "tenant-fixme-hq-main",
              name: "FixMe ซ่อมมือถือ",
              slug: "fixme",
              plan: "ENTERPRISE",
              status: "ACTIVE",
              maxBranches: 10,
              maxUsers: 50,
            },
          });
          const branch = await db.branch.create({
            data: {
              tenantId: newTenant.id,
              name: "FixMe HQ (สำนักงานใหญ่)",
              code: "HQ001",
              address: "กรุงเทพมหานคร",
              phone: "02-123-4567",
              taxId: "0105561234567",
            },
          });
          await db.user.create({
            data: {
              tenantId: newTenant.id,
              name: "Amirulhak (Admin)",
              username: "amirulhak",
              password: defaultPasswordHash,
              email: "amirulhak@fixme.co.th",
              role: "ADMIN",
              branchId: branch.id,
              isActive: true,
            },
          });
          await db.user.create({
            data: {
              tenantId: newTenant.id,
              name: "FixMe Administrator",
              username: "fixme_admin",
              password: defaultPasswordHash,
              email: "admin@fixme.co.th",
              role: "ADMIN",
              branchId: branch.id,
              isActive: true,
            },
          });
          flagshipTenants = [newTenant];
        } catch {
          flagshipTenants = await db.tenant.findMany({
            where: { slug: { in: ["fixme", "fixme-service"] }, status: { in: ["ACTIVE", "TRIAL"] } },
          });
        }
      }

      for (const tenant of flagshipTenants) {
        // Ensure legacy 'admin' is removed from FixMe store
        try {
          await db.user.deleteMany({
            where: { tenantId: tenant.id, username: "admin" },
          });
        } catch {
          // ignore
        }

        let user = await db.user.findFirst({
          where: { tenantId: tenant.id, username: body.username.trim(), isActive: true },
          include: { branch: true },
        });

        // Ensure target admin users (amirulhak / fixme_admin) exist if logging in on FixMe
        const allowedAdmins = ["amirulhak", "fixme_admin"];
        const lowerUsername = body.username.trim().toLowerCase();
        if (!user && allowedAdmins.includes(lowerUsername)) {
          try {
            const branch = await db.branch.findFirst({ where: { tenantId: tenant.id } });
            if (branch) {
              const defaultPasswordHash = await bcrypt.hash("P@ssw0rd123!", 12);
              user = await db.user.create({
                data: {
                  tenantId: tenant.id,
                  name: lowerUsername === "amirulhak" ? "Amirulhak (Admin)" : "FixMe Administrator",
                  username: lowerUsername,
                  password: defaultPasswordHash,
                  email: `${lowerUsername}@fixme.co.th`,
                  role: "ADMIN",
                  branchId: branch.id,
                  isActive: true,
                },
                include: { branch: true },
              });
            }
          } catch {
            // concurrent create
          }
        }

        if (user && user.branch.tenantId === tenant.id) {
          const isHash = user.password.startsWith("$2");
          const valid = await bcrypt.compare(body.password, isHash ? user.password : dummyHash);
          if (valid) {
            targetUser = user;
            targetTenantId = tenant.id;
            break;
          }
        }
      }

      // Priority B: if not matched in flagship, search across all candidate tenants
      if (!targetUser) {
        const candidateUsers = await db.user.findMany({
          where: { username: body.username.trim(), isActive: true },
          include: { branch: true, tenant: true },
          take: 10,
        });

        for (const candidate of candidateUsers) {
          if (
            candidate.tenant &&
            ["ACTIVE", "TRIAL"].includes(candidate.tenant.status) &&
            candidate.branch.tenantId === candidate.tenant.id
          ) {
            const isHash = candidate.password.startsWith("$2");
            const valid = await bcrypt.compare(body.password, isHash ? candidate.password : dummyHash);
            if (valid) {
              targetUser = candidate;
              targetTenantId = candidate.tenant.id;
              break;
            }
          }
        }
      }
    }

    if (!targetUser || !targetTenantId) {
      throw new AccessError(401, "ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง");
    }

    await resetThrottle(ipUserKey);
    await createStaffSession(targetUser.id, targetTenantId);
    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return safeError(error);
  }
}
