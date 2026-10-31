// CA Practice Management - MCA Auto-Fill Background Service Worker

const MCA_LOGIN_URL = "https://www.mca.gov.in/content/mca/global/en/foportal/fologin.html";

chrome.runtime.onInstalled.addListener(() => {
  console.log("[CA Practice Extension] Installed successfully.");
});

// Listen for messages from web app or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "OPEN_MCA_AND_FILL") {
    const { mcaId, mcaPassword, clientName, directorName } = request.data || {};

    // Store pending credentials in chrome.storage.local
    chrome.storage.local.set(
      {
        pendingMcaCredentials: {
          mcaId,
          mcaPassword,
          clientName: clientName || "Client",
          directorName: directorName || "Director",
          timestamp: Date.now(),
          autoFillEnabled: true
        },
        lastUsedCredentials: {
          mcaId,
          mcaPassword,
          clientName: clientName || "Client",
          directorName: directorName || "Director",
          timestamp: Date.now()
        }
      },
      () => {
        // Open MCA login page in a new tab
        chrome.tabs.create({ url: MCA_LOGIN_URL }, (newTab) => {
          sendResponse({ success: true, tabId: newTab.id });
        });
      }
    );

    return true; // async sendResponse
  }

  if (request.type === "GET_PENDING_CREDENTIALS") {
    chrome.storage.local.get(["pendingMcaCredentials", "lastUsedCredentials"], (res) => {
      sendResponse(res);
    });
    return true;
  }

  if (request.type === "CLEAR_PENDING_CREDENTIALS") {
    chrome.storage.local.remove("pendingMcaCredentials", () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

