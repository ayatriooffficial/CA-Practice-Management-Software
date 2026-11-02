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
  size?: "sm" | "md" | "lg";
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
      inputSize,
      size: customSize,
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
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const currentType = isPassword ? (showPassword ? "text" : "password") : type;
    const resolvedSize = inputSize || customSize || "md";

    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);

    return (
      <div className={`w-full flex flex-col gap-1.5 ${containerClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold text-gray-700 dark:text-gray-300 select-none"
          >
            {label}
            {props.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}

        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div className="absolute left-2.5 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={currentType}
            value={value}
            disabled={disabled}
            className={`
              w-full rounded-sm border bg-white dark:bg-[#0f172a]
              text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500
              border-[#dde2e8] dark:border-[#475569]
              focus:outline-none focus:border-[#31719B] focus:ring-1 focus:ring-[#31719B]
              transition-colors duration-150
              disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-900
              ${inputSizeStyles[resolvedSize]}
              ${leftIcon ? "pl-8" : ""}
              ${rightIcon || isPassword || onClear ? "pr-8" : ""}
              ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
              ${className}
            `}
            {...props}
          />

          {/* Right Icon / Clear / Password Toggle */}
          <div className="absolute right-2.5 flex items-center gap-1 text-gray-400 dark:text-gray-500">
            {onClear && value && !disabled && (
              <button
                type="button"
                onClick={onClear}
                aria-label="Clear input"
                className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {isPassword && !disabled && (
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
              </button>
            )}

            {rightIcon && !isPassword && !onClear && (
              <div className="pointer-events-none flex items-center">{rightIcon}</div>
            )}
          </div>
        </div>

        {error && (
          <span className="text-[11px] text-red-500 font-medium leading-tight">
            {error}
          </span>
        )}

        {helperText && !error && (
          <span className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
            {helperText}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
