'use client';

// The last resort, for errors in the root layout itself. It replaces the whole document and runs without
// translations, theme or fonts, so it is plain HTML in both languages with inline styles.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100dvh', display: 'grid', placeItems: 'center', fontFamily: 'system-ui, sans-serif', background: '#f4f6f5', color: '#14201b' }}>
        <main style={{ maxWidth: 420, padding: 24, textAlign: 'center' }}>
          <h1 style={{ fontSize: 22, margin: '0 0 8px' }}>Something went wrong</h1>
          <p style={{ margin: '0 0 4px', color: '#5b6b64' }}>LiftLedger could not load. Please try again.</p>
          <p dir="rtl" lang="ar" style={{ margin: '0 0 20px', color: '#5b6b64' }}>حدث خطأ. يرجى المحاولة مرة أخرى.</p>
          <button
            type="button"
            onClick={reset}
            style={{ border: 0, borderRadius: 999, padding: '12px 22px', background: '#14201b', color: '#fff', fontSize: 15, cursor: 'pointer' }}
          >
            Try again · حاول مرة أخرى
          </button>
          {error.digest && <p style={{ marginTop: 16, fontSize: 12, color: '#5b6b64' }}>Reference: {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}
