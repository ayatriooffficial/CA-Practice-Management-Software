import { Metadata } from "next";
import { CreateTaskTemplateForm } from "@/components/tasks/CreateTaskTemplateForm";

export const metadata: Metadata = {
  title: "Create Task Template | Ayatrio CRM",
  description: "Create and configure reusable task templates with SOP checklists and pre-filled parameters.",
};

export default function NewTaskTemplatePage() {
  return (
    <div className="w-full min-h-[calc(100vh-var(--header-height))] p-4 md:p-6 bg-[var(--bg-main)] text-[var(--text-main)] transition-colors flex justify-center items-start pt-4 md:pt-8 pb-12">
      <CreateTaskTemplateForm />
    </div>
  );
}
