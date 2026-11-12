# CA Practice Management - Multi-Portal Auto-Fill Assistant (Chrome & Edge Extension)

A production-grade Manifest V3 browser extension for **CA Practice Management** that automates credential filling across 16 major Indian government and compliance portals:

| Category | Portal / Authority | Official URL | Primary Purpose |
| :--- | :--- | :--- | :--- |
| **Corporate & ROC** | Ministry of Corporate Affairs (MCA) | `mca.gov.in` | Company/LLP registration (SPICe+), DIN/DIR-3 KYC, annual filings (AOC-4, MGT-7). |
| **Taxation** | Goods and Services Tax (GST) | `gst.gov.in` | GSTIN registration, monthly/quarterly returns (GSTR-1, GSTR-3B), ITC reconciliation. |
| **Taxation** | GST E-Way Bill System | `ewaybillgst.gov.in` | Generating and tracking e-way bills for inter/intra-state movement of goods. |
| **Taxation** | Income Tax e-Filing | `incometax.gov.in` | Corporate & individual ITR filings, advance tax, AIS/26AS verification, PAN/TAN services. |
| **Taxation** | TRACES (TDS CPC) | `tdscpc.gov.in` | TDS return processing, Form 16/16A downloads, challan corrections, Conso files. |
| **Employee & Labour** | EPFO Employer Portal | `unifiedportal-emp.epfindia.gov.in` | Provident Fund (PF) registration, UAN generation, monthly ECR filings. |
| **Employee & Labour** | ESIC Portal | `esic.gov.in` | Employee State Insurance registration and monthly contribution filings. |
| **Employee & Labour** | Shram Suvidha | `shramsuvidha.gov.in` | Unified labour law compliance, Labour Identification Number (LIN), and inspections. |
| **Registrations** | Udyam Registration (MSME) | `udyamregistration.gov.in` | Official MSME classification for subsidies, priority lending, and payment protection. |
| **Registrations** | National Single Window System (NSWS) | `nsws.gov.in` | Single-window clearance for central and state business approvals and licenses. |
| **Registrations** | Startup India | `startupindia.gov.in` | DPIIT startup recognition, 80-IAC tax exemptions, and seed fund applications. |
| **Intellectual Property** | IP India | `ipindia.gov.in` | Trademark, patent, copyright, and industrial design registration and public searches. |
| **Import / Export** | DGFT | `dgft.gov.in` | Importer-Exporter Code (IEC) issuance, annual KYC updates, export incentives (RoDTEP/MEIS). |
| **Import / Export** | ICEGATE (Indian Customs) | `icegate.gov.in` | Customs e-filing, Bill of Entry, shipping bills, and duty payments. |
| **Sector-Specific & Trade** | FSSAI FoSCoS | `foscos.fssai.gov.in` | Food business registration, state/central food licenses, and annual returns. |
| **Sector-Specific & Trade** | Government e-Marketplace (GeM) | `gem.gov.in` | Vendor/seller registration for selling goods and services to government and PSUs. |

---

## 📁 Professional Code & Folder Structure

```
extension/
├── manifest.json              # Manifest V3 specification
├── README.md                  # Complete architecture & deployment guide
├── background.js              # Backward-compatible service worker loader
├── content_app.js             # Web app content script entry loader
├── content_mca.js             # Portal content script entry loader
├── popup.html                 # Extension popup entry point
├── icons/                     # Extension branding icons (16, 48, 128px)
└── src/
    ├── config/
    │   ├── constants.js       # Storage keys, message action types, and defaults
    │   ├── env.js             # Deployment environment patterns & trusted domains
    │   └── portals.js         # Central Portal Registry (metadata, login URLs, selectors)
    ├── background/
    │   ├── service_worker.js  # Service worker lifecycle & dynamic script injector
    │   ├── message-handler.js # Clean action dispatcher & messaging router
    │   ├── credential-manager.js # Multi-portal credential extractor & director manager
    │   └── api-service.js     # Dynamic API client (connects to local or deployed backend)
    ├── content/
    │   ├── app-bridge.js      # Runs on CA Practice web app (localhost & deployed cloud)
    │   ├── portal-bridge.js   # Runs on compliance portals (auto-fill & assistant pill)
    │   ├── core/
    │   │   ├── dom-utils.js   # Framework-safe input filler, shadow DOM, captcha focus
    │   │   └── floating-widget.js # Universal draggable floating assistant pill
    │   └── adapters/
    │       ├── mca-adapter.js # MCA V2/V3 AEM GuideBridge & registration filler
    │       ├── incometax-adapter.js # ITD two-step login (PAN / Password) adapter
    │       ├── gst-adapter.js # GST portal login adapter
    │       └── traces-adapter.js # TRACES TAN/User ID portal adapter
    ├── popup/
    │   ├── popup.html         # Multi-portal popup with live search & director picker
    │   ├── popup.css          # Modern responsive stylesheet with dark mode
    │   └── popup.js           # Popup controller & portal switcher
    ├── options/
    │   ├── options.html       # Production deployment settings & custom domain manager
    │   ├── options.css        # Options stylesheet
    │   └── options.js         # Settings storage controller
    └── utils/
        ├── storage.js         # Promise-based chrome.storage.local wrapper
        └── logger.js          # Tagged logging utility with debug support
```

---

## 🚀 How to Install in Chrome or Edge

1. Open your browser and go to:
   - **Chrome**: `chrome://extensions/`
   - **Edge**: `edge://extensions/`
2. Turn ON **"Developer mode"** (toggle in the top-right corner).
3. Click the **"Load unpacked"** button in the top-left corner.
4. Select the `extension` folder located at:
   ```
   E:\Job Task\Ayatrio\extension
   ```
5. Pin the **CA Practice - Portal Auto-Fill Assistant** icon to your toolbar!

---

## 🌐 Production & Deployed System Architecture

The extension is engineered to run seamlessly across both development (`localhost`) and live deployed environments:

1. **Automatic Origin Detection**:
   When you open your deployed CA Practice web app (e.g. `https://app.ayatrio.com` or `https://my-firm.vercel.app`), the extension's `app-bridge.js` detects the live domain and registers it with the background worker.

2. **Wildcard Support**:
   Pre-configured in `manifest.json` for major cloud providers:
   `*.ayatrio.com`, `*.vercel.app`, `*.netlify.app`, `*.onrender.com`, `*.railway.app`, `*.fly.dev`.

3. **Custom Private Domains**:
   If your firm hosts CA Practice on an internal or custom domain (e.g. `https://erp.taxfirm.in`):
   - Right-click the extension icon and select **"Options"** (or click the ⚙️ gear icon in the popup).
   - Add your custom domain under **"Custom Web App Production Domains"**.
   - The extension will dynamically inject the bridge into your custom domain!

4. **Dynamic API Backend Resolution**:
   In `src/background/api-service.js`, the extension automatically searches clients using:
   - User-configured backend URL in Options.
   - Deployed web app origin (`/api/v1`).
   - Development fallback (`http://localhost:5000/api/v1`).

---

## 🔌 How to Add a New Website / Portal in the Future

Adding a new government or corporate website takes only 3 simple steps:

### Step 1: Register Portal in `src/config/portals.js`
Add a configuration entry:
```javascript
{
  id: "epfo",
  name: "EPFO Unified Portal",
  shortName: "EPFO",
  badge: "EPFO",
  color: "#d97706",
  loginUrl: "https://unifiedportal-emp.epfindia.gov.in/epfo/",
  matchPatterns: ["*://*.epfindia.gov.in/*"],
  credentialKeys: {
    idKey: "epfoUserId",
    passwordKey: "epfoPassword",
    idLabel: "EPFO Employer ID",
    passwordLabel: "EPFO Password",
  },
  selectors: {
    userId: ["input#username", "input[name='username']"],
    password: ["input#password", "input[type='password']"],
    captcha: ["input#captcha"],
  },
  adapter: "epfo",
}
```

### Step 2: Create Adapter in `src/content/adapters/epfo-adapter.js`
```javascript
import { DomUtils } from "../core/dom-utils.js";

export class EpfoAdapter {
  constructor(portalConfig) {
    this.config = portalConfig;
  }

  fillLogin(credentials) {
    const userField = DomUtils.findFirstMatching(this.config.selectors.userId);
    const pwdField = DomUtils.findFirstMatching(this.config.selectors.password);

    if (userField && credentials.userId) DomUtils.setInputValue(userField, credentials.userId);
    if (pwdField && credentials.password) DomUtils.setInputValue(pwdField, credentials.password);

    DomUtils.focusCaptcha(this.config.selectors.captcha);
  }
}
```

### Step 3: Register in `src/content/portal-bridge.js`
Import your adapter and add one line in the switch block:
```javascript
case "epfo":
  adapter = new EpfoAdapter(portal);
  break;
```
That's it! The extension popup, floating widget, auto-fill dispatcher, and web app bridge will now automatically support the new portal!
