import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
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
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Seguimiento de trabajos — Avance del cronograma operativo 2026' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Seguimiento de trabajos',
    description: 'Avance del cronograma operativo 2026',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
