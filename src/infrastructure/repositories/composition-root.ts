import type { FxRateRepository } from '@/domain/repositories/fx-rate-repository';
import type { HoldingRepository } from '@/domain/repositories/holding-repository';
import type { ShareAcquisitionRepository } from '@/domain/repositories/share-acquisition-repository';
import type { ShareDisposalRepository } from '@/domain/repositories/share-disposal-repository';
import { MongoFxRateRepository } from '@/infrastructure/repositories/mongo-fx-rate-repository';
import { MongoHoldingRepository } from '@/infrastructure/repositories/mongo-holding-repository';
import { MongoShareAcquisitionRepository } from '@/infrastructure/repositories/mongo-share-acquisition-repository';
import { MongoShareDisposalRepository } from '@/infrastructure/repositories/mongo-share-disposal-repository';

/**
 * Shared repository instances for server components, server actions, and scripts.
 * Prefer these over ad hoc `new Mongo*Repository()` so wiring stays in one place.
 */
export const holdingRepository: HoldingRepository = new MongoHoldingRepository();

export const shareAcquisitionRepository: ShareAcquisitionRepository =
  new MongoShareAcquisitionRepository();

export const shareDisposalRepository: ShareDisposalRepository = new MongoShareDisposalRepository();

export const fxRateRepository: FxRateRepository = new MongoFxRateRepository();
