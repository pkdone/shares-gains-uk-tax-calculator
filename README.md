**WARNING: This application does not provide professional tax advice and could be wrong.**

# Shares Gains UK Tax Calculator

UK capital gains workflow for taxpayers with US employer equity compensation (especially RSUs and related share disposals). Imports include **E\*TRADE** / Morgan Stanley at Work–style sources; the product is not limited to one broker. The app **calculates capital gains and losses for each holding (stock ticker)** you import, grouped by UK tax year. It does **not** calculate your overall annual CGT liability: other disposals, brought-forward losses, reliefs, and your rate band—which this application does not track—can change what you owe in total.

## Table of contents

- [Quick start](#quick-start)
- [Prerequisites](#prerequisites)
- [Environment variables](#environment-variables)
- [MongoDB Atlas (first-time)](#mongodb-atlas-first-time)
- [Database and FX scripts](#database-and-fx-scripts)
- [Development](#development)
- [Quality gate and tests](#quality-gate-and-tests)
- [Project layout](#project-layout)
- [Documentation](#documentation)
- [Docker](#docker)
- [Security and operations](#security-and-operations)
- [Contributing](#contributing)

## Quick start

1. Clone the repository and install dependencies:

   ```bash
   git clone <repository-url>
   cd shares-gains-uk-tax-calculator
   npm ci
   ```

2. Copy the environment template and fill in values (see [Environment variables](#environment-variables) and [MongoDB Atlas (first-time)](#mongodb-atlas-first-time)):

   ```bash
   cp .env.example .env.local
   ```

3. Provision the database (once per Atlas database / environment):

   ```bash
   npm run db:init
   ```

4. Load Bank of England USD/GBP spot rates (required for sterling conversion of imported USD rows at calculation time):

   ```bash
   npm run fetch:fx-rates
   ```

5. Start the app:

   ```bash
   npm run dev
   ```

6. Open a browser to the origin you set in `NEXT_PUBLIC_APP_URL` (see [.env.example](.env.example)), then visit **`/api/health`** on that origin (`db` should be `connected`), then sign up (see [Sign up and email verification (development)](#sign-up-and-email-verification-development)).

**Suggested order for any new environment:** configure `.env.local` → `db:init` → `fetch:fx-rates` → `npm run dev`.

## Prerequisites

- **Node.js** >= 22.21.1 (see `engines` in [package.json](package.json); use [nvm](https://github.com/nvm-sh/nvm) or your version manager if helpful)
- **npm** (ships with Node)
- **MongoDB Atlas** — the app expects a single connection string in `MONGODB_URI`. There is **no** local MongoDB fallback.

## Environment variables

Copy [.env.example](.env.example) to `.env.local` for local development. The app validates configuration at startup ([`src/shared/config/env.ts`](src/shared/config/env.ts)).

| Variable | Purpose |
|----------|---------|
| `NODE_ENV` | `development`, `production`, or `test` (default `development`). |
| `MONGODB_URI` | Atlas connection string; **database name must appear in the URI path** (e.g. `.../mydb?...`). |
| `NEXT_PUBLIC_APP_URL` | Public site origin **without** trailing slash; must match where the app is served (see [.env.example](.env.example)). |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | Better Auth API base URL for the browser; **must be identical** to `BETTER_AUTH_URL` and include `/api/auth`. |
| `BETTER_AUTH_URL` | Same value as `NEXT_PUBLIC_BETTER_AUTH_URL` (full URL including `/api/auth`). |
| `BETTER_AUTH_SECRET` | Session signing secret; **at least 32 characters** (e.g. `openssl rand -base64 32`). |
| `AUTH_EMAIL_PROVIDER` | `noop` (default) logs auth links via the app logger; `smtp` is reserved for a future provider. |
| `ALLOW_DB_TEARDOWN` | Set to `1` **only** when running `npm run db:teardown` (destructive). Required by that script; it is **not** read by the app at startup. Do not set in production. |

## MongoDB Atlas (first-time)

1. Create a cluster (or use an existing one) in [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Create a **database user** with read/write access to your app database.
3. Under **Network Access**, allow your current IP (development) or your deployment’s egress (production). Connection failures are often due to missing network access rules.
4. Build a connection string that includes the **database name in the path** and paste it into `MONGODB_URI` in `.env.local`.
5. Use Atlas “Connect” / “Test connection” to confirm credentials before running `npm run db:init`.

## Database and FX scripts

| Command | Purpose |
|---------|---------|
| `npm run db:init` | Idempotent setup: managed collections, `$jsonSchema` validators, indexes. **Run before** first app use on a new database. |
| `npm run fetch:fx-rates` | Downloads BoE XUDLUSS series and upserts into the `fx_rates` collection. **Run after** `db:init`; safe to re-run to refresh rates. |
| `npm run db:teardown` | Drops managed app collections **and** Better Auth collections (`user`, `session`, `account`, `verification`, optional `rateLimit`). **Requires** `ALLOW_DB_TEARDOWN=1` (see `.env.example`). |
| `npm run db:refresh` | Destructive dev reset: `db:teardown` → `db:init` → `fetch:fx-rates` (uses `ALLOW_DB_TEARDOWN=1` internally). |

**Teardown example** (destructive; use only on a database you intend to wipe):

```bash
ALLOW_DB_TEARDOWN=1 npm run db:teardown
```

After teardown, the app will not start until you run **`npm run db:init`** again.

The application **`getMongoClient()`** does not create collections at runtime; it checks that provisioned collections exist and fails with a clear error if you skipped `db:init`.

For container or hosted deployments, run **`db:init`** and **`fetch:fx-rates`** against the target database (e.g. CI job or init container) before serving traffic, in addition to configuring `MONGODB_URI` at runtime.

## Development

```bash
npm run dev
```

Useful paths (under the origin from `NEXT_PUBLIC_APP_URL`; default dev port is **3000**):

| Path | Notes |
|------|-------|
| `/` | Home |
| `/sign-up` | Register |
| `/sign-in` | Sign in |
| `/holdings` | Holdings (requires verified email) |
| `/api/health` | Health check (`db` is `connected` when Atlas is reachable and the database is provisioned) |

### Sign up and email verification (development)

By default **`AUTH_EMAIL_PROVIDER=noop`**: no real email is sent. Verification and password-reset links are still generated; the app logs them through [`src/shared/app-logger.ts`](src/shared/app-logger.ts) (`logInfo` / `logWarn`).

1. Keep the **terminal where `npm run dev` is running** visible. The URL is **not** on the `POST /api/auth/sign-up/email` line — look for a **`[dev] NOOP EMAIL`** line (warn-level output from `logWarn`, easy to spot) or `Auth email (noop) full text:` if no URL was extracted.
2. Complete **Sign up** in the browser with a **new email**, or use **Resend verification** on `/verify-email` if you already registered. If you re-use an email that already exists and the account is still unverified, the app **resends** the verification link (Better Auth’s duplicate-email path).
3. **Paste the URL** into the address bar if needed, complete verification, then continue.
4. Use **Sign in** with the same email and password. Holding routes require a verified email.

Password reset flows work the same way in noop mode: copy the reset URL from the server log.

For production, configure a real transactional email provider and set `AUTH_EMAIL_PROVIDER` (and any provider-specific env vars) once implemented — do not rely on noop for real users.

## Quality gate and tests

```bash
npm run validate
```

Runs `build`, `lint`, `npm test`, and `npm run test:integration`. **`npm run validate`** runs the full suite including integration tests, so it needs the same **real** `MONGODB_URI` as `npm run test:integration` (see **Tests** below). **`npm run build`** alone loads the same env files as Next.js (`.env.local`, then `.env` at the project root); set `MONGODB_URI` plus Better Auth variables so config validation passes. For CI without secrets, pass placeholders for the build step only, for example:

```bash
MONGODB_URI='mongodb://127.0.0.1:27017/ci-build' \
NEXT_PUBLIC_APP_URL='https://ci-build.example' \
NEXT_PUBLIC_BETTER_AUTH_URL='https://ci-build.example/api/auth' \
BETTER_AUTH_URL='https://ci-build.example/api/auth' \
BETTER_AUTH_SECRET='0123456789abcdef0123456789abcdef' \
npm run build
```

After a successful `npm run build`, you can smoke-test production mode locally:

```bash
npm run start
```

**Tests**

- **Unit** tests live under `src/test/unit/` and run with `npm test`.
- **Integration** tests under `src/test/integration/` run with `npm run test:integration` (included in **`npm run validate`**). They require a **reachable** MongoDB at a **real** `MONGODB_URI` in `.env.local` (or exported in CI). Jest sets `mongodb://127.0.0.1:27017/jest-fallback` only when `MONGODB_URI` is unset so config validation can load — that URI is **not** sufficient for integration tests (and `db:*` scripts refuse it). Each integration suite calls `ensureTestDatabase()` in `beforeAll` to apply the same provisioning as `npm run db:init`.

## Project layout

| Path | Role |
|------|------|
| `src/app/` | Next.js App Router: UI, layouts, and route handlers (e.g. `/api/auth`, `/api/health`). |
| `src/domain/` | Domain model, canonical Zod schemas, repository **interfaces**. See [src/domain/README.md](src/domain/README.md). |
| `src/application/` | Use cases and orchestration. See [src/application/README.md](src/application/README.md). |
| `src/infrastructure/` | Repositories, MongoDB, Better Auth adapter, imports. See [src/infrastructure/README.md](src/infrastructure/README.md). |
| `src/shared/` | Config, errors, logging. See [src/shared/README.md](src/shared/README.md). |
| `scripts/` | `db:init`, `db:teardown`, `fetch:fx-rates`. |

Layering is described in [docs/adrs/001-folder-structure-and-ddd-layering.md](docs/adrs/001-folder-structure-and-ddd-layering.md). Cursor / AI context for engineers: [`.cursor/rules/project.mdc`](.cursor/rules/project.mdc).

## Documentation

- Product specification: [docs/PRD.md](docs/PRD.md)
- Delivery plan: [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md)
- Architecture decision records: [docs/adrs/](docs/adrs/) — start with [ADR-001 (layering)](docs/adrs/001-folder-structure-and-ddd-layering.md), [ADR-002 (environment and configuration)](docs/adrs/002-environment-and-configuration-loading.md), [ADR-007 (Better Auth)](docs/adrs/007-authentication-better-auth.md)

## Docker

The image uses Next.js **standalone** output ([`next.config.ts`](next.config.ts)). Build uses a dummy `MONGODB_URI` for the compile step; override at **runtime** with `-e MONGODB_URI=...`.

The Dockerfile uses a **build-time placeholder** for `BETTER_AUTH_SECRET` so the secret is not passed as a Docker build argument (which can leak into image history). **Override with the real secret at runtime:**

```bash
docker run --rm -p 3000:3000 \
  -e MONGODB_URI='mongodb+srv://...' \
  -e BETTER_AUTH_SECRET='your-at-least-32-character-secret-here' \
  shares-gains-uk-tax-calculator:latest
```

`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_BETTER_AUTH_URL`, and `BETTER_AUTH_URL` are **baked into the client bundle at build time** (Dockerfile defaults use `http://127.0.0.1:3000`). If the app is served at a different origin (e.g. `https://app.example.com`), rebuild with matching `--build-arg` values so Better Auth and client-side URLs stay correct:

```bash
docker build -f docker/Dockerfile \
  --build-arg NEXT_PUBLIC_APP_URL='https://app.example.com' \
  --build-arg NEXT_PUBLIC_BETTER_AUTH_URL='https://app.example.com/api/auth' \
  --build-arg BETTER_AUTH_URL='https://app.example.com/api/auth' \
  -t shares-gains-uk-tax-calculator:latest .
```

Run **`db:init`** and **`fetch:fx-rates`** against that database before traffic (e.g. from a CI job or an init container). **`MONGODB_URI` is not baked into the image** — pass it at runtime. If the container is served at an origin other than the build-time defaults (`http://127.0.0.1:3000`), pass matching `-e` values for `NEXT_PUBLIC_*` / `BETTER_AUTH_URL` only if you did not bake the correct origins at build time (or rebuild with `--build-arg` as above).

## Security and operations

- **Secrets:** supply `MONGODB_URI` only via environment (or your platform’s secret store) — never commit real URIs. Do not commit `.env.local`.
- **Logging:** the app logs through `src/shared/app-logger.ts`; do not log connection strings or user financial payloads.
- **Data:** holding and transaction data live in MongoDB Atlas; treat backups and access control as part of your deployment policy.
- **Container:** the production image runs as a non-root user (`nextjs`, UID 1001).

## Contributing

1. Create a branch from `main` (for example `docs/readme-developer-onboarding` or `feature/your-change`).
2. Make changes; run **`npm run validate`** before opening a PR.
3. Push and open a pull request against `main`:

   ```bash
   git push -u origin your-branch-name
   ```

   On GitHub you can use the compare URL or the CLI, for example:

   ```bash
   gh pr create --base main --head your-branch-name
   ```

Use clear, imperative commit messages (e.g. `docs: expand README for developer onboarding`).
