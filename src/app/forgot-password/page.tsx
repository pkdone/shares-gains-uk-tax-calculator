import Link from 'next/link';

import { ForgotPasswordForm } from '@/app/forgot-password/forgot-password-form';

export default function ForgotPasswordPage(): React.ReactElement {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium text-[var(--color-accent)]">Password reset</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Forgot password</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Enter your email and we will send a link to set a new password if an account exists.
      </p>
      <div className="mt-8">
        <ForgotPasswordForm />
      </div>
      <p className="mt-6 text-center text-sm text-neutral-600">
        <Link href="/sign-in" className="text-[var(--color-accent)] hover:underline">
          Back to sign in
        </Link>
      </p>
    </main>
  );
}
