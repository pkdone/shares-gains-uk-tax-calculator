'use client';

import { useState } from 'react';

import { authClient } from '@/shared/auth-client';
import { envPublic } from '@/shared/config/env-public';

export function ForgotPasswordForm(): React.ReactElement {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      const { error: err } = await authClient.requestPasswordReset({
        email,
        redirectTo: `${envPublic.APP_URL}/reset-password`,
      });
      if (err) {
        setError(err.message ?? 'Request failed');
        setPending(false);
        return;
      }
      setMessage('If this email exists in our system, check your inbox for a reset link.');
    } catch {
      setError('Request failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
      <div>
        <label htmlFor="forgot-email" className="block text-sm font-medium text-neutral-800">
          Email
        </label>
        <input
          id="forgot-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
        />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-neutral-700">{message}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {pending ? 'Sending…' : 'Send reset link'}
      </button>
    </form>
  );
}
