// CA Practice Extension - Popup Controller

import { ACTIONS } from "../config/constants.js";
import { PORTALS, getPortalById } from "../config/portals.js";

let state = {
  activePortalId: "mca",
  portals: PORTALS,
  client: null,
  directors: [],
  credentials: {},
  settings: {},
  connectedAppOrigin: null,
};

document.addEventListener("DOMContentLoaded", async () => {
  setupTabs();
  setupEventListeners();
  await loadPopupData();
});

// Load data from Background
async function loadPopupData() {
  chrome.runtime.sendMessage({ type: ACTIONS.GET_POPUP_DATA }, (res) => {
    if (chrome.runtime.lastError || !res?.success) {
      showToast("Error loading extension data");
      return;
    }

    state.activePortalId = res.activePortalId || "mca";
    state.portals = res.portals || PORTALS;
    state.client = res.client || null;
    state.directors = res.directors || [];
    state.credentials = res.credentials || {};
    state.settings = res.settings || {};
    state.connectedAppOrigin = res.connectedAppOrigin || null;

    renderConnectionStatus();
    renderPortalSelector();
    renderCredentialsCard();
  });
}

function renderConnectionStatus() {
  const subtitle = document.getElementById("connectionSubtitle");
  if (state.connectedAppOrigin) {
    try {
      const host = new URL(state.connectedAppOrigin).host;
      subtitle.innerText = `Connected: ${host}`;
    } catch {
      subtitle.innerText = "CA Practice Assistant";
    }
  } else {
    subtitle.innerText = "CA Practice Assistant";
  }
}

// Render Portal Switcher Pills
function renderPortalSelector() {
  const container = document.getElementById("portalSelector");
  container.innerHTML = "";

  state.portals.forEach((p) => {
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = `portal-pill ${p.id === state.activePortalId ? "active" : ""}`;
    pill.innerText = p.shortName || p.name;
    pill.title = p.name;

    pill.addEventListener("click", () => {
      switchPortal(p.id);
    });

    container.appendChild(pill);
  });
}

// Switch Active Portal
function switchPortal(portalId) {
  state.activePortalId = portalId;
  renderPortalSelector();

  chrome.runtime.sendMessage(
    { type: ACTIONS.SWITCH_PORTAL, portalId },
    (res) => {
      if (res?.success && res.credentials) {
        state.credentials = res.credentials;
      }
      renderCredentialsCard();
      showToast(`Switched to ${getPortalById(portalId).name}`);
    }
  );
}

// Render Credentials Card
function renderCredentialsCard() {
  const portal = getPortalById(state.activePortalId);
  const client = state.client;

  const clientNameEl = document.getElementById("clientName");
  const clientSubtitleEl = document.getElementById("clientSubtitle");
  const panBadgeEl = document.getElementById("clientPanBadge");
  const directorGroup = document.getElementById("directorGroup");
  const directorSelect = document.getElementById("directorSelect");
  const userIdLabel = document.getElementById("userIdLabel");
  const passwordLabel = document.getElementById("passwordLabel");
  const userIdInput = document.getElementById("userIdInput");
  const passwordInput = document.getElementById("passwordInput");
  const openAndFillBtn = document.getElementById("openAndFillBtn");
  const portalInfoText = document.getElementById("portalInfoText");

  // Portal Labels
  userIdLabel.innerText = portal.credentialKeys?.idLabel || "User ID";
  passwordLabel.innerText = portal.credentialKeys?.passwordLabel || "Password";
  openAndFillBtn.innerText = `🚀 Open ${portal.shortName} & Auto-Fill`;
  portalInfoText.innerHTML = `<strong>${portal.name}:</strong> Click open to launch portal with auto-fill or use the floating assistant.`;

  // Client Details
  if (client) {
    clientNameEl.innerText = client.name || "Selected Client";
    clientSubtitleEl.innerText = `PAN: ${client.pan || "-"} | Status: ${client.status || "Active"}`;
    panBadgeEl.innerText = client.pan || portal.shortName;
    panBadgeEl.style.display = "inline-block";
  } else {
    clientNameEl.innerText = "No Client Selected";
    clientSubtitleEl.innerText = "Search a client or open one in the CA Practice app";
    panBadgeEl.style.display = "none";
  }

  // Directors Dropdown (for MCA or clients with multiple contacts)
  if (state.directors.length > 1 && state.activePortalId === "mca") {
    directorGroup.style.display = "flex";
    directorSelect.innerHTML = "";
    state.directors.forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d.din || d.mcaId || d.name;
      opt.innerText = `${d.name} (${d.din || d.mcaId || "No DIN"})`;
      if (d.name === state.credentials.directorName) opt.selected = true;
      directorSelect.appendChild(opt);
    });
  } else {
    directorGroup.style.display = "none";
  }

  // Fill Inputs
  userIdInput.value = state.credentials.userId || state.credentials.mcaId || state.credentials.pan || "";
  passwordInput.value = state.credentials.password || state.credentials.mcaPassword || "";
}

// Setup Tab Navigation
function setupTabs() {
  const tabFill = document.getElementById("tabFill");
  const tabSearch = document.getElementById("tabSearch");
  const tabSettings = document.getElementById("tabSettings");

  const fillView = document.getElementById("fillView");
  const searchView = document.getElementById("searchView");

  tabFill.addEventListener("click", () => {
    tabFill.classList.add("active");
    tabSearch.classList.remove("active");
    fillView.style.display = "block";
    searchView.style.display = "none";
  });

  tabSearch.addEventListener("click", () => {
    tabSearch.classList.add("active");
    tabFill.classList.remove("active");
    fillView.style.display = "none";
    searchView.style.display = "block";
    document.getElementById("searchInput").focus();
  });

  tabSettings.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
}

// Setup Event Listeners
function setupEventListeners() {
  const copyIdBtn = document.getElementById("copyIdBtn");
  const copyPassBtn = document.getElementById("copyPassBtn");
  const togglePassBtn = document.getElementById("togglePassBtn");
  const passwordInput = document.getElementById("passwordInput");
  const userIdInput = document.getElementById("userIdInput");
  const openAndFillBtn = document.getElementById("openAndFillBtn");
  const fillCurrentTabBtn = document.getElementById("fillCurrentTabBtn");
  const searchInput = document.getElementById("searchInput");
  const directorSelect = document.getElementById("directorSelect");

  copyIdBtn.addEventListener("click", () => {
    if (userIdInput.value) {
      navigator.clipboard.writeText(userIdInput.value);
      showToast("Copied User ID!");
    }
  });

  copyPassBtn.addEventListener("click", () => {
    if (passwordInput.value) {
      navigator.clipboard.writeText(passwordInput.value);
      showToast("Copied Password!");
    }
  });

  togglePassBtn.addEventListener("click", () => {
    passwordInput.type = passwordInput.type === "password" ? "text" : "password";
  });

  directorSelect.addEventListener("change", (e) => {
    const selectedVal = e.target.value;
    const target = state.directors.find((d) => (d.din || d.mcaId || d.name) === selectedVal);
    if (target) {
      state.credentials.directorName = target.name;
      state.credentials.userId = target.din || target.mcaId || state.credentials.userId;
      state.credentials.mcaId = target.din || target.mcaId || state.credentials.mcaId;
      state.credentials.password = target.mcaPassword || state.credentials.password;
      state.credentials.mcaPassword = target.mcaPassword || state.credentials.mcaPassword;
      renderCredentialsCard();
      showToast(`Selected ${target.name}`);
    }
  });

  openAndFillBtn.addEventListener("click", () => {
    const portal = getPortalById(state.activePortalId);
    const creds = {
      ...state.credentials,
      userId: userIdInput.value,
      mcaId: userIdInput.value,
      password: passwordInput.value,
      mcaPassword: passwordInput.value,
    };

    chrome.runtime.sendMessage(
      {
        type: ACTIONS.OPEN_PORTAL_AND_FILL,
        portalId: portal.id,
        credentials: creds,
      },
      (res) => {
        if (res?.success) {
          showToast(`Opening ${portal.name}...`);
        }
      }
    );
  });

  fillCurrentTabBtn.addEventListener("click", () => {
    const creds = {
      ...state.credentials,
      userId: userIdInput.value,
      mcaId: userIdInput.value,
      password: passwordInput.value,
      mcaPassword: passwordInput.value,
    };

    chrome.runtime.sendMessage(
      {
        type: ACTIONS.FILL_CURRENT_TAB,
        credentials: creds,
      },
      (res) => {
        if (res?.success) {
          showToast("Form filled!");
        } else {
          showToast(res?.error || "Could not fill tab");
        }
      }
    );
  });

  // Debounced search
  let debounceTimer = null;
  searchInput.addEventListener("input", (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      performSearch(e.target.value);
    }, 250);
  });
}

// Search Clients
function performSearch(query) {
  const resultsContainer = document.getElementById("searchResults");
  if (!query || !query.trim()) {
    resultsContainer.innerHTML = '<div class="empty-hint">Type PAN (e.g. ABCDE1234F) or Name to search clients.</div>';
    return;
  }

  resultsContainer.innerHTML = '<div class="empty-hint">Searching...</div>';

  chrome.runtime.sendMessage({ type: ACTIONS.SEARCH_CLIENTS, query }, (res) => {
    const items = res?.results || [];
    if (items.length === 0) {
      resultsContainer.innerHTML = '<div class="empty-hint">No clients matching your search query.</div>';
      return;
    }

    resultsContainer.innerHTML = "";
    items.forEach((c) => {
      const item = document.createElement("div");
      item.className = "search-item";
      item.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <strong style="font-size: 12px; color: var(--text-main);">${c.name}</strong>
          <span style="font-family: monospace; font-size: 11px; color: var(--primary); font-weight: 700;">${c.pan || "No PAN"}</span>
        </div>
        <div style="font-size: 10.5px; color: var(--text-muted); margin-top: 2px;">
          ${c.contacts?.length ? `${c.contacts.length} Director(s)` : (c.type || "Client")}
        </div>
      `;

      item.addEventListener("click", () => {
        selectClient(c);
      });

      resultsContainer.appendChild(item);
    });
  });
}

function selectClient(client) {
  chrome.runtime.sendMessage({ type: ACTIONS.SET_ACTIVE_CLIENT, client }, () => {
    state.client = client;
    loadPopupData();
    // Switch to fill tab
    document.getElementById("tabFill").click();
    showToast(`Loaded ${client.name}`);
  });
}

// Toast helper
function showToast(text) {
  const toast = document.getElementById("statusToast");
  toast.innerText = text;
  toast.style.display = "block";
  setTimeout(() => {
    toast.style.display = "none";
  }, 2200);
}
