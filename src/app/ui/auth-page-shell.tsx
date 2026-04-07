import type { ReactElement, ReactNode } from 'react';

import { siteTitle } from '@/app/site-copy';

type AuthPageShellProps = {
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly children?: ReactNode;
  readonly footer?: ReactNode;
};

/**
 * Shared layout for sign-in, sign-up, password reset, and email verification pages.
 */
export function AuthPageShell({
  title,
  description,
  children,
  footer,
}: AuthPageShellProps): ReactElement {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-[var(--color-accent)]">{siteTitle}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
        {description === undefined ? null : (
          <div className="mt-2 text-sm text-neutral-600">{description}</div>
        )}
        {children === undefined ? null : <div className="mt-8">{children}</div>}
        {footer === undefined ? null : (
          <div className="mt-6 text-center text-sm text-neutral-600">{footer}</div>
        )}
      </div>
    </main>
  );
}
