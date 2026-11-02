// CA Practice Management - MCA Auto-Fill Background Service Worker

const MCA_LOGIN_URL = "https://www.mca.gov.in/content/mca/global/en/foportal/fologin.html";

chrome.runtime.onInstalled.addListener(() => {
  console.log("[CA Practice Extension] Installed successfully.");
});

// Helper to extract MCA credentials from any client object
function extractClientMcaCredentials(client) {
  if (!client) return { mcaId: "", mcaPassword: "", directorName: "" };

  let mcaId = "";
  let mcaPassword = "";
  let directorName = "";

  // 1. Look in contacts
  const contacts = client.contacts || [];
  for (const c of contacts) {
    if (c.mcaId || c.din) {
      mcaId = c.mcaId || c.din;
      mcaPassword = c.mcaPassword || "";
      directorName = c.name || "Director";
      if (mcaPassword) break;
    }
  }

  // 2. Look in promoters
  if (!mcaPassword && client.customerFiles?.promoter) {
    for (const p of client.customerFiles.promoter) {
      if (p.mcaId) {
        if (!mcaId) mcaId = p.mcaId;
        if (!directorName) directorName = p.name || "Director";
        if (p.mcaPassword) {
          mcaPassword = p.mcaPassword;
          directorName = p.name || directorName;
          break;
        }
      }
    }
  }

  // 3. Look in portal passwords
  if (!mcaPassword && client.passwords) {
    const mcaP = client.passwords.find((p) => (p.portal || "").toLowerCase().includes("mca"));
    if (mcaP) {
      if (!mcaId) mcaId = mcaP.userId || "";
      mcaPassword = mcaP.password || "";
      if (!directorName) directorName = mcaP.remarks || "MCA User";
    }
  }

  // 4. Look in statutory
  if (!mcaPassword && client.customerFiles?.statutory) {
    const statP = client.customerFiles.statutory.find((s) => (s.type || "").toLowerCase().includes("mca"));
    if (statP) {
      if (!mcaId) mcaId = statP.userId || statP.idNo || "";
      mcaPassword = statP.password || "";
    }
  }

  return { mcaId, mcaPassword, directorName };
}

// Search utility
function searchClientsList(query, clients = []) {
  if (!query || !query.trim()) return clients.slice(0, 25);
  const q = query.trim().toLowerCase();

  const matched = [];
  for (const c of clients) {
    if (!c) continue;
    const name = (c.name || "").toLowerCase();
    const pan = (c.pan || "").toLowerCase();
    const gstin = (c.gstin || "").toLowerCase();
    const cin = (c.cin || "").toLowerCase();

    const dList = [...(c.contacts || [])];
    (c.customerFiles?.promoter || []).forEach((p) => {
      if (p.name && !dList.some((d) => (d.name || "").toLowerCase() === (p.name || "").toLowerCase())) {
        dList.push({
          name: p.name,
          pan: p.pan,
          din: p.mcaId,
          mcaId: p.mcaId,
          mcaPassword: p.mcaPassword,
          designation: p.designation || "Director",
        });
      }
    });

    const dMatch = dList.some(
      (d) =>
        (d.name || "").toLowerCase().includes(q) ||
        (d.pan || "").toLowerCase().includes(q) ||
        (d.din || d.mcaId || "").toLowerCase().includes(q)
    );

    if (name.includes(q) || pan.includes(q) || gstin.includes(q) || cin.includes(q) || dMatch) {
      matched.push(c);
    }
  }

  // Exact PAN match first
  matched.sort((a, b) => {
    const aPan = (a.pan || "").toLowerCase();
    const bPan = (b.pan || "").toLowerCase();
    if (aPan === q) return -1;
    if (bPan === q) return 1;
    return 0;
  });

  return matched.slice(0, 30);
}

// Listen for messages from web app, popup, or content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 1. Sync Active Client
  if (request.type === "SET_ACTIVE_CLIENT") {
    const client = request.client;
    if (!client) return;

    const creds = extractClientMcaCredentials(client);

    chrome.storage.local.get(["cachedClients"], (res) => {
      let cached = res.cachedClients || [];
      const idx = cached.findIndex((c) => (c.id && c.id === client.id) || (c.pan && c.pan === client.pan));
      if (idx >= 0) {
        cached[idx] = client;
      } else {
        cached.unshift(client);
        if (cached.length > 300) cached.pop();
      }

      chrome.storage.local.set({
        activeClient: client,
        cachedClients: cached,
        pendingMcaCredentials: {
          mcaId: creds.mcaId,
          mcaPassword: creds.mcaPassword,
          clientName: client.name || "Client",
          directorName: creds.directorName || "Director",
          clientPan: client.pan || "",
          timestamp: Date.now(),
          autoFillEnabled: true,
        },
        lastUsedCredentials: {
          mcaId: creds.mcaId,
          mcaPassword: creds.mcaPassword,
          clientName: client.name || "Client",
          directorName: creds.directorName || "Director",
          clientPan: client.pan || "",
          timestamp: Date.now(),
        },
      });
    });

    sendResponse({ success: true });
    return true;
  }

  // 2. Sync All Clients Catalog
  if (request.type === "SYNC_CLIENTS") {
    const incoming = request.clients || [];
    if (!Array.isArray(incoming) || incoming.length === 0) return;

    chrome.storage.local.get(["cachedClients"], (res) => {
      let existing = res.cachedClients || [];
      const map = new Map();
      existing.forEach((c) => {
        const k = c.id || c.pan || c.name;
        if (k) map.set(k, c);
      });
      incoming.forEach((c) => {
        const k = c.id || c.pan || c.name;
        if (k) map.set(k, c);
      });
      const merged = Array.from(map.values()).slice(0, 300);
      chrome.storage.local.set({ cachedClients: merged });
    });

    sendResponse({ success: true });
    return true;
  }

  // 3. Search Clients by PAN / Name / DIN
  if (request.type === "SEARCH_CLIENTS") {
    const query = request.query || "";
    chrome.storage.local.get(["cachedClients"], (res) => {
      let list = res.cachedClients || [];
      if (list.length === 0) {
        // Fallback: attempt to fetch from local API if available
        fetch("http://localhost:5000/api/v1/clients?limit=100").catch(() => fetch("http://localhost:5000/api/clients?limit=100"))
          .then((r) => r.json())
          .then((apiRes) => {
            const apiClients = apiRes?.data || [];
            if (apiClients.length > 0) {
              chrome.storage.local.set({ cachedClients: apiClients });
              sendResponse({ results: searchClientsList(query, apiClients) });
            } else {
              sendResponse({ results: [] });
            }
          })
          .catch(() => {
            sendResponse({ results: [] });
          });
      } else {
        const results = searchClientsList(query, list);
        sendResponse({ results });
      }
    });
    return true; // async
  }

  // 4. Open MCA and Fill
  if (request.type === "OPEN_MCA_AND_FILL") {
    const { mcaId, mcaPassword, clientName, directorName, clientPan } = request.data || {};

    chrome.storage.local.set(
      {
        pendingMcaCredentials: {
          mcaId: mcaId || "",
          mcaPassword: mcaPassword || "",
          clientName: clientName || "Client",
          directorName: directorName || "Director",
          clientPan: clientPan || "",
          timestamp: Date.now(),
          autoFillEnabled: true,
        },
        lastUsedCredentials: {
          mcaId: mcaId || "",
          mcaPassword: mcaPassword || "",
          clientName: clientName || "Client",
          directorName: directorName || "Director",
          clientPan: clientPan || "",
          timestamp: Date.now(),
        },
      },
      () => {
        chrome.tabs.create({ url: MCA_LOGIN_URL }, (newTab) => {
          sendResponse({ success: true, tabId: newTab.id });
        });
      }
    );
    return true;
  }

  // 5. Get Credentials and Active Client
  if (request.type === "GET_ACTIVE_DATA") {
    chrome.storage.local.get(
      ["activeClient", "cachedClients", "pendingMcaCredentials", "lastUsedCredentials", "widgetPosition"],
      (res) => {
        sendResponse(res);
      }
    );
    return true;
  }

  // 7. Get Client GST Periods & Submissions
  if (request.type === "GET_CLIENT_GST_PERIODS") {
    const clientId = request.clientId;
    if (!clientId) {
      sendResponse({ periods: [] });
      return true;
    }

    const storageKey = `gstPeriods_${clientId}`;
    chrome.storage.local.get([storageKey, "selectedGstPeriod"], (stored) => {
      const cached = stored[storageKey] || [];
      const selected = stored.selectedGstPeriod || null;

      // Try fetching from backend
      fetch(`http://localhost:5000/api/v1/gst-links/client/${clientId}/submissions`)
        .then((r) => r.json())
        .then((res) => {
          if (res?.success && Array.isArray(res?.data) && res.data.length > 0) {
            chrome.storage.local.set({ [storageKey]: res.data });
            sendResponse({ periods: res.data, selectedPeriod: selected });
          } else {
            // fallback to getClientLinks
            return fetch(`http://localhost:5000/api/v1/gst-links/client/${clientId}`)
              .then((r2) => r2.json())
              .then((res2) => {
                const links = res2?.data || [];
                const synthesized = links.map((l) => ({
                  period: l.return_period,
                  periodLabel: l.return_period,
                  submissionId: l.submission_id,
                  linkId: l._id,
                  gstin: l.gstin,
                  legalName: l.legal_name,
                  tradeName: l.trade_name,
                  stateCode: l.state_code,
                  status: l.status,
                  turnoverSlab: l.aggregate_turnover_slab,
                  filingFrequency: l.filing_frequency,
                }));
                chrome.storage.local.set({ [storageKey]: synthesized });
                sendResponse({ periods: synthesized, selectedPeriod: selected });
              })
              .catch(() => {
                sendResponse({ periods: cached, selectedPeriod: selected });
              });
          }
        })
        .catch(() => {
          sendResponse({ periods: cached, selectedPeriod: selected });
        });
    });
    return true;
  }

  // 8. Set or Clear Selected GST Period
  if (request.type === "SET_SELECTED_GST_PERIOD") {
    const periodData = request.periodData || null;
    chrome.storage.local.set({ selectedGstPeriod: periodData }, () => {
      sendResponse({ success: true, selectedGstPeriod: periodData });
    });
    return true;
  }

  // 6. Clear Pending Credentials
  if (request.type === "CLEAR_PENDING_CREDENTIALS") {
    chrome.storage.local.remove("pendingMcaCredentials", () => {
      sendResponse({ success: true });
    });
    return true;
  }
});
