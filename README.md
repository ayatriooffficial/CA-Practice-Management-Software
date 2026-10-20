# 🏢 Ayatrio — CA Practice Management & Practice CRM Suite

An enterprise-grade, full-stack practice management and compliance CRM platform built for Chartered Accountants (CAs), Tax Advisors, and Corporate Compliance Firms.

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=flat&logo=node.js)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express-4.x-lightgrey?style=flat&logo=express)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-green?style=flat&logo=mongodb)](https://www.mongodb.com/)
[![TanStack Query](https://img.shields.io/badge/TanStack_Query-v5-coral?style=flat)](https://tanstack.com/query)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-cyan?style=flat&logo=tailwindcss)](https://tailwindcss.com/)

---

## 📑 Table of Contents
1. [Monorepo Architecture](#-monorepo-architecture)
2. [Folder Structure](#-folder-structure)
3. [Prerequisites](#-prerequisites)
4. [Quick Start Guide](#-quick-start-guide)
   - [Backend Setup](#1-backend-setup-ayatrio-backend)
   - [Frontend Setup](#2-frontend-setup-ayatrio-demo)
5. [Environment Variables Reference](#-environment-variables-reference)
6. [Core Modules & Capabilities](#-core-modules--capabilities)
7. [API Endpoints Reference](#-api-endpoints-reference)
8. [Data Models & Soft-Delete Protocol](#-data-models--soft-delete-protocol)
9. [Developer Conventions & Contribution](#-developer-conventions--contribution)

---

## 🏗 Monorepo Architecture

The repository is structured as a clear, high-performance monorepo separating frontend presentation from backend domain services:

```
CA-Practice-Management-Software/
├── ayatrio-backend/        # Express.js + TypeScript + MongoDB Production Backend
│   ├── src/
│   │   ├── config/         # Environment, Database, & Logger Config
│   │   ├── constants/      # Status codes, messages, and tokens
│   │   ├── middlewares/    # Rate-limiting, validation, & error handling
│   │   ├── modules/        # Domain-driven modular MVC (Client, Lead, Service)
│   │   │   ├── client/     # Client schema, validations, controller, routes
│   │   │   ├── lead/       # Lead pipeline, conversion, validation, routes
│   │   │   └── service/    # Services catalog, recurring schedules, routes
│   │   ├── plugins/        # Soft-delete mongoose plugin & query builders
│   │   ├── routes.ts       # Central API v1 router
│   │   └── server.ts       # Server bootstrap & graceful shutdown hooks
│   ├── .env.example        # Backend environment template
│   └── package.json
│
├── ayatrio-demo/           # Next.js 16 + React 19 + Tailwind CSS Frontend
│   ├── src/
│   │   ├── app/            # Next.js App Router (clients, leads, services, invoice...)
│   │   ├── components/     # High-performance modular UI components
│   │   │   ├── clients/    # Client master table, ClientForm second page, Promoters
│   │   │   ├── leads/      # Lead cards, LeadFormModal, ConvertLeadModal
│   │   │   ├── services/   # Services table, ServiceForm second page
│   │   │   ├── invoice/    # Comprehensive invoice, reimbursement, analytics
│   │   │   └── ui/         # Accessible Select, Pagination, DiscardConfirmationModal
│   │   ├── hooks/          # TanStack Query custom hooks with optimistic updates
│   │   ├── services/       # Typed HTTP API clients (Axios)
│   │   └── data/           # Reference datasets, statutory types, fallbacks
│   ├── .env.example        # Frontend environment template
│   └── package.json
│
├── .gitignore              # Repository-wide build and dependency ignores
└── README.md               # Master technical documentation (this file)
```

---

## ⚙️ Prerequisites

Before launching the project locally, verify that you have:

- **Node.js**: `v18.18.0` or higher (`v20.x` recommended)
- **Package Manager**: `npm` (v9+) or `yarn` / `pnpm`
- **Database**:
  - Local **MongoDB** instance running at `mongodb://127.0.0.1:27017/ayatrio_crm`, **OR**
  - A cloud **MongoDB Atlas** connection URI string

---

## 🚀 Quick Start Guide

### 1. Backend Setup (`ayatrio-backend`)

The backend is an enterprise-grade TypeScript REST API featuring rate-limiting, Helmet security, Winston structured logging, Zod request validation, and MongoDB connection resiliency.

```bash
# Navigate to the backend directory
cd ayatrio-backend

# Install dependencies
npm install

# Create environment configuration
cp .env.example .env

# Start in development mode (with hot-reload via ts-node-dev)
npm run dev
```

The backend server will bootstrap at:
- **Base URL**: `http://localhost:5000`
- **API Root**: `http://localhost:5000/api/v1`
- **Health Check**: `http://localhost:5000/api/v1/health`

### 2. Frontend Setup (`ayatrio-demo`)

The frontend is built with Next.js 16 (Turbopack), React 19, Tailwind CSS, and TanStack React Query for smooth, optimistic client-side caching.

```bash
# In a new terminal, navigate to the frontend directory
cd ayatrio-demo

# Install dependencies
npm install

# Create local environment configuration
cp .env.example .env.local

# Start Next.js development server
npm run dev
```

Open your browser and navigate to:
- **Web App**: `http://localhost:3000`
- **Clients Module**: `http://localhost:3000/client`
- **Leads Module**: `http://localhost:3000/leads`
- **Services Catalog**: `http://localhost:3000/services`
- **Invoice & Billing**: `http://localhost:3000/invoice`

---

## 🔐 Environment Variables Reference

### Backend (`ayatrio-backend/.env`)

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | string | `development` | Runtime environment (`development`, `production`, `test`) |
| `PORT` | number | `5000` | Port on which the Express server listens |
| `API_PREFIX` | string | `/api/v1` | URL path prefix for all API endpoints |
| `MONGODB_URI` | string | `mongodb://127.0.0.1:27017/ayatrio_crm` | MongoDB connection URI |
| `CORS_ORIGIN` | string | `http://localhost:3000,http://localhost:3001` | Allowed origins for cross-origin requests |
| `RATE_LIMIT_WINDOW_MS`| number | `900000` (15 min) | Rate limit window in milliseconds |
| `RATE_LIMIT_MAX_REQUESTS`| number | `500` | Max requests per IP within the window |
| `LOG_LEVEL` | string | `info` | Winston logging level (`debug`, `http`, `info`, `warn`, `error`) |

### Frontend (`ayatrio-demo/.env.local`)

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | string | `http://localhost:5000/api/v1` | Backend API base address consumed by client hooks |

---

## 💼 Core Modules & Capabilities

### 1. Clients Master Directory (`/client`)
- **Full Spectrum Entity Management**: Individuals, Companies, LLPs, Partnerships, and Trusts with customized statutory fields.
- **Dedicated Second-Page Flow**: Form navigation switches cleanly to a full screen (`ClientForm.tsx`) with breadcrumbs and unsaved changes confirmation (`DiscardConfirmationModal`).
- **Promoter / Director Linking**: Live lead search dropdown (`PromoterSearchDropdown.tsx`) auto-populates promoters and links them directly to existing leads.
- **GSTIN & PAN Autofill**: Instant registry lookup with auto-derivation of PAN and addresses.
- **Soft Delete & Trash View**: Easily switch between Active and Trash views with instant restore capabilities.

### 2. Leads Pipeline (`/leads`)
- **Stage Progression**: Track prospects through `New`, `Contacted`, `Qualified`, `Proposal`, and `Converted` stages.
- **Lead-to-Client Conversion**: Instant one-click conversion modal (`ConvertLeadModal.tsx`) that provisions a client record while archiving the lead.
- **High-Performance Querying**: Real-time debounced search, stage filters, and TanStack optimistic updates with zero unnecessary re-renders.

### 3. Services Catalog (`/services`)
- **Master Practice Catalog**: Configurable catalog of recurring and one-time CA compliance services (G.S.T, Income Tax, ROC, Audits, Payroll).
- **Clean Professional Design**: Unified slate/neutral badges without visual clutter, non-overlapping columns, and borderless layout.
- **Dedicated Creation Screen**: Accessible via `+ Add Service` or row edit, featuring breadcrumbs, fee schedules, TAT specifications, and checklist setup.

### 4. Invoice & Financial Management (`/invoice`)
- **Invoicing Engine**: Proforma and Tax Invoices with SAC code mapping and GST computation.
- **Reimbursement Tracking**: Out-of-pocket expense tracking and billing reconciliations.
- **Multi-Bank Ledger**: Integrated banking account management and payment logging.
- **Financial Analytics**: Revenue breakdowns, accounts receivable aging, and collections reporting.

---

## 📡 API Endpoints Reference

All endpoints are versioned under `/api/v1` and return standard JSON responses:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation successful",
  "data": { ... }
}
```

### Clients (`/api/v1/clients`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/clients` | Paginated client list (supports `search`, `type`, `group`, `active`, `sortBy`, `sortOrder`, `includeDeleted`) |
| `POST` | `/clients` | Create a new client (Zod-validated payload) |
| `GET` | `/clients/:id` | Retrieve client details by ID |
| `PATCH` | `/clients/:id` | Partial update of client fields |
| `DELETE` | `/clients/:id` | Soft delete client (moves to Trash) |
| `POST` | `/clients/:id/restore` | Restore soft-deleted client |

### Leads (`/api/v1/leads`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/leads` | Paginated leads (supports `search`, `status`, `source`, `priority`, `sortBy`, `includeDeleted`) |
| `POST` | `/leads` | Create a new prospective lead |
| `GET` | `/leads/:id` | Retrieve lead details |
| `PATCH` | `/leads/:id` | Update lead status, notes, or contact info |
| `DELETE` | `/leads/:id` | Soft delete lead |
| `POST` | `/leads/:id/restore` | Restore soft-deleted lead |
| `POST` | `/leads/:id/convert` | Convert lead into a Client record |

### Services (`/api/v1/services`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/services` | List services (supports `search`, `category`, `frequency`, `isRecurring`, `difficulty`) |
| `POST` | `/services` | Create new catalog service |
| `GET` | `/services/:id` | Get service by ID |
| `PATCH` | `/services/:id` | Update service pricing, SOP, or sub-tasks |
| `DELETE` | `/services/:id` | Soft delete service |
| `POST` | `/services/:id/restore` | Restore soft-deleted service |

### Health Check
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Server uptime, timestamp, memory usage, and MongoDB status |

---

## 🛡 Data Models & Soft-Delete Protocol

All Mongoose schemas in `ayatrio-backend` implement our custom `softDeletePlugin`:
- Records include `isDeleted: { type: Boolean, default: false, index: true }` and `deletedAt: Date`.
- Standard `find`, `findOne`, and `countDocuments` queries automatically filter out soft-deleted documents (`isDeleted: false`) unless `includeDeleted=true` is explicitly queried.
- Data integrity and audit histories are fully preserved without accidental physical data loss.

---

## 🛠 Developer Conventions & Contribution

### Code Standards
- **Strict TypeScript**: No implicit `any`; all API requests and responses are strictly typed with interfaces and Zod schemas.
- **Component Splitting**: Heavy form screens (`ClientForm.tsx`, `ServiceForm.tsx`) and drawers are dynamically imported via `next/dynamic` to ensure fast initial page hydration.
- **TanStack React Query**: All server mutations use cache invalidation (`queryClient.invalidateQueries`) with instant optimistic rollbacks on failure.

### Running Production Builds

```bash
# Validate and build the frontend Next.js bundle
cd ayatrio-demo
npm run build

# Validate and compile backend TypeScript
cd ../ayatrio-backend
npm run build
```

---

## 📄 License

This software is confidential and proprietary to **Ayatrio**. All rights reserved.
