# AquaFlow Manager

A professional Water Jar & Thermos delivery management system for small water supply businesses. Built with React, TypeScript, Vite, and Supabase.

> Your company name, address, and branding are configured inside the app under **Settings → Company Profile**. Those details appear on all printed bills and statements.

---

## Features

- **Admin-Only Access** — No public signup. Admin users are pre-created in Supabase.
- **Customer Management** — Add, edit, delete, and search customers. Supports Hindi names and landmarks with auto-transliteration.
- **Area Management** — Group customers by delivery area.
- **Daily Supply Sheet** — Record jar and thermos deliveries, returns, and payments per customer per day.
- **Printable Supply Chart** — A4-ready daily sheet with pre-filled balances for field use.
- **Monthly Billing** — Auto-calculated bills with opening balance, daily itemization, and grand total. Print-ready.
- **Payment Collection** — Quickly record payments against any customer account.
- **Analytics** — Revenue trends and supply volume charts (daily / monthly / yearly). Area-wise breakdown.
- **Dashboard** — Live snapshot of today's activity, monthly totals, and total outstanding.
- **Settings** — Configure your company name, address, phone, and bill footer message.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript |
| Build Tool | Vite 6 |
| Styling | Tailwind CSS (CDN) |
| Icons | Lucide React |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password) |
| Hosting | Vercel |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier works)
- A [Vercel](https://vercel.com) account (for deployment)

### 1. Clone and Install

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd aquaflow-manager
npm install
```

### 2. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Go to **SQL Editor** and run the complete migration SQL from `docs/SUPABASE_RECOVERY_REPORT.md` (Section 8)
3. Go to **Authentication → Users → Add User** and create your admin account
4. Copy your **Project URL** and **anon public key** from **Settings → API**

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
```

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with your admin credentials.

---

## Deployment to Vercel

### Connect to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import your GitHub repo
3. Vercel auto-detects Vite. Confirm:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add environment variables in Vercel **Settings → Environment Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy

### Supabase Auth Setup

In your Supabase project → **Authentication → URL Configuration**, add your Vercel domain to Redirect URLs:

```
https://YOUR_APP.vercel.app/**
http://localhost:3000/**
```

Also disable **Confirm email** under Authentication → Settings → Email Auth (since you create users manually).

---

## Project Structure

```
aquaflow-manager/
├── index.html              # Vite entry (Tailwind CDN, brand colors)
├── vercel.json             # Vercel SPA rewrite rule
├── vite.config.ts          # Vite config (port 3000, @ alias)
├── .env.example            # Environment variable template
│
└── src/
    ├── App.tsx             # Main shell (auth gate + sidebar navigation)
    ├── index.tsx           # React root mount
    ├── types.ts            # All TypeScript interfaces
    │
    ├── lib/
    │   ├── supabase.ts     # Supabase client + auth helpers
    │   ├── auth.tsx        # AuthContext + useAuth hook
    │   └── alert.ts        # Global showAlert() utility
    │
    ├── services/
    │   └── db.ts           # All Supabase database operations
    │
    └── components/
        ├── Login.tsx           # Admin login page
        ├── Dashboard.tsx       # KPI summary cards
        ├── Analytics.tsx       # Charts and area breakdown
        ├── CustomerManager.tsx # Customer CRUD
        ├── AreaManager.tsx     # Area CRUD
        ├── SupplySheet.tsx     # Daily delivery data entry
        ├── SupplyChart.tsx     # Printable daily supply sheet
        ├── Billing.tsx         # Monthly bill generator
        ├── PaymentCollection.tsx # Payment recording
        ├── Settings.tsx        # Company profile + dev tools
        └── Alert.tsx           # Custom alert modal
```

---

## Database

Four tables in Supabase PostgreSQL:

| Table | Purpose |
|---|---|
| `customers` | Customer profiles (name, area, rates, opening dues) |
| `transactions` | Daily delivery + payment records per customer |
| `areas` | Delivery area list |
| `app_settings` | Company profile (name, address, bill footer) |

Row Level Security is enabled on all tables — only authenticated users can access data.

Full schema, SQL migration, and ER diagram: `docs/DATABASE_SCHEMA.md`

---

## Scripts

```bash
npm run dev       # Start dev server at http://localhost:3000
npm run build     # Production build → dist/
npm run preview   # Preview production build locally
```

---

## Company Branding

The app name is **AquaFlow Manager**. Your business name, address, and phone number are configured inside the app:

**Settings → Company Profile**

These details are used in:
- Printed monthly bills
- Printed supply chart header
- Bill footer message

---

## Developer Reference

These files live in the `docs/` folder (excluded from the repository — local reference only):

| File | Purpose |
|---|---|
| `docs/SUPABASE_RECOVERY_REPORT.md` | Complete SQL to create the database from scratch |
| `docs/DATABASE_SCHEMA.md` | ER diagram, table definitions, data relationships |
| `docs/DEPLOYMENT_PLAN.md` | Step-by-step Vercel + Supabase deployment guide |
| `docs/IMPLEMENTATION_ROADMAP.md` | Feature completion and improvement roadmap |
| `docs/ARCHITECTURE_REVIEW.md` | Code quality, security, and scalability review |
| `docs/FEATURE_AUDIT.md` | Status of every feature (complete / partial / missing) |
| `docs/PROJECT_ANALYSIS.md` | Full project discovery report |

---

## License

Private. All rights reserved.
