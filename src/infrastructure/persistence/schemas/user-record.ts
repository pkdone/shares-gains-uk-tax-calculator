import { type UserStubDocument, userStubDocumentSchema } from '@/domain/schemas/user';

/** MongoDB `app_users` collection — domain-derived shape for persistence entry points. */
export const userDocumentSchema = userStubDocumentSchema;

export type UserDocument = UserStubDocument;
