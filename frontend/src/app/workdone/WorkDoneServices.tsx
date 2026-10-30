"use client";

import React, { useMemo, useState } from "react";
import type {
  Client,
  SelectedPeriod,
  WorkDoneService as Service,
  WorkDoneFrequency,
  WorkDonePeriod,
} from "./types";

interface Props {
  client: Client;
  onBack: () => void;
}

const FY_START = 2026;

const months = [
  { name: "Apr", year: FY_START, key: "04" },
  { name: "May", year: FY_START, key: "05" },
  { name: "Jun", year: FY_START, key: "06" },
  { name: "Jul", year: FY_START, key: "07" },
  { name: "Aug", year: FY_START, key: "08" },
  { name: "Sep", year: FY_START, key: "09" },
  { name: "Oct", year: FY_START, key: "10" },
  { name: "Nov", year: FY_START, key: "11" },
  { name: "Dec", year: FY_START, key: "12" },
  { name: "Jan", year: FY_START + 1, key: "01" },
  { name: "Feb", year: FY_START + 1, key: "02" },
  { name: "Mar", year: FY_START + 1, key: "03" },
];

const quarters = [
  { name: "Q1", start: 0, span: 3, label: "Apr – Jun" },
  { name: "Q2", start: 3, span: 3, label: "Jul – Sep" },
  { name: "Q3", start: 6, span: 3, label: "Oct – Dec" },
  { name: "Q4", start: 9, span: 3, label: "Jan – Mar" },
];

const halves = [
  { name: "H1", start: 0, span: 6, label: "Apr – Sep" },
  { name: "H2", start: 6, span: 6, label: "Oct – Mar" },
];

const frequencyColors: Record<string, React.CSSProperties> = {
  MONTHLY: {
    background: "#eaf2f8",
    borderColor: "#c2daf0",
  },
  QUARTERLY: {
    background: "#f1edfb",
    borderColor: "#d9cef2",
  },
  HALF_YEARLY: {
    background: "#fef7e8",
    borderColor: "#f5dfad",
  },
  YEARLY: {
    background: "#e9f6ef",
    borderColor: "#c5e7d1",
  },
  ONE_TIME: {
    background: "#f3f4f6",
    borderColor: "#d1d5db",
  },
};

const currency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

function normalizeFrequency(value: string): WorkDoneFrequency {
  const frequency = value.toUpperCase().replace(/[- ]/g, "_");

  if (frequency === "QUARTERLY") return "QUARTERLY";
  if (frequency === "HALF_YEARLY") return "HALF_YEARLY";
  if (frequency === "YEARLY" || frequency === "ANNUAL") return "YEARLY";
  if (frequency === "MONTHLY") return "MONTHLY";

  return "ONE_TIME";
}

function getMonthKey(date?: string | Date) {
  if (!date) return "";

  const parsed = new Date(date);

  if (isNaN(parsed.getTime())) return "";

  return `${parsed.getUTCFullYear()}-${String(
    parsed.getUTCMonth() + 1,
  ).padStart(2, "0")}`;
}
function getPeriods(frequency: WorkDoneFrequency): WorkDonePeriod[] {
  if (frequency === "QUARTERLY") {
    return quarters.map((period) => ({
      ...period,
      label: period.name,
    }));
  }

  if (frequency === "HALF_YEARLY") {
    return halves.map((period) => ({
      ...period,
      label: period.name,
    }));
  }

  if (frequency === "YEARLY") {
    return [
      {
        name: "FY",
        label: "Financial Year",
        start: 0,
        span: 12,
      },
    ];
  }

  return months.map((month, index) => ({
    name: `${month.name} ${month.year}`,
    label: `${month.name} ${month.year}`,
    start: index,
    span: 1,
  }));
}

export default function WorkDoneServices({ client, onBack }: Props) {
  const [selectedPeriod, setSelectedPeriod] = useState<SelectedPeriod | null>(
    null,
  );

  const groupedServices = useMemo(() => {
    const groups = new Map<string, Service[]>();

    client.services.forEach((service) => {
      const key = `${service.serviceName}__${service.frequency}`;
      const existing = groups.get(key) || [];

      groups.set(key, [...existing, service]);
    });

    return Array.from(groups.entries());
  }, [client.services]);

  const getPeriodReceipts = (services: Service[], period: WorkDonePeriod) => {
    const keys = Array.from({ length: period.span }, (_, index) => {
      const month = months[period.start + index];
      return `${month.year}-${month.key}`;
    });

    return services.filter((service) =>
      keys.includes(getMonthKey(service.paymentDate)),
    );
  };

  const calculateTotals = (receipts: Service[]) => ({
    cost: receipts.reduce((total, item) => total + item.cost, 0),
    paid: receipts.reduce((total, item) => total + item.paid, 0),
    due: receipts.reduce((total, item) => total + item.cost - item.paid, 0),
  });

  const formatDate = (date?: string | Date) => {
    if (!date) return "-";

    const parsed = new Date(date);

    if (isNaN(parsed.getTime())) return "-";

    return parsed.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  };

  const openReceiptModal = (
    serviceName: string,
    frequency: string,
    periodLabel: string,
    receipts: Service[],
  ) => {
    if (!receipts.length) return;

    // console.log(receipts);
    

    const firstReceipt = receipts[0];

    setSelectedPeriod({
      serviceName,
      frequency,
      periodLabel,
      receipts,

      governmentFee: Number(firstReceipt.governmentFee || 0),
      professionalFee: Number(firstReceipt.professionalFee || 0),
      tax: firstReceipt.tax || "0%",
      gstAmount: Number(firstReceipt.gstAmount || 0),
      totalServiceFee: Number(firstReceipt.totalServiceFee || 0),
      total: Number(
        firstReceipt.invoiceCost ??
          firstReceipt.total ??
          firstReceipt.cost ??
          0,
      ),
    });
  };

  const modalTotals = selectedPeriod
    ? calculateTotals(selectedPeriod.receipts)
    : null;

  return (
    <div className="w-full space-y-5" style={{ color: "var(--text-main)" }}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            onClick={onBack}
            className="mb-3 text-sm font-semibold"
            style={{ color: "var(--primary)" }}
          >
            ← Back to Clients
          </button>

          <h2 className="text-xl font-bold">{client.businessName}</h2>

          <p className="mt-1 text-xs" style={{ color: "var(--text-subtle)" }}>
            Payment and service history · FY {FY_START}-{FY_START + 1}
          </p>
        </div>

        <div className="flex flex-wrap gap-4">
          <div>
            <p className="text-xs text-gray-500">Total Cost </p>
            <p className="text-sm font-bold">{currency(client.totalCost)}</p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Total Paid</p>
            <p
              className="text-sm font-bold"
              style={{ color: "var(--badge-new-text)" }}
            >
              {currency(client.totalPaid)}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Outstanding</p>
            <p className="text-sm font-bold text-red-600">
              {currency(client.totalCost - client.totalPaid)}
            </p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div
        className="flex flex-wrap gap-4 rounded-lg border p-3"
        style={{
          background: "var(--bg-surface)",
          borderColor: "var(--border-main)",
        }}
      >
        {[
          ["MONTHLY", "Monthly"],
          ["QUARTERLY", "Quarterly"],
          ["HALF_YEARLY", "Half-Yearly"],
          ["YEARLY", "Yearly"],
          ["ONE_TIME", "One Time"],
        ].map(([key, label]) => (
          <div key={key} className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-sm border"
              style={frequencyColors[key]}
            />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Payment Grid */}
      <div
        className="w-full overflow-auto "
        style={{
          borderColor: "var(--border-main)",
          background: "var(--bg-surface)",
        }}
      >
        <table className="w-full min-w-[1500px]  text-left">
          <thead>
            <tr style={{ background: "var(--orange-havy-light)" }}>
              <th
                rowSpan={2}
                className="sticky left-0 z-20 min-w-[260px] border-b border-r px-4 py-3 text-xs font-bold"
                style={{
                  background: "var(--orange-havy-light)",
                  borderColor: "var(--border-main)",
                }}
              >
                Service Name
              </th>

              <th
                rowSpan={2}
                className="min-w-[110px] border-b border-r px-3 py-3 text-center text-xs font-bold"
                style={{ borderColor: "var(--border-main)" }}
              >
                Frequency
              </th>

              {quarters.map((quarter) => (
                <th
                  key={quarter.name}
                  colSpan={3}
                  className="border-b border-r px-3 py-2 text-center text-xs font-bold"
                  style={{
                    borderColor: "var(--border-main)",
                    color: "var(--primary)",
                  }}
                >
                  {quarter.name}
                  <p
                    className="mt-1 text-[10px] font-normal"
                    style={{ color: "var(--text-subtle)" }}
                  >
                    {quarter.label}
                  </p>
                </th>
              ))}
            </tr>

            <tr style={{ background: "var(--bg-muted)" }}>
              {months.map((month) => (
                <th
                  key={`${month.year}-${month.key}`}
                  className="min-w-[130px] border-b border-r px-3 py-3 text-center text-xs font-semibold"
                  style={{
                    borderColor: "var(--border-main)",
                    color: "var(--text-muted)",
                  }}
                >
                  {month.name} {month.year}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {groupedServices.map(([groupKey, services]) => {
              const frequency = normalizeFrequency(services[0].frequency);

              const periods = getPeriods(frequency);
              const color = frequencyColors[frequency];

              return (
                <tr key={groupKey}>
                  <td
                    className="sticky left-0 z-10 border-b border-r px-4 py-4 align-middle"
                    style={{
                      background: "var(--bg-surface)",
                      borderColor: "var(--border-main)",
                    }}
                  >
                    <p className="text-xs font-semibold">
                      {services[0].serviceName}
                    </p>

                    {/* <p
                      className="mt-1 text-[10px]"
                      style={{ color: "var(--text-subtle)" }}
                    >
                      {services.length} receipt(s)
                    </p> */}
                  </td>

                  <td
                    className="border-b border-r px-3 py-3 text-center"
                    style={{ borderColor: "var(--border-main)" }}
                  >
                    <span
                      className="rounded-md border px-2 py-1 text-[10px] font-semibold"
                      style={{
                        ...color,
                        color: "var(--text-main)",
                      }}
                    >
                      {services[0].frequency}
                    </span>
                  </td>

                  {periods.map((period) => {
                    const receipts = getPeriodReceipts(services, period);

                    const totals = calculateTotals(receipts);

                    return (
                      <td
                        key={period.label}
                        colSpan={period.span}
                        className="border-b border-r p-2 align-middle"
                        style={{
                          ...color,
                          borderColor: "var(--border-main)",
                        }}
                      >
                        <button
                          type="button"
                          disabled={!receipts.length}
                          onClick={() =>
                            openReceiptModal(
                              services[0].serviceName,
                              services[0].frequency,
                              period.label,
                              receipts,
                            )
                          }
                          className="w-full rounded-lg border p-3 text-left transition"
                          style={{
                            background: "rgba(255,255,255,0.7)",
                            borderColor: "rgba(49,113,155,0.15)",
                            cursor: receipts.length ? "pointer" : "default",
                            opacity: receipts.length ? 1 : 0.55,
                          }}
                        >
                          <div className="space-y-2">
                            <div className="flex justify-between gap-2">
                              <span className="text-[10px] text-gray-500">
                                Cost
                              </span>
                              <span className="text-xs font-bold">
                                {currency(totals.cost)}
                              </span>
                            </div>

                            <div className="flex justify-between gap-2">
                              <span className="text-[10px] text-gray-500">
                                Paid
                              </span>
                              <span
                                className="text-xs font-bold"
                                style={{
                                  color: "var(--badge-new-text)",
                                }}
                              >
                                {currency(totals.paid)}
                              </span>
                            </div>

                            <div className="flex justify-between gap-2 border-t border-gray-200 pt-2">
                              <span className="text-[10px] text-gray-500">
                                Due
                              </span>
                              <span className="text-xs font-bold text-red-600">
                                {currency(totals.due)}
                              </span>
                            </div>

                            {receipts.length > 0 && (
                              <div
                                className="flex justify-between border-t pt-2 text-[10px]"
                                style={{
                                  borderColor: "var(--border-main)",
                                  color: "var(--primary)",
                                }}
                              >
                                <span>{receipts.length} receipt(s)</span>
                                <span className="font-semibold">
                                  View Details →
                                </span>
                              </div>
                            )}
                          </div>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Receipt Modal */}
      {selectedPeriod && modalTotals && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedPeriod(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="receipt-title"
            className="w-full max-w-4xl overflow-hidden rounded-xl shadow-2xl"
            style={{ background: "var(--bg-surface)" }}
          >
            {/* Modal Header */}
            <div
              className="flex items-start justify-between border-b p-5"
              style={{ borderColor: "var(--border-main)" }}
            >
              <div>
                <h3 id="receipt-title" className="text-lg font-bold">
                  Receipt Details
                </h3>

                <p
                  className="mt-1 text-xs"
                  style={{ color: "var(--text-subtle)" }}
                >
                  {selectedPeriod.serviceName}
                </p>

                <p
                  className="mt-1 text-xs font-semibold"
                  style={{ color: "var(--primary)" }}
                >
                  {selectedPeriod.periodLabel} · {selectedPeriod.frequency}
                </p>

                
              </div>

              <button
                onClick={() => setSelectedPeriod(null)}
                className="rounded-lg px-3 py-1 text-xl hover:bg-gray-100"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            {/* Modal Summary */}
            <div
              className="grid grid-cols-1 gap-3 border-b p-4 sm:grid-cols-3"
              style={{
                background: "var(--bg-muted)",
                borderColor: "var(--border-main)",
              }}
            >
              {[
                ["Total Cost", modalTotals.cost, "var(--text-main)"],
                ["Total Paid", modalTotals.paid, "var(--badge-new-text)"],
                ["Outstanding", modalTotals.due, "#dc2626"],
              ].map(([label, value, color]) => (
                <div
  key={String(label)}
  className={`rounded-lg border p-3 ${
    label === "Total Cost" ? "flex flex-col" : ""
  }`}
  style={{
    background: "var(--bg-surface)",
    borderColor: "var(--border-main)",
  }}
>
  <p
    className="text-[10px]"
    style={{ color: "var(--text-subtle)" }}
  >
    {label}
  </p>

  {label === "Total Cost" && (
    <div
      className="mt-2 mb-1 space-y-1 text-[11px]"
      style={{ color: "var(--text-muted)" }}
    >
      <div className="flex justify-between gap-2">
        <span>Government Fee</span>
        <span>{currency(selectedPeriod.governmentFee)}</span>
      </div>

      <div className="flex justify-between gap-2">
        <span>Professional Fee</span>
        <span>{currency(selectedPeriod.professionalFee)}</span>
      </div>

      <div className="flex justify-between gap-2">
        <span>GST ({selectedPeriod.tax})</span>
        <span>{currency(selectedPeriod.gstAmount)}</span>
      </div>

      <div
        className="flex justify-between gap-2 border-t pt-1 font-semibold"
        style={{ borderColor: "var(--border-main)" }}
      >
        <span>Total</span>
        <span>{currency(Number(value))}</span>
      </div>
    </div>
  )}

  <p
    className="mt-1 text-base font-bold"
    style={{ color: String(color) }}
  >
    {currency(Number(value))}
  </p>
</div>
              ))}
            </div>

            {/* Receipt Table */}
            <div className="max-h-[45vh] overflow-auto p-4">
              <table className="w-full min-w-[650px] text-left">
                <thead
                  className="sticky top-0"
                  style={{ background: "var(--orange-havy-light)" }}
                >
                  <tr>
                    {[
                      "Receipt No.",
                      "Invoice No.",
                      "Payment Date",
                      "Cost",
                      "Paid",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="border-b px-3 py-3 text-xs font-semibold"
                        style={{
                          borderColor: "var(--border-main)",
                          color: "var(--text-muted)",
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {selectedPeriod.receipts.map((receipt) => (
                    <tr
                      key={receipt.receiptNo}
                      className="border-b"
                      style={{ borderColor: "var(--border-main)" }}
                    >
                      <td
                        className="px-3 py-3 text-xs font-semibold"
                        style={{ color: "var(--primary)" }}
                      >
                        {receipt.receiptNo}
                      </td>

                      <td className="px-3 py-3 text-xs">
                        {receipt.invoiceNumber}
                      </td>

                      <td className="px-3 py-3 text-xs">
                        {formatDate(receipt.paymentDate)}
                      </td>

                      <td className="px-3 py-3 text-xs font-semibold">
                        {currency(receipt.invoiceCost ?? receipt.cost)}
                      </td>

                      <td
                        className="px-3 py-3 text-xs font-bold"
                        style={{ color: "var(--badge-new-text)" }}
                      >
                        {currency(receipt.paid)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              className="flex items-center justify-between border-t p-4"
              style={{ borderColor: "var(--border-main)" }}
            >
              <span className="text-xs" style={{ color: "var(--text-subtle)" }}>
                {selectedPeriod.receipts.length} receipt(s)
              </span>

              <button
                onClick={() => setSelectedPeriod(null)}
                className="rounded-lg px-5 py-2 text-sm font-semibold"
                style={{
                  color: "var(--text-inverse)",
                  background: "var(--primary)",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
