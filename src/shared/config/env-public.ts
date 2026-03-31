/**
 * Values safe for the browser bundle (NEXT_PUBLIC_*).
 */
export const envPublic = {
  BETTER_AUTH_URL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? '',
  APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? '',
} as const;
