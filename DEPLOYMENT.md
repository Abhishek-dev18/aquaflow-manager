# OMPure Water - Deployment & Migration Guide

## Overview

OMPure Water is now configured for deployment on **Vercel** with **Supabase** as the backend, using admin-only authentication.

## Key Changes Made

### 1. Security & Authentication

✅ **Removed:**
- Hardcoded credentials (`admin` / `1234`)
- Tauri/Electron dependencies
- Backup file system functionality
- Google Generative AI integration

✅ **Added:**
- Supabase authentication (email/password only)
- Admin-only access (no public signup)
- Row Level Security (RLS) ready
- Auth context for global state management
- Protected routes

### 2. Environment Configuration

All sensitive values now use environment variables:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Files protected in .gitignore:**
- `.env` (never commit!)
- `.env.local`
- `.env.production`

### 3. Project Structure

```
aquaflow-manager/
├── src/
│   ├── App.tsx                 # Main app with route protection
│   ├── index.tsx               # Entry point with AuthProvider
│   ├── types.ts                # TypeScript definitions
│   ├── lib/
│   │   ├── supabase.ts         # Supabase client & auth
│   │   └── auth.tsx            # Auth context provider
│   ├── components/             # UI components
│   │   └── Login.tsx           # Supabase auth login
│   └── services/
│       └── db.ts               # Database service (Supabase examples)
├── .env.example                # Environment template
├── index.html                  # Entry HTML
├── vite.config.ts              # Vite config (Vercel-ready)
└── tsconfig.json               # TypeScript config
```

## Setup Instructions

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase project (free tier available at https://supabase.com)

### Step 1: Clone & Install

```bash
npm install
```

### Step 2: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. In Supabase dashboard, get your project:
   - **URL**: Project Settings → API → Project URL
   - **Anon Key**: Project Settings → API → Project API Keys → `anon` key

### Step 3: Configure Environment

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 4: Create Supabase Tables

In Supabase SQL Editor, create these tables:

#### customers table

```sql
CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  nameHindi TEXT,
  area TEXT,
  address TEXT,
  landmark TEXT,
  landmarkHindi TEXT,
  mobile TEXT,
  rateJar DECIMAL(10, 2),
  rateThermos DECIMAL(10, 2),
  securityDeposit DECIMAL(10, 2),
  oldDues DECIMAL(10, 2),
  startDate TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### transactions table

```sql
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  customerId TEXT NOT NULL,
  date TEXT NOT NULL,
  jarsDelivered INTEGER DEFAULT 0,
  jarsReturned INTEGER DEFAULT 0,
  thermosDelivered INTEGER DEFAULT 0,
  thermosReturned INTEGER DEFAULT 0,
  paymentAmount DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE
);
```

#### areas table

```sql
CREATE TABLE areas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### app_settings table

```sql
CREATE TABLE app_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  companyName TEXT DEFAULT 'OMPure Water',
  companyAddress TEXT,
  companyMobile TEXT,
  billFooterNote TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Step 5: Enable Row Level Security (RLS)

For each table, enable RLS in Supabase:

1. Go to **Authentication** → **Policies**
2. For each table, create a policy:

```sql
-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read/write
CREATE POLICY "Allow authenticated users" ON customers
FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users" ON transactions
FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users" ON areas
FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users" ON app_settings
FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
```

### Step 6: Create Admin User

In Supabase dashboard:

1. Go to **Authentication** → **Users**
2. Click **Add user**
3. Enter email and password for your admin user
4. Set the user as admin if needed

### Step 7: Run Locally

```bash
npm run dev
```

Visit `http://localhost:3000` and login with your admin credentials.

### Step 8: Build for Production

```bash
npm run build
```

The build will create an optimized `dist/` folder for deployment.

## Deployment on Vercel

### Prerequisites

- GitHub account with this repository pushed
- Vercel account (https://vercel.com)

### Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click **New Project**
   - Select your GitHub repository
   - Click **Import**

3. **Configure Environment Variables**
   - In Vercel dashboard, go to **Settings** → **Environment Variables**
   - Add:
     ```
     VITE_SUPABASE_URL = https://your-project.supabase.co
     VITE_SUPABASE_ANON_KEY = your-anon-key
     ```
   - Click **Save**

4. **Deploy**
   - Vercel will automatically deploy
   - Your app will be available at `https://your-project.vercel.app`

### Important: Supabase CORS

To allow requests from Vercel domain:

1. In Supabase dashboard, go to **Project Settings** → **API**
2. In **CORS Configuration**, add your Vercel domain:
   ```
   https://your-project.vercel.app
   ```

## Security Checklist

- ✅ No hardcoded credentials in code
- ✅ Environment variables for all secrets
- ✅ `.env*` files in `.gitignore`
- ✅ Admin-only authentication enforced
- ✅ Supabase RLS policies configured
- ✅ Using anon key only (never service role key on frontend)
- ✅ All data access requires authentication
- ✅ No public signup functionality
- ✅ Password reset disabled (admin-managed only)

## Migrating Component Data

Components currently use examples from old localStorage. To migrate to Supabase:

### Before (localStorage):
```typescript
const customers = getCustomers(); // Synchronous
```

### After (Supabase):
```typescript
const customers = await getCustomers(); // Async
useEffect(() => {
  getCustomers().then(data => setCustomers(data));
}, []);
```

See `src/services/db.ts` for Supabase implementation examples.

## Troubleshooting

### Login fails
- Check Supabase user exists in **Authentication** → **Users**
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
- Check browser console for error messages

### Data not loading
- Verify RLS policies are enabled and correct
- Check Supabase tables exist
- Verify authenticated user has access via RLS

### Vercel deployment fails
- Check build logs in Vercel dashboard
- Ensure `npm run build` works locally
- Verify environment variables are set in Vercel

### CORS errors
- Add Vercel domain to Supabase CORS in **Project Settings** → **API**

## Next Steps

1. **Customize branding** in components
2. **Implement remaining data services** following `src/services/db.ts` patterns
3. **Add data validation** before Supabase insert/update
4. **Configure backup strategy** (Supabase has automatic backups)
5. **Set up monitoring** via Supabase dashboard
6. **Enable audit logging** for compliance

## Support

- Supabase Docs: https://supabase.com/docs
- Vercel Docs: https://vercel.com/docs
- React Docs: https://react.dev

## License

Private project - All rights reserved.
