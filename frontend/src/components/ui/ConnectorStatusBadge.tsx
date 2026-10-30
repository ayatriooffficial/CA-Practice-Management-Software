"use client";

import React, { useState, useEffect } from "react";

interface ConnectorStatusBadgeProps {
  className?: string;
  onStatusChange?: (connected: boolean) => void;
}

export const ConnectorStatusBadge: React.FC<ConnectorStatusBadgeProps> = ({
  className = "",
  onStatusChange,
}) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const checkStatus = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      try {
        const res = await fetch("http://127.0.0.1:8081/ping", {
          signal: controller.signal,
        });
        const connected = res.ok;
        if (isMounted) {
          setIsConnected(connected);
          onStatusChange?.(connected);
        }
      } catch {
        if (isMounted) {
          setIsConnected(false);
          onStatusChange?.(false);
        }
      } finally {
        clearTimeout(timeoutId);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [onStatusChange]);

  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
        isConnected
          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60"
          : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60"
      } ${className}`}
    >
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${
          isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
        }`}
      />
      {isConnected ? (
        <span>Connector running</span>
      ) : (
        <span>
          Connector not running.{" "}
          <a
            href="/downloads/DSC-Connector.exe"
            download
            className="font-semibold underline hover:no-underline text-amber-800 dark:text-amber-200"
          >
            [Download Local Connector]
          </a>
        </span>
      )}
    </div>
  );
};
