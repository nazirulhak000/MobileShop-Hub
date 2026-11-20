import assert from "node:assert/strict";
import { test } from "node:test";
import { THEME_PALETTES, StorefrontThemeColor } from "../src/lib/storefrontTheme";
import { GET as configGET, PUT as configPUT } from "../src/app/api/storefront/config/route";
import { POST as uploadPOST } from "../src/app/api/storefront/upload/route";
import { NextRequest } from "next/server";
import { staffStorage, StaffPrincipal } from "../src/lib/staff-context";
import { db } from "../src/lib/db";

// ============================================================================
// ROUND 2: THEME ENGINE & DESIGN TOKENS AUDIT
// ============================================================================

test("Round 2: Theme Engine - All 6 palettes and required design tokens present", () => {
  const allowedColors: StorefrontThemeColor[] = ["emerald", "cyan", "blue", "purple", "amber", "rose"];
  assert.equal(Object.keys(THEME_PALETTES).length, 6);

  for (const color of allowedColors) {
    const palette = THEME_PALETTES[color];
    assert.ok(palette, `Palette for ${color} must exist`);
    assert.equal(palette.id, color);
    assert.ok(palette.hex.startsWith("#"), `Hex for ${color} must be valid hex`);
    
    // Core design tokens required by Round 2
    assert.ok(palette.primary, `Primary token must exist for ${color}`);
    assert.ok(palette.gradient, `Gradient token must exist for ${color}`);
    assert.ok(palette.gradientText, `gradientText must exist for ${color}`);
    assert.ok(palette.button, `Button token must exist for ${color}`);
    assert.ok(palette.primaryButton, `primaryButton must exist for ${color}`);
    assert.ok(palette.primaryButtonHover, `primaryButtonHover must exist for ${color}`);
    
    // Badge tokens
    assert.ok(palette.badge, `Badge token must exist for ${color}`);
    assert.ok(palette.badge.bg, `badge.bg must exist for ${color}`);
    assert.ok(palette.badge.text, `badge.text must exist for ${color}`);
    assert.ok(palette.badge.border, `badge.border must exist for ${color}`);
    assert.ok(palette.badge.radarPing, `badge.radarPing must exist for ${color}`);
    assert.ok(palette.badge.radarDot, `badge.radarDot must exist for ${color}`);
    assert.ok(palette.badge.lightBg, `badge.lightBg must exist for ${color}`);
    assert.ok(palette.badge.lightText, `badge.lightText must exist for ${color}`);
    assert.ok(palette.badge.lightBorder, `badge.lightBorder must exist for ${color}`);

    // Radar tokens
    assert.ok(palette.radar, `Radar token must exist for ${color}`);
    assert.ok(palette.radar.ping, `radar.ping must exist for ${color}`);
    assert.ok(palette.radar.dot, `radar.dot must exist for ${color}`);
    assert.ok(palette.radar.sweep, `radar.sweep must exist for ${color}`);
    assert.ok(palette.radar.shadow, `radar.shadow must exist for ${color}`);

    // Interactive tokens
    assert.ok(palette.activePill, `activePill must exist for ${color}`);
    assert.ok(palette.activeTile, `activeTile must exist for ${color}`);
    assert.ok(!palette.activePill.includes("shadow-xs"), `activePill must not use non-standard shadow-xs`);
    assert.ok(palette.activePill.includes("shadow-sm"), `activePill should use standard shadow-sm`);

    // Surface tokens & WCAG AA contrast tokens
    assert.ok(palette.lightBg, `lightBg must exist for ${color}`);
    assert.ok(palette.lightText, `lightText must exist for ${color}`);
    assert.ok(palette.lightBorder, `lightBorder must exist for ${color}`);
    assert.ok(palette.darkBg, `darkBg must exist for ${color}`);
    assert.ok(palette.darkBorder, `darkBorder must exist for ${color}`);

    // WCAG AA compliance verification: lightText on light surfaces must be deep 900 shade
    assert.ok(palette.lightText.includes("900"), `lightText must use high-contrast 900 shade for WCAG AA compliance`);
    assert.ok(palette.badge.lightText.includes("900"), `badge.lightText must use high-contrast 900 shade`);
    
    // WCAG AA compliance verification: dark background text must be high-contrast 200/300 shade
    assert.ok(palette.badge.text.includes("300"), `badge.text on darkBg must be 300 shade`);
    assert.ok(palette.announcement.text.includes("200"), `announcement.text on dark announcement.bg must be 200 shade`);
  }
});

// ============================================================================
// ROUND 3: STOREFRONT CONFIG API AUDIT
// ============================================================================

test("Round 3: Storefront Config GET - fallback, slug validation, no sensitive leaks", async () => {
  // 1. Invalid slug parameter format -> rejected with 404
  const reqInvalidSlug = new NextRequest("http://localhost:3000/api/storefront/config?slug=../../attack");
  const resInvalid = await configGET(reqInvalidSlug);
  assert.equal(resInvalid.status, 404);

  // 2. Non-existent slug -> returns 404 and does NOT fall back to another tenant
  const reqNonExistent = new NextRequest("http://localhost:3000/api/storefront/config?slug=non-existent-tenant-xyz");
  const resNonExistent = await configGET(reqNonExistent);
  assert.equal(resNonExistent.status, 404);
  const dataNonExistent = await resNonExistent.json();
  assert.equal(dataNonExistent.success, false);

  // 3. Fallback to active tenant when no slug provided
  const reqDefault = new NextRequest("http://localhost:3000/api/storefront/config");
  const resDefault = await configGET(reqDefault);
  if (resDefault.status === 200) {
    const json = await resDefault.json();
    assert.equal(json.success, true);
    assert.ok(json.config);
    assert.ok(json.tenant);

    // Ensure zero leakage of sensitive tenant fields
    assert.equal(json.tenant.taxId, undefined, "taxId must not be leaked to public GET");
    assert.equal(json.tenant.users, undefined, "users must not be leaked to public GET");
    assert.equal(json.tenant.branches, undefined, "branches must not be leaked to public GET");
    assert.equal(json.tenant.sessions, undefined, "staff sessions must not be leaked to public GET");
    assert.equal(json.tenant.subscription, undefined, "subscription must not be leaked to public GET");

    // Public tenant fields allowed
    assert.ok(json.tenant.id);
    assert.ok(json.tenant.name);
    assert.ok(json.tenant.slug);
  }
});

test("Round 3: Storefront Config PUT - Role authorization & payload sanitization", async () => {
  // Find or use an active tenant
  const tenant = await db.tenant.findFirst({ where: { status: { in: ["ACTIVE", "TRIAL"] } } });
  if (!tenant) return;

  const adminPrincipal: StaffPrincipal = {
    id: "test-admin",
    tenantId: tenant.id,
    name: "Admin User",
    username: "admin",
    role: "ADMIN",
    branchId: "branch-1",
    branchIds: ["branch-1"],
  };

  const cashierPrincipal: StaffPrincipal = {
    id: "test-cashier",
    tenantId: tenant.id,
    name: "Cashier User",
    username: "cashier",
    role: "CASHIER",
    branchId: "branch-1",
    branchIds: ["branch-1"],
  };

  // 1. CASHIER role rejected with 403 Forbidden
  await staffStorage.run(cashierPrincipal, async () => {
    const req = new NextRequest("http://localhost:3000/api/storefront/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json", origin: "http://localhost:3000" },
      body: JSON.stringify({ themeColor: "blue" }),
    });
    const res = await configPUT(req);
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.ok(body.error.includes("ADMIN หรือ MANAGER"));
  });

  // 2. ADMIN role with invalid themeColor rejected with 400
  await staffStorage.run(adminPrincipal, async () => {
    const req = new NextRequest("http://localhost:3000/api/storefront/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json", origin: "http://localhost:3000" },
      body: JSON.stringify({ themeColor: "invalid-neon-color" }),
    });
    const res = await configPUT(req);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.ok(body.error.includes("themeColor ไม่ถูกต้อง"));
  });

  // 3. ADMIN role with malicious javascript: URL rejected with 400
  await staffStorage.run(adminPrincipal, async () => {
    const req = new NextRequest("http://localhost:3000/api/storefront/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json", origin: "http://localhost:3000" },
      body: JSON.stringify({ googleMapsUrl: "javascript:alert(1)" }),
    });
    const res = await configPUT(req);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.ok(body.error.includes("googleMapsUrl"));
  });

  // 4. ADMIN role with valid payload & stripped unexpected fields succeeds
  await staffStorage.run(adminPrincipal, async () => {
    const req = new NextRequest("http://localhost:3000/api/storefront/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json", origin: "http://localhost:3000" },
      body: JSON.stringify({
        themeColor: "purple",
        headline: "ร้านซ่อมมือถือด่วน มาตรฐานสากล",
        googleMapsUrl: "https://maps.google.com/?q=shop",
        unexpectedExploitField: "injected_value",
      }),
    });
    const res = await configPUT(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.config.themeColor, "purple");
    assert.equal(body.config.unexpectedExploitField, undefined);
  });
});

// ============================================================================
// ROUND 3: STOREFRONT UPLOAD API SECURITY AUDIT
// ============================================================================

test("Round 3: Storefront Upload - file size limit (2MB), MIME types and traversal security", async () => {
  const tenant = await db.tenant.findFirst({ where: { status: { in: ["ACTIVE", "TRIAL"] } } });
  if (!tenant) return;

  const adminPrincipal: StaffPrincipal = {
    id: "test-admin",
    tenantId: tenant.id,
    name: "Admin User",
    username: "admin",
    role: "ADMIN",
    branchId: "branch-1",
    branchIds: ["branch-1"],
  };

  await staffStorage.run(adminPrincipal, async () => {
    // 1. Reject disallowed MIME types (e.g. SVG or PDF)
    const reqSvg = new NextRequest("http://localhost:3000/api/storefront/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json", origin: "http://localhost:3000" },
      body: JSON.stringify({
        dataUrl: "data:image/svg+xml;base64,PHN2Zz48c2NyaXB0PmFsZXJ0KDEpPC9zY3JpcHQ+PC9zdmc+",
      }),
    });
    const resSvg = await uploadPOST(reqSvg);
    assert.equal(resSvg.status, 400);
    const bodySvg = await resSvg.json();
    assert.ok(bodySvg.error.includes("JPG, PNG, WEBP"));

    // 2. Reject file larger than 2MB
    // Create base64 payload larger than 2MB buffer
    const largeBuffer = Buffer.alloc(2.5 * 1024 * 1024);
    const reqOversize = new NextRequest("http://localhost:3000/api/storefront/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json", origin: "http://localhost:3000" },
      body: JSON.stringify({
        dataUrl: `data:image/png;base64,${largeBuffer.toString("base64")}`,
      }),
    });
    const resOversize = await uploadPOST(reqOversize);
    assert.equal(resOversize.status, 400);
    const bodyOversize = await resOversize.json();
    assert.ok(bodyOversize.error.includes("2 MB"));

    // 3. Reject spoofed MIME type (text file claimed as image/png)
    const spoofedBuffer = Buffer.from("Hello malicious script pretending to be PNG");
    const reqSpoof = new NextRequest("http://localhost:3000/api/storefront/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json", origin: "http://localhost:3000" },
      body: JSON.stringify({
        dataUrl: `data:image/png;base64,${spoofedBuffer.toString("base64")}`,
      }),
    });
    const resSpoof = await uploadPOST(reqSpoof);
    assert.equal(resSpoof.status, 400);
    const bodySpoof = await resSpoof.json();
    assert.ok(bodySpoof.error.includes("ไม่ใช่รูปภาพ"));

    // 4. Accept valid 1x1 PNG image
    const valid1x1Png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const reqValid = new NextRequest("http://localhost:3000/api/storefront/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json", origin: "http://localhost:3000" },
      body: JSON.stringify({ dataUrl: valid1x1Png }),
    });
    const resValid = await uploadPOST(reqValid);
    assert.equal(resValid.status, 200);
    const bodyValid = await resValid.json();
    assert.equal(bodyValid.success, true);
    assert.ok(bodyValid.url.startsWith("/uploads/storefront/"));
    assert.equal(bodyValid.mimeType, "image/png");
    assert.ok(!bodyValid.filename.includes(".."));
  });
});
