import Link from 'next/link';
import { Suspense } from 'react';

import { SignInForm } from '@/app/sign-in/sign-in-form';
import { AuthPageShell } from '@/app/ui/auth-page-shell';

export default function SignInPage(): React.ReactElement {
  return (
    <AuthPageShell
      title="Welcome back"
      description="Use the email and password you registered with. You must verify your email before accessing holdings."
      footer={
        <>
          <p>
            No account?{' '}
            <Link href="/sign-up" className="font-medium text-[var(--color-accent)] hover:underline">
              Sign up
            </Link>
          </p>
          <p className="mt-2">
            <Link href="/forgot-password" className="text-[var(--color-accent)] hover:underline">
              Forgot password?
            </Link>
          </p>
        </>
      }
    >
      <Suspense fallback={<p className="text-sm text-neutral-500">Loading…</p>}>
        <SignInForm />
      </Suspense>
    </AuthPageShell>
  );
}
