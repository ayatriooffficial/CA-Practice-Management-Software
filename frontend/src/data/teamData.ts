export interface TeamMember {
  id: string;
  name: string;
  initials: string;
  email: string;
  phone?: string;
  role: string;
  position: string;
  department: string;
  permissions: string[];
  avatarColor: string;
  active: boolean;
}

export const DEMO_TEAM_MEMBERS: TeamMember[] = [];
