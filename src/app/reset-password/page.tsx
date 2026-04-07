import Link from 'next/link';

import { ResetPasswordForm } from '@/app/reset-password/reset-password-form';
import { AuthPageShell } from '@/app/ui/auth-page-shell';

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
      <AuthPageShell
        title="Link expired or invalid"
        description="Request a new password reset from the forgot password page."
        footer={
          <Link href="/forgot-password" className="text-[var(--color-accent)] hover:underline">
            Forgot password
          </Link>
        }
      />
    );
  }

  if (typeof token !== 'string' || token.length < 1) {
    return (
      <AuthPageShell
        title="Reset password"
        description="Open the link from your email, or request a new one."
        footer={
          <Link href="/forgot-password" className="text-[var(--color-accent)] hover:underline">
            Forgot password
          </Link>
        }
      />
    );
  }

  return (
    <AuthPageShell title="Choose a new password">
      <ResetPasswordForm token={token} />
    </AuthPageShell>
  );
}
