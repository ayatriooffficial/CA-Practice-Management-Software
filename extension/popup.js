// CA Practice Management - MCA Auto-Fill Extension Popup Script

document.addEventListener("DOMContentLoaded", () => {
  const mcaIdInput = document.getElementById("mcaIdInput");
  const mcaPasswordInput = document.getElementById("mcaPasswordInput");
  const clientTitle = document.getElementById("clientTitle");
  const copyIdBtn = document.getElementById("copyIdBtn");
  const copyPassBtn = document.getElementById("copyPassBtn");
  const togglePassBtn = document.getElementById("togglePassBtn");
  const openAndFillBtn = document.getElementById("openAndFillBtn");
  const fillCurrentTabBtn = document.getElementById("fillCurrentTabBtn");
  const statusToast = document.getElementById("statusToast");

  function showToast(msg, type = "success") {
    statusToast.textContent = msg;
    statusToast.className = `status-toast ${type}`;
    setTimeout(() => {
      statusToast.className = "status-toast";
    }, 2500);
  }

  // Load stored credentials
  chrome.storage.local.get(["pendingMcaCredentials", "lastUsedCredentials"], (res) => {
    const creds = res.pendingMcaCredentials || res.lastUsedCredentials;
    if (creds) {
      if (creds.mcaId) mcaIdInput.value = creds.mcaId;
      if (creds.mcaPassword) mcaPasswordInput.value = creds.mcaPassword;

      const title = creds.directorName
        ? `${creds.directorName} (${creds.clientName || "Client"})`
        : creds.clientName || "Active Credentials";
      clientTitle.textContent = title;
    }
  });

  // Save changes when user edits manually
  function saveCurrentInputs() {
    const id = mcaIdInput.value.trim();
    const pass = mcaPasswordInput.value;

    chrome.storage.local.set({
      lastUsedCredentials: {
        mcaId: id,
        mcaPassword: pass,
        directorName: "Custom",
        clientName: "Manual",
        timestamp: Date.now()
      }
    });
  }

  mcaIdInput.addEventListener("input", saveCurrentInputs);
  mcaPasswordInput.addEventListener("input", saveCurrentInputs);

  // Toggle Password Visibility
  togglePassBtn.addEventListener("click", () => {
    const isPass = mcaPasswordInput.type === "password";
    mcaPasswordInput.type = isPass ? "text" : "password";
    togglePassBtn.textContent = isPass ? "🙈" : "👁️";
  });

  // Copy ID
  copyIdBtn.addEventListener("click", () => {
    if (!mcaIdInput.value) return;
    navigator.clipboard.writeText(mcaIdInput.value).then(() => {
      showToast("MCA ID copied!");
    });
  });

  // Copy Password
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
          directorName: clientTitle.textContent || "Director"
        }
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

  // Helper function injected into all frames on active tab
  function injectedDirectFill(id, pass) {
    if (typeof window.__caPracticeFill === "function") {
      return window.__caPracticeFill(id, pass);
    }

    const pwdInputs = Array.from(document.querySelectorAll("input[type='password']"));
    const specificUser = document.querySelector(
      "input[name='userID'], input[name='userID' i], input[id*='guidetextbox___widget'], input[id*='guidetextbox'], input#userName, input#userId, input[name='userName'], input[name='userId']"
    );
    const specificPwd = document.querySelector(
      "input[id*='guidepasswordbox___widget'], input[id*='guidepasswordbox'], input[type='password'], input[name='password' i]"
    );

    const pwd = specificPwd || pwdInputs.find(el => el.offsetParent !== null) || pwdInputs[0];
    let textInput = specificUser;

    if (!textInput && pwd) {
      const form = pwd.closest("form") || pwd.parentElement?.parentElement;
      if (form) {
        textInput = form.querySelector("input[type='text'], input[type='email'], input:not([type])");
      }
    }

    if (!textInput) {
      textInput = document.querySelector(
        "input#userName, input#userId, input[name='userName'], input[name='userId'], input[placeholder*='user' i]"
      );
    }

    function setVal(inp, val) {
      if (!inp || val === undefined) return;
      inp.focus();
      inp.select();
      try {
        document.execCommand("selectAll", false, null);
        document.execCommand("insertText", false, val);
      } catch (e) {}

      if (inp.value !== val) {
        if (inp._valueTracker) inp._valueTracker.setValue("");
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
        if (setter) setter.call(inp, val);
        else inp.value = val;
      }

      inp.setAttribute("value", val);
      inp.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true, inputType: "insertText", data: val }));
      inp.dispatchEvent(new Event("change", { bubbles: true }));
    }

    let filledUser = false;
    let filledPass = false;

    if (textInput && id) {
      setVal(textInput, id);
      textInput.style.border = "2px solid #16a34a";
      filledUser = true;
    }
    if (pwd && pass) {
      setVal(pwd, pass);
      pwd.style.border = "2px solid #16a34a";
      filledPass = true;
    }

    return { filled: filledUser || filledPass, filledUser, filledPass };
  }

  // Fill Current Tab using direct scripting injection into all frames
  fillCurrentTabBtn.addEventListener("click", () => {
    const mcaId = mcaIdInput.value.trim();
    const mcaPassword = mcaPasswordInput.value;

    if (!mcaId) {
      showToast("No MCA ID entered.", "error");
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab || !activeTab.id) {
        showToast("No active tab found.", "error");
        return;
      }

      chrome.scripting.executeScript(
        {
          target: { tabId: activeTab.id, allFrames: true },
          func: injectedDirectFill,
          args: [mcaId, mcaPassword]
        },
        (results) => {
          if (chrome.runtime.lastError) {
            console.warn("Scripting error:", chrome.runtime.lastError);
            // Fallback to runtime message
            chrome.tabs.sendMessage(activeTab.id, { type: "FILL_MCA_INPUTS", data: { mcaId, mcaPassword } }, (res) => {
              if (res?.success) showToast("✓ Auto-filled MCA login!");
              else showToast("Open MCA Login page first!", "error");
            });
            return;
          }

          const success = results && results.some(r => r.result?.filled || r.result?.filledUser || r.result?.filledPass);
          if (success) {
            showToast("✓ Auto-filled MCA login!");
          } else {
            showToast("Navigate to MCA login page first.", "error");
          }
        }
      );
    });
  });
});

