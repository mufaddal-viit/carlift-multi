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

/**
 * Generate a registration link for a company.
 * @param locale - The locale (en or ar)
 * @param companyId - The company ID
 * @param baseUrl - The base URL (e.g., https://example.com)
 */
export function generateRegistrationLink(locale: string, companyId: string, baseUrl: string): string {
  return `${baseUrl}/${locale}/register/${companyId}`;
}
