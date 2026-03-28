import Link from 'next/link';

export default function HomePage(): React.ReactElement {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium text-[var(--color-accent)]">Shares Gains UK Tax Calculator</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Application is running</h1>
      <p className="mt-4 text-pretty text-base leading-relaxed text-neutral-600">
        Configure <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-sm">MONGODB_URI</code> and{' '}
        <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-sm">STUB_USER_ID</code>. Check{' '}
        <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-sm">GET /api/health</code> for database connectivity.
      </p>
      <p className="mt-6">
        <Link
          href="/portfolios"
          className="inline-flex rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Open portfolios
        </Link>
      </p>
    </main>
  );
}
