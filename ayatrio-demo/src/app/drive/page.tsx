import { EmptyPagePlaceholder } from "@/components/EmptyPagePlaceholder";

export default function DrivePage() {
  return (
    <EmptyPagePlaceholder
      title="Drive"
      category="Sidebar"
      description="Secure cloud repository for audited financials, tax computations, and client workpapers."
      iconName="HardDrive"
      actionText="Upload Documents"
    />
  );
}
