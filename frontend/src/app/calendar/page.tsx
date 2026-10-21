import { EmptyPagePlaceholder } from "@/components/EmptyPagePlaceholder";

export default function CalendarPage() {
  return (
    <EmptyPagePlaceholder
      title="Calendar"
      category="Header"
      description="Practice-wide schedule for client appointments, partner meetings, and court hearings."
      iconName="Calendar"
      actionText="Schedule Event"
    />
  );
}
