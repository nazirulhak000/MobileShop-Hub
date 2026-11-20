import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { CustomPage } from "../src/lib/storefrontTheme";
import {
  generateSitemapXml,
  generateRobotsTxt,
  formatW3cDate,
} from "../src/lib/wordpress/sitemapEngine";
import {
  registerWebhook,
  unregisterWebhook,
  getWebhooks,
  dispatchWebhookEvent,
  computeHmacSignature,
  getDeliveryLogs,
  clearWebhookStore,
} from "../src/lib/wordpress/webhookDispatcher";
import {
  acquirePostLock,
  checkPostLock,
  refreshPostLock,
  takeoverPostLock,
  releasePostLock,
  pruneExpiredLocks,
  clearAllLocks,
} from "../src/lib/wordpress/postLockEngine";

describe("WordPress Enterprise Parity Loop (Rounds 51, 52, 55)", () => {
  /* -------------------------------------------------------------------------- */
  /* Round 51: Dynamic XML Sitemap 0.9 & Robots.txt                            */
  /* -------------------------------------------------------------------------- */
  describe("Round 51: Dynamic XML Sitemap 0.9 & Robots.txt", () => {
    const samplePages: CustomPage[] = [
      {
        slug: "iphone-battery-replacement",
        title: "เปลี่ยนแบตเตอรี่ iPhone แท้",
        published: true,
      },
      {
        slug: "macbook-screen-repair",
        title: "เปลี่ยนจอ MacBook",
        published: true,
      },
      {
        slug: "internal-price-draft",
        title: "ราคาทุนอะไหล่ลับ (Draft)",
        published: false, // Must be excluded from sitemap!
      },
    ];

    it("51.1 generateSitemapXml outputs valid XML Sitemap 0.9 with required tags", () => {
      const xml = generateSitemapXml({
        baseUrl: "https://fixme.co",
        shopSlug: "mbk-fix",
        pages: samplePages,
        updatedAt: "2026-11-20T12:00:00Z",
      });

      assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
      assert.ok(xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'));

      // Homepage entry
      assert.ok(xml.includes("<loc>https://fixme.co/store/mbk-fix</loc>"));
      assert.ok(xml.includes("<priority>1.0</priority>"));
      assert.ok(xml.includes("<changefreq>daily</changefreq>"));

      // Published subpage entries
      assert.ok(xml.includes("<loc>https://fixme.co/store/mbk-fix/iphone-battery-replacement</loc>"));
      assert.ok(xml.includes("<loc>https://fixme.co/store/mbk-fix/macbook-screen-repair</loc>"));
      assert.ok(xml.includes("<priority>0.8</priority>"));
      assert.ok(xml.includes("<changefreq>weekly</changefreq>"));
    });

    it("51.2 Strictly excludes unpublished drafts from sitemap", () => {
      const xml = generateSitemapXml({
        baseUrl: "https://fixme.co",
        shopSlug: "siam-fix",
        pages: samplePages,
      });

      // Draft must not appear anywhere in sitemap
      assert.ok(!xml.includes("internal-price-draft"));
      assert.ok(!xml.includes("ราคาทุนอะไหล่ลับ"));
    });

    it("51.3 generateRobotsTxt outputs valid directives referencing tenant sitemap", () => {
      const robots = generateRobotsTxt({
        baseUrl: "https://fixme.co",
        shopSlug: "asoke-fix",
        allowIndexing: true,
      });

      assert.ok(robots.includes("User-agent: *"));
      assert.ok(robots.includes("Allow: /store/asoke-fix"));
      assert.ok(robots.includes("Disallow: /api/"));
      assert.ok(robots.includes("Disallow: /settings/"));
      assert.ok(robots.includes("Disallow: /track"));
      assert.ok(robots.includes("Sitemap: https://fixme.co/store/asoke-fix/sitemap.xml"));
    });

    it("51.4 generateRobotsTxt with allowIndexing: false blocks all search crawlers", () => {
      const robots = generateRobotsTxt({
        baseUrl: "https://fixme.co",
        shopSlug: "private-lab",
        allowIndexing: false,
      });

      assert.ok(robots.includes("User-agent: *"));
      assert.ok(robots.includes("Disallow: /"));
      assert.ok(!robots.includes("Allow:"));
    });
  });

  /* -------------------------------------------------------------------------- */
  /* Round 52: Outbound Webhook Dispatcher                                      */
  /* -------------------------------------------------------------------------- */
  describe("Round 52: Outbound Webhook Dispatcher", () => {
    beforeEach(() => {
      clearWebhookStore();
    });

    it("52.1 Registers, lists, and unregisters webhooks cleanly", () => {
      const wh = registerWebhook({
        tenantId: "tenant_apple_th",
        name: "Slack Alert Webhook",
        targetUrl: "https://hooks.slack.com/services/T00/B00/X00",
        secret: "super-secret-hmac-key",
        events: ["page.published", "store.updated"],
      });

      assert.ok(wh.id.startsWith("wh_"));
      assert.strictEqual(wh.tenantId, "tenant_apple_th");

      const list = getWebhooks("tenant_apple_th");
      assert.strictEqual(list.length, 1);
      assert.strictEqual(list[0].id, wh.id);

      const removed = unregisterWebhook(wh.id, "tenant_apple_th");
      assert.strictEqual(removed, true);
      assert.strictEqual(getWebhooks("tenant_apple_th").length, 0);
    });

    it("52.2 Computes standard HMAC SHA-256 signatures accurately", () => {
      const payload = JSON.stringify({ event: "store.updated", tenant: "mbk" });
      const secret = "test-secret-key-1234";

      const sig1 = computeHmacSignature(payload, secret);
      const sig2 = computeHmacSignature(payload, secret);

      assert.strictEqual(sig1, sig2);
      assert.strictEqual(sig1.length, 64); // SHA-256 hex length
    });

    it("52.3 Dispatches events with X-FixMe-Signature and logs deliveries", async () => {
      let receivedHeaders: Record<string, string> = {};
      let receivedBody = "";

      // Mock fetch
      const mockFetch: typeof fetch = async (url, init) => {
        receivedHeaders = (init?.headers as Record<string, string>) || {};
        receivedBody = (init?.body as string) || "";
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          statusText: "OK",
        });
      };

      const webhook = registerWebhook({
        tenantId: "tenant_line_corp",
        name: "CRM Dispatcher",
        targetUrl: "https://crm.partner.co/webhook",
        secret: "crm-secret-token-abcdef",
        events: ["inquiry.created"],
      });

      const logs = await dispatchWebhookEvent(
        "inquiry.created",
        "tenant_line_corp",
        { customerName: "Somchai", phone: "089-111-2222" },
        { fetchFn: mockFetch }
      );

      assert.strictEqual(logs.length, 1);
      assert.strictEqual(logs[0].success, true);
      assert.strictEqual(logs[0].statusCode, 200);

      // Verify custom headers received by destination endpoint
      assert.strictEqual(receivedHeaders["X-FixMe-Event"], "inquiry.created");
      assert.ok(receivedHeaders["X-FixMe-Signature"].startsWith("sha256="));
      assert.ok(receivedHeaders["X-FixMe-Delivery"].startsWith("del_"));

      // Verify delivery log recorded
      const savedLogs = getDeliveryLogs("tenant_line_corp");
      assert.strictEqual(savedLogs.length, 1);
      assert.strictEqual(savedLogs[0].event, "inquiry.created");
    });

    it("52.4 Retries on HTTP error with exponential backoff and logs failure", async () => {
      let attemptCount = 0;

      const mockFailingFetch: typeof fetch = async () => {
        attemptCount++;
        return new Response("Service Unavailable", {
          status: 503,
          statusText: "Service Unavailable",
        });
      };

      registerWebhook({
        tenantId: "tenant_flaky",
        name: "Flaky Endpoint",
        targetUrl: "https://flaky-endpoint.com/webhook",
        secret: "flaky-secret-key-1234",
        events: ["store.updated"],
      });

      const logs = await dispatchWebhookEvent(
        "store.updated",
        "tenant_flaky",
        { change: "themeColor" },
        { maxRetries: 2, initialBackoffMs: 5, fetchFn: mockFailingFetch }
      );

      assert.strictEqual(logs.length, 1);
      assert.strictEqual(logs[0].success, false);
      assert.strictEqual(logs[0].attempt, 3); // 1 initial + 2 retries
      assert.strictEqual(attemptCount, 3);
      assert.strictEqual(logs[0].statusCode, 503);
    });

    it("52.5 Tenant isolation: Events in Tenant A never trigger Tenant B webhooks", async () => {
      let tenantACalled = false;
      let tenantBCalled = false;

      const mockFetch: typeof fetch = async (url) => {
        if (String(url).includes("tenant-a")) tenantACalled = true;
        if (String(url).includes("tenant-b")) tenantBCalled = true;
        return new Response("OK", { status: 200 });
      };

      registerWebhook({
        tenantId: "tenant_A",
        name: "Hook A",
        targetUrl: "https://api.co/tenant-a",
        secret: "secret-a-12345678",
        events: ["page.published"],
      });

      registerWebhook({
        tenantId: "tenant_B",
        name: "Hook B",
        targetUrl: "https://api.co/tenant-b",
        secret: "secret-b-12345678",
        events: ["page.published"],
      });

      // Dispatch event only for tenant_A
      await dispatchWebhookEvent(
        "page.published",
        "tenant_A",
        { slug: "new-service" },
        { fetchFn: mockFetch }
      );

      assert.strictEqual(tenantACalled, true);
      assert.strictEqual(tenantBCalled, false); // Completely isolated!
    });
  });

  /* -------------------------------------------------------------------------- */
  /* Round 55: Post Locking & Heartbeat Collision Guard                         */
  /* -------------------------------------------------------------------------- */
  describe("Round 55: Post Locking & Heartbeat Collision Guard", () => {
    beforeEach(() => {
      clearAllLocks();
    });

    const staff1 = {
      staffId: "user_john",
      name: "ช่างจอห์น",
      tabSessionId: "tab_111",
    };

    const staff2 = {
      staffId: "user_alice",
      name: "ผู้จัดการอลิซ",
      tabSessionId: "tab_222",
    };

    it("55.1 acquirePostLock grants exclusive 120s lock lease", () => {
      const res = acquirePostLock("tenant_siam", "storefront_config", staff1, 120);

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.lock.locked, true);
      assert.strictEqual(res.lock.lockedBy?.name, "ช่างจอห์น");
      assert.strictEqual(res.lock.isCurrentHolder, true);
      assert.ok(res.lock.remainingSeconds > 115);
    });

    it("55.2 Blocks concurrent edits by another staff member", () => {
      acquirePostLock("tenant_siam", "storefront_config", staff1, 120);

      // Staff 2 attempts to acquire lock on the same resource
      const res2 = acquirePostLock("tenant_siam", "storefront_config", staff2, 120);

      assert.strictEqual(res2.success, false);
      assert.strictEqual(res2.reason, "ALREADY_LOCKED_BY_OTHER");
      assert.strictEqual(res2.lock.locked, true);
      assert.strictEqual(res2.lock.lockedBy?.name, "ช่างจอห์น");
      assert.strictEqual(res2.lock.isCurrentHolder, false);
    });

    it("55.3 Multi-tab collision: Blocks duplicate tab opened by same staff", () => {
      acquirePostLock("tenant_siam", "page:warranty", staff1, 120);

      // Same staff opens another browser tab
      const sameStaffOtherTab = {
        staffId: staff1.staffId,
        name: staff1.name,
        tabSessionId: "tab_different_999",
      };

      const resDuplicateTab = acquirePostLock(
        "tenant_siam",
        "page:warranty",
        sameStaffOtherTab,
        120
      );

      assert.strictEqual(resDuplicateTab.success, false);
      assert.strictEqual(resDuplicateTab.reason, "ALREADY_LOCKED_BY_OTHER");
    });

    it("55.4 Heartbeat renewal (refreshPostLock) extends lock expiration", () => {
      const initial = acquirePostLock("tenant_siam", "storefront_config", staff1, 60);
      const initialExpiry = initial.lock.expiresAt!;

      // Heartbeat pulse after some time extends lock to 120s
      const refreshed = refreshPostLock("tenant_siam", "storefront_config", staff1, 120);

      assert.strictEqual(refreshed.success, true);
      assert.ok(refreshed.lock.expiresAt! >= initialExpiry);
    });

    it("55.5 takeoverPostLock transfers lock to new editor cleanly", () => {
      acquirePostLock("tenant_siam", "storefront_config", staff1, 120);

      // Alice clicks "Take Over Lock"
      const takeoverRes = takeoverPostLock("tenant_siam", "storefront_config", staff2, 120);

      assert.strictEqual(takeoverRes.success, true);
      assert.strictEqual(takeoverRes.previousHolder?.staffId, "user_john");
      assert.strictEqual(takeoverRes.lock.lockedBy?.staffId, "user_alice");

      // Verify subsequent check shows Alice is current holder
      const status = checkPostLock("tenant_siam", "storefront_config", "user_alice", "tab_222");
      assert.strictEqual(status.isCurrentHolder, true);
    });

    it("55.6 Lock auto-expires after TTL without heartbeat; pruneExpiredLocks cleans memory", async () => {
      // Set short 20ms lock
      acquirePostLock("tenant_siam", "temp_resource", staff1, 0.02);

      // Verify locked immediately
      assert.strictEqual(checkPostLock("tenant_siam", "temp_resource").locked, true);

      // Wait 30ms for TTL expiration
      await new Promise((res) => setTimeout(res, 30));

      // Should be unlocked automatically
      const expiredCheck = checkPostLock("tenant_siam", "temp_resource");
      assert.strictEqual(expiredCheck.locked, false);

      const pruned = pruneExpiredLocks();
      assert.strictEqual(pruned, 0); // Already purged on check
    });

    it("55.7 releasePostLock cleanly frees lock on editor exit", () => {
      acquirePostLock("tenant_siam", "page:terms", staff1, 120);

      assert.strictEqual(checkPostLock("tenant_siam", "page:terms").locked, true);

      const released = releasePostLock("tenant_siam", "page:terms", staff1.staffId, staff1.tabSessionId);
      assert.strictEqual(released, true);

      assert.strictEqual(checkPostLock("tenant_siam", "page:terms").locked, false);
    });
  });
});
