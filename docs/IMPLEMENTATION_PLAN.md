# Implementation Plan - Shares Gains UK Tax Calculator

**Status:** Draft — post-interview refinement
**Prepared by:** Paul Done
**Last updated:** 2026-03-28

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

- [x] **Multi-user application.** Data model includes `userId` on every document from day one. Real authentication deferred; Milestone 1 uses a stub/seed user.
- [x] **Top-level domain object: Portfolio.** A portfolio is the primary organising entity. It belongs to a user and can span multiple tax years. Tax-year views are derived from portfolio data, not separate top-level entities.
- [x] **CGT rate tier: user-selectable.** Support basic (10%/18%), higher (20%/24%), and additional (same as higher for CGT purposes) rate tiers. Default to "additional" in the UI. The app does not compute the user's income tax band — the user declares it.
- [x] **Sell-to-cover at vest: not modelled as disposals.** When RSUs vest and shares are sold to cover PAYE/NI, only the net shares received are tracked as acquisitions. The withheld shares are treated as never received.
- [x] **Import formats: XLSX and CSV** (and later, potentially parsed PDF). The E\*Trade "ByBenefitType" export (XLSX) is the first target for acquisition/vesting import. Sale/disposal data will require a separate source (e.g. trade confirmations or "Gains & Losses" report) because the Orders PDF lacks execution prices.
- [x] **FX rates: on-demand download script.** Provide a script to fetch Bank of England daily USD/GBP spot rates (XUDLUSS series) and seed them into MongoDB. Run once to initialise; re-run to update.
- [x] **MongoDB Atlas required for all environments.** No local MongoDB fallback. The `MONGODB_URI` env var points to Atlas in dev, Docker, and Kubernetes. The developer provides their own Atlas connection string.
- [x] **Kubernetes: vanilla manifests.** Deployment + Service + ConfigMap/Secret. No specific cluster provider assumptions.
- [x] **No tax filing or submission — ever.** This is a permanent product boundary, not a deferred feature. The app produces computation packs and summaries for the user's own records. SA108 field alignment is for reference only.
- [x] **Milestone 2 scope: manual data entry slice** (not import). A small "add acquisition + add disposal + view ledger" flow to prove the full stack before introducing CSV/XLSX parsing complexity.
- [x] **Calculation engine (Milestone 4): Section 104 pool first, GBP-only.** Reproduce HS284 Example 3 as primary acceptance test. Same-day and 30-day matching rules layered on afterward. FX conversion added after pool mechanics are solid.

### 3.3 Milestone 1 planning refinement (2026-03-28)

- [x] **Bootstrap approach: manual setup.** No `create-next-app`. Manually initialise `package.json`, install dependencies explicitly, and create all files from scratch for full control.
- [x] **ESLint: flat config (`eslint.config.mjs`).** ESLint 9 flat config format with `typescript-eslint` type-checked mode. Dev dependencies: `eslint`, `typescript-eslint`, `@next/eslint-plugin-next`, `eslint-plugin-react`, `eslint-plugin-react-hooks`.
- [x] **Tailwind CSS v4: CSS-based config.** No `tailwind.config.ts`; Tailwind v4 uses `@import "tailwindcss"` and `@theme` in `globals.css`. `postcss.config.mjs` is the only config file.
- [x] **Stub user seed: minimal script.** A seed script (not startup-time logic) that writes a simple hardcoded user document to prove MongoDB write/read. Gets a proper schema in M2.
- [x] **Schema registry and base repository: deferred to M2.** The Zod → JSON Schema → MongoDB `$jsonSchema` pipeline and abstract repository pattern have no real consumers in M1. They move to M2 where Portfolio and share event schemas are the first consumers.
- [x] **ADR-003 and ADR-004: deferred to M2.** M1 implementations (AppError, MongoDB client) are simple enough without formal ADRs. Write them when M2 demands structured patterns.
- [x] **`@typescript-eslint/promise-function-async`: strict (`"error"`).** Per the project rule: "The ESLint configuration is the source of truth." Tune with rule options later if specific patterns need exemption.

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
- Kubernetes deployment manifests

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
- **Kubernetes:** Deployment + Service + ConfigMap + Secret. Vanilla manifests, no Helm or operator dependencies.

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
├─ k8s/
│  ├─ deployment.yaml
│  ├─ service.yaml
│  ├─ configmap.yaml
│  └─ secret.yaml
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
- [x] Add stub user seed script: a standalone script that writes a known user document to prove MongoDB write/read (not startup-time logic; gets a proper schema in M2)
- [x] Add `GET /api/health` route handler returning `{ status: "ok", db: "connected" | "disconnected" }`
- [x] Add landing page (`src/app/page.tsx`): minimal styled page confirming the app is running
- [x] Add ESLint flat config (`eslint.config.mjs`): type-checked mode via `typescript-eslint` with `projectService: true`, `@next/eslint-plugin-next` flat config, `eslint-plugin-react`, `eslint-plugin-react-hooks`, and the full project rule set (see Section 7.1.1 below for complete config)
- [x] Add Jest configuration: TypeScript transform, path aliases, unit/integration separation
- [x] Add unit tests for environment validation (valid, missing, malformed)
- [x] Add integration test for MongoDB client (connects, health check)
- [x] Add `npm run validate` script: `build && lint && test`
- [x] Add Dockerfile (multi-stage: deps → build → runtime)
- [x] Add Kubernetes manifests (`k8s/`): Deployment, Service, ConfigMap, Secret
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
| `scripts/seed-users.ts` | create (stub user seed script) |
| `src/test/unit/shared/config/env.test.ts` | create |
| `src/test/integration/infrastructure/persistence/mongodb-client.int.test.ts` | create |
| `docker/Dockerfile` | create |
| `k8s/deployment.yaml` | create |
| `k8s/service.yaml` | create |
| `k8s/configmap.yaml` | create |
| `k8s/secret.yaml` | create |
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
- [x] stub user seed script runs successfully (writes and reads back a user document)
- [x] `npm run validate` passes (build + lint + test)
- [x] `docker build` succeeds
- [x] Kubernetes manifests are syntactically valid
- [x] DDD folder structure is established with placeholder READMEs or index files where helpful

---

### Milestone 2 — First thin vertical slice (manual ledger)

**Status:** Complete  
**Completed:** 2026-03-28  
**Validated:** `npm run validate` on 2026-03-28

**Goal:** prove the architecture with a manual "add acquisition → add disposal → view ledger" flow. No import parsing; data entered via forms.

This milestone is **GBP-only** and has **no calculation logic** — it proves the stack end-to-end.

#### Stakeholder decisions (2026-03-28)

- **Stub user:** `STUB_USER_ID` (string) in environment; seed script **upserts** by `userId`; all tenant-scoped documents use this value until authentication (ADR-007).
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
- [x] Update **stub user seed script**: read `STUB_USER_ID`, **upsert** by `userId` (no duplicate logical users on re-run)

**Application**

- [x] Use cases / command handlers: create portfolio, add acquisition, add disposal, list ledger (names match ubiquitous language)

**Interfaces**

- [x] Next.js App Router: portfolio creation, acquisition/disposal **forms**, **ledger** view
- [x] Route handlers or server actions for mutations and queries; validate HTTP payloads in the interface layer
- [x] Resolve current user from validated **`STUB_USER_ID`** in config

**Tests**

- [x] Unit tests: domain schemas; UK tax-year derivation from date-only values
- [x] Integration tests: repository CRUD (existing `src/test/integration/` pattern)

#### Likely files to create or modify

| File | Action |
|------|--------|
| `docs/adrs/003-repository-abstraction-design.md`, `004-error-taxonomy.md` | create (align naming with `001-` / `002-` in `docs/adrs/`) |
| `src/shared/config/env.ts` | extend — validate `STUB_USER_ID` |
| `.env.example` | add `STUB_USER_ID` |
| `scripts/seed-users.ts` | modify — upsert by `userId`, use env |
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

#### Scope

- XLSX file parsing (using a library such as `xlsx` or `exceljs`)
- Parser for the E\*Trade "ByBenefitType" hierarchical format: extract Grant → Vest Schedule → Tax Withholding records
- Normalisation service: transform parsed rows into acquisition events (net shares = Vested Qty − Shares Traded for Taxes; market value derived from Tax Withholding "Taxable Gain" / Vested Qty)
- Validation: missing fields, inconsistent quantities, unknown record types, date format normalisation
- Import review UI: show parsed events before committing to the portfolio
- Error surface: clear messages for unparseable rows, missing market values, etc.
- Unit tests for parser, normaliser, and validator
- **Deferred:** sell transaction import (requires a data source with execution prices, which the current PDF does not provide)

#### Data source gap: sell transactions

The E\*Trade "Stock Plan Orders" PDF does not include sale prices or proceeds. Before Milestone 3 ships, investigate whether the E\*Trade "Gains & Losses" report or individual trade confirmations provide execution prices in a parseable format (CSV or XLSX). If not, disposals continue to be entered manually (as established in Milestone 2) until a suitable data source is identified.

#### Exit criteria

- [ ] XLSX upload → parsed vesting events displayed for review → committed as acquisitions in portfolio
- [ ] validation errors surfaced clearly
- [ ] normalised data matches manual spot checks against the sample XLSX
- [ ] `npm run validate` passes

---

### Milestone 4 — Calculation engine foundation

**Goal:** implement the Section 104 pool calculation engine (GBP-only) with explainable outputs, independently testable from the UI.

#### Scope

- Section 104 pool: formation, partial disposal (pool_cost × sold/held), roll-forward
- Reproduce HS284 Example 3 as the primary acceptance test (see Section 2.1)
- Calculation input/output contracts (domain schemas)
- Per-disposal breakdown: matching source (pool only in this milestone), allowable cost, gain/loss
- Pool roll-forward schedule: pool shares and pool cost after each event
- Tax-year summary: total gains, total losses, net gains
- Annual exempt amount (AEA) application
- Loss netting: current-year losses before brought-forward; brought-forward only down to AEA
- CGT rate computation: user-selected tier (basic/higher/additional), including the 2024-25 mid-year rate change
- Calculation service in `src/domain/services/` — pure logic, no DB or UI dependencies
- Unit tests for every calculation rule; HS284 Example 3 as an end-to-end calculation test
- **Deferred to a later milestone:** same-day matching, 30-day matching, FX conversion

#### Exit criteria

- [ ] HS284 Example 3 pool arithmetic reproduced exactly
- [ ] per-disposal breakdowns and pool roll-forward are correct and inspectable
- [ ] AEA, loss netting, and rate-tier logic are covered by tests
- [ ] calculation service is independently testable (no DB or UI coupling)
- [ ] `npm run validate` passes

---

### Milestone 5 — FX conversion and share matching rules

**Goal:** add USD→GBP conversion using Bank of England rates, and implement same-day and 30-day matching rules.

#### Scope

- BoE FX rate download script (`scripts/fetch-boe-fx-rates.ts`): fetch XUDLUSS series, store in MongoDB, handle missing dates (fall back to most recent prior published rate)
- FX rate repository + domain service: look up rate by date, apply fallback, flag when fallback is used
- Per-transaction GBP conversion: acquisition costs and disposal proceeds converted at transaction-date rate
- Same-day matching rule: disposals matched to same-day acquisitions first
- 30-day (bed and breakfasting) rule: remaining disposals matched to acquisitions within 30 days after disposal
- Updated calculation engine: matching priority order (same-day → 30-day → Section 104 pool)
- Visible applied FX rate per transaction in outputs
- Updated per-disposal breakdown: matching source now shows "same day", "30-day", or "pool"
- Unit tests for FX lookup, fallback logic, and all matching rules
- Integration test for FX rate repository

#### Exit criteria

- [ ] FX download script works and populates rates in MongoDB
- [ ] calculation engine applies correct matching order
- [ ] all PRD Appendix 4 validation points pass (same-day, 30-day directionality, FX per-transaction)
- [ ] `npm run validate` passes

---

### Milestone 6 — User trust and operational hardening

**Goal:** make the system credible for real user-facing use.

#### Scope

- "Do I need to report?" section per tax year (PRD Appendix 1 thresholds)
- Reporting threshold logic: 4×AEA proceeds (pre-2023-24), £50,000 (2023-24 onward)
- RSU timing explanations (same-day vest+sell, 30-day scenarios) — in-product plain-English guidance
- 2024-25 rate change flag and explanation
- Computation pack export: print view or PDF with transaction ledger, FX rates, per-disposal computations, pool roll-forward
- CSV export of computed disposals with matching source
- Data quality warnings: missing vest prices, incomplete portfolios, unresolved items
- Assumption labelling: "additional-rate assumption" (or selected tier) visible on all outputs
- "Not professional tax advice" disclaimer
- Refined Docker and Kubernetes assets
- Security review: env var handling, no secrets in logs, sensitive data treatment
- Updated README and operational docs

#### Exit criteria

- [ ] outputs are useful for Self Assessment record keeping
- [ ] deployment assets are production-credible
- [ ] material assumptions are surfaced in UI and exports
- [ ] `npm run validate` passes

---

## 8. Open Questions

### 8.1 Resolved

| # | Question | Resolution |
|---|----------|-----------|
| 1 | Primary top-level object | Portfolio |
| 2 | Single-user or multi-user | Multi-user (stub user for now) |
| 3 | Authentication timing | Deferred; stub user in M1 |
| 4 | Import format first | E\*Trade "ByBenefitType" XLSX for acquisitions |
| 5 | Minimum end-to-end workflow | Manual add acquisition + disposal + ledger (M2) |
| 6 | Calculation scope for first engine | Section 104 pool, GBP-only, HS284 Example 3 (M4) |
| 7 | CGT rate assumption | User-selectable tier (basic/higher/additional), default additional |
| 8 | Sell-to-cover treatment | Not modelled as disposals; net shares only |
| 9 | FX rate source mechanism | On-demand download script, seeded into MongoDB |
| 10 | Local MongoDB | Not supported; Atlas required for all environments |
| 11 | Kubernetes specifics | Vanilla manifests, no provider assumptions |
| 12 | Tax filing/submission | Never; permanent product boundary |
| 13 | Sell transaction prices | Assume available eventually; manual entry acceptable as fallback |
| 14 | Stock Options / ESPP scope | RSU-only. Options and ESPP are permanently out of scope. Import pipeline must filter them out. |
| 15 | Tax Withholding "Taxable Gain" currency | USD. Divide by Vested Qty to derive per-share USD market value at vest for CGT acquisition cost. |
| 16 | Stub user for Milestone 2+ | `STUB_USER_ID` (string) in env; seed **upserts** by `userId`; tenant-scoped documents use this until auth (ADR-007). |
| 17 | Manual acquisition/disposal economics (M2) | Store gross/price components and **fees in separate fields**; derive net for display; M4 uses the same explicit fields. |
| 18 | Ledger tax-year grouping (M2) | **UTC date-only** calendar dates; UK tax year **6 April–5 April** for grouping. |
| 19 | Symbol field (M2) | Single **free-text ticker** per event; ISIN deferred unless M3+ requires it. |
| 20 | PRD workspace theme vs Portfolio | **Portfolio** is the top-level organising entity; PRD §8.1 updated to match (2026-03-28). |

### 8.2 Still open

Workspace and Milestone 2 data-modelling choices above are resolved in Section 3.2, Milestone 2 (Section 7), and PRD §8.1. Remaining product questions:

- **Multiple symbols:** The sample data is all MDB. If the user holds RSUs in multiple companies, is that a realistic scenario to support? (Milestone 2 allows multiple tickers in one portfolio; full product stance TBD.)
- **Authentication provider:** When auth is eventually added, is there a preferred provider (NextAuth, Clerk, Auth0, etc.)?
- **Brought-forward losses:** How should the user input their available loss pool from prior years? A simple number input per tax year on the portfolio?

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
| ADR-007: Authentication and user model | When auth is added | Provider choice, session model, user document shape, migration from stub user. |

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

- [ ] **HS284 Example 3:** Section 104 pool formation and partial-disposal fraction logic reproduced exactly
- [ ] **Same-day matching:** disposal and acquisition on the same day match first (M5)
- [ ] **30-day rule directionality:** acquisitions within 30 days *after* disposal matched in priority (M5)
- [ ] **FX handling:** per-transaction GBP conversion, not "compute USD gain then convert" (M5)
- [ ] **Loss utilisation:** current-year before brought-forward; brought-forward only down to AEA (M4)
- [ ] **2024-25 rate change:** correct rates before/after 30 Oct 2024 in same tax year (M4)

---

## 11. Risks

- **Sell transaction data gap:** The available PDF export lacks execution prices. Manual entry of sale prices is an acceptable fallback, but reduces the product's self-service value. Mitigate by investigating E\*Trade "Gains & Losses" report and trade confirmations when approaching M3.
- **Import format brittleness:** The XLSX format is hierarchical, sparse, and uses mixed date formats. E\*Trade may change the export layout without notice. Mitigate with defensive parsing, clear validation errors, and a mapping approach.
- **Tax domain complexity escalation:** Same-day and 30-day matching interact with each other and with the pool in non-obvious ways. Mitigate by deferring matching rules to M5 (after pool mechanics are solid) and testing each rule independently.
- **CGT rate tier simplification:** The app asks the user to declare their tier rather than computing it. This is a deliberate simplification but may confuse users who don't know their band. Mitigate with clear in-product guidance.
- **Non-RSU data in imports:** The sample data includes Stock Options and ESPP events. These are permanently out of scope; the import pipeline must filter them out cleanly and inform the user what was excluded.
- **Premature over-modelling vs under-modelling:** Mitigate by building thin vertical slices and refactoring confidently (no backwards-compatibility constraint in early milestones).

---

## 12. Assumptions

- This is a multi-user self-service end-user product.
- The initial goal is architectural strength and one correct vertical slice, not complete tax-domain coverage.
- MongoDB Atlas is the only supported persistence target (no local MongoDB).
- Docker and Kubernetes are both relevant deployment targets.
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

---

## 14. Cursor Planning Prompt To Reuse

Use this prompt when starting or revising the plan:

> Read `docs/PRD.md` and `.cursor/rules/project.mdc`.
> Do not write code yet.
> Identify open questions, challenge weak assumptions, and update this implementation plan.
> Propose the smallest safe next milestone, the files likely to be created or changed, the validation strategy, and any ADRs that should be written before implementation.
