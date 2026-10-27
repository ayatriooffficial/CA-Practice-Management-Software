import { Metadata } from "next";
import { Suspense } from "react";
import { CreateTaskTemplateForm } from "@/components/tasks/CreateTaskTemplateForm";

export const metadata: Metadata = {
  title: "Create Task Template | Ayatrio CRM",
  description: "Create and configure reusable task templates with SOP checklists and pre-filled parameters.",
};

export default function NewTaskTemplatePage() {
  return (
    <div className="w-full min-h-[calc(100vh-var(--header-height))] p-4 md:p-6 bg-[var(--bg-main)] text-[var(--text-main)] transition-colors flex justify-center items-start pt-4 md:pt-8 pb-12">
      <Suspense fallback={<div className="p-8 text-xs text-center text-[var(--text-subtle)]">Loading template form...</div>}>
        <CreateTaskTemplateForm />
      </Suspense>
    </div>
  );
}
