# LiftLedger: build plan

Work runs top to bottom. Each step is one commit to `main` (carlift-multi), tested before the next starts.

## Decisions

- **Stack:** Next.js 16 on Vercel serves both the pages and the API; there is no separate backend. Data lives in MongoDB Atlas, connected through Vercel Storage as `MONGODB_URI`, and is read and written through Prisma 6.19. Prisma 7 does not support MongoDB yet.
- **Tenancy:** one database is shared by every company. Each company-owned record carries a `companyId`.
- **Scope now:** the manager side only. The driver and passenger portals stay placeholders.

## Tenant isolation rules

1. Every company-owned model has a required, indexed `companyId`. Every unique index is compound and starts with `companyId`, for example `@@unique([companyId, phone])`.
2. `companyId` is taken only from the signed session cookie, never from a URL, form or request body. A company slug in the URL must match the session; otherwise the user is redirected or gets a 404.
3. Feature code reaches the database only through `forCompany(companyId)`. This is a Prisma client extension that:
   - adds `companyId` to every where clause;
   - stamps `companyId` on every create;
   - refuses any change to `companyId`.

   A lint rule blocks direct imports of the unscoped client everywhere except the platform-level modules.
4. Every link between records, such as a car in a passenger or a passenger in a payment, is resolved through the scoped client. A record that belongs to another company reads as "not found".
5. Backstops:
   - a MongoDB `$jsonSchema` validator requires `companyId` on every tenant collection;
   - an isolation test suite with two companies proves company A can never read or write company B's data.

## Steps

- [x] 0. Rename Rider to Passenger everywhere: role, routes, translations, code and tests.
- [ ] 1. Single company on the login page: only Al Majra Transport is shown, while the other seed companies remain for the isolation tests.
- [ ] 2. Company slug URLs: `/{locale}/{company-slug}/login`, `/register`, `/app`, and so on. `/en/login` redirects to `al-majra-transport`.
- [ ] 3. Prisma and MongoDB: the schema, the tenant-scoped client, the server repository, an API bridge for the screens, seeding, and isolation tests.
- [ ] 4. Assign a passenger to a car (manager):
  - an Assign car dialog on the passengers list and statement page;
  - the server checks that the car is active, belongs to the same company and has a free seat;
  - an audit trail of each assignment;
  - a filter for passengers with no car.

## Later (not now)

- Fuller manager user journeys and flows.
- Driver portal and passenger portal.
