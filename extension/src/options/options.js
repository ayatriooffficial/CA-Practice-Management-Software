// CA Practice Extension - Options Controller

import { Storage } from "../utils/storage.js";
import { STORAGE_KEYS, DEFAULT_SETTINGS } from "../config/constants.js";

document.addEventListener("DOMContentLoaded", async () => {
  const saveBtn = document.getElementById("saveBtn");
  const customDomainsInput = document.getElementById("customDomainsInput");
  const backendApiUrlInput = document.getElementById("backendApiUrlInput");
  const detectedOriginsList = document.getElementById("detectedOriginsList");

  const autoFillEnabled = document.getElementById("autoFillEnabled");
  const showFloatingWidget = document.getElementById("showFloatingWidget");
  const autoFocusCaptcha = document.getElementById("autoFocusCaptcha");

  // Load stored settings
  const stored = await Storage.get([
    STORAGE_KEYS.SETTINGS,
    STORAGE_KEYS.CUSTOM_DOMAINS,
    STORAGE_KEYS.BACKEND_API_URL,
    STORAGE_KEYS.APP_ORIGINS,
  ]);

  const settings = stored[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS;
  const customDomains = stored[STORAGE_KEYS.CUSTOM_DOMAINS] || [];
  const backendApiUrl = stored[STORAGE_KEYS.BACKEND_API_URL] || "";
  const detectedOrigins = stored[STORAGE_KEYS.APP_ORIGINS] || [];

  // Populate inputs
  customDomainsInput.value = customDomains.join("\n");
  backendApiUrlInput.value = backendApiUrl;

  autoFillEnabled.checked = settings.autoFillEnabled !== false;
  showFloatingWidget.checked = settings.showFloatingWidget !== false;
  autoFocusCaptcha.checked = settings.autoFocusCaptcha !== false;

  // Render detected origins
  if (detectedOrigins.length > 0) {
    detectedOriginsList.innerHTML = "";
    detectedOrigins.forEach((orig) => {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.innerText = orig;
      detectedOriginsList.appendChild(badge);
    });
  }

  // Save handler
  saveBtn.addEventListener("click", async () => {
    const rawDomains = customDomainsInput.value
      .split("\n")
      .map((d) => d.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, ""))
      .filter(Boolean);

    const updatedSettings = {
      ...settings,
      autoFillEnabled: autoFillEnabled.checked,
      showFloatingWidget: showFloatingWidget.checked,
      autoFocusCaptcha: autoFocusCaptcha.checked,
    };

    await Storage.set({
      [STORAGE_KEYS.CUSTOM_DOMAINS]: Array.from(new Set(rawDomains)),
      [STORAGE_KEYS.BACKEND_API_URL]: backendApiUrlInput.value.trim(),
      [STORAGE_KEYS.SETTINGS]: updatedSettings,
    });

    showToast("Settings saved successfully!");
  });
});

function showToast(text) {
  const toast = document.getElementById("statusToast");
  toast.innerText = text;
  toast.style.display = "block";
  setTimeout(() => {
    toast.style.display = "none";
  }, 2200);
}

