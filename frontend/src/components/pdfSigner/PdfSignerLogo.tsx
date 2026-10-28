import React from 'react';

interface PdfSignerLogoProps {
  className?: string;
  size?: number;
}

export const PdfSignerLogo: React.FC<PdfSignerLogoProps> = ({
  className = 'w-4 h-4',
  size,
}) => {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="PDF Signer Logo"
      stroke="currentColor"
    >
      {/* Sharp Document Outline */}
      <path
        d="M4 2.5H15L20 7.5V21.5H4V2.5Z"
        strokeWidth="1.8"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      {/* Sharp Corner Fold */}
      <path
        d="M14.5 2.5V8H20"
        strokeWidth="1.8"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      {/* Signature Stylus / Pen Nib */}
      <path
        d="M13.5 12.5L16.5 9.5L18 11L15 14L13 14.5L13.5 12.5Z"
        strokeWidth="1.5"
        strokeLinejoin="miter"
        fill="currentColor"
        fillOpacity="0.18"
      />
      {/* Cryptographic Digital Signature Line */}
      <path
        d="M7 17.5C8.5 16.2 10.5 16.2 12 17.5C13.2 18.5 15 18.5 16.5 17"
        strokeWidth="1.8"
        strokeLinecap="square"
      />
      {/* Document Content Lines */}
      <rect
        x="7"
        y="8"
        width="4.5"
        height="1.6"
        fill="currentColor"
      />
      <rect
        x="7"
        y="11.5"
        width="4"
        height="1.6"
        fill="currentColor"
      />
    </svg>
  );
};
