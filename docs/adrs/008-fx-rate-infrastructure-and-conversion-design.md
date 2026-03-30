# ADR-008: FX rate infrastructure and conversion design (Milestone 5)

**Status:** Accepted  
**Date:** 2026-03-30  
**Deciders:** Paul Done

## Context

RSU vest imports use USD (`import_usd` per ADR-005). The Section 104 calculation engine is GBP-only (`calculateGainsForSymbol`). The PRD requires per-transaction sterling conversion using a reasonable, consistent method — Bank of England daily USD/GBP spot (XUDLUSS), with missing dates handled by a documented fallback.

## Decision

### Data source and storage

- **Series:** BoE **XUDLUSS** — “Spot exchange rate, US $ into Sterling” (USD per 1 GBP).
- **Persistence:** Documents in MongoDB collection `fx_rates` with `date` (ISO `YYYY-MM-DD`, UTC calendar) and `usdPerGbp` (positive finite number). Unique index on `date`.
- **Population:** Script `npm run fetch:fx-rates` downloads a configurable date range (default from 2016-01-01 UTC to today), parses the BoE export, and **upserts** rows. Re-runs are idempotent.

The BoE Statistical Interactive Database export URL is **not** a versioned public API; if the response format changes, update `parseBoeXudlusResponse` in `src/infrastructure/fx/boe-fx-client.ts` and tests.

### Conversion formula

Because XUDLUSS is **USD per 1 GBP**:

`gbpAmount = usdAmount / usdPerGbp`

Gross consideration and fees are converted **separately** at the same rate (then summed for `totalCostGbp` on acquisitions), matching “sterling worth at the date of acquisition” per transaction components.

### Lookup and fallback

- For an event on date `D`, use the latest stored rate with `date ≤ D` (`findLatestOnOrBefore`).
- **Fallback flag:** `true` when the rate row’s `date` ≠ `D` (e.g. weekend or bank holiday with no publication).
- If **no** rate exists on or before `D`, calculation fails with a clear error (missing FX coverage).

### Application vs domain

- **Dynamic conversion at calculation time:** USD economics are **not** denormalised onto acquisition documents. The application layer loads `import_usd` rows, resolves FX, builds `CalcInput` with `totalCostGbp`, and calls `calculateGainsForSymbol`.
- **Domain:** `fx-lookup.ts` resolves `{ usdPerGbp, rateDateUsed, usedFallback }` from an `FxRate | null` row; repositories and BoE HTTP live in infrastructure.

### Disposals

Manual GBP disposals only in M5. USD disposal imports are out of scope until sell-side formats are known; the same lookup pattern will apply when added.

## Related

- ADR-005 (`import_usd` vs engine boundary).  
- `docs/PRD.md` — Appendix 2 (FX).  
- `docs/IMPLEMENTATION_PLAN.md` — Milestone 5 (FX) vs Milestone 6 (matching rules).
