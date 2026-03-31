# ADR-005: Import Pipeline Design (Milestone 3)

**Status:** Accepted  
**Date:** 2026-03-28  
**Deciders:** Paul Done

## Context

The product must import RSU vesting data from broker exports. Milestone 3 targets the E\*Trade / Morgan Stanley at Work **"By Benefit Type"** XLSX (`ByBenefitType`-style hierarchical sheet). The PRD also describes a future **mapping-based** importer and multiple formats; those are not in scope for M3.

Imports must respect DDD boundaries: no MongoDB or `xlsx` in `src/domain`; canonical acquisition shapes live in `src/domain/schemas` with persistence derived via `.extend()` / discriminated unions.

## Decision

### Pipeline stages

1. **Upload (interfaces):** User selects an `.xlsx` file on the holding screen. The file is posted to a **server action** (or equivalent App Router handler) with a documented size limit.
2. **Read (infrastructure):** Bytes are parsed with the **`xlsx`** library into a **rectangular grid** (`string[][]`) for the target sheet (`Restricted Stock` if present, else first sheet).
3. **Parse (domain):** A pure function interprets the hierarchical **Row Kind** rows: `Grant` → `Vest Schedule` → `Tax Withholding`. It emits typed intermediate rows.
4. **Normalise (domain):** Tax Withholding rows become **draft acquisitions** with **`economicsKind: 'import_usd'`**: `considerationUsd` and `feesUsd` (fees USD default `0` in M3), **net quantity** = Vested Qty − Shares Traded for Taxes, **symbol** from the row, **eventDate** as UTC date-only. Per product decision #15, **Taxable Gain** is USD; **per-share USD** = Taxable Gain ÷ Vested Qty (row); **total gross USD** = per-share × net quantity.
5. **Validate (domain):** Missing fields, non-positive net quantity, unrecognised row kinds, and **non-RSU** `Benefit Type` values are rejected or filtered with messages. Stock Options and ESPP are **excluded** from scope (filtered with user-visible counts).
6. **Review (interfaces):** User sees a preview table of drafts before commit.
7. **Commit (application + infrastructure):** Drafts are validated against `shareAcquisitionImportUsdSchema` and **bulk inserted** via the acquisition repository.

### Acquisition economics: `manual_gbp` vs `import_usd`

- **`manual_gbp`:** Milestone 2 behaviour — `considerationGbp`, `feesGbp`. Used for hand-entered acquisitions.
- **`import_usd`:** Vest imports — `considerationUsd`, `feesUsd`. **No GBP fields** on the document until Milestone 5 derives sterling per transaction.

### Milestone 4 boundary (calculation engine)

The Section 104 pool engine (M4) is **GBP-only** and operates on acquisitions whose economics are expressible in sterling for pool cost. Therefore:

- Acquisitions with **`import_usd`** are **not** fed into M4 calculation inputs until **Milestone 5** adds per-transaction USD→GBP (Bank of England) and populated sterling fields or an equivalent calculation contract.
- The **ledger** continues to show **`import_usd`** rows with **USD** amounts and a clear **FX / calculation pending** stance until M5.

This avoids inventing FX in M3–M4 or "provisional GBP" that could be mistaken for final tax numbers.

### Non-goals (Milestone 3)

- Generic **column-mapping UI** (PRD long-term).
- **Sell / disposal** import (no execution prices in the Orders PDF; research deferred pre-M5).
- **PDF** parsing.
- **Authentication** beyond stub user.

### Test strategy

Real customer exports are **not** committed (see `IMPLEMENTATION_PLAN.md` Section 2.2). CI uses a **minimal committed fixture** under `src/test/fixtures/import/` with stable headers aligned to the parser. Adjust header/column mapping when validating against a live export if names differ.

## Consequences

- Domain stays free of file-format libraries; tests can feed **grids** without binary XLSX.
- MongoDB validators must accept the **`economicsKind`** discriminated shape (`db:init` / `collMod`).
- Users may hold **manual USD** and **import USD** acquisitions in the same holding; M4 must later filter or join on economics kind (M5).

## Related

- `docs/IMPLEMENTATION_PLAN.md` — Milestone 3, Section 3.2 product decisions.
- ADR-003 (repositories), ADR-004 (`ImportError` taxonomy).
