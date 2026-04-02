import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

function isProtectedPath(pathname: string): boolean {
  return pathname === '/' || pathname.startsWith('/holdings');
}

/** Matches Better Auth default cookie name (`better-auth.session_token`). */
const SESSION_COOKIE = 'better-auth.session_token';

export function middleware(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;
  if (sessionCookie === undefined || sessionCookie.length === 0) {
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
