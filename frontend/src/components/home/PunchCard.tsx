"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { LogIn, LogOut, Loader2 } from 'lucide-react';
import { attendanceApi, LiveStatusResponse } from '../../services/attendanceApi';

interface PunchCardProps {
  userName: string;
  onPunchChange?: () => void;
}

export const PunchCard: React.FC<PunchCardProps> = ({ userName, onPunchChange }) => {
  const [liveStatus, setLiveStatus] = useState<LiveStatusResponse | null>(null);
  const [serverOffsetMs, setServerOffsetMs] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch initial live punch status and calibrate server time offset
  const loadStatus = useCallback(async () => {
    try {
      const clientFetchStart = Date.now();
      const [serverTimeData, statusData] = await Promise.all([
        attendanceApi.getServerTime(),
        attendanceApi.getLiveStatus(),
      ]);
      const clientFetchEnd = Date.now();
      const roundTripLatency = (clientFetchEnd - clientFetchStart) / 2;

      // Server clock offset: difference between server time and local client time
      const offset = (serverTimeData.timestampMs + roundTripLatency) - clientFetchEnd;
      setServerOffsetMs(offset);
      setLiveStatus(statusData);

      if (statusData.hasPunchedIn && !statusData.hasPunchedOut && statusData.punchIn) {
        const inMs = new Date(statusData.punchIn).getTime();
        const currentServerNow = Date.now() + offset;
        const initialSeconds = Math.max(0, Math.floor((currentServerNow - inMs) / 1000));
        setElapsedSeconds(initialSeconds);
      } else if (statusData.hasPunchedOut) {
        setElapsedSeconds((statusData.totalMinutes || 0) * 60);
      } else {
        setElapsedSeconds(0);
      }
    } catch {
      // Fallback
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Live timer interval: calculates from server-adjusted timestamp to be immune to tab throttling
  useEffect(() => {
    if (!liveStatus?.hasPunchedIn || liveStatus?.hasPunchedOut || !liveStatus?.punchIn) {
      return;
    }

    const inMs = new Date(liveStatus.punchIn).getTime();
    const interval = setInterval(() => {
      const currentServerNow = Date.now() + serverOffsetMs;
      const seconds = Math.max(0, Math.floor((currentServerNow - inMs) / 1000));
      setElapsedSeconds(seconds);
    }, 1000);

    return () => clearInterval(interval);
  }, [liveStatus, serverOffsetMs]);

  // Formatted digits
  const { hoursStr, minsStr, secsStr, totalMinutesWorked } = useMemo(() => {
    const h = Math.floor(elapsedSeconds / 3600);
    const m = Math.floor((elapsedSeconds % 3600) / 60);
    const s = elapsedSeconds % 60;
    return {
      hoursStr: String(h).padStart(2, '0'),
      minsStr: String(m).padStart(2, '0'),
      secsStr: String(s).padStart(2, '0'),
      totalMinutesWorked: Math.floor(elapsedSeconds / 60),
    };
  }, [elapsedSeconds]);

  // Donut display calculations
  const shiftMinutes = (liveStatus?.shiftHours || 9) * 60;
  const progressRatio = Math.min(1, totalMinutesWorked / shiftMinutes);
  const donutRadius = 46;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const donutOffset = donutCircumference - progressRatio * donutCircumference;

  // Formatted total worked string for inside the donut
  const donutLabel = useMemo(() => {
    if (totalMinutesWorked === 0) return '0 min';
    const h = Math.floor(totalMinutesWorked / 60);
    const m = totalMinutesWorked % 60;
    if (h === 0) return `${m} min`;
    return `${h}h ${m}m`;
  }, [totalMinutesWorked]);

  // Punch In Action
  const handlePunchIn = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    // Optional GPS location
    let geo: { lat: number; lng: number; accuracy?: number } | undefined = undefined;
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
            enableHighAccuracy: true,
          });
        });
        geo = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
      } catch {
        // Geolocation denied or timed out; continue without blocking
      }
    }

    try {
      await attendanceApi.punchIn(geo);
      await loadStatus();
      if (onPunchChange) onPunchChange();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to punch in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Punch Out Action
  const handlePunchOut = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await attendanceApi.punchOut();
      await loadStatus();
      if (onPunchChange) onPunchChange();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to punch out.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format timestamp for In/Out tiles
  const formatTileTime = (isoString?: string | null) => {
    if (!isoString) return '00:00:00';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '00:00:00';
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(d);
  };

  const isSessionOpen = liveStatus?.hasPunchedIn && !liveStatus?.hasPunchedOut;

  return (
    <div
      className="w-full bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-[#334155] transition-all flex flex-col justify-between shadow-2xs"
      style={{
        padding: '24px',
      }}
    >
      {/* Title */}
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
        Welcome, {userName} 👋
      </h3>

      {errorMessage && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs">
          {errorMessage}
        </div>
      )}

      {/* Main Content: Left Controls + Right Donut */}
      <div className="flex items-center justify-between" style={{ gap: '24px' }}>
        {/* Left Sub-card */}
        <div className="flex-1 flex flex-col" style={{ gap: '16px' }}>
          {/* Live Timer Boxes */}
          <div className="flex items-center" style={{ gap: '8px' }}>
            {/* Hours */}
            <div className="flex flex-col items-center">
              <div
                className="w-12 h-11 rounded-lg border border-gray-200 dark:border-[#334155] bg-gray-50/50 dark:bg-[#0f172a] flex items-center justify-center text-lg font-bold text-gray-900 dark:text-white"
              >
                {hoursStr}
              </div>
              <span className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                Hours
              </span>
            </div>

            <span className="text-lg font-bold text-gray-400 -mt-4">:</span>

            {/* Minutes */}
            <div className="flex flex-col items-center">
              <div
                className="w-12 h-11 rounded-lg border border-gray-200 dark:border-[#334155] bg-gray-50/50 dark:bg-[#0f172a] flex items-center justify-center text-lg font-bold text-gray-900 dark:text-white"
              >
                {minsStr}
              </div>
              <span className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                Minutes
              </span>
            </div>

            <span className="text-lg font-bold text-gray-400 -mt-4">:</span>

            {/* Seconds */}
            <div className="flex flex-col items-center">
              <div
                className="w-12 h-11 rounded-lg border border-gray-200 dark:border-[#334155] bg-gray-50/50 dark:bg-[#0f172a] flex items-center justify-center text-lg font-bold text-gray-900 dark:text-white"
              >
                {secsStr}
              </div>
              <span className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                Seconds
              </span>
            </div>
          </div>

          {/* Action Button: Punch In or Punch Out */}
          <div>
            {!isSessionOpen ? (
              <button
                type="button"
                disabled={isSubmitting || liveStatus?.hasPunchedOut}
                onClick={handlePunchIn}
                className="w-full max-w-[200px] py-2.5 px-4 rounded-lg text-sm font-semibold text-white transition-all shadow-sm active:scale-95 flex items-center justify-center disabled:opacity-50"
                style={{
                  backgroundColor: '#22c55e',
                }}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  'Punch In'
                )}
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handlePunchOut}
                className="w-full max-w-[200px] py-2.5 px-4 rounded-lg text-sm font-semibold text-white transition-all shadow-sm active:scale-95 flex items-center justify-center disabled:opacity-50"
                style={{
                  backgroundColor: '#ef4444',
                }}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  'Punch Out'
                )}
              </button>
            )}
          </div>

          {/* Bottom Tiles: Punch In and Punch Out */}
          <div className="flex items-center" style={{ gap: '24px' }}>
            {/* Punch In Tile */}
            <div className="flex items-center" style={{ gap: '10px' }}>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: '#ecfdf5', color: '#10b981' }}
              >
                <LogIn size={15} />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-gray-400 dark:text-gray-500">
                  Punch In
                </span>
                <span
                  className="text-xs font-bold"
                  style={{ color: '#10b981' }}
                >
                  {formatTileTime(liveStatus?.punchIn)}
                </span>
              </div>
            </div>

            {/* Punch Out Tile */}
            <div className="flex items-center" style={{ gap: '10px' }}>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}
              >
                <LogOut size={15} />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-gray-400 dark:text-gray-500">
                  Punch Out
                </span>
                <span
                  className="text-xs font-bold"
                  style={{ color: '#ef4444' }}
                >
                  {formatTileTime(liveStatus?.punchOut)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Vertical Divider */}
        <div className="w-[1px] self-stretch bg-gray-100 dark:bg-gray-800" />

        {/* Right Donut Ring */}
        <div className="flex flex-col items-center justify-center shrink-0 pr-4">
          <div className="relative flex items-center justify-center w-28 h-28">
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 110 110">
              <circle
                cx="55"
                cy="55"
                r={42}
                stroke="#E8F0F8"
                strokeWidth="11"
                fill="transparent"
                className="dark:stroke-[#1E3A5F]"
              />
              <circle
                cx="55"
                cy="55"
                r={42}
                stroke="#3D6A9E"
                strokeWidth="11"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 42}
                strokeDashoffset={totalMinutesWorked > 0 ? (2 * Math.PI * 42) * (1 - Math.min(1, totalMinutesWorked / ((liveStatus?.shiftHours || 9) * 60))) : 0}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
                {donutLabel}
              </span>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                Total
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
