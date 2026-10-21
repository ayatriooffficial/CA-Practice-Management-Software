import React from "react";
import { TaskViewClient } from "./TaskViewClient";

export function generateStaticParams() {
  return [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "default" }];
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TaskDetailPage({ params }: PageProps) {
  const resolvedParams = await params;

  return <TaskViewClient taskId={resolvedParams.id} />;
}
