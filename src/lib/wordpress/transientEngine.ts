/**
 * WordPress-compatible Transient Caching API Engine (Round 45)
 *
 * Reverse-engineers WordPress core transients:
 * - `set_transient(transient, value, expirationSeconds)`
 * - `get_transient(transient)`
 * - `delete_transient(transient)`
 * - `delete_expired_transients()`
 *
 * Implements high-performance in-memory LRU caching with automatic expired entry purging,
 * TTL expiration tracking, and multi-tenant namespace isolation.
 */

export interface TransientEntry<T = any> {
  key: string;
  value: T;
  createdAt: number;
  expiresAt: number | null; // null means never expires (autoload persistent)
  lastAccessedAt: number;
}

export interface TransientStoreOptions {
  maxEntries?: number;
  namespace?: string;
}

export class WordPressTransientStore {
  private store: Map<string, TransientEntry> = new Map();
  private maxEntries: number;
  private namespace: string;
  private accessCounter = 0;

  constructor(options: TransientStoreOptions = {}) {
    this.maxEntries = options.maxEntries && options.maxEntries > 0 ? options.maxEntries : 1000;
    this.namespace = options.namespace ? `${options.namespace}:` : "";
  }

  /**
   * Generates namespaced key
   */
  private formatKey(key: string): string {
    if (!key || typeof key !== "string") {
      throw new Error("Transient key must be a non-empty string");
    }
    // WordPress convention: cap transient key length to 172 chars
    const trimmed = key.trim();
    if (trimmed.length > 172) {
      return `${this.namespace}${trimmed.slice(0, 172)}`;
    }
    return `${this.namespace}${trimmed}`;
  }

  /**
   * Sets a transient value with expiration in seconds.
   * If expiration is 0 or negative, transient does not expire.
   */
  set<T = any>(transient: string, value: T, expirationSeconds = 0): boolean {
    const fullKey = this.formatKey(transient);
    const now = Date.now();
    const expiresAt =
      expirationSeconds > 0 ? now + Math.round(expirationSeconds * 1000) : null;

    // If max entries reached, evict expired entries first, then LRU entry
    if (this.store.size >= this.maxEntries && !this.store.has(fullKey)) {
      this.purgeExpired();
      if (this.store.size >= this.maxEntries) {
        this.evictLru();
      }
    }

    const entry: TransientEntry<T> = {
      key: fullKey,
      value,
      createdAt: now,
      expiresAt,
      lastAccessedAt: ++this.accessCounter,
    };

    this.store.set(fullKey, entry);
    return true;
  }

  /**
   * Gets a transient value.
   * Returns `false` if transient does not exist or has expired (matching WordPress behavior).
   */
  get<T = any>(transient: string): T | false {
    const fullKey = this.formatKey(transient);
    const entry = this.store.get(fullKey);

    if (!entry) {
      return false;
    }

    const now = Date.now();

    // Check expiration
    if (entry.expiresAt !== null && now > entry.expiresAt) {
      this.store.delete(fullKey);
      return false;
    }

    // Update monotonic accessed order for LRU tracking
    entry.lastAccessedAt = ++this.accessCounter;
    return entry.value as T;
  }

  /**
   * Deletes a transient.
   * Returns true if transient was found and deleted, false otherwise.
   */
  delete(transient: string): boolean {
    const fullKey = this.formatKey(transient);
    return this.store.delete(fullKey);
  }

  /**
   * Returns remaining seconds before expiration, or null if persistent / not found
   */
  getTtl(transient: string): number | null {
    const fullKey = this.formatKey(transient);
    const entry = this.store.get(fullKey);
    if (!entry) return null;

    if (entry.expiresAt === null) return null;

    const remainingMs = entry.expiresAt - Date.now();
    return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
  }

  /**
   * Checks if transient exists and is not expired
   */
  has(transient: string): boolean {
    return this.get(transient) !== false;
  }

  /**
   * Purges all expired transients from memory.
   * Returns the count of purged entries.
   */
  purgeExpired(): number {
    const now = Date.now();
    let purgedCount = 0;

    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt !== null && now > entry.expiresAt) {
        this.store.delete(key);
        purgedCount++;
      }
    }

    return purgedCount;
  }

  /**
   * Evicts least recently accessed entry (LRU)
   */
  private evictLru(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.store.entries()) {
      if (entry.lastAccessedAt < oldestTime) {
        oldestTime = entry.lastAccessedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.store.delete(oldestKey);
    }
  }

  /**
   * Clears all transients in this store
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Returns count of current cached entries
   */
  size(): number {
    return this.store.size;
  }
}

// Global default instance matching WordPress procedural functions
const globalTransientStore = new WordPressTransientStore({ maxEntries: 2000 });

/**
 * Standard WordPress procedural transient API
 */
export function set_transient<T = any>(
  transient: string,
  value: T,
  expirationSeconds = 0
): boolean {
  return globalTransientStore.set(transient, value, expirationSeconds);
}

export function get_transient<T = any>(transient: string): T | false {
  return globalTransientStore.get<T>(transient);
}

export function delete_transient(transient: string): boolean {
  return globalTransientStore.delete(transient);
}

export function delete_expired_transients(): number {
  return globalTransientStore.purgeExpired();
}

/**
 * Factory for creating tenant-isolated transient stores
 */
export function createTenantTransientStore(tenantId: string, maxEntries = 500): WordPressTransientStore {
  return new WordPressTransientStore({
    namespace: `tenant_${tenantId}`,
    maxEntries,
  });
}
