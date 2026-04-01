# ADR-010: Exports, computation pack, and reporting thresholds (Milestone 7)

**Status:** Accepted (amended 2026-03-31)  
**Date:** 2026-03-30  
**Deciders:** Paul Done

**Amendment (2026-03-31):** The app focuses on **holding-level** capital gains and losses (see PRD §1). **Computation pack** is print-only at `/holdings/[holdingId]/computation-pack` with a **short** scope disclaimer (not overall CGT liability). **CSV export**, **`portfolio_calculation_prefs`**, reporting-threshold UI, and **`bf` / tier query params** were **removed** from managed schema and routes.

## Context

Milestone 7 originally targeted broader reporting and export scope. **Current product:** print-friendly computation pack mirroring the holding calculation; **no** portfolio-wide reporting workflow; **do not infer reporting obligation from a single holding** (PRD Appendix 1).

## Decision

### Computation pack

- **Print-only:** a dedicated route (`/holdings/[holdingId]/computation-pack`) renders the same calculation artefacts as the main calculation page (FX table, pool roll-forward, disposals, tax-year summaries) in a **print-friendly** layout. Users save via the browser (Print → Save as PDF). Global CSS hides elements marked `no-print` when printing.

### CSV export

- **Superseded (2026-03-31):** The disposals CSV route was **removed**; use ledger and calculation views instead.

### Reporting thresholds

- **Not implemented** in the shipping app. PRD Appendix 1 remains **reference** for possible future work; users must not infer obligation from one holding alone.

## Consequences

- Legacy MongoDB databases may still contain obsolete collections from earlier experiments; **`db:init`** matches the current managed set only.
- User-wide CGT or reporting UX remains a **future** product decision if scope expands.
