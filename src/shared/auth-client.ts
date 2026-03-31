'use client';

import { createAuthClient } from 'better-auth/react';

import { envPublic } from '@/shared/config/env-public';

export const authClient = createAuthClient({
  baseURL: envPublic.BETTER_AUTH_URL,
});
