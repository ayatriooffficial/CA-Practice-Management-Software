import { EmptyPagePlaceholder } from "@/components/EmptyPagePlaceholder";

export default function ProposalPage() {
  return (
    <EmptyPagePlaceholder
      title="Proposal"
      category="Sidebar"
      description="Draft and manage client engagement proposals, fee quotation letters, and contracts."
      iconName="FileText"
      actionText="Create Proposal"
    />
  );
}
