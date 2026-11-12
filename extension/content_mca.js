// CA Practice Management - Universal Compliance Portal Auto-Fill & Assistant Content Script
// Runs on all compliance portals (MCA, GST, E-Way Bill, Income Tax, TRACES, EPFO, ESIC, etc.)
// 100% self-contained: no external import() calls to avoid page CSP restrictions.

(function () {
  if (window.__caPracticeUniversalLoaded) return;
  window.__caPracticeUniversalLoaded = true;

  console.log("[CA Practice Extension] Compliance content script loaded on:", window.location.href);

  // -------------------------------------------------------------
  // 1. PORTAL DEFINITIONS & DETECTION
  // -------------------------------------------------------------
  const PORTAL_CONFIGS = [
    {
      id: "mca",
      name: "MCA Portal",
      fullName: "Ministry of Corporate Affairs (MCA)",
      category: "Corporate & ROC",
      matchDomains: ["mca.gov.in"],
      userInputSelectors: [
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
        "input[placeholder*='PAN' i]",
        "input[placeholder*='DIN' i]",
      ],
      passwordInputSelectors: [
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
      ],
      captchaSelectors: [
        "input[id*='captcha' i]",
        "input[name*='captcha' i]",
        "input[placeholder*='captcha' i]",
        "input#customCaptcha",
        "input.captchaInput",
      ],
    },
    {
      id: "gst",
      name: "GST Portal",
      fullName: "Goods and Services Tax (GST)",
      category: "Taxation",
      matchDomains: ["gst.gov.in"],
      excludeDomains: ["ewaybillgst.gov.in"],
      userInputSelectors: [
        "input#username",
        "input[name='username']",
        "input[name='username' i]",
        "input[id*='username' i]",
        "input[placeholder*='username' i]",
        "input[placeholder*='gstin' i]",
      ],
      passwordInputSelectors: [
        "input#user_pass",
        "input[name='user_pass']",
        "input[name='password' i]",
        "input[id*='password' i]",
        "input[type='password']",
      ],
      captchaSelectors: [
        "input#captcha",
        "input[name='captcha']",
        "input[id*='captcha' i]",
      ],
    },
    {
      id: "ewaybill",
      name: "E-Way Bill System",
      fullName: "GST E-Way Bill System",
      category: "Taxation",
      matchDomains: ["ewaybillgst.gov.in"],
      userInputSelectors: ["input#txt_username", "input[name='username' i]", "input#username", "input[type='text']"],
      passwordInputSelectors: ["input#txt_password", "input[name='password' i]", "input[type='password']"],
      captchaSelectors: ["input#txt_captcha", "input[id*='captcha' i]"],
    },
    {
      id: "incometax",
      name: "Income Tax Portal",
      fullName: "Income Tax e-Filing",
      category: "Taxation",
      matchDomains: ["incometax.gov.in"],
      userInputSelectors: [
        "input#panAdhaarUserId",
        "input[name='panAdhaarUserId']",
        "input[id*='userId' i]",
        "input[placeholder*='PAN' i]",
        "input[placeholder*='Aadhaar' i]",
        "input[placeholder*='User ID' i]",
      ],
      passwordInputSelectors: [
        "input#loginPassword",
        "input[name='password' i]",
        "input[type='password']",
      ],
      captchaSelectors: [
        "input[id*='captcha' i]",
        "input[name*='captcha' i]",
      ],
    },
    {
      id: "traces",
      name: "TRACES Portal",
      fullName: "TRACES (TDS CPC)",
      category: "Taxation",
      matchDomains: ["tdscpc.gov.in"],
      userInputSelectors: ["input#userId", "input[name='userId' i]", "input[name='tan' i]", "input#tan"],
      passwordInputSelectors: ["input#password", "input[name='password' i]", "input[type='password']"],
      captchaSelectors: ["input#captcha", "input[id*='captcha' i]"],
    },
    {
      id: "epfo",
      name: "EPFO Portal",
      fullName: "EPFO Employer Portal",
      category: "Employee & Labour",
      matchDomains: ["epfindia.gov.in"],
      userInputSelectors: ["input#username", "input[name='username' i]", "input#userName"],
      passwordInputSelectors: ["input#password", "input[name='password' i]", "input[type='password']"],
      captchaSelectors: ["input#captcha", "input[id*='captcha' i]"],
    },
    {
      id: "esic",
      name: "ESIC Portal",
      fullName: "ESIC Portal",
      category: "Employee & Labour",
      matchDomains: ["esic.gov.in", "esic.in"],
      userInputSelectors: ["input#txtUserName", "input[name='txtUserName' i]", "input#userName", "input[name='username' i]"],
      passwordInputSelectors: ["input#txtPassword", "input[name='txtPassword' i]", "input[type='password']"],
      captchaSelectors: ["input#txtCaptcha", "input[id*='captcha' i]"],
    },
    {
      id: "shramsuvidha",
      name: "Shram Suvidha",
      fullName: "Shram Suvidha Portal",
      category: "Employee & Labour",
      matchDomains: ["shramsuvidha.gov.in"],
      userInputSelectors: ["input#username", "input[name='username' i]"],
      passwordInputSelectors: ["input#password", "input[type='password']"],
      captchaSelectors: ["input#captcha", "input[id*='captcha' i]"],
    },
    {
      id: "udyam",
      name: "Udyam Registration",
      fullName: "Udyam Registration (MSME)",
      category: "Registrations",
      matchDomains: ["udyamregistration.gov.in"],
      userInputSelectors: ["input#ctl00_ContentPlaceHolder1_txtUdyamNo", "input[id*='txt' i]", "input[type='text']"],
      passwordInputSelectors: ["input[type='password']"],
      captchaSelectors: ["input[id*='captcha' i]"],
    },
    {
      id: "dgft",
      name: "DGFT Portal",
      fullName: "Directorate General of Foreign Trade (DGFT)",
      category: "Import / Export",
      matchDomains: ["dgft.gov.in"],
      userInputSelectors: ["input#username", "input[name='username' i]", "input[type='text']"],
      passwordInputSelectors: ["input#password", "input[name='password' i]", "input[type='password']"],
      captchaSelectors: ["input[id*='captcha' i]"],
    },
    {
      id: "icegate",
      name: "ICEGATE Portal",
      fullName: "ICEGATE (Indian Customs)",
      category: "Import / Export",
      matchDomains: ["icegate.gov.in"],
      userInputSelectors: ["input#username", "input[name='username' i]", "input[type='text']"],
      passwordInputSelectors: ["input#password", "input[name='password' i]", "input[type='password']"],
      captchaSelectors: ["input[id*='captcha' i]"],
    },
    {
      id: "foscos",
      name: "FSSAI FoSCoS",
      fullName: "FSSAI FoSCoS Portal",
      category: "Sector-Specific",
      matchDomains: ["foscos.fssai.gov.in", "fssai.gov.in"],
      userInputSelectors: ["input#username", "input[name='username' i]", "input[type='text']"],
      passwordInputSelectors: ["input#password", "input[type='password']"],
      captchaSelectors: ["input[id*='captcha' i]"],
    },
    {
      id: "gem",
      name: "GeM Portal",
      fullName: "Government e-Marketplace (GeM)",
      category: "Procurement",
      matchDomains: ["gem.gov.in"],
      userInputSelectors: ["input#loginid", "input[name='loginid' i]", "input#username", "input[type='text']"],
      passwordInputSelectors: ["input#password", "input[name='password' i]", "input[type='password']"],
      captchaSelectors: ["input[id*='captcha' i]"],
    },
  ];

  function detectCurrentPortal() {
    const host = window.location.hostname.toLowerCase();
    for (const p of PORTAL_CONFIGS) {
      if (p.excludeDomains && p.excludeDomains.some((d) => host.includes(d))) continue;
      if (p.matchDomains.some((d) => host.includes(d))) return p;
    }
    return {
      id: "generic",
      name: "Portal Auto-Fill",
      fullName: "Government / Compliance Portal",
      category: "Compliance",
      matchDomains: [],
      userInputSelectors: [],
      passwordInputSelectors: [],
      captchaSelectors: [],
    };
  }

  const activePortal = detectCurrentPortal();
  const isMcaPortal = activePortal.id === "mca";

  // -------------------------------------------------------------
  // 2. DOM UTILITIES & DEEP QUERY ENGINE (Supports Shadow DOM)
  // -------------------------------------------------------------
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

  function simulateInput(element, value) {
    if (!element || value === undefined || value === null) return;
    try {
      element.focus();
      element.click();
      if (typeof element.select === "function") {
        try { element.select(); } catch (e) {}
      }

      // React / Angular synthetic event tracker setter bypass
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )?.set;
      if (nativeSetter) {
        nativeSetter.call(element, value);
      } else {
        element.value = value;
      }

      element.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
      element.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
      element.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, composed: true }));
      element.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, composed: true }));
      element.dispatchEvent(new Event("blur", { bubbles: true, composed: true }));
    } catch (err) {
      console.warn("[CA Practice] simulateInput error:", err);
      try { element.value = value; } catch (e) {}
    }
  }

  // -------------------------------------------------------------
  // 3. UNIVERSAL INPUT FINDERS (Specific Portal + Deep Fallbacks)
  // -------------------------------------------------------------
  function findPasswordFields() {
    // 1. Try portal-specific selectors first
    if (activePortal.passwordInputSelectors?.length > 0) {
      for (const sel of activePortal.passwordInputSelectors) {
        const matches = queryAllDeep(sel);
        const visible = matches.filter(isVisible);
        if (visible.length > 0) return visible;
        if (matches.length > 0) return matches;
      }
    }

    // 2. Generic password input search
    const genericSelectors = [
      "input[type='password']",
      "input[name*='password' i]",
      "input[name*='pwd' i]",
      "input[id*='password' i]",
      "input[id*='pwd' i]",
      "input[placeholder*='password' i]",
      "input[aria-label*='password' i]",
    ];

    for (const sel of genericSelectors) {
      const matches = queryAllDeep(sel);
      const visible = matches.filter(isVisible);
      if (visible.length > 0) return visible;
      if (matches.length > 0) return matches;
    }

    return [];
  }

  function findUsernameFields(pwdField) {
    // 1. Try portal-specific selectors first
    if (activePortal.userInputSelectors?.length > 0) {
      for (const sel of activePortal.userInputSelectors) {
        const matches = queryAllDeep(sel);
        const visible = matches.filter(isVisible);
        if (visible.length > 0) return visible[0];
        if (matches.length > 0) return matches[0];
      }
    }

    // 2. Try common specific selectors
    const specificSelectors = [
      "input[name='userID']",
      "input[name='userID' i]",
      "input#userName",
      "input[name='userName' i]",
      "input#username",
      "input[name='username' i]",
      "input#userId",
      "input[name='userId' i]",
      "input#loginId",
      "input[name='loginId' i]",
      "input[placeholder*='User ID' i]",
      "input[placeholder*='User Name' i]",
      "input[placeholder*='Username' i]",
      "input[placeholder*='Enter User ID' i]",
      "input[placeholder*='PAN' i]",
      "input[placeholder*='GSTIN' i]",
      "input[placeholder*='DIN' i]",
      "input[autocomplete='username']",
    ];

    for (const sel of specificSelectors) {
      const matches = queryAllDeep(sel);
      const visible = matches.filter(isVisible);
      if (visible.length > 0) return visible[0];
      if (matches.length > 0) return matches[0];
    }

    // 3. Proximity search: find text input directly preceding password field in the same form/container
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

    // 4. Fallback: first visible text/email input on page that is not captcha
    const candidates = queryAllDeep("input[type='text'], input[type='email'], input:not([type])")
      .filter(isVisible)
      .filter((inp) => {
        const str = ((inp.name || "") + (inp.id || "") + (inp.placeholder || "")).toLowerCase();
        return !str.includes("captcha") && !str.includes("search") && !str.includes("filter");
      });

    return candidates[0] || null;
  }

  function findCaptchaField() {
    if (activePortal.captchaSelectors?.length > 0) {
      for (const sel of activePortal.captchaSelectors) {
        const matches = queryAllDeep(sel).filter(isVisible);
        if (matches.length > 0) return matches[0];
      }
    }
    const generic = queryAllDeep("input[id*='captcha' i], input[name*='captcha' i], input[placeholder*='captcha' i]").filter(isVisible);
    return generic[0] || null;
  }

  // Universal Form Filler Function exposed on window
  window.__caPracticeFill = function (userId, password) {
    console.log(`[CA Practice] Auto-filling on [${activePortal.name}]:`, {
      hasUserId: Boolean(userId),
      hasPassword: Boolean(password),
    });

    const result = {
      filledUser: false,
      filledPass: false,
      userField: null,
      passField: null,
    };

    const pwdFields = findPasswordFields();
    const primaryPwdField = pwdFields[0] || null;
    const userField = findUsernameFields(primaryPwdField);

    // 1. Fill Username / User ID
    if (userId && userField) {
      simulateInput(userField, userId);
      result.filledUser = true;
      result.userField = userField;
    }

    // 2. Fill Password
    if (password && primaryPwdField) {
      simulateInput(primaryPwdField, password);
      result.filledPass = true;
      result.passField = primaryPwdField;
    }

    // 3. Focus CAPTCHA field if present
    setTimeout(() => {
      const captcha = findCaptchaField();
      if (captcha) {
        try {
          captcha.focus();
        } catch (e) {}
      }
    }, 200);

    return result;
  };

  // -------------------------------------------------------------
  // 4. CREDENTIAL EXTRACTION ENGINE (Portal-Aware)
  // -------------------------------------------------------------
  function extractPortalCredentials(client, portalKey = activePortal.id) {
    if (!client) {
      return {
        userId: "",
        password: "",
        mcaId: "",
        mcaPassword: "",
        clientName: "",
        directorName: "",
        clientPan: "",
      };
    }

    const key = (portalKey || "mca").toLowerCase();
    const clientName = client.name || "Client";
    const clientPan = client.pan || "";

    // 1. MCA Portal
    if (key === "mca") {
      let mcaId = "";
      let mcaPassword = "";
      let directorName = "";

      for (const c of client.contacts || []) {
        if (c.mcaId || c.din) {
          mcaId = c.mcaId || c.din;
          mcaPassword = c.mcaPassword || "";
          directorName = c.name || "Director";
          if (mcaPassword) break;
        }
      }

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

      if (!mcaPassword && client.passwords) {
        const mcaP = client.passwords.find((p) => (p.portal || "").toLowerCase().includes("mca"));
        if (mcaP) {
          if (!mcaId) mcaId = mcaP.userId || "";
          mcaPassword = mcaP.password || "";
          if (!directorName) directorName = mcaP.remarks || "MCA User";
        }
      }

      return {
        portalId: "mca",
        userId: mcaId,
        mcaId,
        password: mcaPassword,
        mcaPassword,
        clientName,
        directorName: directorName || "Director",
        clientPan,
      };
    }

    // 2. GST Portal
    if (key === "gst") {
      let userId = client.gstin || "";
      let password = "";

      if (client.passwords) {
        const gstP = client.passwords.find((p) => (p.portal || "").toLowerCase().includes("gst"));
        if (gstP) {
          if (gstP.userId) userId = gstP.userId;
          password = gstP.password || "";
        }
      }

      if (!password && client.customerFiles?.statutory) {
        const gstStat = client.customerFiles.statutory.find((s) => (s.type || "").toLowerCase().includes("gst"));
        if (gstStat) {
          if (gstStat.userId) userId = gstStat.userId;
          password = gstStat.password || "";
        }
      }

      return {
        portalId: "gst",
        userId,
        mcaId: userId,
        password,
        mcaPassword: password,
        clientName,
        directorName: client.contacts?.[0]?.name || "Authorized Signatory",
        clientPan,
      };
    }

    // 3. Income Tax Portal
    if (key === "incometax") {
      let userId = client.pan || "";
      let password = "";

      if (client.passwords) {
        const itP = client.passwords.find((p) => {
          const str = (p.portal || "").toLowerCase();
          return str.includes("income tax") || str.includes("itd") || str.includes("incometax");
        });
        if (itP) {
          if (itP.userId) userId = itP.userId;
          password = itP.password || "";
        }
      }

      return {
        portalId: "incometax",
        userId,
        mcaId: userId,
        password,
        mcaPassword: password,
        clientName,
        directorName: client.contacts?.[0]?.name || "Authorized Signatory",
        clientPan,
      };
    }

    // 4. TRACES Portal
    if (key === "traces") {
      let userId = client.tan || "";
      let password = "";

      if (client.passwords) {
        const trP = client.passwords.find((p) => {
          const str = (p.portal || "").toLowerCase();
          return str.includes("traces") || str.includes("tds");
        });
        if (trP) {
          if (trP.userId) userId = trP.userId;
          password = trP.password || "";
        }
      }

      return {
        portalId: "traces",
        userId,
        mcaId: userId,
        password,
        mcaPassword: password,
        clientName,
        directorName: client.contacts?.[0]?.name || "Authorized Signatory",
        clientPan,
      };
    }

    // 5. Generic / Other Compliance Portals
    let userId = "";
    let password = "";
    const aliases = [key];
    if (key === "ewaybill") aliases.push("eway", "gst");
    if (key === "epfo") aliases.push("epf", "pf");
    if (key === "esic") aliases.push("esi");
    if (key === "udyam") aliases.push("msme");
    if (key === "dgft") aliases.push("iec", "import", "export");

    if (client.passwords && Array.isArray(client.passwords)) {
      const match = client.passwords.find((p) => {
        const pName = (p.portal || "").toLowerCase();
        return aliases.some((a) => pName.includes(a));
      });
      if (match) {
        userId = match.userId || "";
        password = match.password || "";
      }
    }

    if (!userId) {
      if (key === "ewaybill") userId = client.gstin || "";
      else if (key === "udyam" || key === "dgft" || key === "icegate") userId = client.pan || "";
    }

    return {
      portalId: key,
      userId,
      mcaId: userId,
      password,
      mcaPassword: password,
      clientName,
      directorName: client.contacts?.[0]?.name || "Authorized Signatory",
      clientPan,
    };
  }

  function getClientDirectors(client) {
    if (!client) return [];
    const dirs = [];
    const seen = new Set();

    (client.contacts || []).forEach((c) => {
      const key = (c.name || "") + (c.din || c.mcaId || "");
      if (!seen.has(key) && (c.name || c.din || c.mcaId)) {
        seen.add(key);
        dirs.push({
          name: c.name || "Director",
          din: c.din || c.mcaId || "",
          mcaId: c.mcaId || c.din || "",
          mcaPassword: c.mcaPassword || "",
          pan: c.pan || "",
          designation: c.designation || "Director",
        });
      }
    });

    (client.customerFiles?.promoter || []).forEach((p) => {
      const key = (p.name || "") + (p.din || p.mcaId || "");
      if (!seen.has(key) && (p.name || p.din || p.mcaId)) {
        seen.add(key);
        dirs.push({
          name: p.name || "Promoter",
          din: p.din || p.mcaId || "",
          mcaId: p.mcaId || p.din || "",
          mcaPassword: p.mcaPassword || "",
          pan: p.pan || "",
          designation: p.designation || "Director",
        });
      }
    });

    return dirs;
  }

  // -------------------------------------------------------------
  // 5. DRAGGABLE & RESIZABLE FLOATING UI WIDGET
  // -------------------------------------------------------------
  let currentActiveClient = null;
  let currentCredentials = {};
  let activeTab = "fill"; // "fill" | "search" | "details" | "gst" | "mcaReg"
  let isExpanded = false;
  let clientGstPeriods = [];
  let selectedGstPeriod = null;
  let currentWidgetWidth = 460;
  let currentWidgetHeight = 360;

  function loadClientGstPeriods(clientId) {
    if (!clientId) return;
    chrome.runtime?.sendMessage({ type: "GET_CLIENT_GST_PERIODS", clientId }, (res) => {
      if (res?.periods) {
        clientGstPeriods = res.periods;
        if (res.selectedPeriod) {
          selectedGstPeriod = res.selectedPeriod;
        }
        const widget = document.getElementById("ca-practice-mca-widget");
        if (widget) renderWidgetContent(widget);
      }
    });
  }

  function createOrUpdateWidget(credentials, clientData) {
    if (window.top !== window.self) return; // Only run in top window

    if (credentials) currentCredentials = { ...currentCredentials, ...credentials };
    if (clientData) {
      currentActiveClient = clientData;
      loadClientGstPeriods(clientData.id || clientData._id);
    }

    let widget = document.getElementById("ca-practice-mca-widget");
    if (!widget) {
      widget = document.createElement("div");
      widget.id = "ca-practice-mca-widget";
      widget.style.cssText = `
        position: fixed;
        bottom: 16px;
        right: 16px;
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 12px;
        color: #1e293b;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        width: 380px;
        max-width: 95vw;
        user-select: none;
        overflow: hidden;
        transition: width 0.15s ease, height 0.15s ease;
      `;
      document.body.appendChild(widget);

      // Make draggable
      let isDragging = false;
      let startX, startY, origX, origY;

      widget.addEventListener("mousedown", (e) => {
        const handle = e.target.closest("#ca-w-drag-handle");
        if (!handle) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = widget.getBoundingClientRect();
        origX = rect.left;
        origY = rect.top;
        widget.style.transition = "none";
        e.preventDefault();
      });

      window.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        widget.style.left = Math.max(10, Math.min(window.innerWidth - widget.offsetWidth - 10, origX + dx)) + "px";
        widget.style.top = Math.max(10, Math.min(window.innerHeight - widget.offsetHeight - 10, origY + dy)) + "px";
        widget.style.right = "auto";
        widget.style.bottom = "auto";
      });

      window.addEventListener("mouseup", () => {
        if (isDragging) {
          isDragging = false;
          widget.style.transition = "width 0.15s ease, height 0.15s ease";
        }
      });
    }

    renderWidgetContent(widget);
  }

  function renderWidgetContent(widget) {
    const clientName = currentCredentials?.clientName || currentActiveClient?.name || "No Client Selected";
    const panStr = currentCredentials?.clientPan || currentActiveClient?.pan || "";
    const userId = currentCredentials?.userId || currentCredentials?.mcaId || "";
    const password = currentCredentials?.password || currentCredentials?.mcaPassword || "";
    const hasCredentials = Boolean(userId || password);

    const directors = getClientDirectors(currentActiveClient);
    const gstCount = (currentActiveClient?.customerFiles?.gst || []).length || (currentActiveClient?.gstin ? 1 : 0);

    let html = `
      <!-- Slim Top Bar (Always Visible & Draggable) -->
      <div id="ca-w-drag-handle" style="background: linear-gradient(135deg, #0284c7 0%, #1d4ed8 100%); color: #ffffff; padding: 7px 12px; display: flex; align-items: center; justify-content: space-between; cursor: move; border-top-left-radius: 7px; border-top-right-radius: 7px;">
        <div style="display: flex; align-items: center; gap: 8px; overflow: hidden;">
          <div style="background: #ffffff; color: #0284c7; font-weight: 800; font-size: 11px; width: 22px; height: 22px; border-radius: 4px; display: flex; align-items: center; justify-content: center; shrink-0;">
            CA
          </div>
          <div style="overflow: hidden;">
            <div style="font-weight: 700; font-size: 12px; line-height: 1.2; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
              ${activePortal.name}
            </div>
            <div style="font-size: 10px; opacity: 0.9; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
              ${clientName} ${panStr ? `(${panStr})` : ""}
            </div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 4px;">
          ${!isExpanded ? `
            <button id="ca-w-quick-fill" title="Instant Auto-Fill" style="background: #ffffff; color: #0284c7; border: none; border-radius: 4px; font-weight: 700; font-size: 11px; padding: 3px 8px; cursor: pointer; display: flex; align-items: center; gap: 3px;">
              ⚡ Fill
            </button>
          ` : ""}
          <button id="ca-w-toggle-expand" title="${isExpanded ? "Collapse Panel" : "Expand Details"}" style="background: rgba(255,255,255,0.2); color: #fff; border: none; border-radius: 4px; font-size: 12px; width: 24px; height: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
            ${isExpanded ? "▼" : "▲"}
          </button>
          <button id="ca-w-close" title="Close" style="background: transparent; color: #fff; border: none; font-size: 14px; width: 20px; height: 24px; cursor: pointer; opacity: 0.8;">
            ✕
          </button>
        </div>
      </div>
    `;

    // Expanded Multi-Tab View
    if (isExpanded) {
      widget.style.width = `${currentWidgetWidth}px`;

      html += `
        <!-- Navigation Tab Strip -->
        <div style="display: flex; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: 600;">
          <button class="ca-tab-btn ${activeTab === 'fill' ? 'active' : ''}" data-tab="fill" style="flex: 1; padding: 7px 4px; border: none; background: ${activeTab === 'fill' ? '#ffffff' : 'transparent'}; color: ${activeTab === 'fill' ? '#0284c7' : '#64748b'}; border-bottom: 2px solid ${activeTab === 'fill' ? '#0284c7' : 'transparent'}; cursor: pointer;">
            ⚡ Auto-Fill
          </button>
          <button class="ca-tab-btn ${activeTab === 'search' ? 'active' : ''}" data-tab="search" style="flex: 1; padding: 7px 4px; border: none; background: ${activeTab === 'search' ? '#ffffff' : 'transparent'}; color: ${activeTab === 'search' ? '#0284c7' : '#64748b'}; border-bottom: 2px solid ${activeTab === 'search' ? '#0284c7' : 'transparent'}; cursor: pointer;">
            🔍 Search
          </button>
          <button class="ca-tab-btn ${activeTab === 'details' ? 'active' : ''}" data-tab="details" style="flex: 1; padding: 7px 4px; border: none; background: ${activeTab === 'details' ? '#ffffff' : 'transparent'}; color: ${activeTab === 'details' ? '#0284c7' : '#64748b'}; border-bottom: 2px solid ${activeTab === 'details' ? '#0284c7' : 'transparent'}; cursor: pointer;">
            📋 Master
          </button>
          <button class="ca-tab-btn ${activeTab === 'gst' ? 'active' : ''}" data-tab="gst" style="flex: 1; padding: 7px 4px; border: none; background: ${activeTab === 'gst' ? '#ffffff' : 'transparent'}; color: ${activeTab === 'gst' ? '#0284c7' : '#64748b'}; border-bottom: 2px solid ${activeTab === 'gst' ? '#0284c7' : 'transparent'}; cursor: pointer;">
            📊 GST (${gstCount})
          </button>
          ${isMcaPortal ? `
            <button class="ca-tab-btn ${activeTab === 'mcaReg' ? 'active' : ''}" data-tab="mcaReg" style="flex: 1; padding: 7px 4px; border: none; background: ${activeTab === 'mcaReg' ? '#ffffff' : 'transparent'}; color: ${activeTab === 'mcaReg' ? '#0284c7' : '#64748b'}; border-bottom: 2px solid ${activeTab === 'mcaReg' ? '#0284c7' : 'transparent'}; cursor: pointer;">
              📝 MCA Forms
            </button>
          ` : ""}
        </div>

        <div id="ca-w-content-area" style="padding: 12px; max-height: ${currentWidgetHeight - 80}px; overflow-y: auto;">
      `;

      // -------------------------------------------------------------
      // TAB 1: AUTO-FILL
      // -------------------------------------------------------------
      if (activeTab === "fill") {
        html += `
          <!-- Director Selector if multiple directors -->
          ${directors.length > 1 ? `
            <div style="margin-bottom: 10px;">
              <label style="display: block; font-size: 10.5px; font-weight: 600; color: #475569; margin-bottom: 3px;">
                Select Signatory / Director:
              </label>
              <select id="ca-w-director-select" style="width: 100%; padding: 5px 8px; font-size: 11px; border: 1px solid #cbd5e1; border-radius: 5px; background: #fff;">
                ${directors.map((d, idx) => `
                  <option value="${idx}" ${d.name === currentCredentials.directorName ? "selected" : ""}>
                    ${d.name} (${d.din || d.pan || "No DIN"})
                  </option>
                `).join("")}
              </select>
            </div>
          ` : ""}

          <!-- Credentials Fields -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin-bottom: 10px;">
            <div style="margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748b; margin-bottom: 2px;">
                <span>User ID / Login ID:</span>
                <span id="ca-copy-userid" style="color: #0284c7; cursor: pointer; font-weight: 600;">Copy</span>
              </div>
              <input type="text" id="ca-w-input-userid" value="${userId}" placeholder="Enter or paste User ID / DIN" style="width: 100%; padding: 6px 8px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box; font-family: monospace;" />
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748b; margin-bottom: 2px;">
                <span>Password:</span>
                <div>
                  <span id="ca-toggle-pass" style="color: #0284c7; cursor: pointer; font-weight: 600; margin-right: 8px;">Show</span>
                  <span id="ca-copy-pass" style="color: #0284c7; cursor: pointer; font-weight: 600;">Copy</span>
                </div>
              </div>
              <input type="password" id="ca-w-input-pass" value="${password}" placeholder="Enter or paste Password" style="width: 100%; padding: 6px 8px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box; font-family: monospace;" />
            </div>
          </div>

          <!-- Fill Actions -->
          <button id="ca-w-btn-fill" style="width: 100%; padding: 8px 12px; background: linear-gradient(135deg, #0284c7, #2563eb); color: #fff; border: none; border-radius: 6px; font-weight: 700; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 2px 4px rgba(2, 132, 199, 0.25);">
            ⚡ Auto-Fill ${activePortal.name} Login Now
          </button>

          <div id="ca-w-status" style="margin-top: 8px; padding: 6px 10px; font-size: 11px; text-align: center; border-radius: 4px; display: none;"></div>

          <div style="margin-top: 10px; display: flex; align-items: center; justify-content: space-between; font-size: 10.5px; color: #64748b;">
            <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;">
              <input type="checkbox" id="ca-w-opt-autofill" checked />
              <span>Auto-fill inputs on page load</span>
            </label>
            <span id="ca-w-portal-badge" style="background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: 600;">
              ${activePortal.category}
            </span>
          </div>
        `;
      }

      // -------------------------------------------------------------
      // TAB 2: SEARCH CLIENT MASTER
      // -------------------------------------------------------------
      else if (activeTab === "search") {
        html += `
          <div style="margin-bottom: 8px;">
            <input type="text" id="ca-w-search-input" placeholder="Search by PAN, Name, GSTIN, DIN..." style="width: 100%; padding: 7px 10px; font-size: 12px; border: 1px solid #0284c7; border-radius: 6px; box-sizing: border-box; outline: none;" autofocus />
          </div>
          <div id="ca-w-search-results" style="display: flex; flex-direction: column; gap: 6px; max-height: 230px; overflow-y: auto;">
            <div style="text-align: center; color: #94a3b8; padding: 20px 0; font-size: 11px;">
              Type a PAN, Name, or GSTIN to search clients...
            </div>
          </div>
        `;
      }

      // -------------------------------------------------------------
      // TAB 3: CLIENT MASTER DETAILS
      // -------------------------------------------------------------
      else if (activeTab === "details") {
        const c = currentActiveClient;
        if (!c) {
          html += `
            <div style="text-align: center; color: #94a3b8; padding: 30px 0;">
              No client selected. Use the 🔍 Search tab to find and select a client.
            </div>
          `;
        } else {
          html += `
            <div style="display: flex; flex-direction: column; gap: 8px; font-size: 11px;">
              <!-- Client Header Card -->
              <div style="background: #f1f5f9; padding: 8px 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
                <div style="font-weight: 700; font-size: 12.5px; color: #0f172a;">${c.name}</div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; font-size: 10.5px; color: #475569;">
                  <span><b>PAN:</b> ${c.pan || "—"}</span>
                  <span><b>File No:</b> ${c.fileNo || "—"}</span>
                  <span><b>Status:</b> ${c.status || "Active"}</span>
                </div>
              </div>

              <!-- Directors / Signatories -->
              <div>
                <div style="font-weight: 700; font-size: 11px; color: #334155; margin-bottom: 4px;">
                  Directors & Signatories (${directors.length}):
                </div>
                <div style="display: flex; flex-direction: column; gap: 4px;">
                  ${directors.map((d) => `
                    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 5px; padding: 6px 8px; display: flex; justify-content: space-between; align-items: center;">
                      <div>
                        <div style="font-weight: 600; color: #1e293b;">${d.name}</div>
                        <div style="font-size: 10px; color: #64748b;">DIN: ${d.din || d.mcaId || "—"} | PAN: ${d.pan || "—"}</div>
                      </div>
                      <button class="ca-dir-use-btn" data-din="${d.din || d.mcaId || ""}" data-pass="${d.mcaPassword || ""}" data-name="${d.name}" style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; border-radius: 4px; font-size: 10px; font-weight: 600; padding: 3px 6px; cursor: pointer;">
                        Select
                      </button>
                    </div>
                  `).join("")}
                </div>
              </div>

              <!-- Passwords Repository -->
              ${(c.passwords && c.passwords.length > 0) ? `
                <div>
                  <div style="font-weight: 700; font-size: 11px; color: #334155; margin-bottom: 4px;">
                    Portal Credentials (${c.passwords.length}):
                  </div>
                  <div style="display: flex; flex-direction: column; gap: 4px;">
                    ${c.passwords.map((p) => `
                      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 5px; padding: 5px 8px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                          <span style="font-weight: 700; color: #0284c7;">${p.portal || "Portal"}:</span>
                          <span style="font-family: monospace; color: #334155;">${p.userId || "—"}</span>
                        </div>
                        <button class="ca-quick-fill-custom" data-user="${p.userId || ""}" data-pass="${p.password || ""}" style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 10px; padding: 2px 6px; cursor: pointer;">
                          Fill
                        </button>
                      </div>
                    `).join("")}
                  </div>
                </div>
              ` : ""}
            </div>
          `;
        }
      }

      // -------------------------------------------------------------
      // TAB 4: GST DETAILS & RETURN PERIODS
      // -------------------------------------------------------------
      else if (activeTab === "gst") {
        const c = currentActiveClient;
        const gstin = c?.gstin || c?.customerFiles?.gst?.[0]?.gstin || "—";
        const tradeName = c?.customerFiles?.gst?.[0]?.tradeName || c?.name || "—";

        html += `
          <div style="display: flex; flex-direction: column; gap: 8px; font-size: 11px;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px;">
              <div><b>GSTIN:</b> <span style="font-family: monospace; color: #0284c7; font-weight: 700;">${gstin}</span></div>
              <div style="margin-top: 2px;"><b>Trade Name:</b> ${tradeName}</div>
              <div style="margin-top: 2px;"><b>State:</b> ${c?.state || "Active Registered"}</div>
            </div>

            <!-- GST Return Periods -->
            <div>
              <div style="font-weight: 700; font-size: 11px; color: #334155; margin-bottom: 4px;">
                Filing Status & Returns:
              </div>
              ${clientGstPeriods.length === 0 ? `
                <div style="text-align: center; color: #94a3b8; padding: 15px 0; font-size: 10.5px;">
                  No GST return periods recorded for this client.
                </div>
              ` : `
                <div style="display: flex; flex-direction: column; gap: 4px; max-height: 180px; overflow-y: auto;">
                  ${clientGstPeriods.map((p) => `
                    <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 5px; padding: 6px 8px; font-size: 10.5px;">
                      <div style="display: flex; justify-content: space-between; font-weight: 700; color: #1e293b;">
                        <span>${p.period || p.periodLabel || "Return Period"}</span>
                        <span style="color: ${p.status === 'Filed' ? '#16a34a' : '#d97706'};">${p.status || "Pending"}</span>
                      </div>
                      ${p.arn ? `<div style="font-size: 9.5px; color: #64748b; margin-top: 2px;">ARN: ${p.arn}</div>` : ""}
                      ${p.filingDate ? `<div style="font-size: 9.5px; color: #64748b;">Filed on: ${p.filingDate}</div>` : ""}
                    </div>
                  `).join("")}
                </div>
              `}
            </div>
          </div>
        `;
      }

      // -------------------------------------------------------------
      // TAB 5: MCA FORMS / SPICe+ (Active on MCA Portal)
      // -------------------------------------------------------------
      else if (activeTab === "mcaReg" && isMcaPortal) {
        html += `
          <div style="font-size: 11px;">
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 8px; margin-bottom: 8px; color: #166534;">
              <b>MCA V3 / SPICe+ Assistant Active</b>
              <div style="font-size: 10px; margin-top: 2px; color: #15803d;">
                Click any form field on the MCA page, then press <b>Enter</b> to paste matching client information.
              </div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <button id="ca-mca-fill-company" style="padding: 6px 10px; background: #fff; border: 1px solid #cbd5e1; border-radius: 4px; text-align: left; font-size: 11px; cursor: pointer;">
                🏢 Fill Company Details (Name, Capital, Address)
              </button>
              <button id="ca-mca-fill-director" style="padding: 6px 10px; background: #fff; border: 1px solid #cbd5e1; border-radius: 4px; text-align: left; font-size: 11px; cursor: pointer;">
                👤 Fill Director Details (DIN, PAN, Designation)
              </button>
            </div>
          </div>
        `;
      }

      html += `</div>`; // Close content area
    }

    widget.innerHTML = html;
    bindWidgetEvents(widget);
  }

  // -------------------------------------------------------------
  // 6. EVENT BINDINGS FOR WIDGET
  // -------------------------------------------------------------
  function bindWidgetEvents(widget) {
    // Close Button
    widget.querySelector("#ca-w-close")?.addEventListener("click", () => {
      widget.remove();
    });

    // Expand / Collapse
    widget.querySelector("#ca-w-toggle-expand")?.addEventListener("click", () => {
      isExpanded = !isExpanded;
      renderWidgetContent(widget);
    });

    // Quick Fill from Slim Bar
    widget.querySelector("#ca-w-quick-fill")?.addEventListener("click", () => {
      handleTriggerFill();
    });

    // Tab Switches
    widget.querySelectorAll(".ca-tab-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        activeTab = e.currentTarget.getAttribute("data-tab");
        renderWidgetContent(widget);
      });
    });

    // Copy User ID
    widget.querySelector("#ca-copy-userid")?.addEventListener("click", () => {
      const val = widget.querySelector("#ca-w-input-userid")?.value;
      if (val) navigator.clipboard.writeText(val);
    });

    // Toggle Show/Hide Password
    const passInput = widget.querySelector("#ca-w-input-pass");
    const togglePass = widget.querySelector("#ca-toggle-pass");
    if (togglePass && passInput) {
      togglePass.addEventListener("click", () => {
        if (passInput.type === "password") {
          passInput.type = "text";
          togglePass.textContent = "Hide";
        } else {
          passInput.type = "password";
          togglePass.textContent = "Show";
        }
      });
    }

    // Copy Password
    widget.querySelector("#ca-copy-pass")?.addEventListener("click", () => {
      const val = passInput?.value;
      if (val) navigator.clipboard.writeText(val);
    });

    // Director Select
    const dirSelect = widget.querySelector("#ca-w-director-select");
    if (dirSelect) {
      dirSelect.addEventListener("change", (e) => {
        const dirs = getClientDirectors(currentActiveClient);
        const sel = dirs[Number(e.target.value)];
        if (sel) {
          currentCredentials.directorName = sel.name;
          currentCredentials.userId = sel.din || sel.mcaId || sel.pan || currentCredentials.userId;
          currentCredentials.mcaId = sel.din || sel.mcaId || currentCredentials.mcaId;
          currentCredentials.password = sel.mcaPassword || currentCredentials.password;
          currentCredentials.mcaPassword = sel.mcaPassword || currentCredentials.mcaPassword;
          renderWidgetContent(widget);
          handleTriggerFill();
        }
      });
    }

    // Direct Fill Button
    widget.querySelector("#ca-w-btn-fill")?.addEventListener("click", () => {
      const u = widget.querySelector("#ca-w-input-userid")?.value;
      const p = widget.querySelector("#ca-w-input-pass")?.value;
      if (u) currentCredentials.userId = currentCredentials.mcaId = u;
      if (p) currentCredentials.password = currentCredentials.mcaPassword = p;
      handleTriggerFill();
    });

    // Director Pick Buttons in Details Tab
    widget.querySelectorAll(".ca-dir-use-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const dName = e.currentTarget.getAttribute("data-name");
        const dDin = e.currentTarget.getAttribute("data-din");
        const dPass = e.currentTarget.getAttribute("data-pass");
        currentCredentials.directorName = dName;
        if (dDin) currentCredentials.userId = currentCredentials.mcaId = dDin;
        if (dPass) currentCredentials.password = currentCredentials.mcaPassword = dPass;
        activeTab = "fill";
        renderWidgetContent(widget);
        handleTriggerFill();
      });
    });

    // Custom Fill in Details Tab
    widget.querySelectorAll(".ca-quick-fill-custom").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const u = e.currentTarget.getAttribute("data-user");
        const p = e.currentTarget.getAttribute("data-pass");
        if (u) currentCredentials.userId = currentCredentials.mcaId = u;
        if (p) currentCredentials.password = currentCredentials.mcaPassword = p;
        activeTab = "fill";
        renderWidgetContent(widget);
        handleTriggerFill();
      });
    });

    // Search Box Listener
    const searchInput = widget.querySelector("#ca-w-search-input");
    const resultsContainer = widget.querySelector("#ca-w-search-results");

    if (searchInput && resultsContainer) {
      searchInput.addEventListener("input", (e) => {
        const query = e.target.value.trim();
        if (!query) {
          resultsContainer.innerHTML = `
            <div style="text-align: center; color: #94a3b8; padding: 20px 0; font-size: 11px;">
              Type a PAN, Name, or GSTIN to search clients...
            </div>
          `;
          return;
        }

        resultsContainer.innerHTML = `
          <div style="text-align: center; color: #0284c7; padding: 12px 0; font-size: 11px;">
            Searching client database...
          </div>
        `;

        chrome.runtime?.sendMessage({ type: "SEARCH_CLIENTS", query }, (res) => {
          const results = res?.results || [];
          if (results.length === 0) {
            resultsContainer.innerHTML = `
              <div style="text-align: center; color: #ef4444; padding: 15px 0; font-size: 11px;">
                No matching clients found for "${query}".
              </div>
            `;
            return;
          }

          resultsContainer.innerHTML = results.map((client) => {
            const dirs = getClientDirectors(client);
            return `
              <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 7px 10px; display: flex; justify-content: space-between; align-items: center;">
                <div style="overflow: hidden; max-width: 240px;">
                  <div style="font-weight: 700; color: #0f172a; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                    ${client.name}
                  </div>
                  <div style="font-size: 10px; color: #64748b;">
                    PAN: <b>${client.pan || "—"}</b> | ${dirs[0]?.name || "Director"}
                  </div>
                </div>
                <div style="display: flex; gap: 4px;">
                  <button class="ca-select-client-fill" data-client-id="${client.id || client._id || ""}" style="background: linear-gradient(135deg, #0284c7, #2563eb); color: #fff; border: none; border-radius: 4px; padding: 4px 8px; font-size: 10px; font-weight: 700; cursor: pointer;">
                    ⚡ Select & Login
                  </button>
                  <button class="ca-select-client-view" data-client-id="${client.id || client._id || ""}" style="background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; border-radius: 4px; padding: 4px 6px; font-size: 10px; cursor: pointer;">
                    📋 Info
                  </button>
                </div>
              </div>
            `;
          }).join("");

          // Select & Login
          resultsContainer.querySelectorAll(".ca-select-client-fill").forEach((b) => {
            b.addEventListener("click", (ev) => {
              const id = ev.currentTarget.getAttribute("data-client-id");
              const selected = results.find((c) => (c.id || c._id || "") === id);
              if (selected) {
                currentActiveClient = selected;
                loadClientGstPeriods(id);
                currentCredentials = extractPortalCredentials(selected, activePortal.id);
                activeTab = "fill";
                renderWidgetContent(widget);
                handleTriggerFill();
              }
            });
          });

          // Info / Master
          resultsContainer.querySelectorAll(".ca-select-client-view").forEach((b) => {
            b.addEventListener("click", (ev) => {
              const id = ev.currentTarget.getAttribute("data-client-id");
              const selected = results.find((c) => (c.id || c._id || "") === id);
              if (selected) {
                currentActiveClient = selected;
                loadClientGstPeriods(id);
                activeTab = "details";
                renderWidgetContent(widget);
              }
            });
          });
        });
      });
    }
  }

  // -------------------------------------------------------------
  // 7. AUTO-FILL TRIGGER & SPA MUTATION OBSERVER
  // -------------------------------------------------------------
  let hasFilledUser = false;
  let hasFilledPass = false;

  function tryAutoFill(creds) {
    if (!creds) return false;
    const userId = creds.userId || creds.mcaId || "";
    const password = creds.password || creds.mcaPassword || "";

    const wantUser = Boolean(userId);
    const wantPass = Boolean(password);

    if ((hasFilledUser || !wantUser) && (hasFilledPass || !wantPass)) {
      return true;
    }

    const res = window.__caPracticeFill(hasFilledUser ? null : userId, hasFilledPass ? null : password);

    if (res.filledUser) hasFilledUser = true;
    if (res.filledPass) hasFilledPass = true;

    const isFullyFilled = (hasFilledUser || !wantUser) && (hasFilledPass || !wantPass);

    const statusEl = document.getElementById("ca-w-status");
    if (statusEl) {
      statusEl.style.display = "block";
      if (isFullyFilled) {
        statusEl.style.background = "#dcfce7";
        statusEl.style.color = "#15803d";
        statusEl.style.border = "1px solid #bbf7d0";
        statusEl.textContent = "✓ Auto-filled credentials! Enter captcha.";
      } else if (hasFilledUser && wantPass) {
        statusEl.style.background = "#eff6ff";
        statusEl.style.color = "#1d4ed8";
        statusEl.style.border = "1px solid #bfdbfe";
        statusEl.textContent = "✓ User ID filled. Looking for password field...";
      } else if (hasFilledPass && wantUser) {
        statusEl.style.background = "#eff6ff";
        statusEl.style.color = "#1d4ed8";
        statusEl.style.border = "1px solid #bfdbfe";
        statusEl.textContent = "✓ Password filled. Looking for User ID field...";
      }
    }

    return isFullyFilled;
  }

  function handleTriggerFill() {
    hasFilledUser = false;
    hasFilledPass = false;
    tryAutoFill(currentCredentials);
  }

  // -------------------------------------------------------------
  // 8. INITIALIZATION & MESSAGE LISTENER
  // -------------------------------------------------------------
  function start() {
    // 1. Fetch credentials and active client from background service worker
    chrome.runtime?.sendMessage({ type: "GET_ACTIVE_DATA" }, (res) => {
      let client = res?.activeClient || null;
      let creds = res?.pendingMcaCredentials || res?.pendingCredentials || res?.lastUsedCredentials || {};

      // If client exists but no credentials extracted for current portal, extract now
      if (client && (!creds.userId && !creds.mcaId && !creds.password && !creds.mcaPassword)) {
        creds = extractPortalCredentials(client, activePortal.id);
      }

      currentActiveClient = client;
      currentCredentials = creds;

      createOrUpdateWidget(creds, client);

      // 2. Auto-fill on page load if credentials present
      if (creds.userId || creds.mcaId || creds.password || creds.mcaPassword) {
        const alreadyDone = tryAutoFill(creds);
        if (alreadyDone) return;

        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          const done = tryAutoFill(creds);
          if (done || attempts > 30) {
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

    // 2. Direct message listener from popup or web app
    chrome.runtime?.onMessage?.addListener((request, sender, sendResponse) => {
      if (request.type === "FILL_MCA_INPUTS" || request.type === "EXECUTE_AUTO_FILL" || request.type === "AUTOFILL_PORTAL") {
        const data = request.data || request.credentials || {};
        const u = data.userId || data.mcaId || "";
        const p = data.password || data.mcaPassword || "";
        const res = window.__caPracticeFill(u, p);
        sendResponse({ success: res.filledUser || res.filledPass, details: res });
        return true;
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
