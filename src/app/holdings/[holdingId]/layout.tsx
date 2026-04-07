import { notFound } from 'next/navigation';
import type { ReactElement, ReactNode } from 'react';

import { requireVerifiedUserId } from '@/infrastructure/auth/session';
import { MongoHoldingRepository } from '@/infrastructure/repositories/mongo-holding-repository';

import { HoldingLayoutChrome } from '@/app/holdings/[holdingId]/holding-layout-chrome';

const holdingRepository = new MongoHoldingRepository();

type HoldingLayoutProps = {
  readonly children: ReactNode;
  readonly params: Promise<{ holdingId: string }>;
};

export default async function HoldingLayout({ children, params }: HoldingLayoutProps): Promise<ReactElement> {
  const { holdingId } = await params;
  const userId = await requireVerifiedUserId();
  const holding = await holdingRepository.findByIdForUser(holdingId, userId);
  if (holding === null) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <HoldingLayoutChrome holdingId={holdingId} symbol={holding.symbol} />
      {children}
    </main>
  );
}
