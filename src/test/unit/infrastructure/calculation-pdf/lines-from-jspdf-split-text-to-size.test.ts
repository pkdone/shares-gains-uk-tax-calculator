import { linesFromJspdfSplitTextToSize } from '@/infrastructure/calculation-pdf/lines-from-jspdf-split-text-to-size';

describe('linesFromJspdfSplitTextToSize', () => {
  it('wraps a single string line', () => {
    expect(linesFromJspdfSplitTextToSize('hello')).toEqual(['hello']);
  });

  it('preserves multi-line arrays', () => {
    expect(linesFromJspdfSplitTextToSize(['first row', 'second row'])).toEqual(['first row', 'second row']);
  });

  it('normalises empty array to empty list', () => {
    expect(linesFromJspdfSplitTextToSize([])).toEqual([]);
  });
});
