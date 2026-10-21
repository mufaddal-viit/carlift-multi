import type { Locale } from './repo/types';

const intlLocale = (locale: Locale) => (locale === 'ar' ? 'ar-AE-u-nu-latn' : 'en-GB');
const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);

export function formatMoney(amount: number, locale: Locale): string {
  const n = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.abs(amount));
  const sign = amount < 0 ? '-' : '';
  return locale === 'ar' ? `${sign}${n} د.إ` : `${sign}AED ${n}`;
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const mobile = digits.match(/^971(5\d)(\d{3})(\d{4})$/);
  if (mobile) return `+971 ${mobile[1]} ${mobile[2]} ${mobile[3]}`;
  // Landlines have a one-digit area code: 04 300 1000 is +971 4 300 1000.
  const landline = digits.match(/^971([2-9])(\d{3})(\d{4})$/);
  return landline ? `+971 ${landline[1]} ${landline[2]} ${landline[3]}` : `+${digits}`;
}

export const formatMonth = (month: string, locale: Locale): string =>
  new Intl.DateTimeFormat(intlLocale(locale), { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(utc(`${month}-01`));

export const formatMonthShort = (month: string, locale: Locale): string =>
  new Intl.DateTimeFormat(intlLocale(locale), { month: 'short', timeZone: 'UTC' }).format(utc(`${month}-01`));

export const formatDay = (day: string, locale: Locale): string =>
  new Intl.DateTimeFormat(intlLocale(locale), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(utc(day));

export const waLink = (phone: string, message: string): string =>
  `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;

export const initials = (name: string): string =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

/** A receipt number as printed: 123 → "R-000123". */
export const formatReceipt = (receiptNo: number): string => `R-${String(receiptNo).padStart(6, '0')}`;
