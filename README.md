# PitchPin (formerly TurfUp)

Turf and sports booking for Ahmedabad. Players find a turf, hold live slots, and pay in full or split the bill with their squad.

**Stack:** Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind v4 · shadcn/ui · Motion · Prisma 7 + Neon Postgres · built-in email + password login · Razorpay · Inngest · Leaflet · Web Push + email (Gmail or Resend).

## Run it locally

```bash
npm install
vercel link --project turfup          # once
vercel env pull .env.development.local  # Neon + secrets from Vercel
npm run dev
```

With no `DATABASE_URL`, the app falls back to demo mode with sample turfs.

## Services

### 1. Neon (database) — connected
The Neon integration on Vercel (`turfup-db`, Singapore) sets `DATABASE_URL` and `DATABASE_URL_UNPOOLED` for every environment.

```bash
npm run db:deploy   # apply migrations in prisma/migrations
npm run db:seed     # real Ahmedabad turf listings (src/lib/listings.json)
npx prisma migrate dev --name <change>   # after editing schema.prisma
```

### 1b. Login — built in
Players create an account and sign in with email + password. Accounts and sessions live in Neon (`Profile`, `Session`). Passwords are hashed with scrypt; the session cookie is httpOnly and lasts 30 days; 8 wrong passwords lock the account for 15 minutes. There is no password reset yet (it needs an email sender such as Resend).

### 2. Payments: demo mode (default) or Razorpay
The app runs in **demo payment mode**: checkout and squad pay links (`/pay/demo/<shareId>`) confirm bookings without charging anyone, and the UI says so. This is how the portfolio deployment runs. To take real money, add the keys below; demo payments switch off automatically.

1. Dashboard > API keys (test mode first): set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `NEXT_PUBLIC_RAZORPAY_KEY_ID`.
2. Dashboard > Webhooks: URL `https://<your-domain>/api/razorpay/webhook`, events `payment_link.paid` and `order.paid`. Put the secret in `RAZORPAY_WEBHOOK_SECRET`.
3. Payment Links must be enabled on the account for squad splits.

### 3. Inngest (hold expiry and reminders)
- Local: `npm run inngest` in a second terminal (starts the Inngest dev server).
- Production: create an app at inngest.com, set `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY`, and sync `https://<your-domain>/api/inngest`.

### 4. Notifications (optional)
- **Web push:** `npx web-push generate-vapid-keys`, then fill in the `VAPID` variables.

## Turf owners

| Step | What happens |
| --- | --- |
| Listings | `npm run db:seed` loads 113 real Ahmedabad turfs from public listing sites as **directory listings**: no courts, prices or ratings, so they show "Call to book", Google Maps and the source page. |
| Add a turf | `/owner/new`: name, area, address, map pin, hours, facilities, courts with normal and peak prices. It is bookable as soon as it's published. |
| Claim a listing | `/owner/claim`: search, then send a claim with a phone number. An admin calls and approves it in the admin console; the claimant then adds courts and the listing becomes bookable. |
| Dashboard | `/owner`: your turfs, claims, and upcoming bookings per turf (`/owner/turf/<slug>`). Courts that have bookings can't be removed. |
| Admins | `npm run make-admin -- you@example.com` (sign up on the site first), then sign in at the admin console. |
| Google sign-in | "Continue with Google" on `/login` appears once `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set. A Google account with the same email as an existing account signs into that account. |
| Emails | Welcome and booking-confirmed emails go out from `teampitchpinn@gmail.com` once `GMAIL_APP_PASSWORD` is set; otherwise they're skipped. |
| Firebase copy | https://pitchpin.web.app on Firebase Hosting's free plan (static files only). `npm run backup:firebase` snapshots the public pages (home, Explore, every turf, legal pages) and deploys them. Live slots come from the main site's `/api/availability` (CORS allows this origin); search/filters, sign-in, holding a slot and paying continue on pitchpins.vercel.app. Hosted as a separate site inside the `luxorandco-store` Firebase project. |
| Admin console | Its own address: `https://pitchpin-admin.vercel.app` (set `ADMIN_HOST` to change it; any `admin.*` host also works, e.g. `http://admin.localhost:3000` in development). The player address has no `/admin` at all, and sessions are separate per address. |

## How booking works

| Step | What happens |
| --- | --- |
| Hold | `BookedSlot` rows are inserted under a unique `(court, date, hour)` index, so two players can never take the same hour. A hold lasts **8 minutes** for full payment and **30 minutes** for a squad split. |
| Live grid | The slot picker re-reads `/api/availability` every 5 seconds while the tab is visible; checkout re-reads payment progress every 4 seconds. |
| Pay | Each player's share gets a Razorpay order (Checkout: UPI, cards, netbanking) or a payment link that the organiser shares on WhatsApp. The browser verifies the signature right away, and the webhook records the same payment as a backup. |
| Confirm | When the last share is paid, the booking becomes `CONFIRMED` and Inngest schedules reminders: email 2 hours before kick-off, push 30 minutes before. |
| Expire | Inngest sleeps until the hold ends, then frees the slots, cancels open links and **refunds anyone who paid**. A payment that arrives after expiry is refunded automatically. A 5-minute Inngest cron and `/api/cron/expire-holds` are safety nets. |

## Project layout

```
prisma/schema.prisma      data model (money in paise, hours in IST)
prisma/seed.ts            real turf listings (src/lib/listings.json)
src/lib/owner.ts          owner turfs, claims, approvals
src/app/                  pages, server actions (actions.ts), API routes
src/lib/bookings.ts       hold / pay / confirm / expire / refund logic
src/lib/availability.ts   slot grid computation
src/inngest/              background jobs
src/components/           UI (slot-picker, checkout-view, venue-map, ...)
public/sw.js              push notification service worker
```

## Deploy

**Live:** https://pitchpins.vercel.app (Vercel project `turfup`, functions in `sin1` next to the database). Deploy with `vercel deploy --prod`.

**Vercel** is the target for the Next.js app. Add every env var, set `NEXT_PUBLIC_APP_URL` to your domain, and point the Razorpay webhook and Inngest at it. `vercel.json` runs the expiry fallback daily (Hobby plan limit); Inngest's 5-minute sweep does the real work. Set `CRON_SECRET` too.

Firebase Hosting can serve the app through its Next.js framework support, but Inngest, cron and webhooks are simplest on Vercel, so use Firebase only for things like Cloud Messaging if you need it later.

## Before launch

- Privacy Policy (`/privacy`) and Terms (`/terms`) are written for the demo-payments setup; review them before taking real payments.
- For real money: add Razorpay keys (live keys after KYC).
- Not built yet: cancellations, blackout hours, venue photo upload, owner payouts.
