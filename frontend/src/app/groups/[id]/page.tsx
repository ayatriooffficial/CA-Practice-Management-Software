"use client";

import React, { Suspense } from "react";
import { useParams } from "next/navigation";
import { GroupDetailView } from "@/components/groups/GroupDetailView";

export default function GroupDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  return (
    <Suspense fallback={<div className="p-4 text-xs text-gray-400">Loading group details...</div>}>
      <GroupDetailView groupId={id} />
    </Suspense>
  );
}

