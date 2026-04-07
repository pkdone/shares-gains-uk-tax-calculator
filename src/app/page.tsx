import { HoldingsPageContent } from '@/app/holdings/holdings-page-content';
import { requireVerifiedSessionUser } from '@/infrastructure/auth/session';
import { MongoHoldingRepository } from '@/infrastructure/repositories/mongo-holding-repository';

export const dynamic = 'force-dynamic';

function displayNameForSession(user: { readonly name: string | null; readonly email: string }): string {
  const n = user.name?.trim();
  if (n && n.length > 0) {
    return n;
  }
  return user.email;
}

export default async function HomePage(): Promise<React.ReactElement> {
  const user = await requireVerifiedSessionUser();
  const holdingRepository = new MongoHoldingRepository();
  const holdings = await holdingRepository.listByUser(user.id);

  return <HoldingsPageContent holdings={holdings} userDisplayName={displayNameForSession(user)} />;
}
