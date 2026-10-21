import { describe, expect, it } from 'vitest';
import { DEFAULT_COMPANY_SLUG, isValidSlug, slugify } from './tenant';

describe('slugify', () => {
  it.each([
    ['Al Majra Transport', 'al-majra-transport'],
    ['  Skyline   Commute  ', 'skyline-commute'],
    ['Oasis & Sons L.L.C.', 'oasis-and-sons-l-l-c'],
    ['Café Rides', 'cafe-rides'],
    ['---', ''],
  ])('%s → %s', (name, slug) => expect(slugify(name)).toBe(slug));

  it('never ends in a hyphen after trimming to length', () => expect(slugify(`${'a'.repeat(47)} b`)).toBe('a'.repeat(47)));
});

describe('isValidSlug', () => {
  it('accepts the default company', () => expect(isValidSlug(DEFAULT_COMPANY_SLUG)).toBe(true));
  it.each(['admin', 'login', 'app', 'api', 'register'])('refuses the reserved word %s', (s) => expect(isValidSlug(s)).toBe(false));
  it.each(['ab', 'Upper', 'two--hyphens', '-lead', 'trail-', 'space here'])('refuses %s', (s) => expect(isValidSlug(s)).toBe(false));
});
