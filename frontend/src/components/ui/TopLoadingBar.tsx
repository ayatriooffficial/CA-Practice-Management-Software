"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { navigationProgress, ProgressState } from "@/services/navigationProgress";
import { pageStateCache, getCanonicalSection } from "@/services/pageStateCache";
import { preloadSectionData } from "@/services/sectionPreloadService";

export const TopLoadingBar: React.FC = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Subscribe to navigation progress micro-store with cached snapshot
  const state: ProgressState = useSyncExternalStore(
    navigationProgress.subscribe,
    navigationProgress.getState,
    navigationProgress.getState
  );

  const [reducedMotion, setReducedMotion] = useState(false);

  // Check user prefers-reduced-motion setting
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReducedMotion(mql.matches);
      const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mql.addEventListener("change", listener);
      return () => mql.removeEventListener("change", listener);
    }
  }, []);

  // Initial page mount: start navigation cycle only if the page has not been loaded yet
  useEffect(() => {
    if (typeof window !== "undefined") {
      const current = window.location.pathname;
      if (!pageStateCache.isLoaded(current)) {
        navigationProgress.start(current);
        const t = setTimeout(() => {
          navigationProgress.routeMounted(current);
        }, 120);
        return () => clearTimeout(t);
      }
    }
  }, []);

  // When pathname or searchParams change, the Next.js router has committed the navigation
  useEffect(() => {
    if (pathname) {
      navigationProgress.routeMounted(pathname);
      pageStateCache.markLoaded(pathname);
    }
  }, [pathname, searchParams]);

  // Active abort controller for interruptible link clicks
  const linkAbortRef = React.useRef<AbortController | null>(null);
  const inFlightLinkRef = React.useRef<string | null>(null);

  // Global click interception for navigation links to start progress within ~100ms
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Find nearest anchor tag
      const target = (e.target as HTMLElement)?.closest?.("a");
      if (!target || !target.href) return;

      // Sidebar links handle their own navigation via switchSection and view resets
      if (target.closest("[data-section-nav]") || target.closest("aside")) {
        return;
      }

      // Ignore modified clicks (new tab, download, external, hash-only, mailto/tel)
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        target.target === "_blank" ||
        target.hasAttribute("download") ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      try {
        const url = new URL(target.href, window.location.href);
        const isSameOrigin = url.origin === window.location.origin;
        const isSamePageHash = isSameOrigin && url.pathname === window.location.pathname && url.search === window.location.search && url.hash !== "";

        if (isSameOrigin && !isSamePageHash) {
          const targetSection = getCanonicalSection(url.pathname);
          const currentSection = getCanonicalSection(window.location.pathname);

          // If destination page/section is already loaded: DO NOT show progress bar on revisit!
          if (pageStateCache.isLoaded(url.pathname) || pageStateCache.isLoaded(targetSection)) {
            if (linkAbortRef.current) {
              linkAbortRef.current.abort();
              linkAbortRef.current = null;
            }
            inFlightLinkRef.current = null;
            return;
          }

          // Task 4: Duplicate click guard - clicking same target again while it is already loading must NOT duplicate
          if (inFlightLinkRef.current === targetSection) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }

          // Task 4: Interruptible Navigation (Latest Click Wins):
          e.preventDefault();
          e.stopPropagation();

          if (linkAbortRef.current) {
            linkAbortRef.current.abort();
          }
          const controller = new AbortController();
          linkAbortRef.current = controller;
          inFlightLinkRef.current = targetSection;

          // 1. Progress bar cleanly restarts from the beginning on Page 1:
          navigationProgress.start(url.pathname, { immediate: true, force: true, reset: true });
          navigationProgress.setLoading("cross_nav", true);

          // 2. Preload Page 2's data in the background while user is still on Page 1:
          void (async () => {
            try {
              await preloadSectionData(targetSection, controller.signal);
            } catch {}

            if (controller.signal.aborted) {
              return;
            }
            navigationProgress.setLoading("cross_nav", false);
            inFlightLinkRef.current = null;
            // 3. Page 2 is now loaded in local memory, transition cleanly to Page 2:
            router.push(url.pathname + url.search + url.hash);
          })();
        }
      } catch {}
    };

    document.addEventListener("click", handleDocumentClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleDocumentClick, { capture: true });
      if (linkAbortRef.current) {
        linkAbortRef.current.abort();
      }
    };
  }, [router]);

  const { progress, isVisible } = state;

  if (!isVisible && progress === 0) return null;

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Page loading"
      className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none h-[2.5px] bg-transparent"
    >
      <div
        className={`h-full bg-gradient-to-r from-[#31719B] via-[#4f46e5] to-[#9333ea] ${
          reducedMotion ? "transition-opacity duration-200" : "transition-all duration-200 ease-out"
        }`}
        style={{
          transform: `scaleX(${progress / 100})`,
          transformOrigin: "left",
          opacity: isVisible ? 1 : 0,
        }}
      />
    </div>
  );
};
