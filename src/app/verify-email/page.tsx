import Link from 'next/link';

import { ResendVerificationForm } from '@/app/verify-email/resend-verification-form';
import { AuthPageShell } from '@/app/ui/auth-page-shell';

type VerifyEmailPageProps = {
  readonly searchParams: Promise<{ readonly pending?: string }>;
};

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps): Promise<React.ReactElement> {
  const sp = await searchParams;
  const showPending = sp.pending === '1';

  return (
    <AuthPageShell
      title={showPending ? 'Verify your email to continue' : 'Resend verification'}
      description="Holding pages require a verified email. Check your inbox for the link we sent, or request a new one below."
      footer={
        <Link href="/sign-in" className="text-[var(--color-accent)] hover:underline">
          Back to sign in
        </Link>
      }
    >
      <ResendVerificationForm />
    </AuthPageShell>
  );
}
