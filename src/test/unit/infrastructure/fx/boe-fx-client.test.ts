import {
  parseBoeDateCell,
  parseBoeHtmlTable,
  parseBoeXudlusResponse,
} from '@/infrastructure/fx/boe-fx-client';

const SAMPLE_HTML = `
<table>
<tr><th>Date</th><th>Spot exchange rate, US $ into Sterling XUDLUSS</th></tr>
<tr><td>02 Jan 24</td><td>1.2625</td></tr>
<tr><td>03 Jan 24</td><td>1.2628</td></tr>
</table>
`;

describe('boe-fx-client', () => {
  describe('parseBoeDateCell', () => {
    it('parses DD Mon YY', () => {
      expect(parseBoeDateCell('02 Jan 24')).toBe('2024-01-02');
    });

    it('parses DD Mon YYYY', () => {
      expect(parseBoeDateCell('02 Jan 2024')).toBe('2024-01-02');
    });
  });

  describe('parseBoeHtmlTable', () => {
    it('extracts XUDLUSS rows', () => {
      const rates = parseBoeHtmlTable(SAMPLE_HTML);
      expect(rates).toEqual([
        { date: '2024-01-02', usdPerGbp: 1.2625 },
        { date: '2024-01-03', usdPerGbp: 1.2628 },
      ]);
    });
  });

  describe('parseBoeXudlusResponse', () => {
    it('delegates to HTML parser when tr tags present', () => {
      const rates = parseBoeXudlusResponse(SAMPLE_HTML);
      expect(rates.length).toBe(2);
    });

    it('parses CSV-like lines without HTML', () => {
      const text = 'Date,Rate\n02 Jan 24,1.1\n03 Jan 24,1.2\n';
      const rates = parseBoeXudlusResponse(text);
      expect(rates).toEqual([
        { date: '2024-01-02', usdPerGbp: 1.1 },
        { date: '2024-01-03', usdPerGbp: 1.2 },
      ]);
    });
  });
});
