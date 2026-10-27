import { LeadsSkeleton } from "@/components/leads/LeadsSkeleton";

export default function LeadsLoading() {
  return (
    <div className="w-full min-h-[calc(100vh-var(--header-height))] p-2 bg-white dark:bg-[#0f172a] text-[#111827] dark:text-[#f8fafc] transition-colors">
      <LeadsSkeleton />
    </div>
  );
}
