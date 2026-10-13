import { describe, expect, it } from 'vitest';
import { images, unsplashUrl } from './images';

describe('image manifest', () => {
  it('describes and credits every photo in both languages', () => {
    for (const [key, img] of Object.entries(images)) {
      expect(img.id, key).toMatch(/^photo-[0-9a-z-]+$/);
      expect(img.alt.en.trim(), key).not.toBe('');
      expect(img.alt.ar, key).toMatch(/[؀-ۿ]/);
      expect(img.credit.trim(), key).not.toBe('');
      expect(img.width, key).toBeGreaterThan(0);
      expect(img.height, key).toBeGreaterThan(0);
    }
  });
  it('does not list the same photo twice', () => {
    const ids = Object.values(images).map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('builds a sized, compressed Unsplash URL', () => {
    const url = unsplashUrl('heroCity', 1200);
    expect(url.startsWith(`https://images.unsplash.com/${images.heroCity.id}?`)).toBe(true);
    expect(url).toContain('w=1200');
    expect(url).toContain('auto=format');
  });
});
