# LiftLedger - Deployment & Demo Guide

## Quick Start (Local Development)

**Note:** The app requires Node.js 18+ and at least 4GB RAM for building.

```bash
cd liftledger/liftledger
npm install
npm run dev
```

Visit: http://localhost:3000

### Demo Credentials

All demo accounts use password: `demo1234`

**Manager Portal:**
- Email: `manager@almajra.ae`
- Phone: `+971 50 100 0001`
- Company: Al Majra Transport

**Driver Portal:**
- One driver per vehicle in demo data
- Accessible after login via `/en/driver`

**Rider Portal:**
- Three rider accounts in demo data
- Accessible via `/en/rider`

**Admin Portal:**
- Email: `admin@liftledger.app`
- Accessible via `/en/admin`

---

## Deployment to Vercel (Recommended)

### Option 1: Connect GitHub Repository

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your repository
5. Set root directory to `liftledger/liftledger`
6. Deploy

### Option 2: Deploy via Vercel CLI

```bash
npm i -g vercel
cd liftledger/liftledger
vercel --prod
```

### Environment Variables

| Name | Where it comes from | Notes |
|---|---|---|
| `MONGODB_URI` | Vercel → Storage → MongoDB Atlas (set automatically) | The app adds the database name (`liftledger`) itself. |
| `MONGODB_DB` | optional | Use another database on the same cluster (the e2e tests use `liftledger_e2e`). |
| `AUTH_SECRET` | `vercel env add AUTH_SECRET` | 32+ random characters; signs the session cookie. Production refuses to start without it. |

Locally, put the same values in `liftledger/.env.local` (git-ignored), or run `vercel env pull .env.local`.

See [docs/DATABASE.md](docs/DATABASE.md) for the schema, the tenancy rules and the database commands.

---

## Docker Deployment

### Build Docker Image

```bash
docker build -t liftledger:latest .
```

### Run Locally

```bash
docker run -p 3000:3000 liftledger:latest
```

### Deploy to Docker Registry

```bash
docker tag liftledger:latest your-registry/liftledger:latest
docker push your-registry/liftledger:latest
```

---

## Production Considerations

### Memory Requirements
- **Dev**: 2GB RAM minimum
- **Production**: 512MB per instance (Vercel's standard)
- **Build**: 4GB RAM needed (Vercel provides this automatically)

### Performance
- Next.js 16 with Turbopack bundling
- Automatic image optimization via `next/image`
- Code splitting per route
- Static generation where possible

### Security
- Passwords hashed with scrypt; sessions are HMAC-signed, HttpOnly cookies
- Every company's data is scoped by `companyId` in code and checked by MongoDB itself (see docs/DATABASE.md)
- API input is validated with zod; only plain values reach database queries
- XSS prevention via React's built-in escaping

### Data Persistence
- MongoDB Atlas (one database for all companies), through Prisma 6

---

## Features Included in Demo

✅ **Passenger Registration**
- Public QR code & link sharing
- Dubai location dropdowns
- Duplicate phone validation
- Auto-assignment to vehicles

✅ **Monthly Payment Tracking**
- Dashboard with collected/expected/outstanding
- Payment history per passenger
- Statement of Account (SOA) detail view
- Search by name or employer company

✅ **Multi-Language & RTL**
- Full English & Arabic support
- Automatic RTL layout
- All text from JSON translation files

✅ **User Roles**
- Platform Admin: View all companies
- Manager: Full company control
- Driver: Manage assigned passengers
- Rider: View personal account

✅ **Responsiveness**
- Mobile-first design (360px+)
- Touch-friendly controls (44px minimum)
- Tablet optimized
- Desktop full features

---

## Testing the Demo

### 1. Manager Dashboard
- Login as manager@almajra.ae
- See demo company with 24 passengers
- 6 months of payment history
- Collection rate charts and metrics

### 2. Add Payment
- Click "Log Payment" button
- Search passengers by name or company
- Auto-fills balance due
- See dashboard update instantly

### 3. Register New Passenger
- Visit: http://localhost:3000/en/register/co-majra
- Fill form with demo data
- Confirms auto-assignment to vehicle
- Shows RTA contract instructions

### 4. View Passenger SOA
- From passengers list
- See month-by-month ledger
- Tracks expected, paid, balance
- Shows payment history

### 5. Multi-Language
- Click language toggle (top bar)
- Switch between English & Arabic
- Layout automatically flips (RTL)
- All text translates

### 6. Dark Mode
- Click theme toggle (top bar)
- See light/dark contrast maintained
- All colors accessible (WCAG AA)

---

## Troubleshooting

### Port 3000 Already in Use
```bash
npm run dev -- -p 3001
```

### Out of Memory (local build)
```bash
NODE_OPTIONS="--max-old-space-size=8192" npm run build
```

### localStorage Issues
- Clear browser cache: DevTools → Application → Clear Storage
- Hard reload: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)

---

## Next Steps for Production

1. **Database**: Swap MockRepository with real DB queries (MongoDB/PostgreSQL)
2. **Authentication**: Replace mock auth with JWT or Clerk
3. **WhatsApp Integration**: Connect WhatsApp Business API for automated reminders
4. **Email**: Add password reset & notification emails
5. **Payment Gateway**: Integrate Stripe/PayPal for online payments
6. **Analytics**: Add Mixpanel/Amplitude tracking
7. **Error Tracking**: Integrate Sentry or Rollbar

---

## Support

For issues or questions:
- Check browser console for errors
- Verify Node.js version: `node --version` (18+)
- Clear localStorage and reload
- Check network tab for API errors

Demo API calls are instant (mocked), so if you see delays, it's likely a rendering issue.
