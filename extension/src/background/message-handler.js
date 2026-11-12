// CA Practice Extension - Background Message Handler

import { Storage } from "../utils/storage.js";
import { STORAGE_KEYS, ACTIONS } from "../config/constants.js";
import { PORTALS, getPortalById } from "../config/portals.js";
import { CredentialManager } from "./credential-manager.js";
import { ApiService } from "./api-service.js";
import { logger } from "../utils/logger.js";

const log = logger.create("MessageHandler");

export class MessageHandler {
  static async handleMessage(request, sender, sendResponse) {
    const { type, data } = request || {};

    try {
      switch (type) {
        // ---------------------------------------------------------------------
        // 1. Web App Bridge Handlers
        // ---------------------------------------------------------------------
        case ACTIONS.REGISTER_APP_INSTANCE: {
          const origin = request.origin || (sender.tab?.url ? new URL(sender.tab.url).origin : null);
          if (origin) {
            const stored = await Storage.get([STORAGE_KEYS.APP_ORIGINS]);
            const origins = stored[STORAGE_KEYS.APP_ORIGINS] || [];
            if (!origins.includes(origin)) {
              origins.unshift(origin);
              await Storage.set({ [STORAGE_KEYS.APP_ORIGINS]: origins.slice(0, 10) });
              log.log("Registered new web app instance origin:", origin);
            }
          }
          sendResponse({ success: true });
          break;
        }

        case ACTIONS.SET_ACTIVE_CLIENT: {
          const client = request.client;
          if (!client) {
            sendResponse({ success: false, error: "Missing client object" });
            break;
          }

          // Cache client
          const stored = await Storage.get([STORAGE_KEYS.CACHED_CLIENTS, STORAGE_KEYS.ACTIVE_PORTAL_ID]);
          let cached = stored[STORAGE_KEYS.CACHED_CLIENTS] || [];
          const idx = cached.findIndex((c) => (c.id && c.id === client.id) || (c.pan && c.pan === client.pan));
          if (idx >= 0) {
            cached[idx] = client;
          } else {
            cached.unshift(client);
            if (cached.length > 500) cached.pop();
          }

          const activePortalId = stored[STORAGE_KEYS.ACTIVE_PORTAL_ID] || "mca";
          const creds = CredentialManager.extractCredentials(client, activePortalId);

          await Storage.set({
            [STORAGE_KEYS.ACTIVE_CLIENT]: client,
            [STORAGE_KEYS.CACHED_CLIENTS]: cached,
            [STORAGE_KEYS.PENDING_CREDENTIALS]: {
              ...creds,
              timestamp: Date.now(),
              autoFillEnabled: true,
            },
            [STORAGE_KEYS.LAST_USED_CREDENTIALS]: {
              ...creds,
              timestamp: Date.now(),
            },
          });

          log.log(`Active client synced: ${client.name} (${client.pan || "No PAN"})`);
          sendResponse({ success: true, credentials: creds });
          break;
        }

        case ACTIONS.SYNC_CLIENTS: {
          const incoming = request.clients || [];
          if (!Array.isArray(incoming) || incoming.length === 0) {
            sendResponse({ success: false, error: "Empty clients array" });
            break;
          }

          const stored = await Storage.get([STORAGE_KEYS.CACHED_CLIENTS]);
          const existing = stored[STORAGE_KEYS.CACHED_CLIENTS] || [];
          const map = new Map();

          existing.forEach((c) => {
            const k = c.id || c.pan || c.name;
            if (k) map.set(k, c);
          });
          incoming.forEach((c) => {
            const k = c.id || c.pan || c.name;
            if (k) map.set(k, c);
          });

          const merged = Array.from(map.values()).slice(0, 500);
          await Storage.set({ [STORAGE_KEYS.CACHED_CLIENTS]: merged });
          log.log(`Synced ${incoming.length} clients into local storage (Total: ${merged.length})`);
          sendResponse({ success: true, count: merged.length });
          break;
        }

        case ACTIONS.AUTOFILL_PORTAL:
        case ACTIONS.AUTOFILL_MCA: {
          const portalId = request.portalId || (type === ACTIONS.AUTOFILL_MCA ? "mca" : "mca");
          const payload = data || request.data || {};
          const portal = getPortalById(portalId);

          const pendingCreds = {
            portalId: portal.id,
            userId: payload.userId || payload.mcaId || payload.pan || "",
            mcaId: payload.mcaId || payload.userId || "",
            password: payload.password || payload.mcaPassword || "",
            mcaPassword: payload.mcaPassword || payload.password || "",
            clientName: payload.clientName || "Client",
            directorName: payload.directorName || "Director",
            clientPan: payload.clientPan || payload.pan || "",
            timestamp: Date.now(),
            autoFillEnabled: true,
          };

          await Storage.set({
            [STORAGE_KEYS.ACTIVE_PORTAL_ID]: portal.id,
            [STORAGE_KEYS.PENDING_CREDENTIALS]: pendingCreds,
            [STORAGE_KEYS.LAST_USED_CREDENTIALS]: pendingCreds,
            pendingMcaCredentials: {
              ...pendingCreds,
            },
          });

          // Open portal in new tab
          const targetUrl =
            payload.targetUrl && typeof payload.targetUrl === "string" && payload.targetUrl.startsWith("http")
              ? payload.targetUrl
              : portal.loginUrl;
          chrome.tabs.create({ url: targetUrl }, (newTab) => {
            sendResponse({ success: true, tabId: newTab?.id, portal: portal.name });
          });
          break;
        }

        // ---------------------------------------------------------------------
        // 2. Popup UI Handlers
        // ---------------------------------------------------------------------
        case ACTIONS.GET_POPUP_DATA: {
          const stored = await Storage.get([
            STORAGE_KEYS.ACTIVE_CLIENT,
            STORAGE_KEYS.PENDING_CREDENTIALS,
            STORAGE_KEYS.LAST_USED_CREDENTIALS,
            STORAGE_KEYS.ACTIVE_PORTAL_ID,
            STORAGE_KEYS.SETTINGS,
            STORAGE_KEYS.APP_ORIGINS,
          ]);

          const activePortalId = stored[STORAGE_KEYS.ACTIVE_PORTAL_ID] || "mca";
          const client = stored[STORAGE_KEYS.ACTIVE_CLIENT] || null;
          const directors = CredentialManager.getClientDirectors(client);
          const activeCreds = client ? CredentialManager.extractCredentials(client, activePortalId) : null;

          sendResponse({
            success: true,
            activePortalId,
            portals: PORTALS,
            client,
            directors,
            credentials: stored[STORAGE_KEYS.PENDING_CREDENTIALS] || activeCreds || stored[STORAGE_KEYS.LAST_USED_CREDENTIALS] || {},
            settings: stored[STORAGE_KEYS.SETTINGS] || {},
            connectedAppOrigin: (stored[STORAGE_KEYS.APP_ORIGINS] || [])[0] || null,
          });
          break;
        }

        case ACTIONS.SWITCH_PORTAL: {
          const portalId = request.portalId || "mca";
          const stored = await Storage.get([STORAGE_KEYS.ACTIVE_CLIENT]);
          const client = stored[STORAGE_KEYS.ACTIVE_CLIENT];

          const newCreds = client ? CredentialManager.extractCredentials(client, portalId) : null;

          await Storage.set({
            [STORAGE_KEYS.ACTIVE_PORTAL_ID]: portalId,
            ...(newCreds ? { [STORAGE_KEYS.PENDING_CREDENTIALS]: { ...newCreds, timestamp: Date.now(), autoFillEnabled: true } } : {}),
          });

          sendResponse({ success: true, portalId, credentials: newCreds });
          break;
        }

        case ACTIONS.SEARCH_CLIENTS: {
          const query = request.query || "";
          const stored = await Storage.get([STORAGE_KEYS.CACHED_CLIENTS]);
          let cached = stored[STORAGE_KEYS.CACHED_CLIENTS] || [];

          if (cached.length === 0) {
            // Attempt dynamic fetch from backend API
            const remoteClients = await ApiService.searchClients(query);
            if (remoteClients.length > 0) {
              await Storage.set({ [STORAGE_KEYS.CACHED_CLIENTS]: remoteClients });
              cached = remoteClients;
            }
          }

          const filtered = ApiService.filterClients(query, cached);
          sendResponse({ success: true, results: filtered });
          break;
        }

        case ACTIONS.OPEN_PORTAL_AND_FILL: {
          const portalId = request.portalId || "mca";
          const portal = getPortalById(portalId);
          const creds = request.credentials || {};

          await Storage.set({
            [STORAGE_KEYS.ACTIVE_PORTAL_ID]: portal.id,
            [STORAGE_KEYS.PENDING_CREDENTIALS]: {
              ...creds,
              portalId: portal.id,
              timestamp: Date.now(),
              autoFillEnabled: true,
            },
            [STORAGE_KEYS.LAST_USED_CREDENTIALS]: {
              ...creds,
              portalId: portal.id,
              timestamp: Date.now(),
            },
          });

          chrome.tabs.create({ url: portal.loginUrl }, (newTab) => {
            sendResponse({ success: true, tabId: newTab?.id });
          });
          break;
        }

        case ACTIONS.FILL_CURRENT_TAB: {
          const creds = request.credentials || {};
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

          if (!activeTab?.id) {
            sendResponse({ success: false, error: "No active tab found" });
            break;
          }

          // Send fill instruction to content script in current tab
          chrome.tabs.sendMessage(
            activeTab.id,
            { type: "EXECUTE_AUTO_FILL", credentials: creds },
            (resp) => {
              if (chrome.runtime.lastError) {
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
              } else {
                sendResponse({ success: true, result: resp });
              }
            }
          );
          break;
        }

        // ---------------------------------------------------------------------
        // 3. Portal Content Script Handlers
        // ---------------------------------------------------------------------
        case ACTIONS.GET_PORTAL_CREDENTIALS: {
          const portalId = request.portalId || "mca";
          const stored = await Storage.get([
            STORAGE_KEYS.PENDING_CREDENTIALS,
            STORAGE_KEYS.ACTIVE_CLIENT,
            STORAGE_KEYS.SETTINGS,
          ]);

          let creds = stored[STORAGE_KEYS.PENDING_CREDENTIALS];
          const client = stored[STORAGE_KEYS.ACTIVE_CLIENT];

          // If no pending credentials but active client exists, extract on the fly
          if ((!creds || !creds.password) && client) {
            creds = CredentialManager.extractCredentials(client, portalId);
          }

          const directors = CredentialManager.getClientDirectors(client);

          sendResponse({
            success: true,
            credentials: creds || {},
            client: client || null,
            directors,
            settings: stored[STORAGE_KEYS.SETTINGS] || {},
          });
          break;
        }

        // ---------------------------------------------------------------------
        // 4. Backward Compatibility Handlers for Content Scripts
        // ---------------------------------------------------------------------
        case "GET_ACTIVE_DATA": {
          const stored = await Storage.get([
            STORAGE_KEYS.ACTIVE_CLIENT,
            STORAGE_KEYS.CACHED_CLIENTS,
            STORAGE_KEYS.PENDING_CREDENTIALS,
            STORAGE_KEYS.LAST_USED_CREDENTIALS,
            STORAGE_KEYS.SETTINGS,
            "widgetPosition",
          ]);
          const client = stored[STORAGE_KEYS.ACTIVE_CLIENT] || null;
          const creds = stored[STORAGE_KEYS.PENDING_CREDENTIALS] || stored[STORAGE_KEYS.LAST_USED_CREDENTIALS] || {};
          const mcaCreds = client ? CredentialManager.extractMcaCredentials(client) : {};
          sendResponse({
            success: true,
            activeClient: client,
            cachedClients: stored[STORAGE_KEYS.CACHED_CLIENTS] || [],
            pendingMcaCredentials: {
              ...mcaCreds,
              ...creds,
            },
            pendingCredentials: creds,
            lastUsedCredentials: stored[STORAGE_KEYS.LAST_USED_CREDENTIALS] || creds,
            settings: stored[STORAGE_KEYS.SETTINGS] || {},
            widgetPosition: stored.widgetPosition,
          });
          break;
        }

        case "OPEN_MCA_AND_FILL": {
          const payload = request.data || {};
          const creds = {
            portalId: "mca",
            userId: payload.mcaId || payload.userId || "",
            mcaId: payload.mcaId || payload.userId || "",
            password: payload.mcaPassword || payload.password || "",
            mcaPassword: payload.mcaPassword || payload.password || "",
            clientName: payload.clientName || "Client",
            directorName: payload.directorName || "Director",
            clientPan: payload.clientPan || "",
            timestamp: Date.now(),
            autoFillEnabled: true,
          };
          await Storage.set({
            [STORAGE_KEYS.ACTIVE_PORTAL_ID]: "mca",
            [STORAGE_KEYS.PENDING_CREDENTIALS]: creds,
            [STORAGE_KEYS.LAST_USED_CREDENTIALS]: creds,
          });
          const mcaUrl = "https://www.mca.gov.in/content/mca/global/en/foportal/fologin.html";
          chrome.tabs.create({ url: mcaUrl }, (newTab) => {
            sendResponse({ success: true, tabId: newTab?.id });
          });
          break;
        }

        case "GET_CLIENT_GST_PERIODS": {
          const clientId = request.clientId;
          if (!clientId) {
            sendResponse({ periods: [] });
            break;
          }
          const storageKey = `gstPeriods_${clientId}`;
          const stored = await Storage.get([storageKey, "selectedGstPeriod"]);
          const cached = stored[storageKey] || [];
          const selected = stored.selectedGstPeriod || null;

          const baseUrl = await ApiService.getBaseUrl();
          const urls = [
            `${baseUrl}/gst-links/client/${clientId}/submissions`,
            `${baseUrl}/gst-links/client/${clientId}`,
            `https://ca-practice-management-software.vercel.app/api/v1/gst-links/client/${clientId}/submissions`,
            `http://localhost:5000/api/v1/gst-links/client/${clientId}/submissions`,
          ];

          let foundPeriods = null;
          for (const u of urls) {
            try {
              const res = await fetch(u);
              if (!res.ok) continue;
              const json = await res.json();
              if (json?.success && Array.isArray(json.data) && json.data.length > 0) {
                foundPeriods = json.data;
                break;
              }
            } catch {}
          }

          if (foundPeriods) {
            await Storage.set({ [storageKey]: foundPeriods });
            sendResponse({ periods: foundPeriods, selectedPeriod: selected });
          } else {
            sendResponse({ periods: cached, selectedPeriod: selected });
          }
          break;
        }

        case "SET_SELECTED_GST_PERIOD": {
          const periodData = request.periodData || null;
          await Storage.set({ selectedGstPeriod: periodData });
          sendResponse({ success: true, selectedGstPeriod: periodData });
          break;
        }

        case "CLEAR_PENDING_CREDENTIALS": {
          await Storage.set({ [STORAGE_KEYS.PENDING_CREDENTIALS]: null });
          sendResponse({ success: true });
          break;
        }

        default:
          sendResponse({ success: false, error: `Unknown action: ${type}` });
          break;
      }
    } catch (err) {
      log.error(`Error handling ${type}:`, err);
      sendResponse({ success: false, error: err.message });
    }
  }
}

