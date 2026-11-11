"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppDispatch } from "@/store/hooks";
import { setSelectedClient } from "@/store/features/clients/clientSlice";
import { navigationProgress } from "@/services/navigationProgress";
import { pageStateCache } from "@/services/pageStateCache";
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

  // Rule 2: Whenever switching to another section, both old and new sections start at their first page.
  const switchSection = useCallback(
    async (targetSectionKey: string) => {
      const oldSection = activeSectionRef.current;
      const targetFirstPage = getSectionFirstPage(targetSectionKey);

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
        activeSectionRef.current = targetSectionKey;
        router.replace(targetFirstPage);
        return;
      }

      // First-time visit for ANY section:
      // 1. Progress bar starts immediately on the current page (Page 1):
      navigationProgress.start(targetFirstPage, { immediate: true, force: true });
      navigationProgress.setLoading(`prewarm_${targetSectionKey}`, true);

      // 2. User stays on Page 1 while Page 2 loads in the background:
      try {
        await Promise.race([
          preloadSectionData(targetSectionKey),
          new Promise((resolve) => setTimeout(resolve, 800)),
        ]);
      } catch {}

      // 3. Page 2 is now loaded in local memory & Redux!
      navigationProgress.setLoading(`prewarm_${targetSectionKey}`, false);
      activeSectionRef.current = targetSectionKey;

      // 4. Immediately switch to Page 2 (now fully loaded with all data):
      router.replace(targetFirstPage);
    },
    [dispatch, router]
  );

  return { switchSection, activeSection: activeSectionRef.current };
}

