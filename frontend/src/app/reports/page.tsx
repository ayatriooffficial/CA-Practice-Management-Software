import { EmptyPagePlaceholder } from "@/components/EmptyPagePlaceholder";

export default function ReportsPage() {
  return (
    <EmptyPagePlaceholder
      title="Reports"
      category="Sidebar"
      description="Practice MIS reports, client profitability, staff billing utilization, and aging analysis."
      iconName="BarChart3"
      actionText="Generate MIS Report"
    />
  );
}
