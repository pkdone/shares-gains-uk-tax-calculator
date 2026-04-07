import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import type { ReactElement, ReactNode } from 'react';

import { AppHeader, formatSessionDisplayName } from '@/app/app-header';
import { HoldingLayoutChrome } from '@/app/holdings/[holdingId]/holding-layout-chrome';
import { HoldingViewHeading } from '@/app/holdings/[holdingId]/holding-view-heading';
import { holdingDocumentTitle, siteTitle } from '@/app/site-copy';
import { requireVerifiedSessionUser } from '@/infrastructure/auth/session';
import { holdingRepository } from '@/infrastructure/repositories/composition-root';

type HoldingLayoutParams = {
  readonly params: Promise<{ holdingId: string }>;
};

type HoldingLayoutProps = HoldingLayoutParams & {
  readonly children: ReactNode;
};

export async function generateMetadata({ params }: HoldingLayoutParams): Promise<Metadata> {
  const { holdingId } = await params;
  const user = await requireVerifiedSessionUser();
  const holding = await holdingRepository.findByIdForUser(holdingId, user.id);
  if (holding === null) {
    return { title: siteTitle };
  }

  const path = (await headers()).get('x-pathname') ?? '';
  const viewSuffix: 'Capital Gains' | 'Ledger' = path.includes('/calculation') ? 'Capital Gains' : 'Ledger';

  return {
    title: holdingDocumentTitle(holding.symbol, viewSuffix),
  };
}

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
        <HoldingViewHeading symbol={holding.symbol} />
        <HoldingLayoutChrome holdingId={holdingId} />
        {children}
      </main>
    </>
  );
}
