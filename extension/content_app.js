// CA Practice Extension - Web App Content Script Loader
// Dynamically mounts the modular app-bridge from src/content/app-bridge.js

(async function () {
  try {
    const bridgeUrl = chrome.runtime.getURL("src/content/app-bridge.js");
    await import(bridgeUrl);
  } catch (err) {
    console.error("[CA Practice Extension] Failed to import app-bridge:", err);
  }
})();
