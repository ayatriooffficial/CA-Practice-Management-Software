'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface PlacementCoords {
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
}

interface PlacementPreviewProps {
  pdfFile?: File | null;
  signerName: string;
  reason?: string;
  location?: string;
  showSignerName: boolean;
  showDateTime: boolean;
  showReasonLocation: boolean;
  placement: PlacementCoords;
  onChangePlacement: (coords: PlacementCoords) => void;
}

export const PlacementPreview: React.FC<PlacementPreviewProps> = ({
  pdfFile,
  signerName,
  reason,
  location,
  showSignerName,
  showDateTime,
  showReasonLocation,
  placement,
  onChangePlacement,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialCoords, setInitialCoords] = useState<PlacementCoords>(placement);
  const [hasRenderedPdf, setHasRenderedPdf] = useState(false);

  // Load and render PDF first page via pdfjs-dist if file is provided
  useEffect(() => {
    let active = true;

    async function renderPage() {
      if (!pdfFile || !canvasRef.current) {
        setHasRenderedPdf(false);
        return;
      }

      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

        const arrayBuffer = await pdfFile.arrayBuffer();
        if (!active) return;

        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        if (!active) return;

        const page = await pdf.getPage(1);
        if (!active || !canvasRef.current || !containerRef.current) return;

        const containerWidth = containerRef.current.clientWidth || 240;
        const unscaledViewport = page.getViewport({ scale: 1 });
        const scale = containerWidth / unscaledViewport.width;
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: context,
          viewport,
        }).promise;

        if (active) setHasRenderedPdf(true);
      } catch (err) {
        // Fallback to wireframe preview if render fails or password protected
        if (active) setHasRenderedPdf(false);
      }
    }

    void renderPage();

    return () => {
      active = false;
    };
  }, [pdfFile]);

  // Handle Box Dragging
  const handleMouseDownDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialCoords(placement);
  };

  // Handle Corner Resizing
  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialCoords(placement);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const deltaXPct = ((e.clientX - dragStart.x) / rect.width) * 100;
      const deltaYPct = ((e.clientY - dragStart.y) / rect.height) * 100;

      if (isDragging) {
        const newX = Math.max(0, Math.min(100 - initialCoords.wPct, initialCoords.xPct + deltaXPct));
        const newY = Math.max(0, Math.min(100 - initialCoords.hPct, initialCoords.yPct + deltaYPct));
        onChangePlacement({
          ...initialCoords,
          xPct: Math.round(newX),
          yPct: Math.round(newY),
        });
      } else if (isResizing) {
        const newW = Math.max(20, Math.min(100 - initialCoords.xPct, initialCoords.wPct + deltaXPct));
        const newH = Math.max(8, Math.min(100 - initialCoords.yPct, initialCoords.hPct + deltaYPct));
        onChangePlacement({
          ...initialCoords,
          wPct: Math.round(newW),
          hPct: Math.round(newH),
        });
      }
    },
    [isDragging, isResizing, dragStart, initialCoords, onChangePlacement]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
        <span className="font-medium">Visual Placement Preview</span>
        <span className="text-[10px]">
          X: {placement.xPct}% · Y: {placement.yPct}% · {placement.wPct}% × {placement.hPct}%
        </span>
      </div>

      {/* Preview Sheet Container */}
      <div
        ref={containerRef}
        className="relative w-full aspect-[1/1.3] rounded-lg border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#0f172a] shadow-xs overflow-hidden select-none"
      >
        {/* Rendered PDF Page Canvas */}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full object-contain pointer-events-none ${
            hasRenderedPdf ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Fallback Mock Document Wireframe if no PDF or still loading */}
        {!hasRenderedPdf && (
          <div className="absolute inset-0 p-3 flex flex-col gap-2 pointer-events-none opacity-40">
            <div className="w-1/3 h-2 rounded bg-gray-300 dark:bg-gray-600 mb-1" />
            <div className="w-full h-1.5 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="w-5/6 h-1.5 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="w-full h-1.5 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="w-4/5 h-1.5 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="w-3/4 h-1.5 rounded bg-gray-200 dark:bg-gray-700 mt-2" />
            <div className="w-full h-1.5 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="w-2/3 h-1.5 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        )}

        {/* Draggable & Resizable Stamp Box */}
        <div
          onMouseDown={handleMouseDownDrag}
          style={{
            left: `${placement.xPct}%`,
            top: `${placement.yPct}%`,
            width: `${placement.wPct}%`,
            height: `${placement.hPct}%`,
          }}
          className={`absolute rounded border-2 cursor-grab active:cursor-grabbing transition-shadow flex flex-col justify-between p-1 shadow-sm overflow-hidden text-[9px] leading-tight ${
            isDragging || isResizing
              ? 'border-[#31719B] bg-blue-50/90 dark:bg-blue-950/90 shadow-md ring-2 ring-blue-400/40'
              : 'border-[#31719B] bg-white/95 dark:bg-[#1e293b]/95 hover:border-blue-700 dark:hover:border-blue-400'
          }`}
        >
          {/* Top Stamp Header */}
          <div className="flex items-center justify-between text-[8px] font-bold text-[#31719B] dark:text-blue-400 tracking-tight border-b border-blue-200 dark:border-blue-900 pb-0.5">
            <span className="truncate">DIGITALLY SIGNED</span>
            <span className="text-[7.5px] font-mono opacity-80">DSC</span>
          </div>

          {/* Stamp Body */}
          <div className="flex-1 flex flex-col justify-center py-0.5 space-y-0.5 overflow-hidden text-[#111827] dark:text-gray-200">
            {showSignerName && (
              <p className="font-bold truncate text-[8.5px]">
                {signerName || 'Signer Name'}
              </p>
            )}
            {showDateTime && (
              <p className="text-[7.5px] text-gray-500 dark:text-gray-400 truncate">
                {new Date().toISOString().slice(0, 10)} 12:00 UTC
              </p>
            )}
            {showReasonLocation && (reason || location) && (
              <p className="text-[7px] text-gray-500 dark:text-gray-400 truncate">
                {reason || location || 'Approved'}
              </p>
            )}
          </div>

          {/* Bottom Resizing Grip Handle */}
          <div
            onMouseDown={handleMouseDownResize}
            className="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize flex items-end justify-end p-0.5 group"
            title="Drag to resize signature stamp"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[#31719B] group-hover:scale-125 transition-transform" />
          </div>
        </div>
      </div>

      <p className="text-[10px] text-gray-400 dark:text-gray-500 italic">
        Drag the box to change position, or drag the bottom-right handle to resize.
      </p>
    </div>
  );
};
