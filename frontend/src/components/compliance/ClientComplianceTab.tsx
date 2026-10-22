"use client";

import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { Client as CrmClient } from "@/data/crmData";
import { useComplianceCategories } from "@/hooks/useCompliance";
import { ComplianceGrid } from "./ComplianceGrid";
import { FREQUENCY_OPTIONS, type FrequencyKey } from "./ComplianceShell";

interface ClientComplianceTabProps {
  client: CrmClient;
}

export const ClientComplianceTab: React.FC<ClientComplianceTabProps> = ({ client }) => {
  const { categories, loading } = useComplianceCategories();
  const [selectedCatId, setSelectedCatId] = useState<string>("cat-gst");
  const [selectedFrequency, setSelectedFrequency] = useState<FrequencyKey>("all");
  const [fyStartYear, setFyStartYear] = useState<number>(2025);

  const activeCategory = useMemo(() => {
    return categories.find((c) => c.id === selectedCatId) || categories[0];
  }, [categories, selectedCatId]);

  const fyEndYearShort = String(fyStartYear + 1).slice(-2);
  const currentFyLabel = `${fyStartYear}-${fyEndYearShort}`;

  const effectiveCatId = activeCategory?.id || "cat-gst";

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Top Controls Card */}
      <div
        className="p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border-main)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--text-inverse)",
            }}
          >
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
              Compliance Record — {client.name}
            </h3>
            <p className="text-xs font-medium" style={{ color: "var(--text-subtle)" }}>
              Statutory return tracking & period filings for this client
            </p>
          </div>
        </div>

        {/* FY Selector & Frequency Pills */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* FY */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFyStartYear((y) => y - 1)}
              className="p-1 rounded border hover:opacity-70 transition-colors cursor-pointer"
              style={{ borderColor: "var(--border-main)", color: "var(--text-subtle)" }}
              aria-label="Previous Financial Year"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span
              className="px-2.5 py-1 text-xs font-semibold rounded border"
              style={{ borderColor: "var(--border-main)", color: "var(--text-main)" }}
            >
              FY {currentFyLabel}
            </span>
            <button
              type="button"
              onClick={() => setFyStartYear((y) => y + 1)}
              className="p-1 rounded border hover:opacity-70 transition-colors cursor-pointer"
              style={{ borderColor: "var(--border-main)", color: "var(--text-subtle)" }}
              aria-label="Next Financial Year"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Frequency */}
          <div className="flex items-center gap-1">
            {FREQUENCY_OPTIONS.map((f) => {
              const isSelected = selectedFrequency === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setSelectedFrequency(f.key)}
                  className="px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer"
                  style={{
                    backgroundColor: isSelected ? "var(--primary)" : "var(--bg-surface)",
                    color: isSelected ? "var(--text-inverse)" : "var(--text-muted)",
                    border: "1px solid",
                    borderColor: isSelected ? "var(--primary)" : "var(--border-main)",
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Categories Bar */}
      {categories.length > 0 && (
        <div
          className="flex items-center gap-2 p-1.5 rounded-lg border overflow-x-auto text-xs font-semibold"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-main)",
          }}
        >
          {categories.map((cat) => {
            const isSelected = effectiveCatId === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCatId(cat.id)}
                className="px-3 py-1.5 rounded-md transition-all cursor-pointer whitespace-nowrap"
                style={{
                  backgroundColor: isSelected ? "var(--bg-active)" : "transparent",
                  color: isSelected ? "var(--primary)" : "var(--text-muted)",
                }}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Grid Scoped to Client */}
      <ComplianceGrid
        categoryId={effectiveCatId}
        fy={currentFyLabel}
        frequency={selectedFrequency}
        portal={activeCategory?.portal}
        isAuto={activeCategory?.mode === "auto"}
        clientId={client.id}
      />
    </div>
  );
};
