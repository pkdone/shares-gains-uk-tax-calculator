import type { HoldingRepository } from '@/domain/repositories/holding-repository';
import type {
  CreateShareAcquisition,
  ShareAcquisitionRepository,
} from '@/domain/repositories/share-acquisition-repository';
import type { ShareAcquisition } from '@/domain/schemas/share-acquisition';
import { requireHoldingForUser } from '@/application/holding/require-holding';
import { DomainError } from '@/domain/errors/domain-error';

export async function addAcquisition(
  holdingRepository: HoldingRepository,
  acquisitionRepository: ShareAcquisitionRepository,
  input: CreateShareAcquisition,
): Promise<ShareAcquisition> {
  const holding = await requireHoldingForUser(holdingRepository, input.holdingId, input.userId);

  if (input.symbol !== holding.symbol) {
    throw new DomainError('Symbol must match this holding.');
  }

  return acquisitionRepository.insert(input);
}
