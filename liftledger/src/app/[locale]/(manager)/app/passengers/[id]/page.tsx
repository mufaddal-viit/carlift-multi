import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PassengerSOA } from '@/features/passengers/passenger-soa';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `Passenger ${id}` };
}

export default async function PassengerPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id, locale } = await params;
  setRequestLocale(locale);

  return <PassengerSOA passengerId={id} />;
}
