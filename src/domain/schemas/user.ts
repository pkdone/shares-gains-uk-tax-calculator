import { z } from 'zod';

/**
 * Logical tenant identity until authentication (see ADR-007).
 */
export const userIdentitySchema = z.object({
  userId: z.string().min(1),
});

export type UserIdentity = z.infer<typeof userIdentitySchema>;

/**
 * Persisted stub user document (MongoDB `users` collection).
 */
export const userStubDocumentSchema = userIdentitySchema.extend({
  createdAt: z.date(),
});

export type UserStubDocument = z.infer<typeof userStubDocumentSchema>;
