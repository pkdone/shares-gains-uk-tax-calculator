import type { ReactElement } from 'react';

import type { CalculationTransactionTableGroup } from '@/application/calculation/build-calculation-transaction-table';
import type { SuccessfulHoldingCalculation } from '@/application/calculation/calculation-types';

import { CalculationComputationPackActions } from '@/app/holdings/[holdingId]/calculation/calculation-computation-pack-actions';

type CalculationResultSectionsProps = {
  readonly result: SuccessfulHoldingCalculation;
  /** Stock symbol for the holding whose calculation is shown (e.g. MDB). */
  readonly holdingSymbol: string;
  /** Pre-built tax-year table model (same as used for the page header PDF export). */
  readonly groups: readonly CalculationTransactionTableGroup[];
};

export function CalculationResultSections({
  result,
  holdingSymbol,
  groups,
}: CalculationResultSectionsProps): ReactElement {
  return (
    <div id="calculation-results" className="mt-8 scroll-mt-6 space-y-10">
      <section>
        <CalculationComputationPackActions groups={groups} holdingSymbol={holdingSymbol} />
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
