"use client";

import React, { forwardRef } from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "danger"
  | "ghost"
  | "success";

export type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "text-white shadow-xs hover:opacity-95 active:scale-[0.99] border border-transparent",
  secondary:
    "bg-white dark:bg-[#1e293b] border border-[#dde2e8] dark:border-[#334155] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 shadow-2xs",
  outline:
    "bg-transparent border border-[#31719B] dark:border-[#60a5fa] text-[#31719B] dark:text-[#60a5fa] hover:bg-[#31719B]/10 dark:hover:bg-[#60a5fa]/10",
  danger:
    "bg-[var(--premium-orange-dark)] hover:opacity-95 text-white shadow-xs border border-transparent",
  ghost:
    "bg-transparent border-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
  success:
    "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs border border-transparent",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-2.5 text-xs",
  md: "h-9 px-3.5 text-xs font-semibold",
  lg: "h-10 px-4 text-sm font-semibold",
  icon: "h-8 w-8 p-1 justify-center",
  "icon-sm": "h-7 w-7 p-1 justify-center",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      rightIcon,
      className = "",
      disabled,
      children,
      style,
      ...props
    },
    ref
  ) => {
    const isPrimary = variant === "primary";
    const primaryStyle: React.CSSProperties = isPrimary
      ? { backgroundColor: "var(--primary, #31719B)", ...style }
      : style || {};

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        style={primaryStyle}
        className={`inline-flex items-center gap-1.5 rounded-sm font-medium transition-all select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
        ) : (
          icon && <span className="shrink-0">{icon}</span>
        )}
        {children && <span>{children}</span>}
        {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";

