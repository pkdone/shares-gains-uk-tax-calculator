# ADR-012: Domain terminology roadmap (USD consideration, computation pack exports)

**Status:** Accepted (roadmap)  
**Date:** 2026-04-09

## Context

Code and UI use shorthand names (`considerationUsd`, `ComputationPack`, filenames such as `build-calculation-computation-pack-pdf.ts`) that are clear to engineers but may diverge from **PRD §glossary** and user-facing copy over time. A full rename touches Zod schemas, MongoDB field paths, imports, tests, and exports.

## Decision

1. **No breaking rename in a single mechanical PR without a coordinated PRD/glossary pass.** Product language for money fields and export names must stay aligned with `docs/PRD.md` and stakeholder-facing text.
2. **When renaming proceeds**, prefer:
   - **Acquisition economics:** a single canonical field name for “consideration in USD” (e.g. scoped by `economicsKind`) documented in the PRD glossary, then reflected in `src/domain/schemas` and persistence via one migration or greenfield `db:init` policy as appropriate.
   - **Computation pack:** keep “computation pack” as the user-facing term; align TypeScript module and type names (`*ComputationPack*`) with that phrase or an explicit `CapitalGainsComputationPack` alias in domain types if it reduces ambiguity.
3. **Tracking:** Implementation batches should reference this ADR and update `docs/IMPLEMENTATION_PLAN.md` when a rename milestone is scheduled.

## Consequences

- Follow-up work is **documented** but **not** implied by unrelated refactors.
- Future renames should include a short changelog note for CSV/PDF/JSON export consumers.

## Related

- `docs/PRD.md` (glossary and equity economics)
- ADR-011 (holding scope and calculation disclaimers)
