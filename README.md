# 🏢 Ayatrio — CA Practice Management & Compliance CRM Suite

An enterprise-grade, full-stack practice management and corporate compliance platform built for Chartered Accountants (CAs), Tax Advisors, and Corporate Law Firms. Features comprehensive client lifecycle management, automated service catalogs, billing/invoicing, interactive resizable data grids, and an automated **Google Drive Cloud Storage Pipeline** with real-time cryptographic verification and inline document preview.

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=flat&logo=node.js)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express-4.x-lightgrey?style=flat&logo=express)](https://expressjs.com/)
[![Google Drive API](https://img.shields.io/badge/Google_Drive-API_v3-4285F4?style=flat&logo=googledrive)](https://developers.google.com/drive)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-green?style=flat&logo=mongodb)](https://www.mongodb.com/)
[![TanStack Query](https://img.shields.io/badge/TanStack_Query-v5-coral?style=flat)](https://tanstack.com/query)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-cyan?style=flat&logo=tailwindcss)](https://tailwindcss.com/)

---

## 📑 Table of Contents
1. [Monorepo Architecture](#-monorepo-architecture)
2. [Google Drive Cloud Storage & File Verification Engine](#-google-drive-cloud-storage--file-verification-engine)
   - [OAuth 2.0 Integration & Storage Quota](#1-oauth-20-cloud-sync--quota)
   - [8 Standardized CA Practice Categories](#2-8-standardized-ca-practice-categories)
   - [Deep Magic-Byte & Cryptographic Verification](#3-deep-magic-byte--cryptographic-verification)
   - [Inline Preview Stream & Lightbox Modal](#4-inline-preview-stream--lightbox-modal)
   - [OAuth 2.0 Token Generation Guide](#5-oauth-20-token-generation-guide)
3. [Interactive Drag-Resizable Table Columns](#-interactive-drag-resizable-table-columns)
4. [Core Application Modules](#-core-application-modules)
   - [Clients Master Directory](#1-clients-master-directory-client)
   - [Leads Pipeline](#2-leads-pipeline-leads)
   - [Services Catalog](#3-services-catalog-services)
   - [Drive Document Repository](#4-drive-document-repository-drive)
   - [Invoice & Billing Ledger](#5-invoice--billing-ledger-invoice)
5. [Complete API Reference](#-complete-api-reference)
   - [Drive & Document Management API](#drive--documents-apiv1drive)
   - [Clients API](#clients-apiv1clients)
   - [Leads API](#leads-apiv1leads)
   - [Services API](#services-apiv1services)
   - [Health Check](#health-check-apiv1health)
6. [Environment Variables Reference](#-environment-variables-reference)
7. [Quick Start & Installation](#-quick-start--installation)
   - [Backend Setup](#1-backend-setup-ayatrio-backend)
   - [Frontend Setup](#2-frontend-setup-ayatrio-demo)
8. [Data Models & Soft-Delete Protocol](#-data-models--soft-delete-protocol)
9. [Developer Conventions & Contribution](#-developer-conventions--contribution)

---

## 🏗 Monorepo Architecture

The repository is structured as a high-performance monorepo separating presentation from domain services:

```
CA-Practice-Management-Software/
├── ayatrio-backend/              # Node.js + Express + TypeScript + MongoDB Backend
│   ├── scripts/
│   │   └── get-refresh-token.js  # Interactive OAuth 2.0 Refresh Token Generator
│   ├── src/
│   │   ├── config/               # Env (Zod-validated), Database, & Logger
│   │   ├── constants/            # Status codes, messages, and tokens
│   │   ├── middlewares/          # Rate-limiting, Zod validation, error handling
│   │   ├── modules/              # Domain-driven modular MVC
│   │   │   ├── client/           # Client schema, controller, service, routes
│   │   │   ├── lead/             # Lead pipeline, conversion, validation, routes
│   │   │   ├── service/          # Services catalog, recurring schedules, routes
│   │   │   └── drive/            # Google Drive API v3, verification, preview streams
│   │   ├── plugins/              # Soft-delete Mongoose plugin & query helpers
│   │   ├── routes.ts             # Central API v1 router
│   │   └── server.ts             # Server bootstrap & graceful shutdown hooks
│   ├── .env.example              # Backend environment template
│   └── package.json
│
├── ayatrio-demo/                 # Next.js 16 + React 19 + Tailwind CSS Frontend
│   ├── src/
│   │   ├── app/                  # Next.js App Router (drive, clients, leads, services...)
│   │   ├── components/           # High-performance modular UI components
│   │   │   ├── clients/          # Client master table, ClientForm, Promoter links
│   │   │   ├── leads/            # Lead table, LeadFormModal, ConvertLeadModal
│   │   │   ├── services/         # Services catalog, ServiceForm second page
│   │   │   ├── drive/            # DriveModule grid/table, FileUploadModal, Lightbox
│   │   │   ├── invoice/          # Proforma, Tax invoice, SAC codes, Analytics
│   │   │   └── ui/               # ColumnResizer, Select, Pagination, Discard Modal
│   │   ├── hooks/                # useResizableColumns, TanStack Query hooks
│   │   ├── services/             # Typed API clients (driveApi, apiClient)
│   │   ├── utils/                # filePreview.ts (Direct image/stream resolver)
│   │   └── data/                 # Reference datasets, statutory types, fallbacks
│   ├── .env.example              # Frontend environment template
│   └── package.json
│
├── .gitignore                    # Root ignore (protects .env, credentials/, uploads/)
└── README.md                     # Master documentation
```

---

## ☁️ Google Drive Cloud Storage & File Verification Engine

Ayatrio includes a production-grade cloud storage pipeline connecting directly to your Google Drive via **Google Drive API v3**.

### 1. OAuth 2.0 Cloud Sync & Quota
- Uses an **OAuth 2.0 Client with offline Refresh Token delegation** to utilize the user's personal Google Drive quota (**15 GB**), eliminating the 0-byte storage restrictions imposed on standard Google Cloud Service Accounts.
- All files are organized cleanly under a dedicated parent folder (e.g. `Ayatrio Files`) specified by `GOOGLE_DRIVE_PARENT_FOLDER_ID`.
- Files uploaded are automatically visible in Google Drive web, desktop, and mobile applications.

### 2. 8 Standardized CA Practice Categories
Uploaded documents are automatically sorted and isolated into dedicated category folders created dynamically inside Google Drive:

| Category Key | Target Folder Name | Allowed Formats | Description |
| :--- | :--- | :--- | :--- |
| `TAX_RETURNS` | `01_Tax_and_GST_Filings` | `.pdf`, `.xlsx`, `.xls`, `.csv`, `.json`, `.zip` | Income Tax returns, GST filings (GSTR-1, 3B, 9), TDS challans |
| `AUDIT_FINANCIALS` | `02_Audited_Financials` | `.pdf`, `.xlsx`, `.xls`, `.docx`, `.doc` | Balance sheets, Profit & Loss accounts, Statutory Audit reports |
| `INVOICES_BILLING` | `03_Invoices_and_Billing` | `.pdf`, `.png`, `.jpg`, `.jpeg`, `.webp` | Client invoices, debit notes, fee receipts, payment proofs |
| `COMPLIANCE_MCA` | `04_MCA_and_ROC_Compliance` | `.pdf`, `.zip`, `.docx`, `.doc` | ROC e-forms (AOC-4, MGT-7), Company Incorporation, Board Minutes |
| `KYC_IDENTITY` | `05_KYC_and_Identity_Proofs` | `.pdf`, `.png`, `.jpg`, `.jpeg`, `.webp` | PAN cards, Aadhaar, Passports, Director DIN proofs, Signatures |
| `LEGAL_CONTRACTS` | `06_Legal_Contracts_and_Agreements` | `.pdf`, `.docx`, `.doc` | Engagement letters, NDAs, Shareholder Agreements, Powers of Attorney |
| `WORKPAPERS` | `07_Workpapers_and_Computation` | `.xlsx`, `.xls`, `.csv`, `.pdf`, `.zip` | Working balance sheets, Depreciation schedules, Trial balances |
| `GENERAL` | `08_General_Documents` | `.pdf`, `.docx`, `.xlsx`, `.png`, `.jpg`, `.txt` | General correspondence, administrative advisories, miscellaneous files |

### 3. Deep Magic-Byte & Cryptographic Verification
Before any file touches Google Drive or the database, it passes through our multi-stage security pipeline ([`fileVerification.ts`](file:///e:/Job%20Task/Ayatrio/ayatrio-backend/src/modules/drive/fileVerification.ts)):
1. **Magic-Byte Signature Inspection**: Reads the raw binary header bytes (e.g. `%PDF-` for PDFs, `\x89PNG\r\n\x1a\n` for PNGs, `PK\x03\x04` for Office/ZIP) to verify the true file format and reject spoofed extensions.
2. **Polyglot & Executable Detection**: Blocks malicious PE executables (`MZ`), Windows shortcuts (`LNK`), ELF binaries, Mach-O binaries, and embedded scripts.
3. **Category Constraints**: Verifies that the file format is explicitly permitted for the target practice category.
4. **Sanitization**: Strips dangerous shell metacharacters and directory traversals (`../`, quotes, non-alphanumeric characters).
5. **SHA-256 Checksum**: Generates a tamper-proof cryptographic hash for every file to guarantee integrity and auditability.

### 4. Inline Preview Stream & Lightbox Modal
- **Direct Stream Proxy (`GET /api/v1/drive/:id/preview`)**: Streams images and PDFs with `Content-Disposition: inline` and `Cross-Origin-Resource-Policy: cross-origin`. This completely bypasses Google CDN anti-hotlinking rules and third-party cookie restrictions, allowing photos and previews to render seamlessly inside `<img />` tags, table avatars, and iframes without 403/429 errors.
- **Smart Resolver (`filePreview.ts`)**: Automatically identifies Google Drive web links (`/file/d/...`), Drive file IDs, local paths, or data URLs and transforms them into high-performance renderable URLs.
- **Interactive Lightbox Modal**: Built into [DriveModule.tsx](file:///e:/Job%20Task/Ayatrio/ayatrio-demo/src/components/drive/DriveModule.tsx), offering:
  - High-res image display with interactive zoom controls (`+`, `-`, `100% Reset`).
  - Embedded PDF preview.
  - Direct quick-links to Google Drive and one-click download.
  - Cryptographic verification inspector displaying SHA-256 hashes and magic bytes.

---

### 5. OAuth 2.0 Token Generation Guide

Follow these steps to obtain your `GOOGLE_DRIVE_REFRESH_TOKEN`:

#### Method A: Automated CLI Token Generator (Recommended)
1. In your **[Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials)**:
   - Click on your OAuth 2.0 Client.
   - Under **Authorized redirect URIs**, add:
     ```
     http://localhost:5050/oauth2callback
     ```
   - If your OAuth Consent Screen is in "Testing" mode, add your Google email address under **Test users**.
2. Run the token helper script:
   ```bash
   cd ayatrio-backend
   npm run get-drive-token
   ```
3. Open the displayed URL in your browser, log in with your Google account, and click **Allow**.
4. The script captures the authorization callback, exchanges it for a permanent `GOOGLE_DRIVE_REFRESH_TOKEN`, and automatically saves it into your `ayatrio-backend/.env` file.

#### Method B: Via Google OAuth Playground
1. In **[Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials)**:
   - Add `https://developers.google.com/oauthplayground` to **Authorized redirect URIs**.
2. Open **[Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)**.
3. Click the gear icon (**⚙️ Settings**) in the top right:
   - Check **"Use your own OAuth credentials"**.
   - Paste your `GOOGLE_DRIVE_CLIENT_ID` and `GOOGLE_DRIVE_CLIENT_SECRET`.
4. In Step 1 on the left, select **Drive API v3** -> `https://www.googleapis.com/auth/drive`.
5. Click **Authorize APIs** and log into your account.
6. In Step 2, click **Exchange authorization code for tokens**.
7. Copy the **Refresh token** and paste it into `ayatrio-backend/.env`:
   ```env
   GOOGLE_DRIVE_REFRESH_TOKEN=1//0gGgE1oXeK8Tm...
   ```

---

## ↔️ Interactive Drag-Resizable Table Columns

Ayatrio implements custom, responsive, drag-resizable column borders across all primary data tables ([`useResizableColumns.ts`](file:///e:/Job%20Task/Ayatrio/ayatrio-demo/src/hooks/useResizableColumns.ts), [`ColumnResizer.tsx`](file:///e:/Job%20Task/Ayatrio/ayatrio-demo/src/components/ui/ColumnResizer.tsx)):

- **Implemented on**:
  - **Leads Table** (`LeadsModule.tsx`, `LeadTableRow.tsx`)
  - **Clients Master Table** (`ClientsModule.tsx`, `ClientTableRow.tsx`)
  - **Services Table** (`ServicesModule.tsx`, `ServiceTableRow.tsx`)
- **Key Capabilities**:
  - Drag handles positioned precisely between column boundaries.
  - Active visual indicator line during resize gestures.
  - Clamps minimum and maximum widths per column to prevent layout collapse.
  - Remembers custom widths via `localStorage` keyed per module.
  - **Zero SSR Hydration Errors**: State initializes with default server widths and loads persisted preferences after mount in a deferred `useEffect`.

---

## 💼 Core Application Modules

### 1. Clients Master Directory (`/clients`)
- **Entity Management**: Individual, Private Limited, Public Limited, LLP, Partnership, and Trust entities with statutory compliance schemas.
- **Dedicated Second-Page Flow**: Clear navigation between listing and full-page editor ([`ClientForm.tsx`](file:///e:/Job%20Task/Ayatrio/ayatrio-demo/src/components/clients/ClientForm.tsx)) with unsaved changes confirmation ([`DiscardConfirmationModal`](file:///e:/Job%20Task/Ayatrio/ayatrio-demo/src/components/ui/DiscardConfirmationModal.tsx)).
- **Promoter & Director Linking**: Live lead search dropdown (`PromoterSearchDropdown.tsx`) to link promoters directly to existing leads.
- **Profile Photo Upload**: Uploads directly to Google Drive `05_KYC_and_Identity_Proofs` with live inline avatar rendering.
- **Soft-Delete & Trash**: Active and Trash view toggle with instant restore.

### 2. Leads Pipeline (`/leads`)
- **Stage Tracking**: `New`, `Contacted`, `Qualified`, `Proposal`, and `Converted`.
- **Lead-to-Client Conversion**: Instant one-click conversion modal ([`ConvertLeadModal.tsx`](file:///e:/Job%20Task/Ayatrio/ayatrio-demo/src/components/leads/ConvertLeadModal.tsx)) which provisions a client record while archiving the lead.
- **Attachment Uploads**: PAN, Aadhaar, and DIN attachments upload directly into categorized Google Drive folders.

### 3. Services Catalog (`/services`)
- **CA Compliance Master**: Configurable catalog of recurring and one-time CA compliance services (GST, Income Tax, MCA/ROC, Audits, Payroll).
- **Clean Professional Layout**: Neutral status badges, non-overlapping columns, and borderless cards.
- **Dedicated Service Editor**: Full-page editor with fee schedule configurations, checklist items, and sub-task setup.

### 4. Drive Document Repository (`/drive`)
- **Dual View Modes**: Switch between responsive Grid view (with image thumbnail banners) and detailed Table view.
- **Sidebar Category Counts**: Live count badges aggregating files across all 8 CA categories.
- **In-App Lightbox Viewer**: High-res document modal with zoom controls, embedded PDF viewer, and Google Drive links.
- **Upload Modal**: File drop-zone with live magic-byte verification report prior to saving.

### 5. Invoice & Billing Ledger (`/invoice`)
- **Invoicing Engine**: Proforma and Tax Invoices with SAC code mapping and automated CGST/SGST/IGST computations.
- **Reimbursement Tracking**: Out-of-pocket expense tracking and billing reconciliations.
- **Financial Analytics**: Revenue breakdowns, accounts receivable aging, and collections reporting.

---

## 📡 Complete API Reference

All endpoints are versioned under `/api/v1` and return standard JSON structures:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation successful",
  "data": { ... }
}
```

### Drive & Documents (`/api/v1/drive`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/drive/status` | Current Google Drive integration health, quota limit, usage, and parent folder ID |
| `GET` | `/drive/stats` | Storage usage analytics and document counts breakdown by category |
| `POST` | `/drive/verify` | Dry-run file verification (inspects magic bytes, MIME, and checks without uploading) |
| `POST` | `/drive/upload` | Verifies and uploads file directly to Google Drive category folder; saves DB metadata |
| `GET` | `/drive` | List documents (supports `page`, `limit`, `category`, `search`, `clientId`, `sortBy`, `sortOrder`) |
| `GET` | `/drive/:id` | Get document metadata by ID |
| `GET` | `/drive/:id/download` | Stream download document file (Content-Disposition: `attachment`) |
| `GET` | `/drive/:id/preview` | Stream inline document for images and PDFs (Content-Disposition: `inline`, CORS enabled) |
| `DELETE` | `/drive/:id` | Soft-deletes document in database and removes file from Google Drive |

### Clients (`/api/v1/clients`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/clients` | Paginated client list (supports `search`, `type`, `group`, `active`, `sortBy`, `includeDeleted`) |
| `POST` | `/clients` | Create a new client (Zod-validated payload) |
| `GET` | `/clients/:id` | Retrieve client details by ID |
| `PATCH` | `/clients/:id` | Partial update of client fields |
| `DELETE` | `/clients/:id` | Soft-delete client (moves to Trash) |
| `POST` | `/clients/:id/restore` | Restore soft-deleted client |

### Leads (`/api/v1/leads`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/leads` | Paginated leads (supports `search`, `status`, `source`, `priority`, `sortBy`, `includeDeleted`) |
| `POST` | `/leads` | Create a new prospective lead |
| `GET` | `/leads/:id` | Retrieve lead details |
| `PATCH` | `/leads/:id` | Update lead status, notes, or contact info |
| `DELETE` | `/leads/:id` | Soft-delete lead |
| `POST` | `/leads/:id/restore` | Restore soft-deleted lead |
| `POST` | `/leads/:id/convert` | Convert lead into a Client record and archive lead |

### Services (`/api/v1/services`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/services` | List services (supports `search`, `category`, `frequency`, `isRecurring`) |
| `POST` | `/services` | Create new catalog service |
| `GET` | `/services/:id` | Get service by ID |
| `PATCH` | `/services/:id` | Update service pricing, SOP, or sub-tasks |
| `DELETE` | `/services/:id` | Soft-delete service |
| `POST` | `/services/:id/restore` | Restore soft-deleted service |

### Health Check (`/api/v1/health`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Server uptime, timestamp, memory usage, and MongoDB connectivity status |

---

## 🔐 Environment Variables Reference

### Backend (`ayatrio-backend/.env`)

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | Optional | `development` | Runtime environment (`development`, `production`, `test`) |
| `PORT` | Optional | `5000` | Port for Express HTTP server |
| `API_PREFIX` | Optional | `/api/v1` | URL path prefix for API routes |
| `MONGODB_URI` | **Required** | `mongodb://127.0.0.1:27017/ayatrio_crm` | MongoDB connection URI |
| `CORS_ORIGIN` | Optional | `http://localhost:3000,http://localhost:3001` | Allowed CORS origins (comma-separated) |
| `RATE_LIMIT_WINDOW_MS`| Optional | `900000` (15m) | Rate limiting window in milliseconds |
| `RATE_LIMIT_MAX_REQUESTS`| Optional | `500` | Max requests allowed per window per IP |
| `LOG_LEVEL` | Optional | `info` | Winston log level (`debug`, `http`, `info`, `warn`, `error`) |
| `GOOGLE_DRIVE_CLIENT_ID` | **Required for Drive** | — | Google Cloud OAuth 2.0 Client ID |
| `GOOGLE_DRIVE_CLIENT_SECRET` | **Required for Drive** | — | Google Cloud OAuth 2.0 Client Secret |
| `GOOGLE_DRIVE_REFRESH_TOKEN` | **Required for Drive** | — | Google Drive offline Refresh Token |
| `GOOGLE_DRIVE_PARENT_FOLDER_ID` | Optional | `root` | Parent folder ID in Google Drive (e.g. "Ayatrio Files") |
| `MAX_FILE_SIZE_MB` | Optional | `25` | Maximum allowed file upload size in megabytes |

### Frontend (`ayatrio-demo/.env.local`)

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Optional | `http://localhost:5000/api/v1` | Base address for backend API calls |

---

## 🚀 Quick Start & Installation

### 1. Backend Setup (`ayatrio-backend`)

```bash
# 1. Navigate to backend directory
cd ayatrio-backend

# 2. Install dependencies
npm install

# 3. Create environment file from template
cp .env.example .env

# 4. Fill in MONGODB_URI and your GOOGLE_DRIVE credentials in .env

# 5. (Optional) Run OAuth token helper if you need a refresh token
npm run get-drive-token

# 6. Start backend development server
npm run dev
```

The backend server will start at:
- **Base URL**: `http://localhost:5000`
- **API Root**: `http://localhost:5000/api/v1`
- **Health Check**: `http://localhost:5000/api/v1/health`
- **Drive Status**: `http://localhost:5000/api/v1/drive/status`

### 2. Frontend Setup (`ayatrio-demo`)

```bash
# 1. In a new terminal, navigate to frontend directory
cd ayatrio-demo

# 2. Install dependencies
npm install

# 3. Create local environment file
cp .env.example .env.local

# 4. Start Next.js development server
npm run dev
```

Open your browser and navigate to:
- **Application Home**: `http://localhost:3000`
- **Drive Document Module**: `http://localhost:3000/drive`
- **Clients Module**: `http://localhost:3000/clients`
- **Leads Module**: `http://localhost:3000/leads`
- **Services Catalog**: `http://localhost:3000/services`
- **Invoice & Billing**: `http://localhost:3000/invoice`

---

## 🛡 Data Models & Soft-Delete Protocol

All Mongoose schemas in `ayatrio-backend` implement our custom `softDeletePlugin`:
- Records include `isDeleted: { type: Boolean, default: false, index: true }`, `deletedAt: Date`, and `deletedBy: String`.
- Queries automatically filter out deleted documents unless `{ includeDeleted: true }` is explicitly provided.
- Full auditability is preserved; documents are never physically purged unless explicitly requested by compliance requirements.

---

## 🛠 Developer Conventions & Contribution

### Code Standards
- **Strict TypeScript**: 100% type-checked code with `npm run type-check` in backend and `npm run build` in frontend.
- **Zod Validation**: Every request body, query parameter, and route parameter is validated before reaching controllers.
- **Graceful Cloud Fallback**: If Google Drive credentials are misconfigured, the Drive service transitions automatically to secure local storage fallback mode without 500 errors.
- **Component Splitting**: Heavy forms (`ClientForm.tsx`, `LeadFormModal.tsx`) use focused sub-components to prevent unnecessary re-renders.

### Validation Commands

```bash
# Run backend TypeScript check
cd ayatrio-backend
npm run type-check

# Run backend production build
npm run build

# Run frontend Next.js production build
cd ../ayatrio-demo
npm run build
```

---

## 📄 License

This software is confidential and proprietary to **Ayatrio**. All rights reserved.
