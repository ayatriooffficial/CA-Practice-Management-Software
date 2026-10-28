'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { KeyRound, FileSignature } from 'lucide-react';

export default function DscLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isSignerActive = pathname.startsWith('/dsc/pdf-signer');
  const isDscActive = !isSignerActive;

  return (
    <div className="w-full min-h-[calc(100vh-var(--header-height))] bg-white dark:bg-[#0f172a] text-[#111827] dark:text-[#f8fafc] transition-colors flex flex-col">
      {/* Top Level Sub-Tabs Header (Mirrors Team section TeamTabsHeader) */}
      <div className="border-b border-[#dde2e8] dark:border-[#334155] bg-white dark:bg-[#1e293b] px-4 sm:px-6 transition-colors shrink-0">
        <div className="flex items-center gap-6 sm:gap-8 overflow-x-auto no-scrollbar">
          {/* Tab 1: DSC */}
          <Link
            href="/dsc"
            className={`flex items-center gap-2 py-3.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              isDscActive
                ? 'border-[#31719B] text-[#31719B] dark:text-[#3D88BF] dark:border-[#3D88BF]'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <KeyRound className={`w-4 h-4 ${isDscActive ? 'text-[#31719B] dark:text-[#3D88BF]' : 'text-gray-400 dark:text-gray-500'}`} />
            <span>DSC</span>
          </Link>

          {/* Tab 2: PDF Signer */}
          <Link
            href="/dsc/pdf-signer"
            className={`flex items-center gap-2 py-3.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              isSignerActive
                ? 'border-[#31719B] text-[#31719B] dark:text-[#3D88BF] dark:border-[#3D88BF]'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <FileSignature className={`w-4 h-4 ${isSignerActive ? 'text-[#31719B] dark:text-[#3D88BF]' : 'text-gray-400 dark:text-gray-500'}`} />
            <span>PDF Signer</span>
          </Link>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 w-full">{children}</div>
    </div>
  );
}
