import { Suspense } from "react";
import { Metadata } from "next";
import { ClientsModule } from "@/components/clients/ClientsModule";
import { ClientsSkeleton } from "@/components/clients/ClientsSkeleton";

export const metadata: Metadata = {
  title: "Clients Master Directory | Ayatrio CRM",
  description: "Client master directory, GSTIN autofill, constitution types, recurring compliance services, and KYC.",
};

export default function ClientPage() {
  return (
    <div className="w-full min-h-[calc(100vh-var(--header-height))] p-2 bg-white dark:bg-[#0f172a] text-[#111827] dark:text-[#f8fafc] transition-colors">
      <Suspense fallback={<ClientsSkeleton />}>
        <ClientsModule />
      </Suspense>
    </div>
  );
}
