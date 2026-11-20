/**
 * WordPress-Style Post Revisions & Time-Travel Engine
 * Reverse-engineers wp_post_revisions / wp_get_post_revisions / wp_restore_post_revision.
 * 
 * Manages snapshots of StorefrontConfig (capped at max 10 versions per target by default),
 * supports deep diff computation, and enables 1-click rollback / time-travel restore.
 */

import { createHash } from "crypto";

export interface RevisionAuthor {
  id?: string;
  name?: string;
  role?: string;
}

export interface Revision<T = any> {
  id: string;
  tenantId: string;
  target: string; // e.g. "storefront" or subpage slug
  timestamp: string; // ISO 8601
  author?: RevisionAuthor;
  note?: string;
  hash: string;
  snapshot: T;
  meta?: Record<string, any>;
}

export interface RevisionFieldDiff {
  field: string;
  type: "added" | "removed" | "modified";
  oldValue: any;
  newValue: any;
  summary: string;
}

export interface RevisionDiff {
  olderRevisionId: string;
  newerRevisionId: string;
  olderTimestamp: string;
  newerTimestamp: string;
  changes: RevisionFieldDiff[];
  totalChanges: number;
  summaryText: string;
}

// In-memory multi-tenant revision repository
const revisionStore = new Map<string, Revision[]>();

/**
 * Generates an isolated storage key for tenant + target
 */
function getStorageKey(tenantId: string, target: string): string {
  const cleanTenant = String(tenantId || "default").trim().toLowerCase();
  const cleanTarget = String(target || "storefront").trim().toLowerCase();
  return `${cleanTenant}:${cleanTarget}`;
}

/**
 * Computes deterministic SHA-256 hash of object to detect content changes
 */
export function computeSnapshotHash(snapshot: any): string {
  try {
    const canonicalJson = JSON.stringify(snapshot, Object.keys(snapshot || {}).sort());
    return createHash("sha256").update(canonicalJson || "").digest("hex");
  } catch {
    return createHash("sha256").update(String(snapshot)).digest("hex");
  }
}

/**
 * Creates a deep clone of an object to preserve snapshot immutability
 */
function deepClone<T>(obj: T): T {
  if (obj === undefined || obj === null) return obj;
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Creates a new revision snapshot for a tenant storefront or subpage
 * If the snapshot is byte-identical to the latest revision, skips duplicate creation.
 * Automatically prunes revisions beyond maxRevisions (default: 10).
 */
export function createRevision<T = any>(
  tenantId: string,
  target: string,
  config: T,
  author?: RevisionAuthor,
  note?: string,
  maxRevisions = 10
): Revision<T> {
  const key = getStorageKey(tenantId, target);
  let list = revisionStore.get(key) || [];

  const hash = computeSnapshotHash(config);
  const latestRev = list[0];

  // If latest revision has identical hash, avoid creating redundant snapshot
  if (latestRev && latestRev.hash === hash) {
    if (note && note !== latestRev.note) {
      latestRev.note = note;
    }
    return latestRev;
  }

  const now = new Date();
  const id = `rev_${now.getTime()}_${Math.random().toString(36).substring(2, 8)}`;

  const newRevision: Revision<T> = {
    id,
    tenantId: String(tenantId || "default"),
    target: String(target || "storefront"),
    timestamp: now.toISOString(),
    author: author ? { ...author } : undefined,
    note: note ? String(note).slice(0, 300) : undefined,
    hash,
    snapshot: deepClone(config),
  };

  // Prepend newest first
  list = [newRevision, ...list];

  // Enforce retention cap (default 10)
  if (list.length > maxRevisions) {
    list = list.slice(0, maxRevisions);
  }

  revisionStore.set(key, list);
  return newRevision;
}

/**
 * Returns all revisions for a specific tenant and target, sorted newest first
 */
export function getRevisions(tenantId: string, target = "storefront"): Revision[] {
  const key = getStorageKey(tenantId, target);
  const list = revisionStore.get(key) || [];
  return [...list];
}

/**
 * Finds a revision by unique ID across all targets
 */
export function getRevision(revisionId: string): Revision | null {
  for (const revisions of revisionStore.values()) {
    const found = revisions.find((r) => r.id === revisionId);
    if (found) return { ...found, snapshot: deepClone(found.snapshot) };
  }
  return null;
}

/**
 * Deep compares two object snapshots and generates granular field-level diffs
 */
export function compareRevisions(olderRevId: string, newerRevId: string): RevisionDiff | null {
  const older = getRevision(olderRevId);
  const newer = getRevision(newerRevId);

  if (!older || !newer) return null;

  const oldSnap = older.snapshot || {};
  const newSnap = newer.snapshot || {};
  const allKeys = Array.from(new Set([...Object.keys(oldSnap), ...Object.keys(newSnap)]));

  const changes: RevisionFieldDiff[] = [];

  for (const key of allKeys) {
    const oldVal = oldSnap[key];
    const newVal = newSnap[key];

    // Check if added
    if (oldVal === undefined && newVal !== undefined) {
      changes.push({
        field: key,
        type: "added",
        oldValue: undefined,
        newValue: newVal,
        summary: `เพิ่มการตั้งค่า ${key}: ${JSON.stringify(newVal).slice(0, 80)}`,
      });
      continue;
    }

    // Check if removed
    if (oldVal !== undefined && newVal === undefined) {
      changes.push({
        field: key,
        type: "removed",
        oldValue: oldVal,
        newValue: undefined,
        summary: `ลบการตั้งค่า ${key} (ค่าเดิม: ${JSON.stringify(oldVal).slice(0, 80)})`,
      });
      continue;
    }

    // Check if modified
    const oldStr = JSON.stringify(oldVal);
    const newStr = JSON.stringify(newVal);

    if (oldStr !== newStr) {
      let desc = `แก้ไข ${key}`;
      if (key === "themeColor") {
        desc = `เปลี่ยนชุดสีจาก "${oldVal}" เป็น "${newVal}"`;
      } else if (key === "fontFamily") {
        desc = `เปลี่ยนฟอนต์จาก "${oldVal}" เป็น "${newVal}"`;
      } else if (key === "headline") {
        desc = `อัปเดตหัวข้อหลักของร้าน`;
      } else if (key === "sectionsOrder") {
        desc = `ปรับเปลี่ยนลำดับการแสดงผลของส่วนประกอบ (Sections Order)`;
      } else if (key === "customSections") {
        desc = `แก้ไขบล็อกเนื้อหาแบบกำหนดเอง (Custom Modular Blocks)`;
      } else if (key === "customPages") {
        desc = `แก้ไขหน้าย่อย (Custom Subpages)`;
      } else if (key === "announcementText") {
        desc = `แก้ไขข้อความแถบประกาศด้านบน`;
      }

      changes.push({
        field: key,
        type: "modified",
        oldValue: oldVal,
        newValue: newVal,
        summary: desc,
      });
    }
  }

  const summaryText =
    changes.length === 0
      ? "ไม่มีการเปลี่ยนแปลงระหว่างสองเวอร์ชันนี้"
      : `พบการเปลี่ยนแปลงทั้งหมด ${changes.length} รายการ: ${changes
          .map((c) => c.summary)
          .slice(0, 3)
          .join(", ")}${changes.length > 3 ? " และอื่นๆ" : ""}`;

  return {
    olderRevisionId: older.id,
    newerRevisionId: newer.id,
    olderTimestamp: older.timestamp,
    newerTimestamp: newer.timestamp,
    changes,
    totalChanges: changes.length,
    summaryText,
  };
}

/**
 * Restores a revision snapshot by ID without mutating the revision itself
 */
export function restoreRevision<T = any>(revisionId: string): T | null {
  const revision = getRevision(revisionId);
  if (!revision) return null;
  return deepClone(revision.snapshot);
}

/**
 * Performs a time-travel rollback to a historical revision
 * Restores the snapshot and records a new revision marking the rollback event
 */
export function rollbackToRevision<T = any>(
  tenantId: string,
  target: string,
  revisionId: string,
  author?: RevisionAuthor
): { success: boolean; config: T | null; revision: Revision<T> | null } {
  const targetRevision = getRevision(revisionId);
  if (!targetRevision) {
    return { success: false, config: null, revision: null };
  }

  const restoredConfig = deepClone<T>(targetRevision.snapshot);
  const rollbackNote = `ย้อนกลับไปยังเวอร์ชัน ${targetRevision.id} (${new Date(targetRevision.timestamp).toLocaleString("th-TH")})`;

  const newRevision = createRevision<T>(
    tenantId,
    target,
    restoredConfig,
    author,
    rollbackNote
  );

  return {
    success: true,
    config: restoredConfig,
    revision: newRevision,
  };
}

/**
 * Manually prunes old revisions keeping only the newest maxRevisions
 */
export function pruneRevisions(tenantId: string, target: string, maxRevisions = 10): number {
  const key = getStorageKey(tenantId, target);
  const list = revisionStore.get(key) || [];
  if (list.length <= maxRevisions) return 0;

  const prunedCount = list.length - maxRevisions;
  revisionStore.set(key, list.slice(0, maxRevisions));
  return prunedCount;
}

/**
 * Clears in-memory revisions (useful for tests)
 */
export function clearRevisionsForTesting(): void {
  revisionStore.clear();
}

/**
 * Serializes revisions to JSON for backup or database storage
 */
export function serializeRevisions(tenantId: string, target = "storefront"): string {
  const revisions = getRevisions(tenantId, target);
  return JSON.stringify(revisions);
}

/**
 * Imports revisions from JSON backup
 */
export function deserializeRevisions(jsonString: string): number {
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) return 0;

    let imported = 0;
    for (const item of parsed) {
      if (item && item.id && item.tenantId && item.target && item.snapshot) {
        const key = getStorageKey(item.tenantId, item.target);
        const list = revisionStore.get(key) || [];
        if (!list.some((r) => r.id === item.id)) {
          list.push(item);
          list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          revisionStore.set(key, list);
          imported++;
        }
      }
    }
    return imported;
  } catch {
    return 0;
  }
}
