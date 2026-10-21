# Database

LiftLedger keeps all its data in one MongoDB database (Atlas, connected through Vercel Storage), shared by every company. The app reads and writes it with Prisma 6.19; Prisma 7 does not support MongoDB yet. The schema is in [`liftledger/prisma/schema.prisma`](../liftledger/prisma/schema.prisma).

## How each company's data stays its own

| Layer | What it does | Where |
|---|---|---|
| 1. Data model | Every company-owned collection (`users`, `drivers`, `cars`, `passengers`, `payments`, `trips`, `car_assignments`) has a required `companyId`. Unique indexes start with it, so two companies can hold the same phone number or plate. | `prisma/schema.prisma` |
| 2. Who you are | `companyId` comes only from the signed session cookie, never from the URL or the request. Each call re-reads the user inside that company, so a deleted user or a suspended company loses access at once. | `src/server/db/repository.ts` (`ctx`) |
| 3. Scoped client | `forCompany(client, companyId)` adds `companyId` to every read, count, update and delete. It stamps it on every insert, and it refuses filters for another company, moving a document between companies, raw queries, and the platform collections. | `src/server/db/tenant.ts` |
| 4. Links | MongoDB has no foreign keys. A passenger's car or a payment's passenger is looked up through the same scoped client, so another company's record reads as "not found". | `src/server/db/repository.ts` |
| 5. Import rule | Pages, components and client code may not import Prisma or `src/server`. They reach data through `serverRepo()`. | `eslint.config.mjs` |
| 6. Input checks | The browser talks to `POST /api/repo/{method}`. Each method's arguments are checked with zod, so only plain strings and numbers reach a query. | `src/app/api/repo/[method]/route.ts` |
| 7. MongoDB's own rule | A `$jsonSchema` validator on each company collection refuses any document without a `companyId`, even from code that skipped the scoped client. | `src/server/db/validators.ts` |
| 8. Proof | `isolation.test.ts` signs in as one company and tries to read, change and delete another's data in every way. It runs on a real in-memory MongoDB. | `src/server/db/isolation.test.ts` |

## Commands (run in `liftledger/`)

| Command | What it does |
|---|---|
| `npm run db:push` | Creates the collections with the validators, then the indexes from the schema. Safe to rerun. |
| `npm run db:seed` | Fills an empty database with the demo companies. It refuses if companies exist. |
| `npm run db:seed -- --reset` | Wipes and reseeds. On the production database it also needs `--production`. |
| `npm run db:check` | Lists each collection's size and indexes, and confirms MongoDB refuses a document without `companyId`. |
| `npm test` | Unit and database tests. A throwaway in-memory MongoDB is started automatically. |
| `npm run e2e` | Browser tests. These use the `liftledger_e2e` database, rebuilt on every run, so live data is never touched. |

Changing the schema: edit `schema.prisma`, run `npm run db:push`, then commit. Vercel runs `prisma generate` on install; it does not change the database.

## Notes

- **Seats:** a passenger is put in a car only through `moveToCar()` in the repository. It runs in a transaction that also writes the car's `seatsChangedAt`. Two managers taking the last seat at the same moment therefore conflict in MongoDB; one is retried and told the car is full. Every change is recorded in `car_assignments`.

- **Dates as text:** business dates (join, payment and trip days) are stored as `YYYY-MM-DD` text in UAE time. They are calendar days, not instants, so they must not move with server time zones.
- **Phone numbers:** stored as international digits only, for example `971501234567`. `050 123 4567` and `+971 50 123 4567` both become that.
- **Atlas permissions:** the database user Vercel creates may not run `collMod`. `db:push` therefore adds validators when it creates a collection; an existing empty collection is recreated.
