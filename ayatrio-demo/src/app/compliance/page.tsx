import { EmptyPagePlaceholder } from "@/components/EmptyPagePlaceholder";

export default function CompliancePage() {
  return (
    <EmptyPagePlaceholder
      title="Compliance"
      category="Header"
      description="Track statutory filings, GST deadlines, and annual compliance status."
      iconName="ShieldCheck"
      actionText="Create Compliance Record"
    />
  );
}
