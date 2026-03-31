import { toNextJsHandler } from 'better-auth/next-js';

import { getAuth } from '@/infrastructure/auth/better-auth';

export const dynamic = 'force-dynamic';

const handlersPromise = getAuth().then((auth) => toNextJsHandler(auth));

export async function GET(request: Request): Promise<Response> {
  return (await handlersPromise).GET(request);
}

export async function POST(request: Request): Promise<Response> {
  return (await handlersPromise).POST(request);
}

export async function PATCH(request: Request): Promise<Response> {
  return (await handlersPromise).PATCH(request);
}

export async function PUT(request: Request): Promise<Response> {
  return (await handlersPromise).PUT(request);
}

export async function DELETE(request: Request): Promise<Response> {
  return (await handlersPromise).DELETE(request);
}
