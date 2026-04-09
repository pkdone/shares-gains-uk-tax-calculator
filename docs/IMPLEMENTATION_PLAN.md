# Implementation Plan - Shares Gains UK Tax Calculator

**Status:** Draft — post-interview refinement
**Prepared by:** Paul Done
**Last updated:** 2026-04-06

---

## 1. Purpose

This document is the working implementation plan for Shares Gains UK Tax Calculator.

Its purpose is to turn the PRD and project rules into a staged engineering plan before coding begins. It should be updated during planning and delivery.

This is not the final product specification.
It is the execution plan for how the codebase will be created and evolved.

---

## 2. Inputs

This plan should be based on:

- `docs/PRD.md`
- `.cursor/rules/project.mdc`
- the current repository state
- stakeholder answers to unresolved product questions (see Section 3)
- any future ADRs or architecture notes
- **`docs/HS284_Example_3_2024.pdf`** — HMRC HS284 Example 3 (2024 artefact in repo); worked example for pool formation, partial disposals, and roll-forward alignment referenced in `docs/PRD.md` **Appendix 4** and **Appendix 5**
- **`docs/references/hs284-example-3-2024-notes.md`** — text companion to the PDF; use for milestones below and to record transcribed figures from the PDF

### 2.1 When to consult HS284 Example 3 materials

- **Milestone 4 — Calculation engine foundation:** Before and while defining calculation services and unit tests for **Section 104 pooling** and **partial disposal** logic, consult **`docs/HS284_Example_3_2024.pdf`** and **`docs/references/hs284-example-3-2024-notes.md`**. Align test cases and explanations with Example 3 where `docs/PRD.md` requires it (see PRD **Appendix 4**).
- **Any milestone** that claims satisfaction of PRD **Appendix 4** validation points involving HS284 Example 3: re-check the PDF (and update the notes file if you transcribe key figures for regression checks).
- **Precedence:** `docs/PRD.md` overrides the PDF if they conflict; document deliberate differences in an ADR or PRD change note (per PRD **Appendix 5**).

### 2.2 Sample data files (reference only, not committed)

The following real-world export files inform the import pipeline design. They are **not** committed to the repository (add to `.gitignore`).

| File | Source | Content |
|------|--------|---------|
| `ByBenefitType_expanded.xlsx` | Morgan Stanley at Work / E\*Trade Equity Edge Online "By Benefit Type" report | RSU grant, vest schedule, tax withholding, and sellable-shares data. Hierarchical: Grant → Vest Schedule → Tax Withholding rows. 697 rows, 63 columns, single sheet "Restricted Stock". All MDB. |
| `E_TRADE - Stock Plan Orders.pdf` | Morgan Stanley at Work / E\*Trade **Stock Plan Orders** PDF export (filtered, e.g. executed Sell Restricted Stock) | Per order block: **Order Summary** (qty, order type), **Disbursement Details** (**Est. Gross Proceeds**, Commission, SEC Fees, Brokerage Assist Fee), **Order History** (**Order Executed** with date/time). The app imports these into **disposals** as USD gross proceeds and combined fees (see `docs/adrs/006-etrade-stock-plan-orders-pdf-disposal-import.md`). |

**Key data observations:**

- The XLSX provides acquisition data (vest events with dates, quantities, tax withholding details) but not post-vest **sale** prices for shares sold outside the vesting grid (vest economics use Taxable Gain / vested qty as in M3).
- The Stock Plan Orders PDF provides **USD gross proceeds and fee breakdown** plus an **execution timestamp** for each imported disposal row; disposal **date** in the ledger is derived from the execution date (import pipeline).
- For E\*Trade RSU workflows, **By Benefit Type XLSX** (acquisitions) plus **Stock Plan Orders PDF** (plan disposals) can cover the main import paths. Sales not present in that PDF, or lots requiring verification from another source, may still be entered manually or supplemented from trade confirmations / a **Gains & Losses** report.
- The XLSX uses mixed date formats: `DD-MMM-YYYY` for grant/release dates, `MM/DD/YYYY` for vest dates.
- The XLSX is sparse — each record type uses a different subset of the 63 columns.
- Some PDF orders show `0` exercised qty or `--`, indicating cancelled or unfilled orders.
- "Shares Traded for Taxes" at vest are **not** treated as disposals; only net shares received are tracked as acquisitions (stakeholder decision).

---

## 3. Agreed Decisions

### 3.0 Product purpose (2026-03-31)

- **What the app does:** **Capital gains and losses (and chargeable gains mechanics) per holding** for imported ledger data — Section 104 pool, same-day and 30-day matching, sterling conversion for `import_usd` rows, per–tax-year gain/loss totals **for that symbol**.
- **What it does not do:** **Overall personal CGT liability** for a tax year. Final liability may differ with other disposals, brought-forward losses, reliefs, or rate position.
- **Brought-forward losses** and **CGT rate tier** are **not** inputs in the shipped app (not needed for holding-level mechanics; would only matter for a future **“tax owed”** estimate).
- **Reporting obligation** UX is **not implemented**; users must **not infer** reporting obligation from a single holding (see PRD §1, Appendix 1).

### 3.1 Tooling (confirmed in Milestone 0)

- [x] Package manager: `npm`
- [x] Routing approach: Next.js **App Router**
- [x] Testing framework: `Jest`
- [x] Linting: `ESLint` with Next.js + TypeScript configuration plus strict project rules
- [x] Validation command: `npm run validate`

### 3.2 Product decisions (stakeholder interview, 2026-03-28)

- [x] **Multi-user application.** Data model includes `userId` on every document from day one. **Authentication** is implemented with **Better Auth** (MongoDB adapter, cookie sessions, email/password; see ADR-007). Historical Milestones 1–2 used a **stub user** (`STUB_USER_ID` + `seed:users`); that path has been **removed** — tenant `userId` is the signed-in Better Auth user id.
- [x] **Top-level domain object: Holding.** A holding is **one stock symbol** per user (uppercase ticker). It is the primary organising entity for that line of stock. It belongs to a user and can span multiple tax years. Tax-year views are derived from holding data, not separate top-level entities.
- [x] **CGT rate tier (historical):** Previously planned as user-selectable in the calculation UI. **Superseded (2026-03-31):** the holding **calculation** and **computation pack** do **not** show a tier control or compute CGT tax due; `cgt-config` / `RateTier` remain for tests and any future tax feature. See §8.1 in PRD and ADR-006 amendment.
- [x] **Sell-to-cover at vest: not modelled as disposals.** When RSUs vest and shares are sold to cover PAYE/NI, only the net shares received are tracked as acquisitions. The withheld shares are treated as never received.
- [x] **Import formats:** E\*Trade **By Benefit Type** XLSX for **vesting acquisitions**; **Stock Plan Orders** PDF for **executed Sell Restricted Stock disposals** (USD gross proceeds and fees, fingerprint idempotency — see ADR-006 PDF disposal import). Other disposals or brokers may still use **manual entry** or future sources (e.g. trade confirmations, **Gains & Losses** export).
- [x] **FX rates: on-demand download script.** Provide a script to fetch Bank of England daily USD/GBP spot rates (XUDLUSS series) and seed them into MongoDB. Run once to initialise; re-run to update.
- [x] **MongoDB Atlas required for all environments.** No local MongoDB fallback. The `MONGODB_URI` env var points to Atlas in dev, Docker, and other deployed environments. The developer provides their own Atlas connection string.
- [x] **Deployment beyond Docker:** orchestration-specific manifests (e.g. Kubernetes) are **not** maintained in this repository; the same app image and env model apply wherever the container runs (see ADR-002 amendment, 2026-03-31).
- [x] **No tax filing or submission — ever.** This is a permanent product boundary, not a deferred feature. The app produces computation packs and summaries for the user's own records. SA108 field alignment is for reference only.
- [x] **Milestone 2 scope: manual data entry slice** (not import). A small "add acquisition + add disposal + view ledger" flow to prove the full stack before introducing CSV/XLSX parsing complexity.
- [x] **Calculation engine (Milestone 4): Section 104 pool first, GBP-only.** Reproduce HS284 Example 3 as primary acceptance test. Same-day and 30-day matching rules layered on afterward. FX conversion added after pool mechanics are solid.

### 3.3 Milestone 1 planning refinement (2026-03-28)

- [x] **Bootstrap approach: manual setup.** No `create-next-app`. Manually initialise `package.json`, install dependencies explicitly, and create all files from scratch for full control.
- [x] **ESLint: flat config (`eslint.config.mjs`).** ESLint 9 flat config format with `typescript-eslint` type-checked mode. Dev dependencies: `eslint`, `typescript-eslint`, `@next/eslint-plugin-next`, `eslint-plugin-react`, `eslint-plugin-react-hooks`.
- [x] **Tailwind CSS v4: CSS-based config.** No `tailwind.config.ts`; Tailwind v4 uses `@import "tailwindcss"` and `@theme` in `globals.css`. `postcss.config.mjs` is the only config file.
- [x] **Stub user seed: minimal script (historical M1).** Delivered as `scripts/seed-users.ts` for MongoDB write/read proof; **removed** once Better Auth shipped — users are created via sign-up instead.
- [x] **Schema registry and base repository: deferred to M2.** The Zod → JSON Schema → MongoDB `$jsonSchema` pipeline and abstract repository pattern have no real consumers in M1. They move to M2 where Holding and share event schemas are the first consumers.
- [x] **ADR-003 and ADR-004: deferred to M2.** M1 implementations (AppError, MongoDB client) are simple enough without formal ADRs. Write them when M2 demands structured patterns.
- [x] **`@typescript-eslint/promise-function-async`: strict (`"error"`).** Per the project rule: "The ESLint configuration is the source of truth." Tune with rule options later if specific patterns need exemption.

### 3.4 Stakeholder refinements (2026-03-28)

- [x] **One symbol per holding:** Each holding is a single ticker; Section 104 pooling applies **per symbol** for that holding (superseded 2026-03-31: previously “multiple tickers per portfolio”).
- [x] **Authentication provider:** **Better Auth** embedded in the Next.js app, MongoDB-backed sessions, email/password with required verification — documented in **ADR-007** (`docs/adrs/007-authentication-better-auth.md`).
- [x] **Brought-forward losses:** Domain tests historically exercised BF/AEA rules. **Superseded (2026-03-31):** no user-facing brought-forward field — losses are not holding-scoped; see PRD §8.1. `computeAnnualSummaries` in production path aggregates per–tax-year gains/losses/net for the holding’s disposals only.

### 3.5 Authentication delivery (2026-03-31)

- [x] **Better Auth** integrated: App Router `/api/auth/[...all]`, `@better-auth/mongo-adapter` sharing `MONGODB_URI`, cookie sessions (`nextCookies` plugin).
- [x] **Email/password** with **required email verification** before holding routes; password reset and verification email scaffolding (`AUTH_EMAIL_PROVIDER=noop` default — log-based until a real provider is wired).
- [x] **Stub user removed:** no `STUB_USER_ID`, no `scripts/seed-users.ts`; `userId` on tenant documents = Better Auth `user.id`. Domain `app_users` collection upserted on sign-up for consistency with existing provisioning.
- [x] **ADR-007** written: `docs/adrs/007-authentication-better-auth.md`.

---

## 4. Delivery Strategy

### 4.1 Principles

- plan before coding
- implement in milestones
- prefer vertical slices
- keep product assumptions explicit
- keep architecture simple and extensible
- verify every milestone with build, lint, and tests
- avoid speculative overbuilding

### 4.2 Definition of done

A milestone is done when:
- the scoped functionality is implemented
- the code structure is consistent with project rules
- `npm run validate` passes
- key assumptions are documented
- follow-up work is clearly listed

### 4.3 Milestone completion (record-keeping)

For each milestone in Section 7:

1. When a **task** is finished, change its `- [ ]` checkbox to `- [x]` in that milestone’s **Tasks** list.
2. When **all** tasks and **Exit criteria** for the milestone are satisfied, set the milestone **Status** line to `Complete` and add **Completed (YYYY-MM-DD)** if helpful.
3. Optionally add **Validated:** `npm run validate` on \<date\> under that milestone so delivery is auditable without relying on git history alone.

---

## 5. Technical Architecture

### 5.1 Application shape

A single Next.js application using the App Router and providing:
- a user-facing web interface (React + Tailwind CSS)
- Next.js route handlers and/or server actions for mutations and queries
- domain services for business rules
- repository-based persistence against MongoDB Atlas
- Docker packaging

### 5.2 DDD layering

Per `project.mdc`, the codebase follows Domain-Driven Design with strict dependency direction:

| Layer | Location | Responsibility |
|-------|----------|---------------|
| **Domain** | `src/domain/` | Entities, value objects, aggregates, domain services, domain events, repository interfaces, canonical Zod schemas. No framework or DB dependencies. |
| **Application** | `src/application/` | Use cases, command/query handlers, orchestration, DTO mapping at boundaries. Not the home for core business rules. |
| **Infrastructure** | `src/infrastructure/` | Repository implementations, MongoDB driver usage, persistence schemas (derived from domain schemas), external API adapters (e.g. BoE FX client), framework glue. |
| **Interfaces** | `src/app/` | Next.js App Router pages, layouts, route handlers, React components. Transport-level validation (request schemas derived from domain schemas). |
| **Shared** | `src/shared/` | Cross-cutting technical utilities only (errors, config, logging). No domain concepts. |

**Dependency rule:** `interfaces` → `application` → `domain` ← `infrastructure`. Domain never depends outward.

### 5.3 Schema strategy (Zod)

Canonical domain schemas live in `src/domain/schemas/`. All other schemas derive from them:

- **Domain schemas** (`src/domain/schemas/`): source of truth for domain shape and invariants.
- **Persistence schemas** (`src/infrastructure/persistence/schemas/`): extend domain schemas with `_id`, timestamps, etc. Used for MongoDB `$jsonSchema` validation.
- **Request/response schemas** (`src/app/` or `src/interfaces/`): pick/omit/extend from domain schemas for HTTP payloads.

Composition via `.pick()`, `.omit()`, `.extend()` — never duplicate definitions.

### 5.4 Persistence

MongoDB Atlas via the native Node.js driver. All database access through repository implementations in `src/infrastructure/`. Repository interfaces defined in `src/domain/repositories/`.

**Schema enforcement:** Zod → JSON Schema → MongoDB `$jsonSchema` validator. One shared pipeline to sanitise Zod-derived JSON Schema for MongoDB compatibility (strip `$schema`, `format`, `pattern` where unsupported; coerce `integer` to `number`; map `const` to single-value `enum`; handle `_id` as `objectId`).

### 5.5 Testing

- `src/test/unit/` — mirrors `src/` structure. Unit tests for domain logic, parsing, transformation, validation.
- `src/test/integration/` — mirrors `src/` structure. Integration tests for repositories, API routes, persistence.
- No co-located tests next to production code.

### 5.6 Deployment

- **Local dev:** `npm run dev` against developer's Atlas instance.
- **Docker:** multi-stage build, `MONGODB_URI` via env var.
- **Other targets:** supply the same environment variables your platform uses; no Kubernetes manifests are kept in-repo (2026-03-31).

---

## 6. Repository Structure

Target structure after Milestone 1:

```text
/
├─ .cursor/
│  └─ rules/
│     └─ project.mdc
├─ docs/
│  ├─ adrs/
│  │  ├─ 001-folder-structure-and-ddd-layering.md
│  │  └─ 002-environment-and-configuration-loading.md
│  ├─ references/
│  │  └─ hs284-example-3-2024-notes.md
│  ├─ HS284_Example_3_2024.pdf
│  ├─ IMPLEMENTATION_PLAN.md
│  └─ PRD.md
├─ src/
│  ├─ app/
│  │  ├─ api/
│  │  │  └─ health/
│  │  │     └─ route.ts
│  │  ├─ globals.css
│  │  ├─ layout.tsx
│  │  └─ page.tsx
│  ├─ domain/
│  │  ├─ entities/
│  │  ├─ schemas/
│  │  ├─ services/
│  │  └─ value-objects/
│  ├─ application/
│  ├─ infrastructure/
│  │  └─ persistence/
│  │     └─ mongodb-client.ts
│  ├─ shared/
│  │  ├─ config/
│  │  │  └─ env.ts
│  │  └─ errors/
│  │     └─ app-error.ts
│  └─ test/
│     ├─ unit/
│     │  └─ shared/
│     │     └─ config/
│     │        └─ env.test.ts
│     └─ integration/
│        └─ infrastructure/
│           └─ persistence/
│              └─ mongodb-client.int.test.ts
├─ docker/
│  └─ Dockerfile
├─ public/
├─ .env.example
├─ .gitignore
├─ eslint.config.mjs
├─ jest.config.ts
├─ next.config.ts
├─ package.json
├─ postcss.config.mjs
├─ tsconfig.json
└─ README.md
```

---

## 7. Milestone Plan

### Milestone 0 — Planning and repo bootstrap

**Goal:** establish the repo, docs, project rules, and initial engineering direction.

**Status: complete.**

#### Recorded decisions

All decisions listed in Section 3.

#### Exit criteria

- [x] repo exists with git history
- [x] `docs/PRD.md` and `docs/IMPLEMENTATION_PLAN.md` exist
- [x] `.cursor/rules/project.mdc` is in place
- [x] product interview complete; key questions resolved

---

### Milestone 1 — Application foundation

**Goal:** create a production-grade application skeleton with validated configuration, MongoDB connectivity, DDD folder structure, and deployable runtime assets.

This milestone produces a running app with no business features — only infrastructure, config validation, a health endpoint, and deployment packaging.

**Status: complete.**

#### Tasks

- [x] Manually initialise `package.json` (`npm init`), install Next.js 15, React 19, TypeScript, Tailwind CSS v4, and all dev dependencies; create `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, and `src/app/` entry points from scratch
- [x] Establish DDD source directory layout (`domain/`, `application/`, `infrastructure/`, `shared/`)
- [x] Add `AppError` base class and initial error taxonomy (`src/shared/errors/`)
- [x] Add Zod-based environment validation (`src/shared/config/env.ts`): validate `MONGODB_URI`, `NODE_ENV`, and any other required env vars on startup
- [x] Add MongoDB client singleton (`src/infrastructure/persistence/mongodb-client.ts`): lazy connection, graceful shutdown, connection-health check
- [x] Add stub user seed script *(historical; script later removed — see §3.5)*: proved MongoDB write/read in early milestones
- [x] Add `GET /api/health` route handler returning `{ status: "ok", db: "connected" | "disconnected" }`
- [x] Add landing page (`src/app/page.tsx`): minimal styled page confirming the app is running
- [x] Add ESLint flat config (`eslint.config.mjs`): type-checked mode via `typescript-eslint` with `projectService: true`, `@next/eslint-plugin-next` flat config, `eslint-plugin-react`, `eslint-plugin-react-hooks`, and the full project rule set (see Section 7.1.1 below for complete config)
- [x] Add Jest configuration: TypeScript transform, path aliases, unit/integration separation
- [x] Add unit tests for environment validation (valid, missing, malformed)
- [x] Add integration test for MongoDB client (connects, health check)
- [x] Add `npm run validate` script: `build && lint && test`
- [x] Add Dockerfile (multi-stage: deps → build → runtime)
- [x] ~~Add Kubernetes manifests (`k8s/`)~~ **Superseded 2026-03-31:** manifests removed from the repo; deployment target beyond Docker is not fixed here.
- [x] Add `.env.example` with documented variables
- [x] Update `README.md` with setup and run instructions
- [x] Update `.gitignore` (exclude sample data files, `.env`, node_modules, `.next`)

#### Likely files to create or modify

| File | Action |
|------|--------|
| `package.json` | create (manual `npm init`, then install deps and add scripts) |
| `tsconfig.json` | create |
| `next.config.ts` | create |
| `eslint.config.mjs` | create with type-checked flat config and full project rule set |
| `jest.config.js` | create |
| `postcss.config.mjs` | create (Tailwind CSS v4 PostCSS integration) |
| `src/app/layout.tsx` | create |
| `src/app/page.tsx` | create |
| `src/app/globals.css` | create (Tailwind v4: `@import "tailwindcss"`) |
| `src/app/api/health/route.ts` | create |
| `src/shared/config/env.ts` | create |
| `src/shared/errors/app-error.ts` | create |
| `src/infrastructure/persistence/mongodb-client.ts` | create |
| `scripts/seed-users.ts` | create *(historical; removed after auth — see §3.5)* |
| `src/test/unit/shared/config/env.test.ts` | create |
| `src/test/integration/infrastructure/persistence/mongodb-client.int.test.ts` | create |
| `docker/Dockerfile` | create |
| `.env.example` | create |
| `.gitignore` | modify |
| `README.md` | modify |
| `src/instrumentation.ts` | create (graceful MongoDB disconnect on `SIGINT`/`SIGTERM`) |

#### 7.1.1 ESLint configuration (`eslint.config.mjs`)

**Dev dependencies:** `eslint` (v9+), `typescript-eslint`, `@next/eslint-plugin-next`, `eslint-plugin-react`, `eslint-plugin-react-hooks`

**Base:** `tseslint.configs.recommendedTypeChecked` with `projectService: true` for type-checked linting.

**Rules requiring type information:** `prefer-regexp-exec`, `prefer-readonly`, `promise-function-async`, `require-array-sort-compare`, `switch-exhaustiveness-check`, `restrict-template-expressions`.

**Extension rule:** `@typescript-eslint/default-param-last` extends base `default-param-last` — the base rule must be explicitly disabled.

**Implemented repo note:** the live config uses `@eslint/eslintrc` **FlatCompat** with `extends('next/core-web-vitals', 'next/typescript')` so Next.js build-time ESLint detection recognises the preset, plus `typescript-eslint` type-checked rules and project-specific overrides. See `eslint.config.mjs` (default import + destructure from `@next/eslint-plugin-next` for CJS interop). The snippet below is the original target shape; filenames and Next flat export names may differ slightly from the installed plugin.

Target config structure:

```mjs
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import nextPlugin from '@next/eslint-plugin-next';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

const tsconfigRootDir = dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  { ignores: ['.next/', 'node_modules/'] },

  ...tseslint.configs.recommendedTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir,
      },
    },
  },

  // Next.js flat config (core-web-vitals includes recommended)
  // Verify exact export name against installed @next/eslint-plugin-next version
  nextPlugin.flatConfigs['core-web-vitals'],

  // React
  {
    plugins: { react: reactPlugin, 'react-hooks': reactHooksPlugin },
    settings: { react: { version: 'detect' } },
    rules: {
      'react/no-array-index-key': 'error',
      'react/jsx-key': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // Project-specific rules
  {
    rules: {
      'no-lonely-if': 'error',
      'default-param-last': 'off',
      '@typescript-eslint/default-param-last': 'error',
      '@typescript-eslint/prefer-regexp-exec': 'error',
      '@typescript-eslint/explicit-member-accessibility': [
        'error', { accessibility: 'no-public' },
      ],
      '@typescript-eslint/member-ordering': 'error',
      '@typescript-eslint/no-empty-object-type': [
        'error', { allowInterfaces: 'with-single-extends' },
      ],
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/promise-function-async': 'error',
      '@typescript-eslint/require-array-sort-compare': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/restrict-template-expressions': ['error', {
        allowNumber: true,
        allowBoolean: true,
        allowArray: false,
        allowNullish: false,
        allowRegExp: false,
      }],
      'no-console': 'error',
      'no-nested-ternary': 'error',
      'no-negated-condition': 'warn',
      'prefer-regex-literals': 'error',
    },
  },
);
```

#### Exit criteria

- [x] `npm run dev` starts the app; landing page renders; `/api/health` returns `200`
- [x] environment validation rejects missing or malformed `MONGODB_URI`
- [x] MongoDB client connects to Atlas and reports healthy
- [x] stub user seed script ran successfully in early delivery *(superseded: auth + sign-up — see §3.5)*
- [x] `npm run validate` passes (build + lint + test)
- [x] `docker build` succeeds
- [x] DDD folder structure is established with placeholder READMEs or index files where helpful

---

### Milestone 2 — First thin vertical slice (manual ledger)

**Status:** Complete  
**Completed:** 2026-03-28  
**Validated:** `npm run validate` on 2026-03-28

**Goal:** prove the architecture with a manual "add acquisition → add disposal → view ledger" flow. No import parsing; data entered via forms.

This milestone is **GBP-only** and has **no calculation logic** — it proves the stack end-to-end.

#### Stakeholder decisions (2026-03-28)

- **Tenant identity (historical note):** M2 was delivered with **`STUB_USER_ID`** + **`seed:users`** for all tenant-scoped documents. **Superseded (2026-03-31):** **Better Auth** user id as `userId`; stub env and seed script **removed** (ADR-007).
- **Manual events:** store **gross/price components and fees in separate fields**; derive net amounts for display; Milestone 4 calculation consumes the same explicit fields.
- **Ledger tax-year grouping:** events use **UTC date-only** calendar dates (no time-of-day); group into **UK tax years** (6 April–5 April), consistent with PRD Appendix 3.
- **Symbol:** single **free-text ticker** per event for this milestone; ISIN may be added later if imports require it.

#### Tasks

**ADRs**

- [x] **ADR-003:** Repository abstraction design (`docs/adrs/`)
- [x] **ADR-004:** Error taxonomy (`docs/adrs/`)

**Persistence**

- [x] Zod → JSON Schema sanitisation pipeline and lazy **schema registry** for MongoDB `$jsonSchema` (e.g. `src/infrastructure/persistence/schema-registry.ts` or equivalent)
- [x] Apply validators on **new** collections (`createCollection` / `collMod` per project rules)

**Domain**

- [x] Canonical Zod schemas: **holding**, **share holding events** (acquisition vs disposal) in `src/domain/schemas/`
- [x] Repository **interfaces** in `src/domain/repositories/`

**Infrastructure**

- [x] Persistence record schemas (extend domain with `_id`, timestamps, `userId`); derive MongoDB validators from Zod
- [x] Repository **implementations** (base pattern deferred from M1); MongoDB access only here
- [x] Update **stub user seed script** *(historical; removed after auth — see §3.5)*

**Application**

- [x] Use cases / command handlers: create holding, add acquisition, add disposal, list ledger (names match ubiquitous language)

**Interfaces**

- [x] Next.js App Router: holding creation, acquisition/disposal **forms**, **ledger** view
- [x] Route handlers or server actions for mutations and queries; validate HTTP payloads in the interface layer
- [x] Resolve current user *(M2: `STUB_USER_ID`; superseded by session — see §3.5)*

**Tests**

- [x] Unit tests: domain schemas; UK tax-year derivation from date-only values
- [x] Integration tests: repository CRUD (existing `src/test/integration/` pattern)

#### Likely files to create or modify

| File | Action |
|------|--------|
| `docs/adrs/003-repository-abstraction-design.md`, `004-error-taxonomy.md` | create (align naming with `001-` / `002-` in `docs/adrs/`) |
| `src/shared/config/env.ts` | extend — *(M2: `STUB_USER_ID`; superseded by Better Auth env — see §3.5)* |
| `.env.example` | *(M2: `STUB_USER_ID`; superseded — see §3.5)* |
| `scripts/seed-users.ts` | modify *(historical; removed — see §3.5)* |
| `src/infrastructure/persistence/schema-registry.ts` (or equivalent) | create |
| `src/domain/schemas/*.ts` | create |
| `src/domain/repositories/*.ts` | create |
| `src/infrastructure/repositories/*.ts` | create |
| `src/application/**/*.ts` | create — use cases / handlers |
| `src/app/**` — holding and ledger routes, forms | create / modify |
| `src/test/unit/**`, `src/test/integration/**` | create — mirror production tree |

#### Exit criteria

- [x] create a holding, add acquisitions and disposals, view them in a ledger
- [x] ledger lists events grouped by **UK tax year** (6 April–5 April) using **date-only** semantics per stakeholder decisions above
- [x] data persists in Atlas across page reloads
- [x] domain / application / infrastructure boundaries are clean
- [x] `npm run validate` passes
- [x] no major structural rework needed

#### Completion record

Milestone 2 delivered 2026-03-28; see **Status** and **Validated** above.

---

### Milestone 3 — Import workflow foundation

**Goal:** import RSU vesting data from the E\*Trade "ByBenefitType" XLSX export and normalise it into share acquisition events.

**Status:** Complete  
**Completed:** 2026-03-28  
**Validated:** `npm run validate` on 2026-03-28

#### Stakeholder / planning decisions (2026-03-28)

- **USD at import:** Canonical acquisition economics support **`import_usd`** (vest proceeds in USD from the export). **GBP conversion and Bank of England rates remain Milestone 5.** Manual **`manual_gbp`** entries (Milestone 2) are unchanged.
- **Milestone 4 boundary:** The Section 104 engine (M4) is **GBP-only**. Acquisitions with **`import_usd`** economics are **not** inputs to M4 calculations until M5 provides sterling equivalents; the ledger shows USD amounts and an FX-pending stance (see ADR-005).
- **PRD slice:** Milestone 3 delivers a **fixed parser** for one hierarchical XLSX layout, not the PRD’s long-term **column-mapping** importer or multi-format uploads. Mapping UI is explicitly **out of scope** for M3.
- **Sell-side data (historical note):** M3 originally deferred disposal import research. **Update (2026-04-06):** E\*Trade **Stock Plan Orders** PDF disposal import is implemented separately (ADR-006 PDF disposal import). Optional follow-on: other export formats (e.g. **Gains & Losses** CSV) for reconciliation or non–stock-plan sales.

#### Scope (summary)

- XLSX read in infrastructure; **pure** domain parser/normaliser over a grid of strings (Grant → Vest Schedule → Tax Withholding).
- Net shares = Vested Qty − Shares Traded for Taxes; gross USD from Tax Withholding **Taxable Gain** and Vested Qty per agreed decision #15.
- Filter out non-RSU benefit types (Options, ESPP) with user-visible counts.
- Review UI → bulk commit to MongoDB. **Subsequent delivery:** Stock Plan Orders **PDF disposal** import (executed RSU/plan sells with proceeds and fees — not part of original M3 scope; see ADR-006 PDF disposal import).

#### Data source gap: sell transactions *(updated 2026-04-06)*

The **Stock Plan Orders** PDF text includes **Est. Gross Proceeds** and per-fee columns; the product imports them into disposals (ADR-006 PDF disposal import). **Remaining gaps:** sales not shown in that export, other brokers, or cross-checking against **Gains & Losses** / confirmations — users can still **add disposals manually** or use additional exports. Real PDF layout may drift; parsers are validated against live extracts and integration tests with optional local files.

#### Tasks

**ADR**

- [x] **ADR-005:** Import pipeline design (`docs/adrs/005-import-pipeline-design.md`)

**Domain**

- [x] Extend **share acquisition** canonical schema: **`manual_gbp`** vs **`import_usd`** discriminated union; no duplicated field constraints outside `src/domain/schemas`
- [x] Parser + normaliser + validation helpers (unit-tested); committed **test fixture** XLSX or grid-based tests (sample files in Section 2.2 remain uncommitted)

**Infrastructure**

- [x] XLSX bytes → sheet grid (`xlsx` or equivalent); no XLSX dependency inside `src/domain`
- [x] Repository: bulk insert for import commit; persistence Zod + `$jsonSchema` updated via **`npm run db:init`**

**Application**

- [x] Preview + commit use cases (parse → normalise → review → persist)

**Interfaces**

- [x] Holding page (or sub-route): upload → preview table → commit / cancel; surface validation errors

**Tests**

- [x] Unit: parser, normaliser, date helpers, schema derivation
- [x] Integration: repository accepts `import_usd` documents (existing manual ledger test updated)

#### Likely files to create or modify

| File | Action |
|------|--------|
| `docs/adrs/005-import-pipeline-design.md` | create |
| `src/domain/schemas/share-acquisition.ts` | modify — economics discriminated union |
| `src/infrastructure/persistence/schemas/acquisition-record.ts` | modify |
| `src/infrastructure/import/read-xlsx-sheet.ts` | create |
| `src/infrastructure/import/etrade/by-benefit-type/` (E\*Trade By Benefit Type XLSX parser) | in place |
| `src/application/import/*.ts` | create — preview / commit |
| `src/app/holdings/[holdingId]/*` | modify — import UI, ledger display |
| `src/test/unit/...` | create — parser / normaliser tests |
| `src/test/fixtures/import/*.xlsx` | create — minimal ByBenefitType-style file |
| `src/test/integration/...` | modify — acquisition shape |

#### Exit criteria

- [x] XLSX upload → parsed vesting events displayed for review → committed as acquisitions in holding
- [x] validation errors surfaced clearly
- [x] normalised output matches **committed fixture** expectations (and supports local spot-check against the real sample XLSX where available)
- [x] ADR-005 complete; domain extended for **USD import** without breaking **manual GBP** entry
- [x] `npm run validate` passes

#### Completion record

Milestone 3 delivered 2026-03-28; see **Status** and **Validated** above. ADR-005 records the M3/M4 boundary for **`import_usd`** acquisitions.

---

### Milestone 4 — Calculation engine foundation

**Goal:** implement the Section 104 pool calculation engine (GBP-only) with explainable outputs, independently testable from the UI.

**Status:** Complete  
**Completed:** 2026-03-30  
**Validated:** `npm run validate` on 2026-03-30

#### Stakeholder decisions (2026-03-28)

- **One symbol per holding:** One Section 104 pool **per holding** (see Section 8.1, #22).
- **Brought-forward losses:** *(historical)* Engine/tests once covered BF/AEA rules. **Current (2026-03-31):** holding calculation uses simplified annual summaries (gains/losses/net per tax year for this holding only); no BF UI. See PRD §8.1.
- **Authentication:** Irrelevant to M4 calculation scope; **Better Auth** added post-M7 delivery (see Section 3.5, ADR-007).

#### Stakeholder / planning decisions (2026-03-30)

- **Penny precision:** Pool cost and allowable cost on disposal tracked to **2 decimal places**; SA108-style **whole-pound** rounded gain/loss per disposal (`Math.round`).
- **Single-pass multi-year:** `calculateGainsForSymbol` processes all events in one invocation; tax-year summaries are **per-year aggregates** of disposal gains/losses for the holding (no BF/AEA/tax due in UI path).
- **HS284 test depth:** HS284 Example 3 for pool/disposal arithmetic; tax-year line in tests updated for simplified summaries (see `cgt-calculator.test.ts`).

#### Tasks

**ADR**

- [x] **ADR-006:** Calculation engine boundary design (`docs/adrs/006-calculation-engine-boundary-design.md`)

**Reference**

- [x] Transcribe HS284 Example 3 figures into `docs/references/hs284-example-3-2024-notes.md` (PDF + penny-precision engine column)

**Domain — schemas**

- [x] Canonical Zod schemas + types: `src/domain/schemas/calculation.ts` (`CalcInput` = symbol + events; `CalcOutput`; `DisposalResult`; `PoolSnapshot`; `TaxYearSummary` — simplified; `RateTier` retained for `cgt-config` / tests)

**Domain — services**

- [x] `src/domain/services/cgt-config.ts` — AEA by tax year (PRD Appendix 1), main CGT rates before/on-after **2024-10-30**, `getShareCgtRatePercent`
- [x] `src/domain/services/section-104-pool.ts` — Section 104 pool (2dp), full disposal uses residual pool cost
- [x] `src/domain/services/cgt-annual-summary.ts` — *(superseded implementation)* now **per–tax-year** total gains, losses, and net from disposal lines for this symbol (see ADR-006 amendment)
- [x] `src/domain/services/cgt-calculator.ts` — `calculateGainsForSymbol`: sort/tie-break events, pool + disposals + summaries; **no** DB/UI

**Tests** (`src/test/unit/domain/services/`)

- [x] `cgt-config.test.ts` — AEA lookup, rate boundary 29 Oct vs 30 Oct 2024
- [x] `section-104-pool.test.ts` — HS284-style fraction, full disposal, over-disposal error
- [x] `cgt-annual-summary.test.ts` — aggregation of gains/losses per tax year (simplified summaries)
- [x] `cgt-calculator.test.ts` — HS284 Example 3 (penny precision + **2023-24** summary), unsorted events error, empty / no-disposal cases

#### Likely files (delivered)

| File | Action |
|------|--------|
| `docs/adrs/006-calculation-engine-boundary-design.md` | create |
| `docs/references/hs284-example-3-2024-notes.md` | update (transcribed figures) |
| `src/domain/schemas/calculation.ts` | create |
| `src/domain/services/cgt-config.ts` | create |
| `src/domain/services/section-104-pool.ts` | create |
| `src/domain/services/cgt-annual-summary.ts` | create |
| `src/domain/services/cgt-calculator.ts` | create |
| `src/test/unit/domain/services/cgt-config.test.ts` | create |
| `src/test/unit/domain/services/section-104-pool.test.ts` | create |
| `src/test/unit/domain/services/cgt-annual-summary.test.ts` | create |
| `src/test/unit/domain/services/cgt-calculator.test.ts` | create |

#### Scope (summary)

- Section 104 pool: formation, partial disposal (pool cost × sold/held, 2dp), roll-forward — **per symbol** (per holding)
- Reproduce HS284 Example 3 as the primary acceptance test (see Section 2.1); **both** disposals in **2023-24**; final pool remainder **£1,674.66** (2dp after rounded allowable cost £1,674.67)
- Calculation input/output contracts (domain schemas)
- Per-disposal breakdown: matching source (pool only in this milestone), allowable cost, gain/loss
- Pool roll-forward schedule: pool shares and pool cost after each event
- Tax-year summary *(historical milestone text)*: full BF/AEA/tax pipeline was planned; **current code** exposes simplified per-year totals for the holding UI (PRD §8.1)
- *(Deferred from holding UI:)* AEA application, BF, CGT due, rate tier — not shown on `/holdings/.../calculation`
- Calculation service in `src/domain/services/` — pure logic, no DB or UI dependencies
- Unit tests for calculation rules; HS284 + annual summary; `cgt-config` tests cover rate boundaries where relevant
- **Deferred to a later milestone:** same-day matching, 30-day matching, FX conversion; application-layer wiring from repositories to `calculateGainsForSymbol`

#### Exit criteria

- [x] HS284 Example 3 pool arithmetic reproduced exactly (penny precision); SA108 rounded gains match PDF whole pounds (£329, £300)
- [x] per-disposal breakdowns and pool roll-forward are correct and inspectable
- [x] Core pool and disposal tests pass; annual summary shape simplified for product (see ADR-006 amendment)
- [x] calculation service is independently testable (no DB or UI coupling)
- [x] ADR-006 complete
- [x] `npm run validate` passes

#### Completion record

Milestone 4 delivered 2026-03-30; see **Status** and **Validated** above. ADR-006 records contracts and was **amended 2026-03-31** for holding-scoped UI (simplified `TaxYearSummary`). ADR-006 amendment describes divergence from the original “full SA” annual summary text in this milestone.

---

### Milestone 5 — FX rates and calculation wiring

**Goal:** load Bank of England XUDLUSS USD/GBP spot rates, convert `import_usd` acquisitions to sterling at calculation time, wire repositories to the existing pool-only engine, and expose results on a dedicated holding calculation page.

**Status:** Complete  
**Completed:** 2026-03-30  
**Validated:** `npm run validate` on 2026-03-30

#### Scope

- `fx_rates` MongoDB collection; `npm run fetch:fx-rates` script; FX rate repository and domain lookup (fallback to most recent prior published rate; flag when used)
- Application-layer `runCalculationForHoldingSymbol` (`run-calculation-for-symbol.ts`): build `CalcInput` from acquisitions/disposals + FX for `import_usd`
- Route `/holdings/[holdingId]/calculation` — **transaction and pool history** (ledger lines in GBP, tax-year groups, CGT summary rows, matching subtables), simplified tax year totals, **View FX applied** (acquisitions and disposals); **no** tier/BF query params *(2026-03-31; table UX 2026-04-01)*
- Unit and integration tests for FX lookup, BoE response parsing, conversion wiring, FX repository
- **ADR-008:** FX rate infrastructure and conversion design

**Deferred to Milestone 6:** same-day and 30-day matching rules and engine changes.

#### Exit criteria

- [x] `npm run fetch:fx-rates` populates `fx_rates` from BoE XUDLUSS
- [x] `import_usd` acquisitions convert to GBP using event-date rate (with documented fallback)
- [x] calculation page shows results per symbol; missing FX coverage fails clearly
- [x] ADR-008 complete
- [x] `npm run validate` passes

#### Completion record

Milestone 5 delivered 2026-03-30. README documents `fetch:fx-rates` and `.env.local` setup. Pool-only matching unchanged; see Milestone 6 for same-day/30-day rules.

---

### Milestone 6 — Same-day and 30-day share matching

**Goal:** implement HMRC identification order — same-day matching, then 30-day (bed and breakfasting), then Section 104 pool — and extend `CalcOutput` / per-disposal breakdown accordingly.

**Status:** Complete  
**Completed:** 2026-03-30  
**Validated:** `npm run validate` on 2026-03-30

#### Scope

- Same-day matching: disposals matched to same-day acquisitions first (aggregating same-day acquisitions and disposals per CG51560)
- 30-day rule: remaining disposal quantity matched to acquisitions within 30 days **after** the disposal date (FIFO by acquisition date)
- `calculateGainsForSymbol` uses `computeMatchingOutput` (`src/domain/services/share-matching.ts`); `DisposalResult` carries **`matchingBreakdown`** (tranches: `same-day` | `thirty-day` | `section-104-pool`)
- Calculation page: per-disposal matching breakdown; ADR-009
- Unit tests for each rule and combined scenarios; PRD Appendix 4 items for same-day and 30-day

#### Tasks

**ADR**

- [x] **ADR-009:** Share matching algorithm design (`docs/adrs/009-share-matching-algorithm-design.md`)

**Domain**

- [x] Extend `src/domain/schemas/calculation.ts`: `matchingSourceSchema` enum; `matchingTrancheSchema`; `DisposalResult.matchingBreakdown`
- [x] `src/domain/services/share-matching.ts` — aggregation, phase 1 (same-day + 30-day), phase 2 (Section 104 pool)
- [x] `src/domain/services/cgt-calculator.ts` — delegate to `computeMatchingOutput`

**Application / interfaces**

- [x] `run-calculation-for-symbol.ts` — remove Milestone 6 placeholder warning (`warnings: []`)
- [x] Calculation page — matching breakdown column; copy updated for full HMRC order

**Tests**

- [x] `share-matching.test.ts`; extended `cgt-calculator.test.ts` (HS284 + same-day + 30-day + combined)

#### Likely files (delivered)

| File | Action |
|------|--------|
| `docs/adrs/009-share-matching-algorithm-design.md` | create |
| `src/domain/schemas/calculation.ts` | modify |
| `src/domain/services/share-matching.ts` | create |
| `src/domain/services/cgt-calculator.ts` | modify |
| `src/application/calculation/run-calculation-for-symbol.ts` | modify |
| `src/app/holdings/[holdingId]/calculation/page.tsx` | modify |
| `src/test/unit/domain/services/share-matching.test.ts` | create |
| `src/test/unit/domain/services/cgt-calculator.test.ts` | modify |
| `src/test/unit/domain/services/cgt-annual-summary.test.ts` | modify |

#### Exit criteria

- [x] calculation engine applies correct matching order (same-day → 30-day → Section 104 pool)
- [x] PRD Appendix 4 validation points for same-day and 30-day pass (unit tests)
- [x] HS284 Example 3 regression (pool-only path with `matchingBreakdown`)
- [x] per-disposal matching breakdown visible on calculation page
- [x] ADR-009 complete
- [x] `npm run validate` passes

#### Completion record

Milestone 6 delivered 2026-03-30; see **Status** and **Validated** above. Sell-side broker import research rescheduled to **pre–Milestone 7** (Section 8.2).

---

### Milestone 7 — User trust and operational hardening

**Goal:** make the system credible for real user-facing use.

**Status:** Complete (with **scope amendments 2026-03-31**)  
**Completed:** 2026-03-30 (original); **revised product scope** documented 2026-03-31  
**Validated:** `npm run validate` when run against a configured environment

#### Amendment (2026-03-31): holdings, simplified calculation, removed artefacts

The codebase now uses **`/holdings`** routes, **one symbol per holding**, and a **holding-level** calculation that does **not** include: user-selectable CGT tier, brought-forward losses input, persisted `portfolio_calculation_prefs`, disposals **CSV** export, `resolve-brought-forward.ts`, or portfolio-wide “Do I need to report?” UI. **Computation pack** is a **print view** at `/holdings/[holdingId]/computation-pack` mirroring the main calculation. See **PRD §8.1**, **ADR-010** (partial), **ADR-011**, **ADR-006** amendment.

#### Original stakeholder / planning decisions (2026-03-30) — superseded where contradicted above

- **Computation pack:** Print-optimised HTML; browser Print / Save as PDF — **still accurate**.
- **Brought-forward / prefs / CSV / reporting UI:** Delivered in an earlier revision; **removed** from managed schema and app (2026-03-31). ADR-010 text partially superseded.

#### Scope delivered (current)

- Matching (same-day / 30-day) explanations on the calculation page; disclaimers
- Computation pack (print) for **one holding**, aligned with calculation output
- Docker and security posture as in README
- ADR-010 exists; amendment notes in ADR-010 and ADR-011

#### Exit criteria (revised)

- [x] Holding-level calculation and computation pack are coherent and disclaim holding-only scope
- [x] No dependency on removed collections for core flows (`db:init` matches repo)
- [x] `npm run validate` passes in a correctly configured environment

#### Completion record

Original M7 completion: 2026-03-30. **2026-03-31:** Product and docs aligned to **holding-scoped** calculation; reporting-threshold / BF / CSV paths **removed** from the implementation described in this plan’s historical task lists.

---

## 8. Open Questions

### 8.1 Resolved

| # | Question | Resolution |
|---|----------|-----------|
| 1 | Primary top-level object | Holding (one symbol per user) |
| 2 | Single-user or multi-user | Multi-user; tenant id = signed-in user (Better Auth) |
| 3 | Authentication timing | **Better Auth** (2026-03-31); historically stub user until then |
| 4 | Import format first | E\*Trade "ByBenefitType" XLSX for acquisitions |
| 5 | Minimum end-to-end workflow | Manual add acquisition + disposal + ledger (M2) |
| 6 | Calculation scope for first engine | Section 104 pool, GBP-only, HS284 Example 3 (M4) |
| 7 | CGT rate assumption | **Superseded (2026-03-31):** holding calculation UI does not collect tier or compute tax due; `cgt-config` retained for tests/future use |
| 8 | Sell-to-cover treatment | Not modelled as disposals; net shares only |
| 9 | FX rate source mechanism | On-demand download script, seeded into MongoDB |
| 10 | Local MongoDB | Not supported; Atlas required for all environments |
| 11 | Orchestration beyond Docker | Not fixed in-repo; no Kubernetes manifests maintained (2026-03-31) |
| 12 | Tax filing/submission | Never; permanent product boundary |
| 13 | Sell transaction prices | E\*Trade Stock Plan Orders PDF import supplies USD gross/fees for in-scope plan disposals; manual entry remains for other cases |
| 14 | Stock Options / ESPP scope | RSU-only. Options and ESPP are permanently out of scope. Import pipeline must filter them out. |
| 15 | Tax Withholding "Taxable Gain" currency | USD. Divide by Vested Qty to derive per-share USD market value at vest for CGT acquisition cost. |
| 16 | Stub user for Milestone 2+ *(historical)* | Delivered as `STUB_USER_ID` + `seed:users`; **removed** when Better Auth shipped — tenant `userId` = Better Auth user id (ADR-007). |
| 17 | Manual acquisition/disposal economics (M2) | Store gross/price components and **fees in separate fields**; derive net for display; M4 uses the same explicit fields. |
| 18 | Ledger tax-year grouping (M2) | **UTC date-only** calendar dates; UK tax year **6 April–5 April** for grouping. |
| 19 | Symbol field (M2) | Single **free-text ticker** per event; ISIN deferred unless M3+ requires it. |
| 20 | PRD workspace theme vs top-level object | **Holding** (one symbol) is the top-level organising entity; PRD §8.1 updated (2026-03-31). |
| 21 | M4 vs `import_usd` acquisitions | M4 pool engine is **GBP-only**. **`import_usd`** rows are converted to sterling in the **application layer** (M5) via BoE XUDLUSS before calling the engine; ledger may still list USD for traceability (see ADR-005, ADR-008). |
| 22 | Multiple tickers in one holding | **Superseded (2026-03-31):** one ticker per holding; use multiple holdings for multiple symbols. Historical: multiple tickers per portfolio with per-symbol pools (2026-03-28). |
| 23 | Authentication provider | **Better Auth** + MongoDB adapter + cookie sessions; **ADR-007** records provider, sessions, and replacement of stub user (updated 2026-03-31). |
| 24 | Brought-forward losses — user input vs engine | **Superseded (2026-03-31):** no BF input in app — not holding-scoped; user combines manually. Engine tests may still reference BF concepts in isolation; production `computeAnnualSummaries` is simplified (PRD §8.1). |

### 8.2 Still open

- **Additional disposal sources** (Gains & Losses CSV, confirmations, other brokers) remain optional; **E\*Trade Stock Plan Orders PDF** disposal import covers the primary plan-sale path (2026-04-06).
- **User-wide CGT / reporting UX:** If the product later adds “Do I need to report?”, AEA across all gains, or BF entry, that is **out of scope** for the current single-holding calculation (see PRD §8.1; ADR-010 amendment).

---

## 9. ADR Candidates

### Write before Milestone 1

| ADR | Rationale |
|-----|-----------|
| **ADR-001: Folder structure and DDD layering** | Records the `domain/application/infrastructure/interfaces/shared` structure, dependency rule, and schema-derivation strategy. Multiple engineers (and AI agents) need a stable reference. |
| **ADR-002: Environment and configuration loading** | Records the Zod-validated env approach, single `MONGODB_URI`, and startup-fail behaviour. |

### Write before the relevant milestone

| ADR | Milestone | Rationale |
|-----|-----------|-----------|
| ADR-003: Repository abstraction design | M2 | Interface in domain, generic base in infrastructure, collection-specific implementations. Deferred from M1 (no real consumer until M2). |
| ADR-004: Error taxonomy | M2 | `AppError` hierarchy: validation, domain, persistence, configuration, import errors. Deferred from M1 (simple enough without formal ADR until M2). |
| ADR-005: Import pipeline design | M3 | How files are uploaded, parsed, normalised, validated, and committed. Extensibility for new formats. |
| ADR-006: Calculation engine boundary design | M4 | Input/output contracts, pure-function design, separation from persistence and UI. |
| ADR-008: FX rate infrastructure and conversion | M5 | BoE XUDLUSS storage, lookup, fallback, application-layer GBP conversion for `import_usd`. |
| ADR-009: Share matching algorithm | M6 | HMRC order (same-day, 30-day, Section 104), CG51560 aggregation, `matchingBreakdown` schema. |
| ADR-010: Exports, computation pack, reporting thresholds | M7 | Print-only pack; **amended** — CSV/BF/prefs removed from app (2026-03-31). |
| ADR-011: Holdings — one symbol per holding | **Done** — `docs/adrs/011-holdings-one-symbol-per-holding.md` | Routes `/holdings`, symbol normalisation, import filtering, calculation scope. |
| ADR-007: Authentication and user model | **Done** — `docs/adrs/007-authentication-better-auth.md` | Better Auth, MongoDB sessions, `userId` = Better Auth user id; stub user path removed (no migration — greenfield / DB refresh). |

---

## 10. Validation Strategy

### Per-milestone gate

For each meaningful milestone:

1. `npm run build` — TypeScript compilation, Next.js build
2. `npm run lint` — ESLint with strict project rules
3. `npm test` — Jest unit tests only (`src/test/unit/`)
4. `npm run test:integration` — Jest integration tests (`src/test/integration/`)
5. `npm run validate` — build, lint, unit tests, then integration tests

No milestone is complete while `npm run validate` is failing.

### Domain-specific validation (from Milestone 4 onward)

Per PRD Appendix 4, the calculation engine must pass:

- [x] **HS284 Example 3:** Section 104 pool formation and partial-disposal fraction logic reproduced exactly (penny-precision engine; see `docs/references/hs284-example-3-2024-notes.md`)
- [x] **Same-day matching:** disposal and acquisition on the same day match first (M6)
- [x] **30-day rule directionality:** acquisitions within 30 days *after* disposal matched in priority (M6)
- [x] **FX handling:** per-transaction GBP conversion, not "compute USD gain then convert" (M5)
- [x] **Loss utilisation:** *(HMRC reference / historical engine tests)* — holding UI does not apply BF or AEA (PRD §8.1)
- [x] **Holding-level scope:** no in-product 2024–25 rate-change banner; `cgt-config` remains for tests / future use

---

## 11. Risks

- **Disposal data outside the Stock Plan Orders PDF:** Plan disposals imported from that PDF include proceeds and fees; other sales still rely on manual entry or future parsers. Mitigate with clear UX copy and optional use of E\*Trade **Gains & Losses** / confirmations for reconciliation.
- **Import format brittleness:** The XLSX format is hierarchical, sparse, and uses mixed date formats. E\*Trade may change the export layout without notice. Mitigate with defensive parsing, clear validation errors, and a mapping approach.
- **Tax domain complexity escalation:** Same-day and 30-day matching interact with each other and with the pool in non-obvious ways. Mitigate by deferring matching rules to M6 (after pool mechanics and FX wiring are solid) and testing each rule independently.
- **CGT liability:** The holding calculation does **not** compute personal CGT due or tier. Mitigate with clear copy (PRD §8.1) if future features add tax estimates.
- **Non-RSU data in imports:** The sample data includes Stock Options and ESPP events. These are permanently out of scope; the import pipeline must filter them out cleanly and inform the user what was excluded.
- **Premature over-modelling vs under-modelling:** Mitigate by building thin vertical slices and refactoring confidently (no backwards-compatibility constraint in early milestones).

---

## 12. Assumptions

- This is a multi-user self-service end-user product.
- The initial goal is architectural strength and one correct vertical slice, not complete tax-domain coverage.
- MongoDB Atlas is the only supported persistence target (no local MongoDB).
- Docker is the container deployment target captured in this repository; other hosting is a product/ops decision.
- Strict linting, validation, and testing are required from Milestone 1.
- Backwards compatibility is not a goal during early milestones.
- The holding calculation does not ask for CGT rate tier or compute income tax bands (2026-03-31).
- RSUs are the only equity compensation type in scope. Stock Options and ESPP are permanently out of scope; the import pipeline must filter them out.

---

## 13. Plan Review Checklist

Before implementation starts, confirm:

- [x] PRD has been reviewed
- [x] project rules are in place
- [x] product interview complete; key decisions recorded in Section 3.2
- [x] the smallest useful milestone is identified (Milestone 1)
- [x] open product questions are clearly listed (Section 8)
- [x] initial repo structure is agreed (Section 6)
- [x] validation strategy is agreed (Section 10)
- [x] Milestone 1 scope is documented with file list and exit criteria
- [x] ADR-001 and ADR-002 written before M1 implementation begins
- [x] Milestone 1 scope approved by stakeholder (planning refinement 2026-03-28)
- [x] Milestone 2 scope, tasks, exit criteria, and stakeholder decisions recorded (2026-03-28); PRD §8.1 aligned with Holding model (updated 2026-03-31)
- [x] Milestone 2 delivered: all Milestone 2 tasks and exit criteria in Section 7 checked; Status `Complete`; `npm run validate` recorded under Completion record
- [x] Milestone 3 delivered: tasks, exit criteria, and stakeholder decisions in Section 7; ADR-005; Status `Complete`; `npm run validate` recorded under Completion record
- [x] Milestone 4 delivered: tasks, exit criteria, ADR-006, HS284 notes update; Status `Complete`; `npm run validate` recorded under Completion record
- [x] Milestone 5 delivered: FX rates, calculation wiring, calculation page, ADR-008; Section 7 tasks and exit criteria; `npm run validate` recorded
- [x] Milestone 6 delivered: same-day/30-day/Section 104 matching, ADR-009, calculation page breakdown, Section 7 tasks and exit criteria; `npm run validate` recorded
- [x] Milestone 7 delivered: tasks, exit criteria, ADR-010, Section 7 Status `Complete`; `npm run validate` recorded

---

## 14. Cursor Planning Prompt To Reuse

Use this prompt when starting or revising the plan:

> Read `docs/PRD.md` and `.cursor/rules/project.mdc`.
> Do not write code yet.
> Identify open questions, challenge weak assumptions, and update this implementation plan.
> Propose the smallest safe next milestone, the files likely to be created or changed, the validation strategy, and any ADRs that should be written before implementation.
