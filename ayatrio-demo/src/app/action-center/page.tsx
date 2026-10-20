import { EmptyPagePlaceholder } from "@/components/EmptyPagePlaceholder";

export default function ActionCenterPage() {
  return (
    <EmptyPagePlaceholder
      title="Action-Center"
      category="Header"
      description="Consolidated notifications, sign-off requests, and high-priority action items."
      iconName="Send"
      actionText="Take Action"
    />
  );
}
