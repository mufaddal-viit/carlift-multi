import { ImageResponse } from 'next/og';

export const OG_SIZE = { width: 1200, height: 630 };

/** A link-preview card: the mark, a headline and a line under it, on the brand green. */
export function ogCard({ title, subtitle }: { title: string; subtitle: string }) {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, background: '#0F8A5F', color: '#fff', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <svg width="72" height="72" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="18" fill="#fff" />
            <path d="M11 25V15a5 5 0 0 1 5-5h4a5 5 0 0 1 0 10h-3" fill="none" stroke="#0F8A5F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="11" cy="25" r="2.6" fill="#0F8A5F" />
            <circle cx="24.5" cy="25" r="2.6" fill="#0F8A5F" fillOpacity="0.55" />
          </svg>
          <span style={{ fontSize: 40, fontWeight: 700 }}>LiftLedger</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05 }}>{title}</span>
          <span style={{ fontSize: 34, opacity: 0.85 }}>{subtitle}</span>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
