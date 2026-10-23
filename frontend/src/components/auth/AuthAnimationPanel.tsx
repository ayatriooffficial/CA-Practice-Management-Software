"use client";

import React from "react";
import { Mail, Landmark } from "lucide-react";

interface AuthAnimationPanelProps {
  showWelcomeText?: boolean;
  welcomeText?: string;
}

export const AuthAnimationPanel: React.FC<AuthAnimationPanelProps> = ({
  showWelcomeText = true,
  welcomeText = "Welcome to Afaq CA Practice",
}) => {
  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden select-none"
      style={{
        backgroundColor: "#161334",
        backgroundImage: `
          radial-gradient(circle at 50% 38%, rgba(79, 70, 229, 0.18) 0%, rgba(22, 19, 52, 0.85) 60%),
          linear-gradient(to right, rgba(255, 255, 255, 0.035) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255, 255, 255, 0.035) 1px, transparent 1px)
        `,
        backgroundSize: "100% 100%, 36px 36px, 36px 36px",
      }}
      aria-hidden="true"
    >
      {/* Subtle ambient backlights */}
      <div
        className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full pointer-events-none blur-3xl opacity-25"
        style={{ background: "#4f46e5" }}
      />
      <div
        className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full pointer-events-none blur-3xl opacity-20"
        style={{ background: "#3b82f6" }}
      />

      {/* Main Composition */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-[440px] px-6">
        {/* Three Icon Cards Row */}
        <div className="w-full flex items-center justify-between px-2">
          {/* Tile 1: WhatsApp */}
          <div className="flex flex-col items-center group">
            <div
              className="w-13 h-13 rounded-2xl flex items-center justify-center relative transition-transform duration-300 hover:scale-105"
              style={{
                backgroundColor: "rgba(22, 27, 46, 0.85)",
                border: "1.5px solid rgba(37, 211, 102, 0.45)",
                boxShadow: "0 0 20px -2px rgba(37, 211, 102, 0.35)",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                className="w-6 h-6 fill-white"
                aria-label="WhatsApp"
              >
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.28-2.42 5.84a8.18 8.18 0 0 1-5.82 2.41h-.01c-1.47 0-2.91-.39-4.17-1.14l-.3-.18-3.1.81.83-3.02-.2-.31a8.18 8.18 0 0 1-1.26-4.41c0-4.54 3.7-8.24 8.24-8.24zm4.52 11.64c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.26-1.5-1.4-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.87.85-.87 2.08s.89 2.41 1.02 2.58c.13.17 1.76 2.68 4.26 3.76.6.26 1.06.41 1.42.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.12-.22-.19-.47-.32z" />
              </svg>
            </div>
            <span className="mt-2.5 text-xs font-medium tracking-wide text-white/95">
              WhatsApp
            </span>
          </div>

          {/* Tile 2: Email */}
          <div className="flex flex-col items-center group">
            <div
              className="w-13 h-13 rounded-2xl flex items-center justify-center relative transition-transform duration-300 hover:scale-105"
              style={{
                backgroundColor: "rgba(22, 27, 46, 0.85)",
                border: "1.5px solid rgba(59, 130, 246, 0.45)",
                boxShadow: "0 0 20px -2px rgba(59, 130, 246, 0.35)",
              }}
            >
              <Mail className="w-6 h-6 text-white" />
            </div>
            <span className="mt-2.5 text-xs font-medium tracking-wide text-white/95">
              Email
            </span>
          </div>

          {/* Tile 3: Notice */}
          <div className="flex flex-col items-center group">
            <div
              className="w-13 h-13 rounded-2xl flex items-center justify-center relative transition-transform duration-300 hover:scale-105"
              style={{
                backgroundColor: "rgba(22, 27, 46, 0.85)",
                border: "1.5px solid rgba(245, 158, 11, 0.45)",
                boxShadow: "0 0 20px -2px rgba(245, 158, 11, 0.35)",
              }}
            >
              <Landmark className="w-6 h-6 text-white" />
            </div>
            <span className="mt-2.5 text-xs font-medium tracking-wide text-white/95">
              Notice
            </span>
          </div>
        </div>

        {/* Dynamic Circuit Junction & Animated Beams */}
        <div className="w-full relative h-48 -mt-1 pointer-events-none">
          <svg
            className="w-full h-full overflow-visible"
            viewBox="0 0 360 180"
            fill="none"
          >
            <defs>
              {/* Circuit Gradients */}
              <linearGradient id="greenBeam" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.7" />
              </linearGradient>

              <linearGradient id="amberBeam" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#d97706" stopOpacity="0.8" />
              </linearGradient>

              <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>

              <filter id="glowAmber" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>

              <filter id="glowBlue" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Inactive guide paths (faint background lines) */}
            <path
              d="M 38 12 L 38 50 Q 38 72 65 72 L 180 72 L 180 170"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M 322 12 L 322 50 Q 322 72 295 72 L 180 72"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M 180 12 L 180 72"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="2"
              fill="none"
            />

            {/* Active Glowing Traces */}
            {/* Left WhatsApp Green Path */}
            <path
              id="pathGreen"
              d="M 38 10 L 38 48 Q 38 68 62 68 L 180 68"
              stroke="url(#greenBeam)"
              strokeWidth="2.5"
              fill="none"
              filter="url(#glowGreen)"
            />

            {/* Right Notice Amber Path */}
            <path
              id="pathAmber"
              d="M 322 10 L 322 48 Q 322 68 298 68 L 180 68"
              stroke="url(#amberBeam)"
              strokeWidth="2.5"
              fill="none"
              filter="url(#glowAmber)"
            />

            {/* Center Junction to Bottom Trunk Line */}
            <path
              id="pathTrunk"
              d="M 180 68 L 180 170"
              stroke="#f59e0b"
              strokeWidth="3"
              fill="none"
              filter="url(#glowAmber)"
            />

            {/* Small Glowing Junction Orb under Email */}
            <circle
              cx="180"
              cy="18"
              r="4.5"
              fill="#60a5fa"
              filter="url(#glowBlue)"
              className="animate-pulse"
            />

            {/* Junction Orb where all 3 merge */}
            <circle
              cx="180"
              cy="68"
              r="4"
              fill="#fbbf24"
              filter="url(#glowAmber)"
            />

            {/* Traveling Light Pulse on Green Line */}
            <circle r="4.5" fill="#4ade80" filter="url(#glowGreen)">
              <animateMotion
                dur="3s"
                repeatCount="indefinite"
                path="M 38 10 L 38 48 Q 38 68 62 68 L 180 68"
              />
            </circle>

            {/* Traveling Light Pulse on Amber Line */}
            <circle r="4.5" fill="#fde047" filter="url(#glowAmber)">
              <animateMotion
                dur="3s"
                repeatCount="indefinite"
                path="M 322 10 L 322 48 Q 322 68 298 68 L 180 68"
              />
            </circle>

            {/* Traveling Light Pulse on Trunk Line */}
            <circle r="5" fill="#fbbf24" filter="url(#glowAmber)">
              <animateMotion
                dur="2s"
                repeatCount="indefinite"
                path="M 180 68 L 180 170"
                begin="1.5s"
              />
            </circle>
          </svg>
        </div>

        {/* Text 'Welcome to CA Practice' directly below animation with comfortable spacing (36px) */}
        {showWelcomeText && (
          <div className="mt-9 sm:mt-11 w-full text-center transition-all duration-700 animate-fadeIn">
            <h2 className="text-[28px] sm:text-[32px] font-bold tracking-tight text-white leading-tight">
              {welcomeText}
            </h2>
          </div>
        )}
      </div>
    </div>
  );
};
