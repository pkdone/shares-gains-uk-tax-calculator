# ADR-011: Holdings — one symbol per holding

**Status:** Accepted  
**Date:** 2026-03-31  
**Deciders:** Product / engineering alignment

## Context

The product originally modelled a **portfolio** as a free-text named container that could hold **multiple tickers**, with Section 104 logic applied per symbol within that container.

Stakeholders chose to align the **organising entity** with **one stock symbol**: each saved workspace row is a **holding** identified by an uppercase ticker (suffixes such as `BRK.B` allowed).

## Decision

- **Ubiquitous language:** use **Holding** (not Portfolio) for the top-level saved entity per user per symbol.
- **Domain:** `Holding` / `HoldingCreate` with `symbol` (canonical uppercase via `stockSymbolSchema`). Events reference `holdingId`.
- **Persistence:** MongoDB collection **`holdings`** with unique index `{ userId: 1, symbol: 1 }`. Acquisitions and disposals use BSON `holdingId` (ObjectId) referencing that holding.
- **Routes:** App Router under **`/holdings`** and **`/holdings/[holdingId]`** (replacing `/portfolios`).
- **Import:** E\*Trade By Benefit Type preview **filters** drafts to the holding’s symbol; **skipped** rows are summarised by other symbols with counts.
- **No migration script:** greenfield / `db:teardown` + `db:init` for environments that need a clean slate.

## Consequences

- PRD §8.1 and `IMPLEMENTATION_PLAN.md` stakeholder tables updated; historical “multiple tickers per portfolio” is superseded.
- ADR-003 updated: repository ids use `holdingId` for event collections.

## Amendment (2026-03-31): Holding calculation scope

The calculation and computation pack show **capital gains and losses (chargeable gains mechanics) for this holding** — matching, pool roll-forward, disposals, and simple per–tax-year gain/loss totals. They do **not** estimate **overall personal CGT liability**. They do **not** include user-selectable CGT rate tier, brought-forward losses (not holding-scoped), annual exempt amount, or CGT tax due. The **disposals CSV** export and **`bf` / `rateTier` query parameters** were removed. In-product **2024–25 main-rate change** messaging was removed from the tax year summary UI. See simplified `computeAnnualSummaries` in `cgt-annual-summary.ts`.

## Related

- `docs/PRD.md` §8.1  
- `docs/IMPLEMENTATION_PLAN.md` §3.2, §3.4, §8.1  
- ADR-005 (import pipeline), ADR-007 (auth / tenant id), ADR-006 (engine boundary — annual summary shape simplified for product scope)
