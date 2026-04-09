import type { CalculationTransactionTableGroup } from '@/application/calculation/build-calculation-transaction-table';
import { CALCULATION_EXPORT_FX_ASSUMPTION_NOTE } from '@/application/calculation/calculation-export-fx-assumption-note';

export const HOLDING_CAPITAL_GAINS_REPORT_JSON_SCHEMA_VERSION = 1 as const;

export type HoldingCapitalGainsReportJsonScope =
  | { readonly type: 'all-tax-years' }
  | { readonly type: 'single-tax-year'; readonly taxYearLabel: string };

export type HoldingCapitalGainsReportJsonV1 = {
  readonly schemaVersion: typeof HOLDING_CAPITAL_GAINS_REPORT_JSON_SCHEMA_VERSION;
  readonly documentKind: 'holding-capital-gains-report';
  readonly generatedAt: string;
  readonly holdingSymbol: string;
  readonly scope: HoldingCapitalGainsReportJsonScope;
  readonly fxAssumptionNote: string;
  readonly taxYears: readonly CalculationTransactionTableGroup[];
};

function buildPayload(params: {
  readonly holdingSymbol: string;
  readonly groups: readonly CalculationTransactionTableGroup[];
  readonly generatedAt: Date;
  readonly scope: HoldingCapitalGainsReportJsonScope;
}): HoldingCapitalGainsReportJsonV1 {
  const { holdingSymbol, groups, generatedAt, scope } = params;
  return {
    schemaVersion: HOLDING_CAPITAL_GAINS_REPORT_JSON_SCHEMA_VERSION,
    documentKind: 'holding-capital-gains-report',
    generatedAt: generatedAt.toISOString(),
    holdingSymbol,
    scope,
    fxAssumptionNote: CALCULATION_EXPORT_FX_ASSUMPTION_NOTE,
    taxYears: groups,
  };
}

function encodeUtf8Json(payload: HoldingCapitalGainsReportJsonV1): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(payload, null, 2));
}

/**
 * Builds a UTF-8 JSON holding capital gains report for all tax years in order.
 */
export function buildComputationPackJsonAllYears(params: {
  readonly holdingSymbol: string;
  readonly groups: readonly CalculationTransactionTableGroup[];
  readonly generatedAt?: Date;
}): Uint8Array {
  const generatedAt = params.generatedAt ?? new Date();
  return encodeUtf8Json(
    buildPayload({
      holdingSymbol: params.holdingSymbol,
      groups: params.groups,
      generatedAt,
      scope: { type: 'all-tax-years' },
    }),
  );
}

/**
 * Builds a UTF-8 JSON holding capital gains report for a single UK tax year.
 */
export function buildComputationPackJsonSingleTaxYear(params: {
  readonly holdingSymbol: string;
  readonly group: CalculationTransactionTableGroup;
  readonly generatedAt?: Date;
}): Uint8Array {
  const generatedAt = params.generatedAt ?? new Date();
  return encodeUtf8Json(
    buildPayload({
      holdingSymbol: params.holdingSymbol,
      groups: [params.group],
      generatedAt,
      scope: { type: 'single-tax-year', taxYearLabel: params.group.taxYearLabel },
    }),
  );
}
