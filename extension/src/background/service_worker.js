// CA Practice Extension - Background Service Worker Entry Point (Manifest V3)

import { MessageHandler } from "./message-handler.js";
import { Storage } from "../utils/storage.js";
import { STORAGE_KEYS, DEFAULT_SETTINGS } from "../config/constants.js";
import { ENV } from "../config/env.js";
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
// If a user deploys CA Practice to a custom private company domain, this listener injects the app bridge loader.
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url) return;

  try {
    // Trusted app origins (localhost, 127.0.0.1, *.vercel.app, etc.) already have content_app.js declared in manifest.json
    if (ENV.isTrustedAppOrigin(tab.url)) {
      return;
    }

    const url = new URL(tab.url);
    const domain = url.hostname.toLowerCase();

    // Only inject for user-configured custom domains not covered by manifest matches
    const stored = await Storage.get([STORAGE_KEYS.CUSTOM_DOMAINS]);
    const customDomains = (stored[STORAGE_KEYS.CUSTOM_DOMAINS] || []).map((d) => d.toLowerCase());

    const isCustomMatch = customDomains.includes(domain);

    if (isCustomMatch) {
      log.log(`Injecting app bridge loader into custom deployed domain: ${domain}`);
      chrome.scripting.executeScript({
        target: { tabId },
        files: ["content_app.js"],
      }).catch((err) => {
        // Tab might already have content script or permissions restricted
        log.warn(`Dynamic injection note: ${err.message}`);
      });
    }
  } catch {
    // ignore invalid URLs (e.g. chrome://)
  }
});

