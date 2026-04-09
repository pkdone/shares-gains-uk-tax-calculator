import { deleteHolding } from '@/application/holding/delete-holding';
import type { RunPersistenceTransaction } from '@/application/ports/run-persistence-transaction';
import type { HoldingRepository } from '@/domain/repositories/holding-repository';
import type { ShareAcquisitionRepository } from '@/domain/repositories/share-acquisition-repository';
import type { ShareDisposalRepository } from '@/domain/repositories/share-disposal-repository';
import type { Holding } from '@/domain/schemas/holding';
import { DomainError } from '@/domain/errors/domain-error';

describe('deleteHolding', () => {
  const holding: Holding = {
    id: 'h1',
    userId: 'u1',
    symbol: 'TEST',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const runTransactionImmediate: RunPersistenceTransaction = async (fn) => fn(undefined);

  it('throws when holding is not found', async () => {
    const holdingRepository: HoldingRepository = {
      create: jest.fn(),
      findByIdForUser: jest.fn().mockResolvedValue(null),
      listByUser: jest.fn(),
      deleteByIdForUser: jest.fn(),
    };
    const deleteAllAcq = jest.fn();
    const deleteAllDisp = jest.fn();
    const acquisitionRepo: ShareAcquisitionRepository = {
      insert: jest.fn(),
      insertMany: jest.fn(),
      upsertImportUsdBatch: jest.fn(),
      listByHoldingForUser: jest.fn(),
      deleteByIdForHoldingUser: jest.fn(),
      deleteManyByIdsForHoldingUser: jest.fn(),
      deleteAllForHoldingUser: deleteAllAcq,
    };
    const disposalRepo: ShareDisposalRepository = {
      insert: jest.fn(),
      insertManyPdfImportBatch: jest.fn(),
      findExistingImportFingerprints: jest.fn().mockResolvedValue(new Set()),
      listByHoldingForUser: jest.fn(),
      deleteByIdForHoldingUser: jest.fn(),
      deleteManyByIdsForHoldingUser: jest.fn(),
      deleteAllForHoldingUser: deleteAllDisp,
    };

    await expect(
      deleteHolding(runTransactionImmediate, holdingRepository, acquisitionRepo, disposalRepo, {
        holdingId: 'h1',
        userId: 'u1',
      }),
    ).rejects.toThrow(DomainError);

    await expect(
      deleteHolding(runTransactionImmediate, holdingRepository, acquisitionRepo, disposalRepo, {
        holdingId: 'h1',
        userId: 'u1',
      }),
    ).rejects.toThrow(/holding not found/i);

    expect(deleteAllAcq).not.toHaveBeenCalled();
    expect(deleteAllDisp).not.toHaveBeenCalled();
  });

  it('deletes acquisitions, disposals, then holding', async () => {
    const deleteHoldingDoc = jest.fn().mockResolvedValue(true);
    const holdingRepository: HoldingRepository = {
      create: jest.fn(),
      findByIdForUser: jest.fn().mockResolvedValue(holding),
      listByUser: jest.fn(),
      deleteByIdForUser: deleteHoldingDoc,
    };
    const deleteAllAcq = jest.fn().mockResolvedValue(2);
    const deleteAllDisp = jest.fn().mockResolvedValue(1);
    const acquisitionRepo: ShareAcquisitionRepository = {
      insert: jest.fn(),
      insertMany: jest.fn(),
      upsertImportUsdBatch: jest.fn(),
      listByHoldingForUser: jest.fn(),
      deleteByIdForHoldingUser: jest.fn(),
      deleteManyByIdsForHoldingUser: jest.fn(),
      deleteAllForHoldingUser: deleteAllAcq,
    };
    const disposalRepo: ShareDisposalRepository = {
      insert: jest.fn(),
      insertManyPdfImportBatch: jest.fn(),
      findExistingImportFingerprints: jest.fn().mockResolvedValue(new Set()),
      listByHoldingForUser: jest.fn(),
      deleteByIdForHoldingUser: jest.fn(),
      deleteManyByIdsForHoldingUser: jest.fn(),
      deleteAllForHoldingUser: deleteAllDisp,
    };

    await deleteHolding(runTransactionImmediate, holdingRepository, acquisitionRepo, disposalRepo, {
      holdingId: 'h1',
      userId: 'u1',
    });

    expect(deleteAllAcq).toHaveBeenCalledWith('h1', 'u1', undefined);
    expect(deleteAllDisp).toHaveBeenCalledWith('h1', 'u1', undefined);
    expect(deleteHoldingDoc).toHaveBeenCalledWith('h1', 'u1', undefined);
  });

  it('throws when holding document delete removes nothing', async () => {
    const holdingRepository: HoldingRepository = {
      create: jest.fn(),
      findByIdForUser: jest.fn().mockResolvedValue(holding),
      listByUser: jest.fn(),
      deleteByIdForUser: jest.fn().mockResolvedValue(false),
    };
    const acquisitionRepo: ShareAcquisitionRepository = {
      insert: jest.fn(),
      insertMany: jest.fn(),
      upsertImportUsdBatch: jest.fn(),
      listByHoldingForUser: jest.fn(),
      deleteByIdForHoldingUser: jest.fn(),
      deleteManyByIdsForHoldingUser: jest.fn(),
      deleteAllForHoldingUser: jest.fn().mockResolvedValue(0),
    };
    const disposalRepo: ShareDisposalRepository = {
      insert: jest.fn(),
      insertManyPdfImportBatch: jest.fn(),
      findExistingImportFingerprints: jest.fn().mockResolvedValue(new Set()),
      listByHoldingForUser: jest.fn(),
      deleteByIdForHoldingUser: jest.fn(),
      deleteManyByIdsForHoldingUser: jest.fn(),
      deleteAllForHoldingUser: jest.fn().mockResolvedValue(0),
    };

    await expect(
      deleteHolding(runTransactionImmediate, holdingRepository, acquisitionRepo, disposalRepo, {
        holdingId: 'h1',
        userId: 'u1',
      }),
    ).rejects.toThrow(/could not be deleted/i);
  });
});
