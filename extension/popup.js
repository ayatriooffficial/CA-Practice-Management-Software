// CA Practice Management - MCA Auto-Fill Extension Popup Script

document.addEventListener("DOMContentLoaded", () => {
  const mcaIdInput = document.getElementById("mcaIdInput");
  const mcaPasswordInput = document.getElementById("mcaPasswordInput");
  const clientTitle = document.getElementById("clientTitle");
  const clientPanBadge = document.getElementById("clientPanBadge");
  const directorSelect = document.getElementById("directorSelect");
  const directorSelectGroup = document.getElementById("directorSelectGroup");

  const fillTabBtn = document.getElementById("fillTabBtn");
  const searchTabBtn = document.getElementById("searchTabBtn");
  const detailsTabBtn = document.getElementById("detailsTabBtn");

  const credentialCard = document.getElementById("credentialCard");
  const searchViewSection = document.getElementById("searchViewSection");
  const detailsViewSection = document.getElementById("detailsViewSection");

  const popupSearchInput = document.getElementById("popupSearchInput");
  const popupSearchResults = document.getElementById("popupSearchResults");
  const popupDetailsContent = document.getElementById("popupDetailsContent");

  const copyIdBtn = document.getElementById("copyIdBtn");
  const copyPassBtn = document.getElementById("copyPassBtn");
  const togglePassBtn = document.getElementById("togglePassBtn");
  const openAndFillBtn = document.getElementById("openAndFillBtn");
  const fillCurrentTabBtn = document.getElementById("fillCurrentTabBtn");
  const statusToast = document.getElementById("statusToast");

  let currentActiveClient = null;
  let currentCredentials = {};
  let currentView = "fill"; // "fill" | "search" | "details"

  function showToast(msg, type = "success") {
    statusToast.textContent = msg;
    statusToast.className = `status-toast show ${type === "error" ? "error" : ""}`;
    setTimeout(() => {
      statusToast.className = "status-toast";
    }, 2500);
  }

  // Switch View
  function setView(view) {
    currentView = view;
    fillTabBtn.className = `tab-toggle-btn ${view === "fill" ? "active" : ""}`;
    searchTabBtn.className = `tab-toggle-btn ${view === "search" ? "active" : ""}`;
    detailsTabBtn.className = `tab-toggle-btn ${view === "details" ? "active" : ""}`;

    credentialCard.style.display = view === "fill" ? "block" : "none";
    searchViewSection.style.display = view === "search" ? "block" : "none";
    detailsViewSection.style.display = view === "details" ? "block" : "none";

    if (view === "search") {
      popupSearchInput.focus();
    } else if (view === "details") {
      renderDetailsView();
    }
  }

  fillTabBtn.addEventListener("click", () => setView("fill"));
  searchTabBtn.addEventListener("click", () => setView("search"));
  detailsTabBtn.addEventListener("click", () => setView("details"));

  // Helper to get directors
  function getDirectors(client) {
    if (!client) return [];
    const map = new Map();
    (client.contacts || []).forEach((c) => {
      if (c.name) map.set(c.name.trim().toLowerCase(), c);
    });
    (client.customerFiles?.promoter || []).forEach((p) => {
      const k = (p.name || "").trim().toLowerCase();
      if (!map.has(k)) {
        map.set(k, {
          name: p.name,
          designation: p.designation || "Director",
          pan: p.pan,
          din: p.mcaId,
          mcaId: p.mcaId,
          mcaPassword: p.mcaPassword,
        });
      } else {
        const exist = map.get(k);
        map.set(k, {
          ...exist,
          din: exist.din || p.mcaId,
          mcaId: exist.mcaId || p.mcaId,
          mcaPassword: exist.mcaPassword || p.mcaPassword,
        });
      }
    });
    return Array.from(map.values());
  }

  // Update UI with credentials
  function updateCredentialsUI() {
    mcaIdInput.value = currentCredentials.mcaId || "";
    mcaPasswordInput.value = currentCredentials.mcaPassword || "";

    const name = currentCredentials.clientName || currentActiveClient?.name || "Active Credentials";
    const dir = currentCredentials.directorName ? ` • ${currentCredentials.directorName}` : "";
    clientTitle.textContent = `${name}${dir}`;

    const pan = currentCredentials.clientPan || currentActiveClient?.pan || "";
    if (pan) {
      clientPanBadge.textContent = `PAN: ${pan}`;
      clientPanBadge.style.display = "inline-block";
    } else {
      clientPanBadge.style.display = "none";
    }

    // Directors dropdown
    const directors = getDirectors(currentActiveClient);
    if (directors.length > 1) {
      directorSelectGroup.style.display = "block";
      directorSelect.innerHTML = directors
        .map(
          (d) =>
            `<option value="${d.name}" ${d.name === currentCredentials.directorName ? "selected" : ""}>
              ${d.name} ${d.din || d.mcaId ? `(${d.din || d.mcaId})` : ""}
            </option>`
        )
        .join("");
    } else {
      directorSelectGroup.style.display = "none";
    }
  }

  directorSelect.addEventListener("change", (e) => {
    const selectedName = e.target.value;
    const dirs = getDirectors(currentActiveClient);
    const matched = dirs.find((d) => d.name === selectedName);
    if (matched) {
      currentCredentials.directorName = matched.name;
      currentCredentials.mcaId = matched.din || matched.mcaId || currentCredentials.mcaId;
      currentCredentials.mcaPassword = matched.mcaPassword || currentCredentials.mcaPassword;
      updateCredentialsUI();
      saveCurrentInputs();
    }
  });

  // Load Initial Data
  chrome.runtime.sendMessage({ type: "GET_ACTIVE_DATA" }, (res) => {
    currentCredentials = res?.pendingMcaCredentials || res?.lastUsedCredentials || {};
    currentActiveClient = res?.activeClient || null;
    updateCredentialsUI();
  });

  // Save manual inputs
  function saveCurrentInputs() {
    const id = mcaIdInput.value.trim();
    const pass = mcaPasswordInput.value;

    currentCredentials.mcaId = id;
    currentCredentials.mcaPassword = pass;

    chrome.storage.local.set({
      lastUsedCredentials: {
        ...currentCredentials,
        mcaId: id,
        mcaPassword: pass,
        timestamp: Date.now(),
      },
    });
  }

  mcaIdInput.addEventListener("input", saveCurrentInputs);
  mcaPasswordInput.addEventListener("input", saveCurrentInputs);

  // Toggle Password
  togglePassBtn.addEventListener("click", () => {
    const isPass = mcaPasswordInput.type === "password";
    mcaPasswordInput.type = isPass ? "text" : "password";
    togglePassBtn.textContent = isPass ? "🙈" : "👁️";
  });

  // Copy buttons
  copyIdBtn.addEventListener("click", () => {
    if (!mcaIdInput.value) return;
    navigator.clipboard.writeText(mcaIdInput.value).then(() => {
      showToast("MCA ID copied!");
    });
  });

  copyPassBtn.addEventListener("click", () => {
    if (!mcaPasswordInput.value) return;
    navigator.clipboard.writeText(mcaPasswordInput.value).then(() => {
      showToast("MCA Password copied!");
    });
  });

  // Open MCA & Auto-Fill
  openAndFillBtn.addEventListener("click", () => {
    const mcaId = mcaIdInput.value.trim();
    const mcaPassword = mcaPasswordInput.value;

    if (!mcaId) {
      showToast("Please enter an MCA ID first.", "error");
      return;
    }

    chrome.runtime.sendMessage(
      {
        type: "OPEN_MCA_AND_FILL",
        data: {
          mcaId,
          mcaPassword,
          clientName: currentCredentials.clientName || "Client",
          directorName: currentCredentials.directorName || "Director",
          clientPan: currentCredentials.clientPan || "",
        },
      },
      (res) => {
        if (res?.success) {
          showToast("Opening MCA portal...");
        } else {
          showToast("Failed to launch tab.", "error");
        }
      }
    );
  });

  // Fill Current Tab
  fillCurrentTabBtn.addEventListener("click", () => {
    const mcaId = mcaIdInput.value.trim();
    const mcaPassword = mcaPasswordInput.value;

    if (!mcaId) {
      showToast("Please enter an MCA ID first.", "error");
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab || !activeTab.id) {
        showToast("No active tab found.", "error");
        return;
      }

      chrome.tabs.sendMessage(activeTab.id, { type: "FILL_MCA_INPUTS", data: { mcaId, mcaPassword } }, (res) => {
        if (chrome.runtime.lastError || !res) {
          showToast("Make sure you are on the MCA portal page.", "error");
        } else if (res.success) {
          showToast("✓ Fields auto-filled successfully!");
        } else {
          showToast("Login fields not found on current page.", "error");
        }
      });
    });
  });

  // Search Logic
  let searchTimer = null;
  popupSearchInput.addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    const q = e.target.value.trim();
    searchTimer = setTimeout(() => {
      if (!q) {
        popupSearchResults.innerHTML = `<div class="empty-hint">Type PAN ID or Name to search clients.</div>`;
        return;
      }

      popupSearchResults.innerHTML = `<div class="empty-hint">Searching for "${q}"...</div>`;

      chrome.runtime.sendMessage({ type: "SEARCH_CLIENTS", query: q }, (response) => {
        const results = response?.results || [];
        if (results.length === 0) {
          popupSearchResults.innerHTML = `<div class="empty-hint" style="color:#ef4444;">No clients found matching "${q}".</div>`;
          return;
        }

        popupSearchResults.innerHTML = results
          .map((c) => {
            const dirs = getDirectors(c);
            const p = dirs[0] || {};
            return `
            <div class="search-item">
              <div class="search-item-header">
                <strong>${c.name}</strong>
                <span class="pan-badge">${c.pan || "NO PAN"}</span>
              </div>
              <div class="search-item-sub">
                ${dirs.length} Director(s) ${p.name ? `• ${p.name}` : ""}
              </div>
              <div class="search-item-actions">
                <button class="btn-sm-primary pop-select-fill" data-id="${c.id || ""}">⚡ Select & Fill</button>
                <button class="btn-sm-outline pop-select-view" data-id="${c.id || ""}">📋 Details</button>
              </div>
            </div>
          `;
          })
          .join("");

        popupSearchResults.querySelectorAll(".pop-select-fill").forEach((b) => {
          b.addEventListener("click", (evt) => {
            const id = evt.currentTarget.getAttribute("data-id");
            const sel = results.find((c) => (c.id || "") === id);
            if (sel) {
              currentActiveClient = sel;
              const dirs = getDirectors(sel);
              const p = dirs[0] || {};
              currentCredentials = {
                clientName: sel.name,
                clientPan: sel.pan,
                directorName: p.name || "Director",
                mcaId: p.din || p.mcaId || "",
                mcaPassword: p.mcaPassword || "",
              };
              updateCredentialsUI();
              saveCurrentInputs();
              setView("fill");
              showToast(`Selected: ${sel.name}`);
            }
          });
        });

        popupSearchResults.querySelectorAll(".pop-select-view").forEach((b) => {
          b.addEventListener("click", (evt) => {
            const id = evt.currentTarget.getAttribute("data-id");
            const sel = results.find((c) => (c.id || "") === id);
            if (sel) {
              currentActiveClient = sel;
              setView("details");
            }
          });
        });
      });
    }, 250);
  });

  // Details View Renderer
  function renderDetailsView() {
    if (!currentActiveClient) {
      popupDetailsContent.innerHTML = `
        <div class="empty-hint">
          <p>No client details loaded.</p>
          <button type="button" class="btn btn-secondary" id="popGoSearchBtn" style="margin-top:8px;">🔍 Search by PAN ID</button>
        </div>
      `;
      document.getElementById("popGoSearchBtn")?.addEventListener("click", () => setView("search"));
      return;
    }

    const c = currentActiveClient;
    const dirs = getDirectors(c);
    const passwords = c.passwords || [];

    popupDetailsContent.innerHTML = `
      <div class="details-card">
        <div style="font-weight:700; color:#0f172a; margin-bottom:4px;">${c.name}</div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:3px; font-size:10.5px; color:#475569;">
          <div><strong>PAN:</strong> <span style="font-family:monospace;">${c.pan || "-"}</span></div>
          <div><strong>Type:</strong> ${c.type || "-"}</div>
          <div><strong>GSTIN:</strong> <span style="font-family:monospace;">${c.gstin || "-"}</span></div>
          <div><strong>CIN:</strong> <span style="font-family:monospace;">${c.cin || "-"}</span></div>
        </div>
      </div>

      <div class="details-card">
        <strong style="display:block; margin-bottom:6px; color:#0f172a;">Directors & MCA (${dirs.length})</strong>
        <div style="display:flex; flex-direction:column; gap:5px;">
          ${dirs
            .map(
              (d) => `
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:4px; padding:6px; font-size:10.5px;">
              <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                <strong>${d.name}</strong>
                <span style="color:#64748b;">${d.designation || "Director"}</span>
              </div>
              <div style="color:#475569; margin-bottom:4px;">
                DIN/MCA ID: <span style="font-family:monospace; font-weight:600;">${d.din || d.mcaId || "-"}</span> • PAN: ${d.pan || "-"}
              </div>
              <button class="btn btn-secondary pop-fill-dir-btn" data-din="${d.din || d.mcaId || ""}" data-pwd="${d.mcaPassword || ""}" data-name="${d.name}" style="height:22px; font-size:10px;">
                ⚡ Select & Fill As ${d.name}
              </button>
            </div>
          `
            )
            .join("")}
        </div>
      </div>

      ${
        passwords.length > 0
          ? `
        <div class="details-card">
          <strong style="display:block; margin-bottom:6px; color:#0f172a;">Portals (${passwords.length})</strong>
          <div style="display:flex; flex-direction:column; gap:4px;">
            ${passwords
              .map(
                (p) => `
              <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; padding:4px 6px; border-radius:4px; font-size:10.5px;">
                <div>
                  <strong>${p.portal}</strong>
                  <span style="color:#64748b; font-family:monospace;">User: ${p.userId || "-"}</span>
                </div>
                <button class="btn-sm-outline pop-copy-pwd" data-pwd="${p.password || ""}" style="height:20px; font-size:9.5px;">📋 Copy</button>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      `
          : ""
      }
    `;

    popupDetailsContent.querySelectorAll(".pop-fill-dir-btn").forEach((b) => {
      b.addEventListener("click", (evt) => {
        const din = evt.currentTarget.getAttribute("data-din");
        const pwd = evt.currentTarget.getAttribute("data-pwd");
        const name = evt.currentTarget.getAttribute("data-name");

        currentCredentials.mcaId = din;
        currentCredentials.mcaPassword = pwd || "";
        currentCredentials.directorName = name;

        updateCredentialsUI();
        saveCurrentInputs();
        setView("fill");
        showToast(`Selected director: ${name}`);
      });
    });

    popupDetailsContent.querySelectorAll(".pop-copy-pwd").forEach((b) => {
      b.addEventListener("click", (evt) => {
        const pwd = evt.currentTarget.getAttribute("data-pwd");
        if (pwd) {
          navigator.clipboard.writeText(pwd).then(() => {
            showToast("Password copied!");
          });
        }
      });
    });
  }
});
