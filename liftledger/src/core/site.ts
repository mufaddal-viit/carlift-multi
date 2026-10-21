/**
 * The public address of the site, for links that leave it (link previews, QR codes).
 * Vercel sets VERCEL_PROJECT_PRODUCTION_URL; NEXT_PUBLIC_APP_URL overrides it; local runs fall back to localhost.
 */
export function siteUrl(env: Record<string, string | undefined> = process.env): URL {
  if (env.NEXT_PUBLIC_APP_URL) return new URL(env.NEXT_PUBLIC_APP_URL);
  if (env.VERCEL_PROJECT_PRODUCTION_URL) return new URL(`https://${env.VERCEL_PROJECT_PRODUCTION_URL}`);
  return new URL(`http://localhost:${env.PORT ?? 3000}`);
}
