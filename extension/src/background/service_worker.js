// CA Practice Extension - Background Service Worker Entry Point (Manifest V3)

import { MessageHandler } from "./message-handler.js";
import { Storage } from "../utils/storage.js";
import { STORAGE_KEYS, DEFAULT_SETTINGS } from "../config/constants.js";
import { logger } from "../utils/logger.js";

const log = logger.create("ServiceWorker");

// 1. Extension Lifecycle Listener
chrome.runtime.onInstalled.addListener(async (details) => {
  log.log("Extension installed / updated:", details.reason);

  // Initialize default settings if not already present
  const stored = await Storage.get([STORAGE_KEYS.SETTINGS]);
  if (!stored[STORAGE_KEYS.SETTINGS]) {
    await Storage.set({ [STORAGE_KEYS.SETTINGS]: DEFAULT_SETTINGS });
    log.log("Initialized default settings.");
  }
});

// 2. Central Message Listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  MessageHandler.handleMessage(request, sender, sendResponse);
  return true; // Keep channel open for asynchronous responses
});

// 3. Dynamic Content Script Injection for Custom Deployed Web App Domains
// If a user deploys CA Practice to a custom private company domain, this listener injects the app bridge.
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url) return;

  try {
    const url = new URL(tab.url);
    const domain = url.hostname.toLowerCase();

    // Check if this domain is in user-configured custom domains
    const stored = await Storage.get([STORAGE_KEYS.CUSTOM_DOMAINS, STORAGE_KEYS.APP_ORIGINS]);
    const customDomains = (stored[STORAGE_KEYS.CUSTOM_DOMAINS] || []).map((d) => d.toLowerCase());
    const registeredOrigins = (stored[STORAGE_KEYS.APP_ORIGINS] || []).map((o) => {
      try { return new URL(o).hostname.toLowerCase(); } catch { return ""; }
    });

    const isCustomMatch = customDomains.includes(domain) || registeredOrigins.includes(domain);

    if (isCustomMatch) {
      log.log(`Injecting app bridge into custom deployed domain: ${domain}`);
      chrome.scripting.executeScript({
        target: { tabId },
        files: [
          "src/config/constants.js",
          "src/config/portals.js",
          "src/utils/storage.js",
          "src/utils/logger.js",
          "src/content/app-bridge.js",
        ],
      }).catch((err) => {
        // Tab might already have content script or permissions restricted
        log.warn(`Dynamic injection note: ${err.message}`);
      });
    }
  } catch {
    // ignore invalid URLs (e.g. chrome://)
  }
});
