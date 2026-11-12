// CA Practice Extension - Universal Portal Content Script Loader
// Dynamically mounts the modular portal-bridge from src/content/portal-bridge.js

(async function () {
  try {
    const bridgeUrl = chrome.runtime.getURL("src/content/portal-bridge.js");
    await import(bridgeUrl);
  } catch (err) {
    console.error("[CA Practice Extension] Failed to import portal-bridge:", err);
  }
})();
