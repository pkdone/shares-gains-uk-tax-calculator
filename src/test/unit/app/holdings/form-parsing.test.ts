import { parseAcquisitionForm, parseDisposalForm } from '@/app/holdings/form-parsing';

function makeFormData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) {
    fd.set(k, v);
  }
  return fd;
}

describe('parseAcquisitionForm', () => {
  it('parses valid manual acquisition and derives considerationUsd', () => {
    const fd = makeFormData({
      eventDate: '2024-06-01',
      quantity: '10',
      pricePerShareUsd: '15.25',
      feesUsd: '1.50',
    });
    const r = parseAcquisitionForm(fd, 'AAPL');
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.symbol).toBe('AAPL');
      expect(r.data.considerationUsd).toBe(152.5);
      expect(r.data.feesUsd).toBe(1.5);
    }
  });

  it('fails on invalid quantity', () => {
    const fd = makeFormData({
      eventDate: '2024-06-01',
      quantity: 'abc',
      pricePerShareUsd: '10',
      feesUsd: '0',
    });
    const r = parseAcquisitionForm(fd, 'AAPL');
    expect(r.success).toBe(false);
  });
});

describe('parseDisposalForm', () => {
  it('parses valid disposal and derives grossProceedsUsd', () => {
    const fd = makeFormData({
      eventDate: '2024-06-01',
      quantity: '5',
      pricePerShareUsd: '20',
      feesUsd: '0.25',
    });
    const r = parseDisposalForm(fd, 'MSFT');
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.symbol).toBe('MSFT');
      expect(r.data.grossProceedsUsd).toBe(100);
      expect(r.data.feesUsd).toBe(0.25);
    }
  });
});
