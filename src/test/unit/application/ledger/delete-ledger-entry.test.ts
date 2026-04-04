import { deleteLedgerEntry } from '@/application/ledger/delete-ledger-entry';
import type { HoldingRepository } from '@/domain/repositories/holding-repository';
import type { ShareAcquisitionRepository } from '@/domain/repositories/share-acquisition-repository';
import type { ShareDisposalRepository } from '@/domain/repositories/share-disposal-repository';
import type { Holding } from '@/domain/schemas/holding';
import { DomainError } from '@/shared/errors/app-error';

describe('deleteLedgerEntry', () => {
  const holding: Holding = {
    id: 'h1',
    userId: 'u1',
    symbol: 'TEST',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const holdingRepository: HoldingRepository = {
    create: jest.fn(),
    findByIdForUser: jest.fn().mockResolvedValue(holding),
    listByUser: jest.fn(),
    deleteByIdForUser: jest.fn(),
  };

  it('throws when holding is not found', async () => {
    const findByIdForUser = jest.fn().mockResolvedValue(null);
    const holdingRepo: HoldingRepository = {
      ...holdingRepository,
      findByIdForUser,
      deleteByIdForUser: jest.fn(),
    };
    const deleteAcquisition = jest.fn();
    const deleteDisposal = jest.fn();
    const acquisitionRepo: ShareAcquisitionRepository = {
      insert: jest.fn(),
      insertMany: jest.fn(),
      upsertImportUsdBatch: jest.fn(),
      listByHoldingForUser: jest.fn(),
      deleteByIdForHoldingUser: deleteAcquisition,
      deleteAllForHoldingUser: jest.fn(),
    };
    const disposalRepo: ShareDisposalRepository = {
      insert: jest.fn(),
      listByHoldingForUser: jest.fn(),
      deleteByIdForHoldingUser: deleteDisposal,
      deleteAllForHoldingUser: jest.fn(),
    };

    await expect(
      deleteLedgerEntry(holdingRepo, acquisitionRepo, disposalRepo, {
        holdingId: 'h1',
        userId: 'u1',
        kind: 'ACQUISITION',
        entryId: '507f1f77bcf86cd799439011',
      }),
    ).rejects.toThrow(DomainError);

    await expect(
      deleteLedgerEntry(holdingRepo, acquisitionRepo, disposalRepo, {
        holdingId: 'h1',
        userId: 'u1',
        kind: 'ACQUISITION',
        entryId: '507f1f77bcf86cd799439011',
      }),
    ).rejects.toThrow(/holding not found/i);

    expect(deleteAcquisition).not.toHaveBeenCalled();
  });

  it('throws when acquisition delete removes nothing', async () => {
    const deleteDisposal = jest.fn();
    const acquisitionRepo: ShareAcquisitionRepository = {
      insert: jest.fn(),
      insertMany: jest.fn(),
      upsertImportUsdBatch: jest.fn(),
      listByHoldingForUser: jest.fn(),
      deleteByIdForHoldingUser: jest.fn().mockResolvedValue(false),
      deleteAllForHoldingUser: jest.fn(),
    };
    const disposalRepo: ShareDisposalRepository = {
      insert: jest.fn(),
      listByHoldingForUser: jest.fn(),
      deleteByIdForHoldingUser: deleteDisposal,
      deleteAllForHoldingUser: jest.fn(),
    };

    await expect(
      deleteLedgerEntry(holdingRepository, acquisitionRepo, disposalRepo, {
        holdingId: 'h1',
        userId: 'u1',
        kind: 'ACQUISITION',
        entryId: '507f1f77bcf86cd799439011',
      }),
    ).rejects.toThrow(/entry not found/i);

    expect(deleteDisposal).not.toHaveBeenCalled();
  });

  it('throws when disposal delete removes nothing', async () => {
    const deleteAcquisition = jest.fn();
    const acquisitionRepo: ShareAcquisitionRepository = {
      insert: jest.fn(),
      insertMany: jest.fn(),
      upsertImportUsdBatch: jest.fn(),
      listByHoldingForUser: jest.fn(),
      deleteByIdForHoldingUser: deleteAcquisition,
      deleteAllForHoldingUser: jest.fn(),
    };
    const disposalRepo: ShareDisposalRepository = {
      insert: jest.fn(),
      listByHoldingForUser: jest.fn(),
      deleteByIdForHoldingUser: jest.fn().mockResolvedValue(false),
      deleteAllForHoldingUser: jest.fn(),
    };

    await expect(
      deleteLedgerEntry(holdingRepository, acquisitionRepo, disposalRepo, {
        holdingId: 'h1',
        userId: 'u1',
        kind: 'DISPOSAL',
        entryId: '507f1f77bcf86cd799439012',
      }),
    ).rejects.toThrow(/entry not found/i);

    expect(deleteAcquisition).not.toHaveBeenCalled();
  });

  it('deletes an acquisition when repository returns true', async () => {
    const deleteAcquisition = jest.fn().mockResolvedValue(true);
    const deleteDisposal = jest.fn();
    const acquisitionRepo: ShareAcquisitionRepository = {
      insert: jest.fn(),
      insertMany: jest.fn(),
      upsertImportUsdBatch: jest.fn(),
      listByHoldingForUser: jest.fn(),
      deleteByIdForHoldingUser: deleteAcquisition,
      deleteAllForHoldingUser: jest.fn(),
    };
    const disposalRepo: ShareDisposalRepository = {
      insert: jest.fn(),
      listByHoldingForUser: jest.fn(),
      deleteByIdForHoldingUser: deleteDisposal,
      deleteAllForHoldingUser: jest.fn(),
    };

    await deleteLedgerEntry(holdingRepository, acquisitionRepo, disposalRepo, {
      holdingId: 'h1',
      userId: 'u1',
      kind: 'ACQUISITION',
      entryId: '507f1f77bcf86cd799439011',
    });

    expect(deleteAcquisition).toHaveBeenCalledWith('h1', 'u1', '507f1f77bcf86cd799439011');
    expect(deleteDisposal).not.toHaveBeenCalled();
  });

  it('deletes a disposal when repository returns true', async () => {
    const deleteAcquisition = jest.fn();
    const deleteDisposal = jest.fn().mockResolvedValue(true);
    const acquisitionRepo: ShareAcquisitionRepository = {
      insert: jest.fn(),
      insertMany: jest.fn(),
      upsertImportUsdBatch: jest.fn(),
      listByHoldingForUser: jest.fn(),
      deleteByIdForHoldingUser: deleteAcquisition,
      deleteAllForHoldingUser: jest.fn(),
    };
    const disposalRepo: ShareDisposalRepository = {
      insert: jest.fn(),
      listByHoldingForUser: jest.fn(),
      deleteByIdForHoldingUser: deleteDisposal,
      deleteAllForHoldingUser: jest.fn(),
    };

    await deleteLedgerEntry(holdingRepository, acquisitionRepo, disposalRepo, {
      holdingId: 'h1',
      userId: 'u1',
      kind: 'DISPOSAL',
      entryId: '507f1f77bcf86cd799439012',
    });

    expect(deleteDisposal).toHaveBeenCalledWith('h1', 'u1', '507f1f77bcf86cd799439012');
    expect(deleteAcquisition).not.toHaveBeenCalled();
  });
});
