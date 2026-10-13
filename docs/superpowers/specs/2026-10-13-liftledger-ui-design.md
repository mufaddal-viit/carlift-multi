# LiftLedger — UI Rebuild Design Spec

Date: 2026-10-13
Status: awaiting owner review
Sources: `prompt.txt` (billing spec), `liftledger_fleet_saas_demo.original.html` (clickable demo), Quixotic dashboard screenshot (visual reference)

## 1. Goal

Rebuild LiftLedger as a multi-company SaaS for car-lift (shared commute) operators in the UAE. This phase delivers the complete, production-quality UI running on mock data. The real backend (MongoDB, real auth, tenant isolation) is a later phase with its own spec; this phase must make that swap possible without rewriting screens.

Success means: a visitor can land on the marketing page, sign a company up, complete onboarding, and use the Manager, Driver, Rider and Platform Admin portals end to end in English or Arabic, in light or dark theme, on phone or desktop, with every number on screen derived from the same data by the same billing rules.

### In scope

- Public landing page
- Login, forgot password, company sign-up, onboarding wizard
- Manager portal, Driver portal, Rider portal, Platform Admin portal
- English + Arabic with full RTL
- Light + dark themes
- Mock data layer with browser persistence
- Billing engine (pure, tested)
- WhatsApp reminders through `wa.me` links

### Out of scope (later phases)

- MongoDB, API routes, real authentication, password reset emails
- Online payment collection, subscription billing for tenants
- Automated WhatsApp sending (Business API)
- Native mobile apps
- White-label theming per company

## 2. Stack

| Concern | Choice |
|---|---|
| Framework | Next.js (App Router), React, TypeScript strict |
| Styling | Tailwind CSS with CSS-variable design tokens |
| Components | shadcn/ui (Radix primitives), restyled to the tokens below |
| Icons | Lucide |
| UI motion | Framer Motion |
| Scroll motion | GSAP + ScrollTrigger, Lenis smooth scroll (marketing only) |
| WebGL | React Three Fiber + drei (landing hero and auth pages only) |
| Charts | Recharts with custom rounded/hatched bar shapes |
| i18n | next-intl, locale-prefixed routes `/en/...`, `/ar/...` |
| Data fetching | TanStack Query over the repository interface |
| Forms | React Hook Form + Zod |
| Tests | Vitest (unit), Playwright (end to end) |

One Next.js app. Route groups separate the surfaces; each group has its own layout shell.

## 3. Visual system

The Quixotic reference is followed closely: palette, typography, card language and layout.

### Colour tokens

| Token | Light | Dark |
|---|---|---|
| canvas | `#F1F2F4` | `#0B1210` |
| card | `#FFFFFF` | `#121A17` |
| soft (inset areas, table stripe) | `#F6F7F8` | `#18221E` |
| ink | `#0E1512` | `#ECF2EF` |
| ink-muted | `#8A9390` | `#7E8C86` |
| line | `#E8EAEC` | `#1F2B26` |
| brand | `#0F8A5F` | `#3DDC97` |
| brand-deep | `#0B6B49` | `#2BB57A` |
| brand-tint | `#DDF3E9` | `#123A2B` |
| paid | `#0F8A5F` on `#DDF3E9` | `#3DDC97` on `#123A2B` |
| partial | `#9A6500` on `#FBF0D8` | `#FBBF4D` on `#322710` |
| overdue | `#B3261E` on `#FCE7E7` | `#F2756F` on `#361C1C` |
| pending | `#5B6675` on `#EDF1F6` | `#A3AEBD` on `#1E252E` |

Status is never conveyed by colour alone: every badge has a dot and a text label.

### Typography

- Latin: Urbanist (300, 400, 500, 600, 700). Display headings are light weight at large size; numbers are semibold.
- Arabic: Readex Pro, same weights.
- Money and table numerics use tabular figures.
- Scale: 12 / 13 / 14 / 16 / 20 / 28 / 40 / 56 px.
- Fonts are loaded with `next/font` (self-hosted, no layout shift).

### Shape and elevation

- Card radius 28px; inner elements 16px; pills and chips fully rounded.
- Cards have no visible border in light theme, a 1px `line` border in dark theme, and a very soft shadow.
- Spacing on an 8px grid; card padding 24px desktop, 16px mobile.

### App shell (Manager and Platform Admin, desktop)

- Floating pill top bar: logo, section pills with a sliding active indicator, search, notifications, language toggle, theme toggle, avatar menu.
- Floating icon rail on the left, in two capsules: quick actions on top, settings and logout at the bottom.
- Page header: large greeting ("Welcome back, <name>" with the name in `ink-muted`), month picker pill, primary action pill.
- Below 1024px the top-bar pills collapse into a bottom tab bar and the rail is hidden.

### App shell (Driver and Rider)

Mobile-first: compact top bar (logo, language, avatar), bottom tab bar, bottom sheets instead of centred modals. On desktop the content sits in a centred column using the same floating top bar.

### Imagery

- Photography from Unsplash through `next/image`, with `images.unsplash.com` whitelisted.
- All photos are listed in one manifest file (`src/content/images.ts`) with id, alt text in both languages, and photographer credit. Screens reference manifest keys, never raw URLs.
- Photo subjects: Dubai roads and skyline, commuter vans, passengers, drivers, phone-in-hand payment moments.
- Placement: landing page sections, auth side panel fallback, onboarding step headers, car cards (vehicle photo by model), empty dashboards.
- Illustrations are a custom animated SVG set kept in `src/components/illustrations/`: van, route with pins, wallet, calendar, WhatsApp bubble, receipt, shield, empty road. Each takes theme colours from tokens and has a small looping animation that stops under reduced motion.

## 4. Motion system

Shared motion tokens: durations 120 / 200 / 320 / 480ms; one standard ease-out curve; one spring preset for sheets and modals.

| Tool | Where | What |
|---|---|---|
| Framer Motion | All portals | Route transitions; sliding nav indicator (shared layout); staggered card entrance; number count-up; bars growing from baseline; springy modals and bottom sheets; animated list reflow on filter; badge morph when status changes; button press feedback; skeleton shimmer |
| GSAP + ScrollTrigger | Landing page | Pinned storytelling sections; SVG route line drawn on scroll; photo parallax; dashboard preview assembling card by card; counters triggered on view |
| Lenis | Landing page | Smooth scrolling |
| React Three Fiber | Landing hero, auth pages | Stylised night-city grid with glowing route lines and small vans moving along them; gentle cursor parallax; calmer variant behind the auth forms |

Rules:

- WebGL is not used inside the working portals.
- The 3D scene is lazy-loaded after first paint, capped at device pixel ratio 1.5, paused when off screen or the tab is hidden.
- If WebGL is unavailable, the device is low-powered, or data saver is on, a still image from the manifest is shown instead.
- `prefers-reduced-motion` disables scroll effects, the 3D animation, looping illustrations and count-ups; transitions become simple fades.

## 5. Routes

All routes are under `/[locale]`.

| Group | Routes |
|---|---|
| `(marketing)` | `/` (landing), `/pricing` |
| `(auth)` | `/login`, `/forgot-password`, `/signup` |
| `(onboarding)` | `/onboarding` (steps: company, first car, first driver, first riders, done) |
| `(manager)` | `/app` (dashboard), `/app/fleet`, `/app/fleet/[carId]`, `/app/passengers`, `/app/passengers/[id]` (ledger), `/app/payments`, `/app/attendance`, `/app/reminders`, `/app/settings` |
| `(driver)` | `/driver` (dashboard), `/driver/passengers`, `/driver/passengers/[id]`, `/driver/attendance`, `/driver/collect` |
| `(rider)` | `/rider` (account), `/rider/history`, `/rider/receipts/[paymentId]` |
| `(admin)` | `/admin` (overview), `/admin/companies`, `/admin/companies/[id]`, `/admin/plans`, `/admin/settings` |

Also: localized `not-found`, `error`, and a "no access" page.

## 6. Roles and access

| Role | Sees | Can do |
|---|---|---|
| Platform admin | All companies, plans, usage | Suspend/activate a company, change its plan, open a company's manager portal read-only |
| Manager | Everything in their company | Full CRUD on cars, drivers, passengers; log and delete payments; mark attendance; send reminders; company settings |
| Driver | Their car and its passengers only | Log payments, mark attendance, send reminders for their passengers |
| Rider | Their own account only | View status, history and receipts; message their driver on WhatsApp |

Route guards run in middleware from the session's role and company. Every repository call takes the session and filters by company and role, so the UI never holds data it should not show.

## 7. Domain model

All records except `Company` and `Plan` carry `companyId`.

```ts
Plan      { id, name, priceAed, maxCars, maxRiders, features[] }
Company   { id, name, tradeLicense?, city, phone, planId, status: 'active'|'suspended'|'trial',
            dueDay, currency: 'AED', createdAt }
User      { id, companyId|null, role: 'admin'|'manager'|'driver'|'rider',
            name, email?, phone, password(mock), locale, linkedDriverId?, linkedPassengerId? }
Car       { id, companyId, model, plate, capacity, driverId|null, status: 'active'|'inactive', photoKey }
Driver    { id, companyId, name, phone, licenseNo?, status: 'active'|'inactive' }
Passenger { id, companyId, carId, name, phone, pickupArea, dropArea, route, seatNumber,
            billingType: 'monthly'|'perTrip', monthlyFee, perTripFee, joinDate,
            status: 'active'|'inactive', createdAt, updatedAt }
Payment   { id, companyId, passengerId, amount, date, method: 'cash'|'transfer'|'wallet',
            forMonth: 'YYYY-MM', note?, loggedByUserId, createdAt }
Trip      { id, companyId, passengerId, date: 'YYYY-MM-DD', status: 'travelled'|'absent' }
```

Rules carried over from `prompt.txt`:

- No paid/unpaid flag is stored anywhere. Status is always computed.
- Payments are append-only: one record per payment, deletable but never edited or overwritten.
- One trip record per passenger per day.
- Phone numbers are stored with country code and no symbols (`9715XXXXXXXX`).

## 8. Billing engine

A pure module (`src/core/billing/`) with no UI or storage imports. It is the only place these rules exist; every screen calls it.

```ts
expectedFor(passenger, month, trips): number
paidFor(passengerId, month, payments): number
statusFor(passenger, month, payments, trips, today, dueDay): 
  { expected, paid, balance, status: 'paid'|'partial'|'pending'|'overdue' }
proRate(monthlyFee, joinDate): number
companySummary(month, ...): { collected, expected, outstanding, overdueCount, collectionRate,
                              byCar[], byMethod[], trend[] }
```

Rules:

- Monthly billing: `expected = monthlyFee`, except in the join month where `expected = proRate(monthlyFee, joinDate)`. Months before the join month have `expected = 0`.
- Per-trip billing: `expected = (travelled trips in the month) × perTripFee`.
- Pro-rating uses calendar days, counting the join day: `round(monthlyFee × remainingDays / daysInMonth)`. Joining on the 20th of a 31-day month gives 12/31.
- `paid` = sum of payments whose `forMonth` equals the month. An advance is simply a payment with a future `forMonth`.
- `balance = expected − paid`.
- Status: `paid` if `expected > 0` and `balance ≤ 0`; otherwise `pending` if `paid = 0`, else `partial`; `pending` or `partial` becomes `overdue` once `today` is after the company's `dueDay` in that month (or the month has ended). Per-trip passengers are billed on what they travelled, so they become `overdue` only after the month has ended. A passenger with `expected = 0` shows as `paid` with a "nothing due" note.
- Overpayment in a month is not carried forward automatically; it shows as a negative balance labelled "credit". Carrying it forward is done by logging the payment against the next month.
- All amounts are whole AED.

Because every figure comes from this module, the totals on the dashboard, per-car cards, payments table and ledger always agree. This fixes the mismatched driver totals in the original demo.

## 9. Data layer

```
UI components → TanStack Query hooks → Repository interfaces → MockRepository (this phase)
                                                             → ApiRepository  (backend phase)
```

- Repository interfaces (`src/core/repo/types.ts`) mirror the endpoints in `prompt.txt` plus cars, drivers, companies, plans and auth. All methods are async.
- `MockRepository` holds data in memory, seeded on first load, persisted to `localStorage`, with 150–400ms simulated latency and an optional failure switch for testing error states.
- Seed data: 4 companies on different plans; the main demo company has 3 cars, 3 drivers and about 24 passengers covering every case (paid, partial, overdue, pending, advance, pro-rated join, per-trip, inactive), with 6 months of payments and trips generated relative to the current date so the demo never looks stale.
- A "Reset demo data" action lives in settings.
- Mock auth: login checks the seeded users, stores a session (user id, role, company id, locale) in a cookie that middleware reads. The login page offers one-tap demo accounts for each role.

## 10. Screens

### Landing page

Hero with the WebGL scene, headline, two calls to action and floating glass stat cards. Then: logo strip; "how it works" pinned scroll story (add riders → mark attendance → log payments → remind on WhatsApp) with the drawn route line; feature grid with illustrations; role showcase (Manager / Driver / Rider) with device mockups; photography band with parallax; pricing teaser; testimonials; FAQ; closing call to action; footer with language toggle.

### Pricing

Three plan cards (Starter, Growth, Fleet) with monthly/annual toggle and a comparison table. Prices shown are illustrative seed values until the owner sets real ones.

### Login / forgot password / sign-up

Split screen: form on one side, WebGL scene with glass stat cards on the other (short header band on mobile). Login takes email or phone plus password, with show-password, inline validation, a shake on failure, and demo account chips. Sign-up collects company name, manager name, phone, email, password, then goes to onboarding. Forgot password shows the request form and a confirmation state (no email is sent in this phase).

### Onboarding

Five steps with a progress rail and an illustration per step: company details and due day; first car; first driver; first riders (add one by one or paste several); done, with a celebration animation and a button into the dashboard. Every step after the first can be skipped.

### Manager portal

- Dashboard: follows the reference layout. Hero "Collected" card; collection trend chart with Monthly/Annually toggle; outstanding balance card with area line and "Remind all" / "Log payment"; overdue amount card with delta chip; "needs attention" avatar stack; recent payments table; fleet occupancy; payment method split. Month picker filters everything.
- Fleet: car cards with vehicle photo, plate, driver, seats filled, collected this month. Add/edit car and driver. Car detail shows its riders and collections.
- Passengers: searchable, filterable table (status, car, billing type) with a row action menu; card list on mobile. Add/edit form where billing type switches which fee field shows.
- Passenger ledger: profile header, month-by-month expected/paid/balance, every payment and trip in a timeline with running balance, actions (log payment, remind, edit, deactivate).
- Payments: month picker; every active passenger with expected, paid, balance and status; "Log" and "Remind" per row; payment modal (rider, amount, date, method, for-month, note); delete payment with confirmation and undo.
- Attendance: date picker; grid of riders with Travelled/Absent toggles; "mark all travelled"; per-trip riders show their running month total updating live.
- Reminders: queue of pending and overdue riders with the message preview in the rider's language and an "Open WhatsApp" button per rider.
- Settings: company profile, due day, reminder message template, language, theme, reset demo data.

### Driver portal

Dashboard (collected, outstanding, riders, today's attendance progress); my passengers; passenger detail with ledger; attendance for today as large tap targets; quick collect flow (pick rider → amount → method → done) designed for one hand.

### Rider portal

Account status card for the current month ("October is paid" / amount due and due date); next due date, fee, car, driver; payment history; receipt view with print/save; "Message driver" on WhatsApp.

### Platform Admin portal

Overview (companies, active riders, total collected across the platform, sign-ups trend); companies table with plan, status, usage against plan limits; company detail with suspend/activate, plan change, and read-only "view as manager"; plans editor.

### States every screen has

Skeleton loading that matches the final layout; an illustrated empty state with a next action; an error state with retry; optimistic updates with a toast and undo for payments and attendance.

## 11. Internationalisation

- Locales `en` and `ar`; the locale is in the URL and remembered per user.
- `dir` is set on `<html>`; layout uses logical properties (`ms-`, `me-`, `ps-`, `pe-`, `start`, `end`) only, so RTL needs no per-screen overrides.
- Directional icons (arrows, chevrons) mirror in RTL; charts, phone numbers and plates do not.
- Western digits in both languages; currency formatted as `AED 1,430` / `1,430 د.إ`.
- Dates through `Intl.DateTimeFormat`; months are stored as `YYYY-MM`.
- All strings live in `messages/en.json` and `messages/ar.json`; no hard-coded text in components.
- WhatsApp reminder templates exist in both languages.

## 12. Quality bars

- Accessibility: WCAG AA contrast in both themes; full keyboard operation; visible focus rings; Radix-based dialogs and menus; charts have a text summary; tap targets at least 44px.
- Performance: landing page Largest Contentful Paint under 2.5s on a mid-range phone with the 3D scene deferred; portal routes ship no Three.js or GSAP code; images sized and lazy-loaded through `next/image`.
- Responsive from 360px to 1920px.

## 13. Testing

- Billing engine: unit tests for every rule in section 8, including join-month pro-rating at month boundaries, February, per-trip with zero trips, advance payments, overpayment, due-day transitions and inactive passengers.
- Repository: unit tests for role and company filtering.
- End to end (Playwright): sign-up → onboarding → dashboard; log a payment and see status change everywhere; mark attendance and see a per-trip bill change; each role cannot reach another role's routes; Arabic RTL smoke test; reduced-motion smoke test.

## 14. Project structure

```
src/
  app/[locale]/(marketing|auth|onboarding|manager|driver|rider|admin)/...
  components/ui/            shadcn primitives, restyled
  components/shell/         top bar, icon rail, tab bar, page header
  components/charts/        trend bars, area line, split bars
  components/illustrations/ animated SVG set
  components/three/         WebGL scene and fallback
  components/motion/        shared motion primitives and tokens
  features/<area>/          screen-level components per feature
  core/billing/             pure billing engine + tests
  core/repo/                interfaces, mock implementation, seed
  core/auth/                session, guards
  content/images.ts         Unsplash manifest
  messages/                 en.json, ar.json
```

## 15. Build order

Each sub-project gets its own implementation plan and is demoable when finished.

1. Foundation: project setup, tokens, themes, fonts, i18n and RTL, component library, motion primitives, illustrations, billing engine, repository and seed, mock auth, app shells.
2. Front door: landing page, pricing, login, forgot password, sign-up, onboarding.
3. Manager portal.
4. Driver portal.
5. Rider portal.
6. Platform Admin portal.
7. Polish pass: accessibility audit, performance audit, end-to-end suite, cross-browser and RTL review.

Later, under a separate spec: MongoDB backend, real authentication, tenant isolation, deployment.
