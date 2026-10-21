'use client';

import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import { MessageCircle, Plus, RotateCcw } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { PayStatus } from '@/core/billing';
import { formatMoney } from '@/core/format';
import type { Locale } from '@/core/repo/types';
import { images, unsplashUrl, type ImageKey } from '@/content/images';
import { AreaLine } from '@/components/charts/area-line';
import { SplitBars } from '@/components/charts/split-bars';
import { TrendBars } from '@/components/charts/trend-bars';
import { illustrations } from '@/components/illustrations';
import { CountUp, Reveal, Stagger, StaggerItem } from '@/components/motion';
import { Logo } from '@/components/shell/logo';
import { LocaleToggle, ThemeToggle } from '@/components/shell/toggles';
import { Avatar, AvatarStack } from '@/components/ui/avatar';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input } from '@/components/ui/field';
import { MonthPicker } from '@/components/ui/month-picker';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';

const SWATCHES = ['canvas', 'card', 'soft', 'line', 'ink', 'ink-muted', 'brand', 'brand-deep', 'brand-tint', 'paid-bg', 'partial-bg', 'overdue-bg', 'pending-bg'];
const STATUSES: PayStatus[] = ['pending', 'partial', 'overdue', 'paid'];
const NAMES = ['Priya Nair', 'Rahul Menon', 'Ayesha Khan', 'Lina Haddad', 'Omar Farouk', 'Sara Abdullah'];
const TREND = [1120, 1080, 1210, 1150, 1280, 975];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} />
      {children}
    </Card>
  );
}

export function Kit() {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const [status, setStatus] = useState(0);
  const [billing, setBilling] = useState<'monthly' | 'perTrip'>('monthly');
  const [month, setMonth] = useState('2026-10');
  const [dialog, setDialog] = useState<'dialog' | 'sheet' | null>(null);
  const [replay, setReplay] = useState(0);
  const money = (n: number) => formatMoney(n, locale);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between">
        <Link href="/login" aria-label={t('common.appName')}>
          <Logo />
        </Link>
        <div className="flex gap-2">
          <LocaleToggle className="bg-card" />
          <ThemeToggle className="bg-card" />
        </div>
      </header>

      <Reveal className="py-4">
        <h1 className="text-xl font-semibold tracking-tight">{t('kit.title')}</h1>
        <p className="text-ink-muted">{t('kit.subtitle')}</p>
      </Reveal>

      <Section title={t('kit.colours')}>
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">
          {SWATCHES.map((name) => (
            <li key={name}>
              <div className="h-14 rounded-inner ring-1 ring-line" style={{ background: `var(--${name})` }} />
              <p className="mt-1 truncate text-xs text-ink-muted" dir="ltr">{name}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t('kit.buttons')}>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button><Plus aria-hidden />{t('kit.primary')}</Button>
          <Button variant="soft">{t('kit.soft')}</Button>
          <Button variant="outline">{t('kit.outline')}</Button>
          <Button variant="ghost">{t('kit.ghost')}</Button>
          <Button variant="danger">{t('kit.danger')}</Button>
          <Button variant="whatsapp"><MessageCircle aria-hidden />{t('kit.whatsapp')}</Button>
          <Button loading>{t('kit.loading')}</Button>
          <Button size="sm">{t('kit.primary')}</Button>
          <Button size="lg">{t('kit.primary')}</Button>
        </div>
      </Section>

      <Section title={t('kit.badges')}>
        <div className="flex flex-wrap items-center gap-2.5">
          {STATUSES.map((s) => <StatusBadge key={s} status={s} />)}
          <StatusBadge status="paid" nothingDue />
          <Badge tone="brand">+12.8%</Badge>
          <span className="mx-2 h-6 w-px bg-line" aria-hidden />
          <StatusBadge status={STATUSES[status]} />
          <Button size="sm" variant="soft" onClick={() => setStatus((s) => (s + 1) % STATUSES.length)}>{t('kit.cycleStatus')}</Button>
        </div>
      </Section>

      <Section title={t('kit.controls')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('kit.fieldLabel')} hint={t('kit.fieldHint')}><Input placeholder="Priya Nair" /></Field>
          <Field label={t('kit.fieldLabel')} error={t('kit.fieldError')}><Input /></Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Segmented
            label={t('kit.controls')}
            layoutId="kit-billing"
            value={billing}
            onChange={setBilling}
            options={[{ value: 'monthly', label: t('kit.optionOne') }, { value: 'perTrip', label: t('kit.optionTwo') }]}
          />
          <MonthPicker value={month} onChange={setMonth} className="bg-soft shadow-none" />
          <Button variant="outline" onClick={() => setDialog('dialog')}>{t('kit.openDialog')}</Button>
          <Button variant="outline" onClick={() => setDialog('sheet')}>{t('kit.openSheet')}</Button>
        </div>
        <Dialog open={dialog !== null} onOpenChange={() => setDialog(null)} title={t('kit.dialogTitle')} description={t('kit.dialogBody')} variant={dialog ?? 'dialog'}>
          <div className="flex justify-end">
            <Button onClick={() => setDialog(null)}>{t('common.close')}</Button>
          </div>
        </Dialog>
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title={t('kit.charts')}>
          <TrendBars
            data={TREND.map((value, i) => ({ label: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'][i], value }))}
            format={(n) => String(n)}
            summary={t('dashboard.trend')}
            className="pt-8"
          />
        </Section>
        <Section title={t('kit.charts')}>
          <AreaLine data={[320, 510, 280, 640, 420, 760, 530]} summary={t('dashboard.outstanding')} />
          <SplitBars
            className="mt-4"
            items={[
              { label: t('methods.cash'), value: 48, detail: '48%' },
              { label: t('methods.transfer'), value: 34, detail: '34%', tone: 'deep' },
              { label: t('methods.wallet'), value: 18, detail: '18%', tone: 'muted' },
            ]}
          />
        </Section>
      </div>

      <Section title={t('kit.motion')}>
        <div className="flex flex-wrap items-center gap-4">
          <p className="text-4xl font-semibold"><CountUp key={replay} value={2135} format={money} /></p>
          <Button variant="soft" size="sm" onClick={() => setReplay((n) => n + 1)}><RotateCcw aria-hidden />{t('kit.replay')}</Button>
        </div>
        <Stagger key={replay} className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {NAMES.map((n) => (
            <StaggerItem key={n} className="grid h-16 place-items-center rounded-inner bg-soft"><Avatar name={n} /></StaggerItem>
          ))}
        </Stagger>
      </Section>

      <Section title={t('kit.illustrations')}>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {(Object.keys(illustrations) as (keyof typeof illustrations)[]).map((key) => {
            const Art = illustrations[key];
            return (
              <li key={key} className="grid place-items-center rounded-md bg-soft p-4">
                <Art title={t(`illustrations.${key}`)} />
              </li>
            );
          })}
        </ul>
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title={t('kit.avatars')}>
          <div className="rounded-md bg-soft p-4">
            <AvatarStack names={NAMES} moreLabel={(count) => t('common.more', { count })} />
          </div>
        </Section>
        <Section title={t('kit.skeletons')}>
          <div className="flex flex-col gap-2.5">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </Section>
      </div>

      <Section title={t('kit.photos')}>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {(Object.keys(images) as ImageKey[]).map((key) => (
            <li key={key} className="relative aspect-[3/2] overflow-hidden rounded-md bg-soft">
              <Image src={unsplashUrl(key, 640)} alt={images[key].alt[locale]} fill sizes="(min-width: 640px) 320px, 50vw" className="object-cover" />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pt-6 pb-2 text-xs text-white" dir="ltr">
                {images[key].credit} · Unsplash
              </span>
            </li>
          ))}
        </ul>
      </Section>
    </main>
  );
}
