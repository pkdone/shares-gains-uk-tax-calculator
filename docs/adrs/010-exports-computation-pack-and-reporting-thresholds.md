# ADR-010: Exports, computation pack, and reporting thresholds (Milestone 7)

**Status:** Accepted (amended 2026-03-31)  
**Date:** 2026-03-30  
**Deciders:** Paul Done

**Amendment:** The calculation page no longer shows portfolio-level “Do I need to report?” guidance or persisted **Saved defaults**. The **`portfolio_calculation_prefs`** collection was removed from managed schema (`db:init`). Brought-forward losses apply only via the **`bf`** query parameter on calculation, computation pack, and CSV export URLs. The domain logic that implemented HMRC-style reporting thresholds (`reporting-thresholds.ts`, `getPortfolioReportingOverview`) was removed with that UI.

## Context

Milestone 7 requires outputs suitable for Self Assessment record keeping, portfolio-level “Do I need to report?” guidance (PRD Appendix 1), persisted user preferences for brought-forward losses, and exports without introducing a PDF generation stack in the first iteration.

## Decision

### Computation pack

- **Print-only:** a dedicated route (`/portfolios/[portfolioId]/computation-pack`) renders the same calculation artefacts as the main calculation page (FX table, pool roll-forward, disposals, tax-year summaries) in a **print-friendly** layout. Users save via the browser (Print → Save as PDF). Global CSS hides elements marked `no-print` when printing.

### CSV export

- **GET** route ` /portfolios/[portfolioId]/disposals-export` returns `text/csv` with one row per disposal for the **selected symbol** and current rate tier / brought-forward inputs (aligned with the calculation query string). Columns include symbol, dates, tax year, proceeds, fees, allowable cost, gain/loss, rounded gain, and a semicolon-separated matching breakdown.

### Reporting thresholds

- **Proceeds:** portfolio-wide **sum of gross disposal proceeds** per UK tax year (all symbols) drives the legacy **4× AEA** rule (2016–17–2022–23) and the **£50,000** rule from **2023–24** onward when the user declares **Self Assessment** registration (stored in `portfolio_calculation_prefs`).
- **Taxable-gain signal:** for each tax year, the tool **sums** `taxableGainGbp` from each symbol’s engine run using the **same** brought-forward and tier inputs. This is an **approximation**: the engine applies the annual exempt amount **per symbol**, whereas HMRC applies one AEA per person per year across all gains. The UI states this limitation explicitly.

### Brought-forward and SA flag persistence

- Collection **`portfolio_calculation_prefs`**: one document per `(portfolioId, userId)` with `broughtForwardLossesGbp` and `registeredForSelfAssessment`. The calculation page uses stored values unless the **`bf`** query parameter is present (override for ad-hoc runs).

## Consequences

- Existing deployments may still have a legacy **`portfolio_calculation_prefs`** collection in MongoDB; it is no longer created or used by the app.
- Portfolio-wide CGT liability remains a **future enhancement** if a single combined multi-symbol annual computation is required.
