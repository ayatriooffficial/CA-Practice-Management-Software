import { TasksSkeleton } from "@/components/tasks/TasksSkeleton";

export default function TasksLoading() {
  return (
    <div className="w-full min-h-[calc(100vh-var(--header-height))] bg-white dark:bg-[#0f172a] text-[#111827] dark:text-[#f8fafc] transition-colors">
      <TasksSkeleton />
    </div>
  );
}
