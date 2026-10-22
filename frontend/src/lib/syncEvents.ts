import type { SyncJob } from '../types/notices';

export const SYNC_COMPLETED_EVENT = 'turia:sync-completed';

export function emitSyncCompleted(job?: SyncJob) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SYNC_COMPLETED_EVENT, { detail: { job } }));
  }
}

export function onSyncCompleted(callback: (job?: SyncJob) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => {
    const custom = e as CustomEvent<{ job?: SyncJob }>;
    callback(custom.detail?.job);
  };
  window.addEventListener(SYNC_COMPLETED_EVENT, handler);
  return () => {
    window.removeEventListener(SYNC_COMPLETED_EVENT, handler);
  };
}
