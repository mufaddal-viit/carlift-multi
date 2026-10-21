import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import ar from '../../messages/ar.json';

type Tree = { [k: string]: string | Tree };

const flat = (t: Tree, prefix = ''): Record<string, string> =>
  Object.entries(t).reduce<Record<string, string>>((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return typeof v === 'string' ? { ...acc, [key]: v } : { ...acc, ...flat(v, key) };
  }, {});

const E = flat(en as Tree);
const A = flat(ar as Tree);
// A placeholder is {name} or {count, plural, ...}; plural wording such as {nobody owes} is not one.
const placeholders = (s: string) => (s.match(/\{\w+(?=[,}])/g) ?? []).sort();

describe('translations', () => {
  it('English and Arabic define exactly the same keys', () => expect(Object.keys(A).sort()).toEqual(Object.keys(E).sort()));
  it('no value is empty', () => {
    for (const [k, v] of [...Object.entries(E), ...Object.entries(A)]) expect(v.trim(), k).not.toBe('');
  });
  it('both languages use the same placeholders in every message', () => {
    for (const k of Object.keys(E)) expect(placeholders(A[k] ?? ''), k).toEqual(placeholders(E[k]));
  });
  it('Arabic text is actually Arabic', () => {
    const untranslated = Object.entries(A).filter(([k, v]) => !/[؀-ۿ]/.test(v) && k !== 'common.appName');
    expect(untranslated).toEqual([]);
  });
});
