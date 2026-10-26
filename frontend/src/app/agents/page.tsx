'use client';

import { Suspense } from 'react';
import AgentList from '@/components/agent-center/AgentList';

export default function AgentsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading Agent Center...</div>}>
      <AgentList />
    </Suspense>
  );
}
