import { LucideIcon } from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: {
    text: string;
    variant: "addon" | "new" | "count";
  };
}

export interface SidebarItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
}
