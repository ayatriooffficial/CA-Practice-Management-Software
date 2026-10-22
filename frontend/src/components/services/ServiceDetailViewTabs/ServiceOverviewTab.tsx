"use client";

import React from "react";
import { Service } from "@/data/serviceData";

interface ServiceOverviewTabProps {
  service: Service;
}

export const ServiceOverviewTab: React.FC<ServiceOverviewTabProps> = ({ service }) => {
  return (
    <div className="gap-y-4">
      <h3 className="text-base font-bold text-[var(--text-main)]">
        Service Master Overview
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
        <div className="p-4 rounded-xl border border-[var(--border-main)] bg-[var(--bg-subtle)] gap-y-1">
          <span className="text-[11px] font-medium text-[var(--text-subtle)]">Service Name</span>
          <span className="text-sm font-bold text-[var(--text-main)] block">{service.name}</span>
        </div>

        <div className="p-4 rounded-xl border border-[var(--border-main)] bg-[var(--bg-subtle)] gap-y-1">
          <span className="text-[11px] font-medium text-[var(--text-subtle)]">SAC / HSN Code</span>
          <span className="text-sm font-bold text-[var(--text-main)] block">{service.sacCode || "998231"}</span>
        </div>

        <div className="p-4 rounded-xl border border-[var(--border-main)] bg-[var(--bg-subtle)] gap-y-1">
          <span className="text-[11px] font-medium text-[var(--text-subtle)]">Difficulty Level</span>
          <span className="text-sm font-bold text-[var(--text-main)] block">{service.difficulty || "Medium"}</span>
        </div>

        <div className="p-4 rounded-xl border border-[var(--border-main)] bg-[var(--bg-subtle)] gap-y-1">
          <span className="text-[11px] font-medium text-[var(--text-subtle)]">Professional Fee</span>
          <span className="text-sm font-bold text-[var(--text-main)] block">₹ {service.professionalFee || 0}</span>
        </div>

        <div className="p-4 rounded-xl border border-[var(--border-main)] bg-[var(--bg-subtle)] gap-y-1">
          <span className="text-[11px] font-medium text-[var(--text-subtle)]">Tax Rate</span>
          <span className="text-sm font-bold text-[var(--text-main)] block">{service.taxRate || "18%"}</span>
        </div>

        <div className="p-4 rounded-xl border border-[var(--border-main)] bg-[var(--bg-subtle)] gap-y-1">
          <span className="text-[11px] font-medium text-[var(--text-subtle)]">Out of Pocket Budget</span>
          <span className="text-sm font-bold text-[var(--text-main)] block">₹ {service.maxOopBudget || 0}</span>
        </div>
      </div>

      <div className="p-4 rounded-xl border border-[var(--border-main)] bg-[var(--bg-subtle)] mt-4">
        <span className="text-[11px] font-medium text-[var(--text-subtle)]">Description</span>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed mt-1">
          {service.description || "No description provided."}
        </p>
      </div>
    </div>
  );
};
