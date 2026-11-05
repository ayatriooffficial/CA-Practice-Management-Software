"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { navigationProgress, ProgressState } from "@/services/navigationProgress";

export const TopLoadingBar: React.FC = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

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

  // Initial page mount: start navigation cycle so hard reload on Home or direct entry shows progress
  useEffect(() => {
    if (typeof window !== "undefined") {
      navigationProgress.start(window.location.pathname);
      navigationProgress.routeMounted();
    }
  }, []);

  // When pathname or searchParams change, the Next.js router has committed the navigation
  useEffect(() => {
    navigationProgress.routeMounted();
  }, [pathname, searchParams]);

  // Global click interception for navigation links to start progress within ~100ms
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Find nearest anchor tag
      const target = (e.target as HTMLElement)?.closest?.("a");
      if (!target || !target.href) return;

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
          navigationProgress.start(url.pathname);
        }
      } catch {}
    };

    document.addEventListener("click", handleDocumentClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleDocumentClick, { capture: true });
    };
  }, []);

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
