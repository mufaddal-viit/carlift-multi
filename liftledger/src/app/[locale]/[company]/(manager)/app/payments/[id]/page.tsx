import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ReceiptView } from '@/features/payments/receipt-view';

export async function generateMetadata() {
  const t = await getTranslations('payments');
  return { title: t('receipt.title') };
}

export default async function ReceiptPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <ReceiptView paymentId={id} />;
}
