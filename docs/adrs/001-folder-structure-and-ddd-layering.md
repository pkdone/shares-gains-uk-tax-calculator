# ADR-001: Folder Structure and DDD Layering

**Status:** Accepted
**Date:** 2026-03-28
**Deciders:** Paul Done

## Context

The application needs a source code structure that:

- enforces clear separation between business rules, orchestration, persistence, and UI
- supports iterative product discovery without requiring broad rewrites
- makes dependency direction obvious to engineers and AI-assisted tooling
- aligns with the project rule (`project.mdc`) requirement for Domain-Driven Design

The PRD describes a domain with non-trivial business rules (UK CGT matching, Section 104 pooling, FX conversion, import normalisation). Coupling any of these to the web framework or database driver would make them hard to test and easy to break.

## Decision

Adopt a four-layer DDD structure under `src/`, plus a shared utilities layer:

```
src/
├─ domain/           # Core business logic — no framework or DB dependencies
│  ├─ schemas/       # Canonical Zod schemas (source of truth for domain shape)
│  ├─ entities/      # Domain entities
│  ├─ value-objects/  # Immutable domain concepts (e.g. TaxYear, Money, FxRate)
│  ├─ aggregates/    # Aggregate roots (if needed beyond entities)
│  ├─ services/      # Domain services (logic that doesn't fit one entity)
│  ├─ events/        # Domain events
│  └─ repositories/  # Repository interfaces only (no implementations)
├─ application/      # Use cases, orchestration, DTO mapping at boundaries
├─ infrastructure/   # Concrete implementations of domain ports
│  ├─ persistence/   # MongoDB client, schema registry, Zod→JSON Schema pipeline
│  │  └─ schemas/    # Persistence schemas (derived from domain schemas)
│  └─ repositories/  # Repository implementations (MongoDB-backed)
├─ app/              # Next.js App Router (interfaces layer)
│  ├─ api/           # Route handlers
│  └─ (pages)/       # React pages, layouts, components
├─ shared/           # Cross-cutting technical utilities only
│  ├─ config/        # Environment validation, app config
│  └─ errors/        # AppError base class and error taxonomy
└─ test/             # All tests (mirrors src/ structure)
   ├─ unit/
   └─ integration/
```

### Dependency rule

Dependencies point **inward**:

```
app (interfaces) → application → domain ← infrastructure
```

- `domain` depends on nothing outside itself (and standard library / Zod).
- `application` depends on `domain` (interfaces, schemas, entities) but not on `infrastructure` or `app`.
- `infrastructure` depends on `domain` (implements repository interfaces, derives persistence schemas) and may depend on `application` for port interfaces.
- `app` (interfaces) depends on `application` for use cases and on `domain` for types/schemas. It does not import from `infrastructure` directly.
- `shared` may be imported by any layer. It must not contain domain concepts.

### Schema derivation

All canonical Zod schemas live in `src/domain/schemas/`. Other layers derive from them:

| Layer | Schema location | Derivation |
|-------|----------------|------------|
| Domain | `src/domain/schemas/` | Canonical definitions |
| Persistence | `src/infrastructure/persistence/schemas/` | `.extend()` domain bases (e.g. `shareAcquisitionBaseSchema`, `portfolioCreateSchema`) with tenancy and timestamps; keep string ids in Zod for `$jsonSchema`; map BSON `ObjectId` in repository code only |
| Transport | `src/app/` (co-located with route handlers) | `.pick()`, `.omit()`, `.extend()` for request/response and form payloads (e.g. `portfolioNameSchema` for create-portfolio) |

Never duplicate a schema definition. Always derive via Zod composition methods.

### Test layout

Tests live under `src/test/`, never co-located with production code:

- `src/test/unit/domain/...` tests `src/domain/...`
- `src/test/integration/infrastructure/...` tests `src/infrastructure/...`
- Unit test files: `*.test.ts`
- Integration test files: `*.int.test.ts`

## Consequences

### Positive

- Business rules (CGT calculations, matching, pooling) are testable without a database or web server.
- Schema derivation eliminates drift between domain, persistence, and transport shapes.
- The dependency rule prevents accidental coupling (e.g. MongoDB driver usage in domain services).
- New import formats or calculation rules can be added without touching the UI layer.
- AI-assisted tooling can navigate the codebase by convention.

### Negative

- More files and directories than a flat structure, even for small features.
- Indirection between repository interfaces (domain) and implementations (infrastructure) adds cognitive load for simple CRUD.
- The application layer may feel thin in early milestones — this is acceptable; it becomes more valuable as orchestration complexity grows.

### Risks

- Over-engineering risk if the domain layer accumulates abstractions faster than real business rules. Mitigate by keeping entities and services minimal until a concrete use case demands them.
- The `app/` directory serves double duty as both Next.js convention and the "interfaces" DDD layer. This is pragmatic but requires discipline to keep it thin (no business logic in route handlers or React components).

## References

- `project.mdc` — Layer responsibilities and dependency rule
- `docs/IMPLEMENTATION_PLAN.md` — Section 5 (Technical Architecture) and Section 6 (Repository Structure)
