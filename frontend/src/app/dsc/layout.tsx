import React from 'react';

export default function DscLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full min-h-[calc(100vh-var(--header-height))] bg-white dark:bg-[#0f172a] text-[#111827] dark:text-[#f8fafc] transition-colors flex flex-col">
      <div className="flex-1 w-full">{children}</div>
    </div>
  );
}
