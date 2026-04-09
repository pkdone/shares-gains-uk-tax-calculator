import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

function isProtectedPath(pathname: string): boolean {
  return pathname === '/' || pathname.startsWith('/holdings');
}

/** Better Auth session cookies (plain and `__Secure-` prefixed over HTTPS). */
const SESSION_COOKIE_NAMES = ['better-auth.session_token', '__Secure-better-auth.session_token'] as const;

function readSessionToken(request: NextRequest): string | undefined {
  for (const name of SESSION_COOKIE_NAMES) {
    const v = request.cookies.get(name)?.value;
    if (v !== undefined && v.length > 0) {
      return v;
    }
  }
  return undefined;
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const sessionCookie = readSessionToken(request);
  if (sessionCookie === undefined) {
    const url = request.nextUrl.clone();
    url.pathname = '/sign-in';
    url.searchParams.set('callbackUrl', `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', `${pathname}${search}`);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ['/', '/holdings', '/holdings/:path*'],
};
