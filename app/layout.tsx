import type { Metadata } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import './globals.css';

const plexSans = IBM_Plex_Sans({
  variable: '--font-app-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const plexMono = IBM_Plex_Mono({
  variable: '--font-app-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'Seguimiento de trabajos | Dashboard',
  description: 'Dashboard de avance del cronograma operativo.',
  applicationName: 'Seguimiento de trabajos',
  openGraph: {
    type: 'website',
    locale: 'es_PE',
    title: 'Seguimiento de trabajos',
    description: 'Avance del cronograma operativo 2026',
    images: [
      {
        url: 'https://seguimiento-trabajos-3979.tininimax.chatgpt.site/og.png',
        width: 1200,
        height: 630,
        alt: 'Seguimiento de trabajos — Avance del cronograma operativo 2026',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Seguimiento de trabajos',
    description: 'Avance del cronograma operativo 2026',
    images: ['https://seguimiento-trabajos-3979.tininimax.chatgpt.site/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${plexSans.variable} ${plexMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
