import React from "react";

interface CaIndiaLogoProps {
  className?: string;
  size?: number;
}

export const CaIndiaLogo: React.FC<CaIndiaLogoProps> = ({
  className = "",
  size = 48,
}) => {
  const height = size;
  const width = Math.round(size * 0.95);

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 100 105"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background circle / backing if needed */}
      <g>
        {/* Main 'C' */}
        <path
          d="M 44 26 C 39 18 29 16 20 22 C 10 29 8 46 13 58 C 17 68 28 73 38 71 C 44 69 47 64 47 64 L 41 57 C 41 57 37 62 31 63 C 24 64 18 60 16 52 C 13 42 16 29 23 25 C 29 21 36 23 40 29 Z"
          fill="#004A8F"
        />

        {/* Main 'A' Left & Right Legs */}
        <path
          d="M 42 70 L 48 70 L 62 20 L 55 20 Z"
          fill="#004A8F"
        />
        <path
          d="M 68 70 L 74 70 L 61 20 L 55 20 Z"
          fill="#004A8F"
        />

        {/* Tricolor Wings Swoosh across 'A' */}
        {/* Saffron Swoosh */}
        <path
          d="M 36 41 Q 58 35 84 27 C 82 30 76 33 69 35 Q 52 39 36 41 Z"
          fill="#FF9933"
        />
        {/* White / Mid Band */}
        <path
          d="M 37 43 Q 56 39 80 33 C 78 35 73 38 67 40 Q 51 43 37 43 Z"
          fill="#004A8F"
        />
        {/* Green Swoosh */}
        <path
          d="M 39 45 Q 56 42 76 39 C 74 42 70 45 64 47 Q 50 48 39 45 Z"
          fill="#138808"
        />

        {/* 'INDIA' text */}
        <text
          x="50"
          y="92"
          textAnchor="middle"
          fontSize="17"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="4"
          fill="#004A8F"
        >
          INDIA
        </text>
      </g>
    </svg>
  );
};
