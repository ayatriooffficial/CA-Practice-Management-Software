# 🚀 Ayatrio Backend — Production-Grade Modular MVC Architecture

An enterprise-ready, high-speed, secure backend engineered with **TypeScript**, **Node.js**, **Express.js**, and **MongoDB (Mongoose)** for **Ayatrio CA Practice Management CRM**.

---

## 📑 Table of Contents
1. [Architecture & Design Principles](#1-architecture--design-principles)
2. [Folder Structure](#2-folder-structure)
3. [Security & Performance Implementation](#3-security--performance-implementation)
4. [Soft Delete Mechanism](#4-soft-delete-mechanism)
5. [Database Schemas & Modules](#5-database-schemas--modules)
   - [5.1 Task Schema & Pivot Matrix Engine](#51-task-schema--pivot-matrix-engine)
   - [5.2 Service Schema & Task Requirement Synchronization](#52-service-schema--task-requirement-synchronization)
   - [5.3 Client Master Schema](#53-client-master-schema)
   - [5.4 Lead Pipeline Schema](#54-lead-pipeline-schema)
   - [5.5 Drive Document & Verification Schema](#55-drive-document--verification-schema)
   - [5.6 Statutory Notice Schema](#56-statutory-notice-schema)
   - [5.7 Compliance Matrix Schema](#57-compliance-matrix-schema)
   - [5.8 Integration Schema & Global Practice Credentials](#58-integration-schema--global-practice-credentials)
6. [API Endpoints Reference](#6-api-endpoints-reference)
   - [6.1 Task Endpoints (`/api/v1/tasks`)](#61-task-endpoints-apiv1tasks)
   - [6.2 Service Endpoints (`/api/v1/services`)](#62-service-endpoints-apiv1services)
   - [6.3 Client Endpoints (`/api/v1/clients`)](#63-client-endpoints-apiv1clients)
   - [6.4 Drive & Document Endpoints (`/api/v1/drive`)](#64-drive--document-endpoints-apiv1drive)
   - [6.5 Lead Endpoints (`/api/v1/leads`)](#65-lead-endpoints-apiv1leads)
   - [6.6 Notice Endpoints (`/api/v1/notices`)](#66-notice-endpoints-apiv1notices)
   - [6.7 Compliance Endpoints (`/api/v1/compliance`)](#67-compliance-endpoints-apiv1compliance)
   - [6.8 Portal Sync Endpoints (`/api/v1/sync`)](#68-portal-sync-endpoints-apiv1sync)
   - [6.9 Integration Endpoints (`/api/v1/integrations`)](#69-integration-endpoints-apiv1integrations)
   - [6.10 System Health](#610-system-health)
7. [Getting Started & Execution](#7-getting-started--execution)
8. [Environment Configuration](#8-environment-configuration)

---

## 1. Architecture & Design Principles

The backend utilizes a **Domain-Driven Modular MVC (Model-View-Controller)** pattern. Each domain entity (`task`, `service`, `client`, `lead`, `drive`) is encapsulated into an isolated, self-contained module containing its own:
- **Interfaces (`*.interface.ts`)**: Type definitions, enums, sub-schemas, and Mongoose document interfaces.
- **Model (`*.model.ts`)**: Schema definitions, compound/text indexes, hooks, and soft-delete plugins.
- **Validation (`*.validation.ts`)**: Strict runtime schema validation using **Zod**.
- **Service (`*.service.ts`)**: Business logic, database queries, aggregation pipelines, and cross-module sync.
- **Controller (`*.controller.ts`)**: HTTP request handling, input extraction, and response formatting.
- **Routes (`*.routes.ts`)**: REST route declarations, middleware bindings, and rate limits.

---

## 2. Folder Structure

```
backend/
├── dist/                          # Compiled production JavaScript bundle
├── scripts/
│   └── get-refresh-token.js       # Interactive Google Drive OAuth 2.0 token generator
├── src/
│   ├── config/                    # System configurations
│   │   ├── env.ts                 # Validated environment variables (Zod)
│   │   ├── database.ts            # Mongoose connection pool & event handlers
│   │   └── logger.ts              # Winston structured logging
│   ├── constants/                 # Immutable application constants
│   │   ├── httpStatusCodes.ts     # Standardized HTTP status codes
│   │   └── messages.ts            # Centralized API messages
│   ├── middlewares/               # Express middleware chain
│   │   ├── errorHandler.ts        # Centralized production error handler
│   │   ├── notFoundHandler.ts     # 404 handler for unmatched routes
│   │   ├── rateLimiter.ts         # IP-based sliding window rate limiters
│   │   ├── requestLogger.ts       # Morgan HTTP logger stream to Winston
│   │   └── validateRequest.ts     # Zod request validation middleware
│   ├── modules/                   # Feature-based MVC Modules
│   │   ├── task/                  # Task Domain Module
│   │   │   ├── task.interface.ts
│   │   │   ├── task.model.ts
│   │   │   ├── task.validation.ts
│   │   │   ├── task.service.ts
│   │   │   ├── task.controller.ts
│   │   │   └── task.routes.ts
│   │   ├── service/               # Service Catalog Domain Module
│   │   │   ├── service.interface.ts
│   │   │   ├── service.model.ts
│   │   │   ├── service.validation.ts
│   │   │   ├── service.service.ts
│   │   │   ├── service.controller.ts
│   │   │   └── service.routes.ts
│   │   ├── client/                # Client Master Domain Module
│   │   │   ├── client.interface.ts
│   │   │   ├── client.model.ts
│   │   │   ├── client.validation.ts
│   │   │   ├── client.service.ts
│   │   │   ├── client.controller.ts
│   │   │   └── client.routes.ts
│   │   ├── lead/                  # Lead Pipeline Domain Module
│   │   │   ├── lead.interface.ts
│   │   │   ├── lead.model.ts
│   │   │   ├── lead.validation.ts
│   │   │   ├── lead.service.ts
│   │   │   ├── lead.controller.ts
│   │   │   └── lead.routes.ts
│   │   ├── drive/                 # Google Drive Storage & Verification
│   │   │   ├── drive.interface.ts
│   │   │   ├── drive.model.ts
│   │   │   ├── drive.validation.ts
│   │   │   ├── drive.service.ts
│   │   │   ├── drive.google.service.ts
│   │   │   ├── drive.controller.ts
│   │   │   ├── drive.routes.ts
│   │   │   └── fileVerification.ts
│   │   ├── notice/                # Statutory Notices (GST, TDS, IT)
│   │   │   ├── notice.interface.ts
│   │   │   ├── notice.model.ts
│   │   │   ├── notice.validation.ts
│   │   │   ├── notice.service.ts
│   │   │   ├── notice.controller.ts
│   │   │   └── notice.routes.ts
│   │   ├── compliance/            # Statutory Compliance Matrix
│   │   │   ├── compliance.interface.ts
│   │   │   ├── compliance.model.ts
│   │   │   ├── compliance.validation.ts
│   │   │   ├── compliance.service.ts
│   │   │   ├── compliance.controller.ts
│   │   │   └── compliance.routes.ts
│   │   ├── sync/                  # Portal Synchronization Engine
│   │   │   └── ...
│   │   └── integration/           # Global Integration & Practice Credentials
│   │       ├── integration.interface.ts
│   │       ├── integration.model.ts
│   │       ├── integration.service.ts
│   │       ├── integration.controller.ts
│   │       └── integration.routes.ts
│   │       ├── sync.interface.ts
│   │       ├── sync.model.ts
│   │       ├── sync.validation.ts
│   │       ├── sync.service.ts
│   │       ├── sync.controller.ts
│   │       └── sync.routes.ts
│   ├── shared/                    # Cross-cutting utilities & plugins
│   │   ├── plugins/
│   │   │   └── softDelete.plugin.ts  # Production Mongoose soft-delete plugin
│   │   └── utils/
│   │       ├── apiError.ts        # Custom operational AppError
│   │       ├── apiResponse.ts     # Standardized JSend/REST envelope response
│   │       ├── asyncHandler.ts    # Async wrapper catching unhandled promise rejections
│   │       └── queryBuilder.ts    # High-speed pagination, search, sort, and filter
│   ├── app.ts                     # Express application bootstrapping & security stack
│   ├── routes.ts                  # Root API router (/api/v1)
│   └── server.ts                  # Server entrypoint with graceful shutdown
├── .env                           # Local environment config
├── .env.example                   # Environment configuration template
├── .gitignore
├── package.json
└── tsconfig.json
```

---

## 3. Security & Performance Implementation

| Feature | Implementation | Purpose |
|---|---|---|
| **Security Headers** | `helmet` | Mitigates XSS, clickjacking, sniffing, and MIME sniffing attacks |
| **CORS Policy** | `cors` | Configurable whitelist for permitted frontend origins |
| **HPP Protection** | `hpp` | Prevents HTTP Parameter Pollution attacks |
| **Rate Limiting** | `express-rate-limit` | 500 req/15min general limit + mutation rate limiters |
| **Runtime Validation** | `zod` | Validates body, query, and params before reaching controllers |
| **Cryptographic Hashing**| `sha256` & Magic Bytes | Validates genuine file formats and rejects spoofed binary extensions |
| **Indexing** | Compound & Text Indexes | Compound indexes on `(isDeleted, status, assigneeName, category, targetDueDate)` |

---

## 4. Soft Delete Mechanism

All entities implement our Mongoose `softDeletePlugin`:
- Records include `isDeleted: { type: Boolean, default: false, index: true }`, `deletedAt: Date`, and `deletedBy: String`.
- `find`, `findOne`, `countDocuments`, and `aggregate` queries automatically exclude deleted documents unless `{ includeDeleted: true }` is explicitly provided.
- Includes instantaneous `.restore()` hooks to undelete archived records without data loss.

---

## 5. Database Schemas & Modules

### 5.1 Task Schema & Pivot Matrix Engine
- **Task Model (`task.model.ts`)**:
  - `taskName`, `clientId`, `clientName`, `serviceId`, `serviceName`, `category` (GST, Income Tax, MCA, Audit, Accounting, Other).
  - `status`: `Pending`, `In Progress`, `Sent for Review`, `Request Changes`, `Completed`, `Overdue`, `Ready to Bill`, `Cancelled`.
  - `priority`: `Low`, `Medium`, `High`, `Urgent`.
  - `frequency`: `Monthly`, `Quarterly`, `Annually`, `One-Time`.
  - `billingType`: `Billable`, `Non Billable`.
  - Sub-documents:
    - `subTasks`: Array of `{ id, title, completed, timeSpent, completedAt }`.
    - `checklist`: Array of `{ id, title, completed, isMandatory, completedAt }`.
    - `documentRequests`: Array of `{ id, title, status: 'Pending'|'Received', isMandatory, receivedAt }`.
    - `comments`: Array of `{ id, author, text, timestamp, attachments }`.
- **Dynamic Pivot Matrix Aggregator (`TaskService.getTaskSummaryMatrix`)**:
  - Computes real-time breakdowns grouped by `Assigned To`, `Category`, `Client`, `Service`, `Priority`, `Task Type`, `Month`, or `Financial Year`.
  - Produces dynamic WIP sub-totals, overdue calculations, and grand total footers.

### 5.2 Service Schema & Task Requirement Synchronization
- **Service Model (`service.model.ts`)**:
  - `name`, `category`, `frequency`, `difficulty`, `professionalFee`, `taxRate`, `sacCode`, `tatDays`, `tatHours`, `sop`, `subTasks`, `checklist`, `documentRequests`.
- **Cross-Task Requirement Sync (`syncServiceToTasks`)**:
  - Built-in synchronization engine that cascades updated subtasks, checklists, and document request templates directly into all active tasks associated with that service.

### 5.3 Client Master Schema
- **Client Model (`client.model.ts`)**:
  - `fileNo`, `clientName`, `tradeName`, `pan`, `clientType`, `group`, `status`, `mobile`, `email`, `active`.
  - Sub-document trackers: `licenses`, `dscList`, `documentInOut`, `passwords`, `notes`, `services`.

### 5.4 Lead Pipeline Schema
- **Lead Model (`lead.model.ts`)**:
  - `leadCode`, `name`, `email`, `mobile`, `stage` (`New`, `Contacted`, `Qualified`, `Proposal`, `Converted`), `source`, `priority`, `pan`, `aadhaar`, `din`.
  - Includes atomic lead-to-client conversion transaction.

### 5.5 Drive Document & Verification Schema
- **Drive Model (`drive.model.ts`)**:
  - `googleFileId`, `originalName`, `sanitizedName`, `mimeType`, `sizeBytes`, `categoryKey`, `targetFolderId`, `checksumSha256`, `magicByteHex`, `verifiedBy`.

### 5.6 Statutory Notice Schema
- **Notice Model (`notice.model.ts`)**:
  - `clientId`, `noticeNumber`, `portal` (`GST`, `TDS`, `IT`), `section`, `title`, `description`, `issuedDate`, `dueDate`, `status` (`new`, `response_preparing`, `under_dept_review`, `hearing_scheduled`, `closed`), `demandAmount`, `refundAmount`, `hearingDate`, `assignedTo`.

### 5.7 Compliance Matrix Schema
- **Compliance Category Model (`compliance-category.model.ts`)**:
  - `id`, `name`, `code` (`cat-gst`, `cat-tds`, `cat-it`, `cat-mca`), `sortOrder`, `isActive`.
- **Compliance Item Model (`compliance-item.model.ts`)**:
  - `clientId`, `categoryId`, `formCode`, `label`, `frequency` (`monthly`, `quarterly`, `annual`), `identifier` (GSTIN/PAN/TAN).
- **Compliance Entry Model (`compliance-entry.model.ts`)**:
  - `itemId`, `clientId`, `periodKey` (`M04`–`M03`, `Q1`–`Q4`, `ANNUAL`), `financialYear`, `status` (`filed`, `pending`, `missed`), `filedDate`, `acknowledgmentNumber`, `documents`.

### 5.8 Integration Schema & Global Practice Credentials
- **Integration Model (`integration.model.ts`)**:
  - `provider` (`'google'`), `email`, `refreshToken`, `accessToken`, `expiryDate`, `scope`.
  - Securely stores practice-wide refresh tokens in MongoDB to power the global Practice Inbox without relying on client-side session cookies.

---

## 6. API Endpoints Reference

### 6.1 Task Endpoints (`/api/v1/tasks`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/tasks` | List tasks with multi-field filtering, search, and pagination |
| `GET` | `/tasks/stats` | Aggregated metric counts across all statuses and WIP groupings |
| `GET` | `/tasks/summary-matrix` | Multi-dimensional pivot matrix grouped by `groupBy` query parameter |
| `GET` | `/tasks/:id` | Fetch complete task record with sub-items and comment logs |
| `POST` | `/tasks` | Create a new task (Zod validated) |
| `PUT` | `/tasks/:id` | Full/partial task update |
| `DELETE` | `/tasks/:id` | Soft-delete a task |
| `POST` | `/tasks/:id/comments` | Add comment to task timeline |
| `PATCH` | `/tasks/:id/subtasks/:subTaskId/toggle` | Toggle subtask completion status |
| `PATCH` | `/tasks/:id/checklist/:itemId/toggle` | Toggle checklist item completion status |
| `PATCH` | `/tasks/:id/document-requests/:docId/toggle` | Toggle document request receipt status |

### 6.2 Service Endpoints (`/api/v1/services`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/services` | List catalog services |
| `GET` | `/services/stats` | Analytics on active, recurring services and average fee |
| `POST` | `/services` | Create new catalog service |
| `GET` | `/services/:id` | Get service by ID |
| `PATCH` | `/services/:id` | Update service pricing, SOP, or subtasks |
| `DELETE` | `/services/:id` | Soft-delete service |
| `POST` | `/services/:id/restore` | Restore soft-deleted service |
| `POST` | `/services/:id/sync-tasks` | Propagate SOP subtasks and checklists to active linked tasks |

### 6.3 Client Endpoints (`/api/v1/clients`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/clients` | Paginated client list |
| `POST` | `/clients` | Create new client |
| `GET` | `/clients/:id` | Retrieve client details by ID |
| `PATCH` | `/clients/:id` | Partial update of client fields |
| `DELETE` | `/clients/:id` | Soft-delete client |
| `POST` | `/clients/:id/restore` | Restore soft-deleted client |

### 6.4 Drive & Document Endpoints (`/api/v1/drive`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/drive/status` | Current Google Drive integration health and storage quota |
| `GET` | `/drive/stats` | Storage usage analytics by category |
| `POST` | `/drive/verify` | Dry-run file inspection without uploading |
| `POST` | `/drive/upload` | Verify, upload to Google Drive category folder, and save DB record |
| `GET` | `/drive` | List documents |
| `GET` | `/drive/:id` | Get document metadata |
| `GET` | `/drive/:id/download` | Download file stream |
| `GET` | `/drive/:id/preview` | Inline preview stream (CORS cross-origin) |
| `DELETE` | `/drive/:id` | Delete document from database and Google Drive |

### 6.5 Lead Endpoints (`/api/v1/leads`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/leads` | Paginated lead pipeline |
| `POST` | `/leads` | Create prospective lead |
| `GET` | `/leads/:id` | Retrieve lead details |
| `PATCH` | `/leads/:id` | Update lead status or contact |
| `DELETE` | `/leads/:id` | Soft-delete lead |
| `POST` | `/leads/:id/restore` | Restore soft-deleted lead |
| `POST` | `/leads/:id/convert` | Atomic convert lead into client record |
| `GET` | `/leads/:id/tasks` | Get all follow-up tasks for a lead |
| `POST` | `/leads/:id/tasks` | Create a new lead follow-up task |
| `PATCH` | `/leads/:id/tasks/:taskId` | Update lead follow-up task |
| `DELETE` | `/leads/:id/tasks/:taskId` | Soft-delete a lead follow-up task |

### 6.6 Notice Endpoints (`/api/v1/notices`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/notices` | List notices with portal filtering (`GST`, `TDS`, `IT`), pagination, and search |
| `GET` | `/notices/summary` | Aggregate counts of notices by portal and urgency |
| `GET` | `/notices/calendar` | Monthly statutory notice due dates and scheduled hearings |
| `GET` | `/notices/clients` | Client-grouped list of active notices |
| `GET` | `/notices/credits` | Check department portal crawler balance and entitlements |
| `PATCH` | `/notices/:id` | Update notice status, drafts, or hearing info |

### 6.7 Compliance Endpoints (`/api/v1/compliance`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/compliance/categories` | List active compliance domains (`cat-gst`, `cat-tds`, `cat-it`) |
| `GET` | `/compliance/grid` | Return client-item-period grid matrix (`categoryId`, `fy`, `frequency`) |
| `GET` | `/compliance/calendar` | Return filing deadlines on a monthly calendar |
| `PUT` | `/compliance/entries` | Upsert single compliance period entry |
| `POST` | `/compliance/items/refresh` | Synchronize and recalculate item templates |

### 6.8 Portal Sync Endpoints (`/api/v1/sync`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/sync/entitlement` | Check crawler balance and entitlements |
| `GET` | `/sync/eligibility` | Check portal credentials readiness for sync |
| `POST` | `/sync/clients` | Initiate batch portal sync across GSTN, TRACES, and IT |
| `GET` | `/sync/jobs` | Monitor status of active portal sync jobs |
| `GET` | `/sync/activity` | Recent sync job logs and activity history |

### 6.9 Integration Endpoints (`/api/v1/integrations`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/integrations/:provider` | Retrieve active global provider credentials and status (e.g., `google`) |
| `POST` | `/integrations/:provider` | Upsert global OAuth tokens and provider configurations into MongoDB |
| `DELETE` | `/integrations/:provider` | Remove provider integration and disconnect practice inbox |

### 6.10 System Health

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Server uptime, timestamp, memory usage, and MongoDB status |

---

## 7. Getting Started & Execution

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env

# 3. (Optional) Run OAuth token helper for Google Drive
npm run get-drive-token

# 4. Seed mock client and sample notices & compliance records (<=5 records)
npm run seed:mock-client

# 5. Start in development mode with live watch
npm run dev

# 6. Type-check & Production build
npm run type-check
npm run build
npm start
```

---

## 8. Environment Configuration

```env
NODE_ENV=development
PORT=5000
API_PREFIX=/api/v1
MONGODB_URI=<enter the rotated MongoDB Atlas URI in backend/.env>
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=500
LOG_LEVEL=info
GOOGLE_DRIVE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_DRIVE_CLIENT_SECRET=your-client-secret
GOOGLE_DRIVE_REFRESH_TOKEN=your-refresh-token
GOOGLE_DRIVE_PARENT_FOLDER_ID=root
MAX_FILE_SIZE_MB=25
```
