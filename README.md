# LiftLedger - Car Lift SaaS Platform

A modern, production-ready SaaS platform for managing shared commute (car lift) operations in the UAE. Built with Next.js 16, React 19, TypeScript, and Tailwind CSS.

## 🎯 Overview

LiftLedger enables car-lift operators to:
- Register passengers (self-service via QR code or link)
- Track monthly payments and outstanding dues
- Manage drivers, vehicles, and routes
- Generate financial reports and insights
- Send WhatsApp reminders to riders
- Support English & Arabic with full RTL

**Features Status:** Foundation + Requirements v1.0 complete ✅

---

## 📋 Project Structure

```
liftledger/
├── liftledger/              # Next.js application
│   ├── src/
│   │   ├── app/            # Next.js App Router
│   │   ├── components/     # UI components & shell
│   │   ├── core/           # Billing engine, auth, repo (no React)
│   │   ├── features/       # Feature-specific components
│   │   ├── data/           # Query hooks & session management
│   │   ├── content/        # Static content (images manifest, etc)
│   │   ├── i18n/           # Internationalization
│   │   └── lib/            # Utilities
│   ├── messages/           # English & Arabic translations
│   ├── e2e/                # Playwright smoke tests
│   ├── public/             # Static assets
│   ├── package.json
│   └── vercel.json         # Vercel deployment config
├── Dockerfile              # Docker build config
├── DEPLOYMENT.md           # Full deployment guide
└── README.md              # This file
```

---

## 🚀 Quick Start

### Local Development

```bash
cd liftledger/liftledger

# Install dependencies
npm install

# Start dev server (http://localhost:3000)
npm run dev

# Run tests
npm test

# Run e2e tests
npm run e2e
```

### Demo Accounts

Password for all accounts: `demo1234`

| Role | Email/Phone | Company |
|------|------------|---------|
| Manager | manager@amadexpress.ae | Amad Express |
| Driver | One per vehicle | Auto-assigned |
| Rider | Multiple accounts | Various |
| Admin | admin@liftledger.app | (Platform level) |

---

## ✨ Key Features Implemented

### 1. Passenger Management
- ✅ Self-registration via QR code or shareable link
- ✅ Duplicate phone number validation (per company)
- ✅ Auto-assignment to vehicles (load-balanced)
- ✅ Statement of Account (SOA) per passenger
- ✅ Payment history & ledger tracking

### 2. Billing Engine (Pure, Tested, No Side Effects)
- ✅ Monthly billing with pro-rating
- ✅ Per-trip billing support
- ✅ Automated status computation (paid/partial/pending/overdue)
- ✅ Company-wide financial summaries
- ✅ 6-month trend analysis

### 3. Payment Tracking
- ✅ Log payments with date, method, amount, month
- ✅ Search passengers by name or employer company
- ✅ Payment history per passenger
- ✅ Outstanding balance tracking
- ✅ Collection rate metrics

### 4. User Roles & Permissions
- ✅ Platform Admin (view all companies)
- ✅ Manager (full company control)
- ✅ Driver (assigned car & passengers)
- ✅ Rider (personal account only)
- ✅ Role-based route guards

### 5. Localization
- ✅ English & Arabic (both complete)
- ✅ Full RTL (Right-to-Left) layout support
- ✅ Logical CSS properties (no left/right)
- ✅ Western digits in both languages
- ✅ Locale-prefixed routes (`/en/*`, `/ar/*`)

### 6. Design & UX
- ✅ Light & dark themes
- ✅ Mobile-first responsive (360px+)
- ✅ Touch-friendly (44px+ tap targets)
- ✅ WCAG AA contrast compliance
- ✅ Reduced motion support
- ✅ Smooth animations with Framer Motion

### 7. Data Layer
- ✅ Mock repository (browser localStorage)
- ✅ Deterministic seed data
- ✅ TanStack Query for data fetching
- ✅ Role-based data scoping
- ✅ Optimistic updates with undo

---

## 🏗️ Architecture

### Domain (Pure Functions - No Side Effects)
```typescript
src/core/
├── billing/         # Billing logic (monthly, per-trip, pro-rating)
├── auth/           # Session management, guards
├── repo/           # Repository interface & mock implementation
└── format.ts       # Formatting utilities (money, phone, dates)
```

### UI Layer
```typescript
src/components/
├── ui/             # Primitives (Button, Card, Badge, Table, etc)
├── shell/          # App shell (nav, header, tabs)
├── charts/         # Charts (TrendBars, AreaLine, SplitBars)
├── illustrations/  # SVG illustrations with animations
└── motion/         # Motion primitives & tokens

src/features/
├── auth/           # Registration, login
├── dashboard/      # Manager dashboard, payment dialog
└── passengers/     # Passengers list, SOA detail
```

### Data & State
```typescript
src/data/
├── hooks.tsx       # TanStack Query hooks
└── session-client.ts # Cookie management

src/i18n/
├── routing.ts      # next-intl configuration
├── request.ts      # Server-side locale detection
└── navigation.ts   # Locale-aware Link component
```

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 (strict mode) |
| **Styling** | Tailwind CSS 4 + CSS Variables |
| **UI Components** | Radix UI, shadcn/ui |
| **Icons** | Lucide React |
| **Animation** | Framer Motion |
| **State** | TanStack Query 5 |
| **Forms** | React Hook Form + Zod |
| **i18n** | next-intl 4 |
| **Testing** | Vitest 5, Playwright 1.64 |
| **Deployment** | Vercel (serverless) or Docker |

---

## 🧪 Testing

```bash
# Unit tests (Vitest)
npm test

# Watch mode
npm test -- --watch

# E2E tests (Playwright)
npm run e2e

# Build production
npm run build

# Start production server
npm start
```

---

## 📚 Data Model

### Core Entities

**Passenger**
```typescript
{
  id: string
  companyId: string
  carId: string
  name: string
  employerName: string  // Employer's company name
  phone: string         // UAE format: 971XXXXXXXXX
  pickupArea: string    // Deira, Bur Dubai, Burjuman, Karama, Satwa
  dropArea: string      // Al Quoz 1-4, Umm Suqeim
  route: string         // "Pickup → Drop"
  seatNumber: number
  billingType: 'monthly' | 'perTrip'
  monthlyFee: number    // AED (integers only)
  perTripFee: number    // AED (integers only)
  joinDate: string      // ISO date
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}
```

**Payment**
```typescript
{
  id: string
  companyId: string
  passengerId: string
  amount: number        // AED (positive integer)
  date: string          // Date received (ISO)
  method: 'cash' | 'transfer' | 'wallet'
  forMonth: string      // YYYY-MM (can be future for advances)
  note?: string
  loggedByUserId: string
  createdAt: string
}
```

**Trip**
```typescript
{
  id: string
  companyId: string
  passengerId: string
  date: string          // ISO date
  status: 'travelled' | 'absent'
}
```

---

## 🌍 Deployment

### Option 1: Vercel (Recommended)

```bash
cd liftledger/liftledger
vercel --prod
```

**Benefits:**
- One-click deployment
- Automatic HTTPS & DNS
- Serverless functions (no server management)
- Built-in analytics & monitoring
- Free tier available

### Option 2: Docker

```bash
docker build -t liftledger:latest .
docker run -p 3000:3000 liftledger:latest
```

### Option 3: VPS/Self-Hosted

```bash
npm ci
npm run build
npm start
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

---

## 🔐 Security

- **Session Management**: Base64url-encoded JWT in httpOnly cookie
- **CSRF Protection**: Next.js built-in
- **XSS Prevention**: React auto-escaping + Tailwind classes
- **SQLi Prevention**: Parameterized queries (when DB added)
- **Input Validation**: Zod schemas on all forms
- **Rate Limiting**: (To be added in production)
- **Environment Secrets**: Never committed, loaded from `.env.local`

---

## 🚀 Production Roadmap

### Phase 1: Foundation (✅ Complete)
- [x] Core UI & design system
- [x] Billing engine
- [x] Mock data layer
- [x] Passenger registration
- [x] Payment tracking
- [x] i18n & RTL

### Phase 2: Real Backend (Planned)
- [ ] MongoDB/PostgreSQL integration
- [ ] Real authentication (Auth0, Clerk, or Supabase)
- [ ] API routes (Node.js or serverless functions)
- [ ] Email service for password reset
- [ ] WhatsApp Business API integration

### Phase 3: Driver & Rider Portals
- [ ] Driver dashboard & passenger management
- [ ] Rider account dashboard
- [ ] Payment history & receipts
- [ ] In-app messaging

### Phase 4: Admin Portal
- [ ] Company management
- [ ] Subscription & billing
- [ ] Usage analytics
- [ ] Support ticketing

---

## 📖 Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Full deployment & production setup
- **[liftledger/README.md](./liftledger/liftledger/README.md)** - App-specific docs
- **Type Definitions**: `src/core/repo/types.ts` - Single source of truth
- **Billing Logic**: `src/core/billing/` - Pure, tested, documented
- **API Hooks**: `src/data/hooks.tsx` - TanStack Query patterns

---

## 🤝 Contributing

```bash
# Create a feature branch
git checkout -b feature/your-feature

# Make changes, test locally
npm test

# Commit with semantic messages
git commit -m "feat: add feature X"

# Push and create PR
git push origin feature/your-feature
```

---

## 📞 Support

### For Local Issues
1. Check [DEPLOYMENT.md](./DEPLOYMENT.md) troubleshooting section
2. Clear browser cache & localStorage
3. Verify Node.js version: `node --version` (18+ required)
4. Check browser console for errors

### For Production
- Vercel dashboard: https://vercel.com/dashboard
- Error tracking: Sentry (when configured)
- Logs: Vercel → Project → Functions or Edge Network

---

## 📄 License

Proprietary - All rights reserved

---

## 🎯 Demo Status

**Ready for Client Presentation:** ✅

The application is feature-complete for the foundation phase and ready to showcase:
- Seed data with 24 passengers across 3 vehicles
- 6 months of transaction history
- Complete payment tracking workflow
- Full English & Arabic interface
- Mobile & desktop responsiveness
- Dark mode support

**To show the demo:**
1. Run `npm run dev` in `liftledger/liftledger/`
2. Visit http://localhost:3000
3. Login with `manager@amadexpress.ae` / `demo1234`
4. Navigate to `/en/passengers` to see the new features
5. Try registration at `/en/register/co-majra` (public QR link demo)

---

**Built with ❤️ for car-lift operators in the UAE**
