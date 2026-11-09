/**
 * Navigation Progress Controller (NProgress / YouTube / GitHub simulated model)
 *
 * - Simulated decaying trickle curve (hard capped at ~94%)
 * - 200ms show delay (fast loads & cached revisits stay completely hidden)
 * - 500ms minimum visible duration (eliminates micro-flicker)
 * - Real completion signal: Next.js router committed + pending API requests = 0 (+150ms settle window)
 * - Interrupted navigation: preserves progress forward, aborts stale controllers
 * - Failsafe 30s timeout
 * - Fully compatible with React useSyncExternalStore (cached snapshot, stable subscribe)
 */

import { pageStateCache } from './pageStateCache';

export interface ProgressState {
  progress: number;
  isVisible: boolean;
  isNavigating: boolean;
  navigationId: number;
}

const INITIAL_STATE: ProgressState = {
  progress: 0,
  isVisible: false,
  isNavigating: false,
  navigationId: 0,
};

class NavigationProgressService {
  private state: ProgressState = INITIAL_STATE;
  private pendingRequests = 0;
  private externalLoaders = new Set<string>();
  private routeCommitted = false;
  private visibleTimestamp = 0;

  private showDelayTimer: NodeJS.Timeout | null = null;
  private trickleTimer: NodeJS.Timeout | null = null;
  private settleTimer: NodeJS.Timeout | null = null;
  private failsafeTimer: NodeJS.Timeout | null = null;
  private finishFadeTimer: NodeJS.Timeout | null = null;
  private resetTimer: NodeJS.Timeout | null = null;

  private abortController: AbortController | null = null;
  private listeners = new Set<() => void>();

  /**
   * Cached snapshot getter for React useSyncExternalStore.
   * Returns identical object reference until an update occurs.
   */
  public getState = (): ProgressState => {
    return this.state;
  };

  /**
   * Boolean getter for navigation active status.
   */
  public isNavigationActive = (): boolean => {
    return this.state.isNavigating;
  };

  /**
   * Stable subscriber for React useSyncExternalStore.
   * Do NOT call listener synchronously to prevent maximum update depth recursion.
   */
  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private updateState(partial: Partial<ProgressState>): void {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((l) => l());
  }

  public getAbortSignal(): AbortSignal | null {
    return this.abortController ? this.abortController.signal : null;
  }

  /**
   * Start a navigation cycle.
   * Jumps to random 10-15%, starts decaying trickle timer, and displays after showDelayTimer if still loading.
   * If options.immediate is true, displays instantly with no delay timer.
   * If options.force is true, runs even if the page was previously marked loaded in pageStateCache.
   */
  public start(
    initialTarget?: string,
    options?: { immediate?: boolean; force?: boolean }
  ): void {
    const target = initialTarget || (typeof window !== 'undefined' ? window.location.pathname : '');
    if (!options?.force && target && pageStateCache.isLoaded(target)) {
      // Page data and UI are already loaded; strictly skip progress bar on revisit
      return;
    }

    if (this.abortController) {
      try {
        this.abortController.abort();
      } catch {}
    }
    this.abortController = new AbortController();

    this.clearTimers();

    this.routeCommitted = false;
    this.pendingRequests = 0;

    const startVal = options?.immediate
      ? Math.floor(Math.random() * 8) + 18
      : Math.floor(Math.random() * 6) + 10;
    const nextProgress = Math.max(this.state.progress, startVal);

    if (options?.immediate) {
      this.visibleTimestamp = Date.now();
      this.updateState({
        navigationId: this.state.navigationId + 1,
        isNavigating: true,
        isVisible: true,
        progress: nextProgress,
      });
    } else {
      this.updateState({
        navigationId: this.state.navigationId + 1,
        isNavigating: true,
        progress: nextProgress,
      });

      // 180ms delay: fast loads and cached pages finish before this fires, keeping the bar 100% invisible
      this.showDelayTimer = setTimeout(() => {
        if (this.state.isNavigating) {
          this.visibleTimestamp = Date.now();
          this.updateState({ isVisible: true });
        }
      }, 180);
    }

    // If navigating to the exact page we are already on (e.g. clicking Home while on Home)
    if (
      typeof window !== 'undefined' &&
      target &&
      (window.location.pathname === target ||
        (target === '/' && window.location.pathname === ''))
    ) {
      setTimeout(() => {
        this.routeMounted(target);
      }, 80);
    }

    // Failsafe watchdog: 30s timeout force-finish
    this.failsafeTimer = setTimeout(() => {
      if (this.state.isNavigating) {
        console.warn('[NavigationProgress] Failsafe timeout (30s) reached; force-finishing bar');
        this.forceFinish();
      }
    }, 30000);

    // Start simulated decaying trickle
    this.scheduleNextTrickle();
  }

  /**
   * Decaying trickle simulation:
   * - <20%: big steps (8-10%)
   * - 20-50%: medium steps (3-5%)
   * - 50-80%: small steps (1-2%)
   * - 80-95%: tiny steps (0.2-0.5%)
   * Hard cap at 94.5%
   */
  private scheduleNextTrickle(): void {
    if (!this.state.isNavigating || this.state.progress >= 94.5) return;

    let step: number;
    let baseDelay: number;

    if (this.state.progress < 20) {
      step = 8 + Math.random() * 2;
      baseDelay = 220;
    } else if (this.state.progress < 50) {
      step = 3 + Math.random() * 2;
      baseDelay = 280;
    } else if (this.state.progress < 80) {
      step = 1 + Math.random() * 1.2;
      baseDelay = 350;
    } else {
      step = 0.2 + Math.random() * 0.3;
      baseDelay = 450;
    }

    const jitter = Math.floor(Math.random() * 150);
    const delay = baseDelay + jitter;

    this.trickleTimer = setTimeout(() => {
      if (!this.state.isNavigating) return;

      const nextProgress = Math.min(94.5, this.state.progress + step);
      this.updateState({ progress: nextProgress });
      this.scheduleNextTrickle();
    }, delay);
  }

  /**
   * Signal from router when target route has committed and rendered.
   */
  public routeMounted(pathname?: string): void {
    this.routeCommitted = true;
    const target = pathname || (typeof window !== 'undefined' ? window.location.pathname : '');
    if (target) {
      pageStateCache.markLoaded(target);
    }
    this.checkCompletion();
  }

  /**
   * Pending requests tracker for API calls associated with this navigation.
   */
  public incrementRequests(): void {
    this.pendingRequests += 1;
    if (this.settleTimer) {
      clearTimeout(this.settleTimer);
      this.settleTimer = null;
    }
  }

  public decrementRequests(): void {
    this.pendingRequests = Math.max(0, this.pendingRequests - 1);
    this.checkCompletion();
  }

  /**
   * Register or release external page-level loading state (e.g. auth loading, initial dashboard loading).
   * While ANY external loader is active, the progress bar will NEVER snap to 100% early.
   */
  public setLoading(key: string, isLoading: boolean): void {
    if (isLoading) {
      this.externalLoaders.add(key);
      if (this.settleTimer) {
        clearTimeout(this.settleTimer);
        this.settleTimer = null;
      }
    } else {
      this.externalLoaders.delete(key);
      this.checkCompletion();
    }
  }

  /**
   * Check if conditions are met to finish:
   * 1. Route has committed (mounted)
   * 2. Pending API requests == 0 AND external loaders == 0, sustained for 400ms settle window
   */
  private checkCompletion(): void {
    if (
      !this.state.isNavigating ||
      !this.routeCommitted ||
      this.pendingRequests > 0 ||
      this.externalLoaders.size > 0
    ) {
      return;
    }

    if (this.settleTimer) clearTimeout(this.settleTimer);
    this.settleTimer = setTimeout(() => {
      if (
        this.state.isNavigating &&
        this.routeCommitted &&
        this.pendingRequests === 0 &&
        this.externalLoaders.size === 0
      ) {
        this.finish();
      }
    }, 400);
  }

  /**
   * Complete the progress bar cleanly:
   * - If not yet visible (finished in <200ms), cancel show delay and reset silently.
   * - If visible, ensure min 500ms display to eliminate flicker.
   * - Snap to 100% (~200ms), hold briefly (~150ms), fade out (~300ms), and reset to 0 invisibly.
   */
  private finish(): void {
    this.updateState({ isNavigating: false });
    if (this.trickleTimer) clearTimeout(this.trickleTimer);
    if (this.failsafeTimer) clearTimeout(this.failsafeTimer);

    // Fast load (<200ms) or cached page: never show bar at all
    if (!this.state.isVisible) {
      if (this.showDelayTimer) clearTimeout(this.showDelayTimer);
      this.updateState({ progress: 0 });
      return;
    }

    // Minimum visible time guard (500ms from visible timestamp)
    const elapsed = Date.now() - this.visibleTimestamp;
    const minHoldRemaining = Math.max(0, 500 - elapsed);

    setTimeout(() => {
      // Snap to 100%
      this.updateState({ progress: 100 });

      // Hold briefly at 100% then fade out
      this.finishFadeTimer = setTimeout(() => {
        this.updateState({ isVisible: false });

        // Reset to 0 while invisible (no backward animation)
        this.resetTimer = setTimeout(() => {
          this.updateState({ progress: 0 });
        }, 300);
      }, 200);
    }, minHoldRemaining);
  }

  public forceFinish(): void {
    this.finish();
  }

  public done(): void {
    this.finish();
  }

  private clearTimers(): void {
    if (this.showDelayTimer) clearTimeout(this.showDelayTimer);
    if (this.trickleTimer) clearTimeout(this.trickleTimer);
    if (this.settleTimer) clearTimeout(this.settleTimer);
    if (this.failsafeTimer) clearTimeout(this.failsafeTimer);
    if (this.finishFadeTimer) clearTimeout(this.finishFadeTimer);
    if (this.resetTimer) clearTimeout(this.resetTimer);
  }
}

export const navigationProgress = new NavigationProgressService();
