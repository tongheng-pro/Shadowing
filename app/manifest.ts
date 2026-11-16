import type { MetadataRoute } from 'next';

/** Web app manifest → "Install app" / "Add to Home Screen" with the Echo icon. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Shadowing Studio',
    short_name: 'Shadowing',
    description: 'Practice English speaking by shadowing: listen → repeat → record → get a score.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f2f2f7',
    theme_color: '#f2f2f7',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
