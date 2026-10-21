# 🎨 Ayatrio Frontend — CA Practice Management & Compliance CRM

A unified, modern Practice Management and Statutory Compliance platform built for Chartered Accountants, Tax Practitioners, and Corporate Advisory Firms. Built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**, **Tailwind CSS v4**, and **TanStack Query**.

---

## 🌟 Overview & Architecture

Ayatrio delivers a high-performance single-pane-of-glass workspace for professional accounting practices:
* **Framework**: Next.js 16.4 (App Router with Turbopack) + React 19
* **Styling**: Tailwind CSS v4 + Vanilla CSS Design Tokens
* **Theme Support**: Seamless Light & Dark mode via CSS variables & `@custom-variant dark`
* **Table Interactions**: Custom drag-resizable table columns with persisted preferences
* **State Management & Querying**: TanStack React Query v5 with optimistic updates and debounced searches
* **Icons**: Lucide React

---

## 🚀 Key Modules & Capabilities

### 1. Task Management Engine (`/task` & `/task/view/[id]`)
* **Task Summary Matrix (`TaskSummaryView.tsx`)**:
  * Multi-dimensional pivot matrix aggregating active tasks by **Assigned To**, **Category**, **Client**, **Service**, **Priority**, **Task Type**, **Month**, or **Financial Year**.
  * Dynamic calculation of WIP sub-totals (Pending + In Progress + Sent for Review + Request Changes), Overdue, Due Today, Completed, and Ready to Bill counts.
  * Heatmap visualization toggle and one-click CSV Export.
  * Direct click-through from cell values to filtered task lists.
* **Spreadsheet Task List (`TaskListView.tsx`)**:
  * Summary status cards (WIP, Pending, In Progress, Review, Changes, Overdue, Completed, Ready to Bill, Cancelled, All).
  * Category tabs: `All Categories`, `GST`, `Income Tax`, `MCA`, `Audit`, `Accounting`, `Other`.
  * Quick filters: `All Tasks`, `My Tasks`, `Due Today`, `Live Task`.
  * Filters by Department, Assignee, and Financial Year.
  * Custom drag-resizable columns (`ColumnResizer.tsx`).
* **Task Detail View (`TaskDetailView.tsx`)**:
  * **Live Stopwatch Timer**: Play/Pause running work timer (`HH:MM:SS`) for tracking accurate hours on jobs.
  * **Task Discussion & Audit Thread**: Internal team comments, notes, and file attachments.
  * **Interactive Sub-Tabs**: Milestone sub-tasks with completion toggles, statutory checklists (mandatory/optional flags), client document requests, invoice links, and out-of-pocket expenses.
  * **Contextual Sidebar**: Client snapshot, Service SOP guidance, Assignee/Reviewer cards, due dates, and billing classification (`Billable` / `Non Billable`).
* **Task Creation (`AddTaskModal.tsx`)**:
  * Live database lookup of Clients and Services.
  * Auto-loads service periodicity, frequency, and financial years.
  * Proforma invoice creation toggle.

### 2. Clients Master Directory (`/clients` & `/client`)
* **Spreadsheet Table & Second-Page Editor**:
  * Master listing with drag-resizable columns, status badges, and quick actions.
  * Dedicated full-page editor ([`ClientForm.tsx`](src/components/clients/ClientForm.tsx)) with unsaved changes confirmation dialog ([`DiscardConfirmationModal.tsx`](src/components/ui/DiscardConfirmationModal.tsx)).
* **17-Tab Client Detail Suite (`ClientDetailView.tsx`)**:
  * Drilldown tabs: `Master`, `IT`, `Contacts`, `Assignee`, `SLA`, `Tasks`, `Invoices`, `Ledger`, `Recurring`, `Compliance`, `Notes`, `Passwords`, `Licenses`, `DSC`, `Documents`, `Group`, `Service Settings`.
* **Statutory Management Modals**:
  * **Digital Signature Certificates (`AddDscModal.tsx`)**: Track Class 3 USB tokens, validity dates, holder info, and renewal alarms.
  * **Government Licenses (`AddLicenseModal.tsx`)**: Manage FSSAI, Trade License, Shops & Establishment, IEC, and Professional Tax records.
  * **Document Movement Register (`AddDocumentInOutModal.tsx`)**: In/Out register for client books of account, audit files, and acknowledgment receipts.
  * **Credential Vault (`AddPasswordModal.tsx`)**: Masked, secure storage for GST, Income Tax, TRACES, MCA/ROC, and EPFO/ESIC portal passwords with copy action.
  * **Internal Notes (`AddNoteModal.tsx`)**: Practice correspondence memos and meeting records.

### 3. Services Catalog (`/services` & `/service`)
* **Catalog Grid & Master Table**:
  * Pre-configured and custom CA services with recurring schedules, turnaround time (TAT), and professional fee scales.
* **Service Detail View (`ServiceDetailView.tsx`)**:
  * Overview of fee schedules, SAC codes, and difficulty ratings.
  * Standard Operating Procedure (SOP) instructions.
  * Milestone sub-tasks and mandatory quality checklists.
  * Document requirement lists for clients.
  * Directory of clients mapped to the service.

### 4. Cloud Document Drive (`/drive`)
* **Google Drive OAuth 2.0 Integration**:
  * Direct synchronization with 15GB Google Drive storage.
  * Automated organization across 8 CA practice categories (`01_Tax_and_GST_Filings`, `02_Audited_Financials`, `03_Invoices_and_Billing`, etc.).
* **High-Res Lightbox Modal**:
  * Instant inline image and PDF viewing with interactive zoom controls (`+`, `-`, `Reset`).
  * Cryptographic SHA-256 and magic-byte inspection report.
* **Secure Upload Modal**:
  * Pre-upload client-side and server-side magic-byte verification.

### 5. Invoice & Billing Ledger (`/invoice`)
* Proforma & Tax Invoicing with SAC codes and automated CGST/SGST/IGST calculations.
* Out-of-pocket expense tracking and fee reconciliation.
* Financial analytics and accounts receivable aging summaries.

### 6. Leads Pipeline (`/leads`)
* Visual pipeline stages (`New`, `Contacted`, `Qualified`, `Proposal`, `Converted`).
* One-click conversion modal (`ConvertLeadModal.tsx`) to convert a prospect into a client.

### 7. Team Directory (`/team`)
* Firm hierarchy directory by Partners, Managers, Seniors, and Associates with active workload indicators and contact info.

### 8. Statutory Notices & Calendar (`/notices`)
* Multi-portal notice synchronization across GST, Income Tax, and TRACES.
* Interactive Notice Calendar with Month grid and response due date tracking.

---

## 🎨 Design System & Color Tokens

Standardized design tokens defined in [`src/app/globals.css`](src/app/globals.css):

| Variable | Light Mode | Dark Mode | Usage |
| :--- | :--- | :--- | :--- |
| `--primary` | `#31719B` | `#31719B` | Main brand color, active indicators, highlights |
| `--primary-hover` | `#3D88BF` | `#8276f2` | Button and link hover states |
| `--primary-light` | `#eeedfd` | `rgba(115, 103, 240, 0.16)` | Active nav item background, subtle tags |
| `--primary-border` | `#d2cdfb` | `rgba(115, 103, 240, 0.35)` | Accent borders and separators |
| `--bg-app` | `#ffffff` | `#0f172a` | App body background |
| `--bg-surface` | `#ffffff` | `#1e293b` | Header, sidebar, and card backgrounds |
| `--bg-subtle` | `#f3f4f6` | `#1e293b` | Secondary container backgrounds |
| `--text-main` | `#111827` | `#f8fafc` | Primary typography |
| `--text-muted` | `#4b5563` | `#94a3b8` | Secondary labels and inactive items |
| `--border-main` | `#e5e7eb` | `#334155` | Structural borders and dividers |
| `--status-online` | `#22c55e` | `#22c55e` | Live online indicator green dot |

---

## 📂 Project Architecture

```
frontend/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout with AppShell wrapper
│   │   ├── globals.css               # Design tokens, Tailwind v4 imports & custom variants
│   │   ├── page.tsx                  # Practice Home Dashboard
│   │   ├── task/                     # Task management views
│   │   │   ├── page.tsx              # Main task tabs (Summary Matrix, List, Subtasks, Analytics)
│   │   │   └── view/[id]/            # Direct task detail page (SSG static params)
│   │   ├── clients/ & client/        # Client master directory & full-page creator
│   │   ├── services/ & service/      # Services catalog & full-page creator
│   │   ├── team/                     # Team member directory
│   │   ├── drive/                    # Google Drive cloud storage
│   │   ├── leads/                    # Leads pipeline & conversion
│   │   ├── invoice/                  # Invoice & billing ledger
│   │   ├── notices/                  # Statutory notices & calendar
│   │   └── ...                       # Additional modules (compliance, chat, etc.)
│   ├── components/
│   │   ├── tasks/                    # TaskListView, TaskSummaryView, TaskDetailView, AddTaskModal
│   │   ├── clients/                  # ClientDetailView, ClientForm, Modals:
│   │   │   └── modals/               # AddDscModal, AddLicenseModal, AddPasswordModal, AddNoteModal, AddDocumentInOutModal
│   │   ├── services/                 # ServiceDetailView, ServiceForm, ServiceTableRow
│   │   ├── drive/                    # DriveModule, FileUploadModal, Lightbox viewer
│   │   ├── invoice/                  # Invoicing components, tables, analytics
│   │   ├── ui/                       # ColumnResizer, Select, Pagination, Discard Modal
│   │   └── ...                       # Header, Sidebar, ProfileDrawer, SearchModal
│   ├── hooks/                        # useResizableColumns, useDebounce, TanStack Query hooks
│   ├── services/                     # Typed API clients (taskApi, clientApi, serviceApi, driveApi)
│   ├── data/                         # Reference datasets (taskData, teamData, crmData, serviceData)
│   └── utils/                        # filePreview.ts (Direct image/stream resolver)
├── .env.example                      # Environment template
├── package.json
├── tsconfig.json
└── README.md
```

---

## ⚙️ Installation & Local Development

### Prerequisites
* **Node.js**: `v18.18.0` or higher (Node 20+ recommended)
* **npm**

### Quick Start
```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Configure local environment
cp .env.example .env.local

# 4. Start local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your web browser.

### Available Scripts
* `npm run dev`: Launches development server with Turbopack fast reload.
* `npm run build`: Compiles production build with optimization and static route analysis.
* `npm run start`: Starts production Node server.
* `npm run lint`: Runs ESLint code quality checks.

---

## 📄 License
Internal proprietary software for Ayatrio. All rights reserved.
