import { EmptyPagePlaceholder } from "@/components/EmptyPagePlaceholder";

export default function HomePage() {
  return (
    <EmptyPagePlaceholder
      title="Home"
      category="Sidebar"
      description="Practice dashboard overview — monitor daily tasks, statutory notices, compliance deadlines, and client activities."
      iconName="Home"
      actionText="Customize Dashboard"
      emptyTitle="Welcome to Your Practice Home"
      emptyDescription="Your central dashboard is active. Connect your practice workflows, track pending notices, and monitor client updates right here."
      quickLinks={[
        {
          label: "Notice Management",
          description: "GST, IT & TRACES notice calendar",
          href: "/notices",
          iconName: "FileText",
        },
        {
          label: "Compliance Center",
          description: "Statutory filings & regulatory deadlines",
          href: "/compliance",
          iconName: "ShieldCheck",
        },
        {
          label: "Client Directory",
          description: "Manage client master records & groups",
          href: "/client",
          iconName: "Users",
        },
        {
          label: "Tasks & Sprints",
          description: "Track staff assignments & milestones",
          href: "/task",
          iconName: "ClipboardList",
        },
      ]}
    />
  );
}
