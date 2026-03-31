import Link from 'next/link';

import { getSessionOptional } from '@/infrastructure/auth/session';

export const dynamic = 'force-dynamic';

export default async function HomePage(): Promise<React.ReactElement> {
  const session = await getSessionOptional();
  const signedIn = session?.user != null && session.user.emailVerified === true;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium text-[var(--color-accent)]">Shares Gains UK Tax Calculator</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Application is running</h1>
      <p className="mt-4 text-pretty text-base leading-relaxed text-neutral-600">
        Sign in to manage holdings. Check{' '}
        <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-sm">GET /api/health</code> for database connectivity.
      </p>
      <p className="mt-6 flex flex-wrap gap-3">
        {signedIn ? (
          <Link
            href="/holdings"
            className="inline-flex rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Open holdings
          </Link>
        ) : (
          <>
            <Link
              href="/sign-in"
              className="inline-flex rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
            >
              Sign up
            </Link>
          </>
        )}
      </p>
    </main>
  );
}
