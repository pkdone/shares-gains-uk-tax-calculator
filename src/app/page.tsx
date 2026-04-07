import { formatSessionDisplayName } from '@/app/app-header';
import { HoldingsPageContent } from '@/app/holdings/holdings-page-content';
import { requireVerifiedSessionUser } from '@/infrastructure/auth/session';
import { holdingRepository } from '@/infrastructure/repositories/composition-root';

export const dynamic = 'force-dynamic';

export default async function HomePage(): Promise<React.ReactElement> {
  const user = await requireVerifiedSessionUser();
  const holdings = await holdingRepository.listByUser(user.id);

  return <HoldingsPageContent holdings={holdings} userDisplayName={formatSessionDisplayName(user)} />;
}
