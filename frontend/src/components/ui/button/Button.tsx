
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
  primary: "bg-[var(--primary,#31719B)] text-white",
  secondary:
    "bg-white dark:bg-[#1e293b] text-gray-700 dark:text-gray-300 border border-[#dde2e8] dark:border-[#334155]",
  outline: "bg-transparent text-[#31719B] border border-[#31719B]",
  danger: "bg-[var(--premium-orange-dark)] text-white",
  ghost: "bg-transparent text-gray-600 dark:text-gray-300",
  success: "bg-emerald-600 text-white",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  icon: "p-1",
  "icon-sm": "p-1",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "sm",
      loading = false,
      icon,
      rightIcon,
      className = "",
      disabled,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading}
        className={`
  inline-flex flex-row flex-nowrap items-center justify-center
  gap-1.5 px-4 py-1.5 text-xs font-semibold
  rounded-md shadow-xs transition-all
  hover:scale-[1.01] active:scale-[0.99]
  whitespace-nowrap
  disabled:opacity-50 disabled:cursor-not-allowed
  ${variantStyles[variant]}
  ${sizeStyles[size]}
  ${className}
`}
        {...props}
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin shrink-0" />
        ) : (
          icon && <span className="inline-flex shrink-0">{icon}</span>
        )}

        {children}

        {!loading && rightIcon && (
          <span className="inline-flex shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
