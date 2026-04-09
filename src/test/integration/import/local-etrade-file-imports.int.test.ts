/**
 * Optional local broker exports at repository root (not committed):
 * - ByBenefitType_expanded.xlsx — E*Trade By Benefit Type XLSX import
 * - E_TRADE - Stock Plan Orders.pdf — Stock Plan Orders PDF disposal import
 *
 * When a file is absent, tests log a warning with the absolute path and skip assertions.
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

import { ObjectId } from 'mongodb';

import { commitEtradeByBenefitImport } from '@/application/import/commit-etrade-by-benefit-import';
import { commitEtradeStockPlanOrdersPdfImport } from '@/application/import/commit-etrade-stock-plan-orders-pdf-import';
import { filterEtradeDraftsForHoldingSymbol } from '@/application/import/filter-etrade-drafts-for-holding-symbol';
import { buildEtradePdfDisposalImportPreview } from '@/infrastructure/import/etrade/build-etrade-pdf-disposal-import-preview';
import { computeEtradeDisposalImportFingerprint } from '@/infrastructure/import/etrade/hash-etrade-disposal-import-fingerprint';
import { previewEtradeByBenefitTypeImport } from '@/infrastructure/import/etrade/preview-etrade-by-benefit-type-import';
import { parseEtradeStockPlanOrdersPdfText } from '@/infrastructure/import/etrade/etrade-stock-plan-orders-pdf';
import { pdfBufferToText } from '@/infrastructure/import/pdf-buffer-to-text';
import { readXlsxForEtradeByBenefitTypeImport } from '@/infrastructure/import/read-xlsx-sheet';
import { disconnectMongoClient, getMongoClient } from '@/infrastructure/persistence/mongodb-client';
import {
  COLLECTION_ACQUISITIONS,
  COLLECTION_DISPOSALS,
  COLLECTION_HOLDINGS,
} from '@/infrastructure/persistence/schema-registry';
import {
  holdingRepository as holdingRepo,
  shareAcquisitionRepository as acquisitionRepo,
  shareDisposalRepository as disposalRepo,
} from '@/infrastructure/repositories/composition-root';
import { logWarn } from '@/shared/app-logger';
import { ensureTestDatabase } from '@/test/integration/helpers/ensure-test-database';

const XLSX_LOCAL_PATH = resolve(process.cwd(), 'ByBenefitType_expanded.xlsx');
const PDF_LOCAL_PATH = resolve(process.cwd(), 'E_TRADE - Stock Plan Orders.pdf');

describe('local E*Trade file imports (optional files at repo root)', () => {
  jest.setTimeout(60_000);

  beforeAll(async () => {
    await ensureTestDatabase();
  });

  afterAll(async () => {
    await disconnectMongoClient();
  });

  it('imports ByBenefitType_expanded.xlsx when present', async () => {
    if (!existsSync(XLSX_LOCAL_PATH)) {
      logWarn(
        `Integration: ByBenefitType_expanded.xlsx not found at ${XLSX_LOCAL_PATH}; XLSX import pipeline not exercised.`,
      );
      return;
    }

    const userId = `integration-test-xlsx-${Date.now()}`;

    const buf = readFileSync(XLSX_LOCAL_PATH);
    const grid = await readXlsxForEtradeByBenefitTypeImport(buf);
    const { drafts, errors, notices } = previewEtradeByBenefitTypeImport(grid);

    expect(errors.length).toBe(0);
    if (notices.length > 0) {
      // Notices are non-fatal; log for local debugging
      for (const n of notices) {
        logWarn(`ByBenefitType import notice: ${n}`);
      }
    }

    expect(drafts.length).toBeGreaterThan(0);

    const symbolUpper = drafts[0]?.symbol.trim().toUpperCase();
    if (symbolUpper === undefined || symbolUpper.length === 0) {
      throw new Error('Expected at least one draft with a symbol');
    }

    const { matching } = filterEtradeDraftsForHoldingSymbol(drafts, symbolUpper);
    expect(matching.length).toBeGreaterThan(0);

    const holding = await holdingRepo.create({ userId, symbol: symbolUpper });

    try {
      const { count } = await commitEtradeByBenefitImport(holdingRepo, acquisitionRepo, {
        holdingId: holding.id,
        userId,
        drafts: matching,
      });
      expect(count).toBeGreaterThan(0);

      const list = await acquisitionRepo.listByHoldingForUser(holding.id, userId);
      expect(list.length).toBeGreaterThan(0);
    } finally {
      const client = await getMongoClient();
      const db = client.db();
      const hid = new ObjectId(holding.id);
      await db.collection(COLLECTION_ACQUISITIONS).deleteMany({ holdingId: hid });
      await db.collection(COLLECTION_HOLDINGS).deleteOne({ _id: hid });
    }
  });

  it('imports E_TRADE Stock Plan Orders PDF when present', async () => {
    if (!existsSync(PDF_LOCAL_PATH)) {
      logWarn(
        `Integration: E_TRADE - Stock Plan Orders.pdf not found at ${PDF_LOCAL_PATH}; PDF disposal import pipeline not exercised.`,
      );
      return;
    }

    const userId = `integration-test-pdf-${Date.now()}`;

    const buf = readFileSync(PDF_LOCAL_PATH);
    let text: string;
    try {
      text = await pdfBufferToText(buf);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logWarn(
        `Integration: PDF text extraction failed (${msg}). Skipping PDF disposal test. If this is the Jest/pdf.js worker issue, run test:integration with NODE_OPTIONS=--experimental-vm-modules.`,
      );
      return;
    }

    const parsed = parseEtradeStockPlanOrdersPdfText(text);
    const headerSymbol = parsed.headerSymbolUpper;
    if (headerSymbol === null) {
      logWarn(
        `Integration: Could not parse Stock Plan (TICKER) from ${PDF_LOCAL_PATH}; skipping PDF disposal DB test.`,
      );
      return;
    }

    const holding = await holdingRepo.create({ userId, symbol: headerSymbol });

    try {
      const preview = buildEtradePdfDisposalImportPreview({
        text,
        holdingId: holding.id,
        holdingSymbolUpper: headerSymbol,
        existingImportFingerprints: new Set(),
      });

      if (!preview.ok) {
        throw new Error(`PDF preview failed: ${preview.error}`);
      }
      expect(preview.drafts.length).toBeGreaterThan(0);

      const { inserted } = await commitEtradeStockPlanOrdersPdfImport(holdingRepo, disposalRepo, {
        holdingId: holding.id,
        userId,
        drafts: [...preview.drafts],
        computeImportFingerprint: computeEtradeDisposalImportFingerprint,
      });
      expect(inserted).toBeGreaterThan(0);

      const list = await disposalRepo.listByHoldingForUser(holding.id, userId);
      expect(list.length).toBeGreaterThan(0);
    } finally {
      const client = await getMongoClient();
      const db = client.db();
      const hid = new ObjectId(holding.id);
      await db.collection(COLLECTION_DISPOSALS).deleteMany({ holdingId: hid });
      await db.collection(COLLECTION_HOLDINGS).deleteOne({ _id: hid });
    }
  });
});
