import { holdingCreateSchema } from '@/domain/schemas/holding';
import { acquisitionDocumentSchema } from '@/infrastructure/persistence/schemas/acquisition-record';
import { disposalDocumentSchema } from '@/infrastructure/persistence/schemas/disposal-record';
import { holdingDocumentSchema } from '@/infrastructure/persistence/schemas/holding-record';

describe('persistence schema derivation', () => {
  it('holding document extends holdingCreateSchema with timestamps', () => {
    const created = holdingCreateSchema.parse({ userId: 'u1', symbol: '  test  ' });
    const doc = holdingDocumentSchema.parse({
      userId: created.userId,
      symbol: created.symbol,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(doc.symbol).toBe('TEST');
  });

  it('acquisition document merges share acquisition with tenancy', () => {
    const parsed = acquisitionDocumentSchema.parse({
      economicsKind: 'manual_usd',
      symbol: 'ABC',
      eventDate: '2024-01-15',
      quantity: 1,
      considerationUsd: 10,
      feesUsd: 0,
      holdingId: '507f1f77bcf86cd799439011',
      userId: 'u1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(parsed.holdingId).toBe('507f1f77bcf86cd799439011');
  });

  it('disposal document extends share disposal base with tenancy', () => {
    const parsed = disposalDocumentSchema.parse({
      symbol: 'XYZ',
      eventDate: '2024-01-20',
      quantity: 1,
      grossProceedsUsd: 20,
      feesUsd: 0,
      holdingId: '507f1f77bcf86cd799439011',
      userId: 'u1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(parsed.holdingId).toBe('507f1f77bcf86cd799439011');
  });
});
