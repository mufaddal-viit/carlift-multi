import { serverRepo } from '@/core/repo/server';
import { ogCard, OG_SIZE } from '@/lib/og';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Passenger registration';

/** The preview shown when a company shares its registration link on WhatsApp. */
export default async function Image({ params }: { params: Promise<{ company: string }> }) {
  const { company: slug } = await params;
  const company = await serverRepo().companyBySlug(slug);
  return ogCard({
    title: company ? `Ride with ${company.name}` : 'Passenger registration',
    subtitle: 'Register for the car lift in a minute',
  });
}
