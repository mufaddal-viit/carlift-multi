/** The company that the bare /login address opens while the product serves a single operator. */
export const DEFAULT_COMPANY_SLUG = 'al-majra-transport';

/** First path segments the app owns. A company slug can never be one of these, or its pages would be unreachable. */
export const RESERVED_SLUGS = new Set([
  'admin', 'api', 'app', 'dev', 'driver', 'login', 'logout', 'passenger', 'register', 'signup', 'settings', 'help', 'about', 'pricing',
]);

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** A URL-safe company slug from its name: "Al Majra Transport" becomes "al-majra-transport". */
export function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/, '');
}

/** Lowercase letters, digits and single hyphens, 3 to 48 long, and not a word the app uses itself. */
export function isValidSlug(slug: string): boolean {
  return slug.length >= 3 && slug.length <= 48 && SLUG.test(slug) && !RESERVED_SLUGS.has(slug);
}
