// CA Practice Extension - Web App Content Script Bridge
// Connects the CA Practice web app (localhost, staging, or deployed production) to the extension.

(function initAppBridge() {
  if (window.__caPracticeAppBridgeLoaded) return;
  window.__caPracticeAppBridgeLoaded = true;

  const currentOrigin = window.location.origin;
  const EXTENSION_VERSION = "2.1.0";

  // Mark DOM element so frontend components immediately detect extension presence
  document.documentElement.dataset.caPracticeExtension = EXTENSION_VERSION;

  // Broadcast readiness event to the web app
  function notifyAppReady() {
    document.documentElement.dataset.caPracticeExtension = EXTENSION_VERSION;
    window.postMessage(
      {
        source: "CA_PRACTICE_EXTENSION",
        type: "CA_PRACTICE_EXTENSION_READY",
        version: EXTENSION_VERSION,
        origin: currentOrigin,
      },
      "*"
    );
  }

  notifyAppReady();

  // Register this web app instance with the background worker
  try {
    chrome.runtime.sendMessage({
      type: "REGISTER_APP_INSTANCE",
      origin: currentOrigin,
    });
  } catch (err) {
    // Background worker may not be ready yet
  }

  // Listen for window postMessages dispatched by CA Practice web app components
  window.addEventListener("message", (event) => {
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
          type: "SET_ACTIVE_CLIENT",
          client: msg.client,
        });
      }
      return;
    }

    // 3. Bulk Sync Clients
    if (msg.type === "CA_PRACTICE_SYNC_CLIENTS") {
      if (Array.isArray(msg.clients) && msg.clients.length > 0) {
        chrome.runtime.sendMessage({
          type: "SYNC_CLIENTS",
          clients: msg.clients,
        });
      }
      return;
    }

    // 4. Universal Auto-Fill for Any Portal (MCA, Income Tax, GST, TRACES, etc.)
    if (msg.type === "CA_PRACTICE_AUTOFILL_PORTAL" || msg.type === "CA_PRACTICE_AUTOFILL_MCA") {
      const isMcaLegacy = msg.type === "CA_PRACTICE_AUTOFILL_MCA";
      const portalId = msg.portalId || (isMcaLegacy ? "mca" : "mca");

      chrome.runtime.sendMessage(
        {
          type: "AUTOFILL_PORTAL",
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
            targetUrl: msg.targetUrl || msg.url || "",
          },
        },
        (response) => {
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
