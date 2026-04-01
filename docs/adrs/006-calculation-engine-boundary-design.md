# ADR-006: Calculation Engine Boundary Design (Milestone 4)

**Status:** Accepted  
**Date:** 2026-03-30  
**Deciders:** Paul Done

## Context

UK CGT for shares requires Section 104 pooling, per-disposal gains, annual loss netting, annual exempt amount (AEA), brought-forward loss limits, and (from 2024-25) mid-year main-rate changes. The product must keep this logic in the **domain** layer: testable, explainable, and independent of MongoDB and Next.js.

Milestone 4 delivers **GBP-only** pool mechanics and **pool-only** matching. Same-day and 30-day matching and FX are deferred to Milestone 5 (see ADR-005 for `import_usd` vs M4).

## Decision

### Location and purity

- **Location:** `src/domain/services/` for algorithms; `src/domain/schemas/calculation.ts` for canonical Zod contracts and inferred types.
- **Purity:** No imports from `application`, `infrastructure`, `interfaces`, or framework code. Domain may use `shared/errors` (`DomainError`) and existing domain helpers (e.g. `ukTaxYearLabelFromDateOnly`).
- **Entry point:** `calculateGainsForSymbol(input: CalcInput): CalcOutput` in `cgt-calculator.ts` — **one symbol per invocation**. Multi-symbol grouping is an application-layer concern.

### Input contract

- **`CalcInput`** includes: `symbol`, chronologically ordered `events` (acquisitions and disposals), `rateTier` (`basic` | `higher` | `additional`), and `broughtForwardLosses` (non-negative GBP; opening balance before the first tax year in the event stream).
- **Acquisitions** use `totalCostGbp` (gross consideration plus allowable fees) — aligned with `manual_gbp` ledger semantics. **`import_usd` rows must not be passed** until M5 provides sterling per transaction.
- Events are expected **sorted by `eventDate`**; the engine validates and throws `DomainError` if not.

### Penny precision and SA108 rounding

- **Pool cost** and **allowable cost on disposal** are held to **two decimal places** (pence).
- **Gain / loss per disposal** is computed at full precision (2dp) as `proceeds - allowableCost - fees`.
- **Rounded gain/loss** (SA108-style whole pounds) uses **round half-up** to the nearest integer for display and filing alignment; HMRC HS284 published examples use whole pounds at each step — we **do not** round pool fractions to whole pounds (stakeholder decision: track pennies).

### Section 104 pool

- One pool per symbol: `shares` and `costGbp` (2dp).
- **Acquisition:** add to pool.
- **Disposal:** allowable cost = `round2(poolCost * quantity / poolShares)`; pool reduced by that cost and quantity; gain = proceeds − allowable cost − disposal fees.
- Disposal quantity cannot exceed pool shares — `DomainError`.

### Tax year processing

- **Single pass** over all events in date order; pool carries across UK tax years (6 April–5 April, UTC date-only labels via `ukTaxYearLabelFromDateOnly`).
- **Disposal results** carry `taxYear` from the disposal `eventDate`.
- **Annual summaries** are computed **after** all disposals: group by tax year, sort years chronologically, apply same-year loss netting, then brought-forward losses (capped: cannot use BF to reduce net chargeable gains below AEA — `max BF = min(BF_available, max(0, netGains - AEA))` when `netGains > AEA`), then AEA, then CGT at applicable rates.

### 2024-25 split rates

- Disposals **before** 2024-10-30 use pre-change main rates (10% / 20% by tier); **on or after** 2024-10-30 use post-change rates (18% / 24%).
- **AEA allocation:** apply AEA against **higher-rate gains first** (post-30-Oct bucket before pre-30-Oct within the same tax year for higher/additional tiers).

### Loss allocation across rate bands (same year)

- When netting same-year losses against gains split across pre/post Oct 2024, **proportional** reduction by band share of total gains before loss (documented simplification; HMRC does not prescribe a single allocation order for every case).

### Outputs

- **`DisposalResult`:** matching source `section-104-pool` only in M4; per-disposal breakdown, pool after state, tax year.
- **`PoolSnapshot`:** optional narrative steps for explainability.
- **`TaxYearSummary`:** gains, losses, BF used, AEA, taxable gain, CGT due, losses carried forward, rate breakdown.

### Application layer (out of scope for M4)

- Loading acquisitions/disposals from repositories, filtering `manual_gbp`, and calling `calculateGainsForSymbol` is **not** implemented in M4 — wiring comes in a later milestone.

## Consequences

- Unit tests can run without Atlas or Next.js; HS284 Example 3 is exercised as a golden scenario (penny-precision pool; whole-pound rounded gains; correct tax-year grouping).
- UI and exports will map from `CalcOutput` without duplicating tax logic.

## Amendment (2026-03-31): Product scope for holding-level UI

The **end-user calculation** for a holding no longer applies **rate tier**, **brought-forward losses**, **AEA**, or **CGT due** in the engine path used for that screen. **`CalcInput`** is now **`symbol` + `events` only**. **`computeAnnualSummaries`** aggregates **per–tax-year total gains, total losses, and net (gains − losses)** from disposal lines for **this symbol only** — not a personal SA108 position. Full HMRC loss netting / AEA / rate rules remain documented above for reference and tests may still target pool and disposal mechanics (`cgt-calculator`, `share-matching`).

## Related

- `docs/PRD.md` — Appendices 1 and 4; `docs/references/hs284-example-3-2024-notes.md`.
- ADR-005 (M4/M5 boundary for `import_usd`).
- ADR-011 (holding scope; CSV and `bf` removed).
