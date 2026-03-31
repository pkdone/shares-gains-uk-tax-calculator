**WARNING: This application does not provide professional tax advice and could be wrong.**

# Shares Gains UK Tax Calculator

UK capital gains planning for equity compensation (e.g. RSUs from a US employer). This repository is under active development.

## Prerequisites

- **Node.js** >= 22.21.1
- **MongoDB Atlas** — the app expects a single connection string in `MONGODB_URI` (no local MongoDB fallback)

## Setup

1. Copy the environment template to `.env.local`, then edit `.env.local` and set variables appropriately (at minimum `MONGODB_URI`, `NEXT_PUBLIC_APP_URL`, matching `BETTER_AUTH_URL` / `NEXT_PUBLIC_BETTER_AUTH_URL`, and `BETTER_AUTH_SECRET`; database name must appear in the URI path):

   ```bash
   cp .env.example .env.local
   ```

2. Install dependencies:

   ```bash
   npm ci
   ```

3. **Provision the database** (once per Atlas database / environment — creates collections, `$jsonSchema` validators, and indexes):

   ```bash
   npm run db:init
   ```

4. **Load Bank of England USD/GBP spot rates** (after `db:init`; required for sterling conversion of imported USD vest rows at calculation time):

   ```bash
   npm run fetch:fx-rates
   ```

## Database provisioning

| Command | Purpose |
|--------|---------|
| `npm run db:init` | Idempotent setup: managed collections (including `portfolio_calculation_prefs`), validators, indexes. **Run before** first app use on a new database. |
| `npm run fetch:fx-rates` | Downloads BoE XUDLUSS series and upserts into the `fx_rates` collection. **Run after** `db:init`; safe to re-run to refresh rates. |
| `npm run db:teardown` | Drops managed collections (development reset). **Requires** `ALLOW_DB_TEARDOWN=1` (see `.env.example`). |

**Teardown example** (destructive; use only on a database you intend to wipe):

```bash
ALLOW_DB_TEARDOWN=1 npm run db:teardown
```

After teardown, the app will not start until you run **`npm run db:init`** again.

The application **`getMongoClient()`** does not create collections at runtime; it checks that provisioned collections exist and fails with a clear error if you skipped `db:init`.

**Suggested order for a new environment:** `db:init` → `fetch:fx-rates` → `npm run dev` (then sign up via the app; email uses `AUTH_EMAIL_PROVIDER=noop` by default — check logs for verification links in development).

For Docker/Kubernetes, run **`db:init`** and **`fetch:fx-rates`** against the target database (e.g. init container or CI job) before serving traffic, in addition to configuring `MONGODB_URI` at runtime.

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Health check: [http://localhost:3000/api/health](http://localhost:3000/api/health) (`db` is `connected` when Atlas is reachable and the database is provisioned).

## Quality gate

```bash
npm run validate
```

Runs `build`, `lint`, `npm test`, and `npm run test:integration`. **Build** loads the same env as Next.js (`/.env.local`); set `MONGODB_URI` plus Better Auth variables (`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_BETTER_AUTH_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`) so config validation passes. For CI without secrets, pass placeholders for the build step only, for example:

```bash
MONGODB_URI='mongodb://127.0.0.1:27017/ci-build' \
NEXT_PUBLIC_APP_URL='http://localhost:3000' \
NEXT_PUBLIC_BETTER_AUTH_URL='http://localhost:3000/api/auth' \
BETTER_AUTH_URL='http://localhost:3000/api/auth' \
BETTER_AUTH_SECRET='0123456789abcdef0123456789abcdef' \
npm run build
```

Integration tests need a **reachable** Atlas URI and will run `db:init` logic in setup when needed.

## Tests

- **Unit** tests live under `src/test/unit/` and run with `npm test`.
- **Integration** tests under `src/test/integration/` run with `npm run test:integration` (included in **`npm run validate`**). They need a **reachable** MongoDB at `MONGODB_URI`. Jest loads `.env.local` and `.env` first (see `src/test/jest-setup.ts`); if `MONGODB_URI` is still unset, a localhost placeholder is applied so config validation can load — use a real Atlas URI in `.env.local` (or export `MONGODB_URI` in CI). Each integration suite calls `ensureTestDatabase()` in `beforeAll` to apply the same provisioning as `npm run db:init`.

## Docker

Build (uses a dummy `MONGODB_URI` only for the Next.js compile step; override at runtime):

```bash
docker build -f docker/Dockerfile -t shares-gains-uk-tax-calculator:latest .
```

Run with your Atlas URI (run **`db:init`** and **`fetch:fx-rates`** against that database before traffic, e.g. from a CI job or an init container):

```bash
docker run --rm -p 3000:3000 -e MONGODB_URI='mongodb+srv://...' shares-gains-uk-tax-calculator:latest
```

## Kubernetes

Example manifests are in `k8s/`. Replace the placeholder secret with your connection string (or wire an external secret operator), then apply:

```bash
kubectl apply -f k8s/
```

Ensure the target Atlas database has been provisioned with **`npm run db:init`** and **`npm run fetch:fx-rates`** (or equivalent automation) for that environment.

## Security and operations

- **Secrets:** supply `MONGODB_URI` only via environment or Kubernetes secrets — never commit real URIs. The app logs through `src/shared/app-logger.ts`; do not add `console.log` of connection strings or user financial payloads.
- **Data:** portfolio and transaction data live in MongoDB Atlas; treat backups and access control as part of your deployment policy.
- **Container:** the production image runs as a non-root user (`nextjs`, UID 1001). Kubernetes manifests include resource requests/limits and a restrictive container `securityContext`.

## Documentation

- Product: `docs/PRD.md`
- Delivery plan: `docs/IMPLEMENTATION_PLAN.md`
