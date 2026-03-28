import { NextResponse } from 'next/server';

import { pingMongoDb } from '@/infrastructure/persistence/mongodb-client';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse<{ status: string; db: string }>> {
  const db = (await pingMongoDb()) ? 'connected' : 'disconnected';
  return NextResponse.json({ status: 'ok', db });
}
