import type { Metadata, Viewport } from 'next';
import './globals.css';
import JotaiProvider from '../components/JotaiProvider';

export const metadata: Metadata = {
  title: 'Beji',
  description: 'Beji app',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <JotaiProvider>
          {children}
        </JotaiProvider>
      </body>
    </html>
  );
}


