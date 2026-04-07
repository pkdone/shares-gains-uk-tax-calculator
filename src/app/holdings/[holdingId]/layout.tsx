import { notFound } from 'next/navigation';
import type { ReactElement, ReactNode } from 'react';

import { AppHeader, formatSessionDisplayName } from '@/app/app-header';
import { HoldingLayoutChrome } from '@/app/holdings/[holdingId]/holding-layout-chrome';
import { requireVerifiedSessionUser } from '@/infrastructure/auth/session';
import { holdingRepository } from '@/infrastructure/repositories/composition-root';

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
      <AppHeader
        userDisplayName={formatSessionDisplayName(user)}
        holdingId={holdingId}
        holdingSymbol={holding.symbol}
      />
      <main className="mx-auto w-full min-w-0 max-w-7xl px-6 pt-8 pb-12">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{holding.symbol}</h1>
        <HoldingLayoutChrome holdingId={holdingId} />
        {children}
      </main>
    </>
  );
}
