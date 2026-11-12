'use client';

import { Suspense } from 'react';
import { TeamModule } from '@/components/team/TeamModule';

export default function TeamPage() {
  return (
    <div className="w-full min-h-[calc(100vh-var(--header-height))] p-2 bg-white dark:bg-[#0f172a] text-[#111827] dark:text-[#f8fafc] transition-colors">
      <Suspense fallback={<div className="p-4 text-xs text-gray-400">Loading team...</div>}>
        <TeamModule />
      </Suspense>
    </div>
  );
}
