# ADR-003: Repository Abstraction Design

**Status:** Accepted  
**Date:** 2026-03-28  
**Deciders:** Paul Done

## Context

The application persists domain data in MongoDB Atlas. Domain rules and use cases must stay free of driver details, testable with in-memory or fake implementations later, and aligned with DDD dependency direction (`interfaces` / `application` → `domain` ← `infrastructure`).

## Decision

### Interfaces in the domain layer

Repository **contracts** live under `src/domain/repositories/` as TypeScript interfaces. They use domain types and identifiers (strings for `userId`, `holdingId`, etc.) — never `MongoClient`, `Db`, or BSON types.

### Implementations in infrastructure

Concrete classes under `src/infrastructure/repositories/` implement those interfaces. They:

- obtain a `MongoClient` via `getMongoClient()` from `src/infrastructure/persistence/mongodb-client.ts`
- map between domain shapes and persistence documents (ObjectIds, dates)
- throw `PersistenceError` (see ADR-004) on unexpected database failures

### Collections for Milestone 2

To keep MongoDB `$jsonSchema` validators simple and avoid complex `oneOf` trees, **acquisitions** and **disposals** are stored in **separate collections** (`acquisitions`, `disposals`). Both reference a holding by `holdingId` and scope by `userId`. A future milestone could merge into a single `share_holding_events` collection if product needs justify the added validator complexity.

### Schema enforcement

Collection validators are derived from Zod persistence schemas via the shared Zod → JSON Schema sanitisation pipeline and applied idempotently (`createCollection` / `collMod`) by **`initMongoDatabase`** (operator command **`npm run db:init`**), not during normal application requests.

### Optional base helper

Shared behaviour (e.g. ensuring validators are applied) may live in small infrastructure modules; repository classes remain explicit per aggregate/collection for clarity in early milestones.

## Consequences

- Domain stays portable; swapping MongoDB for another store would replace infrastructure only.
- Two event collections mean two repository implementations and parallel indexes; queries that need a unified ledger compose results in the application layer.
