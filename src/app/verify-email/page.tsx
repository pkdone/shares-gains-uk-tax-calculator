import Link from 'next/link';

import { ResendVerificationForm } from '@/app/verify-email/resend-verification-form';

type VerifyEmailPageProps = {
  readonly searchParams: Promise<{ readonly pending?: string }>;
};

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps): Promise<React.ReactElement> {
  const sp = await searchParams;
  const showPending = sp.pending === '1';

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium text-[var(--color-accent)]">Email verification</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        {showPending ? 'Verify your email to continue' : 'Resend verification'}
      </h1>
      <p className="mt-2 text-sm text-neutral-600">
        Portfolio pages require a verified email. Check your inbox for the link we sent, or request a new one below.
      </p>
      <div className="mt-8">
        <ResendVerificationForm />
      </div>
      <p className="mt-6 text-center text-sm text-neutral-600">
        <Link href="/sign-in" className="text-[var(--color-accent)] hover:underline">
          Back to sign in
        </Link>
      </p>
    </main>
  );
}
