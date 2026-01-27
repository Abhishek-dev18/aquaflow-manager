# OMPure Water

Professional water management system with admin-only authentication, built for Vercel and Supabase.

## Features

✨ **Admin-Only Access** - No public signup, pre-created admin users only
🔐 **Secure Authentication** - Supabase email/password authentication with Row Level Security
☁️ **Cloud Ready** - Optimized for Vercel deployment with Supabase backend
📊 **Full Management** - Customer, transaction, billing, and analytics management
🎯 **Type Safe** - Full TypeScript support
📱 **Responsive Design** - Mobile-friendly UI with Tailwind CSS

## Quick Start

### Prerequisites

- Node.js 18+
- Supabase project (free tier: https://supabase.com)
- Vercel account (optional, for deployment)

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```
   
   Open http://localhost:3000 and login with your admin credentials.

### Build for Production

```bash
npm run build
```

## Deployment

### Vercel Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete setup instructions including:
- Supabase table creation
- RLS policy configuration
- Admin user setup
- Environment variables
- Vercel deployment steps

### Quick Deploy Button

```bash
git push origin main
# Then connect your GitHub repo to Vercel
```

## Project Structure

```
src/
├── App.tsx                 # Main application with auth-protected routes
├── index.tsx               # Entry point with AuthProvider
├── types.ts                # TypeScript types
├── lib/
│   ├── supabase.ts         # Supabase client initialization
│   └── auth.tsx            # Authentication context provider
├── components/             # React components
│   ├── Login.tsx           # Admin login page
│   ├── Dashboard.tsx       # Main dashboard
│   ├── CustomerManager.tsx # Customer CRUD
│   └── ...                 # Other management components
└── services/
    └── db.ts               # Database service examples (Supabase)
```

## Security

✅ **No Hardcoded Credentials** - All secrets via environment variables
✅ **Environment Protected** - Sensitive files in `.gitignore`
✅ **Row Level Security** - Supabase RLS policies enforce auth
✅ **Admin-Only** - No public access, pre-created users only
✅ **HTTPS Only** - Vercel provides automatic HTTPS
✅ **Safe to Share** - Repository safe to push (no secrets exposed)

## Authentication

- **Email/Password Only** - Admin users created in Supabase
- **No Public Signup** - Administrator manages user access
- **Automatic Session Persistence** - Tokens stored securely
- **Logout** - Clean session termination

## Database

Using Supabase PostgreSQL with:
- **Row Level Security (RLS)** - Data access control
- **Real-time Subscriptions** - Optional live updates
- **Automatic Backups** - Built-in backup system
- **RESTful API** - Type-safe queries

See [DEPLOYMENT.md](./DEPLOYMENT.md) for table schema and RLS policies.

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Environment Variables

Create `.env.local` from `.env.example`:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Troubleshooting

**Can't login?**
- Verify Supabase user exists in Authentication → Users
- Check credentials are correct
- Ensure `.env.local` is configured

**Data not loading?**
- Verify RLS policies are enabled
- Check Supabase tables exist
- Review browser console for errors

**Build failures?**
- Run `npm install` to update dependencies
- Check Node.js version (18+ required)
- Verify `.env.local` has correct values

See [DEPLOYMENT.md](./DEPLOYMENT.md) for more troubleshooting.

## Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS, Vite
- **Backend:** Supabase (PostgreSQL + Auth)
- **Hosting:** Vercel
- **Icons:** Lucide React

## License

This project is private. All rights reserved.

---

**Ready to deploy?** See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete setup instructions.
