import { portfolioCreateSchema } from '@/domain/schemas/portfolio';
import { shareAcquisitionBaseSchema } from '@/domain/schemas/share-acquisition';
import { userStubDocumentSchema } from '@/domain/schemas/user';
import { acquisitionDocumentSchema } from '@/infrastructure/persistence/schemas/acquisition-record';
import { portfolioDocumentSchema } from '@/infrastructure/persistence/schemas/portfolio-record';

describe('persistence Zod schemas derive from domain', () => {
  it('portfolio document extends portfolioCreateSchema with timestamps', () => {
    const created = portfolioCreateSchema.parse({ userId: 'u1', name: '  Test  ' });
    const doc = portfolioDocumentSchema.parse({
      ...created,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(doc.name).toBe('Test');
  });

  it('acquisition document accepts base acquisition fields plus tenancy', () => {
    const base = shareAcquisitionBaseSchema.parse({
      economicsKind: 'manual_usd',
      symbol: 'ABC',
      eventDate: '2024-06-01',
      quantity: 1,
      considerationUsd: 10,
      feesUsd: 0,
    });
    const doc = acquisitionDocumentSchema.parse({
      ...base,
      portfolioId: '507f1f77bcf86cd799439011',
      userId: 'u1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(doc.symbol).toBe(base.symbol);
  });

  it('user stub document matches infrastructure export', async () => {
    const { userDocumentSchema } = await import('@/infrastructure/persistence/schemas/user-record');
    expect(userDocumentSchema).toBe(userStubDocumentSchema);
  });
});
