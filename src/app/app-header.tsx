import Link from 'next/link';
import type { ReactElement } from 'react';

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
  /** When set, shows as secondary context next to the Holdings home link. */
  readonly holdingSymbol?: string;
};

/**
 * Persistent top bar for signed-in holdings flows: home link, optional holding symbol, account menu.
 */
export function AppHeader({ userDisplayName, holdingSymbol }: AppHeaderProps): ReactElement {
  return (
    <header className="border-b border-neutral-200 bg-white no-print">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
        <nav className="flex min-w-0 items-center gap-2 text-sm" aria-label="App">
          <Link href="/" className="font-semibold text-neutral-900 hover:text-[var(--color-accent)]">
            Holdings
          </Link>
          {holdingSymbol === undefined ? null : (
            <>
              <span className="text-neutral-400" aria-hidden>
                /
              </span>
              <span className="truncate font-medium text-neutral-700">{holdingSymbol}</span>
            </>
          )}
        </nav>
        <UserAccountMenu displayName={userDisplayName} />
      </div>
    </header>
  );
}
