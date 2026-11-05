import { Metadata } from "next";
import { GroupListView } from "@/components/groups/GroupListView";

export const metadata: Metadata = {
  title: "Client Groups | Ayatrio CRM",
  description: "Manage conglomerate groups, related party entities, and family businesses under one umbrella.",
};

export default function GroupsPage() {
  return <GroupListView />;
}
