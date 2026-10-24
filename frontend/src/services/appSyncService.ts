"use client";

import { Client, INITIAL_CLIENTS, Lead, INITIAL_LEADS } from "@/data/crmData";
import { Service, INITIAL_SERVICES } from "@/data/serviceData";

const STORAGE_KEY_CLIENTS = "turia_synced_clients_v2";
const STORAGE_KEY_SERVICES = "turia_synced_services_v2";
const STORAGE_KEY_LEADS = "turia_synced_leads_v2";

export interface SyncedInvoiceClient {
  id: string;
  businessName: string;
  legalName: string;
  group: string;
  type: string;
  gstin: string;
  pan: string;
  address: string;
  placeOfSupply: string;
  mobile?: string;
  email?: string;
}

const STATE_GST_MAP: Record<string, { code: string; name: string }> = {
  Gujarat: { code: "24", name: "24-Gujarat" },
  Maharashtra: { code: "27", name: "27-Maharashtra" },
  Delhi: { code: "07", name: "07-Delhi" },
  "Madhya Pradesh": { code: "23", name: "23-Madhya Pradesh" },
  Goa: { code: "30", name: "30-Goa" },
  Kerala: { code: "32", name: "32-Kerala" },
  Karnataka: { code: "29", name: "29-Karnataka" },
  Telangana: { code: "36", name: "36-Telangana" },
  "Uttar Pradesh": { code: "09", name: "09-Uttar Pradesh" },
  Chandigarh: { code: "04", name: "04-Chandigarh" },
};

function deriveGstin(pan: string, stateName: string): string {
  const cleanPan = (pan || "AAKCA1234F").toUpperCase();
  const stateCode = STATE_GST_MAP[stateName]?.code || "27";
  return `${stateCode}${cleanPan}1Z5`;
}

function derivePlaceOfSupply(stateName: string): string {
  return STATE_GST_MAP[stateName]?.name || "27-Maharashtra";
}

function clientToInvoiceClient(client: Client): SyncedInvoiceClient {
  const defaultPan = client.pan || "AAKCA" + client.id.replace(/\D/g, "").padStart(4, "0") + "Z";
  const state = client.state || "Maharashtra";
  const gstin = deriveGstin(defaultPan, state);
  const placeOfSupply = derivePlaceOfSupply(state);

  return {
    id: client.id,
    businessName: client.name,
    legalName: (client.name + (client.type === "private-limited" ? " PRIVATE LIMITED" : client.type === "llp" ? " LLP" : "")).toUpperCase(),
    group: client.group || "General",
    type: client.type || "individual",
    gstin,
    pan: defaultPan,
    address: client.address
      ? `${client.address}, ${client.city || ""}, ${state} ${client.pincode || ""}`.trim()
      : `Main Commercial Complex, ${client.city || "Mumbai"}, ${state}`,
    placeOfSupply,
    mobile: client.mobile,
    email: client.email,
  };
}

type SyncListener = () => void;

class AppSyncService {
  private listeners: Set<SyncListener> = new Set();

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("storage", (e) => {
        if (
          e.key === STORAGE_KEY_CLIENTS ||
          e.key === STORAGE_KEY_SERVICES ||
          e.key === STORAGE_KEY_LEADS
        ) {
          this.notify();
        }
      });
    }
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error("Sync listener error:", err);
      }
    });
  }

  // ==========================================
  // CLIENTS (Authoritative from CRM)
  // ==========================================
  public getClients(): Client[] {
    if (typeof window === "undefined") {
      return [];
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CLIENTS);
      if (!raw) {
        return [];
      }
      const parsed: Client[] = JSON.parse(raw);
      const clean = (parsed || []).filter(
        (c) => c && c.fileNo !== "CLT-2026-MOCK" && c.id !== "6ada31f787977d6da675b184"
      );
      if (parsed.length !== clean.length) {
        localStorage.setItem(STORAGE_KEY_CLIENTS, JSON.stringify(clean));
      }
      return clean;
    } catch {
      return [];
    }
  }

  public getInvoiceClients(): SyncedInvoiceClient[] {
    const clients = this.getClients();
    return clients.map(clientToInvoiceClient);
  }

  public saveClient(client: Client): Client {
    const list = this.getClients();
    const index = list.findIndex((c) => c.id === client.id);
    let updated: Client[];
    if (index >= 0) {
      updated = [...list];
      updated[index] = { ...updated[index], ...client };
    } else {
      updated = [client, ...list];
    }
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_CLIENTS, JSON.stringify(updated));
    }
    this.notify();
    return client;
  }

  public deleteClient(id: string): void {
    const list = this.getClients();
    const updated = list.filter((c) => c.id !== id);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_CLIENTS, JSON.stringify(updated));
    }
    this.notify();
  }

  // ==========================================
  // SERVICES (Authoritative from Services Catalog)
  // ==========================================
  public getServices(): Service[] {
    if (typeof window === "undefined") {
      return INITIAL_SERVICES;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SERVICES);
      if (!raw) {
        localStorage.setItem(STORAGE_KEY_SERVICES, JSON.stringify(INITIAL_SERVICES));
        return INITIAL_SERVICES;
      }
      const parsed: Service[] = JSON.parse(raw);
      return parsed && parsed.length > 0 ? parsed : INITIAL_SERVICES;
    } catch {
      return INITIAL_SERVICES;
    }
  }

  public getServicesCatalog(): string[] {
    return this.getServices().map((s) => s.name);
  }

  public findServiceByName(name: string): Service | undefined {
    return this.getServices().find((s) => s.name.toLowerCase() === name.toLowerCase());
  }

  public saveService(service: Service): Service {
    const list = this.getServices();
    const index = list.findIndex((s) => s.id === service.id);
    let updated: Service[];
    if (index >= 0) {
      updated = [...list];
      updated[index] = { ...updated[index], ...service };
    } else {
      updated = [service, ...list];
    }
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_SERVICES, JSON.stringify(updated));
    }
    this.notify();
    return service;
  }

  public deleteService(id: string): void {
    const list = this.getServices();
    const updated = list.filter((s) => s.id !== id);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_SERVICES, JSON.stringify(updated));
    }
    this.notify();
  }

  // ==========================================
  // LEADS
  // ==========================================
  public getLeads(): Lead[] {
    if (typeof window === "undefined") {
      return INITIAL_LEADS;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY_LEADS);
      if (!raw) {
        localStorage.setItem(STORAGE_KEY_LEADS, JSON.stringify(INITIAL_LEADS));
        return INITIAL_LEADS;
      }
      const parsed: Lead[] = JSON.parse(raw);
      return parsed && parsed.length > 0 ? parsed : INITIAL_LEADS;
    } catch {
      return INITIAL_LEADS;
    }
  }

  public saveLead(lead: Lead): Lead {
    const list = this.getLeads();
    const index = list.findIndex((l) => l.id === lead.id);
    let updated: Lead[];
    if (index >= 0) {
      updated = [...list];
      updated[index] = { ...updated[index], ...lead };
    } else {
      updated = [lead, ...list];
    }
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_LEADS, JSON.stringify(updated));
    }
    this.notify();
    return lead;
  }
}

export const appSyncService = new AppSyncService();
