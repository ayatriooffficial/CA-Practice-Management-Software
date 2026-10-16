# Turia Practice — Comprehensive Technical & Functional Documentation

**Product Name:** Turia Practice (CA Practice Management Software)  
**Version:** 1.0.0  
**Target Audience:** Chartered Accountants, Tax Advisors, Auditing Firms, and Corporate Tax Teams  
**Primary Accent:** `#31719B`  

---

## Table of Contents
1. [Introduction & Product Purpose](#1-introduction--product-purpose)
2. [System Architecture](#2-system-architecture)
3. [Design System & Color Tokens](#3-design-system--color-tokens)
4. [Routing & Navigation Topology](#4-routing--navigation-topology)
5. [Deep Dive: Core Components](#5-deep-dive-core-components)
   - [5.1 AppShell](#51-appshell)
   - [5.2 NoticeCalendar](#52-noticecalendar)
   - [5.3 ProfileDrawer](#53-profiledrawer)
   - [5.4 Header](#54-header)
   - [5.5 Sidebar](#55-sidebar)
   - [5.6 SearchModal](#56-searchmodal)
   - [5.7 EmptyPagePlaceholder](#57-emptypageplaceholder)
6. [Theme & Styling Architecture](#6-theme--styling-architecture)
7. [Installation, Build & Execution](#7-installation-build--execution)
8. [API & Integration Roadmap](#8-api--integration-roadmap)

---

## 1. Introduction & Product Purpose

**Turia Practice** is a domain-specific enterprise SaaS web application engineered for Chartered Accountants and legal/tax advisory firms in India. CA practices frequently manage hundreds of corporate and individual clients across multiple government portals (GSTN, Income Tax e-Filing, TRACES, MCA).

### Key Pain Points Solved:
1. **Notice Dispersal**: Notices arrive across fragmented portals with tight statutory deadlines. Missing an intimation or demand notice results in severe penalties, interest, or ex-parte orders.
2. **Context Switching**: Practitioners switch between client folders, tax calendars, sprint trackers, and WhatsApp communication.
3. **Practice Visibility**: Partners lack a single dashboard summarizing daily due dates, pending replies, and staff assignments.

Turia Practice resolves this by consolidating **Notice Lifecycles**, **Statutory Compliance**, and **Client Affairs** under one unified workspace.

---

## 2. System Architecture

The application is built on top of the **Next.js 16 App Router** with **React 19**, leveraging modern React patterns such as React Context for global UI states, client boundaries (`"use client"`), and component encapsulation.

```
                    ┌─────────────────────────────────┐
                    │       Next.js Root Layout        │
                    │         (src/app/layout)        │
                    └────────────────┬────────────────┘
                                     │
                    ┌────────────────▼────────────────┐
                    │         ThemeProvider           │
                    │ (Light/Dark Theme Persistence)  │
                    └────────────────┬────────────────┘
                                     │
                    ┌────────────────▼────────────────┐
                    │            AppShell             │
                    └────────┬───────────────┬────────┘
                             │               │
            ┌────────────────▼───┐       ┌───▼────────────────┐
            │       Header       │       │      Sidebar       │
            │  (Search, Theme,   │       │ (12 Vertical Route │
            │   Profile Drawer)  │       │     Shortcuts)     │
            └────────────────────┘       └───┬────────────────┘
                                             │
                                 ┌───────────▼────────────┐
                                 │      Main Content      │
                                 │       Workspace        │
                                 ├────────────────────────┤
                                 │ - / (Home Dashboard)   │
                                 │ - /notices (Calendar)  │
                                 │ - /compliance, etc.    │
                                 └────────────────────────┘
```

### Technology Matrix
* **Framework**: Next.js `16.4.0` (Turbopack support)
* **View Engine**: React `19.3.0`
* **CSS Framework**: Tailwind CSS `4.0`
* **Type System**: TypeScript `5.0`
* **Icons**: `lucide-react` `1.57.0`

---

## 3. Design System & Color Tokens

The visual style is characterized by a refined, modern SaaS aesthetic centered around the primary color **`#31719B`** (Indigo-Purple). All design elements draw from structured CSS custom properties declared in `src/app/globals.css`.

### Core Color Palette
* **Primary Brand**: `#31719B`
* **Primary Hover**: `#3D88BF`
* **Primary Active/Light**: `#eeedfd` (Light Mode), `rgba(115, 103, 240, 0.16)` (Dark Mode)
* **Primary Border**: `#d2cdfb` (Light Mode), `rgba(115, 103, 240, 0.35)` (Dark Mode)
* **Online Status Indicator**: `#22c55e` (Vibrant Emerald Green)
* **Credits Accent**: Amber/Orange palette (`--credits-border`, `--credits-bg`, `--credits-text`)

### Complete CSS Variable Map

| CSS Token | Light Mode Value | Dark Mode Value | Semantic Role |
| :--- | :--- | :--- | :--- |
| `--primary` | `#31719B` | `#31719B` | Main theme identity, active indicators, buttons |
| `--primary-hover` | `#3D88BF` | `#8276f2` | Hover state for interactive primary controls |
| `--primary-light` | `#eeedfd` | `rgba(115,103,240,0.16)` | Background for active tabs and highlights |
| `--primary-border` | `#d2cdfb` | `rgba(115,103,240,0.35)` | Subtle borders around primary badges |
| `--bg-app` | `#ffffff` | `#0f172a` | Root window background |
| `--bg-surface` | `#ffffff` | `#1e293b` | Surface for headers, sidebars, modals |
| `--bg-subtle` | `#f3f4f6` | `#1e293b` | Secondary panel backgrounds |
| `--bg-hover` | `#f3f4f6` | `#334155` | Neutral hover state background |
| `--text-main` | `#111827` | `#f8fafc` | Primary titles and high-contrast text |
| `--text-muted` | `#4b5563` | `#94a3b8` | Subheadings, body copy, inactive labels |
| `--text-subtle` | `#6b7280` | `#64748b` | Timestamps, breadcrumbs, captions |
| `--border-main` | `#e5e7eb` | `#334155` | Primary divider and boundary borders |
| `--header-height` | `56px` | `56px` | Fixed header height constraint |
| `--sidebar-width` | `68px` | `68px` | Fixed sidebar width constraint |

---

## 4. Routing & Navigation Topology

The application contains **22 distinct functional routes**, categorized into **Top Bar Navigation** and **Sidebar Practice Dimensions**:

### 4.1 Top Bar Routes (Header Navigation)
* `/notices` — Centralized GST, IT & TRACES notice management calendar & status boards.
* `/compliance` — Filing tracker for GSTR-1, GSTR-3B, Advance Tax, TDS returns.
* `/whatsapp` — Automated and manual client WhatsApp notifications and document delivery.
* `/email` — Inbound/outbound email synchronizer for tax communications.
* `/agents` — Background sync agents monitoring government portal status.
* `/chat` — Internal staff and client conversation threads.
* `/sprints` — Agile task sprints for seasonal return filing deadlines.
* `/action-center` — High-priority approval requests and urgent client sign-offs.
* `/calendar` — Master practice appointment and hearing calendar.
* `/to-do` — Personal checklist and task prioritization.

### 4.2 Sidebar Routes (Practice Management Dimensions)
* `/` — Practice Home overview dashboard with quick links.
* `/proposal` — Client engagement letters, quotes, and retainer contracts.
* `/leads` — Client acquisition pipeline and prospect tracking.
* `/client` — Master client directory with PAN, GSTIN, and contact details.
* `/groups` — Corporate group structures and family client groupings.
* `/services` — Catalog of billable practice services and fixed-fee schedules.
* `/task` — Work-in-progress task management and staff assignments.
* `/invoice` — Professional billing, fee notes, and payment collection.
* `/team` — Partner, associate, and article assistant directory.
* `/reports` — Practice financial analytics, hours billed, and profitability.
* `/drive` — Secure cloud storage for client financial records and returns.
* `/registry` — DSC management, DIN registry, and ROC filing register.

---

## 5. Deep Dive: Core Components

### 5.1 AppShell (`src/components/AppShell.tsx`)
Provides the high-level layout scaffolding. It coordinates:
* Wrapping the application in `ThemeProvider`.
* Enforcing the persistent sticky top `Header`.
* Enforcing the left `Sidebar` with fixed positioning.
* Calculating main workspace offset via `margin-left: var(--sidebar-width)` to prevent content clipping.

### 5.2 NoticeCalendar (`src/components/NoticeCalendar.tsx`)
The centerpiece notice tracking module.
* **Month Grid**: Renders a complete 35-day grid for October 2026 with previous/next month days rendered in subtle grey (`var(--cal-day-other)`).
* **Current Day Indicator**: Highlights current day ("14") with a high-contrast circular badge.
* **Notice Item Badges**:
  * Shows notices received on particular dates.
  * Badges for GST (Blue), Income Tax (Indigo), TDS (Orange).
* **Filter Bar**:
  * Segmented filter: `All`, `GST`, `Income Tax`, `TDS`.
  * Date view switch: `Notice Date` vs. `Due Date`.
  * Status dropdown: `All statuses`, `Notice Received`, `Response Filed`, `Under Review`.
* **Sub-Tabs**:
  * `Calendar`: Visual calendar view.
  * `Clients`: Notices sorted by client entity.
  * `GST Notices`: Filtered GST issues.
  * `TDS Notices`: Form 26AS discrepancies.
  * `IT Notices`: Scrutiny / Demand notices under Sections 143(1), 148.
  * `Logs`: Audit logs of portal scrapers and sync events.

### 5.3 ProfileDrawer (`src/components/ProfileDrawer.tsx`)
An interactive slide-out panel that opens when clicking the avatar in the header.
* **Header Banner**: Dynamic `#31719B` gradient with initials avatar (`DS`), online indicator dot, and close (`X`) control.
* **Navigation Links**:
  * My Profile, Settings, Turia Demo Videos, Refer & Earn, App Customizer, Enroll Utility, Logout.
  * Styled with clean, soft hover effects (`hover:bg-[var(--primary-light)] hover:text-[var(--primary)]`).
* **Mobile Apps Section**:
  * Features dedicated download cards for **Google Play** and **Apple App Store**.
  * Incorporates authentic official SVG vector logos for both stores.
  * Responsive click triggers for mobile application discovery.

### 5.4 Header (`src/components/Header.tsx`)
* **Brand Logo**: 4-petal clover icon in `#31719B` alongside user practice identity.
* **Horizontal Scroll Nav**: Displays top modules with conditional badges (`ADD ON` in cyan, `NEW` in green).
* **Search Trigger**: Opens `SearchModal` on click or keyboard shortcut.
* **Theme Switcher**: Smoothly transitions between Light and Dark modes.

### 5.5 Sidebar (`src/components/Sidebar.tsx`)
* Vertical layout containing 12 icon items.
* Active item receives a 3px left indicator bar in `#31719B` and soft background tint.
* Micro-interaction: Hovering scales icon by 110% (`group-hover:scale-110`).

### 5.6 SearchModal (`src/components/SearchModal.tsx`)
* Client-side modal activated via `Ctrl + K` or `Cmd + K`.
* Real-time search across all 22 modules with fuzzy matching on titles, descriptions, and category tags.
* Displays keyboard navigation cues (`↑`, `↓`, `ESC`).

### 5.7 EmptyPagePlaceholder (`src/components/EmptyPagePlaceholder.tsx`)
* A reusable, unified placeholder component powering every subpage in the application.
* **Breadcrumb Navigation**: Shows path (e.g., `Practice > Sidebar > Home`).
* **Thematic Icon Engine**: Dynamically displays the relevant Lucide icon inside a circular container styled with `var(--primary-light)` and `var(--primary)`.
* **Quick Links Matrix**: When supplied with `quickLinks`, renders navigation cards allowing users to jump directly to key modules.

---

## 6. Theme & Styling Architecture

The project implements a **CSS-first, Zero-FOUC (Flash of Unstyled Content) theme engine**:

### 6.1 Tailwind CSS v4 Configuration
In Tailwind CSS v4, dark variants default to media queries (`prefers-color-scheme: dark`). To bind Tailwind's `dark:` classes strictly to the application's explicit theme attribute, `globals.css` declares:

```css
@import "tailwindcss";

@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));
```

This guarantees that:
1. `dark:` utility classes ONLY activate when `<html data-theme="dark">` is set.
2. System OS dark mode settings will not inadvertently pollute light-mode styling.

### 6.2 ThemeContext Implementation
`src/context/ThemeContext.tsx` handles:
* Reading saved theme preferences from `localStorage`.
* Synchronizing `document.documentElement.setAttribute("data-theme", theme)`.
* Exposing `theme` and `toggleTheme()` to all components via the `useTheme()` hook.

---

## 7. Installation, Build & Execution

### System Requirements
* **Node.js**: `v18.18.0` or higher
* **npm**: `v9.0.0` or higher

### Steps to Run
```bash
# 1. Clone repository
git clone https://github.com/Dipak-sahani/ayatrio-demo.git
cd ayatrio-demo

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev

# 4. Open in browser
# Navigate to http://localhost:3000
```

### Production Build
```bash
# Build the optimized production bundle
npm run build

# Start the production server
npm run start
```

---

## 8. API & Integration Roadmap

The application architecture is structured to integrate with live backend microservices:

1. **GSTN Portal Sync API**: Webhook integration with GST Suvidha Providers (GSPs) to fetch Notices in Form GST DRC-01, ASMT-10, and REG-17.
2. **Income Tax e-Filing API**: Integration for real-time polling of communications under Section 143(1)(a), Section 148, and defective return notices under Section 139(9).
3. **TRACES Scraper & Webhook Service**: Automatic capture of Justification Reports and short payment intimations.
4. **WhatsApp Cloud API**: Dispatching notice summary PDF receipts and digital acknowledgement forms to clients.
5. **Document OCR & AI Extraction**: Automated parsing of scanned tax notices to populate due dates, demand amounts, and assessment years automatically into the Notice Calendar.

---