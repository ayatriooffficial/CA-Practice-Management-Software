"use client";

import React from "react";
import { useParams } from "next/navigation";
import { GroupDetailView } from "@/components/groups/GroupDetailView";

export default function GroupDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  return <GroupDetailView groupId={id} />;
}

