import {
  buildComputationPackJsonAllYears,
  buildComputationPackJsonSingleTaxYear,
  HOLDING_CAPITAL_GAINS_REPORT_JSON_SCHEMA_VERSION,
} from '@/infrastructure/calculation-json/build-calculation-computation-pack-json';
import type { CalculationTransactionTableGroup } from '@/application/calculation/build-calculation-transaction-table';

describe('build-calculation-computation-pack-json', () => {
  const minimalGroup: CalculationTransactionTableGroup = {
    taxYearLabel: '2024-25',
    dateBlocks: [],
    totalNetRealisedGainOrLossGbp: 0,
    openingPoolShares: 0,
    openingPoolCostGbp: 0,
  };

  it('buildComputationPackJsonSingleTaxYear returns parseable JSON with expected scope and one tax year', () => {
    const generatedAt = new Date('2026-01-15T10:00:00.000Z');
    const bytes = buildComputationPackJsonSingleTaxYear({
      holdingSymbol: 'MDB',
      group: minimalGroup,
      generatedAt,
    });
    expect(bytes.byteLength).toBeGreaterThan(50);
    const text = new TextDecoder('utf-8').decode(bytes);
    const parsed = JSON.parse(text) as {
      schemaVersion: number;
      documentKind: string;
      scope: { type: string; taxYearLabel?: string };
      taxYears: unknown[];
      generatedAt: string;
      fxAssumptionNote: string;
    };
    expect(parsed.schemaVersion).toBe(HOLDING_CAPITAL_GAINS_REPORT_JSON_SCHEMA_VERSION);
    expect(parsed.documentKind).toBe('holding-capital-gains-report');
    expect(parsed.generatedAt).toBe('2026-01-15T10:00:00.000Z');
    expect(parsed.scope).toEqual({ type: 'single-tax-year', taxYearLabel: '2024-25' });
    expect(parsed.taxYears).toHaveLength(1);
    expect(parsed.fxAssumptionNote.length).toBeGreaterThan(20);
  });

  it('buildComputationPackJsonAllYears returns all-tax-years scope and matching tax year count', () => {
    const groups: CalculationTransactionTableGroup[] = [
      minimalGroup,
      {
        ...minimalGroup,
        taxYearLabel: '2025-26',
      },
    ];
    const bytes = buildComputationPackJsonAllYears({
      holdingSymbol: 'MDB',
      groups,
    });
    const text = new TextDecoder('utf-8').decode(bytes);
    const parsed = JSON.parse(text) as {
      schemaVersion: number;
      scope: { type: string };
      taxYears: unknown[];
    };
    expect(parsed.schemaVersion).toBe(HOLDING_CAPITAL_GAINS_REPORT_JSON_SCHEMA_VERSION);
    expect(parsed.scope).toEqual({ type: 'all-tax-years' });
    expect(parsed.taxYears).toHaveLength(2);
  });
});
