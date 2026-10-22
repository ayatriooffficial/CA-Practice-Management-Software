'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AgentDetail from '@/components/agent-center/AgentDetail';

function AgentDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') || '';

  if (!id) {
    return (
      <div className="p-6">
        <p className="mb-3">Agent ID is missing.</p>
        <Link href="/agents" className="underline">
          Back to Agent Center
        </Link>
      </div>
    );
  }

  return <AgentDetail id={id} />;
}

export default function AgentDetailPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm">Loading agent details...</div>}>
      <AgentDetailContent />
    </Suspense>
  );
}
