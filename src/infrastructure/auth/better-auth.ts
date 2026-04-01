import { createEmailVerificationToken } from 'better-auth/api';
import { betterAuth, type Auth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { mongodbAdapter } from '@better-auth/mongo-adapter';

import { getMongoClient } from '@/infrastructure/persistence/mongodb-client';
import { COLLECTION_USERS } from '@/infrastructure/persistence/schema-registry';
import { sendAuthEmail } from '@/infrastructure/email/send-auth-email';
import { env } from '@/shared/config/env';

let authSingleton: Auth | undefined;

/**
 * Lazily builds Better Auth with the shared MongoDB client so we do not connect twice.
 */
export async function getAuth(): Promise<Auth> {
  if (authSingleton) {
    return authSingleton;
  }

  const client = await getMongoClient();
  const db = client.db();

  authSingleton = betterAuth({
    appName: 'Shares Gains UK Tax Calculator',
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.NEXT_PUBLIC_APP_URL],
    database: mongodbAdapter(db, {
      client,
      transaction: true,
    }),
    plugins: [nextCookies()],
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        await sendAuthEmail({
          to: user.email,
          subject: 'Verify your email',
          text: `Verify your email: ${url}`,
          html: `<p>Verify your email:</p><p><a href="${url}">${url}</a></p>`,
        });
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      autoSignIn: false,
      /**
       * Better Auth returns 200 with a synthetic user when the email already exists (anti-enumeration).
       * It does not call `sendVerificationEmail` on that path — so noop logs stay empty on re-sign-up.
       * Resend verification when the real user exists and is still unverified.
       */
      onExistingUserSignUp: async ({ user }) => {
        if (user.emailVerified) {
          return;
        }
        const token = await createEmailVerificationToken(
          env.BETTER_AUTH_SECRET,
          user.email,
          undefined,
          3600,
        );
        const callbackURL = encodeURIComponent('/holdings');
        const url = `${env.BETTER_AUTH_URL}/verify-email?token=${token}&callbackURL=${callbackURL}`;
        await sendAuthEmail({
          to: user.email,
          subject: 'Verify your email',
          text: `Verify your email: ${url}`,
          html: `<p>Verify your email:</p><p><a href="${url}">${url}</a></p>`,
        });
      },
      sendResetPassword: async ({ user, url }) => {
        await sendAuthEmail({
          to: user.email,
          subject: 'Reset your password',
          text: `Reset your password: ${url}`,
          html: `<p>Reset your password:</p><p><a href="${url}">${url}</a></p>`,
        });
      },
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            const users = db.collection(COLLECTION_USERS);
            const now = new Date();
            await users.updateOne(
              { userId: user.id },
              { $setOnInsert: { userId: user.id, createdAt: now } },
              { upsert: true },
            );
          },
        },
      },
    },
  }) as unknown as Auth;

  return authSingleton;
}
