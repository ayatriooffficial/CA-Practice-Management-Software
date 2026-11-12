// CA Practice Extension - Central Government & Compliance Portal Registry
// Easily add any new portal by adding a config object below.

export const PORTALS = [
  {
    id: "mca",
    name: "MCA Portal (V2/V3)",
    shortName: "MCA",
    badge: "MCA",
    color: "#0284c7",
    description: "Ministry of Corporate Affairs Portal (Company / LLP filings, forms, V2 & V3)",
    loginUrl: "https://www.mca.gov.in/content/mca/global/en/foportal/fologin.html",
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
        "input[name*='captcha' i]",
      ],
      submit: [
        "button[type='submit']",
        "input[type='submit']",
        "button#loginButton",
        "button[id*='submit' i]",
      ],
    },
    adapter: "mca",
  },
  {
    id: "incometax",
    name: "Income Tax e-Filing (ITD)",
    shortName: "ITD",
    badge: "ITD",
    color: "#16a34a",
    description: "Income Tax Department e-Filing Portal (Returns, AIS, 26AS, Notices)",
    loginUrl: "https://eportal.incometax.gov.in/iec/foservices/#/login",
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
        "input[type='text']",
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
    id: "gst",
    name: "GST Portal",
    shortName: "GST",
    badge: "GST",
    color: "#9333ea",
    description: "Goods and Services Tax Portal (Returns GSTR-1/3B, Challans, Notices)",
    loginUrl: "https://services.gst.gov.in/services/login",
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
    id: "traces",
    name: "TRACES Portal (TDS CPC)",
    shortName: "TRACES",
    badge: "TRACES",
    color: "#ea580c",
    description: "TDS Reconciliation Analysis and Correction Enabling System",
    loginUrl: "https://www.tdscpc.gov.in/app/login.xhtml",
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
];

// Helper to look up a portal by ID
export function getPortalById(portalId) {
  if (!portalId) return PORTALS[0];
  const normalized = String(portalId).toLowerCase().trim();
  return PORTALS.find((p) => p.id === normalized) || PORTALS[0];
}

// Helper to detect portal from current window URL
export function detectPortalFromUrl(url) {
  if (!url) return null;
  const href = String(url).toLowerCase();
  for (const portal of PORTALS) {
    if (portal.matchPatterns.some((pattern) => {
      const regex = new RegExp(
        "^" + pattern.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$"
      );
      return regex.test(href);
    })) {
      return portal;
    }
  }
  return null;
}

