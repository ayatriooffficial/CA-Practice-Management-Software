import { EmptyPagePlaceholder } from "@/components/EmptyPagePlaceholder";

export default function EmailPage() {
  return (
    <EmptyPagePlaceholder
      title="Email"
      category="Header"
      description="Send bulk tax updates, engagement letters, and client notice digests."
      iconName="Mail"
      actionText="Compose Email"
    />
  );
}
