# 🚀 Ayatrio Backend — Production-Grade Modular MVC Architecture

An enterprise-ready, high-speed, secure backend engineered with **TypeScript**, **Node.js**, **Express.js**, and **MongoDB (Mongoose)** for **Ayatrio CRM**.

---

## 📑 Table of Contents
1. [Architecture & Design Principles](#1-architecture--design-principles)
2. [Folder Structure](#2-folder-structure)
3. [Security & Performance Implementation](#3-security--performance-implementation)
4. [Soft Delete Mechanism](#4-soft-delete-mechanism)
5. [Database Schemas](#5-database-schemas)
   - [5.1 Lead Schema](#51-lead-schema)
   - [5.2 Client Schema](#52-client-schema)
6. [API Endpoints Reference](#6-api-endpoints-reference)
   - [6.1 Lead Endpoints](#61-lead-endpoints)
   - [6.2 Client Endpoints](#62-client-endpoints)
   - [6.3 System Health](#63-system-health)
7. [Getting Started & Execution](#7-getting-started--execution)
8. [Environment Configuration](#8-environment-configuration)

---

## 1. Architecture & Design Principles

The backend utilizes a **Domain-Driven Modular MVC (Model-View-Controller)** pattern. Unlike monolithic MVC where all models or controllers live in a single folder, each domain entity (`Client`, `Lead`) is encapsulated into an isolated, self-contained module containing its own:
- **Interfaces (`*.interface.ts`)**: Type definitions, enums, and Mongoose document interfaces.
- **Model (`*.model.ts`)**: Schema definitions, compound/text indexes, hooks, and plugins.
- **Validation (`*.validation.ts`)**: Strict runtime schema validation using **Zod**.
- **Service (`*.service.ts`)**: Business logic, database queries, and data transformations.
- **Controller (`*.controller.ts`)**: HTTP request handling, input extraction, and response formatting.
- **Routes (`*.routes.ts`)**: REST route declarations, middleware bindings, and rate limits.

---

## 2. Folder Structure

```
ayatrio-backend/
├── dist/                          # Compiled production JavaScript bundle
├── src/
│   ├── @types/                    # Ambient type definitions & Express extensions
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
│   │   ├── client/                # Client Domain Module
│   │   │   ├── client.interface.ts
│   │   │   ├── client.model.ts
│   │   │   ├── client.validation.ts
│   │   │   ├── client.service.ts
│   │   │   ├── client.controller.ts
│   │   │   └── client.routes.ts
│   │   └── lead/                  # Lead Domain Module
│   │       ├── lead.interface.ts
│   │       ├── lead.model.ts
│   │       ├── lead.validation.ts
│   │       ├── lead.service.ts
│   │       ├── lead.controller.ts
│   │       └── lead.routes.ts
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
| **Rate Limiting** | `express-rate-limit` | 500 req/15min general limit + 60 req/min mutation rate limiter |
| **Runtime Validation** | `zod` | Validates body, query, and params before reaching controllers |
| **Indexing** | Compound & Text Indexes | Compound indexes on `mobile`, `pan`, `fileNo`, `isDeleted`, and full-text search |
| **Lean Queries** | `.lean()` | Bypasses Mongoose document hydration on read queries for fast response |
| **Payload Compression**| `compression` | Gzip compression for all HTTP response payloads |
| **Payload Limits** | `express.json({ limit: '10mb' })` | Prevents Denial of Service (DoS) via massive request payloads |
| **Graceful Shutdown** | `SIGTERM` / `SIGINT` | Closes active HTTP connections and closes MongoDB connection cleanly |

---

## 4. Soft Delete Mechanism

The backend implements a non-destructive **Soft Delete** pattern via `softDelete.plugin.ts`:

- Every record is enriched with:
  ```ts
  isDeleted: boolean;     // default: false (indexed)
  deletedAt: Date | null; // Timestamp of deletion
  deletedBy: string | null; // Actor identifier (from x-user-id header or 'system')
  ```
- **Automatic Query Filtering**:
  Mongoose query pre-hooks (`find`, `findOne`, `findOneAndUpdate`, `countDocuments`) automatically intercept queries and append `{ isDeleted: false }`. Soft-deleted entities are completely invisible to regular CRM queries.
- **Audit / Admin Access**:
  Passing `?includeDeleted=true` in query parameters allows administrative and audit dashboards to inspect deleted records.
- **Dedicated Endpoints**:
  - `DELETE /api/v1/<resource>/:id` — Soft-deletes the record.
  - `PATCH /api/v1/<resource>/:id/restore` — Restores the record to active status.
  - `DELETE /api/v1/<resource>/:id/permanent` — Hard-deletes the record permanently from the database.

---

## 5. Database Schemas

### 5.1 Lead Schema
Encapsulates individual and promoter prospect registrations:
- `fullName`: Auto-computed from `firstName`, `middleName`, and `lastName`.
- `abbreviation`: Short code / initials.
- `mobile` & `aadhaarMobile`: Primary and Aadhaar-linked mobile numbers.
- `email`: Validated email address.
- `pan` & `panAttachment`: Uppercase PAN with regex validation format (`[A-Z]{5}[0-9]{4}[A-Z]{1}`) and file attachment.
- `aadhaar` & `aadhaarAttachment`: 12-digit Aadhaar number and identity attachment.
- `gender`: Enum (`Male`, `Female`, `Others`, `Transgender`).
- `address`, `country`, `state`, `pincode`, `nationality`, `policeStation`, `postOffice`.
- `din` & `dinAttachment`: Director Identification Number.
- `mcaId` & `mcaPassword`: Ministry of Corporate Affairs credentials (password masked with `select: false`).
- `status`: Enum (`new`, `contacted`, `qualified`, `converted`, `dropped`).
- `convertedToClientId` & `convertedAt`: Linked Client ID upon conversion.

### 5.2 Client Schema
Encapsulates institutional and business client files:
- `name`: Business or individual entity name.
- `fileNo`: Unique sequential identifier (e.g. `CL-2026-0001`), auto-generated or custom.
- `type`: Constitution type (e.g. `individual`, `proprietorship`, `partnership`, `llp`, `private-limited`, etc.).
- `group`: Practice group (e.g. `Accounting`, `AUDIT`, `GST Monthly`, `Sharma Family`, etc.).
- `mobile`, `secondaryMobile`, `email`, `address`, `city`, `state`, `pincode`.
- `tags`: Array of string tags for categorizing clients.
- `active`: Boolean status flag.
- `services`: Active assigned recurring services (e.g. `gst-monthly`, `income-tax`).
- `users`: Assigned staff/team members.
- `customerFiles`:
  - `promoter`: Array of `{ name, pan, share, designation, mcaId }`
  - `statutory`: Array of `{ type, idNo, userId, attachment }`
  - `recurring`: Array of `{ category, service, tariff }`
- `leadId`: Reference to original Lead document if converted.

---

## 6. API Endpoints Reference

### 6.1 Lead Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/leads` | List leads (supports `page`, `limit`, `search`, `status`, `includeDeleted`) |
| `POST` | `/api/v1/leads` | Create a new lead |
| `GET` | `/api/v1/leads/stats` | Pipeline statistics (leads count by status, conversion rate) |
| `GET` | `/api/v1/leads/:id` | Get single lead by ID |
| `PATCH` | `/api/v1/leads/:id` | Update lead details |
| `DELETE` | `/api/v1/leads/:id` | Soft delete lead |
| `PATCH` | `/api/v1/leads/:id/restore` | Restore soft-deleted lead |
| `DELETE` | `/api/v1/leads/:id/permanent` | Permanently delete lead |
| `POST` | `/api/v1/leads/:id/convert` | Convert lead into an active Client |

### 6.2 Client Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/clients` | List clients (supports `page`, `limit`, `search`, `type`, `group`, `active`, `includeDeleted`) |
| `POST` | `/api/v1/clients` | Create a new client |
| `GET` | `/api/v1/clients/stats` | Client summary metrics (active/inactive, by type, top groups) |
| `GET` | `/api/v1/clients/:id` | Get single client by ID (populates `leadId`) |
| `PATCH` | `/api/v1/clients/:id` | Update client details |
| `DELETE` | `/api/v1/clients/:id` | Soft delete client |
| `PATCH` | `/api/v1/clients/:id/restore` | Restore soft-deleted client |
| `DELETE` | `/api/v1/clients/:id/permanent` | Permanently delete client |
| `POST` | `/api/v1/clients/:id/files/:fileType` | Add entry to customerFiles (`promoter`, `statutory`, `recurring`) |
| `DELETE` | `/api/v1/clients/:id/files/:fileType/:itemId` | Remove entry from customerFiles |

### 6.3 System Health
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Uptime, environment status, and health check |

---

## 7. Getting Started & Execution

### Prerequisites
- Node.js `>= 18.0.0`
- MongoDB running locally or on MongoDB Atlas

### Installation
```bash
cd ayatrio-backend
npm install
```

### Development Mode (with hot reload via tsx)
```bash
npm run dev
```

### Production Build & Run
```bash
# 1. Type-check TypeScript code
npm run type-check

# 2. Build production JavaScript bundle into dist/
npm run build

# 3. Start production server
npm start
```

---

## 8. Environment Configuration

Defined in `.env` (refer to `.env.example`):

```env
NODE_ENV=development
PORT=5000
API_PREFIX=/api/v1
MONGODB_URI=mongodb://127.0.0.1:27017/ayatrio_crm
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=500
LOG_LEVEL=info
```
