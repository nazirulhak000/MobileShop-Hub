/**
 * WordPress-inspired Outbound Webhook Dispatcher Engine (Round 52)
 *
 * Reverse-engineers WordPress Action Scheduler & WP Webhooks API:
 * - Webhook registration with target URL and secret key
 * - Event-driven dispatching (`page.published`, `store.updated`, `inquiry.created`)
 * - Cryptographic HMAC SHA-256 signatures (`X-FixMe-Signature`)
 * - Exponential retry backoff mechanism for resilient delivery
 * - Multi-tenant delivery audit logs with inspection capabilities
 */

import crypto from "crypto";

export type StandardWebhookEvent =
  | "page.published"
  | "page.created"
  | "page.deleted"
  | "store.updated"
  | "inquiry.created"
  | "config.restored";

export interface WebhookSubscription {
  id: string;
  tenantId: string;
  name: string;
  targetUrl: string;
  secret: string;
  events: string[];
  enabled: boolean;
  createdAt: number;
  failureCount: number;
}

export interface WebhookDeliveryLog {
  id: string;
  webhookId: string;
  tenantId: string;
  event: string;
  targetUrl: string;
  attempt: number;
  statusCode?: number;
  durationMs: number;
  success: boolean;
  error?: string;
  timestamp: number;
  payload: any;
  signature: string;
}

export interface DispatchOptions {
  maxRetries?: number;
  initialBackoffMs?: number;
  fetchFn?: typeof fetch;
}

// In-memory registries (tenantId -> Map<webhookId, WebhookSubscription>)
const webhookStore = new Map<string, Map<string, WebhookSubscription>>();

// Delivery logs store (tenantId -> WebhookDeliveryLog[])
const deliveryLogStore = new Map<string, WebhookDeliveryLog[]>();
const MAX_LOGS_PER_TENANT = 100;

/**
 * Generates HMAC SHA-256 signature for payload verification
 */
export function computeHmacSignature(payloadString: string, secret: string): string {
  if (!secret) return "";
  return crypto.createHmac("sha256", secret).update(payloadString).digest("hex");
}

/**
 * Registers a new outbound webhook for a tenant
 */
export function registerWebhook(
  params: Omit<WebhookSubscription, "id" | "createdAt" | "failureCount" | "enabled"> & {
    id?: string;
    enabled?: boolean;
  }
): WebhookSubscription {
  const { tenantId, name, targetUrl, secret, events, enabled = true } = params;

  if (!tenantId) {
    throw new Error("Tenant ID is required for webhook registration");
  }
  if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
    throw new Error("Valid HTTP/HTTPS target URL is required");
  }
  if (!secret || secret.length < 8) {
    throw new Error("Webhook secret must be at least 8 characters");
  }

  const id = params.id || `wh_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

  const subscription: WebhookSubscription = {
    id,
    tenantId,
    name: name || "Storefront Webhook",
    targetUrl,
    secret,
    events: events && events.length > 0 ? events.map((e) => e.toLowerCase()) : ["*"],
    enabled: enabled !== false,
    createdAt: Date.now(),
    failureCount: 0,
  };

  if (!webhookStore.has(tenantId)) {
    webhookStore.set(tenantId, new Map());
  }
  webhookStore.get(tenantId)!.set(id, subscription);

  return subscription;
}

/**
 * Unregisters a webhook
 */
export function unregisterWebhook(id: string, tenantId: string): boolean {
  const tenantMap = webhookStore.get(tenantId);
  if (!tenantMap) return false;
  return tenantMap.delete(id);
}

/**
 * Retrieves all registered webhooks for a tenant
 */
export function getWebhooks(tenantId: string): WebhookSubscription[] {
  const tenantMap = webhookStore.get(tenantId);
  if (!tenantMap) return [];
  return Array.from(tenantMap.values());
}

/**
 * Retrieves a webhook by ID
 */
export function getWebhookById(id: string, tenantId?: string): WebhookSubscription | undefined {
  if (tenantId) {
    return webhookStore.get(tenantId)?.get(id);
  }
  for (const tenantMap of webhookStore.values()) {
    if (tenantMap.has(id)) {
      return tenantMap.get(id);
    }
  }
  return undefined;
}

/**
 * Records a delivery log entry capped at MAX_LOGS_PER_TENANT
 */
function recordDeliveryLog(log: WebhookDeliveryLog): void {
  const { tenantId } = log;
  if (!deliveryLogStore.has(tenantId)) {
    deliveryLogStore.set(tenantId, []);
  }
  const logs = deliveryLogStore.get(tenantId)!;
  logs.unshift(log); // prepend latest log
  if (logs.length > MAX_LOGS_PER_TENANT) {
    logs.pop(); // keep within bounded memory
  }
}

/**
 * Dispatches an event payload to all matching webhooks for a tenant
 */
export async function dispatchWebhookEvent(
  event: StandardWebhookEvent | string,
  tenantId: string,
  payloadData: Record<string, any>,
  options: DispatchOptions = {}
): Promise<WebhookDeliveryLog[]> {
  const targetWebhooks = getWebhooks(tenantId).filter(
    (wh) => wh.enabled && (wh.events.includes("*") || wh.events.includes(event.toLowerCase()))
  );

  if (targetWebhooks.length === 0) {
    return [];
  }

  const { maxRetries = 2, initialBackoffMs = 50, fetchFn = globalThis.fetch } = options;
  const deliveryResults: WebhookDeliveryLog[] = [];

  for (const webhook of targetWebhooks) {
    const deliveryId = `del_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const timestamp = Date.now();

    const fullPayload = {
      id: deliveryId,
      event,
      tenantId,
      timestamp,
      data: payloadData,
    };

    const payloadString = JSON.stringify(fullPayload);
    const signature = computeHmacSignature(payloadString, webhook.secret);
    const signatureHeader = `sha256=${signature}`;

    let attempt = 0;
    let delivered = false;
    let lastError: string | undefined = undefined;
    let lastStatusCode: number | undefined = undefined;
    const startTime = Date.now();

    while (attempt <= maxRetries && !delivered) {
      attempt++;
      try {
        const response = await fetchFn(webhook.targetUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "FixMe-Webhook-Dispatcher/1.0",
            "X-FixMe-Event": event,
            "X-FixMe-Delivery": deliveryId,
            "X-FixMe-Signature": signatureHeader,
          },
          body: payloadString,
        });

        lastStatusCode = response.status;
        if (response.ok) {
          delivered = true;
          webhook.failureCount = 0;
        } else {
          lastError = `HTTP ${response.status} ${response.statusText}`;
        }
      } catch (err: any) {
        lastError = err?.message || "Network request failed";
      }

      if (!delivered && attempt <= maxRetries) {
        // Exponential backoff
        const backoffMs = initialBackoffMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    if (!delivered) {
      webhook.failureCount = (webhook.failureCount || 0) + 1;
    }

    const durationMs = Date.now() - startTime;
    const log: WebhookDeliveryLog = {
      id: deliveryId,
      webhookId: webhook.id,
      tenantId,
      event,
      targetUrl: webhook.targetUrl,
      attempt,
      statusCode: lastStatusCode,
      durationMs,
      success: delivered,
      error: delivered ? undefined : lastError,
      timestamp,
      payload: fullPayload,
      signature: signatureHeader,
    };

    recordDeliveryLog(log);
    deliveryResults.push(log);
  }

  return deliveryResults;
}

/**
 * Retrieves delivery logs for a tenant
 */
export function getDeliveryLogs(
  tenantId: string,
  webhookId?: string,
  limit = 20
): WebhookDeliveryLog[] {
  const logs = deliveryLogStore.get(tenantId) || [];
  let filtered = logs;
  if (webhookId) {
    filtered = filtered.filter((l) => l.webhookId === webhookId);
  }
  return filtered.slice(0, limit);
}

/**
 * Clears stores for testing
 */
export function clearWebhookStore(): void {
  webhookStore.clear();
  deliveryLogStore.clear();
}
