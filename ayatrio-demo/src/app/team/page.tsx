import { EmptyPagePlaceholder } from "@/components/EmptyPagePlaceholder";

export default function TeamPage() {
  return (
    <EmptyPagePlaceholder
      title="Team"
      category="Sidebar"
      description="Staff members, article assistants, partner authorizations, and attendance."
      iconName="UsersRound"
      actionText="Invite Team Member"
    />
  );
}
