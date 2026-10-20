import { EmptyPagePlaceholder } from "@/components/EmptyPagePlaceholder";

export default function GroupsPage() {
  return (
    <EmptyPagePlaceholder
      title="Groups"
      category="Sidebar"
      description="Manage conglomerate groups, related party entities, and family businesses under one umbrella."
      iconName="Network"
      actionText="Create Client Group"
    />
  );
}
