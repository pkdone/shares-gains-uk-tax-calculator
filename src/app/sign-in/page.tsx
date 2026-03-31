import Link from 'next/link';
import { Suspense } from 'react';

import { SignInForm } from '@/app/sign-in/sign-in-form';

export default function SignInPage(): React.ReactElement {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium text-[var(--color-accent)]">Sign in</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Use the email and password you registered with. You must verify your email before accessing portfolios.
      </p>
      <div className="mt-8">
        <Suspense fallback={<p className="text-sm text-neutral-500">Loading…</p>}>
          <SignInForm />
        </Suspense>
      </div>
      <p className="mt-6 text-center text-sm text-neutral-600">
        No account?{' '}
        <Link href="/sign-up" className="font-medium text-[var(--color-accent)] hover:underline">
          Sign up
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-neutral-600">
        <Link href="/forgot-password" className="text-[var(--color-accent)] hover:underline">
          Forgot password?
        </Link>
      </p>
    </main>
  );
}
