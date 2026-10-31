// CA Practice Management - App Content Script Bridge
// Listens for events from the CA Practice Web App and forwards to Extension Background

(function () {
  console.log("[CA Practice Extension Bridge] Active on web app.");

  document.documentElement.dataset.caPracticeExtension = "1.0.1";

  // Broadcast to the web app that extension is installed
  function notifyAppExtensionReady() {
    document.documentElement.dataset.caPracticeExtension = "1.0.1";
    window.postMessage(
      {
        source: "CA_PRACTICE_EXTENSION",
        type: "CA_PRACTICE_EXTENSION_READY",
        version: "1.0.1"
      },
      "*"
    );
  }

  // Notify on load and reply to ping
  notifyAppExtensionReady();

  window.addEventListener("message", (event) => {
    // Only accept messages from the current window
    if (event.source !== window) return;

    if (event.data?.type === "CHECK_CA_PRACTICE_EXTENSION") {
      notifyAppExtensionReady();
      return;
    }

    if (event.data?.type === "CA_PRACTICE_AUTOFILL_MCA") {
      const { mcaId, mcaPassword, clientName, directorName } = event.data;

      console.log("[CA Practice Extension Bridge] Received autofill request:", {
        mcaId: mcaId || "(none)",
        hasPassword: Boolean(mcaPassword),
        passwordLength: mcaPassword ? mcaPassword.length : 0,
        directorName,
        clientName
      });

      if (!mcaId && !mcaPassword) {
        console.warn("[CA Practice Extension Bridge] No MCA credentials provided.");
        return;
      }

      chrome.runtime.sendMessage(
        {
          type: "OPEN_MCA_AND_FILL",
          data: {
            mcaId: mcaId || "",
            mcaPassword: mcaPassword || "",
            clientName: clientName || "",
            directorName: directorName || ""
          }
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error("[CA Practice Extension Bridge] Error:", chrome.runtime.lastError);
            return;
          }

          window.postMessage(
            {
              source: "CA_PRACTICE_EXTENSION",
              type: "CA_PRACTICE_AUTOFILL_STARTED",
              success: response?.success
            },
            "*"
          );
        }
      );
    }
  });
})();

