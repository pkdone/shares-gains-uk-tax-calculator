'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { authClient } from '@/shared/auth-client';

type ResetPasswordFormProps = {
  readonly token: string;
};

export function ResetPasswordForm({ token }: ResetPasswordFormProps): React.ReactElement {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const { error: err } = await authClient.resetPassword({
        newPassword: password,
        token,
      });
      if (err) {
        setError(err.message ?? 'Could not reset password');
        setPending(false);
        return;
      }
      router.push('/sign-in');
      router.refresh();
    } catch {
      setError('Could not reset password');
      setPending(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
      <div>
        <label htmlFor="reset-password" className="block text-sm font-medium text-neutral-800">
          New password
        </label>
        <input
          id="reset-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
        />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {pending ? 'Updating…' : 'Update password'}
      </button>
    </form>
  );
}
