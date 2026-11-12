// CA Practice Extension - Universal Portal Bridge Content Script
// Automatically detects active portal and executes auto-fill and floating assistant.

import { detectPortalFromUrl, getPortalById } from "../config/portals.js";
import { ACTIONS } from "../config/constants.js";
import { FloatingWidget } from "./core/floating-widget.js";
import { McaAdapter } from "./adapters/mca-adapter.js";
import { IncomeTaxAdapter } from "./adapters/incometax-adapter.js";
import { GstAdapter } from "./adapters/gst-adapter.js";
import { TracesAdapter } from "./adapters/traces-adapter.js";
import { UniversalAdapter } from "./adapters/universal-adapter.js";
import { logger } from "../utils/logger.js";

const log = logger.create("PortalBridge");

(async function initPortalBridge() {
  if (window.__caPracticePortalBridgeLoaded) return;
  window.__caPracticePortalBridgeLoaded = true;

  const currentUrl = window.location.href;
  const portal = detectPortalFromUrl(currentUrl) || getPortalById("mca");

  log.log(`Active on portal: ${portal.name} (${currentUrl})`);

  // Create adapter instance
  let adapter;
  switch (portal.adapter) {
    case "incometax":
      adapter = new IncomeTaxAdapter(portal);
      break;
    case "gst":
      adapter = new GstAdapter(portal);
      break;
    case "traces":
      adapter = new TracesAdapter(portal);
      break;
    case "mca":
      adapter = new McaAdapter(portal);
      break;
    case "universal":
    default:
      adapter = new UniversalAdapter(portal);
      break;
  }

  // Fetch pending credentials and active client from background
  chrome.runtime.sendMessage(
    { type: ACTIONS.GET_PORTAL_CREDENTIALS, portalId: portal.id },
    (response) => {
      if (chrome.runtime.lastError || !response?.success) {
        log.warn("Could not retrieve credentials from background:", chrome.runtime.lastError?.message);
        return;
      }

      const { credentials, client, directors, settings } = response;
      const shouldAutoFill = settings?.autoFillEnabled !== false && credentials?.autoFillEnabled !== false;

      // 1. Mount floating assistant widget if enabled
      let widget = null;
      if (settings?.showFloatingWidget !== false && (credentials?.userId || credentials?.mcaId || client)) {
        widget = new FloatingWidget({
          portal,
          credentials,
          client,
          directors,
          onFill: (creds) => {
            log.log("Manual trigger from floating widget");
            adapter.fillLogin(creds);
          },
          onSelectDirector: (director) => {
            log.log("Switched director:", director.name);
            const updatedCreds = {
              ...credentials,
              directorName: director.name,
              userId: director.din || director.mcaId || director.pan || credentials.userId,
              mcaId: director.din || director.mcaId || credentials.mcaId,
              password: director.mcaPassword || credentials.password,
              mcaPassword: director.mcaPassword || credentials.mcaPassword,
            };
            adapter.fillLogin(updatedCreds);
            widget.update(updatedCreds, client, directors);
          },
        });
        widget.mount();
      }

      // 2. Perform auto-fill on page load if credentials present
      if (shouldAutoFill && (credentials?.password || credentials?.mcaPassword || credentials?.userId)) {
        log.log("Auto-filling credentials on load...");
        setTimeout(() => {
          adapter.fillLogin(credentials);
        }, 300);

        // Try again after 1.5 seconds in case dynamic SPA inputs were late to render
        setTimeout(() => {
          adapter.fillLogin(credentials);
        }, 1500);
      }
    }
  );

  // 3. Listen for manual execution messages from extension popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "EXECUTE_AUTO_FILL") {
      log.log("Executing manual auto-fill from popup message");
      const result = adapter.fillLogin(request.credentials || {});
      sendResponse({ success: true, result });
    }
  });
})();

