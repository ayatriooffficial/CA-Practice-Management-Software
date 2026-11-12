// CA Practice Extension - Dynamic API Service
// Automatically connects to localhost during development OR the deployed backend in production.

import { Storage } from "../utils/storage.js";
import { STORAGE_KEYS } from "../config/constants.js";
import { ENV } from "../config/env.js";
import { logger } from "../utils/logger.js";

const log = logger.create("ApiService");

export class ApiService {
  /**
   * Resolve active backend API base URL.
   * Priority: User custom override > Detected web app origin > Default localhost
   */
  static async getBaseUrl() {
    const data = await Storage.get([STORAGE_KEYS.BACKEND_API_URL, STORAGE_KEYS.APP_ORIGINS]);

    if (data[STORAGE_KEYS.BACKEND_API_URL]) {
      return data[STORAGE_KEYS.BACKEND_API_URL].replace(/\/+$/, "");
    }

    const origins = data[STORAGE_KEYS.APP_ORIGINS] || [];
    if (origins.length > 0) {
      const activeOrigin = origins[0].replace(/\/+$/, "");
      // If deployed web app is on https://app.ayatrio.com, backend is typically /api/v1
      return `${activeOrigin}/api/v1`;
    }

    return ENV.DEFAULT_LOCAL_API;
  }

  /**
   * Search clients via backend API with fallback across endpoints.
   */
  static async searchClients(query = "") {
    const baseUrl = await this.getBaseUrl();
    const encodedQuery = encodeURIComponent(query.trim());
    const urls = [
      `${baseUrl}/clients?search=${encodedQuery}&limit=50`,
      `${baseUrl}/clients?limit=100`,
      `${baseUrl.replace('/v1', '')}/clients?search=${encodedQuery}&limit=50`,
      `${ENV.DEFAULT_LOCAL_API}/clients?search=${encodedQuery}&limit=50`,
    ];

    for (const url of urls) {
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) continue;

        const result = await response.json();
        const items = result?.data?.items || result?.data || [];
        if (Array.isArray(items) && items.length > 0) {
          log.log(`Successfully fetched ${items.length} clients from ${url}`);
          return items;
        }
      } catch (err) {
        log.warn(`Fetch failed for ${url}:`, err.message);
      }
    }

    return [];
  }

  /**
   * In-memory search helper matching PAN, Name, GSTIN, CIN, and Directors
   */
  static filterClients(query, clients = []) {
    if (!query || !query.trim()) return clients.slice(0, 30);
    const q = query.trim().toLowerCase();

    const matched = [];
    for (const c of clients) {
      if (!c) continue;
      const name = (c.name || "").toLowerCase();
      const pan = (c.pan || "").toLowerCase();
      const gstin = (c.gstin || "").toLowerCase();
      const cin = (c.cin || "").toLowerCase();

      const contacts = c.contacts || [];
      const dMatch = contacts.some(
        (d) =>
          (d.name || "").toLowerCase().includes(q) ||
          (d.pan || "").toLowerCase().includes(q) ||
          (d.din || d.mcaId || "").toLowerCase().includes(q)
      );

      if (name.includes(q) || pan.includes(q) || gstin.includes(q) || cin.includes(q) || dMatch) {
        matched.push(c);
      }
    }

    // Sort exact PAN matches to the top
    matched.sort((a, b) => {
      const aPan = (a.pan || "").toLowerCase();
      const bPan = (b.pan || "").toLowerCase();
      if (aPan === q) return -1;
      if (bPan === q) return 1;
      return 0;
    });

    return matched.slice(0, 30);
  }
}
