import {
  buildComputationPackPdfAllYears,
  buildComputationPackPdfSingleTaxYear,
} from '@/infrastructure/calculation-pdf/build-calculation-computation-pack-pdf';
import type { CalculationTransactionTableGroup } from '@/application/calculation/build-calculation-transaction-table';

describe('build-calculation-computation-pack-pdf', () => {
  const minimalGroup: CalculationTransactionTableGroup = {
    taxYearLabel: '2024-25',
    dateBlocks: [],
    totalNetRealisedGainOrLossGbp: 0,
    openingPoolShares: 0,
    openingPoolCostGbp: 0,
  };

  it('buildComputationPackPdfSingleTaxYear returns non-empty PDF bytes', () => {
    const generatedAt = new Date('2026-01-15T10:00:00.000Z');
    const bytes = buildComputationPackPdfSingleTaxYear({
      holdingSymbol: 'MDB',
      group: minimalGroup,
      generatedAt,
    });
    expect(bytes.byteLength).toBeGreaterThan(500);
    expect(bytes[0]).toBe(0x25);
    expect(bytes[1]).toBe(0x50);
    expect(bytes[2]).toBe(0x44);
    expect(bytes[3]).toBe(0x46);
  });

  it('buildComputationPackPdfAllYears returns non-empty PDF bytes', () => {
    const bytes = buildComputationPackPdfAllYears({
      holdingSymbol: 'MDB',
      groups: [minimalGroup],
    });
    expect(bytes.byteLength).toBeGreaterThan(500);
  });
});
