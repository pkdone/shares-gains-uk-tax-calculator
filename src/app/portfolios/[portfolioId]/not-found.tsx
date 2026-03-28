import Link from 'next/link';

export default function PortfolioNotFound(): React.ReactElement {
  return (
    <main className="mx-auto max-w-lg px-6 py-16 text-center">
      <h1 className="text-xl font-semibold">Portfolio not found</h1>
      <p className="mt-2 text-sm text-neutral-600">It may have been removed or the link is invalid.</p>
      <Link href="/portfolios" className="mt-6 inline-block text-sm font-medium text-[var(--color-accent)] hover:underline">
        Back to portfolios
      </Link>
    </main>
  );
}
