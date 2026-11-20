/**
 * WordPress Post Locking & Heartbeat Collision Guard Engine (Round 55)
 *
 * Reverse-engineers WordPress Core post locking (`wp_set_post_lock`, `check_post_lock`):
 * - 120s TTL lease lock management
 * - Multi-tab and multi-staff concurrent edit collision detection
 * - Heartbeat lock renewal (`refreshPostLock`)
 * - Clean lock takeover mechanism (`takeoverPostLock`)
 * - Multi-tenant isolation for storefront config and subpages
 */

export interface StaffLockHolder {
  staffId: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  tabSessionId?: string; // High-entropy ID to differentiate multiple tabs of the same staff
}

export interface PostLockEntry {
  resourceId: string;
  tenantId: string;
  holder: StaffLockHolder;
  createdAt: number;
  lastHeartbeatAt: number;
  expiresAt: number;
}

export interface PostLockState {
  resourceId: string;
  tenantId: string;
  locked: boolean;
  lockedBy?: StaffLockHolder;
  createdAt?: number;
  expiresAt?: number;
  remainingSeconds: number;
  isCurrentHolder: boolean;
}

export interface AcquireLockResult {
  success: boolean;
  lock: PostLockState;
  reason?: "ALREADY_LOCKED_BY_OTHER" | "INVALID_STAFF" | "INVALID_RESOURCE";
}

export interface TakeoverLockResult {
  success: boolean;
  previousHolder?: StaffLockHolder;
  lock: PostLockState;
}

// In-memory store: Map<tenantId:resourceId, PostLockEntry>
const lockStore = new Map<string, PostLockEntry>();

const DEFAULT_LOCK_TTL_SECONDS = 120; // Standard 2-minute WordPress lease

function makeKey(tenantId: string, resourceId: string): string {
  return `${tenantId.trim()}::${resourceId.trim()}`;
}

/**
 * Checks current lock status for a resource
 */
export function checkPostLock(
  tenantId: string,
  resourceId: string,
  currentStaffId?: string,
  currentTabSessionId?: string
): PostLockState {
  const key = makeKey(tenantId, resourceId);
  const entry = lockStore.get(key);
  const now = Date.now();

  if (!entry || now >= entry.expiresAt) {
    if (entry && now >= entry.expiresAt) {
      lockStore.delete(key);
    }
    return {
      resourceId,
      tenantId,
      locked: false,
      remainingSeconds: 0,
      isCurrentHolder: false,
    };
  }

  const remainingMs = Math.max(entry.expiresAt - now, 0);
  const remainingSeconds = Math.ceil(remainingMs / 1000);

  const isSameStaff = currentStaffId ? entry.holder.staffId === currentStaffId : false;
  const isSameTab = currentTabSessionId
    ? entry.holder.tabSessionId === currentTabSessionId
    : isSameStaff;

  return {
    resourceId,
    tenantId,
    locked: true,
    lockedBy: entry.holder,
    createdAt: entry.createdAt,
    expiresAt: entry.expiresAt,
    remainingSeconds,
    isCurrentHolder: isSameStaff && isSameTab,
  };
}

/**
 * Acquires an exclusive lock on a resource
 */
export function acquirePostLock(
  tenantId: string,
  resourceId: string,
  staff: StaffLockHolder,
  ttlSeconds = DEFAULT_LOCK_TTL_SECONDS
): AcquireLockResult {
  if (!tenantId || !resourceId) {
    return {
      success: false,
      lock: {
        resourceId,
        tenantId,
        locked: false,
        remainingSeconds: 0,
        isCurrentHolder: false,
      },
      reason: "INVALID_RESOURCE",
    };
  }

  if (!staff || !staff.staffId || !staff.name) {
    return {
      success: false,
      lock: {
        resourceId,
        tenantId,
        locked: false,
        remainingSeconds: 0,
        isCurrentHolder: false,
      },
      reason: "INVALID_STAFF",
    };
  }

  const currentStatus = checkPostLock(
    tenantId,
    resourceId,
    staff.staffId,
    staff.tabSessionId
  );

  // If already locked by someone else or a different tab
  if (currentStatus.locked && !currentStatus.isCurrentHolder) {
    return {
      success: false,
      lock: currentStatus,
      reason: "ALREADY_LOCKED_BY_OTHER",
    };
  }

  const key = makeKey(tenantId, resourceId);
  const now = Date.now();
  const expiresAt = now + Math.round(ttlSeconds * 1000);

  const entry: PostLockEntry = {
    resourceId,
    tenantId,
    holder: { ...staff },
    createdAt: currentStatus.isCurrentHolder && currentStatus.createdAt ? currentStatus.createdAt : now,
    lastHeartbeatAt: now,
    expiresAt,
  };

  lockStore.set(key, entry);

  return {
    success: true,
    lock: {
      resourceId,
      tenantId,
      locked: true,
      lockedBy: staff,
      createdAt: entry.createdAt,
      expiresAt,
      remainingSeconds: ttlSeconds,
      isCurrentHolder: true,
    },
  };
}

/**
 * Renews / extends an existing lock via heartbeat
 */
export function refreshPostLock(
  tenantId: string,
  resourceId: string,
  staff: StaffLockHolder,
  ttlSeconds = DEFAULT_LOCK_TTL_SECONDS
): { success: boolean; lock: PostLockState } {
  return acquirePostLock(tenantId, resourceId, staff, ttlSeconds);
}

/**
 * Forcefully takes over a lock from another user or tab
 */
export function takeoverPostLock(
  tenantId: string,
  resourceId: string,
  newStaff: StaffLockHolder,
  ttlSeconds = DEFAULT_LOCK_TTL_SECONDS
): TakeoverLockResult {
  const currentStatus = checkPostLock(tenantId, resourceId);
  const previousHolder = currentStatus.locked ? currentStatus.lockedBy : undefined;

  const key = makeKey(tenantId, resourceId);
  const now = Date.now();
  const expiresAt = now + Math.round(ttlSeconds * 1000);

  const entry: PostLockEntry = {
    resourceId,
    tenantId,
    holder: { ...newStaff },
    createdAt: now,
    lastHeartbeatAt: now,
    expiresAt,
  };

  lockStore.set(key, entry);

  return {
    success: true,
    previousHolder,
    lock: {
      resourceId,
      tenantId,
      locked: true,
      lockedBy: newStaff,
      createdAt: now,
      expiresAt,
      remainingSeconds: ttlSeconds,
      isCurrentHolder: true,
    },
  };
}

/**
 * Releases a lock held by a staff member
 */
export function releasePostLock(
  tenantId: string,
  resourceId: string,
  staffId: string,
  tabSessionId?: string
): boolean {
  const key = makeKey(tenantId, resourceId);
  const entry = lockStore.get(key);

  if (!entry) return false;

  // Verify ownership
  if (entry.holder.staffId !== staffId) {
    return false;
  }
  if (tabSessionId && entry.holder.tabSessionId && entry.holder.tabSessionId !== tabSessionId) {
    return false;
  }

  return lockStore.delete(key);
}

/**
 * Prunes all expired locks from memory
 */
export function pruneExpiredLocks(): number {
  const now = Date.now();
  let pruned = 0;
  for (const [key, entry] of lockStore.entries()) {
    if (now >= entry.expiresAt) {
      lockStore.delete(key);
      pruned++;
    }
  }
  return pruned;
}

/**
 * Clears all locks (testing helper)
 */
export function clearAllLocks(): void {
  lockStore.clear();
}
