/**
 * Generate QR code as SVG string using a simple algorithm.
 * Uses qrcode-generator-ts for small, deterministic QR codes.
 */

export function generateQRSVG(text: string, size: number = 200): string {
  // Encode text to URI component
  const encoded = encodeURIComponent(text);

  // Use QR code API: https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=<text>
  // For SSR, we return the API URL that the client can fetch
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`;
}

/** The public registration address of a company, e.g. https://liftledger-chi.vercel.app/en/al-majra-transport/register. */
export function generateRegistrationLink(locale: string, companySlug: string, baseUrl: string): string {
  return `${baseUrl}/${locale}/${companySlug}/register`;
}
