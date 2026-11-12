// CA Practice Extension - Web App Content Script Bridge
// Connects the CA Practice web app (localhost, staging, or deployed production) to the extension.

import { ACTIONS } from "../config/constants.js";
import { ENV } from "../config/env.js";
import { logger } from "../utils/logger.js";

const log = logger.create("AppBridge");

(function initAppBridge() {
  const currentOrigin = window.location.origin;
  log.log("Active on web app instance:", currentOrigin);

  // Mark DOM element so frontend components immediately detect extension presence
  document.documentElement.dataset.caPracticeExtension = ENV.EXTENSION_VERSION;

  // Broadcast readiness event to the web app
  function notifyAppReady() {
    document.documentElement.dataset.caPracticeExtension = ENV.EXTENSION_VERSION;
    window.postMessage(
      {
        source: "CA_PRACTICE_EXTENSION",
        type: "CA_PRACTICE_EXTENSION_READY",
        version: ENV.EXTENSION_VERSION,
        origin: currentOrigin,
      },
      "*"
    );
  }

  notifyAppReady();

  // Register this web app instance with the background worker
  try {
    chrome.runtime.sendMessage({
      type: ACTIONS.REGISTER_APP_INSTANCE,
      origin: currentOrigin,
    });
  } catch (err) {
    log.warn("Could not register app instance:", err.message);
  }

  // Listen for window postMessages dispatched by CA Practice web app components
  window.addEventListener("message", (event) => {
    // Only accept messages from current page window
    if (event.source !== window) return;

    const msg = event.data;
    if (!msg || typeof msg !== "object") return;

    // 1. Extension Ping / Readiness Check
    if (msg.type === "CHECK_CA_PRACTICE_EXTENSION") {
      notifyAppReady();
      return;
    }

    // 2. Sync Currently Active Client
    if (msg.type === "CA_PRACTICE_ACTIVE_CLIENT") {
      if (msg.client) {
        chrome.runtime.sendMessage({
          type: ACTIONS.SET_ACTIVE_CLIENT,
          client: msg.client,
        });
      }
      return;
    }

    // 3. Bulk Sync Clients
    if (msg.type === "CA_PRACTICE_SYNC_CLIENTS") {
      if (Array.isArray(msg.clients) && msg.clients.length > 0) {
        chrome.runtime.sendMessage({
          type: ACTIONS.SYNC_CLIENTS,
          clients: msg.clients,
        });
      }
      return;
    }

    // 4. Universal Auto-Fill for Any Portal (MCA, Income Tax, GST, TRACES)
    if (msg.type === "CA_PRACTICE_AUTOFILL_PORTAL" || msg.type === "CA_PRACTICE_AUTOFILL_MCA") {
      const isMcaLegacy = msg.type === "CA_PRACTICE_AUTOFILL_MCA";
      const portalId = msg.portalId || (isMcaLegacy ? "mca" : "mca");

      log.log(`Received auto-fill request for portal [${portalId}]:`, {
        portalId,
        clientName: msg.clientName,
        directorName: msg.directorName,
        hasPassword: Boolean(msg.password || msg.mcaPassword),
      });

      chrome.runtime.sendMessage(
        {
          type: ACTIONS.AUTOFILL_PORTAL,
          portalId,
          data: {
            portalId,
            userId: msg.userId || msg.mcaId || msg.pan || "",
            mcaId: msg.mcaId || msg.userId || "",
            password: msg.password || msg.mcaPassword || "",
            mcaPassword: msg.mcaPassword || msg.password || "",
            clientName: msg.clientName || "",
            directorName: msg.directorName || "",
            clientPan: msg.clientPan || msg.pan || "",
          },
        },
        (response) => {
          if (chrome.runtime.lastError) {
            log.error("Auto-fill request failed:", chrome.runtime.lastError);
            return;
          }

          window.postMessage(
            {
              source: "CA_PRACTICE_EXTENSION",
              type: "CA_PRACTICE_AUTOFILL_STARTED",
              portal: portalId,
              success: response?.success,
            },
            "*"
          );
        }
      );
    }
  });
})();

