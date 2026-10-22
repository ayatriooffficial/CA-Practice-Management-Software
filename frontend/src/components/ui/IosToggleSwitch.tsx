"use client";

import React from "react";

interface IosToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
  ariaLabel?: string;
}

export const IosToggleSwitch: React.FC<IosToggleSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  size = "md",
  className = "",
  ariaLabel = "Toggle service compliance",
}) => {
  const isSm = size === "sm";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) {
          onChange(!checked);
        }
      }}
      className={`relative inline-flex items-center shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none select-none ${
        isSm ? "h-4 w-7" : "h-5 w-9"
      } ${
        checked
          ? "bg-[#635bff] dark:bg-[#7c3aed]"
          : "bg-gray-200 dark:bg-gray-700"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
    >
      <span
        className={`pointer-events-none inline-block rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out transform ${
          isSm ? "h-3 w-3" : "h-4 w-4"
        } ${
          checked
            ? isSm
              ? "translate-x-3.5"
              : "translate-x-4.5"
            : "translate-x-0.5"
        }`}
      />
    </button>
  );
};
