import { EmptyPagePlaceholder } from "@/components/EmptyPagePlaceholder";

export default function ToDoPage() {
  return (
    <EmptyPagePlaceholder
      title="To-Do"
      category="Header"
      description="Personal and team checklists for pending verification, checklist items, and follow-ups."
      iconName="CheckSquare"
      actionText="Add New Task"
    />
  );
}
