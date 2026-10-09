import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SPHINX',
  description: 'An atmospheric 3D mystery.',
  openGraph: {
    title: 'SPHINX',
    description: 'An atmospheric 3D mystery.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SPHINX Game Preview',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SPHINX',
    description: 'An atmospheric 3D mystery.',
    images: ['/og-image.png'],
  },
};

export default function L({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&family=Amiri&family=Tajawal:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <meta
          name="viewport"
          content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
