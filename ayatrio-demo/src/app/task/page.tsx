import { EmptyPagePlaceholder } from "@/components/EmptyPagePlaceholder";

export default function TaskPage() {
  return (
    <EmptyPagePlaceholder
      title="Task"
      category="Sidebar"
      description="Work assignments, sub-tasks, stage progression, and team timesheet logs."
      iconName="ClipboardList"
      actionText="Create New Task"
    />
  );
}
