import { describe, expect, it } from 'vitest';
import { formatReceipt } from '@/core/format';
import { toCsv } from './csv';

describe('toCsv', () => {
  it('joins plain fields with commas and rows with CRLF', () => expect(toCsv([['a', 1], ['b', 2]])).toBe('a,1\r\nb,2'));
  it('quotes commas, quotes and line breaks', () =>
    expect(toCsv([['Smith, John', 'He said "hi"', 'two\nlines']])).toBe('"Smith, John","He said ""hi""","two\nlines"'));
  it('leaves empty values empty', () => expect(toCsv([[null, undefined, '']])).toBe(',,'));
  it('keeps formulas from running in a spreadsheet', () => expect(toCsv([['=HYPERLINK("x")', '-5', '@sum']])).toBe(`"'=HYPERLINK(""x"")",-5,'@sum`));
  it('keeps Arabic text as it is', () => expect(toCsv([['أحمد', 'شركة']])).toBe('أحمد,شركة'));
});

describe('formatReceipt', () => {
  it('pads to six digits', () => expect([formatReceipt(7), formatReceipt(123456)]).toEqual(['R-000007', 'R-123456']));
});
