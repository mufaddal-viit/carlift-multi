import { describe, expect, it } from 'vitest';
import { formatDay, formatMoney, formatMonth, formatPhone, initials, waLink } from './format';

describe('formatMoney', () => {
  it('puts the currency first in English', () => expect(formatMoney(1430, 'en')).toBe('AED 1,430'));
  it('puts the currency last in Arabic and keeps Western digits', () => expect(formatMoney(1430, 'ar')).toBe('1,430 د.إ'));
  it('keeps the minus sign for credits', () => {
    expect(formatMoney(-50, 'en')).toBe('-AED 50');
    expect(formatMoney(-50, 'ar')).toBe('-50 د.إ');
  });
  it('formats zero', () => expect(formatMoney(0, 'en')).toBe('AED 0'));
});

describe('formatPhone', () => {
  it('groups a UAE mobile number', () => expect(formatPhone('971504412011')).toBe('+971 50 441 2011'));
  it('groups a UAE landline with its one-digit area code', () => expect(formatPhone('97143001000')).toBe('+971 4 300 1000'));
  it('leaves an unexpected number readable instead of mangling it', () => expect(formatPhone('12345')).toBe('+12345'));
});

describe('dates', () => {
  it('names the month in English', () => expect(formatMonth('2026-10', 'en')).toBe('October 2026'));
  it('names the month in Arabic with Western digits', () => expect(formatMonth('2026-10', 'ar')).toBe('أكتوبر 2026'));
  it('formats a day in English', () => expect(formatDay('2026-10-13', 'en')).toBe('13 Oct 2026'));
  it('formats a day in Arabic with Western digits', () => expect(formatDay('2026-10-13', 'ar')).toMatch(/13.*2026/));
  it('does not shift the day across timezones', () => expect(formatDay('2026-01-01', 'en')).toBe('1 Jan 2026'));
});

describe('waLink', () => {
  it('builds a wa.me link with an encoded message', () =>
    expect(waLink('971504412011', 'Hi & bye')).toBe('https://wa.me/971504412011?text=Hi%20%26%20bye'));
  it('strips symbols from the phone number', () =>
    expect(waLink('+971 50-441 2011', 'x')).toBe('https://wa.me/971504412011?text=x'));
});

describe('initials', () => {
  it('takes the first letters of the first two names', () => expect(initials('Priya Nair')).toBe('PN'));
  it('handles a single name and extra spaces', () => expect(initials('  Rashid  ')).toBe('R'));
  it('returns an empty string for an empty name', () => expect(initials('')).toBe(''));
});
