"use client";

import React, { useEffect, useState, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export const TopLoadingBar: React.FC = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const activeRequestsRef = useRef(0);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startProgress = () => {
    setIsVisible(true);
    setProgress((prev) => (prev === 0 ? 25 : Math.min(prev + 15, 80)));

    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          if (progressTimerRef.current) clearInterval(progressTimerRef.current);
          return 90;
        }
        // Trickle forward naturally
        const step = Math.max(1, (90 - prev) * 0.15);
        return prev + step;
      });
    }, 200);
  };

  const completeProgress = () => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    setProgress(100);
    setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => setProgress(0), 200);
    }, 250);
  };

  // Route transition tracking
  useEffect(() => {
    startProgress();
    const doneTimer = setTimeout(() => {
      completeProgress();
    }, 350);
    return () => clearTimeout(doneTimer);
  }, [pathname, searchParams]);

  // Global event tracking for API calls and async loading
  useEffect(() => {
    const handleStart = () => {
      activeRequestsRef.current += 1;
      startProgress();
    };

    const handleProgress = (e: CustomEvent<{ percent: number }>) => {
      if (typeof e.detail?.percent === "number") {
        setIsVisible(true);
        setProgress(Math.min(95, e.detail.percent));
      }
    };

    const handleDone = () => {
      activeRequestsRef.current = Math.max(0, activeRequestsRef.current - 1);
      if (activeRequestsRef.current === 0) {
        completeProgress();
      }
    };

    window.addEventListener("app:loading:start", handleStart);
    window.addEventListener("app:loading:progress", handleProgress as EventListener);
    window.addEventListener("app:loading:done", handleDone);

    return () => {
      window.removeEventListener("app:loading:start", handleStart);
      window.removeEventListener("app:loading:progress", handleProgress as EventListener);
      window.removeEventListener("app:loading:done", handleDone);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  if (!isVisible && progress === 0) return null;

  return (
    <div
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none h-[2.5px] bg-transparent"
    >
      <div
        className="h-full bg-gradient-to-r from-[#31719B] via-[#4f46e5] to-[#9333ea] transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: isVisible ? 1 : 0,
        }}
      />
    </div>
  );
};

