import Link from 'next/link';

import { ForgotPasswordForm } from '@/app/forgot-password/forgot-password-form';
import { AuthPageShell } from '@/app/ui/auth-page-shell';

export default function ForgotPasswordPage(): React.ReactElement {
  return (
    <AuthPageShell
      title="Forgot password"
      description="Enter your email and we will send a link to set a new password if an account exists."
      footer={
        <Link href="/sign-in" className="text-[var(--color-accent)] hover:underline">
          Back to sign in
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthPageShell>
  );
}
