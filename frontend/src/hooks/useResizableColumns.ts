"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface UseResizableColumnsOptions {
  storageKey?: string;
  initialWidths: Record<string, number>;
  minWidth?: number;
  maxWidth?: number;
}

export function useResizableColumns({
  storageKey,
  initialWidths,
  minWidth = 70,
  maxWidth = 800,
}: UseResizableColumnsOptions) {
  // Initial state strictly matches SSR initialWidths to eliminate hydration mismatch
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(initialWidths);

  // Load persisted widths from localStorage strictly after hydration
  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          setColumnWidths((prev) => {
            const merged = { ...prev, ...parsed };
            columnWidthsRef.current = merged;
            return merged;
          });
        }
      }
    } catch {
      // ignore parsing errors
    }
  }, [storageKey]);

  const [resizingKey, setResizingKey] = useState<string | null>(null);

  // Refs for tracking active drag without unnecessary re-renders
  const dragInfoRef = useRef<{
    key: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  const columnWidthsRef = useRef(columnWidths);
  columnWidthsRef.current = columnWidths;

  const animationFrameRef = useRef<number | null>(null);

  // Save to localStorage whenever widths change
  const persistWidths = useCallback(
    (widths: Record<string, number>) => {
      if (typeof window !== "undefined" && storageKey) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(widths));
        } catch {
          // ignore storage quota errors
        }
      }
    },
    [storageKey]
  );

  const handleResizeStart = useCallback(
    (colKey: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const currentWidth =
        columnWidthsRef.current[colKey] || initialWidths[colKey] || 150;

      dragInfoRef.current = {
        key: colKey,
        startX: e.clientX,
        startWidth: currentWidth,
      };

      setResizingKey(colKey);

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!dragInfoRef.current) return;

        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }

        animationFrameRef.current = requestAnimationFrame(() => {
          if (!dragInfoRef.current) return;

          const deltaX = moveEvent.clientX - dragInfoRef.current.startX;
          const newWidth = Math.min(
            maxWidth,
            Math.max(minWidth, Math.round(dragInfoRef.current.startWidth + deltaX))
          );

          setColumnWidths((prev) => {
            if (prev[dragInfoRef.current!.key] === newWidth) return prev;
            const updated = {
              ...prev,
              [dragInfoRef.current!.key]: newWidth,
            };
            columnWidthsRef.current = updated;
            return updated;
          });
        });
      };

      const onMouseUp = () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }

        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";

        if (dragInfoRef.current) {
          persistWidths(columnWidthsRef.current);
          dragInfoRef.current = null;
        }

        setResizingKey(null);
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [initialWidths, minWidth, maxWidth, persistWidths]
  );

  const resetColumnWidth = useCallback(
    (colKey?: string) => {
      if (colKey) {
        setColumnWidths((prev) => {
          const updated = {
            ...prev,
            [colKey]: initialWidths[colKey] || 150,
          };
          persistWidths(updated);
          return updated;
        });
      } else {
        setColumnWidths(initialWidths);
        persistWidths(initialWidths);
      }
    },
    [initialWidths, persistWidths]
  );

  const getColumnWidth = useCallback(
    (colKey: string): number => {
      return columnWidths[colKey] || initialWidths[colKey] || 150;
    },
    [columnWidths, initialWidths]
  );

  return {
    columnWidths,
    getColumnWidth,
    handleResizeStart,
    resizingKey,
    isResizing: resizingKey !== null,
    resetColumnWidth,
  };
}
