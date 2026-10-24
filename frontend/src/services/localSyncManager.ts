"use client";

/**
 * LocalSyncManager
 * High-performance, zero-dummy-data local-first synchronization engine.
 * 
 * Guarantees:
 * 1. ZERO dummy/demo data: If cache or database is empty, returns empty array [].
 * 2. Instant 0ms reads from browser cache on page visits.
 * 3. Optimistic local updates before network requests complete.
 * 4. Background revalidation & silent synchronization with backend database.
 * 5. Multi-tab synchronization via standard browser storage events.
 */

export const SYNC_KEYS = {
  LEADS: "ca_pm_leads_cache_v3",
  TASKS: "ca_pm_tasks_cache_v3",
  SERVICES: "ca_pm_services_cache_v3",
  TEAM: "ca_pm_team_cache_v3",
  CLIENTS: "ca_pm_clients_cache_v3",
} as const;

export type SyncKey = (typeof SYNC_KEYS)[keyof typeof SYNC_KEYS];

type SyncListener = (key: string) => void;

class LocalSyncManager {
  private listeners: Set<SyncListener> = new Set();

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("storage", (event) => {
        if (event.key && Object.values(SYNC_KEYS).includes(event.key as SyncKey)) {
          this.notify(event.key);
        }
      });
    }
  }

  private isBrowser(): boolean {
    return typeof window !== "undefined";
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(key: string) {
    this.listeners.forEach((listener) => {
      try {
        listener(key);
      } catch (err) {
        console.error("LocalSyncManager listener error:", err);
      }
    });
  }

  /**
   * Safe read from local cache.
   * Strips out any legacy dummy/mock objects and returns clean array.
   */
  public getCached<T>(key: string): T[] {
    if (!this.isBrowser()) return [];
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      // Filter out any legacy dummy records that might have been stored previously
      const clean = parsed.filter((item: any) => {
        if (!item || typeof item !== "object") return false;
        const id = String(item.id || item._id || "");
        const name = String(item.name || item.fullName || item.taskName || "");
        if (id.startsWith("mock-") || id.startsWith("demo-")) return false;
        if (name.includes("MOCK") || name.includes("Sample Company")) return false;
        return true;
      });

      return clean as T[];
    } catch {
      return [];
    }
  }

  /**
   * Overwrite cache with authoritative data (e.g. from server response).
   */
  public setCached<T>(key: string, data: T[]): void {
    if (!this.isBrowser()) return;
    try {
      const clean = (data || []).filter((item: any) => {
        if (!item || typeof item !== "object") return false;
        const id = String(item.id || item._id || "");
        return !id.startsWith("mock-") && !id.startsWith("demo-");
      });
      localStorage.setItem(key, JSON.stringify(clean));
      this.notify(key);
    } catch (err) {
      console.warn(`[LocalSyncManager] Failed to cache key "${key}":`, err);
    }
  }

  /**
   * Optimistically add or update a single item in cache.
   */
  public upsertItem<T>(key: string, item: T, idField: string = "id"): T[] {
    const list = this.getCached<T>(key);
    const itemId = (item as any)[idField] || (item as any)["_id"];
    
    const index = list.findIndex(
      (existing: any) =>
        (existing[idField] && existing[idField] === itemId) ||
        (existing["_id"] && existing["_id"] === itemId)
    );

    let updated: T[];
    if (index >= 0) {
      updated = [...list];
      updated[index] = { ...updated[index], ...item };
    } else {
      updated = [item, ...list];
    }

    this.setCached(key, updated);
    return updated;
  }

  /**
   * Optimistically remove an item from cache.
   */
  public removeItem<T>(key: string, id: string, idField: string = "id"): T[] {
    const list = this.getCached<T>(key);
    const updated = list.filter(
      (existing: any) =>
        existing[idField] !== id && existing["_id"] !== id
    );
    this.setCached(key, updated);
    return updated;
  }

  /**
   * Clear all module caches (useful on logout)
   */
  public clearAll(): void {
    if (!this.isBrowser()) return;
    Object.values(SYNC_KEYS).forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {}
    });
  }
}

export const localSyncManager = new LocalSyncManager();
