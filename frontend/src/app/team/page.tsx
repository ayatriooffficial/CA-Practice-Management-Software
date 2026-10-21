"use client";

import React, { useState } from "react";
import { Users, Mail, Phone, ShieldCheck, UserCheck } from "lucide-react";
import { DEMO_TEAM_MEMBERS } from "@/data/teamData";

export default function TeamPage() {
  const [team] = useState(DEMO_TEAM_MEMBERS);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-main)] pb-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-main)] flex items-center space-x-2">
            <Users className="w-5 h-5" style={{ color: "var(--primary)" }} />
            <span>Team Members ({team.length})</span>
          </h1>
          <p className="text-xs text-[var(--text-subtle)] mt-0.5">
            Admin: <strong>Dipak Sahani</strong> • Practice roles, positions, and operational task permissions
          </p>
        </div>
      </div>

      {/* Grid of Team Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
        {team.map((member) => (
          <div
            key={member.id}
            className="p-4 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] hover:shadow-xs transition-all space-y-3"
          >
            <div className="flex items-center space-x-3">
              <span
                style={{
                  backgroundColor: member.avatarColor ? `${member.avatarColor}18` : "var(--brand-soft)",
                  color: member.avatarColor || "var(--primary)",
                }}
                className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border border-current/20"
              >
                {member.initials}
              </span>
              <div className="truncate">
                <h3 className="text-sm font-semibold text-[var(--text-main)] truncate">
                  {member.name}
                </h3>
                <span className="text-[11px] font-medium text-[var(--text-subtle)] block truncate">
                  {member.position}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1.5 text-xs text-[var(--text-muted)]">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--text-subtle)]">Role</span>
                <span
                  className="font-semibold px-2 py-0.5 rounded text-[10px]"
                  style={{
                    backgroundColor: "var(--brand-soft)",
                    color: "var(--primary)",
                  }}
                >
                  {member.role}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--text-subtle)]">Department</span>
                <span className="font-medium text-[var(--text-main)]">
                  {member.department}
                </span>
              </div>
              <div className="flex items-center space-x-1.5 text-[11px] text-[var(--text-subtle)] truncate pt-1">
                <Mail className="w-3 h-3 shrink-0" />
                <span className="truncate">{member.email}</span>
              </div>
            </div>

            {/* Permissions */}
            <div className="pt-2 border-t border-[var(--border-subtle)]">
              <span className="text-[10px] uppercase font-bold text-[var(--text-subtle)] block mb-1">
                Permissions
              </span>
              <div className="flex flex-wrap gap-1">
                {member.permissions.slice(0, 3).map((perm) => (
                  <span
                    key={perm}
                    className="px-1.5 py-0.5 rounded text-[9.5px] bg-[var(--bg-subtle)] text-[var(--text-muted)] border border-[var(--border-subtle)]"
                  >
                    {perm}
                  </span>
                ))}
                {member.permissions.length > 3 && (
                  <span className="text-[9.5px] text-[var(--text-subtle)] self-center">
                    +{member.permissions.length - 3}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
