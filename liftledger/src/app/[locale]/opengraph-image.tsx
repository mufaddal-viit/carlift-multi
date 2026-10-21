import { ogCard, OG_SIZE } from '@/lib/og';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'LiftLedger: car lift payments and operations';

// Link previews are drawn in English: the image font has no Arabic letters.
export default function Image() {
  return ogCard({ title: 'Car lift payments, simply', subtitle: 'Passengers, cars and payments for car lift operators' });
}
