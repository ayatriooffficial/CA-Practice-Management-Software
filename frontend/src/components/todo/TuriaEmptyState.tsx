"use client";

import React from "react";
import { Plus } from "lucide-react";

interface TuriaEmptyStateProps {
  onAddTodo: () => void;
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
}

export const TuriaEmptyState: React.FC<TuriaEmptyStateProps> = ({
  onAddTodo,
  title = "Ready to Tackle Your Day?",
  subtitle = "Click 'Add To-Do' to create your first task and get organized!",
  buttonLabel = "Add To-Do",
}) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 text-center select-none">
      {/* Turia Desk Calendar & Alarm Clock Illustration */}
      <div className="relative w-48 h-40 sm:w-56 sm:h-44 mb-6 flex items-center justify-center">
        {/* Decorative ambient background sparkles & pluses */}
        <span className="absolute -top-1 right-8 text-gray-300 dark:text-gray-600 text-sm font-light select-none">
          +
        </span>
        <span className="absolute bottom-6 left-4 text-gray-300 dark:text-gray-600 text-xs font-light select-none">
          +
        </span>
        <span className="absolute top-8 left-6 text-gray-300 dark:text-gray-600 text-xs font-light select-none">
          ✦
        </span>
        <span className="absolute -bottom-2 right-12 text-gray-300 dark:text-gray-600 text-sm font-light select-none">
          +
        </span>

        {/* Soft circular background glow */}
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-50/50 via-purple-50/30 to-amber-50/40 dark:from-indigo-950/20 dark:via-purple-950/10 dark:to-transparent rounded-full filter blur-xl -z-10" />

        <svg
          viewBox="0 0 240 180"
          className="w-full h-full drop-shadow-sm overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle desk shadow */}
          <ellipse
            cx="120"
            cy="158"
            rx="90"
            ry="12"
            fill="currentColor"
            className="text-gray-100 dark:text-gray-800/60"
          />

          {/* Desk Calendar Base / Stand (Warm Orange/Apricot) */}
          <polygon
            points="48,150 168,150 156,70 60,70"
            fill="#FB923C"
            className="opacity-90"
          />
          {/* Side Fold of Stand */}
          <polygon
            points="38,150 48,150 60,70 50,70"
            fill="#EA580C"
            className="opacity-80"
          />

          {/* Calendar Front Card (White Sheet) */}
          <rect
            x="52"
            y="65"
            width="112"
            height="84"
            rx="8"
            fill="#FFFFFF"
            stroke="#E2E8F0"
            strokeWidth="1.5"
            className="dark:fill-slate-900 dark:stroke-slate-700"
          />

          {/* Calendar Spiral Rings / Top Binding */}
          {[68, 88, 108, 128, 148].map((rxPos, i) => (
            <g key={i}>
              <circle
                cx={rxPos}
                cy="65"
                r="3.5"
                fill="#CBD5E1"
                className="dark:fill-slate-600"
              />
              <path
                d={`M${rxPos - 2} 58 C${rxPos - 2} 55, ${rxPos + 2} 55, ${rxPos + 2} 58 L${rxPos + 2} 65 L${rxPos - 2} 65 Z`}
                fill="#94A3B8"
              />
            </g>
          ))}

          {/* Calendar Sheet Header Line (Soft Coral / Orange Bar) */}
          <rect
            x="56"
            y="76"
            width="104"
            height="4"
            rx="2"
            fill="#FDBA74"
            className="opacity-70"
          />

          {/* Calendar Date Matrix Dots & Grid */}
          <g fill="#93C5FD" className="opacity-85">
            {/* Week row 1 */}
            <circle cx="68" cy="92" r="2.5" />
            <circle cx="82" cy="92" r="2.5" />
            <circle cx="96" cy="92" r="2.5" />
            <circle cx="110" cy="92" r="2.5" />
            <circle cx="124" cy="92" r="2.5" />
            <circle cx="138" cy="92" r="2.5" />
            <circle cx="150" cy="92" r="2.5" />

            {/* Week row 2 */}
            <circle cx="68" cy="106" r="2.5" />
            <circle cx="82" cy="106" r="2.5" />
            <circle cx="96" cy="106" r="2.5" />
            <circle cx="110" cy="106" r="2.5" />
            <circle cx="124" cy="106" r="2.5" />
            <circle cx="138" cy="106" r="2.5" />
            <circle cx="150" cy="106" r="2.5" />

            {/* Week row 3 */}
            <circle cx="68" cy="120" r="2.5" />
            <circle cx="82" cy="120" r="2.5" />
            <circle cx="96" cy="120" r="2.5" />
            <circle cx="110" cy="120" r="2.5" />
            <circle cx="124" cy="120" r="2.5" />
            <circle cx="138" cy="120" r="2.5" />
            <circle cx="150" cy="120" r="2.5" />

            {/* Week row 4 */}
            <circle cx="68" cy="134" r="2.5" />
            <circle cx="82" cy="134" r="2.5" />
            <circle cx="96" cy="134" r="2.5" />
            <circle cx="110" cy="134" r="2.5" />
          </g>

          {/* Alarm Clock Leaning in Front Right */}
          <g transform="translate(136, 88)">
            {/* Clock Base Shadow */}
            <ellipse
              cx="26"
              cy="62"
              rx="24"
              ry="5"
              fill="rgba(0,0,0,0.12)"
            />

            {/* Twin Alarm Bells */}
            <circle cx="10" cy="8" r="8" fill="#6366F1" />
            <circle cx="42" cy="8" r="8" fill="#6366F1" />
            {/* Bell highlights */}
            <circle cx="9" cy="6" r="3" fill="#A5B4FC" opacity="0.6" />
            <circle cx="41" cy="6" r="3" fill="#A5B4FC" opacity="0.6" />

            {/* Feet */}
            <line
              x1="12"
              y1="50"
              x2="6"
              y2="58"
              stroke="#4F46E5"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <line
              x1="40"
              y1="50"
              x2="46"
              y2="58"
              stroke="#4F46E5"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* Clock Outer Rim */}
            <circle
              cx="26"
              cy="32"
              r="28"
              fill="#6366F1"
              stroke="#4F46E5"
              strokeWidth="2"
            />

            {/* Clock Face (White) */}
            <circle
              cx="26"
              cy="32"
              r="22"
              fill="#FFFFFF"
              className="dark:fill-slate-900"
            />

            {/* Hour markers (ticks) */}
            <circle cx="26" cy="15" r="1.5" fill="#4B5563" />
            <circle cx="39" cy="22" r="1.5" fill="#4B5563" />
            <circle cx="43" cy="32" r="1.5" fill="#4B5563" />
            <circle cx="39" cy="42" r="1.5" fill="#4B5563" />
            <circle cx="26" cy="49" r="1.5" fill="#4B5563" />
            <circle cx="13" cy="42" r="1.5" fill="#4B5563" />
            <circle cx="9" cy="32" r="1.5" fill="#4B5563" />
            <circle cx="13" cy="22" r="1.5" fill="#4B5563" />

            {/* Clock Hands pointing at ~10:10 */}
            {/* Hour hand */}
            <line
              x1="26"
              y1="32"
              x2="18"
              y2="23"
              stroke="#312E81"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="dark:stroke-indigo-300"
            />
            {/* Minute hand */}
            <line
              x1="26"
              y1="32"
              x2="37"
              y2="24"
              stroke="#312E81"
              strokeWidth="2"
              strokeLinecap="round"
              className="dark:stroke-indigo-300"
            />
            {/* Center Pin */}
            <circle cx="26" cy="32" r="2.5" fill="#4338CA" />
          </g>
        </svg>
      </div>

      {/* Main Copy matching Turia reference */}
      <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm leading-relaxed">
        {subtitle}
      </p>

      {/* Call to action button */}
      <button
        type="button"
        onClick={onAddTodo}
        className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#5B50E5] hover:bg-[#4E43D8] shadow-sm transition-all active:scale-[0.98] cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
        <span>{buttonLabel}</span>
      </button>
    </div>
  );
};
