import { EmptyPagePlaceholder } from "@/components/EmptyPagePlaceholder";

export default function AgentsPage() {
  return (
    <EmptyPagePlaceholder
      title="Agents"
      category="Header"
      description="Autonomous AI agents for notice reconciliation, IT scrutiny drafting, and TDS validation."
      iconName="Zap"
      actionText="Deploy New Agent"
    />
  );
}
