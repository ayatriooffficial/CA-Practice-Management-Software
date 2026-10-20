import { Metadata } from "next";
import { ClientsModule } from "@/components/clients/ClientsModule";

export const metadata: Metadata = {
  title: "Add Client | Ayatrio CRM",
  description: "Create new client with PromoterMaster, GSTIN lookup, and Customer Files.",
};

export default function NewClientPage() {
  return (
    <div className="w-full min-h-[calc(100vh-var(--header-height))] p-2 bg-white dark:bg-[#0f172a] text-[#111827] dark:text-[#f8fafc] transition-colors">
      <ClientsModule initialMode="create" />
    </div>
  );
}
