import type { HoldingRepository } from '@/domain/repositories/holding-repository';
import type {
  CreateShareDisposal,
  ShareDisposalRepository,
} from '@/domain/repositories/share-disposal-repository';
import type { ShareDisposal } from '@/domain/schemas/share-disposal';
import { requireHoldingForUser } from '@/application/holding/require-holding';
import { DomainError } from '@/domain/errors/domain-error';

export async function addDisposal(
  holdingRepository: HoldingRepository,
  disposalRepository: ShareDisposalRepository,
  input: CreateShareDisposal,
): Promise<ShareDisposal> {
  const holding = await requireHoldingForUser(holdingRepository, input.holdingId, input.userId);

  if (input.symbol !== holding.symbol) {
    throw new DomainError('Symbol must match this holding.');
  }

  return disposalRepository.insert(input);
}
