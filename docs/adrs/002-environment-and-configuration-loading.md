# ADR-002: Environment and Configuration Loading

**Status:** Accepted
**Date:** 2026-03-28
**Deciders:** Paul Done

## Context

The application connects to an external MongoDB Atlas database and must run in three environments (local dev, Docker, Kubernetes). Configuration must be:

- validated at startup, failing fast on missing or malformed values
- consistent across all deployment targets
- free of hard-coded secrets
- centrally defined so that every module reads config from one place

The project rule (`project.mdc`) requires Zod-based validation for environment variables and a single `MONGODB_URI` variable that encodes the database name in the URI itself.

## Decision

### Configuration module

A single configuration module at `src/shared/config/env.ts` owns all environment validation and config export.

### Zod schema validation

Define a Zod schema for the full set of required environment variables. Parse `process.env` through this schema at module load time. If validation fails, throw an `AppError` with a clear message listing every missing or invalid variable.

```ts
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().min(1),
  // Future variables added here
});
```

Export both the validated config object and its inferred type.

### Single `MONGODB_URI` variable

The MongoDB connection string must include the database name as part of the URI path (e.g. `mongodb+srv://user:pass@cluster.example.net/mydb?retryWrites=true`). There is no separate `MONGODB_DATABASE` variable. The MongoDB client extracts the database name from the URI at connection time.

### Startup-fail behaviour

If environment validation fails:
- In the Next.js server process: throw immediately, preventing the server from starting.
- In tests: the test setup can provide valid mock env vars; tests that need specific invalid states test the validation function directly.
- In scripts (e.g. FX rate downloader): validate before executing the script body.

The application must never silently fall back to defaults for critical variables like `MONGODB_URI`. Missing config is a fatal error.

### `.env.example`

A committed `.env.example` file documents every required variable with placeholder values and comments:

```dotenv
# Node environment: development | production | test
NODE_ENV=development

# MongoDB Atlas connection string (includes database name in URI path)
# Example: mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
MONGODB_URI=
```

The actual `.env` file is gitignored.

### Where config is consumed

- `src/infrastructure/persistence/mongodb-client.ts` imports the validated `MONGODB_URI` to create the client.
- Route handlers and services import config from `src/shared/config/env.ts` — never from `process.env` directly.
- No module outside `src/shared/config/env.ts` reads `process.env` for application configuration.

### Docker and Kubernetes

- **Docker:** environment variables passed via `docker run -e` or `--env-file`.
- **Kubernetes:** `MONGODB_URI` stored in a Secret; non-sensitive variables in a ConfigMap. Both injected as container env vars in the Deployment manifest.

## Consequences

### Positive

- Malformed or missing config is caught immediately at startup, not at the point of first database call or request.
- One source of truth for config shape and defaults — no scattered `process.env.FOO` reads.
- Zod validation provides precise error messages (e.g. "MONGODB_URI: Required") that are immediately actionable.
- The inferred TypeScript type ensures all config consumers get compile-time safety.
- No risk of accidentally using a `MONGODB_DATABASE` variable that contradicts the URI.

### Negative

- Every new environment variable requires updating the Zod schema, `.env.example`, and potentially the K8s manifests. This is intentional friction — it prevents config sprawl.
- Module-load-time validation means importing `env.ts` has a side effect. This is acceptable given the fail-fast requirement, but tests must be aware of it.

### Risks

- If the MongoDB URI is valid in shape but points to an unreachable cluster, the config validation will pass but the connection will fail later. The health endpoint (`/api/health`) and the MongoDB client's connection logic handle this separately — config validation only checks that the value is present and non-empty, not that it's reachable.

## References

- `project.mdc` — "Single variable `MONGODB_URI`" and "Validate and centralise application configuration"
- `docs/IMPLEMENTATION_PLAN.md` — Milestone 1 task: "Add zod-based environment validation"
