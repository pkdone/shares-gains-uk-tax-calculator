import { z } from 'zod';

/**
 * Logical tenant identity: matches Better Auth user id on persisted documents.
 */
export const userIdentitySchema = z.object({
  userId: z.string().min(1),
});

export type UserIdentity = z.infer<typeof userIdentitySchema>;

/**
 * Persisted stub user document (MongoDB `app_users` collection).
 */
export const userStubDocumentSchema = userIdentitySchema.extend({
  createdAt: z.date(),
});

export type UserStubDocument = z.infer<typeof userStubDocumentSchema>;
