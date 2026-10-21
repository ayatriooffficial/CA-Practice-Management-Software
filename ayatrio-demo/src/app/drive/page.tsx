import { Metadata } from "next";
import { DriveModule } from "@/components/drive/DriveModule";

export const metadata: Metadata = {
  title: "Google Drive Document Management | Ayatrio Practice ERP",
  description:
    "Secure Google Drive cloud repository with automated file verification, magic-byte inspection, and category folder routing for CA firms.",
};

export default function DrivePage() {
  return (
    <div className="w-full min-h-[calc(100vh-var(--header-height,64px))] p-4 sm:p-6 bg-slate-50 dark:bg-[#0f172a] text-[#111827] dark:text-[#f8fafc] transition-colors">
      <DriveModule />
    </div>
  );
}
