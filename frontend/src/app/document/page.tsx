import { Metadata } from "next";
import { DocumentsModule } from "@/components/documents/DocumentsModule";

export const metadata: Metadata = {
  title: "Documents Master Directory | Ayatrio Practice ERP",
  description:
    "Live database-connected document management, client and staff directory, and compliance records for CA practices.",
};

export default function DocumentPage() {
  return (
    <div className="w-full min-h-[calc(100vh-var(--header-height,64px))] p-4 sm:p-6 bg-slate-50 dark:bg-[#0f172a] text-[#111827] dark:text-[#f8fafc] transition-colors">
      <DocumentsModule />
    </div>
  );
}
