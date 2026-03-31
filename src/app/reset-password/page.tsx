import Link from 'next/link';

import { ResetPasswordForm } from '@/app/reset-password/reset-password-form';

type ResetPasswordPageProps = {
  readonly searchParams: Promise<{ readonly token?: string; readonly error?: string }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps): Promise<React.ReactElement> {
  const sp = await searchParams;
  const token = sp.token;
  const err = sp.error;

  if (err === 'INVALID_TOKEN' || err === 'TOKEN_EXPIRED') {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Link expired or invalid</h1>
        <p className="mt-2 text-sm text-neutral-600">Request a new password reset from the forgot password page.</p>
        <p className="mt-6">
          <Link href="/forgot-password" className="text-[var(--color-accent)] hover:underline">
            Forgot password
          </Link>
        </p>
      </main>
    );
  }

  if (typeof token !== 'string' || token.length < 1) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Reset password</h1>
        <p className="mt-2 text-sm text-neutral-600">Open the link from your email, or request a new one.</p>
        <p className="mt-6">
          <Link href="/forgot-password" className="text-[var(--color-accent)] hover:underline">
            Forgot password
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium text-[var(--color-accent)]">Password reset</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Choose a new password</h1>
      <div className="mt-8">
        <ResetPasswordForm token={token} />
      </div>
    </main>
  );
}
