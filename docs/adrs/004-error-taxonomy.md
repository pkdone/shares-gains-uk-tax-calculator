# ADR-004: Error Taxonomy

**Status:** Accepted  
**Date:** 2026-03-28  
**Deciders:** Paul Done

## Context

The application needs consistent, catchable errors for validation failures, business rule violations, persistence problems, configuration mistakes, and future import/parsing issues. A single undifferentiated `Error` type makes handling and HTTP mapping harder.

## Decision

### Base type

All application-thrown operational errors extend `AppError` in `src/shared/errors/app-error.ts`, which carries an optional machine-readable `code` string.

### Specialised subclasses

| Class | `code` | Use |
|-------|--------|-----|
| `ConfigurationError` | `CONFIG_INVALID` | Invalid or missing environment / config |
| `ValidationError` | `VALIDATION_FAILED` | Input or transport validation failed (Zod, etc.) |
| `DomainError` (`src/domain/errors/domain-error.ts`, extends `AppError`) | `DOMAIN_RULE` | Business invariant or domain rule violated |
| `PersistenceError` | `PERSISTENCE_FAILED` | MongoDB or repository unexpected failure |
| `ImportError` | `IMPORT_FAILED` | File/import pipeline failures (reserved for Milestone 3+) |

Constructors accept `(message: string, options?: { cause?: unknown })`. Subclasses set `code` and `name` appropriately.

### Usage

- **Interfaces / server actions:** validate payloads; throw `ValidationError` on Zod failure.
- **Application:** orchestration; translate domain failures to user-visible messages where needed.
- **Domain:** pure rules may throw `DomainError` or return `Result`-style outcomes; for this codebase, throwing `DomainError` for invariant breaches is acceptable where it keeps handlers simple.
- **Infrastructure:** repository implementations catch MongoDB errors and throw `PersistenceError`, optionally chaining `cause`.

## Consequences

- Callers can branch on `instanceof` or `error.code` without string-matching messages.
- New error categories require a new subclass and documentation update rather than ad hoc strings.
