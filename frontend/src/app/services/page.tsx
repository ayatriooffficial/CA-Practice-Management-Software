import { Metadata } from "next";
import { ServicesModule } from "@/components/services/ServicesModule";

export const metadata: Metadata = {
  title: "Services Catalog | Ayatrio CRM",
  description: "Master catalog for practice services, recurring billing templates, SOPs, and pricing schedules.",
};

export default function ServicesPage() {
  return (
    <div className="w-full min-h-[calc(100vh-var(--header-height))]  bg-white dark:bg-[#0f172a] text-[#111827] dark:text-[#f8fafc] transition-colors">
      <ServicesModule />
    </div>
  );
}
