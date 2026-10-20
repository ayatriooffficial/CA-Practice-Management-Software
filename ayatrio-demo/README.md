# Turia Practice — CA Practice Management Software

A unified, modern Practice Management and Statutory Notice Tracking platform built for Chartered Accountants, Tax Practitioners, and Advisory Firms. Designed to streamline GST, Income Tax, and TRACES notice lifecycles, compliance deadlines, client portfolios, team sprints, and daily firm operations.

---

## 🌟 Executive Overview

**Turia Practice** delivers a high-performance, single-pane-of-glass workspace for professional accounting practices. It unifies client tracking, statutory communication, tax notice calendars, team coordination, and document workflows into a coherent design system.

* **Primary Brand Accent**: `#31719B` (Modern Indigo-Purple)
* **Framework**: Next.js 16 (App Router) + React 19
* **Styling**: Tailwind CSS v4 + Vanilla CSS Design Tokens
* **Theme Support**: Seamless Light & Dark mode via CSS variables & `@custom-variant dark`
* **Icons**: Lucide React

---

## 🚀 Key Modules & Capabilities

### 1. Unified Notice Management (`/notices`)
* **Multi-Portal Notice Synchronization**: Consolidates notices issued across GST, Income Tax, and TRACES portals into a single dashboard.
* **Interactive Notice Calendar**:
  * Month grid view with current date ("Today") highlighting.
  * Day cells displaying active notices with colored status badges (Notice Received, Response Under Review, Appeal Filed).
  * Filter by **Notice Type** (All, GST, Income Tax, TDS).
  * Filter by **Date Dimension** (Notice Date vs. Due Date).
  * Fast month-to-month pagination.
* **Sub-Navigation Tabs**:
  * `Calendar`: Visual calendar tracking of notice response due dates.
  * `Clients`: Notices indexed by client master records.
  * `GST Notices`: Filtered GST demand/show-cause/assessment notices.
  * `TDS Notices`: Short deduction & 26AS mismatch notices.
  * `IT Notices`: Sections 143(1), 148, 142(1), and 156 demand tracking.
  * `Logs`: Audit trail of notice actions, portal synchronizations, and filings.
* **Credits Tracker**: Live display of portal synchronization credits.

### 2. Practice Home & Dashboard (`/`)
* **Practice Dashboard Overview**: Executive summary with quick access to active modules.
* **Smart Quick Navigation**: Direct cards linking to Notice Management, Compliance Center, Client Directory, and Task Milestones.
* **Theme-Aware Empty State Engine**: Powered by the extensible `EmptyPagePlaceholder` component with home-specific metadata and customizable widget actions.

### 3. Persistent Top Navigation Header
* **Practice Branding**: Turia clover brand logo and user identity.
* **Primary Route Navigation**:
  * **Notices** (with `ADD ON` badge)
  * **Compliance** (Statutory filing tracking)
  * **WhatsApp** & **Email** (Client communication integrations)
  * **Agents** (with `NEW` badge - automated sync agents)
  * **Chat**, **Sprints**, **Action-Center**, **Calendar**, and **To-Do**
* **Instant Search (`Cmd/Ctrl + K`)**: Modal search with real-time filtering across all modules, categories, and actions.
* **Theme Toggle**: Real-time switch between Light and Dark themes with zero flash.
* **Profile Trigger**: Live online dot indicator (`#22c55e`) and trigger for the Profile Drawer.

### 4. Left Sidebar Navigation
Persistent collapsed navigation bar providing access to all 12 core practice dimensions:
1. `Home` (`/`)
2. `Proposal` (`/proposal`)
3. `Leads` (`/leads`)
4. `Client` (`/client`)
5. `Groups` (`/groups`)
6. `Services` (`/services`)
7. `Task` (`/task`)
8. `Invoice` (`/invoice`)
9. `Team` (`/team`)
10. `Reports` (`/reports`)
11. `Drive` (`/drive`)
12. `Registry` (`/registry`)

### 5. Slide-Out Profile & Account Drawer
* **Top Identity Banner**: `#31719B` gradient header with avatar circle and online status dot.
* **Account Shortcuts**: My Profile, Settings.
* **Mobile Apps Download Section**:
  * Authentic **Google Play** badge with official vector brand logo.
  * Authentic **App Store** badge with official Apple vector logo.
  * Interactive hover elevations and theme-adaptive card backgrounds.
* **Practice Utilities**: Turia Demo Videos, Refer & Earn, App Customizer, Enroll Utility, and Secure Logout.

---

## 🎨 Design System & Color Tokens

The UI follows a standardized CSS variable architecture defined in [`src/app/globals.css`](src/app/globals.css):

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
ayatrio-demo/
├── src/
│   ├── app/
│   │   ├── layout.tsx                # Root layout with HTML wrapper & AppShell
│   │   ├── globals.css               # Design tokens, Tailwind v4 imports & custom variants
│   │   ├── page.tsx                  # Home section (EmptyPagePlaceholder + Quick Links)
│   │   ├── notices/page.tsx          # Notice Management & Calendar module
│   │   ├── action-center/page.tsx    # Action Center module
│   │   ├── agents/page.tsx           # Automated Agents module
│   │   ├── calendar/page.tsx         # Practice Calendar module
│   │   ├── chat/page.tsx             # Client Chat module
│   │   ├── client/page.tsx           # Client Master module
│   │   ├── compliance/page.tsx       # Statutory Compliance module
│   │   ├── drive/page.tsx            # Practice Drive storage module
│   │   ├── email/page.tsx            # Integrated Email module
│   │   ├── groups/page.tsx           # Client Groups module
│   │   ├── invoice/page.tsx          # Invoicing & Billing module
│   │   ├── leads/page.tsx            # Prospective Leads module
│   │   ├── proposal/page.tsx         # Proposals & Engagements module
│   │   ├── registry/page.tsx         # Official Registry module
│   │   ├── reports/page.tsx          # Practice Analytics module
│   │   ├── services/page.tsx         # Service Offerings module
│   │   ├── sprints/page.tsx          # Team Sprints module
│   │   ├── task/page.tsx             # Tasks & Workflows module
│   │   ├── team/page.tsx             # Team Members module
│   │   ├── to-do/page.tsx            # Personal To-Do module
│   │   └── whatsapp/page.tsx         # WhatsApp Business Integration
│   ├── components/
│   │   ├── AppShell.tsx              # Persistent layout frame (Header + Sidebar + Main)
│   │   ├── Header.tsx                # Top header bar, search trigger, profile button
│   │   ├── Sidebar.tsx               # Left vertical icon sidebar
│   │   ├── NoticeCalendar.tsx        # Comprehensive notice tracking & calendar UI
│   │   ├── ProfileDrawer.tsx         # Slide-out user drawer with mobile app badges
│   │   ├── SearchModal.tsx           # Global search dialog (keyboard navigation)
│   │   └── EmptyPagePlaceholder.tsx  # Dynamic module placeholder & breadcrumb component
│   ├── context/
│   │   └── ThemeContext.tsx          # Theme state provider (light/dark persistence)
│   └── types/
│       └── navigation.ts             # Navigation item & badge TypeScript definitions
├── package.json                      # Project dependencies & scripts
├── tsconfig.json                     # TypeScript compiler configuration
└── README.md                         # Project documentation
```

---

## 🛠️ Technology Stack & Dependencies

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Framework** | Next.js 16.4.0 | App Router, Server Components & Client Boundaries |
| **UI Library** | React 19.3.0 | Modern Hooks, Transitions, Context API |
| **Styling** | Tailwind CSS 4.0 | Next-generation engine with `@custom-variant dark` |
| **Type Safety** | TypeScript 5.0 | Strict type definitions across props and navigation |
| **Icons** | Lucide React 1.57 | Scalable vector icon set |
| **State** | React Context API | Local storage persistence for theme configuration |

---

## ⚙️ Installation & Local Development

### Prerequisites
* **Node.js**: `v18.18.0` or higher (Node 20+ recommended)
* **npm**, **pnpm**, or **yarn**

### Quick Start
1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd ayatrio-demo
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the local development server**:
   ```bash
   npm run dev
   ```

4. **Access the application**:
   Open [http://localhost:3000](http://localhost:3000) in your web browser.

### Available Scripts
* `npm run dev`: Launches development server with Turbopack fast reload.
* `npm run build`: Compiles production build with optimization and static route analysis.
* `npm run start`: Starts production Node server.
* `npm run lint`: Runs ESLint code quality checks.

---

## 💡 Keyboard Shortcuts & Interactivity
* `Escape`: Closes the Profile Drawer and Search Modal.
* `Ctrl + K` / `Cmd + K`: Triggers global Search Modal.
* `Theme Toggle`: Sun/Moon button in header instantly switches color modes.
* `Mobile App Download`: Clicking Google Play or App Store buttons simulates store redirection.

---

## 📄 License
Internal proprietary software for Turia Practice. All rights reserved.
