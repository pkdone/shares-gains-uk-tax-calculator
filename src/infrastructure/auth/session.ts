import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { getAuth } from '@/infrastructure/auth/better-auth';

const SIGN_IN_PATH = '/sign-in';

/** Verified user fields for UI (e.g. home page account menu). */
export type VerifiedSessionUser = {
  readonly id: string;
  readonly name: string | null;
  readonly email: string;
};

async function requireVerifiedSessionUserInternal(): Promise<VerifiedSessionUser> {
  const auth = await getAuth();
  const h = await headers();
  const data = await auth.api.getSession({ headers: h });
  const callbackUrl = callbackUrlFromHeaders(h);

  if (!data?.user || !data.session) {
    redirect(`${SIGN_IN_PATH}?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  if (!data.user.emailVerified) {
    redirect('/verify-email?pending=1');
  }

  return {
    id: data.user.id,
    name: data.user.name ?? null,
    email: data.user.email,
  };
}

/**
 * Requires a signed-in user with verified email. Returns id, name, and email for display.
 */
export async function requireVerifiedSessionUser(): Promise<VerifiedSessionUser> {
  return requireVerifiedSessionUserInternal();
}

function callbackUrlFromHeaders(h: Headers): string {
  return h.get('x-pathname') ?? '/';
}

/**
 * Requires a signed-in user with verified email. Redirects to sign-in or verify-email otherwise.
 */
export async function requireVerifiedUserId(): Promise<string> {
  const user = await requireVerifiedSessionUserInternal();
  return user.id;
}
