import { ServicesSkeleton } from "@/components/services/ServicesSkeleton";

export default function ServicesLoading() {
  return (
    <div className="w-full min-h-[calc(100vh-var(--header-height))] bg-white dark:bg-[#0f172a] text-[#111827] dark:text-[#f8fafc] transition-colors">
      <ServicesSkeleton />
    </div>
  );
}
