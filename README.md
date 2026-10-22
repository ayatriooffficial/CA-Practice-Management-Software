# 🏢 Ayatrio — CA Practice Management & Compliance CRM Suite

An enterprise-grade, full-stack practice management and corporate compliance platform engineered for Chartered Accountants (CAs), Tax Advisors, Audit Teams, and Corporate Law Firms. Features comprehensive client lifecycle management, statutory notice tracking, task management with multi-dimensional pivot matrix and live work timers, automated service catalogs with cross-task requirement synchronization, billing & invoicing, interactive resizable data grids, and an automated **Google Drive Cloud Storage Pipeline** with real-time cryptographic verification and inline document streaming.

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
2. [What's New in Recent Updates](#-whats-new-in-recent-updates)
   - [Monorepo Directory Streamlining (`backend/` & `frontend/`)](#1-monorepo-directory-streamlining)
   - [Full-Stack Task Management Engine](#2-full-stack-task-management-engine)
   - [17-Tab Client Detail Suite & Statutory Sub-Modals](#3-17-tab-client-detail-suite--statutory-sub-modals)
   - [Enhanced Services Catalog & Cross-Task Synchronization](#4-enhanced-services-catalog--cross-task-synchronization)
   - [Firm Team Management Directory](#5-firm-team-management-directory)
3. [Google Drive Cloud Storage & File Verification Engine](#-google-drive-cloud-storage--file-verification-engine)
   - [OAuth 2.0 Integration & Storage Quota](#1-oauth-20-cloud-sync--quota)
   - [8 Standardized CA Practice Categories](#2-8-standardized-ca-practice-categories)
   - [Deep Magic-Byte & Cryptographic Verification](#3-deep-magic-byte--cryptographic-verification)
   - [Inline Preview Stream & Lightbox Modal](#4-inline-preview-stream--lightbox-modal)
   - [OAuth 2.0 Token Generation Guide](#5-oauth-20-token-generation-guide)
4. [Interactive Drag-Resizable Table Columns](#-interactive-drag-resizable-table-columns)
5. [Core Application Modules](#-core-application-modules)
   - [Task Management Engine (`/task`)](#1-task-management-engine-task)
   - [Clients Master Directory (`/clients`, `/client`)](#2-clients-master-directory-clients--client)
   - [Services Catalog (`/services`, `/service`)](#3-services-catalog-services--service)
   - [Leads Pipeline (`/leads`)](#4-leads-pipeline-leads)
   - [Drive Document Repository (`/drive`)](#5-drive-document-repository-drive)
   - [Invoice & Billing Ledger (`/invoice`)](#6-invoice--billing-ledger-invoice)
   - [Team Directory (`/team`)](#7-team-directory-team)
   - [Statutory Notices & Calendar (`/notices`)](#8-statutory-notices--calendar-notices)
   - [Statutory Compliance Matrix (`/compliance`)](#9-statutory-compliance-matrix-compliance)
   - [Gmail Integration & Client Communication (`/email`)](#10-gmail-integration--client-communication-email)
6. [Complete API Reference](#-complete-api-reference)
   - [Tasks API (`/api/v1/tasks`)](#tasks-apiv1tasks)
   - [Services API (`/api/v1/services`)](#services-apiv1services)
   - [Clients API (`/api/v1/clients`)](#clients-apiv1clients)
   - [Drive & Document Management API (`/api/v1/drive`)](#drive--documents-apiv1drive)
   - [Leads API (`/api/v1/leads`)](#leads-apiv1leads)
   - [Notices API (`/api/v1/notices`)](#notices-apiv1notices)
   - [Compliance API (`/api/v1/compliance`)](#compliance-apiv1compliance)
   - [Portal Sync API (`/api/v1/sync`)](#portal-sync-apiv1sync)
   - [Gmail Integration API (`/api/gmail`)](#gmail-integration-apigmail)
   - [Health Check (`/api/v1/health`)](#health-check-apiv1health)
7. [Environment Variables Reference](#-environment-variables-reference)
8. [Quick Start & Installation](#-quick-start--installation)
   - [Backend Setup (`backend/`)](#1-backend-setup-backend)
   - [Frontend Setup (`frontend/`)](#2-frontend-setup-frontend)
9. [Data Models & Soft-Delete Protocol](#-data-models--soft-delete-protocol)
10. [Developer Conventions & Contribution](#-developer-conventions--contribution)

---

## 🏗 Monorepo Architecture

The repository is structured as a streamlined, high-performance monorepo clearly separating backend services from the presentation tier:

```
CA-Practice-Management-Software/
├── backend/                       # Node.js + Express + TypeScript + MongoDB Backend
│   ├── scripts/
│   │   └── get-refresh-token.js   # Interactive OAuth 2.0 Refresh Token Generator
│   ├── src/
│   │   ├── config/                # Env (Zod-validated), Database, & Logger (Winston)
│   │   ├── constants/             # Status codes, messages, and tokens
│   │   ├── middlewares/           # Rate-limiting, Zod validation, error handling
│   │   ├── modules/               # Domain-driven modular MVC
│   │   │   ├── task/              # Task engine, summary matrix, subtasks, checklists
│   │   │   ├── client/            # Client master, entity schemas, soft-delete
│   │   │   ├── service/           # Service catalog, task synchronization, stats
│   │   │   ├── lead/              # Lead pipeline, conversion, validation, routes
│   │   │   ├── drive/             # Google Drive API v3, verification, preview streams
│   │   │   ├── notice/            # Statutory notices (GST, TDS, IT), calendar, summary
│   │   │   ├── compliance/        # Period compliance matrix (returns & audit), categories, entries
│   │   │   └── sync/              # Portal sync jobs, entitlement, activity tracking
│   │   ├── shared/                # Soft-delete plugin, API Response, QueryBuilder
│   │   ├── routes.ts              # Central API v1 router
│   │   └── server.ts              # Server bootstrap & graceful shutdown hooks
│   ├── .env.example               # Backend environment template
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                      # Next.js 16 + React 19 + Tailwind CSS Frontend
│   ├── src/
│   │   ├── app/                   # Next.js App Router (task, clients, services, drive...)
│   │   │   ├── task/              # Task summary, spreadsheet list, and dynamic detail route
│   │   │   │   ├── page.tsx       # Main multi-tab task management view
│   │   │   │   └── view/[id]/     # Direct URL task detail view (SSG compatible)
│   │   │   ├── clients/ & client/ # Master directory, new client creator
│   │   │   ├── services/ & service/# Catalog, new service creator
│   │   │   ├── team/              # Team member directory & workload distribution
│   │   │   ├── drive/             # Cloud repository, lightbox preview, category views
│   │   │   ├── leads/             # Pipeline, lead conversion modal
│   │   │   ├── invoice/           # Invoicing, proforma, SAC codes, analytics
│   │   │   ├── notices/           # Statutory notices (GST, TDS, IT) & calendar view
│   │   │   ├── compliance/        # Cross-period compliance matrix (GST, TDS, IT)
│   │   │   ├── email/             # Gmail inbox, thread view, and compose modal
│   │   │   └── api/               # Next.js API routes (OAuth & Gmail proxy)
│   │   ├── components/            # High-performance modular UI components
│   │   │   ├── tasks/             # TaskListView, TaskSummaryView, TaskDetailView, AddTaskModal
│   │   │   ├── clients/           # ClientDetailView (17 tabs), ClientForm, Modals:
│   │   │   │   └── modals/        # AddDscModal, AddLicenseModal, AddPasswordModal, AddNoteModal, AddDocumentInOutModal
│   │   │   ├── services/          # ServiceDetailView (SOP, subtasks, checklists), ServiceForm
│   │   │   ├── drive/             # DriveModule, FileUploadModal, Lightbox viewer
│   │   │   ├── invoice/           # InvoiceModule, SummaryCards, forms, tables
│   │   │   ├── notices/           # NoticeShell, NoticeTable, NoticeCalendar, NoticeStats
│   │   │   ├── compliance/        # ComplianceShell, ComplianceGrid, ComplianceStats, DocumentDrawer
│   │   │   ├── email/             # ThreadList, ThreadView, ComposeModal
│   │   │   └── ui/                # ColumnResizer, Select, Pagination, Discard Modal
│   │   ├── hooks/                 # useResizableColumns, useDebounce, useNotices, useCompliance, useGmail
│   │   ├── services/              # Typed API clients (taskApi, clientApi, serviceApi, driveApi, notices, compliance)
│   │   ├── utils/                 # filePreview.ts (Direct image/stream resolver)
│   │   └── data/                  # taskData.ts, teamData.ts, crmData.ts, serviceData.ts
│   ├── .env.example               # Frontend environment template
│   ├── package.json
│   └── tsconfig.json
│
├── .gitignore                     # Root ignore (protects .env, node_modules, build artifacts)
└── README.md                      # Comprehensive Master Documentation
```

---

## ⚡ What's New in Recent Updates

### 1. Monorepo Directory Streamlining
- Refactored monorepo folder structure from `ayatrio-backend/` and `ayatrio-demo/` to intuitive, clean top-level directories:
  - **`backend/`**: Node.js, Express, TypeScript, Mongoose backend.
  - **`frontend/`**: Next.js 16, React 19, Tailwind CSS v4 frontend.
- Updated all scripts, configuration files, and documentation for consistent developer ergonomics.

### 2. Full-Stack Task Management Engine
A complete practice workflow orchestration system tailored for CA firms:
- **Multi-Dimensional Pivot Matrix (`TaskSummaryView.tsx` & `/api/v1/tasks/summary-matrix`)**:
  - Dynamically groups and aggregates tasks by **Assigned To**, **Category**, **Client**, **Service**, **Priority**, **Task Type**, **Month**, and **Financial Year**.
  - Calculates real-time WIP sub-totals (Pending + In Progress + Sent for Review + Request Changes), Overdue, Due Today, Completed, and Ready to Bill totals.
  - Interactive **Heatmap visualization** mode and one-click **CSV Export**.
  - Direct click-through from matrix cell values to filtered task lists.
- **Spreadsheet & Filterable Task List (`TaskListView.tsx`)**:
  - Live summary metric pills (WIP, Pending, In Progress, Review, Changes, Overdue, Completed, Ready to Bill, Cancelled, All).
  - Practice category tabs (`All Categories`, `GST`, `Income Tax`, `MCA`, `Audit`, `Accounting`, `Other`).
  - Dynamic quick-filters (`All Tasks`, `My Tasks`, `Due Today`, `Live Task`).
  - Dropdown filtering by Department, Assignee, and Financial Year.
  - Priority badges (`Low`, `Medium`, `High`, `Urgent`) and status change action buttons.
- **Deep Task Detail View (`TaskDetailView.tsx` & `/task/view/[id]`)**:
  - **Live Work Timer**: Play/Pause interactive stopwatch recording elapsed time (`HH:MM:SS`) for accurate timekeeping and audit compliance.
  - **Timeline & Communication Thread**: Internal team comments with file attachments, notes, and activity history.
  - **Integrated Work Tabs**: Sub-tasks with checkboxes & duration tracking, Statutory Checklists (mandatory/optional flags), Document Requests register, Invoices & Out-of-pocket Expense tracking.
  - **Right Sidebar Context**: Client snapshot, Service SOP guidance, Assignee & Reviewer cards, Due dates, Billing type (`Billable` vs `Non Billable`).
- **Dynamic Task Creation Modal (`AddTaskModal.tsx`)**:
  - Seamlessly pulls real clients and services from the database.
  - Automatically loads service frequency, department, and financial year.
  - Optional toggle to automatically generate a Proforma Invoice upon task creation.

### 3. 17-Tab Client Detail Suite & Statutory Sub-Modals
Expanded the Client module with an enterprise drilldown view ([`ClientDetailView.tsx`](file:///e:/Job%20Task/Ayatrio/frontend/src/components/clients/ClientDetailView.tsx)):
- **17 Specialized Domain Tabs**:
  `Master` | `IT` | `Contacts` | `Assignee` | `SLA` | `Tasks` | `Invoices` | `Ledger` | `Recurring` | `Compliance` | `Notes` | `Passwords` | `Licenses` | `DSC` | `Documents` | `Group` | `Service Settings`
- **Statutory Tracking Modals**:
  - **Digital Signature Certificates (`AddDscModal.tsx`)**: Tracks Class 3 USB tokens, expiry dates, holder name, associated email/phone, and renewal reminders.
  - **Government Licenses (`AddLicenseModal.tsx`)**: Manages FSSAI, Trade License, Shops & Establishment, IEC, and Professional Tax registrations with renewal tracking.
  - **In/Out Document Movement Register (`AddDocumentInOutModal.tsx`)**: Audit register for physical books of account and documents received from or returned to clients with acknowledgment signatures.
  - **Secure Portal Credential Vault (`AddPasswordModal.tsx`)**: Secure storage for GST, Income Tax, TRACES, MCA/ROC, and EPFO/ESIC portal logins with masked password visibility and copy-to-clipboard.
  - **Practice Notes & Memos (`AddNoteModal.tsx`)**: Client correspondence notes, discussion minutes, and advisory records.

### 4. Enhanced Services Catalog & Cross-Task Synchronization
- **Interactive Service Detail Drawer (`ServiceDetailView.tsx`)**:
  - **Overview**: Standard fees, SAC code, tax rates, difficulty level, and turnaround time (TAT).
  - **SOP Tab**: Complete Standard Operating Procedure guidelines for execution teams.
  - **Sub-Tasks Tab**: Configurable milestone sub-tasks with estimated hours.
  - **Checklist Tab**: Quality and statutory checklist items with mandatory constraints.
  - **Document Request Tab**: Catalog of documents requested from the client.
  - **Clients Tab**: Directory of clients currently subscribed to this service.
- **Cross-Task Requirement Synchronization (`syncServiceToTasks`)**:
  - Built-in backend engine (`POST /api/v1/services/:id/sync-tasks`) that automatically updates sub-tasks, checklists, and document request templates across all active/in-progress tasks linked to the service whenever standard SOPs are revised.

### 5. Firm Team Management Directory
- Dedicated team directory (`frontend/src/app/team/page.tsx` & `teamData.ts`) displaying firm members, leadership roles (Partners, Senior Managers, Audit Seniors, Tax Associates, Article Assistants), department assignments, active task counts, and contact information.

---

## ☁️ Google Drive Cloud Storage & File Verification Engine

Ayatrio includes a production-grade cloud storage pipeline connecting directly to Google Drive via **Google Drive API v3**.

### 1. OAuth 2.0 Cloud Sync & Quota
- Uses an **OAuth 2.0 Client with offline Refresh Token delegation** to utilize the firm's personal Google Drive storage (**15 GB free tier or Google Workspace pooled storage**), completely eliminating the 0-byte quota bottleneck of standard Service Accounts.
- All practice documents are organized automatically under a dedicated parent folder specified by `GOOGLE_DRIVE_PARENT_FOLDER_ID`.
- Files uploaded are automatically visible in Google Drive web, desktop, and mobile applications.

### 2. 8 Standardized CA Practice Categories
Uploaded documents are isolated into standardized practice categories created dynamically inside Google Drive:

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
Before any file touches Google Drive or the database, it passes through our security engine ([`fileVerification.ts`](file:///e:/Job%20Task/Ayatrio/backend/src/modules/drive/fileVerification.ts)):
1. **Magic-Byte Signature Inspection**: Reads raw binary headers (`%PDF-` for PDFs, `\x89PNG\r\n\x1a\n` for PNGs, `PK\x03\x04` for Office/ZIP) to verify true format and reject spoofed extensions.
2. **Polyglot & Executable Detection**: Blocks PE executables (`MZ`), Windows shortcuts (`LNK`), ELF binaries, Mach-O binaries, and embedded scripts.
3. **Category Constraints**: Ensures the file format is authorized for the target practice category.
4. **Sanitization**: Strips dangerous shell metacharacters and directory traversals (`../`, quotes, special characters).
5. **SHA-256 Checksum**: Generates a tamper-proof cryptographic hash for every file to guarantee auditability and data integrity.

### 4. Inline Preview Stream & Lightbox Modal
- **Direct Stream Proxy (`GET /api/v1/drive/:id/preview`)**: Streams images and PDFs with `Content-Disposition: inline` and `Cross-Origin-Resource-Policy: cross-origin`. This completely bypasses Google CDN anti-hotlinking rules and third-party cookie restrictions, allowing photos and previews to render seamlessly inside `<img />` tags, table avatars, and iframes without 403/429 errors.
- **Smart Resolver (`filePreview.ts`)**: Automatically identifies Google Drive web links, Drive file IDs, local paths, or data URLs and transforms them into high-performance renderable URLs.
- **Interactive Lightbox Modal**: Built into [`DriveModule.tsx`](file:///e:/Job%20Task/Ayatrio/frontend/src/components/drive/DriveModule.tsx) with interactive zoom controls (`+`, `-`, `100% Reset`), embedded PDF preview, Google Drive links, and cryptographic hash inspectors.

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
   cd backend
   npm run get-drive-token
   ```
3. Open the displayed URL in your browser, log in with your Google account, and click **Allow**.
4. The script captures the authorization callback, exchanges it for a permanent `GOOGLE_DRIVE_REFRESH_TOKEN`, and automatically saves it into your `backend/.env` file.

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
7. Copy the **Refresh token** and paste it into `backend/.env`:
   ```env
   GOOGLE_DRIVE_REFRESH_TOKEN=1//0gGgE1oXeK8Tm...
   ```

---

## ↔️ Interactive Drag-Resizable Table Columns

Ayatrio implements custom, responsive, drag-resizable column borders across all primary data tables ([`useResizableColumns.ts`](file:///e:/Job%20Task/Ayatrio/frontend/src/hooks/useResizableColumns.ts), [`ColumnResizer.tsx`](file:///e:/Job%20Task/Ayatrio/frontend/src/components/ui/ColumnResizer.tsx)):

- **Implemented on**:
  - **Tasks List Table** (`TaskListView.tsx`)
  - **Clients Master Table** (`ClientsModule.tsx`, `ClientTableRow.tsx`)
  - **Services Catalog Table** (`ServicesModule.tsx`, `ServiceTableRow.tsx`)
  - **Leads Pipeline Table** (`LeadsModule.tsx`, `LeadTableRow.tsx`)
- **Key Capabilities**:
  - Drag handles positioned precisely between column boundaries.
  - Active visual indicator line during resize gestures.
  - Clamps minimum and maximum widths per column to prevent layout collapse.
  - Remembers custom widths via `localStorage` keyed per module.
  - **Zero SSR Hydration Errors**: State initializes with default server widths and loads persisted preferences after mount in a deferred `useEffect`.

---

## 💼 Core Application Modules

### 1. Task Management Engine (`/task`)
- **Task Summary Matrix**: Dynamic pivot view with multi-dimensional groupings, WIP totals, heatmap visualization, and CSV export.
- **Task List View**: Spreadsheet view with quick filters (My Tasks, Due Today, Live Tasks), category filtering, status pills, and direct detail drawers.
- **Task Detail View**: Running elapsed work timer (`HH:MM:SS`), interactive subtask and checklist item toggles, document request trackers, comment discussions with file attachments, and audit trail logs.
- **Add Task Modal**: Direct database links to Clients and Services, automated periodicity selection, and proforma invoice generation.

### 2. Clients Master Directory (`/clients` & `/client`)
- **Entity Management**: Individual, Private Limited, Public Limited, LLP, Partnership, and Trust entities with statutory compliance schemas.
- **Dedicated Second-Page Flow**: Clear navigation between listing and full-page editor ([`ClientForm.tsx`](file:///e:/Job%20Task/Ayatrio/frontend/src/components/clients/ClientForm.tsx)) with unsaved changes confirmation ([`DiscardConfirmationModal`](file:///e:/Job%20Task/Ayatrio/frontend/src/components/ui/DiscardConfirmationModal.tsx)).
- **17-Tab Drilldown Suite**: Detailed tabs for SLA, Contacts, Tasks, Invoices, Ledger, Notes, Passwords, Licenses, DSC tokens, and In/Out registers.
- **Promoter & Director Linking**: Live lead search dropdown (`PromoterSearchDropdown.tsx`) to link promoters directly to existing leads.
- **Profile Photo Upload**: Uploads directly to Google Drive `05_KYC_and_Identity_Proofs` with live inline avatar rendering.
- **Soft-Delete & Trash**: Active and Trash view toggle with instant restore.

### 3. Services Catalog (`/services` & `/service`)
- **CA Compliance Master**: Configurable catalog of recurring and one-time CA compliance services (GST, Income Tax, MCA/ROC, Audits, Payroll).
- **Service Detail View**: Comprehensive tabs for Overview, SOP, Milestone Sub-Tasks, Quality Checklists, Document Requests, and Subscribed Clients.
- **Automatic Task Synchronization**: Synchronizes SOP subtasks and statutory checklists to all active firm tasks.

### 4. Leads Pipeline (`/leads`)
- **Stage Tracking**: `New`, `Contacted`, `Qualified`, `Proposal`, and `Converted`.
- **Lead-to-Client Conversion**: Instant one-click conversion modal ([`ConvertLeadModal.tsx`](file:///e:/Job%20Task/Ayatrio/frontend/src/components/leads/ConvertLeadModal.tsx)) which provisions a client record while archiving the lead.
- **Attachment Uploads**: PAN, Aadhaar, and DIN attachments upload directly into categorized Google Drive folders.

### 5. Drive Document Repository (`/drive`)
- **Dual View Modes**: Switch between responsive Grid view (with image thumbnail banners) and detailed Table view.
- **Sidebar Category Counts**: Live count badges aggregating files across all 8 CA categories.
- **In-App Lightbox Viewer**: High-res document modal with zoom controls, embedded PDF viewer, and Google Drive links.
- **Upload Modal**: File drop-zone with live magic-byte verification report prior to saving.

### 6. Invoice & Billing Ledger (`/invoice`)
- **Invoicing Engine**: Proforma and Tax Invoices with SAC code mapping and automated CGST/SGST/IGST computations.
- **Reimbursement Tracking**: Out-of-pocket expense tracking and billing reconciliations.
- **Financial Analytics**: Revenue breakdowns, accounts receivable aging, and collections reporting.

### 7. Team Directory (`/team`)
- Firm hierarchy directory categorized by Partners, Managers, Seniors, and Associates with active workload indicators and contact info.

### 8. Statutory Notices & Calendar (`/notices`)
- **Multi-Portal Statutory Hub**: Dedicated tabs for **GST Notices** (ASMT-10, DRC-01A, REG-17, SCNs), **TDS Notices** (TRACES 201 short deduction, 234E late filing fee), and **Income Tax Notices** (143(1), 148, 142(1)).
- **Interactive Notice Calendar**: Monthly calendar grid visualizing pending response due dates and scheduled department hearings with color-coded portal badges.
- **Status & Compliance Workflow**: Structured lifecycle stages: `New`, `Response Preparing`, `Under Dept Review`, `Hearing Scheduled`, and `Closed`.
- **Notice Metrics & Intelligence**: Real-time summary header cards displaying Total Notices, Response Due in 7 Days, High-Risk / Priority counts, Hearing dates, and aggregate Demand/Refund figures.
- **Client Grouping & Search**: Search by notice reference number, section, or client name with drag-resizable table columns (`ColumnResizer.tsx`) and client dossier drilldown.

### 9. Statutory Compliance Matrix (`/compliance`)
- **Cross-Period Filing Matrix Grid**: Multi-period matrix mapping return filings across statutory practice domains:
  - **GST Compliance**: GSTR-1, GSTR-3B, GSTR-9.
  - **TDS Compliance**: Form 24Q (Salary), Form 26Q (Non-Salary), Form 27Q.
  - **Income Tax Compliance**: ITR-6 (Corporate), ITR-5, Advance Tax quarterly installments.
- **Dynamic Period Resolution**: Column headers adapt dynamically based on frequency:
  - **Monthly (`monthly`)**: Columns `M04` through `M03` (April through March).
  - **Quarterly (`quarterly`)**: Columns `Q1`, `Q2`, `Q3`, and `Q4`.
  - **Annual (`annual`)**: Dedicated `ANNUAL` return column.
- **Filing Lifecycle Badges**: Visual indicator pills for each period cell:
  - `Filed` (Green badge with attached acknowledgment receipt document view).
  - `Pending` (Yellow badge indicating due or work-in-progress).
  - `Missed` / `Overdue` (Red badge for passed statutory deadlines).
- **Compliance Document Drawer**: Slide-over drawer to inspect filing acknowledgments, view ARN / Challan numbers, and upload verification receipts.
- **Batch Entry Updates**: Backend batching endpoint (`POST /api/v1/compliance/entries/batch`) allowing bulk status transitions and receipt attachments.
- **Financial Year Switcher**: Toggle between active assessment periods (`2025-26`, `2026-27`) with persistent client filtering.

### 10. Gmail Integration & Client Communication (`/email`)
- **OAuth 2.0 Google Workspace / Gmail Sync**: Secure token-based integration allowing CA practitioners to link their practice Google accounts.
- **Two-Pane Responsive Inbox**: Split layout featuring a searchable Thread List on the left and full conversation history / message inspector on the right.
- **Client Correspondence Search**: Real-time search across subject lines, sender names, and body text with unread status indicators.
- **Compose & Direct Reply Modal**: In-app modal supporting rich-text composition, CC/BCC headers, subject line generation, and immediate transmission through the Gmail API.
- **Token Management & Disconnect**: Safe session disconnection and token revocation with zero storage of Google account passwords.

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

### Tasks (`/api/v1/tasks`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/tasks` | List tasks (supports `category`, `quickFilter`, `status`, `assigneeName`, `department`, `financialYear`, `search`, `page`, `limit`) |
| `GET` | `/tasks/stats` | Real-time task statistics (WIP, pending, in-progress, review, changes, overdue, completed, ready-to-bill, cancelled) |
| `GET` | `/tasks/summary-matrix` | Multi-dimensional pivot matrix grouped by `groupBy` (Assigned To, Category, Client, etc.) with grand totals |
| `GET` | `/tasks/:id` | Get full task details including subtasks, checklist, documents, and comments |
| `POST` | `/tasks` | Create new task (Zod-validated payload) |
| `PUT` | `/tasks/:id` | Update task fields, priority, status, dates, or assignees |
| `DELETE` | `/tasks/:id` | Soft-delete task (moves to trash) |
| `POST` | `/tasks/:id/comments` | Post a new comment/activity log with optional file attachments |
| `PATCH` | `/tasks/:id/subtasks/:subTaskId/toggle` | Toggle completion status of a milestone sub-task |
| `PATCH` | `/tasks/:id/checklist/:itemId/toggle` | Toggle completion status of a statutory checklist item |
| `PATCH` | `/tasks/:id/document-requests/:docId/toggle` | Toggle receipt/status of a client document request |

### Services (`/api/v1/services`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/services` | List services (supports `search`, `category`, `frequency`, `difficulty`, `status`, `page`, `limit`) |
| `GET` | `/services/stats` | Service analytics (total, active, recurring, categories, average professional fee) |
| `POST` | `/services` | Create a new service entry |
| `GET` | `/services/:id` | Get service details by ID |
| `PATCH` | `/services/:id` | Update service pricing, SOP, checklist, or sub-tasks |
| `DELETE` | `/services/:id` | Soft-delete service |
| `POST` | `/services/:id/restore` | Restore soft-deleted service |
| `POST` | `/services/:id/sync-tasks` | Synchronize revised subtasks, checklist, and document requests to all active tasks linked to this service |

### Clients (`/api/v1/clients`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/clients` | Paginated client list (supports `search`, `type`, `group`, `active`, `sortBy`, `includeDeleted`) |
| `POST` | `/clients` | Create a new client (Zod-validated payload) |
| `GET` | `/clients/:id` | Retrieve client details by ID |
| `PATCH` | `/clients/:id` | Partial update of client fields |
| `DELETE` | `/clients/:id` | Soft-delete client (moves to Trash) |
| `POST` | `/clients/:id/restore` | Restore soft-deleted client |

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

### Notices (`/api/v1/notices`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/notices` | List notices filtered by `portal` (`GST`, `TDS`, `IT`), `status`, `search`, `page`, `limit` |
| `GET` | `/notices/summary` | Real-time counts of notices by portal and response risk urgency |
| `GET` | `/notices/calendar` | Monthly calendar events with due dates and scheduled department hearings |
| `GET` | `/notices/clients` | Grouped client listing with active notice indicators |
| `GET` | `/notices/credits` | Department portal automated crawl entitlement and balance checks |
| `PATCH` | `/notices/:id` | Update notice status, response drafts, hearing dates, or resolution notes |

### Compliance (`/api/v1/compliance`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/compliance/categories` | List active compliance domains (`cat-gst`, `cat-tds`, `cat-it`, `cat-mca`) |
| `GET` | `/compliance/grid` | Return period compliance matrix (`categoryId`, `fy`, `frequency`) with cell records |
| `GET` | `/compliance/calendar` | Return filing deadlines mapped onto a month calendar |
| `PUT` | `/compliance/entries` | Upsert single compliance entry (status, filed date, acknowledgment document) |
| `POST` | `/compliance/items/refresh` | Trigger recalculation and synchronization of statutory item templates |

### Portal Sync (`/api/v1/sync`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/sync/entitlement` | Check client portal crawler entitlements and API quotas |
| `GET` | `/sync/eligibility` | Verify client portal credentials eligibility for automatic sync |
| `POST` | `/sync/clients` | Trigger batch statutory sync jobs across GSTN, TRACES, and Income Tax portals |
| `GET` | `/sync/jobs` | Monitor status of active and historical background portal crawl jobs |
| `GET` | `/sync/activity` | Audit log of recent synchronization requests and portal results |

### Gmail Integration (`/api/gmail`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/auth/google` | Generates Google OAuth 2.0 consent URL requesting Gmail scopes |
| `GET` | `/api/auth/google/callback` | Exchanges authorization code for tokens and persists user session |
| `GET` | `/api/gmail/status` | Checks active Gmail connection status and authenticated email address |
| `GET` | `/api/gmail/threads` | Paginated message threads list with query search (`q`) and page tokens |
| `GET` | `/api/gmail/thread/:id` | Full thread message history with headers, body content, and sender details |
| `POST` | `/api/gmail/send` | Transmits an email or reply via the Gmail API |
| `POST` | `/api/gmail/disconnect` | Revokes OAuth tokens and clears current mailbox session |

### Health Check (`/api/v1/health`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Server uptime, timestamp, memory usage, and MongoDB connectivity status |

---

## 🔐 Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | Optional | `development` | Runtime environment (`development`, `production`, `test`) |
| `PORT` | Optional | `5000` | Port for Express HTTP server |
| `API_PREFIX` | Optional | `/api/v1` | URL path prefix for API routes |
| `MONGODB_URI` | **Required** | Enter the rotated Atlas URI in ignored `backend/.env` | The backend selects the `ayatrio_crm` database |
| `CORS_ORIGIN` | Optional | `http://localhost:3000,http://localhost:3001` | Allowed CORS origins (comma-separated) |
| `RATE_LIMIT_WINDOW_MS`| Optional | `900000` (15m) | Rate limiting window in milliseconds |
| `RATE_LIMIT_MAX_REQUESTS`| Optional | `500` | Max requests allowed per window per IP |
| `LOG_LEVEL` | Optional | `info` | Winston log level (`debug`, `http`, `info`, `warn`, `error`) |
| `GOOGLE_DRIVE_CLIENT_ID` | **Required for Drive** | — | Google Cloud OAuth 2.0 Client ID |
| `GOOGLE_DRIVE_CLIENT_SECRET` | **Required for Drive** | — | Google Cloud OAuth 2.0 Client Secret |
| `GOOGLE_DRIVE_REFRESH_TOKEN` | **Required for Drive** | — | Google Drive offline Refresh Token |
| `GOOGLE_DRIVE_PARENT_FOLDER_ID` | Optional | `root` | Parent folder ID in Google Drive (e.g. "Ayatrio Files") |
| `MAX_FILE_SIZE_MB` | Optional | `25` | Maximum allowed file upload size in megabytes |

### Frontend (`frontend/.env.local`)

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Optional | `http://localhost:5000/api/v1` | Base address for backend API calls |
| `GOOGLE_CLIENT_ID` | **Required for Gmail** | — | Google Cloud OAuth 2.0 Web Client ID |
| `GOOGLE_CLIENT_SECRET` | **Required for Gmail** | — | Google Cloud OAuth 2.0 Web Client Secret |

---

## 🚀 Quick Start & Installation

### 1. Backend Setup (`backend`)

```bash
# 1. Navigate to backend directory
cd backend

# 2. Install dependencies
npm install

# 3. Create environment file from template
cp .env.example .env

# 4. Fill in MONGODB_URI and your GOOGLE_DRIVE credentials in .env

# 5. (Optional) Run OAuth token helper if you need a refresh token
npm run get-drive-token

# 6. Seed mock client, notices, and compliance matrix (at most 5 records each)
npm run seed:mock-client

# 7. Start backend development server
npm run dev
```

The backend server will start at:
- **Base URL**: `http://localhost:5000`
- **API Root**: `http://localhost:5000/api/v1`
- **Health Check**: `http://localhost:5000/api/v1/health`
- **Drive Status**: `http://localhost:5000/api/v1/drive/status`
- **Tasks Stats**: `http://localhost:5000/api/v1/tasks/stats`
- **Notices**: `http://localhost:5000/api/v1/notices`
- **Compliance Grid**: `http://localhost:5000/api/v1/compliance/grid?categoryId=cat-gst&fy=2025-26`

### 2. Frontend Setup (`frontend`)

```bash
# 1. In a new terminal, navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Create local environment file
cp .env.example .env.local

# 4. Fill in GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET for Gmail integration

# 5. Start Next.js development server
npm run dev
```

Open your browser and navigate to:
- **Task Management**: `http://localhost:3000/task`
- **Clients Master**: `http://localhost:3000/clients`
- **Services Catalog**: `http://localhost:3000/services`
- **Drive Cloud Documents**: `http://localhost:3000/drive`
- **Leads Pipeline**: `http://localhost:3000/leads`
- **Invoicing & Billing**: `http://localhost:3000/invoice`
- **Team Directory**: `http://localhost:3000/team`
- **Statutory Notices**: `http://localhost:3000/notices`
- **Compliance Matrix**: `http://localhost:3000/compliance`
- **Gmail Inbox**: `http://localhost:3000/email`

---

## 🛡 Data Models & Soft-Delete Protocol

All Mongoose schemas in `backend` implement our custom `softDeletePlugin`:
- Records include `isDeleted: { type: Boolean, default: false, index: true }`, `deletedAt: Date`, and `deletedBy: String`.
- Queries automatically filter out deleted documents unless `{ includeDeleted: true }` is explicitly provided.
- Full auditability is preserved; documents and tasks are never physically purged unless explicitly requested by compliance requirements.

---

## 🛠 Developer Conventions & Contribution

### Code Standards
- **Strict TypeScript**: 100% type-checked code with `npm run type-check` in backend and `npm run build` in frontend.
- **Zod Validation**: Every request body, query parameter, and route parameter is validated before reaching controllers.
- **Graceful Cloud Fallback**: If Google Drive credentials are misconfigured, the Drive service transitions automatically to secure local storage fallback mode without 500 errors.
- **Component Splitting**: Heavy forms (`ClientForm.tsx`, `AddTaskModal.tsx`, `ClientDetailView.tsx`) use focused sub-components to prevent unnecessary re-renders.

### Validation Commands

```bash
# Run backend TypeScript check
cd backend
npm run type-check

# Run backend production build
npm run build

# Run frontend Next.js production build
cd ../frontend
npm run build
```

---

## 📄 License

This software is confidential and proprietary to **Ayatrio**. All rights reserved.
