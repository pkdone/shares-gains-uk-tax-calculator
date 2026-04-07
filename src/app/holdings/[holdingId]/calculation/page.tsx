import { Suspense } from 'react';

import { HoldingCalculationBody } from '@/app/holdings/[holdingId]/calculation/holding-calculation-body';
import { HoldingCalculationLoadingFallback } from '@/app/holdings/[holdingId]/calculation/loading';

type CalculationPageProps = {
  readonly params: Promise<{ holdingId: string }>;
};

export default async function HoldingCalculationPage({
  params,
}: CalculationPageProps): Promise<React.ReactElement> {
  const { holdingId } = await params;

  return (
    <Suspense fallback={<HoldingCalculationLoadingFallback />}>
      <HoldingCalculationBody holdingId={holdingId} />
    </Suspense>
  );
}
