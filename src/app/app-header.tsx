import Link from 'next/link';
import type { ReactElement } from 'react';

import { HoldingAppBreadcrumb } from '@/app/holdings/holding-app-breadcrumb';
import { UserAccountMenu } from '@/app/user-account-menu';

export function formatSessionDisplayName(user: {
  readonly name: string | null;
  readonly email: string;
}): string {
  const n = user.name?.trim();
  if (n && n.length > 0) {
    return n;
  }
  return user.email;
}

type AppHeaderProps = {
  readonly userDisplayName: string;
  /** When set with holdingSymbol, shows Holdings → symbol breadcrumb. */
  readonly holdingId?: string;
  readonly holdingSymbol?: string;
};

/**
 * Persistent top bar for signed-in holdings flows: breadcrumbs on holding routes, account menu.
 */
export function AppHeader({ userDisplayName, holdingId, holdingSymbol }: AppHeaderProps): ReactElement {
  const showHoldingBreadcrumb =
    holdingId !== undefined && holdingSymbol !== undefined && holdingSymbol.length > 0;

  return (
    <header className="border-b border-neutral-200 bg-white no-print">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
        {showHoldingBreadcrumb ? (
          <HoldingAppBreadcrumb symbol={holdingSymbol} />
        ) : (
          <nav className="min-w-0 flex-1 text-lg" aria-label="App">
            <Link href="/" className="font-semibold text-neutral-900 hover:text-[var(--color-accent)]">
              Holdings
            </Link>
          </nav>
        )}
        <UserAccountMenu displayName={userDisplayName} />
      </div>
    </header>
  );
}
