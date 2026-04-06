import type { ReactElement } from 'react';

import type { SuccessfulHoldingCalculation } from '@/application/calculation/calculation-types';
import { buildCalculationTransactionTableModel } from '@/application/calculation/build-calculation-transaction-table';

import { CalculationTaxYearTabs } from '@/app/holdings/[holdingId]/calculation/calculation-tax-year-tabs';

type CalculationResultSectionsProps = {
  readonly result: SuccessfulHoldingCalculation;
  /** Stock symbol for the holding whose calculation is shown (e.g. MDB). */
  readonly holdingSymbol: string;
};

export function CalculationResultSections({
  result,
  holdingSymbol,
}: CalculationResultSectionsProps): ReactElement {
  const groups = buildCalculationTransactionTableModel(result);

  return (
    <div id="calculation-results" className="mt-10 scroll-mt-6 space-y-10">
      <section>
        <CalculationTaxYearTabs groups={groups} holdingSymbol={holdingSymbol} />
      </section>

      {result.warnings.length > 0 ? (
        <section>
          <h2 className="text-lg font-medium text-neutral-900">Warnings</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-neutral-700">
            {result.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
