"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { DEMO_OTP, SHOW_DEMO_HINT } from "./authService";

interface OtpInputProps {
  length?: number;
  targetDescription: string;
  onVerify: (code: string) => Promise<{ success: boolean; message?: string }>;
  onResend: () => Promise<void>;
  onChangeTarget?: () => void;
  targetLabel?: string;
  isCompact?: boolean; // For signup inline panels
  autoFocus?: boolean;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  length = 6,
  targetDescription,
  onVerify,
  onResend,
  onChangeTarget,
  targetLabel = "Change",
  isCompact = false,
  autoFocus = true,
}) => {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(""));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [shake, setShake] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer countdown for Resend
  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendTimer]);

  // Lockout countdown if failed attempts reach 5
  useEffect(() => {
    if (lockoutTimer <= 0) return;
    const timer = setInterval(() => {
      setLockoutTimer((prev) => {
        if (prev <= 1) {
          setFailedAttempts(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutTimer]);

  // Focus first input on mount
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const triggerVerification = useCallback(
    async (codeToVerify: string) => {
      if (lockoutTimer > 0) return;
      setIsVerifying(true);
      setErrorMessage(null);

      try {
        const res = await onVerify(codeToVerify);
        if (res.success) {
          setIsSuccess(true);
          setErrorMessage(null);
        } else {
          const newFailed = failedAttempts + 1;
          setFailedAttempts(newFailed);
          setErrorMessage(res.message || "Invalid OTP code. Please try again.");
          setShake(true);
          setTimeout(() => setShake(false), 500);

          if (newFailed >= 5) {
            setLockoutTimer(30);
            setErrorMessage("Too many incorrect attempts. Please wait 30 seconds.");
          }

          // Clear inputs & refocus first
          setDigits(Array(length).fill(""));
          setTimeout(() => {
            if (inputRefs.current[0]) inputRefs.current[0].focus();
          }, 100);
        }
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : "Verification failed. Please try again.");
      } finally {
        setIsVerifying(false);
      }
    },
    [failedAttempts, length, lockoutTimer, onVerify]
  );

  const handleChange = (index: number, value: string) => {
    if (lockoutTimer > 0) return;
    // Allow only single digits
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned) {
      const next = [...digits];
      next[index] = "";
      setDigits(next);
      return;
    }

    const digit = cleaned.slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setErrorMessage(null);

    // Auto-advance
    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    } else {
      // If 6th digit entered, auto submit
      const fullCode = next.join("");
      if (fullCode.length === length) {
        triggerVerification(fullCode);
      }
    }
  };

  const handleFillDemo = () => {
    const demoDigits = DEMO_OTP.slice(0, length).split("");
    setDigits(demoDigits);
    setErrorMessage(null);
    triggerVerification(demoDigits.join(""));
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        e.preventDefault();
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (lockoutTimer > 0) return;
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;

    const next = [...digits];
    for (let i = 0; i < length; i++) {
      next[i] = pasted[i] || "";
    }
    setDigits(next);
    setErrorMessage(null);

    const focusIdx = Math.min(pasted.length, length - 1);
    inputRefs.current[focusIdx]?.focus();

    if (pasted.length === length) {
      triggerVerification(pasted);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0 || lockoutTimer > 0) return;
    setDigits(Array(length).fill(""));
    setErrorMessage(null);
    setResendTimer(30);
    try {
      await onResend();
      if (inputRefs.current[0]) inputRefs.current[0].focus();
    } catch {
      setErrorMessage("Failed to resend code.");
    }
  };

  const isComplete = digits.every((d) => d !== "");

  return (
    <div
      className={`w-full ${
        isCompact
          ? "bg-[#f8f9fc] dark:bg-gray-800/60 border border-[#e2e8f0] dark:border-gray-700/60 rounded-xl p-4 my-2 transition-all"
          : "space-y-4"
      }`}
    >
      {/* Header Info */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <div>
          <h4
            className={`${
              isCompact ? "text-xs font-semibold" : "text-sm font-semibold"
            } text-gray-900 dark:text-gray-100`}
          >
            Enter 6-digit OTP
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Sent to <span className="font-medium text-gray-700 dark:text-gray-200">{targetDescription}</span>
          </p>
        </div>
        {onChangeTarget && (
          <button
            type="button"
            onClick={onChangeTarget}
            className="text-xs font-medium text-[#6d55f4] hover:text-[#5841e2] hover:underline cursor-pointer pt-0.5"
          >
            {targetLabel}
          </button>
        )}
      </div>

      {/* 6 Square Inputs */}
      <div
        className={`flex items-center justify-between gap-2 sm:gap-3 my-4 ${
          shake ? "animate-shake" : ""
        }`}
        role="group"
        aria-label="6-digit verification code"
      >
        {digits.map((digit, idx) => (
          <input
            key={idx}
            ref={(el) => {
              inputRefs.current[idx] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            value={digit}
            disabled={isVerifying || isSuccess || lockoutTimer > 0}
            onChange={(e) => handleChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            onPaste={handlePaste}
            className={`w-11 h-13 sm:w-13 sm:h-14 text-center text-xl font-bold rounded-lg transition-all focus:outline-hidden ${
              isSuccess
                ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                : errorMessage
                ? "border-red-500 bg-red-50/50 dark:bg-red-950/30 text-red-700 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                : digit
                ? "border-[#6d55f4] bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white hover:border-gray-400"
            } focus:border-[#6d55f4] focus:ring-2 focus:ring-[#6d55f4]/25 shadow-2xs`}
            aria-label={`Digit ${idx + 1}`}
          />
        ))}
      </div>

      {/* Error or Lockout notification */}
      {errorMessage && (
        <div
          className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 animate-in fade-in py-1"
          role="alert"
          aria-live="polite"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Success notification */}
      {isSuccess && (
        <div
          className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium animate-in fade-in py-1"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Verified successfully!</span>
        </div>
      )}

      {/* Action Row: Verify Button & Resend Timer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <button
          type="button"
          disabled={!isComplete || isVerifying || isSuccess || lockoutTimer > 0}
          onClick={() => triggerVerification(digits.join(""))}
          className={`w-full sm:w-auto px-7 h-[47px] rounded-lg text-[14.5px] font-medium text-white transition-all flex items-center justify-center gap-2 cursor-pointer ${
            !isComplete || isVerifying || isSuccess || lockoutTimer > 0
              ? "bg-[#b8b5fa] cursor-not-allowed"
              : "bg-[#6d55f4] hover:bg-[#5b42e6] shadow-xs hover:shadow"
          }`}
        >
          {isVerifying ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Verifying...</span>
            </>
          ) : isSuccess ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Verified</span>
            </>
          ) : (
            <span>Verify OTP</span>
          )}
        </button>

        {/* Resend countdown or active link */}
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {lockoutTimer > 0 ? (
            <span className="text-red-500 font-medium">Locked ({lockoutTimer}s)</span>
          ) : resendTimer > 0 ? (
            <span>Resend OTP in 0:{resendTimer < 10 ? `0${resendTimer}` : resendTimer}</span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              className="text-[#6d55f4] hover:text-[#5841e2] font-semibold hover:underline cursor-pointer"
            >
              Resend OTP
            </button>
          )}
        </div>
      </div>

      {/* Demo helper hint with click-to-fill */}
      {SHOW_DEMO_HINT && (
        <div className="pt-1 text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1.5 justify-center">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>
            Demo mode:{" "}
            <button
              type="button"
              onClick={handleFillDemo}
              className="font-semibold text-[#6d55f4] dark:text-[#8b75fc] hover:underline cursor-pointer"
              title="Click to fill and verify demo OTP"
            >
              Click to use demo OTP ({DEMO_OTP.slice(0, length)})
            </button>
          </span>
        </div>
      )}

      {/* Scoped shake animation */}
      <style>{`
        @keyframes otpShake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .animate-shake {
          animation: otpShake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
};
