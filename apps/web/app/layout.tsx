import './globals.css';
import type { ReactNode } from 'react';

export const metadata = { title: 'Ultrathing', description: 'Centro de comando de marketing' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
