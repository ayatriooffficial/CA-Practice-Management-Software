"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppDispatch } from "@/store/hooks";
import { setSelectedClient } from "@/store/features/clients/clientSlice";
import { startNavigation, finishNavigation } from "@/store/features/navigation/navigationOrchestratorSlice";
import { getStore } from "@/store";
import { navigationProgress } from "@/services/navigationProgress";
import { pageStateCache, getCanonicalSection } from "@/services/pageStateCache";
import { preloadSectionData } from "@/services/sectionPreloadService";

export function getSectionKey(pathname: string | null): string {
  if (!pathname || pathname === "/") return "home";
  const clean = pathname.replace(/^\/+/, "");
  const first = clean.split("/")[0]?.toLowerCase() || "home";
  return first;
}

export function getSectionFirstPage(sectionKey: string): string {
  switch (sectionKey) {
    case "home":
      return "/";
    case "client":
      return "/client";
    case "groups":
      return "/groups";
    case "dsc":
      return "/dsc";
    case "pdf-signer":
      return "/pdf-signer";
    case "services":
      return "/services";
    case "task":
      return "/task";
    case "invoice":
      return "/invoice";
    case "team":
      return "/team";
    case "leads":
      return "/leads";
    case "proposals":
      return "/proposals";
    case "reports":
      return "/reports";
    case "documents":
      return "/documents";
    case "compliance":
      return "/compliance";
    case "notices":
      return "/notices";
    case "whatsapp":
      return "/whatsapp";
    default:
      return `/${sectionKey}`;
  }
}

/**
 * Universal navigation helper that routes any navigation (programmatic or link)
 * through the central orchestrator and gated progress bar.
 */
export async function navigateWithTransition(
  targetUrl: string,
  router: { push: (url: string) => void },
  signal?: AbortSignal
): Promise<void> {
  const targetSection = getCanonicalSection(targetUrl);

  // If destination is already loaded in this session, navigate immediately with 0ms and NO progress bar
  if (pageStateCache.isLoaded(targetUrl) || pageStateCache.isLoaded(targetSection)) {
    router.push(targetUrl);
    return;
  }

  // First visit: Show progress bar on current page, preload in background, transition only when ready
  navigationProgress.start(targetUrl, { immediate: true, force: true, reset: true });
  navigationProgress.setLoading("prog_nav", true);

  const store = typeof window !== "undefined" ? getStore() : null;
  if (store) {
    store.dispatch(startNavigation({ targetSection }));
  }

  try {
    await preloadSectionData(targetSection, signal);
  } catch {}

  if (signal?.aborted) return;

  if (store) {
    store.dispatch(finishNavigation({ targetSection }));
  }
  navigationProgress.setLoading("prog_nav", false);
  navigationProgress.finish();
  router.push(targetUrl);
}

export function useSectionNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const activeSectionRef = useRef<string>(getSectionKey(pathname));

  // Update active section on route change
  useEffect(() => {
    const current = getSectionKey(pathname);
    activeSectionRef.current = current;
  }, [pathname]);

  // Rule 1: Back/Forward arrows must follow back ONLY until that particular section ends.
  // Prevent browser history traversal across different sections.
  useEffect(() => {
    const handlePopState = () => {
      const activeSection = activeSectionRef.current;
      const destinationPath = window.location.pathname;
      const destinationSection = getSectionKey(destinationPath);

      if (activeSection && destinationSection !== activeSection) {
        // Intercept attempt to leave the active section via browser back/forward buttons
        const root = getSectionFirstPage(activeSection);
        window.history.pushState(null, "", root);
        router.replace(root);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [router]);

  const inFlightSectionRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Rule 2: Whenever switching to another section, both old and new sections start at their first page.
  const switchSection = useCallback(
    async (targetSectionKey: string) => {
      const oldSection = activeSectionRef.current;
      const targetFirstPage = getSectionFirstPage(targetSectionKey);

      // Task 4: Duplicate click guard - clicking the same target again while it is already loading must NOT restart or duplicate
      if (inFlightSectionRef.current === targetSectionKey) {
        return;
      }

      // Reset old section view state
      if (oldSection === "client") {
        dispatch(setSelectedClient(null));
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("app:reset-view:client"));
        }
      } else if (oldSection === "groups") {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("app:reset-view:groups"));
        }
      }

      // Reset target section view state so it always starts at its first page
      if (targetSectionKey === "client") {
        dispatch(setSelectedClient(null));
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("app:reset-view:client"));
        }
      } else if (targetSectionKey === "groups") {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("app:reset-view:groups"));
        }
      }

      // If the target section is ALREADY loaded in this session:
      // Instantly switch pages without any progress bar or re-loading!
      if (pageStateCache.isLoaded(targetFirstPage)) {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }
        inFlightSectionRef.current = null;
        activeSectionRef.current = targetSectionKey;
        router.push(targetFirstPage);
        return;
      }

      // Task 4: Interruptible Navigation (Latest Click Wins):
      // 1. Immediately abort previous in-flight task
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;
      inFlightSectionRef.current = targetSectionKey;

      // 2. Progress bar cleanly restarts from the beginning on the current page:
      navigationProgress.start(targetFirstPage, { immediate: true, force: true, reset: true });
      navigationProgress.setLoading(`section_nav`, true);
      dispatch(startNavigation({ targetSection: targetSectionKey }));

      // 3. User stays on Page 1 while Page 2 loads in the background:
      try {
        await preloadSectionData(targetSectionKey, controller.signal);
      } catch {
        if (controller.signal.aborted) return;
      }

      // 4. If interrupted by a newer navigation, drop this cycle completely and do not show page
      if (controller.signal.aborted) {
        return;
      }

      dispatch(finishNavigation({ targetSection: targetSectionKey }));
      navigationProgress.setLoading(`section_nav`, false);
      navigationProgress.finish();
      inFlightSectionRef.current = null;
      activeSectionRef.current = targetSectionKey;

      // 5. Commit transition to Page 2 (now fully loaded):
      router.push(targetFirstPage);
    },
    [dispatch, router]
  );

  const navigate = useCallback(
    (targetUrl: string) => {
      void navigateWithTransition(targetUrl, router);
    },
    [router]
  );

  return { switchSection, navigate, activeSection: activeSectionRef.current };
}

