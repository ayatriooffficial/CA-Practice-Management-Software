"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, AlertCircle, Info, X } from "lucide-react";

export interface ToastNotificationProps {
  message: string | null;
  type?: "success" | "error" | "info";
  onClose?: () => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({
  message,
  type = "success",
  onClose,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!message || !mounted) return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="fixed top-6 right-6 z-[999999] flex items-center gap-3 px-4.5 py-3 rounded-xl shadow-2xl border border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] text-[#111827] dark:text-[#f8fafc] animate-in slide-in-from-top-3 fade-in duration-200 pointer-events-auto max-w-md"
      style={{
        boxShadow: "0 20px 30px -8px rgba(0, 0, 0, 0.3), 0 10px 15px -5px rgba(0, 0, 0, 0.2)",
      }}
    >
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0 shadow-xs"
        style={{
          backgroundColor:
            type === "error"
              ? "#ef4444"
              : type === "info"
              ? "#3b82f6"
              : "var(--premium-blue-dark, #31719B)",
        }}
      >
        {type === "error" ? (
          <AlertCircle className="w-3.5 h-3.5" />
        ) : type === "info" ? (
          <Info className="w-3.5 h-3.5" />
        ) : (
          <Check className="w-3.5 h-3.5" />
        )}
      </div>

      <span className="text-xs sm:text-sm font-semibold tracking-tight select-none">
        {message}
      </span>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="ml-auto p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          aria-label="Close notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>,
    document.body
  );
};

export default ToastNotification;
