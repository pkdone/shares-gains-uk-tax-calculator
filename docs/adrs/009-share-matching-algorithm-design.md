# ADR-009: Share matching algorithm design (Milestone 6)

**Status:** Accepted  
**Date:** 2026-03-30  
**Deciders:** Paul Done

## Context

UK CGT for shares of the same class requires HMRC’s identification order (post–6 April 2008): **same-day** matching, then **30-day** (bed and breakfast) matching, then **Section 104** pool. CG51560 requires that all acquisitions on the same day are treated as a **single** acquisition and all disposals on the same day as a **single** disposal.

Milestone 4–5 implemented **pool-only** matching. Milestone 6 extends the domain engine to the full order while keeping `CalcInput` unchanged (sorted `CalcEvent` stream, GBP-only).

## Decision

### Schema (`src/domain/schemas/calculation.ts`)

- **`matchingSourceSchema`:** `z.enum(['same-day', 'thirty-day', 'section-104-pool'])`.
- **`matchingTrancheSchema`:** `{ source, quantity, allowableCostGbp }` per tranche, plus optional **`acquisitionDate`** (ISO date) on **same-day** and **30-day** tranches — the acquisition lot the tranche was identified against (omitted on **Section 104 pool** tranches). Used by the calculation UI to explain how much of a given day’s acquisitions entered the pool vs matched to disposals.
- **`DisposalResult`:** replaces single `matchingSource` with **`matchingBreakdown`**: `z.array(matchingTrancheSchema).min(1)`. Aggregate `allowableCostGbp` equals the sum of tranche allowable costs (2dp). `gainOrLossGbp` = `grossProceedsGbp - disposalFeesGbp - allowableCostGbp` (same formula as before). `roundedGainOrLossGbp` = `Math.round(gainOrLossGbp)` (SA108-style whole pounds on the **aggregate** disposal).

### Aggregation (CG51560)

Before matching, **aggregate by ISO date** (`YYYY-MM-DD`):

- **Acquisitions** on the same day: sum quantities; sum `totalCostGbp` (2dp).
- **Disposals** on the same day: sum quantities; sum `grossProceedsGbp` and `feesGbp` (2dp).

### Phase 1 — Same-day and 30-day

Process **disposal dates in ascending order**. For each aggregated disposal of quantity `Q`:

1. **Same-day:** Match up to `Q` against acquisition remaining on **the same date**. Allowable cost is proportional: `round2(totalCost × matchedQty / totalQty)` (or full remaining cost when fully exhausted).
2. **30-day:** For remaining `Q`, match against acquisitions on dates **strictly after** the disposal date and **on or before** disposal date + 30 calendar days (UTC date-only). **FIFO by acquisition date** (earlier dates first). Within each acquisition lot, cost is proportional to quantity taken.
3. **Remainder** of `Q` is the **pool** quantity for that disposal date (handled in phase 2).

Mutate a working copy of **remaining acquisition** quantity and cost after each match so later disposals and phase 2 see correct leftovers.

### Phase 2 — Section 104 pool

Merge **all event dates** (acquisitions and disposals), sort ascending. For each date:

1. **Acquisition:** If remaining acquisition quantity for that date after phase 1 is positive, **`addAcquisition`** to the Section 104 pool (2dp cost).
2. **Disposal:** If the **pool** portion of that date’s aggregated disposal (from phase 1) is positive, **`disposeFromPool`** for that quantity. Append a **`section-104-pool`** tranche with that allowable cost.

**Same calendar day ordering:** Apply acquisition-to-pool **before** pool disposal on that day so same-day shares matched in phase 1 do not enter the pool; only **unmatched** acquisition remainder is added, then **unmatched** disposal remainder is taken from the pool.

### Proceeds and fees

`grossProceedsGbp` and `disposalFeesGbp` on `DisposalResult` remain **totals for the aggregated disposal**. Gains are not split per tranche for SA108 rounding; one rounded figure per disposal event.

### Purity and location

- Algorithm lives in **`src/domain/services/share-matching.ts`** (helpers + orchestration used by `cgt-calculator.ts`).
- **`section-104-pool.ts`** is unchanged (`addAcquisition`, `disposeFromPool`, `roundMoney2dp`).

## Consequences

- `calculateGainsForSymbol` produces `matchingBreakdown` with one or more tranches per disposal; HS284 Example 3 (pool-only path) becomes a single `section-104-pool` tranche.
- Application layer (`runCalculationForSymbol`) unchanged except removal of the Milestone 6 placeholder warning; UI should render `matchingBreakdown`.
- Sell-side broker import and USD disposals remain out of scope; manual GBP disposals exercise matching.

## Related

- `docs/PRD.md` — Appendix 1 (identification order), Appendix 4 (validation).
- ADR-006 (calculation boundary), ADR-008 (FX).
