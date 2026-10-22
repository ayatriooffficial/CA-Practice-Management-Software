'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AgentForm from '@/components/agent-center/AgentForm';
import type { AgentModule } from '@/types/agentCenter';

function NewAgentContent() {
  const searchParams = useSearchParams();
  const rawModule = searchParams.get('module');

  const initialModule: AgentModule =
    rawModule === 'DSC' ||
    rawModule === 'License' ||
    rawModule === 'Task'
      ? rawModule
      : 'Task';

  return <AgentForm initialModule={initialModule} />;
}

export default function NewAgentPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm">Loading agent form...</div>}>
      <NewAgentContent />
    </Suspense>
  );
}
