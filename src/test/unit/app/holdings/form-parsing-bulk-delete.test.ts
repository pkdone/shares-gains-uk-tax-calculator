import {
  bulkDeleteLedgerEntriesRowsSchema,
  bulkDeleteLedgerEntryRowSchema,
} from '@/app/holdings/form-parsing';

describe('bulkDeleteLedgerEntryRowSchema', () => {
  it('accepts acquisition row', () => {
    const r = bulkDeleteLedgerEntryRowSchema.safeParse({
      kind: 'ACQUISITION',
      entryId: '507f1f77bcf86cd799439011',
    });
    expect(r.success).toBe(true);
  });

  it('accepts disposal row', () => {
    const r = bulkDeleteLedgerEntryRowSchema.safeParse({
      kind: 'DISPOSAL',
      entryId: '507f1f77bcf86cd799439012',
    });
    expect(r.success).toBe(true);
  });

  it('rejects empty entryId', () => {
    const r = bulkDeleteLedgerEntryRowSchema.safeParse({
      kind: 'ACQUISITION',
      entryId: '   ',
    });
    expect(r.success).toBe(false);
  });
});

describe('bulkDeleteLedgerEntriesRowsSchema', () => {
  it('accepts one to fifty rows', () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({
      kind: 'ACQUISITION' as const,
      entryId: `${i.toString().padStart(24, '0')}`,
    }));
    const r = bulkDeleteLedgerEntriesRowsSchema.safeParse(rows);
    expect(r.success).toBe(true);
  });

  it('rejects empty array', () => {
    const r = bulkDeleteLedgerEntriesRowsSchema.safeParse([]);
    expect(r.success).toBe(false);
  });

  it('rejects more than fifty rows', () => {
    const rows = Array.from({ length: 51 }, (_, i) => ({
      kind: 'ACQUISITION' as const,
      entryId: `${i.toString().padStart(24, '0')}`,
    }));
    const r = bulkDeleteLedgerEntriesRowsSchema.safeParse(rows);
    expect(r.success).toBe(false);
  });
});
