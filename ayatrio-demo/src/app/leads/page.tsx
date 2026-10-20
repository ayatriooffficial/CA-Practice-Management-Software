import { Metadata } from "next";
import { LeadsModule } from "@/components/leads/LeadsModule";

export const metadata: Metadata = {
  title: "Leads Directory | Ayatrio CRM",
  description: "PromoterMaster registry, identity KYC documents, and lead prospect conversion management.",
};

export default function LeadsPage() {
  return (
    <div className="w-full min-h-[calc(100vh-var(--header-height))] p-2 bg-white dark:bg-[#0f172a] text-[#111827] dark:text-[#f8fafc] transition-colors">
      <LeadsModule />
    </div>
  );
}
