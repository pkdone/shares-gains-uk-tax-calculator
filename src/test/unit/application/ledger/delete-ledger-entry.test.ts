import { deleteLedgerEntry } from '@/application/ledger/delete-ledger-entry';
import type { PortfolioRepository } from '@/domain/repositories/portfolio-repository';
import type { ShareAcquisitionRepository } from '@/domain/repositories/share-acquisition-repository';
import type { ShareDisposalRepository } from '@/domain/repositories/share-disposal-repository';
import type { Portfolio } from '@/domain/schemas/portfolio';
import { DomainError } from '@/shared/errors/app-error';

describe('deleteLedgerEntry', () => {
  const portfolio: Portfolio = {
    id: 'p1',
    userId: 'u1',
    name: 'Test',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const portfolioRepository: PortfolioRepository = {
    create: jest.fn(),
    findByIdForUser: jest.fn().mockResolvedValue(portfolio),
    listByUser: jest.fn(),
  };

  it('throws when portfolio is not found', async () => {
    const findByIdForUser = jest.fn().mockResolvedValue(null);
    const portfolioRepo: PortfolioRepository = {
      ...portfolioRepository,
      findByIdForUser,
    };
    const deleteAcquisition = jest.fn();
    const deleteDisposal = jest.fn();
    const acquisitionRepo: ShareAcquisitionRepository = {
      insert: jest.fn(),
      insertMany: jest.fn(),
      upsertImportUsdBatch: jest.fn(),
      listByPortfolioForUser: jest.fn(),
      deleteByIdForPortfolioUser: deleteAcquisition,
    };
    const disposalRepo: ShareDisposalRepository = {
      insert: jest.fn(),
      listByPortfolioForUser: jest.fn(),
      deleteByIdForPortfolioUser: deleteDisposal,
    };

    await expect(
      deleteLedgerEntry(portfolioRepo, acquisitionRepo, disposalRepo, {
        portfolioId: 'p1',
        userId: 'u1',
        kind: 'ACQUISITION',
        entryId: '507f1f77bcf86cd799439011',
      }),
    ).rejects.toThrow(DomainError);

    await expect(
      deleteLedgerEntry(portfolioRepo, acquisitionRepo, disposalRepo, {
        portfolioId: 'p1',
        userId: 'u1',
        kind: 'ACQUISITION',
        entryId: '507f1f77bcf86cd799439011',
      }),
    ).rejects.toThrow(/portfolio not found/i);

    expect(deleteAcquisition).not.toHaveBeenCalled();
  });

  it('throws when acquisition delete removes nothing', async () => {
    const deleteDisposal = jest.fn();
    const acquisitionRepo: ShareAcquisitionRepository = {
      insert: jest.fn(),
      insertMany: jest.fn(),
      upsertImportUsdBatch: jest.fn(),
      listByPortfolioForUser: jest.fn(),
      deleteByIdForPortfolioUser: jest.fn().mockResolvedValue(false),
    };
    const disposalRepo: ShareDisposalRepository = {
      insert: jest.fn(),
      listByPortfolioForUser: jest.fn(),
      deleteByIdForPortfolioUser: deleteDisposal,
    };

    await expect(
      deleteLedgerEntry(portfolioRepository, acquisitionRepo, disposalRepo, {
        portfolioId: 'p1',
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
      listByPortfolioForUser: jest.fn(),
      deleteByIdForPortfolioUser: deleteAcquisition,
    };
    const disposalRepo: ShareDisposalRepository = {
      insert: jest.fn(),
      listByPortfolioForUser: jest.fn(),
      deleteByIdForPortfolioUser: jest.fn().mockResolvedValue(false),
    };

    await expect(
      deleteLedgerEntry(portfolioRepository, acquisitionRepo, disposalRepo, {
        portfolioId: 'p1',
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
      listByPortfolioForUser: jest.fn(),
      deleteByIdForPortfolioUser: deleteAcquisition,
    };
    const disposalRepo: ShareDisposalRepository = {
      insert: jest.fn(),
      listByPortfolioForUser: jest.fn(),
      deleteByIdForPortfolioUser: deleteDisposal,
    };

    await deleteLedgerEntry(portfolioRepository, acquisitionRepo, disposalRepo, {
      portfolioId: 'p1',
      userId: 'u1',
      kind: 'ACQUISITION',
      entryId: '507f1f77bcf86cd799439011',
    });

    expect(deleteAcquisition).toHaveBeenCalledWith('p1', 'u1', '507f1f77bcf86cd799439011');
    expect(deleteDisposal).not.toHaveBeenCalled();
  });

  it('deletes a disposal when repository returns true', async () => {
    const deleteAcquisition = jest.fn();
    const deleteDisposal = jest.fn().mockResolvedValue(true);
    const acquisitionRepo: ShareAcquisitionRepository = {
      insert: jest.fn(),
      insertMany: jest.fn(),
      upsertImportUsdBatch: jest.fn(),
      listByPortfolioForUser: jest.fn(),
      deleteByIdForPortfolioUser: deleteAcquisition,
    };
    const disposalRepo: ShareDisposalRepository = {
      insert: jest.fn(),
      listByPortfolioForUser: jest.fn(),
      deleteByIdForPortfolioUser: deleteDisposal,
    };

    await deleteLedgerEntry(portfolioRepository, acquisitionRepo, disposalRepo, {
      portfolioId: 'p1',
      userId: 'u1',
      kind: 'DISPOSAL',
      entryId: '507f1f77bcf86cd799439012',
    });

    expect(deleteDisposal).toHaveBeenCalledWith('p1', 'u1', '507f1f77bcf86cd799439012');
    expect(deleteAcquisition).not.toHaveBeenCalled();
  });
});
