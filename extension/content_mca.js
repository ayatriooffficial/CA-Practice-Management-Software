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
      const matches = queryAllDeep(sel);
      const visible = matches.filter(isVisible);
      if (visible.length > 0) return visible[0];
      if (matches.length > 0) return matches[0];
    }

    if (pwdField) {
      const container =
        pwdField.closest("form") ||
        pwdField.closest(".login-form") ||
        pwdField.closest("div[class*='login' i]") ||
        pwdField.parentElement?.parentElement;
      if (container) {
        const textInputs = queryAllDeep("input[type='text'], input[type='email'], input:not([type])", container)
          .filter(isVisible)
          .filter((input) => {
            const name = (input.name || "").toLowerCase();
            const id = (input.id || "").toLowerCase();
            const placeholder = (input.placeholder || "").toLowerCase();
            return !name.includes("captcha") && !id.includes("captcha") && !placeholder.includes("captcha");
          });
        if (textInputs.length > 0) return textInputs[0];
      }

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

    const candidates = queryAllDeep("input[type='text'], input[type='email'], input:not([type])")
      .filter(isVisible)
      .filter((inp) => {
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

  // State
  let currentActiveClient = null;
  let currentCredentials = {};
  let isMinimized = false;
  let activeTab = "fill"; // "fill" | "search" | "details"

  // -------------------------------------------------------------
  // Draggable Floating UI Widget
  // -------------------------------------------------------------
  function createOrUpdateWidget(credentials, clientData) {
    if (window.top !== window.self) return;

    if (credentials) currentCredentials = { ...currentCredentials, ...credentials };
    if (clientData) currentActiveClient = clientData;

    let widget = document.getElementById("ca-practice-mca-widget");
    if (!widget) {
      widget = document.createElement("div");
      widget.id = "ca-practice-mca-widget";
      widget.style.cssText = `
        position: fixed;
        z-index: 2147483647;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 12px;
        box-shadow: 0 12px 30px -5px rgba(0,0,0,0.25), 0 8px 10px -6px rgba(0,0,0,0.1);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 12px;
        color: #1e293b;
        width: 350px;
        max-width: 95vw;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      `;
      document.body.appendChild(widget);

      // Restore saved location
      const savedPos = localStorage.getItem("ca_mca_widget_pos");
      if (savedPos) {
        try {
          const { left, top } = JSON.parse(savedPos);
          if (left !== undefined && top !== undefined) {
            const boundedLeft = Math.max(10, Math.min(window.innerWidth - 360, left));
            const boundedTop = Math.max(10, Math.min(window.innerHeight - 80, top));
            widget.style.left = `${boundedLeft}px`;
            widget.style.top = `${boundedTop}px`;
            widget.style.right = "auto";
            widget.style.bottom = "auto";
          }
        } catch (e) {
          widget.style.bottom = "20px";
          widget.style.right = "20px";
        }
      } else {
        widget.style.bottom = "20px";
        widget.style.right = "20px";
      }

      // Make Draggable
      setupDraggable(widget);
    }

    renderWidgetContent(widget);
  }

  // Setup draggable behavior on the widget header
  function setupDraggable(widget) {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let origLeft = 0;
    let origTop = 0;

    const onMouseDown = (e) => {
      // Don't drag if clicked on input or button
      if (["INPUT", "BUTTON", "A", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;
      if (e.target.closest("button") || e.target.closest("input")) return;

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = widget.getBoundingClientRect();
      origLeft = rect.left;
      origTop = rect.top;

      widget.style.left = `${origLeft}px`;
      widget.style.top = `${origTop}px`;
      widget.style.right = "auto";
      widget.style.bottom = "auto";
      widget.style.userSelect = "none";

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      const width = widget.offsetWidth || 350;
      const height = widget.offsetHeight || 100;

      let newLeft = Math.max(10, Math.min(window.innerWidth - width - 10, origLeft + dx));
      let newTop = Math.max(10, Math.min(window.innerHeight - height - 10, origTop + dy));

      widget.style.left = `${newLeft}px`;
      widget.style.top = `${newTop}px`;
    };

    const onMouseUp = () => {
      if (!isDragging) return;
      isDragging = false;
      widget.style.userSelect = "auto";
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);

      const rect = widget.getBoundingClientRect();
      const pos = { left: rect.left, top: rect.top };
      localStorage.setItem("ca_mca_widget_pos", JSON.stringify(pos));
      chrome.storage?.local?.set({ widgetPosition: pos });
    };

    widget.addEventListener("mousedown", onMouseDown);
  }

  // Render Widget View
  function renderWidgetContent(widget) {
    if (isMinimized) {
      renderMinimizedWidget(widget);
      return;
    }

    const title = currentCredentials?.directorName
      ? `${currentCredentials.directorName}`
      : currentCredentials?.clientName || "MCA Portal";
    const clientName = currentCredentials?.clientName || currentActiveClient?.name || "No Client Selected";
    const panStr = currentCredentials?.clientPan || currentActiveClient?.pan || "";

    const idVal = currentCredentials?.mcaId || "";
    const passVal = currentCredentials?.mcaPassword || "";

    // Extract directors list if available from client
    const directors = getClientDirectors(currentActiveClient);

    widget.innerHTML = `
      <!-- Header / Drag Bar -->
      <div id="ca-w-header" style="cursor: grab; display: flex; align-items: center; justify-content: space-between; background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 10px 14px;">
        <div style="display: flex; align-items: center; gap: 7px; user-select: none;">
          <span style="color: #64748b; font-size: 15px; line-height: 1;" title="Drag to adjust position">⠿</span>
          <div style="width: 20px; height: 20px; border-radius: 4px; background: #31719B; color: #fff; font-size: 10px; font-weight: bold; display: flex; align-items: center; justify-content: center;">CA</div>
          <span style="font-weight: 700; color: #0f172a; font-size: 12.5px;">MCA Assistant</span>
        </div>
        <div style="display: flex; align-items: center; gap: 4px;">
          <button id="ca-w-tab-search" style="height: 24px; padding: 0 7px; border: 1px solid #cbd5e1; border-radius: 4px; background: ${activeTab === "search" ? "#31719B" : "#fff"}; color: ${activeTab === "search" ? "#fff" : "#334155"}; font-size: 11px; font-weight: 600; cursor: pointer;" title="Search Client by PAN / Name">🔍 Search</button>
          <button id="ca-w-tab-details" style="height: 24px; padding: 0 7px; border: 1px solid #cbd5e1; border-radius: 4px; background: ${activeTab === "details" ? "#31719B" : "#fff"}; color: ${activeTab === "details" ? "#fff" : "#334155"}; font-size: 11px; font-weight: 600; cursor: pointer;" title="View all client details">📋 Details</button>
          <button id="ca-w-min" style="width: 24px; height: 24px; border: 1px solid #cbd5e1; border-radius: 4px; background: #fff; color: #64748b; font-size: 13px; line-height: 1; cursor: pointer;" title="Minimize Widget">_</button>
          <button id="ca-w-close" style="width: 24px; height: 24px; border: 1px solid #cbd5e1; border-radius: 4px; background: #fff; color: #94a3b8; font-size: 15px; line-height: 1; cursor: pointer;" title="Close Widget">&times;</button>
        </div>
      </div>

      <!-- Body Container -->
      <div style="padding: 12px 14px; overflow-y: auto; max-height: calc(85vh - 50px);">
        ${renderActiveTabBody(title, clientName, panStr, idVal, passVal, directors)}
      </div>
    `;

    bindWidgetEvents(widget);
  }

  // Minimized state
  function renderMinimizedWidget(widget) {
    const title = currentCredentials?.directorName || currentCredentials?.clientName || "MCA";
    widget.innerHTML = `
      <div id="ca-w-header-min" style="cursor: grab; display: flex; align-items: center; gap: 8px; background: #ffffff; padding: 8px 12px; user-select: none;">
        <span style="color: #64748b; font-size: 15px; line-height: 1;" title="Drag to adjust position">⠿</span>
        <div style="width: 20px; height: 20px; border-radius: 4px; background: #31719B; color: #fff; font-size: 10px; font-weight: bold; display: flex; align-items: center; justify-content: center;">CA</div>
        <span style="font-weight: 700; color: #0f172a; font-size: 12px; max-width: 130px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${title}</span>
        <button id="ca-w-min-fill" style="height: 26px; padding: 0 8px; background: #31719B; color: #fff; border: none; border-radius: 5px; font-weight: 600; font-size: 11px; cursor: pointer;">⚡ Fill</button>
        <button id="ca-w-expand" style="height: 26px; padding: 0 8px; border: 1px solid #cbd5e1; background: #f8fafc; border-radius: 5px; font-size: 11px; font-weight: 600; cursor: pointer;" title="Expand Assistant">＋ Expand</button>
      </div>
    `;

    document.getElementById("ca-w-expand")?.addEventListener("click", () => {
      isMinimized = false;
      renderWidgetContent(widget);
    });

    document.getElementById("ca-w-min-fill")?.addEventListener("click", () => {
      const curId = currentCredentials?.mcaId || "";
      const curPass = currentCredentials?.mcaPassword || "";
      if (curId) {
        window.__caPracticeFill(curId, curPass);
      }
    });
  }

  // Helper to extract all directors from client
  function getClientDirectors(client) {
    if (!client) return [];
    const map = new Map();
    (client.contacts || []).forEach((c) => {
      if (c.name) map.set(c.name.trim().toLowerCase(), c);
    });
    (client.customerFiles?.promoter || []).forEach((p) => {
      const key = (p.name || "").trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          name: p.name,
          designation: p.designation || "Director",
          pan: p.pan,
          din: p.mcaId,
          mcaId: p.mcaId,
          mcaPassword: p.mcaPassword,
        });
      } else {
        const existing = map.get(key);
        map.set(key, {
          ...existing,
          din: existing.din || p.mcaId,
          mcaId: existing.mcaId || p.mcaId,
          mcaPassword: existing.mcaPassword || p.mcaPassword,
        });
      }
    });
    return Array.from(map.values());
  }

  // Active Tab Body Switcher
  function renderActiveTabBody(title, clientName, panStr, idVal, passVal, directors) {
    if (activeTab === "search") {
      return `
        <div>
          <div style="font-weight: 700; color: #0f172a; margin-bottom: 6px; font-size: 12px;">Search Client by PAN / Name / DIN:</div>
          <div style="position: relative; margin-bottom: 8px;">
            <input id="ca-w-search-input" type="text" placeholder="Type PAN ID (e.g. ABCDE1234F) or Name..." style="width: 100%; height: 32px; padding: 0 10px; font-size: 12px; border: 1.5px solid #31719B; border-radius: 6px; box-sizing: border-box; outline: none;">
          </div>
          <div id="ca-w-search-results" style="max-height: 280px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px;">
            <div style="text-align: center; color: #94a3b8; font-size: 11px; padding: 20px 0;">Start typing a PAN ID or Client Name to search.</div>
          </div>
        </div>
      `;
    }

    if (activeTab === "details") {
      return renderClientDetailsView(currentActiveClient);
    }

    // Default "fill" tab
    return `
      <!-- Active Client Banner -->
      <div style="background: #f1f5f9; border-radius: 8px; padding: 8px 10px; margin-bottom: 10px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
          <span style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;">Active Client</span>
          ${panStr ? `<span style="font-size: 10px; font-family: monospace; font-weight: 700; color: #1e293b; background: #e2e8f0; padding: 1px 6px; border-radius: 4px;">PAN: ${panStr}</span>` : ""}
        </div>
        <div style="font-weight: 700; color: #0f172a; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${clientName}
        </div>
      </div>

      <!-- Director Switcher (if multiple) -->
      ${
        directors.length > 1
          ? `
        <div style="margin-bottom: 8px;">
          <label style="font-size: 10.5px; font-weight: 600; color: #64748b; display: block; margin-bottom: 3px;">Select Director:</label>
          <select id="ca-w-director-select" style="width: 100%; height: 28px; font-size: 11.5px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 0 6px; background: #fff; outline: none; cursor: pointer;">
            ${directors
              .map(
                (d) =>
                  `<option value="${d.name}" ${d.name === currentCredentials?.directorName ? "selected" : ""}>
                    ${d.name} ${d.din || d.mcaId ? `(DIN: ${d.din || d.mcaId})` : ""}
                  </option>`
              )
              .join("")}
          </select>
        </div>
      `
          : ""
      }

      <!-- Inputs for User ID & Password -->
      <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px;">
        <div>
          <label style="font-size: 10.5px; font-weight: 600; color: #64748b; display: block; margin-bottom: 2px;">MCA User ID / DIN:</label>
          <input id="ca-w-id" type="text" value="${idVal}" placeholder="Enter MCA User ID / DIN" style="width: 100%; height: 30px; padding: 0 8px; font-family: monospace; font-size: 11.5px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; outline: none;">
        </div>

        <div>
          <label style="font-size: 10.5px; font-weight: 600; color: #64748b; display: block; margin-bottom: 2px;">MCA Password:</label>
          <div style="display: flex; gap: 4px;">
            <input id="ca-w-pass" type="password" value="${passVal}" placeholder="Enter MCA Password" style="flex: 1; height: 30px; padding: 0 8px; font-family: monospace; font-size: 11.5px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; outline: none;">
            <button id="ca-w-toggle" style="height: 30px; padding: 0 8px; border: 1px solid #cbd5e1; background: #f8fafc; border-radius: 6px; font-size: 11px; cursor: pointer;" title="Show/Hide">👁️</button>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div style="display: flex; gap: 6px;">
        <button id="ca-w-fill-btn" style="flex: 1; height: 34px; background: #31719B; color: #fff; border: none; border-radius: 6px; font-weight: 600; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px;">
          ⚡ Auto-Fill Form
        </button>
        <button id="ca-w-copy-btn" style="height: 34px; padding: 0 10px; background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 11px; font-weight: 500; cursor: pointer;" title="Copy Password">
          📋 Pass
        </button>
      </div>

      <div id="ca-w-status" style="margin-top: 8px; font-size: 11px; font-weight: 500; display: none;"></div>
      <div id="ca-w-nav" style="margin-top: 6px; display: none;">
        <a href="https://www.mca.gov.in/content/mca/global/en/foportal/fologin.html" style="color: #31719B; font-size: 11px; text-decoration: underline;">👉 Go to MCA Front-Office Login Page</a>
      </div>
    `;
  }

  // Full Client Details View
  function renderClientDetailsView(client) {
    if (!client) {
      return `
        <div style="padding: 10px 0; text-align: center;">
          <p style="color: #64748b; font-size: 12px; margin-bottom: 10px;">No client details currently selected.</p>
          <button id="ca-w-go-search" style="padding: 6px 12px; background: #31719B; color: #fff; border: none; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer;">🔍 Search by PAN ID</button>
        </div>
      `;
    }

    const directors = getClientDirectors(client);
    const passwords = client.passwords || [];

    return `
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <!-- Header Info Card -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
            <div style="font-weight: 700; color: #0f172a; font-size: 13px;">${client.name}</div>
            <span style="font-size: 10px; background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: 600;">${client.type || "Company"}</span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 11px; color: #475569; margin-top: 6px;">
            <div><strong>PAN:</strong> <span style="font-family: monospace;">${client.pan || "-"}</span></div>
            <div><strong>GSTIN:</strong> <span style="font-family: monospace;">${client.gstin || "-"}</span></div>
            <div><strong>CIN:</strong> <span style="font-family: monospace;">${client.cin || "-"}</span></div>
            <div><strong>Phone:</strong> ${client.phone || "-"}</div>
            <div style="grid-column: span 2;"><strong>Email:</strong> ${client.email || "-"}</div>
          </div>
        </div>

        <!-- Directors & MCA Credentials Card -->
        <div>
          <div style="font-weight: 700; color: #0f172a; font-size: 12px; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between;">
            <span>Directors & MCA Access (${directors.length})</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            ${directors
              .map((d, i) => {
                const din = d.din || d.mcaId || "-";
                const pwd = d.mcaPassword || "";
                return `
                <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; font-size: 11px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <strong style="color: #0f172a;">${d.name}</strong>
                    <span style="font-size: 10px; color: #64748b;">${d.designation || "Director"}</span>
                  </div>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2px; font-size: 10.5px; color: #475569; margin-bottom: 6px;">
                    <div>PAN: <span style="font-family: monospace;">${d.pan || "-"}</span></div>
                    <div>MCA ID/DIN: <span style="font-family: monospace; font-weight: 600;">${din}</span></div>
                    <div style="grid-column: span 2;">Password: <span style="font-family: monospace;">${pwd ? "••••••••" : "Not Set"}</span></div>
                  </div>
                  <button class="ca-fill-director-btn" data-din="${din}" data-pwd="${pwd}" data-name="${d.name}" style="width: 100%; height: 24px; background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; border-radius: 4px; font-weight: 600; font-size: 10.5px; cursor: pointer;">
                    ⚡ Auto-Fill As ${d.name}
                  </button>
                </div>
              `;
              })
              .join("")}
          </div>
        </div>

        <!-- Portal Credentials Card -->
        ${
          passwords.length > 0
            ? `
          <div>
            <div style="font-weight: 700; color: #0f172a; font-size: 12px; margin-bottom: 6px;">Portal Credentials (${passwords.length})</div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              ${passwords
                .map(
                  (p) => `
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; font-size: 11px; display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <strong style="color: #0f172a;">${p.portal}</strong>
                    <div style="font-size: 10px; color: #64748b; font-family: monospace;">User: ${p.userId || "-"}</div>
                  </div>
                  <button class="ca-copy-pwd-btn" data-pwd="${p.password || ""}" style="height: 22px; padding: 0 6px; border: 1px solid #cbd5e1; border-radius: 4px; background: #fff; font-size: 10px; cursor: pointer;">
                    📋 Copy Pass
                  </button>
                </div>
              `
                )
                .join("")}
            </div>
          </div>
        `
            : ""
        }

        <button id="ca-w-back-to-fill" style="width: 100%; height: 30px; background: #e2e8f0; color: #1e293b; border: none; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; margin-top: 4px;">
          ← Back to Autofill
        </button>
      </div>
    `;
  }

  // Bind UI Events
  function bindWidgetEvents(widget) {
    document.getElementById("ca-w-close")?.addEventListener("click", () => {
      widget.remove();
    });

    document.getElementById("ca-w-min")?.addEventListener("click", () => {
      isMinimized = true;
      renderWidgetContent(widget);
    });

    document.getElementById("ca-w-tab-search")?.addEventListener("click", () => {
      activeTab = activeTab === "search" ? "fill" : "search";
      renderWidgetContent(widget);
    });

    document.getElementById("ca-w-tab-details")?.addEventListener("click", () => {
      activeTab = activeTab === "details" ? "fill" : "details";
      renderWidgetContent(widget);
    });

    document.getElementById("ca-w-back-to-fill")?.addEventListener("click", () => {
      activeTab = "fill";
      renderWidgetContent(widget);
    });

    document.getElementById("ca-w-go-search")?.addEventListener("click", () => {
      activeTab = "search";
      renderWidgetContent(widget);
    });

    // Toggle Password Visibility
    const passInput = document.getElementById("ca-w-pass");
    const toggleBtn = document.getElementById("ca-w-toggle");
    toggleBtn?.addEventListener("click", () => {
      if (!passInput) return;
      const isPass = passInput.type === "password";
      passInput.type = isPass ? "text" : "password";
      toggleBtn.textContent = isPass ? "🙈" : "👁️";
    });

    // Copy Password Button
    document.getElementById("ca-w-copy-btn")?.addEventListener("click", () => {
      if (passInput?.value) {
        navigator.clipboard.writeText(passInput.value).then(() => {
          showStatus("✓ Password copied to clipboard!", "#16a34a");
        });
      }
    });

    // Copy password in details drawer
    widget.querySelectorAll(".ca-copy-pwd-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const pwd = e.currentTarget.getAttribute("data-pwd");
        if (pwd) {
          navigator.clipboard.writeText(pwd).then(() => {
            btn.textContent = "✓ Copied!";
            setTimeout(() => {
              btn.textContent = "📋 Copy Pass";
            }, 1500);
          });
        }
      });
    });

    // Director selector dropdown
    document.getElementById("ca-w-director-select")?.addEventListener("change", (e) => {
      const selectedName = e.target.value;
      const directors = getClientDirectors(currentActiveClient);
      const matched = directors.find((d) => d.name === selectedName);
      if (matched) {
        currentCredentials = {
          ...currentCredentials,
          mcaId: matched.din || matched.mcaId || currentCredentials.mcaId,
          mcaPassword: matched.mcaPassword || currentCredentials.mcaPassword,
          directorName: matched.name,
        };
        renderWidgetContent(widget);
      }
    });

    // Fill as specific director from details drawer
    widget.querySelectorAll(".ca-fill-director-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const din = e.currentTarget.getAttribute("data-din");
        const pwd = e.currentTarget.getAttribute("data-pwd");
        const name = e.currentTarget.getAttribute("data-name");

        currentCredentials = {
          ...currentCredentials,
          mcaId: din !== "-" ? din : "",
          mcaPassword: pwd || "",
          directorName: name,
        };

        activeTab = "fill";
        renderWidgetContent(widget);

        // Immediately trigger fill
        handleTriggerFill();
      });
    });

    // Trigger fill button
    document.getElementById("ca-w-fill-btn")?.addEventListener("click", handleTriggerFill);

    // Search input typing listener
    const searchInput = document.getElementById("ca-w-search-input");
    if (searchInput) {
      searchInput.focus();
      let debounceTimer = null;
      searchInput.addEventListener("input", (e) => {
        clearTimeout(debounceTimer);
        const query = e.target.value.trim();
        debounceTimer = setTimeout(() => {
          performSearch(query);
        }, 250);
      });
    }

    function showStatus(msg, color = "#16a34a") {
      const statusEl = document.getElementById("ca-w-status");
      if (statusEl) {
        statusEl.style.display = "block";
        statusEl.style.color = color;
        statusEl.textContent = msg;
      }
    }

    function handleTriggerFill() {
      const idInput = document.getElementById("ca-w-id");
      const passInp = document.getElementById("ca-w-pass");
      const curId = idInput?.value.trim() || currentCredentials.mcaId || "";
      const curPass = passInp?.value || currentCredentials.mcaPassword || "";

      if (!curId) {
        showStatus("Please enter an MCA User ID.", "#dc2626");
        return;
      }

      currentCredentials.mcaId = curId;
      currentCredentials.mcaPassword = curPass;

      // Save to chrome storage
      chrome.storage?.local?.set({
        lastUsedCredentials: {
          ...currentCredentials,
          timestamp: Date.now(),
        },
      });

      hasFilledUser = false;
      hasFilledPass = false;
      const res = window.__caPracticeFill(curId, curPass);
      if (res.filledUser) hasFilledUser = true;
      if (res.filledPass) hasFilledPass = true;

      const navEl = document.getElementById("ca-w-nav");
      if (hasFilledUser && hasFilledPass) {
        showStatus("✓ Auto-filled User ID & Password! Enter captcha.", "#16a34a");
        if (navEl) navEl.style.display = "none";
      } else if (hasFilledUser) {
        showStatus(curPass ? "✓ User ID filled. Password field not found." : "✓ User ID auto-filled! Enter captcha.", "#2563eb");
        if (navEl) navEl.style.display = "none";
      } else if (hasFilledPass) {
        showStatus("✓ Password auto-filled! Enter User ID.", "#2563eb");
        if (navEl) navEl.style.display = "none";
      } else {
        showStatus("Login fields not found on this page.", "#dc2626");
        if (navEl) navEl.style.display = "block";
      }
    }

    // Perform live search using chrome.runtime message or local storage
    function performSearch(query) {
      const resultsContainer = document.getElementById("ca-w-search-results");
      if (!resultsContainer) return;

      if (!query) {
        resultsContainer.innerHTML = `<div style="text-align: center; color: #94a3b8; font-size: 11px; padding: 20px 0;">Start typing a PAN ID or Client Name to search.</div>`;
        return;
      }

      resultsContainer.innerHTML = `<div style="text-align: center; color: #64748b; font-size: 11px; padding: 15px 0;">Searching for "${query}"...</div>`;

      chrome.runtime?.sendMessage({ type: "SEARCH_CLIENTS", query }, (response) => {
        const results = response?.results || [];
        if (results.length === 0) {
          resultsContainer.innerHTML = `<div style="text-align: center; color: #ef4444; font-size: 11px; padding: 15px 0;">No clients found matching "${query}".</div>`;
          return;
        }

        resultsContainer.innerHTML = results
          .map((client) => {
            const directors = getClientDirectors(client);
            const primaryDir = directors[0] || {};
            return `
            <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; display: flex; flex-direction: column; gap: 4px;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <strong style="color: #0f172a; font-size: 12px;">${client.name}</strong>
                <span style="font-family: monospace; font-size: 10px; font-weight: 700; background: #e2e8f0; color: #0f172a; padding: 1px 5px; border-radius: 3px;">
                  ${client.pan || "NO PAN"}
                </span>
              </div>
              <div style="font-size: 10.5px; color: #64748b;">
                ${directors.length} Director(s) ${primaryDir.name ? `• ${primaryDir.name}` : ""}
              </div>
              <div style="display: flex; gap: 4px; margin-top: 4px;">
                <button class="ca-select-client-fill" data-client-id="${client.id || ""}" style="flex: 1; height: 26px; background: #31719B; color: #fff; border: none; border-radius: 4px; font-weight: 600; font-size: 10.5px; cursor: pointer;">
                  ⚡ Auto-Fill
                </button>
                <button class="ca-select-client-view" data-client-id="${client.id || ""}" style="height: 26px; padding: 0 8px; background: #fff; color: #334155; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 10.5px; cursor: pointer;">
                  📋 View
                </button>
              </div>
            </div>
          `;
          })
          .join("");

        // Bind result clicks
        resultsContainer.querySelectorAll(".ca-select-client-fill").forEach((b) => {
          b.addEventListener("click", (e) => {
            const id = e.currentTarget.getAttribute("data-client-id");
            const selected = results.find((c) => (c.id || "") === id);
            if (selected) {
              currentActiveClient = selected;
              const dirs = getClientDirectors(selected);
              const p = dirs[0] || {};
              currentCredentials = {
                clientName: selected.name,
                clientPan: selected.pan,
                directorName: p.name || "Director",
                mcaId: p.din || p.mcaId || "",
                mcaPassword: p.mcaPassword || "",
              };
              activeTab = "fill";
              renderWidgetContent(widget);
              handleTriggerFill();
            }
          });
        });

        resultsContainer.querySelectorAll(".ca-select-client-view").forEach((b) => {
          b.addEventListener("click", (e) => {
            const id = e.currentTarget.getAttribute("data-client-id");
            const selected = results.find((c) => (c.id || "") === id);
            if (selected) {
              currentActiveClient = selected;
              activeTab = "details";
              renderWidgetContent(widget);
            }
          });
        });
      });
    }
  }

  // -------------------------------------------------------------
  // Auto-Fill Runner
  // -------------------------------------------------------------
  let hasFilledUser = false;
  let hasFilledPass = false;

  function tryAutoFill(creds) {
    if (!creds) return false;
    const wantUser = Boolean(creds.mcaId);
    const wantPass = Boolean(creds.mcaPassword);

    if ((hasFilledUser || !wantUser) && (hasFilledPass || !wantPass)) {
      return true;
    }

    const res = window.__caPracticeFill(hasFilledUser ? null : creds.mcaId, hasFilledPass ? null : creds.mcaPassword);

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
    chrome.runtime?.sendMessage({ type: "GET_ACTIVE_DATA" }, (res) => {
      const creds = res?.pendingMcaCredentials || res?.lastUsedCredentials || {};
      const client = res?.activeClient || null;

      createOrUpdateWidget(creds, client);

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
          subtree: true,
        });
      }
    });
  }

  // Listen for direct messages from popup
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
