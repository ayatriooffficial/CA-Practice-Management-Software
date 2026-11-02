"use client";

import React, { forwardRef, useState } from "react";
import { Eye, EyeOff, Search, X } from "lucide-react";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  inputSize?: "sm" | "md" | "lg";
  onClear?: () => void;
  containerClassName?: string;
}

const inputSizeStyles = {
  sm: "h-8 px-2.5 text-xs",
  md: "h-9 px-3 text-xs",
  lg: "h-10 px-3.5 text-sm",
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      inputSize = "md",
      type = "text",
      value,
      onClear,
      className = "",
      containerClassName = "",
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const computedType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
      <div className={`w-full space-y-1 ${containerClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-gray-700 dark:text-gray-300 select-none cursor-pointer"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {/* Left Icon or Search icon */}
          {leftIcon ? (
            <div className="absolute left-2.5 text-gray-400 pointer-events-none flex items-center shrink-0">
              {leftIcon}
            </div>
          ) : type === "search" ? (
            <div className="absolute left-2.5 text-gray-400 pointer-events-none flex items-center shrink-0">
              <Search className="w-3.5 h-3.5" />
            </div>
          ) : null}

          <input
            ref={ref}
            id={inputId}
            type={computedType}
            value={value}
            disabled={disabled}
            className={`w-full rounded-sm border bg-white dark:bg-[#0f172a] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none transition-colors disabled:opacity-50 disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:cursor-not-allowed ${
              error
                ? "border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                : "border-[#dde2e8] dark:border-[#475569] hover:border-gray-400 dark:hover:border-gray-500 focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B]"
            } ${leftIcon || type === "search" ? "pl-8" : ""} ${
              rightIcon || isPassword || (onClear && value) ? "pr-8" : ""
            } ${inputSizeStyles[inputSize]} ${className}`}
            {...props}
          />

          {/* Right Icon / Password Reveal / Clear Button */}
          {isPassword ? (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer p-0.5"
              title={showPassword ? "Hide password" : "Show password"}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          ) : onClear && value ? (
            <button
              type="button"
              tabIndex={-1}
              onClick={onClear}
              className="absolute right-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer p-0.5"
              title="Clear input"
              aria-label="Clear input"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : rightIcon ? (
            <div className="absolute right-2.5 text-gray-400 pointer-events-none flex items-center shrink-0">
              {rightIcon}
            </div>
          ) : null}
        </div>

        {error ? (
          <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] text-gray-500 dark:text-gray-400">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
