# DietByRD

DietByRD is a full-stack teleconsultation and diet-management platform that runs the day-to-day operations of an online nutrition/dietitian practice — patient onboarding, appointment scheduling, personalized diet-plan creation, subscription billing, and staff workflows — behind a single role-based web app.

## Who it's for

The platform serves multiple user roles, each with a dedicated dashboard:

- **Patients** — book consultations, view diet plans, track progress, manage their profile, raise support tickets.
- **Registered Dietitians (RDs)** — manage their patient list, build diet plans, set availability, hold consultations.
- **Doctors** — refer patients, view analytics, manage their own patient list.
- **MLT Interns / Support Interns** — handle operational tasks like reviewing join requests and patient/doctor/dietician detail records.
- **Admins / Ops** — oversee dieticians, doctors, interns, coupons, the food library, referrals, reviews, and platform settings.

## Tech stack

**Frontend**
- React 18 + TypeScript, built with Vite
- Tailwind CSS + shadcn/ui (Radix UI primitives)
- React Router for routing, TanStack Query for data fetching
- React Hook Form + Zod for form handling/validation
- Configured as a PWA (`vite-plugin-pwa`, service worker, manifest)

**Backend**
- Express server (`server/index.js`) for local development
- The same API also ships as serverless functions for **Vercel** (`api/`) and **Netlify** (`netlify/functions/`)
- PostgreSQL via `pg`, with a full schema (`schema.sql`) and versioned migrations (`migrations/`)

**Integrations**
- **Razorpay** — payments, subscriptions, refunds, coupon codes, doctor payouts/commissions
- **Exotel** — OTP, SMS, and WhatsApp Business messaging (India-focused telephony)
- **SendGrid** — transactional email
- **Supabase Storage** (optional) — patient document storage
- **jsPDF** — diet-plan PDF generation

**Testing**
- Vitest (unit) and Playwright (end-to-end)

## Project structure

```
api/                  Serverless function entrypoints (Vercel)
netlify/functions/    Serverless function entrypoints (Netlify)
server/               Express server for local dev
src/
  pages/              Route-level pages, organized by role
    admin/            Admin dashboard sub-pages
    dietician/        Dietician dashboard sub-pages (incl. diet plan builder)
    doctor/           Doctor dashboard sub-pages
    mlt-intern/        MLT/support intern sub-pages
    patient/           Patient dashboard sub-pages
    auth/              Login / password reset
    legal/             Terms, privacy, refund, cancellation pages
  components/         Shared UI components
  contexts/           React context providers
  hooks/              Custom hooks
  lib/                Client-side utilities/API client
migrations/           Sequential SQL migrations
schema.sql            Full Postgres schema (source of truth for a fresh DB)
```

## Data model

The database (all tables prefixed `dietbyrd_`) covers:

- **Users & roles** — `doctor`, `assistant`, `patient`, `rd`, `mlt_intern`, `support_intern`, `ops_manager`, `founder`, `tech_lead`
- **Patients** — profiles, diagnoses (diabetes, PCOS, thyroid, hypertension, obesity), documents, logs
- **Care delivery** — consultations, consultation notes, dietician availability/blocked slots, appointments, diet plans
- **Food library** — a nutrition database used when building diet plans
- **Commerce** — plans, subscriptions, coupon codes/usage, payments, refunds, payouts, doctor earnings
- **Ops** — join requests (staff onboarding), referrals, reviews, support tickets, notifications, WhatsApp message log, audit log

## Getting started

### Prerequisites

- Node.js 20+
- pnpm
- A PostgreSQL database

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Copy the example file and fill in the values you need:

```bash
cp .env.example .env
```

At minimum you'll need `DATABASE_URL`. Everything else (Razorpay, Exotel, SendGrid, Supabase) is optional depending on which features you want working locally — see the comments in `.env.example` for what each variable does and where to get it.

### 3. Set up the database

Run `schema.sql` against a fresh database to create all tables and enum types:

```bash
psql "$DATABASE_URL" -f schema.sql
```

(Migrations in `migrations/` are additive changes layered on top of the base schema — apply them in order if you're evolving an existing database rather than starting from scratch.)

### 4. Run the app

```bash
pnpm dev
```

This starts the Vite dev server and the Express API concurrently. The frontend talks to the local Express server for API calls.

Other useful scripts:

```bash
pnpm dev:client     # frontend only
pnpm dev:server     # backend only (auto-restarts on change)
pnpm dev:netlify    # run via Netlify CLI (closer to Netlify prod behavior)
pnpm build          # production build
pnpm test           # run unit tests (Vitest)
pnpm lint           # run ESLint
```

## Deployment

The app is set up to deploy as-is to either:

- **Vercel** — `vercel.json` builds with `pnpm build`, serves `dist/`, and routes `/api/**` to functions in `api/`.
- **Netlify** — `netlify.toml` builds with `pnpm build`, serves `dist/`, and routes `/api/*` to functions in `netlify/functions/`.

Set the environment variables from `.env.example` in your hosting provider's dashboard before deploying — in particular `DATABASE_URL`, `REGISTRATION_TOKEN_SECRET`, and the Razorpay keys if payments are enabled.

## API

See `BACKEND_API_TESTING.md` for example requests against the API (food library endpoints, etc.). More endpoints exist across the app — check `api/_app.mjs` / `server/index.js` for the full route list.

## License

See `public/LICENSE`.
