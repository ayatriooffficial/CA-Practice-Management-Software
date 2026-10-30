import { Client } from "@/app/workdone/types";
import { useMemo, useState } from "react";
// import type { Client } from "./types";

interface WorkDoneClientProps {
    clients: Client[];
    onSelectClient: (client: Client) => void;
    onRefresh?: () => void;
}

export default function WorkDoneClient({
    clients,
    onSelectClient,
    onRefresh,
}: WorkDoneClientProps) {
    const [search, setSearch] = useState("");

    const filteredClients = useMemo(() => {
        const value = search.toLowerCase().trim();
        if (!value) return clients;
        return clients.filter(
            (client) =>
                client.businessName?.toLowerCase().includes(value) ||
                client.legalName?.toLowerCase().includes(value)
        );
    }, [clients, search]);

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(amount || 0);

    return (
        <div className="w-full space-y-5">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-[var(--text-main)]">
                        Work Done Clients
                    </h2>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                        Select a client to view their service and payment details.
                    </p>
                </div>
                {onRefresh && (
                    <button
                        type="button"
                        onClick={onRefresh}
                        className="rounded-sm border border-[var(--border-main)] px-4 py-2 text-sm font-medium hover:bg-[var(--bg-hover)]"
                    >
                        ↻ Refresh
                    </button>
                )}
            </div>

            {/* Search and count */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by business or legal name..."
                    className="w-full rounded-sm border border-[var(--border-main)] bg-[var(--bg-surface)] px-4 py-2.5 text-sm outline-none focus:border-[var(--primary)] sm:max-w-sm"
                />
                <span className="text-sm text-[var(--text-muted)]">
                    {filteredClients.length} clients
                </span>
            </div>

            {/* Client table */}
            <div className="overflow-x-auto  bg-[var(--bg-surface)]">
                <table className="w-full min-w-[750px]  text-left">
                    <thead className="bg-[var(--orange-havy-light)]">
                        <tr className="border-b border-[var(--border-main)]">
                            <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                                Client
                            </th>
                            <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                                Legal Name
                            </th>
                            <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                                Total Cost
                            </th>
                            <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                                Total Paid
                            </th>
                            <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                                Balance
                            </th>
                            <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                                Action
                            </th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-[var(--border-subtle)]">
                        {filteredClients.map((client) => {
                            const balance = (client.totalCost || 0) - (client.totalPaid || 0);
                            return (
                                <tr
                                    key={client.clientId}
                                    onClick={() => onSelectClient(client)}
                                    className="cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
                                >
                                    <td className="px-5 py-4">
                                        <div className="font-medium text-[var(--text-main)]">
                                            {client.businessName || "Unknown Client"}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-sm text-[var(--text-muted)]">
                                        {client.legalName || "—"}
                                    </td>
                                    <td className="px-5 py-4 text-right text-sm font-medium text-[var(--text-main)]">
                                        {formatCurrency(client.totalCost)}
                                    </td>
                                    <td className="px-5 py-4 text-right text-sm font-medium text-green-700">
                                        {formatCurrency(client.totalPaid)}
                                    </td>
                                    <td className="px-5 py-4 text-right text-sm font-medium">
                                        <span
                                            className={balance > 0 ? "text-red-600" : "text-green-700"}
                                        >
                                            {formatCurrency(balance)}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelectClient(client);
                                            }}
                                            className="rounded-sm bg-[var(--primary-light)] px-3 py-2 text-sm font-medium text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white"
                                        >
                                            View Details →
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}

                        {filteredClients.length === 0 && (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="px-5 py-12 text-center text-sm text-[var(--text-muted)]"
                                >
                                    No clients found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
