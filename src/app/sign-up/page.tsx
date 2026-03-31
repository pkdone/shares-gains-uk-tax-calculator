import Link from 'next/link';

import { SignUpForm } from '@/app/sign-up/sign-up-form';

export default function SignUpPage(): React.ReactElement {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium text-[var(--color-accent)]">Create account</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Sign up</h1>
      <p className="mt-2 text-sm text-neutral-600">
        We will send a verification link to your email. You can sign in only after you verify.
      </p>
      <div className="mt-8">
        <SignUpForm />
      </div>
      <p className="mt-6 text-center text-sm text-neutral-600">
        Already have an account?{' '}
        <Link href="/sign-in" className="font-medium text-[var(--color-accent)] hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
