# Implementation Plan - Shares Gains UK Tax Calculator

**Status:** Draft — post-interview refinement
**Prepared by:** Paul Done
**Last updated:** 2026-03-31

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
| `E_TRADE - Stock Plan Orders.pdf` | Morgan Stanley at Work / E\*Trade "Orders" page PDF export | 269 stock plan orders (sell-to-cover at vest + voluntary disposals). Contains order date, qty, order type, price type. **Does not contain sale price, proceeds, or fees.** |

**Key data observations:**

- The XLSX provides acquisition data (vest events with dates, quantities, tax withholding details) but not sale/disposal prices.
- The PDF provides disposal order history but not execution prices or proceeds.
- Neither file alone is sufficient for a complete CGT calculation. The user will also need trade confirmations or a "Gains & Losses" report for actual sale prices.
- The XLSX uses mixed date formats: `DD-MMM-YYYY` for grant/release dates, `MM/DD/YYYY` for vest dates.
- The XLSX is sparse — each record type uses a different subset of the 63 columns.
- Some PDF orders show `0` exercised qty or `--`, indicating cancelled or unfilled orders.
- "Shares Traded for Taxes" at vest are **not** treated as disposals; only net shares received are tracked as acquisitions (stakeholder decision).

---

## 3. Agreed Decisions

### 3.1 Tooling (confirmed in Milestone 0)

- [x] Package manager: `npm`
- [x] Routing approach: Next.js **App Router**
- [x] Testing framework: `Jest`
- [x] Linting: `ESLint` with Next.js + TypeScript configuration plus strict project rules
- [x] Validation command: `npm run validate`

### 3.2 Product decisions (stakeholder interview, 2026-03-28)

- [x] **Multi-user application.** Data model includes `userId` on every document from day one. **Authentication** is implemented with **Better Auth** (MongoDB adapter, cookie sessions, email/password; see ADR-007). Historical Milestones 1–2 used a **stub user** (`STUB_USER_ID` + `seed:users`); that path has been **removed** — tenant `userId` is the signed-in Better Auth user id.
- [x] **Top-level domain object: Portfolio.** A portfolio is the primary organising entity. It belongs to a user and can span multiple tax years. Tax-year views are derived from portfolio data, not separate top-level entities.
- [x] **CGT rate tier: user-selectable.** Support basic (10%/18%), higher (20%/24%), and additional (same as higher for CGT purposes) rate tiers. Default to "additional" in the UI. The app does not compute the user's income tax band — the user declares it.
- [x] **Sell-to-cover at vest: not modelled as disposals.** When RSUs vest and shares are sold to cover PAYE/NI, only the net shares received are tracked as acquisitions. The withheld shares are treated as never received.
- [x] **Import formats: XLSX and CSV** (and later, potentially parsed PDF). The E\*Trade "ByBenefitType" export (XLSX) is the first target for acquisition/vesting import. Sale/disposal data will require a separate source (e.g. trade confirmations or "Gains & Losses" report) because the Orders PDF lacks execution prices.
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
- [x] **Schema registry and base repository: deferred to M2.** The Zod → JSON Schema → MongoDB `$jsonSchema` pipeline and abstract repository pattern have no real consumers in M1. They move to M2 where Portfolio and share event schemas are the first consumers.
- [x] **ADR-003 and ADR-004: deferred to M2.** M1 implementations (AppError, MongoDB client) are simple enough without formal ADRs. Write them when M2 demands structured patterns.
- [x] **`@typescript-eslint/promise-function-async`: strict (`"error"`).** Per the project rule: "The ESLint configuration is the source of truth." Tune with rule options later if specific patterns need exemption.

### 3.4 Stakeholder refinements (2026-03-28)

- [x] **Multiple tickers per portfolio:** **Explicit support** — Section 104 pooling applies **per symbol** (separate pool state per ticker) within a portfolio, consistent with UK CGT line-of-stock treatment at this level of modelling.
- [x] **Authentication provider:** **Better Auth** embedded in the Next.js app, MongoDB-backed sessions, email/password with required verification — documented in **ADR-007** (`docs/adrs/007-authentication-better-auth.md`).
- [x] **Brought-forward losses:** **Milestone 4** implements the **calculation rules** with **test inputs** (including zero / explicit brought-forward in tests). **User-facing entry** of brought-forward amounts is **Milestone 7** (see Milestone 4 stakeholder decisions and Section 8.1).

### 3.5 Authentication delivery (2026-03-31)

- [x] **Better Auth** integrated: App Router `/api/auth/[...all]`, `@better-auth/mongo-adapter` sharing `MONGODB_URI`, cookie sessions (`nextCookies` plugin).
- [x] **Email/password** with **required email verification** before portfolio access; password reset and verification email scaffolding (`AUTH_EMAIL_PROVIDER=noop` default — log-based until a real provider is wired).
- [x] **Stub user removed:** no `STUB_USER_ID`, no `scripts/seed-users.ts`; `userId` on tenant documents = Better Auth `user.id`. Domain `users` collection upserted on sign-up for consistency with existing provisioning.
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

- [x] Canonical Zod schemas: **portfolio**, **share holding events** (acquisition vs disposal) in `src/domain/schemas/`
- [x] Repository **interfaces** in `src/domain/repositories/`

**Infrastructure**

- [x] Persistence record schemas (extend domain with `_id`, timestamps, `userId`); derive MongoDB validators from Zod
- [x] Repository **implementations** (base pattern deferred from M1); MongoDB access only here
- [x] Update **stub user seed script** *(historical; removed after auth — see §3.5)*

**Application**

- [x] Use cases / command handlers: create portfolio, add acquisition, add disposal, list ledger (names match ubiquitous language)

**Interfaces**

- [x] Next.js App Router: portfolio creation, acquisition/disposal **forms**, **ledger** view
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
| `src/app/**` — portfolio and ledger routes, forms | create / modify |
| `src/test/unit/**`, `src/test/integration/**` | create — mirror production tree |

#### Exit criteria

- [x] create a portfolio, add acquisitions and disposals, view them in a ledger
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
- **Sell-side data spike:** Investigation of E\*Trade "Gains & Losses" / trade confirmations for **disposal** import is deferred to **pre–Milestone 5** (see **Data source gap** below). M3 does not block on that investigation.

#### Scope (summary)

- XLSX read in infrastructure; **pure** domain parser/normaliser over a grid of strings (Grant → Vest Schedule → Tax Withholding).
- Net shares = Vested Qty − Shares Traded for Taxes; gross USD from Tax Withholding **Taxable Gain** and Vested Qty per agreed decision #15.
- Filter out non-RSU benefit types (Options, ESPP) with user-visible counts.
- Review UI → bulk commit to MongoDB. **Deferred:** sell transaction import.

#### Data source gap: sell transactions

The E\*Trade "Stock Plan Orders" PDF does not include sale prices or proceeds. **Before Milestone 5** (or as a pre-M5 checkpoint), investigate whether the E\*Trade "Gains & Losses" report or individual trade confirmations provide execution prices in a parseable format (CSV or XLSX). Until then, disposals continue to be entered **manually** (Milestone 2). Real export column names may differ slightly from the fixture headers; adjust the parser when validating against a live export.

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

- [x] Portfolio page (or sub-route): upload → preview table → commit / cancel; surface validation errors

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
| `src/domain/services/etrade-by-benefit-type-parser.ts` (or under `domain/import/`) | create |
| `src/application/import/*.ts` | create — preview / commit |
| `src/app/portfolios/[portfolioId]/*` | modify — import UI, ledger display |
| `src/test/unit/...` | create — parser / normaliser tests |
| `src/test/fixtures/import/*.xlsx` | create — minimal ByBenefitType-style file |
| `src/test/integration/...` | modify — acquisition shape |

#### Exit criteria

- [x] XLSX upload → parsed vesting events displayed for review → committed as acquisitions in portfolio
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

- **Multi-ticker:** One Section 104 pool **per symbol** within a portfolio (see Section 8.1, #22). Events for different tickers do not share a pool.
- **Brought-forward losses:** Engine and tests implement the **rules** (including brought-forward down to AEA); **no UI to capture** prior-year loss pools in M4 — use test fixtures and explicit inputs; full user input **Milestone 7** (see Section 8.1, #24); M5 calculation page may expose a numeric field only.
- **Authentication:** Irrelevant to M4 calculation scope; **Better Auth** added post-M7 delivery (see Section 3.5, ADR-007).

#### Stakeholder / planning decisions (2026-03-30)

- **Penny precision:** Pool cost and allowable cost on disposal tracked to **2 decimal places**; SA108-style **whole-pound** rounded gain/loss per disposal (`Math.round`).
- **Single-pass multi-year:** `calculateGainsForSymbol` processes all events in one invocation; tax-year summaries run after disposals with **automatic loss carry-forward** between years.
- **HS284 test depth:** HS284 Example 3 **plus** annual summary (AEA, CGT rate breakdown); both May 2023 and Feb 2024 disposals fall in tax year **2023-24** (UTC date-only).

#### Tasks

**ADR**

- [x] **ADR-006:** Calculation engine boundary design (`docs/adrs/006-calculation-engine-boundary-design.md`)

**Reference**

- [x] Transcribe HS284 Example 3 figures into `docs/references/hs284-example-3-2024-notes.md` (PDF + penny-precision engine column)

**Domain — schemas**

- [x] Canonical Zod schemas + types: `src/domain/schemas/calculation.ts` (`CalcInput`, `CalcOutput`, `DisposalResult`, `PoolSnapshot`, `TaxYearSummary`, `RateTier`)

**Domain — services**

- [x] `src/domain/services/cgt-config.ts` — AEA by tax year (PRD Appendix 1), main CGT rates before/on-after **2024-10-30**, `getShareCgtRatePercent`
- [x] `src/domain/services/section-104-pool.ts` — Section 104 pool (2dp), full disposal uses residual pool cost
- [x] `src/domain/services/cgt-annual-summary.ts` — same-year net, BF capped to AEA rule, AEA applied **post-first** in **2024-25**, multi-year loss pool
- [x] `src/domain/services/cgt-calculator.ts` — `calculateGainsForSymbol`: sort/tie-break events, pool + disposals + summaries; **no** DB/UI

**Tests** (`src/test/unit/domain/services/`)

- [x] `cgt-config.test.ts` — AEA lookup, rate boundary 29 Oct vs 30 Oct 2024
- [x] `section-104-pool.test.ts` — HS284-style fraction, full disposal, over-disposal error
- [x] `cgt-annual-summary.test.ts` — BF to AEA, loss year, **2024-25** split rates, multi-year carry-forward
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

- Section 104 pool: formation, partial disposal (pool cost × sold/held, 2dp), roll-forward — **per symbol** (separate pool state per ticker within a portfolio)
- Reproduce HS284 Example 3 as the primary acceptance test (see Section 2.1); **both** disposals in **2023-24**; final pool remainder **£1,674.66** (2dp after rounded allowable cost £1,674.67)
- Calculation input/output contracts (domain schemas)
- Per-disposal breakdown: matching source (pool only in this milestone), allowable cost, gain/loss
- Pool roll-forward schedule: pool shares and pool cost after each event
- Tax-year summary: gains, losses, BF, AEA, taxable gain, CGT due, rate breakdown
- Annual exempt amount (AEA) application
- Loss netting: current-year losses before brought-forward; brought-forward only down to AEA
- CGT rate computation: user-selected tier (basic/higher/additional), including the **2024-25** tax-year split (pre/post **30 Oct 2024** on the **2024-25** label)
- Calculation service in `src/domain/services/` — pure logic, no DB or UI dependencies
- Unit tests for calculation rules; HS284 + annual summary + **2024-25** split-rate test
- **Deferred to a later milestone:** same-day matching, 30-day matching, FX conversion; application-layer wiring from repositories to `calculateGainsForSymbol`

#### Exit criteria

- [x] HS284 Example 3 pool arithmetic reproduced exactly (penny precision); SA108 rounded gains match PDF whole pounds (£329, £300)
- [x] per-disposal breakdowns and pool roll-forward are correct and inspectable
- [x] AEA, loss netting, rate-tier logic, and **2024-25** split rates are covered by tests
- [x] calculation service is independently testable (no DB or UI coupling)
- [x] ADR-006 complete
- [x] `npm run validate` passes

#### Completion record

Milestone 4 delivered 2026-03-30; see **Status** and **Validated** above. ADR-006 records contracts, penny precision, and M4/M5 boundary (pool-only; `import_usd` unchanged per ADR-005).

---

### Milestone 5 — FX rates and calculation wiring

**Goal:** load Bank of England XUDLUSS USD/GBP spot rates, convert `import_usd` acquisitions to sterling at calculation time, wire repositories to the existing pool-only engine, and expose results on a dedicated portfolio calculation page.

**Status:** Complete  
**Completed:** 2026-03-30  
**Validated:** `npm run validate` on 2026-03-30

#### Scope

- `fx_rates` MongoDB collection; `npm run fetch:fx-rates` script; FX rate repository and domain lookup (fallback to most recent prior published rate; flag when used)
- Application-layer `runCalculationForSymbol`: build `CalcInput` from acquisitions/disposals + FX for `import_usd`
- Route `/portfolios/[portfolioId]/calculation` with symbol, rate tier, brought-forward losses query form; tables for FX applied, pool roll-forward, disposals, tax year summaries
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
| `src/app/portfolios/[portfolioId]/calculation/page.tsx` | modify |
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

**Status:** Complete  
**Completed:** 2026-03-30  
**Validated:** `npm run validate` on 2026-03-30

#### Stakeholder / planning decisions (2026-03-30)

- **Computation pack:** **Print-optimised HTML** only in M7; users use browser Print / Save as PDF; no server-side PDF library.
- **Brought-forward losses:** **Persisted in MongoDB** per portfolio (`portfolio_calculation_prefs`); calculation uses stored value by default; query param may override for deep links (see ADR-010).
- **Reporting thresholds:** Portfolio-wide **sum of disposal proceeds** per UK tax year for 4×AEA / £50k rules; **Self Assessment** registration is a **user-declared** checkbox for the 2023–24+ £50,000 proceeds rule. **Chargeable gains** “likely report” signals use **per-symbol** summaries summed with an explicit disclaimer (each symbol applies AEA in the engine separately; not a substitute for professional combined advice).
- **Sell-side import research** (Gains & Losses / confirmations) remains a **pre–M7 checkpoint**; disposal CSV import is **not** required to close M7 trust/exports/BF work.

#### Scope (summary)

- "Do I need to report?" section per tax year (PRD Appendix 1 thresholds)
- Reporting threshold logic: 4×AEA proceeds (pre-2023-24), £50,000 (2023-24 onward) with SA flag where relevant
- RSU timing explanations (same-day vest+sell, 30-day scenarios) — in-product plain-English guidance
- 2024-25 rate change flag and explanation
- Computation pack: **print view** with transaction ledger, FX rates, per-disposal computations, pool roll-forward
- CSV export of computed disposals with matching source
- Data quality warnings: missing FX, incomplete portfolios, unresolved items
- Assumption labelling: selected CGT rate tier visible on outputs
- "Not professional tax advice" disclaimer
- Refined Docker assets
- Security review: env var handling, no secrets in logs, sensitive data treatment
- Updated README and operational docs

#### Tasks

**ADR**

- [x] **ADR-010:** Exports, computation pack, reporting thresholds (`docs/adrs/010-exports-computation-pack-and-reporting-thresholds.md`)

**Domain**

- [x] `src/domain/services/reporting-thresholds.ts` — proceeds thresholds (4×AEA vs £50k), `assessReportingNeed` with SA flag; unit tests
- [x] `src/domain/schemas/portfolio-calculation-prefs.ts` — canonical Zod for brought-forward persistence

**Persistence**

- [x] `portfolio_calculation_prefs` collection; `npm run db:init`; persistence schema derived from domain
- [x] `PortfolioCalculationPrefsRepository` (domain) + Mongo implementation

**Application**

- [x] Load/save prefs; `runCalculationForSymbol` uses persisted BF unless query override (`resolve-brought-forward.ts`)
- [x] `getPortfolioReportingOverview` — aggregate proceeds by tax year; combine per-symbol calc summaries for UI

**Interfaces**

- [x] Calculation page: BF persisted; optional `bf` query override
- [x] Portfolio or calculation area: "Do I need to report?", SA checkbox, RSU guidance blocks, 2024–25 rate-change copy, disclaimers, data-quality warnings
- [x] Print computation pack route (`/portfolios/[id]/computation-pack`) with `@media print` / `.no-print`
- [x] CSV route for disposals export (`/portfolios/[id]/disposals-export`)
- [x] Layout/footer: tax disclaimer; rate tier visible (`calculation-result-sections`, root layout footer)

**Ops**

- [x] Docker README alignment; security notes (README + container image non-root user)

#### Likely files (Milestone 7)

| File | Action |
|------|--------|
| `docs/adrs/010-exports-computation-pack-and-reporting-thresholds.md` | create |
| `docs/IMPLEMENTATION_PLAN.md` | update (this milestone) |
| `src/domain/services/reporting-thresholds.ts` | create |
| `src/test/unit/domain/services/reporting-thresholds.test.ts` | create |
| `src/domain/schemas/portfolio-calculation-prefs.ts` | create |
| `src/domain/repositories/portfolio-calculation-prefs-repository.ts` | create |
| `src/infrastructure/persistence/schemas/portfolio-calculation-prefs-record.ts` | create |
| `src/infrastructure/repositories/mongo-portfolio-calculation-prefs-repository.ts` | create |
| `src/infrastructure/persistence/schema-registry.ts` | modify |
| `src/infrastructure/persistence/ensure-collections.ts` | modify |
| `scripts/db-init.ts` | modify (log new collection) |
| `src/application/portfolio/*` | create (reporting overview, prefs) |
| `src/app/portfolios/[portfolioId]/calculation/*` | modify |
| `src/app/portfolios/[portfolioId]/computation-pack/*` | create |
| `src/app/portfolios/[portfolioId]/disposals-export/route.ts` | create |
| `src/application/calculation/resolve-brought-forward.ts` | create |
| `src/app/portfolios/[portfolioId]/calculation/actions.ts` | create |
| `src/app/portfolios/[portfolioId]/calculation/calculation-result-sections.tsx` | create |

#### Exit criteria

- [x] outputs are useful for Self Assessment record keeping
- [x] deployment assets are production-credible
- [x] material assumptions are surfaced in UI and exports
- [x] brought-forward losses persisted and used by default in calculation
- [x] reporting threshold UI and print/CSV exports implemented
- [x] ADR-010 complete
- [x] `npm run validate` passes

#### Completion record

Milestone 7 delivered 2026-03-30; see **Status** and **Validated** above. ADR-010 records print-only computation pack, CSV export, reporting thresholds, and BF/SA persistence. Run **`npm run db:init`** on each target database to add **`portfolio_calculation_prefs`**.

---

## 8. Open Questions

### 8.1 Resolved

| # | Question | Resolution |
|---|----------|-----------|
| 1 | Primary top-level object | Portfolio |
| 2 | Single-user or multi-user | Multi-user; tenant id = signed-in user (Better Auth) |
| 3 | Authentication timing | **Better Auth** (2026-03-31); historically stub user until then |
| 4 | Import format first | E\*Trade "ByBenefitType" XLSX for acquisitions |
| 5 | Minimum end-to-end workflow | Manual add acquisition + disposal + ledger (M2) |
| 6 | Calculation scope for first engine | Section 104 pool, GBP-only, HS284 Example 3 (M4) |
| 7 | CGT rate assumption | User-selectable tier (basic/higher/additional), default additional |
| 8 | Sell-to-cover treatment | Not modelled as disposals; net shares only |
| 9 | FX rate source mechanism | On-demand download script, seeded into MongoDB |
| 10 | Local MongoDB | Not supported; Atlas required for all environments |
| 11 | Orchestration beyond Docker | Not fixed in-repo; no Kubernetes manifests maintained (2026-03-31) |
| 12 | Tax filing/submission | Never; permanent product boundary |
| 13 | Sell transaction prices | Assume available eventually; manual entry acceptable as fallback |
| 14 | Stock Options / ESPP scope | RSU-only. Options and ESPP are permanently out of scope. Import pipeline must filter them out. |
| 15 | Tax Withholding "Taxable Gain" currency | USD. Divide by Vested Qty to derive per-share USD market value at vest for CGT acquisition cost. |
| 16 | Stub user for Milestone 2+ *(historical)* | Delivered as `STUB_USER_ID` + `seed:users`; **removed** when Better Auth shipped — tenant `userId` = Better Auth user id (ADR-007). |
| 17 | Manual acquisition/disposal economics (M2) | Store gross/price components and **fees in separate fields**; derive net for display; M4 uses the same explicit fields. |
| 18 | Ledger tax-year grouping (M2) | **UTC date-only** calendar dates; UK tax year **6 April–5 April** for grouping. |
| 19 | Symbol field (M2) | Single **free-text ticker** per event; ISIN deferred unless M3+ requires it. |
| 20 | PRD workspace theme vs Portfolio | **Portfolio** is the top-level organising entity; PRD §8.1 updated to match (2026-03-28). |
| 21 | M4 vs `import_usd` acquisitions | M4 pool engine is **GBP-only**. **`import_usd`** rows are converted to sterling in the **application layer** (M5) via BoE XUDLUSS before calling the engine; ledger may still list USD for traceability (see ADR-005, ADR-008). |
| 22 | Multiple tickers in one portfolio | **Supported explicitly:** Section 104 pooling and disposal matching apply **per symbol** (per-line-of-stock) within a portfolio — not a single blended pool across tickers. UX may stay minimal in early milestones; correctness is per symbol (stakeholder decision, 2026-03-28). |
| 23 | Authentication provider | **Better Auth** + MongoDB adapter + cookie sessions; **ADR-007** records provider, sessions, and replacement of stub user (updated 2026-03-31). |
| 24 | Brought-forward losses — user input vs engine | **Milestone 4:** implement loss netting rules in the **calculation engine** and unit tests using **explicit test inputs** (including zero / hardcoded brought-forward where needed). **User-facing input** of brought-forward loss pools is **deferred to Milestone 7** (stakeholder decision, 2026-03-28). |

### 8.2 Still open

- **Sell-side import research** (Gains & Losses / confirmations) remains a **pre–Milestone 7** checkpoint for **disposal import** scope; it does not block Milestone 7 trust/exports/BF delivery (see Milestone 7 stakeholder decisions).
- **Portfolio-wide CGT vs per-symbol engine:** Milestone 7 “Do I need to report?” uses **aggregated proceeds** across symbols plus **per-symbol** taxable summaries with an explicit disclaimer until a combined multi-symbol annual model exists (see ADR-010).

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
| ADR-010: Exports, computation pack, reporting thresholds | M7 | Print-only pack, CSV shape, proceeds aggregation, SA checkbox, BF persistence. |
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
- [x] **Loss utilisation:** current-year before brought-forward; brought-forward only down to AEA (M4)
- [x] **2024-25 rate change:** correct rates before/after 30 Oct 2024 in same tax year (M4 — tax year **2024-25** split)

---

## 11. Risks

- **Sell transaction data gap:** The available PDF export lacks execution prices. Manual entry of sale prices is an acceptable fallback, but reduces the product's self-service value. Mitigate by investigating E\*Trade "Gains & Losses" report and trade confirmations **before Milestone 7** (disposal import scope).
- **Import format brittleness:** The XLSX format is hierarchical, sparse, and uses mixed date formats. E\*Trade may change the export layout without notice. Mitigate with defensive parsing, clear validation errors, and a mapping approach.
- **Tax domain complexity escalation:** Same-day and 30-day matching interact with each other and with the pool in non-obvious ways. Mitigate by deferring matching rules to M6 (after pool mechanics and FX wiring are solid) and testing each rule independently.
- **CGT rate tier simplification:** The app asks the user to declare their tier rather than computing it. This is a deliberate simplification but may confuse users who don't know their band. Mitigate with clear in-product guidance.
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
- The user declares their CGT rate tier; the app does not compute income tax bands.
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
- [x] Milestone 2 scope, tasks, exit criteria, and stakeholder decisions recorded (2026-03-28); PRD §8.1 aligned with Portfolio model
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
