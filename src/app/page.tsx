export default function HomePage(): React.ReactElement {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium text-[var(--color-accent)]">Shares Gains UK Tax Calculator</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Application is running</h1>
      <p className="mt-4 text-pretty text-base leading-relaxed text-neutral-600">
        This is a local development skeleton. Configure <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-sm">MONGODB_URI</code> and
        check <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-sm">GET /api/health</code> for database connectivity.
      </p>
    </main>
  );
}
