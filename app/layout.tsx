import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: 'Shadowing Studio',
  description: 'Practice English speaking by shadowing: listen → repeat → record → get a score.',
  applicationName: 'Shadowing Studio',
  appleWebApp: { capable: true, title: 'Shadowing', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f2f2f7',
};

/**
 * Runs before first paint: applies the saved theme (sh_settings.theme) so dark-mode
 * users never see a white flash. ShadowingApp keeps it in sync afterwards.
 */
const THEME_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem('sh_settings')||'{}')||{};var t=s.theme||'auto';var d=t==='dark'||(t==='auto'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.setAttribute('data-theme',d?'dark':'light');}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={poppins.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
