import { Suspense } from 'react';

import { HoldingCalculationBody } from '@/app/holdings/[holdingId]/calculation/holding-calculation-body';

type CalculationPageProps = {
  readonly params: Promise<{ holdingId: string }>;
};

export default async function HoldingCalculationPage({
  params,
}: CalculationPageProps): Promise<React.ReactElement> {
  const { holdingId } = await params;

  return (
    <Suspense fallback={null}>
      <HoldingCalculationBody holdingId={holdingId} />
    </Suspense>
  );
}
