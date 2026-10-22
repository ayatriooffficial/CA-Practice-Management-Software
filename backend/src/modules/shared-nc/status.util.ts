import { NoticeStatus } from '../notice/notice.interface';
import { ComplianceStatus } from '../compliance/compliance.model';
import { SyncStatus } from '../sync/sync.model';

/**
 * Returns today's ISO date string (YYYY-MM-DD)
 */
export function getTodayDateString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Calculates overdue days = (today - dueDate) in days.
 * Always returns a number (positive if overdue, 0 or negative if upcoming/today).
 */
export function calculateOverdueDays(dueDate?: string | null, referenceDateStr?: string): number {
  if (!dueDate) return 0;
  const todayStr = referenceDateStr || getTodayDateString();
  const msPerDay = 1000 * 60 * 60 * 24;
  const due = new Date(dueDate).getTime();
  const todayMs = new Date(todayStr).getTime();
  const diffDays = Math.floor((todayMs - due) / msPerDay);
  return diffDays > 0 ? diffDays : 0;
}

/**
 * Checks if a notice is open or closed.
 * Rule: closed if status is 'response_filed' | 'appeal_filed' | 'closed'
 * Open otherwise.
 */
export function isNoticeClosed(status?: NoticeStatus | null): boolean {
  if (!status) return false;
  return status === 'response_filed' || status === 'appeal_filed' || status === 'closed';
}

/**
 * Categorizes a collection of notice statuses into open and closed counts.
 */
export function calculateOpenClosedSplit(statuses: (NoticeStatus | undefined)[]): { open: number; closed: number } {
  let open = 0;
  let closed = 0;
  for (const s of statuses) {
    if (isNoticeClosed(s)) {
      closed++;
    } else {
      open++;
    }
  }
  return { open, closed };
}

/**
 * Derives a compliance entry status.
 * Rules:
 * 1. If mode === 'manual' and statusOverride is set, statusOverride wins.
 * 2. If filedOn is non-empty -> 'filed'.
 * 3. Else if dueDate < today -> 'missed'.
 * 4. Else -> 'pending'.
 */
export function deriveEntryStatus(params: {
  dueDate: string;
  filedOn?: string | null;
  statusOverride?: ComplianceStatus | null;
  categoryMode?: 'auto' | 'manual';
  referenceDateStr?: string;
}): ComplianceStatus {
  const { dueDate, filedOn, statusOverride, categoryMode, referenceDateStr } = params;

  // statusOverride wins only for manual categories
  if (categoryMode === 'manual' && statusOverride) {
    return statusOverride;
  }

  if (filedOn && filedOn.trim().length > 0) {
    return 'filed';
  }

  const todayStr = referenceDateStr || getTodayDateString();
  if (dueDate < todayStr) {
    return 'missed';
  }

  return 'pending';
}

/**
 * Derives overall sync status for a client or portal.
 * Returns 'never_synced' | 'error' | 'stale' | 'ready'.
 */
export function deriveSyncState(params: {
  hasCredentials?: boolean;
  lastSyncAt?: Date | string | null;
  hasSyncError?: boolean;
  staleThresholdDays?: number;
}): SyncStatus {
  const { lastSyncAt, hasSyncError, staleThresholdDays = 14 } = params;

  if (hasSyncError) {
    return 'error';
  }

  if (!lastSyncAt) {
    return 'never_synced';
  }

  const syncTime = new Date(lastSyncAt).getTime();
  const now = Date.now();
  const daysDiff = (now - syncTime) / (1000 * 60 * 60 * 24);

  if (daysDiff > staleThresholdDays) {
    return 'stale';
  }

  return 'ready';
}
