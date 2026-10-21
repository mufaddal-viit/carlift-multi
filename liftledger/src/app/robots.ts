import type { MetadataRoute } from 'next';

/** Sign-in and registration pages may be found; the data behind them may not. */
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/*/admin', '/*/*/app', '/*/*/driver', '/*/*/passenger'] }] };
}
