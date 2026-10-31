// CA Practice Management - MCA Portal Auto-Fill Content Script
// Runs on https://*.mca.gov.in/* and https://mca.gov.in/* (including all sub-frames)

(function () {
  console.log("[CA Practice Extension] MCA content script running on:", window.location.href);

  // Helper to determine if an element is visible
  function isVisible(el) {
    if (!el) return false;
    try {
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    } catch (e) {
      return false;
    }
  }

  // Recursive search including Shadow DOM
  function queryAllDeep(selector, root = document) {
    let results = [];
    try {
      results = results.concat(Array.from(root.querySelectorAll(selector)));
      const allElements = root.querySelectorAll("*");
      for (const el of allElements) {
        if (el.shadowRoot) {
          results = results.concat(queryAllDeep(selector, el.shadowRoot));
        }
      }
    } catch (e) {}
    return results;
  }

  // Find all password fields on the page
  function findPasswordFields() {
    const specificPasswordSelectors = [
      "input[id*='guideContainer'][id*='guidepasswordbox']",
      "input[id*='guidepasswordbox___widget']",
      "input[id*='guidepasswordbox']",
      "input[aria-describedby*='guidepasswordbox']",
      "input[name='password' i]",
      "input[name='pwd' i]",
      "input[name='userPassword' i]",
      "input[id*='password' i]",
      "input[type='password']",
      "input#password",
      "input[placeholder*='password' i]",
      "input[aria-label*='password' i]"
    ];

    for (const sel of specificPasswordSelectors) {
      const matches = queryAllDeep(sel);
      const visible = matches.filter(isVisible);
      if (visible.length > 0) return visible;
      if (matches.length > 0) return matches;
    }

    const all = queryAllDeep("input[type='password']");
    const visible = all.filter(isVisible);
    return visible.length > 0 ? visible : all;
  }

  // Find all possible username / user ID fields on the page
  function findUsernameFields(pwdField) {
    // 1. Specific MCA selectors (including MCA AEM Adaptive Forms)
    const specificSelectors = [
      "input[name='userID']",
      "input[name='userID' i]",
      "input[id*='guideContainer'][id*='guidetextbox___widget']",
      "input[id*='guidetextbox___widget']",
      "input[id*='guidetextbox']",
      "input[aria-describedby*='guidetextbox']",
      "input#userName",
      "input[name='userName' i]",
      "input#userId",
      "input[name='userId' i]",
      "input#loginId",
      "input[name='loginId' i]",
      "input[placeholder*='User ID' i]",
      "input[placeholder*='User Name' i]",
      "input[placeholder*='Username' i]",
      "input[placeholder*='Enter User ID' i]",
      "input[placeholder*='Email' i]",
      "input[placeholder*='PAN' i]",
      "input[placeholder*='DIN' i]",
      "input[autocomplete='username']"
    ];

    for (const sel of specificSelectors) {
      const matches = queryAllDeep(sel).filter(isVisible);
      if (matches.length > 0) return matches[0];
    }

    // 2. Look in the same container / form as the password field
    if (pwdField) {
      const container = pwdField.closest("form") || pwdField.closest(".login-form") || pwdField.closest("div[class*='login' i]") || pwdField.parentElement?.parentElement;
      if (container) {
        const textInputs = queryAllDeep("input[type='text'], input[type='email'], input:not([type])", container)
          .filter(isVisible)
          .filter(input => {
            const name = (input.name || "").toLowerCase();
            const id = (input.id || "").toLowerCase();
            const placeholder = (input.placeholder || "").toLowerCase();
            return !name.includes("captcha") && !id.includes("captcha") && !placeholder.includes("captcha");
          });
        if (textInputs.length > 0) return textInputs[0];
      }

      // 3. Fallback: find the visible text input that appears closest before the password field
      const allInputs = queryAllDeep("input");
      const pwdIndex = allInputs.indexOf(pwdField);
      if (pwdIndex > 0) {
        for (let i = pwdIndex - 1; i >= 0; i--) {
          const inp = allInputs[i];
          const type = (inp.type || "text").toLowerCase();
          const name = (inp.name || "").toLowerCase();
          const id = (inp.id || "").toLowerCase();
          if ((type === "text" || type === "email") && isVisible(inp) && !name.includes("captcha") && !id.includes("captcha")) {
            return inp;
          }
        }
      }
    }

    // 4. Ultimate fallback: first visible text input on page that isn't search or captcha
    const candidates = queryAllDeep("input[type='text'], input[type='email'], input:not([type])")
      .filter(isVisible)
      .filter(inp => {
        const str = ((inp.name || "") + " " + (inp.id || "") + " " + (inp.placeholder || "")).toLowerCase();
        return !str.includes("captcha") && !str.includes("search");
      });
    return candidates.length > 0 ? candidates[0] : null;
  }

  // Find Captcha Field
  function findCaptchaField() {
    const selectors = [
      "input#captcha",
      "input[name='captcha']",
      "input#userCaptcha",
      "input[name='userCaptcha']",
      "input[placeholder*='captcha' i]",
      "input[id*='captcha' i]",
      "input[name*='captcha' i]"
    ];
    for (const sel of selectors) {
      const matches = queryAllDeep(sel).filter(isVisible);
      if (matches.length > 0) return matches[0];
    }
    return null;
  }

  // Injects script directly into the page's MAIN execution world to access AEM guideBridge & jQuery
  function injectPageScript(mcaId, mcaPassword) {
    try {
      const script = document.createElement("script");
      script.textContent = `
        (function() {
          var id = ${JSON.stringify(mcaId || "")};
          var pwd = ${JSON.stringify(mcaPassword || "")};

          // 1. Adobe AEM Adaptive Forms GuideBridge
          try {
            if (window.guideBridge) {
              if (id) {
                var u = window.guideBridge.resolveNode("userID") || window.guideBridge.resolveNode("userName");
                if (u) u.value = id;
              }
              if (pwd) {
                var p = window.guideBridge.resolveNode("password") || window.guideBridge.resolveNode("pwd");
                if (p) p.value = pwd;
              }
            }
          } catch(e) {}

          // 2. AEM jQuery Widgets
          try {
            var $ = window.$ || window.jQuery;
            if ($) {
              if (id) {
                $('input[name="userID"], input[id*="guidetextbox___widget"], input[id*="guidetextbox"]').each(function() {
                  this.value = id;
                  $(this).attr("value", id).trigger('input').trigger('change');
                });
              }
              if (pwd) {
                $('input[type="password"], input[id*="guidepasswordbox___widget"], input[id*="guidepasswordbox"], input[name*="password" i]').each(function() {
                  this.value = pwd;
                  $(this).attr("value", pwd).trigger('input').trigger('change');
                });
              }
            }
          } catch(e) {}
        })();
      `;
      (document.head || document.documentElement).appendChild(script);
      script.remove();
    } catch (err) {
      console.warn("[CA Practice] Page script injection note:", err);
    }
  }

  // Set input value cleanly simulating native user keyboard typing
  function setNativeValue(input, value) {
    if (!input || value === undefined || value === null) return false;

    try {
      input.focus();

      // Step 1: Set value directly on prototype
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      const prototype = Object.getPrototypeOf(input);
      const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

      if (prototypeValueSetter && nativeInputValueSetter !== prototypeValueSetter) {
        prototypeValueSetter.call(input, value);
      } else if (nativeInputValueSetter) {
        nativeInputValueSetter.call(input, value);
      } else {
        input.value = value;
      }
      input.setAttribute("value", value);

      // Step 2: Simulate typing for frameworks listening to execCommand
      try {
        input.select();
        document.execCommand("selectAll", false, null);
        document.execCommand("insertText", false, value);
      } catch (e) {}

      // Step 3: Ensure value wasn't wiped
      if (input.value !== value) {
        input.value = value;
        input.setAttribute("value", value);
      }

      // Step 4: Dispatch events
      try {
        input.dispatchEvent(
          new InputEvent("input", {
            bubbles: true,
            cancelable: true,
            inputType: "insertText",
            data: value
          })
        );
      } catch (e) {
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }

      input.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    } catch (err) {
      console.error("[CA Practice] Value setting error:", err);
      input.value = value;
      return true;
    }
  }

  // Execute fill on the page
  window.__caPracticeFill = function (mcaId, mcaPassword) {
    const pwdFields = findPasswordFields();
    const pwdField = pwdFields[0] || null;
    const userField = findUsernameFields(pwdField);
    const captchaField = findCaptchaField();

    let filledUser = false;
    let filledPass = false;

    if (userField && mcaId) {
      setNativeValue(userField, mcaId);
      userField.style.border = "2px solid #16a34a";
      userField.style.backgroundColor = "#f0fdf4";
      filledUser = true;
    }

    if (pwdField && mcaPassword) {
      setNativeValue(pwdField, mcaPassword);
      pwdField.style.border = "2px solid #16a34a";
      pwdField.style.backgroundColor = "#f0fdf4";
      filledPass = true;
    }

    // Also run page-context injection for AEM Adaptive Form model
    injectPageScript(mcaId, mcaPassword);

    if (captchaField) {
      setTimeout(() => {
        captchaField.focus();
        captchaField.style.outline = "2px solid #31719B";
      }, 50);
    }

    console.log("[CA Practice] Fill result:", { filledUser, filledPass, hasCaptcha: !!captchaField, userField, pwdField });
    return { filledUser, filledPass, hasCaptcha: !!captchaField };
  };

  // Build Floating UI Widget (Always rendered on top window)
  function createOrUpdateWidget(credentials) {
    if (window.top !== window.self) return;

    let widget = document.getElementById("ca-practice-mca-widget");
    if (!widget) {
      widget = document.createElement("div");
      widget.id = "ca-practice-mca-widget";
      widget.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 2147483647;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 12px;
        padding: 14px 16px;
        box-shadow: 0 10px 25px -5px rgba(0,0,0,0.25), 0 8px 10px -6px rgba(0,0,0,0.1);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 12px;
        color: #1e293b;
        width: 310px;
      `;
      document.body.appendChild(widget);
    }

    const title = credentials?.directorName
      ? `${credentials.directorName}`
      : credentials?.clientName || "MCA Portal";

    const idVal = credentials?.mcaId || "";
    const passVal = credentials?.mcaPassword || "";

    widget.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 10px;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <div style="width: 22px; height: 22px; border-radius: 5px; background: #31719B; color: #fff; font-size: 11px; font-weight: bold; display: flex; align-items: center; justify-content: center;">CA</div>
          <span style="font-weight: 700; color: #0f172a; font-size: 12.5px;">MCA Auto-Fill Assistant</span>
        </div>
        <button id="ca-w-close" style="background: none; border: none; color: #94a3b8; font-size: 18px; line-height: 1; cursor: pointer; padding: 2px;">&times;</button>
      </div>

      <div style="margin-bottom: 10px;">
        <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">Active: <strong style="color: #0f172a;">${title}</strong></div>
        <div style="display: flex; flex-direction: column; gap: 5px;">
          <input id="ca-w-id" type="text" value="${idVal}" placeholder="Enter MCA User ID / DIN" style="width: 100%; height: 30px; padding: 0 8px; font-family: monospace; font-size: 11.5px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; outline: none;">
          <div style="display: flex; gap: 4px;">
            <input id="ca-w-pass" type="password" value="${passVal}" placeholder="Enter MCA Password" style="flex: 1; height: 30px; padding: 0 8px; font-family: monospace; font-size: 11.5px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; outline: none;">
            <button id="ca-w-toggle" style="height: 30px; padding: 0 8px; border: 1px solid #cbd5e1; background: #f8fafc; border-radius: 6px; font-size: 11px; cursor: pointer;" title="Show/Hide">👁️</button>
          </div>
        </div>
      </div>

      <div style="display: flex; gap: 6px;">
        <button id="ca-w-fill-btn" style="flex: 1; height: 34px; background: #31719B; color: #fff; border: none; border-radius: 6px; font-weight: 600; font-size: 12px; cursor: pointer;">
          ⚡ Auto-Fill Form
        </button>
        <button id="ca-w-copy-btn" style="height: 34px; padding: 0 10px; background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 11px; cursor: pointer;" title="Copy Password">
          📋 Pass
        </button>
      </div>

      <div id="ca-w-status" style="margin-top: 8px; font-size: 11px; font-weight: 500; display: none;"></div>
      <div id="ca-w-nav" style="margin-top: 6px; display: none;">
        <a href="https://www.mca.gov.in/content/mca/global/en/foportal/fologin.html" style="color: #31719B; font-size: 11px; text-decoration: underline;">👉 Go to MCA Front-Office Login Page</a>
      </div>
    `;

    document.getElementById("ca-w-close")?.addEventListener("click", () => {
      widget.remove();
    });

    const idInput = document.getElementById("ca-w-id");
    const passInput = document.getElementById("ca-w-pass");
    const toggleBtn = document.getElementById("ca-w-toggle");
    const fillBtn = document.getElementById("ca-w-fill-btn");
    const copyBtn = document.getElementById("ca-w-copy-btn");
    const statusEl = document.getElementById("ca-w-status");
    const navEl = document.getElementById("ca-w-nav");

    toggleBtn?.addEventListener("click", () => {
      const isPass = passInput.type === "password";
      passInput.type = isPass ? "text" : "password";
      toggleBtn.textContent = isPass ? "🙈" : "👁️";
    });

    copyBtn?.addEventListener("click", () => {
      if (passInput?.value) {
        navigator.clipboard.writeText(passInput.value).then(() => {
          if (statusEl) {
            statusEl.style.display = "block";
            statusEl.style.color = "#16a34a";
            statusEl.textContent = "✓ Password copied to clipboard!";
          }
        });
      }
    });

    function handleTriggerFill() {
      const curId = idInput?.value.trim() || "";
      const curPass = passInput?.value || "";

      if (!curId) {
        if (statusEl) {
          statusEl.style.display = "block";
          statusEl.style.color = "#dc2626";
          statusEl.textContent = "Please enter an MCA User ID.";
        }
        return;
      }

      // Save to storage
      chrome.storage?.local?.set({
        lastUsedCredentials: {
          mcaId: curId,
          mcaPassword: curPass,
          timestamp: Date.now()
        }
      });

      hasFilledUser = false;
      hasFilledPass = false;
      const res = window.__caPracticeFill(curId, curPass);
      if (res.filledUser) hasFilledUser = true;
      if (res.filledPass) hasFilledPass = true;

      if (statusEl) {
        statusEl.style.display = "block";
        if (hasFilledUser && hasFilledPass) {
          statusEl.style.color = "#16a34a";
          statusEl.textContent = "✓ Auto-filled User ID & Password! Enter captcha.";
          if (navEl) navEl.style.display = "none";
        } else if (hasFilledUser) {
          statusEl.style.color = "#2563eb";
          statusEl.textContent = curPass ? "✓ User ID filled. Password field not found." : "✓ User ID auto-filled! Enter captcha.";
          if (navEl) navEl.style.display = "none";
        } else if (hasFilledPass) {
          statusEl.style.color = "#2563eb";
          statusEl.textContent = "✓ Password auto-filled! Enter User ID.";
          if (navEl) navEl.style.display = "none";
        } else {
          statusEl.style.color = "#dc2626";
          statusEl.textContent = "Login fields not found on this page.";
          if (navEl) navEl.style.display = "block";

          // Try clicking 'Sign In' link on MCA homepage if present
          const signInBtn = Array.from(document.querySelectorAll("a, button")).find(el => {
            const txt = (el.textContent || "").trim().toLowerCase();
            return txt === "sign in" || txt === "sign in / sign up" || (el.href && el.href.includes("fologin"));
          });
          if (signInBtn) {
            statusEl.textContent += " Opening login dialog...";
            signInBtn.click();
            setTimeout(handleTriggerFill, 800);
          }
        }
      }
    }

    fillBtn?.addEventListener("click", handleTriggerFill);
  }

  // Auto-fill logic
  let hasFilledUser = false;
  let hasFilledPass = false;

  function tryAutoFill(creds) {
    if (!creds) return false;
    const wantUser = Boolean(creds.mcaId);
    const wantPass = Boolean(creds.mcaPassword);

    // If already fully filled for everything provided, complete
    if ((hasFilledUser || !wantUser) && (hasFilledPass || !wantPass)) {
      return true;
    }

    const res = window.__caPracticeFill(
      hasFilledUser ? null : creds.mcaId,
      hasFilledPass ? null : creds.mcaPassword
    );

    if (res.filledUser) hasFilledUser = true;
    if (res.filledPass) hasFilledPass = true;

    const isFullyFilled = (hasFilledUser || !wantUser) && (hasFilledPass || !wantPass);

    const statusEl = document.getElementById("ca-w-status");
    if (statusEl) {
      statusEl.style.display = "block";
      if (isFullyFilled) {
        statusEl.style.color = "#16a34a";
        statusEl.textContent = "✓ Auto-filled User ID & Password! Enter captcha.";
      } else if (hasFilledUser && wantPass) {
        statusEl.style.color = "#2563eb";
        statusEl.textContent = "✓ User ID filled. Looking for password field...";
      } else if (hasFilledPass && wantUser) {
        statusEl.style.color = "#2563eb";
        statusEl.textContent = "✓ Password filled. Looking for User ID field...";
      }
    }

    return isFullyFilled;
  }

  // Initialize
  function start() {
    chrome.storage?.local?.get(["pendingMcaCredentials", "lastUsedCredentials"], (res) => {
      const creds = res.pendingMcaCredentials || res.lastUsedCredentials || {};

      // Always show floating assistant widget on MCA
      createOrUpdateWidget(creds);

      // Attempt autofill if credentials exist
      if (creds.mcaId || creds.mcaPassword) {
        const alreadyDone = tryAutoFill(creds);
        if (alreadyDone) return;

        let count = 0;
        const interval = setInterval(() => {
          count++;
          const done = tryAutoFill(creds);
          if (done || count > 30) {
            clearInterval(interval);
          }
        }, 500);

        const observer = new MutationObserver(() => {
          const done = tryAutoFill(creds);
          if (done) {
            observer.disconnect();
          }
        });

        observer.observe(document.documentElement || document.body, {
          childList: true,
          subtree: true
        });
      }
    });
  }

  // Listen for messages from popup or background
  chrome.runtime?.onMessage?.addListener((request, sender, sendResponse) => {
    if (request.type === "FILL_MCA_INPUTS") {
      const { mcaId, mcaPassword } = request.data || {};
      const res = window.__caPracticeFill(mcaId, mcaPassword);
      sendResponse({ success: res.filledUser || res.filledPass, details: res });
      return true;
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
