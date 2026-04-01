# ADR-007: Authentication with Better Auth and MongoDB

## Status

Accepted

## Context

The app needed self-hosted email/password authentication with MongoDB-backed sessions, without a separate identity provider or second database. The domain model already scopes data by `userId` on documents.

## Decision

- Use **Better Auth** embedded in the Next.js App Router with the **MongoDB adapter**, sharing the same `MONGODB_URI` and database as the rest of the app.
- **Cookie-based sessions** managed by Better Auth; API route at `/api/auth/[...all]`.
- **Email verification is required** before sign-in sessions are issued (`requireEmailVerification: true`, `autoSignIn: false` on sign-up).
- **Tenant id** for holdings and ledger data is the Better Auth **user id** (`user.id`), aligned with the domain `userId` field.
- The domain **`users`** collection is upserted when a Better Auth user is created so existing indexes and provisioning stay consistent.
- **Transactional email** uses a small `sendAuthEmail` helper: default `AUTH_EMAIL_PROVIDER=noop` logs via `logInfo`; `smtp` is reserved for a future provider.
- **Environment**: `BETTER_AUTH_URL` and `NEXT_PUBLIC_BETTER_AUTH_URL` must match (full URL including `/api/auth`). `NEXT_PUBLIC_APP_URL` is the site origin for trusted origins and client links.

## Consequences

- `STUB_USER_ID` and `seed:users` are removed; new databases rely on sign-up + verification.
- Optional future **OAuth or passkeys** can be added via Better Auth plugins without changing the tenant id model.
