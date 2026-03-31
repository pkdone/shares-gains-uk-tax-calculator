'use client';

import { useState } from 'react';

import { authClient } from '@/shared/auth-client';
import { envPublic } from '@/shared/config/env-public';

export function SignUpForm(): React.ReactElement {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const { error: err } = await authClient.signUp.email({
        name,
        email,
        password,
        callbackURL: `${envPublic.APP_URL}/portfolios`,
      });
      if (err) {
        setError(err.message ?? 'Sign up failed');
        setPending(false);
        return;
      }
      setDone(true);
    } catch {
      setError('Sign up failed');
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <p className="text-sm text-neutral-700">
        Check your email for a verification link. After you verify, you can sign in.
      </p>
    );
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
      <div>
        <label htmlFor="signup-name" className="block text-sm font-medium text-neutral-800">
          Name
        </label>
        <input
          id="signup-name"
          name="name"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
        />
      </div>
      <div>
        <label htmlFor="signup-email" className="block text-sm font-medium text-neutral-800">
          Email
        </label>
        <input
          id="signup-email"
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
        <label htmlFor="signup-password" className="block text-sm font-medium text-neutral-800">
          Password
        </label>
        <input
          id="signup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
        />
        <p className="mt-1 text-xs text-neutral-500">At least 8 characters.</p>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {pending ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}
