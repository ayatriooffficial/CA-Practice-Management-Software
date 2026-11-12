// CA Practice Extension - Central Government & Compliance Portal Registry
// Complete 16-Portal Compliance Directory across Corporate, Taxation, Labour, Registrations, IP, Trade & Procurement.

export const PORTAL_CATEGORIES = [
  "All",
  "Corporate & ROC",
  "Taxation",
  "Employee & Labour",
  "Registrations",
  "Intellectual Property",
  "Import / Export",
  "Sector-Specific & Trade",
];

export const PORTALS = [
  // =========================================================================
  // 1. CORPORATE & ROC
  // =========================================================================
  {
    id: "mca",
    category: "Corporate & ROC",
    name: "Ministry of Corporate Affairs (MCA)",
    shortName: "MCA",
    badge: "MCA",
    color: "#0284c7",
    officialUrl: "https://www.mca.gov.in",
    loginUrl: "https://www.mca.gov.in/content/mca/global/en/foportal/fologin.html",
    description: "Company/LLP registration (SPICe+), DIN/DIR-3 KYC, and annual filings (AOC-4, MGT-7).",
    matchPatterns: ["*://*.mca.gov.in/*", "*://mca.gov.in/*"],
    credentialKeys: {
      idKey: "mcaId",
      passwordKey: "mcaPassword",
      nameKey: "directorName",
      idLabel: "MCA User ID / DIN",
      passwordLabel: "MCA Password",
    },
    selectors: {
      userId: [
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
        "input[placeholder*='DIN' i]",
      ],
      password: [
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
      captcha: [
        "input#captcha",
        "input[name='captcha']",
        "input#userCaptcha",
        "input[name='userCaptcha']",
        "input[placeholder*='captcha' i]",
        "input[id*='captcha' i]",
      ],
      submit: [
        "button[type='submit']",
        "input[type='submit']",
        "button#loginButton",
      ],
    },
    adapter: "mca",
  },

  // =========================================================================
  // 2. TAXATION
  // =========================================================================
  {
    id: "gst",
    category: "Taxation",
    name: "Goods and Services Tax (GST)",
    shortName: "GST",
    badge: "GST",
    color: "#7c3aed",
    officialUrl: "https://www.gst.gov.in",
    loginUrl: "https://services.gst.gov.in/services/login",
    description: "GSTIN registration, monthly/quarterly returns (GSTR-1, GSTR-3B), and ITC reconciliation.",
    matchPatterns: ["*://*.gst.gov.in/*", "*://gst.gov.in/*"],
    credentialKeys: {
      idKey: "gstUsername",
      passwordKey: "gstPassword",
      nameKey: "clientName",
      idLabel: "GST Username",
      passwordLabel: "GST Password",
    },
    selectors: {
      userId: [
        "input#username",
        "input[name='username']",
        "input[placeholder*='Username' i]",
      ],
      password: [
        "input#user_pass",
        "input[name='user_pass']",
        "input[type='password']",
      ],
      captcha: [
        "input#captcha",
        "input[name='captcha']",
        "input[placeholder*='captcha' i]",
      ],
      submit: [
        "button[type='submit']",
        "button.btn-primary",
      ],
    },
    adapter: "gst",
  },
  {
    id: "ewaybill",
    category: "Taxation",
    name: "GST E-Way Bill System",
    shortName: "E-Way Bill",
    badge: "EWB",
    color: "#6366f1",
    officialUrl: "https://ewaybillgst.gov.in",
    loginUrl: "https://ewaybillgst.gov.in/login.aspx",
    description: "Generating e-way bills for movement of goods, consolidated EWB, and transporter tracking.",
    matchPatterns: ["*://*.ewaybillgst.gov.in/*", "*://ewaybillgst.gov.in/*"],
    credentialKeys: {
      idKey: "ewayUsername",
      passwordKey: "ewayPassword",
      nameKey: "clientName",
      idLabel: "E-Way Bill Username",
      passwordLabel: "E-Way Bill Password",
    },
    selectors: {
      userId: [
        "input#txt_username",
        "input[name*='username' i]",
        "input#txtUser",
        "input[placeholder*='Username' i]",
      ],
      password: [
        "input#txt_password",
        "input[name*='password' i]",
        "input#txtPass",
        "input[type='password']",
      ],
      captcha: [
        "input#txt_captcha",
        "input[name*='captcha' i]",
        "input#txtCaptcha",
      ],
      submit: [
        "input#btn_login",
        "button[type='submit']",
        "input[type='submit']",
      ],
    },
    adapter: "universal",
  },
  {
    id: "incometax",
    category: "Taxation",
    name: "Income Tax e-Filing (ITD)",
    shortName: "Income Tax",
    badge: "ITD",
    color: "#16a34a",
    officialUrl: "https://www.incometax.gov.in",
    loginUrl: "https://eportal.incometax.gov.in/iec/foservices/#/login",
    description: "Corporate ITR filings, advance tax, AIS/26AS verification, and PAN/TAN services.",
    matchPatterns: ["*://*.incometax.gov.in/*", "*://incometax.gov.in/*"],
    credentialKeys: {
      idKey: "pan",
      passwordKey: "incomeTaxPassword",
      nameKey: "clientName",
      idLabel: "User ID (PAN / Aadhaar)",
      passwordLabel: "Income Tax Password",
    },
    selectors: {
      userId: [
        "input#panAdhaarUserId",
        "input[name='panAdhaarUserId']",
        "input[placeholder*='PAN' i]",
        "input#userId",
        "input[name='userId' i]",
      ],
      password: [
        "input#loginPassword",
        "input[name='password' i]",
        "input[type='password']",
      ],
      captcha: [
        "input#captcha",
        "input[placeholder*='captcha' i]",
      ],
      submit: [
        "button.mainBtn",
        "button[type='submit']",
        "button[id*='continue' i]",
      ],
    },
    adapter: "incometax",
  },
  {
    id: "traces",
    category: "Taxation",
    name: "TRACES (TDS CPC)",
    shortName: "TRACES",
    badge: "TRACES",
    color: "#ea580c",
    officialUrl: "https://www.tdscpc.gov.in",
    loginUrl: "https://www.tdscpc.gov.in/app/login.xhtml",
    description: "TDS return processing, Form 16/16A downloads, and challan corrections.",
    matchPatterns: ["*://*.tdscpc.gov.in/*", "*://tdscpc.gov.in/*"],
    credentialKeys: {
      idKey: "tracesUserId",
      passwordKey: "tracesPassword",
      nameKey: "clientName",
      idLabel: "TRACES User ID",
      passwordLabel: "TRACES Password",
    },
    selectors: {
      userId: [
        "input#userId",
        "input[name*='userId' i]",
        "input[id*='userId' i]",
      ],
      password: [
        "input#password",
        "input[name*='pass' i]",
        "input[type='password']",
      ],
      captcha: [
        "input#captcha",
        "input[name*='captcha' i]",
      ],
      submit: [
        "input[type='submit']",
        "button[type='submit']",
      ],
    },
    adapter: "traces",
  },

  // =========================================================================
  // 3. EMPLOYEE & LABOUR
  // =========================================================================
  {
    id: "epfo",
    category: "Employee & Labour",
    name: "EPFO Employer Portal",
    shortName: "EPFO",
    badge: "EPFO",
    color: "#059669",
    officialUrl: "https://unifiedportal-emp.epfindia.gov.in",
    loginUrl: "https://unifiedportal-emp.epfindia.gov.in/epfo/",
    description: "Provident Fund (PF) registration, UAN generation, and monthly ECR filings.",
    matchPatterns: ["*://*.epfindia.gov.in/*", "*://epfindia.gov.in/*"],
    credentialKeys: {
      idKey: "epfoUsername",
      passwordKey: "epfoPassword",
      nameKey: "clientName",
      idLabel: "EPFO Establishment Username",
      passwordLabel: "EPFO Password",
    },
    selectors: {
      userId: [
        "input#userName",
        "input[name='userName']",
        "input#username",
        "input[placeholder*='Username' i]",
        "input[placeholder*='User ID' i]",
      ],
      password: [
        "input#password",
        "input[name='password']",
        "input[type='password']",
      ],
      captcha: [
        "input#captcha",
        "input[name='captcha']",
        "input[placeholder*='captcha' i]",
      ],
      submit: [
        "button[type='submit']",
        "input[type='submit']",
        "button#login",
      ],
    },
    adapter: "universal",
  },
  {
    id: "esic",
    category: "Employee & Labour",
    name: "ESIC Portal",
    shortName: "ESIC",
    badge: "ESIC",
    color: "#047857",
    officialUrl: "https://www.esic.gov.in",
    loginUrl: "https://www.esic.in/EmployerPortal/ESICInsurancePortal/Portal_LoginNew.aspx",
    description: "Employee State Insurance registration and monthly medical contribution filings.",
    matchPatterns: ["*://*.esic.gov.in/*", "*://esic.gov.in/*", "*://*.esic.in/*", "*://esic.in/*"],
    credentialKeys: {
      idKey: "esicUsername",
      passwordKey: "esicPassword",
      nameKey: "clientName",
      idLabel: "ESIC Employer User ID",
      passwordLabel: "ESIC Password",
    },
    selectors: {
      userId: [
        "input#txtUserName",
        "input[name*='txtUserName' i]",
        "input#userName",
        "input[placeholder*='User' i]",
      ],
      password: [
        "input#txtPassword",
        "input[name*='txtPassword' i]",
        "input[type='password']",
      ],
      captcha: [
        "input#txtCaptcha",
        "input[name*='captcha' i]",
      ],
      submit: [
        "input#btnLogin",
        "input[type='submit']",
        "button[type='submit']",
      ],
    },
    adapter: "universal",
  },
  {
    id: "shramsuvidha",
    category: "Employee & Labour",
    name: "Shram Suvidha",
    shortName: "Shram Suvidha",
    badge: "SHRAM",
    color: "#0f766e",
    officialUrl: "https://shramsuvidha.gov.in",
    loginUrl: "https://shramsuvidha.gov.in/user/login",
    description: "Unified labour law compliance, labour identification number (LIN), and inspections.",
    matchPatterns: ["*://*.shramsuvidha.gov.in/*", "*://shramsuvidha.gov.in/*"],
    credentialKeys: {
      idKey: "shramUsername",
      passwordKey: "shramPassword",
      nameKey: "clientName",
      idLabel: "Shram Suvidha User ID",
      passwordLabel: "Password",
    },
    selectors: {
      userId: [
        "input#username",
        "input[name='username']",
        "input#loginId",
        "input[placeholder*='User' i]",
      ],
      password: [
        "input#password",
        "input[name='password']",
        "input[type='password']",
      ],
      captcha: [
        "input#captcha",
        "input[name='captcha']",
      ],
      submit: [
        "button[type='submit']",
        "input[type='submit']",
      ],
    },
    adapter: "universal",
  },

  // =========================================================================
  // 4. REGISTRATIONS & APPROVALS
  // =========================================================================
  {
    id: "udyam",
    category: "Registrations",
    name: "Udyam Registration (MSME)",
    shortName: "Udyam MSME",
    badge: "UDYAM",
    color: "#b45309",
    officialUrl: "https://udyamregistration.gov.in",
    loginUrl: "https://udyamregistration.gov.in/Udyam_Login.aspx",
    description: "Official MSME classification for subsidies, priority lending, and payment protection.",
    matchPatterns: ["*://*.udyamregistration.gov.in/*", "*://udyamregistration.gov.in/*"],
    credentialKeys: {
      idKey: "udyamRegNo",
      passwordKey: "mobile",
      nameKey: "clientName",
      idLabel: "Udyam Registration Number",
      passwordLabel: "Mobile / OTP Credential",
    },
    selectors: {
      userId: [
        "input#ctl00_ContentPlaceHolder1_txtUdyamNo",
        "input[name*='txtUdyamNo' i]",
        "input[placeholder*='Udyam' i]",
        "input[type='text']",
      ],
      password: [
        "input#ctl00_ContentPlaceHolder1_txtMobileNo",
        "input[name*='txtMobile' i]",
        "input[type='password']",
      ],
      captcha: [
        "input#ctl00_ContentPlaceHolder1_txtCaptcha",
        "input[name*='captcha' i]",
      ],
      submit: [
        "input[type='submit']",
        "button[type='submit']",
      ],
    },
    adapter: "universal",
  },
  {
    id: "nsws",
    category: "Registrations",
    name: "National Single Window System (NSWS)",
    shortName: "NSWS",
    badge: "NSWS",
    color: "#c2410c",
    officialUrl: "https://www.nsws.gov.in",
    loginUrl: "https://www.nsws.gov.in/portal/login",
    description: "Single-window clearance for central and state business approvals and licenses.",
    matchPatterns: ["*://*.nsws.gov.in/*", "*://nsws.gov.in/*"],
    credentialKeys: {
      idKey: "nswsUsername",
      passwordKey: "nswsPassword",
      nameKey: "clientName",
      idLabel: "NSWS Email / User ID",
      passwordLabel: "Password",
    },
    selectors: {
      userId: [
        "input#username",
        "input[name='username']",
        "input[type='email']",
        "input[placeholder*='Email' i]",
      ],
      password: [
        "input#password",
        "input[name='password']",
        "input[type='password']",
      ],
      captcha: [
        "input#captcha",
        "input[name='captcha']",
      ],
      submit: [
        "button[type='submit']",
      ],
    },
    adapter: "universal",
  },
  {
    id: "startupindia",
    category: "Registrations",
    name: "Startup India",
    shortName: "Startup India",
    badge: "STARTUP",
    color: "#dc2626",
    officialUrl: "https://www.startupindia.gov.in",
    loginUrl: "https://www.startupindia.gov.in/content/sih/en/login.html",
    description: "DPIIT startup recognition, tax exemptions, and seed fund applications.",
    matchPatterns: ["*://*.startupindia.gov.in/*", "*://startupindia.gov.in/*"],
    credentialKeys: {
      idKey: "startupEmail",
      passwordKey: "startupPassword",
      nameKey: "clientName",
      idLabel: "Registered Email",
      passwordLabel: "Password",
    },
    selectors: {
      userId: [
        "input#username",
        "input[name='email']",
        "input[type='email']",
        "input[placeholder*='Email' i]",
      ],
      password: [
        "input#password",
        "input[name='password']",
        "input[type='password']",
      ],
      captcha: [
        "input#captcha",
      ],
      submit: [
        "button[type='submit']",
        "button#submit-btn",
      ],
    },
    adapter: "universal",
  },

  // =========================================================================
  // 5. INTELLECTUAL PROPERTY
  // =========================================================================
  {
    id: "ipindia",
    category: "Intellectual Property",
    name: "IP India (Patents, Designs & Trademarks)",
    shortName: "IP India",
    badge: "IP",
    color: "#8b5cf6",
    officialUrl: "https://ipindia.gov.in",
    loginUrl: "https://ipindiaonline.gov.in/trademarkefiling/user/frmNewUserRegistration.aspx",
    description: "Trademark, patent, copyright, and industrial design registration and searches.",
    matchPatterns: [
      "*://*.ipindia.gov.in/*",
      "*://ipindia.gov.in/*",
      "*://*.ipindiaonline.gov.in/*",
      "*://ipindiaonline.gov.in/*",
    ],
    credentialKeys: {
      idKey: "ipUserId",
      passwordKey: "ipPassword",
      nameKey: "clientName",
      idLabel: "User ID",
      passwordLabel: "Password",
    },
    selectors: {
      userId: [
        "input#txtUsername",
        "input[name*='Username' i]",
        "input#userId",
        "input[placeholder*='User' i]",
      ],
      password: [
        "input#txtPassword",
        "input[name*='Password' i]",
        "input[type='password']",
      ],
      captcha: [
        "input#txtCaptcha",
        "input[name*='captcha' i]",
      ],
      submit: [
        "input[type='submit']",
        "button[type='submit']",
      ],
    },
    adapter: "universal",
  },

  // =========================================================================
  // 6. IMPORT / EXPORT
  // =========================================================================
  {
    id: "dgft",
    category: "Import / Export",
    name: "DGFT (Directorate General of Foreign Trade)",
    shortName: "DGFT",
    badge: "DGFT",
    color: "#0369a1",
    officialUrl: "https://www.dgft.gov.in",
    loginUrl: "https://www.dgft.gov.in/CP/",
    description: "Importer-Exporter Code (IEC) issuance, annual KYC updates, and export incentives.",
    matchPatterns: ["*://*.dgft.gov.in/*", "*://dgft.gov.in/*"],
    credentialKeys: {
      idKey: "dgftUsername",
      passwordKey: "dgftPassword",
      nameKey: "clientName",
      idLabel: "DGFT User ID / Email",
      passwordLabel: "Password",
    },
    selectors: {
      userId: [
        "input#username",
        "input[name='username']",
        "input#loginEmail",
        "input[placeholder*='Username' i]",
      ],
      password: [
        "input#password",
        "input[name='password']",
        "input[type='password']",
      ],
      captcha: [
        "input#captcha",
        "input[name='captcha']",
      ],
      submit: [
        "button[type='submit']",
        "button#loginSubmit",
      ],
    },
    adapter: "universal",
  },
  {
    id: "icegate",
    category: "Import / Export",
    name: "ICEGATE (Indian Customs)",
    shortName: "ICEGATE",
    badge: "ICEGATE",
    color: "#1d4ed8",
    officialUrl: "https://www.icegate.gov.in",
    loginUrl: "https://www.icegate.gov.in/icelogin/loginAction",
    description: "Customs e-filing, shipping bills, and duty payments.",
    matchPatterns: ["*://*.icegate.gov.in/*", "*://icegate.gov.in/*"],
    credentialKeys: {
      idKey: "icegateUserId",
      passwordKey: "icegatePassword",
      nameKey: "clientName",
      idLabel: "ICEGATE User ID",
      passwordLabel: "Password",
    },
    selectors: {
      userId: [
        "input#userId",
        "input[name='userId']",
        "input#loginId",
        "input[placeholder*='User' i]",
      ],
      password: [
        "input#userPassword",
        "input[name='userPassword']",
        "input[type='password']",
      ],
      captcha: [
        "input#captchaText",
        "input[name='captcha' i]",
      ],
      submit: [
        "input[type='submit']",
        "button[type='submit']",
      ],
    },
    adapter: "universal",
  },

  // =========================================================================
  // 7. SECTOR-SPECIFIC & PROCUREMENT
  // =========================================================================
  {
    id: "foscos",
    category: "Sector-Specific & Trade",
    name: "FSSAI FoSCoS (Food Safety)",
    shortName: "FSSAI FoSCoS",
    badge: "FSSAI",
    color: "#15803d",
    officialUrl: "https://foscos.fssai.gov.in",
    loginUrl: "https://foscos.fssai.gov.in/",
    description: "Food business registration, state/central food licenses, and annual returns.",
    matchPatterns: ["*://*.fssai.gov.in/*", "*://fssai.gov.in/*", "*://foscos.fssai.gov.in/*"],
    credentialKeys: {
      idKey: "fssaiUserId",
      passwordKey: "fssaiPassword",
      nameKey: "clientName",
      idLabel: "FoSCoS User ID / License No",
      passwordLabel: "Password",
    },
    selectors: {
      userId: [
        "input#username",
        "input[name='username']",
        "input#userId",
        "input[placeholder*='User' i]",
      ],
      password: [
        "input#password",
        "input[name='password']",
        "input[type='password']",
      ],
      captcha: [
        "input#captcha",
        "input[name='captcha']",
      ],
      submit: [
        "button[type='submit']",
        "input[type='submit']",
      ],
    },
    adapter: "universal",
  },
  {
    id: "gem",
    category: "Sector-Specific & Trade",
    name: "Government e-Marketplace (GeM)",
    shortName: "GeM",
    badge: "GeM",
    color: "#b91c1c",
    officialUrl: "https://gem.gov.in",
    loginUrl: "https://mkp.gem.gov.in/registration/signup#!/buyer_login",
    description: "Vendor registration for selling goods/services to government departments and PSUs.",
    matchPatterns: ["*://*.gem.gov.in/*", "*://gem.gov.in/*"],
    credentialKeys: {
      idKey: "gemUserId",
      passwordKey: "gemPassword",
      nameKey: "clientName",
      idLabel: "GeM User ID",
      passwordLabel: "Password",
    },
    selectors: {
      userId: [
        "input#loginid",
        "input[name='loginid']",
        "input#username",
        "input[placeholder*='User' i]",
      ],
      password: [
        "input#password",
        "input[name='password']",
        "input[type='password']",
      ],
      captcha: [
        "input#captcha",
        "input[name='captcha']",
      ],
      submit: [
        "button[type='submit']",
        "input[type='submit']",
      ],
    },
    adapter: "universal",
  },
];

// Helper to look up a portal by ID or URL keyword
export function getPortalById(portalId) {
  if (!portalId) return PORTALS[0];
  const normalized = String(portalId).toLowerCase().trim();
  return (
    PORTALS.find(
      (p) =>
        p.id === normalized ||
        p.shortName.toLowerCase() === normalized ||
        p.name.toLowerCase().includes(normalized)
    ) || PORTALS[0]
  );
}

// Helper to detect portal from current window URL
export function detectPortalFromUrl(url) {
  if (!url) return null;
  const href = String(url).toLowerCase();

  for (const portal of PORTALS) {
    if (
      portal.matchPatterns.some((pattern) => {
        const regex = new RegExp(
          "^" + pattern.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$"
        );
        return regex.test(href);
      })
    ) {
      return portal;
    }
  }
  return null;
}
