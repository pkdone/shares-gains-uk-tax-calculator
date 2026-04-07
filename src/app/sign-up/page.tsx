import Link from 'next/link';

import { SignUpForm } from '@/app/sign-up/sign-up-form';
import { AuthPageShell } from '@/app/ui/auth-page-shell';

export default function SignUpPage(): React.ReactElement {
  return (
    <AuthPageShell
      title="Sign up"
      description="We will send a verification link to your email. You can sign in only after you verify."
      footer={
        <p>
          Already have an account?{' '}
          <Link href="/sign-in" className="font-medium text-[var(--color-accent)] hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <SignUpForm />
    </AuthPageShell>
  );
}
