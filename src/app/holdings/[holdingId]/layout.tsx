import { notFound } from 'next/navigation';
import type { ReactElement, ReactNode } from 'react';

import { AppHeader, formatSessionDisplayName } from '@/app/app-header';
import { HoldingLayoutChrome } from '@/app/holdings/[holdingId]/holding-layout-chrome';
import { requireVerifiedSessionUser } from '@/infrastructure/auth/session';
import { MongoHoldingRepository } from '@/infrastructure/repositories/mongo-holding-repository';

const holdingRepository = new MongoHoldingRepository();

type HoldingLayoutProps = {
  readonly children: ReactNode;
  readonly params: Promise<{ holdingId: string }>;
};

export default async function HoldingLayout({ children, params }: HoldingLayoutProps): Promise<ReactElement> {
  const { holdingId } = await params;
  const user = await requireVerifiedSessionUser();
  const holding = await holdingRepository.findByIdForUser(holdingId, user.id);
  if (holding === null) {
    notFound();
  }

  return (
    <>
      <AppHeader userDisplayName={formatSessionDisplayName(user)} holdingSymbol={holding.symbol} />
      <main className="mx-auto max-w-7xl px-6 py-12">
        <HoldingLayoutChrome holdingId={holdingId} symbol={holding.symbol} />
        {children}
      </main>
    </>
  );
}
