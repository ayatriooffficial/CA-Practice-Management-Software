"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Client } from "@/data/crmData";
import { clientApi } from "@/services/clientApi";
import { ClientDetailView } from "@/components/clients/ClientDetailView";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    clientApi
      .getClientById(id)
      .then((res) => {
        if (!isMounted) return;
        if (res && res.data) {
          setClient(res.data);
        } else {
          setError("Client not found.");
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || "Failed to load client details.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="w-full min-h-[calc(100vh-var(--header-height))] flex flex-col items-center justify-center p-8 bg-white dark:bg-[#0f172a] text-gray-700 dark:text-gray-300">
        <Loader2 className="w-8 h-8 animate-spin text-[#31719B] mb-3" />
        <p className="text-sm font-medium">Loading client profile...</p>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="w-full min-h-[calc(100vh-var(--header-height))] flex flex-col items-center justify-center p-8 bg-white dark:bg-[#0f172a] text-gray-700 dark:text-gray-300">
        <div className="max-w-md w-full bg-white dark:bg-[#1e293b] p-6 rounded-xl border border-[#dde2e8] dark:border-[#334155] text-center shadow-card space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Client Not Found</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {error || "The requested client record does not exist or has been removed."}
            </p>
          </div>
          <Link
            href="/client"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all shadow-xs"
            style={{ backgroundColor: "var(--premium-blue-dark, #31719B)" }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Client Directory</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[calc(100vh-var(--header-height))] p-2 bg-white dark:bg-[#0f172a] text-[#111827] dark:text-[#f8fafc] transition-colors">
      <ClientDetailView
        client={client}
        initialTab="DSC"
        onClose={() => router.push("/client")}
        onEdit={() => router.push(`/client?edit=${client.id}`)}
        onClientUpdated={(updated) => setClient(updated)}
      />
    </div>
  );
}
