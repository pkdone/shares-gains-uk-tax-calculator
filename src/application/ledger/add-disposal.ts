import type { HoldingRepository } from '@/domain/repositories/holding-repository';
import type {
  CreateShareDisposal,
  ShareDisposalRepository,
} from '@/domain/repositories/share-disposal-repository';
import type { ShareDisposal } from '@/domain/schemas/share-disposal';
import { DomainError } from '@/shared/errors/app-error';

export async function addDisposal(
  holdingRepository: HoldingRepository,
  disposalRepository: ShareDisposalRepository,
  input: CreateShareDisposal,
): Promise<ShareDisposal> {
  const holding = await holdingRepository.findByIdForUser(input.holdingId, input.userId);
  if (holding === null) {
    throw new DomainError('Holding not found');
  }

  if (input.symbol !== holding.symbol) {
    throw new DomainError('Symbol must match this holding.');
  }

  return disposalRepository.insert(input);
}
