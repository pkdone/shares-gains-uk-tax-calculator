import { HoldingsPageContent } from '@/app/holdings/holdings-page-content';
import { requireVerifiedUserId } from '@/infrastructure/auth/session';
import { MongoHoldingRepository } from '@/infrastructure/repositories/mongo-holding-repository';

export const dynamic = 'force-dynamic';

export default async function HomePage(): Promise<React.ReactElement> {
  const userId = await requireVerifiedUserId();
  const holdingRepository = new MongoHoldingRepository();
  const holdings = await holdingRepository.listByUser(userId);

  return <HoldingsPageContent holdings={holdings} />;
}
