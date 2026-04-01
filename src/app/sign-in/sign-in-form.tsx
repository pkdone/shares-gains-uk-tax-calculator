'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { authClient } from '@/shared/auth-client';

export function SignInForm(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get('callbackUrl') ?? '/holdings';
  const callbackUrl =
    rawCallback.startsWith('/') && !rawCallback.startsWith('//') ? rawCallback : '/holdings';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const { error: err } = await authClient.signIn.email({
        email,
        password,
      });
      if (err) {
        setError(err.message ?? 'Sign in failed');
        setPending(false);
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError('Sign in failed');
      setPending(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
      <div>
        <label htmlFor="signin-email" className="block text-sm font-medium text-neutral-800">
          Email
        </label>
        <input
          id="signin-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
        />
      </div>
      <div>
        <label htmlFor="signin-password" className="block text-sm font-medium text-neutral-800">
          Password
        </label>
        <input
          id="signin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
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
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
