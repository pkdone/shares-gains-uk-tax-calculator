import type { HoldingRepository } from '@/domain/repositories/holding-repository';
import type {
  CreateShareAcquisition,
  ShareAcquisitionRepository,
} from '@/domain/repositories/share-acquisition-repository';
import type { ShareAcquisition } from '@/domain/schemas/share-acquisition';
import { DomainError } from '@/shared/errors/app-error';

export async function addAcquisition(
  holdingRepository: HoldingRepository,
  acquisitionRepository: ShareAcquisitionRepository,
  input: CreateShareAcquisition,
): Promise<ShareAcquisition> {
  const holding = await holdingRepository.findByIdForUser(input.holdingId, input.userId);
  if (holding === null) {
    throw new DomainError('Holding not found');
  }

  if (input.symbol !== holding.symbol) {
    throw new DomainError('Symbol must match this holding.');
  }

  return acquisitionRepository.insert(input);
}
