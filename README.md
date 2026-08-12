# BloodKit

Real-time blood donation matching platform connecting **donors**, **patients**, and **NGOs/hospitals**.

## Stack

- **Frontend:** Next.js (App Router) + React + TypeScript + Tailwind CSS
- **UI:** Custom components styled for shadcn-compatible patterns (`cn`, CVA-ready)
- **Backend / DB / Auth / Realtime:** Planned (Supabase or Prisma + Express/API routes)
- **Maps / Notifications:** Planned (Mapbox/Google Maps, Twilio, FCM, Resend)

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Current status

1. ✅ Project scaffold
2. ✅ Landing page (hero, network status with demo data, how-it-works, role paths)
3. ⏳ Auth (role + OTP) — next
4. ⏳ Donor / patient / NGO flows
5. ⏳ Intelligent matching engine

Demo network stats on the homepage are clearly labeled until live integrations are wired.

## Project structure

```
src/
  app/                 # Next.js routes
  components/
    landing/           # Landing page sections
    layout/            # Header / footer
  data/                # Demo / seed data
  lib/                 # Utilities
  types/               # Shared TypeScript types
public/                # Static assets (hero imagery)
```
