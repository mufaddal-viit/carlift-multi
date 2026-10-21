import type { MetadataRoute } from 'next';

/** Lets managers and drivers add LiftLedger to their home screen and open it like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LiftLedger',
    short_name: 'LiftLedger',
    description: 'Car lift payments and operations',
    start_url: '/en/login',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F1F2F4',
    theme_color: '#0F8A5F',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
