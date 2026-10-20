import { EmptyPagePlaceholder } from "@/components/EmptyPagePlaceholder";

export default function SprintsPage() {
  return (
    <EmptyPagePlaceholder
      title="Sprints"
      category="Header"
      description="Manage recurring audit cycles, monthly GSTR deadlines, and seasonal tax sprints."
      iconName="Layers"
      actionText="Create Sprint"
    />
  );
}
