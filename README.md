**WARNING: This application does not provide professional tax advice and could be wrong.**

# Shares Gains UK Tax Calculator

UK capital gains planning for equity compensation (e.g. RSUs from a US employer). This repository is under active development.

## Prerequisites

- **Node.js** >= 22.21.1
- **MongoDB Atlas** — the app expects a single connection string in `MONGODB_URI` (no local MongoDB fallback)

## Setup

1. Copy environment template and set your Atlas URI (database name must appear in the URI path):

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and replace `MONGODB_URI` with your cluster connection string.

2. Install dependencies:

   ```bash
   npm ci
   ```

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Health check: [http://localhost:3000/api/health](http://localhost:3000/api/health) (`db` is `connected` when Atlas is reachable).

## Quality gate

```bash
npm run validate
```

Runs `build`, `lint`, and `test`. **Build** loads the same env as Next.js (`/.env.local`); ensure `MONGODB_URI` is set so server modules that validate config can compile. For CI without secrets, pass a non-empty placeholder URI for the build step only, for example:

```bash
MONGODB_URI='mongodb://127.0.0.1:27017/ci-build' npm run build
```

## Tests

- **Unit** tests live under `src/test/unit/`.
- **Integration** tests under `src/test/integration/` run with `npm run test:integration` (and as part of `npm run validate`). They need a **reachable** MongoDB at `MONGODB_URI`. Jest loads `.env.local` and `.env` first (see `src/test/jest-setup.ts`); if `MONGODB_URI` is still unset, a localhost placeholder is applied so config validation can load — use a real Atlas URI in `.env.local` (or export `MONGODB_URI` in CI) so the Mongo integration test can connect and pass.

## Seed script (stub user)

Proves read/write against Atlas using a minimal `users` document:

```bash
npm run seed:user
```

Requires `MONGODB_URI` in `.env` or `.env.local` (not the Jest fallback).

## Docker

Build (uses a dummy `MONGODB_URI` only for the Next.js compile step; override at runtime):

```bash
docker build -f docker/Dockerfile -t shares-gains-uk-tax-calculator:latest .
```

Run with your Atlas URI:

```bash
docker run --rm -p 3000:3000 -e MONGODB_URI='mongodb+srv://...' shares-gains-uk-tax-calculator:latest
```

## Kubernetes

Example manifests are in `k8s/`. Replace the placeholder secret with your connection string (or wire an external secret operator), then apply:

```bash
kubectl apply -f k8s/
```

## Documentation

- Product: `docs/PRD.md`
- Delivery plan: `docs/IMPLEMENTATION_PLAN.md`
