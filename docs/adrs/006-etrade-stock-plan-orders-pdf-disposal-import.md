# ADR-006: E\*Trade Stock Plan Orders PDF — RSU disposal import

**Status:** Accepted  
**Date:** 2026-04-06  
**Deciders:** Engineering (per product plan)

## Context

Users need to import **executed Sell Restricted Stock** orders from the e\*Trade / Morgan Stanley at Work **Stock Plan Orders** PDF export into **share disposals** (USD gross proceeds and fees), with filtering and review before commit. ADR-005 scoped XLSX vesting imports and deferred PDF/disposal work; this ADR covers the PDF disposal path.

## Decision

### Pipeline

1. **Interfaces:** Upload PDF on the holding ledger; server actions validate file and holding ownership.
2. **Infrastructure:** `pdf-parse` (`PDFParse` class) reads the buffer to plain text — **not** in `src/domain`.
3. **Domain:** `parseEtradeStockPlanOrdersPdfText` splits on `Order Summary`, parses Order Type / shares / disbursement / first `Order Executed` line; includes only **Sell Restricted Stock** order types **without** “Performance”; requires an **Order Executed** datetime.
4. **Symbol:** Header `Stock Plan (TICKER)` must match the open holding; otherwise return a clear error. Per-order symbol filtering mirrors XLSX via `filterEtradeDisposalDraftsForHoldingSymbol` when multiple symbols appear.
5. **Idempotency:** `formatEtradeDisposalImportFingerprintMaterial` + SHA-256 hex; stored as optional `importSourceFingerprint` on disposal documents. Unique partial index on `(holdingId, userId, importSourceFingerprint)`. Preview and commit skip rows whose fingerprint already exists.
6. **Application:** `buildEtradePdfDisposalImportPreview`, `commitEtradeStockPlanOrdersPdfImport`; batch insert via `insertManyPdfImportBatch`.

### Disposal date

Calendar date from the **first `Order Executed`** line (MM/DD/YYYY segment), stored as ISO date-only — aligned with the broker-facing execution timestamp in ET.

### Economics

- `grossProceedsUsd` = Est. Gross Proceeds  
- `feesUsd` = Commission + SEC Fees + Brokerage Assist Fee  

## Consequences

- `npm run db:init` creates the new partial unique index on disposals.
- `pdf-parse` is listed in `serverExternalPackages` for Next.js.
- Domain remains free of PDF libraries; tests use **string fixtures** (not committed customer PDFs in CI).

## Related

- ADR-005 (`docs/adrs/005-import-pipeline-design.md`) — updated non-goals for disposal PDF.
- `src/infrastructure/import/etrade/etrade-stock-plan-orders-pdf.ts`, `src/application/import/preview-etrade-stock-plan-orders-pdf-import.ts`, `src/app/holdings/import-disposal-pdf-actions.ts`.
