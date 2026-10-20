import { EmptyPagePlaceholder } from "@/components/EmptyPagePlaceholder";

export default function RegistryPage() {
  return (
    <EmptyPagePlaceholder
      title="Registry"
      category="Sidebar"
      description="Digital Signature Certificate (DSC) tracker, ROC registers, and statutory master log."
      iconName="LayoutGrid"
      actionText="Register New Entity"
    />
  );
}
