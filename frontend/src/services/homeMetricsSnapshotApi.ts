import { request, API_BASE_URL } from './apiClient';
import { SummaryCardData } from './attendanceApi';
import { CompactTaskSummaryResponse } from './dashboardSummaryApi';

export interface HomeStripMetrics {
  leads?: { top: number; bottom: number };
  clients?: { top: number; bottom: number };
  compliance?: { top: number; bottom: number };
  tasks?: { top: number; bottom: number };
  invoice?: { top: number; bottom: number };
}

export interface HomeTodoMetrics {
  todayCount?: number;
  tomorrowCount?: number;
  upcomingCount?: number;
  overdueCount?: number;
  completedCount?: number;
  totalCount?: number;
}

export interface HomeMetricsData {
  countLabels?: HomeStripMetrics;
  stripMetrics?: HomeStripMetrics;
  summaryCards?: SummaryCardData[];
  taskOverview?: Partial<CompactTaskSummaryResponse>;
  todoMetrics?: HomeTodoMetrics;
}

const LOCAL_STORAGE_KEY = 'turia_home_metrics_snapshot_v1';

export const homeMetricsSnapshotApi = {
  /**
   * Synchronously reads the cached numerical snapshot from local storage (0ms).
   */
  getCachedSnapshot(): HomeMetricsData | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY) || sessionStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw) as HomeMetricsData;
      }
    } catch {}
    return null;
  },

  /**
   * Fetches the ultra-fast numerical snapshot from the backend (~2-5ms indexed read).
   * Does not run heavy aggregation queries.
   */
  async getMetricsSnapshot(): Promise<HomeMetricsData | null> {
    try {
      const res = await request<HomeMetricsData>('/home/metrics-snapshot', {
        method: 'GET',
      });
      if (res.data && typeof res.data === 'object') {
        if (typeof window !== 'undefined') {
          try {
            const serialized = JSON.stringify(res.data);
            localStorage.setItem(LOCAL_STORAGE_KEY, serialized);
            sessionStorage.setItem(LOCAL_STORAGE_KEY, serialized);
          } catch {}
        }
        return res.data;
      }
    } catch (err) {
      console.warn('Metrics snapshot fetch skipped or offline, falling back to local cache', err);
    }
    return this.getCachedSnapshot();
  },

  /**
   * Persists the current numerical snapshot. Supports keepalive/sendBeacon for reliable execution
   * when the browser window/tab is closing or session ends.
   */
  saveMetricsSnapshot(metrics: HomeMetricsData, isClosing = false): void {
    if (!metrics || typeof metrics !== 'object') return;

    if (typeof window !== 'undefined') {
      try {
        const serialized = JSON.stringify(metrics);
        localStorage.setItem(LOCAL_STORAGE_KEY, serialized);
        sessionStorage.setItem(LOCAL_STORAGE_KEY, serialized);
      } catch {}

      const url = `${API_BASE_URL}/home/metrics-snapshot`;
      const payload = JSON.stringify({ metrics });

      if (isClosing && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
        return;
      }

      // Standard asynchronous background sync
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        keepalive: isClosing,
        body: payload,
      }).catch(() => {});
    }
  },
};

